// `npm run build` writes real HTML into #root for public routes (scripts/prerender.mjs). The app does not hydrate it: React
// replaces it. Holding on to that HTML lets the page stay on screen, unchanged, until its code has loaded.
let held: { path: string; html: string } | null = null

/** Call once, before React takes over the root element. */
export function holdPrerender(root: HTMLElement) {
  const path = root.dataset.prerendered
  if (path && root.firstElementChild) held = { path, html: root.innerHTML }
}

export const heldHtml = (pathname: string) => (held?.path === pathname ? held.html : null)

/** A signed-in visitor is about to be redirected, so the public page should not flash for them. */
export function hasStoredSession() {
  try {
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k))
  } catch {
    return false
  }
}
