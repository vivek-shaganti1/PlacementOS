# Database backups

The Supabase project is on the Free plan, which keeps no backups you can restore. The workflow
`.github/workflows/backup.yml` makes one every night at 03:00 IST:

1. Dumps roles, schema and data with the Supabase CLI (the commands Supabase documents for backup and restore).
2. Checks that the dump contains logins (`auth.users`) and the main tables, so a partial dump fails instead of passing.
3. Encrypts it with AES-256 under a passphrase only you hold, then writes a SHA-256 checksum.
4. Restores it into a throwaway database on the runner and counts rows. The run fails if the restore fails.
5. Keeps the encrypted file as a run artifact for 30 days, which gives 30 daily restore points.

The repository is public, so anyone signed in to GitHub can download the artifact. It is useless to them without
the passphrase. The readable dump only exists in a temporary folder on the runner and is deleted when the job ends.

## What is not covered

- **Storage files** (resume PDFs, profile photos). The text pulled out of each resume is in the database and is
  backed up, so rankings and analyses survive. The original files would need re-uploading.
- **Anything older than 30 days.** Download a backup now and then and keep it with your other important files.
- **Since the last run.** Up to a day of changes can be lost. Supabase Pro adds daily backups it manages itself, and
  point-in-time recovery is a paid add-on on top of Pro.

## One-time setup (owner)

1. **Passphrase.** Make a long random passphrase (at least 20 characters; 32 or more is better) and save it in your
   password manager first. **If it is lost, every backup is lost with it.**
2. **Connection string.** Supabase dashboard → **Connect** → **Session pooler** → copy the URI and put your database
   password in it. It looks like `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`.
   Use the Session pooler, not the direct connection: GitHub runners have no IPv6.
3. **GitHub environment.** Repository → Settings → Environments → **New environment** → `production-backup`.
   - Under *Deployment branches and tags*, choose *Selected branches* and add `main`. Only the main branch can then
     read these secrets.
   - Add the secret `SUPABASE_DB_URL` (from step 2).
   - Add the secret `BACKUP_PASSPHRASE` (from step 1).
4. **First run.** Actions → *Database backup* → **Run workflow**. It takes about 5 minutes. A green run means the
   backup was made **and** restored successfully. The summary page has the artifact.

GitHub emails you if a scheduled run fails. GitHub also pauses scheduled workflows in public repositories after 60
days without commits. If that happens, re-enable it on the Actions tab.

## Restoring

Download the artifact (`database-backup-<run id>.zip`) and unzip it.

To check a backup locally first, without touching anything live (needs Docker, the Supabase CLI, gpg and psql):

```bash
BACKUP_PASSPHRASE='<passphrase>' bash scripts/restore-check.sh placementiq-db-<time>.tar.gz.gpg
```

To restore into a **new** Supabase project (the safe way; the old project is left as it was):

```bash
shasum -a 256 -c placementiq-db-<time>.tar.gz.gpg.sha256
gpg -d placementiq-db-<time>.tar.gz.gpg | tar -xzf -     # asks for the passphrase; writes roles.sql, schema.sql, data.sql
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file roles.sql --file schema.sql \
  --command 'SET session_replication_role = replica' \
  --file data.sql \
  --dbname '<new project Session pooler connection string>'
rm roles.sql schema.sql data.sql                           # they hold student records and password hashes
```

Then point Vercel's `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and the
server's secret key at the new project. Copy the Auth settings across by hand: redirect URLs, SMTP, sign-up off.
Passwords keep working because the hashes are restored.

## Tested

2026-11-11, on a local Supabase standing in for production with synthetic data. The dump was encrypted (no readable
text in the file) and restored with identical row counts: 1 login, 1 college, 2 roster rows, 1 profile, 1 role,
1 audit row. These cases are refused: a wrong passphrase, a passphrase under 20 characters, a missing connection
string, an unreachable database (no file is written) and a modified backup file (checksum fails). The passphrase is
passed to gpg on a file descriptor and never appears in a command line. The workflow itself first runs on GitHub
once the secrets are added.
