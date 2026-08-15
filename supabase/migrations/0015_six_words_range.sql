-- House Dark — 0015_six_words_range
--
-- Handover 00_BUILD_BRIEF_FINAL.md §3 "Post watch":
--
--   Allow 1 to 6 words, optional.
--
-- and acceptance test B: "Submit 1 to 6 words works. Seven words is
-- rejected."
--
-- The table was built to the earlier rule, `word_count = 6`, so a
-- four-word reaction was refused by the database. Six is still the
-- ceiling and the prompt is still called six words — what changes is
-- that a member who only had three is no longer told their reaction is
-- malformed at the exact moment they are asked what stayed with them.
--
-- Existing rows all have word_count = 6 and stay valid, so this widens
-- without a backfill.

alter table six_word_reviews
  drop constraint if exists six_word_reviews_word_count;

alter table six_word_reviews
  add constraint six_word_reviews_word_count
  check (word_count between 1 and 6);

comment on constraint six_word_reviews_word_count on six_word_reviews is
  'One to six words (handover §3). Seven is rejected here as well as in the route.';
