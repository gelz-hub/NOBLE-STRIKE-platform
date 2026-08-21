"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

const STATUSES = [
  "ALL",
  "PENDING",
  "SCHEDULED",
  "READY",
  "LIVE",
  "COMPLETED",
  "DISPUTED",
  "CANCELLED",
] as const;

interface MatchesFiltersProps {
  tournaments: { id: string; title: string }[];
  referees: { id: string; username: string | null }[];
}

export function MatchesFilters({ tournaments, referees }: MatchesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [, startTransition] = useTransition();

  const activeStatus = searchParams.get("status") ?? "ALL";
  const activeTournament = searchParams.get("tournamentId") ?? "ALL";
  const activeReferee = searchParams.get("refereeId") ?? "ALL";

  function updateParams(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "ALL") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => updateParams({ status: s })}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-heading font-semibold uppercase tracking-wider border transition-all",
              activeStatus === s
                ? "text-gold-light bg-gold/10 border-gold/40"
                : "text-white/60 border-transparent hover:border-gold/20"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParams({ search: search || null });
          }}
          className="relative flex-1"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team or tournament..."
            className="h-9 pl-9 ns-input text-sm"
          />
        </form>

        <Select
          value={activeTournament}
          onValueChange={(v) => updateParams({ tournamentId: v })}
        >
          <SelectTrigger className="h-9 w-full sm:w-56 ns-input text-sm">
            <SelectValue placeholder="All Tournaments" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-gold/30">
            <SelectItem value="ALL">All Tournaments</SelectItem>
            {tournaments.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activeReferee} onValueChange={(v) => updateParams({ refereeId: v })}>
          <SelectTrigger className="h-9 w-full sm:w-48 ns-input text-sm">
            <SelectValue placeholder="All Referees" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-gold/30">
            <SelectItem value="ALL">All Referees</SelectItem>
            {referees.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.username ?? "Unnamed"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
