import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { StatusPill } from "@/components/ns/ui";
import { NewsActionsMenu } from "./news-actions-menu";
import { PenSquare, Pin, Eye } from "lucide-react";
import { pickLocalized } from "@/lib/i18n/content";
import type { Locale } from "@/i18n/config";
import type { NewsWithAuthor } from "@/lib/news/queries";

export async function NewsRow({ news }: { news: NewsWithAuthor }) {
  const [localeStr, t, tCategory] = await Promise.all([
    getLocale(),
    getTranslations("admin.news"),
    getTranslations("news.category"),
  ]);
  const locale = localeStr as Locale;
  const title = pickLocalized(news, "title", locale);

  return (
    <div className="ns-card rounded-lg p-3 flex items-center gap-3">
      <div className="relative w-16 h-10 rounded-md overflow-hidden bg-black/40 border border-gold/15 shrink-0">
        {news.image_url ? (
          <Image src={news.image_url} alt="" fill sizes="64px" className="object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-black" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {news.pinned && <Pin className="w-3 h-3 text-gold shrink-0" />}
          <p className="text-sm font-medium text-white truncate" lang={locale}>
            {title}
          </p>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {tCategory(news.category.toLowerCase())} · {news.author?.username ?? t("unknownAuthor")} ·{" "}
          {new Date(news.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/60 shrink-0">
        <Eye className="w-3.5 h-3.5 text-gold/60" />
        {news.view_count}
      </div>

      <StatusPill status={news.status} />

      <Link
        href={`/admin/news/${news.id}/edit`}
        className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-gold/20 text-xs uppercase tracking-wider text-white/70 hover:text-gold-light hover:border-gold/40 transition-colors shrink-0"
      >
        <PenSquare className="w-3.5 h-3.5" />
        {t("edit")}
      </Link>

      <NewsActionsMenu newsId={news.id} title={title} status={news.status} />
    </div>
  );
}
