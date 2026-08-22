import Link from "next/link";
import { getLocale } from "next-intl/server";
import { StatusPill, TeamMonogram } from "@/components/ns/ui";
import { pickLocalized } from "@/lib/i18n/content";
import { Calendar, Radio, User } from "lucide-react";
import type { MatchWithContext } from "@/lib/matches/queries";
import type { Locale } from "@/i18n/config";

export async function MatchRow({ match }: { match: MatchWithContext }) {
  const locale = (await getLocale()) as Locale;
  return (
    <Link
      href={`/admin/matches/${match.id}`}
      className="ns-card rounded-lg p-3 flex items-center gap-3 hover:border-gold/40 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <TeamMonogram name={match.team_a?.team_name ?? "TBD"} logo={match.team_a?.logo_url} size={28} />
        <span className="text-sm text-white/80 truncate max-w-[100px]">
          {match.team_a?.team_name ?? "TBD"}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">vs</span>
        <TeamMonogram name={match.team_b?.team_name ?? "TBD"} logo={match.team_b?.logo_url} size={28} />
        <span className="text-sm text-white/80 truncate max-w-[100px]">
          {match.team_b?.team_name ?? "TBD"}
        </span>
      </div>

      <div className="hidden md:block text-xs text-muted-foreground truncate max-w-[160px]" lang={locale}>
        {match.tournament ? pickLocalized(match.tournament, "name", locale) : null}
      </div>

      {match.scheduled_at && (
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/60 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-gold/60" />
          {new Date(match.scheduled_at).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}

      {match.referee && (
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-white/60 shrink-0">
          <User className="w-3.5 h-3.5 text-gold/60" />
          {match.referee.username ?? "Unnamed"}
        </div>
      )}

      {match.status === "LIVE" && <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />}

      <StatusPill status={match.status} />
    </Link>
  );
}
