import { CheckCircle2, Clock, ListChecks, Users, XCircle } from "lucide-react";
import type { TournamentStats } from "@/lib/tournament-stats";

export function TournamentStatsCards({ stats }: { stats: TournamentStats }) {
  const cards = [
    { label: "Total Registrations", value: stats.total, icon: ListChecks },
    { label: "Approved Teams", value: stats.approved, icon: CheckCircle2 },
    { label: "Pending Teams", value: stats.pending, icon: Clock },
    { label: "Rejected Teams", value: stats.rejected, icon: XCircle },
    { label: "Available Slots", value: stats.availableSlots, icon: Users },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="ns-card rounded-lg p-3 text-center">
          <c.icon className="w-4 h-4 text-gold mx-auto mb-1.5" />
          <div className="font-display font-bold text-lg text-white">{c.value}</div>
          <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}
