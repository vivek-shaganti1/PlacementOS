import { callApi } from './api'
import { extractResumeText } from './resumeText'
import { supabase, type Profile, type ProfilePatch } from './supabase'

/** Uploads a resume to private storage, records it on the profile, extracts its text and runs the AI analysis. */
export async function uploadAndAnalyzeResume(
  file: File,
  userId: string,
  profile: Profile,
  updateProfile: (patch: ProfilePatch) => Promise<void>,
  onStep: (step: string) => void,
) {
  if (file.size > 5 * 1024 * 1024) throw new Error('Resume must be under 5 MB.')
  if (!/\.(pdf|docx)$/i.test(file.name)) throw new Error('Upload a PDF or DOCX file.')
  onStep('Uploading…')
  const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`
  const { error } = await supabase.storage.from('resumes').upload(path, file, { contentType: file.type || 'application/pdf' })
  if (error) throw error
  const old = profile.resume_path
  await updateProfile({ resume_path: path, resume_name: file.name, resume_uploaded_at: new Date().toISOString() })
  if (old && old !== path) supabase.storage.from('resumes').remove([old])
  onStep('Reading your resume…')
  const text = await extractResumeText(file, file.name)
  onStep('Analyzing with AI…')
  await callApi('resume', { action: 'analyze', text, file_name: file.name })
}

/** Adds projects, internships and certifications found in the resume that the profile does not have yet. */
export function resumeImports(p: Profile): ProfilePatch | null {
  const a = p.resume_analysis
  if (!a) return null
  const haveProjects = new Set(p.projects.map((x) => x.title.toLowerCase()))
  const projects = a.extracted.projects
    .filter((x) => !haveProjects.has(x.name.toLowerCase()))
    .map((x) => ({ title: x.name, tech: x.tech, description: x.description, url: null, source: 'resume' as const }))
  const haveOrgs = new Set(p.internships.map((i) => i.org.toLowerCase()))
  const internships = a.extracted.internships.filter((i) => !haveOrgs.has(i.org.toLowerCase()))
  const haveCerts = new Set(p.certifications.map((c) => c.name.toLowerCase()))
  const certifications = a.extracted.certifications.filter((c) => !haveCerts.has(c.toLowerCase())).map((name) => ({ name, issuer: '', date: '' }))
  if (!projects.length && !internships.length && !certifications.length) return null
  return {
    projects: [...p.projects, ...projects],
    internships: [...p.internships, ...internships],
    certifications: [...p.certifications, ...certifications],
  }
}
