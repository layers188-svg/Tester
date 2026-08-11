-- House Dark — 0006_circle_helpers
-- profiles RLS (0003) intentionally restricts each member to their own
-- row (brief §11 rule 1), which means an ordinary join can't show a
-- circle-mate's display name. These security-definer functions are the
-- narrow, audited exception: each one checks membership itself, then
-- returns only display_name/avatar_path — never email or any other
-- profile field.

create or replace function get_circle_member_names(p_circle_id uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_path text,
  role circle_role,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_circle_member(p_circle_id) then
    raise exception 'Not a member of this Circle.';
  end if;

  return query
  select p.id, p.display_name, p.avatar_path, cm.role, cm.joined_at
  from circle_members cm
  join profiles p on p.id = cm.user_id
  where cm.circle_id = p_circle_id
  order by cm.joined_at asc;
end;
$$;

revoke all on function get_circle_member_names(uuid) from public;
grant execute on function get_circle_member_names(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- list_my_sealed_recommendations — everything sent to me or by me,
-- safe fields only (never secret_film_id).
-- ---------------------------------------------------------------------

create or replace function list_my_sealed_recommendations()
returns table (
  id uuid,
  sender_id uuid,
  sender_display_name text,
  is_sender boolean,
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

  return query
  select
    sr.id,
    sr.sender_id,
    p.display_name,
    (sr.sender_id = v_uid) as is_sender,
    sr.personal_note,
    sr.runtime_minutes,
    sr.scheduled_for,
    sr.created_at,
    coalesce(
      (select array_agg(c.cue order by c.sort_order) from sealed_recommendation_cues c where c.recommendation_id = sr.id),
      array[]::text[]
    ),
    srr.revealed_at,
    srr.watched_at
  from sealed_recommendations sr
  join profiles p on p.id = sr.sender_id
  left join sealed_recommendation_recipients srr
    on srr.recommendation_id = sr.id and srr.recipient_id = v_uid
  where sr.sender_id = v_uid
     or exists (
       select 1 from sealed_recommendation_recipients r
       where r.recommendation_id = sr.id and r.recipient_id = v_uid
     )
  order by sr.created_at desc;
end;
$$;

revoke all on function list_my_sealed_recommendations() from public;
grant execute on function list_my_sealed_recommendations() to authenticated;
