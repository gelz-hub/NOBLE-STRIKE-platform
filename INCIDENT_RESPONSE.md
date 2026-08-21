# NOBLE STRIKE — Incident Response

What to do when something's broken in production. Pairs with `MONITORING.md` (how you'll find out) and `DEPLOYMENT.md` (rollback mechanics). This is a small team's runbook, not an enterprise on-call policy — scale the formality up if the team/user base grows enough to need it.

## First: figure out what kind of incident this is

| Symptom | Likely category | Jump to |
|---|---|---|
| `/api/health` returns non-200, or the whole site is down/erroring | Availability | §1 |
| A specific feature is broken (bracket generation, image upload, etc.) but the site's otherwise up | Functional regression | §2 |
| Data looks wrong (a team's roster vanished, a tournament's status is stuck, etc.) | Data integrity | §3 |
| Someone got access to something they shouldn't have (saw admin-only data, mutated something they don't own) | Security | §4 |
| The database or a third-party service (Supabase/Cloudinary/Sentry/Upstash) is down, not this app's code | Vendor outage | §5 |

## 1. Availability incident

1. Check `/api/health` directly — its `checks` object tells you whether it's the database or something else (env misconfiguration, most likely from a bad deploy).
2. Check Vercel's deployment status (dashboard → Deployments) — is the latest deploy actually live and healthy, or did the build itself fail (in which case the *previous* deployment is likely still serving traffic, and this may not be user-facing yet)?
3. If the most recent deploy is the cause: **roll back immediately** (`DEPLOYMENT.md` → Rollback process) — don't debug in production while the site is down for users. Debug the fix on a branch/preview deployment instead.
4. If it's not a recent deploy (e.g., Supabase itself is unreachable): see §5.
5. Once mitigated (rolled back or root cause fixed), confirm `/api/health` returns `200`/`status: "ok"` before considering it resolved.

## 2. Functional regression (site up, one feature broken)

1. Reproduce it — get exact steps, and check Sentry for a matching error (search by route/component name, or by the approximate time the report came in).
2. Check `MONITORING.md`'s structured logs for the relevant event (`tournament.created`, `match.completed`, etc.) around the time of the report — did the action even fire, or did it fail before reaching the log call?
3. Decide: is this a recent-deploy regression (→ roll back per `DEPLOYMENT.md`, then fix on a branch) or a longer-standing bug that just got noticed (→ no rollback needed, fix and deploy normally, no urgency beyond normal prioritization)?
4. If it involves a Server Action, check whether the failure is in the app-code authorization/validation layer or surfaced from Postgres/RLS (per `SECURITY.md`'s defense-in-depth model) — an RLS rejection showing up as a generic "error" in the UI is often correct behavior (a real authorization boundary), not a bug; confirm which one you're looking at before "fixing" it.

## 3. Data integrity incident

1. **Stop.** Before writing any corrective SQL, confirm exactly what happened and what the correct end state should be — a rushed manual fix is how a data incident becomes two data incidents.
2. Check whether Supabase's point-in-time recovery is available on your plan (`DEPLOYMENT.md` → Backups) — if so, and if the blast radius is large, restoring to just before the bad write may be safer/faster than hand-correcting rows.
3. For a small, well-understood blast radius (e.g., one tournament's `champion_team_id` got corrupted by a bad manual query), a direct, targeted `update` via the Supabase SQL Editor is fine — but write the `select` first, confirm it matches exactly the rows you expect, *then* change it to `update`.
4. If the cause was a bug (not a manual mistake), file it and fix it before this incident's write-up is considered closed — a data incident that recurs because the root cause was never fixed is a process failure, not just a technical one.
5. Document what was corrected, how, and by whom (see "After the incident" below) — data corrections are exactly the kind of change that needs a paper trail, since `git blame` won't show it.

## 4. Security incident

Read `SECURITY.md` and `SECURITY_CHECKLIST.md` first if you haven't recently — this section assumes that model.

1. **Contain first, investigate second.** If a specific account is compromised or behaving maliciously: an admin can flag/moderate the offending team via `/admin/teams` (or, for a compromised account, force a password reset by revoking sessions via the Supabase Auth dashboard — Authentication → Users → the affected user → revoke sessions).
2. **Determine which layer failed** (per `SECURITY.md`'s four layers: middleware → layout → Server Action → RLS). Something got through all of them, or someone found a gap in one that the others didn't cover. Check:
   - Was this a genuinely new gap, or a regression of something `SECURITY_CHECKLIST.md` already covers (the fake-admin-gate pattern, a missing `auth.getUser()` check, etc.)?
   - Run the periodic-audit greps in `SECURITY_CHECKLIST.md` §"Periodic audit" — they're written to be run on demand exactly for this situation.
3. **Fix the actual layer that failed**, not just the symptom — per `SECURITY_CHECKLIST.md`'s checklist, the RLS policy is the layer that must be correct regardless of what the app code does; if RLS wasn't actually the thing that stopped this, that's the priority fix.
4. **Rotate credentials if there's any chance a secret leaked** (service-role key, Cloudinary API secret, Sentry auth token) — Supabase dashboard → Settings → API → regenerate; Cloudinary dashboard → Settings → Security → regenerate. Update the env var everywhere it's set (Vercel, and anywhere `.env.local` might have a stale copy) immediately after rotating, since the old value stops working the moment you do.
5. Once fixed, add a line to `SECURITY.md`'s "Known residual risks" or fold the new check into `SECURITY_CHECKLIST.md` — a security incident that doesn't update those two documents will happen again.

## 5. Vendor outage (Supabase / Cloudinary / Sentry / Upstash down, not this app)

1. Check the vendor's own status page (Supabase: status.supabase.com; Cloudinary and others similarly) before assuming it's this app's fault — `/api/health`'s `checks.database` failing with a connection-level error (not an RLS/query error) is the tell for a Supabase-side outage specifically.
2. There's no automatic failover for any of these three (single Supabase project, single Cloudinary account) — during a real vendor outage, the honest status is "degraded/down until they recover," not something this app can route around. Communicate that plainly rather than attempting a workaround under pressure.
3. Sentry or Upstash being down degrades gracefully by design (errors stop being reported; rate limiting fails open) — neither takes the app itself down. Confirm this is actually true post-incident (it's a design intent, worth verifying it held) rather than assuming it.
4. Once the vendor recovers, re-check `/api/health` and spot-check the features that depend on the affected vendor before declaring it resolved.

## After the incident

For anything beyond a trivial, instantly-understood blip:

1. Write down: what happened, when it started/was noticed/was resolved, what the user-facing impact was, what fixed it, and what (if anything) prevents it from happening again.
2. If it revealed a gap in `MONITORING.md` (something that should have alerted but didn't) or `SECURITY_CHECKLIST.md` (a check that would have caught it), update that document as part of closing the incident out — not as a "someday" follow-up.
3. If a rollback was used, confirm the fix has actually landed and been re-verified in production before the next deploy proceeds normally — don't let "we rolled back" quietly become "and we forgot to ever fix it."
