-- House Dark — 0010_fix_union_ordering
--
-- Three set-returning functions ordered a UNION ALL by a column named
-- after one of their own OUT parameters (`happened_at`, `watched_at`).
-- Postgres resolves ORDER BY on a set operation against the result
-- column names of the branches, not the function signature, and the
-- branches select bare expressions with no aliases — so every one of
-- these raised at runtime:
--
--   ERROR: invalid UNION/INTERSECT/EXCEPT ORDER BY clause
--   DETAIL: Only result column names can be used, not expressions or functions.
--
-- The fix is to alias the first branch and sort the union from an outer
-- query, which is also what makes the intent readable. Behaviour is
-- otherwise unchanged; see supabase/tests/01_rls.sql, which now calls
-- all three.

-- ---------------------------------------------------------------------
-- get_circle_activity — safe per-circle feed, never a title.
-- ---------------------------------------------------------------------

create or replace function get_circle_activity(p_circle_id uuid)
returns table (
  kind text,
  actor_id uuid,
  actor_display_name text,
  happened_at timestamptz
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
  if not is_circle_member(p_circle_id) then
    raise exception 'Not a member of this Circle.';
  end if;

  return query
  select *
  from (
    select
      'watched'::text as kind,
      w.user_id as actor_id,
      p.display_name as actor_display_name,
      w.watched_at as happened_at
    from watches w
    join profiles p on p.id = w.user_id
    join circle_members cm on cm.user_id = w.user_id and cm.circle_id = p_circle_id
    where w.state = 'watched' and w.watched_at is not null

    union all

    select
      'sent'::text,
      sr.sender_id,
      p.display_name,
      sr.created_at
    from sealed_recommendations sr
    join profiles p on p.id = sr.sender_id
    join circle_members cm on cm.user_id = sr.sender_id and cm.circle_id = p_circle_id
    where exists (
      select 1
      from sealed_recommendation_recipients srr
      join circle_members cmr on cmr.user_id = srr.recipient_id and cmr.circle_id = p_circle_id
      where srr.recommendation_id = sr.id
    )
  ) activity
  order by activity.happened_at desc nulls last
  limit 100;
end;
$$;

revoke all on function get_circle_activity(uuid) from public;
grant execute on function get_circle_activity(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_my_library — "Yours". A title appears only on a row the caller
-- has personally revealed.
-- ---------------------------------------------------------------------

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
  select *
  from (
    select
      'opening'::text as kind,
      w.opening_id as target_id,
      o.opening_number as opening_number,
      w.state as watch_state,
      w.watched_at as watched_at,
      (r.user_id is not null) as revealed,
      case when r.user_id is not null then f.title else null end as title,
      case when r.user_id is not null then f.release_year else null end as release_year,
      sw.body as six_words
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
      null::integer,
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
    left join six_word_reviews sw
      on sw.sealed_recommendation_id = w.sealed_recommendation_id and sw.user_id = v_uid
    where w.user_id = v_uid and w.sealed_recommendation_id is not null
  ) library
  order by library.watched_at desc nulls last;
end;
$$;

revoke all on function get_my_library() from public;
grant execute on function get_my_library() to authenticated;

-- ---------------------------------------------------------------------
-- get_my_circles_activity — safe activity across every Circle the
-- caller belongs to. Never a title.
-- ---------------------------------------------------------------------

create or replace function get_my_circles_activity()
returns table (
  kind text,
  actor_id uuid,
  actor_display_name text,
  circle_name text,
  happened_at timestamptz
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
  select *
  from (
    select
      'watched'::text as kind,
      w.user_id as actor_id,
      p.display_name as actor_display_name,
      c.name as circle_name,
      w.watched_at as happened_at
    from watches w
    join profiles p on p.id = w.user_id
    join circle_members cm on cm.user_id = w.user_id
    join circle_members mine on mine.circle_id = cm.circle_id and mine.user_id = v_uid
    join circles c on c.id = cm.circle_id
    where w.state = 'watched' and w.watched_at is not null

    union all

    select
      'sent'::text,
      sr.sender_id,
      p.display_name,
      c.name,
      sr.created_at
    from sealed_recommendations sr
    join profiles p on p.id = sr.sender_id
    join circle_members cm on cm.user_id = sr.sender_id
    join circle_members mine on mine.circle_id = cm.circle_id and mine.user_id = v_uid
    join circles c on c.id = cm.circle_id
    where exists (
      select 1
      from sealed_recommendation_recipients srr
      join circle_members cmr on cmr.user_id = srr.recipient_id and cmr.circle_id = cm.circle_id
      where srr.recommendation_id = sr.id
    )
  ) activity
  order by activity.happened_at desc nulls last
  limit 100;
end;
$$;

revoke all on function get_my_circles_activity() from public;
grant execute on function get_my_circles_activity() to authenticated;
