import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Avatar, Button, IconButton, Placeholder, Text, Title } from "@telegram-apps/telegram-ui";

import { GroupMenuDrawer } from "@/features/dashboard/GroupMenuDrawer.tsx";
import { StatCard } from "@/features/dashboard/StatCard.tsx";
import { fetchGroupDetails } from "@/features/dashboard/api.ts";
import type { GroupDetail, ManagedGroup } from "@/features/dashboard/types.ts";
import { GroupCardSkeleton } from "@/features/dashboard/GroupCardSkeleton.tsx";
import {
  formatDurationFromMs,
  formatNumber,
  formatSignedPercent,
} from "@/utils/format.ts";

import styles from "./GroupDashboardPage.module.css";

type LocationState = {
  group?: ManagedGroup;
  action?: string;
};

type SummaryCard = {
  key: string;
  icon: string;
  title: string;
  value: string;
  description: string;
  trendLabel?: string;
  trendTone?: "positive" | "negative" | "neutral";
  tone?: "default" | "warning" | "danger" | "success";
  footer?: ReactNode;
};

export function GroupDashboardPage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!groupId) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchGroupDetails(groupId);
        if (cancelled) {
          return;
        }
        setDetail(data);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const group = detail?.group ?? state.group;
  const metrics = detail?.metrics;

  const trendToneFor = useCallback((direction: "up" | "down" | "flat"): SummaryCard["trendTone"] => {
    if (direction === "up") {
      return "positive";
    }
    if (direction === "down") {
      return "negative";
    }
    return "neutral";
  }, []);

  const summaryCards = useMemo<SummaryCard[]>(() => {
    if (!metrics) {
      return [];
    }

    const remainingLabel = metrics.isExpired
      ? "❌ اعتبار تمام شده"
      : formatDurationFromMs(metrics.remainingMs);

    const remainingTone: "default" | "danger" = metrics.isExpired ? "danger" : "default";

    return [
      {
        key: "members",
        icon: "👥",
        title: "تعداد اعضا",
        value: formatNumber(metrics.membersTotal),
        description: "آمار لحظه‌ای اعضای گروه",
        trendLabel: `${formatSignedPercent(metrics.membersTrend.direction, metrics.membersTrend.percent)} نسبت به دیروز`,
        trendTone: trendToneFor(metrics.membersTrend.direction),
      },
      {
        key: "remaining",
        icon: "⏳",
        title: "اعتبار باقی‌مانده",
        value: remainingLabel,
        description: metrics.isExpired ? "برای ادامه خدمات، تمدید ضروری است." : "تا پایان دوره جاری",
        trendTone: "neutral",
        tone: remainingTone,
        footer: metrics.isExpired ? (
          <Button
            size="s"
            mode="filled"
            stretched
            onClick={() => setMenuOpen(true)}
          >
            تمدید اعتبار
          </Button>
        ) : undefined,
      },
      {
        key: "messages",
        icon: "💬",
        title: "پیام‌های امروز",
        value: formatNumber(metrics.messagesToday),
        description: "حجم فعالیت امروز گروه",
        trendLabel: `${formatSignedPercent(metrics.messagesTrend.direction, metrics.messagesTrend.percent)} نسبت به دیروز`,
        trendTone: trendToneFor(metrics.messagesTrend.direction),
      },
      {
        key: "newMembers",
        icon: "➕",
        title: "اعضای جدید امروز",
        value: formatNumber(metrics.newMembersToday),
        description: "تعداد ورودی‌های امروز",
        trendLabel: `${formatSignedPercent(metrics.newMembersTrend.direction, metrics.newMembersTrend.percent)} نسبت به دیروز`,
        trendTone: trendToneFor(metrics.newMembersTrend.direction),
      },
    ];
  }, [metrics, trendToneFor]);

  const handleMenuSelect = useCallback(
    (key: string) => {
      if (!groupId) {
        return;
      }
      switch (key) {
        case "home":
          break;
        case "settings":
          navigate(`/groups/${groupId}/settings/general`, { state: { group } });
          break;
        case "mute":
          navigate(`/groups/${groupId}/settings/mute`, { state: { group } });
          break;
        case "limits":
          navigate(`/groups/${groupId}/settings/limits`, { state: { group } });
          break;
        case "mandatory":
          navigate(`/groups/${groupId}/settings/mandatory`, { state: { group } });
          break;
        case "texts":
          navigate(`/groups/${groupId}/settings/texts`, { state: { group } });
          break;
        case "analytics":
          navigate(`/groups/${groupId}/analytics`, { state: { group } });
          break;
        case "stars":
          navigate("/stars", { state: { focusGroupId: groupId } });
          break;
        default:
          console.info(`[group-dashboard] menu item '${key}' selected`);
      }
    },
    [groupId, group, navigate],
  );

  const renderContent = () => {
    if (loading && !detail) {
      return (
        <div className={styles.loading}>
          {Array.from({ length: 4 }).map((_, index) => (
            <GroupCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Placeholder header="خطا در بارگذاری" description={error.message}>
          <Button mode="filled" onClick={() => navigate(-1)}>
            بازگشت
          </Button>
        </Placeholder>
      );
    }

    if (!group || !metrics) {
      return (
        <Placeholder
          header="گروه یافت نشد"
          description="برای بازگشت به لیست گروه‌ها دکمه زیر را لمس کن."
        >
          <Button mode="filled" onClick={() => navigate("/")}>
            بازگشت
          </Button>
        </Placeholder>
      );
    }

    return (
      <>
        <div className={styles.statsGrid}>
          {summaryCards.map((card) => (
            <StatCard
              key={card.key}
              icon={card.icon}
              title={card.title}
              value={card.value}
              description={card.description}
              trendLabel={card.trendLabel}
              trendTone={card.trendTone}
              tone={card.tone}
              footer={card.footer}
            />
          ))}
        </div>
        <div className={styles.footerCtas}>
          <Button mode="outline" size="m" stretched onClick={() => setMenuOpen(true)}>
            مشاهده ماژول‌ها
          </Button>
          <Button mode="filled" size="m" stretched>
            برو به آمار کامل
          </Button>
        </div>
      </>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header} dir="rtl">
        <div className={styles.headerLeft}>
          <Button mode="plain" size="s" onClick={() => navigate(-1)}>
            بازگشت
          </Button>
        </div>
        <div className={styles.headerCenter}>
          <Avatar
            size={48}
            src={group?.photoUrl ?? undefined}
            acronym={group?.photoUrl ? undefined : group?.title?.charAt(0).toUpperCase() ?? "?"}
            alt={group?.title ?? "group"}
          />
          <div className={styles.headerTitles}>
            <Title level="3" className={styles.groupName}>
              {group ? group.title : "در حال بارگذاری"}
            </Title>
            <Text weight="2" className={styles.groupSubtitle}>
              پنل مدیریت
            </Text>
          </div>
        </div>
        <div className={styles.headerRight}>
          <IconButton aria-label="نمایش ماژول‌ها" onClick={() => setMenuOpen(true)}>
            <span className={styles.burger}>
              <span />
              <span />
              <span />
            </span>
          </IconButton>
        </div>
      </header>
      <main className={styles.body}>{renderContent()}</main>
      <GroupMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeKey="home"
        onSelect={handleMenuSelect}
      />
    </div>
  );
}

