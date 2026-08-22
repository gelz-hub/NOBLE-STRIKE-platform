# UX Improvements — Final Report

Covers: Discord→Telegram profile field, country dropdown + flags, the
avatar/banner upload bug, and the email-verification success/error pages.

## 1. Database changes

**Migration `0021_telegram_and_country_code.sql`** (applied):

| Table | Change |
|---|---|
| `profiles` | `discord_username` → renamed to `telegram_handle` (manual contact field — distinct from `telegram_id`/`telegram_username`/`telegram_linked_at`, which belong to the bot account-linking flow and were **not** touched) |
| `profiles` | `privacy_show_discord` → renamed to `privacy_show_telegram` |
| `profiles` | `country` → renamed to `country_name`; added `country_code`; both default to `'Cambodia'`/`'KH'` for new signups |
| `recruitment_posts` | `country` → renamed to `country_name`; added `country_code` |

All renames (not drop+add) to preserve existing data — a Discord handle isn't a valid Telegram handle, but users keep their old value to correct rather than losing it; existing free-text country values carry over as `*_name`, with `*_code` empty until the user re-picks from the new dropdown.

## 2. Files changed

**New:**
- `src/lib/countries.ts` — ISO 3166-1 country list (~195 countries), popular Southeast Asian countries pinned first (Cambodia, Thailand, Vietnam, Philippines, Malaysia, Singapore, Indonesia, Myanmar, Laos), flag emoji computed from the code (not hand-typed)
- `src/components/ui/country-select.tsx` — searchable combobox (Popover + Command)
- `src/components/ui/country-flag.tsx` — flag + name display, 🌍 Unknown fallback
- `src/app/(auth)/verified/page.tsx` — email-verification success page
- `src/app/(auth)/verify-error/page.tsx` — email-verification failure page
- `supabase/migrations/0021_telegram_and_country_code.sql`

**Modified:**
- `src/lib/types/database.ts`, `src/lib/validation/profile.ts`, `src/lib/validation/recruitment.ts` — field renames + `country_code` validation
- `src/app/settings/actions.ts` — `updateProfileSettings`/`updatePrivacySettings` read/write the renamed fields
- `src/components/settings/profile-settings-form.tsx` — Discord input → Telegram Username input (placeholder `@username`, helper text as specified); free-text country input → `CountrySelect`
- `src/components/settings/privacy-settings-form.tsx` — "Show Discord" toggle → "Show Telegram"
- `src/app/users/[username]/page.tsx` — public profile now renders `CountryFlag` (always visible, 🌍 Unknown when unset) and the Telegram handle instead of Discord
- `src/app/recruitment/page.tsx`, `src/lib/recruitment/queries.ts`, `src/components/recruitment/{recruitment-post-form,recruitment-post-card,recruitment-filters}.tsx` — LFT country field is now a `CountrySelect`, cards show `CountryFlag`, the filter is an exact `country_code` match instead of free-text `ilike` search
- `src/lib/cloudinary/types.ts`, `src/lib/cloudinary/validation.ts`, `src/components/cloudinary/{image-upload,gallery-upload}.tsx` — upload bug fixes (below)
- `src/app/auth/callback/route.ts` — routes signup-verification links to `/verified`/`/verify-error` instead of silently landing on `/dashboard`/`/login`
- `locales/en.json`, `locales/km.json` — renamed/added keys for all of the above

## 3. Remaining Discord references (intentionally not touched)

All 6 are the **legacy Prisma/SQLite system** (per this project's own architecture doc: preserved, never extended) — a completely separate team-registration flow from the Supabase platform this task's Telegram/country work lives in:

- `src/app/api/teams/route.ts`, `src/app/api/teams/[id]/route.ts`
- `src/components/ns/forms/team-registration-form.tsx`
- `src/components/ns/views/teams-view.tsx`
- `src/lib/seed.ts`, `src/lib/types.ts`

These are legacy data/routes, not admin-only references — flagging per your instruction not to touch legacy data unless required. None of the new work depends on or conflicts with them.

## 4. Avatar/Banner upload bug — root cause & fix

Investigated the full pipeline: Cloudinary credentials (verified live via `cloudinary.api.ping()` and a real end-to-end test upload — both succeeded), the upload server action, form persistence, and the database write — all were structurally correct. Two real, concrete bugs found in the client-side upload components:

1. **HEIC/HEIF rejected outright.** `ACCEPTED_IMAGE_TYPES` only listed JPEG/PNG/WebP/GIF. iPhones save camera-roll photos as HEIC by default — every iOS user selecting a photo straight from their camera roll (rather than a pre-converted JPEG) had their file rejected before it ever reached Cloudinary. This is very likely **the** reported bug, since it reproduces on exactly the platforms named in your ask (mobile, and specifically browsers/WebViews — like Telegram's in-app browser — that don't transparently convert HEIC to JPEG the way some mobile Safari flows do). Fixed by adding `image/heic`/`image/heif` to the accepted MIME list and the file input's `accept` attribute.
2. **Silent failure on network/unexpected errors.** Both `ImageUpload` and `GalleryUpload` called the upload server action with no `try/catch`. A dropped connection or any exception thrown before the action returned its normal `{success: false}` shape would reject the promise inside `startTransition` with **no toast, no error message** — exactly "failing silently." Fixed by wrapping both in `try/catch` with a clear, user-facing error toast.

**Caveat, stated plainly**: I could not fully verify HEIC end-to-end (decoding a real HEIC file through Cloudinary) without a real device/HEIC file, and I have no browser-automation tool in this environment to literally test "mobile Chrome" or "inside the Telegram browser." I fixed the two concrete, provable defects found by code/pipeline audit; a live device test is the remaining verification step I'd recommend before considering this fully closed.

## 5. Email verification UX

`src/app/auth/callback/route.ts` previously redirected a successful signup-verification straight to `/dashboard` with zero acknowledgment, and a failure straight to `/login` with no explanation — exactly the "no clear confirmation" / "blank or confusing screen" problems described. It's also reused by the password-reset flow (distinguished by a `next` query param), so the fix only changes behavior for the case with **no** `next` param (i.e., a plain signup link):

- Success → `/verified`: "✅ Email Verified" title, the exact message text requested, "Go to Dashboard"/"Go to Home Page" buttons, and (since the callback already created the session server-side) an auto-redirect to `/dashboard` after 5 seconds if the visitor is confirmed logged in.
- Failure → `/verify-error`: a proper error page instead of a bare redirect to login.
- Password reset (`next=/reset-password`) is untouched — still goes straight to that page as before.

## 6. Verification results

- `tsc --noEmit`: clean.
- `npm run lint`: clean.
- `npx vitest run`: 123/123 passing (one pre-existing test referenced the old `privacy_show_discord` field name — updated to match the rename; no other test changes).
- DB-level script against the live database (created, run, deleted): new-profile Cambodia defaults, `telegram_handle`/country round-trip on `profiles`, confirmed old columns (`discord_username`, `privacy_show_discord`, `country`) are genuinely gone, `recruitment_posts.country_code` round-trip, and the `country_code` filter query — all passed.
- Live dev-server check: `/settings/profile` (redirects to login when signed out, as expected), `/recruitment`, `/verified`, `/verify-error`, and a real user's public profile page (confirmed the 🌍 Unknown flag fallback renders correctly for a profile with no country set) — all compiled and served with no console/server errors.
- **Not verified** (no browser-automation tool in this environment): the `CountrySelect` combobox's actual search/click interaction, and a real mobile Chrome / Telegram in-app browser upload test. Recommend a manual pass on those before considering this fully signed off.

Nothing has been committed, pushed, or deployed.
