-- House Dark — 0019_circle_six_words
--
-- Friend activity on Circle: what the people you share a Circle with
-- have said about a film, sealed until you have said yours.
--
-- `get_my_circles_activity` could not carry this. It returns who did
-- something and when, with no film and no words, so there was nothing
-- to seal and nothing to unseal. This returns the review itself and
-- decides, per row and per viewer, how much of it may be seen.
--
-- Two separate gates, and they are not the same gate:
--
--   * The BODY is withheld until the viewer has published their own six
--     words on that opening. Same rule as After Credits: your reaction
--     comes first, so nobody arrives having already read what to think.
--   * The TITLE is withheld until the viewer has revealed that opening.
--     A member can legitimately be told "Freya left six words after
--     this film" about a night they never opened, and that sentence
--     must not name the film. These two conditions come apart — a
--     member can reveal without reviewing — so they are checked
--     independently rather than collapsed into one flag.
--
-- Everything else follows the rules already in force: nothing private,
-- nothing moderated away, and never the caller's own rows, which
-- belong to After Credits rather than to friend activity.

create or replace function get_circle_six_words()
returns table (
  review_id uuid,
  opening_id uuid,
  opening_number integer,
  actor_display_name text,
  title text,
  body text,
  unlocked boolean
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
    r.id,
    o.id,
    o.opening_number,
    p.display_name,
    -- Title only where the viewer has opened that night themselves.
    case when rev.user_id is not null then f.title else null end,
    -- Words only where the viewer has left their own.
    case when mine.id is not null then r.body else null end,
    (mine.id is not null)
  from six_word_reviews r
  join openings o on o.id = r.opening_id
  join profiles p on p.id = r.user_id
  left join opening_secrets os on os.opening_id = o.id
  left join films f on f.id = os.film_id
  left join reveals rev on rev.opening_id = o.id and rev.user_id = v_uid
  left join six_word_reviews mine
    on mine.opening_id = o.id
   and mine.user_id = v_uid
   and mine.moderation_state = 'visible'
  where r.user_id <> v_uid
    and r.moderation_state = 'visible'
    and r.visibility <> 'private'
    and exists (
      select 1
      from circle_members ours
      join circle_members theirs on theirs.circle_id = ours.circle_id
      where ours.user_id = v_uid and theirs.user_id = r.user_id
    )
  order by r.created_at desc;
end;
$$;

comment on function get_circle_six_words() is
  'Six words from people the caller shares a Circle with. The body is withheld until the caller has published their own on that opening; the title is withheld until the caller has revealed it. The two are checked independently because a member can reveal without reviewing.';

revoke all on function get_circle_six_words() from public;
grant execute on function get_circle_six_words() to authenticated;
