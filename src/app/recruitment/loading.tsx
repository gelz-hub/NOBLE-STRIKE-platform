import { SkeletonAnnounce, SkeletonBlock, SkeletonCardGrid, SkeletonPageHeader } from "@/components/skeletons/ns-skeleton";

export default function RecruitmentLoading() {
  return (
    <div className="min-h-screen bg-background">
      <SkeletonAnnounce />
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-8">
        <SkeletonPageHeader />
        <SkeletonBlock className="h-10 w-full max-w-lg" />
        <SkeletonCardGrid count={6} />
      </div>
    </div>
  );
}
