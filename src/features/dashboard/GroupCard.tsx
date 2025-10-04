import { Avatar, Button, Card, Text, Title } from "@telegram-apps/telegram-ui";

import { classNames } from "@/css/classnames.ts";
import { formatDaysLeft, formatMembersCount, toPersianDigits } from "@/utils/format.ts";

import type { ManagedGroup } from "./types.ts";

import styles from "./GroupCard.module.css";

type GroupCardProps = {
  group: ManagedGroup;
  onOpenSettings?: (group: ManagedGroup) => void;
  onRenew?: (group: ManagedGroup) => void;
};

function initialsFromTitle(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return "?";
  }
  const [first, second] = words;
  if (!second) {
    return words[0].charAt(0).toUpperCase();
  }
  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
}

export function GroupCard({ group, onOpenSettings, onRenew }: GroupCardProps) {
  const { status } = group;

  let statusLabel: string;
  let statusClassName = styles.statusNeutral;
  let showRenew = false;
  let removalHint: string | undefined;

  if (status.kind === "active") {
    statusLabel = "\u0627\u0639\u062A\u0628\u0627\u0631: " + formatDaysLeft(status.daysLeft);
    statusClassName = styles.statusPositive;
  } else if (status.kind === "expired") {
    statusLabel = "\u274C \u0627\u0639\u062A\u0628\u0627\u0631 \u062A\u0645\u0627\u0645 \u0634\u062F\u0647";
    statusClassName = styles.statusNegative;
    showRenew = true;
  } else {
    const remainingDays = Math.max(
      0,
      Math.ceil((new Date(status.graceEndsAt).getTime() - Date.now()) / 86_400_000)
    );
    statusLabel = "\u0627\u06CC\u0646 \u06AF\u0631\u0648\u0647 \u062F\u06CC\u06AF\u0631 \u062A\u062D\u062A \u0645\u062F\u06CC\u0631\u06CC\u062A \u0634\u0645\u0627 \u0646\u06CC\u0633\u062A \u06CC\u0627 \u0631\u0628\u0627\u062A \u0627\u0632 \u0622\u0646 \u0627\u062E\u0631\u0627\u062C \u0634\u062F\u0647 \u0627\u0633\u062A!";
    statusClassName = styles.statusRemoved;
    removalHint =
      "\u062A\u0627 " +
      toPersianDigits(remainingDays) +
      " \u0631\u0648\u0632 \u0628\u0631\u0627\u06CC \u0628\u0627\u0632\u06AF\u0631\u062F\u0627\u0646\u062F\u0646 \u0631\u0628\u0627\u062A \u0641\u0631\u0635\u062A \u062F\u0627\u0631\u06CC.";
  }

  const disabled = status.kind === "removed" || !group.canManage;

  return (
    <Card
      className={classNames(
        styles.card,
        status.kind === "removed" && styles.cardRemoved,
        status.kind === "expired" && styles.cardExpired
      )}
      type="plain"
    >
      <div className={styles.content} dir="rtl">
        <div className={styles.topRow}>
          <Avatar
            size={48}
            src={group.photoUrl ?? undefined}
            acronym={group.photoUrl ? undefined : initialsFromTitle(group.title)}
            alt={group.title}
          />
          <div className={styles.details}>
            <Title level="3" className={styles.title}>
              {group.title}
            </Title>
            <Text className={styles.meta} weight="2">
              {formatMembersCount(group.membersCount)}
            </Text>
          </div>
        </div>
        <div className={styles.statusRow}>
          <Text className={classNames(styles.status, statusClassName)} weight="2">
            {statusLabel}
          </Text>
          {showRenew && onRenew && (
            <Button
              size="s"
              mode="filled"
              className={styles.renewButton}
              onClick={() => onRenew(group)}
            >
              {"\u062A\u0645\u062F\u06CC\u062F \u0627\u0634\u062A\u0631\u0627\u06A9"}
            </Button>
          )}
        </div>
        <Button
          size="m"
          mode="outline"
          stretched
          className={styles.manageButton}
          onClick={() => onOpenSettings?.(group)}
          disabled={disabled}
        >
          {"\u2699\uFE0F \u062A\u063A\u06CC\u06CC\u0631 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A"}
        </Button>
        {removalHint && (
          <Text className={styles.removalHint} weight="2">
            {removalHint}
          </Text>
        )}
      </div>
    </Card>
  );
}

