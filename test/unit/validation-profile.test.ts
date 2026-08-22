import { describe, it, expect } from "vitest";
import {
  profileSettingsSchema,
  notificationPreferencesSchema,
  privacySettingsSchema,
  appearanceSettingsSchema,
} from "@/lib/validation/profile";

describe("profileSettingsSchema", () => {
  const base = {
    username: "nightshade",
    social_links: [],
  };

  it("accepts a minimal valid profile", () => {
    expect(profileSettingsSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a username that's too short", () => {
    expect(profileSettingsSchema.safeParse({ ...base, username: "ab" }).success).toBe(false);
  });

  it("rejects a username with invalid characters", () => {
    expect(profileSettingsSchema.safeParse({ ...base, username: "night shade!" }).success).toBe(false);
  });

  it("rejects a bio over 500 characters", () => {
    expect(profileSettingsSchema.safeParse({ ...base, bio: "x".repeat(501) }).success).toBe(false);
  });

  it("rejects more than the max social links", () => {
    const social_links = Array.from({ length: 7 }, () => ({ platform: "Twitter/X", url: "https://x.com/a" }));
    expect(profileSettingsSchema.safeParse({ ...base, social_links }).success).toBe(false);
  });

  it("rejects a social link with a non-URL value", () => {
    expect(
      profileSettingsSchema.safeParse({ ...base, social_links: [{ platform: "Twitter/X", url: "not-a-url" }] })
        .success
    ).toBe(false);
  });
});

describe("notificationPreferencesSchema", () => {
  it("requires all six preference booleans", () => {
    const result = notificationPreferencesSchema.safeParse({
      notify_tournament: true,
      notify_match: false,
      notify_news: true,
      notify_system: true,
      notify_email: false,
      notify_telegram: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing field", () => {
    const result = notificationPreferencesSchema.safeParse({
      notify_tournament: true,
      notify_match: false,
      notify_news: true,
      notify_system: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("privacySettingsSchema", () => {
  it("accepts a full set of privacy booleans", () => {
    const result = privacySettingsSchema.safeParse({
      privacy_public_profile: true,
      privacy_show_teams: false,
      privacy_show_match_history: true,
      privacy_show_telegram: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("appearanceSettingsSchema", () => {
  it("accepts dark, light, and system", () => {
    for (const theme of ["dark", "light", "system"]) {
      expect(appearanceSettingsSchema.safeParse({ theme_preference: theme }).success).toBe(true);
    }
  });

  it("rejects an unknown theme value", () => {
    expect(appearanceSettingsSchema.safeParse({ theme_preference: "sepia" }).success).toBe(false);
  });
});
