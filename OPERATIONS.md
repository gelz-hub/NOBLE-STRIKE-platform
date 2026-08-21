# NOBLE STRIKE — Operations Guide

Practical instructions for running, migrating, and troubleshooting this project. See `ARCHITECTURE.md` for how the system is put together and `SECURITY.md` for the auth/authorization model.

## Local setup

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

App runs at `http://localhost:3000`. First compile of each route can be slow (Turbopack cold start) — subsequent loads are fast.

### Required environment variables (`.env.local`)

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same |
| `SUPABASE_SERVICE_ROLE_KEY` | same (server-only; currently unused by the running app, keep it secret anyway) |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your real domain in production — used to build auth email redirect links |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Cloudinary dashboard → Account Details |
| `MIGRATION_ADMIN_EMAIL` | Only needed if you ever build/run the legacy-data migration script (see Roadmap — not built yet) |
| `DATABASE_URL` | Legacy SQLite path (`file:./db/custom.db`), only needed for the preserved SPA's Prisma-backed routes |

The Vercel CLI is not installed/linked for this project — everything here is done by hand against your own Supabase project.

## Database migrations

There is no Supabase CLI wired up. Migrations live as plain SQL files in `supabase/migrations/`, numbered in the order they must be applied, and are run **manually** via the Supabase Dashboard → SQL Editor:

1. Open the file, copy its full contents.
2. Paste into a new query tab in the SQL Editor.
3. Run it. Expect "Success. No rows returned" for DDL statements.
4. Move to the next number.

Current migrations, in order:

```
0001_schema.sql                    core tables
0002_functions_triggers.sql        is_admin(), profile-creation trigger
0003_rls_policies.sql              RLS for the 0001 tables
0004_storage.sql                   Supabase Storage buckets (superseded, see 0005)
0005_drop_storage.sql              removes storage write policies — Cloudinary replaced Storage
0006_team_members_extra_fields.sql country/game_id/discord/avatar_url on team_members
0007_registration_workflow.sql     WITHDRAWN status, review metadata, notifications table
0008_tournament_lifecycle.sql      DRAFT/ARCHIVED statuses, auto-close trigger, delete-guard trigger
0009_bracket_engine.sql            brackets + matches restructure for the bracket engine
0010_double_elimination.sql        grand_final_reset support
```

**When adding a new migration**: create `00XX_description.sql`, write idempotent DDL where practical (`if not exists`, `create or replace function`), and — if you're changing an existing check constraint — use the dynamic drop pattern already used throughout (look up the constraint name via `pg_constraint` rather than guessing Postgres's auto-generated name), since it survives regardless of how the constraint was originally named.

### A note on `storage.objects`

Buckets from `0004_storage.sql` (`avatars`, `team-logos`, `team-banners`, `tournament-banners`, `news-images`) still exist but are empty and unused — Cloudinary replaced Supabase Storage for all image handling. Their write policies were dropped in `0005`, and their read policy was dropped too, so they're fully default-deny. Safe to ignore; delete manually via Dashboard → Storage if you want them gone (Postgres won't let you drop them via SQL).

## Seeding test data

```bash
npm run seed:tournaments
```

Inserts 2 sample tournaments (`scripts/seed-tournaments.mjs`) — only if the `tournaments` table is currently empty. CLI-only, uses the service-role key from `.env.local`, never exposed over HTTP. Once real tournaments exist via `/admin/tournaments/new`, this script no-ops permanently (by design).

The legacy `npm run db:seed` (`prisma/seed.ts`) seeds the **old** SQLite database for the preserved SPA views — unrelated to the Supabase-backed system.

## Creating your first admin user

There's no UI for this (by design — you shouldn't be able to self-promote to admin). After registering a normal account through `/register`:

```sql
update public.profiles set role = 'admin' where id = '<user-uuid-from-auth.users>';
```

Run this once via the SQL Editor. Find the UUID under Authentication → Users in the Supabase dashboard, or `select id from auth.users where email = '...'`.

## Common troubleshooting

**"`@prisma/client did not initialize yet`"** — the legacy Prisma-backed API routes (`/api/teams`, `/api/tournaments`, etc.) need a generated client:
```bash
npx prisma generate
```
Then **restart the dev server** — Turbopack's module cache doesn't always pick up a freshly generated client without a full restart, even after the generate command succeeds.

**Dev server won't respond right after starting** — first request after a fresh start can take 10–20+ seconds (cold Turbopack compile of the middleware/proxy plus the requested route). Don't assume it's hung; retry with a longer timeout before restarting.

**A Supabase query returns "relation does not exist"** — a migration hasn't been applied yet. Check the SQL Editor's history, or just re-run the migration file (most are idempotent).

**RLS silently blocks a write with no error, or 0 rows affected** — this is often correct behavior (an owner-scoped policy rejecting a non-owner), not a bug. Check who's actually authenticated in that request before assuming the policy is wrong.

## Deployment

Not yet deployed anywhere. When you do:
- Build: `npm run build` (produces a standalone Next.js output, copies static assets + `public/` into it — see `package.json`).
- Start: `npm run start` (expects a `bun` runtime per the current script; adjust if deploying elsewhere).
- Set every env var from the table above in the target environment.
- Update `NEXT_PUBLIC_SITE_URL` to the real domain, and add that domain (plus `/auth/callback`) to Supabase's Auth → URL Configuration → Redirect URLs, or email confirmation and password reset links will point at `localhost`.
- The legacy SQLite database (`db/custom.db`) needs to travel with the deployment if you're keeping the preserved SPA's Prisma routes functional; otherwise those routes will 500 in production the same way they do locally without a generated Prisma client.
