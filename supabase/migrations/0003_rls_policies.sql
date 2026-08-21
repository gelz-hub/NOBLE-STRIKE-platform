-- NOBLE STRIKE — Row Level Security policies

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.matches enable row level security;
alter table public.news enable row level security;
alter table public.achievements enable row level security;
alter table public.ns_members enable row level security;
alter table public.sponsors enable row level security;
alter table public.social_links enable row level security;

-- ---------------------------------------------------------------------------
-- profiles — public read, self or admin write
-- ---------------------------------------------------------------------------
create policy "profiles_select_public" on public.profiles
  for select using (true);

create policy "profiles_update_self_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create policy "profiles_delete_admin" on public.profiles
  for delete using (public.is_admin());

-- (no insert policy — rows are created exclusively by the on_auth_user_created trigger,
-- which runs as SECURITY DEFINER and therefore bypasses RLS)

-- ---------------------------------------------------------------------------
-- teams — public read, owner or admin write
-- ---------------------------------------------------------------------------
create policy "teams_select_public" on public.teams
  for select using (true);

create policy "teams_insert_owner" on public.teams
  for insert with check (auth.uid() = owner_id);

create policy "teams_update_owner_or_admin" on public.teams
  for update using (auth.uid() = owner_id or public.is_admin())
  with check (auth.uid() = owner_id or public.is_admin());

create policy "teams_delete_owner_or_admin" on public.teams
  for delete using (auth.uid() = owner_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- team_members — public read, write gated by the owning team
-- ---------------------------------------------------------------------------
create policy "team_members_select_public" on public.team_members
  for select using (true);

create policy "team_members_insert_owner_or_admin" on public.team_members
  for insert with check (
    public.is_admin()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

create policy "team_members_update_owner_or_admin" on public.team_members
  for update using (
    public.is_admin()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  ) with check (
    public.is_admin()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

create policy "team_members_delete_owner_or_admin" on public.team_members
  for delete using (
    public.is_admin()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- tournaments — public read, admin-only write
-- ---------------------------------------------------------------------------
create policy "tournaments_select_public" on public.tournaments
  for select using (true);

create policy "tournaments_insert_admin" on public.tournaments
  for insert with check (public.is_admin());

create policy "tournaments_update_admin" on public.tournaments
  for update using (public.is_admin()) with check (public.is_admin());

create policy "tournaments_delete_admin" on public.tournaments
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- tournament_registrations — public read (team pages show tournament
-- participation/status), owner-team can create, admin approves/rejects
-- ---------------------------------------------------------------------------
create policy "tournament_registrations_select_public" on public.tournament_registrations
  for select using (true);

create policy "tournament_registrations_insert_owner_or_admin" on public.tournament_registrations
  for insert with check (
    public.is_admin()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

create policy "tournament_registrations_update_admin" on public.tournament_registrations
  for update using (public.is_admin()) with check (public.is_admin());

create policy "tournament_registrations_delete_owner_or_admin" on public.tournament_registrations
  for delete using (
    public.is_admin()
    or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- matches — public read, admin-only write (bracket generation & score entry)
-- ---------------------------------------------------------------------------
create policy "matches_select_public" on public.matches
  for select using (true);

create policy "matches_insert_admin" on public.matches
  for insert with check (public.is_admin());

create policy "matches_update_admin" on public.matches
  for update using (public.is_admin()) with check (public.is_admin());

create policy "matches_delete_admin" on public.matches
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- news — public can read published articles, admin sees + writes everything
-- ---------------------------------------------------------------------------
create policy "news_select_published_or_admin" on public.news
  for select using (published = true or public.is_admin());

create policy "news_insert_admin" on public.news
  for insert with check (public.is_admin());

create policy "news_update_admin" on public.news
  for update using (public.is_admin()) with check (public.is_admin());

create policy "news_delete_admin" on public.news
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- achievements, ns_members, sponsors, social_links — public read, admin write
-- ---------------------------------------------------------------------------
create policy "achievements_select_public" on public.achievements
  for select using (true);
create policy "achievements_insert_admin" on public.achievements
  for insert with check (public.is_admin());
create policy "achievements_update_admin" on public.achievements
  for update using (public.is_admin()) with check (public.is_admin());
create policy "achievements_delete_admin" on public.achievements
  for delete using (public.is_admin());

create policy "ns_members_select_public" on public.ns_members
  for select using (true);
create policy "ns_members_insert_admin" on public.ns_members
  for insert with check (public.is_admin());
create policy "ns_members_update_admin" on public.ns_members
  for update using (public.is_admin()) with check (public.is_admin());
create policy "ns_members_delete_admin" on public.ns_members
  for delete using (public.is_admin());

create policy "sponsors_select_public" on public.sponsors
  for select using (true);
create policy "sponsors_insert_admin" on public.sponsors
  for insert with check (public.is_admin());
create policy "sponsors_update_admin" on public.sponsors
  for update using (public.is_admin()) with check (public.is_admin());
create policy "sponsors_delete_admin" on public.sponsors
  for delete using (public.is_admin());

create policy "social_links_select_public" on public.social_links
  for select using (true);
create policy "social_links_insert_admin" on public.social_links
  for insert with check (public.is_admin());
create policy "social_links_update_admin" on public.social_links
  for update using (public.is_admin()) with check (public.is_admin());
create policy "social_links_delete_admin" on public.social_links
  for delete using (public.is_admin());
