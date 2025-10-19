import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== Channel Missions ====================

export async function listChannelMissions(category?: string) {
  return prisma.channelMission.findMany({
    where: category ? { isActive: true, category } : { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createChannelMission(data: {
  channelLink: string;
  buttonLabel: string;
  description: string;
  xpReward: number;
  category: string;
  createdBy?: string;
}) {
  return prisma.channelMission.create({
    data,
  });
}

export async function updateChannelMission(id: string, data: {
  channelLink?: string;
  buttonLabel?: string;
  description?: string;
  xpReward?: number;
  category?: string;
  isActive?: boolean;
}) {
  return prisma.channelMission.update({
    where: { id },
    data,
  });
}

export async function deleteChannelMission(id: string) {
  return prisma.channelMission.delete({
    where: { id },
  });
}

// ==================== User Progress ====================

export async function recordMissionCompletion(data: {
  userId: string;
  missionId: string;
  missionType: string;
  category: string;
  xpEarned: number;
}) {
  return prisma.userMissionProgress.create({
    data,
  });
}

export async function getUserMissionProgress(userId: string, category?: string) {
  return prisma.userMissionProgress.findMany({
    where: category ? { userId, category } : { userId },
    orderBy: { completedAt: "desc" },
  });
}

export async function isMissionCompleted(userId: string, missionId: string, missionType: string) {
  const existing = await prisma.userMissionProgress.findUnique({
    where: {
      userId_missionId_missionType: {
        userId,
        missionId,
        missionType,
      },
    },
  });
  return !!existing;
}

// ==================== Referrals ====================

export async function createReferral(data: {
  referrerId: string;
  referredId: string;
  referralCode: string;
}) {
  return prisma.userReferral.create({
    data,
  });
}

export async function activateReferral(referrerId: string, referredId: string, xpAwarded: number) {
  return prisma.userReferral.updateMany({
    where: {
      referrerId,
      referredId,
      isActive: false,
    },
    data: {
      isActive: true,
      xpAwarded,
      activatedAt: new Date(),
    },
  });
}

export async function getUserReferrals(referrerId: string) {
  return prisma.userReferral.findMany({
    where: { referrerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getReferralStats(referrerId: string) {
  const total = await prisma.userReferral.count({
    where: { referrerId },
  });

  const active = await prisma.userReferral.count({
    where: { referrerId, isActive: true },
  });

  const totalXp = await prisma.userReferral.aggregate({
    where: { referrerId, isActive: true },
    _sum: { xpAwarded: true },
  });

  return {
    totalInvites: total,
    activeReferrals: active,
    totalXpEarned: totalXp._sum.xpAwarded || 0,
  };
}

// ==================== XP Balance ====================

export async function getUserXPBalance(userId: string) {
  let balance = await prisma.userXPBalance.findUnique({
    where: { userId },
  });

  if (!balance) {
    balance = await prisma.userXPBalance.create({
      data: { userId },
    });
  }

  return balance;
}

export async function updateUserXP(userId: string, xpDelta: number) {
  const balance = await getUserXPBalance(userId);
  const newXp = balance.totalXp + xpDelta;

  // Calculate new level (simplified)
  const LEVEL_THRESHOLDS = [0, 250, 600, 1050, 1600, 2200, 2850, 3550, 4300, 5100, 5950, 6850];
  let newLevel = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (newXp >= LEVEL_THRESHOLDS[i]) {
      newLevel = i + 1;
    }
  }

  return prisma.userXPBalance.update({
    where: { userId },
    data: {
      totalXp: newXp,
      level: newLevel,
      updatedAt: new Date(),
    },
  });
}

// ==================== Badges ====================

export async function purchaseBadge(data: {
  userId: string;
  badgeId: string;
  badgeName: string;
  xpCost: number;
}) {
  // Create badge purchase
  const badge = await prisma.badgePurchase.create({
    data,
  });

  // Deduct XP
  await updateUserXP(data.userId, -data.xpCost);

  return badge;
}

export async function getUserBadges(userId: string) {
  return prisma.badgePurchase.findMany({
    where: { userId },
    orderBy: { purchasedAt: "desc" },
  });
}

// ==================== Credit Redemptions ====================

export async function redeemCredit(data: {
  userId: string;
  groupId?: string;
  days: number;
  xpCost: number;
}) {
  // Create redemption record
  const redemption = await prisma.creditRedemption.create({
    data,
  });

  // Deduct XP
  await updateUserXP(data.userId, -data.xpCost);

  return redemption;
}

export async function getUserRedemptions(userId: string) {
  return prisma.creditRedemption.findMany({
    where: { userId },
    orderBy: { redeemedAt: "desc" },
  });
}
