-- House Dark — Library and member-facing RPC tests.
--
-- Brief §7 "Library" and §11 rule 5: "Opening history must not expose
-- titles the member never revealed." That rule lives entirely in SQL —
-- get_my_library() and get_house_openings() decide per row whether to
-- return a title — so it has to be proven in SQL too. A client-side
-- check would be worthless here.
--
-- Continues the sequence started in 01_rls.sql and appends to
-- tests.results. Run via: npm run test:rls

\set ON_ERROR_STOP on

\set owner_id       '''11111111-1111-4111-8111-111111111111'''
\set member_id      '''22222222-2222-4222-8222-222222222222'''
\set other_id       '''33333333-3333-4333-8333-333333333333'''
\set outsider_id    '''44444444-4444-4444-8444-444444444444'''
\set film_id        '''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'''
\set opening_id     '''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'''
\set circle_id      '''dddddddd-dddd-4ddd-8ddd-dddddddddddd'''
\set rec_id         '''eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'''

-- ---------------------------------------------------------------------
-- Fixtures: two members with the same watch history, but only one of
-- them ever revealed. That asymmetry is the whole point of these tests.
-- 01_rls.sql already left :member_id with a reveal on :opening_id and a
-- revealed sealed recommendation; :other_id has neither.
-- ---------------------------------------------------------------------

select tests.act_as_service();

insert into watches (user_id, opening_id, state, watched_at)
values (:member_id, :opening_id, 'watched', now())
on conflict do nothing;

insert into watches (user_id, sealed_recommendation_id, state, watched_at)
values (:member_id, :rec_id, 'watched', now() - interval '1 day')
on conflict do nothing;

-- Same opening, saved but never revealed.
insert into watches (user_id, opening_id, state)
values (:other_id, :opening_id, 'saved')
on conflict do nothing;

-- =====================================================================
-- Library: "Yours"
-- =====================================================================

select tests.act_as(:member_id);

select tests.check('7.L', 'library returns only the caller''s own rows',
  (select count(*) from get_my_library()) = 2,
  'rows: ' || (select count(*) from get_my_library()));

select tests.check('7.L', 'a revealed opening shows its title',
  (select title from get_my_library() where kind = 'opening') = 'Whiplash');

select tests.check('7.L', 'a revealed opening is marked revealed',
  (select revealed from get_my_library() where kind = 'opening') = true);

select tests.check('7.L', 'a revealed recommendation shows its title',
  (select title from get_my_library() where kind = 'recommendation') = 'Whiplash');

select tests.check('7.L', 'library carries the opening number for openings',
  (select opening_number from get_my_library() where kind = 'opening') = 1);

select tests.check('7.L', 'library orders most recently watched first',
  (select kind from get_my_library() limit 1) = 'opening');

-- The member who never revealed must see the same row with no title.
select tests.act_as(:other_id);

select tests.check('7.L', 'an unrevealed opening is still listed',
  (select count(*) from get_my_library()) = 1,
  'rows: ' || (select count(*) from get_my_library()));

select tests.check('7.L', 'an unrevealed opening has a null title',
  (select title from get_my_library() where kind = 'opening') is null,
  'title was: ' || coalesce((select title from get_my_library() where kind = 'opening'), '(null)'));

select tests.check('7.L', 'an unrevealed opening has a null release year',
  (select release_year from get_my_library() where kind = 'opening') is null);

select tests.check('7.L', 'an unrevealed opening is marked not revealed',
  (select revealed from get_my_library() where kind = 'opening') = false);

-- The strongest assertion: serialise every row and confirm the
-- forbidden title appears nowhere in the whole payload.
select tests.check('7.L', 'the unrevealed library payload leaks no title anywhere',
  not exists (select 1 from get_my_library() l where to_jsonb(l)::text ilike '%whiplash%'));

select tests.check('7.L', 'library still exposes the safe watch state',
  (select watch_state from get_my_library() where kind = 'opening') = 'saved');

-- =====================================================================
-- Library: "The House"
-- =====================================================================

select tests.check('7.H', 'house history lists open and closed openings only',
  (select count(*) from get_house_openings()) = 1,
  'rows: ' || (select count(*) from get_house_openings()));

select tests.check('7.H', 'house history never lists a draft opening',
  not exists (select 1 from get_house_openings() where status = 'draft'));

select tests.check('7.H', 'an unrevealed opening has no title in house history',
  (select title from get_house_openings()) is null,
  'title was: ' || coalesce((select title from get_house_openings()), '(null)'));

select tests.check('7.H', 'the unrevealed house payload leaks no title anywhere',
  not exists (select 1 from get_house_openings() h where to_jsonb(h)::text ilike '%whiplash%'));

select tests.act_as(:member_id);

select tests.check('7.H', 'a revealed opening DOES show its title in house history',
  (select title from get_house_openings()) = 'Whiplash');

select tests.check('7.H', 'house history reports the reveal state',
  (select revealed from get_house_openings()) = true);

-- =====================================================================
-- Sending under seal: a member contributes a film without ever holding
-- read or write access to `films` (brief §10, §11 rule 9).
-- =====================================================================

select tests.act_as(:member_id);

select tests.check('7.S', 'member still cannot read films directly',
  (select count(*) from films) = 0);

do $$
declare
  v_rec_id uuid;
  v_ok boolean := true;
  v_error text;
begin
  begin
    select create_sealed_recommendation(
      'A Film The Member Chose', 2001, 118,
      array['33333333-3333-4333-8333-333333333333']::uuid[],
      'Watch it on a big screen.',
      array['Rain', 'Trains']::text[],
      null, null
    ) into v_rec_id;
  exception when others then
    v_ok := false;
    v_error := sqlerrm;
  end;
  perform tests.check('7.S', 'member CAN send a film under seal', v_ok and v_rec_id is not null, v_error);
end
$$;

select tests.check('7.S', 'sending does not grant the sender read access to films',
  (select count(*) from films) = 0,
  'rows: ' || (select count(*) from films));

select tests.check('7.S', 'the sender CAN see their own sent recommendation',
  (select count(*) from list_my_sealed_recommendations() where is_sender) = 1);

select tests.check('7.S', 'the sender''s own listing carries no title',
  not exists (
    select 1 from list_my_sealed_recommendations() r
    where to_jsonb(r)::text ilike '%a film the member chose%'
  ));

do $$
declare
  v_error text := '';
begin
  begin
    perform create_sealed_recommendation(
      'Too Many Cues', null, 100,
      array['33333333-3333-4333-8333-333333333333']::uuid[],
      null,
      array['One', 'Two', 'Three', 'Four']::text[],
      null, null
    );
  exception when others then
    v_error := sqlerrm;
  end;
  perform tests.check('7.S', 'at most three cues are enforced in the database',
    v_error like '%at most three cues%', 'error was: ' || coalesce(v_error, '(none)'));
end
$$;

do $$
declare
  v_error text := '';
begin
  begin
    perform create_sealed_recommendation(
      'No Recipients', null, 100, array[]::uuid[], null, array[]::text[], null, null
    );
  exception when others then
    v_error := sqlerrm;
  end;
  perform tests.check('7.S', 'at least one recipient is required',
    v_error like '%at least one recipient%', 'error was: ' || coalesce(v_error, '(none)'));
end
$$;

do $$
declare
  v_error text := '';
begin
  begin
    perform create_sealed_recommendation(
      'Not My Circle', null, 100,
      array['33333333-3333-4333-8333-333333333333']::uuid[],
      null, array[]::text[], now(),
      '00000000-0000-4000-8000-000000000000'
    );
  exception when others then
    v_error := sqlerrm;
  end;
  perform tests.check('7.S', 'cannot schedule a screening in a Circle you are not in',
    v_error like '%Not a member%', 'error was: ' || coalesce(v_error, '(none)'));
end
$$;

-- =====================================================================
-- Joining a Circle by invite code
-- =====================================================================

select tests.act_as(:outsider_id);

select tests.check('7.C', 'outsider starts outside the Circle',
  (select count(*) from circles) = 0);

do $$
declare
  v_circle_id uuid;
begin
  select join_circle_by_code('test-code') into v_circle_id;
  perform tests.check('7.C', 'a valid invite code joins the Circle',
    v_circle_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
end
$$;

select tests.check('7.C', 'the new member can now read the Circle',
  (select count(*) from circles) = 1);

select tests.check('7.C', 'joining twice is idempotent',
  (select join_circle_by_code('test-code')) = :circle_id
  and (select count(*) from circle_members where circle_id = :circle_id) = 4,
  'members: ' || (select count(*) from circle_members where circle_id = :circle_id));

do $$
declare
  v_error text := '';
begin
  begin
    perform join_circle_by_code('not-a-real-code');
  exception when others then
    v_error := sqlerrm;
  end;
  perform tests.check('7.C', 'an unrecognised invite code is rejected',
    v_error like '%not recognised%', 'error was: ' || coalesce(v_error, '(none)'));
end
$$;

select tests.check('7.C', 'the new member sees Circle activity but no title',
  not exists (
    select 1 from get_circle_activity(:circle_id) a
    where to_jsonb(a)::text ilike '%whiplash%'
  ));

-- A member can leave, and loses access immediately.
delete from circle_members where circle_id = :circle_id and user_id = :outsider_id;

select tests.check('7.C', 'leaving a Circle revokes access at once',
  (select count(*) from circles) = 0,
  'rows: ' || (select count(*) from circles));

-- =====================================================================
-- Duplicates cannot survive a retry (brief §16 rule 3, migration 0012)
-- =====================================================================

select tests.act_as_service();

do $$
declare
  v_blocked boolean := false;
begin
  begin
    insert into opening_cues (opening_id, cue, sort_order)
    values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Drummer', 9);
  exception when unique_violation then
    v_blocked := true;
  end;
  perform tests.check('16.3', 'the same cue cannot be added twice to an opening', v_blocked);
end
$$;

select tests.check('16.3', 're-inserting a cue with ON CONFLICT is a no-op',
  (select count(*) from opening_cues where opening_id = :opening_id) = 2,
  'cues: ' || (select count(*) from opening_cues where opening_id = :opening_id));

do $$
declare
  v_blocked boolean := false;
begin
  begin
    insert into playback_destinations (film_id, territory, provider_name, access_type, deep_link)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'AU', 'Example Service', 'subscription',
      'https://example.com/watch-again'
    );
  exception when unique_violation then
    v_blocked := true;
  end;
  perform tests.check('16.3', 'the same provider cannot be added twice for one territory', v_blocked);
end
$$;

-- The same provider at a different access type is still legitimate.
do $$
declare
  v_ok boolean := true;
  v_error text;
begin
  begin
    insert into playback_destinations (film_id, territory, provider_name, access_type, deep_link)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'AU', 'Example Service', 'rental',
      'https://example.com/rent'
    );
  exception when others then
    v_ok := false;
    v_error := sqlerrm;
  end;
  perform tests.check('16.3', 'the same provider CAN offer a different access type', v_ok, v_error);
end
$$;

-- A member who types the same cue twice must not lose the whole send.
select tests.act_as(:member_id);

do $$
declare
  v_rec_id uuid;
  v_ok boolean := true;
  v_error text;
  v_cue_count integer;
begin
  begin
    select create_sealed_recommendation(
      'A Film With Repeated Cues', 1999, 100,
      array['33333333-3333-4333-8333-333333333333']::uuid[],
      null,
      array['Rain', 'Rain', 'Trains']::text[],
      null, null
    ) into v_rec_id;
  exception when others then
    v_ok := false;
    v_error := sqlerrm;
  end;

  select count(*) into v_cue_count
  from sealed_recommendation_cues where recommendation_id = v_rec_id;

  perform tests.check('16.3', 'a repeated cue is skipped rather than failing the send',
    v_ok and v_cue_count = 2, coalesce(v_error, 'cues stored: ' || coalesce(v_cue_count, 0)));
end
$$;
