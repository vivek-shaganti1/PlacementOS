import type { SkillRule } from '../types'

/** Civil. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const CIVIL_SKILLS: SkillRule[] = [
  { name: 'Structural Analysis & Design (IS codes)', short: 'Structural', files: ['staad', 'etabs'], keywords: ['structural analysis', 'rcc design', 'steel design', 'is 456', 'is 800', 'is 1893'], badges: ['structural', 'staad', 'etabs'], nptel: ['CE'], gate: ['CE'] },
  { name: 'Structural Software (STAAD / ETABS)', short: 'STAAD', files: ['staad', 'etabs'], keywords: ['staad', 'etabs', 'sap2000', 'safe'], badges: ['staad', 'etabs', 'bentley', 'csi'] },
  { name: 'AutoCAD & BIM (Revit)', short: 'BIM', files: ['cad2d', 'bim'], keywords: ['autocad', 'revit', 'bim', 'navisworks'], badges: ['autocad', 'revit', 'bim', 'autodesk'], nptel: ['CE'] },
  { name: 'Construction Planning & Estimation', short: 'Planning', keywords: ['primavera', 'ms project', 'estimation', 'costing', 'quantity surveying', 'site execution'], badges: ['primavera', 'project management', 'pmp', 'capm'], nptel: ['CE'], gate: ['CE'] },
  { name: 'Geotechnical & Transportation', short: 'Geotech', keywords: ['soil mechanics', 'foundation', 'geotechnical', 'highway', 'pavement', 'surveying', 'gis'], badges: ['gis', 'surveying'], nptel: ['CE'], gate: ['CE'] },
]
