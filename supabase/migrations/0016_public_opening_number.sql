-- House Dark — 0016_public_opening_number
--
-- The public home page shows tonight's opening *number* on the sealed
-- demonstration card, so the card reads as the real programme rather
-- than a mock-up.
--
-- The number is safe to publish and nothing else here is. It is an
-- ordinal — "Opening 7" — carrying no information about which film is
-- running: no title, no year, no runtime, no cue, no storage path, no
-- provider. `openings` itself stays unreadable to `anon`; this function
-- is security definer precisely so that the one safe scalar can be
-- exposed without opening the row.
--
-- If nothing is currently open it returns null, and the card falls back
-- to "Tonight". A null must never be filled in with the most recent
-- closed opening: a visitor could then infer the house is dark tonight,
-- which is programming information the house has not chosen to publish.

create or replace function get_public_opening_number()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select opening_number
  from openings
  where status = 'open'
  order by opens_at desc
  limit 1;
$$;

comment on function get_public_opening_number() is
  'Tonight''s opening ordinal for the public home page. Deliberately returns no other column: everything else on openings is either protected or narrows down the film.';

revoke all on function get_public_opening_number() from public;
grant execute on function get_public_opening_number() to anon, authenticated;
