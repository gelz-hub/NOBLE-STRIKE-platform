import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getNewsBySlug, getRelatedArticles, incrementNewsView } from "@/lib/news/queries";
import { NewsCard } from "@/components/news/news-card";
import { ShareLinks } from "@/components/news/share-links";
import { MarkdownContent } from "@/components/news/markdown-content";
import { ArrowLeft, Calendar, Eye, Pin, User } from "lucide-react";
import { NEWS_CATEGORY_LABELS } from "@/lib/validation/news";
import { TelegramButtons } from "@/components/telegram/telegram-buttons";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  if (!article) return { title: "Article Not Found" };
  return {
    title: `${article.title} — NOBLE STRIKE`,
    description: article.seo_description || article.excerpt || undefined,
    keywords: article.seo_keywords ?? undefined,
    openGraph: {
      title: article.title,
      description: article.seo_description || article.excerpt || undefined,
      images: article.image_url ? [article.image_url] : undefined,
    },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  if (!article) notFound();

  await incrementNewsView(article.id);
  const related = await getRelatedArticles(article.id, article.category);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const articleUrl = `${siteUrl}/news/${article.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-64 md:h-96 w-full overflow-hidden">
        {article.image_url ? (
          <Image src={article.image_url} alt={article.title} fill sizes="100vw" className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black ns-grid-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
        <Link
          href="/news"
          className="absolute top-5 left-4 md:left-6 flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/70 hover:text-gold-light bg-black/40 backdrop-blur-sm border border-white/10 rounded-md px-3 py-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Newsroom
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-4 md:px-6 -mt-12 relative pb-16">
        <div className="ns-card ns-card-gold-edge rounded-xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="ns-pill ns-pill-open">{NEWS_CATEGORY_LABELS[article.category]}</span>
            {article.pinned && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-gold/20 border border-gold/50 text-gold-light">
                <Pin className="w-2.5 h-2.5" />
                Pinned
              </span>
            )}
          </div>

          <h1 className="font-display font-extrabold text-2xl md:text-4xl text-white leading-tight">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {article.author?.username ?? "NOBLE STRIKE"}
            </span>
            {article.publish_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Published {new Date(article.publish_at).toLocaleDateString()}
              </span>
            )}
            {article.updated_at && article.publish_at && article.updated_at !== article.publish_at && (
              <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {article.view_count} views
            </span>
          </div>

          <ShareLinks title={article.title} url={articleUrl} />

          <div className="pt-2 border-t border-gold/10">
            <MarkdownContent content={article.content} />
          </div>

          <div className="pt-4 border-t border-gold/10">
            <ShareLinks title={article.title} url={articleUrl} />
          </div>

          <div className="pt-4 border-t border-gold/10">
            <TelegramButtons />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="font-heading font-bold uppercase tracking-wider text-sm text-gold-light">
              Related Articles
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map((a) => (
                <NewsCard key={a.id} article={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
