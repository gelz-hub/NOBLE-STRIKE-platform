import {
  SkeletonAnnounce,
  SkeletonBlock,
  SkeletonCard,
  SkeletonDetailHero,
  SkeletonStatGrid,
} from "@/components/skeletons/ns-skeleton";
import { PageNav } from "@/components/ns/page-nav";

export default function TeamDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <PageNav />
      <SkeletonAnnounce />
      <SkeletonDetailHero />
      <div className="mx-auto max-w-5xl px-4 md:px-6 -mt-16 relative space-y-8">
        <div className="flex items-end gap-4">
          <div className="w-28 h-28 rounded-2xl bg-white/10 border-4 border-background animate-pulse shrink-0" />
          <SkeletonBlock className="h-8 w-56 mb-2" />
        </div>
        <SkeletonStatGrid count={3} className="grid-cols-3" />
        <div className="space-y-4">
          <SkeletonBlock className="h-5 w-32" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </div>
  );
}
