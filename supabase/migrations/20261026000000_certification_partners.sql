-- Certification providers and courses, managed by the platform admin. Safe to run more than once.
-- Students see recommended courses only from enabled providers, matched to the skills holding them back
-- (any branch). `partnered` marks providers you have a collaboration with; the app labels them.

create table if not exists public.cert_providers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null check (char_length(name) between 2 and 80),
  website text not null default '' check (website = '' or website ~ '^https://'),
  enabled boolean not null default true,
  partnered boolean not null default false,
  sort integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.cert_courses (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.cert_providers (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  skills text[] not null default '{}' check (cardinality(skills) between 1 and 6),
  url text not null check (url ~ '^https://'),
  weeks integer not null default 4 check (weeks between 1 and 52),
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider_id, title)
);
create index if not exists cert_courses_provider_idx on public.cert_courses (provider_id);

alter table public.cert_providers enable row level security;
alter table public.cert_courses enable row level security;
revoke all on public.cert_providers, public.cert_courses from anon, authenticated;
grant select, insert, update, delete on public.cert_providers, public.cert_courses to authenticated;

-- Everyone signed in reads the enabled catalog; the platform admin reads and edits everything.
drop policy if exists "read enabled providers" on public.cert_providers;
create policy "read enabled providers" on public.cert_providers for select to authenticated
  using (enabled or (select private.is_super_admin()));
drop policy if exists "platform admin manages providers" on public.cert_providers;
create policy "platform admin manages providers" on public.cert_providers for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

drop policy if exists "read enabled courses" on public.cert_courses;
create policy "read enabled courses" on public.cert_courses for select to authenticated
  using (
    (enabled and exists (select 1 from public.cert_providers p where p.id = provider_id and p.enabled))
    or (select private.is_super_admin())
  );
drop policy if exists "platform admin manages courses" on public.cert_courses;
create policy "platform admin manages courses" on public.cert_courses for all to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

-- Seed (generated from src/data/certCatalog.ts)
insert into public.cert_providers (slug, name, website, sort) values
  ('nptel', 'NPTEL', 'https://nptel.ac.in/courses', 1),
  ('coursera', 'Coursera', 'https://www.coursera.org', 2),
  ('aws', 'AWS', 'https://aws.amazon.com/certification/', 3),
  ('google-cloud', 'Google Cloud', 'https://cloud.google.com/learn/certification', 4),
  ('linux-foundation', 'Linux Foundation', 'https://training.linuxfoundation.org', 5),
  ('mongodb', 'MongoDB University', 'https://learn.mongodb.com', 6),
  ('oracle', 'Oracle University', 'https://education.oracle.com', 7),
  ('design-gurus', 'Design Gurus', 'https://www.designgurus.io', 8),
  ('cisco', 'Cisco Networking Academy', 'https://www.netacad.com', 9),
  ('comptia', 'CompTIA', 'https://www.comptia.org/certifications', 10),
  ('hugging-face', 'Hugging Face Learn', 'https://huggingface.co/learn', 11),
  ('mathworks', 'MathWorks', 'https://matlabacademy.mathworks.com', 12),
  ('ni', 'NI (National Instruments)', 'https://www.ni.com/en/support/training/certification.html', 13),
  ('siemens', 'Siemens SITRAIN', 'https://www.siemens.com/sitrain', 14),
  ('autodesk', 'Autodesk', 'https://www.autodesk.com/certification/all-certifications', 15),
  ('solidworks', 'Dassault Systèmes (SOLIDWORKS)', 'https://www.solidworks.com/certifications', 16),
  ('ansys', 'Ansys Innovation Space', 'https://innovationspace.ansys.com/courses/', 17),
  ('aspentech', 'AspenTech Academic Program', 'https://www.aspentech.com/en/academic-program', 18)
on conflict (slug) do nothing;

insert into public.cert_courses (provider_id, title, skills, url, weeks, level)
select p.id, v.title, v.skills, v.url, v.weeks, v.level
from (values
  ('aws', 'AWS Certified Solutions Architect – Associate', array['Cloud & DevOps', 'System Design']::text[], 'https://aws.amazon.com/certification/certified-solutions-architect-associate/', 6, 'intermediate'),
  ('linux-foundation', 'Certified Kubernetes Application Developer (CKAD)', array['Cloud & DevOps']::text[], 'https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/', 5, 'intermediate'),
  ('google-cloud', 'Google Cloud Associate Cloud Engineer', array['Cloud & DevOps']::text[], 'https://cloud.google.com/learn/certification/cloud-engineer', 6, 'intermediate'),
  ('mongodb', 'MongoDB Associate Developer', array['Databases (SQL + NoSQL)']::text[], 'https://learn.mongodb.com/pages/mongodb-associate-developer-exam', 3, 'beginner'),
  ('oracle', 'Oracle Database SQL Certified Associate', array['Databases (SQL + NoSQL)', 'Data Engineering (SQL + pipelines)']::text[], 'https://education.oracle.com/', 4, 'beginner'),
  ('coursera', 'Meta Back-End Developer Professional Certificate', array['Node.js / Backend', 'Databases (SQL + NoSQL)']::text[], 'https://www.coursera.org/professional-certificates/meta-back-end-developer', 8, 'beginner'),
  ('coursera', 'Meta Front-End Developer Professional Certificate', array['React / Frontend']::text[], 'https://www.coursera.org/professional-certificates/meta-front-end-developer', 8, 'beginner'),
  ('coursera', 'Machine Learning Specialization (DeepLearning.AI)', array['Machine Learning', 'Statistics & Probability']::text[], 'https://www.coursera.org/specializations/machine-learning-introduction', 8, 'beginner'),
  ('nptel', 'NPTEL Programming, Data Structures and Algorithms', array['Data Structures & Algorithms']::text[], 'https://nptel.ac.in/courses', 8, 'beginner'),
  ('design-gurus', 'Grokking the System Design Interview', array['System Design']::text[], 'https://www.designgurus.io/course/grokking-the-system-design-interview', 4, 'intermediate'),
  ('coursera', 'Deep Learning Specialization (DeepLearning.AI)', array['Deep Learning', 'Machine Learning']::text[], 'https://www.coursera.org/specializations/deep-learning', 10, 'intermediate'),
  ('coursera', 'Google Data Analytics Professional Certificate', array['Data Engineering (SQL + pipelines)', 'Statistics & Probability']::text[], 'https://www.coursera.org/professional-certificates/google-data-analytics', 8, 'beginner'),
  ('hugging-face', 'Hugging Face LLM Course', array['Deep Learning', 'Machine Learning']::text[], 'https://huggingface.co/learn/llm-course', 4, 'intermediate'),
  ('cisco', 'CCNA: Introduction to Networks', array['Networking']::text[], 'https://www.netacad.com/courses/ccna-introduction-networks', 8, 'beginner'),
  ('cisco', 'Introduction to Cybersecurity', array['Security Fundamentals']::text[], 'https://www.netacad.com/courses/introduction-to-cybersecurity', 2, 'beginner'),
  ('comptia', 'CompTIA Security+', array['Security Fundamentals', 'Networking']::text[], 'https://www.comptia.org/certifications/security', 8, 'intermediate'),
  ('linux-foundation', 'Introduction to Linux (LFS101)', array['Linux & Scripting']::text[], 'https://training.linuxfoundation.org/training/introduction-to-linux/', 4, 'beginner'),
  ('coursera', 'FPGA Design for Embedded Systems Specialization (CU Boulder)', array['Digital Design', 'Verilog / SystemVerilog']::text[], 'https://www.coursera.org/specializations/fpga-design', 10, 'intermediate'),
  ('coursera', 'Introduction to the Internet of Things and Embedded Systems (UC Irvine)', array['Embedded C', 'Microcontrollers & Protocols']::text[], 'https://www.coursera.org/learn/iot', 4, 'beginner'),
  ('nptel', 'NPTEL Digital Circuits', array['Digital Design']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Analog Electronic Circuits', array['Analog & CMOS Circuits']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Embedded System Design with ARM', array['Embedded C', 'Microcontrollers & Protocols', 'RTOS & Embedded Linux']::text[], 'https://nptel.ac.in/courses', 8, 'beginner'),
  ('nptel', 'NPTEL Signals and Systems', array['Signals & Systems']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Principles of Communication Systems', array['Communication Systems']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('mathworks', 'MATLAB Onramp', array['MATLAB / Simulink', 'Signals & Systems']::text[], 'https://matlabacademy.mathworks.com/details/matlab-onramp/gettingstarted', 1, 'beginner'),
  ('mathworks', 'Simulink Onramp', array['MATLAB / Simulink', 'Control Systems']::text[], 'https://matlabacademy.mathworks.com/details/simulink-onramp/simulink', 1, 'beginner'),
  ('nptel', 'NPTEL Electrical Machines', array['Electrical Machines']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Power System Analysis', array['Power Systems']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Fundamentals of Power Electronics', array['Power Electronics']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Control Engineering', array['Control Systems']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Electric Vehicles', array['Battery & EV Systems', 'Power Electronics']::text[], 'https://nptel.ac.in/courses', 8, 'beginner'),
  ('siemens', 'SITRAIN: PLC programming with TIA Portal', array['PLC & Industrial Automation']::text[], 'https://www.siemens.com/sitrain', 2, 'intermediate'),
  ('ni', 'Certified LabVIEW Associate Developer (CLAD)', array['Instrumentation & Sensors']::text[], 'https://www.ni.com/en/support/training/certification/labview-certification.html', 4, 'intermediate'),
  ('solidworks', 'CSWA – Certified SOLIDWORKS Associate', array['CAD Modelling', 'Engineering Drawing & GD&T']::text[], 'https://www.solidworks.com/certifications/mechanical-design-cswa-mechanical-design', 4, 'beginner'),
  ('autodesk', 'Autodesk Certified User: Fusion', array['CAD Modelling']::text[], 'https://www.autodesk.com/certification/all-certifications', 3, 'beginner'),
  ('ansys', 'Ansys Innovation Courses: FEA and CFD', array['FEA / CFD Simulation']::text[], 'https://innovationspace.ansys.com/courses/', 4, 'intermediate'),
  ('nptel', 'NPTEL Strength of Materials', array['Strength of Materials & Design']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Fluid Mechanics', array['Thermodynamics & Fluids']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Manufacturing Processes', array['Manufacturing & Industrial Engineering']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('coursera', 'Modern Robotics Specialization (Northwestern)', array['Robotics & ROS', 'Control Systems']::text[], 'https://www.coursera.org/specializations/modernrobotics', 12, 'intermediate'),
  ('autodesk', 'Autodesk Certified User: AutoCAD', array['AutoCAD & BIM (Revit)', 'Engineering Drawing & GD&T']::text[], 'https://www.autodesk.com/certification/all-certifications', 3, 'beginner'),
  ('autodesk', 'Autodesk Certified Professional: Revit for Architectural Design', array['AutoCAD & BIM (Revit)']::text[], 'https://www.autodesk.com/certification/all-certifications', 4, 'intermediate'),
  ('nptel', 'NPTEL Design of Reinforced Concrete Structures', array['Structural Analysis & Design (IS codes)']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Soil Mechanics', array['Geotechnical & Transportation']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('oracle', 'Oracle Primavera P6 Project Management', array['Construction Planning & Estimation']::text[], 'https://education.oracle.com/', 3, 'beginner'),
  ('aspentech', 'AspenTech Academic Program: Aspen Plus and HYSYS', array['Process Simulation (Aspen / DWSIM)']::text[], 'https://www.aspentech.com/en/academic-program', 4, 'beginner'),
  ('nptel', 'NPTEL Mass Transfer Operations', array['Chemical Thermodynamics & Transport']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Chemical Reaction Engineering', array['Reaction Engineering']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('nptel', 'NPTEL Bioprocess Engineering', array['Bioprocess Engineering']::text[], 'https://nptel.ac.in/courses', 12, 'beginner'),
  ('coursera', 'Bioinformatics Specialization (UC San Diego)', array['Bioinformatics']::text[], 'https://www.coursera.org/specializations/bioinformatics', 12, 'intermediate')
) as v (slug, title, skills, url, weeks, level)
join public.cert_providers p on p.slug = v.slug
on conflict (provider_id, title) do nothing;
