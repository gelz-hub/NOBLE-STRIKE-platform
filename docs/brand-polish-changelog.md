# Brand & Localization Polish Pass — Changelog

A refinement pass on the English/Khmer localization: hybrid brand-vs-functional
copy strategy, natural Khmer rewrites, desktop hero rebalancing, navigation
brevity, and Khmer typography fixes. No functionality changed; no new schema.

## 1. Hybrid localization strategy (brand copy vs. functional UI)

**Mechanism**: `src/i18n/request.ts` already deep-merges `locales/km.json`
over `locales/en.json` and falls back to the English value for any key
missing from `km.json`. Rather than adding special-case rendering logic, brand
copy that should always stay English was simply **removed from `km.json`** —
the existing fallback does the rest. Zero new code paths.

**Kept English (removed from `locales/km.json`, falls back automatically):**

| Key | Value |
|---|---|
| `footer.tagline` | Compete. Conquer. Become Legendary. |
| `home.hero.kicker` | Competitive Gaming Platform *(also rebranded — see §2)* |
| `home.hero.subheadlinePrefix` / `subheadlineHighlight` | Compete. Conquer. / Become Legendary. |
| `home.cta.headlinePrefix` / `headlineHighlight` | Ready To Become / Legendary? |
| `userProfile.mvpAwards` | MVP Awards |
| `userProfile.champion`, `userProfile.stats.championships` | Champion, Championships |
| `tournaments.detail.champion`, `legacy.fields.champion`, `admin.legacy.fields.champion` | Champion |

**Judgment call, documented for visibility**: "Champion" as a *standalone
label* (a field name, a badge) stays English per your list above. Where
"champion" appears as a word *inside a flowing Khmer sentence* — e.g.
`legacy.metaDescription`, `legacy.archiveNotice` — it was left as the
existing, well-established Khmer word ជើងឯក, since that's a natural word
Khmer speakers already use (not an awkward direct translation), and
code-switching to English mid-sentence there would read worse, not better.
Flag this if you'd rather force "Champion" verbatim in those sentences too.

**Everything else stays translated** (nav, buttons, forms, validation,
settings, news, tournaments, teams, notifications, system messages) —
unchanged from the existing i18n work, per the "functional UI" bucket.

## 2. Branding fix

- `home.hero.kicker`: **"Elite Esports Organization" → "Competitive Gaming
  Platform"** (`locales/en.json`, inherited by Khmer via fallback). Drops
  "Organization" for language that matches what the product actually is —
  a tournament/competitive platform, not a corporate entity.
- Fixed a factual inconsistency: two separate hardcoded badges said **"EST.
  2024"** / **"Founded 2024"** (home hero corner flourish; NS Squad hero),
  while the Legacy & History archive's "Founded" stat correctly says 2023.
  Both now read **2023**, matching the archive.

## 3. Natural Khmer rewrites (not word-for-word)

Rewrote three marketing-adjacent descriptions that read as stiff, literal
translations of the English source:

- `home.hero.description` — dropped the clause-by-clause mirroring of
  "build your legacy, and rise through the ranks" for a shorter, more
  idiomatic Khmer sentence with the same meaning.
- `home.cta.description` — replaced the literal "write your name into
  esports history" with the natural Khmer idiom for "make a name for
  yourself" (បង្កើតឈ្មោះឲ្យខ្លួនឯង).
- `home.news.description` — simplified an awkward "player contract signing"
  phrase into more natural, concise wording.

`home.tournaments.description`, `home.teams.description`, and
`home.sponsors.poweredBy` were reviewed and left as-is — they already read
naturally (e.g. `home.teams.description` already renders "elite" as the
natural Khmer word ក្រុមកំពូល rather than an awkward loan-translation).

## 4. Desktop hero layout (`src/components/ns/views/home-view.tsx`)

Refinement only — same background, rings, particles, and brand identity.

- Headline: capped at `text-7xl` through the `lg` breakpoint (was scaling to
  `text-8xl`) and tightened tracking (`0.08em` → `0.06em`/`0.07em`), so it no
  longer dominates the viewport on wide desktop screens.
- Content column widened from `max-w-5xl` to `max-w-3xl`/`max-w-4xl` — a
  narrower, better-proportioned reading column instead of a title-dominated
  wide one, closing the "large unused horizontal space" gap without a layout
  overhaul.
- Supporting copy (`hero.description`) strengthened: `text-sm md:text-base`
  → `text-base md:text-lg`, and lightened from `text-muted-foreground` to
  `text-white/70` for better presence against the dark background.
- Minor vertical-rhythm tightening across the kicker/logo/CTA spacing scale
  for better balance at the top of the stack.

## 5. Navigation brevity (`locales/km.json`, main site nav only)

| Key | Before | After |
|---|---|---|
| `navigation.tournaments` | ការប្រកួត | ប្រកួត |
| `navigation.legacyAndHistory` | មរតក និងប្រវត្តិ | ប្រវត្តិ |
| `navigation.recruitment` | ជ្រើសរើសសមាជិក | ជ្រើសរើស |
| `navigation.joinTournament` | ចូលរួមការប្រកួត | ចូលរួមប្រកួត |

**Admin tab bar** (`admin.nav.tournaments` / `admin.nav.matches`) was
reviewed but left unchanged — that bar shows "Tournaments" and "Matches" as
adjacent tabs, and shortening both toward the same short word would trade
clarity for brevity in a context that isn't visually cramped the way the
main site header is. Settings tabs (`settings.tabs.*`) were already
concise, single-word translations — no changes needed.

## 6. Khmer typography audit (`src/app/globals.css`)

The existing `:lang(km)` rule only set `line-height`. Extended it to also
reset `letter-spacing: normal` — the site's heavy Latin-oriented tracking
utilities (`.ns-kicker` at `0.35em`, `.ns-pill` at `0.08em`, `.ns-btn-gold`/
`.ns-btn-outline` at `0.04em`, and the many inline `tracking-wider`/
`tracking-widest` classes on nav items, buttons, and section kickers) were
designed for uppercase Latin display type. Khmer has no case distinction,
and wide letter-spacing pulls diacritics and subscript (coeng) consonant
clusters away from their base character, actively hurting readability.

Because `:lang(km)` matches any element whose nearest `lang`-ancestor is
`km` — including everything under `<html lang="km">`, which the root layout
already sets from the visitor's locale — this one rule now protects
navigation, cards, forms, buttons, and dashboard screens site-wide, with no
per-component changes needed.

**Side effect handled**: that same global reset would have also flattened
the *intentional* wide tracking on English brand wordmarks/taglines that
stay English inside a Khmer-locale page (per §1). Added explicit
`lang="en"` to those elements so they're unaffected:

- `NSLogo`/`NSWordmark` ("NOBLE STRIKE" wordmark, `src/components/ns/logo.tsx`)
- The header/mobile-menu wordmark blocks and the mobile footer tagline in
  `src/components/ns/nav.tsx`
- The hero kicker, "NOBLE STRIKE" headline, subheadline, and CTA headline in
  `home-view.tsx`, plus the "EST. 2023" / "5V5 MOBA · ELITE" corner flourishes
- The entire NS Squad, Tournaments, Teams, Brackets, and News SPA views
  (`src/components/ns/views/{ns-team,tournaments,teams,brackets,news}-view.tsx`)
  — these were never wired into `next-intl` (all-English by design) but still
  sit under `<html lang="km">` when a visitor has Khmer selected, so each got
  a single `lang="en"` on its root wrapper to keep its typography intact.

**Scope note worth flagging**: those five SPA views render 100% hardcoded
English regardless of the site-wide locale — only the Home hero (this pass)
and the real App Router pages (dashboard, admin, `/legacy`, `/recruitment`,
`/news`, settings, auth) are actually translated. A Khmer-preferring visitor
browsing Tournaments/Teams/Brackets/News/NS Squad today sees English
content there. That's outside a "polish pass" — translating those five views
is a separate, larger task if you want full Khmer coverage across the whole
site.

## 7. Verification

- `tsc --noEmit` and `npm run lint`: clean.
- Full test suite: 123/123 passing.
- Locale key parity re-verified: `km.json` differs from `en.json` by exactly
  the 12 intentional brand-copy keys listed in §1; no accidental gaps.
- Simulated the `mergeMessages()` fallback for all 12 removed keys — each
  resolves to its correct English value.
- Live dev-server check in both locales: home hero, `/legacy`, and nav all
  render correctly; shortened nav labels and rewritten Khmer copy confirmed
  in the rendered HTML; no console/server errors.

## Not changed

- No functionality, routes, schema, or RLS changes.
- No visual redesign — same black/gold system, same section structure,
  same animations.
- Bilingual CMS content (News/Tournaments/Legacy Events `_en`/`_km` fields)
  and the Telegram bot dictionary were reviewed and are unaffected by this
  pass — they already follow the same "Khmer optional, falls back to
  English" pattern this changelog extends to UI strings.
