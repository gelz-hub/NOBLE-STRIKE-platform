import {
  SkeletonAnnounce,
  SkeletonBlock,
  SkeletonCard,
  SkeletonDetailHero,
  SkeletonStatGrid,
} from "@/components/skeletons/ns-skeleton";

export default function TournamentDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <SkeletonAnnounce />
      <SkeletonDetailHero />
      <div className="mx-auto max-w-5xl px-4 md:px-6 py-8 space-y-8">
        <SkeletonBlock className="h-8 w-72" />
        <SkeletonStatGrid count={4} className="grid-cols-2 sm:grid-cols-4" />
        <SkeletonBlock className="h-10 w-full max-w-lg" />
        <div className="grid sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
