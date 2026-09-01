import {
  SkeletonAnnounce,
  SkeletonBlock,
  SkeletonCardGrid,
  SkeletonDetailHero,
  SkeletonStatGrid,
} from "@/components/skeletons/ns-skeleton";
import { PageNav } from "@/components/ns/page-nav";

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      <PageNav />
      <SkeletonAnnounce />
      <SkeletonDetailHero />
      <div className="mx-auto max-w-5xl px-4 md:px-6 -mt-16 relative space-y-8">
        <div className="flex items-end gap-4">
          <div className="w-24 h-24 rounded-full bg-white/10 border-4 border-background animate-pulse shrink-0" />
          <SkeletonBlock className="h-8 w-48 mb-2" />
        </div>
        <SkeletonStatGrid count={6} className="grid-cols-3 sm:grid-cols-6" />
        <SkeletonCardGrid count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      </div>
    </div>
  );
}
