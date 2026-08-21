import { createClient } from "@/lib/supabase/server";
import { AccountSettingsForm } from "@/components/settings/account-settings-form";

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AccountSettingsForm currentEmail={user?.email ?? ""} />;
}
