-- NOBLE STRIKE — Tournament Management: lifecycle statuses, auto-close,
-- delete-guard.

-- ---------------------------------------------------------------------------
-- tournaments.status: add DRAFT and ARCHIVED, default to DRAFT for new rows
-- ---------------------------------------------------------------------------
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.tournaments'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%IN%';
  if con_name is not null then
    execute format('alter table public.tournaments drop constraint %I', con_name);
  end if;
end $$;

alter table public.tournaments
  add constraint tournaments_status_check
  check (status in ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED', 'ARCHIVED'));

alter table public.tournaments alter column status set default 'DRAFT';

-- ---------------------------------------------------------------------------
-- Auto-close registration when approved teams reach max_teams.
-- (Deadline-based closing is computed at read time in the app, since there's
-- no scheduled job to flip status purely on elapsed time.)
-- ---------------------------------------------------------------------------
create function public.close_registration_if_full() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_count integer;
  team_limit integer;
begin
  if new.status = 'APPROVED' and (old.status is null or old.status is distinct from 'APPROVED') then
    select count(*) into approved_count
    from public.tournament_registrations
    where tournament_id = new.tournament_id and status = 'APPROVED';

    select max_teams into team_limit
    from public.tournaments
    where id = new.tournament_id;

    if team_limit is not null and approved_count >= team_limit then
      update public.tournaments
      set status = 'REGISTRATION_CLOSED'
      where id = new.tournament_id and status = 'REGISTRATION_OPEN';
    end if;
  end if;
  return new;
end;
$$;

create trigger tournament_registrations_close_if_full
  after update on public.tournament_registrations
  for each row execute procedure public.close_registration_if_full();

-- ---------------------------------------------------------------------------
-- Delete guard: a tournament with any APPROVED registration must be
-- archived, not deleted. Enforced at the DB level as defense-in-depth on
-- top of the same check in the deleteTournament server action.
-- ---------------------------------------------------------------------------
create function public.prevent_delete_with_approved_teams() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_count integer;
begin
  select count(*) into approved_count
  from public.tournament_registrations
  where tournament_id = old.id and status = 'APPROVED';

  if approved_count > 0 then
    raise exception 'Cannot delete a tournament with approved teams — archive it instead.';
  end if;
  return old;
end;
$$;

create trigger tournaments_prevent_delete_with_approved_teams
  before delete on public.tournaments
  for each row execute procedure public.prevent_delete_with_approved_teams();
