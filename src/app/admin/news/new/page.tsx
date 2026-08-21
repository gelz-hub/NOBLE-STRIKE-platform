import { createClient } from "@/lib/supabase/server";
import { NewsForm } from "@/components/admin/news-form";
import { createNews } from "../actions";

export default async function NewNewsPage() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase.from("tournaments").select("id, title").order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">New Article</h1>
        <p className="text-sm text-muted-foreground mt-1">Write and publish a news article or announcement.</p>
      </div>

      <div className="ns-card ns-card-gold-edge rounded-xl p-6">
        <NewsForm action={createNews} mode="create" tournaments={tournaments ?? []} />
      </div>
    </div>
  );
}
