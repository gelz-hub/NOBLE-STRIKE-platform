"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TeamMonogram } from "@/components/ns/ui";
import { createClient } from "@/lib/supabase/client";
import { REQUIRED_ROLES } from "@/lib/validation/team";
import { Crown, Loader2, ShieldCheck, ShieldX, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { registerTeamForTournament } from "@/app/dashboard/registrations/actions";
import { trackEvent } from "@/lib/analytics";

interface TeamOption {
  id: string;
  team_name: string;
  logo_url: string | null;
  memberCount: number;
  captainName: string | null;
  rosterComplete: boolean;
  alreadyRegistered: boolean;
}

export function RegisterTeamModal({
  tournamentId,
  trigger,
}: {
  tournamentId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: myTeams } = await supabase
        .from("teams")
        .select("id, team_name, logo_url")
        .eq("owner_id", user.id);

      const { data: existingRegs } = await supabase
        .from("tournament_registrations")
        .select("team_id, status")
        .eq("tournament_id", tournamentId);

      const options: TeamOption[] = [];
      for (const team of myTeams ?? []) {
        const { data: members } = await supabase
          .from("team_members")
          .select("role, player_name, is_captain")
          .eq("team_id", team.id);
        const roles = new Set((members ?? []).map((m) => m.role));
        const rosterComplete = REQUIRED_ROLES.every((r) => roles.has(r));
        const captain = (members ?? []).find((m) => m.is_captain);
        const existing = existingRegs?.find((r) => r.team_id === team.id);
        options.push({
          id: team.id,
          team_name: team.team_name,
          logo_url: team.logo_url,
          memberCount: members?.length ?? 0,
          captainName: captain?.player_name ?? null,
          rosterComplete,
          alreadyRegistered: existing?.status === "PENDING" || existing?.status === "APPROVED",
        });
      }
      setTeams(options);
      setLoading(false);
    })();
  }, [open, tournamentId]);

  function handleConfirm() {
    if (!selectedId) return;
    startTransition(async () => {
      const result = await registerTeamForTournament(selectedId, tournamentId);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      trackEvent("tournament_registration_submitted", { tournamentId });
      toast.success("Team registered! Your registration is pending review.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{trigger}</div>

      <DialogContent className="max-w-lg bg-popover border-gold/30">
        <DialogTitle className="text-white font-display flex items-center gap-2">
          <Trophy className="w-5 h-5 text-gold" />
          Register a Team
        </DialogTitle>
        <DialogDescription>Select which of your teams you want to register.</DialogDescription>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
          </div>
        ) : teams.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            You don&apos;t own any teams yet. Create one from your dashboard first.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {teams.map((team) => {
              const disabled = !team.rosterComplete || team.alreadyRegistered;
              return (
                <button
                  key={team.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedId(team.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                    disabled && "opacity-50 cursor-not-allowed",
                    selectedId === team.id
                      ? "border-gold/60 bg-gold/10"
                      : "border-white/10 hover:border-gold/30"
                  )}
                >
                  <TeamMonogram name={team.team_name} logo={team.logo_url} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{team.team_name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {team.memberCount}
                      </span>
                      {team.captainName && (
                        <span className="flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          {team.captainName}
                        </span>
                      )}
                    </div>
                  </div>
                  {team.alreadyRegistered ? (
                    <span className="text-[0.65rem] uppercase tracking-wider text-amber-400">
                      Registered
                    </span>
                  ) : team.rosterComplete ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <span
                      className="flex items-center gap-1 text-[0.65rem] uppercase tracking-wider text-red-400"
                      title="Roster incomplete"
                    >
                      <ShieldX className="w-4 h-4" />
                      Incomplete
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-gold/10">
          <Button
            disabled={!selectedId || pending}
            onClick={handleConfirm}
            className="ns-btn-gold h-10 px-6 text-xs uppercase tracking-wider"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {pending ? "Registering..." : "Confirm Registration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
