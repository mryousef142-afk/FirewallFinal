import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { logger } from "../../utils/logger.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
const MAX_AGE_SECONDS = Number.parseInt(process.env.API_INITDATA_MAX_AGE ?? "600", 10);

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN environment variable must be set before using Telegram authentication middleware");
}

type TelegramUserPayload = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
};

type TelegramInitContext = {
  userId: string;
  user: TelegramUserPayload;
  rawInitData: string;
  chat?: {
    id: number;
    type?: string;
    title?: string;
  };
};

declare module "express-serve-static-core" {
  interface Request {
    telegramAuth?: TelegramInitContext;
  }
}

function getRawInitData(req: Request): string | null {
  const headerValue = req.header("x-telegram-init-data") ?? req.header("X-Telegram-Init-Data");
  if (headerValue && typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  const queryValue = typeof req.query.initData === "string" ? req.query.initData.trim() : null;
  if (queryValue && queryValue.length > 0) {
    return queryValue;
  }
  return null;
}

function computeSecretKey(): Buffer {
  return crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN!).digest();
}

function verifySignature(rawInitData: string): URLSearchParams {
  const params = new URLSearchParams(rawInitData);
  const receivedHash = params.get("hash");
  if (!receivedHash) {
    throw new Error("InitData missing hash parameter");
  }
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = computeSecretKey();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (computedHash !== receivedHash) {
    throw new Error("InitData signature mismatch");
  }

  return params;
}

function parseInitData(params: URLSearchParams): TelegramInitContext {
  const userRaw = params.get("user");
  if (!userRaw) {
    throw new Error("InitData missing user payload");
  }

  let user: TelegramUserPayload;
  try {
    user = JSON.parse(userRaw) as TelegramUserPayload;
  } catch {
    throw new Error("Failed to parse user payload");
  }

  if (!user.id) {
    throw new Error("InitData user payload missing id");
  }

  const authDate = Number.parseInt(params.get("auth_date") ?? "0", 10);
  if (Number.isNaN(authDate) || authDate <= 0) {
    throw new Error("InitData contains invalid auth_date");
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (nowSeconds - authDate > MAX_AGE_SECONDS) {
    throw new Error("InitData has expired");
  }

  const chatPayload = params.get("chat_instance") && params.get("chat")
    ? safeParseChat(params.get("chat")!)
    : undefined;

  return {
    user,
    userId: user.id.toString(),
    rawInitData: params.toString(),
    chat: chatPayload,
  };
}

function safeParseChat(rawChat: string): TelegramInitContext["chat"] {
  try {
    const parsed = JSON.parse(rawChat) as { id: number; type?: string; title?: string };
    if (!parsed || typeof parsed.id !== "number") {
      return undefined;
    }
    return {
      id: parsed.id,
      type: parsed.type,
      title: parsed.title,
    };
  } catch {
    return undefined;
  }
}

export function requireTelegramInitData() {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawInitData = getRawInitData(req);
    if (!rawInitData) {
      res.status(401).json({ error: "Missing Telegram init data" });
      return;
    }

    try {
      const params = verifySignature(rawInitData);
      const context = parseInitData(params);
      req.telegramAuth = {
        ...context,
        rawInitData,
      };
      next();
    } catch (error) {
      logger.warn("telegram init validation failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(401).json({ error: "Invalid Telegram init data" });
    }
  };
}
