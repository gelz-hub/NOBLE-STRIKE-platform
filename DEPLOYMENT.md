# NOBLE STRIKE — Deployment

How to take this app from a local checkout to a running production deployment on Vercel + Supabase + Cloudinary, and how to roll back if a deploy goes wrong. See `OPERATIONS.md` for local dev/migrations, `MONITORING.md` for what happens once it's live, `INCIDENT_RESPONSE.md` for when something breaks.

## Supported platforms

- **Hosting**: Vercel (the app is a standard Next.js 16 App Router project — no Vercel-specific code beyond reading `VERCEL_ENV`/`VERCEL_GIT_COMMIT_SHA` for the health check and Sentry environment tagging, both optional and safely absent anywhere else).
- **Database/Auth**: Supabase — a real project you provision yourself (see `OPERATIONS.md`'s migration instructions; this doc doesn't repeat schema setup).
- **Images**: Cloudinary — a real account, per `ARCHITECTURE.md`'s image pipeline section.

Nothing in this codebase hardcodes any of the three — every credential is an environment variable.

## Environment variables

Full reference lives in `.env.example`. Grouped by what breaks without them:

| Variable | Required? | Breaks without it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | Nothing works — every page/action needs Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Required** | Same |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for `scripts/*.mjs` only | Never imported by the running app (`SECURITY.md`); keep it set and secret anyway for the seed/verify scripts |
| `NEXT_PUBLIC_SITE_URL` | **Required** | Auth email links (confirm/reset) point at the wrong host |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | **Required** | Every image upload (logos, banners, avatars, news images, match evidence) fails |
| `DATABASE_URL` | Only if keeping the legacy SPA's Prisma routes | Legacy `/api/*` Prisma routes 500 |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | Optional | No error reporting — app runs fine, just blind to production errors |
| `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN` | Optional | No source maps uploaded — Sentry errors show minified stack traces instead of real file/line |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Optional | Rate limiting fails open (disabled) — see "Rate limiting" below |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Optional | No analytics script renders, no events tracked |
| `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL` | Optional | Only needed for a self-hosted Plausible instance |

Set every "Required" row before the first deploy. The "Optional" rows can be added later without a code change — each one is read once, at the point of use, with the corresponding feature no-op'ing safely when absent (documented in each feature's own file).

## Deployment process (Vercel)

This environment has no linked Vercel project — these are the steps to run from your own machine/account, not something already done for you.

1. **Link the project** (once): `vercel link` from the repo root, or import the GitHub repo directly from the Vercel dashboard.
2. **Set environment variables**: Vercel dashboard → Project → Settings → Environment Variables, or `vercel env add <NAME>` per variable. Set every "Required" row above for the **Production** environment at minimum; mirror them into **Preview** too if you want PR previews to actually work end-to-end (pointing at the same Supabase project, or a separate staging one — your call).
3. **Update Supabase's redirect URLs**: Supabase dashboard → Authentication → URL Configuration — add your real domain (and `https://<domain>/auth/callback`) to Redirect URLs. Miss this and email confirmation/password-reset links keep pointing at `localhost` in production.
4. **Deploy**:
   - Push to the branch Vercel is configured to auto-deploy (typically `main` → Production, other branches/PRs → Preview), or
   - `vercel deploy --prod` from the CLI for a manual production deploy, `vercel deploy` for a preview.
5. **Verify**: hit `/api/health` on the new deployment (see below) and confirm `status: "ok"`. Spot-check `/login`, `/register`, and one admin page while signed in as an admin.
6. **Apply any pending Supabase migrations first, always** — this app has no migration-runner wired into the deploy pipeline (per `OPERATIONS.md`, migrations are run by hand via the Supabase SQL Editor). Deploying app code that expects a column/table a migration hasn't created yet will 500 in production. Order: migrations → then deploy.

### CI gate before deploying

`.github/workflows/ci.yml` (see `TESTING.md`) runs lint, typecheck, and the test suite with coverage on every push/PR. Don't deploy a commit CI hasn't gone green on — Vercel's own build will independently run `next build`, but CI catches lint/type/test regressions Vercel's build step doesn't.

## Rollback process

Vercel keeps every deployment as an independent, addressable artifact — rollback means **promoting a previous deployment back to production**, not reverting code and redeploying.

1. **Fastest path — Vercel dashboard**: Project → Deployments → find the last known-good deployment → "..." menu → **Promote to Production**. Takes effect immediately, no rebuild.
2. **CLI equivalent**: `vercel rollback [deployment-url]` (omit the URL to roll back to the immediately-previous production deployment).
3. **If the bad deploy included a Supabase migration**: promoting the previous app deployment does **not** undo the migration — a migration that already ran stays applied. Check whether the new columns/tables are backward-compatible with the older app code before rolling back the app alone; if not, you need a compensating migration, not just an app rollback. This is why migrations should be additive/backward-compatible where practical (per `OPERATIONS.md`'s "idempotent DDL" guidance) — it's what makes app-only rollback safe.
4. **After rolling back**: post in whatever channel your team uses (see `INCIDENT_RESPONSE.md`), and don't re-promote the bad deployment until the underlying issue is fixed and re-verified.

## Backups & disaster recovery

### Supabase (database)

- **Automatic backups**: Supabase's paid plans include daily automatic backups (retention depends on plan tier) plus, on higher tiers, point-in-time recovery (PITR) with minute-level granularity. Confirm your project's plan/tier has this enabled — the free tier does not include automatic backups. Dashboard → Project Settings → Backups shows what's actually configured for your project; don't assume.
- **Manual backup** (works on any tier): `pg_dump` against the connection string in Supabase → Settings → Database → Connection string:
  ```bash
  pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
    --schema=public --no-owner --no-privileges -f backup-$(date +%Y%m%d).sql
  ```
  Run this on a schedule (cron, GitHub Actions scheduled workflow, etc.) if you're on a tier without automatic backups, and store the output somewhere durable (not just a laptop).
- **Restore**: via the dashboard (Project Settings → Backups → restore a point), or manually:
  ```bash
  psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" -f backup-YYYYMMDD.sql
  ```
  A dashboard-initiated restore replaces the live database — treat it exactly like the destructive operation it is: confirm you're restoring the correct project, and that current data loss (anything written after the backup point) is acceptable, before confirming.
- **What's NOT in a Postgres backup**: `auth.users` password hashes and session state live in Supabase's managed auth schema — a `pg_dump` of `public` (as above) captures `profiles` and all app data but not raw credentials; that's intentional (Supabase Auth is the system of record for auth, not this repo).

### Cloudinary (images)

- Cloudinary retains every asset you upload indefinitely by default — there's no "backup" step needed for images to simply not disappear.
- For an independent copy (protecting against account loss/deletion, not normal operation): Cloudinary's Admin API supports listing and downloading all assets programmatically (`cloudinary.api.resources()` paginated, then fetch each `secure_url`), or use their built-in **Backup** add-on (auto-replicates to your own S3/GCS bucket) if continuous off-platform redundancy matters to you.
- Image *references* (the URLs stored in `teams.logo_url`, `news.image_url`, etc.) live in Supabase, not Cloudinary — a Supabase restore alone is enough to keep the app functional even without a separate Cloudinary export, as long as the Cloudinary account itself is still intact.

## Rate limiting

Login, account registration, the anonymous news view-count RPC, and match dispute creation are rate-limited (`src/lib/rate-limit.ts`) using sliding-window counters backed by Upstash Redis — the standard approach for a serverless deployment, since in-memory counters don't survive across function instances.

**Not auto-provisioned.** To enable it:
```bash
vercel link            # if not already linked
vercel integration add upstash
vercel env pull --yes  # syncs the new UPSTASH_REDIS_REST_URL/_TOKEN locally
```
Or install "Upstash for Redis" from the Vercel Marketplace dashboard against your project. Until this is done, rate limiting **fails open** (every request is allowed, with a one-time warning logged) — the app stays fully functional, it's just unprotected against abuse on those four surfaces until Redis is wired up. This is a deliberate choice: a misconfigured rate limiter should never be able to take the app down.

## Security headers

Set in `next.config.ts`'s `headers()` (applies to every route):

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'`, plus explicit `img-src`/`connect-src` allowlists for Cloudinary/Supabase/Sentry | Blocks injected scripts/exfiltration to unexpected origins. `script-src`/`style-src` include `'unsafe-inline'` (Next.js's own bootstrap requires it; no nonce-based CSP is wired up — a stricter follow-up) |
| `X-Frame-Options` | `DENY` | Blocks this site from being framed by anyone — legacy header, redundant with `frame-ancestors 'none'` above for older browsers |
| `X-Content-Type-Options` | `nosniff` | Stops the browser from MIME-sniffing responses into an unintended content type |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Doesn't leak full URLs (which can carry tokens in query strings) to third-party referrer targets |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | This app uses none of these — explicitly denies them rather than leaving the default (often permissive) policy |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS on every future visit; no-op locally over plain HTTP, real once deployed behind Vercel's TLS termination |

Verify after any change: `curl -I https://your-domain/` and check the response headers, or the "Headers" tab in browser devtools' Network panel.

## Analytics

Plausible (chosen over PostHog — see `src/components/analytics/plausible-script.tsx` for why: single script tag, no cookies, no consent-banner requirement). Renders nothing and tracks nothing until `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set. To enable:
1. Create a site in Plausible (cloud or self-hosted) for your production domain.
2. Set `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` to that domain.
3. (Self-hosted only) set `NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL` to your instance's script URL.

Tracked custom events (`src/lib/analytics.ts`): `team_created`, `tournament_registration_submitted` (this also represents "tournament participation" — registering a team for a tournament is the participation action in this app's model, so a separate event wasn't invented for it).
