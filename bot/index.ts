import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { Markup, Telegraf, type Context } from "telegraf";

import { loadBotContent } from "./content.js";
import { installFirewall, invalidateFirewallCache } from "./firewall.js";
import { installProcessingPipeline } from "./processing/index.js";
import { fetchGroupsFromDb, fetchOwnerWalletBalance } from "../server/db/stateRepository.js";
import { checkDatabaseHealth } from "../server/utils/health.js";
import { createApiRouter } from "../server/api/router.js";
import {
  appendStarsTransactionMetadata,
  extractTransactionIdFromPayload,
  finalizeStarsPurchase,
  getStarsWalletSummary,
  normalizeGroupMetadata,
  purchaseStars,
  refundStarsTransaction,
} from "../server/services/starsService.js";
import {
  buildGroupStarsStatus,
  buildStarsOverview,
  loadGroupsSnapshot,
  resolveStarsBalance,
  searchGroupRecords,
  type ManagedGroup,
  type GroupStarsStatus,
  type StarsOverview,
} from "../server/services/dashboardService.js";
import {
  addBannedUser,
  addPanelAdmin,
  addPromoSlide,
  getPanelSettings,
  getPromoSlides,
  getState,
  getStarsState,
  isPanelAdmin,
  listBannedUsers,
  listGroups,
  listPanelAdmins,
  recordBroadcast,
  removeBannedUser,
  removePanelAdmin,
  removePromoSlide,
  setButtonLabels,
  setPanelSettings,
  setWelcomeMessages,
  type GroupRecord,
  type StarsPlanRecord,
  type StarsState,
  type StarsPurchaseInput,
  type PromoSlideRecord,
  upsertGroup
} from "./state.js";
import type { FirewallRuleConfig, RuleAction, RuleCondition, RuleEscalation } from "../shared/firewall.js";

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required to start the bot");
}

const content = loadBotContent();
const bot = new Telegraf(BOT_TOKEN);
installFirewall(bot);
installProcessingPipeline(bot);

const ownerConfigPath = resolve(dirname(fileURLToPath(import.meta.url)), "../public/daily-task.json");

type DailyTaskConfig = {
  channelLink: string;
  buttonLabel: string;
  description: string;
  xp: number;
  updatedAt: string;
};

function loadDailyTaskConfig(): DailyTaskConfig | null {
  try {
    const raw = readFileSync(ownerConfigPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DailyTaskConfig>;
    if (!parsed.channelLink || !parsed.buttonLabel || !parsed.description || typeof parsed.xp !== "number") {
      return null;
    }
    return {
      channelLink: parsed.channelLink,
      buttonLabel: parsed.buttonLabel,
      description: parsed.description,
      xp: parsed.xp,
      updatedAt: parsed.updatedAt ?? new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function saveDailyTaskConfig(config: DailyTaskConfig): void {
  writeFileSync(ownerConfigPath, JSON.stringify(config, null, 2), "utf8");
}

let dailyTaskConfig = loadDailyTaskConfig();

function formatDailyTaskSummary(config: DailyTaskConfig | null): string {
  if (!config) {
    return 'No daily task channel is configured yet.';
  }
  return `Current configuration:
- Channel: ${config.channelLink}
- Button: ${config.buttonLabel}
- Description: ${config.description}
- XP Reward: ${config.xp}`;
}

const ACTIONS = {
  channel: "fw_channel_placeholder",
  commands: "fw_commands_placeholder",
  info: "fw_info_placeholder",
  inlinePanel: "fw_inline_panel_placeholder",
  managementPanel: "fw_open_management_panel",
  missingAddToGroup: "fw_missing_add_to_group",
  ownerBackToPanel: "fw_owner_back_to_panel",
  ownerManageAdmins: "fw_owner_manage_admins",
  ownerAddAdmin: "fw_owner_add_admin",
  ownerRemoveAdmin: "fw_owner_remove_admin",
  ownerManageGroup: "fw_owner_manage_group",
  ownerAdjustCredit: "fw_owner_adjust_credit",
  ownerIncreaseCredit: "fw_owner_increase_credit",
  ownerDecreaseCredit: "fw_owner_decrease_credit",
  ownerBroadcast: "fw_owner_broadcast",
  ownerStatistics: "fw_owner_statistics",
  ownerSettings: "fw_owner_settings",
  ownerSettingsFreeDays: "fw_owner_settings_free_days",
  ownerSettingsStars: "fw_owner_settings_stars",
  ownerSettingsWelcomeMessages: "fw_owner_settings_welcome_messages",
  ownerSettingsGpidHelp: "fw_owner_settings_gpid_help",
  ownerSettingsLabels: "fw_owner_settings_labels",
  ownerSettingsChannelText: "fw_owner_settings_channel_text",
  ownerSettingsInfoCommands: "fw_owner_settings_info_commands",
  ownerMainMenu: "fw_owner_main_menu",
  ownerSliderMenu: "fw_owner_slider_menu",
  ownerSliderView: "fw_owner_slider_view",
  ownerSliderAdd: "fw_owner_slider_add",
  ownerSliderRemove: "fw_owner_slider_remove",
  ownerDailyTask: "fw_owner_daily_task",
  ownerBanMenu: "fw_owner_ban_menu",
  ownerBanAdd: "fw_owner_ban_add",
  ownerBanRemove: "fw_owner_ban_remove",
  ownerBanList: "fw_owner_ban_list",
  ownerFirewallMenu: "fw_owner_firewall_menu",
  ownerFirewallRefresh: "fw_owner_firewall_refresh",
  ownerFirewallAdd: "fw_owner_firewall_add",
  ownerFirewallView: "fw_owner_firewall_view",
  ownerFirewallToggle: "fw_owner_firewall_toggle",
  ownerFirewallDelete: "fw_owner_firewall_delete",
  ownerFirewallEdit: "fw_owner_firewall_edit"
} as const;

type ActionKey = keyof typeof ACTIONS;

function actionId(key: ActionKey): string {
  return ACTIONS[key];
}

const DAY_MS = 86_400_000;

type StarsOverviewResponse = StarsOverview;

type StarsPurchaseResponse = {
  groupId: string;
  planId: string;
  daysAdded: number;
  expiresAt: string;
  balanceDelta: number;
  gifted: boolean;
};

function escapeMarkdownV2(input: string): string {
  return input.replace(/[\\_*\[\]()~`>#+\-=|{}.!]/g, (char) => `\\${char}`);
}

const startPayload = process.env.START_PAYLOAD ?? "fw01";
const botUsername = process.env.BOT_USERNAME;
const explicitAddToGroupUrl = process.env.ADD_TO_GROUP_URL;
const addToGroupUrl =
  explicitAddToGroupUrl ??
  (botUsername ? `https://t.me/${botUsername}?startgroup=${encodeURIComponent(startPayload)}` : undefined);

const miniAppUrl = process.env.MINI_APP_URL;

if (!miniAppUrl) {
  throw new Error("MINI_APP_URL is required to build the management panel flow");
}

const channelUrl = process.env.CHANNEL_URL;
const ownerUserId = process.env.BOT_OWNER_ID?.trim();

if (!ownerUserId) {
  throw new Error("BOT_OWNER_ID is required to enable the owner panel flow");
}

const REQUIRED_SLIDE_WIDTH = 960;
const REQUIRED_SLIDE_HEIGHT = 360;

const databaseAvailable = Boolean(process.env.DATABASE_URL);

type InlineKeyboard = ReturnType<typeof Markup.inlineKeyboard>;

function actorId(ctx: Context): string | null {
  const id = ctx.from?.id;
  return typeof id === "number" ? id.toString() : null;
}

function isOwner(ctx: Context): boolean {
  return actorId(ctx) === ownerUserId;
}

function isPanelOperator(ctx: Context): boolean {
  const id = actorId(ctx);
  if (!id) {
    return false;
  }
  if (id === ownerUserId) {
    return true;
  }
  return isPanelAdmin(id);
}

function isUserBanned(id: string): boolean {
  return listBannedUsers().includes(id);
}

function isPrivateChat(ctx: Context): boolean {
  return ctx.chat?.type === "private";
}

async function ensureOwnerAccess(ctx: Context): Promise<boolean> {
  const id = actorId(ctx);
  if (!id) {
    await ctx.reply("Unable to verify your account.");
    return false;
  }

  if (id !== ownerUserId && isUserBanned(id)) {
    const message = "You are blocked from using the panel.";
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery(message, { show_alert: true });
    } else {
      await ctx.reply(message);
    }
    return false;
  }

  if (isPanelOperator(ctx)) {
    return true;
  }

  const denialText = "Only the bot owner or designated panel admins can access this panel.";

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery(denialText, { show_alert: true });
  } else {
    await ctx.reply(denialText);
  }

  return false;
}

function buildStartKeyboard(): InlineKeyboard {
  const settings = getPanelSettings();
  const labels = settings.buttonLabels ?? {};
  const label = (key: string, fallback: string) => {
    const value = labels[key];
    return value && value.trim().length > 0 ? value : fallback;
  };

  return Markup.inlineKeyboard([
    [
      addToGroupUrl
        ? Markup.button.url(label("start_add_to_group", content.buttons.addToGroup), addToGroupUrl)
        : Markup.button.callback(label("start_add_to_group", content.buttons.addToGroup), actionId("missingAddToGroup"))
    ],
    [
      Markup.button.callback(label("start_management_panel", content.buttons.managementPanel), actionId("managementPanel")),
      channelUrl
        ? Markup.button.url(label("start_channel", content.buttons.channel), channelUrl)
        : Markup.button.callback(label("start_channel", content.buttons.channel), actionId("channel"))
    ],
    [
      Markup.button.callback(label("start_commands", content.buttons.commands), actionId("commands")),
      Markup.button.callback(label("start_info", content.buttons.info), actionId("info"))
    ]
  ]);
}

async function sendStartMenu(ctx: Context): Promise<void> {
  const settings = getPanelSettings();
  await ctx.reply(content.messages.welcome, buildStartKeyboard());
  for (const message of settings.welcomeMessages) {
    if (message.trim().length > 0) {
      await ctx.reply(message);
    }
  }
}

function ownerNavigationRow() {
  const settings = getPanelSettings();
  const backLabel = settings.buttonLabels.owner_nav_back ?? "Back";
  const mainLabel = settings.buttonLabels.owner_nav_main ?? "Back to Main Menu";
  return [
    Markup.button.callback(backLabel, actionId("ownerBackToPanel")),
    Markup.button.callback(mainLabel, actionId("ownerMainMenu"))
  ];
}

function buildOwnerPanelKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Add or Remove Panel Admins", actionId("ownerManageAdmins"))],
    [Markup.button.callback("Manage Group by chat_id", actionId("ownerManageGroup"))],
    [Markup.button.callback("Increase or Decrease Group Credit", actionId("ownerAdjustCredit"))],
    [Markup.button.callback("Broadcast to Group Users", actionId("ownerBroadcast"))],
    [Markup.button.callback("View Total Statistics", actionId("ownerStatistics"))],
    [Markup.button.callback("Configure Global Parameters", actionId("ownerSettings"))],
    [Markup.button.callback("Manage Firewall Rules", actionId("ownerFirewallMenu"))],
    [Markup.button.callback("Configure Daily Task Channel", actionId("ownerDailyTask"))],
    [Markup.button.callback("Manage Promo Slider", actionId("ownerSliderMenu"))],
    [Markup.button.callback("Ban / Unban Panel Users", actionId("ownerBanMenu"))],
    ownerNavigationRow()
  ]);
}

function buildOwnerAdminsKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Add Panel Admin", actionId("ownerAddAdmin"))],
    [Markup.button.callback("Remove Panel Admin", actionId("ownerRemoveAdmin"))],
    ownerNavigationRow()
  ]);
}

function buildOwnerCreditKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Increase Credit", actionId("ownerIncreaseCredit"))],
    [Markup.button.callback("Decrease Credit", actionId("ownerDecreaseCredit"))],
    ownerNavigationRow()
  ]);
}

function buildOwnerSettingsKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Set Free Trial Days", actionId("ownerSettingsFreeDays"))],
    [Markup.button.callback("Set Monthly Stars", actionId("ownerSettingsStars"))],
    [Markup.button.callback("Edit Welcome Messages", actionId("ownerSettingsWelcomeMessages"))],
    [Markup.button.callback("Edit GPID Help Text", actionId("ownerSettingsGpidHelp"))],
    [Markup.button.callback("Edit Button Labels", actionId("ownerSettingsLabels"))],
    [Markup.button.callback("Edit Channel Text", actionId("ownerSettingsChannelText"))],
    [Markup.button.callback("Edit Info and Commands Text", actionId("ownerSettingsInfoCommands"))],
    ownerNavigationRow()
  ]);
}

function buildOwnerNavigationKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([ownerNavigationRow()]);
}

function buildOwnerSliderKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback("View Slides", actionId("ownerSliderView"))],
    [Markup.button.callback("Add Slide", actionId("ownerSliderAdd"))],
    [Markup.button.callback("Remove Slide", actionId("ownerSliderRemove"))],
    ownerNavigationRow()
  ]);
}

function buildSliderNavigationKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Back to Slider Menu", actionId("ownerSliderMenu"))],
    ownerNavigationRow()
  ]);
}

function buildOwnerBanKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Ban User", actionId("ownerBanAdd"))],
    [Markup.button.callback("Unban User", actionId("ownerBanRemove"))],
    [Markup.button.callback("Show Ban List", actionId("ownerBanList"))],
    ownerNavigationRow()
  ]);
}

function buildBanNavigationKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [Markup.button.callback("Back to Ban Menu", actionId("ownerBanMenu"))],
    ownerNavigationRow()
  ]);
}

const ownerMessages = {
  panelIntro:
    "Owner Control Panel\nUse this private panel to manage admins, groups, billing, and global texts.",
  adminsIntro:
    "Panel Administrators\nSelect how you want to manage the dashboard administrators.",
  addAdmin: "Add Panel Administrator\nSend the numeric Telegram user id that should be promoted.",
  removeAdmin: "Remove Panel Administrator\nSend the numeric Telegram user id that should be removed from the panel.",
  manageGroup: "Group Management\nProvide the target chat_id to open the management session for that group.",
  creditIntro:
    "Manual Group Credit Adjustment\nChoose whether you want to increase or decrease the credit assigned to a group.",
  increaseCredit: "Increase Group Credit\nSend the chat_id and the amount that should be added. Example: 123456789 3",
  decreaseCredit: "Decrease Group Credit\nSend the chat_id and the amount that should be deducted. Example: 123456789 2",
  broadcast:
    "Broadcast to Groups\nSend the message you want to deliver. The bot will ask for confirmation before it is broadcast.",
  statistics: "Global Statistics\nThe dashboard will display the latest metrics for users and groups here.",
  settingsIntro: "Global Parameters\nSelect the parameter you want to configure.",
  settingsFreeDays: "Free Trial Days\nSend the new number of free days that groups receive after activation.",
  settingsStars: "Monthly Stars Quota\nSend the monthly Stars allowance that each group should get.",
  settingsWelcomeMessages:
    "Welcome Messages\nSend up to four welcome texts, one per message. The bot will replace the stored templates in order.",
  settingsGpidHelp: "GPID Help Text\nProvide the helper text that explains how to find the group GPID.",
  settingsLabels:
    "Button Labels\nSend the updated labels for all buttons as a JSON object or one label per message following the prompts.",
  settingsChannelText:
    "Channel Announcement Text\nSend the announcement template that should appear when the channel button is used.",
  settingsInfoCommands:
    "Info and Commands Text\nShare the combined Info and Commands message that should be shown to users.",
  sliderIntro: `Promo Slider Control\nManage the slides displayed in the dashboard carousel.\nRequired image size: ${REQUIRED_SLIDE_WIDTH}x${REQUIRED_SLIDE_HEIGHT}px.`,
  sliderViewEmpty: "No promo slides have been configured yet.\nUse \"Add Slide\" to upload the first banner.",
  sliderViewHeader: "Current Promo Slides:",
  sliderAddPromptPhoto: `Send a photo that exactly matches ${REQUIRED_SLIDE_WIDTH}x${REQUIRED_SLIDE_HEIGHT}px to create a new slide.`,
  sliderAwaitLink: "Great! Now send the HTTP or HTTPS link that should open when users tap the slide.",
  sliderDimensionsMismatch:
    `The image must be exactly ${REQUIRED_SLIDE_WIDTH}x${REQUIRED_SLIDE_HEIGHT}px. Please resize it and try again.`,
  sliderLinkInvalid: "Please send a valid HTTP or HTTPS link.",
  sliderRemovePrompt: "Send the slide id you want to remove (for example: promo-001).",
  sliderRemoveMissing: "No slide matches that id. Check the list and try again.",
  dailyTaskIntro:
    "Daily Task Channel\nShare a channel mission in the daily checklist. Make sure the bot is already an admin before you send the invite link.",
  dailyTaskPromptLink: "Send the public invite link of the channel (for example: https://t.me/firewall_channel). The bot must already be an administrator.",
  dailyTaskLinkInvalid: "The link must start with https://t.me/ or t.me/. Please double-check that the bot is an admin and send a valid public link.",
  dailyTaskPromptButton: 'Great! Now send the button label you want users to see (for example: "Join Security Briefings").',
  dailyTaskButtonInvalid: "The button label cannot be empty. Please send a short call-to-action.",
  dailyTaskPromptDescription: 'Send the description text that will appear under the mission (for example: "Watch the daily hardening tips in Command Center").',
  dailyTaskDescriptionInvalid: "Please send a short description for the mission.",
  dailyTaskPromptXp: "Finally, send the XP reward (positive integer).",
  dailyTaskXpInvalid: "Please send a positive integer value for XP reward.",
  dailyTaskSaved: "Daily task channel saved. Reload the missions dashboard to see the new button.",
  banIntro: "Ban List Management\nBlock or unblock users from accessing the panel.",
  banAddPrompt: "Send the numeric Telegram user id that should be banned.",
  banRemovePrompt: "Send the numeric Telegram user id that should be removed from the ban list.",
  banListEmpty: "The ban list is currently empty.",
  banListHeader: "Users banned from the panel:",
  banNotFound: "That user id is not currently banned. Check the list and try again."
} as const;

const firewallSampleRule = JSON.stringify(
  {
    name: "Block spam links",
    scope: "global",
    enabled: true,
    priority: 100,
    matchAll: false,
    severity: 1,
    conditions: [
      {
        kind: "link_domain",
        domains: ["spam.example", "bad.example"]
      }
    ],
    actions: [
      { kind: "delete_message" },
      { kind: "warn", message: "Links from spam domains are not allowed." }
    ],
    escalation: {
      steps: [
        {
          threshold: 3,
          windowSeconds: 600,
          actions: [{ kind: "mute", durationSeconds: 3600 }]
        }
      ]
    }
  },
  null,
  2,
);

Object.assign(ownerMessages, {
  firewallIntro:
    "Firewall Rule Manager\nCreate, review, and adjust automated moderation rules. Rules run in order of priority (lowest first).",
  firewallNoRules: "No firewall rules have been configured yet.",
  firewallPromptCreate: `Send the JSON definition for the new rule (see example below). Remember to include scope ("global" or "group") and chatId for group rules.\n\n\`\`\`json\n${firewallSampleRule}\n\`\`\``,
  firewallPromptEdit:
    "Send the updated JSON payload for this rule. The entire object will replace the existing configuration.",
  firewallInvalidJson: "The payload must be valid JSON. Please try again or use the example as a template.",
  firewallInvalidPayload: "The payload is missing required fields (name, scope, conditions, actions). Please review and try again.",
  firewallSaved: "Firewall rule saved.",
  firewallDeleted: "Firewall rule deleted.",
  firewallToggledOn: "Rule enabled.",
  firewallToggledOff: "Rule disabled.",
});

type FirewallRuleSummary = {
  id: string;
  scope: string;
  name: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  matchAllConditions: boolean;
  severity: number;
  chatId: string | null;
  groupTitle: string | null;
  config: FirewallRuleConfig;
  updatedAt: Date;
};

type OwnerSession =
  | { state: "idle" }
  | { state: "awaitingAddAdmin" }
  | { state: "awaitingRemoveAdmin" }
  | { state: "awaitingManageGroup" }
  | { state: "awaitingIncreaseCredit" }
  | { state: "awaitingDecreaseCredit" }
  | { state: "awaitingBroadcastMessage" }
  | { state: "awaitingBroadcastConfirm"; pending: { message: string } }
  | { state: "awaitingSliderPhoto" }
  | { state: "awaitingSliderLink"; pending: { fileId: string; width: number; height: number } }
  | { state: "awaitingSliderRemoval" }
  | { state: "awaitingBanUserId" }
  | { state: "awaitingUnbanUserId" }
  | { state: "awaitingDailyTaskLink" }
  | { state: "awaitingDailyTaskButton"; pending: { channelLink: string } }
  | { state: "awaitingDailyTaskDescription"; pending: { channelLink: string; buttonLabel: string } }
  | { state: "awaitingDailyTaskXp"; pending: { channelLink: string; buttonLabel: string; description: string } }
  | { state: "awaitingSettingsFreeDays" }
  | { state: "awaitingSettingsStars" }
  | { state: "awaitingSettingsWelcomeMessages" }
  | { state: "awaitingSettingsGpidHelp" }
  | { state: "awaitingSettingsLabels" }
  | { state: "awaitingSettingsChannelText" }
  | { state: "awaitingSettingsInfoCommands" }
  | { state: "awaitingFirewallRuleCreate" }
  | { state: "awaitingFirewallRuleEdit"; pending: { ruleId: string; chatId: string | null } };

let ownerSession: OwnerSession = { state: "idle" };

function resetOwnerSession() {
  ownerSession = { state: "idle" };
}

function nextPromoSlideId(): string {
  const slides = getPromoSlides();
  const maxSerial = slides.reduce((acc, slide) => {
    const match = /promo-(\d+)/.exec(slide.id);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      return Number.isFinite(value) ? Math.max(acc, value) : acc;
    }
    return acc;
  }, 0);
  return `promo-${(maxSerial + 1).toString().padStart(3, "0")}`;
}

function normalizeChannelLink(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('https://t.me/')) {
    return trimmed;
  }
  if (trimmed.startsWith('http://t.me/')) {
    return trimmed.replace('http://', 'https://');
  }
  if (trimmed.startsWith('t.me/')) {
    return `https://${trimmed}`;
  }
  return null;
}

function formatSliderSummary(): string {
  const slides = getPromoSlides();
  if (slides.length === 0) {
    return ownerMessages.sliderViewEmpty;
  }

  const details = slides
    .map((slide, index) => {
      return `${index + 1}. ${slide.id}
   Link: ${slide.link}
   Image file_id: ${slide.fileId}
   Size: ${slide.width}x${slide.height}px
   Created: ${slide.createdAt}`;
    })
    .join("\n\n");

  return `${ownerMessages.sliderViewHeader}\n\n${details}\n\nUse "Remove Slide" to delete an entry.`;
}

function formatBanSummary(): string {
  const banned = listBannedUsers();
  if (banned.length === 0) {
    return ownerMessages.banListEmpty;
  }

  const entries = banned.map((id, index) => `${index + 1}. ${id}`).join("\n");

  return `${ownerMessages.banListHeader}\n${entries}`;
}

function formatAdminsSummary(): string {
  const admins = listPanelAdmins();
  const ownerLine = `Bot owner: ${ownerUserId}`;
  if (admins.length === 0) {
    return `${ownerLine}\nNo additional panel administrators are configured yet.`;
  }
  return `${ownerLine}\nAdditional panel administrators:\n${admins.map((id, index) => `${index + 1}. ${id}`).join("\n")}`;
}

async function fetchFirewallRules(): Promise<FirewallRuleSummary[]> {
  const { listFirewallRules } = await import("../server/db/firewallRepository.js");
  const records = await listFirewallRules();
  return records.map((rule) => ({
    id: rule.id,
    scope: rule.scope,
    name: rule.name,
    description: rule.description,
    enabled: rule.enabled,
    priority: rule.priority,
    matchAllConditions: rule.matchAllConditions,
    severity: rule.severity,
    chatId: rule.chatId,
    groupTitle: rule.groupTitle ?? null,
    config: rule.config,
    updatedAt: rule.updatedAt,
  }));
}

function truncateLabel(value: string, max = 28): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 3)}...`;
}

function renderFirewallOverviewMessage(rules: FirewallRuleSummary[]): string {
  if (rules.length === 0) {
    return `${ownerMessages.firewallIntro}\n\n${ownerMessages.firewallNoRules}`;
  }

  const lines = rules.map((rule, index) => {
    const status = rule.enabled ? "[ON]" : "[OFF]";
    const scopeLabel =
      rule.scope === "global" ? "Global" : `Group ${rule.chatId ?? "?"}${rule.groupTitle ? ` (${rule.groupTitle})` : ""}`;
    return `${index + 1}. ${status} ${rule.name} | ${scopeLabel} | priority ${rule.priority}`;
  });

  return `${ownerMessages.firewallIntro}\n\n${lines.join("\n")}\n\nSelect a rule below to view details or make changes.`;
}

function buildOwnerFirewallMenuKeyboard(rules: FirewallRuleSummary[]): InlineKeyboard {
  const listButtons = rules.slice(0, 10).map((rule) =>
    [
      Markup.button.callback(
        `${rule.enabled ? "[ON]" : "[OFF]"} ${truncateLabel(rule.name)}`,
        `${actionId("ownerFirewallView")}:${rule.id}`,
      ),
    ] as const,
  );

  const rows = [
    [Markup.button.callback("Add New Rule", actionId("ownerFirewallAdd"))],
    ...listButtons,
  ];

  if (rules.length > 10) {
    rows.push([Markup.button.callback(`+ ${rules.length - 10} more...`, actionId("ownerFirewallRefresh"))]);
  }

  rows.push([Markup.button.callback("Refresh", actionId("ownerFirewallRefresh"))]);
  rows.push(ownerNavigationRow());

  return Markup.inlineKeyboard(rows);
}

function buildOwnerFirewallDetailKeyboard(rule: FirewallRuleSummary): InlineKeyboard {
  const toggleLabel = rule.enabled ? "Disable Rule" : "Enable Rule";
  const rows = [
    [Markup.button.callback(toggleLabel, `${actionId("ownerFirewallToggle")}:${rule.id}`)],
    [Markup.button.callback("Edit Rule JSON", `${actionId("ownerFirewallEdit")}:${rule.id}`)],
    [Markup.button.callback("Delete Rule", `${actionId("ownerFirewallDelete")}:${rule.id}`)],
    [Markup.button.callback("Back to Rules", actionId("ownerFirewallMenu"))],
    ownerNavigationRow(),
  ];
  return Markup.inlineKeyboard(rows);
}

function formatFirewallRuleDetails(rule: FirewallRuleSummary): string {
  const scopeLabel =
    rule.scope === "global" ? "Global" : `Group ${rule.chatId ?? "?"}${rule.groupTitle ? ` (${rule.groupTitle})` : ""}`;
  const lines = [
    `Rule: ${rule.name}`,
    `Scope: ${scopeLabel}`,
    `Status: ${rule.enabled ? "Enabled" : "Disabled"}`,
    `Priority: ${rule.priority}`,
    `Match all conditions: ${rule.matchAllConditions ? "Yes" : "No"}`,
    `Severity: ${rule.severity}`,
    rule.description ? `Description: ${rule.description}` : null,
    "",
    "Conditions:",
    ...rule.config.conditions.map((condition, index) => `  ${index + 1}. ${JSON.stringify(condition)}`),
    "",
    "Actions:",
    ...rule.config.actions.map((action, index) => `  ${index + 1}. ${JSON.stringify(action)}`),
  ].filter(Boolean);

  if (rule.config.escalation && rule.config.escalation.steps?.length) {
    lines.push("", "Escalation steps:");
    rule.config.escalation.steps.forEach((step, index) => {
      lines.push(
        `  ${index + 1}. threshold ${step.threshold} within ${step.windowSeconds}s -> ${step.actions
          .map((action) => action.kind)
          .join(", ")}`,
      );
    });
  }

  return lines.join("\n");
}

async function showOwnerFirewallMenu(ctx: Context, flashMessage?: string): Promise<void> {
  const rules = await fetchFirewallRules();
  const overview = renderFirewallOverviewMessage(rules);
  const message = flashMessage ? `${flashMessage}\n\n${overview}` : overview;
  await respondWithOwnerView(ctx, message, buildOwnerFirewallMenuKeyboard(rules));
}

function mapRuleDetailToSummary(rule: {
  id: string;
  scope: string;
  name: string;
  description: string | null;
  enabled: boolean;
  priority: number;
  matchAllConditions: boolean;
  severity: number;
  chatId: string | null;
  groupTitle: string | null;
  config: FirewallRuleConfig;
  updatedAt: Date;
}): FirewallRuleSummary {
  return {
    id: rule.id,
    scope: rule.scope,
    name: rule.name,
    description: rule.description,
    enabled: rule.enabled,
    priority: rule.priority,
    matchAllConditions: rule.matchAllConditions,
    severity: rule.severity,
    chatId: rule.chatId,
    groupTitle: rule.groupTitle ?? null,
    config: rule.config,
    updatedAt: rule.updatedAt,
  };
}

async function showOwnerFirewallDetail(ctx: Context, ruleId: string, flashMessage?: string): Promise<void> {
  const { findFirewallRuleById } = await import("../server/db/firewallRepository.js");
  const rule = await findFirewallRuleById(ruleId);
  if (!rule) {
    await showOwnerFirewallMenu(ctx, "The selected rule no longer exists.");
    return;
  }
  const summaryData = mapRuleDetailToSummary(rule);
  const summary = formatFirewallRuleDetails(summaryData);
  const text = flashMessage ? `${flashMessage}\n\n${summary}` : summary;
  await respondWithOwnerView(ctx, text, buildOwnerFirewallDetailKeyboard(summaryData));
}

type RuleJsonInput = {
  id?: string;
  chatId?: string | null;
  scope?: string;
  name?: string;
  description?: string | null;
  enabled?: boolean;
  priority?: number;
  matchAll?: boolean;
  severity?: number;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  escalation?: RuleEscalation;
  legacy?: {
    type?: string | null;
    pattern?: string | null;
    action?: string | null;
  };
};

type NormalizedRulePayload = {
  id?: string;
  groupChatId?: string | null;
  scope: "group" | "global";
  name: string;
  description?: string | null;
  enabled?: boolean;
  priority?: number;
  matchAll?: boolean;
  severity?: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  escalation?: RuleEscalation;
  createdBy?: string | null;
  legacy?: {
    type?: string | null;
    pattern?: string | null;
    action?: string | null;
  };
};

function normalizeRulePayloadFromJson(
  input: unknown,
  options: { mode: "create" } | { mode: "edit"; ruleId: string; chatId: string | null },
  actorId: string | null,
): NormalizedRulePayload {
  if (!input || typeof input !== "object") {
    throw new Error(ownerMessages.firewallInvalidPayload);
  }

  const raw = input as RuleJsonInput;
  const name = typeof raw.name === "string" && raw.name.trim().length > 0 ? raw.name.trim() : null;
  if (!name) {
    throw new Error(ownerMessages.firewallInvalidPayload);
  }

  const scope = raw.scope === "global" ? "global" : "group";
  const chatId =
    scope === "group"
      ? raw.chatId && typeof raw.chatId === "string" && raw.chatId.trim().length > 0
        ? raw.chatId.trim()
        : options.mode === "edit"
          ? options.chatId
          : null
      : null;

  if (scope === "group" && !chatId) {
    throw new Error("Group rules must specify chatId.");
  }

  const conditions = Array.isArray(raw.conditions) ? (raw.conditions as RuleCondition[]) : [];
  const actions = Array.isArray(raw.actions) ? (raw.actions as RuleAction[]) : [];

  if (!actions.length) {
    throw new Error("At least one action is required.");
  }

  const escalation =
    raw.escalation && typeof raw.escalation === "object" ? (raw.escalation as RuleEscalation) : undefined;

  return {
    id: options.mode === "edit" ? options.ruleId : raw.id,
    groupChatId: chatId ?? undefined,
    scope,
    name,
    description: typeof raw.description === "string" ? raw.description : undefined,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : undefined,
    priority:
      typeof raw.priority === "number" && Number.isFinite(raw.priority) ? Math.trunc(raw.priority) : undefined,
    matchAll: typeof raw.matchAll === "boolean" ? raw.matchAll : undefined,
    severity:
      typeof raw.severity === "number" && Number.isFinite(raw.severity) ? Math.max(1, Math.trunc(raw.severity)) : undefined,
    conditions,
    actions,
    escalation,
    createdBy: actorId,
    legacy: raw.legacy,
  };
}

function buildPayloadFromStoredRule(
  rule: FirewallRuleSummary,
  overrides: Partial<NormalizedRulePayload> = {},
  actorId?: string | null,
): NormalizedRulePayload {
  return {
    id: rule.id,
    groupChatId: rule.scope === "group" ? rule.chatId ?? undefined : undefined,
    scope: rule.scope as "group" | "global",
    name: overrides.name ?? rule.config.name,
    description: overrides.description ?? rule.config.description ?? undefined,
    enabled: overrides.enabled ?? rule.enabled,
    priority: overrides.priority ?? rule.priority,
    matchAll: overrides.matchAll ?? rule.matchAllConditions,
    severity: overrides.severity ?? rule.severity,
    conditions: overrides.conditions ?? rule.config.conditions,
    actions: overrides.actions ?? rule.config.actions,
    escalation: overrides.escalation ?? rule.config.escalation,
    createdBy: overrides.createdBy ?? actorId ?? null,
    legacy: overrides.legacy,
  };
}

async function handleFirewallRuleInput(
  ctx: Context,
  rawText: string,
  options: { mode: "create" } | { mode: "edit"; ruleId: string; chatId: string | null },
): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    await ctx.reply(ownerMessages.firewallInvalidJson, buildOwnerNavigationKeyboard());
    return;
  }

  const actor = actorId(ctx);
  let payload: NormalizedRulePayload;
  try {
    payload = normalizeRulePayloadFromJson(parsed, options, actor);
  } catch (error) {
    await ctx.reply(
      error instanceof Error ? error.message : ownerMessages.firewallInvalidPayload,
      buildOwnerNavigationKeyboard(),
    );
    return;
  }

  const { upsertFirewallRule } = await import("../server/db/firewallRepository.js");
  await upsertFirewallRule(payload);
  invalidateFirewallCache(payload.groupChatId ?? (options.mode === "edit" ? options.chatId ?? null : null));
  resetOwnerSession();
  await showOwnerFirewallMenu(ctx, ownerMessages.firewallSaved);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const FIREWALL_VIEW_REGEX = new RegExp(`^${escapeRegExp(actionId("ownerFirewallView"))}:(.+)$`);
const FIREWALL_TOGGLE_REGEX = new RegExp(`^${escapeRegExp(actionId("ownerFirewallToggle"))}:(.+)$`);
const FIREWALL_DELETE_REGEX = new RegExp(`^${escapeRegExp(actionId("ownerFirewallDelete"))}:(.+)$`);
const FIREWALL_EDIT_REGEX = new RegExp(`^${escapeRegExp(actionId("ownerFirewallEdit"))}:(.+)$`);

function formatGroupSnapshot(): string {
  const groups = listGroups();
  if (groups.length === 0) {
    return "No groups have been registered yet. Adjust credits to create a new record.";
  }
  const lines = groups.map((group) => {
    return `- ${group.chatId} (${group.title}) - credit: ${group.creditBalance}`;
  });
  return lines.join("\n");
}

function formatStatisticsSummary(): string {
  const state = getState();
  const groups = Object.values(state.groups);
  const totalCredit = groups.reduce((acc, group) => acc + group.creditBalance, 0);
  const lastBroadcast = state.broadcasts[0]?.createdAt ?? "Never";
  return [
    `Channels configured: ${state.promoSlides.length}`,
    `Panel admins: ${state.panelAdmins.length}`,
    `Banned users: ${state.bannedUserIds.length}`,
    `Groups tracked: ${groups.length}`,
    `Total credit balance: ${totalCredit}`,
    `Last broadcast: ${lastBroadcast}`
  ].join("\n");
}

function parseNumericUserId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  return /^\d+$/.test(trimmed) ? trimmed : null;
}

function parseChatIdentifier(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (/^-?\d+$/.test(trimmed)) {
    return trimmed;
  }
  if (/^@[a-zA-Z0-9_]{5,}$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function extractChatIdAndPayload(raw: string): { chatId: string; payload: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const [first, ...rest] = trimmed.split(/\s+/);
  const chatId = parseChatIdentifier(first);
  if (!chatId) {
    return null;
  }
  return {
    chatId,
    payload: rest.join(" ").trim()
  };
}

function parseCreditPayload(raw: string): { chatId: string; amount: number } | null {
  const parsed = extractChatIdAndPayload(raw);
  if (!parsed || !parsed.payload) {
    return null;
  }
  const amount = Number.parseInt(parsed.payload, 10);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return { chatId: parsed.chatId, amount };
}

function resolveHttpStatus(error: unknown): number {
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === "number" && statusCode >= 400 && statusCode < 600) {
      return statusCode;
    }
  }

  if (error instanceof Error) {
    if (/insufficient/i.test(error.message)) {
      return 400;
    }
    if (/not found/i.test(error.message)) {
      return 404;
    }
  }

  return 500;
}

function asyncHandler(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, _next: NextFunction) => {
    handler(req, res).catch((error) => {
      const status = resolveHttpStatus(error);
      const message = error instanceof Error ? error.message : "Unexpected server error";
      if (status >= 500) {
        console.error("[api] Handler error:", error);
      }
      res.status(status).json({ error: message });
    });
  };
}

function registerApiRoutes(app: express.Express): void {
  app.get(
    "/healthz",
    asyncHandler(async (_req, res) => {
      const database = await checkDatabaseHealth();
      const healthy = database.status === "ok";

      res.status(healthy ? 200 : 503).json({
        status: healthy ? "ok" : "error",
        uptime: Number(process.uptime().toFixed(2)),
        database,
      });
    }),
  );

  app.use("/api/v1", createApiRouter({ ownerTelegramId: ownerUserId ?? null }));

  app.get(
    "/api/stars/overview",
    asyncHandler(async (_req, res) => {
      const overview = await buildStarsOverview(ownerUserId ?? null);
      res.json(overview);
    }),
  );

  app.get(
    "/api/stars/search",
    asyncHandler(async (req, res) => {
      const query = typeof req.query.q === "string" ? req.query.q : "";
      const results = await searchGroupRecords(query, 30);
      res.json(results);
    }),
  );

  app.post(
    "/api/stars/purchase",
    asyncHandler(async (req, res) => {
      const { groupId, planId, metadata } = req.body ?? {};

      try {
        const ownerId = req.telegramAuth?.userId;
        if (!ownerId) {
          res.status(401).json({ error: "Telegram authentication required" });
          return;
        }
        if (typeof groupId !== "string" || groupId.trim().length === 0) {
          res.status(400).json({ error: "groupId is required" });
          return;
        }
        if (typeof planId !== "string" || planId.trim().length === 0) {
          res.status(400).json({ error: "planId is required" });
          return;
        }

        const payload = await purchaseStars({
          ownerTelegramId: ownerId,
          groupId: groupId.trim(),
          planId: planId.trim(),
          gifted: false,
          metadata,
          managed: true,
        });

        res.json(payload);
      } catch (error) {
        const status = resolveHttpStatus(error);
        res.status(status).json({ error: error instanceof Error ? error.message : "Failed to record purchase" });
      }
    }),
  );

  app.post(
    "/api/stars/gift",
    asyncHandler(async (req, res) => {
      const { planId, group } = req.body ?? {};
      if (!group || typeof group !== "object") {
        res.status(400).json({ error: "group is required" });
        return;
      }

      const ownerId = req.telegramAuth?.userId;
      if (!ownerId) {
        res.status(401).json({ error: "Telegram authentication required" });
        return;
      }
      const rawGroup = group as {
        id?: unknown;
        title?: unknown;
        membersCount?: unknown;
        inviteLink?: unknown;
        photoUrl?: unknown;
        canManage?: unknown;
      };

      const groupId =
        typeof rawGroup.id === "string" && rawGroup.id.trim().length > 0
          ? rawGroup.id.trim()
          : typeof rawGroup.id === "number"
            ? rawGroup.id.toString()
            : "";

      if (groupId.length === 0) {
        res.status(400).json({ error: "group.id is required" });
        return;
      }

      if (typeof planId !== "string" || planId.trim().length === 0) {
        res.status(400).json({ error: "planId is required" });
        return;
      }

      try {
        const result = await purchaseStars({
          ownerTelegramId: ownerId,
          groupId,
          planId: planId.trim(),
          metadata: {
            title: rawGroup.title,
            membersCount: rawGroup.membersCount,
            inviteLink: rawGroup.inviteLink,
            photoUrl: rawGroup.photoUrl,
          },
          managed: Boolean(rawGroup.canManage),
          gifted: true,
        });
        res.json(result);
      } catch (error) {
        const status = resolveHttpStatus(error);
        res.status(status).json({ error: error instanceof Error ? error.message : "Failed to complete gift" });
      }
    }),
  );

  app.get(
    "/api/stars/wallet",
    asyncHandler(async (req, res) => {
      const ownerId = req.telegramAuth?.userId ?? null;
      const limit = typeof req.query.limit === "string" ? Number.parseInt(req.query.limit, 10) : undefined;
      const summary = await getStarsWalletSummary(ownerId, { limit: Number.isFinite(limit) ? limit : undefined });
      res.json(summary);
    }),
  );

  app.post(
    "/api/stars/transactions/:id/refund",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const { reason } = req.body ?? {};
      const result = await refundStarsTransaction(id, {
        operatorTelegramId: req.telegramAuth?.userId,
        reason: typeof reason === "string" && reason.trim().length > 0 ? reason.trim() : undefined,
      });
      res.json(result);
    }),
  );

  app.get(
    "/api/firewall/audits/:chatId",
    asyncHandler(async (req, res) => {
      const chatId = req.params.chatId;
      if (!chatId) {
        res.status(400).json({ error: "chatId is required" });
        return;
      }

      const { listRuleAudits } = await import("../server/db/firewallRepository.js");
      const audits = await listRuleAudits(chatId, 200);
      res.json({ chatId, audits });
    }),
  );

}

function isValidHttpUrl(link: string): boolean {
  try {
    const url = new URL(link);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function respondWithOwnerView(ctx: Context, text: string, keyboard: InlineKeyboard): Promise<void> {
  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery();
    } catch {
      // Ignore secondary acknowledgement errors.
    }

    try {
      await ctx.editMessageText(text, {
        reply_markup: keyboard.reply_markup
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("message is not modified")) {
        console.warn("[bot] Falling back to a new message in the owner panel flow:", message);
      }
    }
  }

  await ctx.reply(text, keyboard);
}

bot.start(async (ctx) => {
  await sendStartMenu(ctx);
});

bot.command("panel", async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  if (!isPrivateChat(ctx)) {
    await ctx.reply("Open a private chat with the bot to access the owner panel.");
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.panelIntro, buildOwnerPanelKeyboard());
});

bot.action(actionId("managementPanel"), async (ctx) => {
  await ctx.answerCbQuery();

  const id = actorId(ctx);
  if (id && id !== ownerUserId && isUserBanned(id)) {
    await ctx.reply("You are blocked from opening the management panel.");
    return;
  }

  const settings = getPanelSettings();
  const labels = settings.buttonLabels ?? {};
  const miniAppLabel = labels.panel_mini_app ?? content.buttons.miniApp;
  const inlineLabel = labels.panel_inline_panel ?? content.buttons.inlinePanel;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp(miniAppLabel, miniAppUrl)],
    [Markup.button.callback(inlineLabel, actionId("inlinePanel"))]
  ]);

  const managementMessage = `${escapeMarkdownV2(content.messages.managementPanel)}\n\n*${escapeMarkdownV2(
    content.messages.managementQuestion
  )}*`;

  await ctx.reply(managementMessage, {
    parse_mode: "MarkdownV2",
    ...keyboard
  });
});

bot.action(actionId("inlinePanel"), async (ctx) => {
  await ctx.answerCbQuery(content.messages.inlinePanel, { show_alert: true });
});

bot.action(actionId("channel"), async (ctx) => {
  await ctx.answerCbQuery();
  const settings = getPanelSettings();
  const message =
    settings.channelAnnouncement && settings.channelAnnouncement.trim().length > 0
      ? settings.channelAnnouncement
      : content.messages.channel;
  await ctx.reply(message);
});

bot.action(actionId("commands"), async (ctx) => {
  await ctx.answerCbQuery();
  const settings = getPanelSettings();
  const custom = settings.infoCommands?.trim();
  await ctx.reply(custom && custom.length > 0 ? custom : content.messages.commands);
});

bot.action(actionId("info"), async (ctx) => {
  await ctx.answerCbQuery();
  const settings = getPanelSettings();
  const custom = settings.infoCommands?.trim();
  await ctx.reply(custom && custom.length > 0 ? custom : content.messages.info);
});

bot.action(actionId("missingAddToGroup"), async (ctx) => {
  await ctx.answerCbQuery();

  if (botUsername) {
    await ctx.reply(
      "Update BOT_USERNAME or ADD_TO_GROUP_URL in your environment so the add-to-group button can generate a valid link."
    );
    return;
  }

  await ctx.reply("Please configure BOT_USERNAME or ADD_TO_GROUP_URL so the add-to-group shortcut can be enabled.");
});

bot.action(actionId("ownerBackToPanel"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.panelIntro, buildOwnerPanelKeyboard());
});

bot.action(actionId("ownerManageAdmins"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  const summary = formatAdminsSummary();
  await respondWithOwnerView(ctx, `${ownerMessages.adminsIntro}\n\n${summary}`, buildOwnerAdminsKeyboard());
});

bot.action(actionId("ownerAddAdmin"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingAddAdmin" };
  await respondWithOwnerView(ctx, `${ownerMessages.addAdmin}\n\n${formatAdminsSummary()}`, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerRemoveAdmin"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingRemoveAdmin" };
  await respondWithOwnerView(
    ctx,
    `${ownerMessages.removeAdmin}\n\n${formatAdminsSummary()}`,
    buildOwnerNavigationKeyboard()
  );
});

bot.action(actionId("ownerManageGroup"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingManageGroup" };
  const snapshot = formatGroupSnapshot();
  const message = `${ownerMessages.manageGroup}\n\n${snapshot}`;
  await respondWithOwnerView(ctx, message, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerAdjustCredit"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.creditIntro, buildOwnerCreditKeyboard());
});

bot.action(actionId("ownerIncreaseCredit"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingIncreaseCredit" };
  await respondWithOwnerView(ctx, ownerMessages.increaseCredit, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerDecreaseCredit"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingDecreaseCredit" };
  await respondWithOwnerView(ctx, ownerMessages.decreaseCredit, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerBroadcast"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingBroadcastMessage" };
  await respondWithOwnerView(ctx, ownerMessages.broadcast, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerStatistics"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  const stats = formatStatisticsSummary();
  await respondWithOwnerView(ctx, `${ownerMessages.statistics}\n\n${stats}`, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerFirewallMenu"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  await ctx.answerCbQuery();
  resetOwnerSession();
  await showOwnerFirewallMenu(ctx);
});

bot.action(actionId("ownerFirewallRefresh"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }
  await ctx.answerCbQuery();
  await showOwnerFirewallMenu(ctx);
});

bot.action(actionId("ownerFirewallAdd"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }
  await ctx.answerCbQuery();
  ownerSession = { state: "awaitingFirewallRuleCreate" };
  await respondWithOwnerView(ctx, ownerMessages.firewallPromptCreate, buildOwnerNavigationKeyboard());
});

bot.action(FIREWALL_VIEW_REGEX, async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }
  await ctx.answerCbQuery();
  const data = ctx.callbackQuery?.data ?? "";
  const match = data.match(FIREWALL_VIEW_REGEX);
  const ruleId = match?.[1];
  if (!ruleId) {
    await showOwnerFirewallMenu(ctx, "Could not determine rule id.");
    return;
  }
  await showOwnerFirewallDetail(ctx, ruleId);
});

bot.action(FIREWALL_TOGGLE_REGEX, async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }
  await ctx.answerCbQuery();
  const data = ctx.callbackQuery?.data ?? "";
  const match = data.match(FIREWALL_TOGGLE_REGEX);
  const ruleId = match?.[1];
  if (!ruleId) {
    await showOwnerFirewallMenu(ctx, "Could not determine rule id.");
    return;
  }

  const { findFirewallRuleById, upsertFirewallRule } = await import("../server/db/firewallRepository.js");
  const detail = await findFirewallRuleById(ruleId);
  if (!detail) {
    await showOwnerFirewallMenu(ctx, "The selected rule no longer exists.");
    return;
  }

  const summary = mapRuleDetailToSummary(detail);
  const payload = buildPayloadFromStoredRule(summary, { enabled: !summary.enabled }, actorId(ctx));
  await upsertFirewallRule(payload);
  invalidateFirewallCache(payload.groupChatId ?? summary.chatId ?? null);

  await showOwnerFirewallDetail(
    ctx,
    ruleId,
    summary.enabled ? ownerMessages.firewallToggledOff : ownerMessages.firewallToggledOn,
  );
});

bot.action(FIREWALL_DELETE_REGEX, async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }
  await ctx.answerCbQuery();
  const data = ctx.callbackQuery?.data ?? "";
  const match = data.match(FIREWALL_DELETE_REGEX);
  const ruleId = match?.[1];
  if (!ruleId) {
    await showOwnerFirewallMenu(ctx, "Could not determine rule id.");
    return;
  }

  const { findFirewallRuleById, deleteFirewallRule } = await import("../server/db/firewallRepository.js");
  const detail = await findFirewallRuleById(ruleId);
  if (!detail) {
    await showOwnerFirewallMenu(ctx, "The selected rule no longer exists.");
    return;
  }

  await deleteFirewallRule(ruleId);
  invalidateFirewallCache(detail.chatId ?? null);
  resetOwnerSession();
  await showOwnerFirewallMenu(ctx, ownerMessages.firewallDeleted);
});

bot.action(FIREWALL_EDIT_REGEX, async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }
  await ctx.answerCbQuery();
  const data = ctx.callbackQuery?.data ?? "";
  const match = data.match(FIREWALL_EDIT_REGEX);
  const ruleId = match?.[1];
  if (!ruleId) {
    await showOwnerFirewallMenu(ctx, "Could not determine rule id.");
    return;
  }

  const { findFirewallRuleById } = await import("../server/db/firewallRepository.js");
  const detail = await findFirewallRuleById(ruleId);
  if (!detail) {
    await showOwnerFirewallMenu(ctx, "The selected rule no longer exists.");
    return;
  }

  const summary = mapRuleDetailToSummary(detail);
  ownerSession = { state: "awaitingFirewallRuleEdit", pending: { ruleId, chatId: summary.chatId } };

  const editablePayload = {
    id: summary.id,
    name: summary.name,
    scope: summary.scope,
    chatId: summary.scope === "group" ? summary.chatId ?? null : null,
    description: summary.description,
    enabled: summary.enabled,
    priority: summary.priority,
    matchAll: summary.matchAllConditions,
    severity: summary.severity,
    conditions: summary.config.conditions,
    actions: summary.config.actions,
    escalation: summary.config.escalation,
  };

  const message = `${ownerMessages.firewallPromptEdit}\n\n\`\`\`json\n${JSON.stringify(editablePayload, null, 2)}\n\`\`\``;
  await respondWithOwnerView(ctx, message, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettings"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  const settings = getPanelSettings();
  const summary = [
    `Free trial days: ${settings.freeTrialDays}`,
    `Monthly Stars: ${settings.monthlyStars}`,
    `Welcome messages: ${settings.welcomeMessages.length}`,
    `Button labels: ${Object.keys(settings.buttonLabels).length}`
  ].join("\n");
  await respondWithOwnerView(ctx, `${ownerMessages.settingsIntro}\n\n${summary}`, buildOwnerSettingsKeyboard());
});

bot.action(actionId("ownerSettingsFreeDays"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingSettingsFreeDays" };
  await respondWithOwnerView(ctx, ownerMessages.settingsFreeDays, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettingsStars"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingSettingsStars" };
  await respondWithOwnerView(ctx, ownerMessages.settingsStars, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettingsWelcomeMessages"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingSettingsWelcomeMessages" };
  await respondWithOwnerView(
    ctx,
    `${ownerMessages.settingsWelcomeMessages}\n\nSend messages separated by blank lines. A maximum of four will be stored.`,
    buildOwnerNavigationKeyboard()
  );
});

bot.action(actionId("ownerSettingsGpidHelp"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingSettingsGpidHelp" };
  await respondWithOwnerView(ctx, ownerMessages.settingsGpidHelp, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettingsLabels"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingSettingsLabels" };
  await respondWithOwnerView(
    ctx,
    `${ownerMessages.settingsLabels}\n\nExample: {"start_add_to_group":"Invite firewall bot","owner_nav_back":"Previous"}`,
    buildOwnerNavigationKeyboard()
  );
});

bot.action(actionId("ownerSettingsChannelText"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingSettingsChannelText" };
  await respondWithOwnerView(ctx, ownerMessages.settingsChannelText, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettingsInfoCommands"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingSettingsInfoCommands" };
  await respondWithOwnerView(ctx, ownerMessages.settingsInfoCommands, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerDailyTask"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingDailyTaskLink" };
  const summary = formatDailyTaskSummary(dailyTaskConfig);
  const message = `${ownerMessages.dailyTaskIntro}

${summary}

${ownerMessages.dailyTaskPromptLink}`;
  await respondWithOwnerView(ctx, message, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSliderMenu"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.sliderIntro, buildOwnerSliderKeyboard());
});

bot.action(actionId("ownerSliderView"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  const summary = formatSliderSummary();
  await respondWithOwnerView(ctx, summary, buildOwnerSliderKeyboard());
});

bot.action(actionId("ownerSliderAdd"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingSliderPhoto" };
  await respondWithOwnerView(ctx, ownerMessages.sliderAddPromptPhoto, buildSliderNavigationKeyboard());
});

bot.action(actionId("ownerSliderRemove"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingSliderRemoval" };
  await respondWithOwnerView(ctx, ownerMessages.sliderRemovePrompt, buildSliderNavigationKeyboard());
});

bot.action(actionId("ownerBanMenu"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.banIntro, buildOwnerBanKeyboard());
});

bot.action(actionId("ownerBanAdd"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingBanUserId" };
  await respondWithOwnerView(ctx, ownerMessages.banAddPrompt, buildBanNavigationKeyboard());
});

bot.action(actionId("ownerBanRemove"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  ownerSession = { state: "awaitingUnbanUserId" };
  await respondWithOwnerView(ctx, ownerMessages.banRemovePrompt, buildBanNavigationKeyboard());
});

bot.action(actionId("ownerBanList"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  const summary = formatBanSummary();
  await respondWithOwnerView(ctx, summary, buildOwnerBanKeyboard());
});

bot.action(actionId("ownerMainMenu"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await ctx.answerCbQuery("Main menu opened.");
  await sendStartMenu(ctx);
});

bot.on("pre_checkout_query", async (ctx) => {
  const query = ctx.update.pre_checkout_query;
  const transactionId = extractTransactionIdFromPayload(query.invoice_payload);
  if (!transactionId) {
    try {
      await ctx.answerPreCheckoutQuery(false, "Unknown transaction reference.");
    } catch (error) {
      console.error("[bot] Failed to reject pre-checkout query:", error);
    }
    return;
  }

  try {
    await appendStarsTransactionMetadata(transactionId, {
      preCheckoutQueryId: query.id,
      payerTelegramId: query.from.id,
      payerUsername: query.from.username ?? null,
    });
  } catch (error) {
    console.warn("[bot] Failed to append pre-checkout metadata:", error);
  }

  try {
    await ctx.answerPreCheckoutQuery(true);
  } catch (error) {
    console.error("[bot] Failed to acknowledge pre-checkout query:", error);
  }
});

bot.on("successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;
  const transactionId = extractTransactionIdFromPayload(payment.invoice_payload);
  if (!transactionId) {
    await ctx.reply("✅ Stars payment received, but it could not be matched to a pending transaction. Please contact support.");
    return;
  }

  try {
    await appendStarsTransactionMetadata(transactionId, {
      telegramPaymentChargeId: payment.telegram_payment_charge_id ?? null,
      totalAmount: payment.total_amount,
      currency: payment.currency,
      providerPaymentChargeId: payment.provider_payment_charge_id ?? null,
    });
  } catch (error) {
    console.warn("[bot] Failed to attach payment metadata to transaction:", error);
  }

  try {
    const result = await finalizeStarsPurchase(transactionId, {
      externalId: payment.telegram_payment_charge_id ?? null,
    });
    const target = result.groupId ? `Group ${result.groupId}` : "your group";
    const days = result.daysAdded > 0 ? `${result.daysAdded} day${result.daysAdded === 1 ? "" : "s"}` : "subscription";
    await ctx.reply(`✅ Stars payment confirmed!\n${days} added to ${target}. Refresh the mini app to view the update.`);
  } catch (error) {
    console.error("[bot] Failed to finalize Stars transaction:", error);
    await ctx.reply("We received your payment but could not finalize the subscription automatically. Please reach out to support.");
  }
});

bot.on("message", async (ctx, next) => {
  const refunded = (ctx.message as { refunded_payment?: unknown }).refunded_payment as
    | {
        invoice_payload?: string;
        telegram_payment_charge_id?: string;
      }
    | undefined;

  if (refunded) {
    const transactionId = extractTransactionIdFromPayload(refunded.invoice_payload ?? null);
    if (transactionId) {
      try {
        await appendStarsTransactionMetadata(transactionId, {
          telegramRefundChargeId: refunded.telegram_payment_charge_id ?? null,
        });
      } catch (error) {
        console.warn("[bot] Failed to attach refund metadata:", error);
      }
    }
    await ctx.reply("💸 Your Stars payment has been refunded. The balance should refresh shortly.");
  }

  if (typeof next === "function") {
    await next();
  }
});

bot.on("photo", async (ctx) => {
  if (!isPrivateChat(ctx)) {
    return;
  }

  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  if (ownerSession.state !== "awaitingSliderPhoto") {
    return;
  }

  const photos = ctx.message.photo;
  if (!photos || photos.length === 0) {
    await ctx.reply("Please send the slide as a standard photo message.", buildSliderNavigationKeyboard());
    return;
  }

  const bestMatch = photos[photos.length - 1];
  if (bestMatch.width !== REQUIRED_SLIDE_WIDTH || bestMatch.height !== REQUIRED_SLIDE_HEIGHT) {
    await ctx.reply(ownerMessages.sliderDimensionsMismatch, buildSliderNavigationKeyboard());
    return;
  }

  ownerSession = {
    state: "awaitingSliderLink",
    pending: {
      fileId: bestMatch.file_id,
      width: bestMatch.width,
      height: bestMatch.height
    }
  };

  await ctx.reply(ownerMessages.sliderAwaitLink, buildSliderNavigationKeyboard());
});

bot.on("text", async (ctx) => {
  if (!isPrivateChat(ctx)) {
    return;
  }

  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  const text = ctx.message.text.trim();

  switch (ownerSession.state) {
    case "awaitingAddAdmin": {
      const userId = parseNumericUserId(text);
      if (!userId) {
        await ctx.reply("The user id must contain digits only. Please try again.", buildOwnerNavigationKeyboard());
        return;
      }

      if (userId === ownerUserId) {
        await ctx.reply("The bot owner already has full access.", buildOwnerNavigationKeyboard());
        return;
      }

      if (isPanelAdmin(userId)) {
        await ctx.reply("That user is already a panel admin.", buildOwnerNavigationKeyboard());
        return;
      }

      addPanelAdmin(userId);
      resetOwnerSession();
      await ctx.reply(
        `User ${userId} added as panel administrator.\n\n${formatAdminsSummary()}`,
        buildOwnerAdminsKeyboard()
      );
      return;
    }
    case "awaitingRemoveAdmin": {
      const userId = parseNumericUserId(text);
      if (!userId) {
        await ctx.reply("The user id must contain digits only. Please try again.", buildOwnerNavigationKeyboard());
        return;
      }

      if (!isPanelAdmin(userId)) {
        await ctx.reply("That user is not currently a panel admin.", buildOwnerNavigationKeyboard());
        return;
      }

      removePanelAdmin(userId);
      resetOwnerSession();
      await ctx.reply(
        `User ${userId} removed from the admin list.\n\n${formatAdminsSummary()}`,
        buildOwnerAdminsKeyboard()
      );
      return;
    }
    case "awaitingManageGroup": {
      const parsed = extractChatIdAndPayload(text);
      if (!parsed) {
        await ctx.reply(
          "Send the chat_id (e.g. -1001234567890) optionally followed by the group title.",
          buildOwnerNavigationKeyboard()
        );
        return;
      }

      const record = upsertGroup({
        chatId: parsed.chatId,
        title: parsed.payload || undefined
      });
      resetOwnerSession();
      await ctx.reply(
        `Group updated:\n${record.title} (${record.chatId})\nCredit balance: ${record.creditBalance}\nUpdated: ${record.updatedAt}`,
        buildOwnerNavigationKeyboard()
      );
      return;
    }
    case "awaitingIncreaseCredit": {
      const parsed = parseCreditPayload(text);
      if (!parsed) {
        await ctx.reply("Send chat_id and positive amount separated by a space.", buildOwnerNavigationKeyboard());
        return;
      }

      const record = upsertGroup({
        chatId: parsed.chatId,
        creditDelta: parsed.amount,
        note: `Manual increase by ${actorId(ctx) ?? "owner"}`
      });
      resetOwnerSession();
      await ctx.reply(
        `Credit increased for ${record.title} (${record.chatId}).\nNew balance: ${record.creditBalance}`,
        buildOwnerNavigationKeyboard()
      );
      return;
    }
    case "awaitingDecreaseCredit": {
      const parsed = parseCreditPayload(text);
      if (!parsed) {
        await ctx.reply("Send chat_id and positive amount separated by a space.", buildOwnerNavigationKeyboard());
        return;
      }

      const record = upsertGroup({
        chatId: parsed.chatId,
        creditDelta: -parsed.amount,
        note: `Manual decrease by ${actorId(ctx) ?? "owner"}`
      });
      resetOwnerSession();
      await ctx.reply(
        `Credit decreased for ${record.title} (${record.chatId}).\nNew balance: ${record.creditBalance}`,
        buildOwnerNavigationKeyboard()
      );
      return;
    }
    case "awaitingBroadcastMessage": {
      if (text.length < 5) {
        await ctx.reply("Please send a longer message.", buildOwnerNavigationKeyboard());
        return;
      }

      ownerSession = {
        state: "awaitingBroadcastConfirm",
        pending: { message: text }
      };
      await ctx.reply(
        "Send YES to confirm the broadcast or CANCEL to abort.",
        buildOwnerNavigationKeyboard()
      );
      return;
    }
    case "awaitingBroadcastConfirm": {
      const pending = ownerSession.pending;
      const decision = text.toLowerCase();
      if (["cancel", "no", "abort", "stop"].includes(decision)) {
        resetOwnerSession();
        await ctx.reply("Broadcast cancelled.", buildOwnerNavigationKeyboard());
        return;
      }

      if (!["yes", "confirm", "send"].includes(decision)) {
        await ctx.reply("Type YES to confirm or CANCEL to abort.", buildOwnerNavigationKeyboard());
        return;
      }

      const groups = listGroups();
      if (groups.length === 0) {
        resetOwnerSession();
        await ctx.reply("No groups are registered yet.", buildOwnerNavigationKeyboard());
        return;
      }

      const failures: string[] = [];
      let sent = 0;
      for (const group of groups) {
        try {
          await bot.telegram.sendMessage(group.chatId, pending.message);
          sent += 1;
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          failures.push(`${group.chatId}: ${reason}`);
        }
      }

      recordBroadcast(pending.message);
      resetOwnerSession();

      let response = `Broadcast sent to ${sent} group(s).`;
      if (failures.length > 0) {
        response += `\nFailed deliveries (${failures.length}):\n${failures.join("\n")}`;
      }
      await ctx.reply(response, buildOwnerNavigationKeyboard());
      return;
    }
    case "awaitingSettingsFreeDays": {
      const value = Number.parseInt(text, 10);
      if (!Number.isFinite(value) || value < 0 || value > 365) {
        await ctx.reply("Send a number between 0 and 365.", buildOwnerNavigationKeyboard());
        return;
      }
      setPanelSettings({ freeTrialDays: value });
      resetOwnerSession();
      await ctx.reply(`Free trial days updated to ${value}.`, buildOwnerSettingsKeyboard());
      return;
    }
    case "awaitingSettingsStars": {
      const value = Number.parseInt(text, 10);
      if (!Number.isFinite(value) || value < 0 || value > 10_000) {
        await ctx.reply("Send a non-negative integer.", buildOwnerNavigationKeyboard());
        return;
      }
      setPanelSettings({ monthlyStars: value });
      resetOwnerSession();
      await ctx.reply(`Monthly Stars quota updated to ${value}.`, buildOwnerSettingsKeyboard());
      return;
    }
    case "awaitingSettingsWelcomeMessages": {
      const entries = text
        .split(/\n\s*\n/)
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .slice(0, 4);
      if (entries.length === 0) {
        await ctx.reply("Send at least one welcome message.", buildOwnerNavigationKeyboard());
        return;
      }
      setWelcomeMessages(entries);
      resetOwnerSession();
      await ctx.reply(`Stored ${entries.length} welcome message(s).`, buildOwnerSettingsKeyboard());
      return;
    }
    case "awaitingSettingsGpidHelp": {
      setPanelSettings({ gpidHelpText: text });
      resetOwnerSession();
      await ctx.reply("GPID help text updated.", buildOwnerSettingsKeyboard());
      return;
    }
    case "awaitingSettingsLabels": {
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("Labels must be an object.");
        }
        const labels = Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [key, String(value)])
        );
        setButtonLabels(labels);
        resetOwnerSession();
        await ctx.reply(`Stored ${Object.keys(labels).length} button label(s).`, buildOwnerSettingsKeyboard());
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await ctx.reply(`Could not parse JSON: ${message}`, buildOwnerNavigationKeyboard());
      }
      return;
    }
    case "awaitingSettingsChannelText": {
      setPanelSettings({ channelAnnouncement: text });
      resetOwnerSession();
      await ctx.reply("Channel announcement updated.", buildOwnerSettingsKeyboard());
      return;
    }
    case "awaitingSettingsInfoCommands": {
      setPanelSettings({ infoCommands: text });
      resetOwnerSession();
      await ctx.reply("Info and commands text updated.", buildOwnerSettingsKeyboard());
      return;
    }
    case "awaitingFirewallRuleCreate": {
      await handleFirewallRuleInput(ctx, text, { mode: "create" });
      return;
    }
    case "awaitingFirewallRuleEdit": {
      const pending = ownerSession.pending;
      await handleFirewallRuleInput(ctx, text, { mode: "edit", ruleId: pending.ruleId, chatId: pending.chatId });
      return;
    }
    case "awaitingDailyTaskLink": {
      const normalizedLink = normalizeChannelLink(text);
      if (!normalizedLink) {
        await ctx.reply(ownerMessages.dailyTaskLinkInvalid, buildOwnerNavigationKeyboard());
        return;
      }

      ownerSession = { state: "awaitingDailyTaskButton", pending: { channelLink: normalizedLink } };
      await ctx.reply(ownerMessages.dailyTaskPromptButton, buildOwnerNavigationKeyboard());
      return;
    }
    case "awaitingDailyTaskButton": {
      const pending = ownerSession.pending;
      ownerSession = {
        state: "awaitingDailyTaskDescription",
        pending: {
          channelLink: pending.channelLink,
          buttonLabel: text
        }
      };
      await ctx.reply(ownerMessages.dailyTaskPromptDescription, buildOwnerNavigationKeyboard());
      return;
    }
    case "awaitingDailyTaskDescription": {
      const pending = ownerSession.pending;
      ownerSession = {
        state: "awaitingDailyTaskXp",
        pending: {
          channelLink: pending.channelLink,
          buttonLabel: pending.buttonLabel,
          description: text
        }
      };
      await ctx.reply(ownerMessages.dailyTaskPromptXp, buildOwnerNavigationKeyboard());
      return;
    }
    case "awaitingDailyTaskXp": {
      const xpValue = Number.parseInt(text, 10);
      if (!Number.isFinite(xpValue) || xpValue <= 0) {
        await ctx.reply(ownerMessages.dailyTaskXpInvalid, buildOwnerNavigationKeyboard());
        return;
      }

      const pending = ownerSession.pending;
      const config: DailyTaskConfig = {
        channelLink: pending.channelLink,
        buttonLabel: pending.buttonLabel,
        description: pending.description,
        xp: xpValue,
        updatedAt: new Date().toISOString()
      };

      dailyTaskConfig = config;
      saveDailyTaskConfig(config);
      resetOwnerSession();

      const summary = formatDailyTaskSummary(dailyTaskConfig);
      await ctx.reply(`${ownerMessages.dailyTaskSaved}

${summary}`, buildOwnerNavigationKeyboard());
      return;
    }
    case "awaitingSliderLink": {
      if (!isValidHttpUrl(text)) {
        await ctx.reply(ownerMessages.sliderLinkInvalid, buildSliderNavigationKeyboard());
        return;
      }

      const pending = ownerSession.pending;
      const newSlide: PromoSlideRecord = {
        id: nextPromoSlideId(),
        fileId: pending.fileId,
        link: text,
        width: pending.width,
        height: pending.height,
        createdAt: new Date().toISOString()
      };

      addPromoSlide(newSlide);
      resetOwnerSession();

      await ctx.reply(
        `Promo slide ${newSlide.id} saved.\nLink: ${newSlide.link}\nImage file_id: ${newSlide.fileId}`,
        buildOwnerSliderKeyboard()
      );
      return;
    }
    case "awaitingSliderRemoval": {
      const targetId = text.trim();
      const slides = getPromoSlides();
      if (!slides.some((slide) => slide.id === targetId)) {
        await ctx.reply(ownerMessages.sliderRemoveMissing, buildSliderNavigationKeyboard());
        return;
      }

      removePromoSlide(targetId);
      resetOwnerSession();

      await ctx.reply(`Promo slide ${targetId} removed.`, buildOwnerSliderKeyboard());
      return;
    }
    case "awaitingBanUserId": {
      const userId = parseNumericUserId(text);
      if (!userId) {
        await ctx.reply("The user id must contain digits only. Please try again.", buildBanNavigationKeyboard());
        return;
      }

      if (userId === ownerUserId) {
        await ctx.reply("The bot owner cannot be banned.", buildBanNavigationKeyboard());
        return;
      }

      addBannedUser(userId);
      removePanelAdmin(userId);
      resetOwnerSession();

      await ctx.reply(`User ${userId} has been banned from the panel.`, buildOwnerBanKeyboard());
      return;
    }
    case "awaitingUnbanUserId": {
      const userId = parseNumericUserId(text);
      if (!userId) {
        await ctx.reply("The user id must contain digits only. Please try again.", buildBanNavigationKeyboard());
        return;
      }

      if (!isUserBanned(userId)) {
        await ctx.reply(ownerMessages.banNotFound, buildBanNavigationKeyboard());
        return;
      }

      removeBannedUser(userId);
      resetOwnerSession();

      await ctx.reply(`User ${userId} has been removed from the ban list.`, buildOwnerBanKeyboard());
      return;
    }
    default:
      return;
  }
});

bot.catch((error) => {
  console.error("[bot] Unexpected error:", error);
});

function ensureLeadingSlash(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function trimTrailingSlash(input: string): string {
  return input.endsWith("/") ? input.slice(0, -1) : input;
}

export async function startBotPolling(): Promise<void> {
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
  } catch (error) {
    console.warn("[bot] Failed to delete webhook before polling start:", error);
  }

  await bot.launch();
  console.log("[bot] Polling mode ready.");

  process.once("SIGINT", () => {
    void bot.stop("SIGINT");
  });
  process.once("SIGTERM", () => {
    void bot.stop("SIGTERM");
  });
}

type WebhookOptions = {
  domain: string;
  path?: string;
  port?: number;
  host?: string;
  secretToken?: string;
};

type WebhookServerResult = {
  app: express.Express;
  server: import("node:http").Server;
  url: string;
  webhookPath: string;
};

export async function startBotWebhookServer(options: WebhookOptions): Promise<WebhookServerResult> {
  if (!options.domain) {
    throw new Error("Webhook domain is required");
  }

  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  registerApiRoutes(app);

  const webhookPath = ensureLeadingSlash(options.path ?? "/telegram/webhook");
  app.post(webhookPath, bot.webhookCallback(webhookPath));

  const trimmedDomain = trimTrailingSlash(options.domain.trim());
  const webhookUrl = `${trimmedDomain}${webhookPath}`;

  await bot.telegram.setWebhook(webhookUrl, options.secretToken ? { secret_token: options.secretToken } : undefined);
  console.log("[bot] Webhook registered:", webhookUrl);

  const port = options.port ?? Number(process.env.PORT ?? 3000);
  const host = options.host ?? "0.0.0.0";

  const server = app.listen(port, host, () => {
    console.log(`[bot] Webhook server listening on http://${host === "0.0.0.0" ? "localhost" : host}:${port}`);
  });

  process.once("SIGINT", () => {
    server.close(() => {
      void bot.stop("SIGINT");
    });
  });
  process.once("SIGTERM", () => {
    server.close(() => {
      void bot.stop("SIGTERM");
    });
  });

  return { app, server, url: webhookUrl, webhookPath };
}

export { bot };




