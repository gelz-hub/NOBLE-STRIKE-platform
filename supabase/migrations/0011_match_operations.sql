-- NOBLE STRIKE — Match Operations: scheduling, referees, live tracking,
-- evidence, and disputes. Extends the existing matches table rather than
-- replacing its bracket-progression columns (round_number, match_number,
-- next_match_winner_id, next_match_loser_id, etc. are all untouched).

-- ---------------------------------------------------------------------------
-- matches: expand status, add operational columns
-- ---------------------------------------------------------------------------

-- The existing 'PENDING'/'COMPLETED' values stay (they're what the bracket
-- generator and advanceWinner already rely on for undecided/decided
-- matches) — this just adds the operational states on top.
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.matches'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%IN%';
  if con_name is not null then
    execute format('alter table public.matches drop constraint %I', con_name);
  end if;
end $$;

alter table public.matches
  add constraint matches_status_check
  check (status in ('PENDING', 'SCHEDULED', 'READY', 'LIVE', 'COMPLETED', 'DISPUTED', 'CANCELLED'));

alter table public.matches
  add column if not exists stream_url text,
  add column if not exists lobby_id text,
  add column if not exists lobby_password text,
  add column if not exists referee_id uuid references public.profiles(id) on delete set null,
  add column if not exists admin_notes text,
  add column if not exists result_notes text,
  add column if not exists evidence_urls jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

comment on column public.matches.evidence_urls is
  'jsonb array of {url, type, uploaded_at} — type in (RESULT_SCREENSHOT, LOBBY_SCREENSHOT, REPLAY_SCREENSHOT)';

create index if not exists matches_referee_id_idx on public.matches(referee_id);
create index if not exists matches_status_idx2 on public.matches(status);

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- match_disputes
-- ---------------------------------------------------------------------------
create table public.match_disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  opened_by uuid references public.profiles(id) on delete set null,
  explanation text not null,
  evidence_urls text[] not null default '{}',
  status text not null default 'OPEN' check (status in ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED')),
  admin_response text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index match_disputes_match_id_idx on public.match_disputes(match_id);
create index match_disputes_status_idx on public.match_disputes(status);

create trigger match_disputes_set_updated_at
  before update on public.match_disputes
  for each row execute procedure public.set_updated_at();

alter table public.match_disputes enable row level security;

-- Public read, consistent with the rest of the platform (registration
-- rejection reasons etc. are already publicly visible the same way).
create policy "match_disputes_select_public" on public.match_disputes
  for select using (true);

-- Only the owner of one of the two teams actually in the match can open a
-- dispute for it — and only for their own team.
create policy "match_disputes_insert_team_owner" on public.match_disputes
  for insert with check (
    exists (
      select 1 from public.teams t
      where t.id = team_id and t.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.matches m
      where m.id = match_id and (m.team_a_id = team_id or m.team_b_id = team_id)
    )
  );

-- Resolving a dispute (status/admin_response/resolved_by/resolved_at) is
-- admin-only — team owners cannot edit after opening.
create policy "match_disputes_update_admin" on public.match_disputes
  for update using (public.is_admin()) with check (public.is_admin());

create policy "match_disputes_delete_admin" on public.match_disputes
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Opening a dispute flips the match to DISPUTED automatically. This runs as
-- SECURITY DEFINER specifically so a team owner's otherwise-unprivileged
-- session (matches UPDATE is admin-only per RLS) can trigger this one
-- narrow, system-controlled side effect — the owner never gets general
-- write access to matches, only this trigger does, and only this one field.
-- ---------------------------------------------------------------------------
create function public.mark_match_disputed() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.matches set status = 'DISPUTED' where id = new.match_id;
  return new;
end;
$$;

create trigger match_disputes_mark_disputed
  after insert on public.match_disputes
  for each row execute procedure public.mark_match_disputed();
