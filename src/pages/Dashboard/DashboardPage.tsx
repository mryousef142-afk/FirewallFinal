import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Placeholder, Text, Button } from "@telegram-apps/telegram-ui";

import { Page } from "@/components/Page.tsx";
import { dashboardConfig } from "@/config/dashboard.ts";
import { classNames } from "@/css/classnames.ts";

import { EmptyState } from "@/features/dashboard/EmptyState.tsx";
import { GroupCard } from "@/features/dashboard/GroupCard.tsx";
import { GroupCardSkeleton } from "@/features/dashboard/GroupCardSkeleton.tsx";
import { useDashboardData } from "@/features/dashboard/useDashboardData.ts";
import { useOwnerProfile } from "@/features/dashboard/useOwnerProfile.ts";
import { ProfileHeader } from "@/features/dashboard/ProfileHeader.tsx";
import type { ManagedGroup } from "@/features/dashboard/types.ts";
import { formatNumber } from "@/utils/format.ts";

import styles from "./DashboardPage.module.css";

function normalize(text: string) {
  return text.toLowerCase();
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { displayName, username, avatarUrl } = useOwnerProfile();
  const { groups, loading, error, refresh, summary } = useDashboardData();
  const [query, setQuery] = useState("");

  const normalizedQuery = normalize(query.trim());

  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) {
      return groups;
    }
    return groups.filter((group) => normalize(group.title).includes(normalizedQuery));
  }, [groups, normalizedQuery]);

  const shouldShowSearch = groups.length > 10;
  const isEmpty = !loading && groups.length === 0;
  const noMatches = !loading && groups.length > 0 && filteredGroups.length === 0;

  const handleManage = (group: ManagedGroup) => {
    navigate(`/groups/${group.id}`, { state: { group } });
  };

  const handleRenew = (group: ManagedGroup) => {
    navigate("/stars", { state: { focusGroupId: group.id } });
  };

  return (
    <Page back={false}>
      <div className={styles.page} dir="ltr">
        <ProfileHeader displayName={displayName} username={username} avatarUrl={avatarUrl} />

        <section className={styles.summary}>
          <Text weight="2" className={styles.summaryItem}>
            Groups: {formatNumber(summary.total)}
          </Text>
          <Text weight="2" className={styles.summaryItemPositive}>
            Active: {formatNumber(summary.active)}
          </Text>
          <Text weight="2" className={styles.summaryItemWarning}>
            Expired: {formatNumber(summary.expired)}
          </Text>
          <Text weight="2" className={styles.summaryItemMuted}>
            Removed: {formatNumber(summary.removed)}
          </Text>
        </section>

        {shouldShowSearch && (
          <div className={styles.searchWrapper}>
            <Input
              className={styles.searchInput}
              placeholder="Search by group name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              dir="ltr"
            />
          </div>
        )}

        {error && (
          <Placeholder
            header="Failed to refresh"
            description={error.message}
          >
            <Button mode="filled" onClick={refresh}>
              Retry
            </Button>
          </Placeholder>
        )}

        {!error && (
          <div className={styles.contentArea}>
            {loading && (
              <div className={styles.list}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <GroupCardSkeleton key={index} />
                ))}
              </div>
            )}

            {!loading && isEmpty && (
              <EmptyState inviteUrl={dashboardConfig.inviteLink} />
            )}

            {!loading && noMatches && (
              <Placeholder
                header="No groups found"
                description="Try refining your search keywords."
              />
            )}

            {!loading && filteredGroups.length > 0 && (
              <div className={classNames(styles.list, styles.groupsList)}>
                {filteredGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onOpenSettings={handleManage}
                    onRenew={handleRenew}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}





