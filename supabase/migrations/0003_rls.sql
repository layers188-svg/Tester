-- House Dark — 0003_rls
-- Row Level Security for every table (brief §11). Default posture is
-- deny: a table with RLS enabled and no matching policy for a command
-- returns/affects zero rows for anon and authenticated roles. Only the
-- service role (used server-side, e.g. src/lib/supabase/service.ts)
-- bypasses RLS.

alter table profiles enable row level security;
alter table films enable row level security;
alter table openings enable row level security;
alter table opening_secrets enable row level security;
alter table opening_cues enable row level security;
alter table playback_destinations enable row level security;
alter table reveals enable row level security;
alter table watches enable row level security;
alter table six_word_reviews enable row level security;
alter table circles enable row level security;
alter table circle_members enable row level security;
alter table sealed_recommendations enable row level security;
alter table sealed_recommendation_recipients enable row level security;
alter table sealed_recommendation_cues enable row level security;
alter table screenings enable row level security;
alter table screening_attendance enable row level security;
alter table email_preferences enable row level security;
alter table notification_queue enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------------
-- profiles — brief §11 minimum rule 1: read/update only your own.
-- ---------------------------------------------------------------------

create policy profiles_select_own on profiles
  for select using (auth.uid() = id or is_moderator_or_owner());

create policy profiles_insert_own on profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_own on profiles
  for update using (auth.uid() = id or is_owner())
  with check (auth.uid() = id or is_owner());

-- ---------------------------------------------------------------------
-- films / opening_secrets — brief §11 rule 9: owner only.
-- ---------------------------------------------------------------------

create policy films_owner_all on films
  for all using (is_owner()) with check (is_owner());

create policy opening_secrets_owner_all on opening_secrets
  for all using (is_owner()) with check (is_owner());

-- ---------------------------------------------------------------------
-- openings — safe projection is public to signed-in members once it
-- has left draft/approved. Full access (including draft) is owner only.
-- ---------------------------------------------------------------------

create policy openings_select_published on openings
  for select using (status in ('scheduled', 'open', 'closed') or is_owner());

create policy openings_owner_write on openings
  for insert with check (is_owner());

create policy openings_owner_update on openings
  for update using (is_owner()) with check (is_owner());

create policy openings_owner_delete on openings
  for delete using (is_owner());

-- ---------------------------------------------------------------------
-- opening_cues — safe cues follow their opening's visibility.
-- ---------------------------------------------------------------------

create policy opening_cues_select on opening_cues
  for select using (
    is_owner()
    or exists (
      select 1 from openings o
      where o.id = opening_cues.opening_id
        and o.status in ('scheduled', 'open', 'closed')
    )
  );

create policy opening_cues_owner_write on opening_cues
  for all using (is_owner()) with check (is_owner());

-- ---------------------------------------------------------------------
-- playback_destinations — brief §11 rule 5: server protected until
-- reveal. No member-facing select policy at all; reached only through
-- the reveal_opening / reveal_sealed_recommendation functions
-- (security definer, 0004_reveal.sql) or the owner Programming Desk.
-- ---------------------------------------------------------------------

create policy playback_destinations_owner_all on playback_destinations
  for all using (is_owner()) with check (is_owner());

-- ---------------------------------------------------------------------
-- reveals
-- ---------------------------------------------------------------------

create policy reveals_select_own on reveals
  for select using (auth.uid() = user_id or is_owner());

create policy reveals_insert_own on reveals
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- watches
-- ---------------------------------------------------------------------

create policy watches_owner_all on watches
  for all using (auth.uid() = user_id or is_owner())
  with check (auth.uid() = user_id or is_owner());

-- ---------------------------------------------------------------------
-- six_word_reviews — brief §11 rules 6-8.
-- ---------------------------------------------------------------------

create policy six_word_reviews_select on six_word_reviews
  for select using (
    can_view_six_word_review(user_id, opening_id, sealed_recommendation_id, visibility)
    or is_moderator_or_owner()
  );

create policy six_word_reviews_insert_own on six_word_reviews
  for insert with check (auth.uid() = user_id);

create policy six_word_reviews_update on six_word_reviews
  for update
  using (auth.uid() = user_id or is_moderator_or_owner())
  with check (auth.uid() = user_id or is_moderator_or_owner());

create policy six_word_reviews_delete on six_word_reviews
  for delete using (auth.uid() = user_id or is_moderator_or_owner());

-- Enforce: authors may only edit body/word_count within 5 minutes of
-- creation and can never set their own moderation_state. Moderators may
-- only change moderation_state, never rewrite another member's words
-- (brief §11 rule 8: "can hide but not silently rewrite").
create or replace function guard_six_word_review_update()
returns trigger
language plpgsql
as $$
declare
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
begin
  if jwt_role = 'service_role' then
    return new;
  end if;

  if auth.uid() = old.user_id then
    if new.body is distinct from old.body and now() - old.created_at > interval '5 minutes' then
      raise exception 'The five minute edit window has closed.';
    end if;
    new.moderation_state := old.moderation_state;
    new.visibility := old.visibility;
    new.opening_id := old.opening_id;
    new.sealed_recommendation_id := old.sealed_recommendation_id;
    new.user_id := old.user_id;
    return new;
  end if;

  if is_moderator_or_owner() then
    new.body := old.body;
    new.word_count := old.word_count;
    new.visibility := old.visibility;
    new.user_id := old.user_id;
    new.opening_id := old.opening_id;
    new.sealed_recommendation_id := old.sealed_recommendation_id;
    return new;
  end if;

  raise exception 'Not permitted.';
end;
$$;

create trigger six_word_reviews_guard_update
  before update on six_word_reviews
  for each row execute function guard_six_word_review_update();

-- ---------------------------------------------------------------------
-- circles / circle_members
-- ---------------------------------------------------------------------

create policy circles_select_member on circles
  for select using (is_circle_member(id) or is_owner());

create policy circles_insert_creator on circles
  for insert with check (auth.uid() = created_by);

create policy circles_update_organiser on circles
  for update
  using (
    exists (
      select 1 from circle_members
      where circle_id = circles.id and user_id = auth.uid() and role = 'organiser'
    )
    or is_owner()
  )
  with check (true);

create policy circles_delete_organiser on circles
  for delete using (
    exists (
      select 1 from circle_members
      where circle_id = circles.id and user_id = auth.uid() and role = 'organiser'
    )
    or is_owner()
  );

create policy circle_members_select on circle_members
  for select using (is_circle_member(circle_id) or is_owner());

create policy circle_members_insert_self on circle_members
  for insert with check (auth.uid() = user_id or is_owner());

create policy circle_members_update_organiser on circle_members
  for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from circle_members cm
      where cm.circle_id = circle_members.circle_id
        and cm.user_id = auth.uid()
        and cm.role = 'organiser'
    )
    or is_owner()
  )
  with check (true);

create policy circle_members_delete on circle_members
  for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from circle_members cm
      where cm.circle_id = circle_members.circle_id
        and cm.user_id = auth.uid()
        and cm.role = 'organiser'
    )
    or is_owner()
  );

-- ---------------------------------------------------------------------
-- sealed_recommendations — brief §11 rule 4-5. Recipients never get a
-- row here (which would carry secret_film_id); they read the safe RPC.
-- ---------------------------------------------------------------------

create policy sealed_recommendations_select_sender on sealed_recommendations
  for select using (auth.uid() = sender_id or is_owner());

create policy sealed_recommendations_insert_sender on sealed_recommendations
  for insert with check (auth.uid() = sender_id);

create policy sealed_recommendation_recipients_select on sealed_recommendation_recipients
  for select using (
    auth.uid() = recipient_id
    or auth.uid() = (select sender_id from sealed_recommendations sr where sr.id = recommendation_id)
    or is_owner()
  );

create policy sealed_recommendation_recipients_insert on sealed_recommendation_recipients
  for insert with check (
    auth.uid() = (select sender_id from sealed_recommendations sr where sr.id = recommendation_id)
  );

create policy sealed_recommendation_recipients_update_self on sealed_recommendation_recipients
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

create policy sealed_recommendation_cues_select on sealed_recommendation_cues
  for select using (is_party_to_recommendation(recommendation_id) or is_owner());

create policy sealed_recommendation_cues_insert on sealed_recommendation_cues
  for insert with check (
    auth.uid() = (select sender_id from sealed_recommendations sr where sr.id = recommendation_id)
  );

-- ---------------------------------------------------------------------
-- screenings / screening_attendance
-- ---------------------------------------------------------------------

create policy screenings_select on screenings
  for select using (is_circle_member(circle_id) or is_owner());

create policy screenings_insert on screenings
  for insert with check (is_circle_member(circle_id) and auth.uid() = created_by);

create policy screenings_update_organiser on screenings
  for update using (
    exists (
      select 1 from circle_members cm
      where cm.circle_id = screenings.circle_id and cm.user_id = auth.uid() and cm.role = 'organiser'
    )
    or is_owner()
  );

create policy screening_attendance_select on screening_attendance
  for select using (
    exists (
      select 1 from screenings s
      where s.id = screening_id and is_circle_member(s.circle_id)
    )
    or is_owner()
  );

create policy screening_attendance_upsert on screening_attendance
  for insert with check (auth.uid() = user_id);

create policy screening_attendance_update_self on screening_attendance
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- email_preferences
-- ---------------------------------------------------------------------

create policy email_preferences_owner_all on email_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- notification_queue — no member-facing write policy; system only.
-- ---------------------------------------------------------------------

create policy notification_queue_select_own on notification_queue
  for select using (auth.uid() = user_id or is_owner());

-- ---------------------------------------------------------------------
-- audit_log — owner read only; writes are service-role only.
-- ---------------------------------------------------------------------

create policy audit_log_select_owner on audit_log
  for select using (is_owner());
