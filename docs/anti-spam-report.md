# Anti-Spam & Anti-Abuse — Implementation Report

## Codebase analysis (before implementing)

The app already had solid infrastructure to build on rather than reinvent:

- **Rate limiting**: `src/lib/rate-limit.ts` — Upstash Redis sliding-window limiter, fails open with a warning if Redis isn't configured (documented, deliberate — "a defense-in-depth layer, not the only thing standing between the app and abuse"). Already used for login/registration/dispute-creation. Extended rather than replaced.
- **Email verification**: `signUpAction` already uses `emailRedirectTo` + Supabase's built-in confirmation flow, and the register form already shows a "check your email" screen — new accounts are already unconfirmed until they click the link. This is a **Supabase Auth project setting** (Dashboard → Authentication → Sign In / Providers → Email → "Confirm email"), not application code — **please confirm this toggle is ON** in your Supabase project; I can't read or set it from here (it's not exposed via the anon/service-role API keys this app uses, only the Dashboard or a separate Management API token).
- **Admin patterns**: every admin feature this session (News, Legacy, Registrations) follows the same shape — `requireAdmin()` in a server action file, RLS with `public.is_admin()`, a list page + row component. Moderation follows the identical shape.
- **Only one real user-generated "content" surface**: Recruitment Hub posts (`recruitment_posts`). Teams/tournaments/news are either admin-authored or structured registration data, not free-text "posts" a spammer would target — Content Protection is scoped there.

## 1. Registration Protection

- **Cloudflare Turnstile**: `src/lib/turnstile.ts` (server-side `siteverify` call) + `src/components/auth/turnstile-widget.tsx` (client widget), wired into `RegisterForm`/`signUpAction`. **Fails open with a warning if `TURNSTILE_SECRET_KEY` isn't set** — same philosophy as the existing rate-limiter, so local dev isn't blocked. **You need to**: create a site in the Cloudflare Turnstile dashboard, then set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in `.env.local` and Vercel. Also added `challenges.cloudflare.com` to the CSP (`script-src`, `connect-src`, `frame-src`) in `next.config.ts` — the widget would otherwise be silently blocked by the existing strict CSP.
- **Email verification before activation**: already enforced by Supabase Auth (see above) — no code change needed, just confirm the setting.
- **Disposable email domains**: `src/lib/disposable-emails.ts` — ~70 known disposable-email domains, checked in `signUpAction` before Supabase's own signup call.
- **5 registrations per IP per hour**: the existing `registration` rate-limit bucket's window changed from 60s to 3600s (was already 5/attempt, just the wrong window for this requirement).

## 2. Account Protection

- **New accounts unverified**: covered by Supabase Auth's `email_confirmed_at` (null until verified) — used directly as the source of truth rather than duplicating it into a `profiles` column that could drift out of sync.
- **Unverified accounts can't post**: `createRecruitmentPost` checks `user.email_confirmed_at` and rejects with a clear error if null.
- **Automatic flagging**: `src/lib/moderation.ts`'s `flagAccount()` writes `profiles.flagged_at`/`flag_reason`. Wired to the two concrete, cheaply-detectable triggers this task's own Content Protection section defines: a spam/phishing link in a post (create or edit), full stop — flags immediately, doesn't just reject. (I did not attempt a broader behavioral-analytics "suspicious activity" system — that's a much larger, separate project; this implements the specific signals actually available from the features being built here.)

## 3. Content Protection (recruitment posts)

- **5 posts per minute per user**: new `post-create` rate-limit bucket, checked in `createRecruitmentPost`.
- **Duplicate detection**: before insert, checks the same author's posts from the last 24h for an identical title+description; rejects if found.
- **Spam/phishing link blocking**: `src/lib/spam-filter.ts` — blocks known URL shorteners (bit.ly, tinyurl, etc. — legitimate use in a recruitment post is rare and they mask the real destination), known phishing/free-hosting domains, common gaming-scam domains, and a suspicious-TLD pattern (`.xyz`, `.tk`, `.gq`, etc.). Applied on both create and edit. A match rejects the post **and** flags the account.

## 4. Moderation

- **Report User** (`src/components/moderation/report-user-button.tsx`) — shown on a public profile to any signed-in viewer who isn't the profile owner.
- **Report Post** (`src/components/moderation/report-post-button.tsx`) — shown on recruitment post cards to any signed-in viewer who isn't the post's owner/an admin.
- Both share `src/components/moderation/report-dialog.tsx` (reason + optional details) and `src/app/actions/reports.ts` (rate-limited 10/hour, blocks self-reporting, requires auth).
- **Admin moderation tools**: `/admin/moderation` — pending reports with a resolve/dismiss flow (resolving a `USER` report can optionally flag the account; resolving a `RECRUITMENT_POST` report can optionally delete the post, in the same action), plus a flagged-accounts list with an unflag action. Added to the admin nav.
- **Audit log**: `moderation_actions` — every admin decision (resolve/dismiss/flag/unflag/remove-post) is written here. The table has **no update or delete RLS policy at all**, so it's structurally append-only — not even an admin can edit or erase a past entry through the API, only insert new ones.

## 5. Database

**Migration `0022_anti_spam_moderation.sql`** (applied):

| Change | Detail |
|---|---|
| `profiles.flagged_at`, `profiles.flag_reason` | nullable, partial index on `flagged_at where not null` |
| `reports` (new table) | polymorphic `target_type`/`target_id` (`USER` \| `RECRUITMENT_POST`, extensible without a schema change) — RLS: insert own only, select own-or-admin, update admin-only |
| `moderation_actions` (new table) | append-only audit log — RLS: select/insert admin-only, **no update/delete policy** |
| Indexes | `reports(status)`, `reports(target_type, target_id)`, `reports(reporter_id)`, `moderation_actions(target_type, target_id)`, `moderation_actions(admin_id)`, `moderation_actions(created_at desc)` |

Followed existing conventions throughout: `is_admin()` for RLS (not a duplicated role check), `gen_random_uuid()` primary keys, `timestamptz`, the same admin CRUD shape as News/Legacy/Registrations.

## What you still need to configure

1. **Cloudflare Turnstile**: create a site, set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`. Until then, the widget silently doesn't render and server-side verification is skipped (logged as a warning) — registration still works, just without the CAPTCHA layer.
2. **Upstash Redis** (if not already provisioned): without it, every rate limit in this app — including the new registration/hour, post/minute, and report/hour limits — fails open. This was already true before this task; worth checking since it now backs more of the anti-abuse surface.
3. **Confirm "Confirm email" is enabled** in Supabase Dashboard → Authentication.

## Verification

- `tsc --noEmit`, `npm run lint`: clean.
- `npx vitest run`: 131/131 passing (8 new tests for `isDisposableEmail`/`checkForSpamLinks` in `test/unit/anti-spam.test.ts`).
- `npm run build`: clean production build, `/admin/moderation` registered correctly.
- DB-level script against the live database (created, run, deleted) — 13 checks: authenticated report insert, forged `reporter_id` rejected, anonymous insert rejected, reporter-only/admin-only select visibility, non-admin update rejected, admin resolve succeeds, account-flag round-trip, `moderation_actions` admin-only insert, and confirmed **even an admin cannot update `moderation_actions`** (no such policy exists) — all passed.
- Live dev-server + production build check: `/register` (Turnstile hidden input present, no errors), `/recruitment`, `/admin/moderation` (redirects to login when signed out, as expected), `/verified` — all compiled and served correctly.

Nothing has been committed, pushed, or deployed.
