import type { StarsState, StarsPlanRecord, GroupRecord } from "../../bot/state.js";
import { getStarsState, listGroups } from "../../bot/state.js";
import { fetchGroupsFromDb, fetchOwnerWalletBalance } from "../db/stateRepository.js";

const databaseAvailable = Boolean(process.env.DATABASE_URL);

export type GroupStatusActive = {
  kind: "active";
  expiresAt: string;
  daysLeft: number;
};

export type GroupStatusExpired = {
  kind: "expired";
  expiredAt: string;
  graceEndsAt: string;
};

export type GroupStatusRemoved = {
  kind: "removed";
  removedAt: string;
  graceEndsAt: string;
};

export type GroupStatus = GroupStatusActive | GroupStatusExpired | GroupStatusRemoved;

export type ManagedGroup = {
  id: string;
  title: string;
  photoUrl?: string | null;
  membersCount: number;
  status: GroupStatus;
  canManage: boolean;
  inviteLink?: string | null;
};

export type StarsStatus = "active" | "expiring" | "expired";

export type GroupStarsStatus = {
  group: ManagedGroup;
  expiresAt: string;
  daysLeft: number;
  status: StarsStatus;
};

export type StarsOverview = {
  balance: number;
  plans: StarsPlanRecord[];
  groups: GroupStarsStatus[];
};

export async function loadGroupsSnapshot(): Promise<GroupRecord[]> {
  if (!databaseAvailable) {
    return listGroups();
  }
  try {
    const records = await fetchGroupsFromDb();
    if (records.length > 0) {
      return records;
    }
  } catch (error) {
    console.warn("[db] Failed to load groups from database, falling back to file store:", error);
  }
  return listGroups();
}

export async function resolveStarsBalance(ownerTelegramId: string | null): Promise<number> {
  const fallback = getStarsState().balance;
  if (!databaseAvailable || !ownerTelegramId) {
    return fallback;
  }
  try {
    const balance = await fetchOwnerWalletBalance(ownerTelegramId);
    if (typeof balance === "number") {
      return balance;
    }
  } catch (error) {
    console.warn("[db] Failed to load Stars balance from database, using fallback:", error);
  }
  return fallback;
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

function computeGroupStatus(record: GroupRecord): GroupStatus {
  if (record.creditBalance > 0) {
    const daysLeft = Math.ceil(record.creditBalance);
    const expiresAt = addDays(new Date(), daysLeft).toISOString();
    return {
      kind: "active",
      expiresAt,
      daysLeft,
    };
  }

  const expiredAt = record.updatedAt;
  const graceEndsAt = addDays(new Date(expiredAt), 10).toISOString();
  return {
    kind: "expired",
    expiredAt,
    graceEndsAt,
  };
}

export function buildManagedGroup(record: GroupRecord): ManagedGroup {
  return {
    id: record.chatId,
    title: record.title,
    photoUrl: record.photoUrl,
    membersCount: record.membersCount,
    status: computeGroupStatus(record),
    canManage: record.managed,
    inviteLink: record.inviteLink ?? undefined,
  };
}

function calculateDaysLeft(expiresAt: string): number {
  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) {
    return 0;
  }
  return Math.max(0, Math.ceil((expiresMs - Date.now()) / 86_400_000));
}

function determineStarsStatus(daysLeft: number): StarsStatus {
  if (daysLeft <= 0) {
    return "expired";
  }
  if (daysLeft <= 5) {
    return "expiring";
  }
  return "active";
}

export function buildGroupStarsStatus(
  record: GroupRecord,
  entry: StarsState["groups"][string] | undefined,
): GroupStarsStatus {
  const fallbackExpiry = addDays(new Date(record.updatedAt), Math.max(1, Math.ceil(record.creditBalance))).toISOString();
  const expiresAt = entry?.expiresAt ?? fallbackExpiry;
  const daysLeft = calculateDaysLeft(expiresAt);
  return {
    group: buildManagedGroup(record),
    expiresAt,
    daysLeft,
    status: determineStarsStatus(daysLeft),
  };
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export async function searchGroupRecords(query: string, limit = 20): Promise<ManagedGroup[]> {
  const normalizedQuery = normalizeText(query);
  const records = await loadGroupsSnapshot();

  const matches = records
    .filter((record) => {
      if (!normalizedQuery) {
        return true;
      }
      const id = normalizeText(record.chatId);
      const title = normalizeText(record.title);
      const invite = record.inviteLink ? normalizeText(record.inviteLink) : "";
      return id.includes(normalizedQuery) || title.includes(normalizedQuery) || invite.includes(normalizedQuery);
    })
    .map((record) => buildManagedGroup(record));

  if (matches.length === 0 && normalizedQuery) {
    return [
      {
        id: query.trim(),
        title: query.trim().startsWith("@") ? query.trim() : `Group ${query.trim()}`,
        membersCount: 0,
        photoUrl: null,
        status: {
          kind: "expired",
          expiredAt: new Date().toISOString(),
          graceEndsAt: addDays(new Date(), 10).toISOString(),
        },
        canManage: false,
        inviteLink: query.trim().startsWith("http") ? query.trim() : undefined,
      },
    ];
  }

  return matches.slice(0, limit);
}

export async function buildStarsOverview(ownerTelegramId: string | null): Promise<StarsOverview> {
  const stars = getStarsState();
  const balance = await resolveStarsBalance(ownerTelegramId);
  const managedGroups = (await loadGroupsSnapshot()).filter((group) => group.managed);
  const groups = managedGroups
    .map((group) => buildGroupStarsStatus(group, stars.groups[group.chatId]))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    balance,
    plans: stars.plans,
    groups,
  };
}
