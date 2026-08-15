-- House Dark — the Room's header withholds the title until you revealed it.
--
-- get_room_opening (migration 0020) exists so the Room page can show
-- "Whiplash" without POSTing to /api/reveal and rewriting the member's
-- reveal timestamp on every visit. That makes it a second path to a
-- title, and every path to a title has to be proved to hold the same
-- line: a member who never opened that night gets the opening number
-- and nothing else.
--
-- It also answers "have you published yours", which get_after_credits
-- deliberately cannot: that returns zero rows both for a shut room and
-- for an empty one.

\set member_id      '''22222222-2222-4222-8222-222222222222'''
\set friend_id      '''33333333-3333-4333-8333-333333333333'''
\set opening_id     '''aaaaaaa1-0000-4000-8000-00000000e000'''

-- Fixture, as the service role: one past opening with a known title.
insert into films (id, title, release_year, runtime_minutes)
values ('aaaaaaa1-0000-4000-8000-00000000e001', 'Room Header Fixture', 1999, 101);

insert into openings (
  id, opening_number, opens_at, status, runtime_minutes, no_trailer_storage_path
) values (
  'aaaaaaa1-0000-4000-8000-00000000e000', 9201, now() - interval '3 days',
  'closed', 101, 'aaaaaaa1-0000-4000-8000-00000000e002.mp4'
);

insert into opening_secrets (opening_id, film_id)
values ('aaaaaaa1-0000-4000-8000-00000000e000', 'aaaaaaa1-0000-4000-8000-00000000e001');

do $$
declare
  v_title text;
  v_number integer;
  v_revealed boolean;
  v_published boolean;
begin
  -- 1. Never opened it: number yes, title no.
  perform tests.act_as('22222222-2222-4222-8222-222222222222');
  select opening_number, title, has_revealed, has_published
    into v_number, v_title, v_revealed, v_published
    from get_room_opening('aaaaaaa1-0000-4000-8000-00000000e000');

  perform tests.check('RM.1', 'the opening number is not a secret',
    v_number = 9201, format('expected opening 9201, got %s', v_number));

  perform tests.check('RM.2', 'the title is withheld from a member who never revealed it',
    v_title is null, format('a title leaked to a member who never opened it: %s', v_title));

  perform tests.check('RM.3', 'and it says so',
    v_revealed = false, 'has_revealed was true without a reveal row');

  perform tests.check('RM.4', 'nothing published yet',
    v_published = false, 'has_published was true with no review');
end $$;

-- 2. The member reveals it, the ordinary way: a reveals row.
insert into reveals (user_id, opening_id)
values ('22222222-2222-4222-8222-222222222222',
        'aaaaaaa1-0000-4000-8000-00000000e000');

do $$
declare
  v_title text;
  v_year integer;
  v_revealed boolean;
  v_published boolean;
begin
  perform tests.act_as('22222222-2222-4222-8222-222222222222');
  select title, release_year, has_revealed, has_published
    into v_title, v_year, v_revealed, v_published
    from get_room_opening('aaaaaaa1-0000-4000-8000-00000000e000');

  perform tests.check('RM.5', 'revealing hands over the title',
    v_title = 'Room Header Fixture', format('expected the title, got %s', coalesce(v_title, 'null')));

  perform tests.check('RM.6', 'and the year with it',
    v_year = 1999, format('expected 1999, got %s', v_year));

  perform tests.check('RM.7', 'has_revealed follows the reveal',
    v_revealed = true, 'has_revealed stayed false after a reveal');

  perform tests.check('RM.8', 'revealing is not publishing',
    v_published = false, 'revealing alone marked the member as having published');
end $$;

-- 3. Publishing flips has_published and nothing else.
insert into six_word_reviews (user_id, opening_id, body, word_count, visibility)
values ('22222222-2222-4222-8222-222222222222',
        'aaaaaaa1-0000-4000-8000-00000000e000',
        'The room can hear me now', 6, 'circle');

do $$
declare
  v_published boolean;
begin
  perform tests.act_as('22222222-2222-4222-8222-222222222222');
  select has_published into v_published
    from get_room_opening('aaaaaaa1-0000-4000-8000-00000000e000');

  perform tests.check('RM.9', 'publishing opens the room for this member',
    v_published = true, 'has_published stayed false after publishing');
end $$;

-- 4. One member's reveal is not another's. The friend never opened this
--    night, so the title is still withheld from them even though it is
--    now sitting in someone else's result.
do $$
declare
  v_title text;
  v_published boolean;
begin
  perform tests.act_as('33333333-3333-4333-8333-333333333333');
  select title, has_published into v_title, v_published
    from get_room_opening('aaaaaaa1-0000-4000-8000-00000000e000');

  perform tests.check('RM.10', 'a reveal belongs to one member only',
    v_title is null, format('another member''s reveal leaked the title: %s', v_title));

  perform tests.check('RM.11', 'and so does a published review',
    v_published = false, 'has_published was true for a member who never wrote one');
end $$;

-- 5. A hidden review does not count as having spoken. Otherwise
--    moderation would leave a member reading the room on the strength
--    of words nobody can see.
select tests.act_as_service();

update six_word_reviews
set moderation_state = 'hidden'
where user_id = '22222222-2222-4222-8222-222222222222'
  and opening_id = 'aaaaaaa1-0000-4000-8000-00000000e000';

do $$
declare
  v_published boolean;
begin
  perform tests.act_as('22222222-2222-4222-8222-222222222222');
  select has_published into v_published
    from get_room_opening('aaaaaaa1-0000-4000-8000-00000000e000');

  perform tests.check('RM.12', 'a hidden review does not count as having spoken',
    v_published = false, 'a hidden review still counted as published');
end $$;

-- 6. Anonymous callers get nothing at all.
do $$
declare
  v_failed boolean := false;
begin
  perform tests.act_as_anon();
  begin
    perform * from get_room_opening('aaaaaaa1-0000-4000-8000-00000000e000');
  exception when others then
    v_failed := true;
  end;

  perform tests.check('RM.13', 'an anonymous visitor cannot read the Room header',
    v_failed, 'get_room_opening answered an unauthenticated caller');
end $$;
