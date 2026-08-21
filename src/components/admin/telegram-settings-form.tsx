"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Loader2, Save, Send, XCircle } from "lucide-react";
import { updateTelegramSettings, sendTestMessage, type ActionResult } from "@/app/admin/integrations/telegram/actions";
import type { TelegramSettings } from "@/lib/types/database";

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading font-semibold uppercase text-sm tracking-wider text-text-primary">{title}</h3>
      {children}
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`ns-pill ${ok ? "ns-pill-approved" : "ns-pill-rejected"}`}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-10 px-5">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? "Saving..." : "Save Settings"}
    </Button>
  );
}

export function TelegramSettingsForm({
  settings,
  botConfigured,
  webhookConfigured,
  botUsername,
}: {
  settings: TelegramSettings;
  botConfigured: boolean;
  webhookConfigured: boolean;
  botUsername: string | null;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(updateTelegramSettings, null);
  const [enabled, setEnabled] = useState(settings.notifications_enabled);
  const [testPending, startTestTransition] = useTransition();

  function handleTest(target: "channel" | "self") {
    startTestTransition(async () => {
      const result = await sendTestMessage(target);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Test message sent${target === "channel" ? " to the channel" : " to you"}.`);
    });
  }

  return (
    <div className="space-y-8">
      <FormSection title="Bot Configuration">
        <div className="ns-card rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary">Bot Token</span>
            <StatusPill ok={botConfigured} label={botConfigured ? "Configured" : "Not Configured"} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-primary">Webhook Secret</span>
            <StatusPill ok={webhookConfigured} label={webhookConfigured ? "Configured" : "Not Configured"} />
          </div>
          <p className="text-xs text-muted-foreground pt-1 border-t border-gold/10">
            The bot token and webhook secret are set as environment variables (<code>TELEGRAM_BOT_TOKEN</code>,{" "}
            <code>TELEGRAM_WEBHOOK_SECRET</code>) on your deployment, never in this database — same as every other
            secret this app uses (Supabase, Cloudinary, Sentry). Set them in Vercel → Project Settings → Environment
            Variables, then redeploy. See TELEGRAM.md for the full bot-creation and webhook-registration steps.
            {botUsername && (
              <>
                {" "}
                Bot: <code>@{botUsername}</code>.
              </>
            )}
          </p>
        </div>
      </FormSection>

      <form action={formAction}>
        <FormSection title="Channel & Notifications">
          <input type="hidden" name="notifications_enabled" value={String(enabled)} />
          <div className="ns-card rounded-xl p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Channel ID</Label>
              <Input
                name="channel_id"
                defaultValue={settings.channel_id ?? ""}
                placeholder="@noblestrike or -1001234567890"
                className="ns-input"
              />
              <p className="text-[0.7rem] text-muted-foreground">
                Where broadcasts (tournament announcements, news, registration openings) get posted. The bot must be
                an admin of this channel.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 py-2 border-t border-gold/10">
              <div>
                <p className="text-sm text-text-primary">Enable Notifications</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Global switch — off stops every per-user Telegram notification and channel broadcast, regardless of
                  individual preferences.
                </p>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>
          {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
          {state && "success" in state && <p className="text-sm text-emerald-400">Saved.</p>}
          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </FormSection>
      </form>

      <FormSection title="Test Message">
        <div className="ns-card rounded-xl p-5 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={testPending || !botConfigured}
            onClick={() => handleTest("self")}
            className="ns-btn-outline"
          >
            {testPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Test to Me
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testPending || !botConfigured}
            onClick={() => handleTest("channel")}
            className="ns-btn-outline"
          >
            {testPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send Test to Channel
          </Button>
        </div>
      </FormSection>
    </div>
  );
}
