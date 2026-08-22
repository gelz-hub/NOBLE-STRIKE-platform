-- NOBLE STRIKE — replace the profile "Discord Username" field with a
-- Telegram contact handle, and upgrade free-text country fields (profile +
-- recruitment posts) to a code+name pair so country flags can be rendered
-- reliably everywhere player/team info is shown.
--
-- Renames (not drop+add) so existing values aren't lost — a Discord handle
-- isn't a valid Telegram handle, but users can correct it in one visit to
-- Settings rather than losing the field's history entirely. Same reasoning
-- for country: existing free-text values become the *_name column as-is;
-- *_code stays null until the user re-selects from the new picker.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- This is a distinct, manually-entered contact handle for recruitment/
-- tournament contact — separate from telegram_id/telegram_username/
-- telegram_linked_at, which belong to the bot account-linking flow
-- (see 0014_telegram_integration.sql) and must not be touched here.
alter table public.profiles rename column discord_username to telegram_handle;
alter table public.profiles rename column privacy_show_discord to privacy_show_telegram;

alter table public.profiles rename column country to country_name;
alter table public.profiles add column if not exists country_code text;
alter table public.profiles alter column country_code set default 'KH';
alter table public.profiles alter column country_name set default 'Cambodia';

-- ---------------------------------------------------------------------------
-- recruitment_posts (LFT posts show a country; needs the same code+name
-- pair to render a flag, see src/lib/countries.ts)
-- ---------------------------------------------------------------------------
alter table public.recruitment_posts rename column country to country_name;
alter table public.recruitment_posts add column if not exists country_code text;
