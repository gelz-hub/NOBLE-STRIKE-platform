import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { logEvent, logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Telegram calls this on every update to the bot (currently: /start <token>
 * for account linking — the only inbound command this bot supports).
 *
 * Security: Telegram doesn't sign webhook payloads with an HMAC the way
 * Stripe/GitHub do. Its documented equivalent is a secret token you choose
 * when calling setWebhook(secret_token=...) — Telegram echoes it back on
 * every subsequent call as the X-Telegram-Bot-Api-Secret-Token header, and
 * anyone who can't produce it isn't Telegram. That's what's verified below,
 * with a constant-time comparison (a naive `===` on a secret invites a
 * timing side-channel).
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expectedSecret) {
    logEvent({ event: "telegram.webhook_unconfigured", level: "warn" });
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const providedSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!timingSafeEqual(providedSecret, expectedSecret)) {
    logEvent({ event: "telegram.webhook_rejected", level: "warn", reason: "bad_secret" });
    // 401 tells an attacker nothing useful; Telegram itself never sends a
    // request without the header once secret_token is configured on setWebhook.
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await handleUpdate(update);
  } catch (err) {
    logError(err, { event: "telegram.webhook_handler_error" });
    // Still 200 — Telegram retries on non-2xx, and a handler bug shouldn't
    // cause it to hammer this endpoint with the same failing update.
  }

  return NextResponse.json({ ok: true });
}

interface TelegramUpdate {
  message?: {
    text?: string;
    chat?: { id: number };
    from?: { id: number; username?: string };
  };
}

async function handleUpdate(update: unknown) {
  const u = update as TelegramUpdate;
  const text = u.message?.text?.trim();
  const chatId = u.message?.chat?.id;
  const fromId = u.message?.from?.id;
  const fromUsername = u.message?.from?.username ?? null;

  if (!text || !chatId || !fromId) return;

  if (text.startsWith("/start")) {
    const token = text.slice("/start".length).trim();
    if (!token) {
      await sendTelegramMessage(
        chatId,
        "Welcome to NOBLE STRIKE. Link your account from your dashboard's Settings → Notifications page, then tap the link it gives you."
      );
      return;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("consume_telegram_link_token", {
      p_token: token,
      p_telegram_id: fromId,
      p_telegram_username: fromUsername,
    });

    const linkedUserId = Array.isArray(data) ? data[0]?.linked_user_id : undefined;

    if (error || !linkedUserId) {
      await sendTelegramMessage(
        chatId,
        "That link has expired or was already used. Go back to Settings → Notifications and generate a new link."
      );
      return;
    }

    logEvent({ event: "telegram.account_linked", userId: linkedUserId, telegramId: fromId });
    await sendTelegramMessage(
      chatId,
      "Your Telegram account is linked. You'll get notifications here based on your preferences in Settings → Notifications."
    );
  }
}
