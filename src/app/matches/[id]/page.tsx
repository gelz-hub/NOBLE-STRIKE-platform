import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { getMatch, getMatchDisputes } from "@/lib/matches/queries";
import { pickLocalized } from "@/lib/i18n/content";
import { TeamMonogram, StatusPill } from "@/components/ns/ui";
import { OpenDisputeForm } from "@/components/matches/open-dispute-form";
import { ArrowLeft, Calendar, Crown, Radio } from "lucide-react";
import type { Locale } from "@/i18n/config";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PublicMatchPage({ params }: Props) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("matches.detail");
  const tournamentName = match.tournament ? pickLocalized(match.tournament, "name", locale) : null;

  const disputes = await getMatchDisputes(id);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 space-y-8">
        <Link
          href={match.tournament ? `/tournaments/${match.tournament.id}` : "/"}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60 hover:text-gold-light"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span lang={locale}>{tournamentName ?? t("back")}</span>
        </Link>

        <div className="ns-card ns-card-gold-edge rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <p className="ns-kicker">
              {t("round", { number: match.round_number })} · {match.bracket_type.replace("_", " ")} · {match.best_of}
            </p>
            <StatusPill status={match.status} />
          </div>

          <div className="flex items-center justify-center gap-6 sm:gap-10">
            <TeamSlot name={match.team_a?.team_name} logo={match.team_a?.logo_url} score={match.score_a} isWinner={match.winner_id === match.team_a_id} tbdLabel={t("tbd")} />
            <span className="text-2xl font-display font-bold text-white/30">{t("vs")}</span>
            <TeamSlot name={match.team_b?.team_name} logo={match.team_b?.logo_url} score={match.score_b} isWinner={match.winner_id === match.team_b_id} tbdLabel={t("tbd")} />
          </div>

          {match.winner_id && (
            <div className="flex items-center justify-center gap-2 text-gold-light">
              <Crown className="w-4 h-4" />
              <span className="font-heading font-semibold uppercase tracking-wider text-sm">
                {t("winner", { name: match.winner?.team_name ?? "" })}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            {match.scheduled_at && (
              <div className="flex items-center gap-2 text-white/70">
                <Calendar className="w-4 h-4 text-gold/60" />
                {new Date(match.scheduled_at).toLocaleString()}
              </div>
            )}
            {match.stream_url && match.status === "LIVE" && (
              <a
                href={match.stream_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-red-400 hover:text-red-300"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                {t("watchLive")}
              </a>
            )}
          </div>

          {match.evidence_urls.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-gold/10">
              <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light">
                {t("evidence")}
              </p>
              <div className="flex flex-wrap gap-2">
                {match.evidence_urls.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative w-24 h-24 rounded-md overflow-hidden border border-gold/20 hover:border-gold/50"
                  >
                    <Image src={item.url} alt={item.type} fill sizes="96px" className="object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {match.status === "COMPLETED" && (
            <div className="pt-4 border-t border-gold/10 flex justify-center">
              <OpenDisputeForm matchId={id} teamAId={match.team_a_id} teamBId={match.team_b_id} />
            </div>
          )}
        </div>

        {disputes.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-heading font-bold uppercase tracking-wider text-sm text-white">
              {t("disputes")}
            </h2>
            {disputes.map((d) => (
              <div key={d.id} className="ns-card rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                  <StatusPill status={d.status} />
                </div>
                <p className="text-sm text-white/80">{d.explanation}</p>
                {d.admin_response && (
                  <p className="text-xs text-muted-foreground">
                    <span className="text-gold-light">{t("adminLabel")}</span> {d.admin_response}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function TeamSlot({
  name,
  logo,
  score,
  isWinner,
  tbdLabel,
}: {
  name?: string;
  logo?: string | null;
  score: number;
  isWinner: boolean;
  tbdLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <TeamMonogram name={name ?? tbdLabel} logo={logo} size={64} className={isWinner ? "ring-2 ring-gold" : ""} />
      <p className={`text-sm font-medium ${isWinner ? "text-gold-light" : "text-white/80"}`}>
        {name ?? tbdLabel}
      </p>
      <p className={`font-display font-extrabold text-3xl ${isWinner ? "text-gold" : "text-white/50"}`}>
        {score}
      </p>
    </div>
  );
}
