import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Placeholder, Snackbar, Switch, Text, Title } from "@telegram-apps/telegram-ui";

import { Page } from "@/components/Page.tsx";
import { classNames } from "@/css/classnames.ts";
import { fetchGiveawayDetail, joinGiveaway } from "@/features/dashboard/api.ts";
import type { GiveawayDetail } from "@/features/dashboard/types.ts";
import { useOwnerProfile } from "@/features/dashboard/useOwnerProfile.ts";
import { toPersianDigits } from "@/utils/format.ts";

import styles from "./GiveawayPages.module.css";

type RouteParams = {
  giveawayId: string;
};

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return `${toPersianDigits(hours)}:${toPersianDigits(minutes.toString().padStart(2, "0"))}:${toPersianDigits(secs.toString().padStart(2, "0"))}`;
}

function buildChannelLink(value: string): string {
  if (!value) {
    return "";
  }
  if (value.startsWith("http")) {
    return value;
  }
  const normalized = value.startsWith("@") ? value.slice(1) : value;
  return `https://t.me/${normalized}`;
}

export function JoinGiveawayPage() {
  const { giveawayId } = useParams<RouteParams>();
  const navigate = useNavigate();
  const { user } = useOwnerProfile();
  const hasPremium = user?.is_premium === true;

  const [detail, setDetail] = useState<GiveawayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [extraVisited, setExtraVisited] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const load = useCallback(async () => {
    if (!giveawayId) {
      return;
    }
    try {
      setLoading(true);
      const data = await fetchGiveawayDetail(giveawayId);
      setDetail(data);
      setCountdown(data.remainingSeconds);
      setSubscribed(false);
      setExtraVisited(false);
      setError(null);
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error(String(err));
      setError(normalized);
      setSnackbar(normalized.message);
    } finally {
      setLoading(false);
    }
  }, [giveawayId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detail) {
      return;
    }
    setCountdown(detail.remainingSeconds);
  }, [detail]);

  useEffect(() => {
    if (!detail) {
      return;
    }
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [detail]);

  const handleCloseSnackbar = useCallback(() => setSnackbar(null), []);

  const extraChannelLink = useMemo(() => buildChannelLink(detail?.requirements.extraChannel ?? ""), [detail]);
  const mainChannelLink = useMemo(() => buildChannelLink(detail?.requirements.targetChannel ?? ""), [detail]);

  const canJoin = useMemo(() => {
    if (!detail) {
      return false;
    }
    if (detail.status !== "active" || detail.joined) {
      return false;
    }
    if (detail.requirements.premiumOnly && !hasPremium) {
      return false;
    }
    if (!subscribed) {
      return false;
    }
    if (detail.requirements.extraChannel && !extraVisited) {
      return false;
    }
    return true;
  }, [detail, hasPremium, subscribed, extraVisited]);

  const handleJoin = useCallback(async () => {
    if (!giveawayId || !canJoin) {
      return;
    }
    try {
      setJoining(true);
      const updated = await joinGiveaway(giveawayId);
      setDetail(updated);
      setSnackbar("با موفقیت به گیواوی پیوستید");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSnackbar(message);
    } finally {
      setJoining(false);
    }
  }, [giveawayId, canJoin]);

  if (loading) {
    return (
      <Page>
        <div className={styles.page} dir="rtl">
          <Placeholder header="در حال بارگذاری" description="لطفاً کمی صبر کنید." />
        </div>
      </Page>
    );
  }

  if (error || !detail) {
    return (
      <Page>
        <div className={styles.page} dir="rtl">
          <Placeholder header="گیواوی یافت نشد" description={error?.message ?? "اطلاعات در دسترس نیست."}>
            <Button mode="filled" onClick={() => navigate("/giveaways")}>بازگشت</Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  const alreadyJoined = detail.joined;
  const premiumBlocked = detail.requirements.premiumOnly && !hasPremium;

  return (
    <Page>
      <div className={styles.page} dir="rtl">
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Title level="3" className={styles.sectionTitle}>
              Gifts Giveaway
            </Title>
            <span className={classNames(styles.countdown)}>{formatTime(countdown)}</span>
          </div>
          <Text weight="2">{detail.title}</Text>
          <Text className={styles.note}>
            جایزه: اعتبار {toPersianDigits(detail.prize.days)} روزه برای {toPersianDigits(detail.winnersCount)} نفر (هر نفر {toPersianDigits(detail.prize.pricePerWinner)} ⭐️)
          </Text>
          <div className={styles.tagRow}>
            <Text>شرکت‌کنندگان: {toPersianDigits(detail.participants)}</Text>
            <Text>برندگان: {toPersianDigits(detail.winnersCount)}</Text>
            <Text>پایان: {new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(detail.endsAt))}</Text>
          </div>
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            شرایط شرکت
          </Title>
          <div className={styles.requirementsList}>
            <div className={styles.requirementItem}>
              <div>
                <Text weight="2">عضویت در کانال</Text>
                <Text className={styles.note}>{detail.requirements.targetChannel}</Text>
              </div>
              <div className={styles.inline}>
                <Button mode="plain" size="s" onClick={() => window.open(mainChannelLink, "_blank")}>مشاهده</Button>
                <Switch checked={subscribed} onChange={(event) => setSubscribed(event.target.checked)} />
              </div>
            </div>
            {detail.requirements.extraChannel && (
              <div className={styles.requirementItem}>
                <div>
                  <Text weight="2">بازدید از لینک پشتیبان</Text>
                  <Text className={styles.note}>{detail.requirements.extraChannel}</Text>
                </div>
                <div className={styles.inline}>
                  <Button mode="plain" size="s" onClick={() => window.open(extraChannelLink, "_blank")}>باز کردن</Button>
                  <Switch checked={extraVisited} onChange={(event) => setExtraVisited(event.target.checked)} />
                </div>
              </div>
            )}
            {detail.requirements.premiumOnly && (
              <div className={styles.requirementItem}>
                <div>
                  <Text weight="2">حساب پریمیوم تلگرام</Text>
                  <Text className={styles.note}>
                    {hasPremium ? "حساب پریمیوم تایید شد." : "برای شرکت باید پریمیوم باشید."}
                  </Text>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            شرکت در گیواوی
          </Title>
          {alreadyJoined && <Text className={styles.note}>شما قبلاً در این گیواوی شرکت کرده‌اید.</Text>}
          {premiumBlocked && (
            <Text className={styles.note}>این گیواوی فقط برای کاربران پریمیوم فعال است.</Text>
          )}
          <Button
            mode="filled"
            size="m"
            stretched
            disabled={!canJoin || joining}
            onClick={handleJoin}
          >
            {joining ? "در حال ثبت..." : alreadyJoined ? "شرکت شده" : "Join Giveaway"}
          </Button>
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
