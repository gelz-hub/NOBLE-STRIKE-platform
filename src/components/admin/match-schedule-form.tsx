"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Loader2 } from "lucide-react";
import { toDatetimeLocal } from "@/lib/format-datetime";
import { scheduleMatch, type ActionResult } from "@/app/admin/matches/actions";
import type { MatchWithContext } from "@/lib/matches/queries";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="ns-btn-gold h-10 px-5 text-xs uppercase tracking-wider">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
      {pending ? "Saving..." : "Save Schedule"}
    </Button>
  );
}

export function MatchScheduleForm({
  match,
  referees,
}: {
  match: MatchWithContext;
  referees: { id: string; username: string | null }[];
}) {
  const boundAction = scheduleMatch.bind(null, match.id);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(boundAction, null);
  const [refereeId, setRefereeId] = useState(match.referee_id ?? "none");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="referee_id" value={refereeId === "none" ? "" : refereeId} />

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Date &amp; Time</Label>
          <Input
            type="datetime-local"
            name="scheduled_at"
            required
            defaultValue={toDatetimeLocal(match.scheduled_at)}
            className="ns-input"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Referee</Label>
          <Select value={refereeId} onValueChange={setRefereeId}>
            <SelectTrigger className="ns-input">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-gold/30">
              <SelectItem value="none">— Unassigned —</SelectItem>
              {referees.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.username ?? "Unnamed"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Stream URL</Label>
          <Input
            name="stream_url"
            defaultValue={match.stream_url ?? ""}
            placeholder="https://twitch.tv/..."
            className="ns-input"
          />
        </div>
        <div />
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Lobby ID</Label>
          <Input
            name="lobby_id"
            defaultValue={match.lobby_id ?? ""}
            className="ns-input"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Lobby Password</Label>
          <Input
            name="lobby_password"
            defaultValue={match.lobby_password ?? ""}
            className="ns-input"
          />
        </div>
      </div>

      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}
      {state && "success" in state && <p className="text-sm text-emerald-400">Saved.</p>}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
