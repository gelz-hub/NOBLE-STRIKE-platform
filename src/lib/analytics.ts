"use client";

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

export type AnalyticsEvent = "team_created" | "tournament_registration_submitted";

/**
 * Fires a Plausible custom event. Safe to call unconditionally — no-ops if
 * the script never loaded (analytics not configured, ad blocker, etc.), so
 * call sites never need to guard this themselves.
 *
 * "Tournament participation" (per Phase 13's tracked-events list) is
 * represented by `tournament_registration_submitted` rather than a
 * separate event — registering a team for a tournament *is* the
 * participation action in this app's model; there's no other single,
 * well-defined moment "participation" starts.
 */
export function trackEvent(event: AnalyticsEvent, props?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || !window.plausible) return;
  window.plausible(event, props ? { props } : undefined);
}
