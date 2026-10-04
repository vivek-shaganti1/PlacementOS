import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AssistantDrawer from './components/AssistantDrawer'
import { LogoMark } from './components/Logo'
import { Aurora } from './components/Page'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { AuthProvider, useAuth } from './lib/auth'
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
const Jobs = lazy(() => import('./pages/Jobs'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const AdminOverview = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminOverview })))
const AdminStudents = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminStudents })))
const AdminJobs = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminJobs })))
const AdminTeam = lazy(() => import('./pages/Admin').then((m) => ({ default: m.AdminTeam })))
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

function Shell() {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 1023px)').matches)
  const { openAssistant, toast } = useApp()
  const location = useLocation()

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
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                className="flex min-w-0 flex-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                <Suspense fallback={<Loader />}>
                  <Routes location={location}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/signup" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/eligibility" element={<EligibilityStacks />} />
                    <Route path="/drives" element={<Drives />} />
                    <Route path="/skill-gap" element={<SkillGap />} />
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
                    <Route path="/admin" element={<AdminOverview />} />
                    <Route path="/admin/students" element={<AdminStudents />} />
                    <Route path="/admin/jobs" element={<AdminJobs />} />
                    <Route path="/admin/team" element={<AdminTeam />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
      <AssistantDrawer />
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
  const { session, loading, recovering, profile, profileError, signOut } = useAuth()
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

  if (!profile.onboarded_at)
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
      <Gate />
    </AuthProvider>
  )
}
