import { motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Aurora } from '../components/Page'

const UPDATED = '21 October 2026'

type Doc = { title: string; accent: string; intro: string; sections: { id?: string; h: string; body: ReactNode }[] }

const DOCS: Record<'privacy' | 'terms' | 'security', Doc> = {
  privacy: {
    title: 'Privacy',
    accent: 'policy',
    intro: 'What PlacementIQ collects, why, where it is kept and who can see it. PlacementIQ is used by colleges for their own students; your college is responsible for adding you and is your first point of contact.',
    sections: [
      { h: 'What we collect', body: <ul><li>Account: your college email, name and the roll number your college provides.</li><li>Profile you enter: academics (CGPA, backlogs, Class X and XII), skills, projects, internships, certifications and achievements.</li><li>Evidence you connect: your resume file and its extracted text, and public statistics from GitHub, LeetCode, Codeforces and CodeChef for the usernames you add.</li><li>Activity in the app: applications to campus drives, practice attempts, mock-interview notes, assistant conversations and daily progress snapshots.</li></ul> },
      { h: 'Why we use it', body: <p>To score your profile against recruiter requirements, explain each eligibility decision, analyse your resume, answer your questions in the AI assistant, and let your placement cell run drives. We do not sell data and we do not show advertising.</p> },
      { h: 'AI processing', body: <p>When you analyse a resume, match a job description or ask the assistant, the relevant text and your profile are sent to our AI provider (Groq) to generate the answer. Only your own data is included. Each AI action counts against your college's plan.</p> },
      { h: 'Who can see your data', body: <ul><li>You.</li><li>Your college's placement cell, for students on its roster.</li><li>A recruiter added by your college, only for drives you apply to, and never if your visibility is set to Private.</li><li>PlacementIQ platform administrators, to operate the service.</li></ul> },
      { h: 'Where it is stored', body: <p>In a managed PostgreSQL database and private file storage (Supabase), hosted in India (Mumbai region). Every table is protected by row-level security; resumes are in a private bucket opened only through short-lived signed links.</p> },
      { h: 'Your choices and rights', body: <p>You can view and correct your profile at any time, disconnect coding accounts, delete your resume, and set your visibility in Settings. To export or delete your account, ask your placement cell. We follow the Digital Personal Data Protection Act, 2023.</p> },
      { h: 'Cookies and storage', body: <p>We use your browser's local storage only to keep you signed in and remember small preferences. There are no advertising or cross-site tracking cookies.</p> },
      { id: 'contact', h: 'Contact', body: <p>For anything about your data, contact your college's placement cell first. They can reach the PlacementIQ team for you.</p> },
    ],
  },
  terms: {
    title: 'Terms of',
    accent: 'use',
    intro: 'The rules for using PlacementIQ. Colleges subscribe to the platform; students and recruiters use it through their college.',
    sections: [
      { h: 'Who can use it', body: <p>Access is by invitation only. A college adds its students to a roster and its placement-cell staff and recruiters as users. Keep your login private and tell your placement cell if you think someone else has used it.</p> },
      { h: 'Accurate information', body: <p>Enter your own, truthful information. Placement cells and recruiters rely on it, and your college may verify it against official records.</p> },
      { h: 'Guidance, not a guarantee', body: <p>Eligibility categories, match scores, expected salary, readiness scores and AI answers are estimates that help you prepare. They do not guarantee a shortlist, an offer or a particular result, and recruiters make their own decisions.</p> },
      { h: 'Acceptable use', body: <ul><li>No attempts to access other users' data or to bypass security.</li><li>No uploading of content you do not have the right to share.</li><li>No automated scraping or overloading of the service.</li></ul> },
      { h: 'Plans and AI limits', body: <p>Each college's plan sets the number of students and monthly AI actions. When a college's subscription is not active, AI features pause until it is renewed.</p> },
      { h: 'Changes', body: <p>We may update these terms as the product changes. The date at the top shows the latest version.</p> },
    ],
  },
  security: {
    title: 'Security',
    accent: 'at PlacementIQ',
    intro: 'How access is enforced and how your data is protected. Security is enforced by the database itself, not only by what the screens show.',
    sections: [
      { h: 'Access enforced in the database', body: <p>Roles (platform admin, placement cell, recruiter, student) are stored in the database and checked by row-level security on every table. A placement cell sees only its own college; a recruiter sees only applicants to its own drives; a student sees only their own records.</p> },
      { h: 'Tested on production', body: <p>A suite of 39 access-control tests runs against the production database, including attempts to read another college's students, forge application scores, inject links, escalate roles and bypass the sign-up rules. All 39 pass.</p> },
      { h: 'Accounts', body: <p>Only emails added by a college can register. Sign-up gives one answer for every mismatch and limits repeated attempts. Accounts created with a temporary password must choose their own at first sign-in, and platform admins can only be invited by email.</p> },
      { h: 'Files and keys', body: <p>Resumes are kept in private storage and opened through signed links that expire within minutes. Database secrets and AI keys live only in server functions and never reach the browser.</p> },
      { h: 'In the browser', body: <p>A strict content security policy, frame protection and no third-party trackers. Links that students add are checked so that only web links can be opened.</p> },
      { h: 'Reporting a problem', body: <p>If you find a security issue, tell your placement cell or the PlacementIQ team. Please do not test against other people's accounts.</p> },
    ],
  },
}

export default function Legal({ doc }: { doc: keyof typeof DOCS }) {
  const d = DOCS[doc]
  const { hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
  }, [doc, hash])

  return (
    <div className="relative min-h-screen">
      <Aurora />
      <div className="relative z-10 mx-auto max-w-[860px] px-6 pb-24 pt-6">
        <header className="flex items-center justify-between">
          <Link to="/" aria-label="PlacementIQ home"><Logo size={30} tagline={false} /></Link>
          <nav aria-label="Legal" className="glass flex gap-1 rounded-full p-1 text-[12.5px] font-semibold">
            {(['privacy', 'terms', 'security'] as const).map((k) => (
              <NavLink key={k} to={`/${k}`} className={({ isActive }) => `rounded-full px-3.5 py-1.5 ${isActive ? 'bg-[oklch(0.2_0.045_285)] text-white' : 'text-ink-soft hover:text-ink'}`}>
                {k[0].toUpperCase() + k.slice(1)}
              </NavLink>
            ))}
          </nav>
        </header>

        <motion.article key={doc} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mt-14">
          <p className="label-mono"><b>{doc === 'privacy' ? '01' : doc === 'terms' ? '02' : '03'}</b> Last updated {UPDATED}</p>
          <h1 className="mt-4 text-[clamp(2.2rem,1.6rem+2.4vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-ink">
            {d.title} <span className="font-display font-normal italic text-gradient">{d.accent}</span>
          </h1>
          <p className="mt-5 max-w-[680px] text-[15.5px] leading-[1.7] text-ink-mute">{d.intro}</p>

          <div className="mt-10 space-y-3">
            {d.sections.map((s, i) => (
              <section key={s.h} id={s.id} className="card legal-section scroll-mt-6 p-6">
                <h2 className="flex items-baseline gap-3 text-[17px] font-semibold tracking-[-0.02em] text-ink">
                  <span className="font-mono text-[11px] font-medium text-brand">{String(i + 1).padStart(2, '0')}</span>
                  {s.h}
                </h2>
                <div className="legal-body mt-2.5 pl-8 text-[14px] leading-[1.7] text-ink-soft">{s.body}</div>
              </section>
            ))}
          </div>

          <p className="mt-10 text-[12.5px] text-ink-faint">
            Questions? <Link to="/privacy#contact" className="font-medium text-brand-dark hover:underline">Contact</Link> · <Link to="/" className="font-medium text-brand-dark hover:underline">Back to PlacementIQ</Link>
          </p>
        </motion.article>
      </div>
    </div>
  )
}
