"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_status: true }).eq("id", notificationId);
  revalidatePath("/dashboard/notifications");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ read_status: true })
    .eq("user_id", user.id)
    .eq("read_status", false);
  revalidatePath("/dashboard/notifications");
}
