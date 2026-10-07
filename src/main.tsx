import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
