import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Input, Placeholder, Snackbar, Switch, Text, Title } from "@telegram-apps/telegram-ui";

import { Page } from "@/components/Page.tsx";
import { classNames } from "@/css/classnames.ts";
import {
  createGiveaway,
  fetchDashboardSnapshot,
  fetchGiveawayConfig,
  fetchGiveawayDashboard,
} from "@/features/dashboard/api.ts";
import type {
  GiveawayConfig,
  GiveawayCreationPayload,
  GiveawayCreationResult,
  GiveawayPlanOption,
  ManagedGroup,
} from "@/features/dashboard/types.ts";
import { toPersianDigits } from "@/utils/format.ts";

import styles from "./GiveawayPages.module.css";

const MIN_WINNERS = 1;
const MIN_DURATION = 1;

type LocationState = {
  focusGroupId?: string;
};

export function CreateGiveawayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;
  const focusGroupId = state.focusGroupId;

  const [config, setConfig] = useState<GiveawayConfig | null>(null);
  const [groups, setGroups] = useState<ManagedGroup[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [winners, setWinners] = useState<number>(MIN_WINNERS);
  const [selectedDuration, setSelectedDuration] = useState<number>(6);
  const [customDuration, setCustomDuration] = useState<number>(6);
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [premiumOnly, setPremiumOnly] = useState(false);
  const [notifyStart, setNotifyStart] = useState(true);
  const [notifyEnd, setNotifyEnd] = useState(true);
  const [extraChannel, setExtraChannel] = useState("");
  const [title, setTitle] = useState("");
  const [processing, setProcessing] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GiveawayCreationResult | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [configData, snapshot, dashboard] = await Promise.all([
          fetchGiveawayConfig(),
          fetchDashboardSnapshot(),
          fetchGiveawayDashboard(),
        ]);
        const manageable = snapshot.groups.filter((group) => group.canManage && group.status.kind !== "removed");
        setGroups(manageable);
        setConfig(configData);
        setBalance(dashboard.balance);
        const defaultGroup = focusGroupId && manageable.some((group) => group.id === focusGroupId)
          ? focusGroupId
          : manageable[0]?.id ?? null;
        const defaultPlan = configData.plans[0]?.id ?? null;
        const defaultDuration = configData.durationOptions[0] ?? 6;
        setSelectedGroupId(defaultGroup);
        setSelectedPlanId(defaultPlan);
        setSelectedDuration(defaultDuration);
        setCustomDuration(defaultDuration);
        setUseCustomDuration(false);
      } catch (err) {
        const normalized = err instanceof Error ? err : new Error(String(err));
        setError(normalized);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const plan = useMemo<GiveawayPlanOption | null>(() => {
    if (!config || !selectedPlanId) {
      return null;
    }
    return config.plans.find((item) => item.id === selectedPlanId) ?? null;
  }, [config, selectedPlanId]);

  const totalCost = useMemo(() => {
    if (!plan) {
      return 0;
    }
    return plan.pricePerWinner * Math.max(MIN_WINNERS, winners);
  }, [plan, winners]);

  const durationValue = useMemo(() => {
    const value = useCustomDuration ? customDuration : selectedDuration;
    return Math.max(MIN_DURATION, value);
  }, [useCustomDuration, customDuration, selectedDuration]);

  const handleWinnersChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value);
    if (Number.isNaN(parsed)) {
      setWinners(MIN_WINNERS);
      return;
    }
    setWinners(Math.max(MIN_WINNERS, parsed));
  };

  const handleCustomDurationChange = (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value);
    if (Number.isNaN(parsed)) {
      setCustomDuration(MIN_DURATION);
      return;
    }
    setCustomDuration(Math.max(MIN_DURATION, parsed));
  };

  const handleSubmit = useCallback(async () => {
    if (!selectedGroupId || !plan) {
      return;
    }
    const payload: GiveawayCreationPayload = {
      groupId: selectedGroupId,
      planId: plan.id,
      winners: Math.max(MIN_WINNERS, winners),
      durationHours: durationValue,
      premiumOnly,
      notifyStart,
      notifyEnd,
      extraChannel: extraChannel.trim().length > 1 ? extraChannel.trim() : undefined,
      title: title.trim() || undefined,
    };
    try {
      setProcessing(true);
      const result = await createGiveaway(payload);
      setLastResult(result);
      setBalance((prev) => Math.max(0, prev - result.totalCost));
      setSnackbar(`گیواوی با موفقیت ساخته شد. هزینه: ${toPersianDigits(result.totalCost)} ⭐️`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSnackbar(message);
    } finally {
      setProcessing(false);
    }
  }, [selectedGroupId, plan, winners, durationValue, premiumOnly, notifyStart, notifyEnd, extraChannel, title]);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(null);
  }, []);

  const disableSubmit = !selectedGroupId || !plan || processing || durationValue <= 0;
  const insufficientBalance = plan ? totalCost > balance : false;

  if (loading) {
    return (
      <Page>
        <div className={styles.page} dir="rtl">
          <Placeholder header="در حال بارگذاری" description="لطفاً کمی صبر کنید." />
        </div>
      </Page>
    );
  }

  if (error || !config || groups.length === 0) {
    return (
      <Page>
        <div className={styles.page} dir="rtl">
          <Placeholder
            header="خطا در بارگذاری داده‌ها"
            description={error?.message ?? "اطلاعات کافی برای ساخت گیواوی موجود نیست."}
          >
            <Button mode="filled" onClick={() => window.location.reload()}>
              تلاش مجدد
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className={styles.page} dir="rtl">
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Title level="3" className={styles.sectionTitle}>
              ساخت گیواوی جدید
            </Title>
            <div className={styles.inline}>
              <Text weight="2">موجودی: {toPersianDigits(balance)} ⭐️</Text>
              <Button mode="plain" size="s" onClick={() => navigate("/giveaways")}>مدیریت گیواوی‌ها</Button>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.inputRow}>
              <Text weight="2">انتخاب گروه میزبان</Text>
              <div className={styles.planGrid}>
                {groups.map((group) => {
                  const active = group.id === selectedGroupId;
                  return (
                    <div
                      key={group.id}
                      className={classNames(styles.planCard, active && styles.planCardActive)}
                      onClick={() => setSelectedGroupId(group.id)}
                    >
                      <Text weight="2">{group.title}</Text>
                      <Text className={styles.planDescription}>
                        {toPersianDigits(group.membersCount)} عضو
                      </Text>
                      <Text className={styles.note}>وضعیت: {group.status.kind === "active" ? "فعال" : "غیرفعال"}</Text>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.inputRow}>
              <Text weight="2">انتخاب جایزه</Text>
              <div className={styles.planGrid}>
                {config.plans.map((option) => {
                  const active = option.id === selectedPlanId;
                  return (
                    <div
                      key={option.id}
                      className={classNames(styles.planCard, active && styles.planCardActive)}
                      onClick={() => setSelectedPlanId(option.id)}
                    >
                      <Text weight="2" className={styles.planPrice}>
                        {toPersianDigits(option.pricePerWinner)} ⭐️ برای هر برنده
                      </Text>
                      <Text className={styles.planDescription}>اعتبار {toPersianDigits(option.days)} روزه</Text>
                      <Text className={styles.note}>قیمت پایه: {toPersianDigits(option.basePrice)} ⭐️</Text>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.inputRow}>
              <Text weight="2">تعداد برندگان</Text>
              <Input
                type="number"
                value={winners}
                min={MIN_WINNERS}
                onChange={handleWinnersChange}
                dir="rtl"
              />
            </div>

            <div className={styles.inputRow}>
              <Text weight="2">مدت زمان برگزاری</Text>
              <div className={styles.planGrid}>
                {config.durationOptions.map((option) => {
                  const active = !useCustomDuration && option === selectedDuration;
                  return (
                    <div
                      key={option}
                      className={classNames(styles.planCard, active && styles.planCardActive)}
                      onClick={() => {
                        setUseCustomDuration(false);
                        setSelectedDuration(option);
                      }}
                    >
                      <Text weight="2">{toPersianDigits(option)} ساعت</Text>
                    </div>
                  );
                })}
                <div
                  className={classNames(styles.planCard, useCustomDuration && styles.planCardActive)}
                  onClick={() => setUseCustomDuration(true)}
                >
                  <Text weight="2">مدت زمان سفارشی</Text>
                  <Input
                    type="number"
                    value={customDuration}
                    min={MIN_DURATION}
                    onChange={handleCustomDurationChange}
                    dir="rtl"
                    onClick={(event) => event.stopPropagation()}
                  />
                  <Text className={styles.note}>حداقل {toPersianDigits(MIN_DURATION)} ساعت</Text>
                </div>
              </div>
            </div>

            <div className={styles.inputRow}>
              <Text weight="2">شرایط و تنظیمات</Text>
              <div className={styles.list}>
                <div className={styles.requirementItem}>
                  <div>
                    <Text weight="2">فقط کاربران پریمیوم</Text>
                    <Text className={styles.note}>شرکت‌کنندگان باید حساب پریمیوم داشته باشند.</Text>
                  </div>
                  <Switch checked={premiumOnly} onChange={(event) => setPremiumOnly(event.target.checked)} />
                </div>
                <div className={styles.requirementItem}>
                  <div>
                    <Text weight="2">نوتیفیکیشن شروع</Text>
                    <Text className={styles.note}>ارسال اعلان شروع گیواوی در کانال هدف.</Text>
                  </div>
                  <Switch checked={notifyStart} onChange={(event) => setNotifyStart(event.target.checked)} />
                </div>
                <div className={styles.requirementItem}>
                  <div>
                    <Text weight="2">نوتیفیکیشن پایان</Text>
                    <Text className={styles.note}>ارسال نتیجه گیواوی در کانال پس از پایان.</Text>
                  </div>
                  <Switch checked={notifyEnd} onChange={(event) => setNotifyEnd(event.target.checked)} />
                </div>
                <div className={styles.inputRow}>
                  <Text weight="2">لینک کانال اضافی (اختیاری)</Text>
                  <Input
                    value={extraChannel}
                    onChange={(event) => setExtraChannel(event.target.value)}
                    placeholder="@channel"
                    dir="rtl"
                  />
                  <Text className={styles.note}>حداکثر یک لینک کانال دیگر برای حمایت.</Text>
                </div>
                <div className={styles.inputRow}>
                  <Text weight="2">عنوان گیواوی (اختیاری)</Text>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} dir="rtl" />
                </div>
              </div>
            </div>

            <div className={styles.inputRow}>
              <Text weight="2">خلاصه هزینه</Text>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>قیمت هر برنده</span>
                <span className={styles.summaryValue}>
                  {plan ? `${toPersianDigits(plan.pricePerWinner)} ⭐️` : "--"}
                </span>
                <span className={styles.summaryLabel}>هزینه کل ({toPersianDigits(winners)} برنده)</span>
                <span className={styles.summaryValue}>{toPersianDigits(totalCost)} ⭐️</span>
                {insufficientBalance && (
                  <Text className={styles.note}>موجودی کافی نیست. لطفاً ابتدا اعتبار را افزایش دهید.</Text>
                )}
              </div>
            </div>
          </div>

          <div className={styles.inline}>
            <Button
              mode="filled"
              size="m"
              stretched
              disabled={disableSubmit || insufficientBalance}
              onClick={handleSubmit}
            >
              {processing ? "در حال ایجاد..." : "Start Giveaway"}
            </Button>
            {lastResult && (
              <Button mode="plain" size="s" onClick={() => navigate(`/giveaways/${lastResult.id}`)}>
                مشاهده گیواوی
              </Button>
            )}
          </div>
        </section>

        {snackbar && (
          <Snackbar duration={3500} onClose={handleCloseSnackbar}>
            {snackbar}
          </Snackbar>
        )}
      </div>
    </Page>
  );
}





