#!/usr/bin/env bash
#
# House Dark — run the RLS policy tests (brief §17) against a throwaway
# PostgreSQL cluster.
#
# This applies the real supabase/migrations, unmodified, on top of a
# small compatibility shim that provides the Supabase primitives the
# migrations expect (auth schema, auth.uid(), the anon/authenticated/
# service_role roles, storage tables). Nothing here touches a real
# project — the cluster lives in a temp directory and is destroyed on
# exit.
#
# Usage: npm run test:rls
#
# Requires a local PostgreSQL server install. If PG_BIN is not set the
# script searches the usual Debian/Ubuntu and Homebrew locations. Point
# it at an existing database instead with:
#   HOUSE_DARK_TEST_DATABASE_URL=postgres://... npm run test:rls

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ---------------------------------------------------------------------
# Path A: an external database was supplied.
# ---------------------------------------------------------------------
if [[ -n "${HOUSE_DARK_TEST_DATABASE_URL:-}" ]]; then
  echo "Using HOUSE_DARK_TEST_DATABASE_URL"
  PSQL=(psql "$HOUSE_DARK_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -q)
  "${PSQL[@]}" -f supabase/tests/00_supabase_shim.sql
  for migration in supabase/migrations/*.sql; do
    echo "  applying $(basename "$migration")"
    "${PSQL[@]}" -f "$migration"
  done
  exec psql "$HOUSE_DARK_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/01_rls.sql
fi

# ---------------------------------------------------------------------
# Path B: spin up a throwaway cluster.
# ---------------------------------------------------------------------
if [[ -z "${PG_BIN:-}" ]]; then
  for candidate in \
    /usr/lib/postgresql/*/bin \
    /usr/local/pgsql/bin \
    /opt/homebrew/opt/postgresql@*/bin \
    /usr/local/opt/postgresql@*/bin
  do
    if [[ -x "$candidate/initdb" ]]; then
      PG_BIN="$candidate"
      break
    fi
  done
fi

if [[ -z "${PG_BIN:-}" || ! -x "$PG_BIN/initdb" ]]; then
  cat >&2 <<'EOF'
Could not find a PostgreSQL server installation.

Install one, or point the script at an existing database:
  Debian/Ubuntu : sudo apt-get install postgresql
  macOS         : brew install postgresql@16
  Existing DB   : HOUSE_DARK_TEST_DATABASE_URL=postgres://... npm run test:rls
  Explicit path : PG_BIN=/path/to/postgres/bin npm run test:rls
EOF
  exit 1
fi

PGDATA="$(mktemp -d -t house-dark-pgdata-XXXXXX)"
PGSOCK="$(mktemp -d -t house-dark-pgsock-XXXXXX)"
PGPORT="${PGPORT:-5433}"

cleanup() {
  if [[ -f "$PGDATA/postmaster.pid" ]]; then
    run_as "$PG_BIN/pg_ctl -D '$PGDATA' -m immediate stop" >/dev/null 2>&1 || true
  fi
  rm -rf "$PGDATA" "$PGSOCK"
}
trap cleanup EXIT

# initdb refuses to run as root, so drop to the postgres account when
# this is running in a container as root.
if [[ "$(id -u)" -eq 0 ]] && id -u postgres >/dev/null 2>&1; then
  chown -R postgres:postgres "$PGDATA" "$PGSOCK"
  run_as() { su postgres -c "$1"; }
else
  run_as() { bash -c "$1"; }
fi

echo "Starting a throwaway PostgreSQL cluster on port $PGPORT"
run_as "$PG_BIN/initdb -D '$PGDATA' -U postgres --auth=trust" >/dev/null
run_as "$PG_BIN/pg_ctl -D '$PGDATA' -o '-p $PGPORT -k $PGSOCK -c listen_addresses=' -w start" >/dev/null

PSQL=(psql -h "$PGSOCK" -p "$PGPORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)

echo "Applying the Supabase compatibility shim"
"${PSQL[@]}" -f supabase/tests/00_supabase_shim.sql

echo "Applying migrations"
for migration in supabase/migrations/*.sql; do
  echo "  $(basename "$migration")"
  "${PSQL[@]}" -f "$migration"
done

echo "Running RLS policy tests"
psql -h "$PGSOCK" -p "$PGPORT" -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f supabase/tests/01_rls.sql
