import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "../helpers/mock-supabase";

const sendTelegramMessage = vi.fn(async (chatId: number | string, text: string) => ({ ok: true, chatId, text }));
vi.mock("@/lib/telegram/client", () => ({
  sendTelegramMessage: (chatId: number | string, text: string) => sendTelegramMessage(chatId, text),
}));

const { createNotification } = await import("@/lib/notifications");

function seedProfile(prefs: Partial<Record<string, unknown>>) {
  return createMockSupabase({
    profiles: [{ id: "user-1", notify_tournament: true, notify_match: true, notify_news: true, notify_system: true, ...prefs }],
    notifications: [],
    telegram_settings: [{ id: true, notifications_enabled: true }],
  });
}

describe("createNotification (preference gating)", () => {
  it("delivers a notification when the category preference is on", async () => {
    const supabase = seedProfile({ notify_match: true });
    await createNotification(supabase as never, "user-1", "Match Live", "Your match started.", "match");
    expect(supabase._tables.notifications).toHaveLength(1);
    expect((supabase._tables.notifications[0] as Record<string, unknown>).title).toBe("Match Live");
  });

  it("skips the notification when the category preference is off", async () => {
    const supabase = seedProfile({ notify_match: false });
    await createNotification(supabase as never, "user-1", "Match Live", "Your match started.", "match");
    expect(supabase._tables.notifications).toHaveLength(0);
  });

  it("checks the right column per category — tournament off doesn't block a match notification", async () => {
    const supabase = seedProfile({ notify_tournament: false, notify_match: true });
    await createNotification(supabase as never, "user-1", "Match Live", "x", "match");
    expect(supabase._tables.notifications).toHaveLength(1);
  });

  it("checks the right column per category — match off doesn't block a news notification", async () => {
    const supabase = seedProfile({ notify_match: false, notify_news: true });
    await createNotification(supabase as never, "user-1", "News Published", "x", "news");
    expect(supabase._tables.notifications).toHaveLength(1);
  });

  it("defaults to the system category when none is passed", async () => {
    const supabase = seedProfile({ notify_system: false });
    await createNotification(supabase as never, "user-1", "System notice", "x");
    expect(supabase._tables.notifications).toHaveLength(0);
  });

  it("delivers when the recipient's preference row can't be found (fail open, never silently drop)", async () => {
    const supabase = createMockSupabase({ profiles: [], notifications: [] });
    await createNotification(supabase as never, "unknown-user", "Hello", "x", "system");
    expect(supabase._tables.notifications).toHaveLength(1);
  });
});

describe("createNotification (Telegram fan-out)", () => {
  beforeEach(() => sendTelegramMessage.mockClear());

  it("sends a Telegram message when linked, opted in, category on, and globally enabled", async () => {
    const supabase = seedProfile({ notify_telegram: true, telegram_id: 555 });
    await createNotification(supabase as never, "user-1", "Match Live", "x", "match");
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessage).toHaveBeenCalledWith(555, expect.stringContaining("Match Live"));
  });

  it("does not send when the account isn't linked", async () => {
    const supabase = seedProfile({ notify_telegram: true, telegram_id: null });
    await createNotification(supabase as never, "user-1", "Match Live", "x", "match");
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("does not send when notify_telegram is off, even if linked", async () => {
    const supabase = seedProfile({ notify_telegram: false, telegram_id: 555 });
    await createNotification(supabase as never, "user-1", "Match Live", "x", "match");
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("does not send when the category preference itself is off", async () => {
    const supabase = seedProfile({ notify_telegram: true, telegram_id: 555, notify_match: false });
    await createNotification(supabase as never, "user-1", "Match Live", "x", "match");
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("does not send when the global admin kill-switch is off", async () => {
    const supabase = createMockSupabase({
      profiles: [{ id: "user-1", notify_tournament: true, notify_match: true, notify_news: true, notify_system: true, notify_telegram: true, telegram_id: 555 }],
      notifications: [],
      telegram_settings: [{ id: true, notifications_enabled: false }],
    });
    await createNotification(supabase as never, "user-1", "Match Live", "x", "match");
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it("still inserts the in-app notification even when Telegram delivery is skipped", async () => {
    const supabase = seedProfile({ notify_telegram: false, telegram_id: 555 });
    await createNotification(supabase as never, "user-1", "Match Live", "x", "match");
    expect(supabase._tables.notifications).toHaveLength(1);
  });
});
