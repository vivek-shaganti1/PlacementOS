import { AnimatePresence, motion } from 'motion/react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { HOME, useAuth } from '../lib/auth'
import { AppProvider, useApp } from '../lib/store'
import { useIsMobile } from '../lib/useMediaQuery'
import AssistantDrawer from './AssistantDrawer'
import { ErrorBoundary } from './ErrorBoundary'
import { LogoMark } from './Logo'
import { Aurora } from './effects/Aurora'
import { PageTransition } from './motion/PageTransition'
import { SkipLink } from './SkipLink'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

// The signed-in app. It loads as its own chunk (and each page as another) so public visitors never download it.
const Profile = lazy(() => import('../pages/Profile'))
const EligibilityStacks = lazy(() => import('../pages/EligibilityStacks'))
const Drives = lazy(() => import('../pages/Drives'))
const Roadmap = lazy(() => import('../pages/Roadmap'))
const Practice = lazy(() => import('../pages/Practice'))
const MockInterviews = lazy(() => import('../pages/MockInterviews'))
const AlumniNetwork = lazy(() => import('../pages/AlumniNetwork'))
const Applications = lazy(() => import('../pages/Applications'))
const Certifications = lazy(() => import('../pages/Certifications'))
const Settings = lazy(() => import('../pages/Settings'))
const Help = lazy(() => import('../pages/Help'))
const Analytics = lazy(() => import('../pages/Analytics'))
const Dashboard = lazy(() => import('../pages/Dashboard'))
const SkillGap = lazy(() => import('../pages/SkillGap'))
const WhatIf = lazy(() => import('../pages/WhatIf'))
const Jobs = lazy(() => import('../pages/Jobs'))
const AdminOverview = lazy(() => import('../pages/Admin').then((m) => ({ default: m.AdminOverview })))
const AdminStudents = lazy(() => import('../pages/Admin').then((m) => ({ default: m.AdminStudents })))
const AdminJobs = lazy(() => import('../pages/Admin').then((m) => ({ default: m.AdminJobs })))
const AdminTeam = lazy(() => import('../pages/AdminOrg').then((m) => ({ default: m.AdminTeam })))
const AdminRoster = lazy(() => import('../pages/AdminOrg').then((m) => ({ default: m.AdminRoster })))
const SuperOrgs = lazy(() => import('../pages/AdminOrg').then((m) => ({ default: m.SuperOrgs })))
const AdminClasses = lazy(() => import('../pages/AdminOrg').then((m) => ({ default: m.AdminClasses })))
const SuperAdmins = lazy(() => import('../pages/AdminOrg').then((m) => ({ default: m.SuperAdmins })))
const SuperCertifications = lazy(() => import('../pages/SuperCertifications'))
const ResumeAnalyzer = lazy(() => import('../pages/ResumeAnalyzer'))

function Loader() {
  return (
    <div role="status" aria-label="Loading" className="grid flex-1 place-items-center">
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
        <Route path="/super/certifications" element={<SuperCertifications />} />
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
    <div className="relative flex h-[calc(100dvh/var(--z))] flex-col overflow-hidden">
      <SkipLink />
      <Aurora />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <Topbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <div className="flex min-h-0 flex-1">
          <Sidebar open={sidebarOpen} onChat={() => openAssistant()} mobile={isMobile} onClose={() => setSidebarOpen(false)} />
          <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 outline-none">
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
      {/* Centred by a flex row, not translate-x: Motion writes its own transform and would cancel a transform class. */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[60] flex justify-center px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, transform: 'translateY(12px) scale(0.97)' }}
              animate={{ opacity: 1, transform: 'translateY(0px) scale(1)', transition: { duration: 0.24, ease: [0.23, 1, 0.32, 1] } }}
              exit={{ opacity: 0, transform: 'translateY(6px) scale(0.98)', transition: { duration: 0.16, ease: [0.23, 1, 0.32, 1] } }}
              className="glass-dark pointer-events-auto w-max max-w-full rounded-[14px] px-4 py-2.5 text-center text-[12.5px] font-medium text-white"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function SignedInApp() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
