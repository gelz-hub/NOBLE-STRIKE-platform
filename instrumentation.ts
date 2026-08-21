import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors Next.js's own error boundary machinery surfaces from
// Server Components/Route Handlers/Server Actions that this file's
// register() init alone wouldn't otherwise see attached to a request.
export const onRequestError = Sentry.captureRequestError;
