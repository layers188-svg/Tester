-- House Dark — 0011_six_word_reviews_anon
--
-- can_view_six_word_review() returned true for any 'house_approved'
-- review without first checking that there is a caller at all, so an
-- anonymous visitor could SELECT the six_word_reviews table directly
-- and read `user_id`, `opening_id` and `created_at` alongside the body
-- — tying a member's identity to a quote shown on the public site.
--
-- The public site never needed that access: it reads approved words
-- through get_house_words(), a security-definer function that returns
-- bodies and nothing else. So require an authenticated caller here.
-- Signed-in members keep seeing approved reviews in-app exactly as
-- before; anonymous visitors now get zero rows from the table and must
-- go through the function.
--
-- Regression cover: supabase/tests/01_rls.sql, "anon cannot read
-- six_word_reviews directly" and "anon CAN read approved bodies via
-- get_house_words()".

create or replace function can_view_six_word_review(
  p_author_id uuid,
  p_opening_id uuid,
  p_sealed_recommendation_id uuid,
  p_visibility review_visibility
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    -- No session, no rows. The public site uses get_house_words().
    when auth.uid() is null then false
    when auth.uid() = p_author_id then true
    when p_visibility = 'house_approved' then true
    when p_visibility = 'private' then false
    -- 'circle': eligible once the viewer has watched the same film,
    -- through the same opening or the same sealed recommendation.
    when p_visibility = 'circle' then has_watched(p_opening_id, p_sealed_recommendation_id)
    else false
  end;
$$;
