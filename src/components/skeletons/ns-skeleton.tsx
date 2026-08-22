// Branded (black + gold) skeleton primitives for route-level loading.tsx
// files. Deliberately server-safe (no "use client", no hooks) — these are
// shown the instant navigation starts, before any client JS needs to run,
// so they stay pure static markup reusing the same `.ns-card`/`.ns-card-
// gold-edge` surface classes as the real content for visual continuity.

import { cn } from "@/lib/utils";

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("bg-white/5 rounded animate-pulse", className)} />;
}

/**
 * One of these per loading.tsx page (not one per skeleton primitive —
 * nesting several live regions on the same page causes redundant/
 * duplicate announcements). Visually hidden; gives assistive tech a
 * "loading" signal that the skeleton's own animate-pulse divs can't.
 */
export function SkeletonAnnounce({ label = "Loading" }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {label}
    </span>
  );
}

/** Matches the shape of a tournament/team/news card — banner + two text lines. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("ns-card ns-card-gold-edge rounded-xl overflow-hidden", className)}>
      <div className="h-40 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] animate-pulse" />
      <div className="p-5 space-y-3">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
        <SkeletonBlock className="h-3 w-full" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({
  count = 6,
  className = "sm:grid-cols-2 lg:grid-cols-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Matches the compact team-roster-row card shape (avatar + two text lines). */
export function SkeletonRow() {
  return (
    <div className="ns-card rounded-lg p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-1/3" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonRowList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

/** Matches the StatCard tiles used on dashboard/team overview pages. */
export function SkeletonStatTile() {
  return (
    <div className="ns-card rounded-xl p-4 text-center space-y-2.5">
      <div className="w-11 h-11 rounded-lg bg-white/5 animate-pulse mx-auto" />
      <SkeletonBlock className="h-6 w-16 mx-auto" />
      <SkeletonBlock className="h-2.5 w-20 mx-auto" />
    </div>
  );
}

export function SkeletonStatGrid({
  count = 4,
  className = "grid-cols-2 lg:grid-cols-4",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatTile key={i} />
      ))}
    </div>
  );
}

/** Matches a banner-hero detail page (tournament/team/profile). */
export function SkeletonDetailHero() {
  return (
    <div className="relative h-56 md:h-72 w-full overflow-hidden bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black animate-pulse" />
  );
}

export function SkeletonPageHeader() {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-3 w-24" />
      <SkeletonBlock className="h-8 w-64" />
    </div>
  );
}
