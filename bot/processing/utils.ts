import type { Context } from "telegraf";
import type { GroupChatContext, ProcessingAction } from "./types.js";
import { logger } from "../../server/utils/logger.js";

export function isGroupChat(ctx: Context): ctx is GroupChatContext {
  const type = ctx.chat?.type;
  return type === "group" || type === "supergroup";
}

export function ensureActions(result: ProcessingAction[] | undefined): ProcessingAction[] {
  if (!result || result.length === 0) {
    return [];
  }
  return result;
}

export function executeAction(ctx: GroupChatContext, action: ProcessingAction): Promise<void> {
  switch (action.type) {
    case "delete_message":
      return deleteMessage(ctx, action);
    case "warn_member":
      return warnMember(ctx, action);
    case "restrict_member":
      return restrictMember(ctx, action);
    case "kick_member":
      return kickMember(ctx, action);
    case "ban_member":
      return banMember(ctx, action);
    case "send_message":
      return sendMessage(ctx, action);
    case "record_moderation":
      return recordModeration(ctx, action);
    case "record_rule_audit":
      return recordRuleAudit(ctx, action);
    case "log":
      logAction(action);
      return Promise.resolve();
    case "noop":
    default:
      return Promise.resolve();
  }
}

async function deleteMessage(ctx: GroupChatContext, action: Extract<ProcessingAction, { type: "delete_message" }>) {
  if (!ctx.chat || !ctx.message) {
    return;
  }

  try {
    await ctx.telegram.deleteMessage(ctx.chat.id, action.messageId);
  } catch (error) {
    logger.warn("failed to delete message", {
      chatId: ctx.chat.id,
      messageId: action.messageId,
      error,
    });
  }
}

async function warnMember(ctx: GroupChatContext, action: Extract<ProcessingAction, { type: "warn_member" }>) {
  const mention = ctx.message?.from?.first_name ?? ctx.message?.from?.username ?? action.userId.toString();
  const warningText = [
    `<b>Warning for ${escapeHtml(mention)}</b>`,
    escapeHtml(action.reason),
    `Severity: ${escapeHtml(action.severity.toUpperCase())}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await ctx.telegram.sendMessage(ctx.chat.id, warningText, {
      parse_mode: "HTML",
      reply_to_message_id: ctx.message?.message_id,
      disable_web_page_preview: true,
    });
  } catch (error) {
    logger.warn("failed to send warning message", { chatId: ctx.chat.id, error });
  }
}

async function restrictMember(ctx: GroupChatContext, action: Extract<ProcessingAction, { type: "restrict_member" }>) {
  const untilDate =
    action.durationSeconds && Number.isFinite(action.durationSeconds)
      ? Math.floor(Date.now() / 1000) + action.durationSeconds
      : undefined;

  try {
    await ctx.telegram.restrictChatMember(ctx.chat.id, action.userId, {
      until_date: untilDate,
      permissions: {
        can_send_messages: false,
        can_send_audios: false,
        can_send_documents: false,
        can_send_photos: false,
        can_send_videos: false,
        can_send_video_notes: false,
        can_send_voice_notes: false,
        can_send_polls: false,
        can_invite_users: false,
        can_pin_messages: false,
        can_manage_topics: false,
        can_change_info: false,
        can_add_web_page_previews: false,
      },
    });
  } catch (error) {
    logger.error("failed to restrict member", {
      chatId: ctx.chat.id,
      userId: action.userId,
      error,
    });
  }
}

async function kickMember(ctx: GroupChatContext, action: Extract<ProcessingAction, { type: "kick_member" }>) {
  try {
    await ctx.telegram.banChatMember(ctx.chat.id, action.userId);
    await ctx.telegram.unbanChatMember(ctx.chat.id, action.userId);
  } catch (error) {
    logger.error("failed to kick member", {
      chatId: ctx.chat.id,
      userId: action.userId,
      error,
    });
  }
}

async function banMember(ctx: GroupChatContext, action: Extract<ProcessingAction, { type: "ban_member" }>) {
  try {
    await ctx.telegram.banChatMember(ctx.chat.id, action.userId, {
      until_date: action.untilDate,
    });
  } catch (error) {
    logger.error("failed to ban member", {
      chatId: ctx.chat.id,
      userId: action.userId,
      error,
    });
  }
}

async function sendMessage(ctx: GroupChatContext, action: Extract<ProcessingAction, { type: "send_message" }>) {
  try {
    await ctx.telegram.sendMessage(ctx.chat.id, action.text, {
      reply_to_message_id: action.replyToMessageId,
      parse_mode: action.parseMode,
      disable_web_page_preview: true,
    });
  } catch (error) {
    logger.warn("failed to send message", { chatId: ctx.chat.id, error });
  }
}

async function recordModeration(ctx: GroupChatContext, action: Extract<ProcessingAction, { type: "record_moderation" }>) {
  try {
    const { recordModerationAction } = await import("../../server/db/mutateRepository.js");
    await recordModerationAction({
      chatId: ctx.chat.id.toString(),
      userId: action.userId ? action.userId.toString() : null,
      actorId: ctx.botInfo?.id ? ctx.botInfo.id.toString() : null,
      action: action.actions.join(" | "),
      severity: null,
      reason: action.reason ?? null,
      metadata: action.metadata ?? null,
    });
  } catch (error) {
    logger.warn("failed to persist moderation action", { chatId: ctx.chat.id, error });
  }
}

async function recordRuleAudit(ctx: GroupChatContext, action: Extract<ProcessingAction, { type: "record_rule_audit" }>) {
  try {
    const { appendRuleAudit } = await import("../../server/db/firewallRepository.js");
    await appendRuleAudit({
      groupChatId: ctx.chat.id.toString(),
      ruleId: action.ruleId,
      offenderId: action.offenderId,
      action: action.actionSummary,
      payload: action.payload,
    });
  } catch (error) {
    logger.warn("failed to record firewall audit", { chatId: ctx.chat.id, error });
  }
}

function logAction(action: Extract<ProcessingAction, { type: "log" }>) {
  const { level, message, details } = action;
  logger[level](message, details);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}



