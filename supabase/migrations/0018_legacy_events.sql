-- NOBLE STRIKE — Legacy & History archive. Public showcase of past
-- tournaments/community events since 2023, admin-managed the same way
-- News is (see 0012_news_cms.sql): admin-only writes, public reads only
-- published rows.

create table if not exists public.legacy_events (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  title text not null,
  category text not null default 'TOURNAMENT' check (category in ('TOURNAMENT', 'COMMUNITY')),
  status text not null default 'COMPLETED' check (status in ('COMPLETED', 'ARCHIVED', 'UPCOMING')),
  event_date_label text,
  game text,
  teams_label text,
  teams_max int,
  format text,
  organized_by text,
  live_broadcast boolean not null default false,
  entry_fee text,
  tournament_mode text,
  prize_pool_label text,
  prize_pool_max numeric,
  champion text,
  runner_up text,
  top_3_4 text[] not null default '{}',
  support_team text,
  views int not null default 0,
  notes text,
  cover_image_url text,
  gallery_urls text[] not null default '{}',
  display_order int not null default 0,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legacy_events_year_idx on public.legacy_events(year desc);
create index if not exists legacy_events_published_idx on public.legacy_events(is_published) where is_published;

drop trigger if exists legacy_events_set_updated_at on public.legacy_events;
create trigger legacy_events_set_updated_at
  before update on public.legacy_events
  for each row execute procedure public.set_updated_at();

alter table public.legacy_events enable row level security;

drop policy if exists "legacy_events_select_published_or_admin" on public.legacy_events;
create policy "legacy_events_select_published_or_admin" on public.legacy_events
  for select using (is_published or public.is_admin());

drop policy if exists "legacy_events_insert_admin" on public.legacy_events;
create policy "legacy_events_insert_admin" on public.legacy_events
  for insert with check (public.is_admin());

drop policy if exists "legacy_events_update_admin" on public.legacy_events;
create policy "legacy_events_update_admin" on public.legacy_events
  for update using (public.is_admin());

drop policy if exists "legacy_events_delete_admin" on public.legacy_events;
create policy "legacy_events_delete_admin" on public.legacy_events
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed: the 6 documented events from NOBLE STRIKE's history, so the archive
-- isn't empty on first load. Guarded by title so re-running this migration
-- (e.g. against a fresh environment) doesn't duplicate rows.
-- ---------------------------------------------------------------------------
insert into public.legacy_events
  (year, title, event_date_label, game, teams_label, teams_max, format, organized_by, live_broadcast,
   prize_pool_label, prize_pool_max, champion, runner_up, top_3_4, status, display_order)
select 2025, 'NST Friendly Match 2025', 'October 2-6, 2025', 'Mobile Legends: Bang Bang', '16', 16, 'BO1',
  'Noble Strike', true, null, null, 'Team Seven NS', 'Cinder Icon',
  array['Abysal Celestial', 'Thunder Empire'], 'COMPLETED', 10
where not exists (select 1 from public.legacy_events where title = 'NST Friendly Match 2025');

insert into public.legacy_events
  (year, title, teams_label, teams_max, entry_fee, tournament_mode, prize_pool_label, prize_pool_max, status, notes, display_order)
select 2024, 'Noble Strike Open Tournament 2024', '64-128', 128, '$6 per team', 'Professional Tournament Mode',
  '$250-300', 300, 'COMPLETED',
  'Historical records are currently being restored. Some champion and participant information may be unavailable.',
  10
where not exists (select 1 from public.legacy_events where title = 'Noble Strike Open Tournament 2024');

insert into public.legacy_events
  (year, title, event_date_label, teams_label, teams_max, prize_pool_label, prize_pool_max, status, display_order)
select 2023, 'NEXT Tournament S1', 'June 2023', '32', 32, '$100', 100, 'COMPLETED', 30
where not exists (select 1 from public.legacy_events where title = 'NEXT Tournament S1');

insert into public.legacy_events
  (year, title, event_date_label, teams_label, teams_max, prize_pool_label, prize_pool_max, status, display_order)
select 2023, 'NEXT Tournament S2', 'July 2023', '32', 32, '$100', 100, 'COMPLETED', 20
where not exists (select 1 from public.legacy_events where title = 'NEXT Tournament S2');

insert into public.legacy_events
  (year, title, event_date_label, prize_pool_label, prize_pool_max, status, support_team, display_order)
select 2023, 'NEXT Tournament S4 Final Season', 'August 2023', '$333', 333, 'COMPLETED', 'Quince Esport', 10
where not exists (select 1 from public.legacy_events where title = 'NEXT Tournament S4 Final Season');
