import { supabase } from './supabase'

/** POSTs to one of our /api functions as the signed-in user and returns the JSON body, throwing on error. */
export async function callApi<T>(name: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('You are signed out. Please sign in again.')
  const res = await fetch(`/api/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
  // A 200 that is not JSON (a proxy or error page) must not reach callers as an empty object.
  if (json === null) throw new Error('Unexpected response from the server. Try again.')
  return json
}
