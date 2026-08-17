-- House Dark — the finite Trust Us corpus (0018).
--
-- 0016 built the Trust Us machinery; the corpus behind it was two
-- seeded rows until 0018. These assertions are about the shape of the
-- recommendation universe, which is a product guarantee: a member who
-- asks the House for something tense must get a film, and the House
-- must never be able to answer from outside the curated set.

select tests.act_as_service();

select tests.check('18.1', 'the 500-film corpus is present',
  (select count(*) from film_house_records) >= 500,
  'records: ' || (select count(*) from film_house_records));

select tests.check('18.2', 'every corpus line is exactly six words',
  (select count(*) from film_house_records
     where array_length(regexp_split_to_array(btrim(six_words_before), '\s+'), 1) <> 6) = 0,
  'offenders: ' || (select count(*) from film_house_records
     where array_length(regexp_split_to_array(btrim(six_words_before), '\s+'), 1) <> 6));

-- Nothing unapproved is offered, so an unapproved corpus is an empty
-- one. Scoped to the corpus: supabase/seed.sql deliberately leaves one
-- record unapproved to prove the editorial gate actually withholds it,
-- and an assertion that counted that row as a fault would be asking
-- the seed to stop testing the thing it is there to test.
select tests.check('18.3', 'every corpus record carries editorial approval',
  (select count(*) from film_house_records r
     where r.editorial_approved_at is null
       and exists (select 1 from unnest(r.territories) t where t like 'I want%')) = 0,
  'unapproved corpus rows: ' || (select count(*) from film_house_records r
     where r.editorial_approved_at is null
       and exists (select 1 from unnest(r.territories) t where t like 'I want%')));

-- The handover promises 20 themes with 25 films each. If a theme is
-- short, the House offers a territory it cannot answer.
select tests.check('18.4', 'each of the 20 themes has its 25 films',
  (select count(*) from (
     select t, count(*) c
     from film_house_records r,
          unnest(r.territories) t
     where t like 'I want%'
     group by t
   ) s where s.c <> 25) = 0,
  'themes not at 25: ' || (select count(*) from (
     select t, count(*) c from film_house_records r, unnest(r.territories) t
     where t like 'I want%' group by t) s where s.c <> 25));

select tests.check('18.5', 'there are exactly 20 curated themes',
  (select count(distinct t) from film_house_records r, unnest(r.territories) t
     where t like 'I want%') = 20,
  'themes: ' || (select count(distinct t) from film_house_records r, unnest(r.territories) t
     where t like 'I want%'));

-- ---------------------------------------------------------------------
-- 0019: the House offers themes, not tags.
-- ---------------------------------------------------------------------
-- Importing the corpus briefly put 138 values in front of the member,
-- because tags and themes shared one column. The member is offered a
-- territory; tags only resolve free text into one.

-- All 20 are present, rather than the offer being exactly 20. Any
-- approved record adds its own territory by design — the fixtures here
-- do, and the Desk will — so pinning the total made this an inventory
-- of the test data rather than a check that the corpus is fully offered.
select tests.check('19.1', 'every one of the 20 curated themes is offered',
  (select count(*) from (
     select distinct primary_theme t from film_house_records
     where primary_theme like 'I want%'
   ) corpus
   where not exists (
     select 1 from list_trust_us_territories() o where o.territory = corpus.t
   )) = 0,
  'curated themes offered: ' || (select count(*) from list_trust_us_territories()
     where territory like 'I want%'));

-- Not "every offer is a full sentence" — the handover lets the
-- interface shorten a label, and the pre-corpus records use short ones.
-- What must never appear is a raw search tag, which is the thing that
-- would turn the offer back into filter configuration.
select tests.check('19.2', 'no raw search tag is ever offered',
  (select count(*) from list_trust_us_territories()
     where territory in ('tense','suspense','chase','claustrophobic','horror',
                         'scary','creepy','dread','pressure','edge of seat')) = 0,
  'tags offered: ' || (select string_agg(territory, ', ') from list_trust_us_territories()
     where territory in ('tense','suspense','chase','claustrophobic','horror',
                         'scary','creepy','dread','pressure','edge of seat')));

select tests.check('19.3', 'tags still exist for matching, and outnumber the offer',
  (select count(distinct t) from film_house_records r, unnest(r.territories) t) > 100,
  'match surface: ' || (select count(distinct t) from film_house_records r, unnest(r.territories) t));
