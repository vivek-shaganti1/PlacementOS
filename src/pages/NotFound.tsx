import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Aurora } from '../components/effects/Aurora'

export default function NotFound() {
  return (
    <div className="relative grid min-h-[calc(100svh/var(--z))] place-items-center px-4 text-center">
      <Aurora />
      <main id="main" tabIndex={-1} className="relative z-10 max-w-[460px] outline-none">
        <Link to="/" aria-label="PlacementIQ home" className="inline-block"><Logo size={30} tagline={false} /></Link>
        <p className="label-mono mt-10 flex justify-center"><b>404</b> Page not found</p>
        <h1 className="mt-4 text-[clamp(2rem,1.6rem+2vw,3rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-ink">
          This page <span className="font-display font-normal italic text-gradient">does not exist.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-[1.6] text-ink-mute">The link may be old or mistyped.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-ink">Back to PlacementIQ</Link>
          <Link to="/login" className="btn-bracket">Sign in</Link>
        </div>
      </main>
    </div>
  )
}
