import { motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { SkipLink } from '../components/SkipLink'
import { Aurora } from '../components/effects/Aurora'

const UPDATED = '5 November 2026'

// PLACEHOLDER: no real grievance contact exists in the repository. The owner must replace this before publishing.
// Owner: replace with a named grievance contact and email once one is appointed.
const GRIEVANCE_CONTACT = 'the PlacementIQ team, through your placement cell'

type Doc = { title: string; accent: string; intro: string; sections: { id?: string; h: string; body: ReactNode }[] }

const DOCS: Record<'privacy' | 'terms' | 'security', Doc> = {
  privacy: {
    title: 'Privacy',
    accent: 'policy',
    intro: 'What PlacementIQ collects, why, where it is kept and who can see it. PlacementIQ is used by colleges for their own students; your college is responsible for adding you and is your first point of contact.',
    sections: [
      { h: 'What we collect', body: <ul><li>Contact form: if you write to us from the public site, the name, organisation, email, phone number (optional) and message you enter, kept so we can reply.</li><li>Account: your email, your name, the roll number your college provides and the academics your college records (CGPA, backlogs, Class X and XII).</li><li>Profile you enter: phone number, photo, branch and batch, skills, projects, internships, certifications, achievements and links such as LinkedIn or a portfolio.</li><li>Evidence you connect: your resume file and its extracted text; public data from the accounts you add on GitHub, LeetCode, Codeforces, CodeChef, Credly, Hugging Face and CTFtime; NPTEL certificate numbers; and GATE scorecards you upload.</li><li>Activity in the app: applications to campus drives, practice attempts, mock-interview notes, assistant conversations, AI usage counts, feedback and daily progress snapshots.</li><li>Security records: the email and IP address of sign-up attempts, removed after about a day, and the audit log described below.</li></ul> },
      { h: 'Why we use it', body: <p>To score your profile against recruiter requirements, explain each eligibility decision, analyse your resume, answer your questions in the AI assistant, rank students for placement cells and recruiters, and let your placement cell run drives. Rankings use only evidence our server fetched from accounts you have proven are yours, confirmed credentials and your college's academic records. Skills, projects and internships you type are labelled self-reported and do not count in rankings. We do not sell data and we do not show advertising.</p> },
      { h: 'AI processing', body: <p>When you analyse a resume, match a job description or ask the assistant, the relevant text and your profile (including your name, academics, skills, projects and connected statistics) are sent to our AI provider, Groq, to generate the answer. Apart from any job description being matched, only your own data is included. Each AI action counts against your college's plan.</p> },
      { h: 'Who can see your data', body: <ul><li>You.</li><li>Your college's placement cell, for students on its roster, whatever your visibility setting.</li><li>A recruiter added by your college, only for drives you apply to. With visibility set to Private they cannot open your profile, but they can still see your application and its status.</li><li>PlacementIQ platform administrators, to operate the service.</li><li>Anyone with the link to your profile photo, because photos are kept in a public bucket.</li></ul> },
      { id: 'providers', h: 'Service providers', body: <ul><li>Supabase: database, file storage, sign-in and account emails.</li><li>Vercel: hosts the website and server functions, and passes requests through to the database.</li><li>Groq: AI processing, as described above.</li><li>Google Fonts: your browser downloads our fonts from Google, which receives your IP address.</li><li>Public platforms our server reads for evidence: GitHub, LeetCode, Codeforces, CodeChef, Credly, Hugging Face, CTFtime and NPTEL. They receive the username, team ID or certificate number you gave us, not your profile.</li></ul> },
      { h: 'Audit log', body: <p>An append-only log records role, roster, academic and application status changes, and who made them. It is written by the database, cannot be edited through the app, and can be read by your placement cell and platform administrators.</p> },
      { h: 'Where it is stored', body: <p>In a managed PostgreSQL database and file storage run by Supabase. Every table the app reads is protected by row-level security. Resumes and GATE scorecards are in a private bucket opened only through short-lived signed links; profile photos are in a public bucket.</p> },
      { h: 'Your choices and rights', body: <p>You can view and correct your profile at any time, disconnect connected accounts, delete your resume, and set your visibility in Settings. Academics your college records are corrected by your placement cell. Students can delete their own account in Settings, which removes their rows, files and roster entry; audit log entries remain, because that log is append-only. Admin and recruiter accounts are removed by a college or platform admin. You can download a copy of your data at any time from Settings → Your data; ask your placement cell for the roster entry your college keeps.</p> },
      { h: 'Cookies and storage', body: <p>We use your browser's local and session storage only to keep you signed in and remember small preferences. There are no advertising or cross-site tracking cookies. Fonts load from Google Fonts, as listed under Service providers.</p> },
      { id: 'contact', h: 'Contact', body: <p>For anything about your data, contact your college's placement cell first. For a complaint or grievance about how your data is handled, write to: {GRIEVANCE_CONTACT}</p> },
    ],
  },
  terms: {
    title: 'Terms of',
    accent: 'use',
    intro: 'The rules for using PlacementIQ. Colleges subscribe to the platform; students and recruiters use it through their college.',
    sections: [
      { h: 'Who can use it', body: <p>Access is limited to people a college adds. Students on a college's roster register through a link emailed to their address, or use a login their college creates for them. Placement-cell staff and recruiters are added by their college. Keep your login private and tell your placement cell if you think someone else has used it.</p> },
      { h: 'Accurate information', body: <p>Enter your own, truthful information. Your college may verify it against official records. Skills, projects and internships you type are labelled self-reported and do not count in rankings.</p> },
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
      { h: 'Access enforced in the database', body: <p>Roles (platform admin, placement cell, recruiter) and each college's student roster are stored in the database and checked by row-level security on every table the app reads. A placement cell sees only its own college; a recruiter sees only applicants to its own drives; a student sees only their own records.</p> },
      { h: 'Tested on a copy of the database', body: <p>48 row-level-security tests and 56 regression tests run on a throwaway database built by replaying every migration, including attempts to read another college's students, forge application scores, inject links, escalate roles and bypass the sign-up rules. They show how the rules behave as written. They are not a test of the live service.</p> },
      { h: 'Accounts', body: <p>Only emails on a college's roster can register, and students register through a link sent to that mailbox, so nobody can claim an address they do not control. Sign-up gives one answer for every mismatch and limits repeated attempts. A college can also create a login with a random temporary password for one person: until that person picks their own, the database refuses everything except that step, and temporary passwords expire after 7 days. The platform admin role cannot be given to an account whose mailbox is unproven.</p> },
      { h: 'Audit log', body: <p>An append-only log records role, roster, academic and application status changes. Database triggers write it, and nobody can edit it through the app.</p> },
      { h: 'Files and keys', body: <p>Resumes and GATE scorecards are kept in private storage and opened through signed links that expire within minutes. Profile photos are public. Database secrets and AI keys live only in server functions and never reach the browser.</p> },
      { h: 'In the browser', body: <p>A content security policy, frame protection and no third-party trackers. Links that students add are checked so that only web links can be opened.</p> },
      { h: 'Reporting a problem', body: <p>If you find a security issue, tell your placement cell or write to: {GRIEVANCE_CONTACT}. Please do not test against other people's accounts.</p> },
    ],
  },
}

export default function Legal({ doc }: { doc: keyof typeof DOCS }) {
  const d = DOCS[doc]
  const { hash } = useLocation()
  // The document that opens the page is already on screen (prerendered); only switching between documents animates.
  const first = useRef(true)
  useEffect(() => {
    first.current = false
  }, [])
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
  }, [doc, hash])

  return (
    <div className="relative min-h-[calc(100svh/var(--z))] overflow-x-clip">
      <SkipLink />
      <Aurora />
      <div className="relative z-10 mx-auto max-w-[860px] px-4 pb-24 pt-6 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" aria-label="PlacementIQ home"><Logo size={30} tagline={false} /></Link>
          <nav aria-label="Legal" className="glass flex gap-1 rounded-full p-1 text-[12.5px] font-semibold">
            {(['privacy', 'terms', 'security'] as const).map((k) => (
              <NavLink key={k} to={`/${k}`} className={({ isActive }) => `rounded-full px-2.5 py-1.5 sm:px-3.5 ${isActive ? 'bg-[oklch(0.2_0.045_285)] text-white' : 'text-ink-soft hover:text-ink'}`}>
                {k[0].toUpperCase() + k.slice(1)}
              </NavLink>
            ))}
          </nav>
        </header>

        <main id="main" tabIndex={-1} className="outline-none">
        <motion.article key={doc} initial={first.current ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="mt-14">
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
        </main>
      </div>
    </div>
  )
}
