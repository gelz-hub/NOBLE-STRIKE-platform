-- NOBLE STRIKE — functions & triggers

-- is_admin(): used inside RLS policies. SECURITY DEFINER so it can read
-- public.profiles without recursing back into the profiles RLS policy that
-- itself calls is_admin().
create function public.is_admin() returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- handle_new_user(): creates the matching profiles row atomically whenever a
-- new auth.users row is inserted (signup). Username defaults to the email
-- local-part when not supplied. Trigger insert failures would abort the
-- whole signup transaction, so a username collision falls back to a
-- short unique-suffixed username rather than failing signup outright —
-- the user can pick their preferred username later from /dashboard/profile.
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
begin
  begin
    insert into public.profiles (id, username, role, theme_preference)
    values (new.id, v_username, 'user', 'dark');
  exception when unique_violation then
    insert into public.profiles (id, username, role, theme_preference)
    values (new.id, v_username || '_' || substr(new.id::text, 1, 8), 'user', 'dark')
    on conflict (id) do nothing;
  end;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
