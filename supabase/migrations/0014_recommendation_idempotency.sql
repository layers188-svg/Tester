-- House Dark — 0014_recommendation_idempotency
--
-- Brief §16 resilience rule 3: "Prevent duplicate recommendations and
-- reviews on retry."
--
-- The reviews half has always held — six_word_reviews carries unique
-- indexes on (user, opening) and (user, recommendation), as do watches.
-- The recommendations half did not. Nothing in the database stopped
-- create_sealed_recommendation() running twice, and the only guard was
-- a disabled button in SendForm. A disabled button does not survive the
-- case the rule is actually about: the request succeeded, the response
-- was lost, and the member pressed send again. The recipient then gets
-- two sealed cards and two emails for one film.
--
-- Fix: the client mints a key per compose and sends it with the
-- request. A repeat of the same key returns the recommendation that
-- already exists instead of creating another.

alter table sealed_recommendations
  add column idempotency_key uuid;

-- Partial, so the many existing rows with no key do not collide.
create unique index sealed_recommendations_sender_idempotency_unique
  on sealed_recommendations (sender_id, idempotency_key)
  where idempotency_key is not null;

-- The signature gains a parameter, so the old one has to go rather than
-- be overloaded: with defaults on both, a call omitting the new
-- argument would be ambiguous.
drop function if exists create_sealed_recommendation(
  text, integer, integer, uuid[], text, text[], timestamptz, uuid
);

create or replace function create_sealed_recommendation(
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
-- Returns whether this call actually created the recommendation. The
-- caller needs that: src/app/api/recommendations/route.ts queues the
-- recipients' email after this returns, and a replay that silently
-- reported success would send the second email this migration exists to
-- prevent.
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

  -- The retry check, before any work: if this member has already sent
  -- under this key, hand back the same recommendation. No second film
  -- row, no second set of recipients, no second email.
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

  -- Resolve or create the film. Never returned to the caller.
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
