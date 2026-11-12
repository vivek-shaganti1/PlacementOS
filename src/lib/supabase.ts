import { createClient } from '@supabase/supabase-js'

// Defaults point at the production project. The publishable key is safe to ship to browsers
// (RLS protects the data); env vars override these for other environments.
const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'https://oewjimwozaksyigfyrkz.supabase.co'
// In production the browser talks to Supabase through this app's own domain (vercel.json rewrites /supabase/* to the
// project). Some networks (ISP DNS filters, campus firewalls) block *.supabase.co, which surfaces as "Failed to fetch".
// VITE_SUPABASE_DIRECT=true turns this off for a preview or staging deployment, whose rewrite must not reach production.
const proxied = typeof window !== 'undefined' && import.meta.env.PROD && import.meta.env.VITE_SUPABASE_DIRECT !== 'true' && !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
const url = proxied ? `${window.location.origin}/supabase` : projectUrl
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_l4oFZfheVfvTBAfU3t9sRg_AwdkNqse'

export const supabaseConfigured = Boolean(url && key)

// Placeholder values keep the module importable when env vars are missing;
// the app renders a configuration screen instead of calling the API in that case.
export const supabase = createClient(url || 'http://localhost', key || 'missing-key', {
  // Fixed storage key so sessions survive switching between the direct and proxied URL.
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: `sb-${new URL(projectUrl).hostname.split('.')[0]}-auth-token` },
})

// The row and profile types live in ./types (shared with the API functions and the mobile app); re-exported here so
// existing imports keep working.
export type * from './types'


const FRIENDLY: [RegExp, string][] = [
  [/ACADEMICS_LOCKED/, 'Your academics are locked once saved. Ask your placement cell to correct them.'],
  [/email rate limit exceeded/i, 'Too many emails were sent in the last hour, so a confirmation email could not go out. Try again in an hour, or ask your admin to create your login with a temporary password.'],
  [/email address .* is invalid|email_address_invalid/i, 'That email address cannot receive mail (its domain has no mail server). Use an address you can open.'],
  [/invalid login credentials/i, 'Wrong email or password.'],
  [/auth session missing|session_not_found|session from session_id/i, 'Your session has ended. Sign in again.'],
  [/email not confirmed/i, 'Confirm your email first: open the link we sent you, then sign in.'],
]

// Database wording (table, column, constraint and policy names) is logged for debugging but never shown to users.
const TECHNICAL = /violates|constraint|relation |column |schema|PGRST|row-level security|policy|syntax error|function .*does not exist|duplicate key|JWT|permission denied for/i
const BY_CODE: Record<string, string> = {
  '23505': 'This already exists.',
  '23503': 'This refers to something that no longer exists. Refresh and try again.',
  '23514': 'One of the values is not allowed. Check the form and try again.',
  '42501': 'You do not have permission to do that.',
  PGRST301: 'Your session has expired. Sign in again.',
}

export const errMsg = (e: unknown) => {
  const raw = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : 'Something went wrong.'
  const rule = /^(?:ROSTER_DOMAIN|APPLICATION_STEP|DRIVE_HAS_OUTCOMES|CREDENTIAL_TAKEN): (.+)$/.exec(raw)
  if (rule) return rule[1]
  const friendly = FRIENDLY.find(([re]) => re.test(raw))?.[1]
  if (friendly) return friendly
  if (!TECHNICAL.test(raw)) return raw
  console.error(e)
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : ''
  return BY_CODE[code] ?? 'Something went wrong while saving. Try again, and contact your placement cell if it keeps happening.'
}

/** Reads every page of a list. One API response holds at most 1000 rows, so a long list would otherwise lose rows silently. */
export async function allRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999)
    if (error) return { data: null, error }
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return { data: out, error: null }
  }
}
