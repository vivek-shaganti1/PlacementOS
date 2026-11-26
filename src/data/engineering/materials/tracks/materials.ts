import type { TrackNode } from '../../types'

/** Career track: Materials and metallurgy. Roles are the jobs graduates of this track are usually hired into. */
export const MATERIALS_TRACK: TrackNode = {
  id: 'materials', label: 'Materials and metallurgy', families: ['materials', 'mechanical'], blurb: 'Steel, metals and materials companies.', skills: ['Materials & Metallurgy', 'Manufacturing & Industrial Engineering', 'Thermodynamics & Fluids', 'Aptitude & Reasoning'], resumeKeywords: ['metallurgy', 'heat treatment', 'steel', 'materials', 'casting', 'welding', 'quality', 'xrd', 'sem', 'testing'], categories: ['manufacturing', 'process'],
  roles: [
    { id: 'metallurgist', title: 'Metallurgist / Quality Engineer', skills: ['Materials & Metallurgy', 'Manufacturing & Industrial Engineering'] },
    { id: 'process_metallurgy', title: 'Process Metallurgist', skills: ['Materials & Metallurgy', 'Thermodynamics & Fluids'] },
    { id: 'testing', title: 'Materials Testing Engineer', skills: ['Materials & Metallurgy', 'Manufacturing & Industrial Engineering'] },
  ],
}
