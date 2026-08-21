"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, RefreshCw, Zap } from "lucide-react";
import {
  generateBracket,
  regenerateBracket,
  lockBracket,
} from "@/app/admin/tournaments/[id]/bracket/actions";

interface BracketControlsProps {
  tournamentId: string;
  hasBracket: boolean;
  isLocked: boolean;
}

export function BracketControls({ tournamentId, hasBracket, isLocked }: BracketControlsProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ error: string } | { success: true }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(successMsg);
      router.refresh();
    });
  }

  if (!hasBracket) {
    return (
      <Button
        disabled={pending}
        onClick={() => run(() => generateBracket(tournamentId), "Bracket generated.")}
        className="ns-btn-gold h-10 px-5 text-xs uppercase tracking-wider"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        Generate Bracket
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!isLocked && (
        <>
          <Button
            disabled={pending}
            variant="ghost"
            onClick={() => run(() => regenerateBracket(tournamentId), "Bracket regenerated.")}
            className="h-10 px-4 text-xs uppercase tracking-wider text-white/70 hover:text-gold-light border border-gold/20"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate
          </Button>
          <Button
            disabled={pending}
            onClick={() => run(() => lockBracket(tournamentId), "Bracket locked.")}
            className="ns-btn-gold h-10 px-4 text-xs uppercase tracking-wider"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Lock Bracket
          </Button>
        </>
      )}
    </div>
  );
}
