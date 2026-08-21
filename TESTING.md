# NOBLE STRIKE — Testing & CI

This documents the automated test suite and CI pipeline. See `ARCHITECTURE.md` for how the system is built, `SECURITY.md`/`SECURITY_CHECKLIST.md` for the security model these tests partially verify, and `THEME_AUDIT.md` for the (separate, non-functional) design-system work.

## Running tests

```
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # run once + generate a coverage report (text + HTML + lcov, in coverage/)
npm run lint
npm run typecheck
```

All four (`lint`, `typecheck`, `test`, and implicitly `test:coverage`) are what CI runs, in that order, on every push and PR.

## Framework and architecture

**Vitest**, not Jest — this is a Next.js 16 / Turbopack project already on Vite-family tooling conventions, and Vitest's native ESM + TypeScript support meant zero extra transpilation config. No `jsdom`/React Testing Library: nothing in this suite renders a component. Every requirement in scope (bracket generation, workflow logic, notification gating, authorization) is server-side business logic, not UI behavior — see "What this suite does not verify" below for the deliberate boundary.

### The mock Supabase client (`test/helpers/mock-supabase.ts`)

The single piece of infrastructure that makes almost everything else possible. This codebase's Server Actions and lib functions take a Supabase client as a parameter or resolve one via `createClient()` — never a service-role client, always the caller's own session-scoped client (see `ARCHITECTURE.md`/`SECURITY.md`). `createMockSupabase()` is a small in-memory stand-in supporting exactly the query shapes actually used in this codebase (`.select().eq().eq().single()`, `.insert().select().single()`, `.update().eq()`, `.delete().eq()`, count queries), backed by plain JS arrays instead of Postgres.

This lets tests run **real, unmodified production code** — `runBracketGeneration`, `advanceWinner`, `registerTeamForTournament`, `approveRegistration`, `createNews`, the actual `updateSession` middleware — against fake data, with no network call, no test database, and no risk to the live Supabase project. Two techniques make this reach into Server Actions that don't take a client as a parameter:

- `vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mockClient }))` — swaps the module every Server Action calls to resolve its client.
- `vi.mock("next/cache", ...)` / `vi.mock("next/navigation", ...)` — `revalidatePath`/`redirect` throw or behave unexpectedly outside a real Next.js request; mocked to no-ops (or, for `redirect`, to throw the same way it really does, since some actions rely on it aborting execution).

`server-only` (the package, not a concept) is aliased in `vitest.config.mts` to an empty module (`test/mocks/server-only.ts`) rather than stripped from source files — the package itself documents that its throw-on-import behavior is a build-time guard, not something tests are expected to satisfy.

## What's covered

### Unit tests (`test/unit/`)

| File | Covers |
|---|---|
| `bracket-shared.test.ts` | Pure bracket math: `nextPowerOf2`, bye placement (`buildRound1Slots`), match-advancement slot routing (`determineAdvanceSlot`, every bracket_type/round combination), post-generation integrity validation |
| `bracket-single-elim.test.ts` | `runBracketGeneration` end-to-end against the mock client: round/match counts, bye auto-resolution, cascading byes, terminal-match uniqueness, link integrity |
| `bracket-double-elim.test.ts` | `runDoubleEliminationGeneration`: upper/lower/grand-final match counts, the 2-team degenerate case (no lower bracket), loser-link coverage, grand final dual-feed, bye handling |
| `grand-final-reset.test.ts` | `advanceWinner`'s three-way branch: upper champion wins (tournament ends), lower finalist wins with resets enabled (reset match created, tournament still open), lower finalist wins with resets disabled (tournament ends) — plus the runner-up recording added in Phase 10 |
| `bracket-summary.test.ts` | `summarizeBracket`'s round/team/elimination counting for both formats |
| `notifications.test.ts` | `createNotification`'s per-category preference gating (tournament/match/news/system), and the fail-open behavior when a preference row can't be found |
| `validation-team.test.ts` | `rosterSchema`'s business rules (5 required roles, no duplicates, max 2 subs / 1 coach, exactly one captain on a starting-five role) |
| `validation-profile.test.ts` | Profile/notification/privacy/appearance settings schemas |

### Integration tests (`test/integration/`)

Each exercises a full workflow through the real Server Action(s), asserting on both the resulting data state and the notifications produced.

| File | Covers |
|---|---|
| `registration-workflow.test.ts` | Register (roster-complete, deadline, capacity, duplicate-registration checks) → withdraw |
| `approval-workflow.test.ts` | Admin approve/reject, correct recipient (team owner, not the admin), rejection-reason propagation, non-admin rejection |
| `tournament-lifecycle.test.ts` | Full status chain `REGISTRATION_OPEN → REGISTRATION_CLOSED → ONGOING → COMPLETED`, archive, delete (including the approved-teams delete guard) |
| `match-dispute-lifecycle.test.ts` | Open dispute (ownership check, status-eligibility check) → resolve (status reset, both-teams notification) |
| `news-publication-workflow.test.ts` | Create draft → publish (category-specific broadcast title, transition-gated so re-saving a published article doesn't re-notify) → unpublish |

### Security tests (`test/security/`)

| File | Covers |
|---|---|
| `middleware-route-protection.test.ts` | The **actual** `updateSession` middleware (not a re-implementation): unauthenticated visitors redirected to `/login` from `/admin/*`, `/dashboard/*`, `/settings/*`; authenticated non-admins redirected from `/admin/*` to `/dashboard`; admins and public routes pass through |
| `team-ownership-and-tournament-mutation.test.ts` | Non-admin/unauthenticated `createTournament` rejected before any write; **and** an explicit, documented demonstration of where team-ownership enforcement actually lives (see below) |

## What this suite does not verify

This is the most important section of this document — read it before assuming a green `npm test` means "the database is secure."

**Row Level Security itself is not exercised here.** The mock Supabase client has no concept of RLS policies — it's a plain in-memory array with `.eq()` filtering, not Postgres. Most of this codebase's authorization is genuinely layered (see `SECURITY.md`'s "defense in depth"): a Server Action's own `role === 'admin'` check is one layer, and RLS is the layer that matters "if the other three ever regress." This suite fully covers the app-code layer (every admin-gated action correctly rejects non-admins/unauthenticated callers — see the integration and security tests above) but **cannot** prove the database itself would refuse the write if that app-code check were bypassed.

`team-ownership-and-tournament-mutation.test.ts`'s last test makes this concrete rather than hiding it: `updateTeam`/`deleteTeam` issue no owner-scoped filter and no explicit ownership check in application code at all (by design — see `SECURITY.md`'s RLS policy table). Run against the mock, an "attacker" successfully renames someone else's team, because the mock has no RLS to stop it. That's not a bug in the test — it's proof that Postgres RLS is the *only* thing standing between a non-owner and someone else's team for this specific case, which is exactly why it can't be certified by a mocked unit test.

The project's established way to verify actual RLS behavior is the `scripts/verify-*.mjs` pattern used throughout this project's development (see git history / conversation log for numerous examples: news, profiles, match operations) — temporary Node scripts run manually against the **live** Supabase project with a real anon-key client signed in as real test users, asserting that RLS actually blocks what it's supposed to, then cleaning up every row they created. This is deliberately not part of `npm test`:

- It requires real Supabase credentials (a live project), which a fork or a first PR from an external contributor won't have.
- It writes and deletes real rows — safe against a *dedicated test* project, unacceptable to run automatically against production on every push.

The optional `live-rls-verification` job in `.github/workflows/ci.yml` is scaffolding for this: it runs any `scripts/verify-*.mjs` present, but only when a repo variable (`RUN_LIVE_RLS_TESTS=true`) and three secrets (`TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY`) pointing at a **dedicated test project** — never production — are configured. It's not required for the main `test` job to pass. As of this writing there is no permanent `scripts/verify-*.mjs` checked in (they've always been written, run, and deleted per-phase); turning this into a real standing regression suite means promoting one or two of those into permanent scripts.

**Not covered at all**: UI rendering/component behavior (no `jsdom`), Cloudinary upload integration, email delivery (doesn't exist yet — see `ROADMAP.md`), the legacy Prisma-backed SPA routes (a different, intentionally-untouched system per `ARCHITECTURE.md`).

## Coverage

`npm run test:coverage` uses the v8 provider, scoped to business logic rather than the whole Next.js app — pages, layouts, and UI components aren't "business logic" and would dilute the number without testing anything meaningful. Scope (`vitest.config.mts`):

```
include: src/lib/bracket/**, src/lib/notifications.ts, src/lib/validation/**
exclude: src/lib/bracket/queries.ts   (thin DB-read wrapper, no branching logic, requires Next's request-scoped cookies to even import)
```

Thresholds (enforced — `test:coverage` fails the build if any drop below): **80% lines, 80% statements, 80% functions, 75% branches.** Current numbers as of this suite:

| Metric | Result |
|---|---|
| Statements | 93.77% |
| Branches | 80.56% |
| Functions | 96.42% |
| Lines | 93.97% |

All comfortably above target. Full per-file breakdown is in the generated `coverage/index.html` (or the `text` reporter output from `npm run test:coverage`) — not checked into git (`coverage/` is gitignored), regenerated on demand and uploaded as a CI artifact on every run.

## CI pipeline (`.github/workflows/ci.yml`)

Two jobs:

1. **`test`** (required, always runs): `npm ci` → lint → typecheck → `test:coverage`. Any failure fails the build. This is the gate — no live service dependency, runs identically on a fork with zero configuration.
2. **`live-rls-verification`** (optional, opt-in via repo variable + secrets — see above): runs any permanent `scripts/verify-*.mjs` against a dedicated test Supabase project. Depends on `test` passing first.

Coverage output is uploaded as a build artifact (`coverage-report`) on every run of the `test` job, whether it passes or fails, so a coverage regression can be inspected without re-running locally.

## Adding a new test

- Pure logic (no Supabase, no Next.js APIs) → `test/unit/`, plain Vitest, no mocking needed.
- A Server Action or lib function that takes a Supabase client as a parameter → `test/unit/` or `test/integration/`, pass `createMockSupabase({...seed}) as never`.
- A Server Action that resolves its own client via `createClient()` → needs `vi.mock("@/lib/supabase/server", ...)` at the top of the file (see any file in `test/integration/` for the pattern) plus `vi.mock("next/cache", ...)` and, if it redirects, `vi.mock("next/navigation", ...)`.
- Extending `createMockSupabase` for a new query shape it doesn't support yet (e.g. `.not()`, `.order()` with actual sorting) — add it there rather than duplicating ad hoc mocking per test file.
- A new authorization rule → add a rejection case to `test/security/`, following the "assert the mutation didn't happen, not just that an error was returned" pattern used throughout (RLS-style update/delete calls don't always error — they can silently affect zero rows).
