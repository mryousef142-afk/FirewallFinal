import "dotenv/config";

import { startBotPolling, startBotWebhookServer } from "../bot/index.js";

async function main(): Promise<void> {
  const mode = (process.env.BOT_START_MODE ?? "webhook").toLowerCase();

  if (mode === "polling") {
    console.log("[server] Starting bot in polling mode.");
    await startBotPolling();
    return;
  }

  const domain = process.env.WEBHOOK_DOMAIN;
  if (!domain) {
    throw new Error("WEBHOOK_DOMAIN environment variable is required for webhook mode");
  }

  const webhookPath = process.env.WEBHOOK_PATH;
  const secretToken = process.env.BOT_WEBHOOK_SECRET;
  const port = Number.isFinite(Number(process.env.PORT)) ? Number(process.env.PORT) : undefined;
  const host = process.env.HOST;

  console.log("[server] Starting webhook server...");
  await startBotWebhookServer({
    domain,
    path: webhookPath,
    port,
    host,
    secretToken: secretToken && secretToken.trim().length > 0 ? secretToken : undefined,
  });
}

main().catch((error) => {
  console.error("[server] Failed to start bot server:", error);
  process.exitCode = 1;
});
