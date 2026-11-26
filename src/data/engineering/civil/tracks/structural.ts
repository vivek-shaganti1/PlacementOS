import type { TrackNode } from '../../types'

/** Career track: Structural engineering. Roles are the jobs graduates of this track are usually hired into. */
export const STRUCTURAL_TRACK: TrackNode = {
  id: 'structural', label: 'Structural engineering', families: ['civil'], blurb: 'Structural design at consultancies and EPC companies.', skills: ['Structural Analysis & Design (IS codes)', 'Structural Software (STAAD / ETABS)', 'AutoCAD & BIM (Revit)', 'Geotechnical & Transportation', 'Aptitude & Reasoning'], resumeKeywords: ['staad', 'etabs', 'rcc', 'steel', 'is 456', 'structural', 'autocad', 'revit', 'design', 'foundation'], categories: ['construction'],
  roles: [
    { id: 'structural_design', title: 'Structural Design Engineer', skills: ['Structural Analysis & Design (IS codes)', 'Structural Software (STAAD / ETABS)', 'AutoCAD & BIM (Revit)'] },
    { id: 'bim', title: 'BIM Engineer', skills: ['AutoCAD & BIM (Revit)', 'Structural Analysis & Design (IS codes)'] },
    { id: 'geotech', title: 'Geotechnical Engineer', skills: ['Geotechnical & Transportation', 'Structural Analysis & Design (IS codes)'] },
  ],
}
