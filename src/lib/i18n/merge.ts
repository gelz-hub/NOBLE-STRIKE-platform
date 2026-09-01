import type en from "../../../locales/en.json";

export type Messages = typeof en;

/**
 * Deep-merges `override` over `base` key by key, recursively. Any key present
 * in `base` but missing (or not yet translated) in `override` silently falls
 * back to its `base` value instead of `next-intl` throwing a missing-message
 * error or rendering blank. Used both server-side (`src/i18n/request.ts`) and
 * client-side (`src/components/i18n/i18n-provider.tsx`) so the two produce an
 * identical message tree — a hydration mismatch here would surface as flashing
 * English text on a Khmer first paint.
 */
export function mergeMessages(
  base: Messages,
  override: Record<string, unknown>
): Messages {
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
      result[key] = mergeMessages(
        baseValue as Messages,
        overrideValue as Record<string, unknown>
      );
    } else {
      result[key] = overrideValue;
    }
  }
  return result as Messages;
}
