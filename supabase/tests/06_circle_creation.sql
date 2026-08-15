-- House Dark — creating a Circle as an ordinary member (brief §17 item 5).
--
-- Every other Circle in these suites is created by the service role,
-- which bypasses RLS. That hid a real failure: the API inserts the
-- Circle and immediately reads it back, and the creator is not a member
-- until the statement after. This exercises the same order a member's
-- session does.

\set member_id      '''22222222-2222-4222-8222-222222222222'''
\set outsider_id    '''44444444-4444-4444-8444-444444444444'''

select tests.act_as(:member_id);

do $$
declare
  v_id uuid;
  v_readable integer;
  v_error text;
begin
  begin
    -- Exactly what /api/circles does: insert, then read back.
    insert into circles (name, created_by)
    values ('Member Made This', '22222222-2222-4222-8222-222222222222')
    returning id into v_id;

    select count(*) into v_readable from circles where id = v_id;
  exception when others then
    v_error := sqlerrm;
  end;

  perform tests.check('17.5', 'a member can create a Circle',
    v_id is not null, coalesce(v_error, 'no id returned'));

  -- The assertion that actually failed in the product: the creator
  -- could insert but not read the row back, so the API reported
  -- failure for a Circle it had just made.
  perform tests.check('17.5', 'the creator can read it back before joining it',
    v_readable = 1, 'rows visible to the creator: ' || coalesce(v_readable::text, 'error'));

  -- And the membership row the API writes next must be accepted too.
  begin
    insert into circle_members (circle_id, user_id, role)
    values (v_id, '22222222-2222-4222-8222-222222222222', 'organiser');
    perform tests.check('17.5', 'the creator can then join their own Circle', true, '');
  exception when others then
    perform tests.check('17.5', 'the creator can then join their own Circle', false, sqlerrm);
  end;
end
$$;

-- Nobody else gains anything from the widened read.
select tests.act_as(:outsider_id);

select tests.check('17.5', 'an outsider still cannot see that Circle',
  (select count(*) from circles where name = 'Member Made This') = 0,
  'rows: ' || (select count(*) from circles where name = 'Member Made This'));

select tests.act_as_service();
