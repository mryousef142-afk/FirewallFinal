import type { UpdateHandler } from "../types.js";
import { ensureActions, isGroupChat } from "../utils.js";
import type { GroupChatContext } from "../types.js";
import { runFirewall } from "../firewallEngine.js";
import { logger } from "../../../server/utils/logger.js";

function isTextMessage(ctx: GroupChatContext): boolean {
  return Boolean(ctx.message && "text" in ctx.message && typeof ctx.message.text === "string");
}

export const textMessageHandler: UpdateHandler = {
  name: "group-text-message",
  matches(ctx) {
    return isGroupChat(ctx) && isTextMessage(ctx as GroupChatContext);
  },
  async handle(ctx) {
    const actions = await runFirewall(ctx as GroupChatContext);

    if (!actions.length) {
      return {
        actions: ensureActions([
          {
            type: "log",
            level: "debug",
            message: "text message passed without firewall action",
            details: {
              chatId: ctx.chat?.id,
              userId: ctx.message && "from" in ctx.message ? ctx.message.from?.id : undefined,
            },
          },
        ]),
      };
    }

    logger.debug("firewall actions generated for text message", {
      chatId: ctx.chat?.id,
      actionCount: actions.length,
    });

    return { actions: ensureActions(actions) };
  },
};
