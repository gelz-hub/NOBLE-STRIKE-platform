-- NOBLE STRIKE — User Profiles & Account Settings (Phase 10).

-- ---------------------------------------------------------------------------
-- profiles: settings-editable fields, privacy toggles, notification prefs
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists banner_url text,
  add column if not exists social_links jsonb not null default '[]'::jsonb,
  add column if not exists privacy_public_profile boolean not null default true,
  add column if not exists privacy_show_teams boolean not null default true,
  add column if not exists privacy_show_match_history boolean not null default true,
  add column if not exists privacy_show_discord boolean not null default false,
  add column if not exists notify_tournament boolean not null default true,
  add column if not exists notify_match boolean not null default true,
  add column if not exists notify_news boolean not null default true,
  add column if not exists notify_system boolean not null default true,
  add column if not exists notify_email boolean not null default false;

-- ---------------------------------------------------------------------------
-- team_members: optional link to a real platform account. Roster rows are
-- free-text player names (a team can list people who've never signed up),
-- so this stays nullable — set automatically when a roster row's
-- player_name matches an existing profiles.username (see saveRoster /
-- createRosterMember / updateRosterMember). This is what makes "Captain
-- Teams" / "Coach Teams" on a profile page computable at all; ownership
-- alone (teams.owner_id) can't express "I play ROAM on someone else's team."
-- ---------------------------------------------------------------------------
alter table public.team_members
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists team_members_user_id_idx on public.team_members(user_id);

-- ---------------------------------------------------------------------------
-- tournaments: runner-up, alongside the existing champion_* fields
-- ---------------------------------------------------------------------------
alter table public.tournaments
  add column if not exists runner_up_team_id uuid references public.teams(id) on delete set null,
  add column if not exists runner_up_team_name text;

-- ---------------------------------------------------------------------------
-- maybe_complete_tournament: also record the runner-up (the losing side of
-- the terminal match) so profile "Runner-ups" stats have real data instead
-- of always reading zero.
-- ---------------------------------------------------------------------------
create or replace function public.maybe_complete_tournament() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  champion_name text;
  runner_up_id uuid;
  runner_up_name text;
begin
  if new.winner_id is not null
     and new.next_match_winner_id is null
     and new.bracket_type in ('upper', 'grand_final_reset')
     and (tg_op = 'INSERT' or old.winner_id is distinct from new.winner_id) then

    select team_name into champion_name from public.teams where id = new.winner_id;

    runner_up_id := case when new.winner_id = new.team_a_id then new.team_b_id else new.team_a_id end;
    if runner_up_id is not null then
      select team_name into runner_up_name from public.teams where id = runner_up_id;
    end if;

    update public.tournaments
    set status = 'COMPLETED',
        champion_team_id = new.winner_id,
        champion_team_name = champion_name,
        champion_date = now(),
        runner_up_team_id = runner_up_id,
        runner_up_team_name = runner_up_name
    where id = new.tournament_id;
  end if;
  return new;
end;
$$;
