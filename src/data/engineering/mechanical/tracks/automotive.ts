import type { TrackNode } from '../../types'

/** Career track: Automotive. Roles are the jobs graduates of this track are usually hired into. */
export const AUTOMOTIVE_TRACK: TrackNode = {
  id: 'automotive', label: 'Automotive', families: ['mechanical', 'mechatronics'], blurb: 'Vehicle engineering at automakers and suppliers.', skills: ['Automobile & Vehicle Systems', 'CAD Modelling', 'Thermodynamics & Fluids', 'FEA / CFD Simulation', 'Aptitude & Reasoning'], resumeKeywords: ['automobile', 'vehicle', 'baja', 'formula student', 'engine', 'powertrain', 'chassis', 'suspension', 'catia', 'ansys'], categories: ['automotive'],
  roles: [
    { id: 'vehicle', title: 'Vehicle Engineer', skills: ['Automobile & Vehicle Systems', 'Thermodynamics & Fluids', 'CAD Modelling'] },
    { id: 'powertrain', title: 'Powertrain Engineer', skills: ['Automobile & Vehicle Systems', 'Thermodynamics & Fluids', 'FEA / CFD Simulation'] },
    { id: 'auto_design', title: 'Automotive Design Engineer', skills: ['CAD Modelling', 'Automobile & Vehicle Systems', 'FEA / CFD Simulation'] },
  ],
}
