#!/usr/bin/env bash
# Encrypted backup of the Supabase database: roles, schema and data, made with the dump commands Supabase documents
# (https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).
#
#   SUPABASE_DB_URL=<Session pooler connection string> BACKUP_PASSPHRASE=<long passphrase> \
#     bash scripts/backup-db.sh <output-dir>
#
# Writes <output-dir>/placementiq-db-<UTC time>.tar.gz.gpg (AES-256, passphrase from BACKUP_PASSPHRASE) and a .sha256
# next to it. The unencrypted dump only ever exists in a private temporary folder that is removed on exit, because it
# holds student records and login password hashes. Needs the Supabase CLI, Docker and gpg.
# Storage files (resumes, photos) are not in the database and are not part of this backup.
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the Session pooler connection string}"
: "${BACKUP_PASSPHRASE:?Set BACKUP_PASSPHRASE}"
if [ "${#BACKUP_PASSPHRASE}" -lt 20 ]; then
  echo "BACKUP_PASSPHRASE must be at least 20 characters." >&2
  exit 1
fi
out=${1:?Usage: backup-db.sh <output-dir>}

umask 077
mkdir -p "$out"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

echo "Dumping roles, schema and data"
supabase db dump --remote="$SUPABASE_DB_URL" -f "$work/roles.sql" --role-only
supabase db dump --remote="$SUPABASE_DB_URL" -f "$work/schema.sql"
supabase db dump --remote="$SUPABASE_DB_URL" -f "$work/data.sql" --data-only --use-copy \
  -x storage.buckets_vectors -x storage.vector_indexes

# A dump that "succeeds" but is empty or partial is worse than a failure, so check for the tables the app lives on.
for f in roles schema data; do
  [ -s "$work/$f.sql" ] || { echo "$f.sql is empty" >&2; exit 1; }
done
for t in profiles org_students organizations user_roles; do
  grep -q "\"public\".\"$t\"" "$work/schema.sql" || { echo "schema.sql has no public.$t" >&2; exit 1; }
  grep -q "COPY \"public\".\"$t\"" "$work/data.sql" || { echo "data.sql has no data section for public.$t" >&2; exit 1; }
done
grep -q 'COPY "auth"."users"' "$work/data.sql" || { echo "data.sql has no auth.users (logins would be lost)" >&2; exit 1; }

name="placementiq-db-$(date -u +%Y%m%dT%H%M%SZ).tar.gz.gpg"
# The passphrase goes in on a file descriptor, never on the command line.
tar -C "$work" -czf - roles.sql schema.sql data.sql |
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
    --symmetric --cipher-algo AES256 --s2k-digest-algo SHA512 --s2k-count 65011712 \
    -o "$out/$name" 3<<<"$BACKUP_PASSPHRASE"
(cd "$out" && shasum -a 256 "$name" > "$name.sha256")

echo "Backup written: $out/$name ($(wc -c < "$out/$name" | tr -d ' ') bytes, encrypted)"
