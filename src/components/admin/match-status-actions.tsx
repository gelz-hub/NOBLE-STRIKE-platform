"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Ban, Loader2, Radio, ShieldCheck } from "lucide-react";
import { markMatchReady, markMatchLive, cancelMatch } from "@/app/admin/matches/actions";
import type { MatchStatus } from "@/lib/types/database";

export function MatchStatusActions({ matchId, status }: { matchId: string; status: MatchStatus }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ error: string } | { success: true }>, label: string) {
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(label);
      router.refresh();
    });
  }

  const canGoReady = status === "PENDING" || status === "SCHEDULED";
  const canGoLive = status === "SCHEDULED" || status === "READY";
  const canCancel = status !== "COMPLETED" && status !== "CANCELLED";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canGoReady && (
        <Button
          disabled={pending}
          variant="ghost"
          onClick={() => run(() => markMatchReady(matchId), "Marked ready.")}
          className="h-9 px-3 text-xs uppercase tracking-wider text-white/70 hover:text-emerald-400 border border-white/10"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          Mark Ready
        </Button>
      )}
      {canGoLive && (
        <Button
          disabled={pending}
          onClick={() => run(() => markMatchLive(matchId), "Match is live.")}
          className="ns-btn-gold h-9 px-3 text-xs uppercase tracking-wider"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
          Go Live
        </Button>
      )}
      {canCancel && (
        <Button
          disabled={pending}
          variant="ghost"
          onClick={() => run(() => cancelMatch(matchId), "Match cancelled.")}
          className="h-9 px-3 text-xs uppercase tracking-wider text-white/60 hover:text-destructive border border-white/10"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
          Cancel
        </Button>
      )}
    </div>
  );
}
