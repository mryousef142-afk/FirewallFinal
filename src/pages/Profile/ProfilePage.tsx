import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Switch, Text } from "@telegram-apps/telegram-ui";

import { useOwnerProfile } from "@/features/dashboard/useOwnerProfile.ts";

import styles from "./ProfilePage.module.css";

const TEXT = {
  tagline: "Show your power",
  statsTitle: "Performance pulse",
  progressTitle: "Mission cadence",
  actionsTitle: "Command shortcuts",
  alertsTitle: "Signal alerts",
  automationTitle: "Automation",
  securityTitle: "Security posture",
  activityTitle: "Latest activity",
  supportTitle: "Support & resources",
};

const LEVEL_THRESHOLDS = [0, 250, 600, 1050, 1600, 2200, 2850, 3550, 4300, 5100, 5950, 6850];

const PERFORMANCE = [
  { label: "Season XP", value: 2450, formatted: "2,450", delta: "+12% vs last season" },
  { label: "Uptime score", value: 99.7, formatted: "99.7%", delta: "All networks stable" },
  { label: "Missions cleared", value: 48, formatted: "48", delta: "3 remaining this week" },
  { label: "Global rank", value: 18, formatted: "#18", delta: "Top 3% of commanders" },
];

const PROGRESS_TRACKS = [
  { key: "daily", label: "Daily streak", value: 0.82, caption: "7 days active" },
  { key: "weekly", label: "Weekly objectives", value: 0.75, caption: "3 of 4 completed" },
  { key: "monthly", label: "Season ambitions", value: 0.55, caption: "Goal: Elite badge" },
];

const ACTIONS = [
  { key: "missions", label: "Open missions", hint: "Prioritize next objectives", to: "/missions" },
  { key: "rewards", label: "Claim rewards", hint: "Spend collected XP", to: "/missions" },
  { key: "activity", label: "Activity log", hint: "Purchases & escalations", to: "/stars" },
  { key: "groups", label: "Manage groups", hint: "Jump to dashboard", to: "/groups" },
  { key: "analytics", label: "Review analytics", hint: "Week-over-week trends", to: "/groups" },
  { key: "giveaway", label: "Launch giveaway", hint: "Boost community energy", to: "/giveaway/create" },
];

const SECURITY_STATUS = [
  { key: "admins", label: "Admin security", status: "Protected", hint: "Multi-factor enforced for 5 admins" },
  { key: "backups", label: "Backup rules", status: "Healthy", hint: "Automated export ran 3 hours ago" },
  { key: "keywords", label: "Keyword shield", status: "Needs review", hint: "12 flagged terms require confirmation" },
];

const ACTIVITY_LOG = [
  { key: "renewal", title: "Renewed @firewall-hq for 14 days", time: "2h ago" },
  { key: "mission", title: "Completed weekly mission: Launch giveaway", time: "9h ago" },
  { key: "automation", title: "Enabled auto-escalate for @command-lab", time: "1d ago" },
];

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
    hasNext: nextThreshold > previousThreshold,
  };
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { displayName, username, avatarUrl } = useOwnerProfile();
  const initials = useMemo(() => {
    if (!displayName) {
      return "U";
    }
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((word) => word.charAt(0).toUpperCase());
    return letters.join("") || "U";
  }, [displayName]);

  const xp = PERFORMANCE[0].value;
  const levelInfo = useMemo(() => computeLevel(xp), [xp]);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [autoEscalate, setAutoEscalate] = useState(false);
  const [silentFailures, setSilentFailures] = useState(true);

  return (
    <div className={styles.page} dir="ltr">
      <section className={styles.heroCard}>
        <div className={styles.heroProfile}>
          <Avatar size={96} src={avatarUrl ?? undefined} acronym={avatarUrl ? undefined : initials} alt={displayName ?? "Commander"} />
          <div className={styles.heroMeta}>
            <span className={styles.heroLabel}>{TEXT.tagline}</span>
            <h1 className={styles.heroName}>{displayName ?? "Firewall Commander"}</h1>
            <span className={styles.heroUsername}>{username ? `@${username}` : "No username"}</span>
          </div>
        </div>
        <div className={styles.heroProgress}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeLabel}>Commander tier</span>
            <span className={styles.heroBadgeValue}>
              Level {levelInfo.level.toString().padStart(2, "0")}
            </span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressValue} style={{ width: `${levelInfo.progress * 100}%` }} />
          </div>
          <span className={styles.progressCaption}>
            {levelInfo.hasNext
              ? `${(levelInfo.nextThreshold - xp).toLocaleString()} XP until level ${levelInfo.level + 1}`
              : "Season level cap reached"}
          </span>
        </div>
      </section>

      <div className={styles.layout}>
        <div className={styles.columnPrimary}>
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{TEXT.statsTitle}</h2>
              <Text className={styles.sectionHint}>Pulse metrics that define your rank each season.</Text>
            </header>
            <div className={styles.statsGrid}>
              {PERFORMANCE.map((item) => (
                <div key={item.label} className={styles.statCard}>
                  <span className={styles.statLabel}>{item.label}</span>
                  <span className={styles.statValue}>{item.formatted}</span>
                  <span className={styles.statHint}>{item.delta}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{TEXT.progressTitle}</h2>
              <Text className={styles.sectionHint}>Track how consistently you’re hitting mission rhythm.</Text>
            </header>
            <div className={styles.progressGrid}>
              {PROGRESS_TRACKS.map((item) => (
                <div key={item.key} className={styles.progressCard}>
                  <div className={styles.progressHeader}>
                    <Text weight="2">{item.label}</Text>
                    <Text className={styles.progressPercent}>{Math.round(item.value * 100)}%</Text>
                  </div>
                  <div className={styles.progressTrack}>
                    <div className={styles.progressValue} style={{ width: `${Math.min(1, item.value) * 100}%` }} />
                  </div>
                  <span className={styles.progressCaption}>{item.caption}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{TEXT.actionsTitle}</h2>
              <Text className={styles.sectionHint}>Jump straight to the commands you use the most.</Text>
            </header>
            <div className={styles.actionsGrid}>
              {ACTIONS.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  className={styles.actionCard}
                  onClick={() => navigate(action.to)}
                >
                  <span className={styles.actionLabel}>{action.label}</span>
                  <span className={styles.actionHint}>{action.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{TEXT.automationTitle}</h2>
              <Text className={styles.sectionHint}>Keep the bot two steps ahead of trouble.</Text>
            </header>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <Text weight="2">Auto escalate critical spikes</Text>
                <Text className={styles.linkHint}>Firewall will lock the channel and summon admins instantly.</Text>
              </div>
              <Switch checked={autoEscalate} onChange={(event) => setAutoEscalate(event.target.checked)} />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <Text weight="2">Suppress silent failures</Text>
                <Text className={styles.linkHint}>Convert hidden API errors into visible mission alerts.</Text>
              </div>
              <Switch checked={silentFailures} onChange={(event) => setSilentFailures(event.target.checked)} />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <Text weight="2">Mission reminders</Text>
                <Text className={styles.linkHint}>Send a reminder when a weekly objective is still open.</Text>
              </div>
              <Button mode="plain" size="s" onClick={() => navigate("/missions")}>
                Configure
              </Button>
            </div>
          </section>
        </div>

        <div className={styles.columnSide}>
          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{TEXT.alertsTitle}</h2>
              <Text className={styles.sectionHint}>Decide how Firewall calls for your attention.</Text>
            </header>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <Text weight="2">Critical push alerts</Text>
                <Text className={styles.linkHint}>Expiring credits, ban escalations, and incident fallout.</Text>
              </div>
              <Switch checked={pushEnabled} onChange={(event) => setPushEnabled(event.target.checked)} />
            </div>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <Text weight="2">Telegram digest</Text>
                <Text className={styles.linkHint}>Daily mission summary delivered at 09:00.</Text>
              </div>
              <Switch checked={digestEnabled} onChange={(event) => setDigestEnabled(event.target.checked)} />
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{TEXT.securityTitle}</h2>
              <Text className={styles.sectionHint}>Checkpoints that keep command power resilient.</Text>
            </header>
            <div className={styles.statusList}>
              {SECURITY_STATUS.map((item) => (
                <div key={item.key} className={styles.statusItem}>
                  <div className={styles.statusMeta}>
                    <Text weight="2">{item.label}</Text>
                    <span className={styles.statusHint}>{item.hint}</span>
                  </div>
                  <span className={styles.statusBadge}>{item.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{TEXT.activityTitle}</h2>
              <Text className={styles.sectionHint}>Latest moves made under your command.</Text>
            </header>
            <div className={styles.activityList}>
              {ACTIVITY_LOG.map((item) => (
                <div key={item.key} className={styles.activityItem}>
                  <span className={styles.activityTitle}>{item.title}</span>
                  <span className={styles.activityTime}>{item.time}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <header className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{TEXT.supportTitle}</h2>
              <Text className={styles.sectionHint}>Resources for scaling your community safely.</Text>
            </header>
            <div className={styles.supportList}>
              <div className={styles.supportItem}>
                <span>Firewall Academy</span>
                <Button mode="plain" size="s">Open</Button>
              </div>
              <div className={styles.supportItem}>
                <span>Request a strategy call</span>
                <Button mode="plain" size="s">Book</Button>
              </div>
              <div className={styles.supportItem}>
                <span>Security bulletin</span>
                <Button mode="plain" size="s">Subscribe</Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


