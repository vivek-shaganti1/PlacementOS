// Page titles and search metadata. One source for the running app (RouteMeta) and the build-time prerender.
export const SITE_URL = 'https://placementiq-os.vercel.app'
export const SITE_NAME = 'PlacementIQ'

const DEFAULT_DESCRIPTION =
  'PlacementIQ scores your profile against every campus recruiter, parses your resume, syncs your coding profiles and tells you exactly what to fix next.'

type PublicPage = { title: string; description: string; indexable?: boolean }

const PUBLIC: Record<string, PublicPage> = {
  '/': { title: 'Placement intelligence for students and colleges', description: DEFAULT_DESCRIPTION, indexable: true },
  '/privacy': {
    title: 'Privacy policy',
    description: 'What PlacementIQ collects, why, where it is kept and who can see it, including your rights under the Digital Personal Data Protection Act, 2023.',
    indexable: true,
  },
  '/terms': {
    title: 'Terms of use',
    description: 'The rules for using PlacementIQ. Colleges subscribe to the platform; students and recruiters use it through their college.',
    indexable: true,
  },
  '/security': {
    title: 'Security',
    description: 'How PlacementIQ enforces access in the database with row-level security and how student data, files and keys are protected.',
    indexable: true,
  },
  '/login': { title: 'Sign in', description: 'Sign in to PlacementIQ with the email your college added to its roster.', indexable: true },
  '/signup': { title: 'Create your account', description: 'Create your PlacementIQ account with the email your college added to its roster.', indexable: true },
  '/reset-password': { title: 'Reset your password', description: DEFAULT_DESCRIPTION },
}

// Signed-in pages: a title only; these are never indexed.
const APP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/profile': 'My Profile',
  '/eligibility': 'Eligibility Stacks',
  '/drives': 'Company Insights',
  '/skill-gap': 'Skill Gap Analyzer',
  '/what-if': 'What-If Simulator',
  '/roadmap': 'Learning Roadmap',
  '/practice': 'Practice Arena',
  '/mock-interviews': 'Mock Interviews',
  '/alumni': 'Alumni Network',
  '/applications': 'Applications',
  '/analytics': 'Analytics',
  '/resume': 'Resume Analyzer',
  '/certifications': 'Certifications',
  '/settings': 'Settings',
  '/help': 'Help & Support',
  '/jobs': 'Campus Jobs',
  '/admin': 'Placement cell overview',
  '/admin/students': 'Students',
  '/admin/classes': 'Classes',
  '/admin/roster': 'Roster',
  '/admin/jobs': 'Job postings',
  '/admin/team': 'Admins & recruiters',
  '/super/orgs': 'Organizations',
  '/super/admins': 'Platform admins',
  '/super/certifications': 'Certification catalog',
  '/recruiter': 'My drives',
}

export const normalizePath = (pathname: string) => pathname.replace(/\/+$/, '') || '/'

export const isAppPath = (pathname: string) => normalizePath(pathname) in APP

export type RouteMetadata = { title: string; documentTitle: string; description: string; indexable: boolean; canonical: string | null }

export function routeMeta(pathname: string): RouteMetadata {
  const path = normalizePath(pathname)
  const page = PUBLIC[path]
  const title = page?.title ?? APP[path] ?? 'Page not found'
  const indexable = Boolean(page?.indexable)
  return {
    title,
    documentTitle: path === '/' ? `${SITE_NAME}: ${title}` : `${title} · ${SITE_NAME}`,
    description: page?.description ?? DEFAULT_DESCRIPTION,
    indexable,
    canonical: indexable ? `${SITE_URL}${path === '/' ? '/' : path}` : null,
  }
}
