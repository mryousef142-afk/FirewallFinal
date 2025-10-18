import type { UpdateHandler } from "../types.js";
import type { GroupChatContext, ProcessingAction } from "../types.js";
import { ensureActions, isGroupChat } from "../utils.js";
import { logger } from "../../../server/utils/logger.js";
import { loadBotContent } from "../../content.js";

const content = loadBotContent();
const databaseAvailable = Boolean(process.env.DATABASE_URL);

function hasMembershipEvent(ctx: GroupChatContext): boolean {
  const message = ctx.message;
  if (!message) {
    return false;
  }
  return Boolean(message.new_chat_members?.length || message.left_chat_member);
}

function buildWelcomeActions(ctx: GroupChatContext): ProcessingAction[] {
  const members = ctx.message?.new_chat_members ?? [];
  if (members.length === 0) {
    return [];
  }

  const names = members
    .map((member) => member.first_name || member.username || member.id.toString())
    .join(", ");

  const welcomeText = content.messages.welcome ?? "Welcome to the group.";

  return [
    {
      type: "log",
      level: "info",
      message: "new members joined",
      details: {
        chatId: ctx.chat.id,
        members: members.map((member) => member.id),
      },
    },
    {
      type: "log",
      level: "debug",
      message: "welcome message dispatched",
      details: {
        chatId: ctx.chat.id,
      },
    },
    {
      type: "send_message",
      text: `Welcome ${names}!\n${welcomeText}`,
      replyToMessageId: ctx.message?.message_id,
      parseMode: "HTML",
    },
  ];
}

function buildLeaveActions(ctx: GroupChatContext): ProcessingAction[] {
  const leftMember = ctx.message?.left_chat_member;
  if (!leftMember) {
    return [];
  }

  return [
    {
      type: "log",
      level: "info",
      message: "member left group",
      details: {
        chatId: ctx.chat.id,
        userId: leftMember.id,
      },
    },
  ];
}

export const membershipHandler: UpdateHandler = {
  name: "group-membership-events",
  matches(ctx) {
    return isGroupChat(ctx) && hasMembershipEvent(ctx);
  },
  async handle(ctx) {
    const actions: ProcessingAction[] = [];
    actions.push(...buildWelcomeActions(ctx));
    actions.push(...buildLeaveActions(ctx));

    if (databaseAvailable) {
      await persistMembershipEvents(ctx);
    }

    if (actions.length === 0) {
      return { actions: ensureActions([{ type: "log", level: "debug", message: "membership handler no-op" }]) };
    }
    return { actions: ensureActions(actions) };
  },
};

async function persistMembershipEvents(ctx: GroupChatContext): Promise<void> {
  try {
    const { recordMembershipEvent } = await import("../../server/db/mutateRepository.js");
    const chatId = ctx.chat.id.toString();

    const newMembers = ctx.message?.new_chat_members ?? [];
    for (const member of newMembers) {
      await recordMembershipEvent({
        chatId,
        userId: member.id.toString(),
        event: "join",
        groupTitle: ctx.chat.title ?? null,
        payload: {
          username: member.username ?? null,
          firstName: member.first_name ?? null,
          lastName: member.last_name ?? null,
          isBot: member.is_bot ?? false,
        },
      });
    }

    const leftMember = ctx.message?.left_chat_member;
    if (leftMember) {
      await recordMembershipEvent({
        chatId,
        userId: leftMember.id.toString(),
        event: "leave",
        groupTitle: ctx.chat.title ?? null,
        payload: {
          username: leftMember.username ?? null,
          firstName: leftMember.first_name ?? null,
          lastName: leftMember.last_name ?? null,
          isBot: leftMember.is_bot ?? false,
        },
      });
    }
  } catch (error) {
    logger.warn("failed to persist membership events", { chatId: ctx.chat?.id, error });
  }
}
