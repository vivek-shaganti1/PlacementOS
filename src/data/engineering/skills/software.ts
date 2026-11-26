import type { SkillRule } from '../types'

/** Software (the original eight; unchanged so existing data keeps its meaning) and aptitude. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const SOFTWARE_SKILLS: SkillRule[] = [
  { name: 'Data Structures & Algorithms', short: 'DSA', keywords: ['dsa', 'algorithms', 'leetcode', 'competitive programming'], nptel: ['CS'], gate: ['CS', 'DA'] },
  { name: 'System Design', short: 'System Design', keywords: ['system design', 'distributed', 'microservices', 'scalable', 'kafka'] },
  { name: 'React / Frontend', short: 'Frontend', langs: ['JavaScript', 'TypeScript', 'HTML', 'CSS', 'Vue', 'Svelte', 'Dart'], keywords: ['react', 'next.js', 'vue', 'angular', 'frontend', 'flutter'] },
  { name: 'Node.js / Backend', short: 'Backend', langs: ['Go', 'Java', 'Kotlin', 'Rust', 'PHP', 'Ruby', 'C#'], keywords: ['node', 'express', 'django', 'flask', 'fastapi', 'spring', 'backend', 'rest api'] },
  { name: 'Databases (SQL + NoSQL)', short: 'Databases', langs: ['PLpgSQL', 'TSQL', 'SQL'], keywords: ['sql', 'postgres', 'mysql', 'mongodb', 'database'], badges: ['database', 'sql', 'mongodb'], nptel: ['CS'] },
  { name: 'Machine Learning', short: 'ML', langs: ['Jupyter Notebook', 'R'], files: ['notebook'], keywords: ['machine learning', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn', 'nlp', 'computer vision'], badges: ['machine learning', 'artificial intelligence', 'deep learning', 'tensorflow', 'data science'], nptel: ['CS'], huggingface: true, gate: ['DA'] },
  { name: 'Cloud & DevOps', short: 'Cloud', langs: ['Dockerfile', 'HCL', 'Shell'], keywords: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'devops', 'linux'], badges: ['aws', 'azure', 'google cloud', 'kubernetes', 'devops', 'red hat', 'linux'] },
  { name: 'Aptitude & Reasoning', short: 'Aptitude', keywords: ['aptitude', 'quantitative', 'reasoning'], gate: ['EC', 'EE', 'ME', 'CE', 'CH', 'IN', 'BT', 'MT', 'PI', 'AE', 'CS', 'DA'] },
]
