import { Prisma } from "@prisma/client";
import { prisma } from "./client.js";
import { logger } from "../utils/logger.js";

export type GroupStateSnapshot = {
  chatId: string;
  title: string;
  creditBalance: number;
  inviteLink: string | null;
  managed: boolean;
};

async function upsertGroupCore(record: GroupStateSnapshot): Promise<void> {
  const status = record.creditBalance > 0 ? "active" : "expired";
  const credit = new Prisma.Decimal(record.creditBalance || 0);

  await prisma.group.upsert({
    where: { telegramChatId: record.chatId },
    create: {
      telegramChatId: record.chatId,
      title: record.title,
      status,
      creditBalance: credit,
      inviteLink: record.inviteLink ?? undefined,
    },
    update: {
      title: record.title,
      status,
      creditBalance: credit,
      inviteLink: record.inviteLink ?? undefined,
    },
  });
}

export async function upsertGroupFromState(record: GroupStateSnapshot): Promise<void> {
  await upsertGroupCore(record);
}

async function ensureGroupRecord(chatId: string, title?: string): Promise<string> {
  const existing = await prisma.group.findUnique({
    where: { telegramChatId: chatId },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  const created = await prisma.group.create({
    data: {
      telegramChatId: chatId,
      title: title && title.trim().length > 0 ? title : `Group ${chatId}`,
      status: "unknown",
      creditBalance: new Prisma.Decimal(0),
    },
    select: { id: true },
  });
  return created.id;
}

export async function promotePanelAdmin(telegramId: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { telegramId } });
  if (!existing) {
    await prisma.user.create({
      data: {
        telegramId,
        role: "panel_admin",
      },
    });
    return;
  }

  if (existing.role === "owner") {
    return;
  }

  if (existing.role !== "panel_admin") {
    await prisma.user.update({
      where: { telegramId },
      data: { role: "panel_admin" },
    });
  }
}

export async function demotePanelAdmin(telegramId: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { telegramId } });
  if (!existing) {
    return;
  }
  if (existing.role === "owner") {
    return;
  }
  if (existing.role !== "panel_admin") {
    return;
  }

  await prisma.user.update({
    where: { telegramId },
    data: { role: "user" },
  });
}

async function ensureOwnerWallet(tx: Prisma.TransactionClient, ownerTelegramId: string) {
  const owner = await tx.user.upsert({
    where: { telegramId: ownerTelegramId },
    update: {},
    create: {
      telegramId: ownerTelegramId,
      role: "owner",
    },
  });

  const wallet = await tx.starsWallet.upsert({
    where: { ownerId: owner.id },
    create: {
      ownerId: owner.id,
      balance: 0,
    },
    update: {},
  });

  return { owner, wallet };
}

type OwnerClient = Prisma.TransactionClient;

async function resolveOwnerWallet(
  client: OwnerClient,
  ownerTelegramId: string,
): Promise<{ wallet: { id: string } }> {
  const { wallet } = await ensureOwnerWallet(client, ownerTelegramId);
  return { wallet };
}

type JsonRecord = Prisma.JsonObject;

function mergeMetadata(existing: Prisma.JsonValue | null | undefined, merged: JsonRecord): JsonRecord {
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return {
      ...(existing as JsonRecord),
      ...merged,
    };
  }
  return merged;
}

export type StarsTransactionPendingInput = {
  ownerTelegramId: string;
  groupChatId?: string | null;
  planId: string;
  gifted: boolean;
  metadata?: JsonRecord;
};

export async function createPendingStarTransaction(input: StarsTransactionPendingInput): Promise<{ transactionId: string }> {
  const result = await prisma.$transaction(async (tx) => {
    const { wallet } = await resolveOwnerWallet(tx, input.ownerTelegramId);
    const group = input.groupChatId
      ? await tx.group.findUnique({ where: { telegramChatId: input.groupChatId } })
      : null;

    const record = await tx.starTransaction.create({
      data: {
        walletId: wallet.id,
        groupId: group?.id ?? null,
        type: input.gifted ? "gift" : "purchase",
        amount: 0,
        status: "pending",
        metadata: mergeMetadata(input.metadata, {
          planId: input.planId,
          gifted: input.gifted,
          groupChatId: input.groupChatId ?? null,
          ownerTelegramId: input.ownerTelegramId,
        }),
      },
    });

    return { transactionId: record.id };
  });

  return result;
}

export async function patchStarTransactionMetadata(transactionId: string, metadata: Record<string, unknown>): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.starTransaction.findUnique({
      where: { id: transactionId },
      select: { metadata: true },
    });
    if (!existing) {
      throw new Error(`Star transaction ${transactionId} not found`);
    }
    await tx.starTransaction.update({
      where: { id: transactionId },
      data: {
        metadata: mergeMetadata(existing.metadata, metadata as JsonRecord),
      },
    });
  });
}

export type StarsTransactionCompletionInput = {
  transactionId: string;
  amountDelta: number;
  planId: string;
  expiresAt: string;
  gifted: boolean;
  status?: "completed" | "refunded";
  externalId?: string | null;
};

export async function completeStarTransaction(input: StarsTransactionCompletionInput): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.starTransaction.findUnique({
      where: { id: input.transactionId },
    });

    if (!existing) {
      throw new Error(`Star transaction ${input.transactionId} not found`);
    }

    if (existing.status === "completed" && input.status !== "refunded") {
      return;
    }

    if (existing.status === "refunded") {
      throw new Error(`Star transaction ${input.transactionId} already refunded`);
    }

    await tx.starsWallet.update({
      where: { id: existing.walletId },
      data: {
        balance: {
          increment: input.amountDelta,
        },
      },
    });

    await tx.starTransaction.update({
      where: { id: input.transactionId },
      data: {
        amount: input.amountDelta,
        status: input.status ?? "completed",
        externalId: input.externalId ?? existing.externalId,
        completedAt: new Date(),
        metadata: mergeMetadata(existing.metadata, {
          planId: input.planId,
          expiresAt: input.expiresAt,
          gifted: input.gifted,
        }),
      },
    });
  });
}

export async function recordStarsPurchaseInDb(input: StarsTransactionCompletionInput & { groupChatId: string; ownerTelegramId: string }): Promise<void> {
  const existing = await prisma.starTransaction.findUnique({
    where: { id: input.transactionId },
  });

  if (!existing) {
    const pending = await createPendingStarTransaction({
      ownerTelegramId: input.ownerTelegramId,
      groupChatId: input.groupChatId,
      planId: input.planId,
      gifted: input.gifted,
      metadata: {
        legacy: true,
      },
    });
    await completeStarTransaction({
      transactionId: pending.transactionId,
      amountDelta: input.amountDelta,
      planId: input.planId,
      expiresAt: input.expiresAt,
      gifted: input.gifted,
      status: input.status,
      externalId: input.externalId,
    });
    return;
  }

  await completeStarTransaction(input);
}

export type PromoSlideSnapshot = {
  id: string;
  fileId: string;
  link: string;
  width: number;
  height: number;
  position?: number;
};

export async function upsertPromoSlide(snapshot: PromoSlideSnapshot): Promise<void> {
  logger.info("promo slide upsert", { id: snapshot.id });
  await prisma.promoSlide.upsert({
    where: {
      id: snapshot.id,
    },
    create: {
      id: snapshot.id,
      imageUrl: snapshot.fileId,
      linkUrl: snapshot.link,
      position: snapshot.position ?? 0,
      metadata: {
        fileId: snapshot.fileId,
        width: snapshot.width,
        height: snapshot.height,
      },
    },
    update: {
      imageUrl: snapshot.fileId,
      linkUrl: snapshot.link,
      position: snapshot.position ?? 0,
      metadata: {
        fileId: snapshot.fileId,
        width: snapshot.width,
        height: snapshot.height,
      },
    },
  });
}

export async function deletePromoSlide(id: string): Promise<void> {
  logger.info("promo slide delete", { id });
  await prisma.promoSlide
    .delete({
      where: { id },
    })
    .catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return;
      }
      throw error;
    });
}

export async function addPanelBan(telegramId: string, reason?: string, createdBy?: string): Promise<void> {
  await prisma.panelBan.upsert({
    where: {
      telegramId,
    },
    create: {
      telegramId,
      reason,
      createdBy,
    },
    update: {
      reason,
      createdBy,
    },
  });
}

export async function removePanelBan(telegramId: string): Promise<void> {
  await prisma.panelBan
    .delete({
      where: { telegramId },
    })
    .catch((error) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return;
      }
      throw error;
    });
}

export type ModerationActionDbInput = {
  chatId: string;
  userId?: string | null;
  actorId?: string | null;
  action: string;
  severity?: string | null;
  reason?: string | null;
  metadata?: Prisma.JsonValue;
  groupTitle?: string | null;
};

export async function recordModerationAction(input: ModerationActionDbInput): Promise<void> {
  const groupId = await ensureGroupRecord(input.chatId, input.groupTitle ?? undefined);
  await prisma.moderationAction.create({
    data: {
      groupId,
      userId: input.userId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      severity: input.severity ?? null,
      reason: input.reason ?? null,
      metadata: input.metadata,
    },
  });
}

export type MembershipEventDbInput = {
  chatId: string;
  userId: string;
  event: "join" | "leave";
  payload?: Prisma.JsonValue;
  groupTitle?: string | null;
};

export async function recordMembershipEvent(input: MembershipEventDbInput): Promise<void> {
  const groupId = await ensureGroupRecord(input.chatId, input.groupTitle ?? undefined);
  await prisma.membershipEvent.create({
    data: {
      groupId,
      userId: input.userId,
      event: input.event,
      payload: input.payload,
    },
  });
}
export async function findStarTransactionById(id: string) {
  return prisma.starTransaction.findUnique({
    where: { id },
    include: {
      group: {
        select: {
          telegramChatId: true,
          title: true,
        },
      },
      wallet: {
        include: {
          owner: {
            select: {
              telegramId: true,
            },
          },
        },
      },
    },
  });
}
