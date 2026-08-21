-- NOBLE STRIKE — Bracket Engine (Single Elimination now, schema ready for
-- Double Elimination later without redesign).

-- ---------------------------------------------------------------------------
-- tournaments: bracket/seeding settings + champion record
-- ---------------------------------------------------------------------------
alter table public.tournaments
  add column if not exists bracket_format text not null default 'SINGLE_ELIMINATION'
    check (bracket_format in ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION')),
  add column if not exists seeding_method text not null default 'RANDOM'
    check (seeding_method in ('RANDOM')),
  add column if not exists champion_team_id uuid references public.teams(id) on delete set null,
  add column if not exists champion_team_name text,
  add column if not exists champion_date timestamptz;

-- ---------------------------------------------------------------------------
-- brackets
-- ---------------------------------------------------------------------------
create table public.brackets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  bracket_format text not null default 'SINGLE_ELIMINATION'
    check (bracket_format in ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'LOCKED')),
  generated_at timestamptz not null default now(),
  generated_by uuid references public.profiles(id) on delete set null
);

-- One active bracket per tournament (regeneration deletes+recreates rather
-- than accumulating rows).
create unique index brackets_tournament_id_key on public.brackets(tournament_id);

alter table public.brackets enable row level security;

create policy "brackets_select_public" on public.brackets
  for select using (true);
create policy "brackets_insert_admin" on public.brackets
  for insert with check (public.is_admin());
create policy "brackets_update_admin" on public.brackets
  for update using (public.is_admin()) with check (public.is_admin());
create policy "brackets_delete_admin" on public.brackets
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- matches: restructure for the bracket engine. Table is currently empty
-- (never wired to app code yet), so columns are renamed in place rather
-- than migrated.
-- ---------------------------------------------------------------------------
alter table public.matches rename column round to round_number;
alter table public.matches rename column match_index to match_number;
alter table public.matches rename column team_a to team_a_id;
alter table public.matches rename column team_b to team_b_id;
alter table public.matches rename column format to best_of;
alter table public.matches rename column next_match_id to next_match_winner_id;

alter table public.matches
  add column if not exists bracket_id uuid references public.brackets(id) on delete cascade,
  add column if not exists bracket_type text not null default 'upper'
    check (bracket_type in ('upper', 'lower', 'grand_final')),
  add column if not exists next_match_loser_id uuid references public.matches(id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists matches_bracket_id_idx on public.matches(bracket_id);
create index if not exists matches_tournament_round_idx on public.matches(tournament_id, round_number);

-- ---------------------------------------------------------------------------
-- Tournament completion: when a match with no parent (the final) gets a
-- winner, mark the tournament COMPLETED and record the champion.
-- Scoped to bracket_type = 'upper' so a future double-elimination grand
-- final (not upper) is what triggers completion instead, once implemented.
-- ---------------------------------------------------------------------------
create function public.maybe_complete_tournament() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  champion_name text;
begin
  if new.winner_id is not null
     and new.next_match_winner_id is null
     and new.bracket_type = 'upper'
     and (tg_op = 'INSERT' or old.winner_id is distinct from new.winner_id) then

    select team_name into champion_name from public.teams where id = new.winner_id;

    update public.tournaments
    set status = 'COMPLETED',
        champion_team_id = new.winner_id,
        champion_team_name = champion_name,
        champion_date = now()
    where id = new.tournament_id;
  end if;
  return new;
end;
$$;

create trigger matches_maybe_complete_tournament
  after insert or update on public.matches
  for each row execute procedure public.maybe_complete_tournament();
