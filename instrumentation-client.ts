// Client-side Sentry init — auto-loaded by Next.js (App Router convention,
// no import needed anywhere). Captures browser/client crashes (uncaught
// exceptions, unhandled promise rejections, React render errors bubbling
// through the root error boundary). No-ops safely if
// NEXT_PUBLIC_SENTRY_DSN isn't set (e.g. local dev) — see MONITORING.md.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Session replay is off by default — enable deliberately if the team
  // wants it; it captures more (DOM snapshots) than plain error reporting.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
