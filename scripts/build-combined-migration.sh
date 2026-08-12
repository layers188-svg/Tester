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
-- project. It creates tables, so a second run will fail on the first
-- `create table` — that is a safe failure, not a partial re-apply,
-- because the whole script runs in one implicit transaction.
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
