import "dotenv/config";
import { Markup, Telegraf } from "telegraf";

import { loadBotContent } from "./content.js";

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required to start the bot");
}

const content = loadBotContent();
const bot = new Telegraf(BOT_TOKEN);

const ACTIONS = {
  channel: "fw_channel_placeholder",
  commands: "fw_commands_placeholder",
  info: "fw_info_placeholder",
  inlinePanel: "fw_inline_panel_placeholder",
  managementPanel: "fw_open_management_panel",
  missingAddToGroup: "fw_missing_add_to_group"
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

bot.start(async (ctx) => {
  const keyboard = Markup.inlineKeyboard([
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

  await ctx.reply(content.messages.welcome, keyboard);
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

  await ctx.reply(
    "Please configure BOT_USERNAME or ADD_TO_GROUP_URL so the add-to-group shortcut can be enabled."
  );
});

bot.catch((error) => {
  console.error("[bot] Unexpected error:", error);
});

bot.launch().then(() => {
  console.log("[bot] FW-01 flow ready.");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
