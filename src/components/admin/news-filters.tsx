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
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS, NEWS_STATUSES } from "@/lib/validation/news";

export function NewsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [, startTransition] = useTransition();

  const activeStatus = searchParams.get("status") ?? "ALL";
  const activeCategory = searchParams.get("category") ?? "ALL";
  const activePinned = searchParams.get("pinned") ?? "ALL";

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
        {(["ALL", ...NEWS_STATUSES] as const).map((s) => (
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
            placeholder="Search title..."
            className="h-9 pl-9 ns-input text-sm"
          />
        </form>

        <Select value={activeCategory} onValueChange={(v) => updateParams({ category: v })}>
          <SelectTrigger className="h-9 w-full sm:w-48 ns-input text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-gold/30">
            <SelectItem value="ALL">All Categories</SelectItem>
            {NEWS_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {NEWS_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activePinned} onValueChange={(v) => updateParams({ pinned: v })}>
          <SelectTrigger className="h-9 w-full sm:w-36 ns-input text-sm">
            <SelectValue placeholder="Pinned" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-gold/30">
            <SelectItem value="ALL">Pinned: All</SelectItem>
            <SelectItem value="true">Pinned Only</SelectItem>
            <SelectItem value="false">Not Pinned</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
