import Link from "next/link";
import { getAdminNews, getNewsStats } from "@/lib/news/queries";
import { NewsFilters } from "@/components/admin/news-filters";
import { NewsRow } from "@/components/admin/news-row";
import { PaginationLinks } from "@/components/admin/pagination-links";
import { Button } from "@/components/ui/button";
import { Newspaper, Plus, TrendingUp } from "lucide-react";
import type { NewsCategory, NewsStatus } from "@/lib/types/database";

interface Props {
  searchParams: Promise<{
    status?: string;
    category?: string;
    pinned?: string;
    search?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 20;

export default async function AdminNewsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total }, stats] = await Promise.all([
    getAdminNews({
      status: sp.status as NewsStatus | undefined,
      category: sp.category as NewsCategory | undefined,
      pinned: sp.pinned === "true" ? true : sp.pinned === "false" ? false : undefined,
      search: sp.search,
      page,
      pageSize: PAGE_SIZE,
    }),
    getNewsStats(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">News &amp; Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage every article on the platform.</p>
        </div>
        <Link href="/admin/news/new">
          <Button className="ns-btn-gold h-10 px-4 text-xs uppercase tracking-wider">
            <Plus className="w-4 h-4" />
            New Article
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="ns-card rounded-lg p-3 text-center">
          <div className="font-display font-bold text-xl text-white">{stats.draftCount}</div>
          <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">Draft</div>
        </div>
        <div className="ns-card rounded-lg p-3 text-center">
          <div className="font-display font-bold text-xl text-white">{stats.publishedCount}</div>
          <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">Published</div>
        </div>
        <div className="ns-card rounded-lg p-3 text-center">
          <div className="font-display font-bold text-xl text-white">{stats.archivedCount}</div>
          <div className="text-[0.6rem] text-muted-foreground uppercase tracking-wider mt-0.5">Archived</div>
        </div>
      </div>

      {stats.mostViewed.length > 0 && (
        <div className="ns-card rounded-lg p-4 space-y-2">
          <p className="text-xs font-heading font-semibold uppercase tracking-wider text-gold-light flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Most Viewed
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.mostViewed.map((a) => (
              <Link
                key={a.id}
                href={`/admin/news/${a.id}/edit`}
                className="text-xs text-white/70 hover:text-gold-light bg-black/30 border border-white/10 rounded-md px-2.5 py-1"
              >
                {a.title} · {a.view_count} views
              </Link>
            ))}
          </div>
        </div>
      )}

      <NewsFilters />

      {rows.length === 0 ? (
        <div className="ns-card rounded-xl p-12 flex flex-col items-center text-center gap-3">
          <Newspaper className="w-8 h-8 text-gold/50" />
          <p className="text-white/70">No articles match these filters.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {rows.map((n) => (
              <NewsRow key={n.id} news={n} />
            ))}
          </div>
          <PaginationLinks page={page} totalPages={totalPages} searchParams={sp} />
        </>
      )}
    </div>
  );
}
