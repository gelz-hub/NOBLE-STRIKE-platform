-- NOBLE STRIKE — Recruitment Hub (LFT/LFP), replacing Player Search.

create table public.recruitment_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  post_type text not null check (post_type in ('LFT', 'LFP')),
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),

  -- Shared heading: LFT's "Title" and LFP's "Team" are both just the
  -- post's headline — one column, no need for two mutually-exclusive ones.
  title text not null,

  game text not null check (game in ('MLBB', 'HOK')),

  -- LFT "Preferred Role" / LFP "Role Needed" — one shared vocabulary,
  -- deliberately decoupled from team_members' roster roles (EXP/JUNGLE/
  -- MID/GOLD/ROAM/SUB1/SUB2/COACH): recruitment doesn't care about
  -- SUB1-vs-SUB2, and needs an "ANY" option roster assignment doesn't.
  role text not null check (role in ('EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM', 'SUB', 'COACH', 'ANY')),

  rank text,           -- LFT only
  country text,        -- LFT only
  requirements text,   -- LFP only

  telegram_username text not null,
  description text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recruitment_posts_post_type_idx on public.recruitment_posts(post_type);
create index recruitment_posts_status_idx on public.recruitment_posts(status);
create index recruitment_posts_game_idx on public.recruitment_posts(game);
create index recruitment_posts_author_id_idx on public.recruitment_posts(author_id);

create trigger recruitment_posts_set_updated_at
  before update on public.recruitment_posts
  for each row execute procedure public.set_updated_at();

alter table public.recruitment_posts enable row level security;

create policy "recruitment_posts_select_public" on public.recruitment_posts
  for select using (true);

create policy "recruitment_posts_insert_own" on public.recruitment_posts
  for insert with check (auth.uid() = author_id);

create policy "recruitment_posts_update_own_or_admin" on public.recruitment_posts
  for update using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());

create policy "recruitment_posts_delete_own_or_admin" on public.recruitment_posts
  for delete using (auth.uid() = author_id or public.is_admin());
