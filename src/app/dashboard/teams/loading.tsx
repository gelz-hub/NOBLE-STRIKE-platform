import { SkeletonAnnounce, SkeletonBlock, SkeletonCardGrid } from "@/components/skeletons/ns-skeleton";

export default function DashboardTeamsLoading() {
  return (
    <div className="space-y-6">
      <SkeletonAnnounce />
      <SkeletonBlock className="h-8 w-48" />
      <SkeletonCardGrid count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
    </div>
  );
}
