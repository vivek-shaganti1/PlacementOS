import type { ReactNode } from 'react'
import { AbsoluteFill, Audio, Img, Sequence, interpolate, random, staticFile, useCurrentFrame } from 'remotion'
import {
  Aurora, Browser, C, Cursor, Eyebrow, Focus, H, LogoMark, Night, Particles, SANS, SERIF_I, SH, SW, Sweep, Title, W, Wordmark,
  ease, fade, inout, shot, track,
} from './kit'

/* ================================================================== timeline (frames @ 30 fps) */
const T = {
  open: [0, 240],
  reveal: [225, 300],
  login: [510, 375],
  stacks: [870, 285],
  resume: [1140, 315],
  ai: [1440, 405],
  montage: [1830, 345],
  admin: [2160, 405],
  devices: [2550, 195],
  hero: [2730, 270],
} as const
export const DURATION = 3000

const VO: [number, number][] = [
  [1, 90], [2, 250], [3, 612], [4, 885], [5, 1160], [6, 1455], [7, 1772], [8, 1852], [9, 2180], [10, 2385], [11, 2604], [12, 2778],
]
const SFX: [string, number, number?][] = [
  ['impact', 18, 0.9], ['whoosh', 200], ['chime', 236, 0.5], ['click', 225 + 278],
  ['click', 510 + 75], ['whoosh', 510 + 95, 0.6],
  ['click', 870 + 120], ['whoosh', 870 + 124, 0.5],
  ['whoosh', 1140 + 140, 0.5], ['click', 1140 + 268], ['chime', 1140 + 274, 0.6],
  ['click', 1440 + 52], ['typing', 1440 + 112, 0.8], ['click', 1440 + 168], ['process', 1440 + 178, 0.9], ['process', 1440 + 228, 0.7], ['chime', 1440 + 296, 0.7],
  ['whoosh', 1830 + 4], ['whoosh', 1830 + 70, 0.6], ['whoosh', 1830 + 136, 0.6], ['whoosh', 1830 + 202, 0.6], ['whoosh', 1830 + 268, 0.6],
  ['click', 2160 + 112], ['whoosh', 2160 + 210, 0.6],
  ['whoosh', 2550 + 40, 0.5], ['whoosh', 2550 + 110, 0.5],
  ['impact', 2730 + 120, 0.7], ['chime', 2730 + 128, 0.6],
]

/** Music sits under the narration: duck while a line plays. */
function musicVolume(f: number) {
  const talking = VO.some(([n, at]) => f >= at - 6 && f <= at + [0, 61, 164, 212, 185, 174, 104, 50, 155, 143, 170, 32, 139][n] + 8)
  return talking ? 0.55 : 0.9
}

export function Film() {
  return (
    <AbsoluteFill style={{ background: C.night, fontFamily: SANS }}>
      <Scene at={T.open}><Opening /></Scene>
      <Scene at={T.reveal}><Reveal /></Scene>
      <Scene at={T.login}><LoginToDashboard /></Scene>
      <Scene at={T.stacks}><Stacks /></Scene>
      <Scene at={T.resume}><ResumeJobs /></Scene>
      <Scene at={T.ai}><Assistant /></Scene>
      <Scene at={T.montage}><Montage /></Scene>
      <Scene at={T.admin}><Admin /></Scene>
      <Scene at={T.devices}><Devices /></Scene>
      <Scene at={T.hero}><Hero /></Scene>

      <Audio src={staticFile('audio/score.wav')} volume={(f) => musicVolume(f)} />
      {VO.map(([n, at]) => (
        <Sequence key={n} from={at}><Audio src={staticFile(`audio/vo/vo${String(n).padStart(2, '0')}.wav`)} volume={1} /></Sequence>
      ))}
      {SFX.map(([name, at, v = 0.7], i) => (
        <Sequence key={i} from={at}><Audio src={staticFile(`audio/${name}.wav`)} volume={v} /></Sequence>
      ))}
    </AbsoluteFill>
  )
}

/** Each scene fades in over the previous one during the overlap. */
function Scene({ at: [from, dur], children }: { at: readonly [number, number]; children: ReactNode }) {
  return (
    <Sequence from={from} durationInFrames={dur}>
      <FadeIn>{children}</FadeIn>
    </Sequence>
  )
}
function FadeIn({ children }: { children: ReactNode }) {
  const f = useCurrentFrame()
  return <AbsoluteFill style={{ opacity: fade(f, 0, 15, inout) }}>{children}</AbsoluteFill>
}

/* ================================================================== 01 opening */
function Opening() {
  const f = useCurrentFrame()
  const logo = fade(f, 16, 92, (t) => t)
  const move = fade(f, 64, 100, inout)
  const word = fade(f, 88, 120)
  const tag = fade(f, 118, 156)
  const push = interpolate(f, [0, 240], [1.08, 1], { extrapolateRight: 'clamp' })
  const slide = interpolate(move, [0, 1], [0, -250])
  const bloom = fade(f, 196, 240, inout)
  return (
    <AbsoluteFill>
      <Night glow={fade(f, 0, 60)} seed="open" />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${push})` }}>
        <div style={{ position: 'absolute', top: H / 2 - 150, left: W / 2 - 60 + slide * 1.0, filter: `drop-shadow(0 0 ${40 * logo}px rgba(124,92,255,0.6))` }}>
          <LogoMark size={120} p={logo} />
        </div>
        <div style={{ position: 'absolute', top: H / 2 - 132, left: W / 2 - 140, opacity: word, transform: `translateX(${(1 - word) * 40}px)`, filter: `blur(${(1 - word) * 8}px)` }}>
          <Wordmark size={84} light />
        </div>
        <div style={{ position: 'absolute', top: H / 2 + 40, width: '100%' }}>
          <Title p={tag} size={64} color="rgba(255,255,255,0.86)" serif>
            Placement season, <span style={{ fontFamily: SERIF_I, background: 'linear-gradient(100deg,#a993ff,#7cc4ff 60%,#8ef5d9)', WebkitBackgroundClip: 'text', color: 'transparent' }}>decoded.</span>
          </Title>
        </div>
      </AbsoluteFill>
      {/* light bloom into the product's own daylight */}
      <AbsoluteFill style={{ opacity: bloom }}><Aurora /></AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${bloom}) ${bloom * 70}%, transparent ${bloom * 120}%)`, opacity: interpolate(f, [196, 222, 240], [0, 0.9, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }} />
    </AbsoluteFill>
  )
}

/* ================================================================== 02 website reveal */
const LANDING_TILES: [string, number][] = [['landing-hero', 0], ['landing-1', 900], ['landing-2', 1800], ['landing-3', 2700], ['landing-4', 2836]]

function LandingPage({ scroll }: { scroll: number }) {
  return (
    <div style={{ position: 'absolute', left: 0, top: -scroll, width: SW, height: 3736 }}>
      {LANDING_TILES.map(([n, top]) => <Img key={n} src={shot(n)} style={{ position: 'absolute', left: 0, top, width: SW, height: SH }} />)}
    </div>
  )
}

function Reveal() {
  const f = useCurrentFrame()
  const rx = track(f, [[0, 20], [120, 5], [160, 0]], ease)
  const ry = track(f, [[0, -26], [120, -7], [160, 0]], ease)
  const scale = track(f, [[0, 0.5], [120, 0.82], [160, 0.94], [300, 1.0]], ease)
  const tz = track(f, [[0, -500], [120, 0]], ease)
  const scroll = track(f, [[150, 0], [180, 900], [200, 900], [222, 1800], [245, 2836]])
  const cam = { z: track(f, [[245, 1], [272, 1.18]]), x: track(f, [[245, 800], [272, 898]]), y: track(f, [[245, 450], [272, 519]]) }
  return (
    <AbsoluteFill>
      <Aurora />
      <Browser src={shot('landing-hero')} rx={rx} ry={ry} scale={scale} tz={tz} cam={cam}>
        <div style={{ position: 'absolute', inset: 0, background: '#f6f5fb' }} />
        <LandingPage scroll={scroll} />
        <Cursor
          path={[[100, 1150, 700], [140, 940, 540], [175, 980, 600], [245, 930, 640], [272, 898, 663]]}
          clicks={[278]}
          show={fade(f, 96, 120)}
        />
      </Browser>
      <Sweep p={interpolate(f, [40, 130], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} opacity={0.35} />
    </AbsoluteFill>
  )
}

/* ================================================================== 03 sign in to dashboard */
function LoginToDashboard() {
  const f = useCurrentFrame()
  const isDash = f >= 92
  const swap = fade(f, 86, 104, inout)
  const cam = isDash
    ? { z: track(f, [[100, 1.02], [150, 1.0], [200, 1.55], [300, 1.55], [345, 1.15]]), x: track(f, [[150, 800], [200, 560], [300, 600], [345, 820]]), y: track(f, [[150, 450], [200, 300], [300, 300], [345, 420]]) }
    : { z: track(f, [[0, 1.0], [70, 1.22]]), x: track(f, [[0, 800], [70, 944]]), y: track(f, [[0, 450], [70, 520]]) }
  return (
    <AbsoluteFill>
      <Aurora />
      <Browser src={shot(isDash ? 'dash' : 'login-filled')} cam={cam} scale={1.0} url={isDash ? 'placementiq-os.vercel.app/dashboard' : 'placementiq-os.vercel.app/login'}>
        {!isDash && <Cursor path={[[0, 1150, 760], [60, 1088, 540], [75, 1083, 536]]} clicks={[75]} />}
        {isDash && <Focus x={355} y={205} w={152} h={152} r={80} p={fade(f, 205, 230) * (1 - fade(f, 300, 320))} />}
        {/* page transition: the dashboard rises in like the app's own route change */}
        {!isDash && <div style={{ position: 'absolute', inset: 0, background: '#f6f5fb', opacity: swap }} />}
      </Browser>
      {isDash && (
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 70 }}>
          <Eyebrow p={fade(f, 210, 235) * (1 - fade(f, 330, 350))} color={C.indigo}>Readiness, computed live</Eyebrow>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  )
}

/* ================================================================== 04 eligibility stacks */
function Stacks() {
  const f = useCurrentFrame()
  const panel = f >= 122
  const count = Math.round(interpolate(f, [20, 75], [0, 66], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease }))
  const cam = { z: track(f, [[0, 1.12], [80, 1.0], [150, 1.0], [200, 1.45], [270, 1.45]]), x: track(f, [[0, 714], [80, 800], [150, 800], [200, 1048]]), y: track(f, [[0, 402], [80, 450], [150, 450], [200, 470]]) }
  return (
    <AbsoluteFill>
      <Aurora />
      <Browser src={shot('eligibility')} srcB={shot('company-panel')} mix={panel ? fade(f, 122, 140) : 0} cam={cam} url="placementiq-os.vercel.app/eligibility">
        <Cursor path={[[30, 1200, 720], [90, 760, 420], [112, 699, 395], [190, 1240, 520]]} clicks={[120]} />
        <Focus x={1300} y={420} w={260} h={180} p={fade(f, 205, 225)} />
      </Browser>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 64 }}>
        <div style={{ opacity: fade(f, 14, 34) * (1 - fade(f, 100, 120)), display: 'flex', alignItems: 'baseline', gap: 18, padding: '16px 30px', borderRadius: 22, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(44,32,117,0.18)' }}>
          <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 64, letterSpacing: '-0.04em', color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
          <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 26, color: '#45405e' }}>companies, scored against one profile</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/* ================================================================== 05 resume + campus jobs */
function ResumeJobs() {
  const f = useCurrentFrame()
  const jobs = f >= 150
  const t = fade(f, 140, 164, inout)
  const cam = jobs
    ? { z: track(f, [[150, 1.0], [205, 1.5], [315, 1.5]]), x: track(f, [[150, 800], [205, 960]]), y: track(f, [[150, 450], [205, 400]]) }
    : { z: track(f, [[0, 1.0], [60, 1.35], [140, 1.35]]), x: track(f, [[0, 800], [60, 900]]), y: track(f, [[0, 450], [60, 380]]) }
  return (
    <AbsoluteFill>
      <Aurora />
      <AbsoluteFill style={{ transform: `translateX(${jobs ? (1 - t) * 260 : -t * 260}px)`, opacity: jobs ? t : 1 - t * 0.9 }}>
        <Browser src={shot(jobs ? 'jobs' : 'resume')} cam={cam} url={`placementiq-os.vercel.app/${jobs ? 'jobs' : 'resume'}`}>
          {!jobs && <Focus x={437} y={340} w={128} h={128} r={64} p={fade(f, 60, 85)} />}
          {!jobs && <Focus x={1318} y={203} w={90} h={60} r={12} p={fade(f, 80, 100)} />}
          {jobs && <Focus x={748} y={330} w={130} h={130} r={65} p={fade(f, 205, 225) * (1 - fade(f, 250, 262))} />}
          {jobs && <Cursor path={[[160, 1250, 720], [240, 935, 445], [258, 923, 437]]} clicks={[268]} />}
        </Browser>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 64 }}>
        <Eyebrow p={fade(f, 70, 90) * (1 - fade(f, 130, 145))} color={C.indigo}>Six ATS checks per resume</Eyebrow>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 64 }}>
        <Eyebrow p={fade(f, 215, 235)} color={C.indigo}>Every drive matched before you apply</Eyebrow>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/* ================================================================== 06 ai assistant + processing */
const CHIPS = ['CGPA 8.6', 'Resume 79 / 100', 'LeetCode 412 solved', 'DSA 84%', 'System Design 62%', 'Cloud & DevOps 51%', '66 companies', 'GitHub 22 repos']

function Assistant() {
  const f = useCurrentFrame()
  const stage = f < 60 ? 'dash' : f < 112 ? 'assistant-open' : f < 172 ? 'assistant-typed' : 'assistant-answer'
  const processing = f >= 172 && f < 296
  const pIn = fade(f, 172, 196, inout)
  const pOut = fade(f, 270, 296, inout)
  const abstract = processing ? pIn * (1 - pOut) : 0
  const cam =
    f < 172
      ? { z: track(f, [[0, 1.0], [112, 1.0], [150, 1.5]]), x: track(f, [[0, 800], [112, 800], [150, 1067]]), y: track(f, [[0, 450], [112, 450], [150, 600]]) }
      : { z: track(f, [[280, 1.5], [330, 1.55], [405, 1.55]]), x: track(f, [[280, 1067], [330, 1084]]), y: track(f, [[280, 600], [330, 330]]) }
  return (
    <AbsoluteFill>
      <Aurora />
      <AbsoluteFill style={{ transform: `scale(${1 - 0.08 * abstract})`, filter: `blur(${abstract * 14}px)`, opacity: 1 - abstract }}>
        <Browser src={shot(stage)} cam={cam} url="placementiq-os.vercel.app/dashboard">
          <Cursor path={[[0, 600, 700], [40, 140, 836], [52, 125, 843], [80, 1150, 820], [108, 1352, 854], [160, 1352, 854], [168, 1552, 854]]} clicks={[52, 168]} show={f < 300 ? 1 : 0} />
          {stage === 'assistant-answer' && <Focus x={1182} y={250} w={340} h={125} p={fade(f, 300, 322)} />}
        </Browser>
      </AbsoluteFill>
      {processing && <Processing p={abstract} f={f - 172} />}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 64 }}>
        <Eyebrow p={fade(f, 318, 336)} color={C.indigo}>Grounded in your profile</Eyebrow>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/** Abstract data layer: the student's real signals stream into a single line of reasoning. */
function Processing({ p, f }: { p: number; f: number }) {
  const cx = W / 2
  const cy = H / 2
  return (
    <AbsoluteFill style={{ opacity: p }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 600px at 50% 50%, rgba(28,21,80,0.92), rgba(11,9,32,0.96))` }} />
      <Particles count={60} seed="proc" color="170,150,255" />
      {CHIPS.map((label, i) => {
        const a = (i / CHIPS.length) * Math.PI * 2 + 0.4
        const r0 = 430
        const k = interpolate(f, [10 + i * 4, 70 + i * 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: inout })
        const r = r0 * (1 - k * 0.78)
        const x = cx + Math.cos(a) * r * 1.35
        const y = cy + Math.sin(a) * r * 0.8
        return (
          <div key={label}>
            <svg style={{ position: 'absolute', inset: 0 }} width={W} height={H}>
              <line x1={x} y1={y} x2={cx} y2={cy} stroke="url(#beam)" strokeWidth={1.4} strokeOpacity={0.35 + 0.4 * k} />
              <defs>
                <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8ef5d9" /><stop offset="1" stopColor="#7c5cff" /></linearGradient>
              </defs>
            </svg>
            {Array.from({ length: 4 }, (_, j) => {
              const t = ((f * 0.022 + j / 4 + random(label + j)) % 1)
              return <div key={j} style={{ position: 'absolute', left: x + (cx - x) * t - 3, top: y + (cy - y) * t - 3, width: 6, height: 6, borderRadius: 3, background: '#bfefff', boxShadow: '0 0 12px #8ef5d9', opacity: 0.9 * (1 - k * 0.5) }} />
            })}
            <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${1 - k * 0.35})`, opacity: 1 - k * 0.85, padding: '12px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)', color: '#fff', fontFamily: SANS, fontWeight: 500, fontSize: 24, whiteSpace: 'nowrap' }}>
              {label}
            </div>
          </div>
        )
      })}
      <div style={{ position: 'absolute', left: cx - 90, top: cy - 90, width: 180, height: 180, borderRadius: 90, background: 'radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(142,245,217,0.5) 40%, rgba(124,92,255,0.15) 75%, transparent)', transform: `scale(${0.6 + 0.4 * Math.sin(f / 6) ** 2 + fade(f, 60, 100) * 0.3})`, filter: 'blur(2px)' }} />
      <div style={{ position: 'absolute', left: cx - 32, top: cy - 32 }}><LogoMark size={64} /></div>
    </AbsoluteFill>
  )
}

/* ================================================================== 07 feature montage */
const MONTAGE: [string, string, string][] = [
  ['skillgap', 'Skill Gap Analyzer', 'Your level against each company'],
  ['analytics', 'Analytics', 'Progress, over time'],
  ['roadmap', 'Learning Roadmap', 'A 12-week plan'],
  ['practice', 'Practice Arena', 'Targeted problem sets'],
  ['profile', 'Verified profile', 'GitHub, LeetCode, Codeforces, CodeChef'],
]

function Montage() {
  const f = useCurrentFrame()
  const each = 66
  return (
    <AbsoluteFill>
      <Aurora />
      {MONTAGE.map(([name, title, sub], i) => {
        const s = i * each
        const local = f - s
        if (local < -12 || local > each + 10) return null
        const enter = fade(local, -12, 14, ease)
        const exit = fade(local, each - 6, each + 10, inout)
        const dir = i % 2 ? -1 : 1
        const transforms = [
          `translateX(${(1 - enter) * 900 * dir - exit * 900 * dir}px) rotateY(${(1 - enter) * -24 * dir + exit * 24 * dir}deg)`,
          `translateY(${(1 - enter) * 700 - exit * 700}px) rotateX(${(1 - enter) * 18 - exit * 18}deg)`,
          `scale(${0.7 + 0.3 * enter + exit * 0.5})`,
        ]
        return (
          <AbsoluteFill key={name} style={{ perspective: 2400, opacity: enter * (1 - exit) }}>
            <AbsoluteFill style={{ transform: transforms[i % 3], transformStyle: 'preserve-3d' }}>
              <Browser src={shot(name)} scale={0.8} cam={{ z: track(local, [[0, 1.0], [each, 1.08]]), x: 820, y: 420 }} url={`placementiq-os.vercel.app/${name === 'skillgap' ? 'skill-gap' : name}`} />
            </AbsoluteFill>
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 40 }}>
              <div style={{ textAlign: 'center', opacity: fade(local, 4, 20) * (1 - fade(local, each - 16, each - 6)), transform: `translateY(${(1 - fade(local, 4, 20)) * 14}px)` }}>
                <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 32, letterSpacing: '-0.03em', color: C.ink }}>{title}</div>
                <div style={{ fontFamily: SANS, fontSize: 20, color: '#6b6784', marginTop: 4 }}>{sub}</div>
              </div>
            </AbsoluteFill>
          </AbsoluteFill>
        )
      })}
    </AbsoluteFill>
  )
}

/* ================================================================== 08 placement cell + platform */
function Admin() {
  const f = useCurrentFrame()
  const stage = f < 120 ? 'admin-students' : f < 215 ? 'admin-drawer' : 'super-orgs-table'
  const t2 = fade(f, 205, 230, inout)
  const isSuper = stage === 'super-orgs-table'
  const cam = isSuper
    ? { z: track(f, [[215, 1.0], [280, 1.42], [405, 1.42]]), x: track(f, [[215, 800], [280, 960], [340, 960], [380, 1037]]), y: track(f, [[215, 450], [280, 583]]) }
    : stage === 'admin-drawer'
      ? { z: track(f, [[120, 1.0], [160, 1.35]]), x: track(f, [[120, 800], [160, 1007]]), y: track(f, [[120, 450], [160, 560]]) }
      : { z: track(f, [[0, 1.12], [60, 1.0]]), x: 800, y: 450 }
  return (
    <AbsoluteFill>
      <Aurora />
      <AbsoluteFill style={{ transform: isSuper ? `translateY(${(1 - t2) * 120}px) scale(${0.96 + 0.04 * t2})` : undefined, opacity: isSuper ? t2 : 1 }}>
        <Browser src={shot(stage)} cam={cam} url={isSuper ? 'placementiq-os.vercel.app/super/orgs' : 'placementiq-os.vercel.app/admin/students'}>
          {stage === 'admin-students' && (
            <>
              <Focus x={1100} y={318} w={375} h={545} r={12} p={fade(f, 40, 60) * (1 - fade(f, 90, 104))} />
              <Cursor path={[[0, 1200, 760], [70, 900, 420], [104, 480, 397]]} clicks={[112]} />
            </>
          )}
          {stage === 'admin-drawer' && <Focus x={1050} y={505} w={515} h={210} p={fade(f, 160, 180)} />}
          {isSuper && <Focus x={815} y={565} w={230} h={270} p={fade(f, 285, 305) * (1 - fade(f, 345, 360))} />}
          {isSuper && <Focus x={1212} y={565} w={130} h={270} p={fade(f, 370, 385)} />}
        </Browser>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 34 }}>
        <Eyebrow p={fade(f, 10, 30) * (1 - fade(f, 195, 212))} color={C.indigo}>Placement cell</Eyebrow>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 34 }}>
        <Eyebrow p={fade(f, 232, 252)} color={C.indigo}>Platform admin</Eyebrow>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/* ================================================================== 09 responsive */
function Devices() {
  const f = useCurrentFrame()
  // one frame morphs: desktop window -> tablet -> phone
  const k1 = fade(f, 30, 75, inout)
  const k2 = fade(f, 100, 145, inout)
  const w = interpolate(k1, [0, 1], [1440, 640]) * (1 - k2) + 330 * k2
  const h = interpolate(k1, [0, 1], [810, 853]) * (1 - k2) + 714 * k2
  const radius = interpolate(k1, [0, 1], [18, 36]) * (1 - k2) + 54 * k2
  const ry = Math.sin(f / 40) * 6
  const img = (n: string, o: number) => <Img src={shot(n)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', opacity: o }} />
  return (
    <AbsoluteFill>
      <Aurora />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', perspective: 2000 }}>
        <div style={{ width: w, height: h, borderRadius: radius, overflow: 'hidden', position: 'relative', background: '#f6f5fb', transform: `rotateY(${ry}deg)`, boxShadow: '0 70px 140px rgba(44,32,117,0.3), 0 0 0 10px #14112a, 0 0 0 11px rgba(255,255,255,0.4)' }}>
          {img('dash', 1)}
          {img('tablet-dash', k1 * (1 - k2))}
          {img('phone-dash', k2)}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 30 }}>
        <Eyebrow p={fade(f, 50, 70)} color={C.indigo}>{f < 100 ? 'Tablet' : 'Phone'}</Eyebrow>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

/* ================================================================== 10 hero */
function Hero() {
  const f = useCurrentFrame()
  const pull = track(f, [[0, 1.0], [110, 0.62]], ease)
  const tilt = track(f, [[0, 0], [110, 10]], ease)
  const ui = 1 - fade(f, 96, 130, inout)
  const logo = fade(f, 112, 168, (t) => t)
  const word = fade(f, 150, 182)
  const line = fade(f, 176, 214)
  return (
    <AbsoluteFill>
      <Aurora />
      <AbsoluteFill style={{ opacity: ui, filter: `blur(${(1 - ui) * 12}px)` }}>
        <Browser src={shot('dash')} scale={pull} rx={tilt} tz={-tilt * 10} url="placementiq-os.vercel.app/dashboard" />
      </AbsoluteFill>
      <Sweep p={interpolate(f, [120, 200], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} opacity={0.55} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: -60 }}>
          <div style={{ filter: `drop-shadow(0 18px 40px rgba(44,32,117,${0.35 * logo}))` }}><LogoMark size={112} p={logo} /></div>
          <div style={{ opacity: word, transform: `translateX(${(1 - word) * 30}px)`, filter: `blur(${(1 - word) * 8}px)` }}><Wordmark size={96} /></div>
        </div>
        <div style={{ position: 'absolute', top: H / 2 + 60, width: '100%' }}>
          <Title p={line} size={54} serif color="#45405e">
            Know exactly where you stand <span style={{ fontFamily: SERIF_I, color: C.brand }}>before</span> the drive opens.
          </Title>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

