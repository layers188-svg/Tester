-- House Dark — 0015_circle_creator_can_read
--
-- Creating a Circle failed for every member who was not the house
-- owner (brief §17 item 5, Journey C).
--
-- The insert policy was right and the insert succeeded. The read back
-- was the problem: /api/circles does `insert(...).select().single()`,
-- and circles_select_member allowed a row to be read only by
-- `is_circle_member(id) or is_owner()`. At the instant of the insert
-- the creator is not yet a member — the circle_members row is written
-- by the next statement — so the select returned nothing, `.single()`
-- failed, and the member was told "Could not create the Circle." The
-- Circle itself was left behind, created and invisible.
--
-- This escaped the policy tests because every Circle in them is created
-- by the service role, which bypasses RLS entirely, so the one ordering
-- that matters was never exercised. supabase/tests/06_circle_creation.sql
-- now does it as an ordinary member.
--
-- The fix says what was always meant: you can see a Circle you created.
-- That is not a widening — a creator who is not a member can only
-- happen in the instant between those two statements, or if they later
-- leave, in which case seeing the Circle they started is correct.

drop policy if exists circles_select_member on circles;

create policy circles_select_member on circles
  for select using (
    is_circle_member(id)
    or created_by = auth.uid()
    or is_owner()
  );
