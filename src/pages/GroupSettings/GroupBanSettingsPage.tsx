import { useCallback, useEffect, useMemo, useState } from "react";
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
  fetchGroupBanSettings,
  fetchGroupDetails,
  updateGroupBanSettings,
} from "@/features/dashboard/api.ts";
import type {
  BanRuleKey,
  BanRuleSetting,
  GroupBanSettings,
  ManagedGroup,
  TimeRangeMode,
  TimeRangeSetting,
} from "@/features/dashboard/types.ts";

import styles from "./GroupBanSettingsPage.module.css";

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

type KeywordListCardProps = {
  title: string;
  description: string;
  value: string[];
  onChange: (next: string[]) => void;
  onImport: () => void;
  onExport: () => void;
};

function KeywordListCard({ title, description, value, onChange, onImport, onExport }: KeywordListCardProps) {
  const lines = value.length;

  return (
    <Card className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <Title level="3" className={styles.cardTitle}>
            {title}
          </Title>
          <Text weight="2" className={styles.cardHint}>
            {description}
          </Text>
        </div>
        <div className={styles.keywordActions}>
          <Button mode="outline" size="s" onClick={onImport}>
            وارد کردن
          </Button>
          <Button mode="outline" size="s" onClick={onExport}>
            کپی خروجی
          </Button>
        </div>
      </div>
      <Textarea
        className={styles.textarea}
        rows={6}
        placeholder="هر خط یک کلمه یا عبارت"
        value={value.join("\n")}
        onChange={(event) => {
          const next = event.target.value
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
          onChange(next);
        }}
      />
      <Text weight="2" className={styles.keywordMeta}>
        {lines} خط ثبت شده
      </Text>
    </Card>
  );
}

type BanRuleDefinition = {
  key: BanRuleKey;
  title: string;
  description: string;
  category: string;
  icon?: string;
};

const BAN_RULE_DEFINITIONS: BanRuleDefinition[] = [
  { key: "banLinks", title: "حذف لینک‌ها", description: "تمام URL ها و لینک‌ها حذف می‌شوند.", category: "links", icon: "🔗" },
  { key: "banBots", title: "حذف ربات‌ها", description: "پیام‌های ارسال شده توسط ربات‌ها مسدود می‌شود.", category: "links", icon: "🤖" },
  { key: "banBotInviters", title: "اخراج ادکننده ربات‌ها", description: "کاربری که ربات اضافه کند از گروه اخراج می‌شود.", category: "links", icon: "⚡" },
  { key: "banDomains", title: "ممنوعیت دامنه", description: "پیام‌های شامل آدرس سایت حذف می‌شوند.", category: "links", icon: "🌐" },
  { key: "banUsernames", title: "ممنوعیت نام کاربری", description: "منشن @username مجاز نیست.", category: "links", icon: "@" },
  { key: "banHashtags", title: "ممنوعیت هشتگ", description: "پیام‌های شامل # حذف می‌شوند.", category: "text", icon: "#" },
  { key: "banTextPatterns", title: "ممنوعیت الگوهای متنی", description: "الگوهای خاص متن اجازه انتشار ندارند.", category: "text", icon: "📝" },
  { key: "banForward", title: "ممنوعیت فوروارد", description: "هیچ پیام فوروارد شده‌ای مجاز نیست.", category: "interaction", icon: "🔁" },
  { key: "banForwardChannels", title: "ممنوعیت فوروارد از کانال", description: "فقط فوروارد از کانال‌ها محدود می‌شود.", category: "interaction", icon: "📣" },
  { key: "banPhotos", title: "ممنوعیت تصویر", description: "ارسال عکس ممنوع است.", category: "media", icon: "🖼️" },
  { key: "banStickers", title: "ممنوعیت استیکر", description: "استفاده از استیکر مجاز نیست.", category: "media", icon: "🥲" },
  { key: "banEmojis", title: "ممنوعیت ایموجی", description: "پیام‌های دارای ایموجی حذف می‌شوند.", category: "text", icon: "😀" },
  { key: "banEmojiOnly", title: "ممنوعیت پیام فقط ایموجی", description: "پیام‌هایی که فقط از ایموجی تشکیل شده‌اند حذف می‌شوند.", category: "text", icon: "😶" },
  { key: "banLocation", title: "ممنوعیت لوکیشن", description: "ارسال موقعیت مکانی محدود است.", category: "media", icon: "📍" },
  { key: "banPhones", title: "ممنوعیت شماره تلفن", description: "پیام‌های حاوی شماره تلفن حذف می‌شوند.", category: "text", icon: "📞" },
  { key: "banAudio", title: "ممنوعیت موزیک", description: "فایل‌های صوتی (آهنگ) مسدود می‌شوند.", category: "media", icon: "🎵" },
  { key: "banVoice", title: "ممنوعیت وویس", description: "ارسال پیام صوتی مجاز نیست.", category: "media", icon: "🎙️" },
  { key: "banFiles", title: "ممنوعیت فایل", description: "فایل‌ها و اسناد (docs) حذف می‌شوند.", category: "media", icon: "📁" },
  { key: "banApps", title: "ممنوعیت پیام اپلیکیشن", description: "پیام‌های مربوط به بازی/اپ بلاک می‌شوند.", category: "interaction", icon: "🕹️" },
  { key: "banGif", title: "ممنوعیت GIF", description: "ارسال گیف مجاز نیست.", category: "media", icon: "🎞️" },
  { key: "banPolls", title: "ممنوعیت نظرسنجی", description: "ساخت Poll در گروه ممنوع است.", category: "interaction", icon: "📊" },
  { key: "banInlineKeyboards", title: "ممنوعیت کلید شیشه‌ای", description: "پیام‌های دارای دکمه Inline حذف می‌شود.", category: "interaction", icon: "🪟" },
  { key: "banGames", title: "ممنوعیت بازی‌ها", description: "پیام‌های Game محدود می‌شوند.", category: "interaction", icon: "🎲" },
  { key: "banSlashCommands", title: "ممنوعیت Slash Commands", description: "دستورات /command قابل استفاده نیست.", category: "interaction", icon: "/" },
  { key: "banCaptionless", title: "ممنوعیت پست بدون متن", description: "پیام‌های تصویری بدون کپشن حذف می‌شوند.", category: "media", icon: "📝" },
  { key: "banLatin", title: "ممنوعیت حروف لاتین", description: "حروف انگلیسی در پیام‌ها مجاز نیست.", category: "language", icon: "A" },
  { key: "banPersian", title: "ممنوعیت حروف فارسی/عربی", description: "نوشتار فارسی یا عربی محدود می‌شود.", category: "language", icon: "ف" },
  { key: "banCyrillic", title: "ممنوعیت حروف روسی", description: "حروف سیریلیک حذف می‌شوند.", category: "language", icon: "Я" },
  { key: "banChinese", title: "ممنوعیت حروف چینی", description: "کاراکترهای چینی مجاز نیست.", category: "language", icon: "文" },
  { key: "banUserReplies", title: "ممنوعیت پاسخ کاربران", description: "کاربران عادی نمی‌توانند به هم پاسخ دهند.", category: "interaction", icon: "💬" },
  { key: "banCrossReplies", title: "ممنوعیت پاسخ به چت‌های دیگر", description: "پاسخ به پیام از گروه‌های دیگر مسدود می‌شود.", category: "interaction", icon: "🧵" },
];

const CATEGORY_GROUPS = [
  { id: "links", title: "لینک‌ها و آی‌دی" },
  { id: "text", title: "متن و نشانه‌ها" },
  { id: "media", title: "رسانه و فایل" },
  { id: "interaction", title: "تعاملات" },
  { id: "language", title: "زبان‌ها" },
  { id: "advanced", title: "پیشرفته" },
];

export function GroupBanSettingsPage() {
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  const [group, setGroup] = useState<ManagedGroup | null>(state.group ?? null);
  const [settings, setSettings] = useState<GroupBanSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  const groupedRules = useMemo(() => {
    const map = new Map<string, BanRuleDefinition[]>();
    BAN_RULE_DEFINITIONS.forEach((rule) => {
      const bucket = map.get(rule.category) ?? [];
      bucket.push(rule);
      map.set(rule.category, bucket);
    });
    return CATEGORY_GROUPS.map((category) => ({
      ...category,
      rules: map.get(category.id) ?? [],
    })).filter((category) => category.rules.length > 0);
  }, []);

  useEffect(() => {
    if (!groupId) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const [banSettings, detail] = await Promise.all([
          fetchGroupBanSettings(groupId),
          fetchGroupDetails(groupId),
        ]);
        if (cancelled) {
          return;
        }
        setSettings(banSettings);
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

  const updateRule = useCallback((key: BanRuleKey, patch: Partial<BanRuleSetting>) => {
    setSettings((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        rules: {
          ...prev.rules,
          [key]: {
            ...prev.rules[key],
            ...patch,
          },
        },
      };
    });
    setDirty(true);
  }, []);

  const updateRuleSchedule = useCallback(
    (key: BanRuleKey, schedule: TimeRangeSetting) => {
      updateRule(key, { schedule });
    },
    [updateRule],
  );

  const updateKeywordList = useCallback(
    (type: "blacklist" | "whitelist", list: string[]) => {
      setSettings((prev) => (prev ? { ...prev, [type]: list } : prev));
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
          navigate(`/groups/${groupId}/settings/general`, { state: { group } });
          break;
        case "bans":
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
          console.info(`[ban-settings] menu item '${key}' tapped`);
      }
    },
    [groupId, group, navigate],
  );

  const handleImportList = useCallback(
    (type: "blacklist" | "whitelist") => {
      const value = window.prompt("کلمات را با جداکننده خط وارد کن:", "");
      if (value === null) {
        return;
      }
      const next = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      updateKeywordList(type, next);
      setToastMessage("لیست با موفقیت جایگزین شد ✅");
    },
    [updateKeywordList],
  );

  const handleExportList = useCallback(
    async (type: "blacklist" | "whitelist") => {
      if (!settings) {
        return;
      }
      const text = settings[type].join("\n");
      try {
        await navigator.clipboard.writeText(text);
        setToastMessage("لیست در کلیپ‌بورد ذخیره شد ✅");
      } catch (err) {
        console.error("clipboard error", err);
        setToastMessage("کپی در کلیپ‌بورد ناموفق بود ❌");
      }
    },
    [settings],
  );

  const handleSave = useCallback(async () => {
    if (!groupId || !settings) {
      return;
    }
    try {
      setSaving(true);
      await updateGroupBanSettings(groupId, settings);
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
        <Text weight="2">در حال بارگذاری قوانین...</Text>
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
              قوانین ممنوعیت محتوا
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
        <div className={styles.sections}>
          {groupedRules.map((category) => (
            <details key={category.id} className={styles.section} open>
              <summary className={styles.sectionSummary}>{category.title}</summary>
              <div className={styles.sectionContent}>
                {category.rules.map((rule) => {
                  const ruleSetting = settings.rules[rule.key];
                  return (
                    <Card key={rule.key} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <div>
                          <Title level="3" className={styles.cardTitle}>
                            {rule.icon && <span className={styles.cardIcon}>{rule.icon}</span>}
                            {rule.title}
                          </Title>
                          <Text weight="2" className={styles.cardHint}>
                            {rule.description}
                          </Text>
                        </div>
                        <Switch
                          checked={ruleSetting.enabled}
                          onChange={(event) => updateRule(rule.key, { enabled: event.target.checked })}
                        />
                      </div>
                      {ruleSetting.enabled && (
                        <ScheduleSection
                          title="محدوده زمانی اجرا"
                          value={ruleSetting.schedule}
                          onModeChange={(mode) =>
                            updateRuleSchedule(rule.key, { ...ruleSetting.schedule, mode })
                          }
                          onStartChange={(value) =>
                            updateRuleSchedule(rule.key, { ...ruleSetting.schedule, start: value })
                          }
                          onEndChange={(value) =>
                            updateRuleSchedule(rule.key, { ...ruleSetting.schedule, end: value })
                          }
                        />
                      )}
                    </Card>
                  );
                })}
              </div>
            </details>
          ))}
        </div>

        <KeywordListCard
          title="کلمات ممنوعه"
          description="پیام شامل هر یک از این کلمات حذف می‌شود."
          value={settings.blacklist}
          onChange={(list) => updateKeywordList("blacklist", list)}
          onImport={() => handleImportList("blacklist")}
          onExport={() => handleExportList("blacklist")}
        />

        <KeywordListCard
          title="کلمات ضروری"
          description="پیام باید حداقل یکی از این کلمات را داشته باشد."
          value={settings.whitelist}
          onChange={(list) => updateKeywordList("whitelist", list)}
          onImport={() => handleImportList("whitelist")}
          onExport={() => handleExportList("whitelist")}
        />
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
        activeKey="bans"
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




