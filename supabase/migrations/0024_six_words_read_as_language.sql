-- Six words have to read as language, and seed content has to be
-- findable.
--
-- `thisfvjvnncncnc e. c f hd dh` reached a public surface. Every rule
-- that existed passed it, because every rule counted words and none
-- looked at them. Counting cannot tell a reaction from a keyboard mash.
--
-- The application refuses it now (src/lib/validation/six-words.ts). This
-- migration puts the same test in the database, because the application
-- is not the only thing that writes here: the Desk, the seed scripts and
-- any future import all reach this table directly, and the row that
-- caused this was almost certainly written by one of them rather than
-- through the form.

-- ---------------------------------------------------------------------
-- Does a response read as language?
-- ---------------------------------------------------------------------
--
-- Deliberately not a dictionary. Six words after a film are content
-- words, not function words -- "Exhausting, brutal, relentless,
-- magnificent drumming" holds nothing a small word list would, so a
-- list short enough to ship would reject the best writing in the
-- product.
--
-- Orthography settles it instead: English words carry a vowel and do not
-- run four consonants together. `fvjvnncncnc` fails both; `drumming` and
-- `rhythm` pass (y counts as a vowel, which is why `rhythm` does).
--
-- One recognisable token anywhere in the response is enough. The job is
-- refusing gibberish, not marking English, and the cost of being strict
-- here is telling a member their reaction is not words.
create or replace function six_words_reads_as_language(body text)
returns boolean
language sql
immutable
as $$
  select exists (
    select 1
    from regexp_split_to_table(lower(coalesce(body, '')), '\s+') as raw_token
    cross join lateral (
      select regexp_replace(raw_token, '[^a-z]', '', 'g') as token
    ) as stripped
    where length(stripped.token) between 2 and 15
      and stripped.token ~ '[aeiouy]'          -- carries a vowel
      and stripped.token !~ '[^aeiouy]{4,}'    -- no four-consonant run
      and stripped.token !~ '(.)\1{2,}'        -- not "aaaa"
  );
$$;

comment on function six_words_reads_as_language(text) is
  'True when at least one token in a six-word response reads as a word. Mirrors looksLikeWord() in src/lib/validation/six-words.ts.';

-- ---------------------------------------------------------------------
-- Where a response came from
-- ---------------------------------------------------------------------
--
-- `user_id` is already `not null references profiles`, so there is no
-- such thing as an entry without a member. What there was no way to ask
-- was whether a member wrote it or a script did.
--
-- null means a person wrote it through the product. Anything else is the
-- house's own content, and can be filtered out of a member-facing
-- surface or deleted wholesale without touching a single real response.
alter table six_word_reviews
  add column if not exists source text;

alter table six_word_reviews
  drop constraint if exists six_word_reviews_source_known;

alter table six_word_reviews
  add constraint six_word_reviews_source_known
  check (source is null or source in ('house', 'seed', 'preview'));

create index if not exists six_word_reviews_source_idx
  on six_word_reviews (source)
  where source is not null;

comment on column six_word_reviews.source is
  'null = written by a member through the product. house/seed/preview = the house''s own content, filterable and removable.';

-- ---------------------------------------------------------------------
-- Purge what is already there
-- ---------------------------------------------------------------------
--
-- Runs before the constraint, or the constraint cannot be added. Only
-- touches rows that fail the language test -- a real response is never
-- caught by this, which is the point of the test being generous.
delete from six_word_reviews
where not six_words_reads_as_language(body);

-- ---------------------------------------------------------------------
-- And keep it out
-- ---------------------------------------------------------------------
alter table six_word_reviews
  drop constraint if exists six_word_reviews_reads_as_language;

alter table six_word_reviews
  add constraint six_word_reviews_reads_as_language
  check (six_words_reads_as_language(body));
