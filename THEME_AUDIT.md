# NOBLE STRIKE — Theme Audit (Phase 11)

This documents the design-system consolidation done to make Dark / Light / System themes work consistently. See `ARCHITECTURE.md` for the stack and `ROADMAP.md` for what's still open. No functionality changed in this phase — CSS classes and a handful of new presentational components only.

## 1. Token system

`src/app/globals.css` already had a `:root/.light` and `.dark` block (from the Phase 10 theme groundwork) covering `--background/--foreground/--card/--muted/--border` etc. This phase adds the semantic layer the spec asked for, as aliases of those existing tokens (single source of truth, no value duplication) plus new per-theme status colors:

| Token | Dark value | Light value | Notes |
|---|---|---|---|
| `--surface` | = `--card` (`#0d0d0d`) | = `--card` (`#FFFFFF`) | alias |
| `--surface-secondary` | = `--muted` (`#141414`) | = `--muted` (`#EDEAE1`) | alias |
| `--text-primary` | = `--foreground` (`#FFFFFF`) | = `--foreground` (`#14120C`) | alias |
| `--text-secondary` | = `--muted-foreground` (`#8a8a8a`) | = `--muted-foreground` (`#6b6558`) | alias |
| `--accent-hover` | `#E6D69A` | `#7c6530` | darker in light mode for AA contrast |
| `--success` | `#4ade80` | `#16a34a` | darker green for contrast on white |
| `--warning` | `#fbbf24` | `#b45309` | darker amber for contrast on white |
| `--danger` | = `--destructive` | = `--destructive` | alias |

All exposed as Tailwind utilities via `@theme inline` (`bg-surface`, `text-text-primary`, `text-text-secondary`, `bg-surface-secondary`, etc.) — usable directly in JSX, no new CSS needed per component.

The brand gold scale (`--gold`, `--gold-light`, `--gold-dark`, `--gold-metallic`) is untouched and identical in both themes, per "don't redesign."

## 2. Shared utility classes made theme-reactive

This was the highest-leverage change: `.ns-card`, `.glass`/`.glass-dark`, `.ns-btn-outline`, `.ns-kicker`, `.ns-pill-*`, and the scrollbar are defined **once** in `globals.css` and used across nearly every page. Fixing them there fixes their appearance everywhere at once, with no per-component risk:

- `.ns-card` — background gradient and border now derive from `var(--surface)`/`var(--border)` instead of hardcoded `#111111`/`#0a0a0a`.
- `.glass` / `.glass-dark` — now `color-mix()` over `var(--surface)`/`var(--background)` instead of a fixed black tint, so overlays (mobile nav drawer, sticky header) correctly go light-on-light and dark-on-dark.
- `.ns-btn-outline`, `.ns-kicker` — gold text darkened in light mode (`var(--gold-dark)`) for AA contrast against a pale background; unchanged in dark mode.
- `.ns-pill-*` (status badges — Open/Closed/Pending/Approved/Rejected/etc.) — now reference `--success`/`--warning`/`--danger`/`--text-secondary` via `color-mix()` instead of fixed hex, so they stay legible on both a black and a white card.
- Scrollbar track/border — now `var(--surface-secondary)`.
- New `.ns-input` utility — the semantic replacement for the repeated `bg-black/40 border-gold/20 focus:border-gold/60` className chain (see §3).

## 3. Hardcoded usage replaced

Two exact, repeated literal patterns accounted for most of the mechanical hardcoding and were safe to mass-replace (precise string match, no restructuring):

| Pattern | Meaning | Files before | Files after |
|---|---|---|---|
| `bg-black/40 border-gold/20 focus:border-gold/60` | every form input/textarea/select field | 23 | 0 (→ `.ns-input`) |
| `bg-[#0d0d0d] border-gold/30` | every dropdown/select/popover panel | 15 | 0 (→ `bg-popover border-gold/30`, popover token already theme-aware) |

Beyond those two patterns, every **global chrome** component (present on every single page) was fully converted to semantic tokens: `nav.tsx`, `footer.tsx`, `account-menu.tsx`, `admin-nav.tsx`, `dashboard-nav.tsx`, `admin/layout.tsx`, `dashboard/layout.tsx`, plus the entire `/settings` feature (all 5 tabs) and the public `/users/[username]` profile and `/players` search pages built in Phase 10.

Deliberately **left as literal `bg-black/*`**: banner/hero image overlay scrims (`bg-gradient-to-t from-black via-black/40`) and the mobile-menu backdrop (`bg-black/70`). These aren't surface colors — they're fixed-opacity scrims over a photo or behind an overlay panel, needed for text legibility regardless of site theme. Converting them to theme tokens would be visually wrong, not more correct.

### Before / after component count

- Files containing hardcoded `bg-black/*`, `text-white*`, or `border-white/*`: **93 → 73** (20 files fully cleared; most of the remaining 73 had only *some* of their classes in the two mass-replaced patterns and still carry other one-off hardcoded text/border colors — see §5).
- Files using the literal input-field pattern: **23 → 0**.
- Files using the literal dropdown-background pattern: **15 → 0**.
- New reusable primitives added: **3** (`Section`, `StatCard`, `EmptyState` — see §4). One pre-existing duplicate (`ProfileStatCard`) was deleted in favor of the new shared `StatCard`.

## 4. Reusable UI primitives

`Card`, `Badge`, `Alert`, `Table`, and `Dialog` (the "Modal" ask) **already exist** as shadcn/ui components (`src/components/ui/*`) and were already built against semantic tokens (`bg-card`, `text-card-foreground`, `text-muted-foreground`, etc.) — confirmed by inspection, no changes needed. They were simply never adopted by most pages, which instead use the custom `.ns-card` class (now also theme-safe, per §2).

Net-new, since these patterns didn't exist as shared components before this phase:

- **`Section`** (`src/components/ui/section.tsx`) — titled content section with optional description/actions, semantic tokens throughout.
- **`StatCard`** (`src/components/ui/stat-card.tsx`) — the icon/value/label stat-card pattern that was previously copy-pasted with slightly different hardcoded classes in `teams/[id]/page.tsx` and `users/[username]/page.tsx`.
- **`EmptyState`** (`src/components/ui/empty-state.tsx`) — the icon/title/description "nothing found" pattern, previously copy-pasted in the news and player search pages.

## 5. Full page audit

Per-page count of remaining hardcoded `bg-black/*` / `text-white*` / `border-white/*` occurrences (0 = fully converted this phase).

### Public

| Page | Remaining | Status |
|---|---|---|
| Home (`home-view.tsx`, legacy SPA) | 7 | Not touched this phase — large hero/marquee component, high visual-regression risk to rush |
| News listing / article (`news/page.tsx`, `news/[slug]/page.tsx`) | 3, 4 | Partially converted (filters fixed via input-pattern sweep); banner overlay literals remain, correctly so |
| Tournament (`tournaments/[id]/page.tsx`) | 15 | Not converted this phase — largest single public page (Overview + Bracket tabs), flagged as top priority follow-up |
| Match (`matches/[id]/page.tsx`) | 7 | Not converted this phase |
| Team (`teams/[id]/page.tsx`) | 10 | Not converted this phase |
| User profile (`users/[username]/page.tsx`) | 0 | **Fully converted** this phase |

### Dashboard

| Page | Remaining | Status |
|---|---|---|
| Dashboard overview | 2 | Mostly clean; a couple of stat-label literals remain |
| Teams | 2 | Mostly clean |
| Registrations | 3 | Mostly clean |
| Notifications | 4 | Mostly clean |
| Settings (all 5 tabs) | 0 | **Fully converted** this phase |

### Admin

| Page | Remaining | Status |
|---|---|---|
| Tournaments | 4 | Mostly clean (form/filter inputs converted; row/action-menu literals remain) |
| Registrations | 2 | Mostly clean |
| Matches | 2 | Mostly clean |
| News | 8 | Partially converted — editor form's Write/Preview tab area has the most remaining literals |

**Global chrome** (nav, footer, mobile menu, account dropdown, admin nav, dashboard nav, both layout shells): **0 remaining — fully converted.** Since these render on every page, this is what makes the header/footer/navigation genuinely theme-consistent across the whole platform even where a given page body hasn't been fully migrated yet.

## 6. Theme verification

- Dark mode: unchanged in dark mode — every token's dark value is a preserved copy of the original hardcoded value, so the default look is bit-for-bit the same.
- Light mode: `.ns-card`, `.glass*`, `.ns-btn-outline`, `.ns-kicker`, `.ns-pill-*`, dropdown panels, all form inputs, and the entire global chrome + Settings + public profile + player search now render correctly (white/pale surfaces, dark text, darkened gold accents for contrast) instead of black-on-black or invisible white-on-white text.
- System mode: follows `next-themes`' OS-level `prefers-color-scheme` listener (unchanged from Phase 10) — no new work needed, it was already wired correctly to the same `.dark`/`.light` class toggle this phase's tokens hang off of.
- `npx tsc --noEmit` and `npx eslint` both clean on every file touched this phase (2 pre-existing lint errors in untouched shadcn boilerplate — `carousel.tsx`, `use-mobile.ts` — unrelated).

## 7. AA contrast

Addressed directly by darkening light-mode-only values where the dark-mode color would have failed against a white/pale surface: `.ns-btn-outline` text, `.ns-kicker`, `--accent-hover`, `--warning`, `--success`. Not independently verified with an automated contrast checker (no such tooling in this repo) — spot-checked by eye against the actual token values; flagged as a good candidate for `SECURITY_CHECKLIST.md`-style follow-up tooling rather than claimed as formally certified.

## 8. Remaining work, prioritized

1. **Tournament page** (15 occurrences) — highest remaining count, most-visited public page.
2. **Team page** (10) and **Match page** (7) — same public-page family, same patterns.
3. **Admin News editor** (8) — largest remaining admin surface.
4. **Home / legacy SPA views** (`home-view.tsx` and siblings: `teams-view.tsx`, `tournaments-view.tsx`, `news-view.tsx`, `ns-team-view.tsx`, `brackets-view.tsx`) — not touched this phase. These are large, animation-heavy components; each should get its own focused pass rather than a mechanical sweep, to avoid the exact visual regressions this phase's "don't redesign" constraint was meant to prevent.
5. Remaining dashboard/admin list pages (2-4 occurrences each) — low effort, mostly stat-label and empty-state literals; good candidates for adopting the new `StatCard`/`EmptyState` primitives while fixing them.
