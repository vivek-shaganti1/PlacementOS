import type { TrackNode } from '../../types'

/** Career track: Cyber security. Roles are the jobs graduates of this track are usually hired into. */
export const CYBER_TRACK: TrackNode = {
  id: 'cyber', label: 'Cyber security', families: ['computing', 'electronics'], blurb: 'Security operations, application security and network security.', skills: ['Networking', 'Security Fundamentals', 'Linux & Scripting', 'Data Structures & Algorithms', 'Aptitude & Reasoning'], resumeKeywords: ['security', 'network', 'linux', 'owasp', 'ctf', 'wireshark', 'burp', 'siem', 'firewall', 'vulnerability'], categories: ['security', 'infra', 'service', 'consulting'],
  roles: [
    { id: 'soc_analyst', title: 'Security Analyst (SOC)', skills: ['Networking', 'Security Fundamentals', 'Linux & Scripting'] },
    { id: 'appsec', title: 'Application Security Engineer', skills: ['Security Fundamentals', 'Data Structures & Algorithms', 'Linux & Scripting'] },
    { id: 'netsec', title: 'Network Security Engineer', skills: ['Networking', 'Security Fundamentals', 'Linux & Scripting'] },
  ],
}
