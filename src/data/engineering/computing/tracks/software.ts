import type { TrackNode } from '../../types'

/** The original eight software skills, in the order existing data and rankings rely on. */
const SOFTWARE = ['Data Structures & Algorithms', 'System Design', 'React / Frontend', 'Node.js / Backend', 'Databases (SQL + NoSQL)', 'Machine Learning', 'Cloud & DevOps', 'Aptitude & Reasoning']

/** Career track: Software engineering. Roles are the jobs graduates of this track are usually hired into. */
export const SOFTWARE_TRACK: TrackNode = {
  id: 'software', label: 'Software engineering', families: ['computing', 'electronics', 'electrical', 'mechanical', 'mechatronics', 'civil', 'chemical', 'lifesci', 'materials'], blurb: 'Product companies, IT services and startups. Open to every branch.', skills: SOFTWARE, resumeKeywords: ['data structures', 'algorithms', 'react', 'node', 'sql', 'api', 'git', 'docker', 'java', 'python'], categories: ['top', 'quant', 'ai', 'product', 'fintech', 'startup', 'infra', 'hardware', 'service', 'consulting'],
  roles: [
    { id: 'sde', title: 'Software Engineer (SDE)', skills: ['Data Structures & Algorithms', 'System Design', 'Node.js / Backend', 'Databases (SQL + NoSQL)'] },
    { id: 'frontend', title: 'Frontend Developer', skills: ['React / Frontend', 'Data Structures & Algorithms', 'Node.js / Backend'] },
    { id: 'backend', title: 'Backend Developer', skills: ['Node.js / Backend', 'Databases (SQL + NoSQL)', 'System Design', 'Data Structures & Algorithms'] },
    { id: 'fullstack', title: 'Full-stack Developer', skills: ['React / Frontend', 'Node.js / Backend', 'Databases (SQL + NoSQL)', 'Data Structures & Algorithms'] },
    { id: 'devops', title: 'DevOps / Cloud Engineer', skills: ['Cloud & DevOps', 'Node.js / Backend', 'System Design'] },
    { id: 'sdet', title: 'QA / Test Engineer (SDET)', skills: ['Data Structures & Algorithms', 'Node.js / Backend', 'Aptitude & Reasoning'] },
  ],
}
