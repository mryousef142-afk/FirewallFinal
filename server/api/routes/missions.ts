import { Router } from "express";
import { requireTelegramInitData } from "../middleware/telegramInit.js";
import * as missionRepo from "../../db/missionRepository.js";

export function createMissionsRouter(): Router {
  const router = Router();

  // Get all channel missions
  router.get("/channels", requireTelegramInitData(), async (req, res) => {
    try {
      const { category } = req.query;
      const missions = await missionRepo.listChannelMissions(category as string);
      res.json({ missions });
    } catch (error) {
      console.error("Failed to fetch channel missions:", error);
      res.status(500).json({ error: "Failed to fetch missions" });
    }
  });

  // Get user's XP balance and stats
  router.get("/xp", requireTelegramInitData(), async (req, res) => {
    try {
      const userId = req.telegramAuth!.user.id.toString();
      const balance = await missionRepo.getUserXPBalance(userId);
      const badges = await missionRepo.getUserBadges(userId);
      const referralStats = await missionRepo.getReferralStats(userId);

      res.json({
        xp: balance.totalXp,
        level: balance.level,
        streak: balance.streak,
        badges: badges.map(b => ({
          id: b.badgeId,
          name: b.badgeName,
          purchasedAt: b.purchasedAt,
        })),
        referrals: referralStats,
      });
    } catch (error) {
      console.error("Failed to fetch XP data:", error);
      res.status(500).json({ error: "Failed to fetch XP data" });
    }
  });

  // Complete a mission
  router.post("/complete", requireTelegramInitData(), async (req, res) => {
    try {
      const userId = req.telegramAuth!.user.id.toString();
      const { missionId, missionType, category, xpEarned } = req.body;

      // Check if already completed
      const alreadyCompleted = await missionRepo.isMissionCompleted(userId, missionId, missionType);
      if (alreadyCompleted) {
        return res.status(400).json({ error: "Mission already completed" });
      }

      // Record completion
      await missionRepo.recordMissionCompletion({
        userId,
        missionId,
        missionType,
        category,
        xpEarned,
      });

      // Update XP
      const updatedBalance = await missionRepo.updateUserXP(userId, xpEarned);

      res.json({
        success: true,
        xp: updatedBalance.totalXp,
        level: updatedBalance.level,
      });
    } catch (error) {
      console.error("Failed to complete mission:", error);
      res.status(500).json({ error: "Failed to complete mission" });
    }
  });

  // Get user's mission progress
  router.get("/progress", requireTelegramInitData(), async (req, res) => {
    try {
      const userId = req.telegramAuth!.user.id.toString();
      const { category } = req.query;
      const progress = await missionRepo.getUserMissionProgress(userId, category as string);

      res.json({ progress });
    } catch (error) {
      console.error("Failed to fetch progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  });

  // Purchase badge
  router.post("/badges/purchase", requireTelegramInitData(), async (req, res) => {
    try {
      const userId = req.telegramAuth!.user.id.toString();
      const { badgeId, badgeName, xpCost } = req.body;

      // Check if user has enough XP
      const balance = await missionRepo.getUserXPBalance(userId);
      if (balance.totalXp < xpCost) {
        return res.status(400).json({ error: "Insufficient XP" });
      }

      // Purchase badge
      const badge = await missionRepo.purchaseBadge({
        userId,
        badgeId,
        badgeName,
        xpCost,
      });

      res.json({ success: true, badge });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return res.status(400).json({ error: "Badge already purchased" });
      }
      console.error("Failed to purchase badge:", error);
      res.status(500).json({ error: "Failed to purchase badge" });
    }
  });

  // Redeem credit
  router.post("/credits/redeem", requireTelegramInitData(), async (req, res) => {
    try {
      const userId = req.telegramAuth!.user.id.toString();
      const { groupId, days, xpCost } = req.body;

      // Check if user has enough XP
      const balance = await missionRepo.getUserXPBalance(userId);
      if (balance.totalXp < xpCost) {
        return res.status(400).json({ error: "Insufficient XP" });
      }

      // Redeem credit
      const redemption = await missionRepo.redeemCredit({
        userId,
        groupId,
        days,
        xpCost,
      });

      // TODO: Apply credit to group
      // This should be done in a separate service

      res.json({ success: true, redemption });
    } catch (error) {
      console.error("Failed to redeem credit:", error);
      res.status(500).json({ error: "Failed to redeem credit" });
    }
  });

  // Get user's referrals
  router.get("/referrals", requireTelegramInitData(), async (req, res) => {
    try {
      const userId = req.telegramAuth!.user.id.toString();
      const referrals = await missionRepo.getUserReferrals(userId);
      const stats = await missionRepo.getReferralStats(userId);

      res.json({
        referrals,
        stats,
      });
    } catch (error) {
      console.error("Failed to fetch referrals:", error);
      res.status(500).json({ error: "Failed to fetch referrals" });
    }
  });

  return router;
}
