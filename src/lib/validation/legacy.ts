import { z } from "zod";

export const LEGACY_EVENT_CATEGORIES = ["TOURNAMENT", "COMMUNITY"] as const;
export const LEGACY_EVENT_STATUSES = ["COMPLETED", "ARCHIVED", "UPCOMING"] as const;

/**
 * Display labels for each category live under the `legacy.category.*`
 * translation namespace (key = lowercased category, e.g. `legacy.category.tournament`).
 * This map only carries the key shape / enum values — call sites should
 * resolve the label via `t(\`legacy.category.${category.toLowerCase()}\`)`
 * (or an equivalent `useTranslations("legacy.category")` scoped hook)
 * instead of reading English text from here.
 */
export const LEGACY_EVENT_CATEGORY_LABEL_KEYS: Record<(typeof LEGACY_EVENT_CATEGORIES)[number], string> = {
  TOURNAMENT: "legacy.category.tournament",
  COMMUNITY: "legacy.category.community",
};

function optionalInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export const legacyEventSchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2000, "validation.legacy.invalidYear")
    .max(2100, "validation.legacy.invalidYear"),
  title_en: z.string().trim().min(2, "validation.legacy.titleTooShort").max(150),
  title_km: z.string().trim().max(150).optional(),
  category: z.enum(LEGACY_EVENT_CATEGORIES),
  status: z.enum(LEGACY_EVENT_STATUSES),
  event_date_label: z.string().trim().max(60).optional(),
  game: z.string().trim().max(60).optional(),
  teams_label: z.string().trim().max(20).optional(),
  teams_max: z.string().trim().transform(optionalInt).optional(),
  format: z.string().trim().max(30).optional(),
  organized_by: z.string().trim().max(80).optional(),
  live_broadcast: z.enum(["true", "false"]).transform((v) => v === "true"),
  entry_fee: z.string().trim().max(40).optional(),
  tournament_mode: z.string().trim().max(60).optional(),
  prize_pool_label: z.string().trim().max(40).optional(),
  prize_pool_max: z.string().trim().transform(optionalNumber).optional(),
  champion: z.string().trim().max(80).optional(),
  runner_up: z.string().trim().max(80).optional(),
  top_3_4: z.string().trim().max(300).optional(),
  support_team: z.string().trim().max(80).optional(),
  description_en: z.string().trim().max(500).optional(),
  description_km: z.string().trim().max(500).optional(),
  cover_image_url: z.union([z.string().url(), z.literal("")]).optional(),
  gallery_urls: z.array(z.string().url()).optional(),
  display_order: z.string().trim().transform(optionalInt).optional(),
  is_published: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export type LegacyEventInput = z.infer<typeof legacyEventSchema>;

/** "Team A, Team B" -> ["Team A", "Team B"], dropping empties. */
export function parseTop34(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}
