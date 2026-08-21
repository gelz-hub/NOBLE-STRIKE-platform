import { createClient } from "@/lib/supabase/server";
import { NotificationSettingsForm } from "@/components/settings/notification-settings-form";
import type { Profile } from "@/lib/types/database";

// Telegram account linking (src/components/settings/telegram-link-card.tsx)
// is intentionally not rendered here — hidden from the UI per the Phase 15
// simplification while the backend (linking tokens, the consume RPC,
// telegram_id/username/linked_at columns) stays fully intact for future
// use. See TELEGRAM.md.
export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return <NotificationSettingsForm profile={profile as Profile} />;
}
