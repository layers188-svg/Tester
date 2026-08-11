-- House Dark — 0002_functions
-- Helper functions used by Row Level Security policies. Keeping this
-- logic in SQL functions (rather than repeating it inline in every
-- policy) is what makes the policies in 0003_rls.sql auditable.

create or replace function current_profile_role()
returns profile_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'owner', false);
$$;

create or replace function is_moderator_or_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from profiles where id = auth.uid()) in ('owner', 'moderator'),
    false
  );
$$;

-- Is the current user a member of the given circle?
create or replace function is_circle_member(p_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from circle_members
    where circle_id = p_circle_id and user_id = auth.uid()
  );
$$;

-- Do the current user and the given user share any circle?
create or replace function shares_circle_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from circle_members a
    join circle_members b on a.circle_id = b.circle_id
    where a.user_id = auth.uid() and b.user_id = p_user_id
  );
$$;

-- Has the current user watched the given opening or sealed recommendation?
create or replace function has_watched(p_opening_id uuid, p_sealed_recommendation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from watches
    where user_id = auth.uid()
      and state = 'watched'
      and (
        (p_opening_id is not null and opening_id = p_opening_id)
        or (p_sealed_recommendation_id is not null and sealed_recommendation_id = p_sealed_recommendation_id)
      )
  );
$$;

-- Is the current user the sender or an addressed recipient of a sealed
-- recommendation?
create or replace function is_party_to_recommendation(p_recommendation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from sealed_recommendations
    where id = p_recommendation_id and sender_id = auth.uid()
  ) or exists (
    select 1 from sealed_recommendation_recipients
    where recommendation_id = p_recommendation_id and recipient_id = auth.uid()
  );
$$;

-- Six word review visibility (brief §7 "Six words", §10, §11).
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
    when auth.uid() = p_author_id then true
    when p_visibility = 'house_approved' then true
    when p_visibility = 'private' then false
    -- 'circle': eligible once the viewer has watched the same film,
    -- through the same opening or the same sealed recommendation.
    when p_visibility = 'circle' then has_watched(p_opening_id, p_sealed_recommendation_id)
    else false
  end;
$$;
