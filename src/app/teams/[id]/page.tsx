import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { pickLocalized } from "@/lib/i18n/content";
import { StatusPill, TeamMonogram } from "@/components/ns/ui";
import { Crown, Trophy, Users, Calendar, ArrowLeft } from "lucide-react";
import type { RosterRole, TeamMember } from "@/lib/types/database";
import type { Locale } from "@/i18n/config";

interface Props {
  params: Promise<{ id: string }>;
}

const REQUIRED_ROLES: RosterRole[] = ["EXP", "JUNGLE", "MID", "GOLD", "ROAM"];

interface RegistrationRow {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  tournaments: { id: string; name_en: string; name_km: string | null; slug: string; game_type: string } | null;
}

export default async function TeamDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("teamDetail");

  const { data: team } = await supabase.from("teams").select("*").eq("id", id).single();
  if (!team) notFound();

  const { data: membersData } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", id);
  const members = (membersData ?? []) as TeamMember[];

  const { data: registrationsData } = await supabase
    .from("tournament_registrations")
    .select("id, status, created_at, tournaments(id, name_en, name_km, slug, game_type)")
    .eq("team_id", id)
    .order("created_at", { ascending: false });
  const registrations = (registrationsData ?? []) as unknown as RegistrationRow[];

  const starting = REQUIRED_ROLES.map((role) => members.find((m) => m.role === role));
  const subs = members.filter((m) => m.role === "SUB1" || m.role === "SUB2");
  const coach = members.find((m) => m.role === "COACH");
  const captain = members.find((m) => m.is_captain);

  const approvedCount = registrations.filter((r) => r.status === "APPROVED").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-56 md:h-72 w-full overflow-hidden">
        {team.banner_url ? (
          <Image
            src={team.banner_url}
            alt={`${team.team_name} banner`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black ns-grid-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
        <Link
          href="/"
          className="absolute top-5 left-4 md:left-6 flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/70 hover:text-gold-light bg-black/40 backdrop-blur-sm border border-white/10 rounded-md px-3 py-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("back")}
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-4 md:px-6 -mt-16 relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <TeamMonogram
            name={team.team_name}
            logo={team.logo_url}
            size={110}
            className="border-4 border-background shadow-2xl"
          />
          <div className="pb-2">
            <h1 className="font-display font-extrabold text-2xl md:text-3xl text-white">
              {team.team_name}
            </h1>
            {team.is_official && (
              <span className="ns-pill ns-pill-approved mt-2 inline-flex">{t("officialTeam")}</span>
            )}
          </div>
        </div>

        {team.description && (
          <p className="mt-6 text-white/70 max-w-2xl leading-relaxed">{team.description}</p>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <StatCard icon={Users} label={t("rosterSize")} value={members.length} />
          <StatCard icon={Trophy} label={t("tournamentsJoined")} value={registrations.length} />
          <StatCard icon={Crown} label={t("approved")} value={approvedCount} />
        </div>

        {/* Roster */}
        <section className="mt-10 space-y-6">
          <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-white">
            {t("roster")}
          </h2>

          {captain && (
            <div>
              <SectionLabel title={t("captain")} />
              <RosterMemberCard member={captain} highlight />
            </div>
          )}

          <div>
            <SectionLabel title={t("startingLineup")} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {starting.map((m, i) =>
                m ? (
                  <RosterMemberCard key={m.id} member={m} />
                ) : (
                  <EmptySlotCard key={REQUIRED_ROLES[i]} role={REQUIRED_ROLES[i]} openSlotLabel={t("openSlot")} />
                )
              )}
            </div>
          </div>

          {subs.length > 0 && (
            <div>
              <SectionLabel title={t("substitutes")} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subs.map((m) => (
                  <RosterMemberCard key={m.id} member={m} />
                ))}
              </div>
            </div>
          )}

          {coach && (
            <div>
              <SectionLabel title={t("coach")} />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <RosterMemberCard member={coach} />
              </div>
            </div>
          )}
        </section>

        {/* Tournament history */}
        <section className="mt-10 space-y-4 pb-16">
          <h2 className="font-heading font-bold uppercase tracking-wider text-lg text-white">
            {t("tournamentHistory")}
          </h2>
          {registrations.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noTournamentsYet")}</p>
          ) : (
            <div className="space-y-2">
              {registrations.map((r) => (
                <div
                  key={r.id}
                  className="ns-card rounded-lg p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Calendar className="w-4 h-4 text-gold/60 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate" lang={locale}>
                        {r.tournaments ? pickLocalized(r.tournaments, "name", locale) : t("tournamentFallback")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={r.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light mb-3">
      {title}
    </p>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="ns-card rounded-xl p-4 text-center">
      <Icon className="w-4 h-4 text-gold mx-auto mb-2" />
      <div className="font-display font-extrabold text-xl text-white">{value}</div>
      <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider mt-0.5">
        {label}
      </div>
    </div>
  );
}

function RosterMemberCard({ member, highlight }: { member: TeamMember; highlight?: boolean }) {
  return (
    <div
      className={`ns-card rounded-xl p-4 flex items-center gap-3 ${
        highlight ? "border-gold/50 shadow-[0_0_20px_rgba(213,190,119,0.12)]" : ""
      }`}
    >
      <TeamMonogram name={member.player_name} logo={member.avatar_url} size={44} />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-white truncate">{member.player_name}</p>
          {member.is_captain && <Crown className="w-3.5 h-3.5 text-gold shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground">{member.role}</p>
      </div>
    </div>
  );
}

function EmptySlotCard({ role, openSlotLabel }: { role: string; openSlotLabel: string }) {
  return (
    <div className="ns-card rounded-xl p-4 flex items-center gap-3 border-dashed opacity-50">
      <div className="w-11 h-11 rounded-lg border border-dashed border-gold/30" />
      <div>
        <p className="text-sm text-muted-foreground">{openSlotLabel}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
