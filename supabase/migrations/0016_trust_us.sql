-- House Dark — 0016_trust_us
--
-- Search is Trust Us (handover 00_BUILD_BRIEF_FINAL.md §4).
--
--   The member does not browse titles. They give House Dark a theme or
--   territory. House Dark gives them one recommendation.
--
-- Two things follow from that, and they shape this schema more than
-- anything else.
--
-- One: there is no catalogue query. Nothing here can return a list of
-- films — get_trust_us_recommendation() returns at most one row, by
-- construction, so a client cannot ask for "the next twenty" and build
-- a browsing surface on top of it.
--
-- Two: the six-word line is editorial, cached and versioned, not
-- generated per request (§4 "Recommendation generation": "Use a
-- deterministic cached House Dark record for each film, not a fresh LLM
-- generation on every request… the same film output is stable across
-- users until a new version is approved").
--
-- Trust Us shows titles on purpose. That is not a spoiler boundary
-- being crossed — a recommendation the member asked for is the one
-- place House Dark names a film up front, and it still refuses to say
-- anything else about it. `films` stays owner-only; these functions are
-- the only way a member reaches a title through this path, and only for
-- records an editor approved.

-- ---------------------------------------------------------------------
-- film_house_records — the House's editorial line on a film.
-- ---------------------------------------------------------------------

create table if not exists film_house_records (
  film_id uuid primary key references films (id) on delete cascade,
  six_words_before text not null,
  territories text[] not null default array[]::text[],
  pace text,
  intensity text,
  -- Null until an editor approves. Nothing unapproved is ever offered.
  editorial_approved_at timestamptz,
  approved_by uuid references profiles (id),
  generated_at timestamptz not null default now(),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- "The six-word line must be exactly six words." Exactly, here —
  -- unlike a member's own reaction, which the handover widened to a
  -- range. This line is written by the House and six is the form.
  constraint film_house_records_six_words check (
    array_length(regexp_split_to_array(btrim(six_words_before), '\s+'), 1) = 6
  ),
  constraint film_house_records_has_territory check (
    array_length(territories, 1) >= 1
  )
);

create index if not exists film_house_records_territories_idx
  on film_house_records using gin (territories);

create trigger film_house_records_set_updated_at
  before update on film_house_records
  for each row execute function set_updated_at();

alter table film_house_records enable row level security;

-- Same posture as `films`: owner-only. Members reach the approved copy
-- through get_trust_us_recommendation(), never through the table.
create policy film_house_records_owner_all on film_house_records
  for all
  using (is_owner())
  with check (is_owner());

-- ---------------------------------------------------------------------
-- trust_us_responses — what the member did with a recommendation.
-- ---------------------------------------------------------------------
--
-- 'seen'    Seen it. Do not offer this film for this territory again.
-- 'trusted' Trust us. Do not offer this film again at all — they are
--           going in blind on it.
--
-- This is not a viewing history and not a feed: nothing reads it except
-- the exclusion in get_trust_us_recommendation() and the member's own
-- row-level policy.

create table if not exists trust_us_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  film_id uuid not null references films (id) on delete cascade,
  territory text not null,
  response text not null check (response in ('seen', 'trusted')),
  created_at timestamptz not null default now()
);

create unique index if not exists trust_us_responses_unique
  on trust_us_responses (user_id, film_id, territory);

alter table trust_us_responses enable row level security;

create policy trust_us_responses_own on trust_us_responses
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- get_trust_us_recommendation — one film. Never a list.
-- ---------------------------------------------------------------------
--
-- Ordering is a hash of the film, the member and the territory. That
-- gives three properties at once: the member's sequence through a
-- territory is stable, so leaving and coming back does not reshuffle;
-- two members asking for the same territory do not get the same film in
-- the same order, so this is not a chart; and "Seen it" advances
-- deterministically rather than rolling dice until something new turns
-- up.

create or replace function get_trust_us_recommendation(p_territory text)
returns table (
  film_id uuid,
  title text,
  release_year integer,
  six_words_before text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  if p_territory is null or btrim(p_territory) = '' then
    raise exception 'Give the House a territory.';
  end if;

  return query
  select f.id, f.title, f.release_year, r.six_words_before
  from film_house_records r
  join films f on f.id = r.film_id
  where r.editorial_approved_at is not null
    and p_territory = any (r.territories)
    and not exists (
      select 1 from trust_us_responses t
      where t.user_id = v_uid
        and t.film_id = r.film_id
        and (t.territory = p_territory or t.response = 'trusted')
    )
  order by md5(r.film_id::text || v_uid::text || p_territory)
  limit 1;
end;
$$;

revoke all on function get_trust_us_recommendation(text) from public;
grant execute on function get_trust_us_recommendation(text) to authenticated;

-- ---------------------------------------------------------------------
-- list_trust_us_territories — the words the member can offer.
-- ---------------------------------------------------------------------
--
-- Only territories that actually have an approved film behind them, so
-- the House never offers a theme it cannot answer.

create or replace function list_trust_us_territories()
returns table (territory text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct unnest(r.territories)
  from film_house_records r
  where r.editorial_approved_at is not null
  order by 1;
$$;

revoke all on function list_trust_us_territories() from public;
grant execute on function list_trust_us_territories() to authenticated;

-- ---------------------------------------------------------------------
-- record_trust_us_response
-- ---------------------------------------------------------------------

create or replace function record_trust_us_response(
  p_film_id uuid,
  p_territory text,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;
  if p_response not in ('seen', 'trusted') then
    raise exception 'Unknown response.';
  end if;

  -- A film the House never offered cannot be responded to. Without
  -- this, the table becomes a place to write arbitrary film ids.
  if not exists (
    select 1 from film_house_records
    where film_id = p_film_id
      and editorial_approved_at is not null
      and p_territory = any (territories)
  ) then
    raise exception 'That is not a recommendation the House made.';
  end if;

  insert into trust_us_responses (user_id, film_id, territory, response)
  values (v_uid, p_film_id, p_territory, p_response)
  on conflict (user_id, film_id, territory)
  do update set response = excluded.response, created_at = now();
end;
$$;

revoke all on function record_trust_us_response(uuid, text, text) from public;
grant execute on function record_trust_us_response(uuid, text, text) to authenticated;
