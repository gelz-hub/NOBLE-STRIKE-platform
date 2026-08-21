import { createClient } from "@/lib/supabase/server";
import { Users, Trophy, Clock, CheckCircle2 } from "lucide-react";
import type { TournamentRegistration } from "@/lib/types/database";

async function getOverviewStats(userId: string) {
  const supabase = await createClient();

  const { data: teams } = await supabase.from("teams").select("id").eq("owner_id", userId);
  const teamIds = (teams ?? []).map((t) => t.id);

  let registrations: Pick<TournamentRegistration, "status">[] = [];
  if (teamIds.length > 0) {
    const { data } = await supabase
      .from("tournament_registrations")
      .select("status")
      .in("team_id", teamIds);
    registrations = data ?? [];
  }

  return {
    totalTeams: teamIds.length,
    active: registrations.length,
    pending: registrations.filter((r) => r.status === "PENDING").length,
    approved: registrations.filter((r) => r.status === "APPROVED").length,
  };
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const stats = await getOverviewStats(user.id);

  const cards = [
    { label: "Total Teams Owned", value: stats.totalTeams, icon: Users },
    { label: "Active Registrations", value: stats.active, icon: Trophy },
    { label: "Pending Registrations", value: stats.pending, icon: Clock },
    { label: "Approved Registrations", value: stats.approved, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your NOBLE STRIKE dashboard at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="ns-card ns-card-gold-edge rounded-xl p-5">
            <card.icon className="w-5 h-5 text-gold mb-3" />
            <div className="font-display font-extrabold text-3xl text-white">{card.value}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
              {card.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
