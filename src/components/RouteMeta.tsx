import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { routeMeta } from '../lib/seo'

function setHead(selector: string, attrs: Record<string, string>, value: string | null) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (value === null) return el?.remove()
  if (!el) {
    const created = document.createElement(attrs.rel ? 'link' : 'meta')
    Object.entries(attrs).forEach(([k, v]) => created.setAttribute(k, v))
    document.head.append(created)
    el = created
  }
  el.setAttribute(attrs.rel ? 'href' : 'content', value)
}

/** Keeps the document title and search metadata in step with the route. */
export function useRouteMeta() {
  const { pathname } = useLocation()
  const meta = routeMeta(pathname)
  useEffect(() => {
    document.title = meta.documentTitle
    setHead('meta[name="description"]', { name: 'description' }, meta.description)
    setHead('meta[property="og:title"]', { property: 'og:title' }, meta.documentTitle)
    setHead('meta[property="og:description"]', { property: 'og:description' }, meta.description)
    setHead('meta[property="og:url"]', { property: 'og:url' }, meta.canonical)
    setHead('link[rel="canonical"]', { rel: 'canonical' }, meta.canonical)
    setHead('meta[name="robots"]', { name: 'robots' }, meta.indexable ? null : 'noindex')
  }, [meta.documentTitle, meta.description, meta.canonical, meta.indexable])
  return { pathname, title: meta.title }
}

/** Applies the route's metadata and tells screen readers when the page has changed (a client-side route change is silent). */
export function RouteMeta() {
  const { pathname, title } = useRouteMeta()
  const [message, setMessage] = useState('')
  const previous = useRef(pathname)
  useEffect(() => {
    if (previous.current !== pathname) setMessage(`${title} page`)
    previous.current = pathname
  }, [pathname, title])
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  )
}
