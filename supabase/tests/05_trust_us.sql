-- House Dark — Trust Us.
--
-- Handover 00_BUILD_BRIEF_FINAL.md §4 and acceptance test D. The
-- properties worth proving in SQL are the ones a client cannot be
-- trusted with:
--
--   * one film, never a list
--   * only editor-approved records
--   * "Seen it" advances rather than reshuffling
--   * a member cannot write a response for a film the House never
--     offered them
--
-- Continues the sequence in 01-04 and appends to tests.results.

\set ON_ERROR_STOP on

\set owner_id       '''11111111-1111-4111-8111-111111111111'''
\set member_id      '''22222222-2222-4222-8222-222222222222'''
\set other_id       '''33333333-3333-4333-8333-333333333333'''
\set film_id        '''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'''

-- ---------------------------------------------------------------------
-- Fixtures: four films in one territory, one of them unapproved.
-- ---------------------------------------------------------------------

select tests.act_as_service();

insert into films (id, title, release_year, runtime_minutes) values
  ('cccc0001-0000-4000-8000-000000000001', 'Territory Film One',   2001, 100),
  ('cccc0002-0000-4000-8000-000000000002', 'Territory Film Two',   2002, 101),
  ('cccc0003-0000-4000-8000-000000000003', 'Territory Film Three', 2003, 102),
  ('cccc0004-0000-4000-8000-000000000004', 'Unapproved Film',      2004, 103)
on conflict (id) do nothing;

insert into film_house_records
  (film_id, six_words_before, territories, editorial_approved_at) values
  ('cccc0001-0000-4000-8000-000000000001', 'One two three four five six', array['Ambition'], now()),
  ('cccc0002-0000-4000-8000-000000000002', 'Two three four five six seven', array['Ambition'], now()),
  ('cccc0003-0000-4000-8000-000000000003', 'Three four five six seven eight', array['Ambition', 'Memory'], now()),
  ('cccc0004-0000-4000-8000-000000000004', 'Four five six seven eight nine', array['Ambition'], null)
on conflict (film_id) do nothing;

-- =====================================================================
-- The line is exactly six words.
-- =====================================================================

select tests.check('D.0', 'a five word line is refused by the database',
  tests.raises($$insert into film_house_records (film_id, six_words_before, territories)
    values ('cccc0001-0000-4000-8000-000000000001', 'Only five words here now', array['Ambition'])$$));

select tests.check('D.0', 'a record with no territory is refused',
  tests.raises($$insert into film_house_records (film_id, six_words_before, territories)
    values ('cccc0004-0000-4000-8000-000000000004', 'One two three four five six', array[]::text[])$$));

-- =====================================================================
-- Members still cannot read the tables behind it.
-- =====================================================================

select tests.act_as(:member_id);

select tests.check('D.1', 'member cannot read film_house_records directly',
  (select count(*) from film_house_records) = 0);

select tests.check('D.1', 'member still cannot read films directly',
  (select count(*) from films) = 0);

-- =====================================================================
-- One film. Never a list.
-- =====================================================================

select tests.check('D.2', 'a territory returns exactly one recommendation',
  (select count(*) from get_trust_us_recommendation('Ambition')) = 1,
  'rows: ' || (select count(*) from get_trust_us_recommendation('Ambition')));

select tests.check('D.2', 'the recommendation carries a title and a six word line',
  (select title is not null and six_words_before is not null
   from get_trust_us_recommendation('Ambition')));

select tests.check('D.2', 'the recommendation carries nothing else to browse with',
  (select array_agg(k order by k)
   from get_trust_us_recommendation('Ambition') v,
        lateral jsonb_object_keys(to_jsonb(v)) as k)
   = array['film_id', 'release_year', 'six_words_before', 'title']);

select tests.check('D.2', 'an unknown territory returns nothing rather than everything',
  (select count(*) from get_trust_us_recommendation('Not A Territory')) = 0);

select tests.check('D.2', 'an empty territory is refused rather than treated as "all"',
  tests.raises($$select * from get_trust_us_recommendation('')$$));

select tests.check('D.3', 'an unapproved record is never offered',
  not exists (
    select 1 from get_trust_us_recommendation('Ambition')
    where title = 'Unapproved Film'
  ));

select tests.check('D.3', 'territories only list themes the House can answer',
  exists (select 1 from list_trust_us_territories() where territory = 'Ambition'));

-- =====================================================================
-- The same member gets the same film until they respond.
-- =====================================================================

select tests.check('D.4', 'asking twice does not reshuffle',
  (select film_id from get_trust_us_recommendation('Ambition'))
  = (select film_id from get_trust_us_recommendation('Ambition')));

-- =====================================================================
-- Seen it advances.
-- =====================================================================

do $$
declare
  v_first uuid;
  v_second uuid;
  v_third uuid;
begin
  select film_id into v_first from get_trust_us_recommendation('Ambition');
  perform record_trust_us_response(v_first, 'Ambition', 'seen');

  select film_id into v_second from get_trust_us_recommendation('Ambition');
  perform tests.check('D.5', 'Seen it moves to a different film',
    v_second is not null and v_second <> v_first);

  perform record_trust_us_response(v_second, 'Ambition', 'seen');
  select film_id into v_third from get_trust_us_recommendation('Ambition');
  perform tests.check('D.5', 'Seen it keeps advancing through the territory',
    v_third is not null and v_third not in (v_first, v_second));

  -- Trust us: going in blind on it retires the film everywhere, not
  -- just in this territory.
  perform record_trust_us_response(v_third, 'Ambition', 'trusted');
  perform tests.check('D.6', 'a trusted film is not offered again in another territory',
    not exists (
      select 1 from get_trust_us_recommendation('Memory') where film_id = v_third
    ));

  perform tests.check('D.5', 'a spent territory runs out rather than repeating',
    (select count(*) from get_trust_us_recommendation('Ambition')) = 0);
end
$$;

-- =====================================================================
-- A response is only possible for a film the House actually offered.
-- =====================================================================

select tests.check('D.7', 'cannot respond to a film the House never offered',
  tests.raises($$select record_trust_us_response(
    'cccc0004-0000-4000-8000-000000000004'::uuid, 'Ambition', 'seen')$$));

select tests.check('D.7', 'cannot respond with an invented response',
  tests.raises($$select record_trust_us_response(
    'cccc0001-0000-4000-8000-000000000001'::uuid, 'Ambition', 'loved')$$));

-- =====================================================================
-- One member's responses do not touch another's.
-- =====================================================================

select tests.act_as(:other_id);

select tests.check('D.8', 'another member still has the whole territory',
  (select count(*) from get_trust_us_recommendation('Ambition')) = 1);

select tests.check('D.8', 'a member cannot read another member''s responses',
  (select count(*) from trust_us_responses) = 0);
