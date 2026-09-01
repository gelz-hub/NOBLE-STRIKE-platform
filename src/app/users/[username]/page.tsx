import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { pickLocalized } from "@/lib/i18n/content";
import type { Locale } from "@/i18n/config";
import { TeamMonogram } from "@/components/ns/ui";
import { PageNav } from "@/components/ns/page-nav";
import { StatCard } from "@/components/ui/stat-card";
import { CountryFlag } from "@/components/ui/country-flag";
import { ReportUserButton } from "@/components/moderation/report-user-button";
import {
  getProfileByUsername,
  getProfileTeams,
  getTournamentStats,
  getRecentMatches,
  getAuthoredNews,
} from "@/lib/profile/queries";
import {
  Award,
  Calendar,
  Coins,
  Crown,
  Lock,
  Newspaper,
  Percent,
  Send,
  Shield,
  Star,
  Swords,
  Trophy,
} from "lucide-react";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const profile = await getProfileByUsername(supabase, username);
  if (!profile) {
    const t = await getTranslations("userProfile");
    return { title: t("playerNotFound") };
  }
  return {
    title: `${profile.display_name || profile.username} — NOBLE STRIKE`,
    description: profile.bio || `${profile.username}'s player profile on NOBLE STRIKE.`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const profile = await getProfileByUsername(supabase, username);
  if (!profile) notFound();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("userProfile");

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();
  const isOwner = viewer?.id === profile.id;
  let viewerIsAdmin = false;
  if (viewer && !isOwner) {
    const { data: viewerProfile } = await supabase.from("profiles").select("role").eq("id", viewer.id).single();
    viewerIsAdmin = viewerProfile?.role === "admin";
  }
  const canBypassPrivacy = isOwner || viewerIsAdmin;

  if (!profile.privacy_public_profile && !canBypassPrivacy) {
    return (
      <div className="min-h-screen bg-background">
        <PageNav />
        <div className="flex items-center justify-center px-4 py-24">
          <div className="ns-card rounded-xl p-10 text-center max-w-sm">
            <Lock className="w-8 h-8 text-gold/50 mx-auto mb-4" />
            <h1 className="font-display font-bold text-xl text-text-primary mb-2">{t("privateProfileTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("privateProfileBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  const showTeams = profile.privacy_show_teams || canBypassPrivacy;
  const showMatchHistory = profile.privacy_show_match_history || canBypassPrivacy;
  const showTelegram = profile.privacy_show_telegram || canBypassPrivacy;

  const teams = showTeams || showMatchHistory ? await getProfileTeams(supabase, profile.id) : null;
  const teamIds = teams?.current.map((e) => e.team.id) ?? [];

  const [{ stats, titles }, recentMatches, authoredNews] = await Promise.all([
    showMatchHistory
      ? getTournamentStats(supabase, teamIds, locale)
      : Promise.resolve({ stats: null, titles: [] }),
    showMatchHistory ? getRecentMatches(supabase, teamIds, 5, locale) : Promise.resolve([]),
    profile.role === "admin" ? getAuthoredNews(supabase, profile.id) : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <PageNav />
      <div className="relative h-56 md:h-72 w-full overflow-hidden">
        {profile.banner_url ? (
          <Image src={profile.banner_url} alt="" fill sizes="100vw" className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black ns-grid-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
        {isOwner && (
          <Link
            href="/settings/profile"
            className="absolute top-5 right-4 md:right-6 flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-secondary hover:text-gold-light bg-background/40 backdrop-blur-sm border border-border rounded-md px-3 py-1.5"
          >
            {t("editProfile")}
          </Link>
        )}
        {viewer && !isOwner && (
          <div className="absolute top-5 right-4 md:right-6">
            <ReportUserButton
              userId={profile.id}
              className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-secondary hover:text-destructive bg-background/40 backdrop-blur-sm border border-border rounded-md px-3 py-1.5 h-auto"
            />
          </div>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 md:px-6 -mt-16 relative pb-16">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <TeamMonogram
            name={profile.display_name || profile.username || "?"}
            logo={profile.avatar_url}
            size={110}
            className="border-4 border-background shadow-2xl"
          />
          <div className="pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-extrabold text-2xl md:text-3xl text-text-primary">
                {profile.display_name || profile.username}
              </h1>
              {profile.role === "admin" && (
                <span className="ns-pill ns-pill-approved">
                  <Shield className="w-3 h-3" /> {t("adminBadge")}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-muted-foreground">
          <CountryFlag code={profile.country_code} name={profile.country_name} unknownLabel={t("unknownCountry")} />
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> {t("joined", { date: new Date(profile.created_at).toLocaleDateString() })}
          </span>
          {showTelegram && profile.telegram_handle && (
            <span className="flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> {profile.telegram_handle}
            </span>
          )}
        </div>

        {profile.bio && <p className="mt-6 text-text-secondary max-w-2xl leading-relaxed">{profile.bio}</p>}

        {profile.social_links.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {profile.social_links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md text-xs border border-gold/20 text-text-secondary hover:text-gold-light hover:border-gold/40 transition-colors"
              >
                {link.platform}
              </a>
            ))}
          </div>
        )}

        {showMatchHistory && stats && (
          <section className="mt-10 space-y-4">
            <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-text-primary">
              {t("tournamentHistory")}
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <StatCard icon={Trophy} label={t("stats.played")} value={stats.played} />
              <StatCard icon={Swords} label={t("stats.wins")} value={stats.wins} />
              <StatCard icon={Swords} label={t("stats.losses")} value={stats.losses} />
              <StatCard icon={Percent} label={t("stats.winRate")} value={`${stats.winRate}%`} />
              <StatCard icon={Crown} label={t("stats.championships")} value={stats.championships} />
              <StatCard icon={Award} label={t("stats.runnerUps")} value={stats.runnerUps} />
            </div>
          </section>
        )}

        {showTeams && teams && (
          <section className="mt-10 space-y-6">
            <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-text-primary">{t("teams")}</h2>
            <TeamBucket title={t("currentTeams")} entries={teams.current} officialLabel={t("official")} />
            <TeamBucket title={t("captainOf")} entries={teams.captain} icon={Crown} officialLabel={t("official")} />
            <TeamBucket title={t("coaching")} entries={teams.coach} officialLabel={t("official")} />
            {teams.past.length === 0 && (
              <div>
                <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light mb-3">
                  {t("pastTeams")}
                </p>
                <p className="text-sm text-muted-foreground">{t("noPastTeams")}</p>
              </div>
            )}
          </section>
        )}

        <section className="mt-10 space-y-6">
          <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-text-primary">{t("achievements")}</h2>
          <div>
            <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light mb-3">
              {t("tournamentTitles")}
            </p>
            {titles.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noTitlesYet")}</p>
            ) : (
              <div className="space-y-2">
                {titles.map((title) => (
                  <div key={`${title.tournamentId}-${title.placement}`} className="ns-card rounded-lg p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {title.placement === "champion" ? (
                        <Crown className="w-4 h-4 text-gold shrink-0" />
                      ) : (
                        <Award className="w-4 h-4 text-text-secondary shrink-0" />
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/tournaments/${title.tournamentId}`}
                          className="text-sm font-medium text-text-primary truncate hover:text-gold-light"
                          lang={locale}
                        >
                          {title.tournamentTitle}
                        </Link>
                        {title.date && <p className="text-xs text-muted-foreground">{new Date(title.date).toLocaleDateString()}</p>}
                      </div>
                    </div>
                    <span className={`ns-pill ${title.placement === "champion" ? "ns-pill-approved" : "ns-pill-completed"}`}>
                      {title.placement === "champion" ? t("champion") : t("runnerUp")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light mb-3 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" /> {t("mvpAwards")}
              </p>
              <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
            </div>
            <div>
              <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light mb-3 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" /> {t("specialBadges")}
              </p>
              <p className="text-sm text-muted-foreground">{t("comingSoon")}</p>
            </div>
          </div>
        </section>

        {showMatchHistory && recentMatches.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-text-primary">{t("recentMatches")}</h2>
            <div className="space-y-2">
              {recentMatches.map((m) => (
                <div key={m.id} className="ns-card rounded-lg p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary truncate">
                      {t("matchVs", { team: m.teamName, opponent: m.opponentName ?? t("tbd") })}
                    </p>
                    <p className="text-xs text-muted-foreground" lang={locale}>
                      {m.tournamentTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-mono text-text-primary">
                      {m.scoreFor}–{m.scoreAgainst}
                    </span>
                    {m.won !== null && (
                      <span className={`ns-pill ${m.won ? "ns-pill-approved" : "ns-pill-rejected"}`}>
                        {m.won ? t("win") : t("loss")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {profile.role === "admin" && authoredNews.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-text-primary flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-gold" /> {t("newsContributions")}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {authoredNews.map((n) => (
                <Link key={n.id} href={`/news/${n.slug}`} className="ns-card rounded-lg p-4 block">
                  <p className="text-sm font-medium text-text-primary truncate" lang={locale}>
                    {pickLocalized(n, "title", locale)}
                  </p>
                  {n.publish_at && (
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.publish_at).toLocaleDateString()}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TeamBucket({
  title,
  entries,
  icon: Icon,
  officialLabel = "Official",
}: {
  title: string;
  entries: { team: { id: string; team_name: string; logo_url: string | null; is_official: boolean } }[];
  icon?: React.ElementType;
  officialLabel?: string;
}) {
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light mb-3">{title}</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {entries.map(({ team }) => (
          <Link key={team.id} href={`/teams/${team.id}`} className="ns-card rounded-xl p-4 flex items-center gap-3">
            <TeamMonogram name={team.team_name} logo={team.logo_url} size={40} />
            <div className="min-w-0">
              <p className="font-medium text-text-primary truncate flex items-center gap-1.5">
                {team.team_name}
                {Icon && <Icon className="w-3.5 h-3.5 text-gold shrink-0" />}
              </p>
              {team.is_official && <span className="ns-pill ns-pill-approved mt-1 inline-flex">{officialLabel}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
