import type { TrackNode } from '../../types'

/** Career track: Manufacturing and production. Roles are the jobs graduates of this track are usually hired into. */
export const MANUFACTURING_TRACK: TrackNode = {
  id: 'manufacturing', label: 'Manufacturing and production', families: ['mechanical', 'mechatronics', 'materials'], blurb: 'Plant, production, quality and supply-chain roles.', skills: ['Manufacturing & Industrial Engineering', 'CAD Modelling', 'Thermodynamics & Fluids', 'Strength of Materials & Design', 'Aptitude & Reasoning'], resumeKeywords: ['manufacturing', 'production', 'lean', 'six sigma', 'quality', 'cnc', 'kaizen', 'plant', 'supply chain', '5s'], categories: ['manufacturing', 'automotive'],
  roles: [
    { id: 'production', title: 'Production Engineer', skills: ['Manufacturing & Industrial Engineering', 'Strength of Materials & Design'] },
    { id: 'quality', title: 'Quality Engineer', skills: ['Manufacturing & Industrial Engineering', 'Strength of Materials & Design'] },
    { id: 'industrial', title: 'Process / Industrial Engineer', skills: ['Manufacturing & Industrial Engineering', 'Thermodynamics & Fluids', 'CAD Modelling'] },
  ],
}
