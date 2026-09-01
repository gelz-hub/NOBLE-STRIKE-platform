import { SkeletonAnnounce, SkeletonBlock, SkeletonCardGrid, SkeletonPageHeader } from "@/components/skeletons/ns-skeleton";
import { PageNav } from "@/components/ns/page-nav";

export default function RecruitmentLoading() {
  return (
    <div className="min-h-screen bg-background">
      <PageNav />
      <SkeletonAnnounce />
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-8">
        <SkeletonPageHeader />
        <SkeletonBlock className="h-10 w-full max-w-lg" />
        <SkeletonCardGrid count={6} />
      </div>
    </div>
  );
}
