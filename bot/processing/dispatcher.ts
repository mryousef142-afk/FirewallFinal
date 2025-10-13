import PQueue from "p-queue";
import type { Telegraf } from "telegraf";
import { handlers } from "./handlers/index.js";
import { ensureActions, executeAction, isGroupChat } from "./utils.js";
import type { GroupChatContext } from "./types.js";
import { resolveProcessingConfig } from "./config.js";
import { logger } from "../../server/utils/logger.js";

export function installProcessingPipeline(bot: Telegraf): void {
  const config = resolveProcessingConfig();
  const queue = new PQueue({
    concurrency: config.concurrency,
    intervalCap: config.intervalCap,
    interval: config.interval,
    carryoverConcurrencyCount: true,
  });

  queue.on("error", (error) => {
    logger.error("processing queue error", { error });
  });

  bot.use(async (ctx, next) => {
    if (!isGroupChat(ctx)) {
      return next();
    }

    const groupContext = ctx as GroupChatContext;

    await queue.add(async () => {
      await dispatchUpdate(groupContext);
    });

    return next();
  });
}

async function dispatchUpdate(ctx: GroupChatContext): Promise<void> {
  for (const handler of handlers) {
    try {
      if (!handler.matches(ctx)) {
        continue;
      }

      const result = await handler.handle(ctx);
      const actions = ensureActions(result?.actions);
      for (const action of actions) {
        await executeAction(ctx, action);
      }
    } catch (error) {
      logger.error("processing handler failed", {
        handler: handler.name,
        chatId: ctx.chat.id,
        error,
      });
    }
  }
}
