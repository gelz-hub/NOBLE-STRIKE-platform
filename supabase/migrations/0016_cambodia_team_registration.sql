-- NOBLE STRIKE — Cambodia-focused team registration redesign.
--
-- New columns stay nullable at the DB level — existing live teams have
-- none of these set, and a `not null` migration would fail against real
-- data. "Required" is enforced by the zod schema for new team creation
-- and edits going forward, same split already used for roster-role
-- business rules (src/lib/validation/team.ts).

alter table public.teams
  add column if not exists game text check (game in ('MLBB', 'HOK')),
  add column if not exists contact_number text,
  add column if not exists province text;

-- Repurposed, not duplicated: every roster row already has a per-member
-- contact field; renaming it to Telegram (rather than adding a second,
-- team-level-only field) means the captain's already-highlighted row
-- (is_captain) naturally serves as the team's primary Telegram contact.
alter table public.team_members rename column discord to telegram_username;
