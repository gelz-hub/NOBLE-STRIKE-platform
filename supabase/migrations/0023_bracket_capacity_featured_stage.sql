-- NOBLE STRIKE — Tournament capacity up to 256 teams + public "Featured
-- Bracket Stage" control. Large tournaments carry hundreds of qualifier
-- matches; the public site should focus spectators on the main event
-- (Top 16 / Top 8 / …) while admin pages keep the full bracket.

-- ---------------------------------------------------------------------------
-- tournaments: which slice of the bracket the PUBLIC site shows.
--   FULL   — show the entire bracket (default, unchanged behaviour)
--   TOP_64 / TOP_32 / TOP_16 / TOP_8 / TOP_4 — show that round onward only
-- ---------------------------------------------------------------------------
alter table public.tournaments
  add column if not exists featured_bracket_stage text not null default 'FULL'
    check (featured_bracket_stage in ('FULL', 'TOP_64', 'TOP_32', 'TOP_16', 'TOP_8', 'TOP_4'));

comment on column public.tournaments.featured_bracket_stage is
  'Public bracket view starts at this stage; admin pages always show the full bracket. FULL = show everything.';

-- ---------------------------------------------------------------------------
-- Bracket queries for large tournaments (up to 256 teams -> ~510 matches for
-- double elimination) always filter by tournament + bracket and read in
-- (bracket_type, round_number, match_number) order. A covering-ish composite
-- index keeps those reads cheap as match volume grows.
-- ---------------------------------------------------------------------------
create index if not exists matches_tournament_bracket_ordering_idx
  on public.matches (tournament_id, bracket_type, round_number, match_number);

