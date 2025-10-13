const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API_BASE = `https://api.telegram.org`;

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN environment variable is required to call the Telegram Bot API");
}

type TelegramApiRequestOptions = {
  method: string;
  payload?: Record<string, unknown>;
};

type TelegramApiResponse<T> = {
  ok: boolean;
  result?: T;
  description?: string;
};

function callTelegramApi<T>(options: TelegramApiRequestOptions): Promise<T> {
  const method = options.method.trim();
  const url = new URL(`${TELEGRAM_API_BASE}/bot${BOT_TOKEN}/${method}`);
  const body = options.payload ? JSON.stringify(options.payload) : "";

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  })
    .then(async (res) => {
      const raw = await res.text();
      if (!res.ok) {
        throw new Error(`Telegram API responded with HTTP ${res.status}: ${raw}`);
      }
      const parsed = JSON.parse(raw) as TelegramApiResponse<T>;
      if (!parsed.ok || parsed.result === undefined) {
        const message = parsed.description ?? `Telegram API method ${method} failed`;
        throw new Error(message);
      }
      return parsed.result;
    });
}

export type InvoicePrice = {
  label: string;
  amount: number;
};

export type CreateInvoiceLinkOptions = {
  title: string;
  description: string;
  payload: string;
  currency: string;
  prices: InvoicePrice[];
  photoUrl?: string;
  maxTipAmount?: number;
  suggestedTipAmounts?: number[];
  providerData?: Record<string, unknown>;
};

export async function createInvoiceLink(options: CreateInvoiceLinkOptions): Promise<string> {
  const result = await callTelegramApi<string>({
    method: "createInvoiceLink",
    payload: {
      title: options.title,
      description: options.description,
      payload: options.payload,
      currency: options.currency,
      prices: options.prices.map((item) => ({
        label: item.label,
        amount: item.amount,
      })),
      photo_url: options.photoUrl,
      max_tip_amount: options.maxTipAmount,
      suggested_tip_amounts: options.suggestedTipAmounts,
      provider_data: options.providerData ? JSON.stringify(options.providerData) : undefined,
    },
  });
  return result;
}

export async function refundStarsPayment(options: { userId: number; telegramPaymentChargeId: string }): Promise<boolean> {
  const result = await callTelegramApi<boolean>({
    method: "refundStarPayment",
    payload: {
      user_id: options.userId,
      telegram_payment_charge_id: options.telegramPaymentChargeId,
    },
  });
  return result;
}
