-- House Dark — read-only verification of a hosted Supabase project.
--
-- Run this after `npm run db:migrate` to confirm the schema really
-- landed. It only SELECTs: it creates nothing, writes nothing and drops
-- nothing, so it is safe against a project you intend to keep.
--
--   psql "$(supabase db url)" -f scripts/verify-remote.sql
--
-- or paste it into the SQL editor:
--   https://supabase.com/dashboard/project/_/sql/new
--
-- Every row should read PASS. Anything else names what is missing.
--
-- This exists because the schema's guarantees are not observable from
-- the application: RLS filters rows rather than raising, so a policy
-- that failed to apply looks exactly like "no data yet" from the
-- browser. supabase/tests/*.sql proves the policies *behave* correctly
-- on a throwaway database; this proves they are actually *present* on
-- yours.

-- Deliberately plain SQL: no psql backslash commands, so the same file
-- runs through psql and pastes straight into the Supabase SQL editor.

with
expected_tables(name) as (
  values
    ('analytics_events'), ('audit_log'), ('circle_members'), ('circles'),
    ('email_preferences'), ('films'), ('notification_queue'),
    ('opening_cues'), ('opening_secrets'), ('openings'),
    ('playback_destinations'), ('profiles'), ('reveals'),
    ('screening_attendance'), ('screenings'), ('sealed_recommendation_cues'),
    ('sealed_recommendation_recipients'), ('sealed_recommendations'),
    ('six_word_reviews'), ('watches')
),
expected_functions(name) as (
  values
    ('can_view_six_word_review'), ('create_sealed_recommendation'),
    ('current_profile_role'), ('get_analytics_summary'),
    ('get_circle_activity'),
    ('get_circle_member_names'), ('get_house_openings'), ('get_house_words'),
    ('get_my_circles_activity'), ('get_my_library'),
    ('get_sealed_recommendation_safe'), ('guard_profile_role'),
    ('guard_six_word_review_update'), ('has_watched'), ('is_circle_member'),
    ('is_moderator_or_owner'), ('is_owner'), ('is_party_to_recommendation'),
    ('join_circle_by_code'), ('list_my_sealed_recommendations'),
    ('reveal_opening'), ('reveal_sealed_recommendation'), ('set_updated_at'),
    ('shares_circle_with')
),
-- Tables that must never be readable by a signed-in member: the three
-- that carry a film's identity, and analytics_events, which is house
-- instrumentation rather than a member-facing feature (brief §15).
protected(name) as (
  values ('films'), ('opening_secrets'), ('playback_destinations'),
         ('analytics_events')
),
results(sort_key, check_name, status, detail) as (

  -- 1. Every table exists.
  select 1, 'tables present',
    case when count(*) filter (where c.relname is null) = 0 then 'PASS' else 'FAIL' end,
    coalesce(string_agg(e.name, ', ') filter (where c.relname is null), 'all 20')
  from expected_tables e
  left join pg_class c
    on c.relname = e.name
   and c.relnamespace = 'public'::regnamespace
   and c.relkind = 'r'

  union all

  -- 2. RLS is enabled on every one of them. A table with policies but
  --    RLS switched off is wide open and looks fine in the dashboard.
  select 2, 'row level security enabled',
    case when count(*) filter (where not coalesce(c.relrowsecurity, false)) = 0
         then 'PASS' else 'FAIL' end,
    coalesce(
      string_agg(e.name, ', ') filter (where not coalesce(c.relrowsecurity, false)),
      'all 20'
    )
  from expected_tables e
  left join pg_class c
    on c.relname = e.name
   and c.relnamespace = 'public'::regnamespace
   and c.relkind = 'r'

  union all

  -- 3. Policy count, counted per schema because they live in two
  --    places: 44 on the public tables (0003_rls.sql, plus the owner
  --    read on analytics_events from 0013) and 7 on storage.objects
  --    (0008_storage.sql).
  select 3, 'table policies applied',
    case when count(*) >= 44 then 'PASS' else 'FAIL' end,
    count(*)::text || ' of 44 expected'
  from pg_policies
  where schemaname = 'public'

  union all

  -- 3b. The storage policies decide who may read a No Trailer object.
  --     Missing here means either an unplayable video or a public one.
  select 4, 'storage policies applied',
    case when count(*) >= 7 then 'PASS' else 'FAIL' end,
    count(*)::text || ' of 7 expected'
  from pg_policies
  where schemaname = 'storage'

  union all

  -- 4. Every function exists.
  select 5, 'functions present',
    case when count(*) filter (where p.proname is null) = 0 then 'PASS' else 'FAIL' end,
    coalesce(string_agg(e.name, ', ') filter (where p.proname is null), 'all 24')
  from expected_functions e
  left join pg_proc p
    on p.proname = e.name
   and p.pronamespace = 'public'::regnamespace

  union all

  -- 5. The reveal path must be SECURITY DEFINER, or it cannot read the
  --    protected tables on the member's behalf and every reveal fails.
  select 6, 'reveal functions are security definer',
    case when count(*) filter (where not p.prosecdef) = 0 and count(*) = 2
         then 'PASS' else 'FAIL' end,
    coalesce(string_agg(p.proname || ' is INVOKER', ', ')
             filter (where not p.prosecdef), 'both')
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('reveal_opening', 'reveal_sealed_recommendation')

  union all

  -- 6. No protected table may carry a policy that grants the anon or
  --    authenticated role a direct read. The browser gets a safe
  --    projection or nothing (brief §11).
  select 7, 'protected tables closed to the browser',
    case when count(*) = 0 then 'PASS' else 'FAIL' end,
    coalesce(string_agg(pol.tablename || '.' || pol.policyname, ', '),
             'films, opening_secrets, playback_destinations, analytics_events all closed')
  from pg_policies pol
  join protected pr on pr.name = pol.tablename
  where pol.schemaname = 'public'
    and pol.cmd in ('SELECT', 'ALL')
    and (pol.roles && array['anon', 'authenticated']::name[])
    and coalesce(pol.qual, '') not ilike '%is_owner%'

  union all

  -- 7. Storage buckets for the No Trailer and its captions.
  select 8, 'storage buckets created',
    case when count(*) >= 1 then 'PASS' else 'CHECK' end,
    coalesce(string_agg(id, ', '), 'none found — see 0008_storage.sql')
  from storage.buckets

  union all

  -- 8. Nothing real should exist yet. If this is not zero you are
  --    pointing at a project that already has data.
  select 9, 'project is empty (expected before launch)',
    case when (select count(*) from profiles) = 0 then 'PASS' else 'CHECK' end,
    (select count(*) from profiles)::text || ' profiles, '
      || (select count(*) from films)::text || ' films'
)
select
  check_name  as "check",
  status,
  detail
from results
order by sort_key;
