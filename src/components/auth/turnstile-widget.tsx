"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

/**
 * Renders the Cloudflare Turnstile widget and reports the verification
 * token via onVerify — the parent form mirrors it into a hidden input
 * (same pattern as every other client-state-into-FormData field in this
 * app). No-ops with a small placeholder if NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * isn't set, so local dev without Turnstile configured doesn't break the
 * registration form — see src/lib/turnstile.ts for the matching
 * fail-open server-side behavior.
 */
export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!siteKey || !scriptLoaded || !containerRef.current || !window.turnstile) return;
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "dark",
      callback: onVerify,
      "expired-callback": () => onVerify(""),
      "error-callback": () => onVerify(""),
    });
    return () => {
      try {
        window.turnstile?.reset(widgetId);
      } catch {
        // widget already gone (e.g. unmounted mid-navigation) — nothing to clean up
      }
    };
  }, [siteKey, scriptLoaded]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        async
        defer
        onLoad={() => setScriptLoaded(true)}
      />
      <div ref={containerRef} />
    </>
  );
}
