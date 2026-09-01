import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import en from "../../locales/en.json";
import km from "../../locales/km.json";
import { mergeMessages } from "@/lib/i18n/merge";
import { defaultLocale, isLocale, localeCookieName } from "./config";

// The Khmer tree is deep-merged over the English one so any key not yet
// translated in km.json falls back to its English value. `mergeMessages` is
// shared with the client provider (src/components/i18n/i18n-provider.tsx) so
// both sides build the exact same tree.
const MESSAGES = {
  en,
  km: mergeMessages(en, km),
} as const;

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  return { locale, messages: MESSAGES[locale] };
});
