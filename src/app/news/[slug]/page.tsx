import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { getNewsBySlug, getRelatedArticles, incrementNewsView } from "@/lib/news/queries";
import { NewsCard } from "@/components/news/news-card";
import { ShareLinks } from "@/components/news/share-links";
import { MarkdownContent } from "@/components/news/markdown-content";
import { PageNav } from "@/components/ns/page-nav";
import { Calendar, Eye, Pin, User } from "lucide-react";
import { pickLocalized } from "@/lib/i18n/content";
import { TelegramButtons } from "@/components/telegram/telegram-buttons";
import type { Locale } from "@/i18n/config";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getNewsBySlug(slug);
  if (!article) return { title: "Article Not Found" };
  const locale = (await getLocale()) as Locale;
  const title = pickLocalized(article, "title", locale);
  const excerpt = pickLocalized(article, "excerpt", locale);
  return {
    title: `${title} — NOBLE STRIKE`,
    description: article.seo_description || excerpt || undefined,
    keywords: article.seo_keywords ?? undefined,
    openGraph: {
      title,
      description: article.seo_description || excerpt || undefined,
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
  const [localeStr, t, tCategory] = await Promise.all([
    getLocale(),
    getTranslations("news"),
    getTranslations("news.category"),
  ]);
  const locale = localeStr as Locale;
  const title = pickLocalized(article, "title", locale);
  const content = pickLocalized(article, "content", locale);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const articleUrl = `${siteUrl}/news/${article.slug}`;

  return (
    <div className="min-h-screen bg-background">
      <PageNav backHref="/news" backLabel={t("newsroom")} />
      <div className="relative h-64 md:h-96 w-full overflow-hidden">
        {article.image_url ? (
          <Image src={article.image_url} alt={title} fill sizes="100vw" className="object-cover" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black ns-grid-bg" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
      </div>

      <div className="mx-auto max-w-3xl px-4 md:px-6 -mt-12 relative pb-16">
        <div className="ns-card ns-card-gold-edge rounded-xl p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="ns-pill ns-pill-open">{tCategory(article.category.toLowerCase())}</span>
            {article.pinned && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-gold/20 border border-gold/50 text-gold-light">
                <Pin className="w-2.5 h-2.5" />
                {t("pinned")}
              </span>
            )}
          </div>

          <h1 className="font-display font-extrabold text-2xl md:text-4xl text-white leading-tight" lang={locale}>
            {title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {article.author?.username ?? t("defaultAuthor")}
            </span>
            {article.publish_at && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {t("published")} {new Date(article.publish_at).toLocaleDateString()}
              </span>
            )}
            {article.updated_at && article.publish_at && article.updated_at !== article.publish_at && (
              <span>
                {t("updated")} {new Date(article.updated_at).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {t("viewsCount", { count: article.view_count })}
            </span>
          </div>

          <ShareLinks title={title} url={articleUrl} />

          <div className="pt-2 border-t border-gold/10" lang={locale}>
            <MarkdownContent content={content} />
          </div>

          <div className="pt-4 border-t border-gold/10">
            <ShareLinks title={title} url={articleUrl} />
          </div>

          <div className="pt-4 border-t border-gold/10">
            <TelegramButtons />
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-10 space-y-4">
            <h2 className="font-heading font-bold uppercase tracking-wider text-sm text-gold-light">
              {t("relatedArticles")}
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
