import { useLiveState } from '../lib/live'

/** Tells console users whether the page updates by itself right now. Shown only where something is subscribed. */
export function LiveBadge() {
  const state = useLiveState()
  if (state === 'off') return null
  const live = state === 'live'
  return (
    <span
      role="status"
      title={live ? 'This page updates by itself as things change.' : 'Live connection unavailable on this network. The page refreshes every 15 seconds instead.'}
      className={`inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-semibold ${live ? 'border-[#abefc6] bg-[#ecfdf3] text-[#067647]' : 'border-line bg-white/70 text-ink-mute'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-[#12b76a]' : state === 'connecting' ? 'bg-[#f79009]' : 'bg-ink-faint'}`} />
      {live ? 'Live' : state === 'connecting' ? 'Connecting' : 'Refreshing every 15 s'}
    </span>
  )
}
