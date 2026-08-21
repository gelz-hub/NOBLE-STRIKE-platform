import Link from "next/link";
import Image from "next/image";
import { Eye, Pin } from "lucide-react";
import { NEWS_CATEGORY_LABELS } from "@/lib/validation/news";
import type { NewsWithAuthor } from "@/lib/news/queries";

export function NewsCard({ article, large }: { article: NewsWithAuthor; large?: boolean }) {
  return (
    <Link
      href={`/news/${article.slug}`}
      className={`ns-card ns-card-gold-edge rounded-xl overflow-hidden flex flex-col group ${large ? "sm:col-span-2" : ""}`}
    >
      <div className={`relative w-full overflow-hidden ${large ? "aspect-[21/9]" : "aspect-video"}`}>
        {article.image_url ? (
          <Image
            src={article.image_url}
            alt={article.title}
            fill
            sizes={large ? "100vw" : "(min-width: 640px) 33vw, 100vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black ns-grid-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="ns-pill ns-pill-open">{NEWS_CATEGORY_LABELS[article.category]}</span>
          {article.pinned && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-gold/20 border border-gold/50 text-gold-light">
              <Pin className="w-2.5 h-2.5" />
              Pinned
            </span>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2 flex-1">
        <h3 className={`font-display font-bold text-white group-hover:text-gold-light transition-colors ${large ? "text-2xl" : "text-base"}`}>
          {article.title}
        </h3>
        {article.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{article.excerpt}</p>}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-gold/10 mt-auto">
          <span>
            {article.author?.username ?? "NOBLE STRIKE"} ·{" "}
            {article.publish_at ? new Date(article.publish_at).toLocaleDateString() : ""}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {article.view_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
