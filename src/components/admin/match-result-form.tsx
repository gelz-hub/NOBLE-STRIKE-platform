"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/cloudinary/image-upload";
import { Loader2, Trophy } from "lucide-react";
import { advanceWinner } from "@/app/admin/tournaments/[id]/bracket/actions";
import type { MatchWithContext } from "@/lib/matches/queries";
import type { EvidenceType, MatchEvidenceItem } from "@/lib/types/database";

const EVIDENCE_SLOTS: { type: EvidenceType; label: string }[] = [
  { type: "RESULT_SCREENSHOT", label: "Result Screenshot" },
  { type: "LOBBY_SCREENSHOT", label: "Lobby Screenshot" },
  { type: "REPLAY_SCREENSHOT", label: "Replay Screenshot" },
];

export function MatchResultForm({ match }: { match: MatchWithContext }) {
  const [scoreA, setScoreA] = useState(String(match.score_a || 0));
  const [scoreB, setScoreB] = useState(String(match.score_b || 0));
  const [resultNotes, setResultNotes] = useState(match.result_notes ?? "");
  const [evidence, setEvidence] = useState<Partial<Record<EvidenceType, string>>>(() => {
    const initial: Partial<Record<EvidenceType, string>> = {};
    for (const item of match.evidence_urls ?? []) initial[item.type] = item.url;
    return initial;
  });
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!match.team_a_id || !match.team_b_id) {
    return <p className="text-sm text-muted-foreground">Both teams must be set before a result can be entered.</p>;
  }

  function handleSubmit() {
    const a = Number(scoreA);
    const b = Number(scoreB);
    const evidenceUrls: MatchEvidenceItem[] = Object.entries(evidence)
      .filter(([, url]) => !!url)
      .map(([type, url]) => ({ url: url!, type: type as EvidenceType, uploaded_at: new Date().toISOString() }));

    startTransition(async () => {
      const result = await advanceWinner(match.id, a, b, { evidenceUrls, resultNotes });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Result saved — bracket advanced.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground truncate block">
            {match.team_a?.team_name ?? "Team A"}
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
            {match.team_b?.team_name ?? "Team B"}
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

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Evidence</Label>
        <div className="grid sm:grid-cols-3 gap-4">
          {EVIDENCE_SLOTS.map((slot) => (
            <ImageUpload
              key={slot.type}
              useCase="matchEvidence"
              label={slot.label}
              shape="square"
              size={140}
              currentUrl={evidence[slot.type]}
              onUploaded={(url) => setEvidence((prev) => ({ ...prev, [slot.type]: url }))}
            />
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Result Notes</Label>
        <Textarea
          value={resultNotes}
          onChange={(e) => setResultNotes(e.target.value)}
          placeholder="Anything worth recording about how the match went..."
          className="ns-input min-h-20"
        />
      </div>

      {(match.status === "COMPLETED" || match.status === "DISPUTED") && (
        <p className="text-xs text-amber-400">
          A result is already recorded. Saving again will overwrite it and re-run bracket
          advancement — only do this to correct an error or resolve a dispute.
        </p>
      )}

      <div className="flex justify-end pt-2 border-t border-gold/10">
        <Button
          disabled={pending}
          onClick={handleSubmit}
          className="ns-btn-gold h-10 px-6 text-xs uppercase tracking-wider"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
          {match.status === "COMPLETED" || match.status === "DISPUTED"
            ? "Correct Result & Advance"
            : "Save Result & Advance"}
        </Button>
      </div>
    </div>
  );
}
