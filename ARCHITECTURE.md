# NOBLE STRIKE — Architecture

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack), TypeScript, React 19
- **Styling**: Tailwind CSS v4, shadcn/ui, custom "black & gold" design system (`src/app/globals.css`)
- **Primary data layer**: Supabase — Postgres, Auth, Row Level Security, Realtime not used
- **Images**: Cloudinary (upload, storage, `f_auto`/`q_auto` optimization, responsive delivery via a custom `next/image` loader)
- **Legacy data layer**: Prisma + SQLite (`db/custom.db`) — still backs the original public SPA views only (see "Two systems" below)

## Two systems, one visual shell

This is the single most important thing to understand before touching this codebase: **there are two independent data layers running side by side**, unified only by shared design tokens.

### 1. The legacy SPA (preserved, not re-architected)

`src/app/page.tsx` renders `<AppShell />`, a single-page app that hash-switches between views (`home`, `tournaments`, `teams`, `ns-team`, `news`, `brackets` — see `src/lib/store.ts`, `src/components/ns/hooks.ts`). These views read from `/api/*` route handlers (`src/app/api/**/route.ts`) that call **Prisma** (`src/lib/db.ts`) against the legacy SQLite database (`prisma/schema.prisma`).

This system predates real authentication. It was deliberately left in place (per explicit product direction) as the public marketing/browsing experience, and its **read (`GET`)** endpoints remain the data source for the SPA views. Its **write** endpoints (`POST`/`PUT`/`DELETE` on `teams`, `tournaments`, `news`, `matches`) are legacy and now admin-gated (see `SECURITY.md`) but are largely orphaned — most no longer have any UI caller after the fake admin panel that used to drive them was removed.

Do not extend this system. It is not connected to Supabase Auth, Postgres, or RLS in any way — a "team" created through it lives only in `db/custom.db` and will never appear anywhere in the Supabase-backed system described below.

### 2. The Supabase-backed platform (everything built since)

Real Next.js routes under `src/app/{(auth),dashboard,admin,teams,tournaments}/**`, backed entirely by Supabase Postgres via `@supabase/ssr`. This is where all new functionality lives: authentication, team/roster management, tournament management, the registration workflow, notifications, and the bracket engine (single- and double-elimination).

**Never mix the two.** New features go in the Supabase system. If you need to read/write teams, tournaments, matches, etc., use the Supabase client (`src/lib/supabase/{client,server}.ts`), never Prisma (`src/lib/db.ts`).

## Supabase client architecture

Three entry points, chosen by context — this is the standard `@supabase/ssr` App Router pattern:

| File | Used from | Notes |
|---|---|---|
| `src/lib/supabase/client.ts` | Client Components | `createBrowserClient`, cookie-based session |
| `src/lib/supabase/server.ts` | Server Components, Server Actions, Route Handlers | `createServerClient`, async `cookies()` (Next 16) |
| `src/lib/supabase/middleware.ts` (called from `src/proxy.ts`) | Edge middleware | Refreshes the session on every request; redirects unauthenticated visitors away from `/dashboard/*`; redirects non-admins away from `/admin/*` |
| `src/lib/supabase/admin.ts` | **Nowhere in the running app** | Service-role client. Exists only for a never-built one-off migration script. Never import this from `src/app` — it bypasses RLS entirely. |

`src/proxy.ts` is Next 16's renamed `middleware.ts` (the old convention is deprecated as of this version).

## Route map

```
/                          legacy SPA (home/tournaments/teams/ns-team/news/brackets via hash)
/login /register           real auth pages
/forgot-password /reset-password
/auth/callback             email confirmation / password-reset landing (exchanges the code for a session)

/dashboard                 overview stats (teams owned, registrations by status)
/dashboard/teams           "my teams" list + create/edit
/dashboard/teams/new       step 1: team identity (name, logo, banner, description)
/dashboard/teams/[id]/roster   step 2: role-based roster builder
/dashboard/teams/[id]/edit     identity edit + delete
/dashboard/registrations   registration status list, withdraw pending ones
/dashboard/notifications   real notifications table (not derived)

/admin                     redirects to first admin section; gated by role
/admin/tournaments         list, create, edit, duplicate, archive, delete
/admin/tournaments/new
/admin/tournaments/[id]/edit
/admin/tournaments/[id]/bracket   generate/regenerate/lock + score entry
/admin/registrations       search/filter/paginate + approve/reject with reason

/teams/[id]                public team page: roster, tournament history, stats
/tournaments/[id]          public tournament page: Overview + Bracket tabs
```

## Database schema (Supabase Postgres)

10 migrations, applied in order (`supabase/migrations/0001`–`0010`). Summary of tables:

| Table | Purpose | Key relationships |
|---|---|---|
| `profiles` | 1:1 with `auth.users`, created automatically by a trigger on signup | `role` ('user'/'admin'), `theme_preference` |
| `teams` | Owned by a `profiles.id` | → `team_members`, `tournament_registrations` |
| `team_members` | Role-based roster row per player | `role` constrained to `EXP/JUNGLE/MID/GOLD/ROAM/SUB1/SUB2/COACH`; `unique(team_id, role)`; partial unique index enforces one captain per team |
| `tournaments` | Admin-managed | `status` lifecycle (see below), `bracket_format`, `seeding_method`, `grand_final_reset_enabled`, denormalized champion fields |
| `tournament_registrations` | Team ↔ tournament join | `status`: PENDING/APPROVED/REJECTED/WITHDRAWN, `reviewed_by`/`reviewed_at`/`rejection_reason`/`withdrawn_at` |
| `brackets` | One per tournament (`unique(tournament_id)`) | `bracket_format`, `status` (ACTIVE/LOCKED) |
| `matches` | Bracket nodes | `bracket_type` (upper/lower/grand_final/grand_final_reset), `round_number`, `match_number`, `next_match_winner_id`, `next_match_loser_id` |
| `notifications` | Per-user activity feed | `title`, `message`, `read_status` |
| `news`, `achievements`, `ns_members`, `sponsors`, `social_links` | Public content, admin-managed | back the preserved public views (news feed, NS org page, team achievements) |

### Tournament lifecycle

`DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → ONGOING → COMPLETED`, plus `ARCHIVED` (hidden from default admin listings, still reachable by direct URL). Registration auto-closes via a DB trigger (`close_registration_if_full`) once approved teams reach `max_teams`; deadline-based closing is computed at read time (no scheduled job).

### Bracket engine

- **Single elimination** (`src/lib/bracket/generate.ts`): standard power-of-2 bracket. Non-power-of-2 team counts are padded with byes, distributed so no match ever pairs two byes together (byes are always < half the slots, by construction of "next power of 2"). Byes auto-resolve immediately at generation time and cascade forward through as many rounds as needed.
- **Double elimination** (`src/lib/bracket/generate-double-elim.ts`): builds Upper Bracket (same structure as single-elim), Lower Bracket (`2×(k-1)` rounds for `k` upper rounds, alternating "drop" rounds — a lower survivor faces a freshly-dropped upper loser — and "consolidation" rounds — two lower survivors face each other), and a Grand Final. Slot placement (`team_a` vs `team_b`) for both winner and loser progression is derived **arithmetically** from `bracket_type`/`round_number`/`match_number` (`src/lib/bracket/shared.ts:determineAdvanceSlot`) — no extra "round kind" column needed, keeping the schema flat.
- **Grand Final Reset**: not pre-created at generation time. If the lower-bracket finalist wins the Grand Final and `grand_final_reset_enabled` is true, `advanceWinner` (`src/app/admin/tournaments/[id]/bracket/actions.ts`) creates a `grand_final_reset` match dynamically. A DB trigger (`maybe_complete_tournament`) auto-completes the tournament and records the champion whenever a terminal `upper` (single-elim) or `grand_final_reset` match gets a winner; the plain `grand_final` case is handled in application code instead, since whether it's actually terminal depends on which side won and whether resets are enabled.
- Both generators run through the **caller's own RLS-scoped Supabase client**, never the service-role client — bracket generation only ever succeeds because the caller is an authenticated admin, per RLS on `brackets`/`matches`, not because of an application-level bypass.

## Server Actions vs API routes

- **Server Actions** (`"use server"` files, one per feature area under `src/app/**/actions.ts`) — every mutation in the Supabase-backed system. Cookie-bound, so RLS applies automatically using the caller's real session.
- **API routes** (`src/app/api/**/route.ts`) — exist only for the legacy Prisma-backed SPA's reads, plus a couple of writes that still have live callers from preserved SPA components (`POST /api/teams` from the old registration dialog, `PUT /api/matches/[id]` from the old inline bracket score editor). See `SECURITY.md` for their auth status.

## Images (Cloudinary)

- `src/lib/cloudinary/upload.ts` — server-only upload, always applies `f_auto,q_auto`, uploads into `noble-strike/{logos,teams,banners,tournaments,players,news}`.
- `src/lib/cloudinary/actions.ts` — `uploadImageAction`, the one server action every upload UI calls; auth-gated (signed-in only), validates file type/size per use case before uploading.
- `src/lib/cloudinary/image-loader.ts` — registered as `next.config.ts`'s custom `images.loader`, so every `next/image` usage automatically requests the right width from Cloudinary (responsive) with format negotiation, without a per-`<Image>` loader prop.
- `src/components/cloudinary/image-upload.tsx` — the one reusable upload component (logo/banner/avatar/tournament-banner/news-image, parameterized by `useCase`).
- Supabase Storage is **not used** — buckets from an earlier iteration exist but are empty and locked down (see `SECURITY.md`).

## Environment variables

See `.env.example` for the full list. Notable:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public, RLS-scoped.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, currently unused by the running app (reserved for a migration script that was never built).
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — image pipeline.
- `DATABASE_URL` — legacy SQLite path, only needed for the preserved SPA's Prisma routes.
