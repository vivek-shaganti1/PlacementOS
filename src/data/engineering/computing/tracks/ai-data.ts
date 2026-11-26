import type { TrackNode } from '../../types'

/** Career track: AI, ML and data. Roles are the jobs graduates of this track are usually hired into. */
export const AI_DATA_TRACK: TrackNode = {
  id: 'ai_data', label: 'AI, ML and data', families: ['computing', 'electronics', 'electrical'], blurb: 'Data science, ML engineering and analytics roles.', skills: ['Machine Learning', 'Deep Learning', 'Statistics & Probability', 'Data Engineering (SQL + pipelines)', 'Data Structures & Algorithms', 'Aptitude & Reasoning'], resumeKeywords: ['machine learning', 'python', 'pandas', 'pytorch', 'tensorflow', 'sql', 'statistics', 'model', 'dataset', 'accuracy'], categories: ['ai', 'top', 'product', 'service', 'consulting'],
  roles: [
    { id: 'data_analyst', title: 'Data Analyst', skills: ['Statistics & Probability', 'Data Engineering (SQL + pipelines)', 'Aptitude & Reasoning'] },
    { id: 'data_scientist', title: 'Data Scientist', skills: ['Machine Learning', 'Statistics & Probability', 'Deep Learning'] },
    { id: 'ml_engineer', title: 'Machine Learning Engineer', skills: ['Machine Learning', 'Deep Learning', 'Data Structures & Algorithms', 'Data Engineering (SQL + pipelines)'] },
    { id: 'data_engineer', title: 'Data Engineer', skills: ['Data Engineering (SQL + pipelines)', 'Data Structures & Algorithms', 'Statistics & Probability'] },
  ],
}
