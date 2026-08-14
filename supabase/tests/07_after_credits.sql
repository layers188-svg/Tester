-- House Dark — After Credits opens only after you have seen the film.
--
-- The rule the product turns on: a member may not read anyone else's
-- six words on a film until they have watched it. It is enforced in
-- get_after_credits (migration 0023) rather than in a policy, so it
-- needs testing where it actually lives — a policy test would pass
-- against a function that never consulted one.
--
-- The gate was publishing until 14 August. What it protected was never
-- the writing: it was the member's own reaction forming before outside
-- opinion reshaped it, and watching is when that happens. AC.2 below is
-- the assertion that changed, and it is the one worth reading — a
-- member who watched and chose to say nothing is welcome in the room.
--
-- The empty result is part of the contract, not an accident: zero rows
-- means "you have not watched this", never "the room is empty".

\set member_id      '''22222222-2222-4222-8222-222222222222'''
\set friend_id      '''33333333-3333-4333-8333-333333333333'''
\set outsider_id    '''44444444-4444-4444-8444-444444444444'''
\set opening_id     '''aaaaaaa1-0000-4000-8000-00000000ac01'''
\set film_id        '''aaaaaaa1-0000-4000-8000-00000000ac02'''

-- Fixture, as the service role: one closed opening with three members'
-- words on it. One of those is private.
insert into films (id, title, runtime_minutes)
values ('aaaaaaa1-0000-4000-8000-00000000ac02', 'After Credits Fixture', 100);

insert into openings (
  id, opening_number, opens_at, status, runtime_minutes, no_trailer_storage_path
) values (
  'aaaaaaa1-0000-4000-8000-00000000ac01', 9001, now() - interval '2 days',
  'closed', 100, 'aaaaaaa1-0000-4000-8000-00000000ac03.mp4'
);

insert into opening_secrets (opening_id, film_id)
values ('aaaaaaa1-0000-4000-8000-00000000ac01', 'aaaaaaa1-0000-4000-8000-00000000ac02');

insert into six_word_reviews (user_id, opening_id, body, word_count, visibility)
values
  ('33333333-3333-4333-8333-333333333333',
   'aaaaaaa1-0000-4000-8000-00000000ac01',
   'Loud film, quiet drive home after', 6, 'circle'),
  ('44444444-4444-4444-8444-444444444444',
   'aaaaaaa1-0000-4000-8000-00000000ac01',
   'Kept this one to my self', 6, 'private');

do $$
declare
  v_rows integer;
  v_mine integer;
  v_friend integer;
  v_private integer;
begin
  -- 1. Before watching: the room is shut.
  perform tests.act_as('22222222-2222-4222-8222-222222222222');
  select count(*) into v_rows from get_after_credits(
    'aaaaaaa1-0000-4000-8000-00000000ac01');

  perform tests.check('AC.1', 'the room is shut until the member has seen it',
    v_rows = 0, format('expected 0 rows, got %s', v_rows));

  -- 2. The member watches, and writes nothing at all.
  --
  -- This is the assertion the rule change turns on. Skipping records
  -- nothing, so there is deliberately no review here: if the room only
  -- opened to people who had written, this would still be zero and a
  -- member with nothing to say would never see what anybody thought.
  perform tests.act_as_service();
  insert into watches (user_id, opening_id, state, watched_at)
  values ('22222222-2222-4222-8222-222222222222',
          'aaaaaaa1-0000-4000-8000-00000000ac01', 'watched', now());
  perform tests.act_as('22222222-2222-4222-8222-222222222222');

  select count(*) into v_rows from get_after_credits(
    'aaaaaaa1-0000-4000-8000-00000000ac01');

  perform tests.check('AC.2', 'watching opens the room, with nothing written',
    v_rows > 0, 'a member who watched and skipped saw a shut room');

  -- 3. And then they do write something.
  insert into six_word_reviews (user_id, opening_id, body, word_count, visibility)
  values ('22222222-2222-4222-8222-222222222222',
          'aaaaaaa1-0000-4000-8000-00000000ac01',
          'Six words I actually meant here', 6, 'circle');

  select count(*) into v_rows from get_after_credits(
    'aaaaaaa1-0000-4000-8000-00000000ac01');
  select count(*) into v_mine from get_after_credits(
    'aaaaaaa1-0000-4000-8000-00000000ac01') where is_mine;
  select count(*) into v_friend from get_after_credits(
    'aaaaaaa1-0000-4000-8000-00000000ac01')
    where not is_mine and body like 'Loud film%';
  select count(*) into v_private from get_after_credits(
    'aaaaaaa1-0000-4000-8000-00000000ac01') where body like 'Kept this one%';

  perform tests.check('AC.3', 'the member''s own words come back, marked as theirs',
    v_mine = 1, format('expected exactly 1 own review, got %s', v_mine));

  perform tests.check('AC.4', 'another member''s words are now readable',
    v_friend = 1, format('expected the friend''s review, got %s', v_friend));

  -- Privacy is the member's own, and outlives the gate opening.
  perform tests.check('AC.5', 'a private review stays out of the room',
    v_private = 0, 'a review marked private was returned');
end $$;

-- 3. Moderation removes from the room without deleting the record.
--
-- Back to the service role first. Without this the UPDATE runs as the
-- member left over from the block above, who cannot moderate someone
-- else's review, so RLS silently matches zero rows and the assertion
-- fails against a function that was behaving correctly all along.
select tests.act_as_service();

update six_word_reviews
set moderation_state = 'hidden'
where user_id = '33333333-3333-4333-8333-333333333333'
  and opening_id = 'aaaaaaa1-0000-4000-8000-00000000ac01';

do $$
declare
  v_friend integer;
begin
  perform tests.act_as('22222222-2222-4222-8222-222222222222');
  select count(*) into v_friend from get_after_credits(
    'aaaaaaa1-0000-4000-8000-00000000ac01') where body like 'Loud film%';

  perform tests.check('AC.6', 'a hidden review leaves the room',
    v_friend = 0, 'a hidden review was still returned');
end $$;

-- 4. The gate is per member, not global: the outsider watched before
--    any of this, so their room is open, but only to what they may see.
select tests.act_as_service();

insert into watches (user_id, opening_id, state, watched_at)
values ('44444444-4444-4444-8444-444444444444',
        'aaaaaaa1-0000-4000-8000-00000000ac01', 'watched', now());

do $$
declare
  v_rows integer;
begin
  perform tests.act_as('44444444-4444-4444-8444-444444444444');
  select count(*) into v_rows from get_after_credits(
    'aaaaaaa1-0000-4000-8000-00000000ac01');

  perform tests.check('AC.7', 'the gate is judged per member',
    v_rows > 0, 'a member who had watched saw a shut room');
end $$;
