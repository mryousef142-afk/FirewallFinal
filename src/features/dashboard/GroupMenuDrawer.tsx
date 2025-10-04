import { Button, Text } from "@telegram-apps/telegram-ui";

import { classNames } from "@/css/classnames.ts";

import styles from "./GroupMenuDrawer.module.css";

type MenuItem = {
  key: string;
  icon: string;
  label: string;
};

type GroupMenuDrawerProps = {
  open: boolean;
  onClose: () => void;
  activeKey?: string;
  onSelect?: (key: string) => void;
};

const MENU_ITEMS: MenuItem[] = [
  { key: "home", icon: "🏠", label: "صفحه اصلی" },
  { key: "settings", icon: "⚙️", label: "تنظیمات عمومی" },
  { key: "bans", icon: "🚫", label: "ممنوعیت‌ها" },
  { key: "limits", icon: "📏", label: "محدودیت‌های مبتنی بر شمارش" },
  { key: "mute", icon: "🔕", label: "خاموشی‌ها" },
  { key: "mandatory", icon: "📌", label: "عضویت‌های اجباری" },
  { key: "texts", icon: "📝", label: "متن‌های سفارشی" },
  { key: "analytics", icon: "📊", label: "آمار" },
  { key: "stars", icon: "⭐", label: "شارژ با استارز" },
  { key: "giveaway", icon: "🎉", label: "گیواوی" },
];

export function GroupMenuDrawer({ open, onClose, activeKey = "home", onSelect }: GroupMenuDrawerProps) {
  return (
    <div className={classNames(styles.overlay, open && styles.overlayVisible)}>
      <div className={classNames(styles.drawer, open && styles.drawerVisible)} dir="rtl">
        <div className={styles.header}>
          <Text weight="2">ماژول‌های مدیریتی</Text>
          <Button mode="plain" size="s" onClick={onClose}>
            بستن
          </Button>
        </div>
        <div className={styles.list}>
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={classNames(styles.item, activeKey === item.key && styles.itemActive)}
              onClick={() => {
                onSelect?.(item.key);
                onClose();
              }}
            >
              <span className={styles.itemIcon}>{item.icon}</span>
              <span className={styles.itemLabel}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


