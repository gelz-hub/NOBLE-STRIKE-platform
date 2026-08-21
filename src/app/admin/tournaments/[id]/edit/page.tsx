import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TournamentForm } from "@/components/admin/tournament-form";
import { TournamentStatsCards } from "@/components/admin/tournament-stats-cards";
import { TournamentActionsMenu } from "@/components/admin/tournament-actions-menu";
import { ExternalLink } from "lucide-react";
import { updateTournament } from "../../actions";
import { getTournamentStats } from "@/lib/tournament-stats";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditTournamentPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tournament } = await supabase.from("tournaments").select("*").eq("id", id).single();
  if (!tournament) notFound();

  const stats = await getTournamentStats(id, tournament.max_teams);
  const boundUpdate = updateTournament.bind(null, id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Edit {tournament.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Changes apply immediately to the public tournament page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/tournaments/${id}`}
            className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60 hover:text-gold-light"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View
          </Link>
          <TournamentActionsMenu tournamentId={id} title={tournament.title} redirectOnDelete />
        </div>
      </div>

      <TournamentStatsCards stats={stats} />

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <TournamentForm action={boundUpdate} initial={tournament} mode="edit" />
      </div>
    </div>
  );
}
