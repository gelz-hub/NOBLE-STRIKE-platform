// Server-side (Node runtime) Sentry init — loaded via instrumentation.ts's
// register() hook. Captures errors from Server Actions, Route Handlers
// (including /api/* error responses), and Server Components. No-ops safely
// if SENTRY_DSN isn't set — see MONITORING.md.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
