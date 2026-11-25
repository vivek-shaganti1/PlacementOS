import { redactEvent, scrubDeep } from './scrub'

// Error reports go to Sentry only when VITE_SENTRY_DSN is set at build time. The library loads after the page does, so it
// costs the first screen nothing. Reports carry no personal data: see redactEvent.
type Sentry = typeof import('./sentryClient')
let sentry: Promise<Sentry> | null = null

export function startMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn || sentry) return
  sentry = import('./sentryClient').then((s) => {
    s.init({
      dsn,
      environment: (import.meta.env.VITE_DEPLOY_ENV as string) || 'local',
      sendDefaultPii: false,
      tracesSampleRate: 0,
      // Session pings do not pass through beforeSend and would be sent on every visit; only errors are reported.
      integrations: (all) => all.filter((i) => i.name !== 'BrowserSession'),
      // Console output and typed text can hold personal data; only navigation and failed requests are kept, scrubbed.
      beforeBreadcrumb: (b) => (b.category === 'console' || b.category?.startsWith('ui.') ? null : (scrubDeep({ ...b, data: b.data ? { method: b.data.method, status_code: b.data.status_code, to: String(b.data.to ?? '').split('?')[0] } : undefined }) as typeof b)),
      beforeSend: (event) => redactEvent(event),
    })
    return s
  })
  sentry.catch(() => undefined)
}

/** Reports an error caught by the app. Does nothing when monitoring is off. */
export function reportError(error: unknown, where: string) {
  sentry?.then((s) => s.captureException(error, { tags: { where } })).catch(() => undefined)
}
