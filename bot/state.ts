import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(moduleDir, "../data");
const statePath = resolve(dataDir, "bot-state.json");
const databaseAvailable = Boolean(process.env.DATABASE_URL);
const ownerTelegramId = process.env.BOT_OWNER_ID?.trim() ?? null;

export type PanelSettings = {
  freeTrialDays: number;
  monthlyStars: number;
  welcomeMessages: string[];
  gpidHelpText: string;
  buttonLabels: Record<string, string>;
  channelAnnouncement: string;
  infoCommands: string;
};

export type GroupRecord = {
  chatId: string;
  title: string;
  creditBalance: number;
  createdAt: string;
  updatedAt: string;
  lastAdjustmentNote: string | null;
  membersCount: number;
  inviteLink: string | null;
  photoUrl: string | null;
  managed: boolean;
};

export type PromoSlideRecord = {
  id: string;
  fileId: string;
  link: string;
  width: number;
  height: number;
  createdAt: string;
};

export type BroadcastRecord = {
  id: string;
  message: string;
  createdAt: string;
};

export type StarsPlanRecord = {
  id: string;
  days: number;
  price: number;
  label?: string;
  description?: string;
};

export type GroupStarsRecord = {
  groupId: string;
  expiresAt: string;
  gifted: boolean;
};

export type StarsState = {
  balance: number;
  plans: StarsPlanRecord[];
  groups: Record<string, GroupStarsRecord>;
};

export type BotState = {
  panelAdmins: string[];
  bannedUserIds: string[];
  groups: Record<string, GroupRecord>;
  settings: PanelSettings;
  promoSlides: PromoSlideRecord[];
  broadcasts: BroadcastRecord[];
  stars: StarsState;
};

const defaultState: BotState = {
  panelAdmins: [],
  bannedUserIds: [],
  groups: {},
  settings: {
    freeTrialDays: 7,
    monthlyStars: 10,
    welcomeMessages: [],
    gpidHelpText: "Share the group ID or forward a message so the bot can detect it automatically.",
    buttonLabels: {},
    channelAnnouncement: "Channel link not configured yet.",
    infoCommands: "Use /panel in a private chat to access owner tools.",
  },
  promoSlides: [],
  broadcasts: [],
  stars: {
    balance: 2400,
    plans: [
      { id: "stars-30", days: 30, price: 500 },
      { id: "stars-60", days: 60, price: 900 },
      { id: "stars-90", days: 90, price: 1300 },
    ],
    groups: {},
  },
};

function ensureDataDir(): void {
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }
}

function readStateFromDisk(): BotState {
  ensureDataDir();
  if (!existsSync(statePath)) {
    return structuredClone(defaultState);
  }
  try {
    const raw = readFileSync(statePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<BotState>;
    const groupsInput =
      typeof parsed.groups === "object" && parsed.groups !== null ? (parsed.groups as Record<string, Partial<GroupRecord>>) : {};
    const groups: Record<string, GroupRecord> = Object.fromEntries(
      Object.entries(groupsInput).map(([id, value]) => {
        const title = typeof value.title === "string" && value.title.trim().length > 0 ? value.title : `Group ${id}`;
        const creditBalance =
          typeof value.creditBalance === "number" && Number.isFinite(value.creditBalance) ? Math.max(0, value.creditBalance) : 0;
        const createdAt = typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString();
        const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : createdAt;
        return [
          id,
          {
            chatId: id,
            title,
            creditBalance,
            createdAt,
            updatedAt,
            lastAdjustmentNote: typeof value.lastAdjustmentNote === "string" ? value.lastAdjustmentNote : null,
            membersCount:
              typeof value.membersCount === "number" && Number.isFinite(value.membersCount) ? Math.max(0, value.membersCount) : 0,
            inviteLink: typeof value.inviteLink === "string" ? value.inviteLink : null,
            photoUrl: typeof value.photoUrl === "string" ? value.photoUrl : null,
            managed: value?.managed !== false,
          },
        ];
      })
    );

    const starsInput = parsed.stars ?? {};
    const plans = Array.isArray(starsInput?.plans)
      ? (starsInput.plans as StarsPlanRecord[]).map((plan) => ({
          id: String(plan.id),
          days: Number.isFinite(plan.days) ? plan.days : 0,
          price: Number.isFinite(plan.price) ? plan.price : 0,
          ...(plan.label ? { label: String(plan.label) } : {}),
          ...(plan.description ? { description: String(plan.description) } : {}),
        }))
      : structuredClone(defaultState.stars.plans);
    const starsGroupsInput =
      typeof starsInput?.groups === "object" && starsInput?.groups !== null
        ? (starsInput.groups as Record<string, Partial<GroupStarsRecord>>)
        : {};
    const starsGroups: Record<string, GroupStarsRecord> = Object.fromEntries(
      Object.entries(starsGroupsInput).map(([id, entry]) => [
        id,
        {
          groupId: id,
          expiresAt: typeof entry?.expiresAt === "string" ? entry.expiresAt : new Date().toISOString(),
          gifted: entry?.gifted === true,
        },
      ])
    );
    return {
      panelAdmins: Array.isArray(parsed.panelAdmins) ? parsed.panelAdmins.map(String) : [],
      bannedUserIds: Array.isArray(parsed.bannedUserIds) ? parsed.bannedUserIds.map(String) : [],
      groups,
      settings: {
        ...defaultState.settings,
        ...(typeof parsed.settings === "object" && parsed.settings !== null ? parsed.settings : {}),
        welcomeMessages: Array.isArray(parsed.settings?.welcomeMessages)
          ? parsed.settings?.welcomeMessages.map(String)
          : defaultState.settings.welcomeMessages,
        buttonLabels:
          typeof parsed.settings?.buttonLabels === "object" && parsed.settings?.buttonLabels !== null
            ? Object.fromEntries(
                Object.entries(parsed.settings.buttonLabels).map(([key, value]) => [key, String(value)])
              )
            : structuredClone(defaultState.settings.buttonLabels),
      },
      promoSlides: Array.isArray(parsed.promoSlides) ? parsed.promoSlides : [],
      broadcasts: Array.isArray(parsed.broadcasts) ? parsed.broadcasts : [],
      stars: {
        balance:
          typeof starsInput?.balance === "number" && Number.isFinite(starsInput.balance)
            ? Math.max(0, starsInput.balance)
            : defaultState.stars.balance,
        plans,
        groups: starsGroups,
      },
    };
  } catch (error) {
    console.error("[state] Failed to parse bot-state.json, falling back to defaults:", error);
    return structuredClone(defaultState);
  }
}

let state: BotState = readStateFromDisk();

function logDbWarning(context: string, error: unknown): void {
  if (!databaseAvailable) {
    return;
  }
  console.warn(`[db] ${context}:`, error instanceof Error ? error.message : error);
}

async function syncGroupRecord(record: GroupRecord): Promise<void> {
  if (!databaseAvailable) {
    return;
  }
  try {
    const { upsertGroupFromState } = await import("../server/db/mutateRepository.js");
    await upsertGroupFromState({
      chatId: record.chatId,
      title: record.title,
      creditBalance: record.creditBalance,
      inviteLink: record.inviteLink,
      managed: record.managed,
    });
  } catch (error) {
    logDbWarning("group sync failed", error);
  }
}

async function promotePanelAdminRecord(telegramId: string): Promise<void> {
  if (!databaseAvailable) {
    return;
  }
  try {
    const { promotePanelAdmin } = await import("../server/db/mutateRepository.js");
    await promotePanelAdmin(telegramId);
  } catch (error) {
    logDbWarning("panel admin promotion failed", error);
  }
}

async function demotePanelAdminRecord(telegramId: string): Promise<void> {
  if (!databaseAvailable) {
    return;
  }
  try {
    const { demotePanelAdmin } = await import("../server/db/mutateRepository.js");
    await demotePanelAdmin(telegramId);
  } catch (error) {
    logDbWarning("panel admin demotion failed", error);
  }
}

async function hydratePanelAdminsFromDb(): Promise<void> {
  if (!databaseAvailable) {
    return;
  }
  try {
    const { fetchPanelAdminsFromDb } = await import("../server/db/stateRepository.js");
    const admins = await fetchPanelAdminsFromDb();
    if (!admins.length) {
      return;
    }

    withState((draft) => {
      const merged = new Set<string>(admins.map((id) => id.trim()).filter(Boolean));
      if (ownerTelegramId) {
        merged.add(ownerTelegramId);
      }
      draft.panelAdmins = Array.from(merged).sort((a, b) => a.localeCompare(b));
      return draft;
    });
  } catch (error) {
    logDbWarning("panel admin hydration failed", error);
  }
}

async function hydratePromoSlidesFromDb(): Promise<void> {
  if (!databaseAvailable) {
    return;
  }
  try {
    const { fetchPromoSlidesFromDb } = await import("../server/db/stateRepository.js");
    const slides = await fetchPromoSlidesFromDb();
    if (!slides.length) {
      return;
    }
    withState((draft) => {
      draft.promoSlides = slides.map((slide) => ({
        id: slide.id,
        fileId: slide.fileId,
        link: slide.link,
        width: slide.width,
        height: slide.height,
        createdAt: slide.createdAt,
      }));
      return draft;
    });
  } catch (error) {
    logDbWarning("promo slide hydration failed", error);
  }
}

async function hydratePanelBansFromDb(): Promise<void> {
  if (!databaseAvailable) {
    return;
  }
  try {
    const { fetchPanelBansFromDb } = await import("../server/db/stateRepository.js");
    const bans = await fetchPanelBansFromDb();
    if (!bans.length) {
      return;
    }
    withState((draft) => {
      draft.bannedUserIds = Array.from(new Set(bans.map((id) => id.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      );
      return draft;
    });
  } catch (error) {
    logDbWarning("panel ban hydration failed", error);
  }
}

type StarsTransactionSnapshot = {
  transactionId?: string;
  groupId: string;
  planId: string;
  amountDelta: number;
  expiresAt: string;
  gifted: boolean;
};

async function recordStarsPurchaseTransaction(snapshot: StarsTransactionSnapshot): Promise<void> {
  if (!databaseAvailable || !ownerTelegramId) {
    return;
  }
  try {
    const { completeStarTransaction, createPendingStarTransaction } = await import("../server/db/mutateRepository.js");

    let transactionId = snapshot.transactionId;
    if (!transactionId) {
      const pending = await createPendingStarTransaction({
        ownerTelegramId,
        groupChatId: snapshot.groupId,
        planId: snapshot.planId,
        gifted: snapshot.gifted,
        metadata: {
          source: "bot-state",
        },
      });
      transactionId = pending.transactionId;
    }

    await completeStarTransaction({
      transactionId,
      amountDelta: snapshot.amountDelta,
      planId: snapshot.planId,
      expiresAt: snapshot.expiresAt,
      gifted: snapshot.gifted,
    });
  } catch (error) {
    logDbWarning("stars purchase sync failed", error);
  }
}

if (databaseAvailable) {
  void hydratePanelAdminsFromDb();
  void hydratePromoSlidesFromDb();
  void hydratePanelBansFromDb();
}

function persistState(next: BotState): void {
  ensureDataDir();
  state = next;
  writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
}

function withState(mutator: (draft: BotState) => BotState): BotState {
  const draft = mutator(structuredClone(state));
  persistState(draft);
  return draft;
}

export function getState(): BotState {
  return structuredClone(state);
}

export function isPanelAdmin(userId: string): boolean {
  return state.panelAdmins.includes(userId);
}

export function addPanelAdmin(userId: string): BotState {
  const trimmed = userId.trim();
  if (!trimmed) {
    return state;
  }
  return withState((draft) => {
    if (!draft.panelAdmins.includes(trimmed)) {
      draft.panelAdmins.push(trimmed);
      draft.panelAdmins.sort((a, b) => a.localeCompare(b));
      void promotePanelAdminRecord(trimmed);
    }
    return draft;
  });
}

export function removePanelAdmin(userId: string): BotState {
  const trimmed = userId.trim();
  if (!trimmed) {
    return state;
  }
  return withState((draft) => {
    draft.panelAdmins = draft.panelAdmins.filter((id) => id !== trimmed);
    void demotePanelAdminRecord(trimmed);
    return draft;
  });
}

export function listPanelAdmins(): string[] {
  return [...state.panelAdmins];
}

export function addBannedUser(userId: string): BotState {
  const trimmed = userId.trim();
  if (!trimmed) {
    return state;
  }
  return withState((draft) => {
    if (!draft.bannedUserIds.includes(trimmed)) {
      draft.bannedUserIds.push(trimmed);
      draft.bannedUserIds.sort((a, b) => a.localeCompare(b));
      if (databaseAvailable) {
        void (async () => {
          try {
            const { addPanelBan } = await import("../server/db/mutateRepository.js");
            await addPanelBan(trimmed);
          } catch (error) {
            logDbWarning("panel ban persist failed", error);
          }
        })();
      }
    }
    return draft;
  });
}

export function removeBannedUser(userId: string): BotState {
  const trimmed = userId.trim();
  if (!trimmed) {
    return state;
  }
  return withState((draft) => {
    draft.bannedUserIds = draft.bannedUserIds.filter((id) => id !== trimmed);
    if (databaseAvailable) {
      void (async () => {
        try {
          const { removePanelBan } = await import("../server/db/mutateRepository.js");
          await removePanelBan(trimmed);
        } catch (error) {
          logDbWarning("panel ban removal failed", error);
        }
      })();
    }
    return draft;
  });
}

export function listBannedUsers(): string[] {
  return [...state.bannedUserIds];
}

type UpsertGroupInput = {
  chatId: string;
  title?: string;
  creditDelta?: number;
  note?: string;
  membersCount?: number;
  inviteLink?: string | null;
  photoUrl?: string | null;
  managed?: boolean;
};

function upsertGroupInDraft(draft: BotState, record: UpsertGroupInput): GroupRecord {
  const id = record.chatId.trim();
  if (!id) {
    throw new Error("chatId is required");
  }

  const now = new Date().toISOString();
  const existing = draft.groups[id];
  if (existing) {
    const nextCredit =
      typeof record.creditDelta === "number"
        ? Math.max(0, existing.creditBalance + record.creditDelta)
        : existing.creditBalance;

    const updated: GroupRecord = {
      ...existing,
      title: record.title?.trim() || existing.title,
      creditBalance: nextCredit,
      updatedAt: now,
      lastAdjustmentNote: record.note ?? existing.lastAdjustmentNote,
      membersCount:
        typeof record.membersCount === "number" && Number.isFinite(record.membersCount)
          ? Math.max(0, record.membersCount)
          : existing.membersCount,
      inviteLink:
        record.inviteLink === undefined
          ? existing.inviteLink
          : record.inviteLink && record.inviteLink.trim().length > 0
            ? record.inviteLink.trim()
            : null,
      photoUrl:
        record.photoUrl === undefined
          ? existing.photoUrl
          : record.photoUrl && record.photoUrl.trim().length > 0
            ? record.photoUrl.trim()
            : null,
      managed: record.managed === undefined ? existing.managed : record.managed,
    };
    draft.groups[id] = updated;
    return updated;
  }

  const title = record.title?.trim() || `Group ${id}`;
  const creditBalance = Math.max(0, record.creditDelta ?? 0);
  const created: GroupRecord = {
    chatId: id,
    title,
    creditBalance,
    createdAt: now,
    updatedAt: now,
    lastAdjustmentNote: record.note ?? null,
    membersCount:
      typeof record.membersCount === "number" && Number.isFinite(record.membersCount)
        ? Math.max(0, record.membersCount)
        : 0,
    inviteLink:
      record.inviteLink && record.inviteLink.trim().length > 0 ? record.inviteLink.trim() : null,
    photoUrl:
      record.photoUrl && record.photoUrl.trim().length > 0 ? record.photoUrl.trim() : null,
    managed: record.managed !== false,
  };
  draft.groups[id] = created;
  return created;
}

export function upsertGroup(record: {
  chatId: string;
  title?: string;
  creditDelta?: number;
  note?: string;
  membersCount?: number;
  inviteLink?: string | null;
  photoUrl?: string | null;
  managed?: boolean;
}): GroupRecord {
  const id = record.chatId.trim();
  if (!id) {
    throw new Error("chatId is required");
  }
  let result: GroupRecord | null = null;
  state = withState((draft) => {
    result = upsertGroupInDraft(draft, record);
    return draft;
  });
  if (!result) {
    throw new Error("Unable to upsert group");
  }
  void syncGroupRecord(result);
  return result;
}

export function listGroups(): GroupRecord[] {
  return Object.values(state.groups).sort((a, b) => a.chatId.localeCompare(b.chatId));
}

export function setPanelSettings(partial: Partial<PanelSettings>): PanelSettings {
  state = withState((draft) => {
    draft.settings = {
      ...draft.settings,
      ...partial,
    };
    return draft;
  });
  return state.settings;
}

export function getPanelSettings(): PanelSettings {
  return structuredClone(state.settings);
}

export function setWelcomeMessages(messages: string[]): PanelSettings {
  state = withState((draft) => {
    draft.settings.welcomeMessages = messages;
    return draft;
  });
  return state.settings;
}

export function setButtonLabels(labels: Record<string, string>): PanelSettings {
  state = withState((draft) => {
    draft.settings.buttonLabels = labels;
    return draft;
  });
  return state.settings;
}

export function getPromoSlides(): PromoSlideRecord[] {
  return [...state.promoSlides];
}

export function addPromoSlide(entry: PromoSlideRecord): PromoSlideRecord[] {
  state = withState((draft) => {
    draft.promoSlides = [...draft.promoSlides.filter((slide) => slide.id !== entry.id), entry].sort((a, b) =>
      a.id.localeCompare(b.id)
    );
    return draft;
  });
  if (databaseAvailable) {
    void (async () => {
      try {
        const { upsertPromoSlide } = await import("../server/db/mutateRepository.js");
        await upsertPromoSlide({
          id: entry.id,
          fileId: entry.fileId,
          link: entry.link,
          width: entry.width,
          height: entry.height,
        });
      } catch (error) {
        logDbWarning("promo slide upsert failed", error);
      }
    })();
  }
  return state.promoSlides;
}

export function removePromoSlide(id: string): PromoSlideRecord[] {
  state = withState((draft) => {
    draft.promoSlides = draft.promoSlides.filter((slide) => slide.id !== id);
    return draft;
  });
  if (databaseAvailable) {
    void (async () => {
      try {
        const { deletePromoSlide } = await import("../server/db/mutateRepository.js");
        await deletePromoSlide(id);
      } catch (error) {
        logDbWarning("promo slide deletion failed", error);
      }
    })();
  }
  return state.promoSlides;
}

export function recordBroadcast(message: string): BroadcastRecord {
  let broadcast: BroadcastRecord = {
    id: `broadcast-${Date.now()}`,
    message,
    createdAt: new Date().toISOString(),
  };
  state = withState((draft) => {
    draft.broadcasts.unshift(broadcast);
    draft.broadcasts = draft.broadcasts.slice(0, 50);
    return draft;
  });
  return broadcast;
}

export function listBroadcasts(): BroadcastRecord[] {
  return [...state.broadcasts];
}

const DAY_MS = 86_400_000;

function resolveStarsPlan(draft: BotState, planId: string): StarsPlanRecord {
  const plan = draft.stars.plans.find((item) => item.id === planId);
  if (!plan) {
    throw new Error(`Stars plan ${planId} not found`);
  }
  return plan;
}

export function getStarsState(): StarsState {
  return structuredClone(state.stars);
}

export type StarsPurchaseInput = {
  groupId: string;
  planId: string;
  gifted: boolean;
  transactionId?: string;
  metadata?: {
    title?: string;
    membersCount?: number;
    inviteLink?: string | null;
    photoUrl?: string | null;
    managed?: boolean;
  };
};

export type StarsPurchaseInternalResult = {
  group: GroupRecord;
  plan: StarsPlanRecord;
  expiresAt: string;
  daysAdded: number;
  newBalance: number;
  gifted: boolean;
};

export function applyStarsPurchase(input: StarsPurchaseInput): StarsPurchaseInternalResult {
  let outcome: StarsPurchaseInternalResult | null = null;
  state = withState((draft) => {
    const plan = resolveStarsPlan(draft, input.planId);
    if (draft.stars.balance < plan.price) {
      throw new Error("Insufficient Stars balance");
    }

    const metadata = input.metadata ?? {};
    const managedFlag =
      metadata.managed !== undefined ? metadata.managed : !input.gifted;

    const group = upsertGroupInDraft(draft, {
      chatId: input.groupId,
      title: metadata.title,
      membersCount: metadata.membersCount,
      inviteLink: metadata.inviteLink,
      photoUrl: metadata.photoUrl,
      managed: managedFlag,
    });

    const nowMs = Date.now();
    const existing = draft.stars.groups[input.groupId];
    const baseMs = existing ? Math.max(new Date(existing.expiresAt).getTime(), nowMs) : nowMs;
    const expiresAt = new Date(baseMs + plan.days * DAY_MS).toISOString();

    draft.stars.groups[input.groupId] = {
      groupId: input.groupId,
      expiresAt,
      gifted: input.gifted,
    };
    draft.stars.balance = Math.max(0, draft.stars.balance - plan.price);

    outcome = {
      group,
      plan,
      expiresAt,
      daysAdded: plan.days,
      newBalance: draft.stars.balance,
      gifted: input.gifted,
    };
    return draft;
  });

  if (!outcome) {
    throw new Error("Failed to apply Stars purchase");
  }
  void recordStarsPurchaseTransaction({
    transactionId: input.transactionId,
    groupId: outcome.group.chatId,
    planId: outcome.plan.id,
    amountDelta: -outcome.plan.price,
    expiresAt: outcome.expiresAt,
    gifted: input.gifted,
  });
  return outcome;
}

export function setStarsBalance(balance: number): StarsState {
  if (!Number.isFinite(balance) || balance < 0) {
    throw new Error("Stars balance must be a non-negative number");
  }
  state = withState((draft) => {
    draft.stars.balance = Math.floor(balance);
    return draft;
  });
  return state.stars;
}

export function adjustStarsBalance(delta: number): StarsState {
  if (!Number.isFinite(delta)) {
    throw new Error("Stars balance delta must be a finite number");
  }
  state = withState((draft) => {
    const next = Math.floor(draft.stars.balance + delta);
    draft.stars.balance = Math.max(0, next);
    return draft;
  });
  return state.stars;
}

