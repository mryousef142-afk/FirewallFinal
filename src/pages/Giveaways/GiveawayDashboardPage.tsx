import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Placeholder, Snackbar, Text, Title } from "@telegram-apps/telegram-ui";

import { Page } from "@/components/Page.tsx";
import { classNames } from "@/css/classnames.ts";
import { fetchGiveawayDashboard } from "@/features/dashboard/api.ts";
import type { GiveawayDashboardData, GiveawaySummary } from "@/features/dashboard/types.ts";
import { toPersianDigits } from "@/utils/format.ts";

import styles from "./GiveawayPages.module.css";

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
    return "فعال";
  }
  if (status === "scheduled") {
    return "برنامه‌ریزی شده";
  }
  return "تمام شده";
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
      return <Text className={styles.note}>آیتمی موجود نیست.</Text>;
    }
    return (
      <div className={styles.list}>
        {items.map((item) => {
          const tagClass = item.status === "active" ? styles.badgeActive : item.status === "completed" ? styles.badgeCompleted : styles.tag;
          return (
            <div key={item.id} className={styles.card}>
              <div className={styles.sectionHeader}>
                <Title level="3" className={styles.sectionTitle}>
                  {item.title}
                </Title>
                <span className={classNames(styles.tag, tagClass)}>{renderSummaryTag(item.status)}</span>
              </div>
              <div className={styles.tagRow}>
                <Text>گروه: {item.targetGroup.title}</Text>
                <Text>برنده‌ها: {toPersianDigits(item.winnersCount)}</Text>
                <Text>شرکت‌کنندگان: {toPersianDigits(item.participants)}</Text>
              </div>
              <div className={styles.tagRow}>
                <Text>پایان: {formatDateTime(item.endsAt)}</Text>
                <Text>شروع: {formatDateTime(item.startsAt)}</Text>
              </div>
              <Text className={styles.note}>هزینه کل: {toPersianDigits(item.prize.totalCost)} ⭐️</Text>
              <div className={styles.inline}>
                <Button mode="plain" size="s" onClick={() => navigate(`/giveaways/${item.id}`)}>
                  مشاهده صفحه عمومی
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
        <div className={styles.page} dir="rtl">
          <Placeholder header="در حال بارگذاری" description="لطفاً کمی صبر کنید." />
        </div>
      </Page>
    );
  }

  if (error || !data) {
    return (
      <Page>
        <div className={styles.page} dir="rtl">
          <Placeholder header="خطا در بارگذاری" description={error?.message ?? "امکان دریافت اطلاعات نیست."}>
            <Button mode="filled" onClick={load}>
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
              مدیریت گیواوی‌ها
            </Title>
            <div className={styles.inline}>
              <Text weight="2">موجودی فعلی: {toPersianDigits(data.balance)} ⭐️</Text>
              <Button mode="filled" size="s" onClick={() => navigate("/giveaways/create")}>
                ساخت گیواوی جدید
              </Button>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            گیواوی‌های فعال
          </Title>
          {renderList(data.active)}
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            گیواوی‌های گذشته
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
