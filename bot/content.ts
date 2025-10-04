import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface BotContent {
  buttons: {
    addToGroup: string;
    channel: string;
    commands: string;
    info: string;
    inlinePanel: string;
    managementPanel: string;
    miniApp: string;
  };
  messages: {
    channel: string;
    commands: string;
    info: string;
    inlinePanel: string;
    managementPanel: string;
    managementQuestion: string;
    welcome: string;
  };
}

const fallbackContent: BotContent = {
  messages: {
    welcome: "سلام! به فایروال بات خوش آمدی!",
    managementPanel: "از اینجا می‌توانی گروه‌هات را کنترل کنی.",
    managementQuestion: "ربات را چطور می‌خواهی تنظیم کنی؟",
    channel: "معرفی کانال و امکانات آن به زودی از طریق پنل مالک تنظیم می‌شود.",
    commands: "لیست دستورات به زودی اینجا در دسترس خواهد بود.",
    info: "اطلاعات بیشتر ربات بعد از تکمیل پنل مدیریتی ارائه می‌شود.",
    inlinePanel: "مسیر پنل درون‌گروهی بزودی فعال می‌شود."
  },
  buttons: {
    addToGroup: "➕ Add to Group",
    managementPanel: "🎛 Management Panel",
    channel: "📢 Channel",
    commands: "📚 Commands",
    info: "💬 Info",
    miniApp: "Mini App",
    inlinePanel: "Inline Panel"
  }
};

export function loadBotContent(): BotContent {
  const filePath = resolve(dirname(fileURLToPath(import.meta.url)), "content.json");

  try {
    const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(raw) as Partial<BotContent>;

    return {
      messages: {
        ...fallbackContent.messages,
        ...(parsed.messages ?? {})
      },
      buttons: {
        ...fallbackContent.buttons,
        ...(parsed.buttons ?? {})
      }
    };
  } catch (error) {
    console.warn("[bot] Falling back to default content due to:", error);
    return fallbackContent;
  }
}
