-- House Dark — 0012_prevent_duplicate_cues_and_providers
--
-- opening_cues and playback_destinations both key on a generated uuid,
-- so `insert ... on conflict do nothing` never actually matched
-- anything: the primary key is fresh every time. Re-running
-- supabase/seed.sql duplicated all three cues, and nothing stopped a
-- second identical provider row either. A member would have seen
-- "Drummer Drummer School School Ambition Ambition" on the sealed card
-- and a doubled provider list after reveal.
--
-- Give both tables the natural key they always needed. This also makes
-- the Programming Desk safe against a double-submit, not just the seed
-- (brief §16 rule 3: duplicates must not survive a retry).

-- Collapse any duplicates that already exist before the index goes on.
delete from opening_cues a
using opening_cues b
where a.ctid > b.ctid
  and a.opening_id = b.opening_id
  and a.cue = b.cue;

create unique index opening_cues_opening_cue_unique
  on opening_cues (opening_id, cue);

delete from playback_destinations a
using playback_destinations b
where a.ctid > b.ctid
  and a.film_id = b.film_id
  and a.territory = b.territory
  and a.provider_name = b.provider_name
  and a.access_type = b.access_type;

-- A provider can legitimately appear twice for one film in one
-- territory when the access type differs (rent and subscribe), so the
-- access type is part of the key.
create unique index playback_destinations_natural_unique
  on playback_destinations (film_id, territory, provider_name, access_type);

-- Sealed recommendation cues have the same shape and the same risk.
delete from sealed_recommendation_cues a
using sealed_recommendation_cues b
where a.ctid > b.ctid
  and a.recommendation_id = b.recommendation_id
  and a.cue = b.cue;

create unique index sealed_recommendation_cues_unique
  on sealed_recommendation_cues (recommendation_id, cue);

-- create_sealed_recommendation() inserts cues one at a time, so a
-- member who typed the same cue twice would now hit the new index and
-- lose the whole send. Skip the repeat instead of failing the send;
-- the only change from 0005 is the `on conflict do nothing`.
create or replace function create_sealed_recommendation(
  p_film_title text,
  p_release_year integer,
  p_runtime_minutes integer,
  p_recipient_ids uuid[],
  p_personal_note text,
  p_cues text[],
  p_scheduled_for timestamptz default null,
  p_circle_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_film_id uuid;
  v_recommendation_id uuid;
  v_recipient_id uuid;
  v_cue text;
  v_sort integer := 0;
  v_screening_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  if p_film_title is null or length(trim(p_film_title)) = 0 then
    raise exception 'A film title is required.';
  end if;

  if array_length(p_recipient_ids, 1) is null or array_length(p_recipient_ids, 1) = 0 then
    raise exception 'Choose at least one recipient.';
  end if;

  if p_cues is not null and array_length(p_cues, 1) > 3 then
    raise exception 'Use at most three cues.';
  end if;

  if p_circle_id is not null and not is_circle_member(p_circle_id) then
    raise exception 'Not a member of that Circle.';
  end if;

  -- Resolve or create the film. Never returned to the caller.
  select id into v_film_id
  from films
  where lower(title) = lower(trim(p_film_title))
    and coalesce(release_year, -1) = coalesce(p_release_year, -1)
  limit 1;

  if v_film_id is null then
    insert into films (title, release_year, runtime_minutes, rights_notes)
    values (trim(p_film_title), p_release_year, p_runtime_minutes,
            'Added by a member via a sealed recommendation.')
    returning id into v_film_id;
  end if;

  insert into sealed_recommendations (sender_id, secret_film_id, personal_note, runtime_minutes, scheduled_for)
  values (v_uid, v_film_id, p_personal_note, p_runtime_minutes, p_scheduled_for)
  returning id into v_recommendation_id;

  foreach v_recipient_id in array p_recipient_ids loop
    if v_recipient_id <> v_uid then
      insert into sealed_recommendation_recipients (recommendation_id, recipient_id)
      values (v_recommendation_id, v_recipient_id)
      on conflict do nothing;
    end if;
  end loop;

  if p_cues is not null then
    foreach v_cue in array p_cues loop
      if length(trim(v_cue)) > 0 then
        insert into sealed_recommendation_cues (recommendation_id, cue, sort_order)
        values (v_recommendation_id, trim(v_cue), v_sort)
        on conflict do nothing;
        v_sort := v_sort + 1;
      end if;
    end loop;
  end if;

  if p_circle_id is not null and p_scheduled_for is not null then
    insert into screenings (circle_id, sealed_recommendation_id, scheduled_for, created_by)
    values (p_circle_id, v_recommendation_id, p_scheduled_for, v_uid)
    returning id into v_screening_id;

    insert into screening_attendance (screening_id, user_id, response)
    select v_screening_id, cm.user_id,
           case when cm.user_id = v_uid then 'attending' else 'invited' end
    from circle_members cm
    where cm.circle_id = p_circle_id;
  end if;

  return v_recommendation_id;
end;
$$;

revoke all on function create_sealed_recommendation(
  text, integer, integer, uuid[], text, text[], timestamptz, uuid
) from public;
grant execute on function create_sealed_recommendation(
  text, integer, integer, uuid[], text, text[], timestamptz, uuid
) to authenticated;
