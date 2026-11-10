#!/usr/bin/env bash
# Proves an encrypted backup from backup-db.sh can be restored: decrypts it, starts a throwaway local Supabase
# database, restores roles, schema and data in one transaction (the order Supabase documents), and counts rows.
# Touches nothing but the throwaway database, which is removed at the end.
#
#   BACKUP_PASSPHRASE=<passphrase> bash scripts/restore-check.sh <backup.tar.gz.gpg>
#
# Needs the Supabase CLI, Docker, gpg and psql. Uses port 55432 so it does not clash with a running local stack.
set -euo pipefail

: "${BACKUP_PASSPHRASE:?Set BACKUP_PASSPHRASE}"
file=${1:?Usage: restore-check.sh <backup.tar.gz.gpg>}
port=${RESTORE_CHECK_PORT:-55432}

if [ -f "$file.sha256" ]; then
  (cd "$(dirname "$file")" && shasum -a 256 -c "$(basename "$file").sha256")
fi

umask 077
work=$(mktemp -d)
stack="$work/stack"
cleanup() {
  supabase stop --no-backup --workdir "$stack" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT

gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 -d "$file" 3<<<"$BACKUP_PASSPHRASE" | tar -C "$work" -xzf -

mkdir -p "$stack"
supabase init --workdir "$stack" >/dev/null
# Only the database is needed; move its port out of the way of any other local stack.
sed -i.bak -E "/^\[db\]/,/^\[/ s/^port = [0-9]+/port = $port/" "$stack/supabase/config.toml"
supabase db start --workdir "$stack"

url="postgresql://postgres:postgres@127.0.0.1:$port/postgres"
psql --quiet --single-transaction --variable ON_ERROR_STOP=1 --dbname "$url" \
  --file "$work/roles.sql" \
  --file "$work/schema.sql" \
  --command 'SET session_replication_role = replica' \
  --file "$work/data.sql" >/dev/null

echo "Restored. Row counts in the restored copy:"
psql --no-psqlrc --tuples-only --dbname "$url" --command "
  select format('%-16s %s', t, n) from (
    select 'auth.users' t, (select count(*) from auth.users) n union all
    select 'organizations', (select count(*) from public.organizations) union all
    select 'org_students', (select count(*) from public.org_students) union all
    select 'profiles', (select count(*) from public.profiles) union all
    select 'user_roles', (select count(*) from public.user_roles) union all
    select 'audit_log', (select count(*) from public.audit_log)
  ) c;"
echo "Restore check passed."
