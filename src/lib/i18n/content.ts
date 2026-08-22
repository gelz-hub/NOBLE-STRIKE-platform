import type { Locale } from "@/i18n/config";

/**
 * Reads a bilingual CMS field (`${field}_en` / `${field}_km`) for the given
 * locale, falling back to the English value whenever the Khmer field is
 * missing or blank.
 */
export function pickLocalized<Row extends object>(row: Row, field: string, locale: Locale): string {
  const record = row as Record<string, unknown>;
  const en = (record[`${field}_en`] as string | null | undefined) ?? "";
  if (locale === "en") return en;
  const km = record[`${field}_km`] as string | null | undefined;
  return km && km.trim().length > 0 ? km : en;
}
