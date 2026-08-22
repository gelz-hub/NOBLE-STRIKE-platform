"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updatePrivacySettings, type ActionResult } from "@/app/settings/actions";
import { ToggleRow } from "@/components/settings/toggle-row";
import type { Profile } from "@/lib/types/database";

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations("settings.privacy");
  const tCommon = useTranslations("common");
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-11 px-6">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      {pending ? tCommon("saving") : t("saveChanges")}
    </Button>
  );
}

export function PrivacySettingsForm({ profile }: { profile: Profile }) {
  const t = useTranslations("settings.privacy");
  const [state, formAction] = useActionState<ActionResult | null, FormData>(updatePrivacySettings, null);
  const [publicProfile, setPublicProfile] = useState(profile.privacy_public_profile);
  const [showTeams, setShowTeams] = useState(profile.privacy_show_teams);
  const [showMatchHistory, setShowMatchHistory] = useState(profile.privacy_show_match_history);
  const [showDiscord, setShowDiscord] = useState(profile.privacy_show_discord);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="privacy_public_profile" value={String(publicProfile)} />
      <input type="hidden" name="privacy_show_teams" value={String(showTeams)} />
      <input type="hidden" name="privacy_show_match_history" value={String(showMatchHistory)} />
      <input type="hidden" name="privacy_show_discord" value={String(showDiscord)} />

      <div className="ns-card rounded-xl p-5">
        <ToggleRow
          label={t("publicProfile.label")}
          description={t("publicProfile.description")}
          checked={publicProfile}
          onCheckedChange={setPublicProfile}
        />
        <ToggleRow
          label={t("showTeams.label")}
          description={t("showTeams.description")}
          checked={showTeams}
          onCheckedChange={setShowTeams}
        />
        <ToggleRow
          label={t("showMatchHistory.label")}
          description={t("showMatchHistory.description")}
          checked={showMatchHistory}
          onCheckedChange={setShowMatchHistory}
        />
        <ToggleRow
          label={t("showDiscord.label")}
          description={t("showDiscord.description")}
          checked={showDiscord}
          onCheckedChange={setShowDiscord}
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
