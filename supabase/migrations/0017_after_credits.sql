-- House Dark — 0017_after_credits
--
-- After Credits: every member's six words on the same film, opened only
-- to a member who has already written their own.
--
-- Why a function rather than a policy. The rule is not "who may read
-- this row" but "what must the reader have done first", and it depends
-- on a row the reader owns elsewhere in the same table. Expressed as
-- RLS it would be a self-referencing policy evaluated per row; as a
-- security-definer function it is one check, once, before any row is
-- considered. The table's own policies stay closed underneath.
--
-- Two deliberate decisions, both reversals of what the schema assumed:
--
--   * `visibility` is now the member's own privacy control rather than
--     an audience selector. Anything that is not 'private' is shown to
--     the whole house here, because the point of After Credits is
--     seeing how differently people felt about the same film. A member
--     who sets 'private' is excluded and stays excluded.
--   * `moderation_state` becomes a removal tool rather than a gate.
--     Nothing waits for approval before a member's own room can hear
--     it; a moderator can hide or remove afterwards, and 0006's
--     policies still govern who may do that.
--
-- The empty result is load-bearing. A member who has published always
-- appears in their own result, so zero rows means exactly one thing:
-- you have not written yours yet. The caller does not need a second
-- query to tell "the room is shut" from "the room is empty".

create or replace function get_after_credits(p_opening_id uuid)
returns table (
  review_id uuid,
  body text,
  display_name text,
  is_mine boolean,
  in_my_circle boolean,
  written_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_has_mine boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  select exists (
    select 1
    from six_word_reviews r
    where r.opening_id = p_opening_id
      and r.user_id = v_uid
      and r.moderation_state = 'visible'
  ) into v_has_mine;

  if not v_has_mine then
    return;
  end if;

  return query
  select
    r.id,
    r.body,
    p.display_name,
    (r.user_id = v_uid),
    exists (
      select 1
      from circle_members mine
      join circle_members theirs on theirs.circle_id = mine.circle_id
      where mine.user_id = v_uid
        and theirs.user_id = r.user_id
        and r.user_id <> v_uid
    ),
    r.created_at
  from six_word_reviews r
  join profiles p on p.id = r.user_id
  where r.opening_id = p_opening_id
    and r.moderation_state = 'visible'
    and r.visibility <> 'private'
  -- The member's own words first, then the room in the order it spoke.
  order by (r.user_id = v_uid) desc, r.created_at asc;
end;
$$;

comment on function get_after_credits(uuid) is
  'Every visible six-word review for an opening, but only for a member who has already published their own. Returns no rows when they have not, which is how the caller tells a shut room from an empty one.';

revoke all on function get_after_credits(uuid) from public;
grant execute on function get_after_credits(uuid) to authenticated;
