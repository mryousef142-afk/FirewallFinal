import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { openLink } from "@telegram-apps/sdk-react";
import { Avatar, Button, Card, Snackbar, Text, Title } from "@telegram-apps/telegram-ui";

import { useOwnerProfile } from "@/features/dashboard/useOwnerProfile.ts";
import { dashboardConfig } from "@/config/dashboard.ts";

import styles from "./MissionsPage.module.css";

type MissionCategory = "daily" | "weekly" | "monthly" | "general";

type MissionIconKey =
  | "check"
  | "renew"
  | "settings"
  | "chat"
  | "target"
  | "gift"
  | "invite"
  | "shield"
  | "uptime"
  | "stars"
  | "brain"
  | "trophy"
  | "link"
  | "review"
  | "groups"
  | "puzzle"
  | "analytics"
  | "broadcast"
  | "security"
  | "insight";

type Mission = {
  id: string;
  title: string;
  description: string;
  xp: number;
  icon: MissionIconKey;
  ctaLabel?: string;
  ctaLink?: string;
};

type Reward = {
  id: string;
  title: string;
  cost: number;
  description: string;
};

type DailyTaskChannelMission = {
  channelLink: string;
  buttonLabel: string;
  description: string;
  xp: number;
};

type CompletionState = Record<MissionCategory, Set<string>>;

type ReferralStats = {
  invites: number;
  xpEarned: number;
};


const LEVEL_THRESHOLDS = [0, 250, 600, 1050, 1600, 2200, 2850, 3550, 4300, 5100, 5950, 6850];

const MISSIONS: Record<MissionCategory, Mission[]> = {
  daily: [
    {
      id: "check-in",
      title: "Check in today",
      description: "Open Firewall once to refresh statistics and keep your streak alive.",
      xp: 10,
      icon: "check",
    },
    {
      id: "review-log",
      title: "Review the activity log",
      description: "Scan today’s joins and leaves for anything suspicious.",
      xp: 12,
      icon: "insight",
    },
    {
      id: "share-tip",
      title: "Share a safety tip",
      description: "Post a short reminder in your main group about staying secure.",
      xp: 12,
      icon: "broadcast",
    },
    {
      id: "welcome-newcomers",
      title: "Welcome new members",
      description: "Greet newcomers with a friendly message and pin the rules.",
      xp: 15,
      icon: "chat",
    },
  ],
  weekly: [
    {
      id: "renew-weekly",
      title: "Renew one group credit",
      description: "Extend uptime for any managed group by at least one week.",
      xp: 45,
      icon: "renew",
    },
    {
      id: "create-giveaway",
      title: "Launch a giveaway",
      description: "Create one giveaway to reward members and boost engagement.",
      xp: 50,
      icon: "gift",
    },
    {
      id: "weekly-recap",
      title: "Publish the weekly recap",
      description: "Send a security update or highlights recap to your moderator team.",
      xp: 30,
      icon: "analytics",
    },
    {
      id: "referral-push",
      title: "Earn two referral signups",
      description: "Invite two trusted members using your referral link and onboard them.",
      xp: 45,
      icon: "invite",
    },
  ],
  monthly: [
    {
      id: "complete-daily",
      title: "Complete 20 daily missions",
      description: "Stack enough daily completions to secure the streak bonus.",
      xp: 200,
      icon: "brain",
    },
    {
      id: "referral-milestone",
      title: "Unlock 10 referral signups",
      description: "Grow the network by bringing ten new teams on board this month.",
      xp: 220,
      icon: "invite",
    },
    {
      id: "store-redemption",
      title: "Redeem an XP reward",
      description: "Spend your XP in the marketplace on credits, Stars, or cosmetics.",
      xp: 160,
      icon: "stars",
    },
  ],
  general: [
    {
      id: "join-channel",
      title: "Join the official Firewall channel",
      description: "Subscribe to release notes, incident alerts, and roadmap votes.",
      xp: 15,
      icon: "link",
    },
    {
      id: "write-review",
      title: "Share your Firewall story",
      description: "Post a short review that helps others discover the bot.",
      xp: 20,
      icon: "review",
    },
    {
      id: "add-group",
      title: "Add Firewall to a new group",
      description: "Protect a fresh community that trusts your moderation style.",
      xp: 30,
      icon: "groups",
    },
    {
      id: "auto-delete",
      title: "Enable auto-delete bot messages",
      description: "Keep chats tidy by cleaning system confirmations automatically.",
      xp: 25,
      icon: "puzzle",
    },
    {
      id: "view-analytics",
      title: "Review analytics three times",
      description: "Monitor peaks and drops so you can react ahead of time.",
      xp: 20,
      icon: "analytics",
    },
    {
      id: "broadcast",
      title: "Send a mission broadcast",
      description: "Announce weekly objectives to spark teamwork in your community.",
      xp: 20,
      icon: "broadcast",
    },
    {
      id: "secure-admins",
      title: "Secure all admins",
      description: "Confirm that every teammate uses two-factor authentication.",
      xp: 35,
      icon: "security",
    },
    {
      id: "insight-note",
      title: "Log an insight",
      description: "Capture a moderation insight or lesson in your shared notes.",
      xp: 20,
      icon: "insight",
    },
  ],
};

const REWARDS: Reward[] = [
  {
    id: "reward-credit",
    title: "7-day uptime credit",
    cost: 1200,
    description: "Instantly extend any group by a full week.",
  },
  {
    id: "reward-badge",
    title: "Firewall Elite badge",
    cost: 800,
    description: "Unlock profile flair that highlights your dedication.",
  },
  {
    id: "reward-stars",
    title: "50 bonus Stars",
    cost: 1000,
    description: "Spend them on renewals, boosts, or community giveaways.",
  },
  {
    id: "reward-skin",
    title: "Command Center skin",
    cost: 1400,
    description: "Give your dashboard a limited-edition visual theme.",
  },
];

const REFERRAL_XP = 60;

const ICON_PALETTE: Record<MissionIconKey, { primary: string; secondary: string }> = {
  check: { primary: "var(--app-color-accent-cyan)", secondary: "rgba(30, 162, 255, 0.28)" },
  renew: { primary: "#38bdf8", secondary: "rgba(56, 189, 248, 0.28)" },
  settings: { primary: "#c084fc", secondary: "rgba(192, 132, 252, 0.24)" },
  chat: { primary: "#f97316", secondary: "rgba(249, 115, 22, 0.24)" },
  target: { primary: "#facc15", secondary: "rgba(250, 204, 21, 0.24)" },
  gift: { primary: "#f472b6", secondary: "rgba(244, 114, 182, 0.24)" },
  invite: { primary: "#38ef7d", secondary: "rgba(56, 239, 125, 0.24)" },
  shield: { primary: "#5eead4", secondary: "rgba(94, 234, 212, 0.24)" },
  uptime: { primary: "#60a5fa", secondary: "rgba(96, 165, 250, 0.24)" },
  stars: { primary: "#fbbf24", secondary: "rgba(251, 191, 36, 0.24)" },
  brain: { primary: "#a855f7", secondary: "rgba(168, 85, 247, 0.24)" },
  trophy: { primary: "#facc43", secondary: "rgba(250, 204, 67, 0.24)" },
  link: { primary: "#0ea5e9", secondary: "rgba(14, 165, 233, 0.24)" },
  review: { primary: "#f97316", secondary: "rgba(249, 115, 22, 0.24)" },
  groups: { primary: "#38bdf8", secondary: "rgba(56, 189, 248, 0.24)" },
  puzzle: { primary: "#f472b6", secondary: "rgba(244, 114, 182, 0.24)" },
  analytics: { primary: "#60a5fa", secondary: "rgba(96, 165, 250, 0.24)" },
  broadcast: { primary: "#fb7185", secondary: "rgba(251, 113, 133, 0.24)" },
  security: { primary: "#22d3ee", secondary: "rgba(34, 211, 238, 0.24)" },
  insight: { primary: "#fde047", secondary: "rgba(253, 224, 71, 0.24)" },
};

const DEFAULT_ICON_COLORS = {
  primary: "var(--app-color-accent-cyan)",
  secondary: "rgba(30, 162, 255, 0.28)",
};

const TEXT = {
  title: "Firewall Missions",
  subtitle: "Complete missions, grow your rank, and keep every group thriving.",
  tabs: [
    { key: "daily" as const, label: "Daily" },
    { key: "weekly" as const, label: "Weekly" },
    { key: "monthly" as const, label: "Monthly" },
    { key: "general" as const, label: "General" },
  ],
  streakLabel: (days: number) => `${days} day streak`,
  multiplierHint: "XP booster",
  openStore: "Open XP store",
  copyReferral: "Copy invite link",
  logReferral: "Log referral",
  storeTitle: "XP Marketplace",
  storeSubtitle: "Spend your XP on credits, Stars, and cosmetics.",
  storeRedeemLabel: "Redeem",
  storeRedeem: (title: string) => `Redeemed ${title}!`,
  storeInsufficient: "Not enough XP to redeem that reward yet.",
  referralTitle: "Referral booster",
  referralSubtitle: "Share your invite link to earn XP whenever a new team joins.",
  referralCopied: "Referral link copied to clipboard.",
  referralLogged: (xp: number) => `+${xp} XP from a new referral.`,
  referralInvites: (count: number) => `${count} referral${count === 1 ? "" : "s"} logged`,
  markComplete: "Mark complete",
  logged: "Logged",
  toastAlreadyLogged: "Mission already logged for today.",
  toast: (mission: Mission) => `+${mission.xp} XP - ${mission.title}`,
  toastLevelUp: (level: number) => `Level up! You reached level ${level}.`,
};

function computeLevel(xp: number) {
  let level = 1;
  let nextThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

  for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
    const threshold = LEVEL_THRESHOLDS[index];
    const next = LEVEL_THRESHOLDS[index + 1];
    if (xp >= threshold) {
      level = index + 1;
      if (typeof next === "number") {
        nextThreshold = next;
      } else {
        nextThreshold = threshold;
      }
    }
  }

  const previousThreshold = LEVEL_THRESHOLDS[Math.max(0, level - 1)];
  const delta = nextThreshold - previousThreshold || 1;
  const progress = Math.min(1, Math.max(0, (xp - previousThreshold) / delta));

  return {
    level,
    previousThreshold,
    nextThreshold,
    progress,
    hasNext: nextThreshold > xp,
  };
}

export function MissionsPage() {
  const { displayName, username } = useOwnerProfile();
  const [activeTab, setActiveTab] = useState<MissionCategory>("daily");
  const [xp, setXp] = useState(2450);
  const [streak] = useState(7);
  const [seasonMultiplier] = useState(1.4);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionState>(() => ({
    daily: new Set<string>(),
    weekly: new Set<string>(),
    monthly: new Set<string>(),
    general: new Set<string>(),
  }));
  const [dailyTaskChannel, setDailyTaskChannel] = useState<DailyTaskChannelMission | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats>({ invites: 0, xpEarned: 0 });
  const [redeemedRewards, setRedeemedRewards] = useState<Record<string, number>>({});
  const storeSectionRef = useRef<HTMLDivElement | null>(null);

  const levelInfo = useMemo(() => computeLevel(xp), [xp]);
  const missionsByCategory = useMemo(() => {
    if (!dailyTaskChannel) {
      return MISSIONS;
    }

    const sanitizedXp = Math.max(1, Math.round(dailyTaskChannel.xp));
    const mission: Mission = {
      id: "daily-channel-mission",
      title: dailyTaskChannel.buttonLabel,
      description: `${dailyTaskChannel.description}
${dailyTaskChannel.channelLink}`,
      xp: sanitizedXp,
      icon: "link",
      ctaLabel: "Open channel",
      ctaLink: dailyTaskChannel.channelLink,
    };

    const baseDaily = MISSIONS.daily.filter((item) => item.id !== mission.id);
    return {
      ...MISSIONS,
      daily: [mission, ...baseDaily],
    };
  }, [dailyTaskChannel]);
  const missions = useMemo(() => missionsByCategory[activeTab], [missionsByCategory, activeTab]);
  const activeCompletion = completion[activeTab];

  const weeklyProgress = completion.weekly.size / missionsByCategory.weekly.length;
  const monthlyProgress = completion.monthly.size / missionsByCategory.monthly.length;
  const generalProgress = completion.general.size / missionsByCategory.general.length;

  const referralLink = useMemo(() => {
    const base = dashboardConfig.inviteLink ?? "https://t.me/FirewallBot?start=fw";
    const codeSource = (username ?? displayName ?? "commander").toLowerCase();
    const sanitized = codeSource.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}ref=${sanitized || "commander"}`;
  }, [displayName, username]);

  const handleCopyReferral = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(referralLink);
        setSnackbar(TEXT.referralCopied);
      } else {
        window.open(referralLink, "_blank");
      }
    } catch (error) {
      console.warn("[missions] copy referral link failed", error);
      window.open(referralLink, "_blank");
    }
  }, [referralLink]);

  const handleLogReferral = useCallback(() => {
    setReferralStats((prev: ReferralStats) => ({ invites: prev.invites + 1, xpEarned: prev.xpEarned + REFERRAL_XP }));
    setXp((prev) => prev + REFERRAL_XP);
    setSnackbar(TEXT.referralLogged(REFERRAL_XP));
  }, []);

  const handleOpenStore = useCallback(() => {
    storeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleRedeemReward = useCallback(
    (reward: Reward) => {
      if (xp < reward.cost) {
        setSnackbar(TEXT.storeInsufficient);
        return;
      }

      setXp((previous) => previous - reward.cost);
      setRedeemedRewards((previous) => ({ ...previous, [reward.id]: (previous[reward.id] ?? 0) + 1 }));
      setSnackbar(TEXT.storeRedeem(reward.title));
    },
    [xp],
  );

  useEffect(() => {
    let cancelled = false;

    const loadDailyTask = async () => {
      try {
        const response = await fetch("/daily-task.json", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setDailyTaskChannel(null);
          }
          return;
        }
        const data = (await response.json()) as Partial<DailyTaskChannelMission> & { updatedAt?: string };
        if (cancelled) {
          return;
        }
        if (typeof data.channelLink === "string" && typeof data.buttonLabel === "string" && typeof data.description === "string" && typeof data.xp === "number" && Number.isFinite(data.xp) && data.xp > 0) {
          const channelLink = data.channelLink.trim();
          const buttonLabel = data.buttonLabel.trim();
          const description = data.description.trim();
          const xpReward = Math.max(1, Math.round(data.xp));
          if (channelLink && buttonLabel && description) {
            setDailyTaskChannel({
              channelLink,
              buttonLabel,
              description,
              xp: xpReward,
            });
          } else {
            setDailyTaskChannel(null);
          }
        } else {
          setDailyTaskChannel(null);
        }
      } catch (error) {
        console.warn("[missions] failed to load daily task config", error);
        if (!cancelled) {
          setDailyTaskChannel(null);
        }
      }
    };

    void loadDailyTask();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleMissionComplete = (category: MissionCategory, mission: Mission) => {
    if (completion[category].has(mission.id)) {
      setSnackbar(TEXT.toastAlreadyLogged);
      return;
    }

    const previousLevel = levelInfo.level;
    const nextXp = xp + mission.xp;
    const nextLevelInfo = computeLevel(nextXp);

    setCompletion((prev) => {
      const next: CompletionState = {
        ...prev,
        [category]: new Set(prev[category]),
      };
      next[category].add(mission.id);
      return next;
    });

    setXp(nextXp);
    setSnackbar(nextLevelInfo.level > previousLevel ? TEXT.toastLevelUp(nextLevelInfo.level) : TEXT.toast(mission));
  };

  return (
    <div className={styles.page} dir="ltr">
      <section className={styles.hero}>
        <div className={styles.heroHeader}>
          <div className={styles.heroProfile}>
            <Avatar size={96} acronym="CM" alt="Commander" />
            <div className={styles.heroMeta}>
              <span className={styles.heroLabel}>{TEXT.title}</span>
              <Title level="2" className={styles.heroTitle}>
                Level {levelInfo.level}
              </Title>
              <Text className={styles.heroSubtitle}>{TEXT.subtitle}</Text>
            </div>
          </div>
          <div className={styles.heroActions}>
            <Button mode="plain" size="s" onClick={handleOpenStore}>
              {TEXT.openStore}
            </Button>
            <Button mode="plain" size="s" onClick={handleCopyReferral}>
              {TEXT.copyReferral}
            </Button>
          </div>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.levelRow}>
            <Text weight="2">Total XP</Text>
            <Text weight="2">{xp.toLocaleString()}</Text>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressValue} style={{ width: `${levelInfo.progress * 100}%` }} />
          </div>
          <div className={styles.levelMeta}>
            <Text className={styles.levelProgress}>
              {levelInfo.hasNext
                ? `${(levelInfo.nextThreshold - xp).toLocaleString()} XP until level ${levelInfo.level + 1}`
                : "Maximum level reached for this season"}
            </Text>
            <div className={styles.chipRow}>
              <span className={styles.chip}>{TEXT.streakLabel(streak)}</span>
              <span className={styles.chip}>
                {TEXT.multiplierHint}: x{seasonMultiplier.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.quickStats}>
        <Card className={styles.statCard}>
          <Text weight="2" className={styles.statTitle}>
            Daily focus
          </Text>
          <Text className={styles.statValue}>
            {completion.daily.size}/{missionsByCategory.daily.length} done
          </Text>
          <Text className={styles.statHint}>Finish every task to keep your streak multiplier alive.</Text>
        </Card>
        <Card className={styles.statCard}>
          <Text weight="2" className={styles.statTitle}>
            Weekly progress
          </Text>
          <div className={styles.statProgress}>
            <div className={styles.progressTrackSmall}>
              <div className={styles.progressValueSmall} style={{ width: `${Math.min(1, weeklyProgress) * 100}%` }} />
            </div>
            <Text className={styles.statValueSmall}>
              {completion.weekly.size}/{missionsByCategory.weekly.length}
            </Text>
          </div>
          <Text className={styles.statHint}>Wrap up the remaining challenges before Sunday midnight.</Text>
        </Card>
        <Card className={styles.statCard}>
          <Text weight="2" className={styles.statTitle}>
            Monthly goals
          </Text>
          <div className={styles.statProgress}>
            <div className={styles.progressTrackSmall}>
              <div className={styles.progressValueSmall} style={{ width: `${Math.min(1, monthlyProgress) * 100}%` }} />
            </div>
            <Text className={styles.statValueSmall}>
              {completion.monthly.size}/{missionsByCategory.monthly.length}
            </Text>
          </div>
          <Text className={styles.statHint}>High-impact objectives that define your season rank.</Text>
        </Card>
        <Card className={styles.statCard}>
          <Text weight="2" className={styles.statTitle}>
            General missions
          </Text>
          <div className={styles.statProgress}>
            <div className={styles.progressTrackSmall}>
              <div className={styles.progressValueSmall} style={{ width: `${Math.min(1, generalProgress) * 100}%` }} />
            </div>
            <Text className={styles.statValueSmall}>
              {completion.general.size}/{missionsByCategory.general.length}
            </Text>
          </div>
          <Text className={styles.statHint}>Evergreen tasks that keep the Firewall ecosystem growing.</Text>
        </Card>
      </section>

      <section className={styles.tabs}>
        {TEXT.tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className={styles.tabCount}>
              {completion[tab.key].size}/{missionsByCategory[tab.key].length}
            </span>
          </button>
        ))}
      </section>

      <section className={styles.missionList}>
        {missions.map((mission) => {
          const completed = activeCompletion.has(mission.id);
          const missionLink = mission.ctaLink;
          return (
            <Card
              key={mission.id}
              className={`${styles.missionCard} ${completed ? styles.missionCardCompleted : ""}`}
            >
              <div className={styles.missionCardHeader}>
                <div className={styles.missionIcon}>
                  <MissionIcon kind={mission.icon} completed={completed} />
                </div>
                <div className={styles.missionDetails}>
                  <Text weight="2" className={styles.missionTitle}>
                    {mission.title}
                  </Text>
                  <Text className={styles.missionDescription}>{mission.description}</Text>
                </div>
                <div className={styles.missionMeta}>
                  <span className={styles.missionXp}>+{mission.xp} XP</span>
                  <span className={`${styles.statusChip} ${completed ? styles.statusChipDone : styles.statusChipPending}`}>
                    {completed ? "Completed" : "Pending"}
                  </span>
                </div>
              </div>
              <div className={styles.missionAction}>
                {missionLink ? (
                  <Button size="s" mode="plain" onClick={() => openLink(missionLink)}>
                    {mission.ctaLabel ?? "Open link"}
                  </Button>
                ) : null}
                <Button
                  size="s"
                  mode={completed ? "plain" : "filled"}
                  onClick={() => handleMissionComplete(activeTab, mission)}
                  disabled={completed}
                >
                  {completed ? TEXT.logged : TEXT.markComplete}
                </Button>
              </div>
            </Card>
          );
        })}
      </section>

      <section ref={storeSectionRef} className={styles.marketSection}>
        <Card className={styles.storeCard}>
          <div className={styles.storeHeader}>
            <Text weight="2" className={styles.storeTitle}>
              {TEXT.storeTitle}
            </Text>
            <Text className={styles.storeSubtitle}>{TEXT.storeSubtitle}</Text>
            <Text className={styles.storeBalance}>{`XP balance: ${xp.toLocaleString()}`}</Text>
          </div>
          <div className={styles.rewardGrid}>
            {REWARDS.map((reward) => {
              const redeemedCount = redeemedRewards[reward.id] ?? 0;
              const canRedeem = xp >= reward.cost;
              return (
                <div key={reward.id} className={styles.rewardCard}>
                  <div className={styles.rewardInfo}>
                    <Text weight="2" className={styles.rewardName}>
                      {reward.title}
                    </Text>
                    <Text className={styles.rewardDescription}>{reward.description}</Text>
                  </div>
                  <div className={styles.rewardActions}>
                    <span className={styles.rewardCost}>{reward.cost.toLocaleString()} XP</span>
                    <Button size="s" mode="filled" onClick={() => handleRedeemReward(reward)} disabled={!canRedeem}>
                      {TEXT.storeRedeemLabel}
                    </Button>
                  </div>
                  {redeemedCount > 0 && (
                    <Text className={styles.rewardRedeemed}>{`Redeemed ${redeemedCount}x`}</Text>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
        <Card className={styles.referralCard}>
          <Text weight="2" className={styles.referralTitle}>
            {TEXT.referralTitle}
          </Text>
          <Text className={styles.referralSubtitle}>{TEXT.referralSubtitle}</Text>
          <div className={styles.referralStats}>
            <Text weight="2">{TEXT.referralInvites(referralStats.invites)}</Text>
            <Text>{`XP earned: ${referralStats.xpEarned.toLocaleString()}`}</Text>
          </div>
          <code className={styles.referralLink}>{referralLink}</code>
          <div className={styles.referralActions}>
            <Button mode="plain" size="s" onClick={handleCopyReferral}>
              {TEXT.copyReferral}
            </Button>
            <Button mode="filled" size="s" onClick={handleLogReferral}>
              {`${TEXT.logReferral} (+${REFERRAL_XP} XP)`}
            </Button>
          </div>
        </Card>
      </section>

      <Snackbar duration={2400} onClose={() => setSnackbar(null)}>
        {snackbar}
      </Snackbar>
    </div>
  );
}

function MissionIcon({ kind, completed }: { kind: MissionIconKey; completed: boolean }) {
  const base = ICON_PALETTE[kind] ?? DEFAULT_ICON_COLORS;
  const primary = completed ? "var(--app-color-accent-green)" : base.primary;
  const secondary = completed ? "rgba(74, 222, 128, 0.32)" : base.secondary;

  return (
    <div className={styles.iconStub} data-kind={kind} data-complete={completed}>
      <span className={styles.iconAccent} style={{ background: secondary }} />
      <span className={styles.iconDot} style={{ background: primary }} />
    </div>
  );
}
