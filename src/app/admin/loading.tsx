import { SkeletonAnnounce, SkeletonBlock, SkeletonRowList } from "@/components/skeletons/ns-skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <SkeletonAnnounce />
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-8 w-56" />
        <SkeletonBlock className="h-10 w-32 rounded-md" />
      </div>
      <SkeletonRowList count={6} />
    </div>
  );
}
