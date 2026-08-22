"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { NEWS_CATEGORIES } from "@/lib/validation/news";

export function NewsPublicFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [, startTransition] = useTransition();
  const activeCategory = searchParams.get("category") ?? "ALL";
  const t = useTranslations("news");
  const tCategory = useTranslations("news.category");

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
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {(["ALL", ...NEWS_CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => updateParams({ category: c })}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-heading font-semibold uppercase tracking-wider border transition-all",
              activeCategory === c
                ? "text-gold-light bg-gold/10 border-gold/40"
                : "text-white/60 border-transparent hover:border-gold/20"
            )}
          >
            {c === "ALL" ? t("allCategory") : tCategory(c.toLowerCase())}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateParams({ search: search || null });
        }}
        className="relative w-full sm:w-64"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("searchArticlesPlaceholder")}
          className="h-9 pl-9 ns-input text-sm"
        />
      </form>
    </div>
  );
}
