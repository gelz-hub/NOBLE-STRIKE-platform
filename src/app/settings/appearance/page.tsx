import { createClient } from "@/lib/supabase/server";
import { AppearanceSettingsForm } from "@/components/settings/appearance-settings-form";

export default async function AppearanceSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("theme_preference")
    .eq("id", user!.id)
    .single();

  return <AppearanceSettingsForm initialTheme={profile?.theme_preference ?? "dark"} />;
}
