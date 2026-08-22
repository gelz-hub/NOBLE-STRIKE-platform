-- NOBLE STRIKE — Telegram bot locale lookups (Phase 20).
--
-- The webhook handler has no Supabase Auth session (same situation as
-- consume_telegram_link_token in 0014), so reading/writing a linked user's
-- profiles.locale by their Telegram chat id needs its own narrow
-- SECURITY DEFINER functions rather than a plain RLS-guarded query.

-- ---------------------------------------------------------------------------
-- get_telegram_profile_locale: used on every inbound update to look up the
-- current locale for a linked chat (falls back to 'en' in application code
-- when no row is returned, i.e. the chat hasn't run /start yet).
-- ---------------------------------------------------------------------------
create function public.get_telegram_profile_locale(
  p_telegram_id bigint
) returns table (user_id uuid, locale text)
language sql
security definer
set search_path = public
stable
as $$
  select id, locale
  from public.profiles
  where telegram_id = p_telegram_id;
$$;

grant execute on function public.get_telegram_profile_locale(bigint) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- set_telegram_profile_locale: used by the /language command. No-ops (and
-- returns no row) when the chat isn't linked to a profile yet — the caller
-- still replies to the user, it just has nothing to persist.
-- ---------------------------------------------------------------------------
create function public.set_telegram_profile_locale(
  p_telegram_id bigint,
  p_locale text
) returns table (updated_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_locale not in ('en', 'km') then
    return;
  end if;

  return query
  update public.profiles
  set locale = p_locale
  where telegram_id = p_telegram_id
  returning id;
end;
$$;

grant execute on function public.set_telegram_profile_locale(bigint, text) to anon, authenticated;
