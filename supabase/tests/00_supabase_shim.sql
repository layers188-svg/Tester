-- House Dark — Supabase compatibility shim for local RLS testing.
--
-- The migrations in supabase/migrations reference primitives that a
-- hosted Supabase project provides: the `auth` schema, `auth.users`,
-- `auth.uid()`, the `anon`/`authenticated`/`service_role` roles, the
-- `request.jwt.claims` GUC, and `storage.buckets`/`storage.objects`.
--
-- This file recreates just enough of those for a plain Postgres to run
-- the real migrations and the real policies unmodified, so
-- supabase/tests/01_rls.sql exercises the same SQL that ships. It is a
-- TEST harness — never applied to a real project, and never referenced
-- by anything under supabase/migrations.
--
-- Run via: npm run test:rls

-- ---------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- auth schema
-- ---------------------------------------------------------------------

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  instance_id uuid,
  id uuid primary key,
  aud text,
  role text,
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  is_super_admin boolean default false,
  confirmation_token text,
  recovery_token text,
  email_change_token_new text,
  email_change text
);

/*
 * Supabase derives auth.uid() from the request JWT. Tests set the same
 * GUC Supabase uses, so the policies under test read the caller's id
 * through exactly the same code path as in production.
 */
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', 'anon');
$$;

-- ---------------------------------------------------------------------
-- storage schema (0008_storage.sql targets these)
-- ---------------------------------------------------------------------

create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table storage.objects enable row level security;
