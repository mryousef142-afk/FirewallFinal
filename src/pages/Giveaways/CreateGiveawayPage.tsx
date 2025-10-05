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
import { formatNumber, toPersianDigits } from "@/utils/format.ts";

import styles from "./GiveawayPages.module.css";

const MIN_WINNERS = 1;
const MIN_DURATION = 1;

type LocationState = {
  focusGroupId?: string;
};

const TEXT = {
  loading: {
    header: "Loading",
    description: "Please wait a moment.",
  },
  error: {
    header: "Unable to load giveaway data",
    description: "We couldn't fetch enough information to create a giveaway.",
    action: "Retry",
  },
  header: {
    title: "Create Giveaway",
    manage: "Manage giveaways",
  },
  group: {
    title: "Choose the host group",
    statusActive: "Active",
    statusInactive: "Inactive",
  },
  reward: {
    title: "Choose a reward",
    priceSuffix: "stars per winner",
    daySuffix: "day access",
    basePrefix: "Base cost: ",
  },
  winners: "Number of winners",
  duration: {
    title: "Giveaway duration",
    custom: "Custom duration",
    optionSuffix: "hours",
    minimumPrefix: "Minimum",
  },
  requirements: {
    title: "Requirements & notifications",
    premiumTitle: "Premium users only",
    premiumNote: "Participants must have Telegram Premium enabled.",
    startTitle: "Start notification",
    startNote: "Announce the giveaway start in the target channel.",
    endTitle: "End notification",
    endNote: "Announce the winners in the channel when it finishes.",
    extraTitle: "Additional channel (optional)",
    extraPlaceholder: "@channel",
    extraNote: "Promote a second channel alongside the giveaway.",
    titleLabel: "Giveaway title (optional)",
  },
  summary: {
    title: "Cost summary",
    pricePerWinner: "Price per winner",
    totalPrefix: "Total cost (",
    totalSuffix: " winner(s))",
    insufficient: "Balance is not sufficient. Please top up first.",
  },
  actions: {
    create: "Start giveaway",
    processing: "Creating...",
    view: "View giveaway",
  },
} as const;

const balanceLabel = (value: number) => `Balance: ${formatNumber(value)} stars`;
const groupMembersLabel = (count: number) => `${formatNumber(count)} members`;
const groupStatusLabel = (kind: string) =>
  `Status: ${kind === "active" ? TEXT.group.statusActive : TEXT.group.statusInactive}`;
const rewardPriceLabel = (value: number) => `${formatNumber(value)} ${TEXT.reward.priceSuffix}`;
const rewardDaysLabel = (days: number) => `${toPersianDigits(days)} ${TEXT.reward.daySuffix}`;
const rewardBaseLabel = (value: number) => `${TEXT.reward.basePrefix}${formatNumber(value)} stars`;
const durationOptionLabel = (hours: number) => `${toPersianDigits(hours)} ${TEXT.duration.optionSuffix}`;
const durationMinimumLabel = (min: number) =>
  `${TEXT.duration.minimumPrefix} ${toPersianDigits(min)} ${TEXT.duration.optionSuffix}`;
const summaryTotalLabel = (count: number) =>
  `${TEXT.summary.totalPrefix}${formatNumber(count)}${TEXT.summary.totalSuffix}`;

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
        const defaultGroup =
          focusGroupId && manageable.some((group) => group.id === focusGroupId)
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
  }, [focusGroupId]);

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
      setSnackbar(`Giveaway created successfully. Total cost: ${formatNumber(result.totalCost)} stars`);
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
        <div className={styles.page} dir="ltr">
          <Placeholder header={TEXT.loading.header} description={TEXT.loading.description} />
        </div>
      </Page>
    );
  }

  if (error || !config || groups.length === 0) {
    return (
      <Page>
        <div className={styles.page} dir="ltr">
          <Placeholder header={TEXT.error.header} description={error?.message ?? TEXT.error.description}>
            <Button mode="filled" onClick={() => window.location.reload()}>
              {TEXT.error.action}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className={styles.page} dir="ltr">
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Title level="3" className={styles.sectionTitle}>
              {TEXT.header.title}
            </Title>
            <div className={styles.inline}>
              <Text weight="2">{balanceLabel(balance)}</Text>
              <Button mode="plain" size="s" onClick={() => navigate("/giveaways")}>
                {TEXT.header.manage}
              </Button>
            </div>
          </div>

          <div className={styles.grid}>
            <div className={styles.inputRow}>
              <Text weight="2">{TEXT.group.title}</Text>
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
                      <Text className={styles.planDescription}>{groupMembersLabel(group.membersCount)}</Text>
                      <Text className={styles.note}>{groupStatusLabel(group.status.kind)}</Text>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.inputRow}>
              <Text weight="2">{TEXT.reward.title}</Text>
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
                        {rewardPriceLabel(option.pricePerWinner)}
                      </Text>
                      <Text className={styles.planDescription}>{rewardDaysLabel(option.days)}</Text>
                      <Text className={styles.note}>{rewardBaseLabel(option.basePrice)}</Text>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.inputRow}>
              <Text weight="2">{TEXT.winners}</Text>
              <Input type="number" value={winners} min={MIN_WINNERS} onChange={handleWinnersChange} />
            </div>

            <div className={styles.inputRow}>
              <Text weight="2">{TEXT.duration.title}</Text>
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
                      <Text weight="2">{durationOptionLabel(option)}</Text>
                    </div>
                  );
                })}
                <div
                  className={classNames(styles.planCard, useCustomDuration && styles.planCardActive)}
                  onClick={() => setUseCustomDuration(true)}
                >
                  <Text weight="2">{TEXT.duration.custom}</Text>
                  <Input
                    type="number"
                    value={customDuration}
                    min={MIN_DURATION}
                    onChange={handleCustomDurationChange}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <Text className={styles.note}>{durationMinimumLabel(MIN_DURATION)}</Text>
                </div>
              </div>
            </div>

            <div className={styles.inputRow}>
              <Text weight="2">{TEXT.requirements.title}</Text>
              <div className={styles.list}>
                <div className={styles.requirementItem}>
                  <div>
                    <Text weight="2">{TEXT.requirements.premiumTitle}</Text>
                    <Text className={styles.note}>{TEXT.requirements.premiumNote}</Text>
                  </div>
                  <Switch checked={premiumOnly} onChange={(event) => setPremiumOnly(event.target.checked)} />
                </div>
                <div className={styles.requirementItem}>
                  <div>
                    <Text weight="2">{TEXT.requirements.startTitle}</Text>
                    <Text className={styles.note}>{TEXT.requirements.startNote}</Text>
                  </div>
                  <Switch checked={notifyStart} onChange={(event) => setNotifyStart(event.target.checked)} />
                </div>
                <div className={styles.requirementItem}>
                  <div>
                    <Text weight="2">{TEXT.requirements.endTitle}</Text>
                    <Text className={styles.note}>{TEXT.requirements.endNote}</Text>
                  </div>
                  <Switch checked={notifyEnd} onChange={(event) => setNotifyEnd(event.target.checked)} />
                </div>
                <div className={styles.inputRow}>
                  <Text weight="2">{TEXT.requirements.extraTitle}</Text>
                  <Input
                    value={extraChannel}
                    onChange={(event) => setExtraChannel(event.target.value)}
                    placeholder={TEXT.requirements.extraPlaceholder}
                  />
                  <Text className={styles.note}>{TEXT.requirements.extraNote}</Text>
                </div>
                <div className={styles.inputRow}>
                  <Text weight="2">{TEXT.requirements.titleLabel}</Text>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </div>
              </div>
            </div>

            <div className={styles.inputRow}>
              <Text weight="2">{TEXT.summary.title}</Text>
              <div className={styles.summaryCard}>
                <span className={styles.summaryLabel}>{TEXT.summary.pricePerWinner}</span>
                <span className={styles.summaryValue}>
                  {plan ? `${formatNumber(plan.pricePerWinner)} stars` : "--"}
                </span>
                <span className={styles.summaryLabel}>{summaryTotalLabel(winners)}</span>
                <span className={styles.summaryValue}>{formatNumber(totalCost)} stars</span>
                {insufficientBalance && (
                  <Text className={styles.note}>{TEXT.summary.insufficient}</Text>
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
              {processing ? TEXT.actions.processing : TEXT.actions.create}
            </Button>
            {lastResult && (
              <Button mode="plain" size="s" onClick={() => navigate(`/giveaways/${lastResult.id}`)}>
                {TEXT.actions.view}
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
