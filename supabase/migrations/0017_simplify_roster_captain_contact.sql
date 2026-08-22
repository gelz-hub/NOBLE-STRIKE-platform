-- NOBLE STRIKE — Simplify roster: the captain is the team's sole contact
-- person. Per-member Telegram and country are removed; the captain's
-- Telegram moves up to the team level, alongside the team's existing
-- contact_number, before the now-unused per-member columns are dropped.

alter table public.teams
  add column if not exists captain_telegram text;

-- Preserve any Telegram usernames already entered on a captain's roster
-- row before the column that held them is dropped below.
update public.teams t
set captain_telegram = tm.telegram_username
from public.team_members tm
where tm.team_id = t.id
  and tm.is_captain = true
  and tm.telegram_username is not null
  and t.captain_telegram is null;

alter table public.team_members
  drop column if exists telegram_username,
  drop column if exists country;
