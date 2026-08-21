# NOBLE STRIKE — Security Review Checklist

A repeatable checklist for reviewing new changes and for periodic full re-audits. Pairs with `SECURITY.md` (which documents *why* each rule exists) and `ARCHITECTURE.md` (which documents *how the system is put together*). Run the "New PR" section on every change that touches auth, data access, or admin functionality; run the full "Periodic audit" pass every so often or before a release.

---

## New PR — run this on any change touching auth, mutations, or admin functionality

### Authentication
- [ ] Any new Server Action or Route Handler that mutates data calls `auth.getUser()` (directly, or via `requireAdminApi()`/`requireAuthApi()` from `src/lib/require-admin-api.ts`) before doing anything else.
- [ ] No check relies on a value the client sent (a hidden form field, a prop, a query param) to decide who the user is. The session comes from the cookie-bound Supabase client only.

### Authorization
- [ ] Any operation that should be admin-only checks `profiles.role === 'admin'`, using the same pattern already used everywhere (`requireAdmin()` in `admin/**/actions.ts`, or `requireAdminApi()` for API routes) — not a new, separately-invented check.
- [ ] Any operation scoped to "the owner" (a team, a registration) either relies on RLS's owner policy, or adds an explicit `resource.owner_id !== user.id` check server-side (defense in depth) — never just filters what the client *shows*.
- [ ] A UI element being conditionally rendered (a button, a nav link) is **not** treated as the authorization boundary. Ask: "if someone called this Server Action directly, bypassing the UI entirely, would it still refuse them?"

### RLS
- [ ] Any new table has RLS enabled (`alter table ... enable row level security`) **and** at least a `select` policy — an RLS-enabled table with zero policies silently returns nothing to everyone, which reads as "working" until it doesn't.
- [ ] Insert/update/delete policies match the intended owner/admin model, not just "public read, admin write" pasted without thinking about the specific table.
- [ ] Any new `SECURITY DEFINER` function sets `search_path = public` explicitly.

### No client-side-only security
- [ ] Grep the diff for any new boolean gate (`isAdmin`, `canEdit`, `unlocked`, etc.) computed only in a Client Component from data the client already had, with no corresponding server-side re-check on the action it gates.

### Secrets
- [ ] No hardcoded password, API key, or token in the diff.
- [ ] No new `NEXT_PUBLIC_`-prefixed env var holds a secret (service-role key, API secret, etc.).
- [ ] `src/lib/supabase/admin.ts` (service-role client) is not imported from anything under `src/app`.

### Dev/debug surface
- [ ] No new route or Server Action bypasses auth "for now" / "just for testing" / behind a query param.
- [ ] No new seed/reset/demo-data endpoint is reachable over HTTP without an auth check.

---

## Periodic audit — full pass

Repeat the process from the last full audit (see git history / conversation log for the methodology if needed):

1. **Enumerate every route and action.**
   ```
   find src/app/api -name "route.ts"
   grep -rl '"use server"' src --include="*.ts"
   ```
   For each: does every mutating export (`POST`/`PUT`/`DELETE`/`PATCH`, or any async function that writes) check auth? Check authorization (role/ownership)?

2. **Cross-reference tables against RLS.**
   ```
   grep -rn "^create table" supabase/migrations/*.sql
   grep -rn "enable row level security" supabase/migrations/*.sql
   ```
   Every table from the first list must appear in the second. Then confirm each has policies, not just RLS-enabled-with-nothing.

3. **Check `SECURITY DEFINER` functions.**
   ```
   grep -A3 "security definer" supabase/migrations/*.sql
   ```
   Every one must set `search_path = public`.

4. **Confirm the service-role client stays unused in-app.**
   ```
   grep -rln "supabase/admin\|createAdminClient" src --include="*.ts" --include="*.tsx"
   ```
   Should only ever match its own definition file, never anything under `src/app`.

5. **Sweep for regressions of the removed fake-admin pattern.**
   ```
   grep -rniE "admin.{0,20}(unlock|password)" src --include="*.tsx" --include="*.ts"
   grep -rn "ADMIN_PASSWORD" src --include="*.tsx" --include="*.ts"
   ```
   Should return nothing. If it does, someone reintroduced a client-side-only admin gate — remove it.

6. **Sweep for hardcoded secrets.**
   ```
   grep -rniE "password\s*=\s*['\"]|api_key\s*=\s*['\"]|secret\s*=\s*['\"][a-zA-Z0-9]" src --include="*.ts" --include="*.tsx"
   ```
   Manually review any hits that aren't obviously `process.env.*` or unrelated (form field names, zod schemas, score variables).

7. **Verify admin nav/route visibility live**, once per audit, against a running dev server:
   - Fetch `/` unauthenticated and grep the HTML for any admin-only label ("Admin Panel", "Tournament Management", etc.) — should find nothing.
   - `curl` every `/admin*` route unauthenticated — should all redirect (307) to `/login`.
   - `curl` every mutating API route unauthenticated — should all return 401/403, not 200 or 500 (a 500 can mask a missing check — make sure the check actually runs, not just that the request happens to fail for an unrelated reason).

8. **Re-read the "Known residual risks" section of `SECURITY.md`** — confirm each one is still accurate and still acceptable, or has been addressed.

9. **Update `SECURITY.md` and this checklist** if the audit found anything new — both should reflect the system as it actually is, not as it was when last written.
