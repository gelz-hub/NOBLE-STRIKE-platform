import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { NewsForm } from "@/components/admin/news-form";
import { NewsActionsMenu } from "@/components/admin/news-actions-menu";
import { ExternalLink, Eye } from "lucide-react";
import { pickLocalized } from "@/lib/i18n/content";
import { updateNews } from "../../actions";
import type { Locale } from "@/i18n/config";
import type { News } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditNewsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: news }, { data: tournamentRows }, localeStr, t] = await Promise.all([
    supabase.from("news").select("*").eq("id", id).single(),
    supabase.from("tournaments").select("id, name_en").order("created_at", { ascending: false }),
    getLocale(),
    getTranslations("admin.news"),
  ]);
  if (!news) notFound();

  const locale = localeStr as Locale;
  const tournaments = (tournamentRows ?? []).map((row) => ({ id: row.id, title: row.name_en }));
  const article = news as News;
  const title = pickLocalized(article, "title", locale);
  const boundUpdate = updateNews.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">{t("editArticleHeading")}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            {t("viewsCount", { count: article.view_count })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {article.status === "PUBLISHED" && (
            <Link
              href={`/news/${article.slug}`}
              className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60 hover:text-gold-light"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {t("view")}
            </Link>
          )}
          <NewsActionsMenu newsId={id} title={title} status={article.status} redirectOnDelete />
        </div>
      </div>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <NewsForm action={boundUpdate} initial={article} mode="edit" tournaments={tournaments} />
      </div>
    </div>
  );
}
