-- House Dark — 0018_library_entries
--
-- Films a member adds themselves: things they watched that the house
-- never programmed. The Library stops being a record of House Dark and
-- becomes their film collection, which is what it was always described
-- as.
--
-- Why a new table rather than letting members write to `films`.
-- `films` is owner/service-role only, and that is the whole spoiler
-- boundary: it holds the titles behind sealed openings. Opening it for
-- writes would put a member-controlled row in the same table the
-- reveal path reads from, and any mistake there is a title leak. These
-- entries are a member's own record, they never join to `openings`,
-- and nothing in the reveal path reads them.
--
-- Private by default and in fact: the policies below are owner-only in
-- every direction. A member's personal viewing is not Circle activity
-- and does not appear in anyone else's Library. If that changes later
-- it should be a deliberate migration, not a policy that was loose
-- from the start.

create table library_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  release_year integer,
  runtime_minutes integer,
  state watch_state not null default 'watched',
  watched_at timestamptz,
  -- The member's own six words on it, optional. Same rule as a review:
  -- the constraint keeps a long paragraph out even if a caller forgets.
  six_words text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint library_entries_title_length check (char_length(title) between 1 and 200),
  constraint library_entries_year_sane check (
    release_year is null or release_year between 1888 and 2100
  ),
  constraint library_entries_runtime_sane check (
    runtime_minutes is null or runtime_minutes between 1 and 1000
  ),
  constraint library_entries_six_words_length check (
    six_words is null or char_length(six_words) <= 140
  )
);

create index library_entries_user_idx on library_entries (user_id, created_at desc);

-- One row per member per title/year, so adding the same film twice is a
-- correction rather than a duplicate. Case-insensitive: "Heat" and
-- "heat" are the same film to a person.
create unique index library_entries_user_title_unique
  on library_entries (user_id, lower(title), coalesce(release_year, -1));

create trigger library_entries_set_updated_at
  before update on library_entries
  for each row execute function set_updated_at();

alter table library_entries enable row level security;

create policy library_entries_select_own on library_entries
  for select using (user_id = auth.uid());

create policy library_entries_insert_own on library_entries
  for insert with check (user_id = auth.uid());

create policy library_entries_update_own on library_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy library_entries_delete_own on library_entries
  for delete using (user_id = auth.uid());

comment on table library_entries is
  'Films a member added to their own Library, outside House Dark programming. Owner-only in every direction. Deliberately separate from `films`, which is the protected table behind sealed openings.';
