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
