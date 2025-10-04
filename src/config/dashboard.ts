const inviteLink = (import.meta.env.VITE_INVITE_LINK as string | undefined)?.trim();
const mockDelayMs = Number(import.meta.env.VITE_DASHBOARD_DELAY_MS ?? "300");

export const dashboardConfig = {
  inviteLink: inviteLink && inviteLink.length > 0 ? inviteLink : undefined,
  refreshIntervalMs: Number(import.meta.env.VITE_DASHBOARD_REFRESH_MS ?? "0"),
  mockDelayMs: Number.isFinite(mockDelayMs) ? mockDelayMs : 300,
};
