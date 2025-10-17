import { retrieveLaunchParams } from '@telegram-apps/sdk-react';

let cachedInitData: string | null | undefined;

export function getTelegramInitData(): string | null {
  if (cachedInitData !== undefined) {
    return cachedInitData;
  }

  const telegram = (window as typeof window & { Telegram?: { WebApp?: { initData?: string } } }).Telegram;
  const fromTelegram = telegram?.WebApp?.initData;
  if (typeof fromTelegram === 'string') {
    const trimmed = fromTelegram.trim();
    if (trimmed.length > 0) {
      cachedInitData = trimmed;
      return cachedInitData;
    }
  }

  try {
    const params = retrieveLaunchParams();
    const data = params.tgWebAppData as unknown;
    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (trimmed.length > 0) {
        cachedInitData = trimmed;
        return cachedInitData;
      }
    } else if (data && typeof (data as URLSearchParams).toString === 'function') {
      const trimmed = (data as URLSearchParams).toString().trim();
      if (trimmed.length > 0) {
        cachedInitData = trimmed;
        return cachedInitData;
      }
    }
  } catch {
    // ignore errors; fall back to null
  }

  cachedInitData = null;
  return cachedInitData;
}

export type InvoiceOutcome = 'paid' | 'cancelled' | 'failed' | 'external';

export async function openTelegramInvoice(invoiceLink: string): Promise<InvoiceOutcome> {
  const telegram = (window as typeof window & {
    Telegram?: { WebApp?: { openInvoice?: (link: string, callback?: (status: string) => void) => unknown } };
  }).Telegram;
  const webApp = telegram?.WebApp;

  if (!webApp || typeof webApp.openInvoice !== 'function') {
    window.open(invoiceLink, '_blank', 'noopener,noreferrer');
    return 'external';
  }

  const openInvoiceFn = webApp.openInvoice as (link: string, callback?: (status: string) => void) => unknown;

  return new Promise<InvoiceOutcome>((resolve) => {
    try {
      const maybePromise = openInvoiceFn.call(webApp, invoiceLink, (status: string) => {
        if (status === 'paid' || status === 'cancelled' || status === 'failed') {
          resolve(status);
        } else {
          resolve('failed');
        }
      });

      if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
        (maybePromise as Promise<unknown>)
          .then(() => {
            // callback already handled outcome
          })
          .catch(() => {
            resolve('failed');
          });
      }
    } catch {
      window.open(invoiceLink, '_blank', 'noopener,noreferrer');
      resolve('external');
    }
  });
}
