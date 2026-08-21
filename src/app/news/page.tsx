import Link from "next/link";
import { getPublishedNews, getFeaturedArticle, getPinnedAnnouncements } from "@/lib/news/queries";
import { NewsCard } from "@/components/news/news-card";
import { NewsPublicFilters } from "@/components/news/news-public-filters";
import { PaginationLinks } from "@/components/admin/pagination-links";
import { ArrowLeft, Newspaper } from "lucide-react";
import { TelegramButtons } from "@/components/telegram/telegram-buttons";
import type { NewsCategory } from "@/lib/types/database";

interface Props {
  searchParams: Promise<{ category?: string; search?: string; page?: string }>;
}

const PAGE_SIZE = 9;

export default async function NewsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const isFiltered = !!(sp.category || sp.search);

  const [{ rows, total }, featured, pinned] = await Promise.all([
    getPublishedNews({ category: sp.category as NewsCategory | undefined, search: sp.search, page, pageSize: PAGE_SIZE }),
    isFiltered ? Promise.resolve(null) : getFeaturedArticle(),
    isFiltered ? Promise.resolve([]) : getPinnedAnnouncements(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // The listing already includes pinned + featured articles (pinned sorts
  // first); avoid showing the featured article twice.
  const listRows = featured ? rows.filter((r) => r.id !== featured.id) : rows;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-10">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60 hover:text-gold-light mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Site
          </Link>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-white">Newsroom</h1>
          <p className="text-muted-foreground mt-2">The latest from NOBLE STRIKE — tournaments, results, and announcements.</p>
          <TelegramButtons className="mt-4" />
        </div>

        {featured && !isFiltered && (
          <section>
            <NewsCard article={featured} large />
          </section>
        )}

        {pinned.length > 0 && !isFiltered && (
          <section className="space-y-4">
            <h2 className="font-heading font-bold uppercase tracking-wider text-sm text-gold-light">Pinned Announcements</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pinned.map((a) => (
                <NewsCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <NewsPublicFilters />

          {listRows.length === 0 ? (
            <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
              <Newspaper className="w-8 h-8 text-gold/50" />
              <p className="text-white/70">No articles found.</p>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {listRows.map((a) => (
                  <NewsCard key={a.id} article={a} />
                ))}
              </div>
              <PaginationLinks page={page} totalPages={totalPages} searchParams={sp} />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
