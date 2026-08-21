import { createClient } from "@/lib/supabase/server";
import { getAdminMatches, getRefereeOptions } from "@/lib/matches/queries";
import { MatchesFilters } from "@/components/admin/matches-filters";
import { MatchRow } from "@/components/admin/match-row";
import { PaginationLinks } from "@/components/admin/pagination-links";
import { Swords } from "lucide-react";
import type { MatchStatus } from "@/lib/types/database";

interface Props {
  searchParams: Promise<{
    status?: string;
    tournamentId?: string;
    refereeId?: string;
    search?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function AdminMatchesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const status = (sp.status as MatchStatus) || undefined;

  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("id, title")
    .order("created_at", { ascending: false });
  const referees = await getRefereeOptions();

  const { rows, total } = await getAdminMatches({
    status,
    tournamentId: sp.tournamentId,
    refereeId: sp.refereeId,
    search: sp.search,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Match Operations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Schedule, referee, and run every match across every tournament.
        </p>
      </div>

      <MatchesFilters tournaments={tournaments ?? []} referees={referees} />

      {rows.length === 0 ? (
        <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <Swords className="w-8 h-8 text-gold/50" />
          <p className="text-white/70">No matches match these filters.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {rows.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </div>
          <PaginationLinks page={page} totalPages={totalPages} searchParams={sp} />
        </>
      )}
    </div>
  );
}
