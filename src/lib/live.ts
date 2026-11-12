import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { supabase, SUPABASE_PROJECT_URL, SUPABASE_PUBLIC_KEY } from './supabase'

// Live updates for the placement cell, recruiter and platform consoles.
//
// A console page says which tables it shows; when a row in one of them changes, the database pushes a message over a
// WebSocket (Supabase Realtime) and the page re-reads its data. Row level security applies to these messages exactly
// as it does to queries: a college only hears about its own rows.
//
// The push is a hint to re-read, never the data itself, so a missed message cannot leave a page wrong for long: while
// the socket is down (some campus networks block it) pages fall back to re-reading every 15 seconds, and every page
// re-reads when its tab is shown again.
//
// Students do not hold a socket open (there can be a thousand of them at once, more than the plan's connection limit);
// their pages keep the existing once-a-minute refresh.

export type LiveState = 'off' | 'connecting' | 'live' | 'polling'
const FALLBACK_MS = 15_000

// The app talks to Supabase through this site's own domain in production, and that proxy cannot carry a WebSocket.
// Live updates therefore use a second, direct client that holds no session of its own: it is only given the current
// access token, and only ever opens channels.
let client: SupabaseClient | null = null
function liveClient() {
  if (client) return client
  client = createClient(SUPABASE_PROJECT_URL, SUPABASE_PUBLIC_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'piq-live-unused' } })
  const auth = (token: string | undefined) => void client!.realtime.setAuth(token ?? null)
  void supabase.auth.getSession().then(({ data }) => auth(data.session?.access_token))
  supabase.auth.onAuthStateChange((_event, session) => auth(session?.access_token))
  return client
}

// One shared status for the indicator in the page header: live if any subscription is, else polling.
const states = new Map<symbol, LiveState>()
const listeners = new Set<() => void>()
let summary: LiveState = 'off'
function publish() {
  const all = [...states.values()]
  const next: LiveState = !all.length ? 'off' : all.includes('live') ? 'live' : all.includes('connecting') ? 'connecting' : 'polling'
  if (next === summary) return
  summary = next
  for (const l of listeners) l()
}
export const useLiveState = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => summary,
    () => 'off' as LiveState,
  )

/**
 * Re-runs `onChange` when any row of `tables` changes. `debounceMs` batches bursts (a roster import is hundreds of
 * rows) into one re-read; use a longer value for expensive reloads.
 */
export function useLive(tables: string[], onChange: () => void, { enabled = true, debounceMs = 400 }: { enabled?: boolean; debounceMs?: number } = {}) {
  const run = useRef(onChange)
  run.current = onChange
  const key = tables.join(',')

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const id = Symbol(key)
    let state: LiveState = 'connecting'
    let timer = 0
    let poll = 0
    let channel: RealtimeChannel | null = null
    let closed = false
    const set = (s: LiveState) => {
      state = s
      states.set(id, s)
      publish()
    }
    const fire = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => !closed && document.visibilityState === 'visible' && run.current(), debounceMs)
    }
    set('connecting')
    try {
      channel = liveClient().channel(`console:${key}:${Math.random().toString(36).slice(2, 8)}`)
      for (const table of key.split(',')) channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire)
      channel.subscribe((status) => {
        if (closed) return
        if (status === 'SUBSCRIBED') {
          // Anything that changed while the socket was down is picked up now.
          if (state === 'polling') fire()
          set('live')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') set('polling')
      })
    } catch {
      set('polling')
    }
    // The safety net: without a live socket, re-read on a timer.
    poll = window.setInterval(() => state !== 'live' && document.visibilityState === 'visible' && run.current(), FALLBACK_MS)
    const onShow = () => document.visibilityState === 'visible' && fire()
    document.addEventListener('visibilitychange', onShow)
    return () => {
      closed = true
      window.clearTimeout(timer)
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onShow)
      if (channel) void liveClient().removeChannel(channel)
      states.delete(id)
      publish()
    }
  }, [key, enabled, debounceMs])
}
