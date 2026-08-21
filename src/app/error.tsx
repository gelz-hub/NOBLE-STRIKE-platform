"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/** Catches render errors anywhere under the root layout — reports to
 *  Sentry and shows an on-brand fallback instead of a blank/broken page. */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="ns-card rounded-xl p-10 text-center max-w-sm space-y-4">
        <AlertTriangle className="w-8 h-8 text-gold/60 mx-auto" />
        <h1 className="font-display font-bold text-xl text-text-primary">Something went wrong</h1>
        <p className="text-sm text-text-secondary">
          The error has been reported. Try again, or head back to the site.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={reset} className="ns-btn-gold px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider">
            Try Again
          </button>
          <Link href="/" className="ns-btn-outline px-4 py-2 rounded-md text-xs">
            Back to Site
          </Link>
        </div>
      </div>
    </div>
  );
}
