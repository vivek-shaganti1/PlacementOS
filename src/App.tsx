import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AssistantDrawer from './components/AssistantDrawer'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LogoMark } from './components/Logo'
import { Aurora } from './components/Page'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { PageTransition } from './components/motion/PageTransition'
import { AuthProvider, HOME, useAuth } from './lib/auth'
import { AppProvider, useApp } from './lib/store'
import { supabaseConfigured } from './lib/supabase'
import { useIsMobile } from './lib/useMediaQuery'
import Login from './pages/Login'

import Profile from './pages/Profile'
import EligibilityStacks from './pages/EligibilityStacks'
import Drives from './pages/Drives'
import Roadmap from './pages/Roadmap'
import Practice from './pages/Practice'
import MockInterviews from './pages/MockInterviews'
import AlumniNetwork from './pages/AlumniNetwork'
import Applications from './pages/Applications'
import Certifications from './pages/Certifications'
import Settings from './pages/Settings'
import Help from './pages/Help'

// Heavier pages (charts, PDF parsing, marketing) load on demand.
const Analytics = lazy(() => import('./pages/Analytics'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const SkillGap = lazy(() => import('./pages/SkillGap'))
const WhatIf = lazy(() => import('./pages/WhatIf'))
const Jobs = lazy(() => import('./pages/Jobs'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const AdminOverview = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminOverview })))
const AdminStudents = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminStudents })))
const AdminJobs = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminJobs })))
const AdminTeam = lazy(() => import('./pages/AdminOrg').then((m) => ({ default: m.AdminTeam })))
const AdminRoster = lazy(() => import('./pages/AdminOrg').then((m) => ({ default: m.AdminRoster })))
const SuperOrgs = lazy(() => import('./pages/AdminOrg').then((m) => ({ default: m.SuperOrgs })))
const AdminClasses = lazy(() => import('./pages/AdminOrg').then((m) => ({ default: m.AdminClasses })))
const SuperAdmins = lazy(() => import('./pages/AdminOrg').then((m) => ({ default: m.SuperAdmins })))
const ResumeAnalyzer = lazy(() => import('./pages/ResumeAnalyzer'))
const Landing = lazy(() => import('./pages/Landing'))

function Loader() {
  return (
    <div className="grid flex-1 place-items-center">
      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
        <LogoMark size={44} />
      </motion.div>
    </div>
  )
}

/** Each account type gets only its own pages; anything else lands on that account's home. */
function RoleRoutes() {
  const { role } = useAuth()
  const location = useLocation()
  const home = HOME[role]
  const common = [
    <Route key="root" path="/" element={<Navigate to={home} replace />} />,
    <Route key="login" path="/login" element={<Navigate to={home} replace />} />,
    <Route key="signup" path="/signup" element={<Navigate to={home} replace />} />,
    <Route key="any" path="*" element={<Navigate to={home} replace />} />,
  ]
  if (role === 'super')
    return (
      <Routes location={location}>
        <Route path="/super/orgs" element={<SuperOrgs />} />
        <Route path="/super/admins" element={<SuperAdmins />} />
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/students" element={<AdminStudents />} />
        <Route path="/admin/classes" element={<AdminClasses />} />
        <Route path="/admin/roster" element={<AdminRoster />} />
        <Route path="/admin/jobs" element={<AdminJobs />} />
        <Route path="/admin/team" element={<AdminTeam />} />
        {common}
      </Routes>
    )
  if (role === 'recruiter')
    return (
      <Routes location={location}>
        <Route path="/recruiter" element={<AdminJobs />} />
        {common}
      </Routes>
    )
  if (role === 'org')
    return (
      <Routes location={location}>
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/students" element={<AdminStudents />} />
        <Route path="/admin/classes" element={<AdminClasses />} />
        <Route path="/admin/roster" element={<AdminRoster />} />
        <Route path="/admin/jobs" element={<AdminJobs />} />
        <Route path="/admin/team" element={<AdminTeam />} />
        {common}
      </Routes>
    )
  return (
    <Routes location={location}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/eligibility" element={<EligibilityStacks />} />
      <Route path="/drives" element={<Drives />} />
      <Route path="/skill-gap" element={<SkillGap />} />
      <Route path="/what-if" element={<WhatIf />} />
      <Route path="/roadmap" element={<Roadmap />} />
      <Route path="/practice" element={<Practice />} />
      <Route path="/mock-interviews" element={<MockInterviews />} />
      <Route path="/alumni" element={<AlumniNetwork />} />
      <Route path="/applications" element={<Applications />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/resume" element={<ResumeAnalyzer />} />
      <Route path="/certifications" element={<Certifications />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/help" element={<Help />} />
      <Route path="/jobs" element={<Jobs />} />
      {common}
    </Routes>
  )
}

function Shell() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 1023px)').matches)
  const { openAssistant, toast } = useApp()
  const { role } = useAuth()
  const { pathname } = useLocation()

  // The app scrolls inside its panes; the document itself must never stay scrolled (that reads as a blank page).
  useEffect(() => {
    const reset = () => {
      if (window.scrollY || document.documentElement.scrollTop) window.scrollTo(0, 0)
    }
    window.addEventListener('scroll', reset, { passive: true })
    return () => window.removeEventListener('scroll', reset)
  }, [])

  // Switching between phone and desktop layouts: drawer starts closed on phones, rail starts open on desktop.
  useEffect(() => setSidebarOpen(!isMobile), [isMobile])

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <Aurora />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <div className="flex min-h-0 flex-1">
          <Sidebar open={sidebarOpen} onChat={() => openAssistant()} mobile={isMobile} onClose={() => setSidebarOpen(false)} />
          <main className="flex min-w-0 flex-1">
            <PageTransition kind="rise" className="flex min-w-0 flex-1">
              <ErrorBoundary resetKey={pathname}>
                <Suspense fallback={<Loader />}>
                  <RoleRoutes />
                </Suspense>
              </ErrorBoundary>
            </PageTransition>
          </main>
        </div>
      </div>
      {role === 'student' && (
        <ErrorBoundary compact>
          <AssistantDrawer />
        </ErrorBoundary>
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass-dark fixed bottom-6 left-1/2 z-[60] w-max max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-[14px] px-4 py-2.5 text-center text-[12.5px] font-medium text-white"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid min-h-screen place-items-center px-4 text-center text-[13px] text-ink-mute">
      <Aurora />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function Splash() {
  return (
    <Centered>
      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}>
        <LogoMark size={56} animate />
      </motion.div>
    </Centered>
  )
}

function PublicRoutes() {
  return (
    <Suspense fallback={<Splash />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Login initialMode="signup" />} />
        <Route path="/reset-password" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}

function Gate() {
  const { session, loading, recovering, profile, profileError, signOut, role } = useAuth()
  const { pathname } = useLocation()

  if (loading) return <Splash />
  if (!session) return <PublicRoutes />
  if (recovering || pathname === '/reset-password') return <Login initialMode="reset" />
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
    <AppProvider key={session.user.id}>
      <Shell />
    </AppProvider>
  )
}

export default function App() {
  if (!supabaseConfigured)
    return (
      <Centered>
        <div className="card max-w-[460px] p-6 text-left">
          <p className="text-[15px] font-semibold text-ink">Supabase is not configured</p>
          <p className="mt-2">
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code> (or your
            Vercel project's environment variables) and rebuild.
          </p>
        </div>
      </Centered>
    )

  return (
    <AuthProvider>
      <ErrorBoundary>
        <Gate />
      </ErrorBoundary>
    </AuthProvider>
  )
}
