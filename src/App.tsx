import { useState, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AssistantDrawer from './components/AssistantDrawer'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { AuthProvider, useAuth } from './lib/auth'
import { AppProvider, useApp } from './lib/store'
import { supabaseConfigured } from './lib/supabase'
import Login from './pages/Login'

import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import EligibilityStacks from './pages/EligibilityStacks'
import Drives from './pages/Drives'
import SkillGap from './pages/SkillGap'
import Roadmap from './pages/Roadmap'
import Practice from './pages/Practice'
import MockInterviews from './pages/MockInterviews'
import AlumniNetwork from './pages/AlumniNetwork'
import Applications from './pages/Applications'
import Analytics from './pages/Analytics'
import ResumeAnalyzer from './pages/ResumeAnalyzer'
import Certifications from './pages/Certifications'
import Settings from './pages/Settings'
import Help from './pages/Help'

function Shell() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { openAssistant, toast } = useApp()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      <Topbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex min-h-0 flex-1">
        <Sidebar open={sidebarOpen} onChat={() => openAssistant()} />
        <main className="flex min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/eligibility" replace />} />
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
            <Route path="*" element={<Navigate to="/eligibility" replace />} />
          </Routes>
        </main>
      </div>
      <AssistantDrawer />
      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl2 bg-ink px-4 py-2.5 text-[12.5px] font-medium text-white shadow-pop">
          {toast}
        </div>
      )}
    </div>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="grid min-h-screen place-items-center bg-canvas px-4 text-center text-[13px] text-ink-mute">{children}</div>
}

function Gate() {
  const { session, loading, recovering, profile, profileError, signOut } = useAuth()
  const { pathname } = useLocation()

  if (loading) return <Centered>Loading…</Centered>
  if (!session) return <Login />
  if (recovering || pathname === '/reset-password') return <Login initialMode="reset" />
  if (!profile)
    return (
      <Centered>
        {profileError ? (
          <div className="card max-w-[420px] p-6">
            <p className="font-semibold text-ink">We couldn't load your profile</p>
            <p className="mt-1">{profileError}</p>
            <button onClick={signOut} className="mt-4 rounded-[9px] bg-brand px-4 py-2 font-semibold text-white">Sign out</button>
          </div>
        ) : (
          'Loading your profile…'
        )}
      </Centered>
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
