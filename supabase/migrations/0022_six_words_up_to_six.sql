-- A member's response is up to six words, not exactly six.
--
-- The rule was `word_count = 6`, which made a form out of a reaction.
-- "Exhausting." is a complete answer to a film; so is "I need a
-- minute." Forcing them to six produces padding, and padding is the
-- one thing a six-word review is supposed to be incapable of.
--
-- Zero is still not a row. A member who has nothing to say skips, and
-- skipping records nothing at all — an empty response would be a
-- member appearing in the Room having said nothing, which is worse
-- than not appearing.
--
-- This is deliberately NOT the same rule as the house's own six words
-- about a film. `film_records.six_word_plot` stays at exactly six and
-- keeps its own constraint: that one is the house writing to a fixed
-- form, and the form is the product. See CLAUDE.md, "Search (six words
-- before)".

alter table six_word_reviews
  drop constraint if exists six_word_reviews_word_count;

alter table six_word_reviews
  add constraint six_word_reviews_word_count
  check (word_count between 1 and 6);

comment on column six_word_reviews.word_count is
  'One to six. A member says as much as they mean and no more; the house''s own premise in film_records.six_word_plot is exactly six, which is a different rule on purpose.';
