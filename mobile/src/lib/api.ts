import { API_URL } from './config'
import { supabase } from './supabase'

/** Calls one of the website's /api functions as the signed-in user (the same endpoints the web app uses). */
export async function callApi<T>(name: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('You are signed out. Please sign in again.')
  const res = await fetch(`${API_URL}/api/${name}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`)
  if (json === null) throw new Error('Unexpected response from the server. Try again.')
  return json
}
