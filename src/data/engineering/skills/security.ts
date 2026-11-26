import type { SkillRule } from '../types'

/** Cyber security. Names are stable: they are stored in user_skills and in drives' skill requirements. */
export const SECURITY_SKILLS: SkillRule[] = [
  { name: 'Networking', short: 'Networking', keywords: ['tcp/ip', 'networking', 'routing', 'ccna', 'wireshark'], badges: ['ccna', 'networking', 'network', 'cisco'], nptel: ['CS', 'EE'], gate: ['CS', 'EC'] },
  { name: 'Security Fundamentals', short: 'Security', langs: ['Shell', 'PowerShell'], keywords: ['security', 'owasp', 'penetration', 'ctf', 'vulnerability', 'cryptography'], badges: ['security', 'cyber', 'ethical hack', 'comptia', 'ceh'], ctf: true, nptel: ['CS'] },
  { name: 'Linux & Scripting', short: 'Linux', langs: ['Shell', 'Python', 'PowerShell'], keywords: ['linux', 'bash', 'shell scripting'], badges: ['linux', 'red hat'] },
]
