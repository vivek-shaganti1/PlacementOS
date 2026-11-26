import type { TrackNode } from '../../types'

/** Career track: Biotech and pharma. Roles are the jobs graduates of this track are usually hired into. */
export const BIOTECH_TRACK: TrackNode = {
  id: 'biotech', label: 'Biotech and pharma', families: ['lifesci', 'chemical'], blurb: 'Research, bioprocess and quality roles in biotech and pharma.', skills: ['Molecular Biology & Lab Techniques', 'Bioprocess Engineering', 'Bioinformatics', 'Aptitude & Reasoning'], resumeKeywords: ['pcr', 'cell culture', 'fermentation', 'bioinformatics', 'assay', 'gmp', 'elisa', 'downstream', 'research', 'lab'], categories: ['biotech'],
  roles: [
    { id: 'research', title: 'Research Associate', skills: ['Molecular Biology & Lab Techniques', 'Bioinformatics'] },
    { id: 'bioprocess', title: 'Bioprocess Engineer', skills: ['Bioprocess Engineering', 'Molecular Biology & Lab Techniques'] },
    { id: 'bioinformatics', title: 'Bioinformatics Analyst', skills: ['Bioinformatics', 'Molecular Biology & Lab Techniques'] },
  ],
}
