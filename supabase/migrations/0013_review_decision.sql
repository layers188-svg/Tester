-- House Dark — 0013_review_decision
--
-- "Skip for now" (handover 00_BUILD_BRIEF_FINAL.md §3 "Post watch"):
--
--   Allow 1 to 6 words, optional.
--   Actions: LEAVE MY SIX WORDS / SKIP FOR NOW
--   Skip still unlocks The Room. Do not guilt the member and do not
--   create a fake blank review.
--
-- The last sentence rules out the obvious implementation. A skip cannot
-- be an empty six_word_reviews row: that row would be a review with no
-- words, and it would surface in The Room, in the Library and in
-- get_house_words() as a blank quote. So the decision is recorded on
-- the watch instead — the same grain the review states are keyed to
-- (a member, and one opening or one sealed recommendation).
--
-- This gives the product-state-machine.json trio directly:
--   review_undecided  watched, review_skipped_at null, no review row
--   review_skipped    watched, review_skipped_at set
--   review_submitted  watched, a six_word_reviews row exists
--
-- Room eligibility is watched AND a decision made either way. See
-- src/lib/opening/eligibility.ts, which is the one place that rule is
-- expressed for the app.

alter table watches
  add column if not exists review_skipped_at timestamptz;

comment on column watches.review_skipped_at is
  'When the member chose "Skip for now" instead of leaving six words. Unlocks The Room without inventing a review.';

-- Writing six words after a skip retracts the skip, so the member is
-- never recorded as having both decided nothing and decided something.
-- A trigger rather than route code: the six-words route, the sealed
-- recommendation path and any future import all go through the table.
create or replace function clear_review_skip_on_submit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update watches
  set review_skipped_at = null
  where user_id = new.user_id
    and review_skipped_at is not null
    and (
      (new.opening_id is not null and opening_id = new.opening_id)
      or (new.sealed_recommendation_id is not null
          and sealed_recommendation_id = new.sealed_recommendation_id)
    );
  return new;
end;
$$;

drop trigger if exists six_word_reviews_clear_skip on six_word_reviews;
create trigger six_word_reviews_clear_skip
  after insert on six_word_reviews
  for each row
  execute function clear_review_skip_on_submit();

-- ---------------------------------------------------------------------
-- skip_review — record the decision without writing a review.
-- ---------------------------------------------------------------------
--
-- Requires an existing watch in state 'watched': the member cannot skip
-- a review for a picture the House has no record of them watching, and
-- that also keeps the Room's front door (watched + decided) from being
-- opened by a single POST.

create or replace function skip_review(
  p_opening_id uuid,
  p_sealed_recommendation_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_watch_id uuid;
  v_skipped_at timestamptz := now();
begin
  if v_uid is null then
    raise exception 'Not authenticated.';
  end if;

  if (p_opening_id is null) = (p_sealed_recommendation_id is null) then
    raise exception 'Provide exactly one of opening or sealed recommendation.';
  end if;

  select id into v_watch_id
  from watches
  where user_id = v_uid
    and state = 'watched'
    and (
      (p_opening_id is not null and opening_id = p_opening_id)
      or (p_sealed_recommendation_id is not null
          and sealed_recommendation_id = p_sealed_recommendation_id)
    );

  if v_watch_id is null then
    raise exception 'Mark the picture watched first.';
  end if;

  update watches
  set review_skipped_at = coalesce(review_skipped_at, v_skipped_at),
      updated_at = now()
  where id = v_watch_id
  returning review_skipped_at into v_skipped_at;

  return v_skipped_at;
end;
$$;

revoke all on function skip_review(uuid, uuid) from public;
grant execute on function skip_review(uuid, uuid) to authenticated;
