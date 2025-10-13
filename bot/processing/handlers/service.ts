import type { UpdateHandler } from "../types.js";
import type { GroupChatContext, ProcessingAction } from "../types.js";
import { ensureActions, isGroupChat } from "../utils.js";

function hasServiceEvent(ctx: GroupChatContext): boolean {
  const message = ctx.message;
  if (!message) {
    return false;
  }
  return Boolean(
    message.pinned_message ||
      message.new_chat_title ||
      message.new_chat_photo ||
      message.delete_chat_photo ||
      message.group_chat_created ||
      message.supergroup_chat_created,
  );
}

export const serviceHandler: UpdateHandler = {
  name: "group-service-events",
  matches(ctx) {
    return isGroupChat(ctx) && hasServiceEvent(ctx);
  },
  async handle(ctx) {
    const message = ctx.message!;
    const actions: ProcessingAction[] = [
      {
        type: "log",
        level: "info",
        message: "service event received",
        details: {
          chatId: ctx.chat.id,
          update: {
            pinned: Boolean(message.pinned_message),
            newTitle: message.new_chat_title,
            hasNewPhoto: Boolean(message.new_chat_photo),
            deletePhoto: Boolean(message.delete_chat_photo),
            groupCreated: Boolean(message.group_chat_created),
            supergroupUpgrade: Boolean(message.supergroup_chat_created),
          },
        },
      },
    ];

    if (message.pinned_message) {
      actions.push({
        type: "send_message",
        text: "A new message was pinned. Please review the updated announcement.",
        replyToMessageId: message.message_id,
        parseMode: "HTML",
      });
    }

    if (message.new_chat_title) {
      actions.push({
        type: "send_message",
        text: `Group title updated to <b>${escapeHtml(message.new_chat_title)}</b>.`,
        replyToMessageId: message.message_id,
        parseMode: "HTML",
      });
    }

    if (message.delete_chat_photo) {
      actions.push({
        type: "send_message",
        text: "Group photo was removed.",
        replyToMessageId: message.message_id,
        parseMode: "HTML",
      });
    }

    return { actions: ensureActions(actions) };
  },
};

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
