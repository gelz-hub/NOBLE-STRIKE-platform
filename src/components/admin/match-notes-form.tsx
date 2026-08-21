"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, StickyNote } from "lucide-react";
import { updateMatchNotes, type ActionResult } from "@/app/admin/matches/actions";
import type { MatchWithContext } from "@/lib/matches/queries";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="ns-btn-outline h-9 px-4 text-xs uppercase tracking-wider">
      {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <StickyNote className="w-3.5 h-3.5" />}
      Save Notes
    </Button>
  );
}

export function MatchNotesForm({ match }: { match: MatchWithContext }) {
  const boundAction = updateMatchNotes.bind(null, match.id);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(boundAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="result_notes" value={match.result_notes ?? ""} />
      <Textarea
        name="admin_notes"
        defaultValue={match.admin_notes ?? ""}
        placeholder="Internal notes — not shown publicly."
        className="ns-input min-h-20 text-sm"
      />
      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
