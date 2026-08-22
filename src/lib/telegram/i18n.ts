/**
 * Telegram bot locale dictionary.
 *
 * The bot (src/app/api/telegram/webhook/route.ts) is plain server-side TS —
 * no React, no next-intl — so it can't use useTranslations()/getTranslations()
 * the way the rest of the app does. This is a small standalone
 * Record<locale, Record<key, string>> instead, following the same pattern as
 * MLBB_ROLE_LABELS/HOK_ROLE_LABELS in src/lib/validation/team.ts.
 *
 * The English/Khmer copy for the keys that already existed in the next-intl
 * locale files (locales/en.json / locales/km.json, "telegram" namespace) is
 * copied here verbatim so there's one visual source of truth for that text;
 * this file does not import next-intl or those JSON files, so the bot has
 * no runtime dependency on next-intl/React.
 */

export type TelegramLocale = "en" | "km";

export interface TelegramDictionary {
  /** Reply to a bare /start (no token) — instructions for account linking. */
  welcome: string;
  /** Reply to /help. */
  help: string;
  /** Reply to /start <token> when the token is missing/expired/already used. */
  linkExpired: string;
  /** Reply to /start <token> on a successful link. */
  linkSuccess: string;
  /** Reply to /language <code> once the switch has taken effect. */
  languageSet: string;
  /** Reply to a bare /language (no argument), or as part of an unrecognized-code error. */
  languageUsage: string;
  /** Reply to /language <code> when <code> isn't "en" or "km". */
  languageUnknown: string;
}

export const TELEGRAM_DICTIONARY: Record<TelegramLocale, TelegramDictionary> = {
  en: {
    welcome:
      "Welcome to the NOBLE STRIKE bot! Use /language to switch between English and Khmer. Link your account from your dashboard's Settings → Notifications page, then tap the link it gives you.",
    help: "Send /language en or /language km to change your language.",
    linkExpired: "This link has expired. Please request a new one from your dashboard.",
    linkSuccess: "Your Telegram account is now linked to NOBLE STRIKE.",
    languageSet: "Language set to English.",
    languageUsage: "Usage: /language en or /language km",
    languageUnknown: "Unrecognized language. Usage: /language en or /language km",
  },
  km: {
    welcome:
      "សូមស្វាគមន៍មកកាន់ bot NOBLE STRIKE! ប្រើ /language ដើម្បីប្ដូររវាងភាសាអង់គ្លេស និងខ្មែរ។ ភ្ជាប់គណនីរបស់អ្នកពីទំព័រ Settings → Notifications នៃផ្ទាំងគ្រប់គ្រងរបស់អ្នក រួចចុចលើតំណដែលវាផ្ដល់ឱ្យ។",
    help: "ផ្ញើ /language en ឬ /language km ដើម្បីប្ដូរភាសារបស់អ្នក។",
    linkExpired: "តំណនេះបានផុតកំណត់។ សូមស្នើសុំតំណថ្មីពីផ្ទាំងគ្រប់គ្រងរបស់អ្នក។",
    linkSuccess: "គណនី Telegram របស់អ្នកត្រូវបានភ្ជាប់ជាមួយ NOBLE STRIKE ហើយ។",
    languageSet: "ភាសាត្រូវបានកំណត់ជាភាសាខ្មែរ។",
    languageUsage: "របៀបប្រើ៖ /language en ឬ /language km",
    languageUnknown: "មិនស្គាល់ភាសានេះទេ។ របៀបប្រើ៖ /language en ឬ /language km",
  },
};

/** Defaults anything unrecognized (null, undefined, a stray value) to 'en'. */
export function getTelegramLocale(locale: string | null | undefined): TelegramLocale {
  return locale === "km" ? "km" : "en";
}

/** Convenience accessor: t("en", "welcome") / t(getTelegramLocale(profile?.locale), "welcome"). */
export function tTelegram(locale: TelegramLocale, key: keyof TelegramDictionary): string {
  return TELEGRAM_DICTIONARY[locale][key];
}
