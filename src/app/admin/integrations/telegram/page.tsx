import { createClient } from "@/lib/supabase/server";
import { TelegramSettingsForm } from "@/components/admin/telegram-settings-form";
import { isTelegramConfigured } from "@/lib/telegram/client";
import type { TelegramSettings } from "@/lib/types/database";

export default async function TelegramIntegrationPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("telegram_settings").select("*").eq("id", true).single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-extrabold text-2xl text-text-primary">Telegram Integration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bot configuration, channel broadcasts, and notification delivery.
        </p>
      </div>
      <TelegramSettingsForm
        settings={(settings as TelegramSettings) ?? { id: true, channel_id: null, notifications_enabled: true, updated_by: null, updated_at: "" }}
        botConfigured={isTelegramConfigured()}
        webhookConfigured={!!process.env.TELEGRAM_WEBHOOK_SECRET}
        botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? null}
      />
    </div>
  );
}
