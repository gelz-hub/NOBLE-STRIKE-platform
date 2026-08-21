import { createClient } from "@/lib/supabase/server";
import { ProfileSettingsForm } from "@/components/settings/profile-settings-form";
import type { Profile } from "@/lib/types/database";

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return <ProfileSettingsForm profile={profile as Profile} />;
}
