/**
 * Certification providers and their courses, mapped to the skills they build (names from lib/branches).
 * This is the seed for the cert_providers / cert_courses tables, which the platform admin manages under
 * Platform → Certifications (enable a provider once you partner with it). It is also the fallback when the tables
 * are not available yet. Links go to each provider's official page.
 */
export type CertProvider = { id: string; slug?: string; name: string; website: string; enabled: boolean; partnered: boolean; sort: number }
export type CertCourse = { id: string; provider_id: string; title: string; skills: string[]; url: string; weeks: number; level: 'beginner' | 'intermediate' | 'advanced'; enabled: boolean }

const P = (sort: number, slug: string, name: string, website: string): CertProvider => ({ id: slug, name, website, enabled: true, partnered: false, sort })

export const SEED_PROVIDERS: CertProvider[] = [
  P(1, 'nptel', 'NPTEL', 'https://nptel.ac.in/courses'),
  P(2, 'coursera', 'Coursera', 'https://www.coursera.org'),
  P(3, 'aws', 'AWS', 'https://aws.amazon.com/certification/'),
  P(4, 'google-cloud', 'Google Cloud', 'https://cloud.google.com/learn/certification'),
  P(5, 'linux-foundation', 'Linux Foundation', 'https://training.linuxfoundation.org'),
  P(6, 'mongodb', 'MongoDB University', 'https://learn.mongodb.com'),
  P(7, 'oracle', 'Oracle University', 'https://education.oracle.com'),
  P(8, 'design-gurus', 'Design Gurus', 'https://www.designgurus.io'),
  P(9, 'cisco', 'Cisco Networking Academy', 'https://www.netacad.com'),
  P(10, 'comptia', 'CompTIA', 'https://www.comptia.org/certifications'),
  P(11, 'hugging-face', 'Hugging Face Learn', 'https://huggingface.co/learn'),
  P(12, 'mathworks', 'MathWorks', 'https://matlabacademy.mathworks.com'),
  P(13, 'ni', 'NI (National Instruments)', 'https://www.ni.com/en/support/training/certification.html'),
  P(14, 'siemens', 'Siemens SITRAIN', 'https://www.siemens.com/sitrain'),
  P(15, 'autodesk', 'Autodesk', 'https://www.autodesk.com/certification/all-certifications'),
  P(16, 'solidworks', 'Dassault Systèmes (SOLIDWORKS)', 'https://www.solidworks.com/certifications'),
  P(17, 'ansys', 'Ansys Innovation Space', 'https://innovationspace.ansys.com/courses/'),
  P(18, 'aspentech', 'AspenTech Academic Program', 'https://www.aspentech.com/en/academic-program'),
]

let n = 0
const C = (provider_id: string, title: string, skills: string[], url: string, weeks: number, level: CertCourse['level'] = 'beginner'): CertCourse => ({
  id: `seed-${++n}`, provider_id, title, skills, url, weeks, level, enabled: true,
})
const NPTEL = 'https://nptel.ac.in/courses'

export const SEED_COURSES: CertCourse[] = [
  // software
  C('aws', 'AWS Certified Solutions Architect – Associate', ['Cloud & DevOps', 'System Design'], 'https://aws.amazon.com/certification/certified-solutions-architect-associate/', 6, 'intermediate'),
  C('linux-foundation', 'Certified Kubernetes Application Developer (CKAD)', ['Cloud & DevOps'], 'https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/', 5, 'intermediate'),
  C('google-cloud', 'Google Cloud Associate Cloud Engineer', ['Cloud & DevOps'], 'https://cloud.google.com/learn/certification/cloud-engineer', 6, 'intermediate'),
  C('mongodb', 'MongoDB Associate Developer', ['Databases (SQL + NoSQL)'], 'https://learn.mongodb.com/pages/mongodb-associate-developer-exam', 3),
  C('oracle', 'Oracle Database SQL Certified Associate', ['Databases (SQL + NoSQL)', 'Data Engineering (SQL + pipelines)'], 'https://education.oracle.com/', 4),
  C('coursera', 'Meta Back-End Developer Professional Certificate', ['Node.js / Backend', 'Databases (SQL + NoSQL)'], 'https://www.coursera.org/professional-certificates/meta-back-end-developer', 8),
  C('coursera', 'Meta Front-End Developer Professional Certificate', ['React / Frontend'], 'https://www.coursera.org/professional-certificates/meta-front-end-developer', 8),
  C('coursera', 'Machine Learning Specialization (DeepLearning.AI)', ['Machine Learning', 'Statistics & Probability'], 'https://www.coursera.org/specializations/machine-learning-introduction', 8),
  C('nptel', 'NPTEL Programming, Data Structures and Algorithms', ['Data Structures & Algorithms'], NPTEL, 8),
  C('design-gurus', 'Grokking the System Design Interview', ['System Design'], 'https://www.designgurus.io/course/grokking-the-system-design-interview', 4, 'intermediate'),
  // AI and data
  C('coursera', 'Deep Learning Specialization (DeepLearning.AI)', ['Deep Learning', 'Machine Learning'], 'https://www.coursera.org/specializations/deep-learning', 10, 'intermediate'),
  C('coursera', 'Google Data Analytics Professional Certificate', ['Data Engineering (SQL + pipelines)', 'Statistics & Probability'], 'https://www.coursera.org/professional-certificates/google-data-analytics', 8),
  C('hugging-face', 'Hugging Face LLM Course', ['Deep Learning', 'Machine Learning'], 'https://huggingface.co/learn/llm-course', 4, 'intermediate'),
  // cyber and networking
  C('cisco', 'CCNA: Introduction to Networks', ['Networking'], 'https://www.netacad.com/courses/ccna-introduction-networks', 8),
  C('cisco', 'Introduction to Cybersecurity', ['Security Fundamentals'], 'https://www.netacad.com/courses/introduction-to-cybersecurity', 2),
  C('comptia', 'CompTIA Security+', ['Security Fundamentals', 'Networking'], 'https://www.comptia.org/certifications/security', 8, 'intermediate'),
  C('linux-foundation', 'Introduction to Linux (LFS101)', ['Linux & Scripting'], 'https://training.linuxfoundation.org/training/introduction-to-linux/', 4),
  // electronics
  C('coursera', 'FPGA Design for Embedded Systems Specialization (CU Boulder)', ['Digital Design', 'Verilog / SystemVerilog'], 'https://www.coursera.org/specializations/fpga-design', 10, 'intermediate'),
  C('coursera', 'Introduction to the Internet of Things and Embedded Systems (UC Irvine)', ['Embedded C', 'Microcontrollers & Protocols'], 'https://www.coursera.org/learn/iot', 4),
  C('nptel', 'NPTEL Digital Circuits', ['Digital Design'], NPTEL, 12),
  C('nptel', 'NPTEL Analog Electronic Circuits', ['Analog & CMOS Circuits'], NPTEL, 12),
  C('nptel', 'NPTEL Embedded System Design with ARM', ['Embedded C', 'Microcontrollers & Protocols', 'RTOS & Embedded Linux'], NPTEL, 8),
  C('nptel', 'NPTEL Signals and Systems', ['Signals & Systems'], NPTEL, 12),
  C('nptel', 'NPTEL Principles of Communication Systems', ['Communication Systems'], NPTEL, 12),
  C('mathworks', 'MATLAB Onramp', ['MATLAB / Simulink', 'Signals & Systems'], 'https://matlabacademy.mathworks.com/details/matlab-onramp/gettingstarted', 1),
  // electrical and automation
  C('mathworks', 'Simulink Onramp', ['MATLAB / Simulink', 'Control Systems'], 'https://matlabacademy.mathworks.com/details/simulink-onramp/simulink', 1),
  C('nptel', 'NPTEL Electrical Machines', ['Electrical Machines'], NPTEL, 12),
  C('nptel', 'NPTEL Power System Analysis', ['Power Systems'], NPTEL, 12),
  C('nptel', 'NPTEL Fundamentals of Power Electronics', ['Power Electronics'], NPTEL, 12),
  C('nptel', 'NPTEL Control Engineering', ['Control Systems'], NPTEL, 12),
  C('nptel', 'NPTEL Electric Vehicles', ['Battery & EV Systems', 'Power Electronics'], NPTEL, 8),
  C('siemens', 'SITRAIN: PLC programming with TIA Portal', ['PLC & Industrial Automation'], 'https://www.siemens.com/sitrain', 2, 'intermediate'),
  C('ni', 'Certified LabVIEW Associate Developer (CLAD)', ['Instrumentation & Sensors'], 'https://www.ni.com/en/support/training/certification/labview-certification.html', 4, 'intermediate'),
  // mechanical
  C('solidworks', 'CSWA – Certified SOLIDWORKS Associate', ['CAD Modelling', 'Engineering Drawing & GD&T'], 'https://www.solidworks.com/certifications/mechanical-design-cswa-mechanical-design', 4),
  C('autodesk', 'Autodesk Certified User: Fusion', ['CAD Modelling'], 'https://www.autodesk.com/certification/all-certifications', 3),
  C('ansys', 'Ansys Innovation Courses: FEA and CFD', ['FEA / CFD Simulation'], 'https://innovationspace.ansys.com/courses/', 4, 'intermediate'),
  C('nptel', 'NPTEL Strength of Materials', ['Strength of Materials & Design'], NPTEL, 12),
  C('nptel', 'NPTEL Fluid Mechanics', ['Thermodynamics & Fluids'], NPTEL, 12),
  C('nptel', 'NPTEL Manufacturing Processes', ['Manufacturing & Industrial Engineering'], NPTEL, 12),
  C('coursera', 'Modern Robotics Specialization (Northwestern)', ['Robotics & ROS', 'Control Systems'], 'https://www.coursera.org/specializations/modernrobotics', 12, 'intermediate'),
  // civil
  C('autodesk', 'Autodesk Certified User: AutoCAD', ['AutoCAD & BIM (Revit)', 'Engineering Drawing & GD&T'], 'https://www.autodesk.com/certification/all-certifications', 3),
  C('autodesk', 'Autodesk Certified Professional: Revit for Architectural Design', ['AutoCAD & BIM (Revit)'], 'https://www.autodesk.com/certification/all-certifications', 4, 'intermediate'),
  C('nptel', 'NPTEL Design of Reinforced Concrete Structures', ['Structural Analysis & Design (IS codes)'], NPTEL, 12),
  C('nptel', 'NPTEL Soil Mechanics', ['Geotechnical & Transportation'], NPTEL, 12),
  C('oracle', 'Oracle Primavera P6 Project Management', ['Construction Planning & Estimation'], 'https://education.oracle.com/', 3),
  // chemical and life sciences
  C('aspentech', 'AspenTech Academic Program: Aspen Plus and HYSYS', ['Process Simulation (Aspen / DWSIM)'], 'https://www.aspentech.com/en/academic-program', 4),
  C('nptel', 'NPTEL Mass Transfer Operations', ['Chemical Thermodynamics & Transport'], NPTEL, 12),
  C('nptel', 'NPTEL Chemical Reaction Engineering', ['Reaction Engineering'], NPTEL, 12),
  C('nptel', 'NPTEL Bioprocess Engineering', ['Bioprocess Engineering'], NPTEL, 12),
  C('coursera', 'Bioinformatics Specialization (UC San Diego)', ['Bioinformatics'], 'https://www.coursera.org/specializations/bioinformatics', 12, 'intermediate'),
]
