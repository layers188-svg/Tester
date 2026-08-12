-- House Dark — brief §16 resilience rule 3, the recommendations half.
--
-- "Prevent duplicate recommendations and reviews on retry." Reviews and
-- watches have carried unique indexes since 0001. Recommendations had
-- nothing but a disabled button, which does not survive the case that
-- matters: the send reached the server, the response was lost, and the
-- member pressed send again.

\set member_id      '''22222222-2222-4222-8222-222222222222'''
\set other_id       '''33333333-3333-4333-8333-333333333333'''
\set retry_key      '''abcdabcd-abcd-4bcd-8bcd-abcdabcdabcd'''

-- `films` is owner-only, so a member counting it sees zero whatever the
-- truth is. The baseline is taken as the service role and compared as
-- the service role; only the sends themselves run as the member.
select tests.act_as_service();

create temp table retry_state as
select (select count(*) from films) as films_before;

select tests.act_as(:member_id);

do $$
declare
  v_first uuid;
  v_second uuid;
  v_first_created boolean;
  v_second_created boolean;
  v_count integer;
begin
  select recommendation_id, created into v_first, v_first_created
  from create_sealed_recommendation(
    'A Film Sent Twice', 1998, 100,
    array['33333333-3333-4333-8333-333333333333']::uuid[],
    'Sent once, pressed twice.',
    array['Rain']::text[],
    null, null,
    'abcdabcd-abcd-4bcd-8bcd-abcdabcdabcd'::uuid
  );

  -- The retry: same key, same everything.
  select recommendation_id, created into v_second, v_second_created
  from create_sealed_recommendation(
    'A Film Sent Twice', 1998, 100,
    array['33333333-3333-4333-8333-333333333333']::uuid[],
    'Sent once, pressed twice.',
    array['Rain']::text[],
    null, null,
    'abcdabcd-abcd-4bcd-8bcd-abcdabcdabcd'::uuid
  );

  perform tests.check('16.3R', 'a retry returns the same recommendation',
    v_first = v_second, 'first: ' || v_first || ' second: ' || v_second);

  perform tests.check('16.3R', 'the first send reports that it created the recommendation',
    v_first_created, 'created was false on the first call');

  -- This is the flag the API route keys the recipients' email off, so
  -- it is the difference between one email and two.
  perform tests.check('16.3R', 'the retry reports that it created nothing',
    not v_second_created, 'created was true on the replay');

  select count(*) into v_count
  from sealed_recommendations
  where sender_id = '22222222-2222-4222-8222-222222222222'
    and idempotency_key = 'abcdabcd-abcd-4bcd-8bcd-abcdabcdabcd'::uuid;
  perform tests.check('16.3R', 'only one recommendation row exists',
    v_count = 1, 'rows: ' || v_count);

  select count(*) into v_count
  from sealed_recommendation_recipients where recommendation_id = v_first;
  perform tests.check('16.3R', 'the recipient is not added twice',
    v_count = 1, 'recipients: ' || v_count);

  select count(*) into v_count
  from sealed_recommendation_cues where recommendation_id = v_first;
  perform tests.check('16.3R', 'the cues are not duplicated',
    v_count = 1, 'cues: ' || v_count);
end
$$;

-- A replay must not quietly mint a second films row either.
select tests.act_as_service();

do $$
declare
  v_before integer;
  v_after integer;
begin
  select films_before into v_before from retry_state;
  select count(*) into v_after from films;
  perform tests.check('16.3R', 'the retry does not create a second film',
    v_after = v_before + 1,
    'films before: ' || v_before || ' after: ' || v_after);
end
$$;

select tests.act_as(:member_id);

-- A genuinely new send, with a new key, must still go through. The
-- guard is against repeats, not against sending the same film twice on
-- purpose.
do $$
declare
  v_third uuid;
  v_created boolean;
begin
  select recommendation_id, created into v_third, v_created
  from create_sealed_recommendation(
    'A Film Sent Twice', 1998, 100,
    array['33333333-3333-4333-8333-333333333333']::uuid[],
    null, array[]::text[], null, null,
    '11112222-3333-4444-8555-666677778888'::uuid
  );

  perform tests.check('16.3R', 'a new key sends a new recommendation',
    v_created and v_third is not null, 'created: ' || coalesce(v_created::text, 'null'));
end
$$;

-- Sending without a key at all still works: the column is nullable and
-- the unique index is partial, so older clients are not locked out.
do $$
declare
  v_a uuid;
  v_b uuid;
begin
  select recommendation_id into v_a from create_sealed_recommendation(
    'No Key Film', 1990, 90,
    array['33333333-3333-4333-8333-333333333333']::uuid[],
    null, array[]::text[], null, null, null
  );
  select recommendation_id into v_b from create_sealed_recommendation(
    'No Key Film', 1990, 90,
    array['33333333-3333-4333-8333-333333333333']::uuid[],
    null, array[]::text[], null, null, null
  );

  perform tests.check('16.3R', 'two keyless sends are still two recommendations',
    v_a <> v_b, 'keyless sends collapsed into one');
end
$$;

-- One member's key must not collide with another's.
select tests.act_as(:other_id);

do $$
declare
  v_theirs uuid;
  v_created boolean;
begin
  select recommendation_id, created into v_theirs, v_created
  from create_sealed_recommendation(
    'Another Member Same Key', 2005, 95,
    array['22222222-2222-4222-8222-222222222222']::uuid[],
    null, array[]::text[], null, null,
    'abcdabcd-abcd-4bcd-8bcd-abcdabcdabcd'::uuid
  );

  perform tests.check('16.3R', 'the same key from another member is a separate send',
    v_created, 'a second member''s send was treated as a replay');
end
$$;

select tests.act_as_service();
