import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AssistantDrawer from './components/AssistantDrawer'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { AppProvider, useApp } from './lib/store'

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
  const { openAssistant } = useApp()

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
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
