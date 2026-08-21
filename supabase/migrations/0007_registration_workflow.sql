-- NOBLE STRIKE — tournament registration workflow: statuses, review metadata,
-- withdrawal, and notifications.

-- ---------------------------------------------------------------------------
-- tournament_registrations: add WITHDRAWN status + review/withdraw metadata
-- ---------------------------------------------------------------------------

-- Drop whatever the existing status check constraint is named (found
-- dynamically, since it was declared inline in 0001) and recreate it with
-- WITHDRAWN added.
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.tournament_registrations'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%IN%';
  if con_name is not null then
    execute format('alter table public.tournament_registrations drop constraint %I', con_name);
  end if;
end $$;

alter table public.tournament_registrations
  add constraint tournament_registrations_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'));

alter table public.tournament_registrations
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists withdrawn_at timestamptz;

create index if not exists tournament_registrations_status_idx2
  on public.tournament_registrations(status);

-- Owners may transition their own registration PENDING/REJECTED/WITHDRAWN ->
-- PENDING (re-register) or PENDING -> WITHDRAWN (withdraw). They can never
-- reach APPROVED or REJECTED themselves, and can never touch an already
-- APPROVED row (per "cannot withdraw approved registrations unless admin
-- manually reopens"). Combined via OR with the existing admin-only update
-- policy, so admins keep full control regardless.
create policy "tournament_registrations_owner_transition" on public.tournament_registrations
  for update using (
    status in ('PENDING', 'REJECTED', 'WITHDRAWN')
    and exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  )
  with check (
    status in ('PENDING', 'WITHDRAWN')
    and exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  read_status boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx
  on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own_or_admin" on public.notifications
  for select using (auth.uid() = user_id or public.is_admin());

-- Users can create their own notifications (e.g. registration-submitted);
-- admins can create notifications for any user (e.g. approve/reject).
create policy "notifications_insert_own_or_admin" on public.notifications
  for insert with check (auth.uid() = user_id or public.is_admin());

create policy "notifications_update_own_or_admin" on public.notifications
  for update using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "notifications_delete_own_or_admin" on public.notifications
  for delete using (auth.uid() = user_id or public.is_admin());
