# NOBLE STRIKE — Monitoring

What's watching this app in production, what it captures, and where to look when you need to know "what happened." See `DEPLOYMENT.md` for how each piece gets provisioned, `INCIDENT_RESPONSE.md` for what to do when one of these signals something's wrong.

## Error monitoring (Sentry)

`@sentry/nextjs`, initialized in three places covering every runtime this app executes in:

| File | Runtime | Captures |
|---|---|---|
| `instrumentation-client.ts` | Browser | Uncaught exceptions, unhandled promise rejections, React errors caught by `src/app/error.tsx`/`global-error.tsx` |
| `sentry.server.config.ts` (loaded via `instrumentation.ts`) | Node (Server Components, Server Actions, Route Handlers) | Anything thrown in a Server Action, an `/api/*` handler, or a Server Component's render |
| `sentry.edge.config.ts` (loaded via `instrumentation.ts`) | Edge (`src/proxy.ts` middleware) | Errors in the auth/role-check middleware itself |

Plus `instrumentation.ts`'s `onRequestError` export, which Next.js calls directly for errors that occur during request handling — this is what makes Server Action/Route Handler errors show up in Sentry even without an explicit `try/catch` + `Sentry.captureException` at every call site.

**Manual capture**: `src/lib/logger.ts`'s `logError(error, context)` logs a structured line **and** calls `Sentry.captureException` in one call — this is the one to reach for in a `catch` block where you want both a log line and a Sentry event, rather than calling both APIs separately.

**Not yet configured with a real DSN** in this environment — see `DEPLOYMENT.md`'s env var table. Until `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` are set, every `Sentry.init()` call above no-ops (the SDK's documented behavior with an empty DSN): the app runs identically, it's just not reporting anywhere. Nothing needs to change in the code once a real project/DSN exists — just set the env vars.

**What to check when setting it up for real**: after setting the DSN, trigger a deliberate test error (e.g., temporarily `throw new Error("sentry test")` in a scratch route, hit it, confirm it appears in the Sentry project dashboard within a minute or two, then remove the test route) — don't assume wiring is correct just because `next build` succeeded.

## Structured logging

`src/lib/logger.ts`'s `logEvent()` writes one JSON line per event to stdout (or stderr for `level: "error"`/`"warn"`). Vercel captures stdout/stderr from every function invocation automatically — Project → Logs in the dashboard, filterable by function/route/time, or exportable to a log drain (Vercel → Integrations → Log Drains, if you want continuous export to Datadog/Axiom/etc.; not configured by default, opt in if you need longer retention than Vercel's own log window).

### What gets logged

| Event | Fired from | Fields |
|---|---|---|
| `tournament.created` | `admin/tournaments/actions.ts` → `createTournament` | `tournamentId`, `title`, `gameType`, `createdBy` |
| `registration.approved` | `admin/registrations/actions.ts` → `approveRegistration` | `registrationId`, `tournamentId`, `teamId`, `approvedBy` |
| `match.completed` | `admin/tournaments/[id]/bracket/actions.ts` → `advanceWinner` | `matchId`, `tournamentId`, `bracketType`, `winnerId`, `scoreA`, `scoreB`, `completedBy` |
| `news.published` | `admin/news/actions.ts` → `maybeNotifyOnPublish` (fires on the DRAFT/ARCHIVED → PUBLISHED transition only, same gating as the notification broadcast it sits next to) | `slug`, `title`, `category` |
| `rate_limit.blocked` | `src/lib/rate-limit.ts` → `checkRateLimit` | `bucket`, `identifier`, `limit` — fires whenever a caller is actually throttled |
| `rate_limit.unconfigured` | `src/lib/rate-limit.ts` (module load) | Once per cold start if Upstash env vars are missing — a signal that rate limiting is currently disabled, not an error |

These four business events were chosen because they're the state transitions someone would actually ask "did this happen, and when" about after the fact — not because they're the only interesting events in the app. Extending this list is cheap: call `logEvent({ event: "...", ...fields })` at the point of change; see `TESTING.md`'s "Adding a new test" section if you also want the new call site covered by an integration test.

**Log line shape** (all events share this envelope):
```json
{"timestamp":"2026-01-01T00:00:00.000Z","level":"info","event":"tournament.created","tournamentId":"...","title":"...","gameType":"MLBB","createdBy":"..."}
```

## Health checks

`GET /api/health` — public, unauthenticated (deliberately: uptime monitors and load balancers need to hit this without credentials, and it never returns anything sensitive, only status booleans and names).

```json
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "responseTimeMs": 42,
  "version": { "commit": "a1b2c3d", "packageVersion": "0.2.1", "environment": "production" },
  "checks": {
    "database": { "status": "ok" },
    "environment": { "status": "ok" }
  }
}
```

- **`checks.database`**: runs a real `select id from profiles limit 1` through the app's normal Supabase client — proves the database is reachable and RLS-readable, not just that the URL resolves.
- **`checks.environment`**: confirms the required env vars from `DEPLOYMENT.md`'s table are present (names only, in `checks.environment.missing` if any are absent — **never values**).
- **`version.commit`**: `VERCEL_GIT_COMMIT_SHA`, set automatically by Vercel at build time — `null` on non-Vercel deployments.
- Returns HTTP `200` when `status: "ok"`, `503` otherwise — wire an uptime monitor (see below) to alert on non-200, not just on "unreachable."

**Suggested external uptime monitor**: point any HTTP monitor (Vercel's own Monitoring product, UptimeRobot, Better Uptime, a Vercel Marketplace `monitoring`-category integration, etc.) at `/api/health` on an interval (1–5 min), alerting on non-200 or on `status !== "ok"` in the body. Not configured by default in this repo — provisioning an external monitor requires an account this environment doesn't have; wire one up against your real production URL once deployed.

## Analytics (product usage, not errors)

Plausible — see `DEPLOYMENT.md`'s "Analytics" section for setup and the tracked event list. This answers "how many people registered this week," not "is anything broken" — a genuinely separate concern from the error/log/health-check monitoring above, which is why it's a separate, optional layer rather than folded into Sentry or the structured logs.

## Where to look, by question

| Question | Where |
|---|---|
| "Is the app up right now?" | `/api/health`, or your uptime monitor's dashboard |
| "Did someone create a tournament / approve a registration / complete a match / publish news, and when?" | Vercel → Logs, filter for the `event` field (structured logging, above) |
| "What error is this user seeing?" | Sentry — search by user/session if you've set `Sentry.setUser()` (not currently wired up; add it in a future pass if per-user error correlation becomes necessary) |
| "Is something being abused (login spam, view-count inflation, etc.)?" | Vercel → Logs, filter for `rate_limit.blocked` |
| "How many teams registered this month?" | Plausible dashboard, `tournament_registration_submitted` event |
