import { motion, MotionConfig } from 'motion/react'
import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LogoMark } from './components/Logo'
import { RouteMeta } from './components/RouteMeta'
import { Aurora } from './components/effects/Aurora'
import { AuthProvider, useAuth } from './lib/auth'
import { hasStoredSession, heldHtml } from './lib/prerendered'
import { isAppPath, normalizePath } from './lib/seo'
import { supabaseConfigured } from './lib/supabase'

// Everything below loads on demand: the entry chunk holds only auth, routing and the gate.
const SignedInApp = lazy(() => import('./components/Shell'))
const Login = lazy(() => import('./pages/Login'))
const TwoFactor = lazy(() => import('./pages/TwoFactor'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Landing = lazy(() => import('./pages/Landing'))
const Legal = lazy(() => import('./pages/Legal'))
const NotFound = lazy(() => import('./pages/NotFound'))

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-[calc(100svh/var(--z))] place-items-center px-4 text-center text-[13px] text-ink-mute">
      <Aurora />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function Splash() {
  return (
    <Centered>
      <motion.div role="status" aria-label="Loading" animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
        <LogoMark size={56} animate />
      </motion.div>
    </Centered>
  )
}

/** While a public page's code loads, its prerendered HTML stays on screen instead of a loader. */
function Hold() {
  const { pathname } = useLocation()
  const html = heldHtml(pathname)
  return html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <Splash />
}

function PublicRoutes() {
  const { pathname } = useLocation()
  return (
    <Suspense fallback={<Hold />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login initialMode="signup" />} />
        <Route path="/reset-password" element={<Login />} />
        {/* App links opened while signed out still go to sign-in; anything else is a real not-found page. */}
        <Route path="*" element={isAppPath(pathname) ? <Navigate to="/login" replace /> : <NotFound />} />
      </Routes>
    </Suspense>
  )
}

function Gate() {
  const { session, loading, recovering, mustChangePassword, profile, profileError, signOut, role, aal } = useAuth()
  const { pathname } = useLocation()

  // Policy pages open for everyone, signed in or not.
  const legal = ({ '/privacy': 'privacy', '/terms': 'terms', '/security': 'security' } as const)[normalizePath(pathname) as '/privacy']
  if (legal)
    return (
      <Suspense fallback={<Hold />}>
        <Legal doc={legal} />
      </Suspense>
    )
  if (loading) return hasStoredSession() ? <Splash /> : <Hold />
  if (!session) return <PublicRoutes />
  // Accounts created with a temporary password choose their own before anything else.
  if (recovering || mustChangePassword || pathname === '/reset-password')
    return (
      <Suspense fallback={<Splash />}>
        <Login initialMode="reset" />
      </Suspense>
    )
  if (!profile)
    return profileError ? (
      <Centered>
        <div className="card max-w-[420px] p-6">
          <p className="font-semibold text-ink">We couldn't load your profile</p>
          <p className="mt-1">{profileError}</p>
          <button onClick={signOut} className="btn-primary mt-4">Sign out</button>
        </div>
      </Centered>
    ) : (
      <Splash />
    )

  // Platform admins and placement cells need a code from an authenticator app as well as the password.
  if ((role === 'super' || role === 'org') && aal !== 'aal2')
    return (
      <Suspense fallback={<Splash />}>
        <TwoFactor />
      </Suspense>
    )

  // Students get in only after their college adds their email to its roster.
  if (role === 'student' && !profile.org_id)
    return (
      <Centered>
        <div className="card max-w-[460px] p-7 text-left">
          <LogoMark size={40} />
          <p className="mt-4 text-[17px] font-semibold text-ink">Waiting for your college</p>
          <p className="mt-2 leading-relaxed">
            <b className="text-ink">{session.user.email}</b> has not been added by a college yet. Ask your placement cell to add this email on their
            PlacementIQ roster, then sign in again.
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={() => window.location.reload()} className="btn-primary">Check again</button>
            <button onClick={signOut} className="btn-glass">Sign out</button>
          </div>
        </div>
      </Centered>
    )

  // Only student accounts go through onboarding; admin accounts have no student profile to fill.
  if (role === 'student' && !profile.onboarded_at)
    return (
      <Suspense fallback={<Splash />}>
        <Onboarding />
      </Suspense>
    )

  return (
    <Suspense fallback={<Splash />}>
      <SignedInApp key={session.user.id} />
    </Suspense>
  )
}

export default function App() {
  return (
    // Motion honours prefers-reduced-motion everywhere: transforms are dropped, opacity stays.
    <MotionConfig reducedMotion="user">
      <RouteMeta />
      {supabaseConfigured ? (
        <AuthProvider>
          <ErrorBoundary>
            <Gate />
          </ErrorBoundary>
        </AuthProvider>
      ) : (
        <Centered>
          <div className="card max-w-[460px] p-6 text-left">
            <p className="text-[15px] font-semibold text-ink">Supabase is not configured</p>
            <p className="mt-2">
              Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code> (or your
              Vercel project's environment variables) and rebuild.
            </p>
          </div>
        </Centered>
      )}
    </MotionConfig>
  )
}
