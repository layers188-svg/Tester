-- House Dark — 0019_territories_and_replay
--
-- Two changes the House Dark 500 makes possible.
--
-- 1. Territories become the menu the member actually reads.
--
--    list_trust_us_territories() returned bare strings collected from
--    film_house_records, which is all there was when an owner typed
--    them in one at a time. The catalogue gives each territory a
--    prompt written in the member's voice — "I want to feel tense" —
--    plus an example and a description, and Trust Us should be asking
--    with those words rather than with a one-word tag.
--
-- 2. A No Trailer can be watched again from the Library.
--
--    The picture speaks first and then it is gone; the No Trailer is
--    the only part of an evening the member can return to. Nothing in
--    the Library carried a playable path, so this returns one — under
--    exactly the same condition as the title. An opening the member
--    never revealed gives up neither.

-- ---------------------------------------------------------------------
-- list_trust_us_territories — now the real thing
-- ---------------------------------------------------------------------
--
-- Only territories with an approved film behind them, so the House
-- never offers a mood it cannot answer.

drop function if exists list_trust_us_territories();

create or replace function list_trust_us_territories()
returns table (
  slug text,
  label text,
  prompt text,
  description text
)
language sql
stable
security definer
set search_path = public
as $$
  select t.slug, t.label, t.prompt, t.description
  from trust_us_territories t
  where exists (
    select 1 from film_house_records r
    where r.editorial_approved_at is not null
      and t.slug = any (r.territories)
  )
  order by t.sort_order, t.label;
$$;

revoke all on function list_trust_us_territories() from public;
grant execute on function list_trust_us_territories() to authenticated;

-- ---------------------------------------------------------------------
-- A film can carry a No Trailer of its own
-- ---------------------------------------------------------------------
--
-- Openings already have one. This is for everything else — a film in
-- the catalogue, or one a member added — so that a Library record has
-- something to play.
--
-- Same rule as every other storage path in the product: an opaque
-- object name, never a descriptive filename (brief §12).

alter table films
  add column if not exists no_trailer_storage_path text;

comment on column films.no_trailer_storage_path is
  'Opaque object name in the public no-trailer bucket. Never a descriptive filename.';

-- ---------------------------------------------------------------------
-- get_my_library — carries the No Trailer for rows the member revealed
-- ---------------------------------------------------------------------
--
-- Dropped first: `create or replace` cannot widen a function's return
-- table, and this adds a column to it.
--
-- The added column follows the title exactly. For an opening it is the
-- opening's own No Trailer and appears only alongside a reveal; for a
-- sealed recommendation, only once opened; for a film the member added
-- themselves, always, because they put it there.

drop function if exists get_my_library();

create or replace function get_my_library()
returns table (
  kind text,
  target_id uuid,
  opening_number integer,
  watch_state watch_state,
  watched_at timestamptz,
  revealed boolean,
  title text,
  release_year integer,
  six_words text,
  no_trailer_path text
)
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

  return query
  select
    'opening'::text,
    w.opening_id,
    o.opening_number,
    w.state,
    w.watched_at,
    (r.user_id is not null),
    case when r.user_id is not null then f.title else null end,
    case when r.user_id is not null then f.release_year else null end,
    sw.body,
    case when r.user_id is not null then o.no_trailer_storage_path else null end
  from watches w
  join openings o on o.id = w.opening_id
  left join reveals r on r.opening_id = w.opening_id and r.user_id = v_uid
  left join opening_secrets os on os.opening_id = w.opening_id
  left join films f on f.id = os.film_id
  left join six_word_reviews sw on sw.opening_id = w.opening_id and sw.user_id = v_uid
  where w.user_id = v_uid and w.opening_id is not null

  union all

  select
    'recommendation'::text,
    w.sealed_recommendation_id,
    null,
    w.state,
    w.watched_at,
    (srr.revealed_at is not null),
    case when srr.revealed_at is not null then f.title else null end,
    case when srr.revealed_at is not null then f.release_year else null end,
    sw.body,
    case when srr.revealed_at is not null then f.no_trailer_storage_path else null end
  from watches w
  join sealed_recommendations sr on sr.id = w.sealed_recommendation_id
  left join sealed_recommendation_recipients srr
    on srr.recommendation_id = w.sealed_recommendation_id and srr.recipient_id = v_uid
  left join films f on f.id = sr.secret_film_id
  left join six_word_reviews sw on sw.sealed_recommendation_id = w.sealed_recommendation_id and sw.user_id = v_uid
  where w.user_id = v_uid and w.sealed_recommendation_id is not null

  union all

  select
    'added'::text,
    la.id,
    null,
    'watched'::watch_state,
    la.watched_at,
    true,
    f.title,
    f.release_year,
    null,
    f.no_trailer_storage_path
  from library_additions la
  join films f on f.id = la.film_id
  where la.user_id = v_uid

  order by watched_at desc nulls last;
end;
$$;

revoke all on function get_my_library() from public;
grant execute on function get_my_library() to authenticated;

-- ---------------------------------------------------------------------
-- add_library_film — carries the catalogue's No Trailer across
-- ---------------------------------------------------------------------
--
-- Unchanged except that a member adding a film the House already knows
-- lands on the same row, and therefore inherits whatever No Trailer
-- that film has.

create or replace function add_library_film(
  p_title text,
  p_release_year integer,
  p_runtime_minutes integer,
  p_watched_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_title text := btrim(p_title);
  v_film_id uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;
  if v_title is null or v_title = '' then
    raise exception 'A film needs a title.';
  end if;

  select f.id into v_film_id
  from films f
  where lower(f.title) = lower(v_title)
    and f.release_year is not distinct from p_release_year
  limit 1;

  if v_film_id is null then
    insert into films (title, release_year, runtime_minutes)
    values (v_title, p_release_year, coalesce(p_runtime_minutes, 0))
    returning id into v_film_id;
  end if;

  insert into library_additions (user_id, film_id, watched_at)
  values (v_uid, v_film_id, coalesce(p_watched_at, now()))
  on conflict (user_id, film_id)
    do update set watched_at = coalesce(excluded.watched_at, library_additions.watched_at)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function add_library_film(text, integer, integer, timestamptz) from public;
grant execute on function add_library_film(text, integer, integer, timestamptz) to authenticated;
