"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * A subtle, fast fade-in replayed on every route change — pure CSS
 * (`.ns-route-fade`, see globals.css), no animation library. Deliberately
 * does NOT key this wrapper by pathname (that would force React to unmount
 * and remount everything below it, including persistent nested layouts
 * like the dashboard/admin shells, defeating one of App Router's main perf
 * wins). Instead it toggles the animation class on the same DOM node so the
 * subtree is reconciled in place and only repaints, not remounts.
 */
export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.classList.remove("ns-route-fade");
    // Force a reflow so removing/re-adding the class actually restarts the
    // CSS animation instead of being batched into a no-op by the browser.
    void el.offsetWidth;
    el.classList.add("ns-route-fade");
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
