-- House Dark — Row Level Security policy tests.
--
-- Brief §17 "Database and RLS tests" — all seven required cases, plus
-- the spoiler-specific checks that back §11. These run against the real
-- migrations in supabase/migrations, unmodified, on a throwaway
-- Postgres prepared by supabase/tests/00_supabase_shim.sql.
--
-- Run via: npm run test:rls
--
-- Each section acts as a real role (anon / authenticated) with the same
-- `request.jwt.claims` GUC Supabase sets, so every policy is exercised
-- through the exact code path it takes in production. A "cannot read"
-- assertion checks for zero rows, because RLS filters rows rather than
-- raising — a test that only looked for an error would pass while
-- leaking everything.
--
-- Sections deliberately run in one transaction-free sequence rather
-- than rolling back: state carries forward, so a policy that leaks only
-- after an earlier write still gets caught.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------
-- Assertion harness
-- ---------------------------------------------------------------------

create schema if not exists tests;

drop table if exists tests.results;
create table tests.results (
  id serial primary key,
  requirement text not null,
  description text not null,
  passed boolean not null,
  detail text
);

create or replace function tests.check(
  p_requirement text,
  p_description text,
  p_passed boolean,
  p_detail text default null
)
returns void
language plpgsql
as $$
begin
  insert into tests.results (requirement, description, passed, detail)
  values (p_requirement, p_description, p_passed, p_detail);
end;
$$;

/*
 * Did this statement refuse? For the handful of boundaries that raise
 * rather than filter — a security-definer function that checks
 * eligibility before returning anything — "zero rows" is the wrong
 * assertion, because a function that silently returned nothing would
 * pass it while a broken one that returned everything would too.
 */
create or replace function tests.raises(p_sql text)
returns boolean
language plpgsql
as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end;
$$;

/* Become an authenticated member, exactly as PostgREST would. */
create or replace function tests.act_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  execute 'set role authenticated';
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', p_user_id::text, 'role', 'authenticated')::text,
    false
  );
end;
$$;

create or replace function tests.act_as_anon()
returns void
language plpgsql
as $$
begin
  execute 'set role anon';
  perform set_config('request.jwt.claims', '{"role":"anon"}', false);
end;
$$;

create or replace function tests.act_as_service()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '{"role":"service_role"}', false);
end;
$$;

-- The harness itself must be reachable from every role under test.
grant usage on schema tests to anon, authenticated, service_role;
grant select, insert on tests.results to anon, authenticated, service_role;
grant usage, select on sequence tests.results_id_seq to anon, authenticated, service_role;
grant execute on all functions in schema tests to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Fixtures (created as the superuser, bypassing RLS)
-- ---------------------------------------------------------------------

\set owner_id       '''11111111-1111-4111-8111-111111111111'''
\set member_id      '''22222222-2222-4222-8222-222222222222'''
\set other_id       '''33333333-3333-4333-8333-333333333333'''
\set outsider_id    '''44444444-4444-4444-8444-444444444444'''
\set moderator_id   '''55555555-5555-4555-8555-555555555555'''
\set film_id        '''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'''
\set opening_id     '''bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'''
\set circle_id      '''dddddddd-dddd-4ddd-8ddd-dddddddddddd'''
\set rec_id         '''eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'''
\set tampered_id    '''99999999-9999-4999-8999-999999999999'''

insert into auth.users (id, email) values
  (:owner_id, 'owner@housedark.test'),
  (:member_id, 'member@housedark.test'),
  (:other_id, 'other@housedark.test'),
  (:outsider_id, 'outsider@housedark.test'),
  (:moderator_id, 'moderator@housedark.test');

-- guard_profile_role() forces role='member' for non-service callers, so
-- seed the owner and moderator as service_role.
select set_config('request.jwt.claims', '{"role":"service_role"}', false);

insert into profiles (id, display_name, timezone, role) values
  (:owner_id, 'Owner', 'UTC', 'owner'),
  (:member_id, 'Member', 'UTC', 'member'),
  (:other_id, 'Other Member', 'UTC', 'member'),
  (:outsider_id, 'Outsider', 'UTC', 'member'),
  (:moderator_id, 'Moderator', 'UTC', 'moderator');

insert into films (id, title, release_year, runtime_minutes)
values (:film_id, 'Whiplash', 2014, 106);

insert into openings (
  id, opening_number, opens_at, status, runtime_minutes,
  availability_count, minimum_access_type, no_trailer_storage_path
) values (
  :opening_id, 1, now() - interval '1 hour', 'open', 106, 1, 'subscription',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc.mp4'
);

insert into opening_secrets (opening_id, film_id, approved_at, approved_by)
values (:opening_id, :film_id, now(), :owner_id);

insert into opening_cues (opening_id, cue, sort_order) values
  (:opening_id, 'Drummer', 0), (:opening_id, 'School', 1);

insert into playback_destinations (film_id, territory, provider_name, access_type, deep_link, is_active)
values (:film_id, 'AU', 'Example Service', 'subscription', 'https://example.com/watch', true);

insert into circles (id, name, created_by, invite_code)
values (:circle_id, 'Test Circle', :owner_id, 'test-code');

insert into circle_members (circle_id, user_id, role) values
  (:circle_id, :owner_id, 'organiser'),
  (:circle_id, :member_id, 'member'),
  (:circle_id, :other_id, 'member');

insert into sealed_recommendations (id, sender_id, secret_film_id, personal_note, runtime_minutes)
values (:rec_id, :other_id, :film_id, 'You need to see this.', 106);

insert into sealed_recommendation_recipients (recommendation_id, recipient_id)
values (:rec_id, :member_id);

-- A review by `other_id` that `member_id` will try to tamper with.
insert into six_word_reviews (id, user_id, opening_id, body, word_count, visibility)
values (:tampered_id, :other_id, :opening_id, 'Quiet film loud silence after credits', 6, 'circle');

-- An approved review, promoted for the public site.
insert into six_word_reviews (id, user_id, opening_id, body, word_count, visibility)
values (
  '88888888-8888-4888-8888-888888888888',
  :owner_id, :opening_id, 'Watched alone wanted you there tonight', 6, 'house_approved'
);

-- =====================================================================
-- 1. Anonymous user cannot read protected records
-- =====================================================================

select tests.act_as_anon();

select tests.check('17.1', 'anon cannot read films',
  (select count(*) from films) = 0, 'rows: ' || (select count(*) from films));

select tests.check('17.1', 'anon cannot read opening_secrets',
  (select count(*) from opening_secrets) = 0, 'rows: ' || (select count(*) from opening_secrets));

select tests.check('17.1', 'anon cannot read playback_destinations',
  (select count(*) from playback_destinations) = 0, 'rows: ' || (select count(*) from playback_destinations));

select tests.check('17.1', 'anon cannot read profiles',
  (select count(*) from profiles) = 0, 'rows: ' || (select count(*) from profiles));

select tests.check('17.1', 'anon cannot read sealed_recommendations',
  (select count(*) from sealed_recommendations) = 0, 'rows: ' || (select count(*) from sealed_recommendations));

select tests.check('17.1', 'anon cannot read circles',
  (select count(*) from circles) = 0, 'rows: ' || (select count(*) from circles));

select tests.check('17.1', 'anon cannot read watches',
  (select count(*) from watches) = 0, 'rows: ' || (select count(*) from watches));

select tests.check('17.1', 'anon cannot read audit_log',
  (select count(*) from audit_log) = 0, 'rows: ' || (select count(*) from audit_log));

select tests.check('17.1', 'anon cannot read notification_queue',
  (select count(*) from notification_queue) = 0, 'rows: ' || (select count(*) from notification_queue));

-- The public site reads approved six words through get_house_words(),
-- which returns bodies only. Direct table access must stay closed to
-- anon so a member id can never be tied to a public quote.
select tests.check('17.1', 'anon cannot read six_word_reviews directly',
  (select count(*) from six_word_reviews) = 0, 'rows: ' || (select count(*) from six_word_reviews));

select tests.check('17.1', 'anon CAN read approved bodies via get_house_words()',
  (select count(*) from get_house_words(10)) = 1,
  'rows: ' || (select count(*) from get_house_words(10)));

select tests.check('17.1', 'get_house_words() exposes no title',
  not exists (select 1 from get_house_words(10) where body ilike '%whiplash%'));

-- The safe opening projection is meant to be readable — that is the point of it.
select tests.check('17.1', 'anon CAN read the safe openings projection',
  (select count(*) from openings) = 1);

select tests.check('17.1', 'the safe openings projection carries no title',
  not exists (select 1 from openings o where to_jsonb(o)::text ilike '%whiplash%'));

-- =====================================================================
-- 2. Member cannot read films or opening secrets
-- =====================================================================

select tests.act_as(:member_id);

select tests.check('17.2', 'member cannot read films',
  (select count(*) from films) = 0, 'rows: ' || (select count(*) from films));

select tests.check('17.2', 'member cannot read opening_secrets',
  (select count(*) from opening_secrets) = 0, 'rows: ' || (select count(*) from opening_secrets));

select tests.check('17.2', 'member cannot read playback_destinations before reveal',
  (select count(*) from playback_destinations) = 0, 'rows: ' || (select count(*) from playback_destinations));

do $$
declare
  v_blocked boolean := false;
begin
  begin
    insert into films (title, runtime_minutes) values ('Sneaky Insert', 100);
  exception when others then
    v_blocked := true;
  end;
  perform tests.check('17.2', 'member cannot write to films', v_blocked);
end
$$;

select tests.check('17.2', 'member CAN read the safe opening projection',
  (select count(*) from openings) = 1);

select tests.check('17.2', 'member CAN read safe cues',
  (select count(*) from opening_cues) = 2);

-- =====================================================================
-- 3. Recipient cannot read a sealed title before reveal
-- =====================================================================

-- still acting as :member_id, who is the recipient of :rec_id

-- sealed_recommendations carries secret_film_id, so the recipient must
-- not be able to select the row at all — only the sender can.
select tests.check('17.3', 'recipient cannot read the sealed_recommendations row',
  (select count(*) from sealed_recommendations) = 0,
  'rows: ' || (select count(*) from sealed_recommendations));

select tests.check('17.3', 'recipient CAN read the safe projection',
  (select count(*) from get_sealed_recommendation_safe(:rec_id)) = 1);

select tests.check('17.3', 'safe projection carries the sender and note',
  (select sender_display_name from get_sealed_recommendation_safe(:rec_id)) = 'Other Member'
  and (select personal_note from get_sealed_recommendation_safe(:rec_id)) = 'You need to see this.');

-- The strongest form of the assertion: serialise the whole safe
-- projection and confirm the forbidden title appears nowhere in it.
select tests.check('17.3', 'safe projection leaks no title anywhere in its payload',
  not exists (
    select 1 from get_sealed_recommendation_safe(:rec_id) r
    where to_jsonb(r)::text ilike '%whiplash%'
  ));

select tests.check('17.3', 'recipient has no revealed_at before revealing',
  (select revealed_at from get_sealed_recommendation_safe(:rec_id)) is null);

-- Revealing is the only path to the title, and it records eligibility.
select tests.check('17.3', 'reveal returns the title once the recipient chooses to',
  (select title from reveal_sealed_recommendation(:rec_id)) = 'Whiplash');

select tests.check('17.3', 'reveal records revealed_at',
  (select revealed_at from get_sealed_recommendation_safe(:rec_id)) is not null);

select tests.check('17.3', 'revealing does not open up the underlying table',
  (select count(*) from sealed_recommendations) = 0,
  'rows: ' || (select count(*) from sealed_recommendations));

select tests.act_as(:outsider_id);

do $$
declare
  v_error text := '';
begin
  begin
    perform reveal_sealed_recommendation('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
  exception when others then
    v_error := sqlerrm;
  end;
  perform tests.check('17.3', 'a non-recipient cannot reveal a sealed recommendation',
    v_error like '%not sent to you%', 'error was: ' || coalesce(v_error, '(none)'));
end
$$;

do $$
declare
  v_error text := '';
begin
  begin
    perform get_sealed_recommendation_safe('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
  exception when others then
    v_error := sqlerrm;
  end;
  perform tests.check('17.3', 'a non-party cannot even read the safe projection',
    v_error like '%Not found%', 'error was: ' || coalesce(v_error, '(none)'));
end
$$;

-- Tonight's opening: the same rule, via reveal_opening().
select tests.act_as(:member_id);

select tests.check('17.3', 'member has no reveal recorded before entering',
  (select count(*) from reveals) = 0);

select tests.check('17.3', 'reveal_opening() returns the title',
  (select title from reveal_opening(:opening_id)) = 'Whiplash');

select tests.check('17.3', 'reveal_opening() records the reveal',
  (select count(*) from reveals) = 1);

select tests.check('17.3', 'reveal_opening() is idempotent',
  (select title from reveal_opening(:opening_id)) = 'Whiplash'
  and (select count(*) from reveals) = 1);

select tests.check('17.3', 'revealing still does not open up films',
  (select count(*) from films) = 0, 'rows: ' || (select count(*) from films));

-- =====================================================================
-- 4. Non member cannot read Circle activity
-- =====================================================================

select tests.act_as(:outsider_id);

select tests.check('17.4', 'non-member cannot read the circle row',
  (select count(*) from circles) = 0, 'rows: ' || (select count(*) from circles));

select tests.check('17.4', 'non-member cannot read circle_members',
  (select count(*) from circle_members) = 0, 'rows: ' || (select count(*) from circle_members));

-- These assert on the *specific* rejection message. A bare "any
-- exception" check would go green on an unrelated runtime error and
-- hide a broken function — which is exactly what happened before
-- 0010_fix_union_ordering.
do $$
declare
  v_error text := '';
begin
  begin
    perform get_circle_activity('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  exception when others then
    v_error := sqlerrm;
  end;
  perform tests.check('17.4', 'get_circle_activity() rejects a non-member',
    v_error like '%Not a member%', 'error was: ' || coalesce(v_error, '(none)'));
end
$$;

do $$
declare
  v_error text := '';
begin
  begin
    perform get_circle_member_names('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  exception when others then
    v_error := sqlerrm;
  end;
  perform tests.check('17.4', 'get_circle_member_names() rejects a non-member',
    v_error like '%Not a member%', 'error was: ' || coalesce(v_error, '(none)'));
end
$$;

select tests.check('17.4', 'non-member sees no cross-circle activity',
  (select count(*) from get_my_circles_activity()) = 0);

select tests.act_as(:member_id);

select tests.check('17.4', 'a member CAN read their own circle',
  (select count(*) from circles) = 1);

select tests.check('17.4', 'a member CAN read circle member names',
  (select count(*) from get_circle_member_names(:circle_id)) = 3);

select tests.check('17.4', 'circle member names expose no email',
  not exists (
    select 1 from get_circle_member_names(:circle_id) m
    where to_jsonb(m)::text ilike '%@housedark.test%'
  ));

select tests.check('17.4', 'circle activity carries no title',
  not exists (
    select 1 from get_circle_activity(:circle_id) a
    where to_jsonb(a)::text ilike '%whiplash%'
  ));

-- =====================================================================
-- 5. Member cannot edit another member's review
-- =====================================================================

-- still acting as :member_id; the review belongs to :other_id

do $$
declare
  v_rows integer;
begin
  update six_word_reviews
  set body = 'Tampered with by another member entirely'
  where id = '99999999-9999-4999-8999-999999999999';
  get diagnostics v_rows = row_count;
  perform tests.check('17.5', 'member cannot update another member''s review',
    v_rows = 0, 'rows affected: ' || v_rows);
end
$$;

do $$
declare
  v_rows integer;
begin
  delete from six_word_reviews where id = '99999999-9999-4999-8999-999999999999';
  get diagnostics v_rows = row_count;
  perform tests.check('17.5', 'member cannot delete another member''s review',
    v_rows = 0, 'rows affected: ' || v_rows);
end
$$;

do $$
declare
  v_blocked boolean := false;
begin
  begin
    insert into six_word_reviews (user_id, opening_id, body, word_count)
    values (
      '33333333-3333-4333-8333-333333333333',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'Impersonating another member right here', 6
    );
  exception when others then
    v_blocked := true;
  end;
  perform tests.check('17.5', 'member cannot post a review as someone else', v_blocked);
end
$$;

select tests.act_as_service();
select tests.check('17.5', 'the tampered review still has its original words',
  (select body from six_word_reviews where id = :tampered_id)
    = 'Quiet film loud silence after credits',
  'body: ' || (select body from six_word_reviews where id = :tampered_id));

-- =====================================================================
-- 6. Moderator can hide but not silently rewrite a review
-- =====================================================================

select tests.act_as(:moderator_id);

do $$
declare
  v_rows integer;
  v_state moderation_state;
begin
  update six_word_reviews
  set moderation_state = 'hidden'
  where id = '99999999-9999-4999-8999-999999999999';
  get diagnostics v_rows = row_count;

  select moderation_state into v_state
  from six_word_reviews where id = '99999999-9999-4999-8999-999999999999';

  perform tests.check('17.6', 'moderator CAN hide a review',
    v_rows = 1 and v_state = 'hidden', 'rows: ' || v_rows || ', state: ' || v_state);
end
$$;

do $$
declare
  v_body text;
begin
  update six_word_reviews
  set body = 'Silently rewritten by a moderator now'
  where id = '99999999-9999-4999-8999-999999999999';

  select body into v_body
  from six_word_reviews where id = '99999999-9999-4999-8999-999999999999';

  -- guard_six_word_review_update() restores the author's words, so the
  -- statement succeeds but the body is unchanged: a moderator can never
  -- put words in a member's mouth.
  perform tests.check('17.6', 'moderator cannot rewrite the body of a review',
    v_body = 'Quiet film loud silence after credits', 'body is now: ' || v_body);
end
$$;

select tests.act_as(:other_id);

do $$
declare
  v_state moderation_state;
begin
  update six_word_reviews
  set moderation_state = 'visible'
  where id = '99999999-9999-4999-8999-999999999999';

  select moderation_state into v_state
  from six_word_reviews where id = '99999999-9999-4999-8999-999999999999';

  -- The author owns the words; the moderator owns the visibility. An
  -- author must not be able to un-hide their own moderated review.
  perform tests.check('17.6', 'author cannot lift their own moderation_state',
    v_state = 'hidden', 'state is now: ' || v_state);
end
$$;

do $$
declare
  v_body text;
begin
  update six_word_reviews
  set body = 'Author edits inside the five minutes'
  where id = '99999999-9999-4999-8999-999999999999';

  select body into v_body
  from six_word_reviews where id = '99999999-9999-4999-8999-999999999999';

  perform tests.check('17.6', 'author CAN edit their own words inside the window',
    v_body = 'Author edits inside the five minutes', 'body: ' || v_body);
end
$$;

-- The five minute edit window closes (brief §7 six words rule 4).
select tests.act_as_service();
update six_word_reviews
set created_at = now() - interval '10 minutes'
where id = :tampered_id;

select tests.act_as(:other_id);

do $$
declare
  v_blocked boolean := false;
begin
  begin
    update six_word_reviews
    set body = 'Far too late to change these'
    where id = '99999999-9999-4999-8999-999999999999';
  exception when others then
    v_blocked := true;
  end;
  perform tests.check('17.6', 'author cannot edit after the five minute window', v_blocked);
end
$$;

do $$
declare
  v_rows integer;
begin
  delete from six_word_reviews where id = '99999999-9999-4999-8999-999999999999';
  get diagnostics v_rows = row_count;
  -- Deletion stays available at any time (brief §7 six words rule 5).
  perform tests.check('17.6', 'author CAN delete their own review at any time',
    v_rows = 1, 'rows: ' || v_rows);
end
$$;

-- =====================================================================
-- 7. Owner can programme an opening
-- =====================================================================

select tests.act_as(:owner_id);

select tests.check('17.7', 'owner CAN read films',
  (select count(*) from films) = 1);

select tests.check('17.7', 'owner CAN read opening_secrets',
  (select count(*) from opening_secrets) = 1);

select tests.check('17.7', 'owner CAN read playback_destinations',
  (select count(*) from playback_destinations) = 1);

do $$
declare
  v_film_id uuid;
  v_opening_id uuid;
  v_ok boolean := true;
  v_error text;
begin
  begin
    insert into films (title, runtime_minutes)
    values ('Owner Programmed Film', 95)
    returning id into v_film_id;

    insert into openings (
      opening_number, opens_at, status, runtime_minutes, no_trailer_storage_path
    ) values (
      2, now() + interval '1 day', 'draft', 95,
      'ffffffff-ffff-4fff-8fff-ffffffffffff.mp4'
    ) returning id into v_opening_id;

    insert into opening_secrets (opening_id, film_id)
    values (v_opening_id, v_film_id);

    insert into opening_cues (opening_id, cue, sort_order)
    values (v_opening_id, 'Safe cue', 0);
  exception when others then
    v_ok := false;
    v_error := sqlerrm;
  end;
  perform tests.check('17.7', 'owner CAN programme a complete opening', v_ok, v_error);
end
$$;

select tests.check('17.7', 'owner sees draft openings',
  (select count(*) from openings where status = 'draft') = 1,
  'drafts: ' || (select count(*) from openings where status = 'draft'));

select tests.act_as(:member_id);

select tests.check('17.7', 'a member never sees draft openings',
  (select count(*) from openings where status = 'draft') = 0,
  'drafts visible: ' || (select count(*) from openings where status = 'draft'));

do $$
declare
  v_blocked boolean := false;
begin
  begin
    insert into openings (
      opening_number, opens_at, status, runtime_minutes, no_trailer_storage_path
    ) values (99, now(), 'open', 100, 'nope.mp4');
  exception when others then
    v_blocked := true;
  end;
  perform tests.check('17.7', 'a member cannot programme an opening', v_blocked);
end
$$;

do $$
declare
  v_role profile_role;
begin
  update profiles set role = 'owner' where id = '22222222-2222-4222-8222-222222222222';
  select role into v_role from profiles where id = '22222222-2222-4222-8222-222222222222';
  -- guard_profile_role() pins the role for non-service callers.
  perform tests.check('17.7', 'a member cannot promote themselves to owner',
    v_role = 'member', 'role is now: ' || v_role);
end
$$;

do $$
declare
  v_blocked boolean := false;
begin
  begin
    update opening_secrets set approved_at = now()
    where opening_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    if not found then
      v_blocked := true;  -- RLS filtered the row, which is the same outcome
    end if;
  exception when others then
    v_blocked := true;
  end;
  perform tests.check('17.7', 'a member cannot approve an opening', v_blocked);
end
$$;
