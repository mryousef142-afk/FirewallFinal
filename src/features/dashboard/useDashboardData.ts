import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchDashboardSnapshot } from "./api.ts";
import type { ManagedGroup } from "./types.ts";

const DAY_MS = 86_400_000;

type State = {
  groups: ManagedGroup[];
  loading: boolean;
  error: Error | null;
};

function normalizeGroups(groups: ManagedGroup[]): ManagedGroup[] {
  const now = Date.now();

  return groups
    .map((group) => {
      if (group.status.kind === "active") {
        const remaining = Math.max(
          0,
          Math.ceil((new Date(group.status.expiresAt).getTime() - now) / DAY_MS)
        );
        return {
          ...group,
          status: {
            ...group.status,
            daysLeft: remaining,
          },
        } as ManagedGroup;
      }
      if (group.status.kind === "removed") {
        if (new Date(group.status.graceEndsAt).getTime() < now) {
          return null;
        }
      }
      return group;
    })
    .filter((group): group is ManagedGroup => Boolean(group));
}

export function useDashboardData() {
  const [state, setState] = useState<State>({
    groups: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const snapshot = await fetchDashboardSnapshot();
      const normalized = normalizeGroups(snapshot.groups);
      setState({ groups: normalized, loading: false, error: null });
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      setState({ groups: [], loading: false, error: normalized });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(
    () => ({
      total: state.groups.length,
      active: state.groups.filter((group) => group.status.kind === "active").length,
      expired: state.groups.filter((group) => group.status.kind === "expired").length,
      removed: state.groups.filter((group) => group.status.kind === "removed").length,
    }),
    [state.groups]
  );

  return {
    ...state,
    summary,
    refresh: load,
  };
}

