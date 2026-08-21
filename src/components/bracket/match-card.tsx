"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TeamMonogram } from "@/components/ns/ui";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { advanceWinner } from "@/app/admin/tournaments/[id]/bracket/actions";
import type { MatchWithTeams } from "@/lib/bracket/queries";

interface MatchCardProps {
  match: MatchWithTeams;
  editable: boolean;
}

function Slot({
  team,
  score,
  isWinner,
  isBye,
  isPending,
}: {
  team: { team_name: string; logo_url: string | null } | null;
  score: number;
  isWinner: boolean;
  isBye: boolean;
  isPending: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1.5 rounded-md",
        isWinner && "bg-gold/10"
      )}
    >
      {team ? (
        <TeamMonogram name={team.team_name} logo={team.logo_url} size={22} />
      ) : (
        <div className="w-[22px] h-[22px] rounded-md border border-dashed border-white/15 shrink-0" />
      )}
      <span
        className={cn(
          "text-sm truncate flex-1",
          isWinner ? "text-gold-light font-semibold" : "text-white/80",
          isPending && !team && "text-muted-foreground italic"
        )}
      >
        {team ? team.team_name : isBye ? "BYE" : "TBD"}
      </span>
      {team && !isPending && <span className={cn("text-xs font-mono", isWinner ? "text-gold" : "text-white/50")}>{score}</span>}
    </div>
  );
}

export function MatchCard({ match, editable }: MatchCardProps) {
  const [open, setOpen] = useState(false);
  const [scoreA, setScoreA] = useState(String(match.score_a || 0));
  const [scoreB, setScoreB] = useState(String(match.score_b || 0));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const isPendingMatch = !match.team_a_id || !match.team_b_id;
  const isBye = isPendingMatch && (!!match.team_a_id || !!match.team_b_id) && match.status === "COMPLETED";
  const isDecided = match.status === "COMPLETED";
  const canEnterScore = editable && !!match.team_a_id && !!match.team_b_id && !isDecided;

  function handleSubmit() {
    const a = Number(scoreA);
    const b = Number(scoreB);
    startTransition(async () => {
      const result = await advanceWinner(match.id, a, b);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Result recorded.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={!canEnterScore}
        onClick={() => canEnterScore && setOpen(true)}
        className={cn(
          "w-full text-left ns-card rounded-lg overflow-hidden divide-y divide-white/5",
          canEnterScore && "hover:border-gold/40 cursor-pointer",
          !canEnterScore && "cursor-default"
        )}
      >
        <Slot
          team={match.team_a}
          score={match.score_a}
          isWinner={!!match.winner_id && match.winner_id === match.team_a_id}
          isBye={isBye && !match.team_a_id}
          isPending={isPendingMatch}
        />
        <Slot
          team={match.team_b}
          score={match.score_b}
          isWinner={!!match.winner_id && match.winner_id === match.team_b_id}
          isBye={isBye && !match.team_b_id}
          isPending={isPendingMatch}
        />
      </button>

      {canEnterScore && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm bg-popover border-gold/30">
            <DialogTitle className="text-white font-display flex items-center gap-2">
              <Swords className="w-4 h-4 text-gold" />
              Enter Result
            </DialogTitle>
            <DialogDescription>
              {match.team_a?.team_name} vs {match.team_b?.team_name}
            </DialogDescription>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground truncate block">
                  {match.team_a?.team_name}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  className="ns-input"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground truncate block">
                  {match.team_b?.team_name}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  className="ns-input"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-gold/10">
              <Button
                disabled={pending}
                onClick={handleSubmit}
                className="ns-btn-gold h-10 px-6 text-xs uppercase tracking-wider"
              >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Confirm Result
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
