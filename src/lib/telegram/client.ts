import { logEvent } from "@/lib/logger";

/**
 * Thin wrapper over the Telegram Bot API's sendMessage. No SDK dependency —
 * it's a single POST endpoint, not worth a package. Fails silently (logs
 * and returns ok:false) rather than throwing: a Telegram delivery failure
 * must never break the underlying action (a tournament still gets created,
 * a registration still gets approved) that triggered the notification —
 * same "fail open" philosophy as rate limiting (see DEPLOYMENT.md).
 */

export interface TelegramSendResult {
  ok: boolean;
  error?: string;
}

function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

export function isTelegramConfigured(): boolean {
  return !!botToken();
}

async function callTelegramApi(
  method: string,
  body: Record<string, unknown>
): Promise<TelegramSendResult> {
  const token = botToken();
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN is not set." };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      const error = data?.description || `Telegram API error (${res.status})`;
      logEvent({ event: "telegram.send_failed", level: "warn", method, error });
      return { ok: false, error };
    }
    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    logEvent({ event: "telegram.send_failed", level: "warn", method, error });
    return { ok: false, error };
  }
}

/** Sends a direct message to a linked user's Telegram chat (their
 *  telegram_id doubles as their private chat id with the bot). */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string
): Promise<TelegramSendResult> {
  return callTelegramApi("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: false });
}

/** Same call, semantically distinct entry point for channel broadcasts
 *  (admin-triggered, not per-user notification fan-out) — see
 *  admin/integrations/telegram/actions.ts. */
export async function sendTelegramChannelMessage(
  channelId: string,
  text: string
): Promise<TelegramSendResult> {
  return callTelegramApi("sendMessage", { chat_id: channelId, text, parse_mode: "HTML", disable_web_page_preview: false });
}
