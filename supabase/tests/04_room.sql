-- House Dark — The Room, and the review decision that opens it.
--
-- Handover 00_BUILD_BRIEF_FINAL.md §3 "Post watch" and §5 "The Room".
-- Two rules are proven here because both are enforced in SQL and both
-- are easy to get wrong in a client:
--
--   1. "Skip still unlocks The Room" — and it does so without creating
--      a fake blank review (0013_review_decision.sql).
--   2. A 'circle'-visibility review never widens to The House just
--      because a stranger happens to have watched the same film
--      (0014_room.sql).
--
-- Continues the sequence in 01/02/03 and appends to tests.results.

\set ON_ERROR_STOP on

\set owner_id       '''11111111-1111-4111-8111-111111111111'''
\set member_id      '''22222222-2222-4222-8222-222222222222'''
\set other_id       '''33333333-3333-4333-8333-333333333333'''
\set outsider_id    '''44444444-4444-4444-8444-444444444444'''
\set opening_id     '''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'''
\set circle_id      '''dddddddd-dddd-4ddd-8ddd-dddddddddddd'''

-- ---------------------------------------------------------------------
-- Fixtures.
--
-- :member_id and :other_id share :circle_id (01_rls.sql). :outsider_id
-- is in no Circle with anyone. All three watched :opening_id, so the
-- only thing separating their voices in the Room is who they know and
-- what an editor approved.
-- ---------------------------------------------------------------------

select tests.act_as_service();

-- watches_user_opening_unique is a partial index, so ON CONFLICT would
-- have to restate its predicate to infer it. Delete-then-insert says
-- the same thing without the footgun.
delete from watches
where opening_id = :opening_id and user_id in (:other_id, :outsider_id);

insert into watches (user_id, opening_id, state, watched_at)
values
  (:other_id, :opening_id, 'watched', now()),
  (:outsider_id, :opening_id, 'watched', now());

-- A Circle-mate's review, addressed to the Circle.
insert into six_word_reviews (user_id, opening_id, body, word_count, visibility, moderation_state)
values (:other_id, :opening_id, 'Drums answered every question I had', 6, 'circle', 'visible')
on conflict do nothing;

-- A stranger's review, approved for the whole House.
insert into six_word_reviews (user_id, opening_id, body, word_count, visibility, moderation_state)
values (:outsider_id, :opening_id, 'Left the room still counting time', 6, 'house_approved', 'visible')
on conflict do nothing;

-- =====================================================================
-- Room eligibility: watched is not enough on its own.
-- =====================================================================

select tests.act_as(:member_id);

-- 02_library.sql left :member_id watching :opening_id with no review
-- and no skip — review_undecided.
select tests.check('R.1', 'watching alone does not open the Room',
  is_room_eligible(:opening_id, null) = false);

select tests.check('R.1', 'a closed Room refuses to hand over voices',
  (select tests.raises($$select * from get_room_voices(
     'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid, null)$$)));

-- ---------------------------------------------------------------------
-- Skip for now.
-- ---------------------------------------------------------------------

select tests.check('R.2', 'skip_review records the decision',
  skip_review(:opening_id, null) is not null);

select tests.check('R.2', 'skipping opens the Room',
  is_room_eligible(:opening_id, null) = true);

-- The rule that rules out the obvious implementation.
select tests.check('R.2', 'skipping creates no review row',
  not exists (
    select 1 from six_word_reviews
    where user_id = :member_id and opening_id = :opening_id
  ));

select tests.check('R.2', 'skipping creates no blank body anywhere',
  not exists (select 1 from six_word_reviews where trim(body) = ''));

select tests.check('R.2', 'skipping twice is idempotent',
  skip_review(:opening_id, null)
    = (select review_skipped_at from watches
       where user_id = :member_id and opening_id = :opening_id));

-- ---------------------------------------------------------------------
-- Leaving six words after a skip retracts the skip.
-- ---------------------------------------------------------------------

insert into six_word_reviews (user_id, opening_id, body, word_count, visibility)
values (:member_id, :opening_id, 'Ambition is a kind of wound', 6, 'circle');

select tests.check('R.3', 'writing six words clears the earlier skip',
  (select review_skipped_at from watches
   where user_id = :member_id and opening_id = :opening_id) is null);

select tests.check('R.3', 'the Room stays open after the skip is retracted',
  is_room_eligible(:opening_id, null) = true);

-- =====================================================================
-- The three modes.
-- =====================================================================

select tests.check('R.4', 'the Room never returns the caller''s own words',
  not exists (
    select 1 from get_room_voices(:opening_id, null)
    where body = 'Ambition is a kind of wound'
  ));

select tests.check('R.4', 'a Circle-mate''s review arrives as a Circle voice',
  exists (
    select 1 from get_room_voices(:opening_id, null)
    where body = 'Drums answered every question I had' and source = 'circle'
  ));

select tests.check('R.4', 'an approved stranger''s review arrives as a House voice',
  exists (
    select 1 from get_room_voices(:opening_id, null)
    where body = 'Left the room still counting time' and source = 'house'
  ));

select tests.check('R.4', 'the Room carries the author name quietly alongside',
  not exists (
    select 1 from get_room_voices(:opening_id, null)
    where author_display_name is null
  ));

-- No engagement of any kind is exposed — there is nothing to rank.
select tests.check('R.4', 'the Room returns no count, score or rank column',
  not exists (
    select 1
    from get_room_voices(:opening_id, null) v,
         lateral jsonb_object_keys(to_jsonb(v)) as k
    where k ~* '(count|score|rank|like|vote|popular)'
  ));

-- =====================================================================
-- A Circle review does not widen to The House.
-- =====================================================================
--
-- :outsider_id watched the same film and left a review, so the existing
-- 'circle' visibility rule (has_watched) lets them read the row. The
-- Room must still not present it as a House voice to them: "circle"
-- means the sender's Circle, not everyone who happens to be eligible.

select tests.act_as(:outsider_id);

select skip_review(:opening_id, null);

select tests.check('R.5', 'an outsider''s Room opens on their own skip',
  is_room_eligible(:opening_id, null) = true);

select tests.check('R.5', 'a Circle review never reaches an outsider''s Room',
  not exists (
    select 1 from get_room_voices(:opening_id, null)
    where body = 'Drums answered every question I had'
  ));

select tests.check('R.5', 'the outsider sees non-Circle voices as House voices',
  not exists (
    select 1 from get_room_voices(:opening_id, null) where source = 'circle'
  ));

-- =====================================================================
-- The Room is still title-free on its own.
-- =====================================================================
--
-- The Room header does show the title — the member is eligible by then
-- (§5 "film title, because the member is now eligible"). But the title
-- comes from the reveal the member already made, never from the voices,
-- so this payload must stay clean whichever member asks.

select tests.check('R.6', 'no voice payload carries the protected title',
  not exists (
    select 1 from get_room_voices(:opening_id, null) v
    where to_jsonb(v)::text ilike '%whiplash%'
  ));
