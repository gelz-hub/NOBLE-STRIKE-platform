-- NOBLE STRIKE — Telegram Integration (Phase 14).

-- ---------------------------------------------------------------------------
-- profiles: linked Telegram account + notification preference
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists telegram_id bigint,
  add column if not exists telegram_username text,
  add column if not exists telegram_linked_at timestamptz,
  add column if not exists notify_telegram boolean not null default true;

create unique index if not exists profiles_telegram_id_key on public.profiles(telegram_id) where telegram_id is not null;

-- ---------------------------------------------------------------------------
-- telegram_link_tokens: short-lived, single-use tokens for the account-
-- linking deep link (t.me/<bot>?start=<token>). The webhook handler has no
-- Supabase Auth session (Telegram calls it, not a signed-in browser), so it
-- can't rely on RLS the normal way — consume_telegram_link_token() below is
-- a narrow SECURITY DEFINER function scoped to exactly this one operation,
-- the same pattern already used for increment_news_view (0012).
-- ---------------------------------------------------------------------------
create table public.telegram_link_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index telegram_link_tokens_user_id_idx on public.telegram_link_tokens(user_id);

alter table public.telegram_link_tokens enable row level security;

-- A user can create/see their own link tokens (needed so the settings page
-- can show "link pending" state); nobody can read anyone else's token —
-- it's effectively a short-lived credential.
create policy "telegram_link_tokens_select_own" on public.telegram_link_tokens
  for select using (auth.uid() = user_id);

create policy "telegram_link_tokens_insert_own" on public.telegram_link_tokens
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- telegram_settings: singleton row (channel id + global on/off switch).
-- Deliberately does NOT store the bot token — that stays an env var
-- (TELEGRAM_BOT_TOKEN), exactly like every other secret in this app
-- (Supabase keys, Cloudinary secret, Sentry DSN). This table holds only
-- non-secret operational config an admin should be able to change without
-- a redeploy.
-- ---------------------------------------------------------------------------
create table public.telegram_settings (
  id boolean primary key default true,
  channel_id text,
  notifications_enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint telegram_settings_singleton check (id)
);

insert into public.telegram_settings (id) values (true);

create trigger telegram_settings_set_updated_at
  before update on public.telegram_settings
  for each row execute procedure public.set_updated_at();

alter table public.telegram_settings enable row level security;

-- Public read: contains nothing sensitive (a channel id + a boolean), and
-- createNotification() needs to read notifications_enabled regardless of
-- which user's session triggered the notification (most call sites run
-- under a plain user's session, not an admin's) — same "public read, admin
-- write" shape as tournaments/teams/news.
create policy "telegram_settings_select_public" on public.telegram_settings
  for select using (true);

create policy "telegram_settings_update_admin" on public.telegram_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- consume_telegram_link_token: the one privileged operation the webhook
-- (no user session) needs to perform. Validates the token (exists, not
-- expired, not already consumed), links the Telegram identity onto the
-- owning profile, marks the token consumed, and returns the linked
-- username — all atomically, so a token can never be replayed.
-- ---------------------------------------------------------------------------
create function public.consume_telegram_link_token(
  p_token text,
  p_telegram_id bigint,
  p_telegram_username text
) returns table (linked_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id
  from public.telegram_link_tokens
  where token = p_token
    and consumed_at is null
    and expires_at > now();

  if v_user_id is null then
    return;
  end if;

  update public.telegram_link_tokens
  set consumed_at = now()
  where token = p_token;

  update public.profiles
  set telegram_id = p_telegram_id,
      telegram_username = p_telegram_username,
      telegram_linked_at = now()
  where id = v_user_id;

  return query select v_user_id;
end;
$$;

grant execute on function public.consume_telegram_link_token(text, bigint, text) to anon, authenticated;
