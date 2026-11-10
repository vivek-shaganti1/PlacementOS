# Realtime test report

NOT_APPLICABLE: no Supabase Realtime, WebSocket or SSE in src/, api/ or supabase/ (W2). The app polls every 60 s (src/lib/jobs.ts, store.tsx); cost noted in W5-25. Concurrency reviewed by source: consume_ai, seat limit, connect_attempt, replace_rows and status transitions are serialized; the per-IP sign-up cap is not (W1-8). No concurrency test was run (BLOCKED).
