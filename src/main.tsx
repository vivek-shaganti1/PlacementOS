import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { holdPrerender } from './lib/prerendered'
// Fonts are served from this site (no request to Google). Only the scripts a page uses are downloaded (unicode-range).
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/geist-mono/wght.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './index.css'

// After a new deploy, an open tab still references the previous build's chunk names; loading one fails. Reload once to
// pick up the new build instead of leaving a broken screen (guarded so a real outage cannot cause a reload loop).
window.addEventListener('vite:preloadError', (event) => {
  // Decorative 3D chunks have their own static fallback; never reload the page for them.
  if (/(three|HeroScene|Distortion|Scene)-/.test(String((event as Event & { payload?: Error }).payload?.message))) return
  try {
    const last = Number(sessionStorage.getItem('piq-chunk-reload') ?? 0)
    if (Date.now() - last < 30_000) return
    sessionStorage.setItem('piq-chunk-reload', String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

const root = document.getElementById('root')!
holdPrerender(root)

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
