"use client";

import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { useFetch } from "../hooks";
import {
  SectionHeading,
  NSCardSkeleton,
} from "../ui";
import { Button } from "@/components/ui/button";
import {
  Newspaper,
  Search,
  ArrowLeft,
  ArrowRight,
  Clock,
  User,
  Calendar,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NEWS_CATEGORY_LABELS } from "@/lib/types";
import type { Announcement } from "@/lib/types";

const CATEGORIES = [
  { id: "ALL", label: "All" },
  { id: "TOURNAMENT_NEWS", label: "Tournaments" },
  { id: "TEAM_UPDATES", label: "Team Updates" },
  { id: "PLAYER_SIGNINGS", label: "Signings" },
  { id: "RESULTS", label: "Results" },
  { id: "ANNOUNCEMENTS", label: "Announcements" },
];

export function NewsView() {
  const selectedId = useApp((s) => s.selectedNewsId);
  const openNews = useApp((s) => s.openNews);
  const [category, setCategory] = useState("ALL");
  const [query, setQuery] = useState("");

  const { data: news, loading } = useFetch<Announcement[]>(
    `/api/news${category !== "ALL" ? `?category=${category}` : ""}${
      query ? `${category !== "ALL" ? "&" : "?"}search=${encodeURIComponent(query)}` : ""
    }`
  );

  const selected = useMemo(
    () => (news || []).find((n) => n.id === selectedId) || null,
    [news, selectedId]
  );

  if (selected) {
    return <NewsArticle article={selected} />;
  }

  const featured = (news || []).find((n) => n.featured) || (news || [])[0] || null;
  const rest = (news || []).filter((n) => n.id !== featured?.id);

  return (
    <div className="pt-24 md:pt-28 pb-20 ns-fade-up" lang="en">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <SectionHeading
          kicker="The Newsroom"
          title="News & Announcements"
          description="Tournament coverage, signings, results, and official NS updates."
        />

        {/* Search + filters */}
        <div className="mt-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "px-3.5 py-2 rounded-md text-xs font-heading font-semibold uppercase tracking-wider transition-all border",
                  category === c.id
                    ? "bg-gold/15 border-gold/50 text-gold-light"
                    : "border-gold/15 text-white/60 hover:text-white hover:border-gold/30"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search articles..."
              className="w-full h-10 pl-10 pr-4 rounded-md bg-black/40 border border-gold/20 focus:border-gold/50 text-sm placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <NSCardSkeleton className="md:col-span-2 h-80" />
            <NSCardSkeleton className="h-80" />
          </div>
        ) : (news || []).length === 0 ? (
          <div className="mt-8 text-center py-20 text-muted-foreground">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-gold/30" />
            No articles found.
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && !query && category === "ALL" && (
              <button
                onClick={() => openNews(featured.id)}
                className="group mt-8 block w-full text-left ns-card ns-card-gold-edge rounded-2xl overflow-hidden"
              >
                <div className="grid md:grid-cols-2">
                  <div className="relative h-64 md:h-auto bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black overflow-hidden">
                    <div className="absolute inset-0 ns-grid-bg opacity-40" />
                    <div className="absolute inset-0 ns-radial-gold" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-20 h-20 text-gold/20 group-hover:text-gold/40 group-hover:scale-110 transition-all duration-500" />
                    </div>
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <span className="ns-pill ns-pill-ongoing">
                        <Sparkles className="w-3 h-3" />
                        Featured
                      </span>
                    </div>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="ns-pill ns-pill-approved">
                        {NEWS_CATEGORY_LABELS[featured.category] || featured.category}
                      </span>
                    </div>
                    <h2 className="font-display font-black text-2xl md:text-3xl text-white group-hover:text-gold-light transition-colors">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                        {featured.excerpt}
                      </p>
                    )}
                    <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
                      {featured.author && (
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          {featured.author}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(featured.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-gold-light group-hover:gap-2 transition-all">
                      Read Article
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Grid */}
            <div className="grid gap-6 mt-8 md:grid-cols-2 lg:grid-cols-3">
              {(query || category !== "ALL" ? news || [] : rest).map((n) => (
                <NewsTile key={n.id} news={n} onClick={() => openNews(n.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NewsTile({
  news,
  onClick,
}: {
  news: Announcement;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group text-left ns-card ns-card-gold-edge rounded-xl overflow-hidden w-full"
    >
      <div className="relative h-44 bg-gradient-to-br from-[#1a1a1a] to-black overflow-hidden">
        <div className="absolute inset-0 ns-grid-bg opacity-30" />
        <div className="absolute inset-0 ns-radial-gold opacity-40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Newspaper className="w-12 h-12 text-gold/15 group-hover:text-gold/35 transition-colors" />
        </div>
        <div className="absolute top-3 left-3">
          <span className="ns-pill ns-pill-ongoing">
            {NEWS_CATEGORY_LABELS[news.category] || news.category}
          </span>
        </div>
      </div>
      <div className="p-5">
        <span className="text-[0.7rem] text-muted-foreground">
          {new Date(news.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <h3 className="mt-2 font-display font-bold text-base text-white group-hover:text-gold-light transition-colors line-clamp-2">
          {news.title}
        </h3>
        {news.excerpt && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
            {news.excerpt}
          </p>
        )}
      </div>
    </button>
  );
}

function NewsArticle({ article }: { article: Announcement }) {
  const openNews = useApp((s) => s.openNews);
  return (
    <div className="pt-24 md:pt-28 pb-20 ns-fade-up" lang="en">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <button
          onClick={() => openNews("")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold-light transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to news
        </button>

        <span className="ns-pill ns-pill-ongoing">
          {NEWS_CATEGORY_LABELS[article.category] || article.category}
        </span>

        <h1 className="mt-5 font-display font-black text-3xl md:text-5xl text-white leading-tight">
          {article.title}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-y border-gold/10 py-4">
          {article.author && (
            <span className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#E6D69A] to-[#92783D] flex items-center justify-center font-display font-bold text-black text-xs">
                {article.author[0]?.toUpperCase()}
              </div>
              {article.author}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {new Date(article.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {Math.max(2, Math.ceil(article.content.length / 800))} min read
          </span>
        </div>

        {/* cover */}
        <div className="mt-8 relative h-56 md:h-72 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1a1a1a] to-black ns-card ns-card-gold-edge">
          <div className="absolute inset-0 ns-grid-bg opacity-30" />
          <div className="absolute inset-0 ns-radial-gold" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Newspaper className="w-20 h-20 text-gold/20" />
          </div>
        </div>

        {/* body */}
        <div className="mt-8 prose prose-invert max-w-none">
          <div className="text-base text-white/80 leading-relaxed whitespace-pre-line space-y-4">
            {article.content.split("\n").map((para, i) => (
              <p key={i} className={para.startsWith("#") ? "font-display font-bold text-xl text-gold-light mt-6" : ""}>
                {para.replace(/^#+\s*/, "")}
              </p>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="mt-12 pt-8 border-t border-gold/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="ns-pill ns-pill-approved">
              {NEWS_CATEGORY_LABELS[article.category] || article.category}
            </span>
          </div>
          <Button
            onClick={() => openNews("")}
            variant="ghost"
            className="text-gold-light hover:text-gold-light hover:bg-gold/10"
          >
            More News
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
