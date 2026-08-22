"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateNotificationPreferences, type ActionResult } from "@/app/settings/actions";
import { ToggleRow } from "@/components/settings/toggle-row";
import type { Profile } from "@/lib/types/database";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("settings.notifications");
  const tCommon = useTranslations("common");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-11 px-6">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? tCommon("saving") : t("saveChanges")}
    </Button>
  );
}

export function NotificationSettingsForm({ profile }: { profile: Profile }) {
  const t = useTranslations("settings.notifications");
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
          label={t("tournament.label")}
          description={t("tournament.description")}
          checked={tournament}
          onCheckedChange={setTournament}
        />
        <ToggleRow
          label={t("match.label")}
          description={t("match.description")}
          checked={match}
          onCheckedChange={setMatch}
        />
        <ToggleRow
          label={t("news.label")}
          description={t("news.description")}
          checked={news}
          onCheckedChange={setNews}
        />
        <ToggleRow
          label={t("system.label")}
          description={t("system.description")}
          checked={system}
          onCheckedChange={setSystem}
        />
        <ToggleRow
          label={t("email.label")}
          description={t("email.description")}
          checked={email}
          onCheckedChange={setEmail}
        />
      </div>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-emerald-400">{t("saved")}</p>}

      <div className="flex justify-end pt-2 border-t border-gold/10">
        <SubmitButton />
      </div>
    </form>
  );
}
