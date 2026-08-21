import Link from "next/link";
import { TeamMonogram } from "@/components/ns/ui";
import { Calendar, Radio } from "lucide-react";
import type { MatchWithContext } from "@/lib/matches/queries";

export function MatchSummaryList({
  title,
  matches,
  live,
}: {
  title: string;
  matches: MatchWithContext[];
  live?: boolean;
}) {
  if (matches.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light flex items-center gap-1.5">
        {live && <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />}
        {title}
      </h3>
      <div className="grid sm:grid-cols-2 gap-2">
        {matches.map((m) => (
          <Link
            key={m.id}
            href={`/matches/${m.id}`}
            className="ns-card rounded-lg p-3 flex items-center gap-2 hover:border-gold/40 transition-colors"
          >
            <TeamMonogram name={m.team_a?.team_name ?? "TBD"} logo={m.team_a?.logo_url} size={26} />
            <span className="text-sm text-white/80 truncate flex-1">
              {m.team_a?.team_name ?? "TBD"}
              {m.status === "COMPLETED" ? ` ${m.score_a}` : ""}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">vs</span>
            <span className="text-sm text-white/80 truncate flex-1 text-right">
              {m.status === "COMPLETED" ? `${m.score_b} ` : ""}
              {m.team_b?.team_name ?? "TBD"}
            </span>
            <TeamMonogram name={m.team_b?.team_name ?? "TBD"} logo={m.team_b?.logo_url} size={26} />
            {m.scheduled_at && !live && m.status !== "COMPLETED" && (
              <span className="hidden sm:flex items-center gap-1 text-[0.65rem] text-muted-foreground shrink-0 ml-1">
                <Calendar className="w-3 h-3" />
                {new Date(m.scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
