import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { Page } from '../components/Page'
import { useAuth } from '../lib/auth'

const EFFECTIVE = '5 October 2026'

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-rule pt-5">
      <h2 className="font-display text-[20px] font-medium text-ink">
        <span className="figure mr-2 text-[14px] text-ink-faint">{String(n).padStart(2, '0')}</span>
        {title}
      </h2>
      <div className="mt-2 space-y-2.5 text-[14px] leading-[1.75] text-ink-soft">{children}</div>
    </section>
  )
}

function Terms() {
  return (
    <div className="space-y-6">
      <Section n={1} title="What PlacementIQ is">
        <p>
          PlacementIQ helps students prepare for campus placements. It scores your profile against company requirements, analyzes your resume,
          reads public statistics from coding platforms you connect, and lets your college placement cell post drives and track applications.
        </p>
      </Section>
      <Section n={2} title="Your account">
        <p>You must provide accurate information and keep your password private. You are responsible for activity under your account.</p>
        <p>Academic figures you enter (CGPA, backlogs, Class X and XII marks) are self-reported. Your placement cell may verify them against official records, and misrepresenting them can lead to disqualification from drives.</p>
      </Section>
      <Section n={3} title="Scores and AI output are guidance">
        <p>
          Match percentages, eligibility stacks, readiness scores, resume scores and assistant replies are estimates produced by rules and by an
          AI model. They are not offers, guarantees or official eligibility decisions. Companies and your placement cell make their own decisions.
        </p>
      </Section>
      <Section n={4} title="Acceptable use">
        <p>Do not upload content you have no right to share, attempt to access other students' data, interfere with the service, or use automated tools to scrape it.</p>
      </Section>
      <Section n={5} title="Placement cell administrators">
        <p>
          Admins can view student profiles, resumes and applications in order to run placements. They must use this access only for placement
          purposes and in line with the college's own policies.
        </p>
      </Section>
      <Section n={6} title="Third-party platforms">
        <p>
          When you connect GitHub, LeetCode, Codeforces or CodeChef, PlacementIQ reads public information from those services. Their own terms
          apply to your accounts there. Company names shown in PlacementIQ belong to their owners and do not imply endorsement.
        </p>
      </Section>
      <Section n={7} title="Availability and changes">
        <p>The service is provided as is. We may change features or these terms; we will update the date above when we do. Continuing to use PlacementIQ after a change means you accept it.</p>
      </Section>
      <Section n={8} title="Ending your account">
        <p>You can stop using PlacementIQ at any time and ask for your account and data to be deleted, as described in the Privacy Policy.</p>
      </Section>
    </div>
  )
}

function Privacy() {
  return (
    <div className="space-y-6">
      <Section n={1} title="What we collect">
        <p>Account details: your sign-in email and password (stored hashed by our authentication provider).</p>
        <p>Profile details you enter: name, phone, college, branch, batch, academic marks, skills, projects, internships, certifications, achievements and links.</p>
        <p>Your resume file and the text extracted from it, along with each analysis and job-description match you run.</p>
        <p>Public statistics from coding accounts you connect: repositories and languages from GitHub; problems solved and ratings from LeetCode, Codeforces and CodeChef.</p>
        <p>Activity inside the app: saved companies, applications and their status, roadmap progress, practice answers, mock interview notes, assistant conversations and daily progress snapshots.</p>
      </Section>
      <Section n={2} title="How we use it">
        <p>To calculate your eligibility and readiness, analyze your resume, answer your assistant questions, show your history, and let your placement cell run drives.</p>
        <p>We do not sell your data and do not use it for advertising.</p>
      </Section>
      <Section n={3} title="Who can see it">
        <p>You can see all of your own data. Placement cell administrators at your college can see student profiles, resumes and applications. Other students cannot see your data.</p>
        <p>Access is enforced in the database itself with row-level security.</p>
      </Section>
      <Section n={4} title="Service providers">
        <p>Data is stored with Supabase (database, authentication and file storage). Resume text, job descriptions and assistant questions are sent to Groq to generate AI analysis and replies. The app is hosted on Vercel.</p>
      </Section>
      <Section n={5} title="Your resume">
        <p>Resumes are kept in a private storage bucket under your account and are opened only through short-lived signed links. Deleting your resume in the Resume Analyzer removes the file and its analyses.</p>
      </Section>
      <Section n={6} title="Your choices">
        <p>You can edit or remove most profile information at any time, disconnect coding accounts, delete your resume, and clear your assistant history.</p>
        <p>To delete your whole account and all associated data, contact your placement cell or use the contact listed on the Help page.</p>
      </Section>
      <Section n={7} title="Retention">
        <p>We keep your data while your account is active. When an account is deleted, its profile, files and activity records are removed.</p>
      </Section>
      <Section n={8} title="Changes">
        <p>If we change this policy we will update the date above. Material changes will be shown in the app.</p>
      </Section>
    </div>
  )
}

export default function Legal({ kind }: { kind: 'terms' | 'privacy' }) {
  const { session } = useAuth()
  const title = kind === 'terms' ? 'Terms of Service' : 'Privacy Policy'
  const body = (
    <>
      <p className="text-[13px] text-ink-mute">Effective {EFFECTIVE}. Written in plain language; if anything is unclear, ask your placement cell.</p>
      <div className="mt-6">{kind === 'terms' ? <Terms /> : <Privacy />}</div>
      <p className="mt-8 text-[13px] text-ink-mute">
        See also the <Link to={kind === 'terms' ? '/privacy' : '/terms'} className="text-brand underline">{kind === 'terms' ? 'Privacy Policy' : 'Terms of Service'}</Link>.
      </p>
    </>
  )

  if (session)
    return (
      <Page title={title}>
        <div className="card max-w-[760px] p-5 sm:p-8">{body}</div>
      </Page>
    )

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-rule bg-surface">
        <div className="mx-auto flex max-w-[860px] items-center gap-4 px-5 py-3">
          <Link to="/" aria-label="PlacementIQ home"><Logo size={28} tagline={false} /></Link>
          <Link to="/login" className="ml-auto text-[13px] font-semibold text-ink-soft hover:underline">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-5 py-10">
        <h1 className="font-display text-[40px] font-medium leading-tight text-ink">{title}</h1>
        <div className="mt-3">{body}</div>
      </main>
    </div>
  )
}
