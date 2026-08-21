-- NOBLE STRIKE — extra roster fields for team_members
-- Adds per-player identity/contact fields needed by the roster editor.

alter table public.team_members
  add column if not exists country text,
  add column if not exists game_id text,
  add column if not exists discord text,
  add column if not exists avatar_url text;

-- Supports "my teams" dashboard queries that join/count members per team.
create index if not exists team_members_team_id_role_idx on public.team_members(team_id, role);
