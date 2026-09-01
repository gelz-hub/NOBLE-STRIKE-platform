# Language Switching Performance — Changelog

Goal: EN ⇄ KM switching should feel instant (<200ms). It was taking ~1–2s.

## Root cause

`LanguageSwitcher` did `await setLocale(next)` then `router.refresh()`. The
dictionaries are static local JSON, but that sequence forced a full server
round-trip storm to change which one feeds the React context:

- `setLocale` server action → `proxy.ts` runs `supabase.auth.getUser()`
  (revalidates against the Supabase Auth server).
- `router.refresh()` invalidated the whole Router Cache for the route:
  - `proxy.ts` runs `supabase.auth.getUser()` **again**;
  - root `layout.tsx` re-executes — `supabase.auth.getUser()` **again** +
    a `profiles.theme_preference` query, sequential;
  - `getRequestConfig` deep-merges the ~760-key Khmer tree;
  - every Server Component on the route re-renders (on `/news`, `/legacy`,
    detail/admin/dashboard pages this re-runs **all** their Supabase
    fetches);
  - the entire merged message dictionary (~95KB JSON) is re-serialized into
    the RSC flight payload;
  - the client reconciles the whole tree under the remounted provider.

3–4 sequential Supabase auth round-trips + a full server re-render + a full
client reconcile — none of it needed to change UI language.

## Fix

Locale now lives in a client context with **both** dictionaries preloaded in
memory. Switching is a `setState`.

### Files changed

| File | Change |
|---|---|
| `src/lib/i18n/merge.ts` | **New.** `mergeMessages()` extracted here so server + client build an identical tree. |
| `src/components/i18n/i18n-provider.tsx` | **New.** Client provider: imports both `en.json`/`km.json`, builds both merged trees once at module load, holds `locale` in state (seeded from the server cookie value), renders `NextIntlClientProvider`. `setLocale()` swaps the in-memory dict instantly, then — off the critical path, in a `useTransition` — persists the cookie and fires one low-priority `router.refresh()` so Server-Component-rendered text catches up. Also owns the localStorage⇄cookie reconciliation that was in the switcher. |
| `src/i18n/request.ts` | Uses shared `mergeMessages`; merge now runs once at module load, not per request. |
| `src/app/layout.tsx` | `NextIntlClientProvider` + `getMessages()` → `<I18nProvider initialLocale={locale}>`. Server `getTranslations` path unchanged. |
| `src/components/ns/language-switcher.tsx` | Dropped `useRouter`/`setLocale`/`router.refresh()`; now calls the provider's `setLocale()` via `useI18n()`. Went from 72 to 40 lines. |
| `docs/i18n.md` | Rewrote the "where the active locale comes from" / persistence section; fixed the third-locale checklist references. |

## Before / after

| | Before | After |
|---|---|---|
| Critical-path network | server action + `router.refresh()` = 3–4 sequential Supabase auth round-trips | none |
| Homepage (`/`, 100% client) switch | ~0.8–1.2s | **~5–30ms** (React state update) |
| Server-heavy page (`/news`, `/legacy`, detail) switch | ~1.5–2.5s | client chrome **~5–30ms**; server-rendered text follows via a background refresh, no perceived block |
| Re-renders | whole route (server) + whole client tree | only `useTranslations`/`useLocale` consumers |
| RSC payload per navigation | +~10–13KB gzip messages blob every time | 0 (provider owns messages) |
| i18n client JS | one dict via RSC payload | both dicts, one ~24KB-gzip chunk, cached once |
| Deep merge | per request | once at module load |

*Homepage timings are estimates — measure with DevTools Performance (click →
last paint) and Network (server-action POST + `?_rsc=` request). The "after"
path does no network on the critical path so the improvement is structural.*

## Tradeoffs

- **Both dictionaries ship to the client** (~24KB gzip one-time cached chunk
  vs ~10–13KB gzip that was in *every* RSC navigation payload before). Pays
  for itself after 1–2 navigations; net win for any real session.
- **Server-rendered text lags briefly on data-heavy pages.** After a client
  switch, HTML that was rendered server-side with `getTranslations`
  (dashboard/admin/settings/auth layouts, `/news`, `/legacy`,
  tournament/team/user detail) stays in the old language until the
  background `router.refresh()` completes (~same 1–2s as before, but now
  invisible — the user already sees switched chrome). The public homepage is
  100% client so it's fully instant.
- **Two sources of "current locale"** (client state + cookie) can diverge for
  the duration of that background refresh. The cookie stays authoritative for
  SSR; first paint always uses it, so no hydration mismatch.

## Verification

- `tsc --noEmit`, `eslint`: clean.
- Full test suite: 146/146 passing.
- `next build`: succeeds; i18n provider chunk ~24KB gzip.

## Not changed

- No change to how translation keys are authored or read (`t(...)`,
  `getTranslations`, `useTranslations` all unchanged).
- No change to the cookie name, the server request config's contract, or the
  bilingual CMS `_en`/`_km` column system.
- The layout's `supabase.auth.getUser()` + `profiles` query were left as-is
  (deduping them is a separate change) — they're just no longer on the
  language-switch critical path.
