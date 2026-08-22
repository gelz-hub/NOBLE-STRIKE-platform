export const locales = ["en", "km"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeCookieName = "ns_locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}
