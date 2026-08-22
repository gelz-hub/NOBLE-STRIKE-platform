import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { getTelegramLocale, tTelegram, type TelegramLocale } from "@/lib/telegram/i18n";
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

/**
 * Looks up the locale of the profile (if any) linked to this Telegram chat.
 * Uses get_telegram_profile_locale(), a SECURITY DEFINER RPC (see
 * supabase/migrations/0020_telegram_locale_rpcs.sql) — same reasoning as
 * consume_telegram_link_token(): the webhook has no Supabase Auth session,
 * so a plain RLS-guarded select isn't an option. Defaults to 'en' when the
 * chat hasn't linked a profile yet (or the lookup fails).
 */
async function getLocaleForChat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  telegramId: number
): Promise<TelegramLocale> {
  const { data } = await supabase.rpc("get_telegram_profile_locale", { p_telegram_id: telegramId });
  const row = Array.isArray(data) ? data[0] : undefined;
  return getTelegramLocale(row?.locale as string | null | undefined);
}

async function handleUpdate(update: unknown) {
  const u = update as TelegramUpdate;
  const text = u.message?.text?.trim();
  const chatId = u.message?.chat?.id;
  const fromId = u.message?.from?.id;
  const fromUsername = u.message?.from?.username ?? null;

  if (!text || !chatId || !fromId) return;

  const supabase = await createClient();

  if (text.startsWith("/start")) {
    const token = text.slice("/start".length).trim();
    const locale = await getLocaleForChat(supabase, fromId);

    if (!token) {
      await sendTelegramMessage(chatId, tTelegram(locale, "welcome"));
      return;
    }

    const { data, error } = await supabase.rpc("consume_telegram_link_token", {
      p_token: token,
      p_telegram_id: fromId,
      p_telegram_username: fromUsername,
    });

    const linkedUserId = Array.isArray(data) ? data[0]?.linked_user_id : undefined;

    if (error || !linkedUserId) {
      await sendTelegramMessage(chatId, tTelegram(locale, "linkExpired"));
      return;
    }

    logEvent({ event: "telegram.account_linked", userId: linkedUserId, telegramId: fromId });
    // Re-fetch: the linking RPC doesn't return locale, and the newly-linked
    // profile might already carry a non-default preference (e.g. set from
    // the dashboard before ever touching the bot).
    const linkedLocale = await getLocaleForChat(supabase, fromId);
    await sendTelegramMessage(chatId, tTelegram(linkedLocale, "linkSuccess"));
    return;
  }

  if (text === "/help") {
    const locale = await getLocaleForChat(supabase, fromId);
    await sendTelegramMessage(chatId, tTelegram(locale, "help"));
    return;
  }

  if (text.startsWith("/language")) {
    const arg = text.slice("/language".length).trim().toLowerCase();
    const currentLocale = await getLocaleForChat(supabase, fromId);

    if (!arg) {
      await sendTelegramMessage(chatId, tTelegram(currentLocale, "languageUsage"));
      return;
    }

    if (arg !== "en" && arg !== "km") {
      await sendTelegramMessage(chatId, tTelegram(currentLocale, "languageUnknown"));
      return;
    }

    // Persists only if this chat is already linked to a profile (the RPC
    // no-ops and returns no row otherwise) — but we still reply in the
    // requested language either way, per spec: nothing to save yet for an
    // unlinked chat isn't an error.
    const { data, error } = await supabase.rpc("set_telegram_profile_locale", {
      p_telegram_id: fromId,
      p_locale: arg,
    });
    const updatedUserId = Array.isArray(data) ? data[0]?.updated_user_id : undefined;
    if (error) {
      logError(error, { event: "telegram.set_locale_failed", telegramId: fromId });
    } else if (updatedUserId) {
      logEvent({ event: "telegram.locale_changed", userId: updatedUserId, locale: arg });
    }

    await sendTelegramMessage(chatId, tTelegram(arg, "languageSet"));
  }
}
