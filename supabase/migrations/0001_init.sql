-- House Dark — 0001_init
-- Extensions, enums, core tables and indexes.
-- See docs/HOUSE_DARK_BUILD_BRIEF.md §10 for the source data model.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------

create type profile_role as enum ('member', 'moderator', 'owner');
create type opening_status as enum ('draft', 'approved', 'scheduled', 'open', 'closed');
create type access_type as enum ('subscription', 'rental', 'free', 'mixed', 'unknown');
create type playback_access_type as enum ('subscription', 'rental', 'purchase', 'free');
create type watch_state as enum ('saved', 'opened_service', 'watched');
create type review_visibility as enum ('private', 'circle', 'house_approved');
create type moderation_state as enum ('visible', 'hidden', 'removed');
create type circle_role as enum ('member', 'organiser');
create type attendance_response as enum ('invited', 'attending', 'maybe', 'declined');
create type notification_status as enum ('pending', 'sending', 'sent', 'failed', 'cancelled');

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'New member',
  avatar_path text,
  city text,
  timezone text not null default 'UTC',
  role profile_role not null default 'member',
  onboarding_complete boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_consent_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- A member may never self-escalate their own role, and may never insert
-- a role other than 'member' for themselves. Only the service role
-- (owner-only server routes) may set moderator/owner.
create or replace function guard_profile_role()
returns trigger
language plpgsql
as $$
declare
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
begin
  if jwt_role = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'member';
  elsif tg_op = 'UPDATE' then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before insert or update on profiles
  for each row execute function guard_profile_role();

-- ---------------------------------------------------------------------
-- films — owner / service role only. Never exposed to members directly.
-- ---------------------------------------------------------------------

create table films (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  release_year integer,
  runtime_minutes integer not null,
  country_code text,
  rights_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger films_set_updated_at
  before update on films
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- openings — safe, client-visible opening information only.
-- ---------------------------------------------------------------------

create table openings (
  id uuid primary key default gen_random_uuid(),
  opening_number integer not null unique,
  opens_at timestamptz not null,
  closes_at timestamptz,
  status opening_status not null default 'draft',
  runtime_minutes integer not null,
  availability_count integer not null default 0,
  minimum_access_type access_type not null default 'unknown',
  no_trailer_storage_path text not null,
  no_trailer_poster_path text,
  content_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger openings_set_updated_at
  before update on openings
  for each row execute function set_updated_at();

create index openings_status_idx on openings (status, opens_at);

-- ---------------------------------------------------------------------
-- opening_secrets — server and owner only.
-- ---------------------------------------------------------------------

create table opening_secrets (
  opening_id uuid primary key references openings (id) on delete cascade,
  film_id uuid not null references films (id),
  approved_at timestamptz,
  approved_by uuid references profiles (id)
);

-- ---------------------------------------------------------------------
-- opening_cues — up to three safe, non-spoiler words per opening.
-- ---------------------------------------------------------------------

create table opening_cues (
  id uuid primary key default gen_random_uuid(),
  opening_id uuid not null references openings (id) on delete cascade,
  cue text not null,
  sort_order integer not null default 0
);

create index opening_cues_opening_idx on opening_cues (opening_id, sort_order);

-- ---------------------------------------------------------------------
-- playback_destinations — server protected until reveal.
-- ---------------------------------------------------------------------

create table playback_destinations (
  id uuid primary key default gen_random_uuid(),
  film_id uuid not null references films (id) on delete cascade,
  territory text not null,
  provider_name text not null,
  access_type playback_access_type not null,
  deep_link text not null,
  verified_at timestamptz,
  is_active boolean not null default true
);

create index playback_destinations_film_idx on playback_destinations (film_id, territory);

-- ---------------------------------------------------------------------
-- reveals
-- ---------------------------------------------------------------------

create table reveals (
  user_id uuid not null references profiles (id) on delete cascade,
  opening_id uuid not null references openings (id) on delete cascade,
  revealed_at timestamptz not null default now(),
  primary key (user_id, opening_id)
);

-- ---------------------------------------------------------------------
-- watches
-- ---------------------------------------------------------------------

create table watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  opening_id uuid references openings (id) on delete cascade,
  sealed_recommendation_id uuid,
  state watch_state not null default 'saved',
  watched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watches_one_target check (
    (opening_id is not null and sealed_recommendation_id is null)
    or (opening_id is null and sealed_recommendation_id is not null)
  )
);

create unique index watches_user_opening_unique
  on watches (user_id, opening_id)
  where opening_id is not null;

create unique index watches_user_recommendation_unique
  on watches (user_id, sealed_recommendation_id)
  where sealed_recommendation_id is not null;

create trigger watches_set_updated_at
  before update on watches
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- six_word_reviews
-- ---------------------------------------------------------------------

create table six_word_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  opening_id uuid references openings (id) on delete cascade,
  sealed_recommendation_id uuid,
  body text not null,
  word_count integer not null,
  visibility review_visibility not null default 'circle',
  moderation_state moderation_state not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint six_word_reviews_word_count check (word_count = 6),
  constraint six_word_reviews_one_target check (
    (opening_id is not null and sealed_recommendation_id is null)
    or (opening_id is null and sealed_recommendation_id is not null)
  )
);

create unique index six_word_reviews_user_opening_unique
  on six_word_reviews (user_id, opening_id)
  where opening_id is not null;

create unique index six_word_reviews_user_recommendation_unique
  on six_word_reviews (user_id, sealed_recommendation_id)
  where sealed_recommendation_id is not null;

create trigger six_word_reviews_set_updated_at
  before update on six_word_reviews
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- circles
-- ---------------------------------------------------------------------

create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles (id),
  invite_code text not null unique default encode(gen_random_bytes(5), 'hex'),
  default_screening_day integer default 4, -- 0=Sunday .. 4=Thursday
  default_screening_time time default '20:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger circles_set_updated_at
  before update on circles
  for each row execute function set_updated_at();

create table circle_members (
  circle_id uuid not null references circles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role circle_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

-- ---------------------------------------------------------------------
-- sealed_recommendations
-- ---------------------------------------------------------------------

create table sealed_recommendations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles (id) on delete cascade,
  secret_film_id uuid not null references films (id),
  personal_note text,
  runtime_minutes integer not null,
  scheduled_for timestamptz,
  created_at timestamptz not null default now()
);

create table sealed_recommendation_recipients (
  recommendation_id uuid not null references sealed_recommendations (id) on delete cascade,
  recipient_id uuid not null references profiles (id) on delete cascade,
  revealed_at timestamptz,
  watched_at timestamptz,
  primary key (recommendation_id, recipient_id)
);

create table sealed_recommendation_cues (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references sealed_recommendations (id) on delete cascade,
  cue text not null,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------
-- screenings
-- ---------------------------------------------------------------------

create table screenings (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references circles (id) on delete cascade,
  sealed_recommendation_id uuid references sealed_recommendations (id) on delete cascade,
  opening_id uuid references openings (id) on delete cascade,
  scheduled_for timestamptz not null,
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);

create table screening_attendance (
  screening_id uuid not null references screenings (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  response attendance_response not null default 'invited',
  updated_at timestamptz not null default now(),
  primary key (screening_id, user_id)
);

create trigger screening_attendance_set_updated_at
  before update on screening_attendance
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- email_preferences
-- ---------------------------------------------------------------------

create table email_preferences (
  user_id uuid primary key references profiles (id) on delete cascade,
  nightly_opening boolean not null default true,
  sealed_recommendations boolean not null default true,
  screening_reminders boolean not null default true,
  after_credits boolean not null default true,
  editorial_edm boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger email_preferences_set_updated_at
  before update on email_preferences
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- notification_queue
-- ---------------------------------------------------------------------

create table notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  send_at timestamptz not null,
  payload jsonb not null default '{}'::jsonb,
  status notification_status not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notification_queue_due_idx on notification_queue (status, send_at);

create trigger notification_queue_set_updated_at
  before update on notification_queue
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- audit_log — never store titles, provider URLs or other secrets here.
-- ---------------------------------------------------------------------

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles (id),
  action text not null,
  target_type text not null,
  target_id uuid,
  safe_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on audit_log (created_at desc);
