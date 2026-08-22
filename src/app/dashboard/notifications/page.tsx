import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { MarkAllReadButton } from "@/components/dashboard/mark-all-read-button";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/database";

export default async function NotificationsPage() {
  const t = await getTranslations("dashboard.notifications");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const notifications = (data ?? []) as Notification[];
  const unreadCount = notifications.filter((n) => !n.read_status).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <BellOff className="w-8 h-8 text-gold/50" />
          <p className="text-white/70">{t("noNotifications")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "ns-card rounded-lg p-4 flex items-start gap-3",
                !n.read_status && "border-gold/40"
              )}
            >
              <Bell
                className={cn(
                  "w-4 h-4 mt-0.5 shrink-0",
                  n.read_status ? "text-muted-foreground" : "text-gold"
                )}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{n.title}</p>
                <p className="text-sm text-white/70 mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read_status && (
                <span className="ml-auto w-2 h-2 rounded-full bg-gold shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
