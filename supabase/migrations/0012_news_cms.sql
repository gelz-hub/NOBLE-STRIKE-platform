-- NOBLE STRIKE — News & Announcement CMS. Replaces the placeholder `news`
-- table (never wired to any UI, so this restructures it directly rather
-- than layering on top of dead columns).

-- ---------------------------------------------------------------------------
-- category: new set
-- ---------------------------------------------------------------------------
do $$
declare
  con_name text;
begin
  select conname into con_name
  from pg_constraint
  where conrelid = 'public.news'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%category%IN%';
  if con_name is not null then
    execute format('alter table public.news drop constraint %I', con_name);
  end if;
end $$;

update public.news set category = 'ANNOUNCEMENT' where category not in
  ('ANNOUNCEMENT', 'TOURNAMENT', 'RESULTS', 'MAINTENANCE', 'UPDATE', 'COMMUNITY');

alter table public.news
  add constraint news_category_check
  check (category in ('ANNOUNCEMENT', 'TOURNAMENT', 'RESULTS', 'MAINTENANCE', 'UPDATE', 'COMMUNITY'));

alter table public.news alter column category set default 'ANNOUNCEMENT';

-- ---------------------------------------------------------------------------
-- CMS columns
-- ---------------------------------------------------------------------------
alter table public.news
  add column if not exists slug text,
  add column if not exists status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  add column if not exists pinned boolean not null default false,
  add column if not exists publish_at timestamptz,
  add column if not exists view_count integer not null default 0,
  add column if not exists seo_description text,
  add column if not exists seo_keywords text[],
  add column if not exists tournament_id uuid references public.tournaments(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill slugs for any pre-existing rows, then enforce uniqueness.
update public.news
set slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) || '-' || substr(id::text, 1, 8)
where slug is null;
alter table public.news alter column slug set not null;
create unique index if not exists news_slug_key on public.news(slug);

-- Carry the old `published` boolean into the new status/publish_at model,
-- then drop it — status + publish_at fully supersede it. The pre-existing
-- select policy reads `published` directly, so it must be dropped first
-- (recreated further down against the new status/publish_at columns).
update public.news set status = 'PUBLISHED', publish_at = coalesce(publish_at, created_at) where published = true;
drop policy if exists "news_select_published_or_admin" on public.news;
alter table public.news drop column if exists published;

create index if not exists news_status_idx on public.news(status);
create index if not exists news_tournament_id_idx on public.news(tournament_id);
create index if not exists news_pinned_idx on public.news(pinned) where pinned;

drop trigger if exists news_set_updated_at on public.news;
create trigger news_set_updated_at
  before update on public.news
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: public sees only PUBLISHED articles whose publish_at has arrived
-- (this is how "Schedule Publication" works without a cron job — the
-- article can be marked PUBLISHED with a future publish_at and simply
-- won't be visible until that time passes; same pattern already used for
-- tournament registration deadlines, see ARCHITECTURE.md).
-- ---------------------------------------------------------------------------
drop policy if exists "news_select_published_or_admin" on public.news;
create policy "news_select_published_or_admin" on public.news
  for select using (
    (status = 'PUBLISHED' and (publish_at is null or publish_at <= now()))
    or public.is_admin()
  );

-- insert/update/delete policies (admin-only) are unchanged from 0003.

-- ---------------------------------------------------------------------------
-- View count: a narrow, unauthenticated-safe increment. General UPDATE on
-- news stays admin-only per RLS; this SECURITY DEFINER function is the one
-- sanctioned exception, scoped to exactly this one counter, on published
-- articles only.
-- ---------------------------------------------------------------------------
drop function if exists public.increment_news_view(uuid);
create function public.increment_news_view(article_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.news
  set view_count = view_count + 1
  where id = article_id
    and status = 'PUBLISHED'
    and (publish_at is null or publish_at <= now());
end;
$$;

grant execute on function public.increment_news_view(uuid) to anon, authenticated;
