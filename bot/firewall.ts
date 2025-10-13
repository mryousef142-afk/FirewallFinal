import type { Telegraf } from "telegraf";
import { logger } from "../server/utils/logger.js";
import { invalidateCachedRules } from "./processing/firewallEngine.js";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

export function installFirewall(_bot: Telegraf): void {
  if (!databaseAvailable) {
    logger.debug("firewall engine disabled (no DATABASE_URL)");
    return;
  }

  logger.info("firewall engine enabled via processing pipeline");
}

export function invalidateFirewallCache(chatId?: string | null): void {
  if (!databaseAvailable) {
    return;
  }
  invalidateCachedRules(chatId ?? undefined);
}
