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
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/cloudinary/image-upload";
import { AlertTriangle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { openDispute } from "@/app/matches/[id]/actions";

export function OpenDisputeForm({
  matchId,
  teamAId,
  teamBId,
}: {
  matchId: string;
  teamAId: string | null;
  teamBId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setChecked(true);
        return;
      }
      const ids = [teamAId, teamBId].filter(Boolean) as string[];
      if (ids.length === 0) {
        setChecked(true);
        return;
      }
      const { data } = await supabase.from("teams").select("id").in("id", ids).eq("owner_id", user.id).maybeSingle();
      setMyTeamId(data?.id ?? null);
      setChecked(true);
    })();
  }, [teamAId, teamBId]);

  if (!checked || !myTeamId) return null;

  function handleSubmit() {
    if (!myTeamId) return;
    startTransition(async () => {
      const result = await openDispute(matchId, myTeamId, explanation, evidence);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Dispute opened.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="ghost"
        className="h-10 px-4 text-xs uppercase tracking-wider text-amber-400 hover:bg-amber-400/10 border border-amber-400/30"
      >
        <AlertTriangle className="w-4 h-4" />
        Dispute This Result
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg bg-popover border-gold/30">
          <DialogTitle className="text-white font-display flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Open a Dispute
          </DialogTitle>
          <DialogDescription>
            Explain what went wrong and attach any supporting evidence. An admin will review it.
          </DialogDescription>

          <Textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="What happened?"
            className="ns-input min-h-24"
          />

          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <ImageUpload
                key={i}
                useCase="matchEvidence"
                shape="square"
                size={120}
                onUploaded={(url) =>
                  setEvidence((prev) => {
                    const next = [...prev];
                    if (url) next[i] = url;
                    else next.splice(i, 1);
                    return next.filter(Boolean);
                  })
                }
              />
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-gold/10">
            <Button
              disabled={pending}
              onClick={handleSubmit}
              className="ns-btn-gold h-10 px-6 text-xs uppercase tracking-wider"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Submit Dispute
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
