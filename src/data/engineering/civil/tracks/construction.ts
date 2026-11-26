import type { TrackNode } from '../../types'

/** Career track: Construction and project management. Roles are the jobs graduates of this track are usually hired into. */
export const CONSTRUCTION_TRACK: TrackNode = {
  id: 'construction', label: 'Construction and project management', families: ['civil'], blurb: 'Site execution, planning and estimation at construction and infrastructure companies.', skills: ['Construction Planning & Estimation', 'AutoCAD & BIM (Revit)', 'Structural Analysis & Design (IS codes)', 'Geotechnical & Transportation', 'Aptitude & Reasoning'], resumeKeywords: ['site', 'execution', 'estimation', 'primavera', 'ms project', 'quantity', 'autocad', 'billing', 'safety', 'construction'], categories: ['construction'],
  roles: [
    { id: 'site', title: 'Site Engineer', skills: ['Construction Planning & Estimation', 'Geotechnical & Transportation', 'AutoCAD & BIM (Revit)'] },
    { id: 'planning', title: 'Planning / Estimation Engineer', skills: ['Construction Planning & Estimation', 'AutoCAD & BIM (Revit)'] },
    { id: 'qs', title: 'Quantity Surveyor', skills: ['Construction Planning & Estimation', 'AutoCAD & BIM (Revit)'] },
  ],
}
