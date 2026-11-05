/** First stop for keyboard users: hidden until focused, then jumps past the navigation to the page's main landmark. */
export function SkipLink() {
  return (
    <a
      href="#main"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById('main')?.focus()
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-[10px] focus:bg-[oklch(0.2_0.045_285)] focus:px-4 focus:py-2 focus:text-[13px] focus:font-semibold focus:text-white"
    >
      Skip to main content
    </a>
  )
}
