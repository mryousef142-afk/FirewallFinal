import { Router } from "express";
import { requireTelegramInitData } from "../middleware/telegramInit.js";
import { requirePanelAdmin } from "../middleware/acl.js";
import {
  buildManagedGroup,
  loadGroupsSnapshot,
  searchGroupRecords,
} from "../../services/dashboardService.js";
import {
  listModerationActionsFromDb,
  listMembershipEventsFromDb,
} from "../../db/stateRepository.js";

export function createGroupsRouter(): Router {
  const router = Router();

  router.use(requireTelegramInitData());
  router.use(requirePanelAdmin());

  router.get("/", async (_req, res) => {
    const records = await loadGroupsSnapshot();
    const payload = records.map((record) => buildManagedGroup(record));
    res.json({ groups: payload });
  });

  router.get("/search", async (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q : "";
    const limit = Number.isFinite(Number(req.query.limit)) ? Number(req.query.limit) : 20;
    const results = await searchGroupRecords(query, limit);
    res.json({ query, results });
  });

  router.get("/:chatId/moderation-actions", async (req, res) => {
    const chatId = req.params.chatId;
    if (!chatId) {
      res.status(400).json({ error: "chatId is required" });
      return;
    }
    const limit = Number.isFinite(Number(req.query.limit)) ? Number(req.query.limit) : 100;
    const actions = await listModerationActionsFromDb(chatId, limit);
    res.json({ chatId, actions });
  });

  router.get("/:chatId/membership-events", async (req, res) => {
    const chatId = req.params.chatId;
    if (!chatId) {
      res.status(400).json({ error: "chatId is required" });
      return;
    }
    const limit = Number.isFinite(Number(req.query.limit)) ? Number(req.query.limit) : 100;
    const events = await listMembershipEventsFromDb(chatId, limit);
    res.json({ chatId, events });
  });

  return router;
}
