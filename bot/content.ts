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
    welcome: "Hi there! Welcome to Firewall Bot!",
    managementPanel: "You can control your groups from here.",
    managementQuestion: "How would you like to configure the bot?",
    channel: "Channel introductions and features will be available soon from the owner panel.",
    commands: "The command list will be published here shortly.",
    info: "More information will appear once the management dashboard is ready.",
    inlinePanel: "The in-group panel route will be enabled soon."
  },
  buttons: {
    addToGroup: "Add to Group",
    managementPanel: "Management Panel",
    channel: "Channel",
    commands: "Commands",
    info: "About",
    miniApp: "Open Mini App",
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
