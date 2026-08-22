import {
  SkeletonAnnounce,
  SkeletonCardGrid,
  SkeletonPageHeader,
  SkeletonStatGrid,
} from "@/components/skeletons/ns-skeleton";

export default function LegacyLoading() {
  return (
    <div className="min-h-screen bg-background">
      <SkeletonAnnounce />
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-10">
        <SkeletonPageHeader />
        <SkeletonStatGrid count={5} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />
        <SkeletonCardGrid count={4} className="md:grid-cols-2" />
      </div>
    </div>
  );
}
