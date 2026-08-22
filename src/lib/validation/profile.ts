import { z } from "zod";

export const MAX_SOCIAL_LINKS = 6;

export const SOCIAL_PLATFORMS = [
  "Twitter/X",
  "Instagram",
  "YouTube",
  "Twitch",
  "TikTok",
  "Facebook",
  "Website",
  "Other",
] as const;

const usernamePattern = /^[a-zA-Z0-9_]{3,20}$/;

// Zod messages are dot-path translation keys (optionally `key|param` for a
// message needing a dynamic value), resolved at the call site — see the
// `firstIssue` helper in src/app/settings/actions.ts, same convention as
// src/lib/validation/team.ts / legacy.ts.
export const socialLinkSchema = z.object({
  platform: z.string().trim().min(1).max(30),
  url: z.string().trim().url("validation.profile.invalidUrl"),
});

export const profileSettingsSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(usernamePattern, "validation.profile.invalidUsername"),
  display_name: z.string().trim().max(50, "validation.profile.displayNameTooLong").optional(),
  country: z.string().trim().max(56).optional(),
  bio: z.string().trim().max(500, "validation.profile.bioTooLong").optional(),
  discord_username: z.string().trim().max(40).optional(),
  avatar_url: z.union([z.string().url(), z.literal("")]).optional(),
  banner_url: z.union([z.string().url(), z.literal("")]).optional(),
  social_links: z.array(socialLinkSchema).max(MAX_SOCIAL_LINKS, `validation.profile.maxSocialLinks|${MAX_SOCIAL_LINKS}`),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;

export const notificationPreferencesSchema = z.object({
  notify_tournament: z.boolean(),
  notify_match: z.boolean(),
  notify_news: z.boolean(),
  notify_system: z.boolean(),
  notify_email: z.boolean(),
  notify_telegram: z.boolean(),
});

export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;

export const privacySettingsSchema = z.object({
  privacy_public_profile: z.boolean(),
  privacy_show_teams: z.boolean(),
  privacy_show_match_history: z.boolean(),
  privacy_show_discord: z.boolean(),
});

export type PrivacySettingsInput = z.infer<typeof privacySettingsSchema>;

export const appearanceSettingsSchema = z.object({
  theme_preference: z.enum(["dark", "light", "system"]),
});

export type AppearanceSettingsInput = z.infer<typeof appearanceSettingsSchema>;
