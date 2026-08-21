import * as Sentry from "@sentry/nextjs";

/**
 * Structured application logging. Writes a single-line JSON object to
 * stdout/stderr — Vercel captures both automatically (Project → Logs, or a
 * forwarded log drain per MONITORING.md), so there's no separate log
 * shipping to wire up. Kept intentionally simple: this is not a metrics or
 * tracing system, just consistently-shaped audit-trail events for the
 * handful of state changes ops actually cares about (see MONITORING.md's
 * "What gets logged" table).
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogEvent {
  event: string;
  level?: LogLevel;
  [key: string]: unknown;
}

function write(level: LogLevel, entry: LogEvent) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...entry,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** A discrete, named application event — the four tracked in MONITORING.md
 *  (tournament.created, registration.approved, match.completed,
 *  news.published) and any future ones follow this same shape. */
export function logEvent(entry: LogEvent) {
  write(entry.level ?? "info", entry);
}

/** Logs an error and reports it to Sentry in one call, so call sites in
 *  Server Actions/route handlers don't have to remember both. `context`
 *  is attached as Sentry tags/extra and included in the log line. */
export function logError(error: unknown, context: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const event = typeof context.event === "string" ? context.event : "unhandled_error";
  write("error", { ...context, event, message });
  Sentry.captureException(error, { extra: context });
}
