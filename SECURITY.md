# NOBLE STRIKE — Security Model

This document describes how authentication and authorization actually work in this codebase, so future changes preserve the same guarantees. It reflects a full authorization audit performed across every API route, Server Action, admin page/component, and RLS policy — see the "Audit history" section for what that found and fixed.

## Identity

Supabase Auth is the single source of truth for identity. There is no other login system. A user's role (`user` or `admin`) lives in `public.profiles.role`, one row per `auth.users` row, created automatically by a `SECURITY DEFINER` trigger (`handle_new_user`) the instant someone signs up — never by application code, so it can't be skipped by a client bug or a future OAuth path.

**The role check used everywhere is the same one**: read `profiles.role` for the current session's `auth.uid()`. Every layer below reuses this — there is deliberately no second definition of "is this user an admin."

## Defense in depth — four layers, every admin operation

1. **Middleware** (`src/proxy.ts` → `src/lib/supabase/middleware.ts`) — refreshes the session on every request; redirects unauthenticated visitors away from `/dashboard/*` and `/admin/*` to `/login`; additionally queries `profiles.role` for any `/admin/*` path and bounces non-admins to `/dashboard` **before any admin page renders**.
2. **Layout** (`src/app/admin/layout.tsx`) — the same auth + role check again, server-side, as a second gate independent of middleware.
3. **Server Action / API route** — every mutation re-checks `auth.getUser()` and `profiles.role` itself. UI-level conditional rendering (hiding a button) is never treated as security — it's just UX. If a check is missing here, RLS is the last line of defense (see below), not client-side state.
4. **Row Level Security** — the database itself refuses the write even if every layer above were somehow bypassed. This is the layer that actually matters if the other three ever regress.

## RLS policy summary

All 13 Postgres tables have RLS enabled with explicit policies (verified by cross-referencing every `create table` against every `enable row level security` across all 10 migrations — no table is RLS-enabled-with-zero-policies, which would silently break reads, and none is missing RLS entirely).

| Table | Public read | Write |
|---|---|---|
| `profiles` | ✅ | self or admin (update only; rows are trigger-created, never inserted by a client) |
| `teams` | ✅ | owner or admin |
| `team_members` | ✅ | via owning team's `owner_id = auth.uid()`, or admin |
| `tournaments` | ✅ | admin only |
| `tournament_registrations` | ✅ | insert: owning team or admin. Update: admin-only for approve/reject; a separate, narrowly-scoped policy lets the **owner** transition PENDING↔WITHDRAWN or REJECTED/WITHDRAWN→PENDING (re-register) — they can never reach APPROVED/REJECTED themselves, and can never touch an already-approved row |
| `matches`, `brackets` | ✅ | admin only |
| `news` | published rows public, admin sees drafts too | admin only |
| `achievements`, `ns_members`, `sponsors`, `social_links` | ✅ | admin only |
| `notifications` | own rows, or admin (sees all) | own rows (insert/update), or admin can create for any user (e.g. approve/reject notifications) |

All `SECURITY DEFINER` functions (`is_admin`, `handle_new_user`, `close_registration_if_full`, `prevent_delete_with_approved_teams`, `maybe_complete_tournament`) set `search_path = public` explicitly, which prevents search-path-hijack attacks against `SECURITY DEFINER` code.

`is_admin()` itself is `SECURITY DEFINER` specifically so RLS policies that call it don't recurse into `profiles`' own RLS policy while evaluating.

## The service-role client

`src/lib/supabase/admin.ts` creates a client using `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS entirely. **Rule: never import this from anything under `src/app`.** It exists only for one-off scripts run manually from the CLI (e.g. `scripts/seed-tournaments.mjs`, which is not an HTTP endpoint and self-guards by only seeding an empty table). Currently nothing in the running application imports it — zero live bypass surface. If you ever add a script that needs it, keep it in `scripts/`, never in `src/app`, and never expose it behind a route.

## API route auth status

The legacy Prisma-backed routes under `src/app/api/**` predate Supabase Auth entirely and originally had **no auth check on any mutating verb**. This was found and fixed:

| Route | Mutating verbs | Auth |
|---|---|---|
| `api/matches/[id]` | PUT | admin (`requireAdminApi`) |
| `api/tournaments` | POST | admin |
| `api/tournaments/[id]` | PUT, DELETE | admin |
| `api/tournaments/[id]/bracket` | POST | admin |
| `api/teams` | POST | any signed-in user (`requireAuthApi`) |
| `api/teams/[id]` | PUT | admin |
| `api/news` | POST | admin |
| `api/news/[id]` | PUT, DELETE | admin |

The shared helper is `src/lib/require-admin-api.ts` (`requireAdminApi()` / `requireAuthApi()`), reusing the identical `profiles.role` check used by every Server Action. `GET` handlers remain intentionally public — they back the preserved public SPA views and return the same data RLS would already allow anyone to read.

`/api/admin/login` and `/api/admin/seed` — **deleted**. The first compared a request body to a hardcoded password (`"noblestrike"`) with a client-side fallback that bypassed the server check entirely on any network error; the second had no auth at all and could wipe/reseed demo data for anyone who found the URL.

## Removed: the legacy fake admin gate

An earlier iteration of this app gated its admin panel with a hardcoded password shipped in the client bundle (`admin-view.tsx`), backed by nothing but in-memory Zustand state (`adminUnlocked`) — it reset on page reload and had no relationship to any real session. This has been **fully removed**:

- `src/components/ns/views/admin-view.tsx` — deleted.
- `"admin"` removed from the SPA's hash-router entirely (`app-shell.tsx`, `store.ts`, `hooks.ts`, `types.ts`) — the old `#admin` URL does nothing now.
- `adminUnlocked`/`unlockAdmin`/`lockAdmin` removed from the global store.
- `src/components/ns/views/brackets-view.tsx` (the preserved SPA's inline bracket score editor) used the same fake flag to gate its UI — now uses the real `profiles.role === 'admin'` check via `useSupabaseUser()`.
- Every nav surface (desktop nav, mobile drawer, account dropdown, footer) that could show an "Admin Panel" link now does so through one single source of truth: `src/components/ns/account-menu.tsx`, gated on `profile?.role === 'admin'`, rendering nothing in the DOM for non-admins (conditional rendering, not CSS hiding).

If you ever see `adminUnlocked`, `ADMIN_PASSWORD`, or a hardcoded password string reappear anywhere in this codebase, that's a regression — remove it and replace it with the real role check.

## Secrets

- No hardcoded credentials anywhere in the codebase (verified by full-repo grep as part of the audit).
- `.env*` is gitignored.
- No `NEXT_PUBLIC_`-prefixed variable holds a secret (service-role key, Cloudinary API secret) — only the anon key and non-sensitive config are public.
- The old `ADMIN_PASSWORD`/`"noblestrike"` string no longer exists in the working tree but does still exist in earlier git commits' history. Not rewritten — that's a destructive operation outside this audit's scope.

## Known residual risks (not fixed — informational)

These were identified and deliberately left as-is because they are not exploitable authorization bypasses; changing them would be scope creep beyond "fix a security issue":

1. **`uploadImageAction`** (`src/lib/cloudinary/actions.ts`) checks authentication but not role — any signed-in user could technically request a `tournamentBanner`-folder upload URL even though the UI only exposes that control to admins. The URL alone grants no privilege (actually attaching it to a tournament still requires the admin-gated `updateTournament`); worst case is unauthorized Cloudinary storage/cost usage, not a data or authorization breach.
2. **A handful of Server Actions rely on RLS alone**, without their own `auth.getUser()` check as a first line (`createRosterMember`/`updateRosterMember`/`deleteRosterMember` in `dashboard/teams/actions.ts`, `markNotificationRead` in `dashboard/notifications/actions.ts`). RLS makes these safe (an unauthenticated `auth.uid() = null` can never match a real owner), but failures surface a raw Postgres RLS error string instead of a friendly message, and it's stylistically inconsistent with their sibling functions in the same files.
3. **`getTournamentRegistrations`/`getTeamRosterForReview`** (`admin/registrations/actions.ts`) are read-only Server Actions callable directly by any client, bypassing the `/admin` page gate — but they only return data already public via RLS `select using (true)` on `teams`/`team_members`/`tournament_registrations`, so no new information is exposed.

## Checklist for adding a new admin-only operation

1. Add the RLS policy on the table first — this is the layer that actually protects the data.
2. Add the explicit `auth.getUser()` + `profiles.role === 'admin'` check at the top of the Server Action or Route Handler — reuse `requireAdminApi()` for API routes, or the local `requireAdmin()` pattern already used in every `admin/**/actions.ts` file.
3. If it's a new page under `/admin`, it inherits `admin/layout.tsx`'s gate automatically — don't re-implement the check in the page itself.
4. If it needs a nav entry, add it to `src/components/ns/account-menu.tsx`'s `ADMIN_ONLY_LINKS` — don't create a second, separately-gated admin link elsewhere.
5. Never call `src/lib/supabase/admin.ts` from anything under `src/app`.
