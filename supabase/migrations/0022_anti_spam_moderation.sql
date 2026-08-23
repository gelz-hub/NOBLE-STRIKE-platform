-- NOBLE STRIKE — anti-spam/anti-abuse: account flagging, user/post
-- reporting, and an admin moderation audit log.

-- ---------------------------------------------------------------------------
-- profiles: suspicious-activity flag
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists flagged_at timestamptz,
  add column if not exists flag_reason text;

create index if not exists profiles_flagged_at_idx on public.profiles(flagged_at) where flagged_at is not null;

-- ---------------------------------------------------------------------------
-- reports: "Report User" / "Report Post". Polymorphic target (target_type +
-- target_id) rather than two nullable FK columns, since a report always
-- points at exactly one of several unrelated tables (profiles today,
-- recruitment_posts today — more target types can be added without a
-- schema change to this table).
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('USER', 'RECRUITMENT_POST')),
  target_id uuid not null,
  reason text not null check (reason in ('SPAM', 'HARASSMENT', 'SCAM', 'INAPPROPRIATE', 'OTHER')),
  details text,
  status text not null default 'PENDING' check (status in ('PENDING', 'RESOLVED', 'DISMISSED')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports(status);
create index reports_target_idx on public.reports(target_type, target_id);
create index reports_reporter_id_idx on public.reports(reporter_id);

alter table public.reports enable row level security;

create policy "reports_select_own_or_admin" on public.reports
  for select using (auth.uid() = reporter_id or public.is_admin());

create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = reporter_id);

create policy "reports_update_admin" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- moderation_actions: append-only audit log of admin moderation decisions.
-- Deliberately has no update/delete policy at all — RLS denies by default,
-- so this table can only ever be appended to via the API, never edited or
-- erased.
-- ---------------------------------------------------------------------------
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  -- Nullable (not "not null") specifically so ON DELETE SET NULL can apply
  -- if an admin account is ever removed — the audit row survives, it just
  -- loses the actor reference, rather than the delete failing outright.
  admin_id uuid references public.profiles(id) on delete set null,
  action_type text not null check (
    action_type in (
      'REPORT_RESOLVED', 'REPORT_DISMISSED', 'ACCOUNT_FLAGGED', 'ACCOUNT_UNFLAGGED',
      'POST_REMOVED', 'ACCOUNT_SUSPENDED'
    )
  ),
  target_type text not null check (target_type in ('USER', 'RECRUITMENT_POST', 'REPORT')),
  target_id uuid not null,
  reason text,
  created_at timestamptz not null default now()
);

create index moderation_actions_target_idx on public.moderation_actions(target_type, target_id);
create index moderation_actions_admin_id_idx on public.moderation_actions(admin_id);
create index moderation_actions_created_at_idx on public.moderation_actions(created_at desc);

alter table public.moderation_actions enable row level security;

create policy "moderation_actions_select_admin" on public.moderation_actions
  for select using (public.is_admin());

create policy "moderation_actions_insert_admin" on public.moderation_actions
  for insert with check (public.is_admin());
