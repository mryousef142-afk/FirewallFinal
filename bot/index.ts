import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Markup, Telegraf, type Context } from "telegraf";

import { loadBotContent } from "./content.js";

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required to start the bot");
}

const content = loadBotContent();
const bot = new Telegraf(BOT_TOKEN);

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
  ownerBanList: "fw_owner_ban_list"
} as const;

type ActionKey = keyof typeof ACTIONS;

function actionId(key: ActionKey): string {
  return ACTIONS[key];
}

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

type InlineKeyboard = ReturnType<typeof Markup.inlineKeyboard>;

function isOwner(ctx: Context): boolean {
  return ctx.from?.id?.toString() === ownerUserId;
}

function isPrivateChat(ctx: Context): boolean {
  return ctx.chat?.type === "private";
}

async function ensureOwnerAccess(ctx: Context): Promise<boolean> {
  if (isOwner(ctx)) {
    return true;
  }

  const denialText = "Only the bot owner can access this panel.";

  if (ctx.callbackQuery) {
    await ctx.answerCbQuery(denialText, { show_alert: true });
  } else {
    await ctx.reply(denialText);
  }

  return false;
}

function buildStartKeyboard(): InlineKeyboard {
  return Markup.inlineKeyboard([
    [
      addToGroupUrl
        ? Markup.button.url(content.buttons.addToGroup, addToGroupUrl)
        : Markup.button.callback(content.buttons.addToGroup, actionId("missingAddToGroup"))
    ],
    [
      Markup.button.callback(content.buttons.managementPanel, actionId("managementPanel")),
      channelUrl
        ? Markup.button.url(content.buttons.channel, channelUrl)
        : Markup.button.callback(content.buttons.channel, actionId("channel"))
    ],
    [
      Markup.button.callback(content.buttons.commands, actionId("commands")),
      Markup.button.callback(content.buttons.info, actionId("info"))
    ]
  ]);
}

async function sendStartMenu(ctx: Context): Promise<void> {
  await ctx.reply(content.messages.welcome, buildStartKeyboard());
}

function ownerNavigationRow() {
  return [
    Markup.button.callback("Back", actionId("ownerBackToPanel")),
    Markup.button.callback("Back to Main Menu", actionId("ownerMainMenu"))
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

type PromoSlideEntry = {
  id: string;
  fileId: string;
  link: string;
  width: number;
  height: number;
  createdAt: string;
};

type OwnerSession =
  | { state: "idle" }
  | { state: "awaitingSliderPhoto" }
  | { state: "awaitingSliderLink"; pending: { fileId: string; width: number; height: number } }
  | { state: "awaitingSliderRemoval" }
  | { state: "awaitingBanUserId" }
  | { state: "awaitingUnbanUserId" }
  | { state: "awaitingDailyTaskLink" }
  | { state: "awaitingDailyTaskButton"; pending: { channelLink: string } }
  | { state: "awaitingDailyTaskDescription"; pending: { channelLink: string; buttonLabel: string } }
  | { state: "awaitingDailyTaskXp"; pending: { channelLink: string; buttonLabel: string; description: string } };

let ownerSession: OwnerSession = { state: "idle" };

const promoSlides: PromoSlideEntry[] = [];
let promoSlideSerial = 1;
const bannedUserIds = new Set<string>();

function resetOwnerSession() {
  ownerSession = { state: "idle" };
}

function nextPromoSlideId(): string {
  const id = `promo-${promoSlideSerial.toString().padStart(3, "0")}`;
  promoSlideSerial += 1;
  return id;
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
  if (promoSlides.length === 0) {
    return ownerMessages.sliderViewEmpty;
  }

  const details = promoSlides
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
  if (bannedUserIds.size === 0) {
    return ownerMessages.banListEmpty;
  }

  const entries = Array.from(bannedUserIds)
    .sort()
    .map((id, index) => `${index + 1}. ${id}`)
    .join("\n");

  return `${ownerMessages.banListHeader}\n${entries}`;
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

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.webApp(content.buttons.miniApp, miniAppUrl)],
    [Markup.button.callback(content.buttons.inlinePanel, actionId("inlinePanel"))]
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
  await ctx.reply(content.messages.channel);
});

bot.action(actionId("commands"), async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(content.messages.commands);
});

bot.action(actionId("info"), async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(content.messages.info);
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
  await respondWithOwnerView(ctx, ownerMessages.adminsIntro, buildOwnerAdminsKeyboard());
});

bot.action(actionId("ownerAddAdmin"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.addAdmin, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerRemoveAdmin"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.removeAdmin, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerManageGroup"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.manageGroup, buildOwnerNavigationKeyboard());
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

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.increaseCredit, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerDecreaseCredit"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.decreaseCredit, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerBroadcast"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.broadcast, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerStatistics"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.statistics, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettings"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.settingsIntro, buildOwnerSettingsKeyboard());
});

bot.action(actionId("ownerSettingsFreeDays"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.settingsFreeDays, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettingsStars"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.settingsStars, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettingsWelcomeMessages"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.settingsWelcomeMessages, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettingsGpidHelp"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.settingsGpidHelp, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettingsLabels"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.settingsLabels, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettingsChannelText"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
  await respondWithOwnerView(ctx, ownerMessages.settingsChannelText, buildOwnerNavigationKeyboard());
});

bot.action(actionId("ownerSettingsInfoCommands"), async (ctx) => {
  if (!(await ensureOwnerAccess(ctx))) {
    return;
  }

  resetOwnerSession();
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
      const newSlide: PromoSlideEntry = {
        id: nextPromoSlideId(),
        fileId: pending.fileId,
        link: text,
        width: pending.width,
        height: pending.height,
        createdAt: new Date().toISOString()
      };

      promoSlides.push(newSlide);
      resetOwnerSession();

      await ctx.reply(
        `Promo slide ${newSlide.id} saved.\nLink: ${newSlide.link}\nImage file_id: ${newSlide.fileId}`,
        buildOwnerSliderKeyboard()
      );
      return;
    }
    case "awaitingSliderRemoval": {
      const targetId = text;
      const index = promoSlides.findIndex((slide) => slide.id === targetId);
      if (index === -1) {
        await ctx.reply(ownerMessages.sliderRemoveMissing, buildSliderNavigationKeyboard());
        return;
      }

      const [removed] = promoSlides.splice(index, 1);
      resetOwnerSession();

      await ctx.reply(`Promo slide ${removed.id} removed.`, buildOwnerSliderKeyboard());
      return;
    }
    case "awaitingBanUserId": {
      if (!/^\d+$/.test(text)) {
        await ctx.reply("The user id must contain digits only. Please try again.", buildBanNavigationKeyboard());
        return;
      }

      bannedUserIds.add(text);
      resetOwnerSession();

      await ctx.reply(`User ${text} has been banned from the panel.`, buildOwnerBanKeyboard());
      return;
    }
    case "awaitingUnbanUserId": {
      if (!/^\d+$/.test(text)) {
        await ctx.reply("The user id must contain digits only. Please try again.", buildBanNavigationKeyboard());
        return;
      }

      if (!bannedUserIds.has(text)) {
        await ctx.reply(ownerMessages.banNotFound, buildBanNavigationKeyboard());
        return;
      }

      bannedUserIds.delete(text);
      resetOwnerSession();

      await ctx.reply(`User ${text} has been removed from the ban list.`, buildOwnerBanKeyboard());
      return;
    }
    default:
      return;
  }
});

bot.catch((error) => {
  console.error("[bot] Unexpected error:", error);
});

bot.launch().then(() => {
  console.log("[bot] FW-01 flow ready.");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
