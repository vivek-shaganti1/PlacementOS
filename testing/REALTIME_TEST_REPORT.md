# Realtime report

Repo vivek-shaganti1/PlacementOS | branch main | commit 261d422 (261d42271b226f3186aca85d29b408e48fd4ed38) | working tree dirty: docs/paper/*.docx,*.pdf modified, docs/iomp/ untracked (preserved, not part of the audited code) | audit date 2026-11-05

No Supabase Realtime, .channel(, publication or polling exists, so subscription authorization and event ordering are NOT_APPLICABLE. All data refreshes on reload (DEF-08). onAuthStateChange and Landing interval have cleanup.

Races by reading only: seats serialised by FOR UPDATE, quota by advisory lock, applications by primary key. signup_attempt and replace_rows are NV-04 and NV-05. No concurrency test was run.
