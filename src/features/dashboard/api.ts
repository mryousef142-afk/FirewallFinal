import type {
  AutoWarningPenalty,
  BanRuleKey,
  BanRuleSetting,
  DashboardSnapshot,
  DashboardInsights,
  DashboardPromotions,
  GroupBanSettings,
  GroupDetail,
  GroupGeneralSettings,
  GroupMetrics,
  ManagedGroup,
  TimeRangeMode,
  TimeRangeSetting,
  CountLimitSettings,
  SilenceSettings,
  SilenceWindowSetting,
  MandatoryMembershipSettings,
  CustomTextSettings,
  AnalyticsMessageType,
  AnalyticsPoint,
  AnalyticsMessageSeries,
  GroupAnalyticsSnapshot,
  Trend,
  StarsOverview,
  StarsPurchaseResult,
  StarsPlan,
  GroupStarsStatus,
  StarsWalletSummary,
  StarsTransactionEntry,
  GiveawayConfig,
  GiveawayCreationPayload,
  GiveawayCreationResult,
  GiveawayDashboardData,
  GiveawayDetail,
  GiveawayPlanOption,
  GiveawayStatus,
  GiveawaySummary,
  GiveawayWinnerCode,
} from "./types.ts";
import { BAN_RULE_KEYS } from "./types.ts";
import { dashboardConfig } from "@/config/dashboard.ts";
import { getTelegramInitData } from "@/utils/telegram";

const DAY_MS = 86_400_000;

const clampHour = (value: number) => ((value % 24) + 24) % 24;
const formatHour = (hour: number) => `${clampHour(hour).toString().padStart(2, "0")}:00`;

const STARS_PLANS: StarsPlan[] = [
  { id: "stars-30", days: 30, price: 500 },
  { id: "stars-60", days: 60, price: 900 },
  { id: "stars-90", days: 90, price: 1300 },
];
const GIVEAWAY_PRICE_MULTIPLIER = 1.2;
const GIVEAWAY_DURATION_OPTIONS = [6, 12, 24];
const DEFAULT_TIMEZONE = "UTC";


function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const apiBaseUrl = (() => {
  const value = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
  if (!value) {
    return null;
  }
  return value.endsWith("/") ? value.slice(0, -1) : value;
})();

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured");
  }

  const headers = new Headers(init?.headers as HeadersInit | undefined);
  if (!headers.has("Content-Type") && !(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const initData = getTelegramInitData();
  if (initData && !headers.has("X-Telegram-Init-Data")) {
    headers.set("X-Telegram-Init-Data", initData);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    let message: string | undefined;
    try {
      const body = await response.json();
      if (body && typeof body.error === "string") {
        message = body.error;
      }
    } catch {
      // ignore parse errors
    }
    if (!message) {
      try {
        message = await response.text();
      } catch {
        // ignore read errors
      }
    }
    throw new Error(message && message.length > 0 ? message : `Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function addDays(base: Date, days: number): string {
  return new Date(base.getTime() + days * DAY_MS).toISOString();
}

function subtractDays(base: Date, days: number): string {
  return new Date(base.getTime() - days * DAY_MS).toISOString();
}

function createTrend(current: number, previous: number): Trend {
  if (previous <= 0) {
    if (current <= 0) {
      return { direction: "flat", percent: 0 };
    }
    return { direction: "up", percent: 100 };
  }
  const diff = current - previous;
  const rawPercent = (diff / previous) * 100;
  const percent = Number(Math.abs(rawPercent).toFixed(1));
  if (diff > 0) {
    return { direction: "up", percent };
  }
  if (diff < 0) {
    return { direction: "down", percent };
  }
  return { direction: "flat", percent: 0 };
}

function generateMetrics(group: ManagedGroup): GroupMetrics {
  const seed = hashString(group.id);
  const membersTotal = group.membersCount;
  const previousMembers = Math.max(membersTotal - (seed % 9), 1);
  const messagesToday = 80 + (seed % 150);
  const messagesYesterday = Math.max(messagesToday - (seed % 40), 20);
  const newMembersToday = Math.max((seed % 12) - 4, 0);
  const newMembersYesterday = Math.max(newMembersToday - (seed % 5), 0);

  let remainingMs = 0;
  let isExpired = false;
  if (group.status.kind === "active") {
    remainingMs = Math.max(new Date(group.status.expiresAt).getTime() - Date.now(), 0);
    isExpired = remainingMs <= 0;
  } else {
    remainingMs = Math.max(new Date(group.status.graceEndsAt).getTime() - Date.now(), 0);
    isExpired = true;
  }

  return {
    membersTotal,
    membersTrend: createTrend(membersTotal, previousMembers),
    remainingMs,
    isExpired,
    messagesToday,
    messagesTrend: createTrend(messagesToday, messagesYesterday),
    newMembersToday,
    newMembersTrend: createTrend(newMembersToday, newMembersYesterday || 1),
  };
}

function buildGroupInvite(id: string): string {
  const base = id.startsWith("grp-") ? id.slice(4) : id;
  const sanitized = base.replace(/[^a-z0-9_]/gi, "");
  return `@${sanitized || base}`.toLowerCase();
}

function makeActiveGroup(id: string, title: string, membersCount: number, daysLeft: number): ManagedGroup {
  const now = new Date();
  return {
    id,
    title,
    membersCount,
    photoUrl: undefined,
    canManage: true,
    inviteLink: buildGroupInvite(id),
    status: {
      kind: "active",
      expiresAt: addDays(now, daysLeft),
      daysLeft,
    },
  };
}

function makeExpiredGroup(id: string, title: string, membersCount: number, daysSinceExpiry: number): ManagedGroup {
  const now = new Date();
  const expiredAt = subtractDays(now, daysSinceExpiry);
  const graceEndsAt = addDays(new Date(expiredAt), 7);
  return {
    id,
    title,
    membersCount,
    photoUrl: undefined,
    canManage: true,
    inviteLink: buildGroupInvite(id),
    status: {
      kind: "expired",
      expiredAt,
      graceEndsAt,
    },
  };
}

function makeRemovedGroup(id: string, title: string, membersCount: number, daysSinceRemoval: number): ManagedGroup {
  const now = new Date();
  const removedAt = subtractDays(now, daysSinceRemoval);
  const graceEndsAt = addDays(new Date(removedAt), 7);
  return {
    id,
    title,
    membersCount,
    photoUrl: undefined,
    canManage: false,
    inviteLink: buildGroupInvite(id),
    status: {
      kind: "removed",
      removedAt,
      graceEndsAt,
    },
  };
}

function countExpiringSoon(groups: ManagedGroup[]): number {
  return groups.filter((group) => {
    if (group.status.kind !== "active") {
      return false;
    }
    const daysLeft = typeof group.status.daysLeft === 'number'
      ? group.status.daysLeft
      : Math.max(0, Math.ceil((new Date(group.status.expiresAt).getTime() - Date.now()) / DAY_MS));
    return daysLeft <= 5;
  }).length;
}

function createMockSnapshot(): DashboardSnapshot {
  const now = new Date();
  const groups: ManagedGroup[] = [
    makeActiveGroup("grp-core", "Core Team", 128, 20),
    makeActiveGroup("grp-security", "Security Watch", 64, 8),
    makeActiveGroup("grp-support", "Support Center", 52, 3),
    makeActiveGroup("grp-marketing", "Marketing Hub", 210, 26),
    makeActiveGroup("grp-ops", "Operations", 89, 14),
    makeExpiredGroup("grp-expired", "Expired Group", 23, 2),
    makeRemovedGroup("grp-removed", "Removed Group", 17, 4),
  ];

  const filtered = groups.filter((group) => {
    if (group.status.kind !== "removed") {
      return true;
    }
    return new Date(group.status.graceEndsAt).getTime() >= now.getTime();
  });

  const metricsList = filtered.map((group) => generateMetrics(group));
  const insights: DashboardInsights = {
    expiringSoon: countExpiringSoon(filtered),
    messagesToday: metricsList.reduce((total, metrics) => total + metrics.messagesToday, 0),
    newMembersToday: metricsList.reduce((total, metrics) => total + metrics.newMembersToday, 0),
  };
  const promoImage = new URL("../../assets/application.png", import.meta.url).href;
  const promotions: DashboardPromotions = {
    rotationSeconds: 8,
    metadata: {
      maxSlots: 3,
      recommendedWidth: 960,
      recommendedHeight: 360,
    },
    slots: [
      {
        id: "promo-sponsor-upgrade",
        title: "Secure more groups with sponsor bundles",
        subtitle: "Activate the sponsor plan and gift seven days of protection to every new community.",
        imageUrl: promoImage,
        accentColor: "#1e293b",
        ctaLabel: "Explore plans",
        ctaLink: "https://t.me/tgfirewallbot",
        active: true,
        updatedAt: now.toISOString(),
      },
      {
        id: "promo-giveaway",
        title: "Join our exclusive giveaways",
        subtitle: "Win 500 Stars every week and scale your groups without limits.",
        accentColor: "#312e81",
        ctaLabel: "Enter now",
        ctaLink: "https://t.me/tgfirewallbot",
        active: true,
        updatedAt: now.toISOString(),
      },
      {
        id: "promo-support",
        title: "Connect with the security team",
        subtitle: "Request a free security audit for up to three featured groups each month.",
        accentColor: "#0f172a",
        ctaLabel: "Request access",
        ctaLink: "https://t.me/tgfirewallbot",
        active: true,
        updatedAt: now.toISOString(),
      },
    ],
  };

  return {
    ownerId: 1001,
    generatedAt: now.toISOString(),
    groups: filtered,
    insights,
    promotions,
  };
}

function createTimeRange(mode: TimeRangeMode, start = "00:00", end = "23:59"): TimeRangeSetting {
  return { mode, start, end };
}

function createGeneralSettings(id: string): GroupGeneralSettings {
  const seed = hashString(id);
  const timezone = DEFAULT_TIMEZONE;
  const welcomeEnabled = (seed & 1) === 1;
  const warningEnabled = ((seed >> 1) & 1) === 1;
  const autoDeleteEnabled = ((seed >> 2) & 1) === 1;
  const countAdmins = ((seed >> 3) & 1) === 1;
  const autoWarningEnabled = ((seed >> 4) & 1) === 1;

  const penalties: AutoWarningPenalty[] = ["delete", "mute", "kick"];

  return {
    timezone,
    welcomeEnabled,
    welcomeSchedule: welcomeEnabled ? createTimeRange("custom", "08:00", "23:45") : createTimeRange("all"),
    voteMuteEnabled: ((seed >> 5) & 1) === 1,
    warningEnabled,
    warningSchedule: warningEnabled ? createTimeRange("custom", "09:00", "22:00") : createTimeRange("all"),
    silentModeEnabled: ((seed >> 6) & 1) === 1,
    autoDeleteEnabled,
    autoDeleteDelayMinutes: autoDeleteEnabled ? 30 + (seed % 6) * 5 : 15,
    countAdminViolationsEnabled: countAdmins,
    countAdminsOnly: countAdmins,
    deleteAdminViolations: countAdmins && ((seed >> 7) & 1) === 1,
    userVerificationEnabled: ((seed >> 8) & 1) === 1,
    userVerificationSchedule: createTimeRange("custom", "07:00", "23:30"),
    disablePublicCommands: ((seed >> 9) & 1) === 1,
    disablePublicCommandsSchedule: createTimeRange("custom", "00:00", "23:00"),
    removeJoinLeaveMessages: ((seed >> 10) & 1) === 1,
    removeJoinLeaveSchedule: createTimeRange("all"),
    autoWarningEnabled,
    autoWarning: {
      threshold: 3 + (seed % 3),
      retentionDays: 7 + (seed % 4) * 7,
      penalty: penalties[seed % penalties.length],
      schedule: createTimeRange("custom", "07:00", "23:30"),
    },
    defaultPenalty: penalties[(seed >> 2) % penalties.length],
  };
}

function createBanSettings(id: string): GroupBanSettings {
  const seed = hashString(id);
  const rules: Record<BanRuleKey, BanRuleSetting> = {} as Record<BanRuleKey, BanRuleSetting>;

  BAN_RULE_KEYS.forEach((key, index) => {
    const enabled = ((seed >> index) & 1) === 1;
    const useCustom = ((seed >> (index + 4)) & 1) === 1;
    const startHour = clampHour(6 + index);
    const endHour = clampHour(startHour + 10);
    rules[key] = {
      enabled,
      schedule: useCustom ? createTimeRange("custom", formatHour(startHour), formatHour(endHour)) : createTimeRange("all"),
    };
  });

  const blacklist = ["spam", "promo", "http", "lottery", "casino"];
  const whitelist = ["support", "docs", "faq", "help"];

  return {
    rules,
    blacklist: blacklist.slice(0, 3 + (seed % 2)),
    whitelist: whitelist.slice(0, 2 + (seed % 2)),
  };
}

function createCountLimitSettings(id: string): CountLimitSettings {
  const seed = hashString(id);
  const minWordsPerMessage = seed % 3 === 0 ? 0 : 3 + (seed % 6);
  const maxWordsPerMessage = 120 + (seed % 90);
  const messagesPerWindow = seed % 2 === 0 ? 0 : 5 + (seed % 5);
  const windowMinutes = messagesPerWindow === 0 ? 0 : 1 + (seed % 5);
  const duplicateMessages = (seed >> 2) % 3 === 0 ? 0 : 2 + (seed % 4);
  const duplicateWindowMinutes = duplicateMessages === 0 ? 0 : 60 * (1 + (seed % 3));

  return {
    minWordsPerMessage,
    maxWordsPerMessage,
    messagesPerWindow,
    windowMinutes,
    duplicateMessages,
    duplicateWindowMinutes,
  };
}

const MANDATORY_CHANNELS_POOL = [
  "@tgfirewall_news",
  "@tgfirewall_support",
  "@tgfirewall_updates",
  "@tgfirewall_blog",
  "@tgfirewall_team",
];

function createMandatoryMembershipSettings(id: string): MandatoryMembershipSettings {
  const seed = hashString(id);
  const forcedInviteCount = seed % 4 === 0 ? 0 : 1 + (seed % 3);
  const forcedInviteResetDays = forcedInviteCount === 0 ? 0 : [7, 14, 30, 45][seed % 4];
  const channelCount = forcedInviteCount === 0 ? 0 : 1 + (seed % 3);

  return {
    forcedInviteCount,
    forcedInviteResetDays,
    mandatoryChannels: MANDATORY_CHANNELS_POOL.slice(0, channelCount),
  };
}

function createSilenceWindowSetting(
  enabled: boolean,
  startHour: number,
  durationHours: number,
): SilenceWindowSetting {
  const start = clampHour(startHour);
  const normalizedDuration = Math.max(1, durationHours);
  const end = clampHour(start + normalizedDuration);
  return {
    enabled,
    start: formatHour(start),
    end: formatHour(end === start ? clampHour(end + 1) : end),
  };
}

function createSilenceSettings(id: string): SilenceSettings {
  const seed = hashString(id);

  const emergencyLock = createSilenceWindowSetting(((seed >> 1) & 1) === 1, 18 + (seed % 4), 3 + (seed % 3));
  const window1 = createSilenceWindowSetting(((seed >> 2) & 1) === 1, 22, 8);
  const window2 = createSilenceWindowSetting(((seed >> 3) & 1) === 1, 9 + (seed % 2), 4 + ((seed >> 2) % 3));
  const window3 = createSilenceWindowSetting(((seed >> 4) & 1) === 1, 14 + (seed % 3), 3 + ((seed >> 1) % 4));

  return {
    emergencyLock,
    window1,
    window2,
    window3,
  };
}


const ANALYTICS_MESSAGE_TYPES: AnalyticsMessageType[] = [
  "text",
  "photo",
  "video",
  "voice",
  "gif",
  "sticker",
  "file",
  "link",
  "forward",
];

function createSeededRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) {
    value += 2147483646;
  }
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createAnalyticsSnapshot(id: string): GroupAnalyticsSnapshot {
  const seed = hashString(id);
  const timezone = DEFAULT_TIMEZONE;
  const now = new Date();
  const totalHours = 24 * 180;
  const random = createSeededRandom(seed);
  const members: AnalyticsPoint[] = [];
  const messageSeries: AnalyticsMessageSeries[] = ANALYTICS_MESSAGE_TYPES.map((type) => ({ type, points: [] }));

  const typeBase: Record<AnalyticsMessageType, number> = {
    text: 120,
    photo: 45,
    video: 32,
    voice: 18,
    gif: 15,
    sticker: 25,
    file: 12,
    link: 28,
    forward: 20,
  };

  for (let i = totalHours - 1; i >= 0; i -= 1) {
    const timestamp = new Date(now.getTime() - i * 3_600_000);
    const hour = timestamp.getHours();
    const day = timestamp.getDay();
    const dailyCycle = hour >= 8 && hour <= 20 ? 1.2 : 0.6;
    const eveningBoost = hour >= 18 && hour <= 23 ? 1.5 : 1;
    const weekendBoost = day === 4 || day === 5 ? 1.3 : day === 6 ? 1.4 : 1;
    const seasonal = 0.85 + Math.sin((totalHours - i) / 72) * 0.15;

    const membersValue = Math.max(0, Math.round((0.6 * dailyCycle + 0.4 * weekendBoost) * seasonal + random() * 3));
    members.push({ timestamp: timestamp.toISOString(), value: membersValue });

    messageSeries.forEach((series) => {
      const base = typeBase[series.type];
      const activity = base * dailyCycle * eveningBoost * weekendBoost * seasonal;
      const noise = (random() - 0.5) * base * 0.25;
      const value = Math.max(0, Math.round(activity * 0.02 + noise));
      series.points.push({ timestamp: timestamp.toISOString(), value });
    });
  }

  const hoursInSummary = 24 * 30;
  const recentMembers = members.slice(-hoursInSummary);
  const newMembersTotal = recentMembers.reduce((total, point) => total + point.value, 0);

  const recentMessagesTotals: Record<AnalyticsMessageType, number> = {} as Record<AnalyticsMessageType, number>;
  let messagesTotal = 0;
  messageSeries.forEach((series) => {
    const total = series.points.slice(-hoursInSummary).reduce((sum, point) => sum + point.value, 0);
    recentMessagesTotals[series.type] = total;
    messagesTotal += total;
  });

  const averageMessagesPerDay = hoursInSummary > 0 ? Math.round(messagesTotal / 30) : 0;
  const topMessageType = messagesTotal > 0
    ? (Object.entries(recentMessagesTotals).sort((a, b) => b[1] - a[1])[0]?.[0] as AnalyticsMessageType)
    : null;

  const lastPeriodMembers = recentMembers.slice(-24 * 7).reduce((total, point) => total + point.value, 0);
  const prevPeriodMembers = recentMembers.slice(-(24 * 14), -24 * 7).reduce((total, point) => total + point.value, 0);
  const membersTrend = createTrend(lastPeriodMembers, prevPeriodMembers || 1);

  const lastPeriodMessages = messageSeries.reduce((total, series) => total + series.points.slice(-24 * 7).reduce((sum, point) => sum + point.value, 0), 0);
  const prevPeriodMessages = messageSeries.reduce((total, series) => total + series.points.slice(-(24 * 14), -24 * 7).reduce((sum, point) => sum + point.value, 0), 0);
  const messagesTrend = createTrend(lastPeriodMessages, prevPeriodMessages || 1);

  return {
    generatedAt: now.toISOString(),
    timezone,
    members,
    messages: messageSeries,
    summary: {
      newMembersTotal,
      messagesTotal,
      averageMessagesPerDay,
      topMessageType,
      membersTrend,
      messagesTrend,
    },
  };
}


const DEFAULT_CUSTOM_TEXTS: CustomTextSettings = {
  welcomeMessage: "Hello {user}!\nWelcome to {group}.\nPlease read the next message to learn the rules.",
  rulesMessage: "{user}, these guidelines keep {group} safe. Read them carefully before you start chatting.",
  silenceStartMessage:
    "Quiet hours are now active.\nMessages are paused from {starttime} until {endtime}.\nThanks for keeping the chat tidy.",
  silenceEndMessage: "Quiet hours have finished.\nThe next quiet period starts at {starttime}.",
  warningMessage:
    "Reason: {reason}\nPenalty: {penalty}\n\nWarning {user_warnings} of {warnings_count}\nEach warning expires after {warningstime} days.",
  forcedInviteMessage:
    "{user}\nYou need to invite {number} new member(s) before you can send messages.\nYou have invited {added} so far.",
  mandatoryChannelMessage:
    "Please join the required channel(s) below before sending messages:\n{channel_names}",
  promoButtonEnabled: false,
  promoButtonText: "Read more",
  promoButtonUrl: "https://t.me/tgfirewall",
};

function createCustomTextSettings(id: string): CustomTextSettings {
  const seed = hashString(id);
  const base: CustomTextSettings = { ...DEFAULT_CUSTOM_TEXTS };
  if ((seed & 1) === 1) {
    base.promoButtonEnabled = true;
  }
  if ((seed & 2) === 2) {
    base.promoButtonText = "Check updates";
    base.promoButtonUrl = "https://t.me/tgfirewall_news";
  }
  return base;
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  await delay(dashboardConfig.mockDelayMs);
  return createMockSnapshot();
}

export async function fetchGroupDetails(id: string): Promise<GroupDetail> {
  await delay(dashboardConfig.mockDelayMs);
  const snapshot = createMockSnapshot();
  const group = snapshot.groups.find((item) => item.id === id);
  if (!group) {
    throw new Error("Group not found.");
  }
  return {
    group,
    metrics: generateMetrics(group),
    warnings: [],
    botActions: [],
  };
}

export async function fetchGroupGeneralSettings(id: string): Promise<GroupGeneralSettings> {
  await delay(dashboardConfig.mockDelayMs);
  return createGeneralSettings(id);
}

export async function updateGroupGeneralSettings(
  id: string,
  settings: GroupGeneralSettings,
): Promise<GroupGeneralSettings> {
  await delay(dashboardConfig.mockDelayMs);
  console.info(`[settings] general settings saved for ${id}`, settings);
  return settings;
}

export async function fetchGroupBanSettings(id: string): Promise<GroupBanSettings> {
  await delay(dashboardConfig.mockDelayMs);
  return createBanSettings(id);
}

export async function updateGroupBanSettings(
  id: string,
  settings: GroupBanSettings,
): Promise<GroupBanSettings> {
  await delay(dashboardConfig.mockDelayMs);
  console.info(`[settings] ban rules saved for ${id}`, settings);
  return settings;
}

export async function fetchGroupCountLimitSettings(id: string): Promise<CountLimitSettings> {
  await delay(dashboardConfig.mockDelayMs);
  return createCountLimitSettings(id);
}

export async function updateGroupCountLimitSettings(
  id: string,
  settings: CountLimitSettings,
): Promise<CountLimitSettings> {
  await delay(dashboardConfig.mockDelayMs);
  console.info(`[settings] count limits saved for ${id}`, settings);
  return settings;
}

export async function fetchGroupMandatoryMembershipSettings(id: string): Promise<MandatoryMembershipSettings> {
  await delay(dashboardConfig.mockDelayMs);
  return createMandatoryMembershipSettings(id);
}

export async function updateGroupMandatoryMembershipSettings(
  id: string,
  settings: MandatoryMembershipSettings,
): Promise<MandatoryMembershipSettings> {
  await delay(dashboardConfig.mockDelayMs);
  console.info(`[settings] mandatory membership saved for ${id}`, settings);
  return settings;
}

export async function fetchGroupCustomTextSettings(id: string): Promise<CustomTextSettings> {
  await delay(dashboardConfig.mockDelayMs);
  return createCustomTextSettings(id);
}

export async function updateGroupCustomTextSettings(
  id: string,
  settings: CustomTextSettings,
): Promise<CustomTextSettings> {
  await delay(dashboardConfig.mockDelayMs);
  console.info(`[settings] custom texts saved for ${id}`, settings);
  return settings;
}

export async function fetchGroupSilenceSettings(id: string): Promise<SilenceSettings> {
  await delay(dashboardConfig.mockDelayMs);
  return createSilenceSettings(id);
}

export async function updateGroupSilenceSettings(
  id: string,
  settings: SilenceSettings,
): Promise<SilenceSettings> {
  await delay(dashboardConfig.mockDelayMs);
  console.info(`[settings] silence settings saved for ${id}`, settings);
  return settings;
}

export async function fetchGroupAnalytics(id: string): Promise<GroupAnalyticsSnapshot> {
  await delay(dashboardConfig.mockDelayMs);
  return createAnalyticsSnapshot(id);
}

function buildStarsStatus(group: ManagedGroup): GroupStarsStatus {
  const now = Date.now();
  let expiresAt = new Date(now).toISOString();
  let daysLeft = 0;

  if (group.status.kind === "active") {
    expiresAt = group.status.expiresAt;
    if (typeof group.status.daysLeft === "number") {
      daysLeft = Math.max(0, group.status.daysLeft);
    } else {
      const diff = Math.ceil((new Date(expiresAt).getTime() - now) / DAY_MS);
      daysLeft = Number.isFinite(diff) ? Math.max(0, diff) : 0;
    }
  } else if (group.status.kind === "expired") {
    expiresAt = group.status.expiredAt;
  } else {
    expiresAt = group.status.graceEndsAt;
  }

  let status: "active" | "expiring" | "expired";
  if (daysLeft <= 0) {
    status = "expired";
  } else if (daysLeft <= 5) {
    status = "expiring";
  } else {
    status = "active";
  }

  return {
    group,
    expiresAt,
    daysLeft,
    status,
  };
}

function createStarsOverview(): StarsOverview {
  const snapshot = createMockSnapshot();
  const groups = snapshot.groups
    .filter((group) => group.canManage && group.status.kind !== "removed")
    .map((group) => buildStarsStatus(group))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    balance: 2400,
    groups,
    plans: STARS_PLANS.map((plan) => ({ ...plan })),
  };
}

function resolveStarsPlan(planId: string): StarsPlan {
  const plan = STARS_PLANS.find((item) => item.id === planId);
  if (!plan) {
    throw new Error("Stars plan not found.");
  }
  return plan;
}

function createStarsPurchaseResult(
  groupId: string,
  planId: string,
  gifted: boolean,
  status: "pending" | "completed" | "refunded" = "completed",
): StarsPurchaseResult {
  const normalizedPlanId = planId.trim();
  const plan = resolveStarsPlan(normalizedPlanId);
  const completed = status === "completed";
  const refunded = status === "refunded";
  const expiresAt = completed ? new Date(Date.now() + plan.days * DAY_MS).toISOString() : null;
  const balanceDelta = completed ? -plan.price : refunded ? plan.price : 0;
  return {
    transactionId: `mock-${Date.now()}`,
    status,
    groupId,
    planId: normalizedPlanId,
    daysAdded: completed ? plan.days : 0,
    expiresAt,
    balanceDelta,
    gifted,
    paymentUrl: completed || refunded ? null : "https://t.me/mock-payment",
    message: completed ? null : refunded ? "Transaction refunded." : "Awaiting payment confirmation.",
  };
}
async function mockFetchStarsOverview(): Promise<StarsOverview> {
  await delay(dashboardConfig.mockDelayMs);
  return createStarsOverview();
}

async function mockPurchaseStarsForGroup(groupId: string, planId: string): Promise<StarsPurchaseResult> {
  await delay(dashboardConfig.mockDelayMs);
  return createStarsPurchaseResult(groupId, planId, false);
}

async function mockGiftStarsToGroup(groupId: string, planId: string): Promise<StarsPurchaseResult> {
  await delay(dashboardConfig.mockDelayMs);
  return createStarsPurchaseResult(groupId, planId, true);
}

async function mockFetchStarsWalletSummary(): Promise<StarsWalletSummary> {
  await delay(dashboardConfig.mockDelayMs);
  const now = Date.now();
  const transactions: StarsTransactionEntry[] = [
    {
      id: `txn-${now - 1}`,
      status: "completed",
      direction: "debit",
      amount: -500,
      planId: "stars-30",
      planLabel: "30 days - 500 Stars",
      planDays: 30,
      planPrice: 500,
      groupId: "grp-alpha",
      groupTitle: "Alpha Guardians",
      gifted: false,
      createdAt: new Date(now - DAY_MS * 2).toISOString(),
      completedAt: new Date(now - DAY_MS * 2 + 300_000).toISOString(),
      externalId: null,
      invoiceLink: null,
    },
    {
      id: `txn-${now - 2}`,
      status: "refunded",
      direction: "credit",
      amount: 500,
      planId: "stars-30",
      planLabel: "30 days - 500 Stars",
      planDays: 30,
      planPrice: 500,
      groupId: "grp-beta",
      groupTitle: "Beta Keepers",
      gifted: true,
      createdAt: new Date(now - DAY_MS * 3).toISOString(),
      completedAt: new Date(now - DAY_MS * 3 + 600_000).toISOString(),
      externalId: null,
      invoiceLink: null,
    },
    {
      id: `txn-${now}`,
      status: "pending",
      direction: "debit",
      amount: -900,
      planId: "stars-60",
      planLabel: "60 days - 900 Stars",
      planDays: 60,
      planPrice: 900,
      groupId: "grp-gamma",
      groupTitle: "Gamma Patrol",
      gifted: false,
      createdAt: new Date(now - 600_000).toISOString(),
      completedAt: null,
      externalId: null,
      invoiceLink: "https://t.me/mock-payment",
    },
  ];

  return {
    balance: 2400,
    currency: "stars",
    totalSpent: 500,
    totalRefunded: 500,
    pendingCount: 1,
    transactions,
  };
}

async function mockRefundStarsTransaction(transactionId: string): Promise<StarsPurchaseResult> {
  await delay(dashboardConfig.mockDelayMs);
  return {
    transactionId,
    status: "refunded",
    groupId: "grp-alpha",
    planId: "stars-30",
    daysAdded: 0,
    expiresAt: null,
    balanceDelta: 500,
    gifted: false,
    paymentUrl: null,
    message: "Transaction refunded.",
  };
}

async function mockSearchGroupsForStars(query: string): Promise<ManagedGroup[]> {
  await delay(dashboardConfig.mockDelayMs);
  const normalized = normalizeSearchText(query);
  const identifier = normalizeSearchIdentifier(query);
  const snapshot = createMockSnapshot();

  if (!normalized && !identifier) {
    return snapshot.groups.slice(0, 6);
  }

  return snapshot.groups
    .filter((group) => {
      const titleTerm = normalizeSearchText(group.title);
      const idTerm = normalizeSearchText(group.id);
      const inviteTerm = normalizeSearchText(group.inviteLink ?? "");
      const inviteIdentifier = normalizeSearchIdentifier(group.inviteLink ?? "");

      const matchesTitle = normalized ? titleTerm.includes(normalized) : false;
      const matchesId = identifier ? idTerm.includes(identifier) : false;
      const matchesIdFallback = normalized ? idTerm.includes(normalized) : false;
      const matchesInvite = normalized ? inviteTerm.includes(normalized) : false;
      const matchesInviteIdentifier = identifier ? inviteIdentifier.includes(identifier) : false;

      return matchesTitle || matchesId || matchesIdFallback || matchesInvite || matchesInviteIdentifier;
    })
    .slice(0, 6);
}

export async function fetchStarsOverview(): Promise<StarsOverview> {
  if (!apiBaseUrl) {
    return mockFetchStarsOverview();
  }
  return requestApi<StarsOverview>("/stars/overview", { method: "GET" });
}

export async function purchaseStarsForGroup(
  groupId: string,
  planId: string,
  metadata?: Partial<ManagedGroup>,
): Promise<StarsPurchaseResult> {
  if (!apiBaseUrl) {
    return mockPurchaseStarsForGroup(groupId, planId);
  }
  return requestApi<StarsPurchaseResult>("/stars/purchase", {
    method: "POST",
    body: JSON.stringify({
      groupId: groupId.trim(),
      planId: planId.trim(),
      metadata: {
        title: metadata?.title,
        membersCount: metadata?.membersCount,
        inviteLink: metadata?.inviteLink,
        photoUrl: metadata?.photoUrl,
        managed: true,
      },
    }),
  });
}

export async function giftStarsToGroup(
  group: ManagedGroup,
  planId: string,
): Promise<StarsPurchaseResult> {
  if (!apiBaseUrl) {
    return mockGiftStarsToGroup(group.id, planId);
  }
  return requestApi<StarsPurchaseResult>("/stars/gift", {
    method: "POST",
    body: JSON.stringify({
      planId: planId.trim(),
      group: {
        id: group.id,
        title: group.title,
        membersCount: group.membersCount,
        photoUrl: group.photoUrl,
        inviteLink: group.inviteLink,
        canManage: group.canManage,
      },
    }),
  });
}

export async function searchGroupsForStars(query: string): Promise<ManagedGroup[]> {
  if (!apiBaseUrl) {
    return mockSearchGroupsForStars(query);
  }
  const qs = new URLSearchParams();
  if (query.trim().length > 0) {
    qs.set("q", query.trim());
  }
  const path = qs.toString().length > 0 ? `/stars/search?${qs.toString()}` : "/stars/search";
  return requestApi<ManagedGroup[]>(path, { method: "GET" });
}

export async function fetchStarsWalletSummary(limit = 50): Promise<StarsWalletSummary> {
  if (!apiBaseUrl) {
    return mockFetchStarsWalletSummary();
  }
  const normalizedLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 100) : 50;
  const qs = new URLSearchParams();
  qs.set("limit", normalizedLimit.toString());
  const path = `/stars/wallet?${qs.toString()}`;
  return requestApi<StarsWalletSummary>(path, { method: "GET" });
}

export async function refundStarsTransaction(transactionId: string, reason?: string): Promise<StarsPurchaseResult> {
  if (!apiBaseUrl) {
    return mockRefundStarsTransaction(transactionId);
  }
  return requestApi<StarsPurchaseResult>(`/stars/transactions/${transactionId}/refund`, {
    method: "POST",
    body: JSON.stringify({
      reason: reason && reason.trim().length > 0 ? reason.trim() : undefined,
    }),
  });
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSearchIdentifier(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?t\.me\//, "")
    .replace(/^@+/, "");
}

const giveawayPlans: GiveawayPlanOption[] = STARS_PLANS.map((plan) => ({
  id: `giveaway-${plan.id}`,
  starsPlanId: plan.id,
  title: `${plan.days}-day access`,
  days: plan.days,
  basePrice: plan.price,
  pricePerWinner: Math.round(plan.price * GIVEAWAY_PRICE_MULTIPLIER),
}));

let giveawayBalance = 1800;
let giveawayRecords: GiveawaySummary[] | null = null;
const giveawayJoins = new Set<string>();

function computeGiveawayTotal(plan: GiveawayPlanOption, winners: number): number {
  return plan.pricePerWinner * Math.max(1, winners);
}

function deriveGiveawayStatus(startsAt: string, endsAt: string): GiveawayStatus {
  const now = Date.now();
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();
  if (endMs <= now) {
    return "completed";
  }
  if (startMs > now) {
    return "scheduled";
  }
  return "active";
}

function cloneGroup(group: ManagedGroup): ManagedGroup {
  return JSON.parse(JSON.stringify(group)) as ManagedGroup;
}

function cloneGiveaway(summary: GiveawaySummary): GiveawaySummary {
  return JSON.parse(JSON.stringify(summary)) as GiveawaySummary;
}

function generateWinnerCodes(summary: GiveawaySummary): GiveawayWinnerCode[] {
  const sanitized = summary.targetGroup.title.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'WINNER';
  const prefix = sanitized.slice(0, 6) || 'WINNER';
  return Array.from({ length: Math.max(1, summary.winnersCount) }).map((_, index) => {
    const randomChunk = Math.random().toString(36).slice(2, 8).toUpperCase();
    const code = `${prefix}-${String(index + 1).padStart(2, '0')}-${randomChunk}`;
    const message = `You won the giveaway for ${summary.targetGroup.title}! Send the code ${code} alone in your group chat to apply the ${summary.prize.days}-day credit.`;
    return { code, message };
  });
}

function attachWinnerCodes(summary: GiveawaySummary): GiveawaySummary {
  if (summary.winnerCodes && summary.winnerCodes.length > 0) {
    return summary;
  }
  const winnerCodes = generateWinnerCodes(summary);
  winnerCodes.forEach((entry, index) => {
    console.info('[giveaway] winner_notified', {
      giveawayId: summary.id,
      position: index + 1,
      code: entry.code,
      message: entry.message,
    });
  });
  return { ...summary, winnerCodes };
}

function ensureGiveawayRecords(): GiveawaySummary[] {
  if (!giveawayRecords) {
    giveawayRecords = createInitialGiveaways();
  }
  return giveawayRecords;
}

function createInitialGiveaways(): GiveawaySummary[] {
  const snapshot = createMockSnapshot();
  const baseGroups = snapshot.groups.filter((group) => group.status.kind !== "removed").slice(0, 3);
  const now = Date.now();
  return baseGroups.map((group, index) => {
    const plan = giveawayPlans[index % giveawayPlans.length];
    const winners = Math.max(1, 2 + index);
    const startsAt = new Date(now - (index + 1) * 2 * 3_600_000).toISOString();
    const endsAt = new Date(now + (index === 0 ? 6 : (index + 1) * 5) * 3_600_000).toISOString();
    const status = deriveGiveawayStatus(startsAt, endsAt);
    const participants = winners * (status === "completed" ? 10 : 6 + index * 2);
    const summary: GiveawaySummary = {
      id: `mock-giveaway-${group.id}`,
      title: `Special giveaway for ${group.title}`,
      status,
      prize: {
        planId: plan.id,
        days: plan.days,
        winners,
        pricePerWinner: plan.pricePerWinner,
        totalCost: computeGiveawayTotal(plan, winners),
      },
      participants,
      winnersCount: winners,
      startsAt,
      endsAt,
      targetGroup: cloneGroup(group),
      requirements: {
        premiumOnly: index % 2 === 0,
        targetChannel: `@${group.id}`,
        extraChannel: index % 3 === 0 ? '@tgfirewall' : null,
      },
      winnerCodes: [],
    };

    return summary.status === 'completed' ? attachWinnerCodes(summary) : summary;
  });
}

function findGiveawayPlan(planId: string): GiveawayPlanOption {
  const plan = giveawayPlans.find((item) => item.id === planId || item.starsPlanId === planId);
  if (!plan) {
    throw new Error("Giveaway plan not found");
  }
  return plan;
}

function findGroupById(groupId: string): ManagedGroup {
  const snapshot = createMockSnapshot();
  const group = snapshot.groups.find((item) => item.id === groupId);
  if (!group) {
    throw new Error("Group not found");
  }
  return cloneGroup(group);
}

function refreshGiveawayStatuses(): void {
  const records = ensureGiveawayRecords();
  giveawayRecords = records.map((item) => {
    const status = deriveGiveawayStatus(item.startsAt, item.endsAt);
    if (status === item.status) {
      if (status === 'completed') {
        return attachWinnerCodes(item);
      }
      return item;
    }
    let updated: GiveawaySummary = { ...item, status };
    if (status === 'completed') {
      updated = attachWinnerCodes(updated);
    }
    return updated;
  });
}

function buildGiveawayDetail(summary: GiveawaySummary, joined: boolean): GiveawayDetail {
  const remainingSeconds = Math.max(0, Math.round((new Date(summary.endsAt).getTime() - Date.now()) / 1000));
  return {
    ...cloneGiveaway(summary),
    joined,
    remainingSeconds,
    totalCost: summary.prize.totalCost,
    premiumOnly: summary.requirements.premiumOnly,
  };
}

export async function fetchGiveawayConfig(): Promise<GiveawayConfig> {
  await delay(dashboardConfig.mockDelayMs);
  return {
    plans: giveawayPlans.map((plan) => ({ ...plan })),
    durationOptions: [...GIVEAWAY_DURATION_OPTIONS],
    allowCustomDuration: true,
  };
}

export async function fetchGiveawayDashboard(): Promise<GiveawayDashboardData> {
  await delay(dashboardConfig.mockDelayMs);
  refreshGiveawayStatuses();
  const records = ensureGiveawayRecords();
  const active = records.filter((item) => item.status !== "completed").map(cloneGiveaway);
  const past = records.filter((item) => item.status === "completed").map(cloneGiveaway);
  return {
    balance: giveawayBalance,
    active,
    past,
  };
}

export async function createGiveaway(payload: GiveawayCreationPayload): Promise<GiveawayCreationResult> {
  await delay(dashboardConfig.mockDelayMs);
  const plan = findGiveawayPlan(payload.planId);
  const group = findGroupById(payload.groupId);
  const winners = Math.max(1, payload.winners);
  const startsAt = new Date().toISOString();
  const durationMs = Math.max(1, payload.durationHours) * 3_600_000;
  const endsAt = new Date(Date.now() + durationMs).toISOString();
  const totalCost = computeGiveawayTotal(plan, winners);
  let summary: GiveawaySummary = {
    id: `giveaway-${Date.now()}`,
    title: payload.title ?? `${group.title} giveaway`,
    status: deriveGiveawayStatus(startsAt, endsAt),
    prize: {
      planId: plan.id,
      days: plan.days,
      winners,
      pricePerWinner: plan.pricePerWinner,
      totalCost,
    },
    participants: 0,
    winnersCount: winners,
    startsAt,
    endsAt,
    targetGroup: cloneGroup(group),
    requirements: {
      premiumOnly: payload.premiumOnly,
      targetChannel: `@${group.id}`,
      extraChannel: payload.extraChannel ?? null,
    },
    winnerCodes: [],
  };

  if (summary.status === 'completed') {
    summary = attachWinnerCodes(summary);
  }

  giveawayBalance = Math.max(0, giveawayBalance - totalCost);
  giveawayRecords = [summary, ...ensureGiveawayRecords()];

  console.info(`[giveaway] start notification: ${payload.notifyStart ? "enabled" : "disabled"}`);
  console.info(`[giveaway] end notification: ${payload.notifyEnd ? "enabled" : "disabled"}`);

  return {
    id: summary.id,
    totalCost,
    status: summary.status,
    createdAt: new Date().toISOString(),
  };
}

export async function fetchGiveawayDetail(id: string): Promise<GiveawayDetail> {
  await delay(dashboardConfig.mockDelayMs);
  refreshGiveawayStatuses();
  const record = ensureGiveawayRecords().find((item) => item.id === id);
  if (!record) {
    throw new Error("Giveaway not found");
  }
  return buildGiveawayDetail(record, giveawayJoins.has(id));
}

export async function joinGiveaway(id: string): Promise<GiveawayDetail> {
  await delay(dashboardConfig.mockDelayMs);
  refreshGiveawayStatuses();
  const records = ensureGiveawayRecords();
  const index = records.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new Error("Giveaway not found");
  }
  const summary = records[index];
  if (summary.status === "completed") {
    throw new Error("This giveaway has already finished");
  }
  if (!giveawayJoins.has(id)) {
    giveawayJoins.add(id);
    const updated = { ...summary, participants: summary.participants + 1 };
    records[index] = updated;
  }
  giveawayRecords = records;
  return buildGiveawayDetail(records[index], true);
}












