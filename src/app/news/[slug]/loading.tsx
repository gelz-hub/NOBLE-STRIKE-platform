import { SkeletonAnnounce, SkeletonBlock, SkeletonCardGrid } from "@/components/skeletons/ns-skeleton";
import { PageNav } from "@/components/ns/page-nav";

export default function NewsArticleLoading() {
  return (
    <div className="min-h-screen bg-background">
      <PageNav />
      <SkeletonAnnounce />
      <div className="relative h-64 md:h-96 w-full overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black animate-pulse" />

      <div className="mx-auto max-w-3xl px-4 md:px-6 -mt-12 relative pb-16">
        <div className="ns-card ns-card-gold-edge rounded-xl p-6 md:p-8 space-y-6">
          {/* category pill */}
          <SkeletonBlock className="h-5 w-24 rounded-full" />

          {/* headline */}
          <div className="space-y-2">
            <SkeletonBlock className="h-8 w-full" />
            <SkeletonBlock className="h-8 w-2/3" />
          </div>

          {/* metadata row: author / date / views */}
          <div className="flex flex-wrap items-center gap-4">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-3 w-16" />
          </div>

          {/* article content */}
          <div className="pt-2 border-t border-gold/10 space-y-3">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-5/6" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-3/4" />
          </div>
        </div>

        {/* related articles */}
        <section className="mt-10 space-y-4">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonCardGrid count={2} className="sm:grid-cols-2" />
        </section>
      </div>
    </div>
  );
}
