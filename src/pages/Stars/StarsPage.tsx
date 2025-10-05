import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Button, Input, Placeholder, Snackbar, Text, Title } from "@telegram-apps/telegram-ui";

import { Page } from "@/components/Page.tsx";
import { classNames } from "@/css/classnames.ts";
import {
  fetchStarsOverview,
  giftStarsToGroup,
  purchaseStarsForGroup,
  searchGroupsForStars,
} from "@/features/dashboard/api.ts";
import type {
  GroupStarsStatus,
  ManagedGroup,
  StarsPlan,
  StarsOverview,
  StarsStatus,
} from "@/features/dashboard/types.ts";
import { useOwnerProfile } from "@/features/dashboard/useOwnerProfile.ts";
import { formatNumber, toPersianDigits } from "@/utils/format.ts";

import styles from "./StarsPage.module.css";

type LocationState = {
  focusGroupId?: string;
};

const TEXT = {
  badges: {
    active: "Active",
    expiring: "Expiring soon",
    expired: "Expired",
  } satisfies Record<GroupStarsStatus["status"], string>,
  load: {
    header: "Loading",
    description: "Please wait a moment.",
  },
  error: {
    header: "Failed to fetch stars information",
    action: "Retry",
  },
  overview: {
    title: "Managed groups",
    hint: "Tap a card to manage stars for that group",
    empty: "No groups are connected yet.",
    manageButton: "Select / manage",
  },
  plans: {
    title: "Renewal plans",
  },
  purchase: {
    title: "Purchase summary",
    groupLabel: "Selected group",
    planLabel: "Selected duration",
    priceLabel: "Cost",
    balanceLabel: "Your stars balance",
    notSelected: "Not selected",
    insufficient: "Balance is not sufficient.",
    button: "Pay with stars",
    processing: "Processing...",
    refresh: "Refresh data",
  },
  gift: {
    title: "Gift stars to another group",
    placeholder: "Search by group or ID",
    searching: "Searching...",
    noResults: "No matching groups found.",
    select: "Select",
    button: "Gift stars",
    processing: "Sending...",
    insufficient: "Balance is not sufficient for this gift.",
  },
  success: {
    purchase: (groupTitle: string, days: number) =>
      `${groupTitle} extended for ${toPersianDigits(days)} day(s).`,
    gift: (groupTitle: string, days: number) =>
      `Sent ${toPersianDigits(days)} day(s) of stars to ${groupTitle}.`,
    purchaseSnackbar: "Payment completed successfully.",
    giftSnackbar: "Gift sent successfully.",
    fallbackUser: "Unnamed",
  },
};

const BADGE_CLASSES: Record<GroupStarsStatus["status"], string> = {
  active: styles.badgeActive,
  expiring: styles.badgeExpiring,
  expired: styles.badgeExpired,
};

function formatDaysRemaining(days: number): string {
  if (days <= 0) {
    return "No balance";
  }
  return `${toPersianDigits(days)} days remaining`;
}

function planDaysLabel(plan: StarsPlan): string {
  return `${toPersianDigits(plan.days)} days`;
}

function planPriceLabel(plan: StarsPlan): string {
  return `${formatNumber(plan.price)} stars`;
}

function resolveStarsStatus(days: number): StarsStatus {
  if (days <= 0) {
    return "expired";
  }
  if (days <= 5) {
    return "expiring";
  }
  return "active";
}

export function StarsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = (location.state ?? {}) as LocationState;
  const focusGroupId = locationState.focusGroupId;
  const { username } = useOwnerProfile();

  const [overview, setOverview] = useState<StarsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(focusGroupId ?? null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const [giftQuery, setGiftQuery] = useState("");
  const [giftResults, setGiftResults] = useState<ManagedGroup[]>([]);
  const [giftSelectedGroup, setGiftSelectedGroup] = useState<ManagedGroup | null>(null);
  const [giftPlanId, setGiftPlanId] = useState<string | null>(null);
  const [giftLoading, setGiftLoading] = useState(false);
  const [giftProcessing, setGiftProcessing] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStarsOverview();
      setOverview(data);
      setSuccessMessage("");
      setGiftMessage("");
    } catch (err) {
      const normalized = err instanceof Error ? err : new Error(String(err));
      setError(normalized);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (!overview) {
      return;
    }
    if (!selectedPlanId && overview.plans.length > 0) {
      setSelectedPlanId(overview.plans[0].id);
    }
  }, [overview, selectedPlanId]);

  useEffect(() => {
    if (!overview) {
      return;
    }
    if (!giftPlanId && overview.plans.length > 0) {
      setGiftPlanId(overview.plans[0].id);
    }
  }, [overview, giftPlanId]);

  useEffect(() => {
    if (!overview) {
      return;
    }
    if (overview.groups.length === 0) {
      setSelectedGroupId(null);
      return;
    }
    setSelectedGroupId((current) => {
      if (current && overview.groups.some((item) => item.group.id === current)) {
        return current;
      }
      if (focusGroupId && overview.groups.some((item) => item.group.id === focusGroupId)) {
        return focusGroupId;
      }
      return overview.groups[0].group.id;
    });
  }, [overview, focusGroupId]);

  useEffect(() => {
    if (!giftQuery.trim()) {
      setGiftResults([]);
      setGiftLoading(false);
      return;
    }
    setGiftLoading(true);
    let cancelled = false;
    const handle = setTimeout(() => {
      searchGroupsForStars(giftQuery)
        .then((results) => {
          if (!cancelled) {
            setGiftResults(results);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            const message = err instanceof Error ? err.message : String(err);
            setSnackbar(message);
            setGiftResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setGiftLoading(false);
          }
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [giftQuery]);

  const selectedGroup = useMemo(
    () => overview?.groups.find((item) => item.group.id === selectedGroupId) ?? null,
    [overview, selectedGroupId],
  );
  const selectedPlan = useMemo(
    () => overview?.plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [overview, selectedPlanId],
  );
  const giftPlan = useMemo(
    () => overview?.plans.find((plan) => plan.id === giftPlanId) ?? null,
    [overview, giftPlanId],
  );
  const balance = overview?.balance ?? 0;

  const insufficientBalance = useMemo(() => {
    if (!overview || !selectedPlan) {
      return false;
    }
    return overview.balance < selectedPlan.price;
  }, [overview, selectedPlan]);

  const insufficientGiftBalance = useMemo(() => {
    if (!overview || !giftPlan) {
      return false;
    }
    return overview.balance < giftPlan.price;
  }, [overview, giftPlan]);

  const handleSelectGroup = useCallback((groupId: string) => {
    setSelectedGroupId(groupId);
    setSuccessMessage("");
  }, []);

  const handleSelectPlan = useCallback((planId: string) => {
    setSelectedPlanId(planId);
    setSuccessMessage("");
  }, []);

  const handlePurchase = useCallback(async () => {
    if (!overview || !selectedGroup || !selectedPlan) {
      return;
    }
    setProcessing(true);
    setSuccessMessage("");
    try {
      const result = await purchaseStarsForGroup(selectedGroup.group.id, selectedPlan.id);
      setOverview((prev) => {
        if (!prev) {
          return prev;
        }
        const balanceValue = Math.max(0, prev.balance + result.balanceDelta);
        const groups = prev.groups.map((item) => {
          if (item.group.id !== result.groupId) {
            return item;
          }
          const updatedDays = Math.max(0, item.daysLeft + result.daysAdded);
          const status = resolveStarsStatus(updatedDays);
          return { ...item, daysLeft: updatedDays, status, expiresAt: result.expiresAt };
        });
        return { ...prev, balance: balanceValue, groups };
      });
      setSuccessMessage(TEXT.success.purchase(selectedGroup.group.title, selectedPlan.days));
      setSnackbar(TEXT.success.purchaseSnackbar);
      const nickname = username ? `@${username}` : TEXT.success.fallbackUser;
      console.info(`[stars] DM to bot: ${nickname} extended ${selectedGroup.group.title} by ${selectedPlan.days} days.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSnackbar(message);
    } finally {
      setProcessing(false);
    }
  }, [overview, selectedGroup, selectedPlan, username]);

  const handleSelectGiftPlan = useCallback((planId: string) => {
    setGiftPlanId(planId);
    setGiftMessage("");
  }, []);

  const handleGift = useCallback(async () => {
    if (!overview || !giftSelectedGroup || !giftPlan) {
      return;
    }
    setGiftProcessing(true);
    setGiftMessage("");
    try {
      const result = await giftStarsToGroup(giftSelectedGroup.id, giftPlan.id);
      setOverview((prev) => {
        if (!prev) {
          return prev;
        }
        const balanceValue = Math.max(0, prev.balance + result.balanceDelta);
        const groups = prev.groups.map((item) => {
          if (item.group.id !== result.groupId) {
            return item;
          }
          const updatedDays = Math.max(0, item.daysLeft + result.daysAdded);
          const status = resolveStarsStatus(updatedDays);
          return { ...item, daysLeft: updatedDays, status, expiresAt: result.expiresAt };
        });
        return { ...prev, balance: balanceValue, groups };
      });
      setGiftMessage(TEXT.success.gift(giftSelectedGroup.title, giftPlan.days));
      setSnackbar(TEXT.success.giftSnackbar);
      const nickname = username ? `@${username}` : TEXT.success.fallbackUser;
      console.info(`[stars] DM to bot: ${nickname} gifted ${giftPlan.days} days to ${giftSelectedGroup.title}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setSnackbar(message);
    } finally {
      setGiftProcessing(false);
    }
  }, [overview, giftSelectedGroup, giftPlan, username]);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(null);
  }, []);

  if (loading) {
    return (
      <Page>
        <div className={styles.page} dir="ltr">
          <Placeholder header={TEXT.load.header} description={TEXT.load.description} />
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <div className={styles.page} dir="ltr">
          <Placeholder header={TEXT.error.header} description={error.message}>
            <Button mode="filled" onClick={loadOverview}>
              {TEXT.error.action}
            </Button>
          </Placeholder>
        </div>
      </Page>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <Page>
      <div className={styles.page} dir="ltr">
        <div className={styles.section}>
          <Button mode="plain" size="s" onClick={() => navigate(-1)}>??????</Button>
        </div>
        <section className={styles.section}>
          <div className={styles.actionsRow}>
            <Title level="3" className={styles.sectionTitle}>
              {TEXT.overview.title}
            </Title>
            <Text className={styles.scrollHint}>{TEXT.overview.hint}</Text>
          </div>
          <div className={styles.groupsList}>
            {overview.groups.length === 0 ? (
              <Text className={styles.secondaryText}>{TEXT.overview.empty}</Text>
            ) : (
              overview.groups.map((item) => {
                const active = item.group.id === selectedGroupId;
                return (
                  <div
                    key={item.group.id}
                    className={classNames(styles.groupCard, active && styles.groupCardActive)}
                    onClick={() => handleSelectGroup(item.group.id)}
                  >
                    <div className={styles.groupHeader}>
                      <Avatar
                        size={40}
                        src={item.group.photoUrl ?? undefined}
                        acronym={item.group.photoUrl ? undefined : item.group.title.charAt(0)}
                        alt={item.group.title}
                      />
                      <div className={styles.groupInfo}>
                        <Text weight="2">{item.group.title}</Text>
                        <Text className={styles.secondaryText}>
                          {toPersianDigits(item.group.membersCount)} members
                        </Text>
                      </div>
                    </div>
                    <div className={styles.groupActions}>
                      <span className={classNames(styles.badge, BADGE_CLASSES[item.status])}>
                        {TEXT.badges[item.status]}
                      </span>
                      <Text className={styles.secondaryText}>{formatDaysRemaining(item.daysLeft)}</Text>
                    </div>
                    <Button
                      mode="outline"
                      size="s"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelectGroup(item.group.id);
                      }}
                    >
                      {TEXT.overview.manageButton}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            {TEXT.plans.title}
          </Title>
          <div className={styles.planGrid}>
            {overview.plans.map((plan) => {
              const selected = plan.id === selectedPlanId;
              return (
                <div
                  key={plan.id}
                  className={classNames(styles.planCard, selected && styles.planCardSelected)}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  <Text weight="2" className={styles.planPrice}>
                    {planPriceLabel(plan)}
                  </Text>
                  <Text className={styles.planDays}>{planDaysLabel(plan)}</Text>
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            {TEXT.purchase.title}
          </Title>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{TEXT.purchase.groupLabel}</span>
              <span className={styles.summaryValue}>
                {selectedGroup ? selectedGroup.group.title : TEXT.purchase.notSelected}
              </span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{TEXT.purchase.planLabel}</span>
              <span className={styles.summaryValue}>
                {selectedPlan ? planDaysLabel(selectedPlan) : TEXT.purchase.notSelected}
              </span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{TEXT.purchase.priceLabel}</span>
              <span className={styles.summaryValue}>
                {selectedPlan ? planPriceLabel(selectedPlan) : "--"}
              </span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{TEXT.purchase.balanceLabel}</span>
              <span className={styles.summaryValue}>{formatNumber(balance)} stars</span>
              {insufficientBalance && (
                <Text className={styles.secondaryText}>{TEXT.purchase.insufficient}</Text>
              )}
            </div>
          </div>
          {successMessage && <Text>{successMessage}</Text>}
          <div className={styles.summaryActions}>
            <Button
              mode="filled"
              size="m"
              stretched
              disabled={processing || !selectedGroup || !selectedPlan || insufficientBalance}
              onClick={handlePurchase}
            >
              {processing ? TEXT.purchase.processing : TEXT.purchase.button}
            </Button>
            <Button mode="plain" size="s" onClick={loadOverview} disabled={processing}>
              {TEXT.purchase.refresh}
            </Button>
          </div>
        </section>

        <section className={styles.section}>
          <Title level="3" className={styles.sectionTitle}>
            {TEXT.gift.title}
          </Title>
          <div className={styles.giftSearch}>
            <Input
              value={giftQuery}
              onChange={(event) => setGiftQuery(event.target.value)}
              placeholder={TEXT.gift.placeholder}
              dir="ltr"
            />
            {giftLoading && <Text className={styles.secondaryText}>{TEXT.gift.searching}</Text>}
            {!giftLoading && giftQuery && giftResults.length === 0 && (
              <Text className={styles.secondaryText}>{TEXT.gift.noResults}</Text>
            )}
            <div className={styles.searchResults}>
              {giftResults.map((group) => {
                const selected = giftSelectedGroup?.id === group.id;
                return (
                  <div
                    key={group.id}
                    className={classNames(styles.searchResult, selected && styles.searchResultSelected)}
                    onClick={() => {
                      setGiftSelectedGroup(group);
                      setGiftMessage("");
                    }}
                  >
                    <div className={styles.groupInfo}>
                      <Text weight="2">{group.title}</Text>
                      <Text className={styles.secondaryText}>
                        {toPersianDigits(group.membersCount)} members
                      </Text>
                    </div>
                    <Button
                      mode="plain"
                      size="s"
                      onClick={(event) => {
                        event.stopPropagation();
                        setGiftSelectedGroup(group);
                        setGiftMessage("");
                      }}
                    >
                      {TEXT.gift.select}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={styles.planGrid}>
            {overview.plans.map((plan) => {
              const selected = plan.id === giftPlanId;
              return (
                <div
                  key={`gift-${plan.id}`}
                  className={classNames(styles.planCard, selected && styles.planCardSelected)}
                  onClick={() => handleSelectGiftPlan(plan.id)}
                >
                  <Text weight="2" className={styles.planPrice}>
                    {planPriceLabel(plan)}
                  </Text>
                  <Text className={styles.planDays}>{planDaysLabel(plan)}</Text>
                </div>
              );
            })}
          </div>
          {giftMessage && <Text>{giftMessage}</Text>}
          <div className={styles.actionsRow}>
            <Button
              mode="filled"
              size="m"
              stretched
              disabled={giftProcessing || !giftSelectedGroup || !giftPlan || insufficientGiftBalance}
              onClick={handleGift}
            >
              {giftProcessing ? TEXT.gift.processing : TEXT.gift.button}
            </Button>
            {insufficientGiftBalance && (
              <Text className={styles.secondaryText}>{TEXT.gift.insufficient}</Text>
            )}
          </div>
        </section>

        {snackbar && (
          <Snackbar onClose={handleCloseSnackbar} duration={3500}>
            {snackbar}
          </Snackbar>
        )}
      </div>
    </Page>
  );
}
