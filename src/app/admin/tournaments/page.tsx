import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { TournamentRow } from "@/components/admin/tournament-row";
import { Button } from "@/components/ui/button";
import { Plus, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { pickLocalized } from "@/lib/i18n/content";
import type { TournamentStatus } from "@/lib/types/database";
import type { Locale } from "@/i18n/config";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

const STATUS_FILTERS: { value: TournamentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All (excl. Archived)" },
  { value: "DRAFT", label: "Draft" },
  { value: "REGISTRATION_OPEN", label: "Open" },
  { value: "REGISTRATION_CLOSED", label: "Closed" },
  { value: "ONGOING", label: "Ongoing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export default async function AdminTournamentsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filter = (sp.status as TournamentStatus | "ALL") || "ALL";

  const supabase = await createClient();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("admin.tournaments.list");

  let query = supabase.from("tournaments").select("*").order("created_at", { ascending: false });
  if (filter === "ALL") query = query.neq("status", "ARCHIVED");
  else query = query.eq("status", filter);
  const { data: tournaments } = await query;

  const { data: allTournaments } = await supabase.from("tournaments").select("id, status");
  const counts = {
    DRAFT: 0,
    REGISTRATION_OPEN: 0,
    REGISTRATION_CLOSED: 0,
    ONGOING: 0,
    COMPLETED: 0,
    ARCHIVED: 0,
  } as Record<TournamentStatus, number>;
  for (const t of allTournaments ?? []) counts[t.status as TournamentStatus]++;

  const tournamentIds = (tournaments ?? []).map((t) => t.id);
  const approvedByTournament = new Map<string, number>();
  if (tournamentIds.length > 0) {
    const { data: approved } = await supabase
      .from("tournament_registrations")
      .select("tournament_id")
      .in("tournament_id", tournamentIds)
      .eq("status", "APPROVED");
    for (const r of approved ?? []) {
      approvedByTournament.set(r.tournament_id, (approvedByTournament.get(r.tournament_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">{t("heading")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subheading")}</p>
        </div>
        <Link href="/admin/tournaments/new">
          <Button className="ns-btn-gold h-10 px-4 text-xs uppercase tracking-wider">
            <Plus className="w-4 h-4" />
            {t("createButton")}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {(Object.keys(counts) as TournamentStatus[]).map((s) => (
          <div key={s} className="ns-card rounded-lg p-3 text-center">
            <div className="font-display font-bold text-xl text-white">{counts[s]}</div>
            <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">
              {s.replace("_", " ")}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "ALL" ? "/admin/tournaments" : `/admin/tournaments?status=${f.value}`}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-heading font-semibold uppercase tracking-wider border transition-all",
              filter === f.value
                ? "text-gold-light bg-gold/10 border-gold/40"
                : "text-white/60 border-transparent hover:border-gold/20"
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!tournaments || tournaments.length === 0 ? (
        <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <Trophy className="w-8 h-8 text-gold/50" />
          <p className="text-white/70">{t("emptyState")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tournaments.map((row) => (
            <TournamentRow
              key={row.id}
              id={row.id}
              title={pickLocalized(row, "name", locale)}
              locale={locale}
              bannerUrl={row.banner_url}
              gameType={row.game_type}
              status={row.status}
              maxTeams={row.max_teams}
              approvedCount={approvedByTournament.get(row.id) ?? 0}
              startDate={row.start_date}
            />
          ))}
        </div>
      )}
    </div>
  );
}
