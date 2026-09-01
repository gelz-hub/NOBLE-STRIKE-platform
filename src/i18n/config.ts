export const locales = ["en", "km"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeCookieName = "ns_locale";

// NOBLE STRIKE is a Cambodia-based org with an EN/KM audience but no
// per-user timezone. Pinning one keeps server and client `next-intl`
// date/time formatting identical (avoids the ENVIRONMENT_FALLBACK warning
// and any SSR/client markup mismatch). Must match the value passed to the
// client provider in src/components/i18n/i18n-provider.tsx.
export const timeZone = "Asia/Phnom_Penh";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
