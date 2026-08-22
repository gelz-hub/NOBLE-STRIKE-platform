import { SkeletonAnnounce, SkeletonBlock, SkeletonRowList, SkeletonStatGrid } from "@/components/skeletons/ns-skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <SkeletonAnnounce />
      <SkeletonBlock className="h-8 w-56" />
      <SkeletonStatGrid count={4} />
      <SkeletonRowList count={4} />
    </div>
  );
}
