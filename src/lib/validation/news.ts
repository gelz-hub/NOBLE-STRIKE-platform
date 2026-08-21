import { z } from "zod";

export const NEWS_CATEGORIES = [
  "ANNOUNCEMENT",
  "TOURNAMENT",
  "RESULTS",
  "MAINTENANCE",
  "UPDATE",
  "COMMUNITY",
] as const;

export const NEWS_CATEGORY_LABELS: Record<(typeof NEWS_CATEGORIES)[number], string> = {
  ANNOUNCEMENT: "Announcement",
  TOURNAMENT: "Tournament",
  RESULTS: "Results",
  MAINTENANCE: "Maintenance",
  UPDATE: "Update",
  COMMUNITY: "Community",
};

export const NEWS_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export function slugifyTitle(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const newsSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters.").max(150),
  slug: z
    .string()
    .trim()
    .min(2, "Slug must be at least 2 characters.")
    .max(160)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  excerpt: z.string().trim().max(300).optional(),
  content: z.string().trim().min(20, "Content must be at least 20 characters."),
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
