import type { Category, CompanyBase } from './types'

/**
 * Core (non-software) recruiters per track. Selection rounds follow the published campus processes (aptitude plus a
 * branch-subject test, a technical interview on fundamentals and projects, HR). CTC is a typical fresher range in LPA and
 * varies by year and campus; the college's own drives always take precedence. No applicant counts or alumni are shown for
 * these companies because there is no data behind them.
 */
type CoreSeed = { name: string; role: string; brand: string; ctc: [number, number, number]; category: Category; location: string; about: string }

const PROCESS: Partial<Record<Category, { stage: string; detail: string; duration: string }[]>> = {
  semiconductor: [
    { stage: 'Online test', detail: 'Aptitude, digital electronics, analog circuits and basic Verilog MCQs', duration: '60–90 min' },
    { stage: 'Technical interview I', detail: 'Digital design: FSMs, timing, CMOS; your HDL project walkthrough', duration: '45–60 min' },
    { stage: 'Technical interview II', detail: 'Verification or analog deep dive, depending on the team', duration: '45 min' },
    { stage: 'HR', detail: 'Location, relocation and offer', duration: '20 min' },
  ],
  embedded: [
    { stage: 'Online test', detail: 'Aptitude, C programming, microcontrollers and digital electronics', duration: '60 min' },
    { stage: 'Technical interview', detail: 'Embedded C (pointers, interrupts, memory), protocols (UART/SPI/I2C), your firmware project', duration: '45–60 min' },
    { stage: 'HR', detail: 'Communication and fit', duration: '20 min' },
  ],
  telecom: [
    { stage: 'Online test', detail: 'Aptitude, signals and communication systems, networking basics', duration: '60 min' },
    { stage: 'Technical interview', detail: 'Modulation, wireless standards, signal processing and projects', duration: '45 min' },
    { stage: 'HR', detail: 'Offer discussion', duration: '20 min' },
  ],
  electrical: [
    { stage: 'Online test', detail: 'Aptitude, reasoning, verbal and 2–3 core electrical subjects', duration: '60–90 min' },
    { stage: 'Group discussion', detail: 'In some drives only', duration: '20 min' },
    { stage: 'Technical interview', detail: 'Machines, power systems, power electronics, control; your project and internship', duration: '45 min' },
    { stage: 'HR', detail: 'Relocation and offer', duration: '20 min' },
  ],
  energy: [
    { stage: 'Online test', detail: 'Aptitude and power-systems fundamentals', duration: '60 min' },
    { stage: 'Technical interview', detail: 'Power systems, protection, renewables and site safety', duration: '45 min' },
    { stage: 'HR', detail: 'Site posting and offer', duration: '20 min' },
  ],
  automation: [
    { stage: 'Online test', detail: 'Aptitude, control systems, instrumentation and PLC basics', duration: '60 min' },
    { stage: 'Technical interview', detail: 'PLC/SCADA, sensors, drives and control loops; your automation project', duration: '45 min' },
    { stage: 'HR', detail: 'Offer', duration: '20 min' },
  ],
  automotive: [
    { stage: 'Online test', detail: 'Aptitude and core mechanical (or electrical, for EV roles) subjects', duration: '60–90 min' },
    { stage: 'Technical interview', detail: 'Fundamentals (thermodynamics, theory of machines, design) and your project or BAJA/Supra work', duration: '45 min' },
    { stage: 'HR', detail: 'Plant location and offer', duration: '20 min' },
  ],
  manufacturing: [
    { stage: 'Written test', detail: 'Aptitude, English, reasoning and core mechanical / metallurgy', duration: '60–120 min' },
    { stage: 'Group discussion', detail: 'Common in plant roles', duration: '20 min' },
    { stage: 'Technical interview', detail: 'Manufacturing processes, quality, lean and your internship', duration: '45 min' },
    { stage: 'HR', detail: 'Shift and plant posting', duration: '20 min' },
  ],
  engineering_services: [
    { stage: 'Online test', detail: 'Aptitude and core engineering MCQs', duration: '60 min' },
    { stage: 'Technical interview', detail: 'CAD, drawing, GD&T and your design project', duration: '45 min' },
    { stage: 'HR', detail: 'Offer', duration: '20 min' },
  ],
  construction: [
    { stage: 'Written test', detail: 'Aptitude, English, reasoning and a civil technical section', duration: '60–120 min' },
    { stage: 'Group discussion', detail: 'Often on the same day', duration: '20 min' },
    { stage: 'Technical interview', detail: 'Structures, foundations, IS codes, site practice and your project', duration: '30–45 min' },
    { stage: 'HR', detail: 'Site posting and offer', duration: '20 min' },
  ],
  process: [
    { stage: 'Online test', detail: 'Aptitude and chemical engineering fundamentals', duration: '60–90 min' },
    { stage: 'Technical interview', detail: 'Thermodynamics, mass and heat transfer, reactors, safety; plant internship', duration: '45 min' },
    { stage: 'HR', detail: 'Plant posting and offer', duration: '20 min' },
  ],
  biotech: [
    { stage: 'Written test', detail: 'Aptitude and life-science fundamentals', duration: '60 min' },
    { stage: 'Technical interview', detail: 'Lab techniques, bioprocess and your research project', duration: '45 min' },
    { stage: 'HR', detail: 'Offer', duration: '20 min' },
  ],
  security: [
    { stage: 'Online assessment', detail: 'Networking, security fundamentals, Linux and a coding question', duration: '90 min' },
    { stage: 'Technical interview', detail: 'Web and network attacks, defence, CTF write-ups', duration: '45–60 min' },
    { stage: 'HR', detail: 'Offer', duration: '20 min' },
  ],
}

const SEEDS: CoreSeed[] = [
  // semiconductor / VLSI
  { name: 'Texas Instruments', role: 'Analog / Digital Design Engineer', brand: '#cc0000', ctc: [20, 16, 26], category: 'semiconductor', location: 'Bangalore', about: 'Analog and embedded processing semiconductors.' },
  { name: 'Analog Devices', role: 'Design Engineer', brand: '#1e4ea0', ctc: [16, 12, 20], category: 'semiconductor', location: 'Bangalore', about: 'Analog, mixed-signal and power semiconductors.' },
  { name: 'Cadence Design Systems', role: 'Design / Verification Engineer', brand: '#c4112f', ctc: [13, 10, 16], category: 'semiconductor', location: 'Noida', about: 'Electronic design automation software and IP.' },
  { name: 'Synopsys', role: 'R&D Engineer (VLSI)', brand: '#5a2d82', ctc: [12, 10, 15], category: 'semiconductor', location: 'Bangalore', about: 'EDA tools, silicon IP and verification.' },
  { name: 'NXP Semiconductors', role: 'Design Engineer', brand: '#f9b500', ctc: [13, 10, 16], category: 'semiconductor', location: 'Noida', about: 'Automotive and IoT semiconductors.' },
  { name: 'Micron Technology', role: 'Product / Design Engineer', brand: '#0071c5', ctc: [14, 11, 18], category: 'semiconductor', location: 'Hyderabad', about: 'Memory and storage semiconductors.' },
  // embedded / IoT
  { name: 'Bosch Global Software', role: 'Embedded Software Engineer', brand: '#e20015', ctc: [6.5, 5, 8], category: 'embedded', location: 'Bangalore', about: 'Automotive and IoT embedded software.' },
  { name: 'Tata Elxsi', role: 'Embedded Engineer', brand: '#00498f', ctc: [5.5, 4, 7], category: 'embedded', location: 'Bangalore', about: 'Design and technology services for automotive, media and healthcare.' },
  { name: 'KPIT Technologies', role: 'Embedded Engineer (Automotive)', brand: '#7ab800', ctc: [5.5, 4.5, 6.5], category: 'embedded', location: 'Pune', about: 'Automotive software and electrification.' },
  { name: 'Honeywell', role: 'Embedded / Hardware Engineer', brand: '#dc1e35', ctc: [9, 7, 11], category: 'embedded', location: 'Bangalore', about: 'Industrial automation, aerospace and building technologies.' },
  // telecom
  { name: 'Ericsson', role: 'Telecom / RAN Engineer', brand: '#0082f0', ctc: [7.5, 6, 9], category: 'telecom', location: 'Gurgaon', about: 'Mobile networks and telecom equipment.' },
  { name: 'Nokia', role: 'Network Engineer', brand: '#124191', ctc: [7.5, 6, 9], category: 'telecom', location: 'Bangalore', about: 'Network infrastructure and 5G.' },
  { name: 'Tejas Networks', role: 'Hardware / Telecom Engineer', brand: '#003a70', ctc: [7, 6, 9], category: 'telecom', location: 'Bangalore', about: 'Optical and wireless networking products.' },
  // electrical
  { name: 'ABB', role: 'Graduate Engineer Trainee (Electrical)', brand: '#ff000f', ctc: [7, 6, 8], category: 'electrical', location: 'Bangalore', about: 'Electrification and automation.' },
  { name: 'Siemens', role: 'Graduate Trainee Engineer', brand: '#009999', ctc: [7, 6, 8], category: 'electrical', location: 'Mumbai', about: 'Industry, infrastructure, mobility and energy.' },
  { name: 'Schneider Electric', role: 'Graduate Engineer Trainee', brand: '#3dcd58', ctc: [7, 6, 8], category: 'electrical', location: 'Bangalore', about: 'Energy management and industrial automation.' },
  { name: 'Hitachi Energy', role: 'Graduate Engineer Trainee', brand: '#e60027', ctc: [7, 6, 8], category: 'electrical', location: 'Chennai', about: 'Power grids and transmission equipment.' },
  { name: 'Havells', role: 'Graduate Engineer Trainee', brand: '#e4002b', ctc: [6, 5, 7], category: 'electrical', location: 'Noida', about: 'Electrical equipment and consumer electricals.' },
  // energy
  { name: 'Tata Power', role: 'Graduate Engineer Trainee', brand: '#0072bc', ctc: [6, 5, 7], category: 'energy', location: 'Mumbai', about: 'Power generation, transmission and renewables.' },
  { name: 'ReNew', role: 'Graduate Engineer Trainee (Renewables)', brand: '#00a651', ctc: [7, 6, 8], category: 'energy', location: 'Gurgaon', about: 'Solar and wind power.' },
  // automation
  { name: 'Rockwell Automation', role: 'Associate Engineer (Automation)', brand: '#cd163f', ctc: [7.5, 6, 9], category: 'automation', location: 'Bangalore', about: 'Industrial automation and control systems.' },
  { name: 'Emerson', role: 'Engineer Trainee (Automation)', brand: '#004b8d', ctc: [7, 6, 8], category: 'automation', location: 'Pune', about: 'Process automation and control.' },
  { name: 'Yokogawa', role: 'Engineer (Instrumentation)', brand: '#1b5aa6', ctc: [6, 5, 7], category: 'automation', location: 'Bangalore', about: 'Industrial automation and test and measurement.' },
  // automotive
  { name: 'Tata Motors', role: 'Graduate Engineer Trainee', brand: '#1d3f8f', ctc: [7, 6, 8], category: 'automotive', location: 'Pune', about: 'Passenger and commercial vehicles, and EVs.' },
  { name: 'Mahindra & Mahindra', role: 'Graduate Engineer Trainee', brand: '#c8102e', ctc: [7.5, 6, 9], category: 'automotive', location: 'Chennai', about: 'Automotive and farm equipment.' },
  { name: 'Maruti Suzuki', role: 'Graduate Engineer Trainee', brand: '#1c4aa0', ctc: [8, 7, 9], category: 'automotive', location: 'Gurgaon', about: 'Passenger vehicles.' },
  { name: 'Ashok Leyland', role: 'Graduate Engineer Trainee', brand: '#0d4ea6', ctc: [6, 5, 7], category: 'automotive', location: 'Chennai', about: 'Commercial vehicles.' },
  { name: 'Ather Energy', role: 'Engineer (EV / Powertrain)', brand: '#00b3a4', ctc: [10, 8, 12], category: 'automotive', location: 'Bangalore', about: 'Electric scooters and charging.' },
  // manufacturing / metals
  { name: 'Tata Steel', role: 'Graduate Trainee', brand: '#0058a3', ctc: [8, 7, 9], category: 'manufacturing', location: 'Jamshedpur', about: 'Steel manufacturing.' },
  { name: 'JSW Steel', role: 'Graduate Engineer Trainee', brand: '#1f4e9c', ctc: [7, 6, 8], category: 'manufacturing', location: 'Bellary', about: 'Steel manufacturing.' },
  { name: 'Godrej & Boyce', role: 'Graduate Engineer Trainee', brand: '#7e2a8c', ctc: [6, 5, 7], category: 'manufacturing', location: 'Mumbai', about: 'Engineering, appliances and precision manufacturing.' },
  { name: 'Hindalco', role: 'Graduate Engineer Trainee', brand: '#004990', ctc: [7, 6, 8], category: 'manufacturing', location: 'Renukoot', about: 'Aluminium and copper.' },
  // engineering services
  { name: 'Quest Global', role: 'Design Engineer', brand: '#00539b', ctc: [4.8, 4, 5.5], category: 'engineering_services', location: 'Bangalore', about: 'Product engineering services.' },
  { name: 'Cyient', role: 'Design Engineer', brand: '#0091d4', ctc: [4.5, 4, 5], category: 'engineering_services', location: 'Hyderabad', about: 'Engineering and technology services.' },
  { name: 'Tata Technologies', role: 'Design Engineer', brand: '#0072bc', ctc: [5, 4.5, 6], category: 'engineering_services', location: 'Pune', about: 'Product engineering for automotive and aerospace.' },
  // construction / civil
  { name: 'L&T Construction', role: 'Graduate Engineer Trainee (Civil)', brand: '#0067ac', ctc: [6, 5, 6.5], category: 'construction', location: 'Chennai', about: 'Engineering, procurement and construction.' },
  { name: 'Afcons Infrastructure', role: 'Graduate Engineer Trainee', brand: '#ec1c24', ctc: [5.5, 5, 6.5], category: 'construction', location: 'Mumbai', about: 'Marine, tunnelling and bridges.' },
  { name: 'Tata Projects', role: 'Graduate Engineer Trainee', brand: '#004990', ctc: [6, 5, 7], category: 'construction', location: 'Hyderabad', about: 'Infrastructure and industrial EPC.' },
  { name: 'Shapoorji Pallonji', role: 'Graduate Engineer Trainee', brand: '#1a3668', ctc: [5.5, 5, 6], category: 'construction', location: 'Mumbai', about: 'Construction and real estate.' },
  { name: 'NCC Limited', role: 'Graduate Engineer Trainee', brand: '#0d6eb8', ctc: [5, 4.5, 6], category: 'construction', location: 'Hyderabad', about: 'Infrastructure construction.' },
  // process / chemical
  { name: 'Reliance Industries', role: 'Graduate Engineer Trainee (Chemical)', brand: '#1f3e8a', ctc: [8, 7, 9], category: 'process', location: 'Jamnagar', about: 'Refining, petrochemicals and energy.' },
  { name: 'Tata Chemicals', role: 'Graduate Engineer Trainee', brand: '#0066b3', ctc: [7, 6, 8], category: 'process', location: 'Mithapur', about: 'Basic and specialty chemicals.' },
  { name: 'UPL', role: 'Graduate Engineer Trainee', brand: '#0b8a3e', ctc: [6, 5, 7], category: 'process', location: 'Vapi', about: 'Agrochemicals.' },
  { name: 'Asian Paints', role: 'Graduate Engineer Trainee (Process)', brand: '#e4002b', ctc: [10, 8, 12], category: 'process', location: 'Mumbai', about: 'Paints and coatings.' },
  // biotech / pharma
  { name: 'Biocon', role: 'Trainee (Biotech)', brand: '#e51d2e', ctc: [5, 4, 6], category: 'biotech', location: 'Bangalore', about: 'Biopharmaceuticals.' },
  { name: "Dr. Reddy's Laboratories", role: 'Trainee (Process / QA)', brand: '#5b2c86', ctc: [5, 4, 6], category: 'biotech', location: 'Hyderabad', about: 'Pharmaceuticals.' },
  { name: 'Syngene', role: 'Research Associate', brand: '#00539f', ctc: [4.8, 4, 5.5], category: 'biotech', location: 'Bangalore', about: 'Contract research and manufacturing.' },
  // security
  { name: 'Zscaler', role: 'Security Engineer', brand: '#0076ce', ctc: [18, 14, 24], category: 'security', location: 'Bangalore', about: 'Cloud security.' },
  { name: 'CrowdStrike', role: 'Security Engineer', brand: '#e01f26', ctc: [16, 12, 20], category: 'security', location: 'Pune', about: 'Endpoint and cloud security.' },
  { name: 'Quick Heal', role: 'Security Analyst', brand: '#d71920', ctc: [5.5, 4.5, 7], category: 'security', location: 'Pune', about: 'Endpoint security software.' },
]

export const coreCatalog: (CompanyBase & { category: Category })[] = SEEDS.map((s) => ({
  id: s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name: s.name,
  role: s.role,
  brand: s.brand,
  ctcAvg: s.ctc[0],
  ctcMin: s.ctc[1],
  ctcMax: s.ctc[2],
  location: s.location,
  jobType: 'Full Time',
  tenure: 'Permanent',
  batches: '',
  about: s.about,
  careers: `https://www.google.com/search?q=${encodeURIComponent(`${s.name} careers freshers`)}`,
  process: PROCESS[s.category] ?? [],
  stats: [{ label: 'Typical fresher CTC', value: `₹${s.ctc[1]}–${s.ctc[2]} LPA` }],
  alumni: [],
  category: s.category,
}))
