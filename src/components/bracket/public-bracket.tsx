"use client";

import { useEffect, useRef, useState } from "react";
import { BracketView } from "./bracket-view";
import type { BracketRound } from "@/lib/bracket/queries";
import type { BracketFormat } from "@/lib/types/database";

interface PublicBracketProps {
  rounds: BracketRound[];
  bracketFormat: BracketFormat;
  /** Headline shown above the bracket, e.g. "Main Event - Top 16 Teams". */
  mainEventTitle: string | null;
  /** Note shown when qualifier rounds are being hidden from the public. */
  hiddenNote: string | null;
  /** Below this round count the whole bracket renders at once. */
  lazyThreshold?: number;
}

/**
 * Public-facing bracket wrapper. Two performance behaviours for big
 * tournaments (the spec's "> 64 teams" case):
 *
 *  1. The heavy {@link BracketView} (one client `MatchCard` per match) is not
 *     mounted until it scrolls near the viewport.
 *  2. When there are many rounds, only the latest ones render initially; the
 *     earlier rounds mount on demand via "Show earlier rounds".
 *
 * Qualifier rounds excluded by the Featured Bracket Stage setting are already
 * gone before they reach this component — they are never sent or rendered.
 */
export function PublicBracket({
  rounds,
  bracketFormat,
  mainEventTitle,
  hiddenNote,
  lazyThreshold = 6,
}: PublicBracketProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(rounds.length <= lazyThreshold);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(id);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  const shownRounds = expanded ? rounds : rounds.slice(-lazyThreshold);
  const hiddenCount = rounds.length - shownRounds.length;

  return (
    <div className="space-y-4" ref={containerRef}>
      {mainEventTitle && (
        <div className="flex flex-col gap-1">
          <p className="font-display font-extrabold text-lg md:text-xl text-gold-light uppercase tracking-wide">
            {mainEventTitle}
          </p>
          {hiddenNote && <p className="text-xs text-muted-foreground">{hiddenNote}</p>}
        </div>
      )}

      {!expanded && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs uppercase tracking-wider text-gold-light border border-gold/30 rounded-md px-3 py-1.5 hover:bg-gold/10"
        >
          Show earlier rounds ({hiddenCount})
        </button>
      )}

      <div className="ns-card ns-card-gold-edge rounded-xl p-6 overflow-x-auto">
        {visible ? (
          <BracketView rounds={shownRounds} editable={false} bracketFormat={bracketFormat} />
        ) : (
          <BracketSkeleton rounds={shownRounds.length} />
        )}
      </div>
    </div>
  );
}

function BracketSkeleton({ rounds }: { rounds: number }) {
  return (
    <div className="flex gap-6 animate-pulse" aria-hidden>
      {Array.from({ length: Math.max(1, Math.min(rounds, 5)) }).map((_, i) => (
        <div key={i} className="flex flex-col gap-4 min-w-[220px]">
          <div className="h-3 w-24 bg-white/10 rounded mx-auto" />
          {Array.from({ length: Math.max(1, 4 - i) }).map((_, j) => (
            <div key={j} className="h-[68px] bg-white/5 border border-white/10 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}
