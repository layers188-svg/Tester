-- House Dark — 0013_analytics
--
-- Brief §15. Privacy restrained, first party events: no third party
-- analytics provider, no cookie, nothing leaves the database. Only the
-- twelve events §15 names are recordable.
--
-- Spoiler security (brief §11 rule 13, "Analytics events") is enforced
-- by the shape of this table rather than by a runtime check. There is
-- no free text column, no film_id and no opening_id — the only things
-- an event can carry are its own name, the actor, the opaque opening
-- number §15 permits, and a detail drawn from a fixed allowlist. A
-- title has nowhere to go, so it cannot arrive here by accident later.

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

create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  event analytics_event not null,
  -- Deleting a member deletes their events with them: brief §14 gives
  -- the right to erasure, and an orphaned behavioural trail is exactly
  -- what "privacy restrained" rules out.
  actor_id uuid not null references profiles (id) on delete cascade,
  -- The opaque public number (openings.opening_number), never the
  -- opening's uuid and never the film. §15: "Use an opaque opening
  -- number or safe event ID only where necessary."
  opening_number integer,
  -- Closed allowlist. The only event with a meaningful variant today is
  -- the screening attendance response; anything else must extend this
  -- constraint deliberately, in a migration, under review.
  detail text check (detail is null or detail in ('invited', 'attending', 'maybe', 'declined')),
  created_at timestamptz not null default now()
);

create index analytics_events_created_idx on analytics_events (created_at desc);
create index analytics_events_event_created_idx on analytics_events (event, created_at desc);

alter table analytics_events enable row level security;

-- Owner reads; nobody else reads at all, not even their own events —
-- this is house instrumentation, not a member-facing feature. Writes
-- are service-role only (no insert policy exists), so a member cannot
-- forge an event by calling PostgREST directly. Every write goes
-- through src/lib/analytics/record.ts on the server.
create policy analytics_events_select_owner on analytics_events
  for select using (is_owner());

-- ---------------------------------------------------------------------
-- The readout. §15 says track "only what is required to improve the
-- beta", which means the numbers have to be legible somewhere —
-- /desk/analytics. Aggregate only: counts and distinct members per
-- event, never a row-by-row trail of one member's evening.
-- ---------------------------------------------------------------------

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
  -- security definer bypasses RLS, so the owner check is explicit.
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
