-- NOBLE STRIKE — bilingual (English/Khmer) CMS content + per-user locale
-- preference. Renames existing single-locale text columns to an `_en`
-- suffix (no data loss — existing content becomes the English value) and
-- adds nullable `_km` counterparts. Khmer stays optional everywhere: the
-- app falls back to `_en` whenever `_km` is blank (see
-- src/lib/i18n/content.ts's pickLocalized()).

-- ---------------------------------------------------------------------------
-- news
-- ---------------------------------------------------------------------------
alter table public.news rename column title to title_en;
alter table public.news rename column excerpt to excerpt_en;
alter table public.news rename column content to content_en;
alter table public.news
  add column if not exists title_km text,
  add column if not exists excerpt_km text,
  add column if not exists content_km text;

-- ---------------------------------------------------------------------------
-- tournaments (title -> name_en/name_km per the bilingual content spec)
-- ---------------------------------------------------------------------------
alter table public.tournaments rename column title to name_en;
alter table public.tournaments rename column description to description_en;
alter table public.tournaments
  add column if not exists name_km text,
  add column if not exists description_km text;

-- ---------------------------------------------------------------------------
-- legacy_events (title -> title_en/title_km; notes -> description_en/km)
-- ---------------------------------------------------------------------------
alter table public.legacy_events rename column title to title_en;
alter table public.legacy_events rename column notes to description_en;
alter table public.legacy_events
  add column if not exists title_km text,
  add column if not exists description_km text;

-- ---------------------------------------------------------------------------
-- per-user locale preference (dashboard + Telegram bot)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists locale text not null default 'en' check (locale in ('en', 'km'));
