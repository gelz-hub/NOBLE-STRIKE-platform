"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function PlayerSearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [country, setCountry] = useState(searchParams.get("country") ?? "");
  const [team, setTeam] = useState(searchParams.get("team") ?? "");
  const [, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (country) params.set("country", country);
    if (team) params.set("team", team);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          className="h-10 pl-9 ns-input text-sm"
        />
      </div>
      <Input
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        placeholder="Country"
        className="h-10 ns-input text-sm"
      />
      <div className="flex gap-2">
        <Input
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          placeholder="Team name"
          className="h-10 ns-input text-sm flex-1"
        />
        <button type="submit" className="ns-btn-gold h-10 px-4 rounded-md text-xs font-semibold uppercase tracking-wider">
          Search
        </button>
      </div>
    </form>
  );
}
