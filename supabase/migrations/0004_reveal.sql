-- House Dark — 0004_reveal
-- Security definer functions. These are the ONLY path from "sealed" to
-- "revealed" (brief §11 required implementation pattern). Each function
-- verifies the caller, records eligibility, and only then returns
-- secret data — never as a side effect of an ordinary select.

-- ---------------------------------------------------------------------
-- reveal_opening — Journey A step 9 (brief §4).
-- ---------------------------------------------------------------------

create or replace function reveal_opening(p_opening_id uuid)
returns table (title text, release_year integer, providers jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status opening_status;
  v_film_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  select status into v_status from openings where id = p_opening_id;
  if v_status is null then
    raise exception 'Opening not found.';
  end if;
  if v_status not in ('open', 'closed') then
    raise exception 'This opening has not begun.';
  end if;

  select os.film_id into v_film_id
  from opening_secrets os
  where os.opening_id = p_opening_id and os.approved_at is not null;

  if v_film_id is null then
    raise exception 'This opening is not yet approved.';
  end if;

  insert into reveals (user_id, opening_id)
  values (v_uid, p_opening_id)
  on conflict (user_id, opening_id) do nothing;

  return query
  select
    f.title,
    f.release_year,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'provider_name', pd.provider_name,
            'access_type', pd.access_type,
            'deep_link', pd.deep_link,
            'territory', pd.territory
          )
          order by pd.territory, pd.provider_name
        )
        from playback_destinations pd
        where pd.film_id = f.id and pd.is_active
      ),
      '[]'::jsonb
    ) as providers
  from films f
  where f.id = v_film_id;
end;
$$;

revoke all on function reveal_opening(uuid) from public;
grant execute on function reveal_opening(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- reveal_sealed_recommendation — Journey B step 5 (brief §4).
-- ---------------------------------------------------------------------

create or replace function reveal_sealed_recommendation(p_recommendation_id uuid)
returns table (title text, release_year integer, providers jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_film_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  if not exists (
    select 1 from sealed_recommendation_recipients
    where recommendation_id = p_recommendation_id and recipient_id = v_uid
  ) then
    raise exception 'This recommendation was not sent to you.';
  end if;

  select secret_film_id into v_film_id
  from sealed_recommendations
  where id = p_recommendation_id;

  if v_film_id is null then
    raise exception 'Recommendation not found.';
  end if;

  update sealed_recommendation_recipients
  set revealed_at = coalesce(revealed_at, now())
  where recommendation_id = p_recommendation_id and recipient_id = v_uid;

  return query
  select
    f.title,
    f.release_year,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'provider_name', pd.provider_name,
            'access_type', pd.access_type,
            'deep_link', pd.deep_link,
            'territory', pd.territory
          )
          order by pd.territory, pd.provider_name
        )
        from playback_destinations pd
        where pd.film_id = f.id and pd.is_active
      ),
      '[]'::jsonb
    ) as providers
  from films f
  where f.id = v_film_id;
end;
$$;

revoke all on function reveal_sealed_recommendation(uuid) from public;
grant execute on function reveal_sealed_recommendation(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_sealed_recommendation_safe — the sealed card a recipient sees
-- before choosing to reveal. Never includes secret_film_id.
-- ---------------------------------------------------------------------

create or replace function get_sealed_recommendation_safe(p_recommendation_id uuid)
returns table (
  id uuid,
  sender_id uuid,
  sender_display_name text,
  personal_note text,
  runtime_minutes integer,
  scheduled_for timestamptz,
  created_at timestamptz,
  cues text[],
  revealed_at timestamptz,
  watched_at timestamptz
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

  if not is_party_to_recommendation(p_recommendation_id) then
    raise exception 'Not found.';
  end if;

  return query
  select
    sr.id,
    sr.sender_id,
    p.display_name,
    sr.personal_note,
    sr.runtime_minutes,
    sr.scheduled_for,
    sr.created_at,
    coalesce(
      (
        select array_agg(src.cue order by src.sort_order)
        from sealed_recommendation_cues src
        where src.recommendation_id = sr.id
      ),
      array[]::text[]
    ),
    srr.revealed_at,
    srr.watched_at
  from sealed_recommendations sr
  join profiles p on p.id = sr.sender_id
  left join sealed_recommendation_recipients srr
    on srr.recommendation_id = sr.id and srr.recipient_id = v_uid
  where sr.id = p_recommendation_id;
end;
$$;

revoke all on function get_sealed_recommendation_safe(uuid) from public;
grant execute on function get_sealed_recommendation_safe(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- join_circle_by_code — self-service Circle join (brief §7 "Circle").
-- ---------------------------------------------------------------------

create or replace function join_circle_by_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_circle_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  select id into v_circle_id from circles where invite_code = p_invite_code;
  if v_circle_id is null then
    raise exception 'Invite code not recognised.';
  end if;

  insert into circle_members (circle_id, user_id, role)
  values (v_circle_id, v_uid, 'member')
  on conflict (circle_id, user_id) do nothing;

  return v_circle_id;
end;
$$;

revoke all on function join_circle_by_code(text) from public;
grant execute on function join_circle_by_code(text) to authenticated;

-- ---------------------------------------------------------------------
-- get_circle_activity — safe activity feed. Never returns a title
-- (brief §7 "Circle" rule 6).
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
  select 'watched'::text, w.user_id, p.display_name, w.watched_at
  from watches w
  join profiles p on p.id = w.user_id
  join circle_members cm on cm.user_id = w.user_id and cm.circle_id = p_circle_id
  where w.state = 'watched' and w.watched_at is not null

  union all

  select 'sent'::text, sr.sender_id, p.display_name, sr.created_at
  from sealed_recommendations sr
  join profiles p on p.id = sr.sender_id
  join circle_members cm on cm.user_id = sr.sender_id and cm.circle_id = p_circle_id
  where exists (
    select 1
    from sealed_recommendation_recipients srr
    join circle_members cmr on cmr.user_id = srr.recipient_id and cmr.circle_id = p_circle_id
    where srr.recommendation_id = sr.id
  )

  order by happened_at desc nulls last
  limit 100;
end;
$$;

revoke all on function get_circle_activity(uuid) from public;
grant execute on function get_circle_activity(uuid) to authenticated;
