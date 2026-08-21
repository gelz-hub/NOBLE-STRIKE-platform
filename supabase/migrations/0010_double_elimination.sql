-- NOBLE STRIKE — Double Elimination support (upper/lower/grand_final already
-- existed from the Phase 6 schema; this adds the reset-match type and the
-- per-tournament reset toggle, and extends auto-completion to cover it).

alter table public.tournaments
  add column if not exists grand_final_reset_enabled boolean not null default true;

-- Allow a 4th bracket_type for the conditional decider match. Constraint
-- name found dynamically since it was added inline via ALTER TABLE in 0009.
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.matches'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%bracket_type%IN%';
  if con_name is not null then
    execute format('alter table public.matches drop constraint %I', con_name);
  end if;
end $$;

alter table public.matches
  add constraint matches_bracket_type_check
  check (bracket_type in ('upper', 'lower', 'grand_final', 'grand_final_reset'));

-- Extend auto-completion: grand_final_reset is unconditionally the last
-- match when it exists (its winner is always champion). Plain 'grand_final'
-- is deliberately NOT included here — whether it's final depends on which
-- side won and whether resets are enabled, which is application logic
-- (see advanceWinner), not a fixed DB rule.
create or replace function public.maybe_complete_tournament() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  champion_name text;
begin
  if new.winner_id is not null
     and new.next_match_winner_id is null
     and new.bracket_type in ('upper', 'grand_final_reset')
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
