import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Placeholder, Snackbar, Text, Title } from "@telegram-apps/telegram-ui";

import { Page } from "@/components/Page.tsx";
import { classNames } from "@/css/classnames.ts";
import { fetchGiveawayDashboard } from "@/features/dashboard/api.ts";
import type { GiveawayDashboardData, GiveawaySummary } from "@/features/dashboard/types.ts";
import { formatNumber, toPersianDigits } from "@/utils/format.ts";

import styles from "./GiveawayPages.module.css";

const TEXT = {
  loading: {
    header: "Loading",
    description: "Please wait a moment.",
  },
  error: {
    header: "Unable to fetch data",
    action: "Retry",
    empty: "No data available.",
  },
  overview: {
    title: "Manage giveaways",
    balance: (value: number) => `Balance: ${formatNumber(value)} stars`,
    create: "Create a new giveaway",
  },
  sections: {
    active: "Active giveaways",
    past: "Past giveaways",
  },
  cards: {
    group: (title: string) => `Group: ${title}`,
    winners: (count: number) => `Winners: ${toPersianDigits(count)}`,
    participants: (count: number) => `Participants: ${toPersianDigits(count)}`,
    ends: (when: string) => `Ends: ${when}`,
    starts: (when: string) => `Starts: ${when}`,
    cost: (value: number) => `Total cost: ${formatNumber(value)} stars`,
    view: "View public page",
    empty: "Nothing to show.",
  },
  status: {
    active: "Active",
    scheduled: "Scheduled",
    completed: "Completed",
  },
};

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function renderSummaryTag(status: GiveawaySummary["status"]): string {
  if (status === "active") {
    return TEXT.status.active;
  }
  if (status === "scheduled") {
    return TEXT.status.scheduled;
  }
  return TEXT.status.completed;
}

export function GiveawayDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<GiveawayDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const dashboard = await fetchGiveawayDashboard();
      setData(dashboard);
      setError(null);
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error(String(err));
      setError(normalized);
      setSnackbar(normalized.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCloseSnackbar = useCallback(() => setSnackbar(null), []);

  const renderList = (items: GiveawaySummary[]) => {
    if (items.length === 0) {
      return <Text className={styles.note}>{TEXT.cards.empty}</Text>;
    }
    return (
      <div className={styles.list}>
        {items.map((item) => {
          const tagClass =
            item.status === "active"
              ? styles.badgeActive
              : item.status === "completed"
                ? styles.badgeCompleted
                : styles.tag;
          return (
            <div key={item.id} className={styles.card}>
              <div className={styles.sectionHeader}>
                <Title level="3" className={styles.sectionTitle}>
                  {item.title}
                </Title>
                <span className={classNames(styles.tag, tagClass)}>{renderSummaryTag(item.status)}</span>
              </div>
              <div className={styles.tagRow}>
                <Text>{TEXT.cards.group(item.targetGroup.title)}</Text>
                <Text>{TEXT.cards.winners(item.winnersCount)}</Text>
                <Text>{TEXT.cards.participants(item.participants)}</Text>
              </div>
              <div className={styles.tagRow}>
                <Text>{TEXT.cards.ends(formatDateTime(item.endsAt))}</Text>
                <Text>{TEXT.cards.starts(formatDateTime(item.startsAt))}</Text>
              </div>
              <Text className={styles.note}>{TEXT.cards.cost(item.prize.totalCost)}</Text>
              <div className={styles.inline}>
                <Button mode="plain" size="s" onClick={() => navigate(`/giveaways/${item.id}`)}>
                  {TEXT.cards.view}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Page>
        <div className={styles.page} dir="ltr">
          <Placeholder header={TEXT.loading.header} description={TEXT.loading.description} />
        </div>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page>
        <div className={styles.page} dir="ltr">
          <Placeholder header={TEXT.error.header} description={error?.message ?? TEXT.error.empty}>
            <Button mode="filled" onClick={load}>
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
              {TEXT.overview.title}
            </Title>
            <div className={styles.inline}>
              <Text weight="2">{TEXT.overview.balance(data.balance)}</Text>
              <Button mode="filled" size="s" onClick={() => navigate("/giveaways/create")}>
                {TEXT.overview.create}
              </Button>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            {TEXT.sections.active}
          </Title>
          {renderList(data.active)}
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            {TEXT.sections.past}
          </Title>
          {renderList(data.past)}
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
