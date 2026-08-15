-- House Dark — six words have to read as language, and the house's own
-- content has to be findable.
--
-- `thisfvjvnncncnc e. c f hd dh` was published on a public surface. It
-- passed every rule there was, because every rule counted words. This
-- suite is the rule that looks at them.
--
-- The important half is not that gibberish is refused -- a constraint of
-- `false` would do that. It is that real responses still go in. A rule
-- that told a member their reaction was not words would be worse than
-- the mash it was written to stop.

\set member_id  '''22222222-2222-4222-8222-222222222222'''
\set opening_id '''aaaaaaa1-0000-4000-8000-00000000f000'''

insert into films (id, title, release_year, runtime_minutes)
values ('aaaaaaa1-0000-4000-8000-00000000f001', 'Language Fixture', 2001, 95);

insert into openings (
  id, opening_number, opens_at, status, runtime_minutes, no_trailer_storage_path
) values (
  :opening_id, 9301, now() - interval '5 days',
  'closed', 95, 'aaaaaaa1-0000-4000-8000-00000000f002.mp4'
);

insert into opening_secrets (opening_id, film_id)
values (:opening_id, 'aaaaaaa1-0000-4000-8000-00000000f001');

-- ---------------------------------------------------------------------
-- The function itself
-- ---------------------------------------------------------------------

do $$
begin
  perform tests.check('SW.1', 'the mash that reached a public page is not language',
    not six_words_reads_as_language('thisfvjvnncncnc e. c f hd dh'));

  perform tests.check('SW.2', 'consonants alone are not language',
    not six_words_reads_as_language('b c d f g h'));

  perform tests.check('SW.3', 'a repeated letter is not language',
    not six_words_reads_as_language('xxxxx yyyyy zzzzz'));

  perform tests.check('SW.4', 'an empty body is not language',
    not six_words_reads_as_language(''));

  -- The other half, and the one worth protecting.
  perform tests.check('SW.5', 'a real reaction is language',
    six_words_reads_as_language('Exhausting, brutal, relentless, magnificent drumming'));

  perform tests.check('SW.6', 'one word is language',
    six_words_reads_as_language('Devastating.'));

  perform tests.check('SW.7', 'a vowelless-looking word is still language',
    six_words_reads_as_language('rhythm'));

  perform tests.check('SW.8', 'punctuation does not make it gibberish',
    six_words_reads_as_language('Not for me.'));
end
$$;

-- ---------------------------------------------------------------------
-- The constraint holds against a direct write
-- ---------------------------------------------------------------------
--
-- Written as the service role on purpose. The form is not the only thing
-- that reaches this table -- the Desk and the seed scripts do too, and
-- whatever wrote the mash was almost certainly one of them.

do $$
declare
  v_blocked boolean := false;
begin
  begin
    insert into six_word_reviews (user_id, opening_id, body, word_count, visibility)
    values ('22222222-2222-4222-8222-222222222222', 'aaaaaaa1-0000-4000-8000-00000000f000', 'thisfvjvnncncnc e. c f hd dh', 6, 'house_approved');
  exception when check_violation then
    v_blocked := true;
  end;
  perform tests.check('SW.9', 'the database refuses a mash even from the service role', v_blocked);
end
$$;

do $$
declare
  v_accepted boolean := false;
begin
  insert into six_word_reviews (user_id, opening_id, body, word_count, visibility)
  values ('22222222-2222-4222-8222-222222222222', 'aaaaaaa1-0000-4000-8000-00000000f000', 'Exhausting, brutal, relentless, magnificent drumming', 5, 'house_approved');
  v_accepted := found;
  perform tests.check('SW.10', 'and accepts a real response', v_accepted);
end
$$;

-- ---------------------------------------------------------------------
-- Provenance
-- ---------------------------------------------------------------------

do $$
declare
  v_blocked boolean := false;
  v_count integer;
begin
  -- The brief's rule: nothing published without a member id or a source.
  -- user_id has been `not null references profiles` since 0001, so the
  -- first half is structural. This proves it rather than assuming it.
  select count(*) into v_count
  from six_word_reviews
  where user_id is null;
  perform tests.check('SW.11', 'no response exists without a member', v_count = 0);

  begin
    insert into six_word_reviews (user_id, opening_id, body, word_count, visibility, source)
    values ('22222222-2222-4222-8222-222222222222', 'aaaaaaa1-0000-4000-8000-00000000f000', 'House written line here', 4, 'house_approved', 'invented');
  exception when check_violation then
    v_blocked := true;
  end;
  perform tests.check('SW.12', 'source only accepts known values', v_blocked);
end
$$;

delete from six_word_reviews where opening_id = :opening_id;
