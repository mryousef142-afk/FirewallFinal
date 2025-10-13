import { startBotPolling } from "./index.js";

startBotPolling().catch((error) => {
  console.error("[bot] Failed to start polling:", error);
  process.exitCode = 1;
});
