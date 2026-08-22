import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

let mockClient: ReturnType<typeof createMockSupabase>;
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mockClient }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: () => {
    // Mirrors Next's real behavior of aborting execution after redirect(),
    // without depending on Next's internal error machinery.
    throw new Error("NEXT_REDIRECT");
  },
}));

const { createNews, updateNews, unpublishNews } = await import("@/app/admin/news/actions");

function seed(role: "admin" | "user" = "admin", profiles: Record<string, unknown>[] = []) {
  mockClient = createMockSupabase(
    {
      profiles: [{ id: "admin-1", role }, ...profiles],
      news: [],
      notifications: [],
    },
    { authUserId: "admin-1" }
  );
}

function draftForm(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  const defaults: Record<string, string> = {
    title_en: "Season 2 Registration Opens",
    slug: "season-2-registration-opens",
    content_en: "Registration for Season 2 is now open to all teams across the region.",
    category: "TOURNAMENT",
    status: "DRAFT",
    featured: "false",
    pinned: "false",
  };
  for (const [k, v] of Object.entries({ ...defaults, ...overrides })) fd.set(k, v);
  return fd;
}

describe("News publication workflow", () => {
  beforeEach(() => vi.clearAllMocks());

  it("an admin can create a draft article with no notification sent", async () => {
    seed("admin");
    await expect(createNews(null, draftForm())).rejects.toThrow("NEXT_REDIRECT"); // createNews redirects on success
    expect(mockClient._tables.news).toHaveLength(1);
    expect((mockClient._tables.news[0] as Record<string, unknown>).status).toBe("DRAFT");
    expect(mockClient._tables.notifications).toHaveLength(0);
  });

  it("a non-admin cannot create news", async () => {
    seed("user");
    const result = await createNews(null, draftForm());
    expect(result).toEqual({ error: "Admin access required." });
    expect(mockClient._tables.news).toHaveLength(0);
  });

  it("publishing a TOURNAMENT-category article broadcasts a notification to every profile", async () => {
    seed("admin", [{ id: "user-1", notify_news: true }, { id: "user-2", notify_news: true }]);
    await expect(createNews(null, draftForm({ status: "PUBLISHED" }))).rejects.toThrow("NEXT_REDIRECT");

    const notifs = mockClient._tables.notifications as Record<string, unknown>[];
    // 3 recipients: admin-1, user-1, user-2.
    expect(notifs).toHaveLength(3);
    expect(notifs.every((n) => n.title === "Tournament Announcement Published")).toBe(true);
  });

  it("publishing an ANNOUNCEMENT-category article uses the major-announcement title", async () => {
    seed("admin", [{ id: "user-1", notify_news: true }]);
    await expect(
      createNews(null, draftForm({ category: "ANNOUNCEMENT", status: "PUBLISHED" }))
    ).rejects.toThrow("NEXT_REDIRECT");
    const notifs = mockClient._tables.notifications as Record<string, unknown>[];
    expect(notifs.every((n) => n.title === "Major Announcement Published")).toBe(true);
  });

  it("editing a draft into PUBLISHED fires the notification exactly once (transition-gated)", async () => {
    seed("admin", [{ id: "user-1", notify_news: true }]);
    await expect(createNews(null, draftForm())).rejects.toThrow("NEXT_REDIRECT");
    const created = (mockClient._tables.news as Record<string, unknown>[])[0];

    const result = await updateNews(created.id as string, null, draftForm({ status: "PUBLISHED" }));
    expect(result).toEqual({ success: true });
    expect(mockClient._tables.notifications).toHaveLength(2); // admin-1 + user-1

    // Editing again while already published must NOT re-fire the notification.
    await updateNews(created.id as string, null, draftForm({ status: "PUBLISHED", title: "Updated title" }));
    expect(mockClient._tables.notifications).toHaveLength(2); // unchanged
  });

  it("unpublishing moves a PUBLISHED article back to DRAFT", async () => {
    seed("admin");
    await expect(createNews(null, draftForm({ status: "PUBLISHED" }))).rejects.toThrow("NEXT_REDIRECT");
    const created = (mockClient._tables.news as Record<string, unknown>[])[0];

    const result = await unpublishNews(created.id as string);
    expect(result).toEqual({ success: true });
    expect(created.status).toBe("DRAFT");
  });

  it("rejects a title that's too short", async () => {
    seed("admin");
    const result = await createNews(null, draftForm({ title_en: "x" }));
    expect("error" in result).toBe(true);
  });
});
