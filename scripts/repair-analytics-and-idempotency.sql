-- House Dark — repair: apply migrations 0013 and 0014 only.
--
-- Why this exists: pasting the full combined schema into the Supabase
-- SQL editor can truncate. When it does, everything up to the cut
-- commits and the rest silently never runs — which looks like a clean
-- success, because the error you would expect never appears. The
-- symptom on a real project was scripts/verify-remote.sql reporting
-- analytics_events missing while all 19 earlier tables were present.
--
-- Every statement here is safe to run more than once, so it can be run
-- without first working out exactly how far the truncated paste got.
-- It is much smaller than the full schema and unlikely to truncate.
--
-- Source of truth remains supabase/migrations/0013_analytics.sql and
-- 0014_recommendation_idempotency.sql. This file exists only to get an
-- already-part-applied project back in step with them; a project built
-- from scratch should run the migrations in the normal way.
--
-- Afterwards run scripts/verify-remote.sql. All ten rows should PASS.

begin;

-- ---------------------------------------------------------------------
-- 0013 — analytics (brief §15)
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'analytics_event') then
    create type analytics_event as enum (
      'sign_in_completed',
      'opening_viewed',
      'dimming_started',
      'no_trailer_completed',
      'reveal_completed',
      'provider_handoff_selected',
      'saved_for_later',
      'marked_watched',
      'six_words_submitted',
      'recommendation_sent',
      'circle_invitation_accepted',
      'screening_attendance_response'
    );
  end if;
end
$$;

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  event analytics_event not null,
  actor_id uuid not null references profiles (id) on delete cascade,
  opening_number integer,
  detail text check (detail is null or detail in ('invited', 'attending', 'maybe', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_idx
  on analytics_events (created_at desc);
create index if not exists analytics_events_event_created_idx
  on analytics_events (event, created_at desc);

alter table analytics_events enable row level security;

drop policy if exists analytics_events_select_owner on analytics_events;
create policy analytics_events_select_owner on analytics_events
  for select using (is_owner());

create or replace function get_analytics_summary(p_days integer default 30)
returns table (
  event analytics_event,
  occurrences bigint,
  members bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_owner() then
    raise exception 'Not authorised.';
  end if;

  return query
  select
    e.event,
    count(*)::bigint,
    count(distinct e.actor_id)::bigint
  from analytics_events e
  where e.created_at >= now() - make_interval(days => greatest(p_days, 1))
  group by e.event;
end;
$$;

-- ---------------------------------------------------------------------
-- 0014 — retry protection for sealed sends (brief §16 rule 3)
-- ---------------------------------------------------------------------

alter table sealed_recommendations
  add column if not exists idempotency_key uuid;

create unique index if not exists sealed_recommendations_sender_idempotency_unique
  on sealed_recommendations (sender_id, idempotency_key)
  where idempotency_key is not null;

-- Both signatures: the eight-argument original if 0014 never ran, and
-- the nine-argument one if it partly did. A function's return type
-- cannot be changed by CREATE OR REPLACE, so the old one has to go.
drop function if exists create_sealed_recommendation(
  text, integer, integer, uuid[], text, text[], timestamptz, uuid
);
drop function if exists create_sealed_recommendation(
  text, integer, integer, uuid[], text, text[], timestamptz, uuid, uuid
);

create function create_sealed_recommendation(
  p_film_title text,
  p_release_year integer,
  p_runtime_minutes integer,
  p_recipient_ids uuid[],
  p_personal_note text,
  p_cues text[],
  p_scheduled_for timestamptz default null,
  p_circle_id uuid default null,
  p_idempotency_key uuid default null
)
returns table (recommendation_id uuid, created boolean)
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

  if p_idempotency_key is not null then
    select id into v_recommendation_id
    from sealed_recommendations
    where sender_id = v_uid and idempotency_key = p_idempotency_key;

    if v_recommendation_id is not null then
      return query select v_recommendation_id, false;
      return;
    end if;
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

  select id into v_film_id
  from films
  where lower(title) = lower(trim(p_film_title))
    and coalesce(release_year, -1) = coalesce(p_release_year, -1)
  limit 1;

  if v_film_id is null then
    insert into films (title, release_year, runtime_minutes, rights_notes)
    values (trim(p_film_title), p_release_year, p_runtime_minutes, 'Added by a member via a sealed recommendation.')
    returning id into v_film_id;
  end if;

  insert into sealed_recommendations (
    sender_id, secret_film_id, personal_note, runtime_minutes, scheduled_for, idempotency_key
  )
  values (v_uid, v_film_id, p_personal_note, p_runtime_minutes, p_scheduled_for, p_idempotency_key)
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
    select v_screening_id, cm.user_id, case when cm.user_id = v_uid then 'attending' else 'invited' end
    from circle_members cm
    where cm.circle_id = p_circle_id;
  end if;

  return query select v_recommendation_id, true;
end;
$$;

revoke all on function create_sealed_recommendation(
  text, integer, integer, uuid[], text, text[], timestamptz, uuid, uuid
) from public;
grant execute on function create_sealed_recommendation(
  text, integer, integer, uuid[], text, text[], timestamptz, uuid, uuid
) to authenticated;

commit;
