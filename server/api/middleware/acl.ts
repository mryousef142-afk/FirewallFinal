import type { NextFunction, Request, Response } from "express";
import { fetchPanelAdminsFromDb } from "../../db/stateRepository.js";
import { listPanelAdmins } from "../../../bot/state.js";

const ownerTelegramId = process.env.BOT_OWNER_ID?.trim() ?? null;

async function loadPanelAdmins(): Promise<Set<string>> {
  const admins = new Set<string>();
  if (ownerTelegramId) {
    admins.add(ownerTelegramId);
  }

  try {
    const records = await fetchPanelAdminsFromDb();
    records.forEach((id) => admins.add(id));
  } catch {
    // Fall back silently; the in-memory list is better than rejecting outright.
    listPanelAdmins().forEach((id) => admins.add(id));
  }

  return admins;
}

export async function ensurePanelAccess(userId: string): Promise<boolean> {
  const admins = await loadPanelAdmins();
  return admins.has(userId);
}

export function requirePanelAdmin() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const auth = req.telegramAuth;
    if (!auth) {
      res.status(401).json({ error: "Missing Telegram authentication context" });
      return;
    }
    if (!(await ensurePanelAccess(auth.userId))) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
