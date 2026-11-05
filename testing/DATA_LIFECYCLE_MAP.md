# Data lifecycle (engineering observation, not a legal assessment)

Collected: roster details, academics, skills, resume file and text, coding handles and stats, credentials, chat. Shared: Groq receives resume text and marks; recruiters see applicants' profiles.
User delete: cascades profile and activity; org_students row remains and holds a seat; admin email lists remain; storage objects orphaned. Org delete: cascades roster, drives, applications, roles; student accounts and files remain. No self-service deletion or export. Retention rules: none found. DPDP compliance needs a legal review.
