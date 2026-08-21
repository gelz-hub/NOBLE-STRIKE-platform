import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { searchProfiles } from "@/lib/profile/queries";
import { PlayerSearchFilters } from "@/components/players/player-search-filters";
import { PlayerCard } from "@/components/players/player-card";
import { PaginationLinks } from "@/components/admin/pagination-links";
import { ArrowLeft, Users } from "lucide-react";

interface Props {
  searchParams: Promise<{ q?: string; country?: string; team?: string; page?: string }>;
}

const PAGE_SIZE = 24;

export default async function PlayersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  const { rows, total } = await searchProfiles(supabase, {
    query: sp.q,
    country: sp.country,
    team: sp.team,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60 hover:text-gold-light mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Site
          </Link>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white">Player Search</h1>
          <p className="text-muted-foreground mt-2">Find players by username, country, or team.</p>
        </div>

        <PlayerSearchFilters />

        {rows.length === 0 ? (
          <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
            <Users className="w-8 h-8 text-gold/50" />
            <p className="text-white/70">No players found.</p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((p) => (
                <PlayerCard key={p.id} profile={p} />
              ))}
            </div>
            <PaginationLinks page={page} totalPages={totalPages} searchParams={sp} />
          </>
        )}
      </div>
    </div>
  );
}
