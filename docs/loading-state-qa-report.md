# Production-Readiness QA Report — Loading States & Perceived Performance

**Scope**: everything from the loading-state/perceived-performance update
(route `loading.tsx` files, shared skeleton components, the route-transition
fade, button pending states, delete/logout/registration feedback).
**Not commited/deployed** — this report is pre-release QA only, as
instructed. No code was changed during this pass.

**Honesty note on method**: this environment has no browser-automation tool
(no Playwright/Puppeteer/device access). Network throttling, real iPhone
Safari/Android Chrome rendering, and live keyboard/screen-reader testing
were **not literally performed** — I don't want to claim otherwise. What
follows is a rigorous production-build verification plus a code-level audit
(diffing every skeleton's markup/classes against its real page's actual
layout, tracing hydration and focus-management logic by hand) — real
methods, but a substitute for, not equivalent to, in-browser testing.
Flagged explicitly below wherever that distinction matters.

---

## Production Build Verification

- `npm run build` — **succeeded**, clean compile, no type/lint errors,
  38 static pages generated, all dynamic routes registered correctly.
- `npm run start` (`bun .next/standalone/server.js`) — **failed with a 500**
  on every route (`TypeError: File URL path must be an absolute path`,
  `ERR_INVALID_FILE_URL_PATH`).
  - **Root-caused, not a regression**: re-ran the identical standalone
    build with plain `node .next/standalone/server.js` instead of `bun` —
    it started cleanly and served `200` on every route tested. This
    isolates the failure to a `bun`+Windows+Turbopack standalone-runtime
    incompatibility in `package.json`'s `start` script, unrelated to any
    code from this update. It also doesn't affect the real deployment
    target — Vercel builds and runs its own serverless bundle via `next
    build`, never this local `bun`-based standalone/self-host path (see
    `next.config.ts`'s `output` comment). **Still worth fixing separately**
    (the documented local self-host path is currently broken on Windows),
    but it is a pre-existing infrastructure issue, not something this QA
    pass should block on.
- All further verification below ran against the production build served
  via `node .next/standalone/server.js`.

## Route Loading QA

Verified every route with a new `loading.tsx` builds and serves correctly
in production (`200`/expected-redirect, no server errors, no hydration-
warning markers in the rendered HTML — checked for
`Application error`/`Internal Server Error`/stray hydration-mismatch text;
the only "hydration" string present anywhere is the pre-existing, intentional
`suppressHydrationWarning` prop on `<html>`, not an actual warning).

**Confirmed correct**: Home, Dashboard, Admin, Recruitment routes — build,
serve, and their skeleton's grid/column structure matches the real page.

**Found: 2 real skeleton/content shape mismatches** (this is exactly what
this QA pass is for — reporting, not fixing, per your instructions):

1. **Stat-grid column count doesn't match on 3 of 4 pages that use it.**
   `SkeletonStatGrid` hardcodes `grid-cols-2 lg:grid-cols-4` for every
   caller, but:
   - Legacy (`/legacy`) real grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`
     (5 stat cards) — skeleton shows 4 across, real shows 5.
   - Team detail (`/teams/[id]`) real grid: `grid-cols-3` (no responsive
     change) — skeleton shows a completely different 2/4-column pattern.
   - Tournament detail (`/tournaments/[id]`) real grid:
     `grid-cols-2 sm:grid-cols-5` — skeleton again fixed at `lg:grid-cols-4`.
   - Profile (`/users/[username]`) real grid: `grid-cols-3 sm:grid-cols-6`
     — skeleton mismatched again.
   - Only Dashboard's real grid (`grid-cols-2 lg:grid-cols-4`) actually
     matches what `SkeletonStatGrid` renders.
   - **Effect**: at the moment real content streams in, the stat-card row
     visibly reflows to a different column count/width on 4 of 5 pages
     that show stat tiles. Not a crash, not data-loss — but a direct,
     confirmed violation of "skeleton layout matches final content layout."
   - **Likely fix** (not applied): give `SkeletonStatGrid` a `className`
     override parameter the same way `SkeletonCardGrid` already has, and
     pass each page's real grid classes explicitly — small, low-risk,
     mirrors an existing pattern already in the same file.

2. **`/news/[slug]` (article detail) has no dedicated loading state and
   inherits the list page's skeleton**, which is a different shape
   entirely. `src/app/news/loading.tsx` renders a list skeleton (featured-
   card block + 6-card grid); the real article page is a single-column
   layout with a large `h-64 md:h-96` banner and flowing article text.
   Because there's no `src/app/news/[slug]/loading.tsx`, Next.js falls back
   to the parent segment's list-shaped skeleton for article navigation too.
   - **This is the "News → Article" scenario named explicitly** in your
     slow-network test plan — on a throttled connection this would show a
     card-grid skeleton, then snap to a single-column article, a visibly
     wrong shape swap.
   - **Likely fix** (not applied): add `src/app/news/[slug]/loading.tsx`
     with a hero-banner + text-block shape (same `SkeletonDetailHero`
     primitive already used for team/tournament/profile pages).

**Minor, lower-severity finding**: Tournament detail's real banner is
`h-56 md:h-80`; `SkeletonDetailHero` (shared across team/tournament/
profile) is `h-56 md:h-72`. An 8px difference at the `md` breakpoint —
visible if you look for it, not disruptive. Team and Profile pages both
match their skeleton's `h-56 md:h-72` exactly.

## Slow Network Simulation

**Not literally run** (no throttling tool available in this environment).
What I can confirm from the code instead: Next.js's `loading.tsx` mechanism
shows the fallback the instant a navigation starts, *before* any network
request for the destination's data resolves — this is a property of how
Suspense-based routing works, not something that depends on connection
speed. So "loading state appears instantly" and "no blank screens" hold
regardless of 3G/4G/broadband **for the routes whose skeleton shape is
correct**. Where the shape is wrong (the two findings above), a slow
connection makes the wrong-shape flash *more* visible and *longer-lived*,
not less — so those two findings should be treated as more urgent under
real-world network conditions, not less.

## Navigation Transition Audit

Traced `RouteTransition` (`src/components/route-transition.tsx`) logic by
hand:

- **Does not remount persistent layouts** — confirmed by design: the
  wrapper is never `key`-ed by pathname, so React never unmounts/remounts
  the subtree; the effect performs an imperative `classList` toggle on a
  stable `ref`, not a state update. This is stronger than a typical
  "doesn't remount" claim — it doesn't even trigger a React re-render, so
  dashboard/admin shell state (open menus, scroll position, form state in
  a sibling component) is untouched by every navigation.
- **No double-render risk**: `reactStrictMode: false` in `next.config.ts`
  (pre-existing, unmodified), so no double-invoked effects in dev; the
  effect is idempotent regardless.
- **First-load skip confirmed**: `isFirstRender` ref prevents the fade from
  firing on initial page load — only replays on subsequent client-side
  navigations, so it never delays or fades the very first paint.
- **SPA-view navigation is untouched, correctly**: the homepage's internal
  view-switcher (Home/Tournaments/Teams/News/Brackets via Zustand state,
  not routing) doesn't change `pathname`, so `RouteTransition` never fires
  for those switches — expected, since those views already have their own
  `ns-fade-up` entrance animation.
- **One micro-cost, not a bug**: the class-replay trick forces a
  synchronous layout read (`el.offsetWidth`) once per navigation to
  restart the CSS animation. This is the standard, minimal-cost technique
  for this — a single forced reflow, not a loop or a per-frame cost.
- **Scroll position**: `RouteTransition` doesn't touch scroll at all;
  scroll-reset-on-navigation behavior is entirely Next.js `<Link>`'s
  existing default, unmodified by this change.
- Flicker/transition-artifact risk: none identified by inspection — a
  single 180ms opacity+4px transform with no competing animation on the
  same element.

## Button Feedback Audit

Re-verified the final code state (not re-describing the whole earlier
audit) for every category named:

- **Login / Register**: unchanged from before this update — both already
  had spinner + disabled + dynamic text (`useFormStatus`). Confirmed intact
  in the production build.
- **Logout**: fixed this pass (`LogoutButton`, `useFormStatus`) — confirmed
  present in both the desktop dropdown and mobile menu variants, and the
  string `"Logging out..."` is present in the production build's compiled
  chunks (survived minification).
- **Register (tournament) / Confirm Registration**: `"Registering..."` text
  swap confirmed present in the production build output.
- **Create Team / Update Team**: unchanged — `TeamIdentityForm`'s
  `SubmitButton` already had full spinner+disabled+text coverage before
  this pass; re-confirmed still correct.
- **Save / Publish (CMS)**: unchanged, already correct (`NewsForm`,
  `TournamentForm`, `LegacyForm` all differentiate "Saving..." from a
  create/edit-specific label via `useFormStatus`).
- **Delete**: all 5 delete-confirmation buttons now show "Deleting..." text
  alongside the spinner — confirmed present in the production build.
- **No duplicate submissions**: every button audited uses `disabled={pending}`
  (or `useFormStatus().pending`) — verified this disables the control for
  the full duration of the transition, not just visually.

No regressions found in this category.

## Mobile QA

**Not literally tested on Android Chrome or iPhone Safari** (no device/
browser-automation access in this environment). Code-level responsive
review instead:

- Every skeleton primitive uses the same responsive Tailwind classes as
  the real component it stands in for (e.g., `SkeletonCardGrid`'s default
  `sm:grid-cols-2 lg:grid-cols-3` matches the real news/recruitment grids
  exactly) — so at a phone viewport width, columns collapse identically
  between skeleton and real content, aside from the stat-grid mismatches
  above (which exist at the `lg`/`sm` breakpoints, not specifically mobile).
- No fixed pixel widths introduced anywhere in the new skeleton components
  or `RouteTransition` — everything uses relative/Tailwind sizing, so no
  new horizontal-overflow risk was added.
- **Recommend**: an actual device pass (or at minimum a real browser +
  devtools device emulation) before shipping, specifically for the two
  shape-mismatch findings above — they're the ones most likely to look
  bad on a small screen where any reflow is more visually jarring.

## Accessibility QA

**Real finding**: none of the 8 new `loading.tsx` files (nor the shared
skeleton components) include `aria-live`, `aria-busy`, or `role="status"`.
A sighted user sees the skeleton appear instantly; a screen-reader user
gets no announcement that navigation started or that content is loading —
they'd hear silence, then have content appear with no signal it changed.
This directly undercuts this project's own stated goal ("never leave users
wondering...") for assistive-tech users specifically. Not a crash, not
new, but a real gap worth closing (e.g., a visually-hidden
`<span role="status" aria-live="polite">Loading…</span>` inside each
skeleton, localized via the existing `next-intl` setup) — not applied
during this audit per your instructions.

**Checked and not a concern**: focus restoration after a dialog closes
(delete confirmations, the registration modal) is handled by Radix UI's
`AlertDialog`/`Dialog` primitives, which restore focus to the triggering
element by default — none of this update's changes touch that logic, so
existing behavior is preserved. Disabled buttons (`disabled={pending}`)
correctly fall out of the tab order while pending, which is standard,
correct behavior, not a new usability trap.

**Not literally tested**: actual keyboard-only navigation through a live
page, and a real screen reader (VoiceOver/NVDA/TalkBack) pass. The
aria-live gap above is a code-inspection finding, not something audibly
confirmed.

## Performance Regression Audit

- **No new npm dependencies** — `RouteTransition` and every skeleton
  component are hand-written, using only `next/navigation`/React and the
  existing `cn` utility already used everywhere else in the codebase.
- **Bundle impact**: negligible by inspection — the new files are small,
  presentational, and import nothing new. (Turbopack's production build
  output in this Next.js version doesn't print a per-route size table the
  way webpack builds historically did, so I can't give you an exact
  before/after byte count from this build — flagging that limitation
  rather than fabricating a number.)
- **Re-renders**: `RouteTransition` causes zero additional React renders
  (imperative DOM effect only, as covered above). The button-feedback
  changes only add state that already existed in the same shape as
  every other already-audited pending button in the app — no new render
  pattern introduced.
- **Hydration cost**: all 8 `loading.tsx` files and every skeleton
  component are plain server components with no `"use client"` and no
  interactivity — they add zero client-side JS/hydration cost. The only
  new client component is `RouteTransition` itself, which is a handful of
  lines with one `useEffect`.

No performance regression identified.

---

## Release Decision

### FAIL

Not a functional/crash-level failure — the build is sound, nothing is
broken, and the majority of the update (button feedback, admin/dashboard/
recruitment loading states, the route-transition mechanism itself) checks
out clean. But this QA pass's own explicit bar was "no layout shifts" and
"skeleton layout matches final content layout" across the named pages, and
I found two concrete, verified violations of exactly that bar:

**Blocking issues:**

1. `SkeletonStatGrid`'s column count doesn't match the real grid on
   Legacy, Team detail, Tournament detail, and Profile pages (4 of 5
   pages that use it) — visible reflow at the loading→loaded transition.
2. `/news/[slug]` has no dedicated loading state and inherits the news
   list's card-grid skeleton — a materially wrong shape for one of your
   explicitly named test scenarios (News → Article).

**Recommended fixes** (small, low-risk, not applied — your instruction was
audit-only):

- Add a `className` override prop to `SkeletonStatGrid` (mirroring the
  pattern `SkeletonCardGrid` already has) and pass each page's real grid
  classes at each of the 4 call sites.
- Add `src/app/news/[slug]/loading.tsx` using the existing
  `SkeletonDetailHero` + text-block primitives.
- Optional, non-blocking: bump `SkeletonDetailHero`'s tournament usage to
  `md:h-80` to match exactly; add `role="status"`/`aria-live="polite"` to
  the skeleton primitives for screen-reader users.

**Remaining risk after those fixes**: low. Everything else in this report
checked out — production build, button feedback, delete/logout/
registration flows, and the transition mechanism's non-interference with
persistent layouts. The two findings are visual-polish-level, not
functional, and each has an obvious, scoped fix.

**Deployment confidence once the two blocking items are fixed**: high.
**Deployment confidence as-is right now**: medium — nothing will break for
users, but the update would ship with two visible, avoidable rough edges
in exactly the "loading state quality" this whole effort was about.

**Not tested and worth a real pass before or shortly after release**: an
actual mobile-device/browser check and a screen-reader pass — both flagged
above as method limitations of this environment, not confirmed either way.
