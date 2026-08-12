#!/usr/bin/env bash
# Concatenate supabase/migrations/*.sql into one script that can be
# pasted into the Supabase SQL editor.
#
#   bash scripts/build-combined-migration.sh > /tmp/house-dark-schema.sql
#
# This exists for the browser-only route. `supabase db push` is still the
# normal path and the one that records migration history — use this when
# there is no terminal available to run the CLI from.
#
# Regenerate rather than editing the output: the individual migrations in
# supabase/migrations are the source of truth, and a hand-edited
# concatenation silently drifts from them.
set -euo pipefail

cd "$(dirname "$0")/.."

cat <<'HEADER'
-- House Dark — complete schema, every migration in order.
--
-- GENERATED FILE. Source: supabase/migrations/*.sql
-- Regenerate with: bash scripts/build-combined-migration.sh
--
-- Paste into the Supabase SQL editor and run once, against an EMPTY
-- project.
--
-- A second run stops on the very first statement with
--   ERROR: 42710: type "profile_role" already exists
-- That is what success looks like the second time, not damage: the
-- whole script is wrapped in the begin/commit below, so a failure at
-- any point rolls the entire run back. It cannot half-apply. If you see
-- that error, the schema is already in — run scripts/verify-remote.sql
-- to confirm what is actually there rather than assuming either way.
--
-- It does NOT insert demonstration data. supabase/seed.sql creates
-- clearly labelled demo members and brief §18 forbids those from
-- reaching production, so it is deliberately not included here.
--
-- Afterwards run scripts/verify-remote.sql to confirm what landed.

begin;
HEADER

for migration in supabase/migrations/*.sql; do
  printf '\n\n-- =====================================================================\n'
  printf -- '-- %s\n' "$(basename "$migration")"
  printf -- '-- =====================================================================\n\n'
  cat "$migration"
done

cat <<'FOOTER'


commit;
FOOTER
