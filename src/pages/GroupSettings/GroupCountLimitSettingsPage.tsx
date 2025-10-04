import { useCallback, useEffect, useState, type ChangeEvent } from "react";
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
  Title,
} from "@telegram-apps/telegram-ui";

import { GroupMenuDrawer } from "@/features/dashboard/GroupMenuDrawer.tsx";
import {
  fetchGroupCountLimitSettings,
  fetchGroupDetails,
  updateGroupCountLimitSettings,
} from "@/features/dashboard/api.ts";
import type { CountLimitSettings, ManagedGroup } from "@/features/dashboard/types.ts";
import { classNames } from "@/css/classnames.ts";
import { toPersianDigits } from "@/utils/format.ts";

import styles from "./GroupCountLimitSettingsPage.module.css";

type LocationState = {
  group?: ManagedGroup;
};

const TEXT = {
  zeroDisabledNote: "\u0645\u0642\u062f\u0627\u0631 \u0635\u0641\u0631 \u06cc\u0639\u0646\u06cc \u0645\u062d\u062f\u0648\u062f\u06cc\u062a \u063a\u06cc\u0631\u0641\u0639\u0627\u0644 \u0645\u06cc\u200c\u0634\u0648\u062f.",
  loading: "\u062f\u0631 \u062d\u0627\u0644 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u062a\u0646\u0638\u06cc\u0645\u0627\u062a...",
  errorHeader: "\u062e\u0637\u0627 \u062f\u0631 \u062f\u0631\u06cc\u0627\u0641\u062a \u0627\u0637\u0644\u0627\u0639\u0627\u062a",
  back: "\u0628\u0627\u0632\u06af\u0634\u062a",
  unavailableHeader: "\u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u062f\u0631 \u062f\u0633\u062a\u0631\u0633 \u0646\u06cc\u0633\u062a",
  unknownGroup: "\u06af\u0631\u0648\u0647 \u0646\u0627\u0634\u0646\u0627\u062e\u062a\u0647",
  pageSubtitle: "\u0645\u062d\u062f\u0648\u062f\u06cc\u062a\u200c\u0647\u0627\u06cc \u0645\u0628\u062a\u0646\u06cc \u0628\u0631 \u0634\u0645\u0627\u0631\u0634",
  notice: "\u0645\u0642\u062f\u0627\u0631 \u06f0 \u0647\u0631 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a \u0631\u0627 \u063a\u06cc\u0631\u0641\u0639\u0627\u0644 \u0645\u06cc\u200c\u06a9\u0646\u062f. \u062f\u0631 \u0635\u0648\u0631\u062a \u0646\u0642\u0636 \u0647\u0631 \u06cc\u06a9 \u0627\u0632 \u0642\u0648\u0627\u0646\u06cc\u0646\u060c \u0645\u062c\u0627\u0632\u0627\u062a \u067e\u06cc\u0634\u200c\u0641\u0631\u0636 \u06af\u0631\u0648\u0647 \u0628\u0647 \u0635\u0648\u0631\u062a \u062e\u0648\u062f\u06a9\u0627\u0631 \u0627\u0639\u0645\u0627\u0644 \u0645\u06cc\u200c\u0634\u0648\u062f.",
  cardMinTitle: "\u062d\u062f\u0627\u0642\u0644 \u062a\u0639\u062f\u0627\u062f \u06a9\u0644\u0645\u0627\u062a \u067e\u06cc\u0627\u0645",
  cardMinHint: "\u0647\u0631 \u067e\u06cc\u0627\u0645 \u0628\u0627\u06cc\u062f \u062d\u062f\u0627\u0642\u0644 \u0627\u06cc\u0646 \u062a\u0639\u062f\u0627\u062f \u06a9\u0644\u0645\u0647 \u062f\u0627\u0634\u062a\u0647 \u0628\u0627\u0634\u062f \u062a\u0627 \u0642\u0628\u0648\u0644 \u0634\u0648\u062f.",
  cardMinLabel: "\u062d\u062f\u0627\u0642\u0644 \u06a9\u0644\u0645\u0647 \u0645\u062c\u0627\u0632",
  cardMinTooltip: "\u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u06a9\u0648\u062a\u0627\u0647\u200c\u062a\u0631 \u0627\u0632 \u0627\u06cc\u0646 \u0645\u0642\u062f\u0627\u0631 \u062d\u0630\u0641 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f \u0648 \u0645\u062c\u0627\u0632\u0627\u062a \u067e\u06cc\u0634\u200c\u0641\u0631\u0636 \u0627\u062c\u0631\u0627 \u0645\u06cc\u200c\u0634\u0648\u062f.",
  placeholderWords: "\u062a\u0639\u062f\u0627\u062f \u06a9\u0644\u0645\u0627\u062a",
  cardMinStatusActive: "\u062d\u062f\u0627\u0642\u0644 {value} \u06a9\u0644\u0645\u0647 \u0628\u0631\u0627\u06cc \u0647\u0631 \u067e\u06cc\u0627\u0645 \u0627\u0644\u0632\u0627\u0645\u06cc \u0627\u0633\u062a.",
  cardMaxTitle: "\u062d\u062f\u0627\u06a9\u062b\u0631 \u062a\u0639\u062f\u0627\u062f \u06a9\u0644\u0645\u0627\u062a \u067e\u06cc\u0627\u0645",
  cardMaxHint: "\u0627\u06af\u0631 \u067e\u06cc\u0627\u0645 \u0628\u06cc\u0634 \u0627\u0632 \u0627\u06cc\u0646 \u062a\u0639\u062f\u0627\u062f \u06a9\u0644\u0645\u0647 \u062f\u0627\u0634\u062a\u0647 \u0628\u0627\u0634\u062f\u060c \u0631\u0628\u0627\u062a \u0622\u0646 \u0631\u0627 \u062d\u0630\u0641 \u06cc\u0627 \u0627\u062e\u0637\u0627\u0631 \u0635\u0627\u062f\u0631 \u0645\u06cc\u200c\u06a9\u0646\u062f.",
  cardMaxLabel: "\u0633\u0642\u0641 \u0637\u0648\u0644 \u067e\u06cc\u0627\u0645",
  cardMaxTooltip: "\u0628\u0631\u0627\u06cc \u0622\u0632\u0627\u062f \u06af\u0630\u0627\u0634\u062a\u0646 \u0637\u0648\u0644 \u067e\u06cc\u0627\u0645\u060c \u0645\u0642\u062f\u0627\u0631 \u0631\u0627 \u0635\u0641\u0631 \u0642\u0631\u0627\u0631 \u062f\u0647\u06cc\u062f \u06cc\u0627 \u0639\u062f\u062f \u0628\u0632\u0631\u06af\u200c\u062a\u0631\u06cc \u0627\u0632 \u062d\u062f\u0627\u0642\u0644 \u0627\u0646\u062a\u062e\u0627\u0628 \u06a9\u0646\u06cc\u062f.",
  cardMaxStatusInvalid: "\u0633\u0642\u0641 \u06a9\u0644\u0645\u0627\u062a \u0646\u0645\u06cc\u200c\u062a\u0648\u0627\u0646\u062f \u06a9\u0645\u062a\u0631 \u0627\u0632 \u062d\u062f\u0627\u0642\u0644 \u062a\u0639\u0631\u06cc\u0641 \u0634\u062f\u0647 \u0628\u0627\u0634\u062f.",
  cardMaxStatusActive: "\u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u0628\u06cc\u0634 \u0627\u0632 {value} \u06a9\u0644\u0645\u0647 \u0645\u0633\u062f\u0648\u062f \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.",
  cardCountTitle: "\u0645\u062d\u062f\u0648\u062f\u06cc\u062a \u062a\u0639\u062f\u0627\u062f \u067e\u06cc\u0627\u0645 \u062f\u0631 \u0628\u0627\u0632\u0647 \u0632\u0645\u0627\u0646\u06cc",
  cardCountHint: "\u0647\u0631 \u06a9\u0627\u0631\u0628\u0631 \u062a\u0646\u0647\u0627 \u0645\u06cc\u200c\u062a\u0648\u0627\u0646\u062f \u062d\u062f\u0627\u06a9\u062b\u0631 \u0627\u06cc\u0646 \u062a\u0639\u062f\u0627\u062f \u067e\u06cc\u0627\u0645 \u0631\u0627 \u062f\u0631 \u0628\u0627\u0632\u0647 \u062a\u0639\u0631\u06cc\u0641 \u0634\u062f\u0647 \u0627\u0631\u0633\u0627\u0644 \u06a9\u0646\u062f.",
  cardCountLabel: "\u062a\u0639\u062f\u0627\u062f \u067e\u06cc\u0627\u0645 \u0645\u062c\u0627\u0632",
  cardCountTooltip: "\u0631\u0628\u0627\u062a \u0634\u0645\u0627\u0631\u0646\u062f\u0647 \u067e\u06cc\u0627\u0645 \u0647\u0631 \u06a9\u0627\u0631\u0628\u0631 \u0631\u0627 \u062f\u0631 \u0628\u0627\u0632\u0647 \u0627\u0646\u062a\u062e\u0627\u0628\u06cc \u0628\u0647\u200c\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0645\u06cc\u200c\u06a9\u0646\u062f.",
  placeholderMessages: "\u062a\u0639\u062f\u0627\u062f \u067e\u06cc\u0627\u0645",
  cardCountStatusActive: "\u0647\u0631 \u06a9\u0627\u0631\u0628\u0631 \u062a\u0646\u0647\u0627 {value} \u067e\u06cc\u0627\u0645 \u0645\u06cc\u200c\u062a\u0648\u0627\u0646\u062f \u0627\u0631\u0633\u0627\u0644 \u06a9\u0646\u062f.",
  cardWindowTitle: "\u0628\u0627\u0632\u0647 \u0632\u0645\u0627\u0646\u06cc \u0634\u0645\u0627\u0631\u0634 \u067e\u06cc\u0627\u0645\u200c\u0647\u0627 (\u062f\u0642\u06cc\u0642\u0647)",
  cardWindowHint: "\u0645\u062f\u062a\u200c\u0632\u0645\u0627\u0646\u06cc \u06a9\u0647 \u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u0647\u0631 \u06a9\u0627\u0631\u0628\u0631 \u062f\u0631 \u0622\u0646 \u0628\u0631\u0627\u06cc \u0627\u0639\u0645\u0627\u0644 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a \u0634\u0645\u0627\u0631\u0634 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.",
  cardWindowLabel: "\u0645\u062f\u062a \u0628\u0627\u0632\u0647 (\u062f\u0642\u06cc\u0642\u0647)",
  cardWindowTooltip: "\u0627\u06af\u0631 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a \u067e\u06cc\u0627\u0645 \u0631\u0627 \u0635\u0641\u0631 \u06a9\u0646\u06cc\u062f\u060c \u0627\u06cc\u0646 \u0641\u06cc\u0644\u062f \u0628\u0647 \u0635\u0648\u0631\u062a \u062e\u0648\u062f\u06a9\u0627\u0631 \u063a\u06cc\u0631\u0641\u0639\u0627\u0644 \u0645\u06cc\u200c\u0634\u0648\u062f.",
  placeholderMinutes: "\u062f\u0642\u06cc\u0642\u0647",
  cardWindowStatusDisabled: "\u0628\u0631\u0627\u06cc \u0641\u0639\u0627\u0644\u200c\u0633\u0627\u0632\u06cc\u060c \u0627\u0628\u062a\u062f\u0627 \u062a\u0639\u062f\u0627\u062f \u067e\u06cc\u0627\u0645 \u0645\u062c\u0627\u0632 \u0631\u0627 \u0628\u0632\u0631\u06af\u062a\u0631 \u0627\u0632 \u0635\u0641\u0631 \u0642\u0631\u0627\u0631 \u062f\u0647\u06cc\u062f.",
  cardWindowStatusActive: "\u0628\u0627\u0632\u0647 \u0634\u0645\u0627\u0631\u0634 {value} \u062f\u0642\u06cc\u0642\u0647 \u0627\u0633\u062a.",
  cardDuplicateTitle: "\u062a\u0639\u062f\u0627\u062f \u0645\u062c\u0627\u0632 \u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u062a\u06a9\u0631\u0627\u0631\u06cc",
  cardDuplicateHint: "\u0631\u0628\u0627\u062a \u0645\u062a\u0646 \u067e\u06cc\u0627\u0645\u200c\u0647\u0627 \u0631\u0627 \u0647\u0634 \u0645\u06cc\u200c\u06a9\u0646\u062f \u062a\u0627 \u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u062a\u06a9\u0631\u0627\u0631\u06cc \u0631\u0627 \u062a\u0634\u062e\u06cc\u0635 \u062f\u0647\u062f \u0648 \u0628\u06cc\u0634\u062a\u0631 \u0627\u0632 \u0627\u06cc\u0646 \u0645\u0642\u062f\u0627\u0631 \u0631\u0627 \u0645\u062d\u062f\u0648\u062f \u0645\u06cc\u200c\u06a9\u0646\u062f.",
  cardDuplicateLabel: "\u067e\u06cc\u0627\u0645 \u062a\u06a9\u0631\u0627\u0631\u06cc \u0645\u062c\u0627\u0632",
  cardDuplicateTooltip: "\u0628\u0631\u0627\u06cc \u063a\u06cc\u0631\u0641\u0639\u0627\u0644 \u06a9\u0631\u062f\u0646 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a \u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u062a\u06a9\u0631\u0627\u0631\u06cc\u060c \u0645\u0642\u062f\u0627\u0631 \u0631\u0627 \u0635\u0641\u0631 \u0642\u0631\u0627\u0631 \u062f\u0647\u06cc\u062f.",
  cardDuplicateStatusActive: "\u0647\u0631 \u06a9\u0627\u0631\u0628\u0631 \u062a\u0646\u0647\u0627 {value} \u067e\u06cc\u0627\u0645 \u062a\u06a9\u0631\u0627\u0631\u06cc \u0645\u06cc\u200c\u062a\u0648\u0627\u0646\u062f \u0627\u0631\u0633\u0627\u0644 \u06a9\u0646\u062f.",
  cardDuplicateWindowTitle: "\u0628\u0627\u0632\u0647 \u0632\u0645\u0627\u0646\u06cc \u0634\u0645\u0627\u0631\u0634 \u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u062a\u06a9\u0631\u0627\u0631\u06cc (\u062f\u0642\u06cc\u0642\u0647)",
  cardDuplicateWindowHint: "\u0628\u0627\u0632\u0647\u200c\u0627\u06cc \u06a9\u0647 \u062f\u0631 \u0622\u0646 \u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u0645\u0634\u0627\u0628\u0647 \u0628\u0631\u0627\u06cc \u0647\u0631 \u06a9\u0627\u0631\u0628\u0631 \u0645\u062d\u0627\u0633\u0628\u0647 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f\u061b \u0645\u0642\u062f\u0627\u0631 \u067e\u06cc\u0634\u200c\u0641\u0631\u0636 \u06f1\u06f4\u06f4\u06f0 \u062f\u0642\u06cc\u0642\u0647 (\u06cc\u06a9 \u0631\u0648\u0632) \u0627\u0633\u062a.",
  cardDuplicateWindowLabel: "\u0645\u062f\u062a \u0628\u0627\u0632\u0647 (\u062f\u0642\u06cc\u0642\u0647)",
  cardDuplicateWindowTooltip: "\u0627\u06af\u0631 \u0645\u062d\u062f\u0648\u062f\u06cc\u062a \u067e\u06cc\u0627\u0645 \u062a\u06a9\u0631\u0627\u0631\u06cc \u063a\u06cc\u0631\u0641\u0639\u0627\u0644 \u0628\u0627\u0634\u062f\u060c \u0627\u06cc\u0646 \u0628\u0627\u0632\u0647 \u0646\u06cc\u0632 \u0628\u06cc\u200c\u0627\u062b\u0631 \u062e\u0648\u0627\u0647\u062f \u0628\u0648\u062f.",
  cardDuplicateWindowStatusDisabled: "\u0628\u0631\u0627\u06cc \u0641\u0639\u0627\u0644\u200c\u0633\u0627\u0632\u06cc\u060c \u0627\u0628\u062a\u062f\u0627 \u062a\u0639\u062f\u0627\u062f \u0645\u062c\u0627\u0632 \u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u062a\u06a9\u0631\u0627\u0631\u06cc \u0631\u0627 \u0628\u0632\u0631\u06af\u062a\u0631 \u0627\u0632 \u0635\u0641\u0631 \u0642\u0631\u0627\u0631 \u062f\u0647\u06cc\u062f.",
  cardDuplicateWindowStatusActive: "\u067e\u06cc\u0627\u0645\u200c\u0647\u0627\u06cc \u062a\u06a9\u0631\u0627\u0631\u06cc \u062f\u0631 \u0628\u0627\u0632\u0647 {value} \u062f\u0642\u06cc\u0642\u0647 \u0634\u0645\u0627\u0631\u0634 \u0645\u06cc\u200c\u0634\u0648\u0646\u062f.",
  saveText: "\u0630\u062e\u06cc\u0631\u0647 \u062a\u0646\u0638\u06cc\u0645\u0627\u062a",
  savingText: "\u062f\u0631 \u062d\u0627\u0644 \u0630\u062e\u06cc\u0631\u0647...",
  saveSuccess: "\u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u0628\u0627 \u0645\u0648\u0641\u0642\u06cc\u062a \u0630\u062e\u06cc\u0631\u0647 \u0634\u062f.",
  saveErrorPrefix: "\u0630\u062e\u06cc\u0631\u0647 \u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u0628\u0627 \u062e\u0637\u0627 \u0645\u0648\u0627\u062c\u0647 \u0634\u062f: "
} as const;

const formatValue = (value: number): string => toPersianDigits(value);

export function GroupCountLimitSettingsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [group, setGroup] = useState<ManagedGroup | null>(state.group ?? null);
  const [settings, setSettings] = useState<CountLimitSettings | null>(null);
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
        const [limits, detail] = await Promise.all([
          fetchGroupCountLimitSettings(groupId),
          fetchGroupDetails(groupId),
        ]);
        if (cancelled) {
          return;
        }
        setSettings(limits);
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

  const updateSettings = useCallback((patch: Partial<CountLimitSettings>) => {
    setSettings((prev) => {
      if (!prev) {
        return prev;
      }
      setDirty(true);
      return { ...prev, ...patch };
    });
  }, []);

  const handleNumberChange = useCallback(
    (key: keyof CountLimitSettings) =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const raw = event.target.value.trim();
        const parsed = raw === "" ? 0 : Number(raw);
        const sanitized = Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
        updateSettings({ [key]: sanitized } as Partial<CountLimitSettings>);
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
        case "analytics":
          navigate(`/groups/${groupId}/analytics`, { state: { group } });
          break;
        case "limits":
          break;
        default:
          console.info(`[count-limits] menu item '${key}' tapped`);
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
      const next = await updateGroupCountLimitSettings(groupId, settings);
      setSettings(next);
      setDirty(false);
      setToastMessage(TEXT.saveSuccess);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setToastMessage(TEXT.saveErrorPrefix + message);
    } finally {
      setSaving(false);
    }
  }, [groupId, settings]);

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

  const minWords = settings.minWordsPerMessage;
  const maxWords = settings.maxWordsPerMessage;
  const messagesPerWindow = settings.messagesPerWindow;
  const windowMinutes = settings.windowMinutes;
  const duplicateMessages = settings.duplicateMessages;
  const duplicateWindowMinutes = settings.duplicateWindowMinutes;

  const minWordsInvalid = minWords <= 0;
  const maxWordsInvalid =
    maxWords <= 0 || (minWords > 0 && maxWords > 0 && maxWords < minWords);
  const messagesPerWindowInvalid = messagesPerWindow <= 0;
  const windowMinutesDisabled = messagesPerWindow <= 0;
  const windowMinutesInvalid = !windowMinutesDisabled && windowMinutes <= 0;
  const duplicateMessagesInvalid = duplicateMessages <= 0;
  const duplicateWindowDisabled = duplicateMessages <= 0;
  const duplicateWindowInvalid = !duplicateWindowDisabled && duplicateWindowMinutes <= 0;

  const canSave = dirty && !saving;

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
              {group ? group.title : TEXT.unknownGroup}
            </Title>
            <Text weight="2" className={styles.groupSubtitle}>
              {TEXT.pageSubtitle}
            </Text>
          </div>
        </div>
        <div className={styles.headerRight}>
          <IconButton aria-label="menu" onClick={() => setMenuOpen(true)}>
            <span className={styles.burger}>
              <span />
              <span />
              <span />
            </span>
          </IconButton>
        </div>
      </header>

      <main className={styles.body}>
        <div className={styles.notice}>{TEXT.notice}</div>

        <div className={styles.cards}>
          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <Title level="3" className={styles.cardTitle}>
                  {TEXT.cardMinTitle}
                </Title>
                <Text weight="2" className={styles.cardHint}>
                  {TEXT.cardMinHint}
                </Text>
              </div>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <Text weight="2" className={styles.fieldLabel}>
                  {TEXT.cardMinLabel}
                </Text>
                <button
                  type="button"
                  className={styles.tooltipButton}
                  title={TEXT.cardMinTooltip}
                >
                  ؟
                </button>
              </div>
              <Input
                className={styles.numberInput}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder={TEXT.placeholderWords}
                value={minWords}
                status={minWordsInvalid ? "error" : "default"}
                onChange={handleNumberChange("minWordsPerMessage")}
              />
              <Text
                weight="2"
                className={classNames(
                  styles.fieldStatus,
                  minWordsInvalid ? styles.statusDisabled : styles.statusActive,
                )}
              >
                {minWordsInvalid
                  ? TEXT.zeroDisabledNote
                  : TEXT.cardMinStatusActive.replace("{value}", formatValue(minWords))}
              </Text>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <Title level="3" className={styles.cardTitle}>
                  {TEXT.cardMaxTitle}
                </Title>
                <Text weight="2" className={styles.cardHint}>
                  {TEXT.cardMaxHint}
                </Text>
              </div>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <Text weight="2" className={styles.fieldLabel}>
                  {TEXT.cardMaxLabel}
                </Text>
                <button
                  type="button"
                  className={styles.tooltipButton}
                  title={TEXT.cardMaxTooltip}
                >
                  ؟
                </button>
              </div>
              <Input
                className={styles.numberInput}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder={TEXT.placeholderWords}
                value={maxWords}
                status={maxWordsInvalid ? "error" : "default"}
                onChange={handleNumberChange("maxWordsPerMessage")}
              />
              <Text
                weight="2"
                className={classNames(
                  styles.fieldStatus,
                  maxWordsInvalid ? styles.statusDisabled : styles.statusActive,
                )}
              >
                {maxWords <= 0
                  ? TEXT.zeroDisabledNote
                  : maxWords < minWords && minWords > 0
                    ? TEXT.cardMaxStatusInvalid
                    : TEXT.cardMaxStatusActive.replace("{value}", formatValue(maxWords))}
              </Text>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <Title level="3" className={styles.cardTitle}>
                  {TEXT.cardCountTitle}
                </Title>
                <Text weight="2" className={styles.cardHint}>
                  {TEXT.cardCountHint}
                </Text>
              </div>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <Text weight="2" className={styles.fieldLabel}>
                  {TEXT.cardCountLabel}
                </Text>
                <button
                  type="button"
                  className={styles.tooltipButton}
                  title={TEXT.cardCountTooltip}
                >
                  ؟
                </button>
              </div>
              <Input
                className={styles.numberInput}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder={TEXT.placeholderMessages}
                value={messagesPerWindow}
                status={messagesPerWindowInvalid ? "error" : "default"}
                onChange={handleNumberChange("messagesPerWindow")}
              />
              <Text
                weight="2"
                className={classNames(
                  styles.fieldStatus,
                  messagesPerWindowInvalid ? styles.statusDisabled : styles.statusActive,
                )}
              >
                {messagesPerWindowInvalid
                  ? TEXT.zeroDisabledNote
                  : TEXT.cardCountStatusActive.replace("{value}", formatValue(messagesPerWindow))}
              </Text>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <Title level="3" className={styles.cardTitle}>
                  {TEXT.cardWindowTitle}
                </Title>
                <Text weight="2" className={styles.cardHint}>
                  {TEXT.cardWindowHint}
                </Text>
              </div>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <Text weight="2" className={styles.fieldLabel}>
                  {TEXT.cardWindowLabel}
                </Text>
                <button
                  type="button"
                  className={styles.tooltipButton}
                  title={TEXT.cardWindowTooltip}
                >
                  ؟
                </button>
              </div>
              <Input
                className={styles.numberInput}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder={TEXT.placeholderMinutes}
                value={windowMinutes}
                status={windowMinutesInvalid ? "error" : "default"}
                disabled={windowMinutesDisabled}
                onChange={handleNumberChange("windowMinutes")}
              />
              <Text
                weight="2"
                className={classNames(
                  styles.fieldStatus,
                  windowMinutesInvalid ? styles.statusDisabled : styles.statusActive,
                )}
              >
                {windowMinutesDisabled
                  ? TEXT.cardWindowStatusDisabled
                  : windowMinutesInvalid
                    ? TEXT.zeroDisabledNote
                    : TEXT.cardWindowStatusActive.replace("{value}", formatValue(windowMinutes))}
              </Text>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <Title level="3" className={styles.cardTitle}>
                  {TEXT.cardDuplicateTitle}
                </Title>
                <Text weight="2" className={styles.cardHint}>
                  {TEXT.cardDuplicateHint}
                </Text>
              </div>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <Text weight="2" className={styles.fieldLabel}>
                  {TEXT.cardDuplicateLabel}
                </Text>
                <button
                  type="button"
                  className={styles.tooltipButton}
                  title={TEXT.cardDuplicateTooltip}
                >
                  ؟
                </button>
              </div>
              <Input
                className={styles.numberInput}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder={TEXT.placeholderMessages}
                value={duplicateMessages}
                status={duplicateMessagesInvalid ? "error" : "default"}
                onChange={handleNumberChange("duplicateMessages")}
              />
              <Text
                weight="2"
                className={classNames(
                  styles.fieldStatus,
                  duplicateMessagesInvalid ? styles.statusDisabled : styles.statusActive,
                )}
              >
                {duplicateMessagesInvalid
                  ? TEXT.zeroDisabledNote
                  : TEXT.cardDuplicateStatusActive.replace("{value}", formatValue(duplicateMessages))}
              </Text>
            </div>
          </Card>

          <Card className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <Title level="3" className={styles.cardTitle}>
                  {TEXT.cardDuplicateWindowTitle}
                </Title>
                <Text weight="2" className={styles.cardHint}>
                  {TEXT.cardDuplicateWindowHint}
                </Text>
              </div>
            </div>
            <div className={styles.field}>
              <div className={styles.fieldLabelRow}>
                <Text weight="2" className={styles.fieldLabel}>
                  {TEXT.cardDuplicateWindowLabel}
                </Text>
                <button
                  type="button"
                  className={styles.tooltipButton}
                  title={TEXT.cardDuplicateWindowTooltip}
                >
                  ؟
                </button>
              </div>
              <Input
                className={styles.numberInput}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder={TEXT.placeholderMinutes}
                value={duplicateWindowMinutes}
                status={duplicateWindowInvalid ? "error" : "default"}
                disabled={duplicateWindowDisabled}
                onChange={handleNumberChange("duplicateWindowMinutes")}
              />
              <Text
                weight="2"
                className={classNames(
                  styles.fieldStatus,
                  duplicateWindowInvalid ? styles.statusDisabled : styles.statusActive,
                )}
              >
                {duplicateWindowDisabled
                  ? TEXT.cardDuplicateWindowStatusDisabled
                  : duplicateWindowInvalid
                    ? TEXT.zeroDisabledNote
                    : TEXT.cardDuplicateWindowStatusActive.replace(
                        "{value}",
                        formatValue(duplicateWindowMinutes),
                      )}
              </Text>
            </div>
          </Card>
        </div>
      </main>

      <footer className={styles.saveBar}>
        <Button
          mode="filled"
          size="l"
          stretched
          disabled={!canSave}
          onClick={handleSave}
        >
          {saving ? TEXT.savingText : TEXT.saveText}
        </Button>
      </footer>

      <GroupMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeKey="limits"
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
