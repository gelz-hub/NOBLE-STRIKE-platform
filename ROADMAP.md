# NOBLE STRIKE — Roadmap

What's built, what was explicitly scoped but never finished, and suggested next steps. See `ARCHITECTURE.md` for how the built parts work and `SECURITY.md`/`SECURITY_CHECKLIST.md` for the security posture.

## Completed

1. **Authentication** — Supabase Auth, register/login/logout/forgot-password/reset-password, email confirmation, session persistence via `@supabase/ssr` + middleware.
2. **Dashboard** — overview stats, "my teams," registrations status, real notifications feed.
3. **Team & roster management** — team identity (name/logo/banner/description), role-based roster builder (EXP/JUNGLE/MID/GOLD/ROAM required, up to 2 subs + 1 coach, single-captain enforcement), public team pages.
4. **Tournament registration workflow** — register/withdraw, roster-completeness and deadline/capacity validation, admin approve/reject with reason, automatic in-app notifications on every status change.
5. **Tournament management** — admin CRUD, full lifecycle (`DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → ONGOING → COMPLETED`, plus `ARCHIVED`), auto-close on capacity, duplicate, delete-guarded when approved teams exist (archive instead).
6. **Single-elimination bracket engine** — bye-safe generation for arbitrary team counts, automatic winner advancement, tournament auto-completion + champion recording.
7. **Double-elimination bracket engine** — upper/lower bracket generation, loser progression, Grand Final, optional Grand Final Reset (configurable per tournament), verified for 8/16/32/64/128 teams.
8. **Cloudinary image pipeline** — replaces Supabase Storage entirely; automatic `f_auto`/`q_auto` optimization and responsive delivery via a custom `next/image` loader.
9. **Authorization hardening** — role-gated navigation (single source of truth, no client-side-only checks), a full audit of every route/action/RLS policy, removal of the legacy fake-password admin gate and two unauthenticated admin API routes, auth added to 7 previously-open legacy mutation endpoints.

## Known gaps

Things that were in the original scope but not built, or that exist as real technical debt. None of these are secret — most are called out in `SECURITY.md`'s "residual risks" or were explicitly descoped in favor of the priorities the user actually asked for phase-by-phase.

### Never built
- **Theme system** (dark/light/system toggle) — was in the original requirements (`next-themes` is installed, a light CSS palette was never added). The app remains hard-locked to the dark gold/black theme.
- **Profile editing page** (`/dashboard/profile` — avatar, username, country) — deliberately skipped early to stay scoped to what was actually asked each phase; `profiles` table already has the columns, there's just no form.
- **Admin News Management UI** in the new Supabase-backed system — `news` table + RLS exist, but no `/admin/news` page was built. The only news CRUD live is the legacy Prisma-backed `/api/news*` routes (now auth-gated, but with no admin UI calling them anymore).
- **Achievements / NS org page admin UI** — `achievements`, `ns_members`, `sponsors`, `social_links` tables exist with RLS, but nothing in the new system reads or writes them. They only ever backed the legacy Prisma-backed SPA views.
- **Legacy data migration script** (`scripts/migrate-sqlite-to-supabase.ts`, referenced in `.env.example`'s `MIGRATION_ADMIN_EMAIL`) — was planned but never built. The old SQLite demo data was never carried into Supabase.
- **Automated tests** — everything was verified via one-off scripts run against the live Supabase project during development (documented in conversation history), not via a CI-integrated test suite. There is no `npm test`.
- **Deployment** — not deployed anywhere yet. No Vercel project linked, no CI/CD.

### Architectural debt
- **Two parallel, disconnected data systems** (see `ARCHITECTURE.md`) — the preserved legacy SPA (Prisma/SQLite) and the real platform (Supabase) don't share data. A team created through the old public registration dialog will never appear in the dashboard, and vice versa. Reconciling these — either migrating the SPA's reads onto Supabase or retiring the legacy routes — is the single biggest piece of remaining architectural work.
- **Seeding method** is fixed to `RANDOM` — `tournaments.seeding_method` and the UI both only support random bracket seeding; there's no manual/ranked seeding option, despite the column being designed to support other values later.
- **Lower-bracket pairing** in the double-elimination generator uses simple sequential pairing, not seed-aware pairing that avoids early rematches. Correct, but not "tournament-grade fair."
- A handful of Server Actions lean on RLS alone without an explicit `auth.getUser()` check (see `SECURITY.md` §"Known residual risks") — safe, but inconsistent with the rest of the codebase.
- `uploadImageAction` checks authentication but not role, so a non-admin could technically request an upload URL for an admin-only image category (low severity — see `SECURITY.md`).

## Suggested next steps, roughly prioritized

1. **Decide the fate of the legacy SPA.** Either wire its public views (`home`, `tournaments`, `teams`, `ns-team`, `news`, `brackets`) onto the Supabase tables the same way the new `/tournaments/[id]` and `/teams/[id]` pages already do, or retire it in favor of a real public listing built on the new schema. This removes the biggest source of confusion in the codebase and lets you delete Prisma entirely.
2. **Build `/admin/news`**, reusing the pattern already established by `/admin/tournaments` and `/admin/registrations` (list + form + Server Actions), targeting the Supabase `news` table.
3. **Build the profile page** (`/dashboard/profile`) — straightforward form over existing `profiles` columns, plus the Cloudinary avatar upload component that already exists for other use cases.
4. **Add the theme toggle** — light CSS variable block additive to `globals.css`, `next-themes` `ThemeProvider` in the root layout, sync to `profiles.theme_preference`.
5. **Add a test suite** — start with the RLS/authorization invariants documented in `SECURITY_CHECKLIST.md`, since those are exactly the kind of thing that silently regresses.
6. **Deploy** — link a Vercel project (or your platform of choice), set env vars per `OPERATIONS.md`, update Supabase's redirect URLs for the real domain.
7. Lower priority: seed-aware double-elimination pairing, manual/seeded bracket generation, admin UI for achievements/org page content, email notifications alongside the in-app feed.
