import type { Alumnus, Bucket, CompanyBase } from './types'

type Seed = {
  name: string
  role?: string
  /** Original catalog ordering hint only; real match % is computed per student in lib/eligibility. */
  match: number
  brand: string
  ctc: [number, number, number]
  location?: string
  about?: string
  careers?: string
}

const ROLE = 'Software Engineer (SDE)'

const firstNames = [
  'Rahul Reddy', 'Sneha Priya', 'Vikram Singh', 'Ananya Sharma', 'Karthik Nair',
  'Divya Menon', 'Aditya Rao', 'Meera Iyer', 'Rohan Gupta', 'Ishita Bose',
  'Nikhil Verma', 'Pooja Desai',
]

const branches = ['CSE', 'IT', 'ECE', 'CSE', 'IT', 'CSE', 'ECE', 'CSE', 'IT', 'CSE', 'CSE', 'ECE']
const cities = ['Bangalore', 'Hyderabad', 'Pune', 'Bangalore', 'Gurgaon', 'Chennai', 'Bangalore', 'Noida', 'Hyderabad', 'Bangalore', 'Mumbai', 'Bangalore']

function makeAlumni(company: string, count: number): Alumnus[] {
  const titles = [
    `SDE II at ${company}`,
    `Software Engineer at ${company}`,
    `SDE at ${company}`,
    `SWE at ${company}`,
    `Senior Engineer at ${company}`,
  ]
  return Array.from({ length: count }, (_, i) => ({
    name: firstNames[i % firstNames.length],
    title: titles[i % titles.length],
    batch: `${2021 + (i % 4)} Batch, ${branches[i % branches.length]}`,
    years: `${(1.2 + ((i * 0.37) % 3)).toFixed(1)} Years`,
    location: cities[i % cities.length],
    avatar: '',
  }))
}

function build(seed: Seed, tier: Bucket): CompanyBase {
  const [avg, min, max] = seed.ctc
  const m = seed.match
  const alumniCount = tier === 'eligible' ? 12 : tier === 'nearly' ? 9 : tier === 'canBecome' ? 6 : 3

  return {
    id: seed.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: seed.name,
    role: seed.role ?? ROLE,
    brand: seed.brand,
    ctcAvg: avg,
    ctcMin: min,
    ctcMax: max,
    location: seed.location ?? 'Bangalore',
    jobType: 'Full Time',
    tenure: 'Permanent',
    batches: '2026, 2027',
    about:
      seed.about ??
      `${seed.name} is a global technology leader focused on building products that change the way billions of people connect, explore, and interact with information.`,
    careers: seed.careers ?? `https://www.google.com/search?q=${encodeURIComponent(seed.name + ' careers')}`,
    process: [
      { stage: 'Online Assessment', detail: '2 DSA problems + 20 MCQs on CS fundamentals', duration: '90 min' },
      { stage: 'Technical Interview I', detail: 'Data structures, algorithms, problem solving', duration: '45 min' },
      { stage: 'Technical Interview II', detail: 'System design and project deep dive', duration: '60 min' },
      { stage: 'Hiring Manager Round', detail: 'Behavioural, ownership and culture fit', duration: '45 min' },
      { stage: 'HR Discussion', detail: 'Compensation, location and offer roll-out', duration: '30 min' },
    ],
    stats: [
      { label: 'Applicants last drive', value: `${320 + (m % 7) * 45}` },
      { label: 'Offers rolled out', value: `${6 + (m % 9)}` },
      { label: 'Selection ratio', value: `${(1.4 + (m % 5) * 0.6).toFixed(1)}%` },
      { label: 'Avg. package offered', value: `₹${avg.toFixed(1)} LPA` },
      { label: 'Highest package', value: `₹${max} LPA` },
      { label: 'Median interview rounds', value: '4' },
    ],
    alumni: makeAlumni(seed.name, alumniCount),
  }
}

const eligibleSeeds: Seed[] = [
  { name: 'Google', match: 92, brand: '#4285F4', ctc: [24.0, 20, 28] },
  { name: 'Microsoft', match: 88, brand: '#00A4EF', ctc: [22.5, 19, 26] },
  { name: 'Deloitte', match: 85, brand: '#86BC25', ctc: [9.5, 7, 12], location: 'Hyderabad' },
  { name: 'Adobe', match: 84, brand: '#FA0F00', ctc: [21.0, 18, 25], location: 'Noida' },
  { name: 'Cisco', match: 82, brand: '#1BA0D7', ctc: [18.5, 16, 22] },
  { name: 'SAP Labs', match: 81, brand: '#0FAAFF', ctc: [17.0, 14, 20] },
  { name: 'Infosys', match: 80, brand: '#007CC3', ctc: [6.5, 4, 9], location: 'Pune' },
  { name: 'TCS Digital', match: 80, brand: '#004B8D', ctc: [7.0, 5, 11], location: 'Chennai' },
  { name: 'Wipro', match: 79, brand: '#341B6E', ctc: [6.0, 4, 8] },
  { name: 'Accenture', match: 79, brand: '#A100FF', ctc: [8.0, 6, 11] },
  { name: 'Capgemini', match: 78, brand: '#0070AD', ctc: [7.5, 5, 10], location: 'Pune' },
  { name: 'Cognizant', match: 78, brand: '#1E3A8A', ctc: [7.2, 5, 10], location: 'Chennai' },
  { name: 'Zoho', match: 77, brand: '#E42527', ctc: [9.0, 7, 12], location: 'Chennai' },
  { name: 'Freshworks', match: 77, brand: '#22C55E', ctc: [12.0, 9, 16], location: 'Chennai' },
  { name: 'Mindtree', match: 76, brand: '#F97316', ctc: [7.8, 6, 10] },
  { name: 'Tech Mahindra', match: 76, brand: '#E4002B', ctc: [6.8, 5, 9], location: 'Pune' },
  { name: 'HCLTech', match: 75, brand: '#0F62FE', ctc: [7.0, 5, 9], location: 'Noida' },
  { name: 'LTIMindtree', match: 75, brand: '#0EA5E9', ctc: [7.4, 6, 10], location: 'Mumbai' },
]

const nearlySeeds: Seed[] = [
  { name: 'Amazon', match: 78, brand: '#FF9900', ctc: [28.0, 24, 34] },
  { name: 'Goldman Sachs', match: 74, brand: '#7399C6', ctc: [30.0, 26, 36] },
  { name: 'J.P. Morgan', match: 72, brand: '#5A3E28', ctc: [21.0, 18, 25], location: 'Mumbai' },
  { name: 'Morgan Stanley', match: 71, brand: '#1F3A5F', ctc: [26.0, 22, 30], location: 'Mumbai' },
  { name: 'Salesforce', match: 69, brand: '#00A1E0', ctc: [25.0, 21, 30] },
  { name: 'Atlassian', match: 68, brand: '#2684FF', ctc: [27.0, 23, 32] },
  { name: 'Uber', match: 67, brand: '#111111', ctc: [29.0, 24, 35] },
  { name: 'Flipkart', match: 67, brand: '#2874F0', ctc: [26.5, 22, 32] },
  { name: 'Swiggy', match: 66, brand: '#FC8019', ctc: [22.0, 18, 27] },
  { name: 'Zomato', match: 66, brand: '#E23744', ctc: [21.5, 18, 26], location: 'Gurgaon' },
  { name: 'PhonePe', match: 65, brand: '#5F259F', ctc: [24.0, 20, 29] },
  { name: 'Razorpay', match: 65, brand: '#0C2451', ctc: [23.0, 19, 28] },
  { name: 'Sprinklr', match: 64, brand: '#0EA5A4', ctc: [20.0, 17, 24], location: 'Gurgaon' },
  { name: 'Walmart Global Tech', match: 64, brand: '#0071CE', ctc: [24.5, 20, 30] },
]

const canBecomeSeeds: Seed[] = [
  { name: 'Tesla', match: 62, brand: '#CC0000', ctc: [32.0, 28, 40], location: 'Remote' },
  { name: 'NVIDIA', match: 58, brand: '#76B900', ctc: [34.0, 28, 42] },
  { name: 'Visa', match: 56, brand: '#1A1F71', ctc: [23.0, 19, 28] },
  { name: 'Intel', match: 55, brand: '#0071C5', ctc: [22.0, 18, 27] },
  { name: 'ServiceNow', match: 54, brand: '#62D84E', ctc: [26.0, 22, 32], location: 'Hyderabad' },
  { name: 'Qualcomm', match: 53, brand: '#3253DC', ctc: [25.0, 21, 30] },
  { name: 'Oracle', match: 52, brand: '#C74634', ctc: [21.0, 17, 26] },
  { name: 'VMware', match: 52, brand: '#607078', ctc: [24.0, 20, 29] },
  { name: 'Dell Technologies', match: 51, brand: '#007DB8', ctc: [18.0, 15, 22] },
  { name: 'Arista Networks', match: 50, brand: '#1D4ED8', ctc: [30.0, 25, 36] },
  { name: 'Juniper Networks', match: 50, brand: '#0F766E', ctc: [26.0, 22, 31] },
  { name: 'Nutanix', match: 49, brand: '#024DA1', ctc: [28.0, 24, 34] },
  { name: 'Cred', match: 48, brand: '#0B0B0B', ctc: [27.0, 22, 33] },
  { name: 'Zerodha', match: 48, brand: '#387ED1', ctc: [22.0, 18, 27] },
  { name: 'Rubrik', match: 47, brand: '#00B2A9', ctc: [31.0, 26, 38] },
  { name: 'Databricks', match: 46, brand: '#FF3621', ctc: [38.0, 32, 46] },
  { name: 'Snowflake', match: 46, brand: '#29B5E8', ctc: [36.0, 30, 44] },
  { name: 'MongoDB', match: 45, brand: '#00ED64', ctc: [29.0, 24, 35] },
  { name: 'Confluent', match: 44, brand: '#173361', ctc: [30.0, 25, 36] },
  { name: 'Palo Alto Networks', match: 44, brand: '#F04E23', ctc: [28.0, 23, 34] },
  { name: 'Adobe Research', match: 43, brand: '#FA0F00', ctc: [26.0, 22, 32], location: 'Noida' },
  { name: 'Samsung R&D', match: 42, brand: '#1428A0', ctc: [24.0, 20, 30], location: 'Noida' },
]

const notEligibleSeeds: Seed[] = [
  { name: 'Apple', match: 40, brand: '#111111', ctc: [35.0, 30, 44] },
  { name: 'Meta', match: 38, brand: '#0866FF', ctc: [42.0, 35, 52] },
  { name: 'Netflix', match: 35, brand: '#E50914', ctc: [45.0, 38, 58], location: 'Remote' },
  { name: 'SpaceX', match: 30, brand: '#111111', ctc: [40.0, 34, 50], location: 'Remote' },
  { name: 'OpenAI', match: 28, brand: '#111111', ctc: [55.0, 45, 70], location: 'Remote' },
  { name: 'Anthropic', match: 27, brand: '#D97757', ctc: [54.0, 44, 68], location: 'Remote' },
  { name: 'Stripe', match: 26, brand: '#635BFF', ctc: [44.0, 36, 55], location: 'Remote' },
  { name: 'Two Sigma', match: 24, brand: '#1F2937', ctc: [48.0, 40, 60], location: 'Remote' },
  { name: 'Jane Street', match: 22, brand: '#1D4ED8', ctc: [60.0, 50, 80], location: 'Hong Kong' },
  { name: 'Citadel', match: 20, brand: '#0F172A', ctc: [58.0, 48, 75], location: 'Remote' },
  { name: 'Hudson River Trading', match: 18, brand: '#111827', ctc: [56.0, 46, 72], location: 'Remote' },
  { name: 'DE Shaw', match: 16, brand: '#7C3AED', ctc: [50.0, 42, 64], location: 'Hyderabad' },
]

const googleAlumni: Alumnus[] = [
  { name: 'Rahul Reddy', title: 'SDE II at Google', batch: '2022 Batch, CSE', years: '2.4 Years', location: 'Bangalore', avatar: '' },
  { name: 'Sneha Priya', title: 'Software Engineer at Google', batch: '2023 Batch, CSE', years: '1.6 Years', location: 'Bangalore', avatar: '' },
  { name: 'Vikram Singh', title: 'SDE at Google', batch: '2022 Batch, IT', years: '2.1 Years', location: 'Hyderabad', avatar: '' },
  { name: 'Ananya Sharma', title: 'SWE at Google', batch: '2023 Batch, CSE', years: '1.3 Years', location: 'Bangalore', avatar: '' },
  ...makeAlumni('Google', 12).slice(4),
]

/** Static company facts. Use `useCompanies()` (lib/companies) for per-student match and stacks. */
export const companyCatalog: CompanyBase[] = [
  ...eligibleSeeds.map((s) => {
    const c = build(s, 'eligible')
    return c.name === 'Google' ? { ...c, alumni: googleAlumni } : c
  }),
  ...nearlySeeds.map((s) => build(s, 'nearly')),
  ...canBecomeSeeds.map((s) => build(s, 'canBecome')),
  ...notEligibleSeeds.map((s) => build(s, 'notEligible')),
]

export const bucketMeta: Record<
  Bucket,
  { title: string; hint: string; head: string; ring: string; text: string; dot: string; more: string }
> = {
  // Stack identity is carried by the label and a small status dot; fills stay neutral.
  eligible: { title: 'Eligible', hint: 'You meet all requirements', head: 'bg-surface-2 border-rule', ring: 'ring-[#0A7A5C]', text: 'text-[#0A6B50]', dot: 'bg-[#0A7A5C]', more: 'text-ink-mute' },
  nearly: { title: 'Nearly Eligible', hint: 'Minor gaps to bridge', head: 'bg-surface-2 border-rule', ring: 'ring-[#B47B12]', text: 'text-[#8A5A0B]', dot: 'bg-[#B47B12]', more: 'text-ink-mute' },
  canBecome: { title: 'Can Become Eligible', hint: 'Improve skills and reapply', head: 'bg-surface-2 border-rule', ring: 'ring-[#2D5FA0]', text: 'text-[#2D5FA0]', dot: 'bg-[#2D5FA0]', more: 'text-ink-mute' },
  notEligible: { title: 'Not Eligible', hint: 'Major gaps found', head: 'bg-surface-2 border-rule', ring: 'ring-[#A63A2A]', text: 'text-[#9C3526]', dot: 'bg-[#A63A2A]', more: 'text-[#9C3526]' },
}

export const bucketOrder: Bucket[] = ['eligible', 'nearly', 'canBecome', 'notEligible']

