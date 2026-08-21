import { createClient } from "@/lib/supabase/server";
import { PrivacySettingsForm } from "@/components/settings/privacy-settings-form";
import type { Profile } from "@/lib/types/database";

export default async function PrivacySettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return <PrivacySettingsForm profile={profile as Profile} />;
}
