import type { SkillRule } from '../types'

/** AI and data. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const AI_DATA_SKILLS: SkillRule[] = [
  { name: 'Statistics & Probability', short: 'Statistics', langs: ['R'], files: ['notebook'], keywords: ['statistics', 'probability', 'hypothesis', 'regression', 'a/b test'], badges: ['statistics', 'data analysis', 'data analyst'], nptel: ['MA', 'CS'], gate: ['DA'] },
  { name: 'Deep Learning', short: 'Deep Learning', langs: ['Jupyter Notebook'], files: ['notebook'], keywords: ['deep learning', 'cnn', 'transformer', 'pytorch', 'tensorflow', 'llm'], badges: ['deep learning', 'tensorflow', 'neural'], huggingface: true, nptel: ['CS'] },
  { name: 'Data Engineering (SQL + pipelines)', short: 'Data Eng', langs: ['SQL', 'PLpgSQL', 'Scala'], keywords: ['etl', 'spark', 'airflow', 'data pipeline', 'sql', 'power bi', 'tableau'], badges: ['data engineer', 'power bi', 'tableau', 'databricks', 'snowflake'] },
]
