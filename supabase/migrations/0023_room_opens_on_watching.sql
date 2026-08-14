-- The Room opens on watching, not on writing.
--
-- The rule was: you cannot read anybody else's six words until your own
-- are on record. The rule is now: you cannot read anybody else's six
-- words until you have seen the film.
--
-- WHY THIS IS NOT A WEAKENING
--
-- What the old rule protected was never the writing. It was the
-- member's own reaction to the film forming before outside opinion
-- reshaped it — "the product exists so someone can meet a film before
-- outside opinion reshapes it". Watching is the moment that reaction
-- forms. Publishing is only the evidence of it, and demanding evidence
-- turns an invitation into a toll: a member who genuinely has nothing
-- to say was being told they could never see what anybody else thought.
--
-- So the protection stands exactly where it stood. Nobody reads the
-- Room before the film. What changes is that they are no longer made to
-- pay for it in words they did not want to write.
--
-- Directed by Logan on 14 August, after the skip path was built.
--
-- WHAT DOES NOT CHANGE
--
--   * The reveal gate. `has_revealed` still governs the title, here and
--     everywhere else, and this migration does not touch it.
--   * can_view_six_word_review, the RLS policy underneath all of this.
--     It already gated 'circle' visibility on has_watched() rather than
--     on publishing, so the row-level rule and the function rule now
--     finally agree with each other. This closes a discrepancy rather
--     than opening one.
--   * The ambiguity of an empty result. A member who has not watched
--     still gets zero rows, and still cannot tell a shut room from an
--     empty one.

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
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  -- Seen it, in this member's own record. Not "has written about it".
  if not has_watched(p_opening_id, null) then
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
  'Every visible six-word review for an opening, for a member who has watched it. Returns no rows when they have not, which is how the caller tells a shut room from an empty one. Writing is optional; watching is not.';

-- The Room header needs to know both, because the page says different
-- things to a member who watched and skipped than to one who wrote.
drop function if exists get_room_opening(uuid);

create function get_room_opening(p_opening_id uuid)
returns table (
  opening_number integer,
  title text,
  release_year integer,
  has_revealed boolean,
  has_published boolean,
  has_watched boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  return query
  select
    o.opening_number,
    case when rev.user_id is not null then f.title else null end,
    case when rev.user_id is not null then f.release_year else null end,
    (rev.user_id is not null),
    exists (
      select 1
      from six_word_reviews r
      where r.opening_id = o.id
        and r.user_id = v_uid
        and r.moderation_state = 'visible'
    ),
    public.has_watched(o.id, null)
  from openings o
  left join opening_secrets os on os.opening_id = o.id
  left join films f on f.id = os.film_id
  left join reveals rev on rev.opening_id = o.id and rev.user_id = v_uid
  where o.id = p_opening_id;
end;
$$;

comment on function get_room_opening(uuid) is
  'Header for the Room: opening number always, title and year only where this member has revealed them, plus whether they have watched it and whether they have published their own six words. Watching opens the Room; publishing only decides whether the member has a line of their own in it. Read only — unlike /api/reveal it never writes a reveal.';

grant execute on function get_room_opening(uuid) to authenticated;
