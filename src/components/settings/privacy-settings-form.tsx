"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updatePrivacySettings, type ActionResult } from "@/app/settings/actions";
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

export function PrivacySettingsForm({ profile }: { profile: Profile }) {
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
          label="Public Profile"
          description="Off hides your profile page from everyone but you and admins, and excludes you from Player Search."
          checked={publicProfile}
          onCheckedChange={setPublicProfile}
        />
        <ToggleRow
          label="Show Teams"
          description="Display your Current/Captain/Coach team memberships on your public profile."
          checked={showTeams}
          onCheckedChange={setShowTeams}
        />
        <ToggleRow
          label="Show Match History"
          description="Display tournament stats, achievements, and recent matches."
          checked={showMatchHistory}
          onCheckedChange={setShowMatchHistory}
        />
        <ToggleRow
          label="Show Discord"
          description="Display your Discord username on your public profile."
          checked={showDiscord}
          onCheckedChange={setShowDiscord}
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
