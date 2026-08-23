"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldOff } from "lucide-react";
import { unflagAccount, type FlaggedProfileRow } from "@/app/admin/moderation/actions";

export function FlaggedAccountRow({ account }: { account: FlaggedProfileRow }) {
  const [pending, startTransition] = useTransition();

  function handleUnflag() {
    startTransition(async () => {
      const result = await unflagAccount(account.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success("Account unflagged.");
    });
  }

  return (
    <div className="ns-card rounded-lg p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate">{account.username ?? account.id}</p>
        <p className="text-xs text-muted-foreground truncate">
          {account.flag_reason} ·{" "}
          {account.flagged_at ? new Date(account.flagged_at).toLocaleString() : ""}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        onClick={handleUnflag}
        className="h-9 px-3 text-xs uppercase tracking-wider text-muted-foreground hover:text-emerald-400 shrink-0"
      >
        {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
        Unflag
      </Button>
    </div>
  );
}
