import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewsForm } from "@/components/admin/news-form";
import { NewsActionsMenu } from "@/components/admin/news-actions-menu";
import { ExternalLink, Eye } from "lucide-react";
import { updateNews } from "../../actions";
import type { News } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditNewsPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: news }, { data: tournaments }] = await Promise.all([
    supabase.from("news").select("*").eq("id", id).single(),
    supabase.from("tournaments").select("id, title").order("created_at", { ascending: false }),
  ]);
  if (!news) notFound();

  const article = news as News;
  const boundUpdate = updateNews.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Edit Article</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            {article.view_count} views
          </p>
        </div>
        <div className="flex items-center gap-2">
          {article.status === "PUBLISHED" && (
            <Link
              href={`/news/${article.slug}`}
              className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/60 hover:text-gold-light"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </Link>
          )}
          <NewsActionsMenu newsId={id} title={article.title} status={article.status} redirectOnDelete />
        </div>
      </div>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <NewsForm action={boundUpdate} initial={article} mode="edit" tournaments={tournaments ?? []} />
      </div>
    </div>
  );
}
