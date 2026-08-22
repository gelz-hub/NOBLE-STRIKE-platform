import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import en from "../../locales/en.json";
import km from "../../locales/km.json";
import { defaultLocale, isLocale, localeCookieName } from "./config";

type Messages = typeof en;

// Deep-merges km over en so any Khmer key that hasn't been translated yet
// silently falls back to its English value instead of showing missing-
// message errors or blank text.
function mergeMessages(base: Messages, override: Record<string, unknown>): Messages {
  const result: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const baseValue = (base as Record<string, unknown>)[key];
    const overrideValue = override[key];
    if (
      baseValue &&
      overrideValue &&
      typeof baseValue === "object" &&
      typeof overrideValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      result[key] = mergeMessages(baseValue as Messages, overrideValue as Record<string, unknown>);
    } else {
      result[key] = overrideValue;
    }
  }
  return result as Messages;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;

  const messages = locale === "km" ? mergeMessages(en, km) : en;

  return { locale, messages };
});
