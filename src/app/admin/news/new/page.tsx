import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { NewsForm } from "@/components/admin/news-form";
import { createNews } from "../actions";

export default async function NewNewsPage() {
  const supabase = await createClient();
  const [{ data: tournamentRows }, t] = await Promise.all([
    supabase.from("tournaments").select("id, name_en").order("created_at", { ascending: false }),
    getTranslations("admin.news"),
  ]);
  const tournaments = (tournamentRows ?? []).map((row) => ({ id: row.id, title: row.name_en }));

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">{t("newArticleHeading")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("newArticleSubheading")}</p>
      </div>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <NewsForm action={createNews} mode="create" tournaments={tournaments} />
      </div>
    </div>
  );
}
