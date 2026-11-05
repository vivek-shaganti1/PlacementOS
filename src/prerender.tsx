// Build-time entry (scripts/prerender.mjs), never part of the browser bundle. Renders public pages to HTML for crawlers,
// link previews and the first paint; the browser app replaces this HTML once it has loaded.
import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import Landing from './pages/Landing'
import Legal from './pages/Legal'

export { routeMeta, SITE_URL } from './lib/seo'

const PAGES: Record<string, ReactElement> = {
  '/': <Landing />,
  '/privacy': <Legal doc="privacy" />,
  '/terms': <Legal doc="terms" />,
  '/security': <Legal doc="security" />,
}

export const routes = Object.keys(PAGES)

export const render = (path: string) => renderToString(<StaticRouter location={path}>{PAGES[path]}</StaticRouter>)
