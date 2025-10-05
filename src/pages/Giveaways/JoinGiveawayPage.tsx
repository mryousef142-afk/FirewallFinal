import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Placeholder, Snackbar, Switch, Text, Title } from "@telegram-apps/telegram-ui";

import { Page } from "@/components/Page.tsx";
import { classNames } from "@/css/classnames.ts";
import { fetchGiveawayDetail, joinGiveaway } from "@/features/dashboard/api.ts";
import type { GiveawayDetail } from "@/features/dashboard/types.ts";
import { useOwnerProfile } from "@/features/dashboard/useOwnerProfile.ts";
import { formatNumber, toPersianDigits } from "@/utils/format.ts";

import styles from "./GiveawayPages.module.css";

type RouteParams = {
  giveawayId: string;
};

const TEXT = {
  loading: {
    header: "Loading",
    description: "Please wait a moment.",
  },
  error: {
    header: "Giveaway not found",
    description: "No information available.",
    action: "Back",
  },
  header: {
    title: "Gifts giveaway",
  },
  reward: (detail: GiveawayDetail) =>
    `Reward: ${toPersianDigits(detail.prize.days)} day access for ${formatNumber(detail.winnersCount)} winner(s) — ${formatNumber(detail.prize.pricePerWinner)} stars each`,
  stats: {
    participants: (count: number) => `Participants: ${formatNumber(count)}`,
    winners: (count: number) => `Winners: ${formatNumber(count)}`,
    ends: (value: string) =>
      `Ends: ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))}`,
  },
  requirements: {
    title: "Participation requirements",
    host: "Subscribe to the host channel",
    partner: "Visit the partner channel",
    open: "Open",
    premium: {
      title: "Telegram Premium",
      ok: "Premium status confirmed.",
      missing: "Telegram Premium is required to participate.",
    },
  },
  actions: {
    title: "Join the giveaway",
    already: "You have already joined this giveaway.",
    premiumBlocked: "This giveaway is only available to Telegram Premium users.",
    join: "Join the giveaway",
    joined: "Already joined",
    submitting: "Submitting...",
    success: "Your participation has been recorded.",
  },
};

function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${toPersianDigits(pad(hours))}:${toPersianDigits(pad(minutes))}:${toPersianDigits(pad(secs))}`;
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
      setSnackbar(TEXT.actions.success);
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
        <div className={styles.page} dir="ltr">
          <Placeholder header={TEXT.loading.header} description={TEXT.loading.description} />
        </div>
      </Page>
    );
  }

  if (error || !detail) {
    return (
      <Page>
        <div className={styles.page} dir="ltr">
          <Placeholder header={TEXT.error.header} description={error?.message ?? TEXT.error.description}>
            <Button mode="filled" onClick={() => navigate("/giveaways")}>
              {TEXT.error.action}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  const alreadyJoined = detail.joined;
  const premiumBlocked = detail.requirements.premiumOnly && !hasPremium;

  return (
    <Page>
      <div className={styles.page} dir="ltr">
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <Title level="3" className={styles.sectionTitle}>
              {TEXT.header.title}
            </Title>
            <span className={classNames(styles.countdown)}>{formatTime(countdown)}</span>
          </div>
          <Text weight="2">{detail.title}</Text>
          <Text className={styles.note}>{TEXT.reward(detail)}</Text>
          <div className={styles.tagRow}>
            <Text>{TEXT.stats.participants(detail.participants)}</Text>
            <Text>{TEXT.stats.winners(detail.winnersCount)}</Text>
            <Text>{TEXT.stats.ends(detail.endsAt)}</Text>
          </div>
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            {TEXT.requirements.title}
          </Title>
          <div className={styles.requirementsList}>
            <div className={styles.requirementItem}>
              <div>
                <Text weight="2">{TEXT.requirements.host}</Text>
                <Text className={styles.note}>{detail.requirements.targetChannel}</Text>
              </div>
              <div className={styles.inline}>
                <Button mode="plain" size="s" onClick={() => window.open(mainChannelLink, "_blank")}>
                  {TEXT.requirements.open}
                </Button>
                <Switch checked={subscribed} onChange={(event) => setSubscribed(event.target.checked)} />
              </div>
            </div>
            {detail.requirements.extraChannel && (
              <div className={styles.requirementItem}>
                <div>
                  <Text weight="2">{TEXT.requirements.partner}</Text>
                  <Text className={styles.note}>{detail.requirements.extraChannel}</Text>
                </div>
                <div className={styles.inline}>
                  <Button mode="plain" size="s" onClick={() => window.open(extraChannelLink, "_blank")}>
                    {TEXT.requirements.open}
                  </Button>
                  <Switch checked={extraVisited} onChange={(event) => setExtraVisited(event.target.checked)} />
                </div>
              </div>
            )}
            {detail.requirements.premiumOnly && (
              <div className={styles.requirementItem}>
                <div>
                  <Text weight="2">{TEXT.requirements.premium.title}</Text>
                  <Text className={styles.note}>
                    {hasPremium ? TEXT.requirements.premium.ok : TEXT.requirements.premium.missing}
                  </Text>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            {TEXT.actions.title}
          </Title>
          {alreadyJoined && <Text className={styles.note}>{TEXT.actions.already}</Text>}
          {premiumBlocked && <Text className={styles.note}>{TEXT.actions.premiumBlocked}</Text>}
          <Button
            mode="filled"
            size="m"
            stretched
            disabled={!canJoin || joining}
            onClick={handleJoin}
          >
            {joining ? TEXT.actions.submitting : alreadyJoined ? TEXT.actions.joined : TEXT.actions.join}
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
