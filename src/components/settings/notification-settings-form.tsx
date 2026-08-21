"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateNotificationPreferences, type ActionResult } from "@/app/settings/actions";
import { ToggleRow } from "@/components/settings/toggle-row";
import type { Profile } from "@/lib/types/database";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-11 px-6">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? "Saving..." : "Save Changes"}
    </Button>
  );
}

export function NotificationSettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    updateNotificationPreferences,
    null
  );
  const [tournament, setTournament] = useState(profile.notify_tournament);
  const [match, setMatch] = useState(profile.notify_match);
  const [news, setNews] = useState(profile.notify_news);
  const [system, setSystem] = useState(profile.notify_system);
  const [email, setEmail] = useState(profile.notify_email);
  // Telegram notification preference is intentionally not exposed as a
  // toggle here — the linking UI is hidden (see TELEGRAM.md), so there's
  // nothing for a user to link this to. The backend column/gating logic
  // stays fully functional; this hidden input just carries the existing
  // stored value through unchanged so the schema still validates.
  const telegram = profile.notify_telegram;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="notify_tournament" value={String(tournament)} />
      <input type="hidden" name="notify_match" value={String(match)} />
      <input type="hidden" name="notify_news" value={String(news)} />
      <input type="hidden" name="notify_system" value={String(system)} />
      <input type="hidden" name="notify_email" value={String(email)} />
      <input type="hidden" name="notify_telegram" value={String(telegram)} />

      <div className="ns-card rounded-xl p-5">
        <ToggleRow
          label="Tournament Notifications"
          description="Registration approvals, rejections, and status changes."
          checked={tournament}
          onCheckedChange={setTournament}
        />
        <ToggleRow
          label="Match Notifications"
          description="Scheduling, results, and dispute activity."
          checked={match}
          onCheckedChange={setMatch}
        />
        <ToggleRow
          label="News Notifications"
          description="Major announcements and tournament news."
          checked={news}
          onCheckedChange={setNews}
        />
        <ToggleRow
          label="System Notifications"
          description="Platform-wide updates and account activity."
          checked={system}
          onCheckedChange={setSystem}
        />
        <ToggleRow
          label="Email Notifications"
          description="Future-ready — stored now, no emails are sent yet."
          checked={email}
          onCheckedChange={setEmail}
        />
      </div>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-emerald-400">Saved.</p>}

      <div className="flex justify-end pt-2 border-t border-gold/10">
        <SubmitButton />
      </div>
    </form>
  );
}
