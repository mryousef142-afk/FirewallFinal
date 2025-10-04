import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  IconButton,
  Input,
  Placeholder,
  Snackbar,
  Text,
  Textarea,
  Title,
} from "@telegram-apps/telegram-ui";

import { GroupMenuDrawer } from "@/features/dashboard/GroupMenuDrawer.tsx";
import {
  fetchGroupDetails,
  fetchGroupMandatoryMembershipSettings,
  updateGroupMandatoryMembershipSettings,
} from "@/features/dashboard/api.ts";
import type { ManagedGroup, MandatoryMembershipSettings } from "@/features/dashboard/types.ts";
import { classNames } from "@/css/classnames.ts";

import styles from "./GroupMandatoryMembershipPage.module.css";

type LocationState = {
  group?: ManagedGroup;
};

const TEXT = {
  pageSubtitle: "Ø¹Ø¶ÙˆÛŒØªâ€ŒÙ‡Ø§ÛŒ Ø§Ø¬Ø¨Ø§Ø±ÛŒ",
  loading: "Ø¯Ø± Ø­Ø§Ù„ Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ ØªÙ†Ø¸ÛŒÙ…Ø§Øª...",
  errorHeader: "Ø®Ø·Ø§ Ø¯Ø± Ø¯Ø±ÛŒØ§ÙØª Ø§Ø·Ù„Ø§Ø¹Ø§Øª",
  back: "Ø¨Ø§Ø²Ú¯Ø´Øª",
  unavailableHeader: "ØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø¯Ø± Ø¯Ø³ØªØ±Ø³ Ù†ÛŒØ³Øª",
  notice:
    "Ø¨Ø±Ø§ÛŒ Ø±Ø´Ø¯ Ú¯Ø±ÙˆÙ‡ Ùˆ Ú©Ø§Ù†Ø§Ù„â€ŒÙ‡Ø§ÛŒ Ù…Ø±ØªØ¨Ø· Ù…ÛŒâ€ŒØªÙˆØ§Ù†ÛŒØ¯ Ø´Ø±Ø· Ø¯Ø¹ÙˆØª Ø§Ø¹Ø¶Ø§ ÛŒØ§ Ø¹Ø¶ÙˆÛŒØª Ø¯Ø± Ú©Ø§Ù†Ø§Ù„â€ŒÙ‡Ø§ Ø±Ø§ ÙØ¹Ø§Ù„ Ú©Ù†ÛŒØ¯. Ø¨Ø§ ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† Ù‡Ø± Ù‚Ø§Ù†ÙˆÙ†ØŒ Ø§Ø¹Ø¶Ø§ ØªØ§ ØªÚ©Ù…ÛŒÙ„ Ø´Ø±Ø· Ø§Ø¬Ø§Ø²Ù‡ Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù… Ù†Ø¯Ø§Ø±Ù†Ø¯.",
  forcedTitle: "Ø§Ø¯ Ø§Ø¬Ø¨Ø§Ø±ÛŒ",
  forcedHint: "???? ?????? ??? ?? ????? ???? ????? ????? ????? ?? ?? ???? ???? ????.",
  forcedTooltip: "Ø§Ú¯Ø± Ù…Ù‚Ø¯Ø§Ø± ØµÙØ± Ø¨Ø§Ø´Ø¯ØŒ Ø´Ø±Ø· Ø¯Ø¹ÙˆØª ØºÛŒØ±ÙØ¹Ø§Ù„ Ù…ÛŒâ€ŒØ´ÙˆØ¯.",
  forcedLabel: "ØªØ¹Ø¯Ø§Ø¯ Ø¯Ø¹ÙˆØª Ø§Ø¬Ø¨Ø§Ø±ÛŒ",
  resetTitle: "Ø¨Ø§Ø²Ù‡ Ø²Ù…Ø§Ù†ÛŒ Ø§Ø¯ Ø§Ø¬Ø¨Ø§Ø±ÛŒ (Ø±ÙˆØ²)",
  resetHint: "Ù¾Ø³ Ø§Ø² Ø§ØªÙ…Ø§Ù… Ø§ÛŒÙ† Ø¨Ø§Ø²Ù‡ Ø¯Ø¹ÙˆØªâ€ŒÙ‡Ø§ÛŒ Ù‡Ø± Ø¹Ø¶Ùˆ Ø±ÛŒØ³Øª Ù…ÛŒâ€ŒØ´ÙˆØ¯. Ù…Ù‚Ø¯Ø§Ø± ØµÙØ± ÛŒØ¹Ù†ÛŒ Ø¨Ø¯ÙˆÙ† Ø¨Ø§Ø²Ù‡.",
  resetTooltip: "?? ???? ??????? ???? ?? ??????? ??? ???? ?????? ????? ??????.",
  resetLabel: "ØªØ¹Ø¯Ø§Ø¯ Ø±ÙˆØ²",
  channelsTitle: "Ø¹Ø¶ÙˆÛŒØª Ø§Ø¬Ø¨Ø§Ø±ÛŒ Ø¯Ø± Ú©Ø§Ù†Ø§Ù„",
  channelsHint: "Ú©Ø§Ø±Ø¨Ø±Ø§Ù† Ø¨Ø§ÛŒØ¯ Ø¯Ø± Ú©Ø§Ù†Ø§Ù„â€ŒÙ‡Ø§ÛŒ Ù…Ø´Ø®Øµ Ø¹Ø¶Ùˆ Ø´ÙˆÙ†Ø¯ ØªØ§ Ø¨ØªÙˆØ§Ù†Ù†Ø¯ Ù¾ÛŒØ§Ù… Ø¨Ø¯Ù‡Ù†Ø¯.",
  channelsTooltip: "Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ú©Ø§Ù†Ø§Ù„ Ø¨Ø§ÛŒØ¯ Ø¨Ø§ @ Ø´Ø±ÙˆØ¹ Ø´ÙˆØ¯ Ùˆ Bot Ø­ØªÙ…Ø§Ù‹ Ø¨Ø§ÛŒØ¯ Admin Ø¨Ø§Ø´Ø¯.",
  channelsPlaceholder: "@channel_one\n@channel_two",
  channelsSummary: (channels: string[]) =>
    channels.length > 0
      ? `????? ?? ????????? ${channels.join(", ")} ?????? ???.`
      : "????? ?????? ?? ????? ??????? ???.",
  forcedSummary: (count: number, reset: number) => {
    if (count <= 0) {
      return "??? ???? ???? ????.";
    }
    if (reset <= 0) {
      return `?? ??? ???? ${count} ??? ?? ???? ???.`;
    }
    return `?? ??? ???? ${count} ??? ?? ???? ??? (???? ?? ${reset} ???).`;
  },
  resetSummary: (count: number, reset: number) => {
    if (count <= 0) {
      return "?? ??????? ???? ?? ??????? ???? ????? ????? ???????.";
    }
    if (reset <= 0) {
      return "????? ???? ???? ??????? (??? ????? ???).";
    }
    return `????? ???? ?? ${reset} ??? ???? ??????.`;
  },
  channelsErrorPrefix: "????????? ???????:",
  save: "Ø°Ø®ÛŒØ±Ù‡ ØªÙ†Ø¸ÛŒÙ…Ø§Øª",
  saving: "Ø¯Ø± Ø­Ø§Ù„ Ø°Ø®ÛŒØ±Ù‡...",
  saveSuccess: "??????? ?? ?????? ????? ??.",
  saveErrorPrefix: "????? ??????? ?? ??? ????? ??: ",
};

const CHANNEL_REGEX = /^@[a-zA-Z0-9_]{5,}$/;

export function GroupMandatoryMembershipPage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [group, setGroup] = useState<ManagedGroup | null>(state.group ?? null);
  const [settings, setSettings] = useState<MandatoryMembershipSettings | null>(null);
  const [channelsInput, setChannelsInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!groupId) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [mandatory, detail] = await Promise.all([
          fetchGroupMandatoryMembershipSettings(groupId),
          fetchGroupDetails(groupId),
        ]);
        if (cancelled) {
          return;
        }
        setSettings(mandatory);
        setChannelsInput(mandatory.mandatoryChannels.join("\n"));
        setGroup(detail.group);
        setDirty(false);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const updateSettings = useCallback((patch: Partial<MandatoryMembershipSettings>) => {
    setSettings((prev) => {
      if (!prev) {
        return prev;
      }
      setDirty(true);
      return { ...prev, ...patch };
    });
  }, []);

  const handleForcedChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value.trim();
      const parsed = raw === "" ? 0 : Number(raw);
      const value = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
      updateSettings({ forcedInviteCount: value });
    },
    [updateSettings],
  );

  const handleResetChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value.trim();
      const parsed = raw === "" ? 0 : Number(raw);
      const value = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
      updateSettings({ forcedInviteResetDays: value });
    },
    [updateSettings],
  );

  const handleChannelsChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setChannelsInput(value);
      const channels = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      updateSettings({ mandatoryChannels: channels });
    },
    [updateSettings],
  );

  const handleMenuSelect = useCallback(
    (key: string) => {
      if (!groupId) {
        return;
      }
      switch (key) {
        case "home":
          navigate(`/groups/${groupId}`, { state: { group } });
          break;
        case "settings":
          navigate(`/groups/${groupId}/settings/general`, { state: { group } });
          break;
        case "bans":
          navigate(`/groups/${groupId}/settings/bans`, { state: { group } });
          break;
        case "limits":
          navigate(`/groups/${groupId}/settings/limits`, { state: { group } });
          break;
        case "mute":
          navigate(`/groups/${groupId}/settings/mute`, { state: { group } });
          break;
        case "texts":
          navigate(`/groups/${groupId}/settings/texts`, { state: { group } });
          break;
        case "giveaway":
          navigate("/giveaways/create", { state: { focusGroupId: groupId } });
          break;
        case "stars":
          navigate("/stars", { state: { focusGroupId: groupId } });
          break;
        case "analytics":
          navigate(`/groups/${groupId}/analytics`, { state: { group } });
          break;
        case "mandatory":
          break;
        default:
          console.info(`[mandatory-settings] menu item '${key}' tapped`);
      }
    },
    [groupId, group, navigate],
  );

  const handleToastClose = useCallback(() => {
    setToastMessage("");
  }, []);

  const handleSave = useCallback(async () => {
    if (!groupId || !settings) {
      return;
    }
    try {
      setSaving(true);
      const next = await updateGroupMandatoryMembershipSettings(groupId, settings);
      setSettings(next);
      setChannelsInput(next.mandatoryChannels.join("\n"));
      setDirty(false);
      setToastMessage(TEXT.saveSuccess);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setToastMessage(TEXT.saveErrorPrefix + message);
    } finally {
      setSaving(false);
    }
  }, [groupId, settings]);

  const invalidChannels = useMemo(() => {
    if (!settings) {
      return [] as string[];
    }
    return settings.mandatoryChannels.filter((channel) => !CHANNEL_REGEX.test(channel));
  }, [settings]);

  const hasErrors = invalidChannels.length > 0;

  if (loading && !settings) {
    return (
      <div className={styles.loadingState} dir="rtl">
        <Text weight="2">{TEXT.loading}</Text>
      </div>
    );
  }

  if (error) {
    return (
      <Placeholder header={TEXT.errorHeader} description={error.message}>
        <Button mode="filled" onClick={() => navigate(-1)}>
          {TEXT.back}
        </Button>
      </Placeholder>
    );
  }

  if (!settings) {
    return (
      <Placeholder header={TEXT.unavailableHeader}>
        <Button mode="filled" onClick={() => navigate(-1)}>
          {TEXT.back}
        </Button>
      </Placeholder>
    );
  }

  const canSave = dirty && !saving && !hasErrors;
  const forcedInviteCount = settings.forcedInviteCount;
  const forcedInviteResetDays = settings.forcedInviteResetDays;
  const mandatoryChannels = settings.mandatoryChannels;

  const forcedSummaryText = TEXT.forcedSummary(forcedInviteCount, forcedInviteResetDays);
  const resetSummaryText = TEXT.resetSummary(forcedInviteCount, forcedInviteResetDays);
  const channelsSummaryText = TEXT.channelsSummary(mandatoryChannels);

  return (
    <div className={styles.page} dir="rtl">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button mode="plain" size="s" onClick={() => navigate(-1)}>
            {TEXT.back}
          </Button>
        </div>
        <div className={styles.headerCenter}>
          <Avatar
            size={48}
            src={group?.photoUrl ?? undefined}
            acronym={group?.photoUrl ? undefined : group?.title?.charAt(0).toUpperCase() ?? "?"}
            alt={group?.title ?? "group"}
          />
          <div className={styles.headerTitles}>
            <Title level="3" className={styles.groupName}>
              {group ? group.title : "???? ????????"}
            </Title>
            <Text weight="2" className={styles.groupSubtitle}>
              {TEXT.pageSubtitle}
            </Text>
          </div>
        </div>
        <div className={styles.headerRight}>
          <IconButton aria-label="???? ????" onClick={() => setMenuOpen(true)}>
            <span className={styles.burger}>
              <span />
              <span />
              <span />
            </span>
          </IconButton>
        </div>
      </header>

      <main className={styles.body}>
        <Text weight="2" className={styles.notice}>
          {TEXT.notice}
        </Text>

        <div className={styles.cards}>
          <Card className={classNames(styles.card, styles.cardPrimary)}>
            <div className={styles.cardHeader}>
              <div>
                <Title level="3" className={styles.cardTitle}>
                  {TEXT.forcedTitle}
                </Title>
                <Text weight="2" className={styles.cardHint}>
                  {TEXT.forcedHint}
                </Text>
              </div>
              <button type="button" className={styles.tooltipButton} title={TEXT.forcedTooltip}>
                ?
              </button>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldRow}>
                <Text weight="2" className={styles.fieldLabel}>
                  {TEXT.forcedLabel}
                </Text>
                <Input
                  className={styles.numberInput}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={forcedInviteCount}
                  onChange={handleForcedChange}
                />
              </div>
              <Text weight="2" className={classNames(styles.summaryText, forcedInviteCount <= 0 && styles.summaryMuted)}>
                {forcedSummaryText}
              </Text>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <Title level="3" className={styles.cardTitle}>
                  {TEXT.resetTitle}
                </Title>
                <Text weight="2" className={styles.cardHint}>
                  {TEXT.resetHint}
                </Text>
              </div>
              <button type="button" className={styles.tooltipButton} title={TEXT.resetTooltip}>
                ?
              </button>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldRow}>
                <Text weight="2" className={styles.fieldLabel}>
                  {TEXT.resetLabel}
                </Text>
                <Input
                  className={styles.numberInput}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="0"
                  value={forcedInviteResetDays}
                  onChange={handleResetChange}
                  disabled={forcedInviteCount <= 0}
                />
              </div>
              <Text weight="2" className={classNames(styles.summaryText, forcedInviteCount <= 0 && styles.summaryMuted)}>
                {resetSummaryText}
              </Text>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <Title level="3" className={styles.cardTitle}>
                  {TEXT.channelsTitle}
                </Title>
                <Text weight="2" className={styles.cardHint}>
                  {TEXT.channelsHint}
                </Text>
              </div>
              <button type="button" className={styles.tooltipButton} title={TEXT.channelsTooltip}>
                ?
              </button>
            </div>
            <div className={styles.field}>
              <Textarea
                className={styles.textarea}
                placeholder={TEXT.channelsPlaceholder}
                value={channelsInput}
                onChange={handleChannelsChange}
              />
              <Text
                weight="2"
                className={classNames(styles.summaryText, mandatoryChannels.length === 0 && styles.summaryMuted)}
              >
                {channelsSummaryText}
              </Text>
              {mandatoryChannels.length > 0 && (
                <div className={styles.channelPreview}>
                  {mandatoryChannels.map((channel) => (
                    <span key={channel}>{channel}</span>
                  ))}
                </div>
              )}
              {invalidChannels.length > 0 && (
                <Text weight="2" className={styles.errorText}>
                  {`${TEXT.channelsErrorPrefix} ${invalidChannels.join(", ")}`}
                </Text>
              )}
            </div>
          </Card>
        </div>
      </main>

      <footer className={styles.saveBar}>
        <Button mode="filled" size="l" stretched disabled={!canSave} onClick={handleSave}>
          {saving ? TEXT.saving : TEXT.save}
        </Button>
      </footer>

      <GroupMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeKey="mandatory"
        onSelect={handleMenuSelect}
      />

      {toastMessage && (
        <Snackbar onClose={handleToastClose} duration={3500} className={styles.snackbar}>
          {toastMessage}
        </Snackbar>
      )}
    </div>
  );
}

