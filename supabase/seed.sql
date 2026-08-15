-- House Dark — local development seed data.
--
-- Brief §18: "Seed clearly labelled demonstration members and Circles
-- for local development only. Production must not present demo people
-- or quotes as real members." Do not run this file against the
-- production project. `supabase db reset` runs it automatically against
-- your local dev database only.
--
-- Seeds No Trailer 001 with the protected internal mapping from §18.
-- The title "Whiplash" must never reach the client before reveal — see
-- tests/unit/spoiler.test.ts and tests/e2e/spoiler-regression.spec.ts.

begin;

-- ---------------------------------------------------------------------
-- Demonstration members (local dev only, clearly labelled)
-- ---------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token,
  recovery_token, email_change_token_new, email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated', 'authenticated',
    'demo-owner@housedark.test', '',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated', 'authenticated',
    'demo-member-one@housedark.test', '',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-4333-8333-333333333333',
    'authenticated', 'authenticated',
    'demo-member-two@housedark.test', '',
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', ''
  )
on conflict (id) do nothing;

insert into profiles (id, display_name, city, timezone, role, onboarding_complete)
values
  ('11111111-1111-4111-8111-111111111111', 'Demo Owner (House Dark)', 'Melbourne', 'Australia/Melbourne', 'owner', true),
  ('22222222-2222-4222-8222-222222222222', 'Demo Member — Ari', 'Sydney', 'Australia/Sydney', 'member', true),
  ('33333333-3333-4333-8333-333333333333', 'Demo Member — Priya', 'Perth', 'Australia/Perth', 'member', true)
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role;

-- ---------------------------------------------------------------------
-- Protected film + No Trailer 001 (brief §18)
-- ---------------------------------------------------------------------

insert into films (id, title, release_year, runtime_minutes, country_code, rights_notes)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Whiplash',
  2014,
  106,
  'US',
  'Seed content for local development only. Verify rights and provider links before any real programming.'
)
on conflict (id) do nothing;

insert into openings (
  id, opening_number, opens_at, closes_at, status, runtime_minutes,
  availability_count, minimum_access_type, no_trailer_storage_path,
  content_notes
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  1,
  now(),
  null,
  'open',
  106,
  3,
  'subscription',
  -- UUID storage name within the "no-trailer" Storage bucket — brief
  -- §12 media checks rule 6. This is a placeholder: the real No Trailer
  -- file has not been supplied to this environment. Upload it from the
  -- Programming Desk before relying on this opening (see
  -- LAUNCH_CHECKLIST.md).
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc.mp4',
  'Depicts intense mentorship and high pressure practice. No flashing imagery.'
)
on conflict (id) do update set status = excluded.status;

insert into opening_secrets (opening_id, film_id, approved_at, approved_by)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  now(),
  '11111111-1111-4111-8111-111111111111'
)
on conflict (opening_id) do nothing;

insert into opening_cues (opening_id, cue, sort_order) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Drummer', 0),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'School', 1),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Ambition', 2)
on conflict do nothing;

-- Placeholder provider link — replace with a verified deep link before
-- launch (brief §12 "Human approval is mandatory for provider link
-- accuracy").
insert into playback_destinations (film_id, territory, provider_name, access_type, deep_link, verified_at, is_active)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'AU',
  'Example Streaming Service',
  'subscription',
  'https://example.com/watch/replace-with-verified-link',
  null,
  false
)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Demonstration Circle
-- ---------------------------------------------------------------------

insert into circles (id, name, created_by, invite_code, default_screening_day, default_screening_time)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'Demo Circle (local dev only)',
  '11111111-1111-4111-8111-111111111111',
  'demo-circle',
  4,
  '20:00'
)
on conflict (id) do nothing;

insert into circle_members (circle_id, user_id, role) values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '11111111-1111-4111-8111-111111111111', 'organiser'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-4222-8222-222222222222', 'member'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '33333333-3333-4333-8333-333333333333', 'member')
on conflict do nothing;

insert into email_preferences (user_id)
values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Trust Us house records (local development only)
-- ---------------------------------------------------------------------
--
-- The editorial six-word lines and territories from
-- docs/handover/fixtures.json, so /trust can be exercised locally.
--
-- These are demonstration records, not the House's editorial voice.
-- Production records are written and approved through the Programming
-- Desk (/desk/records) — nothing is offered to a member until an owner
-- sets editorial_approved_at, so an unseeded production project shows
-- Trust Us honestly empty rather than showing these.

insert into films (id, title, release_year, runtime_minutes, rights_notes) values
  ('f0000001-0000-4000-8000-000000000001', 'Parasite',                    2019, 132, 'Seed content for local development only.'),
  ('f0000002-0000-4000-8000-000000000002', 'Portrait of a Lady on Fire',  2019, 122, 'Seed content for local development only.'),
  ('f0000003-0000-4000-8000-000000000003', 'Burning',                     2018, 148, 'Seed content for local development only.'),
  ('f0000004-0000-4000-8000-000000000004', 'The Florida Project',         2017, 111, 'Seed content for local development only.'),
  ('f0000005-0000-4000-8000-000000000005', 'In the Mood for Love',        2000,  98, 'Seed content for local development only.'),
  ('f0000006-0000-4000-8000-000000000006', 'Past Lives',                  2023, 106, 'Seed content for local development only.'),
  ('f0000007-0000-4000-8000-000000000007', 'Aftersun',                    2022, 102, 'Seed content for local development only.'),
  ('f0000008-0000-4000-8000-000000000008', 'La La Land',                  2016, 128, 'Seed content for local development only.'),
  ('f0000009-0000-4000-8000-000000000009', 'Under the Skin',              2013, 108, 'Seed content for local development only.')
on conflict (id) do nothing;

insert into film_house_records
  (film_id, six_words_before, territories, pace, intensity, editorial_approved_at, approved_by)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Drummer chases greatness under brutal mentorship',
    array['Tension','Obsession','Ambition'], 'relentless', 'high', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000001-0000-4000-8000-000000000001', 'Struggling family enters wealthy household''s orbit',
    array['Power','Tension'], 'building', 'high', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000002-0000-4000-8000-000000000002', 'Painter observes woman she must portray',
    array['Longing','Memory'], 'measured', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000003-0000-4000-8000-000000000003', 'Young man searches through unsettling absence',
    array['Jealousy','Tension','Something strange'], 'slow burn', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000004-0000-4000-8000-000000000004', 'Childhood flourishes beside adult instability daily',
    array['Childhood','Escape'], 'loose', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000005-0000-4000-8000-000000000005', 'Neighbours grow close at impossible moment',
    array['Longing','Memory'], 'measured', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000006-0000-4000-8000-000000000006', 'Old friends meet across changed lives',
    array['Longing','Memory'], 'measured', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000007-0000-4000-8000-000000000007', 'Daughter remembers holiday with her father',
    array['Memory','Childhood'], 'measured', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000008-0000-4000-8000-000000000008', 'Dreamers collide while chasing separate futures',
    array['Ambition','Longing'], 'buoyant', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000009-0000-4000-8000-000000000009', 'Mysterious woman moves through unfamiliar world',
    array['Something strange'], 'hypnotic', 'high', now(), '11111111-1111-4111-8111-111111111111')
on conflict (film_id) do nothing;

-- ---------------------------------------------------------------------
-- Trust Us house records (local development only)
-- ---------------------------------------------------------------------
--
-- The editorial six-word lines and territories from
-- docs/handover/fixtures.json, so /trust can be exercised locally.
--
-- These are demonstration records, not the House's editorial voice.
-- Production records are written and approved through the Programming
-- Desk (/desk/records) — nothing is offered to a member until an owner
-- sets editorial_approved_at, so an unseeded production project shows
-- Trust Us honestly empty rather than showing these.

insert into films (id, title, release_year, runtime_minutes, rights_notes) values
  ('f0000001-0000-4000-8000-000000000001', 'Parasite',                    2019, 132, 'Seed content for local development only.'),
  ('f0000002-0000-4000-8000-000000000002', 'Portrait of a Lady on Fire',  2019, 122, 'Seed content for local development only.'),
  ('f0000003-0000-4000-8000-000000000003', 'Burning',                     2018, 148, 'Seed content for local development only.'),
  ('f0000004-0000-4000-8000-000000000004', 'The Florida Project',         2017, 111, 'Seed content for local development only.'),
  ('f0000005-0000-4000-8000-000000000005', 'In the Mood for Love',        2000,  98, 'Seed content for local development only.'),
  ('f0000006-0000-4000-8000-000000000006', 'Past Lives',                  2023, 106, 'Seed content for local development only.'),
  ('f0000007-0000-4000-8000-000000000007', 'Aftersun',                    2022, 102, 'Seed content for local development only.'),
  ('f0000008-0000-4000-8000-000000000008', 'La La Land',                  2016, 128, 'Seed content for local development only.'),
  ('f0000009-0000-4000-8000-000000000009', 'Under the Skin',              2013, 108, 'Seed content for local development only.')
on conflict (id) do nothing;

insert into film_house_records
  (film_id, six_words_before, territories, pace, intensity, editorial_approved_at, approved_by)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Drummer chases greatness under brutal mentorship',
    array['Tension','Obsession','Ambition'], 'relentless', 'high', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000001-0000-4000-8000-000000000001', 'Struggling family enters wealthy household''s orbit',
    array['Power','Tension'], 'building', 'high', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000002-0000-4000-8000-000000000002', 'Painter observes woman she must portray',
    array['Longing','Memory'], 'measured', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000003-0000-4000-8000-000000000003', 'Young man searches through unsettling absence',
    array['Jealousy','Tension','Something strange'], 'slow burn', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000004-0000-4000-8000-000000000004', 'Childhood flourishes beside adult instability daily',
    array['Childhood','Escape'], 'loose', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000005-0000-4000-8000-000000000005', 'Neighbours grow close at impossible moment',
    array['Longing','Memory'], 'measured', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000006-0000-4000-8000-000000000006', 'Old friends meet across changed lives',
    array['Longing','Memory'], 'measured', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000007-0000-4000-8000-000000000007', 'Daughter remembers holiday with her father',
    array['Memory','Childhood'], 'measured', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000008-0000-4000-8000-000000000008', 'Dreamers collide while chasing separate futures',
    array['Ambition','Longing'], 'buoyant', 'medium', now(), '11111111-1111-4111-8111-111111111111'),
  ('f0000009-0000-4000-8000-000000000009', 'Mysterious woman moves through unfamiliar world',
    array['Something strange'], 'hypnotic', 'high', now(), '11111111-1111-4111-8111-111111111111')
on conflict (film_id) do nothing;

commit;
