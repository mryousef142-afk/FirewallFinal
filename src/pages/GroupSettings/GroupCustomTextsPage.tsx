import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  Button,
  Card,
  IconButton,
  Input,
  Placeholder,
  Snackbar,
  Switch,
  Text,
  Textarea,
  Title,
} from "@telegram-apps/telegram-ui";

import { GroupMenuDrawer } from "@/features/dashboard/GroupMenuDrawer.tsx";
import {
  fetchGroupCustomTextSettings,
  fetchGroupDetails,
  updateGroupCustomTextSettings,
} from "@/features/dashboard/api.ts";
import type { CustomTextSettings, ManagedGroup } from "@/features/dashboard/types.ts";

import styles from "./GroupCustomTextsPage.module.css";

type LocationState = {
  group?: ManagedGroup;
};

type TemplateKey = keyof Pick<
  CustomTextSettings,
  | "welcomeMessage"
  | "rulesMessage"
  | "silenceStartMessage"
  | "silenceEndMessage"
  | "warningMessage"
  | "forcedInviteMessage"
  | "mandatoryChannelMessage"
>;

type TemplateDefinition = {
  key: TemplateKey;
  title: string;
  description: string;
  placeholders: string[];
  requiredAll?: string[];
  requiredAny?: string[][];
  example?: string;
};

const DEFAULT_TEXTS: CustomTextSettings = {
  welcomeMessage: "Ø¨Ø§ Ø³Ù„Ø§Ù…ØŒ {user} Ø¹Ø²ÛŒØ²! ðŸ‘‹ðŸ»\nØ¨Ù‡ {group} Ø®ÙˆØ´ Ø¢Ù…Ø¯ÛŒØ¯! ðŸŒ·\nÙ‚ÙˆØ§Ù†ÛŒÙ† Ú¯Ø±ÙˆÙ‡ Ø±Ø§ Ø¯Ø± Ù¾ÛŒØ§Ù… Ø¨Ø¹Ø¯ÛŒ Ù…Ø·Ø§Ù„Ø¹Ù‡ Ú©Ù†ÛŒØ¯.",
  rulesMessage: "{user} Ø¹Ø²ÛŒØ²ØŒ\nØ§ÛŒÙ† Ù‚ÙˆØ§Ù†ÛŒÙ† Ø¨Ø±Ø§ÛŒ Ø­ÙØ¸ Ù†Ø¸Ù… {group} ØªØ¯ÙˆÛŒÙ† Ø´Ø¯Ù‡ Ø§Ø³Øª. Ù„Ø·ÙØ§Ù‹ Ø¨Ø§ Ù…Ø·Ø§Ù„Ø¹Ù‡ Ú©Ø§Ù…Ù„ Ø¢Ù†â€ŒÙ‡Ø§ Ø¨Ù‡ Ù…Ø§ Ú©Ù…Ú© Ú©Ù†ÛŒØ¯.",
  silenceStartMessage: "â°ðŸ˜´ Ø³Ø§Ø¹Øª Ø®Ø§Ù…ÙˆØ´ÛŒ ÙØ¹Ø§Ù„ Ø´Ø¯.\nØ§ÛŒÙ† Ú¯Ø±ÙˆÙ‡ Ø§Ø² {starttime} ØªØ§ {endtime} Ø¯Ø± Ø­Ø§Ù„Øª Ø®Ø§Ù…ÙˆØ´ÛŒ Ø§Ø³Øª.\nÙ„Ø·ÙØ§Ù‹ Ø§Ø² Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù… Ø®ÙˆØ¯Ø¯Ø§Ø±ÛŒ Ú©Ù†ÛŒØ¯.",
  silenceEndMessage: "ðŸ‘®ðŸ»â° Ø³Ø§Ø¹Øª Ø®Ø§Ù…ÙˆØ´ÛŒ ØºÛŒØ±ÙØ¹Ø§Ù„ Ø´Ø¯.\nØ³Ø§Ø¹Øª Ø®Ø§Ù…ÙˆØ´ÛŒ Ø¨Ø¹Ø¯ÛŒ Ø§Ø² {starttime} Ø¢ØºØ§Ø² Ø®ÙˆØ§Ù‡Ø¯ Ø´Ø¯.",
  warningMessage:
    "â—ï¸ Ø¯Ù„ÛŒÙ„: {reason}\nðŸ”» Ù†ØªÛŒØ¬Ù‡: {penalty}\n\nâš ï¸ {user_warnings} Ø§Ø®Ø·Ø§Ø± Ø§Ø² {warnings_count}\nðŸ’¡ Ù‡Ø± Ø§Ø®Ø·Ø§Ø± Ø¨Ø¹Ø¯ Ø§Ø² {warningstime} Ø±ÙˆØ² Ø­Ø°Ù Ø®ÙˆØ§Ù‡Ø¯ Ø´Ø¯.",
  forcedInviteMessage:
    "{user}\nâ—ï¸ Ø¨Ø±Ø§ÛŒ Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù… Ø¨Ø§ÛŒØ¯ {number} Ø¹Ø¶Ùˆ Ø¬Ø¯ÛŒØ¯ Ø¯Ø¹ÙˆØª Ú©Ù†ÛŒØ¯.\nðŸ”¸ ØªØ§Ú©Ù†ÙˆÙ† {added} Ø¹Ø¶Ùˆ ØªÙˆØ³Ø· Ø´Ù…Ø§ Ø§Ø¶Ø§ÙÙ‡ Ø´Ø¯Ù‡ Ø§Ø³Øª.",
  mandatoryChannelMessage:
    "â—ï¸ Ù‚Ø¨Ù„ Ø§Ø² Ø§Ø±Ø³Ø§Ù„ Ù¾ÛŒØ§Ù… Ù„Ø·ÙØ§Ù‹ Ø¯Ø± Ú©Ø§Ù†Ø§Ù„(Ù‡Ø§ÛŒ) Ø²ÛŒØ± Ø¹Ø¶Ùˆ Ø´ÙˆÛŒØ¯:\n{channel_names}",
  promoButtonEnabled: false,
  promoButtonText: "ðŸ”¥ Ø¹Ø¶ÙˆÛŒØª Ø¯Ø± Ú©Ø§Ù†Ø§Ù„ Ù…Ø§",
  promoButtonUrl: "https://t.me/tgfirewall",
};

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    key: "welcomeMessage",
    title: "Ù…Ø­ØªÙˆØ§ÛŒ Ù¾ÛŒØ§Ù… Ø®ÙˆØ´â€ŒØ¢Ù…Ø¯Ú¯ÙˆÛŒÛŒ",
    description: "Ú©Ù„ÛŒØ¯ÙˆØ§Ú˜Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø²: {user}, {group}",
    placeholders: ["{user}", "{group}"],
    requiredAny: [["{user}", "{group}"]],
  },
  {
    key: "rulesMessage",
    title: "Ù…ØªÙ† Ù‚ÙˆØ§Ù†ÛŒÙ†",
    description: "Ú©Ù„ÛŒØ¯ÙˆØ§Ú˜Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø²: {user}, {group}",
    placeholders: ["{user}", "{group}"],
    requiredAny: [["{group}"]],
  },
  {
    key: "silenceStartMessage",
    title: "Ù…Ø­ØªÙˆØ§ÛŒ Ù¾ÛŒØ§Ù… Ø´Ø±ÙˆØ¹ Ø®Ø§Ù…ÙˆØ´ÛŒ",
    description: "Ú©Ù„ÛŒØ¯ÙˆØ§Ú˜Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø²: {starttime}, {endtime}",
    placeholders: ["{starttime}", "{endtime}"],
    requiredAll: ["{starttime}", "{endtime}"],
  },
  {
    key: "silenceEndMessage",
    title: "Ù…Ø­ØªÙˆØ§ÛŒ Ù¾ÛŒØ§Ù… Ù¾Ø§ÛŒØ§Ù† Ø®Ø§Ù…ÙˆØ´ÛŒ",
    description: "Ú©Ù„ÛŒØ¯ÙˆØ§Ú˜Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø²: {starttime}, {endtime}",
    placeholders: ["{starttime}", "{endtime}"],
    requiredAll: ["{starttime}", "{endtime}"],
  },
  {
    key: "warningMessage",
    title: "Ù…ØªÙ† ØªØ°Ú©Ø±Ù‡Ø§ÛŒ Ø±Ø¨Ø§Øª",
    description: "Ú©Ù„ÛŒØ¯ÙˆØ§Ú˜Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø²: {reason}, {penalty}, {user_warnings}, {warnings_count}, {warningstime}",
    placeholders: ["{reason}", "{penalty}", "{user_warnings}", "{warnings_count}", "{warningstime}"],
    requiredAll: ["{reason}", "{penalty}", "{user_warnings}", "{warnings_count}", "{warningstime}"],
  },
  {
    key: "forcedInviteMessage",
    title: "Ù…ØªÙ† Ù¾ÛŒØ§Ù… Ø§Ø¯ Ø§Ø¬Ø¨Ø§Ø±ÛŒ",
    description: "Ú©Ù„ÛŒØ¯ÙˆØ§Ú˜Ù‡â€ŒÙ‡Ø§ÛŒ Ù…Ø¬Ø§Ø²: {user}, {number}, {added}",
    placeholders: ["{user}", "{number}", "{added}"],
    requiredAll: ["{number}", "{added}"],
  },
  {
    key: "mandatoryChannelMessage",
    title: "Ù…ØªÙ† Ù¾ÛŒØ§Ù… Ø¹Ø¶ÙˆÛŒØª Ø§Ø¬Ø¨Ø§Ø±ÛŒ Ø¯Ø± Ú©Ø§Ù†Ø§Ù„",
    description: "Ú©Ù„ÛŒØ¯ÙˆØ§Ú˜Ù‡ Ù…Ø¬Ø§Ø²: {channel_names}",
    placeholders: ["{channel_names}"],
    requiredAll: ["{channel_names}"],
  },
];

const PREVIEW_DATA: Record<string, string> = {
  user: "Ali",
  group: "DevChat",
  starttime: "22:00",
  endtime: "07:00",
  reason: "Ø§Ø±Ø³Ø§Ù„ Ø§Ø³Ù¾Ù…",
  penalty: "Ø³Ú©ÙˆØª 24 Ø³Ø§Ø¹Øª",
  user_warnings: "2",
  warnings_count: "3",
  warningstime: "7",
  number: "2",
  added: "1",
  channel_names: "@devchat @devnews",
};

const VALID_BUTTON_PROTOCOLS = ["https://", "tg://"] as const;

export function GroupCustomTextsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [group, setGroup] = useState<ManagedGroup | null>(state.group ?? null);
  const [settings, setSettings] = useState<CustomTextSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const defaultsRef = useRef<CustomTextSettings>(DEFAULT_TEXTS);

  useEffect(() => {
    if (!groupId) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [texts, detail] = await Promise.all([
          fetchGroupCustomTextSettings(groupId),
          fetchGroupDetails(groupId),
        ]);
        if (cancelled) {
          return;
        }
        setSettings(texts);
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

  const updateSettings = useCallback((patch: Partial<CustomTextSettings>) => {
    setSettings((prev) => {
      if (!prev) {
        return prev;
      }
      setDirty(true);
      return { ...prev, ...patch };
    });
  }, []);

  const handleTextChange = useCallback(
    (key: TemplateKey) => (event: ChangeEvent<HTMLTextAreaElement>) => {
      updateSettings({ [key]: event.target.value } as Partial<CustomTextSettings>);
    },
    [updateSettings],
  );

  const handlePromoToggle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateSettings({ promoButtonEnabled: event.target.checked });
    },
    [updateSettings],
  );

  const handlePromoTextChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateSettings({ promoButtonText: event.target.value });
    },
    [updateSettings],
  );

  const handlePromoUrlChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      updateSettings({ promoButtonUrl: event.target.value });
    },
    [updateSettings],
  );

  const handleResetTemplate = useCallback(
    (key: TemplateKey) => {
      const defaults = defaultsRef.current;
      updateSettings({ [key]: defaults[key] } as Partial<CustomTextSettings>);
    },
    [updateSettings],
  );

  const handleResetButton = useCallback(() => {
    const defaults = defaultsRef.current;
    updateSettings({
      promoButtonEnabled: defaults.promoButtonEnabled,
      promoButtonText: defaults.promoButtonText,
      promoButtonUrl: defaults.promoButtonUrl,
    });
  }, [updateSettings]);

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
        case "mandatory":
          navigate(`/groups/${groupId}/settings/mandatory`, { state: { group } });
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
        default:
          console.info(`[custom-texts] menu item '${key}' tapped`);
      }
    },
    [groupId, group, navigate],
  );

  const handleToastClose = useCallback(() => {
    setToastMessage("");
  }, []);

  const validationErrors = useMemo(() => {
    if (!settings) {
      return {} as Record<TemplateKey, string>;
    }
    const errors: Partial<Record<TemplateKey, string>> = {};
    TEMPLATE_DEFINITIONS.forEach((template) => {
      const value = settings[template.key].trim();
      if (!value) {
        return;
      }
      if (template.requiredAll) {
        const missing = template.requiredAll.filter((token) => !value.includes(token));
        if (missing.length > 0) {
          errors[template.key] = `??? ???? ???? ???? ${missing.join("? ")} ????.`;
          return;
        }
      }
      if (template.requiredAny) {
        const anyGroupMissing = template.requiredAny.some((groupTokens) =>
          groupTokens.every((token) => !value.includes(token)),
        );
        if (anyGroupMissing) {
          const tokensText = template.requiredAny
            .map((groupTokens) => groupTokens.join(" ?? "))
            .join("? ");
          errors[template.key] = `??? ???? ???? ???? ${tokensText} ????.`;
        }
      }
    });
    return errors as Record<TemplateKey, string>;
  }, [settings]);

  const promoButtonError = useMemo(() => {
    if (!settings) {
      return "";
    }
    if (settings.promoButtonEnabled && settings.promoButtonText.trim().length === 0) {
      return "????? ??? ???? ?? ???? ????.";
    }
    const url = settings.promoButtonUrl.trim();
    if (url.length > 0 && !VALID_BUTTON_PROTOCOLS.some((protocol) => url.startsWith(protocol))) {
      return "???? ???? ?? https:// ?? tg:// ???? ???.";
    }
    return "";
  }, [settings]);

  const hasErrors = useMemo(() => {
    if (!settings) {
      return true;
    }
    return Object.values(validationErrors).some(Boolean) || Boolean(promoButtonError);
  }, [settings, validationErrors, promoButtonError]);

  const applyPreview = useCallback((template: string) => {
    return template.replace(/\{([a-z_]+)\}/gi, (match, key) => {
      const normalized = key.toLowerCase();
      return PREVIEW_DATA[normalized] ?? match;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!groupId || !settings || hasErrors) {
      return;
    }
    try {
      setSaving(true);
      const next = await updateGroupCustomTextSettings(groupId, settings);
      setSettings(next);
      setDirty(false);
      setToastMessage("??????? ?? ?????? ????? ??.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setToastMessage(`????? ??????? ?? ??? ????? ??: ${message}`);
    } finally {
      setSaving(false);
    }
  }, [groupId, settings, hasErrors]);

  if (loading && !settings) {
    return (
      <div className={styles.loadingState} dir="rtl">
        <Text weight="2">?? ??? ???????? ???????...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <Placeholder header="??? ?? ?????? ???????" description={error.message}>
        <Button mode="filled" onClick={() => navigate(-1)}>
          ??????
        </Button>
      </Placeholder>
    );
  }

  if (!settings) {
    return (
      <Placeholder header="??????? ?? ????? ????">
        <Button mode="filled" onClick={() => navigate(-1)}>
          ??????
        </Button>
      </Placeholder>
    );
  }

  const canSave = dirty && !saving && !hasErrors;

  return (
    <div className={styles.page} dir="rtl">
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button mode="plain" size="s" onClick={() => navigate(-1)}>
            ??????
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
              ??????? ??????
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
          ???? ?? ???? ????????? ??? ?????? ???????. ?? ???? ???? ???? ?? ????? ??? ??????? ???? ??????? ??????.
        </Text>

        <div className={styles.cards}>
          {TEMPLATE_DEFINITIONS.map((template) => {
            const value = settings[template.key];
            const errorMessage = validationErrors[template.key];
            return (
              <Card key={template.key} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.headerMain}>
                    <Title level="3" className={styles.cardTitle}>
                      {template.title}
                    </Title>
                    <Text weight="2" className={styles.cardHint}>
                      {template.description}
                    </Text>
                  </div>
                  <div className={styles.buttonRow}>
                    <Button mode="outline" size="s" onClick={() => handleResetTemplate(template.key)}>
                      ???????? ?? ???????
                    </Button>
                  </div>
                </div>
                <Textarea
                  className={styles.textarea}
                  value={value}
                  onChange={handleTextChange(template.key)}
                />
                <div className={styles.textareaFooter}>
                  <Text weight="2" className={styles.charCounter}>
                    {value.length} ???????
                  </Text>
                </div>
                {errorMessage && (
                  <Text weight="2" className={styles.errorText}>
                    {errorMessage}
                  </Text>
                )}
                <div className={styles.previewBox}>{applyPreview(value)}</div>
              </Card>
            );
          })}

          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.headerMain}>
                <Title level="3" className={styles.cardTitle}>???? ??????? ????????</Title>
                <Text weight="2" className={styles.cardHint}>
                  ?? ???? ???? ????? ??? ???????? ???? ???? ????? ???? ??????. ??? ???? ???? ????? ???? ????? ???? ?????? ??.
                </Text>
              </div>
              <Switch checked={settings.promoButtonEnabled} onChange={handlePromoToggle} />
            </div>
            <div className={styles.field}>
              <div className={styles.fieldRow}>
                <Text weight="2" className={styles.cardHint}>??? ????</Text>
                <Input
                  value={settings.promoButtonText}
                  maxLength={30}
                  onChange={handlePromoTextChange}
                  placeholder="?? ????? ?? ????? ??"
                />
              </div>
              <div className={styles.fieldRow}>
                <Text weight="2" className={styles.cardHint}>???? ????</Text>
                <Input
                  value={settings.promoButtonUrl}
                  onChange={handlePromoUrlChange}
                  placeholder="https://t.me/YourChannel"
                />
              </div>
              <div className={styles.textareaFooter}>
                <Text weight="2" className={styles.charCounter}>
                  {settings.promoButtonText.length} / 30
                </Text>
                <Button mode="outline" size="s" onClick={handleResetButton}>
                  ???????? ????
                </Button>
              </div>
              {promoButtonError && (
                <Text weight="2" className={styles.errorText}>
                  {promoButtonError}
                </Text>
              )}
              <div className={styles.previewBox}>
                {settings.promoButtonEnabled && settings.promoButtonText.trim()
                  ? `????: ${settings.promoButtonText}\n????: ${settings.promoButtonUrl || "(???? ????)"}`
                  : "???? ??????? ???."}
              </div>
            </div>
          </Card>
        </div>
      </main>

      <footer className={styles.saveBar}>
        <Button mode="filled" size="l" stretched disabled={!canSave} onClick={handleSave}>
          {saving ? "?? ??? ?????..." : "????? ???????"}
        </Button>
      </footer>

      <GroupMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeKey="texts"
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

