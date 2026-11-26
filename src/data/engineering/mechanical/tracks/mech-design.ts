import type { TrackNode } from '../../types'

/** Career track: Design and simulation. Roles are the jobs graduates of this track are usually hired into. */
export const MECH_DESIGN_TRACK: TrackNode = {
  id: 'mech_design', label: 'Design and simulation', families: ['mechanical', 'mechatronics'], blurb: 'Product design, CAD and simulation roles at OEMs and engineering services.', skills: ['CAD Modelling', 'Engineering Drawing & GD&T', 'Strength of Materials & Design', 'FEA / CFD Simulation', 'Aptitude & Reasoning'], resumeKeywords: ['solidworks', 'catia', 'creo', 'ansys', 'gd&t', 'design', 'fea', 'cfd', 'drawing', 'tolerance'], categories: ['automotive', 'manufacturing', 'engineering_services'],
  roles: [
    { id: 'design', title: 'Design Engineer', skills: ['CAD Modelling', 'Engineering Drawing & GD&T', 'Strength of Materials & Design'] },
    { id: 'cae', title: 'CAE / Simulation Engineer', skills: ['FEA / CFD Simulation', 'Strength of Materials & Design', 'CAD Modelling'] },
    { id: 'product', title: 'Product Development Engineer', skills: ['CAD Modelling', 'Engineering Drawing & GD&T', 'FEA / CFD Simulation'] },
  ],
}
