import { SkeletonAnnounce, SkeletonBlock, SkeletonCard, SkeletonCardGrid, SkeletonPageHeader } from "@/components/skeletons/ns-skeleton";
import { PageNav } from "@/components/ns/page-nav";

export default function NewsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <PageNav />
      <SkeletonAnnounce />
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-10">
        <SkeletonPageHeader />
        <SkeletonCard className="h-72" />
        <div className="space-y-4">
          <SkeletonBlock className="h-9 w-full max-w-md" />
          <SkeletonCardGrid count={6} />
        </div>
      </div>
    </div>
  );
}
