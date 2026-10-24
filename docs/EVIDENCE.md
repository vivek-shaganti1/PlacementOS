# Branches, tracks and objective evidence

PlacementIQ measures every BTech branch on evidence that can be checked, never on self-rating.
The source of truth is [`src/lib/branches.ts`](../src/lib/branches.ts) (branches, tracks, skills and which evidence counts for each skill) and [`src/lib/verify.ts`](../src/lib/verify.ts) (the formulas).

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

## Evidence sources (all objective)

| Source | What is checked | How it is verified |
|---|---|---|
| **GitHub file trees** | Verilog/SystemVerilog/VHDL, testbenches, FPGA constraints, KiCad/Eagle boards, Arduino/PlatformIO/STM32 projects, SPICE, Simulink, PLC programs, 3D CAD (STEP/STL/SolidWorks/Fusion), AutoCAD, STAAD, ETABS, Revit/IFC, Jupyter, ROS, Aspen, DWSIM | Read from the repository file tree by the server; vendored and example folders are ignored |
| **KiCad schematics** | The parts actually placed (e.g. ESP32-WROOM-32, AMS1117-3.3) | The `.kicad_sch` file is parsed for placed symbols |
| **GitHub languages** | Repositories by language | GitHub API |
| **Credly** | Verified badges (Cisco, IBM, AWS, Autodesk, NI, Ansys, ...) | Credly's public badge data; only badges issued to the student's own name count |
| **NPTEL** | Certificates; the discipline code (EE, ME, CE, CH, CS, ...) is in the certificate ID | Checked on nptel.ac.in; the discipline must fit the skill it is claimed for |
| **GATE** | Paper, score, AIR from the official scorecard | Read from the PDF and name-matched; **counts only after the placement cell opens the PDF and confirms**, because GATE has no public verification service |
| **Hugging Face** | Models, datasets, spaces, downloads | Public API |
| **CTFtime** | Team rating points | Public API |
| **LeetCode, Codeforces, CodeChef** | Problems solved, ratings | As before |

None of these values can be typed in by a student.
The rows are written by the server, and students can only read or delete their own (database migrations `20261024000100` and `20261025000000`).

## Formulas (per skill)

- design files: 35 + 12 per repository (up to 4)
- KiCad: 45 + one point per 3 placed parts (up to 80)
- languages: 30 + 9 per repository (up to 5)
- Credly: 55 for the first matching badge, +10 each (up to 85)
- NPTEL: 60, or 40 + half the course score when known
- GATE (confirmed): 25 + 73 × score / 1000
- Hugging Face: 40 + 8 per artefact (up to 5) + up to 15 for downloads
- CTFtime: 45 + rating points / 4 (up to 90)
- resume or repository keywords only support other evidence (+3 each, up to 9). On their own they read as at most 45.

The best source sets the level, and each further independent source adds 4, capped at 92.
The student sees every source behind every number.

## What is not automated, and why

TryHackMe and HackTheBox block automated reads. Kaggle needs a login. GrabCAD, MathWorks and Hackster refuse API access.
These are not counted until they offer a verifiable public record.
Photos of hardware are not accepted as evidence: they cannot be tied to the student.
