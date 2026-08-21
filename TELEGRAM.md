# NOBLE STRIKE — Telegram Integration

How the Telegram bot, account linking, notification fan-out, and channel broadcasts work. See `ARCHITECTURE.md` for how this fits the rest of the system, `SECURITY.md`/`SECURITY_CHECKLIST.md` for the security model this extends, `MONITORING.md` for how Telegram events show up in logs.

## UI status: account linking is hidden, backend is intact

**As of the Phase 15 simplification, Telegram account linking is disabled in the UI but fully preserved in the backend for future use.** Nothing described in §"Account linking" below was removed — every table, column, RPC, Server Action, and the webhook handler itself all still exist and work exactly as documented. What changed is purely presentational:

- `TelegramLinkCard` (`src/components/settings/telegram-link-card.tsx`) is no longer rendered on `/settings/notifications` — the component file still exists, unused.
- The "Telegram Notifications" toggle no longer appears in `NotificationSettingsForm` — `profiles.notify_telegram` is still read/written under the hood (submitted as a hidden field carrying its existing value unchanged), and `createNotification()`'s Telegram fan-out logic still checks it exactly as before.
- `generateTelegramLinkToken()` / `unlinkTelegram()` (`src/app/settings/actions.ts`) are still fully functional Server Actions — just currently uncalled from any page.
- The `/api/telegram/webhook` endpoint, `consume_telegram_link_token()` RPC, and the `telegram_link_tokens` table are all still live — if a token were somehow generated and redeemed (e.g. by a future re-enablement of the UI, or directly via the database for testing), linking would still work.

**Re-enabling it later** is a pure UI change: re-add `<TelegramLinkCard profile={profile} />` to `src/app/settings/notifications/page.tsx`, and restore the "Telegram Notifications" `ToggleRow` (with its `telegramLinked`/`setTelegram` state) to `notification-settings-form.tsx`. No migration, no backend change, no data loss — everything needed was left in place specifically so this is trivial to reverse.

**What's still fully active regardless of this UI change**: the admin panel (`/admin/integrations/telegram`), channel broadcasts (tournament/news/registration-opening), the Champion Crowned notification, and per-user Telegram notification delivery for anyone who was already linked before this change (or linked directly against the database) — none of that depended on the linking UI being visible.

## Setup (one-time, manual — an account/bot only you can create)

1. **Create the bot**: message [@BotFather](https://t.me/BotFather) on Telegram, send `/newbot`, name it (e.g. "NOBLE STRIKE"), and choose a username ending in `bot` — `@NobleStrikeBot` if available. BotFather replies with a bot token (`123456:ABC-...`). This repo can't do this step for you — it requires your own Telegram account.
2. **Set the env vars** (Vercel → Project Settings → Environment Variables, or `.env.local` for dev):
   ```
   TELEGRAM_BOT_TOKEN=<the token BotFather gave you>
   TELEGRAM_WEBHOOK_SECRET=<any random string you generate — e.g. `openssl rand -hex 32`>
   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=NobleStrikeBot   # no @, no bot: prefix
   ```
3. **Register the webhook** — tell Telegram where to send updates, and set the secret it must echo back on every call:
   ```bash
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
     -d "url=https://<your-domain>/api/telegram/webhook" \
     -d "secret_token=<the same TELEGRAM_WEBHOOK_SECRET value>"
   ```
   Run this once per deployment (dev/staging/production each need their own webhook pointed at their own URL — Telegram only delivers to one URL per bot token, so don't share a bot token across environments unless you re-run `setWebhook` every time you switch which one is "live").
4. **Add the bot as an admin of your Telegram channel** (for broadcasts — see below), then set that channel's ID in `/admin/integrations/telegram` (Channel ID field; a public channel's `@handle` works, or the numeric `-100...` id for a private one, obtainable via `getUpdates`/`getChat` or any "get Telegram channel/chat ID" bot).
5. Apply migration `0014_telegram_integration.sql` (same manual SQL Editor process as every other migration — see `OPERATIONS.md`).

Every piece of this feature no-ops safely until these steps are done — `isTelegramConfigured()` (`src/lib/telegram/client.ts`) gates every send, and the admin panel shows exactly what's configured and what isn't (§"Admin controls").

## Architecture

### What's stored where

| Data | Where | Why |
|---|---|---|
| Bot token, webhook secret | Env vars only (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`) | Real secrets — never stored in the database, exactly like the Supabase service-role key, Cloudinary API secret, and Sentry auth token. The admin UI shows configured/not-configured status, never the value. |
| Channel ID, global notifications on/off | `telegram_settings` table (singleton row) | Not secrets — operational config an admin should be able to change without a redeploy. |
| Per-user `telegram_id`/`telegram_username`/`telegram_linked_at`/`notify_telegram` | `profiles` table | Same table as every other notification preference (`notify_tournament`, `notify_match`, etc. — see Phase 10). |
| Linking tokens | `telegram_link_tokens` table | Short-lived (15 min), single-use, RLS-scoped so a user can only see their own. |

### Account linking (backend live, UI currently hidden — see §"UI status" above)

Telegram bots have no concept of "log in with Telegram" the way OAuth does for a website — the standard pattern is a **deep link with an embedded token**:

1. (When the UI is enabled) user clicks "Link Telegram" in `/settings/notifications` → `generateTelegramLinkToken()` (`src/app/settings/actions.ts`) inserts a random token tied to their `user_id`, returns `https://t.me/<bot>?start=<token>`.
2. Clicking that link opens Telegram and starts a chat with the bot, auto-sending `/start <token>`.
3. Telegram POSTs that message to `/api/telegram/webhook` (after verifying the webhook secret — see §Security). The handler calls `consume_telegram_link_token(token, telegram_id, telegram_username)`.
4. That's a `SECURITY DEFINER` Postgres function (`0014_telegram_integration.sql`) — the **only** privileged operation the webhook needs, scoped to exactly this: validate the token (exists, unexpired, unconsumed), atomically mark it consumed and write `telegram_id`/`telegram_username`/`telegram_linked_at` onto the owning profile. Same pattern as `increment_news_view` (Phase 9) and `is_admin()` — a narrow, purpose-built escape hatch from RLS, not a broad bypass. The webhook has no Supabase Auth session (Telegram calls it, not a signed-in browser), so it genuinely can't do this any other way without violating `SECURITY.md`'s "never call the service-role client from anything under `src/app`" rule.
5. The bot replies confirming the link. The settings page shows "Linked as @username since \<date\>" on next load, with an Unlink button (`unlinkTelegram()` — just clears the three columns; no token/session to revoke on Telegram's side).

## Notifications

`createNotification()` (`src/lib/notifications.ts`) — the single function every in-app notification already goes through — was extended to also deliver to Telegram, rather than adding Telegram-sending calls at each of the many places that call it. A message goes out to a user's linked Telegram chat only when **all** of these hold:
1. Their category preference is on (`notify_tournament`/`notify_match`/`notify_news`/`notify_system` — Telegram isn't a separate opt-in from "do I want this kind of notification at all," it's an additional delivery channel for the same preference).
2. `profiles.notify_telegram` is on.
3. `profiles.telegram_id` is set (account is linked).
4. `telegram_settings.notifications_enabled` is on (admin global kill-switch).

Because of that central-function design, most of the 9 requested triggers needed **zero new call sites** — they already flow through `createNotification()`:

| Requested trigger | Actual existing call site | Category |
|---|---|---|
| Team approved | `admin/registrations/actions.ts` → `approveRegistration` ("Registration Approved") | tournament |
| Team rejected | `admin/registrations/actions.ts` → `rejectRegistration` ("Registration Rejected") | tournament |
| Registration accepted | `dashboard/registrations/actions.ts` → `registerTeamForTournament` ("Registration Submitted") | tournament |
| Match scheduled | `admin/matches/actions.ts` → `scheduleMatch` ("Match Scheduled") | match |
| Match rescheduled | same function, `wasScheduled` branch ("Match Rescheduled") | match |
| Match live | `admin/matches/actions.ts` → `markMatchLive` ("Match Goes Live") | match |
| Tournament announcement | `admin/news/actions.ts` → `maybeNotifyOnPublish`, TOURNAMENT category | news |
| News publication | same function, ANNOUNCEMENT category ("Major Announcement Published") | news |

**Team approved/rejected and Registration accepted** are a deliberate interpretation: this schema doesn't have a team-level approval concept (see `ARCHITECTURE.md` — approval is a property of `tournament_registrations`, not `teams`, by design), so the three registration-lifecycle triggers in the spec map onto the three registration-lifecycle notifications that already exist, rather than inventing a parallel "team approval" mechanism the app has no other use for.

**Champion Crowned** is the one genuinely new trigger — nothing previously notified anyone when a tournament completed. Added as `notifyChampionCrowned()` in `admin/tournaments/[id]/bracket/actions.ts`'s `advanceWinner`, called once after any terminal-match update (upper-bracket final, grand final, or grand final reset — never a lower-bracket or non-final match, which can't complete a tournament). It notifies both finalists' team owners: the champion and the runner-up, using the `runner_up_team_id` tracking added in Phase 10. **Known limitation**: if an admin corrects a score on an already-completed final after the fact, this fires again — there's no notification-sent ledger to dedupe against, consistent with how the rest of this app's notifications behave (e.g., re-approving an already-approved registration also re-notifies). Not considered worth a dedicated audit table for this.

## Channel broadcasts

Separate from the automatic per-user fan-out above — an **admin-triggered** action to post to the configured Telegram channel, for the three cases the spec called out as needing to reach a public audience, not just the people directly involved:

- **Tournament announcements / Registration openings**: `broadcastTournamentToTelegram(tournamentId)` (`admin/tournaments/actions.ts`), triggered from the Send icon in `TournamentActionsMenu`. One action covers both — the message heading adapts to the tournament's current status ("Registration Now Open" vs. "Tournament Announcement"), rather than building two separate broadcast mechanisms for what's the same underlying message with a different headline.
- **News articles**: `broadcastNewsToTelegram(newsId)` (`admin/news/actions.ts`), triggered from the Send icon in `NewsActionsMenu`, only enabled once an article is published.

Both are deliberately **manual, not automatic** — "allow admins to publish" (the spec's wording) reads as a capability, not a requirement that every tournament status change or news edit auto-spams a public channel. Automatic per-user notifications already cover the "make sure the right people find out" case; the channel is for "the admin decided this is broadcast-worthy."

## Admin controls (`/admin/integrations/telegram`)

- **Bot Token / Webhook Secret**: status only (configured/not configured) — never an editable field, since these are real secrets and this app's established convention keeps every secret in env vars, never the database (see §Architecture above).
- **Channel ID**: editable, saved to `telegram_settings`.
- **Enable/Disable Notifications**: the global kill-switch — off stops every per-user Telegram notification *and* every channel broadcast, regardless of individual user preferences. For an incident where the bot is misbehaving (wrong channel, spamming, leaked token) without wanting to touch env vars/redeploy.
- **Test Message**: two buttons — "Send Test to Me" (requires the admin's own account to be linked) and "Send Test to Channel" (requires a channel ID to be set) — both call `sendTestMessage()` (`admin/integrations/telegram/actions.ts`), admin-gated like every other admin action in this app.

## Notification preferences

`notify_telegram` (boolean, default `true`) joins the existing `notify_tournament`/`notify_match`/`notify_news`/`notify_system`/`notify_email` set on `profiles`. **Currently not exposed as a toggle in the UI** (see §"UI status") — since there's no linking UI, there's nothing meaningful for a user to turn this on/off for. The column, its default, and `createNotification()`'s gating on it are all still fully functional; `notification-settings-form.tsx` submits its existing stored value through unchanged on every save rather than exposing a control for it.

## Public Telegram presence

Separate from everything above — plain external links to the public channel/group, no linking, no auth, nothing backend-related. `TelegramButtons` (`src/components/telegram/telegram-buttons.tsx`) renders "Join Telegram Channel" and "Join Telegram Community" links, each only appearing if its URL is configured:

```
NEXT_PUBLIC_TELEGRAM_CHANNEL_URL=https://t.me/noblestike
NEXT_PUBLIC_TELEGRAM_GROUP_URL=https://t.me/noblestrikecommunity
```

Both open in a new tab (`target="_blank" rel="noopener noreferrer"`). Placed on: the homepage (legacy SPA's closing CTA section, `home-view.tsx`), the global footer (`footer.tsx`), the public tournament detail page (`tournaments/[id]/page.tsx`), and both news pages (`news/page.tsx`, `news/[slug]/page.tsx`). A `variant="compact"` prop is available for tighter inline placements (smaller icons/text) if a future spot needs it — every current placement uses the default size.

## Security

**Webhook signature verification** (the spec's explicit requirement): Telegram doesn't sign webhook payloads with an HMAC the way Stripe or GitHub do. Its documented equivalent is the `secret_token` parameter passed to `setWebhook` (§Setup step 3) — Telegram echoes it back on every subsequent webhook call as the `X-Telegram-Bot-Api-Secret-Token` header. `/api/telegram/webhook/route.ts` verifies that header against `TELEGRAM_WEBHOOK_SECRET` using a constant-time comparison (`timingSafeEqual`, hand-rolled — no crypto import needed for a fixed-length XOR comparison) before processing anything, and returns `401` immediately if it's missing or wrong. Without `TELEGRAM_WEBHOOK_SECRET` set, the endpoint refuses every request (`503`) rather than silently accepting unverified updates.

**Everything else follows the app's existing model** (`SECURITY.md`): the admin settings page/actions require `profiles.role === 'admin'` via the same `requireAdmin()` pattern used everywhere else; `telegram_link_tokens` is RLS-scoped so a user can only ever see their own; `consume_telegram_link_token` is the one narrow, audited exception to "the webhook has no session," not a broad one — it can only ever link a Telegram identity onto whichever profile generated the specific token being redeemed, nothing else.

**Failure mode**: every Telegram send (`src/lib/telegram/client.ts`) catches its own errors, logs them (`telegram.send_failed`), and returns `{ ok: false }` rather than throwing — a Telegram API outage or a bad token must never break the tournament/registration/match/news action that triggered the notification. Same "fail open, don't take the app down" philosophy as rate limiting (`DEPLOYMENT.md`).
