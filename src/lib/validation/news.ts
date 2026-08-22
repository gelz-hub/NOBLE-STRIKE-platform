import { z } from "zod";

export const NEWS_CATEGORIES = [
  "ANNOUNCEMENT",
  "TOURNAMENT",
  "RESULTS",
  "MAINTENANCE",
  "UPDATE",
  "COMMUNITY",
] as const;

/**
 * Display labels for each category live under the `news.category.*`
 * translation namespace (key = lowercased category, e.g. `news.category.announcement`).
 * This map only carries the key shape / enum values — call sites should
 * resolve the label via `t(\`news.category.${category.toLowerCase()}\`)`
 * (or an equivalent `useTranslations("news.category")` scoped hook)
 * instead of reading English text from here.
 */
export const NEWS_CATEGORY_LABEL_KEYS: Record<(typeof NEWS_CATEGORIES)[number], string> = {
  ANNOUNCEMENT: "news.category.announcement",
  TOURNAMENT: "news.category.tournament",
  RESULTS: "news.category.results",
  MAINTENANCE: "news.category.maintenance",
  UPDATE: "news.category.update",
  COMMUNITY: "news.category.community",
};

export const NEWS_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export function slugifyTitle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Zod messages below are dot-path translation keys (e.g.
// "validation.news.titleTooShort"), not literal English error text — see
// src/app/admin/news/actions.ts's `firstIssue()` for how they get resolved
// to a display string via next-intl.
export const newsSchema = z.object({
  title_en: z.string().trim().min(2, "validation.news.titleTooShort").max(150),
  title_km: z.string().trim().max(150).optional(),
  slug: z
    .string()
    .trim()
    .min(2, "validation.news.slugTooShort")
    .max(160)
    .regex(/^[a-z0-9-]+$/, "validation.news.slugInvalid"),
  excerpt_en: z.string().trim().max(300).optional(),
  excerpt_km: z.string().trim().max(300).optional(),
  content_en: z.string().trim().min(20, "validation.news.contentTooShort"),
  content_km: z.string().trim().optional(),
  category: z.enum(NEWS_CATEGORIES),
  status: z.enum(NEWS_STATUSES),
  featured: z.enum(["true", "false"]).transform((v) => v === "true"),
  pinned: z.enum(["true", "false"]).transform((v) => v === "true"),
  image_url: z.union([z.string().url(), z.literal("")]).optional(),
  publish_at: z.string().optional(),
  seo_description: z.string().trim().max(300).optional(),
  seo_keywords: z.string().trim().max(300).optional(),
  tournament_id: z.string().uuid().optional().or(z.literal("")),
});

export type NewsInput = z.infer<typeof newsSchema>;
