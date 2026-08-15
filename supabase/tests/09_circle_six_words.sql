-- House Dark — friend six words are sealed until you have left yours,
-- and the title is sealed until you have opened that night.
--
-- The two gates come apart: a member can reveal an opening without
-- reviewing it, and can review without... no, reviewing implies
-- watching. But revealing without reviewing is ordinary, and that is
-- the case that would leak words if the gates were collapsed into one.

\set viewer_id  '''22222222-2222-4222-8222-222222222222'''
\set friend_id  '''33333333-3333-4333-8333-333333333333'''

select tests.act_as_service();

insert into films (id, title, runtime_minutes)
values ('bbbbbbb1-0000-4000-8000-0000000000c2', 'Circle Words Fixture', 100);

insert into openings (
  id, opening_number, opens_at, status, runtime_minutes, no_trailer_storage_path
) values (
  'bbbbbbb1-0000-4000-8000-0000000000c1', 9101, now() - interval '3 days',
  'closed', 100, 'bbbbbbb1-0000-4000-8000-0000000000c3.mp4'
);

insert into opening_secrets (opening_id, film_id)
values ('bbbbbbb1-0000-4000-8000-0000000000c1', 'bbbbbbb1-0000-4000-8000-0000000000c2');

-- The friend leaves six words. They share circle 1 with the viewer.
insert into six_word_reviews (user_id, opening_id, body, word_count, visibility)
values ('33333333-3333-4333-8333-333333333333',
        'bbbbbbb1-0000-4000-8000-0000000000c1',
        'Still thinking about that final shot', 6, 'circle');

do $$
declare
  v_rows integer;
  v_body text;
  v_title text;
  v_unlocked boolean;
begin
  perform tests.act_as('22222222-2222-4222-8222-222222222222');

  select count(*) into v_rows from get_circle_six_words()
    where opening_id = 'bbbbbbb1-0000-4000-8000-0000000000c1';
  perform tests.check('CS.1', 'a Circle friend''s review appears at all',
    v_rows = 1, format('expected 1 row, got %s', v_rows));

  select body, title, unlocked into v_body, v_title, v_unlocked
    from get_circle_six_words()
    where opening_id = 'bbbbbbb1-0000-4000-8000-0000000000c1';

  perform tests.check('CS.2', 'their words are sealed before the viewer has left theirs',
    v_body is null, 'a friend''s six words were readable without publishing');

  perform tests.check('CS.3', 'and it says so',
    v_unlocked is false, 'unlocked was true before publishing');

  perform tests.check('CS.4', 'the title is sealed before the viewer revealed it',
    v_title is null, format('the title leaked as %s', coalesce(v_title, '')));
end $$;

-- The viewer reveals the night but does not review it. This is the case
-- that collapsing the two gates would get wrong.
select tests.act_as_service();
insert into reveals (user_id, opening_id)
values ('22222222-2222-4222-8222-222222222222', 'bbbbbbb1-0000-4000-8000-0000000000c1');

do $$
declare
  v_body text;
  v_title text;
begin
  perform tests.act_as('22222222-2222-4222-8222-222222222222');
  select body, title into v_body, v_title from get_circle_six_words()
    where opening_id = 'bbbbbbb1-0000-4000-8000-0000000000c1';

  perform tests.check('CS.5', 'revealing shows the title',
    v_title = 'Circle Words Fixture', 'the title stayed hidden after revealing');

  perform tests.check('CS.6', 'revealing alone does not open their words',
    v_body is null, 'a reveal unlocked someone else''s six words');
end $$;

-- Now the viewer leaves their own.
do $$
declare
  v_body text;
  v_unlocked boolean;
begin
  perform tests.act_as('22222222-2222-4222-8222-222222222222');
  insert into six_word_reviews (user_id, opening_id, body, word_count, visibility)
  values ('22222222-2222-4222-8222-222222222222',
          'bbbbbbb1-0000-4000-8000-0000000000c1',
          'Mine first then I read', 6, 'circle');

  select body, unlocked into v_body, v_unlocked from get_circle_six_words()
    where opening_id = 'bbbbbbb1-0000-4000-8000-0000000000c1';

  perform tests.check('CS.7', 'publishing opens their words',
    v_body = 'Still thinking about that final shot',
    'the friend''s words stayed sealed after publishing');

  perform tests.check('CS.8', 'and it says so',
    v_unlocked is true, 'unlocked stayed false after publishing');
end $$;

-- Someone outside every shared Circle never appears.
do $$
declare
  v_rows integer;
begin
  perform tests.act_as('44444444-4444-4444-8444-444444444444');
  select count(*) into v_rows from get_circle_six_words()
    where opening_id = 'bbbbbbb1-0000-4000-8000-0000000000c1';
  perform tests.check('CS.9', 'a member outside the Circle sees none of it',
    v_rows = 0, format('an outsider saw %s Circle reviews', v_rows));
end $$;
