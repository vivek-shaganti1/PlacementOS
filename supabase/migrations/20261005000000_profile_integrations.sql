-- Connected accounts, verified stats, resume analysis and other tracked profile data.

alter table public.profiles
  add column if not exists github_username text,
  add column if not exists leetcode_username text,
  add column if not exists codeforces_username text,
  add column if not exists codechef_username text,
  add column if not exists hackerrank_username text,
  add column if not exists linkedin_url text,
  add column if not exists portfolio_url text,
  -- cached results of the last sync per platform: { github: {...}, leetcode: {...}, ... }
  add column if not exists integrations jsonb not null default '{}'::jsonb,
  add column if not exists certifications jsonb not null default '[]'::jsonb,
  add column if not exists achievements jsonb not null default '[]'::jsonb,
  add column if not exists mock_feedback jsonb not null default '[]'::jsonb,
  add column if not exists target_roles text not null default 'Software Engineer (SDE)',
  add column if not exists resume_text text,
  add column if not exists resume_analysis jsonb,
  add column if not exists jd_match jsonb;

-- New accounts start empty instead of inheriting sample values.
alter table public.profiles
  alter column meta set default '',
  alter column branch set default '',
  alter column batch set default '',
  alter column college set default '',
  alter column cgpa set default 0,
  alter column class_x set default 0,
  alter column class_xii set default 0,
  alter column projects set default '[]'::jsonb,
  alter column internships set default '[]'::jsonb,
  alter column skills set default '[
    {"name":"Data Structures & Algorithms","level":0},
    {"name":"System Design","level":0},
    {"name":"React / Frontend","level":0},
    {"name":"Node.js / Backend","level":0},
    {"name":"Databases (SQL + NoSQL)","level":0},
    {"name":"Machine Learning","level":0},
    {"name":"Cloud & DevOps","level":0},
    {"name":"Aptitude & Reasoning","level":0}
  ]'::jsonb;

alter table public.profiles
  add constraint profiles_resume_text_len check (resume_text is null or char_length(resume_text) <= 40000) not valid;
