import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getMatch, getMatchDisputes, getRefereeOptions } from "@/lib/matches/queries";
import { pickLocalized } from "@/lib/i18n/content";
import { TeamMonogram, StatusPill } from "@/components/ns/ui";
import { MatchScheduleForm } from "@/components/admin/match-schedule-form";
import { MatchStatusActions } from "@/components/admin/match-status-actions";
import { MatchResultForm } from "@/components/admin/match-result-form";
import { MatchNotesForm } from "@/components/admin/match-notes-form";
import { DisputeResolvePanel } from "@/components/admin/dispute-resolve-panel";
import { Crown, ExternalLink, Users } from "lucide-react";
import type { TeamMember } from "@/lib/types/database";
import type { Locale } from "@/i18n/config";

interface Props {
  params: Promise<{ id: string }>;
}

async function getRoster(supabase: Awaited<ReturnType<typeof createClient>>, teamId: string | null) {
  if (!teamId) return [];
  const { data } = await supabase.from("team_members").select("*").eq("team_id", teamId);
  return (data ?? []) as TeamMember[];
}

export default async function AdminMatchDetailPage({ params }: Props) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();
  const locale = (await getLocale()) as Locale;
  const tournamentName = match.tournament ? pickLocalized(match.tournament, "name", locale) : null;

  const supabase = await createClient();
  const [rosterA, rosterB, disputes, referees] = await Promise.all([
    getRoster(supabase, match.team_a_id),
    getRoster(supabase, match.team_b_id),
    getMatchDisputes(id),
    getRefereeOptions(),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="ns-kicker mb-2">
            <span lang={locale}>{tournamentName}</span> · Round {match.round_number} ·{" "}
            {match.bracket_type.replace("_", " ")}
          </p>
          <h1 className="font-display font-bold text-2xl text-white">
            {match.team_a?.team_name ?? "TBD"} vs {match.team_b?.team_name ?? "TBD"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/matches/${id}`}
            className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60 hover:text-gold-light"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Public View
          </Link>
          <StatusPill status={match.status} />
        </div>
      </div>

      <MatchStatusActions matchId={match.id} status={match.status} />

      {/* Teams & rosters */}
      <section className="grid sm:grid-cols-2 gap-4">
        <TeamRosterCard name={match.team_a?.team_name} logo={match.team_a?.logo_url} roster={rosterA} />
        <TeamRosterCard name={match.team_b?.team_name} logo={match.team_b?.logo_url} roster={rosterB} />
      </section>

      <section className="ns-card ns-card-gold-edge rounded-xl p-6 space-y-4">
        <h2 className="font-heading font-bold uppercase tracking-wider text-sm text-white">
          Schedule &amp; Lobby
        </h2>
        <MatchScheduleForm match={match} referees={referees} />
      </section>

      <section className="ns-card ns-card-gold-edge rounded-xl p-6 space-y-4">
        <h2 className="font-heading font-bold uppercase tracking-wider text-sm text-white">
          Result
        </h2>
        <MatchResultForm match={match} />
      </section>

      <section className="ns-card rounded-xl p-6 space-y-3">
        <h2 className="font-heading font-bold uppercase tracking-wider text-sm text-white">
          Admin Notes
        </h2>
        <MatchNotesForm match={match} />
      </section>

      {disputes.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading font-bold uppercase tracking-wider text-sm text-white">
            Disputes ({disputes.length})
          </h2>
          <DisputeResolvePanel disputes={disputes} />
        </section>
      )}
    </div>
  );
}

function TeamRosterCard({
  name,
  logo,
  roster,
}: {
  name?: string;
  logo?: string | null;
  roster: TeamMember[];
}) {
  return (
    <div className="ns-card rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <TeamMonogram name={name ?? "TBD"} logo={logo} size={40} />
        <p className="font-heading font-bold text-white">{name ?? "TBD"}</p>
      </div>
      {roster.length > 0 ? (
        <div className="space-y-1.5">
          {roster.map((m) => (
            <div key={m.id} className="flex items-center gap-2 text-sm">
              <span className="text-[0.65rem] uppercase tracking-wider text-gold/70 w-14 shrink-0">
                {m.role}
              </span>
              <span className="text-white/80 truncate">{m.player_name}</span>
              {m.is_captain && <Crown className="w-3 h-3 text-gold shrink-0 ml-auto" />}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          No roster available.
        </p>
      )}
    </div>
  );
}
