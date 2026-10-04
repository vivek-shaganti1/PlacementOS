import { loadFont as loadGeist } from '@remotion/google-fonts/Geist'
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif'
import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame } from 'remotion'

export const { fontFamily: SANS } = loadGeist('normal', { weights: ['400', '500', '600', '700'] })
export const { fontFamily: SERIF } = loadSerif('normal')
export const { fontFamily: SERIF_I } = loadSerif('italic')

export const FPS = 30
export const W = 1920
export const H = 1080
/** Captured screens are 1600x900 CSS px (rendered at 2x). */
export const SW = 1600
export const SH = 900

export const C = {
  ink: '#14112a',
  night: '#0b0920',
  indigo: '#2c2075',
  brand: '#6d4aff',
  mint: '#8ef5d9',
  sky: '#5fb4ff',
}

export const ease = Easing.bezier(0.16, 1, 0.3, 1) // expo out, the app's own curve
export const inout = Easing.bezier(0.65, 0, 0.35, 1)

/** Interpolates through keyframes [frame, value] with easing between each pair. */
export function track(frame: number, keys: [number, number][], e = inout) {
  if (frame <= keys[0][0]) return keys[0][1]
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i]
    const [f1, v1] = keys[i + 1]
    if (frame <= f1) return interpolate(frame, [f0, f1], [v0, v1], { easing: e, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  }
  return keys[keys.length - 1][1]
}

export const fade = (frame: number, a: number, b: number, e = ease) =>
  interpolate(frame, [a, b], [0, 1], { easing: e, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

export const shot = (name: string) => staticFile(`shots/${name}.png`)

/* ------------------------------------------------------------------ backgrounds */

/** The app's aurora: three soft blobs drifting slowly over a pale canvas. */
export function Aurora({ dim = 0 }: { dim?: number }) {
  const f = useCurrentFrame()
  const blob = (x: number, y: number, s: number, color: string, speed: number, phase: number): CSSProperties => ({
    position: 'absolute',
    left: x + Math.sin(f / speed + phase) * 60,
    top: y + Math.cos(f / (speed * 1.3) + phase) * 40,
    width: s,
    height: s,
    borderRadius: '50%',
    background: color,
    filter: 'blur(120px)',
    opacity: 0.6,
  })
  return (
    <AbsoluteFill style={{ background: '#f6f5fb', overflow: 'hidden' }}>
      <div style={blob(-260, -320, 980, 'oklch(0.78 0.13 290)', 90, 0)} />
      <div style={blob(1180, 80, 820, 'oklch(0.86 0.09 215)', 110, 2)} />
      <div style={blob(560, 640, 760, 'oklch(0.9 0.07 55)', 130, 4)} />
      {dim > 0 && <AbsoluteFill style={{ background: C.night, opacity: dim }} />}
    </AbsoluteFill>
  )
}

/** Night field with drifting micro-particles and a slow volumetric glow. */
export function Night({ glow = 1, seed = 'n' }: { glow?: number; seed?: string }) {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: `radial-gradient(1200px 800px at 50% 55%, #1c1550 0%, ${C.night} 60%, #05040f 100%)`, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', left: W / 2 - 500, top: H / 2 - 420, width: 1000, height: 840, borderRadius: '50%',
          background: 'radial-gradient(closest-side, rgba(124,92,255,0.45), rgba(95,180,255,0.12) 55%, transparent)',
          filter: 'blur(40px)', opacity: glow * (0.75 + 0.25 * Math.sin(f / 40)),
        }}
      />
      <Particles count={90} seed={seed} />
    </AbsoluteFill>
  )
}

export function Particles({ count, seed, color = '255,255,255' }: { count: number; seed: string; color?: string }) {
  const f = useCurrentFrame()
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const x = random(`${seed}x${i}`) * W
        const y0 = random(`${seed}y${i}`) * H
        const z = 0.3 + random(`${seed}z${i}`) * 0.7
        const y = (((y0 - f * 0.35 * z) % H) + H) % H
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(f / (25 + i) + i))
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: x + Math.sin(f / 60 + i) * 12 * z, top: y, width: 2.4 * z, height: 2.4 * z, borderRadius: '50%',
              background: `rgba(${color},${0.55 * z * tw})`, boxShadow: `0 0 ${8 * z}px rgba(${color},${0.5 * z * tw})`,
            }}
          />
        )
      })}
    </>
  )
}

/* ------------------------------------------------------------------ logo */

/** The PlacementIQ mark; `p` (0..1) draws it in: tile, stem, bowl, then the spark. */
export function LogoMark({ size = 96, p = 1 }: { size?: number; p?: number }) {
  const tile = interpolate(p, [0, 0.35], [0, 1], { extrapolateRight: 'clamp', easing: ease })
  const stem = interpolate(p, [0.2, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
  const bowl = interpolate(p, [0.4, 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
  const spark = interpolate(p, [0.7, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.2)) })
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ overflow: 'visible', transform: `scale(${0.7 + 0.3 * tile})`, opacity: tile }}>
      <defs>
        <linearGradient id="lbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2c2075" /><stop offset="1" stopColor="#0f0b2e" /></linearGradient>
        <radialGradient id="lglow" cx="0.22" cy="0.18" r="0.75"><stop offset="0" stopColor="#8a6bff" stopOpacity="0.95" /><stop offset="0.55" stopColor="#5b3df5" stopOpacity="0.25" /><stop offset="1" stopColor="#5b3df5" stopOpacity="0" /></radialGradient>
        <linearGradient id="lglyph" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#d9d0ff" /></linearGradient>
        <linearGradient id="lspark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8ef5d9" /><stop offset="1" stopColor="#5fb4ff" /></linearGradient>
        <linearGradient id="lsheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.28" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
        <clipPath id="lclip"><rect width="64" height="64" rx="18" /></clipPath>
      </defs>
      <g clipPath="url(#lclip)">
        <rect width="64" height="64" fill="url(#lbg)" />
        <rect width="64" height="64" fill="url(#lglow)" />
        <path d="M0 0H64V24C44 30 22 30 0 22Z" fill="url(#lsheen)" />
      </g>
      <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="17.25" fill="none" stroke="#fff" strokeOpacity="0.16" strokeWidth="1.5" />
      <rect x="17.5" y="15" width="8.5" height="34" rx="4.25" fill="url(#lglyph)" style={{ transformOrigin: '21.75px 49px', transform: `scaleY(${stem})` }} />
      <path d="M21.75 19.25H33a8.75 8.75 0 0 1 0 17.5h-6.5" fill="none" stroke="url(#lglyph)" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - bowl} opacity={bowl > 0 ? 1 : 0} />
      <path d="M46 38.5c.7 3.6 2.4 5.3 6 6-3.6.7-5.3 2.4-6 6-.7-3.6-2.4-5.3-6-6 3.6-.7 5.3-2.4 6-6Z" fill="url(#lspark)" style={{ transformOrigin: '46px 44.5px', transform: `scale(${spark}) rotate(${(1 - spark) * -90}deg)` }} />
    </svg>
  )
}

export function Wordmark({ size = 64, light = false, opacity = 1 }: { size?: number; light?: boolean; opacity?: number }) {
  return (
    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: size, letterSpacing: '-0.035em', color: light ? '#fff' : C.ink, opacity }}>
      Placement
      <span style={{ fontWeight: 700, background: 'linear-gradient(100deg, oklch(0.62 0.22 285), oklch(0.7 0.18 255) 55%, oklch(0.8 0.13 195))', WebkitBackgroundClip: 'text', color: 'transparent' }}>IQ</span>
    </span>
  )
}

/* ------------------------------------------------------------------ the screen */

export type Cam = { z: number; x: number; y: number } // zoom and the CSS-px point kept centred

/**
 * A browser window holding one captured screen. The camera zooms toward a point of the page;
 * the window itself can tilt in 3D. Children render in page coordinates (cursor, highlights).
 */
export function Browser({
  src, srcB, mix = 0, cam = { z: 1, x: SW / 2, y: SH / 2 }, url = 'placementiq-os.vercel.app', scale = 1,
  rx = 0, ry = 0, tz = 0, chrome = true, children, shadow = 1, radius = 18,
}: {
  src: string; srcB?: string; mix?: number; cam?: Cam; url?: string; scale?: number; rx?: number; ry?: number; tz?: number
  chrome?: boolean; children?: ReactNode; shadow?: number; radius?: number
}) {
  const bar = chrome ? 46 : 0
  const inner: CSSProperties = {
    position: 'absolute', inset: 0, transformOrigin: '50% 50%',
    transform: `scale(${cam.z}) translate(${SW / 2 - cam.x}px, ${SH / 2 - cam.y}px)`,
  }
  return (
    <AbsoluteFill style={{ perspective: 2600, alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          width: SW, height: SH + bar, borderRadius: radius, overflow: 'hidden', background: '#f6f5fb',
          transform: `translateZ(${tz}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`,
          boxShadow: `0 ${60 * shadow}px ${140 * shadow}px rgba(44,32,117,${0.28 * shadow}), 0 ${12 * shadow}px ${30 * shadow}px rgba(20,17,42,${0.12 * shadow}), inset 0 0 0 1px rgba(255,255,255,0.7)`,
          border: '1px solid rgba(120,110,170,0.18)',
        }}
      >
        {chrome && (
          <div style={{ height: bar, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: 'rgba(255,255,255,0.82)', borderBottom: '1px solid rgba(120,110,170,0.14)' }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c }} />)}
            <div style={{ marginLeft: 22, flex: 1, maxWidth: 560, height: 28, borderRadius: 9, background: 'rgba(20,17,42,0.05)', display: 'flex', alignItems: 'center', padding: '0 14px', fontFamily: SANS, fontSize: 14, color: '#6b6784' }}>
              <svg width="11" height="13" viewBox="0 0 11 13" style={{ marginRight: 9 }}>
                <rect x="1" y="5.5" width="9" height="7" rx="1.6" fill="#9a97ad" />
                <path d="M3 5.5V4a2.5 2.5 0 0 1 5 0v1.5" fill="none" stroke="#9a97ad" strokeWidth="1.5" />
              </svg>
              {url}
            </div>
          </div>
        )}
        <div style={{ position: 'relative', width: SW, height: SH, overflow: 'hidden' }}>
          <div style={inner}>
            <Img src={src} style={{ position: 'absolute', width: SW, height: SH }} />
            {srcB && <Img src={srcB} style={{ position: 'absolute', width: SW, height: SH, opacity: mix }} />}
            {children}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  )
}

/* ------------------------------------------------------------------ cursor */

export type Pt = [number, number, number] // frame, x, y (page px)

/** A human-paced cursor: eased glides between waypoints, with press feedback and a ripple at each click frame. */
export function Cursor({ path, clicks = [], show = 1 }: { path: Pt[]; clicks?: number[]; show?: number }) {
  const f = useCurrentFrame()
  const x = track(f, path.map(([t, x]) => [t, x]))
  const y = track(f, path.map(([t, , y]) => [t, y]))
  const press = clicks.reduce((a, c) => Math.max(a, f >= c - 3 && f <= c + 5 ? 1 - Math.abs(f - c) / 6 : 0), 0)
  return (
    <>
      {clicks.map((c) => {
        const t = (f - c) / 18
        if (t < 0 || t > 1) return null
        const at = track(c, path.map(([tt, xx]) => [tt, xx]))
        const bt = track(c, path.map(([tt, , yy]) => [tt, yy]))
        return (
          <div key={c} style={{ position: 'absolute', left: at - 34 * t - 6, top: bt - 34 * t - 6, width: 12 + 68 * t, height: 12 + 68 * t, borderRadius: '50%', border: `2px solid rgba(109,74,255,${0.6 * (1 - t)})`, background: `rgba(109,74,255,${0.12 * (1 - t)})` }} />
        )
      })}
      <svg width="26" height="30" viewBox="0 0 26 30" style={{ position: 'absolute', left: x - 3, top: y - 2, opacity: show, transform: `scale(${1 - 0.14 * press})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 4px 8px rgba(20,17,42,0.35))' }}>
        <path d="M3 2 L3 24 L9 18.5 L13 27.5 L17 25.8 L13 17 L21 17 Z" fill="#14112a" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    </>
  )
}

/** A soft glowing focus ring drawn over a UI element (page px), to guide the eye. */
export function Focus({ x, y, w, h, p, r = 16 }: { x: number; y: number; w: number; h: number; p: number; r?: number }) {
  if (p <= 0) return null
  return (
    <div style={{ position: 'absolute', left: x - 6, top: y - 6, width: w + 12, height: h + 12, borderRadius: r, border: `2px solid rgba(109,74,255,${0.85 * p})`, boxShadow: `0 0 ${40 * p}px rgba(109,74,255,${0.45 * p}), inset 0 0 ${24 * p}px rgba(142,245,217,${0.25 * p})` }} />
  )
}

/* ------------------------------------------------------------------ type */

export function Title({ children, p, size = 92, color = C.ink, serif = false, y = 0, blur = true, style }: { children: ReactNode; p: number; size?: number; color?: string; serif?: boolean; y?: number; blur?: boolean; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontFamily: serif ? SERIF : SANS, fontWeight: serif ? 400 : 600, fontSize: size, letterSpacing: serif ? '-0.01em' : '-0.04em', lineHeight: 1.02, color,
        opacity: p, transform: `translateY(${(1 - p) * 26 + y}px)`, filter: blur ? `blur(${(1 - p) * 10}px)` : undefined, textAlign: 'center', ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Small uppercase label used sparingly to name a section. */
export function Eyebrow({ children, p, color = '#6b6784' }: { children: ReactNode; p: number; color?: string }) {
  return (
    <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 17, letterSpacing: '0.3em', textTransform: 'uppercase', color, opacity: p, transform: `translateY(${(1 - p) * 12}px)`, padding: '11px 22px 11px 26px', borderRadius: 999, background: 'rgba(255,255,255,0.82)', boxShadow: '0 12px 40px rgba(44,32,117,0.18), inset 0 0 0 1px rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)' }}>
      {children}
    </div>
  )
}

/** A diagonal light sweep across the frame, used on reveals. */
export function Sweep({ p, opacity = 0.5 }: { p: number; opacity?: number }) {
  if (p <= 0 || p >= 1) return null
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -400, left: -900 + p * (W + 1800), width: 420, height: H + 800, transform: 'rotate(18deg)', background: `linear-gradient(90deg, transparent, rgba(255,255,255,${opacity}), transparent)`, filter: 'blur(18px)' }} />
    </AbsoluteFill>
  )
}
