import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../utils/telegramBotApi.js", () => ({
  createInvoiceLink: vi.fn(async () => "https://t.me/mock-invoice"),
  refundStarsPayment: vi.fn(async () => true),
}));

vi.mock("../../db/mutateRepository.js", () => {
  const store = new Map<
    string,
    {
      id: string;
      status: "pending" | "completed" | "refunded";
      amount: number;
      metadata: Record<string, unknown>;
      ownerTelegramId: string;
      externalId: string | null;
    }
  >();

  return {
    createPendingStarTransaction: vi.fn(
      async (input: {
        ownerTelegramId: string;
        groupChatId?: string | null;
        planId: string;
        gifted: boolean;
        metadata?: Record<string, unknown>;
      }) => {
        const transactionId = `txn_${store.size + 1}`;
        store.set(transactionId, {
          id: transactionId,
          status: "pending",
          amount: 0,
          metadata: {
            groupChatId: input.groupChatId ?? null,
            planId: input.planId,
            gifted: input.gifted,
            ...(input.metadata ?? {}),
          },
          ownerTelegramId: input.ownerTelegramId,
          externalId: null,
        });
        return { transactionId };
      },
    ),
    patchStarTransactionMetadata: vi.fn(async (id: string, metadata: Record<string, unknown>) => {
      const record = store.get(id);
      if (!record) {
        throw new Error(`Transaction ${id} missing`);
      }
      record.metadata = { ...record.metadata, ...metadata };
    }),
    findStarTransactionById: vi.fn(async (id: string) => {
      const record = store.get(id);
      if (!record) {
        return null;
      }
      return {
        id: record.id,
        status: record.status,
        amount: record.amount,
        metadata: record.metadata,
        externalId: record.externalId,
        group: {
          telegramChatId: record.metadata.groupChatId ?? null,
          title: (record.metadata.groupTitle as string | undefined) ?? "Mock Group",
        },
        wallet: {
          owner: {
            telegramId: record.ownerTelegramId,
          },
        },
      };
    }),
    completeStarTransaction: vi.fn(
      async (input: {
        transactionId: string;
        amountDelta: number;
        status?: "completed" | "refunded";
        externalId?: string | null;
        expiresAt: string;
        gifted: boolean;
      }) => {
        const record = store.get(input.transactionId);
        if (!record) {
          throw new Error(`Transaction ${input.transactionId} missing`);
        }
        record.amount = input.amountDelta;
        record.status = input.status ?? "completed";
        record.externalId = input.externalId ?? record.externalId;
        record.metadata = {
          ...record.metadata,
          expiresAt: input.expiresAt,
          gifted: input.gifted,
        };
      },
    ),
    __resetTransactions: () => {
      store.clear();
    },
    __getTransaction: (id: string) => store.get(id),
  };
});

vi.mock("../../../bot/state.js", () => {
  const plans = [
    { id: "stars-30", days: 30, price: 500, label: "30 days" },
    { id: "stars-60", days: 60, price: 900, label: "60 days" },
  ];
  let balance = 0;

  const snapshot = () => ({
    balance,
    plans,
    groups: {},
  });

  const adjustStarsBalance = vi.fn((delta: number) => {
    balance += delta;
    return snapshot();
  });

  const applyStarsPurchase = vi.fn(
    (input: { planId: string; groupId: string; gifted: boolean }) => {
      const plan = plans.find((item) => item.id === input.planId);
      if (!plan) {
        throw new Error(`Plan ${input.planId} missing`);
      }
      if (balance < plan.price) {
        throw new Error("Insufficient Stars balance");
      }
      balance -= plan.price;
      return {
        group: {
          chatId: input.groupId,
          title: "Mock Group",
        },
        plan,
        expiresAt: new Date("2030-01-01T00:00:00.000Z").toISOString(),
        daysAdded: plan.days,
        newBalance: balance,
        gifted: input.gifted,
      };
    },
  );

  return {
    getStarsState: vi.fn(() => snapshot()),
    applyStarsPurchase,
    adjustStarsBalance,
    __setMockBalance: (value: number) => {
      balance = value;
    },
  };
});

import { purchaseStars, finalizeStarsPurchase, refundStarsTransaction } from "../starsService.js";
import { createInvoiceLink, refundStarsPayment } from "../../utils/telegramBotApi.js";
import * as mutateRepository from "../../db/mutateRepository.js";
import * as stateModule from "../../../bot/state.js";

const mockedInvoiceLink = vi.mocked(createInvoiceLink);
const mockedRefundPayment = vi.mocked(refundStarsPayment);
const mockedApplyStarsPurchase = vi.mocked(stateModule.applyStarsPurchase);
const mockedAdjustStarsBalance = vi.mocked(stateModule.adjustStarsBalance);
const mockedCompleteTransaction = vi.mocked(mutateRepository.completeStarTransaction);
const mockedPatchMetadata = vi.mocked(mutateRepository.patchStarTransactionMetadata);

const mutateRepoAny = mutateRepository as unknown as { __resetTransactions: () => void; __getTransaction: (id: string) => any };
const stateModuleAny = stateModule as unknown as { __setMockBalance: (value: number) => void };

beforeEach(() => {
  vi.clearAllMocks();
  mutateRepoAny.__resetTransactions();
  stateModuleAny.__setMockBalance(0);
  process.env.STARS_AUTO_CAPTURE = "false";
  process.env.BOT_USERNAME = "stars_test_bot";
});

describe("starsService integration", () => {
  it("creates pending invoice when auto capture is disabled", async () => {
    const result = await purchaseStars({
      ownerTelegramId: "111",
      groupId: "grp-1",
      planId: "stars-30",
    });

    expect(result.status).toBe("pending");
    expect(result.paymentUrl).toBe("https://t.me/mock-invoice");
    expect(mockedInvoiceLink).toHaveBeenCalledOnce();

    const stored = mutateRepoAny.__getTransaction(result.transactionId);
    expect(stored.metadata.invoiceLink).toBe("https://t.me/mock-invoice");
    expect(mockedPatchMetadata).toHaveBeenCalled();
  });

  it("finalizes transaction and tops up balance when insufficient funds", async () => {
    stateModuleAny.__setMockBalance(0);

    const pending = await purchaseStars({
      ownerTelegramId: "222",
      groupId: "grp-2",
      planId: "stars-30",
    });

    expect(pending.status).toBe("pending");

    const result = await finalizeStarsPurchase(pending.transactionId);

    expect(result.status).toBe("completed");
    expect(mockedAdjustStarsBalance).toHaveBeenCalledWith(expect.any(Number));
    expect(mockedApplyStarsPurchase).toHaveBeenCalled();
    expect(mockedCompleteTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: pending.transactionId,
        status: "completed",
      }),
    );
  });

  it("issues refunds and updates transaction metadata", async () => {
    stateModuleAny.__setMockBalance(1000);

    const pending = await purchaseStars({
      ownerTelegramId: "333",
      groupId: "grp-3",
      planId: "stars-30",
    });

    await finalizeStarsPurchase(pending.transactionId, { externalId: "charge-1" });

    const result = await refundStarsTransaction(pending.transactionId);

    expect(result.status).toBe("refunded");
    expect(mockedRefundPayment).toHaveBeenCalledWith({
      userId: 333,
      telegramPaymentChargeId: "charge-1",
    });
    expect(mockedAdjustStarsBalance).toHaveBeenCalledWith(expect.any(Number));

    const stored = mutateRepoAny.__getTransaction(pending.transactionId);
    expect(stored.status).toBe("refunded");
  });
});
