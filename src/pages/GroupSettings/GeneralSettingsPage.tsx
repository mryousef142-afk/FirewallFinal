import { useCallback, useEffect, useState } from "react";
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
  Title,
} from "@telegram-apps/telegram-ui";

import { GroupMenuDrawer } from "@/features/dashboard/GroupMenuDrawer.tsx";
import { fetchGroupDetails, fetchGroupGeneralSettings, updateGroupGeneralSettings } from "@/features/dashboard/api.ts";
import type {
  AutoWarningPenalty,
  GroupGeneralSettings,
  ManagedGroup,
  TimeRangeMode,
  TimeRangeSetting,
} from "@/features/dashboard/types.ts";

import styles from "./GeneralSettingsPage.module.css";

type LocationState = {
  group?: ManagedGroup;
};

type ScheduleSectionProps = {
  title: string;
  value: TimeRangeSetting;
  disabled?: boolean;
  onModeChange: (mode: TimeRangeMode) => void;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
};

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (جهانی)" },
  { value: "Asia/Tehran", label: "Asia/Tehran (تهران)" },
  { value: "Europe/Istanbul", label: "Europe/Istanbul (استانبول)" },
  { value: "Europe/London", label: "Europe/London (لندن)" },
  { value: "America/New_York", label: "America/New_York (نیویورک)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (دبی)" },
];

function ScheduleSection({ title, value, disabled, onModeChange, onStartChange, onEndChange }: ScheduleSectionProps) {
  return (
    <div className={styles.scheduleBlock} aria-disabled={disabled}>
      <Text weight="2" className={styles.fieldLabel}>
        {title}
      </Text>
      <div className={styles.fieldControl}>
        <select
          className={styles.select}
          value={value.mode}
          disabled={disabled}
          onChange={(event) => onModeChange(event.target.value as TimeRangeMode)}
        >
          <option value="all">فعال در تمام ساعات</option>
          <option value="custom">فقط در ساعات مشخص</option>
        </select>
      </div>
      {value.mode === "custom" && (
        <div className={styles.timeRange}>
          <label className={styles.timeItem}>
            <span>از</span>
            <Input
              type="time"
              value={value.start}
              disabled={disabled}
              onChange={(event) => onStartChange(event.target.value)}
            />
          </label>
          <label className={styles.timeItem}>
            <span>تا</span>
            <Input
              type="time"
              value={value.end}
              disabled={disabled}
              onChange={(event) => onEndChange(event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function GroupGeneralSettingsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [group, setGroup] = useState<ManagedGroup | null>(state.group ?? null);
  const [settings, setSettings] = useState<GroupGeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!groupId) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [general, detail] = await Promise.all([
          fetchGroupGeneralSettings(groupId),
          fetchGroupDetails(groupId),
        ]);
        if (cancelled) {
          return;
        }
        setSettings(general);
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

  const updateSettings = useCallback((patch: Partial<GroupGeneralSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  }, []);

  const updateSchedule = useCallback(
    (
      key:
        | "welcomeSchedule"
        | "warningSchedule"
        | "userVerificationSchedule"
        | "disablePublicCommandsSchedule"
        | "removeJoinLeaveSchedule",
      value: TimeRangeSetting,
    ) => {
      setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
      setDirty(true);
    },
    [],
  );

  const updateAutoWarning = useCallback(
    (patch: Partial<GroupGeneralSettings["autoWarning"]>) => {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              autoWarning: {
                ...prev.autoWarning,
                ...patch,
              },
            }
          : prev,
      );
      setDirty(true);
    },
    [],
  );

  const handleMenuSelect = useCallback(
    (key: string) => {
      if (!groupId) {
        return;
      }
      switch (key) {
        case "home":
          navigate(`/groups/${groupId}`);
          break;
        case "settings":
          break;
        case "bans":
          navigate(`/groups/${groupId}/settings/bans`, { state: { group } });
          break;
        case "mute":
          navigate(`/groups/${groupId}/settings/mute`, { state: { group } });
          break;
        case "limits":
          navigate(`/groups/${groupId}/settings/limits`, { state: { group } });
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
        default:
          console.info(`[general-settings] menu item '${key}' tapped`);
      }
    },
    [groupId, group, navigate],
  );

  const handleSave = useCallback(async () => {
    if (!groupId || !settings) {
      return;
    }
    try {
      setSaving(true);
      await updateGroupGeneralSettings(groupId, settings);
      setDirty(false);
      setToastMessage("تنظیمات با موفقیت ذخیره شد ✅");
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSaving(false);
    }
  }, [groupId, settings]);

  const handleToastClose = useCallback(() => setToastMessage(""), []);

  if (!groupId) {
    return (
      <Placeholder header="شناسه گروه معتبر نیست" description="برای بازگشت دکمه زیر را لمس کن.">
        <Button mode="filled" onClick={() => navigate("/")}>
          بازگشت
        </Button>
      </Placeholder>
    );
  }

  if (loading && !settings) {
    return (
      <div className={styles.loadingState}>
        <Text weight="2">در حال بارگذاری تنظیمات...</Text>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <Placeholder header="خطا در بارگذاری" description={error.message}>
        <Button mode="filled" onClick={() => navigate(-1)}>
          بازگشت
        </Button>
      </Placeholder>
    );
  }

  if (!settings) {
    return null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header} dir="rtl">
        <div className={styles.headerLeft}>
          <Button mode="plain" size="s" onClick={() => navigate(-1)}>
            بازگشت
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
              {group ? group.title : "در حال بارگذاری"}
            </Title>
            <Text weight="2" className={styles.groupSubtitle}>
              تنظیمات عمومی
            </Text>
          </div>
        </div>
        <div className={styles.headerRight}>
          <IconButton aria-label="نمایش ماژول‌ها" onClick={() => setMenuOpen(true)}>
            <span className={styles.burger}>
              <span />
              <span />
              <span />
            </span>
          </IconButton>
        </div>
      </header>

      <main className={styles.body}>
        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>منطقه زمانی</Title>
              <Text weight="2" className={styles.cardHint}>
                همه زمان‌بندی‌ها بر اساس این انتخاب محاسبه می‌شوند.
              </Text>
            </div>
          </div>
          <div className={styles.fieldControl}>
            <select
              className={styles.select}
              value={settings.timezone}
              onChange={(event) => updateSettings({ timezone: event.target.value })}
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>پیام خوش‌آمد</Title>
              <Text weight="2" className={styles.cardHint}>ارسال پیام خوش‌آمد به اعضای جدید.</Text>
            </div>
            <Switch
              checked={settings.welcomeEnabled}
              onChange={(event) => updateSettings({ welcomeEnabled: event.target.checked })}
            />
          </div>
          {settings.welcomeEnabled && (
            <ScheduleSection
              title="محدوده زمانی اجرا"
              value={settings.welcomeSchedule}
              onModeChange={(mode) => updateSchedule("welcomeSchedule", { ...settings.welcomeSchedule, mode })}
              onStartChange={(value) => updateSchedule("welcomeSchedule", { ...settings.welcomeSchedule, start: value })}
              onEndChange={(value) => updateSchedule("welcomeSchedule", { ...settings.welcomeSchedule, end: value })}
            />
          )}
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>رأی‌گیری برای میوت</Title>
              <Text weight="2" className={styles.cardHint}>با رأی اعضا، کاربر خاطی موقتاً میوت می‌شود.</Text>
            </div>
            <Switch
              checked={settings.voteMuteEnabled}
              onChange={(event) => updateSettings({ voteMuteEnabled: event.target.checked })}
            />
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>پیام تذکر</Title>
              <Text weight="2" className={styles.cardHint}>حذف پیام خلاف قوانین و ارسال هشدار در گروه.</Text>
            </div>
            <Switch
              checked={settings.warningEnabled}
              onChange={(event) => updateSettings({ warningEnabled: event.target.checked })}
            />
          </div>
          {settings.warningEnabled && (
            <ScheduleSection
              title="محدوده زمانی اجرا"
              value={settings.warningSchedule}
              onModeChange={(mode) => updateSchedule("warningSchedule", { ...settings.warningSchedule, mode })}
              onStartChange={(value) => updateSchedule("warningSchedule", { ...settings.warningSchedule, start: value })}
              onEndChange={(value) => updateSchedule("warningSchedule", { ...settings.warningSchedule, end: value })}
            />
          )}
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>حالت بی‌صدا</Title>
              <Text weight="2" className={styles.cardHint}>در حالت فعال، پیام‌های ربات بدون اعلان صوتی ارسال می‌شوند.</Text>
            </div>
            <Switch
              checked={settings.silentModeEnabled}
              onChange={(event) => updateSettings({ silentModeEnabled: event.target.checked })}
            />
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>حذف خودکار پیام‌های ربات</Title>
              <Text weight="2" className={styles.cardHint}>پس از گذشت مدت مشخص پیام‌های ربات حذف شوند.</Text>
            </div>
            <Switch
              checked={settings.autoDeleteEnabled}
              onChange={(event) => updateSettings({ autoDeleteEnabled: event.target.checked })}
            />
          </div>
          {settings.autoDeleteEnabled && (
            <div className={styles.fieldRow}>
              <label className={styles.fieldLabel}>زمان حذف (دقیقه)</label>
              <Input
                type="number"
                min={1}
                value={settings.autoDeleteDelayMinutes}
                onChange={(event) => updateSettings({ autoDeleteDelayMinutes: Number(event.target.value) })}
              />
            </div>
          )}
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>محاسبه تخلفات مدیران</Title>
              <Text weight="2" className={styles.cardHint}>در صورت فعال بودن، تخلفات مدیران هم ثبت می‌شود.</Text>
            </div>
            <Switch
              checked={settings.countAdminViolationsEnabled}
              onChange={(event) => updateSettings({ countAdminViolationsEnabled: event.target.checked })}
            />
          </div>
          {settings.countAdminViolationsEnabled && (
            <div className={styles.optionStack}>
              <label className={styles.optionItem}>
                <Switch
                  checked={settings.countAdminsOnly}
                  onChange={(event) => updateSettings({ countAdminsOnly: event.target.checked })}
                />
                <span>فقط تخلفات ثبت شود</span>
              </label>
              <label className={styles.optionItem}>
                <Switch
                  checked={settings.deleteAdminViolations}
                  onChange={(event) => updateSettings({ deleteAdminViolations: event.target.checked })}
                />
                <span>در صورت تخلف، پیام مدیر حذف شود</span>
              </label>
            </div>
          )}
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>احراز هویت کاربران جدید</Title>
              <Text weight="2" className={styles.cardHint}>کاربر تازه‌وارد تا زمان تأیید نمی‌تواند پیام ارسال کند.</Text>
            </div>
            <Switch
              checked={settings.userVerificationEnabled}
              onChange={(event) => updateSettings({ userVerificationEnabled: event.target.checked })}
            />
          </div>
          {settings.userVerificationEnabled && (
            <ScheduleSection
              title="زمان اجرای احراز هویت"
              value={settings.userVerificationSchedule}
              onModeChange={(mode) =>
                updateSchedule("userVerificationSchedule", { ...settings.userVerificationSchedule, mode })
              }
              onStartChange={(value) =>
                updateSchedule("userVerificationSchedule", { ...settings.userVerificationSchedule, start: value })
              }
              onEndChange={(value) =>
                updateSchedule("userVerificationSchedule", { ...settings.userVerificationSchedule, end: value })
              }
            />
          )}
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>دستورات عمومی</Title>
              <Text weight="2" className={styles.cardHint}>از اجرای دستورات عمومی توسط اعضا جلوگیری شود.</Text>
            </div>
            <Switch
              checked={settings.disablePublicCommands}
              onChange={(event) => updateSettings({ disablePublicCommands: event.target.checked })}
            />
          </div>
          {settings.disablePublicCommands && (
            <ScheduleSection
              title="بازه اعمال محدودیت"
              value={settings.disablePublicCommandsSchedule}
              onModeChange={(mode) =>
                updateSchedule("disablePublicCommandsSchedule", {
                  ...settings.disablePublicCommandsSchedule,
                  mode,
                })
              }
              onStartChange={(value) =>
                updateSchedule("disablePublicCommandsSchedule", {
                  ...settings.disablePublicCommandsSchedule,
                  start: value,
                })
              }
              onEndChange={(value) =>
                updateSchedule("disablePublicCommandsSchedule", {
                  ...settings.disablePublicCommandsSchedule,
                  end: value,
                })
              }
            />
          )}
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>حذف پیام‌های ورود و خروج</Title>
              <Text weight="2" className={styles.cardHint}>پیام‌های ورود و خروج کاربران نمایش داده نشود.</Text>
            </div>
            <Switch
              checked={settings.removeJoinLeaveMessages}
              onChange={(event) => updateSettings({ removeJoinLeaveMessages: event.target.checked })}
            />
          </div>
          {settings.removeJoinLeaveMessages && (
            <ScheduleSection
              title="بازه حذف پیام‌ها"
              value={settings.removeJoinLeaveSchedule}
              onModeChange={(mode) =>
                updateSchedule("removeJoinLeaveSchedule", { ...settings.removeJoinLeaveSchedule, mode })
              }
              onStartChange={(value) =>
                updateSchedule("removeJoinLeaveSchedule", { ...settings.removeJoinLeaveSchedule, start: value })
              }
              onEndChange={(value) =>
                updateSchedule("removeJoinLeaveSchedule", { ...settings.removeJoinLeaveSchedule, end: value })
              }
            />
          )}
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>مجازات پیش‌فرض سامانه</Title>
              <Text weight="2" className={styles.cardHint}>
                این مجازات برای سایر ماژول‌ها به‌عنوان پیش‌فرض استفاده می‌شود مگر اینکه override شود.
              </Text>
            </div>
          </div>
          <div className={styles.fieldControl}>
            <select
              className={styles.select}
              value={settings.defaultPenalty}
              onChange={(event) => updateSettings({ defaultPenalty: event.target.value as AutoWarningPenalty })}
            >
              <option value="delete">حذف پیام</option>
              <option value="mute">میوت</option>
              <option value="kick">اخراج</option>
            </select>
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <Title level="3" className={styles.cardTitle}>شمارش اخطار خودکار</Title>
              <Text weight="2" className={styles.cardHint}>پس از عبور از آستانه، مجازات پیش‌فرض فعال می‌شود.</Text>
            </div>
            <Switch
              checked={settings.autoWarningEnabled}
              onChange={(event) => updateSettings({ autoWarningEnabled: event.target.checked })}
            />
          </div>
          {settings.autoWarningEnabled && (
            <div className={styles.autoWarningFields}>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>تعداد مجاز اخطارها</label>
                <Input
                  type="number"
                  min={1}
                  value={settings.autoWarning.threshold}
                  onChange={(event) => updateAutoWarning({ threshold: Number(event.target.value) })}
                />
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>بازه نگهداشت (روز)</label>
                <Input
                  type="number"
                  min={1}
                  value={settings.autoWarning.retentionDays}
                  onChange={(event) => updateAutoWarning({ retentionDays: Number(event.target.value) })}
                />
              </div>
              <div className={styles.fieldRow}>
                <label className={styles.fieldLabel}>مجازات پیش‌فرض اخطار</label>
                <select
                  className={styles.select}
                  value={settings.autoWarning.penalty}
                  onChange={(event) => updateAutoWarning({ penalty: event.target.value as AutoWarningPenalty })}
                >
                  <option value="delete">حذف پیام</option>
                  <option value="mute">میوت</option>
                  <option value="kick">اخراج</option>
                </select>
              </div>
              <ScheduleSection
                title="محدوده زمانی اجرا"
                value={settings.autoWarning.schedule}
                onModeChange={(mode) => updateAutoWarning({ schedule: { ...settings.autoWarning.schedule, mode } })}
                onStartChange={(value) => updateAutoWarning({ schedule: { ...settings.autoWarning.schedule, start: value } })}
                onEndChange={(value) => updateAutoWarning({ schedule: { ...settings.autoWarning.schedule, end: value } })}
              />
            </div>
          )}
        </Card>
      </main>

      <footer className={styles.saveBar}>
        <Button
          mode="filled"
          size="l"
          stretched
          disabled={!dirty || saving}
          onClick={handleSave}
        >
          {saving ? "در حال ذخیره..." : "ذخیره تنظیمات"}
        </Button>
      </footer>

      <GroupMenuDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        activeKey="settings"
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
