-- House Dark — 0017_library_additions
--
-- "Add a watched film from a broad metadata catalogue"
-- (handover 00_BUILD_BRIEF_FINAL.md §7 "Library").
--
-- Until now the Library could only contain films the House put there —
-- a nightly opening or a sealed recommendation — because `watches` is
-- keyed to one or the other and nothing else could be recorded. A
-- member's archive of what stayed with them is not limited to what
-- House Dark happened to programme, so this adds the third kind.
--
-- The catalogue itself is a separate question. A member can add a film
-- by title and year today; wiring a metadata provider behind
-- add_library_film() is a drop-in change to that function and needs an
-- account and an API key, which is an external action (see
-- LAUNCH_CHECKLIST.md). Nothing in the schema assumes the manual path.
--
-- Titles here are not protected. The member is telling the House what
-- they watched, so it is their own information coming back to them —
-- the same footing as a title they have already revealed.

create table if not exists library_additions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  film_id uuid not null references films (id) on delete cascade,
  watched_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists library_additions_unique
  on library_additions (user_id, film_id);

alter table library_additions enable row level security;

create policy library_additions_own on library_additions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- add_library_film
-- ---------------------------------------------------------------------
--
-- Security definer because `films` is owner-only: a member may
-- contribute a film without ever holding read or write access to that
-- table, exactly as they already can when sending under seal.

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

  -- Reuse an existing film rather than creating a near-duplicate, so a
  -- member adding a film the House has already programmed lands on the
  -- same row.
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

create or replace function remove_library_film(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from library_additions where id = p_id and user_id = auth.uid();
$$;

revoke all on function remove_library_film(uuid) from public;
grant execute on function remove_library_film(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_my_library — now three kinds.
-- ---------------------------------------------------------------------
--
-- Unchanged for openings and recommendations, including the rule that
-- carries the whole file: a title appears only in a row the caller has
-- personally revealed. Added films are always titled, because the
-- member typed the title themselves.

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
  six_words text
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
    sw.body
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
    sw.body
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
    null
  from library_additions la
  join films f on f.id = la.film_id
  where la.user_id = v_uid

  order by watched_at desc nulls last;
end;
$$;

revoke all on function get_my_library() from public;
grant execute on function get_my_library() to authenticated;
