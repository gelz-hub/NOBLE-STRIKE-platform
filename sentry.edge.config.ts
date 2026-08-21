// Edge runtime Sentry init (src/proxy.ts / middleware) — loaded via
// instrumentation.ts's register() hook. No-ops safely if SENTRY_DSN isn't
// set — see MONITORING.md.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
