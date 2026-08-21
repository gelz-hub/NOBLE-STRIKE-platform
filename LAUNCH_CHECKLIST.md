# NOBLE STRIKE — Launch Checklist

The concrete, run-once-before-going-live checklist. Everything here is either already done (checked, with where to verify it) or a real action item that requires **your** credentials/accounts — nothing in this repo can complete those steps on its own. See `DEPLOYMENT.md` for the how-to behind each infrastructure item, `SECURITY_CHECKLIST.md` for the security-specific deep dive, `TESTING.md` for what CI actually gates.

---

## 1. Database (Supabase)

- [ ] All migrations `0001`–`0013` applied, in order, via the SQL Editor (`OPERATIONS.md` → Database migrations). Confirm with: `select count(*) from pg_tables where schemaname = 'public';` — should return 13+ tables.
- [ ] RLS enabled and policied on every table — already true as of the last full audit (`SECURITY.md` → RLS policy summary); re-run `SECURITY_CHECKLIST.md`'s periodic-audit greps if any migration has landed since that audit.
- [ ] At least one real admin account created (`OPERATIONS.md` → "Creating your first admin user") — there is no self-serve path to admin by design; without this step nobody can reach `/admin` at all.
- [ ] Confirm your Supabase project's plan tier actually includes automatic backups (`DEPLOYMENT.md` → Backups) — the free tier does not. Check Project Settings → Backups; don't assume.
- [ ] Auth → URL Configuration → Redirect URLs includes your real production domain + `/auth/callback`. Miss this and every confirmation/reset email points at `localhost`.
- [ ] Auth → Email settings: confirm "Confirm email" is enabled (required for the registration flow to work as designed) and the email templates/sender are configured (Supabase's default sender is rate-limited and not meant for real production volume — set up a custom SMTP provider if you expect real signup traffic).

## 2. Environment variables (Vercel)

Full table with required/optional breakdown lives in `DEPLOYMENT.md`. Minimum for the app to function at all:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (for `scripts/*.mjs` only — never imported by the running app, but keep it set and secret)
- [ ] `NEXT_PUBLIC_SITE_URL` set to the **real production domain**, not `localhost`
- [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- [ ] All of the above set for the **Production** environment specifically in Vercel (not just Preview/Development)

Optional but recommended before real users arrive:

- [ ] `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` (+ `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN` for source maps) — see §5
- [ ] `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — see §6
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — see §7

## 3. Deployment

- [ ] Vercel project linked/imported from the GitHub repo (`DEPLOYMENT.md` → Deployment process)
- [ ] CI green on the commit you're about to deploy (`.github/workflows/ci.yml`: lint, typecheck, test with coverage) — don't deploy a commit CI hasn't passed
- [ ] First production deploy done, `/api/health` on the live URL returns `{"status":"ok"}` (§4)
- [ ] Confirmed the security headers are actually present on the live deployment: `curl -I https://<your-domain>/` and check for `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (all wired in `next.config.ts` — confirm they survive the real deploy, not just local dev)
- [ ] Decided and documented what to do about the legacy Prisma-backed SPA routes (`ROADMAP.md` → "Decide the fate of the legacy SPA") — if you're not carrying `db/custom.db` to production, those routes will 500; either ship the SQLite file with the deployment or confirm nothing user-facing still depends on them (see `THEME_AUDIT.md`/`ARCHITECTURE.md` for what's still routed through the legacy system)

## 4. Health & monitoring

- [ ] `/api/health` verified live — `checks.database.status` and `checks.environment.status` both `"ok"` (`MONITORING.md`)
- [ ] An external uptime monitor pointed at `/api/health` on a 1–5 min interval, alerting on non-200 (Vercel's own Monitoring product, UptimeRobot, Better Uptime, or a Vercel Marketplace `monitoring`-category integration — not provisioned by this repo, requires your account)
- [ ] Confirmed where you'll actually look at logs day-to-day: Vercel → Logs (structured `logEvent` lines — `MONITORING.md` → "What gets logged"), and whether you need a log drain for longer retention than Vercel's own window

## 5. Error monitoring (Sentry)

- [ ] Real Sentry project created, `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` set in Vercel
- [ ] Source-map upload configured (`SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`) so production errors show real file/line, not minified stacks
- [ ] Triggered one deliberate test error post-deploy and confirmed it actually appears in the Sentry dashboard within a couple minutes (`MONITORING.md` — don't assume wiring is correct just because the build succeeded)
- [ ] Decided whether you want `Sentry.setUser()` wired up for per-user error correlation (not currently implemented — noted as a future pass in `MONITORING.md`)

## 6. Rate limiting

- [ ] Upstash Redis provisioned: `vercel integration add upstash` (or via the Marketplace dashboard) against the linked project, then `vercel env pull --yes`
- [ ] Confirmed it's actually active post-deploy: without it, rate limiting **fails open** (silently disabled, app still works) — check Vercel Logs for a `rate_limit.unconfigured` warning on cold start; its absence means Redis is wired up correctly
- [ ] Reviewed the four protected surfaces and their limits in `src/lib/rate-limit.ts` (login, registration, news-view RPC, dispute creation) — adjust the numbers if your expected real-world traffic differs meaningfully from the defaults chosen during development

## 7. Analytics

- [ ] Plausible site created for your production domain, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` set
- [ ] Confirmed the script actually loads on the live site (view source / network tab) and that `team_created`/`tournament_registration_submitted` events appear in the Plausible dashboard after a real test action

## 8. Security

Full checklist: `SECURITY_CHECKLIST.md`. Launch-blocking items specifically:

- [ ] No hardcoded secrets in the codebase (last verified as part of the full audit — re-grep if anything's changed since: `SECURITY_CHECKLIST.md` §"Sweep for hardcoded secrets")
- [ ] `src/lib/supabase/admin.ts` (service-role client) confirmed still unused anywhere under `src/app` (`SECURITY_CHECKLIST.md` §4)
- [ ] Every `/admin*` route confirmed to redirect unauthenticated/non-admin visitors when hit directly (not just hidden in the nav) — `SECURITY_CHECKLIST.md` §7's curl-based check, or the equivalent automated coverage in `test/security/middleware-route-protection.test.ts`
- [ ] Reviewed `SECURITY.md`'s "Known residual risks" section and confirmed each is still an acceptable tradeoff for launch (not something that quietly became more serious)

## 9. Testing & CI

- [ ] `npm test` / CI green on the release commit — 115+ tests, coverage above the 80%/75% thresholds (`TESTING.md`)
- [ ] Understood what the test suite does **not** cover before trusting it as a launch gate: real Postgres RLS enforcement isn't exercised by the mocked test suite (`TESTING.md` → "What this suite does not verify") — if you haven't run the live `scripts/verify-*.mjs` methodology against this Supabase project recently, do one full pass before launch, not just after

## 10. Design / theme

- [ ] Aware that light mode is only fully correct on chrome (nav/footer/dashboard/admin shells), Settings, and the public profile page — several large public pages (Tournament, Team, Match) still carry literal dark-mode classes (`THEME_AUDIT.md` → §8 remaining work). Not launch-blocking (dark mode, the original default, is unaffected), but worth a conscious decision: ship with light mode acknowledged-incomplete, or default new users to dark until that follow-up lands.

## 11. Data & content

- [ ] Real tournaments/news/content created through the actual admin UI — `npm run seed:tournaments` only ever seeds an empty table and is a dev convenience, not something to leave running in production's path.
- [ ] Confirmed `scripts/seed-tournaments.mjs` and any other one-off `scripts/*.mjs` are not reachable over HTTP (they aren't — CLI-only by design, per `SECURITY.md`) and are not scheduled to run automatically anywhere.

## 12. Rollback readiness

- [ ] Confirmed you know how to roll back **before** you need to (`DEPLOYMENT.md` → Rollback process) — Vercel dashboard "Promote to Production" on a previous deployment, or `vercel rollback`. Practice it once on a low-stakes deploy if you've never done it.
- [ ] Read `INCIDENT_RESPONSE.md` once, end to end, before launch — not during your first incident.

---

## Not required to launch, but worth deciding deliberately (not by default)

- Legacy SPA retirement/reconciliation (`ROADMAP.md` §1) — the single biggest piece of remaining architectural debt, not urgent.
- Seed-aware double-elimination pairing, manual/seeded bracket generation (`ROADMAP.md` — cosmetic fairness improvement, current implementation is correct, just not "tournament-grade fair" on lower-bracket pairing).
- Email notifications alongside the in-app feed (`notify_email` preference is stored and ready — see `ROADMAP.md`/Phase 10 — but nothing sends an actual email yet).
- A permanent, CI-wired live-RLS regression suite (`TESTING.md`'s `live-rls-verification` job is scaffolded but requires a dedicated test Supabase project + secrets you'd need to provision and populate with a real `scripts/verify-*.mjs`).
