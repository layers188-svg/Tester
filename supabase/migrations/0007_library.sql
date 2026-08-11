-- House Dark — 0007_library
-- Library (brief §7 "Library", §11 rule 5: "Opening history must not
-- expose titles the member never revealed"). Every function here
-- enforces that rule in SQL, not just in the client — a title only
-- ever appears in a row the caller has personally revealed.

-- ---------------------------------------------------------------------
-- get_my_library — "Yours": everything the member has saved or watched,
-- across nightly openings and sealed recommendations.
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

  order by watched_at desc nulls last;
end;
$$;

revoke all on function get_my_library() from public;
grant execute on function get_my_library() to authenticated;

-- ---------------------------------------------------------------------
-- get_house_openings — "The House": the programming history. Title only
-- for openings the caller has personally revealed.
-- ---------------------------------------------------------------------

create or replace function get_house_openings()
returns table (
  id uuid,
  opening_number integer,
  opens_at timestamptz,
  status opening_status,
  runtime_minutes integer,
  revealed boolean,
  title text,
  release_year integer
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
    o.id,
    o.opening_number,
    o.opens_at,
    o.status,
    o.runtime_minutes,
    (r.user_id is not null),
    case when r.user_id is not null then f.title else null end,
    case when r.user_id is not null then f.release_year else null end
  from openings o
  left join reveals r on r.opening_id = o.id and r.user_id = v_uid
  left join opening_secrets os on os.opening_id = o.id
  left join films f on f.id = os.film_id
  where o.status in ('open', 'closed')
  order by o.opens_at desc;
end;
$$;

revoke all on function get_house_openings() from public;
grant execute on function get_house_openings() to authenticated;

-- ---------------------------------------------------------------------
-- get_my_circles_activity — safe activity across every Circle the
-- caller belongs to (Library "Circle" tab). Never a title.
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
  select 'watched'::text, w.user_id, p.display_name, c.name, w.watched_at
  from watches w
  join profiles p on p.id = w.user_id
  join circle_members cm on cm.user_id = w.user_id
  join circle_members mine on mine.circle_id = cm.circle_id and mine.user_id = v_uid
  join circles c on c.id = cm.circle_id
  where w.state = 'watched' and w.watched_at is not null

  union all

  select 'sent'::text, sr.sender_id, p.display_name, c.name, sr.created_at
  from sealed_recommendations sr
  join profiles p on p.id = sr.sender_id
  join circle_members cm on cm.user_id = sr.sender_id
  join circle_members mine on mine.circle_id = cm.circle_id and mine.user_id = v_uid
  join circles c on c.id = cm.circle_id
  where exists (
    select 1 from sealed_recommendation_recipients srr
    join circle_members cmr on cmr.user_id = srr.recipient_id and cmr.circle_id = cm.circle_id
    where srr.recommendation_id = sr.id
  )

  order by happened_at desc nulls last
  limit 100;
end;
$$;

revoke all on function get_my_circles_activity() from public;
grant execute on function get_my_circles_activity() to authenticated;
