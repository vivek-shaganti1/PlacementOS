# Branches, tracks and objective evidence

PlacementIQ measures every BTech branch on evidence that can be checked.
Rankings never use what a student types about themselves; the student's own guidance pages may, and label it.
The source of truth is [`src/lib/branches.ts`](../src/lib/branches.ts) (branches, tracks, skills and which evidence counts for each skill) and [`src/lib/verify.ts`](../src/lib/verify.ts) (the formulas).

## The ranking rule

Rankings seen by placement cells and recruiters use only:
- evidence the server fetched from accounts the student has proven are theirs
- credentials that have been confirmed
- the academics held by the college

Skills, projects and internships a student types are labelled self-reported and do not count in rankings.
They can still appear on the student's own pages, such as eligibility and the What-If simulator, where they help the student plan.

A resume score is advisory. It is computed from text the student supplies, so it shows how the resume reads and proves nothing about the student.

Scores are measured on the student's own tracks, not on fixed software skills, so a civil or VLSI student can reach the same maximum as a software student:
- technical rounds use the first two non-aptitude skills of the student's strongest track (`coreSkills` in [`src/lib/predict.ts`](../src/lib/predict.ts))
- ranking readiness counts only skills inside the student's tracks (`trackReadiness`, same file)

A company can test skills outside a track. Those gaps stay on the student's own pages as advice and do not lower a ranking.

## Branches and tracks

About 30 branch spellings are recognised (CSE, CSE (AI & ML), AI & DS, ECE, EEE, EIE, Mechanical, Automobile, Civil, Chemical, Biotech, Metallurgy, Mining and others).
They map to 9 families. Each family offers tracks, and a student picks up to three, for example ECE → VLSI + Embedded + Software.
A track decides:
- the skills the student is measured on
- the recruiters they are scored against
- the resume keywords checked
- the evidence sources shown

Software engineering is open to every branch, because mass IT recruiters hire from all of them.

| Family | Tracks |
|---|---|
| Computing | Software, AI/ML & data, Cyber security, Embedded & IoT |
| Electronics | VLSI, Embedded & IoT, Communication & RF, Industrial automation, Robotics, Software, AI/ML |
| Electrical | Power & energy, Industrial automation, Electric vehicles, Embedded, VLSI, Robotics, Software |
| Mechanical | Design & simulation, Manufacturing, Automotive, Electric vehicles, Robotics, Industrial automation, Materials |
| Mechatronics | Robotics, Embedded, Automation, Design, Manufacturing, Automotive, EV |
| Civil | Structural, Construction & project management |
| Chemical | Process & chemical, Biotech & pharma |
| Life sciences | Biotech & pharma, Process |
| Materials, mining, others | Materials & metallurgy, Manufacturing |

## Evidence sources

Seven platforms are read by the server (GitHub, LeetCode, Codeforces, CodeChef, Credly, Hugging Face, CTFtime), plus NPTEL and GATE credentials.
The catalog these are measured against is 66 recruiters plus 50 core recruiters across 23 categories.

| Source | What is checked | How it is verified |
|---|---|---|
| **GitHub file trees** | Verilog/SystemVerilog/VHDL, testbenches, FPGA constraints, KiCad/Eagle boards, Arduino/PlatformIO/STM32 projects, SPICE, Simulink, PLC programs, 3D CAD (STEP/STL/SolidWorks/Fusion), AutoCAD, STAAD, ETABS, Revit/IFC, Jupyter, ROS, Aspen, DWSIM | Read from the repository file tree by the server; vendored and example folders are ignored |
| **KiCad schematics** | The parts actually placed (e.g. ESP32-WROOM-32, AMS1117-3.3) | The `.kicad_sch` file is parsed for placed symbols |
| **GitHub languages** | Repositories by language | GitHub API |
| **Credly** | Verified badges (Cisco, IBM, AWS, Autodesk, NI, Ansys, ...) | Credly's public badge data; the name on the badge must match the name on the college roster |
| **NPTEL** | Certificates; the discipline code (EE, ME, CE, CH, CS, ...) is in the certificate ID | Checked to exist at nptel.ac.in, then confirmed by the placement cell; the discipline must fit the skill it is claimed for |
| **GATE** | Paper, score, AIR from the official scorecard | Read from the PDF; the name must match the college roster; **counts only after the placement cell opens the PDF and confirms**, because GATE has no public verification service |
| **Hugging Face** | Models, datasets, spaces, downloads | Public API |
| **CTFtime** | Team rating points | Public API |
| **LeetCode, Codeforces, CodeChef** | Problems solved, ratings | Read from each platform by the server |

None of these values can be typed in by a student.
The rows are written by the server, and students can only read or delete their own (database migrations `20261024000100`, `20261025000000` and `20261105000000`).

## Formulas (per skill)

- design files: 35 + 12 per repository (up to 4)
- KiCad: 45 + one point per 3 placed parts (up to 80)
- languages: 30 + 9 per repository (up to 5)
- Credly: 55 for the first matching badge, +10 each (up to 85)
- NPTEL: 60, or 40 + half the course score when known
- GATE (confirmed): 25 + 73 × score / 1000
- Hugging Face: 40 + 8 per artefact (up to 5) + up to 15 for downloads
- CTFtime: 45 + rating points / 4 (up to 90)
- resume or repository keywords only support other evidence (+3 each, up to 9). On their own they read as 25 + 6 per keyword, at most 45. Resume keywords come from text the student supplies, so they are advisory like the resume score.

The best source sets the level, and each further independent source adds 4, capped at 92.
The student sees every source behind every number.

## What is not automated, and why

TryHackMe and HackTheBox block automated reads. Kaggle needs a login. GrabCAD, MathWorks and Hackster refuse API access.
These are not counted until they offer a verifiable public record.
Photos of hardware are not accepted as evidence: they cannot be tied to the student.
