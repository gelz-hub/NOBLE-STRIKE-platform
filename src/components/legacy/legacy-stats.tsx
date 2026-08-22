import { getTranslations } from "next-intl/server";
import { Calendar, Trophy, Coins, Swords, Users } from "lucide-react";
import type { LegacyStats } from "@/lib/legacy/queries";

export async function LegacyStatsGrid({ stats }: { stats: LegacyStats }) {
  const t = await getTranslations("legacy.stats");

  const cards = [
    { icon: Calendar, label: t("founded"), value: String(stats.foundedYear) },
    {
      icon: Trophy,
      label: t("largestTournament"),
      value: stats.largestTournamentTeams != null ? t("teamsCount", { count: stats.largestTournamentTeams }) : "—",
    },
    {
      icon: Coins,
      label: t("highestPrizePool"),
      value: stats.highestPrizePool != null ? `$${stats.highestPrizePool}` : "—",
    },
    { icon: Swords, label: t("eventsOrganized"), value: String(stats.eventsOrganized) },
    { icon: Users, label: t("communityEventsHosted"), value: String(stats.communityEventsHosted) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="ns-card rounded-xl p-4 text-center">
          <c.icon className="w-4 h-4 text-gold mx-auto mb-2" />
          <div className="font-display font-extrabold text-xl text-white">{c.value}</div>
          <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
