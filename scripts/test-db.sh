#!/usr/bin/env bash
# Replays every migration on a throwaway Postgres and runs the access-control suites. Never touches a real project.
# Local: starts a temporary cluster (needs postgres binaries). CI: set PGHOST/PGPORT/PGUSER and an empty database.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
db="${TEST_DB:-placementiq_test}"
if [ -z "${PGHOST:-}" ]; then
  dir="$(mktemp -d "${TEST_TMP:-${TMPDIR:-/tmp}}/piq.XXXXXX")"
  trap 'pg_ctl -D "$dir/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$dir"' EXIT
  initdb -D "$dir/data" -U postgres -A trust -E UTF8 --locale=C >/dev/null
  pg_ctl -D "$dir/data" -o "-k $dir -c listen_addresses='' -c fsync=off" -w -l "$dir/log" start >/dev/null || { cat "$dir/log"; exit 1; }
  export PGHOST="$dir" PGUSER=postgres
fi
export PGUSER="${PGUSER:-postgres}"
psql -q -d postgres -v ON_ERROR_STOP=1 -c "drop database if exists $db" -c "create database $db"
export PGOPTIONS="-c client_min_messages=warning"
run() { psql -q -d "$db" -v ON_ERROR_STOP=1 -f "$1" >/dev/null; }
run "$root/supabase/tests/supabase_shim.sql"
for f in "$root"/supabase/migrations/*.sql; do
  # SKIP_FROM=20261105 replays only what came before, to show a test fails on the original defect.
  [ -n "${SKIP_FROM:-}" ] && [ "$(basename "$f" | cut -c1-8)" -ge "$SKIP_FROM" ] && continue
  run "$f" || { echo "MIGRATION FAILED: $(basename "$f")"; exit 1; }
done
echo "migrations replayed: $(ls "$root"/supabase/migrations/*.sql | wc -l | tr -d ' ')"
# Twice is the point: every migration here must be safe to run again, because production ones are pasted by hand.
if [ "${REPLAY_LAST:-1}" = 1 ]; then run "$(ls "$root"/supabase/migrations/*.sql | tail -1)" && echo "latest migration is re-runnable"; fi
status=0
suites=("$@"); [ ${#suites[@]} -gt 0 ] || suites=("$root/docs/evaluation/rls_tests.sql" "$root/supabase/tests/remediation_tests.sql")
for suite in "${suites[@]}"; do
  out="$(psql -d "$db" ${SKIP_FROM:+-v ON_ERROR_ROLLBACK=on} -At -F ' | ' -f "$suite" 2>&1 | grep -vE '^(BEGIN|ROLLBACK|CREATE TABLE|GRANT|INSERT|UPDATE|DELETE|SET|RESET|DO|SELECT [0-9]|\{"sub"|$)' || true)"
  echo "$out" | grep -E '\| f$|ERROR' && status=1 || true
  echo "$(basename "$suite"): $(echo "$out" | tail -1)"
done
# The migration again, on a database that already holds data like production's: backfills only run for real here.
if [ -z "${SKIP_FROM:-}" ] && [ -f "$root/supabase/tests/legacy_data.sql" ]; then
  legacy=placementiq_legacy
  latest="$(ls "$root"/supabase/migrations/*.sql | tail -1)"
  psql -q -d postgres -v ON_ERROR_STOP=1 -c "drop database if exists $legacy" -c "create database $legacy"
  psql -q -d "$legacy" -v ON_ERROR_STOP=1 -f "$root/supabase/tests/supabase_shim.sql" >/dev/null
  for f in "$root"/supabase/migrations/*.sql; do [ "$f" = "$latest" ] || psql -q -d "$legacy" -v ON_ERROR_STOP=1 -f "$f" >/dev/null; done
  psql -q -d "$legacy" -v ON_ERROR_STOP=1 -f "$root/supabase/tests/legacy_data.sql" >/dev/null
  psql -q -d "$legacy" -v ON_ERROR_STOP=1 -f "$latest" >/dev/null || { echo "MIGRATION FAILED ON EXISTING DATA"; status=1; }
  psql -q -d "$legacy" -v ON_ERROR_STOP=1 -f "$latest" >/dev/null || { echo "MIGRATION NOT RE-RUNNABLE ON EXISTING DATA"; status=1; }
  out="$(psql -d "$legacy" -At -F ' | ' -f "$root/supabase/tests/legacy_tests.sql" 2>&1 | grep -vE '^(CREATE TABLE|INSERT|$)' || true)"
  echo "$out" | grep -E '\| f$|ERROR' && status=1 || true
  echo "legacy_tests.sql: $(echo "$out" | tail -1)"
fi
if [ -z "${SKIP_FROM:-}" ]; then
  parity="$(mktemp "${TEST_TMP:-${TMPDIR:-/tmp}}/parity.XXXXXX")"
  node "$root/scripts/branch-parity.mjs" > "$parity"
  out="$(psql -d "$db" -At -F ' | ' -f "$parity" 2>&1 | grep -vE '^(CREATE TABLE|INSERT|$)' || true)"
  rm -f "$parity"
  echo "$out" | grep -E '\| f$|ERROR' && status=1 || true
  echo "branch parity: $(echo "$out" | tail -1)"
fi
exit $status
