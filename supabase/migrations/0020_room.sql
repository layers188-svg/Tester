-- House Dark — 0020_room
--
-- The Room needs a header: opening number, title, year. Nothing else in
-- the product could give it one.
--
-- `/api/reveal/*` is the only path that returns a title, and it is a
-- POST that writes a `reveals` row — correct for the moment a member
-- chooses to know, wrong for a page they walk back into later, where it
-- would rewrite the reveal on every visit and make "when did you first
-- know this film" unanswerable. `get_my_library` already returns titles
-- safely but only for rows the member has a `watches` row for, and it
-- returns the whole collection to answer one question.
--
-- So: one function, one opening, and the same rule as everywhere else —
-- the title exists in the result only if this member has personally
-- revealed it. A member who somehow reaches /room for a night they
-- never opened gets the row with a null title, which the page turns
-- into a redirect rather than a blank heading.
--
-- `has_published` is here rather than inferred from get_after_credits
-- because the two questions come apart. get_after_credits returns no
-- rows both when the room is shut and when the caller has not spoken;
-- that ambiguity is fine there (it has one caller who wants exactly
-- that), but the Room page needs to tell "you have not written yours"
-- from "you have, and nobody else has" so it can send the first case
-- back to write rather than showing them an empty room they earned.

create or replace function get_room_opening(p_opening_id uuid)
returns table (
  opening_number integer,
  title text,
  release_year integer,
  has_revealed boolean,
  has_published boolean
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
    )
  from openings o
  left join opening_secrets os on os.opening_id = o.id
  left join films f on f.id = os.film_id
  left join reveals rev on rev.opening_id = o.id and rev.user_id = v_uid
  where o.id = p_opening_id;
end;
$$;

comment on function get_room_opening(uuid) is
  'Header for the Room: opening number always, title and year only where this member has revealed them, plus whether they have published their own six words. Read only — unlike /api/reveal it never writes a reveal.';

revoke all on function get_room_opening(uuid) from public;
grant execute on function get_room_opening(uuid) to authenticated;
