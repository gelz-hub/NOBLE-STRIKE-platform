# Perceived Performance & Loading States — Changelog

Audit + fixes for "does my click work?" moments: button feedback, route
loading states, and navigation transitions. No functionality changed, no
visual redesign — only feedback states added around existing interactions.

## 1. Button feedback audit

**Finding**: the codebase already had strong, consistent coverage — nearly
every form submit button (`Save`, `Publish`, `Create`, `Register`, `Login`,
etc.) already uses `useFormStatus()`/`useTransition()` with a spinner, a
disabled state, *and* dynamic text ("Saving...", "Signing In...", "Creating
Account...") across `TeamIdentityForm`, `NewsForm`, `TournamentForm`,
`LegacyForm`, all the `settings/*` and `auth/*` forms, etc. This was not
something that needed building — it needed auditing for gaps.

**Real gaps found and fixed:**

| Component | Before | After |
|---|---|---|
| `AccountMenu` (Log Out, both desktop dropdown & mobile) | Plain `<button>`, **no pending state at all** — a slow sign-out looked like a dead click | New `LogoutButton` (`useFormStatus`) — spinner, disabled, "Logging out..." |
| `register-team-modal.tsx` ("Confirm Registration" — the actual Join Tournament flow) | Spinner + disabled, but static text | Text now flips to "Registering..." |
| 5 delete-confirmation buttons (`news-actions-menu`, `legacy-actions-menu`, `tournament-actions-menu`, `delete-team-button`, `recruitment-post-card`) | Icon-only spinner replaced the word "Delete" with nothing readable | Spinner **+** "Deleting..." text (added `common.deleting` to both locales) |

**Checked and left alone** (already correct): the per-icon action buttons
in `match-status-actions.tsx` and `dispute-resolve-panel.tsx` swap their
icon for a spinner but keep a persistent text label ("Mark Ready", "Go
Live") — that's already sufficient click-acknowledgment + not-a-dead-button
signal, so no change needed there.

## 2. Route loading states (`loading.tsx`)

**Finding**: zero `loading.tsx` files existed anywhere in the App Router.
Every one of the 39 real routes was a server component with async data
fetching and no Suspense boundary — clicking any nav link produced a blank/
frozen screen until the destination page's data finished loading.

Added 8 route-level `loading.tsx` files, each shaped to match its real
page's layout (not a generic spinner):

- `src/app/news/loading.tsx` — featured-article block + article card grid
- `src/app/legacy/loading.tsx` — stat tiles + year-grouped event card grid
- `src/app/recruitment/loading.tsx` — filter bar + post card grid
- `src/app/tournaments/[id]/loading.tsx` — banner + stat tiles + tab content
- `src/app/teams/[id]/loading.tsx` — banner + stat tiles + roster card grid
- `src/app/users/[username]/loading.tsx` — banner + avatar + stat tiles
- `src/app/dashboard/loading.tsx` — stat tiles + list rows (covers every
  nested dashboard route that doesn't define its own)
- `src/app/dashboard/teams/loading.tsx` — team card grid (more specific
  than the dashboard default, per "Team Pages: show placeholder team
  cards")
- `src/app/admin/loading.tsx` — header + row list (covers every nested
  admin route: tournaments, news, legacy, matches, registrations, telegram)

All built from new shared primitives in `src/components/skeletons/
ns-skeleton.tsx` (`SkeletonCard`, `SkeletonCardGrid`, `SkeletonRow`,
`SkeletonStatTile`, `SkeletonDetailHero`, etc.) — deliberately plain server
components (no `"use client"`, no hooks) reusing the same `.ns-card`/
`.ns-card-gold-edge` classes as real content, so they're on-brand (black +
gold) and need zero client JS to appear instantly on navigation.

This is what actually answers "avoid blank screens / frozen interfaces" —
Next.js shows the nearest `loading.tsx` the instant a `<Link>` is clicked,
before any data has loaded, with no custom code beyond the file existing.

## 3. Navigation transitions

Added `src/components/route-transition.tsx`: a subtle 180ms fade+4px-slide
replayed on every client-side route change (`.ns-route-fade` in
`globals.css`), wired once into the root layout around `{children}`.

**Deliberately does not remount on navigation** — it replays a CSS class on
the same DOM node rather than `key`-ing the wrapper by pathname. Keying by
pathname would force React to unmount and remount everything below it on
every navigation, including the persistent dashboard/admin shell layouts —
defeating one of App Router's actual performance wins (layouts that don't
refetch/reflow when only the leaf page changes) in the name of "perceived"
performance. This approach gets the same visual signal without that cost.

Kept intentionally short (180ms) and skipped on first page load (only
replays on subsequent client-side navigations) — per "fast, lightweight,
not flashy," not a loading-screen-style animation.

## 4. Performance audit

Checked for the specific issues called out (slow server actions, N+1
queries, missing prefetching, unnecessary client components):

- **No `page.tsx` is an unnecessary client component** — every route stays
  a proper async Server Component, which is what makes the new
  `loading.tsx` Suspense boundaries actually work.
- **No N+1 query patterns** in the real request-serving hot paths — spot-
  checked `src/lib/bracket/queries.ts` (the bracket read path a Khmer/
  English visitor actually hits): one query for matches, then in-memory
  grouping, no per-row round-trips.
- **Found but not touched**: `src/app/api/tournaments/[id]/bracket/
  route.ts` (the legacy Prisma bracket-generation endpoint) does sequential
  per-match writes in a loop. Left alone deliberately — it's an admin-only,
  one-time-per-tournament write operation in the legacy Prisma system that
  this codebase's own architecture doc says to preserve rather than modify,
  not a path real users hit repeatedly. Flagging here rather than "fixing"
  it without being asked, since a rewrite of dependent sequential writes
  needs care to stay correct, not just fast.
- **Found but not touched**: the news-publish notification broadcast
  (`src/app/admin/news/actions.ts`) loops one insert per user. Already has
  an inline comment acknowledging this as a known scale tradeoff — not a
  new finding, and reworking it into a queue is a real architecture change
  outside a "fix low-risk issues" pass.
- Prefetching: unaffected — every internal link already uses `next/link`
  (no raw `<a>` tags found for in-app navigation), so Next.js's default
  viewport-based prefetching already applies everywhere.

## Verification

- `tsc --noEmit` and `npm run lint`: clean.
- Full test suite: 123/123 passing.
- Live dev-server check: every route with a new `loading.tsx` (`/news`,
  `/legacy`, `/recruitment`, `/dashboard`, `/admin`, a tournament detail
  page) compiles and responds correctly; no console/server errors.

## Not changed

- No visual redesign — skeletons reuse existing card/surface classes, the
  route transition reuses the existing easing curve philosophy (just much
  shorter), nothing about the black/gold system changed.
- No new npm dependencies — the route transition and all skeletons are
  hand-built CSS/React, not a progress-bar library, keeping bundle size
  and risk low.
