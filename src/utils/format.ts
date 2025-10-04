const PERSIAN_DIGITS = [
  "\u06F0",
  "\u06F1",
  "\u06F2",
  "\u06F3",
  "\u06F4",
  "\u06F5",
  "\u06F6",
  "\u06F7",
  "\u06F8",
  "\u06F9"
] as const;

export function toPersianDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => {
    const index = Number(digit);
    return Number.isFinite(index)
      ? PERSIAN_DIGITS[index as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9]
      : digit;
  });
}

function formatDecimal(value: number): string {
  const abs = Math.abs(value);
  const raw = Number.isInteger(abs) ? Math.trunc(abs).toString() : abs.toFixed(1);
  return toPersianDigits(raw).replace(".", "\u066B");
}

export function formatNumber(value: number): string {
  const rounded = Math.round(value);
  const formatted = rounded.toLocaleString("en-US");
  return toPersianDigits(formatted).replace(/,/g, "\u066C");
}

export function formatMembersCount(count: number): string {
  return "\uD83D\uDC65 " + formatNumber(count) + " \u0639\u0636\u0648";
}

export function formatDaysLeft(days: number): string {
  return toPersianDigits(Math.max(days, 0)) + " \u0631\u0648\u0632 \u0628\u0627\u0642\u06CC\u200C\u0645\u0627\u0646\u062F\u0647";
}

export function formatDurationFromMs(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${toPersianDigits(days)} \u0631\u0648\u0632`);
  }
  if (hours > 0 || parts.length > 0) {
    parts.push(`${toPersianDigits(hours)} \u0633\u0627\u0639\u062A`);
  }
  parts.push(`${toPersianDigits(minutes)} \u062F\u0642\u06CC\u0642\u0647`);
  return parts.join(" ");
}

export function formatSignedPercent(direction: "up" | "down" | "flat", percent: number): string {
  if (!percent || direction === "flat") {
    return `${toPersianDigits(0)}٪`;
  }
  const sign = direction === "down" ? "−" : "+";
  return `${sign}${formatDecimal(percent)}٪`;
}
