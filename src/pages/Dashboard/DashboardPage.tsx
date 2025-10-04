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
import { toPersianDigits } from "@/utils/format.ts";

import styles from "./DashboardPage.module.css";

function normalize(text: string) {
  return text.toLocaleLowerCase("fa-IR");
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
      <div className={styles.page} dir="rtl">
        <ProfileHeader displayName={displayName} username={username} avatarUrl={avatarUrl} />

        <section className={styles.summary}>
          <Text weight="2" className={styles.summaryItem}>
            {"\u06AF\u0631\u0648\u0647 \u0647\u0627: "}
            {toPersianDigits(summary.total)}
          </Text>
          <Text weight="2" className={styles.summaryItemPositive}>
            {"\u0641\u0639\u0627\u0644: "}
            {toPersianDigits(summary.active)}
          </Text>
          <Text weight="2" className={styles.summaryItemWarning}>
            {"\u0645\u0646\u062A\u0647\u06CC \u0634\u062F\u0647: "}
            {toPersianDigits(summary.expired)}
          </Text>
          <Text weight="2" className={styles.summaryItemMuted}>
            {"\u062E\u0627\u0631\u062C: "}
            {toPersianDigits(summary.removed)}
          </Text>
        </section>

        {shouldShowSearch && (
          <div className={styles.searchWrapper}>
            <Input
              className={styles.searchInput}
              placeholder="\u062C\u0633\u062A\u062C\u0648 \u062F\u0631 \u0646\u0627\u0645 \u06AF\u0631\u0648\u0647"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              dir="rtl"
            />
          </div>
        )}

        {error && (
          <Placeholder
            header="\u062E\u0637\u0627 \u062F\u0631 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC"
            description={error.message}
          >
            <Button mode="filled" onClick={refresh}>
              {"\u0628\u0627\u0632\u06AF\u0631\u062F\u0627\u0646\u06CC"}
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
                header="\u06AF\u0631\u0648\u0647\u06CC \u06CC\u0627\u0641\u062A \u0646\u0634\u062F"
                description="\u0644\u0637\u0641\u0627 \u0646\u0648\u0634\u062A\u0627\u0631 \u062C\u0633\u062A\u062C\u0648 \u0631\u0627 \u062A\u063A\u06CC\u0631 \u062F\u0647\u06CC\u062F."
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





