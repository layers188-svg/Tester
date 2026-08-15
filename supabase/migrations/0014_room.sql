-- House Dark — 0014_room
--
-- The Room (handover 00_BUILD_BRIEF_FINAL.md §5). Three modes: Your
-- Review, Your Circle, The House. "No likes, scores, ranking or
-- comment-thread UI" and "No popularity ordering. Use
-- editorial/randomised/recent sampling without exposing engagement
-- counts."
--
-- Everything here is a read of six_word_reviews that the caller could
-- in principle assemble from the table under RLS. It exists as
-- functions so that the Circle/House split, the eligibility gate and
-- the ordering rule live in one place in SQL rather than being
-- reassembled — differently — by each caller.

-- ---------------------------------------------------------------------
-- shares_circle_with — do the caller and p_user_id sit in a Circle
-- together? This is what makes a voice "yours" rather than "the
-- House's".
-- ---------------------------------------------------------------------

create or replace function shares_circle_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from circle_members mine
    join circle_members theirs on theirs.circle_id = mine.circle_id
    where mine.user_id = auth.uid()
      and theirs.user_id = p_user_id
  );
$$;

revoke all on function shares_circle_with(uuid) from public;
grant execute on function shares_circle_with(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- is_room_eligible — the Room's front door.
-- ---------------------------------------------------------------------
--
-- Watched, and then decided either way: left six words, or chose
-- "Skip for now" (0013). Skipping is a decision and it opens the Room;
-- saying nothing at all does not. The member's own words are not a
-- price of entry — the rule is that the picture comes first, and that
-- the member's reaction is formed before anyone else's arrives.

create or replace function is_room_eligible(
  p_opening_id uuid,
  p_sealed_recommendation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from watches w
    where w.user_id = auth.uid()
      and w.state = 'watched'
      and (
        (p_opening_id is not null and w.opening_id = p_opening_id)
        or (p_sealed_recommendation_id is not null
            and w.sealed_recommendation_id = p_sealed_recommendation_id)
      )
      and (
        w.review_skipped_at is not null
        or exists (
          select 1 from six_word_reviews r
          where r.user_id = auth.uid()
            and (
              (p_opening_id is not null and r.opening_id = p_opening_id)
              or (p_sealed_recommendation_id is not null
                  and r.sealed_recommendation_id = p_sealed_recommendation_id)
            )
        )
      )
  );
$$;

revoke all on function is_room_eligible(uuid, uuid) from public;
grant execute on function is_room_eligible(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- get_room_voices — the words in the Room, other than the caller's.
-- ---------------------------------------------------------------------
--
-- `source` splits the two visible modes:
--
--   'circle'  someone the caller shares a Circle with. Their review may
--             be 'circle' or 'house_approved' visibility — a Circle
--             review is addressed to exactly these people.
--   'house'   everyone else, and only reviews an editor has approved
--             for the House. A 'circle' review never widens to the
--             House just because a stranger also watched the film.
--
-- Ordering is deliberately not engagement. Circle voices come recent
-- first, because in a Circle recency is the conversation. House voices
-- are shuffled by a per-day seed: no popularity signal, no fixed
-- hierarchy of members, and stable within a day so that scrolling the
-- Room and coming back does not reshuffle the field under the member.
--
-- No count of any kind is returned. There is nothing here to rank.

create or replace function get_room_voices(
  p_opening_id uuid,
  p_sealed_recommendation_id uuid,
  p_limit integer default 40
)
returns table (
  id uuid,
  body text,
  author_display_name text,
  source text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 100);
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  if (p_opening_id is null) = (p_sealed_recommendation_id is null) then
    raise exception 'Provide exactly one of opening or sealed recommendation.';
  end if;

  -- The Room does not open before the picture. Returning zero rows
  -- would be a quieter failure, but a caller that reaches this without
  -- eligibility has a bug in its routing, and a silent empty Room
  -- would hide it.
  if not is_room_eligible(p_opening_id, p_sealed_recommendation_id) then
    raise exception 'The Room is not open yet.';
  end if;

  return query
  with voices as (
    select
      r.id,
      r.body,
      p.display_name,
      shares_circle_with(r.user_id) as in_circle,
      r.visibility,
      r.created_at
    from six_word_reviews r
    join profiles p on p.id = r.user_id
    where r.user_id <> v_uid
      and r.moderation_state = 'visible'
      and (
        (p_opening_id is not null and r.opening_id = p_opening_id)
        or (p_sealed_recommendation_id is not null
            and r.sealed_recommendation_id = p_sealed_recommendation_id)
      )
  )
  (
    select v.id, v.body, v.display_name, 'circle'::text, v.created_at
    from voices v
    where v.in_circle and v.visibility in ('circle', 'house_approved')
    order by v.created_at desc
    limit v_limit
  )
  union all
  (
    select v.id, v.body, v.display_name, 'house'::text, v.created_at
    from voices v
    where not v.in_circle and v.visibility = 'house_approved'
    order by md5(v.id::text || current_date::text)
    limit v_limit
  );
end;
$$;

revoke all on function get_room_voices(uuid, uuid, integer) from public;
grant execute on function get_room_voices(uuid, uuid, integer) to authenticated;
