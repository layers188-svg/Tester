-- House Dark — 0021_film_records
--
-- The House Dark version of a film, for Search.
--
-- Deliberately NOT the `films` table. That one holds what an opening is
-- sealing and is owner/service-role only, because knowing a row in it
-- is knowing tonight's answer. This holds the opposite kind of thing: a
-- film a member typed the name of themselves, described in a way that
-- is safe to read before watching. Same subject, opposite secrecy, so
-- separate tables — merging them would mean one policy trying to serve
-- two contradictory rules.
--
-- Keyed on (provider, external_id) rather than on the title. Titles
-- repeat (there are two films called Whiplash), change between regions,
-- and are a poor primary key for anything. The provider column is there
-- so the catalogue can move off one metadata source without the cached
-- editorial becoming ambiguous.
--
-- One row per film for the whole house: everybody reads the same six
-- words. That is the point of caching it rather than generating per
-- request — a description that varied by member would make the six
-- words a private opinion rather than the house's.

create table film_records (
  id uuid primary key default gen_random_uuid(),

  -- Where the factual metadata came from, and its id there.
  provider text not null,
  external_id text not null,

  -- Facts, from the provider.
  title text not null,
  release_year integer,
  runtime_minutes integer,

  -- The House Dark interpretation. `six_word_plot` is exactly six words;
  -- the constraint below is the last line of defence behind the
  -- application's own validation, because a model cannot be trusted to
  -- count and neither can a future caller.
  six_word_plot text not null,
  territory text[] not null default '{}',
  pace text,
  intensity text,
  content_notes text,

  /*
   * How this description came to exist, so the house can take editorial
   * control later without a schema change:
   *
   *   generated  written by the editorial engine, unreviewed
   *   approved   a person has read it and is happy for it to stand
   *   rejected   held back; the reader is told the house has not
   *              written this one yet rather than shown it
   */
  editorial_state text not null default 'generated',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint film_records_provider_external_unique unique (provider, external_id),

  -- Exactly six whitespace-separated words. Written as "five internal
  -- gaps, no leading or trailing space" because Postgres has no word
  -- count: the regex is the count.
  constraint film_records_six_words check (
    six_word_plot ~ '^\S+( \S+){5}$'
  ),

  constraint film_records_territory_size check (
    array_length(territory, 1) is null or array_length(territory, 1) <= 6
  ),

  constraint film_records_editorial_state check (
    editorial_state in ('generated', 'approved', 'rejected')
  )
);

create index film_records_title_idx on film_records (lower(title));

create trigger film_records_set_updated_at
  before update on film_records
  for each row execute function set_updated_at();

alter table film_records enable row level security;

/*
 * Any signed-in member may read the catalogue.
 *
 * Safe by construction rather than by trust: every column here is
 * either a plain fact about a film the member just typed the name of,
 * or a description written specifically to be read before watching.
 * There is no join from here to `openings` or `opening_secrets`, so a
 * member cannot use Search to work out what is sealed tonight.
 */
create policy film_records_select_authenticated on film_records
  for select using (auth.uid() is not null);

/*
 * No member-facing write policy at all.
 *
 * Generation happens on the server with the service role, which bypasses
 * RLS. That is deliberate: if members could insert here, one member
 * could write the six words the whole house then reads.
 */
create policy film_records_write_owner on film_records
  for all using (is_owner()) with check (is_owner());

comment on table film_records is
  'The House Dark description of a film, for Search. Spoiler-safe by construction and shared by the whole house. Distinct from `films`, which holds what an opening is sealing and is never member-readable.';
