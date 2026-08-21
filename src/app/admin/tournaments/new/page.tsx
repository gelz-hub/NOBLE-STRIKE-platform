import { TournamentForm } from "@/components/admin/tournament-form";
import { createTournament } from "../actions";

export default function NewTournamentPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Create Tournament</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up a new NOBLE STRIKE tournament.
        </p>
      </div>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <TournamentForm action={createTournament} mode="create" />
      </div>
    </div>
  );
}
