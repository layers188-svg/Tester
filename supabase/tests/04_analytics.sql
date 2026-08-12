-- House Dark — analytics_events policy and shape tests (brief §15).
--
-- §15 says track twelve events and never let a title, provider URL,
-- personal note, review body or secret film identifier reach analytics.
-- The build enforces the second half through the table's shape rather
-- than a runtime scan, so these tests check the shape actually holds:
-- that there is nowhere for a title to sit, that members can neither
-- read nor forge house instrumentation, and that erasing a member
-- erases their trail.

\set owner_id       '''11111111-1111-4111-8111-111111111111'''
\set member_id      '''22222222-2222-4222-8222-222222222222'''
\set other_id       '''33333333-3333-4333-8333-333333333333'''

select tests.act_as_service();

-- A member of this suite's own, so the erasure case at the bottom does
-- not delete anyone the earlier suites are still using.
\set erasure_id '''77777777-7777-4777-8777-777777777777'''

insert into auth.users (id, email) values (:erasure_id, 'erasure@housedark.test');
insert into profiles (id, display_name, timezone, role)
values (:erasure_id, 'Erasure Fixture', 'UTC', 'member');

insert into analytics_events (event, actor_id, opening_number)
values
  ('sign_in_completed', :member_id, null),
  ('opening_viewed', :member_id, 1),
  ('reveal_completed', :member_id, 1),
  ('sign_in_completed', :erasure_id, null);

insert into analytics_events (event, actor_id, detail)
values ('screening_attendance_response', :member_id, 'attending');

-- ---------------------------------------------------------------------
-- Shape: there is no column a title could occupy.
-- ---------------------------------------------------------------------

select tests.check('15.1', 'analytics_events has no free text column',
  (select count(*) from information_schema.columns
     where table_name = 'analytics_events'
       and data_type in ('text', 'character varying', 'json', 'jsonb')
       and column_name <> 'detail') = 0,
  'unexpected: ' || coalesce((select string_agg(column_name, ', ')
     from information_schema.columns
     where table_name = 'analytics_events'
       and data_type in ('text', 'character varying', 'json', 'jsonb')
       and column_name <> 'detail'), '(none)'));

select tests.check('15.2', 'analytics_events references neither a film nor an opening',
  (select count(*) from information_schema.columns
     where table_name = 'analytics_events'
       and column_name in ('film_id', 'opening_id', 'sealed_recommendation_id')) = 0,
  'columns present that must not be');

-- The one text column is closed by a CHECK, so even a service-role
-- write cannot put a title in it.
do $$
declare
  v_rejected boolean := false;
begin
  begin
    insert into analytics_events (event, actor_id, detail)
    values ('opening_viewed', '22222222-2222-4222-8222-222222222222', 'Whiplash');
  exception when check_violation then
    v_rejected := true;
  end;
  perform tests.check('15.3', 'the detail column rejects anything off the allowlist',
    v_rejected, 'a free-text detail was accepted');
end
$$;

select tests.check('15.4', 'the allowlisted detail values are accepted',
  (select count(*) from analytics_events where detail = 'attending') = 1,
  'rows: ' || (select count(*) from analytics_events where detail is not null));

-- ---------------------------------------------------------------------
-- Reads: owner only. This is house instrumentation, not a member
-- feature — a member must not see even their own trail.
-- ---------------------------------------------------------------------

select tests.act_as(:member_id);

select tests.check('15.5', 'a member cannot read analytics events',
  (select count(*) from analytics_events) = 0,
  'rows: ' || (select count(*) from analytics_events));

-- ---------------------------------------------------------------------
-- Writes: service role only. Without this a member could post directly
-- to PostgREST and invent house metrics.
-- ---------------------------------------------------------------------

do $$
declare
  v_blocked boolean := false;
begin
  begin
    insert into analytics_events (event, actor_id)
    values ('reveal_completed', '22222222-2222-4222-8222-222222222222');
  exception when insufficient_privilege then
    v_blocked := true;
  end;
  perform tests.check('15.6', 'a member cannot forge an analytics event',
    v_blocked, 'a member insert was accepted');
end
$$;

select tests.act_as_anon();

select tests.check('15.7', 'anon cannot read analytics events',
  (select count(*) from analytics_events) = 0,
  'rows: ' || (select count(*) from analytics_events));

select tests.act_as(:owner_id);

select tests.check('15.8', 'the owner can read analytics events',
  (select count(*) from analytics_events) >= 5,
  'rows: ' || (select count(*) from analytics_events));

-- ---------------------------------------------------------------------
-- The /desk/analytics readout. security definer bypasses RLS, so the
-- function has to do its own owner check — if it did not, any member
-- could read house metrics through it.
-- ---------------------------------------------------------------------

select tests.check('15.9', 'the owner gets an aggregate summary',
  (select count(*) from get_analytics_summary(30)) = 4,
  'event groups: ' || (select count(*) from get_analytics_summary(30)));

select tests.check('15.10', 'the summary counts occurrences and distinct members',
  (select occurrences = 2 and members = 2
     from get_analytics_summary(30) where event = 'sign_in_completed'),
  'sign_in_completed: ' || coalesce((select occurrences || '/' || members
     from get_analytics_summary(30) where event = 'sign_in_completed'), '(none)'));

select tests.act_as(:member_id);

do $$
declare
  v_blocked boolean := false;
begin
  begin
    perform * from get_analytics_summary(30);
  exception when others then
    v_blocked := true;
  end;
  perform tests.check('15.11', 'a member cannot call the analytics summary',
    v_blocked, 'a member read the summary');
end
$$;

-- ---------------------------------------------------------------------
-- Erasure: brief §14. Deleting a member takes their behavioural trail
-- with them rather than leaving it orphaned.
-- ---------------------------------------------------------------------

select tests.act_as_service();

delete from profiles where id = :erasure_id;

select tests.check('15.12', 'deleting a member deletes their analytics events',
  (select count(*) from analytics_events where actor_id = :erasure_id) = 0,
  'rows left: ' || (select count(*) from analytics_events where actor_id = :erasure_id));

select tests.check('15.13', 'other members'' events survive that deletion',
  (select count(*) from analytics_events where actor_id = :member_id) = 4,
  'rows: ' || (select count(*) from analytics_events where actor_id = :member_id));

select tests.act_as_service();
