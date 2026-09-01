"use client";

import { useEffect, useState } from "react";

/**
 * Shared "has the page scrolled past `threshold`px" flag, used by every
 * NOBLE STRIKE navbar (`NavBar`, `PageNav`) to drive the same condense-on-
 * scroll behaviour without each one hand-rolling its own scroll listener.
 *
 * Reads `window.scrollY` synchronously on mount so a restored scroll
 * position or an in-page `#anchor` load starts in the right state, then
 * listens passively.
 */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
