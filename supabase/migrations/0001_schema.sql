-- NOBLE STRIKE — core schema
-- Run once in the Supabase SQL Editor, in order (0001 -> 0002 -> 0003 -> 0004).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  avatar_url text,
  country text,
  discord_username text,
  role text not null default 'user' check (role in ('user', 'admin')),
  theme_preference text not null default 'dark' check (theme_preference in ('dark', 'light', 'system')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  team_name text not null,
  logo_url text,
  banner_url text,
  description text,
  is_official boolean not null default false,
  created_at timestamptz not null default now()
);

create index teams_owner_id_idx on public.teams(owner_id);

-- ---------------------------------------------------------------------------
-- team_members (role-based roster)
-- ---------------------------------------------------------------------------
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_name text not null,
  role text not null check (role in ('EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM', 'SUB1', 'SUB2', 'COACH')),
  is_captain boolean not null default false,
  is_substitute boolean not null default false,
  is_coach boolean not null default false,
  created_at timestamptz not null default now(),
  unique (team_id, role)
);

-- at most one captain per team
create unique index one_captain_per_team on public.team_members(team_id) where is_captain;

create index team_members_team_id_idx on public.team_members(team_id);

-- ---------------------------------------------------------------------------
-- tournaments
-- ---------------------------------------------------------------------------
create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  game_type text not null check (game_type in ('MLBB', 'HOK')),
  slug text not null unique,
  max_teams integer not null,
  prize_pool numeric not null default 0,
  registration_deadline timestamptz not null,
  start_date timestamptz not null,
  status text not null default 'REGISTRATION_OPEN'
    check (status in ('REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED')),
  format text not null default 'BO1' check (format in ('BO1', 'BO3', 'BO5')),
  rules text,
  banner_url text,
  location text,
  organizer text,
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create index tournaments_status_idx on public.tournaments(status);

-- ---------------------------------------------------------------------------
-- tournament_registrations
-- ---------------------------------------------------------------------------
create table public.tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, team_id)
);

create index tournament_registrations_tournament_id_idx on public.tournament_registrations(tournament_id);
create index tournament_registrations_team_id_idx on public.tournament_registrations(team_id);

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tournament_registrations_set_updated_at
  before update on public.tournament_registrations
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- matches
-- ---------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round integer not null,
  match_index integer not null,
  team_a uuid references public.teams(id) on delete set null,
  team_b uuid references public.teams(id) on delete set null,
  score_a integer not null default 0,
  score_b integer not null default 0,
  winner_id uuid references public.teams(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING', 'COMPLETED')),
  format text not null default 'BO1' check (format in ('BO1', 'BO3', 'BO5')),
  next_match_id uuid references public.matches(id) on delete set null,
  scheduled_at timestamptz
);

create index matches_tournament_id_idx on public.matches(tournament_id);

-- ---------------------------------------------------------------------------
-- news
-- ---------------------------------------------------------------------------
create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  excerpt text,
  category text not null default 'ANNOUNCEMENTS'
    check (category in ('TOURNAMENT_NEWS', 'TEAM_UPDATES', 'PLAYER_SIGNINGS', 'RESULTS', 'ANNOUNCEMENTS')),
  featured boolean not null default false,
  image_url text,
  author_id uuid references public.profiles(id) on delete set null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- supplementary tables — needed by the preserved NS org page & team achievements
-- ---------------------------------------------------------------------------
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  title text not null,
  description text,
  date timestamptz not null default now(),
  placement text
);

create index achievements_team_id_idx on public.achievements(team_id);

create table public.ns_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ign text,
  role text not null,
  type text not null default 'PLAYER' check (type in ('PLAYER', 'COACH', 'MANAGEMENT')),
  bio text,
  image text,
  join_date timestamptz,
  country text,
  "order" integer not null default 0
);

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text,
  tier text not null default 'PARTNER' check (tier in ('TITANIUM', 'PLATINUM', 'GOLD', 'PARTNER')),
  url text,
  "order" integer not null default 0
);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  url text not null,
  handle text,
  "order" integer not null default 0
);
