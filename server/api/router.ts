import { Router } from "express";
import { createGroupsRouter } from "./routes/groups.js";
import { createStarsRouter } from "./routes/stars.js";
import { createFirewallRouter } from "./routes/firewall.js";
import { createMissionsRouter } from "./routes/missions.js";
import { requireTelegramInitData } from "./middleware/telegramInit.js";

type ApiRouterOptions = {
  ownerTelegramId: string | null;
};

export function createApiRouter(options: ApiRouterOptions): Router {
  const router = Router();

  router.get("/profile", requireTelegramInitData(), (req, res) => {
    const auth = req.telegramAuth!;
    res.json({
      user: auth.user,
      chat: auth.chat ?? null,
      authenticatedAt: new Date().toISOString(),
    });
  });

  router.use("/groups", createGroupsRouter());
  router.use("/stars", createStarsRouter({ ownerTelegramId: options.ownerTelegramId }));
  router.use("/firewall", createFirewallRouter());
  router.use("/missions", createMissionsRouter());

  return router;
}
