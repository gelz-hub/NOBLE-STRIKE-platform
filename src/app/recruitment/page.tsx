import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getRecruitmentPosts } from "@/lib/recruitment/queries";
import { RecruitmentTabs, RecruitmentFilters } from "@/components/recruitment/recruitment-filters";
import { RecruitmentPostCard } from "@/components/recruitment/recruitment-post-card";
import { CreatePostButton } from "@/components/recruitment/create-post-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationLinks } from "@/components/admin/pagination-links";
import { ArrowLeft, Users } from "lucide-react";
import type { RecruitmentPostType, RecruitmentRole, RecruitmentStatus } from "@/lib/types/database";

interface Props {
  searchParams: Promise<{
    tab?: string;
    game?: string;
    role?: string;
    country_code?: string;
    status?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 12;

export default async function RecruitmentPage({ searchParams }: Props) {
  const t = await getTranslations("recruitment");
  const sp = await searchParams;
  const postType: RecruitmentPostType = sp.tab === "LFP" ? "LFP" : "LFT";
  const page = Math.max(1, Number(sp.page) || 1);
  const status = (sp.status as RecruitmentStatus | undefined) ?? "OPEN";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = profile?.role === "admin";
  }

  const { rows, total } = await getRecruitmentPosts({
    postType,
    game: sp.game as "MLBB" | "HOK" | undefined,
    role: sp.role as RecruitmentRole | undefined,
    countryCode: postType === "LFT" ? sp.country_code : undefined,
    status,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-secondary hover:text-gold-light mb-4">
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("backToSite")}
          </Link>
          <h1 className="font-display font-extrabold text-3xl md:text-4xl text-text-primary">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>

        <RecruitmentTabs active={postType} />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <RecruitmentFilters postType={postType} />
          {user && <CreatePostButton postType={postType} />}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("noPostsFound")}
            description={t("noPostsHint")}
          />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((post) => (
                <RecruitmentPostCard
                  key={post.id}
                  post={post}
                  canManage={!!user && (isAdmin || post.author_id === user.id)}
                />
              ))}
            </div>
            <PaginationLinks page={page} totalPages={totalPages} searchParams={sp} />
          </>
        )}
      </div>
    </div>
  );
}
