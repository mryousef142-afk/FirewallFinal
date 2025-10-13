import type { ProcessingConfig } from "./types.js";

function toPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function resolveProcessingConfig(): ProcessingConfig {
  return {
    concurrency: toPositiveInteger(process.env.PROCESSING_CONCURRENCY, 4),
    intervalCap: toPositiveInteger(process.env.PROCESSING_INTERVAL_CAP, 25),
    interval: toPositiveInteger(process.env.PROCESSING_INTERVAL_MS, 1000),
    warningThreshold: toPositiveInteger(process.env.PROCESSING_WARNING_THRESHOLD, 3),
    muteDurationSeconds: toPositiveInteger(process.env.PROCESSING_MUTE_DURATION_SECONDS, 600),
  };
}
