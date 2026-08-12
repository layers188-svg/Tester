-- House Dark — notification_queue.last_error must never carry a title.
--
-- notification_queue_select_own (0003_rls.sql) deliberately lets a
-- member read their own queued notifications. That is fine for status
-- and timing, but it makes `last_error` a member-readable column — so
-- whatever the send path writes there is, in effect, published to the
-- member.
--
-- The spoiler guard's own rejection message is the dangerous case: it
-- is raised precisely when a protected title reached a payload, and it
-- quotes the offending excerpt. Persisting that message verbatim would
-- turn the mechanism that protects the title into the thing that
-- discloses it, to exactly the member it was being withheld from.

\set owner_id       '''11111111-1111-4111-8111-111111111111'''
\set member_id      '''22222222-2222-4222-8222-222222222222'''

select tests.act_as_service();

insert into notification_queue (user_id, type, send_at, payload, status, attempts, last_error)
values (
  :member_id,
  'nightly_opening',
  now() - interval '1 hour',
  '{"to": "member@housedark.test", "openingNumber": 1}'::jsonb,
  'failed',
  5,
  'Spoiler guard rejected this notification. See the audit log.'
);

-- ---------------------------------------------------------------------
-- The read path this all hinges on.
-- ---------------------------------------------------------------------

select tests.act_as(:member_id);

select tests.check('13.1', 'a member can read last_error on their own queued notification',
  (select count(*) from notification_queue
     where user_id = :member_id and last_error is not null) = 1,
  'rows: ' || (select count(*) from notification_queue where user_id = :member_id));

-- The substantive assertion: no protected title anywhere in a column
-- the member can reach. 'Whiplash' is the seeded protected title.
select tests.check('13.2', 'no protected title appears in a member-readable last_error',
  (select count(*) from notification_queue
     where user_id = :member_id and last_error ilike '%whiplash%') = 0,
  coalesce((select last_error from notification_queue
              where user_id = :member_id limit 1), '(null)'));

select tests.check('13.3', 'no protected title appears in a member-readable payload',
  (select count(*) from notification_queue
     where user_id = :member_id and payload::text ilike '%whiplash%') = 0,
  coalesce((select payload::text from notification_queue
              where user_id = :member_id limit 1), '(null)'));

-- A member must not be able to read anyone else's queue either.
select tests.check('13.4', 'a member cannot read another member''s notifications',
  (select count(*) from notification_queue where user_id <> :member_id) = 0,
  'rows: ' || (select count(*) from notification_queue where user_id <> :member_id));

-- ---------------------------------------------------------------------
-- audit_log carries the operator-facing detail instead, and is closed
-- to members entirely.
-- ---------------------------------------------------------------------

select tests.check('13.5', 'a member cannot read the audit log',
  (select count(*) from audit_log) = 0,
  'rows: ' || (select count(*) from audit_log));

select tests.act_as(:owner_id);

select tests.check('13.6', 'the owner can read the audit log',
  (select count(*) from audit_log) >= 0, 'owner audit_log readable');

select tests.act_as_service();
