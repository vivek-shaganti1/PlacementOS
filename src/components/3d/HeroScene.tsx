import { useFBO } from '@react-three/drei'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Color, PerspectiveCamera, Scene as ThreeScene, Vector2, Vector3, Vector4, type ShaderMaterial } from 'three'
import { useMotionTier } from '../../lib/motion'
import { Scene } from './Scene'
import { gradientFragment, gradientVertex, MAX_PANES, stageFragment, stageVertex } from './shaders/liquidStage'
import type { HeroParams } from './HeroTuning'

/**
 * The landing stage: a flowing gradient surface, liquid glass that really refracts it, and the mark in liquid metal, in one
 * Canvas and two passes (the surface into a small target, then one full-screen pass).
 *
 * The page stays HTML. Any element inside `[data-stage-root]` with `data-lq` becomes a pane of glass drawn under its text
 * (`data-lq="0.6"` sets how white it is, `data-lq-r` its corner radius), and `[data-lq-mark]` is where the mark goes; their
 * boxes are read each frame, so layout, scrolling and text size all belong to CSS. `.lq` in index.css is the fallback look.
 * Default export so it can be React.lazy-loaded; three.js stays out of the main bundle.
 */
const DEFAULTS: HeroParams = { strength: 1.1, speed: 1, tilt: -0.5, a: '#6d4aff', b: '#38bdf8', c: '#8ef5d9', d: '#ffc2a1' }
const Tuning = import.meta.env.DEV ? lazy(() => import('./HeroTuning')) : null
const PAPER = '#f7f8fd'

function Stage({ params, full, paused, onReady, onSlow }: { params: HeroParams; full: boolean; paused: boolean; onReady?: () => void; onSlow?: () => void }) {
  const { gl, size } = useThree()
  const quality = full ? 0.6 : 0.4
  const target = useFBO(Math.max(64, Math.round(size.width * quality)), Math.max(64, Math.round(size.height * quality)), { depthBuffer: true, samples: full ? 2 : 0 })
  const scene = useMemo(() => new ThreeScene(), [])
  const camera = useMemo(() => new PerspectiveCamera(42, 1, 0.1, 30), [])
  const ground = useRef<ShaderMaterial>(null)
  const pass = useRef<ShaderMaterial>(null)

  const groundUniforms = useMemo(() => ({ uTime: { value: 0 }, uStrength: { value: 1 }, uColorA: { value: new Color() }, uColorB: { value: new Color() }, uColorC: { value: new Color() }, uColorD: { value: new Color() } }), [])
  const passUniforms = useMemo(
    () => ({
      uMap: { value: target.texture }, uResolution: { value: new Vector2(1, 1) }, uTime: { value: 0 }, uScroll: { value: 0 }, uText: { value: 0 }, uPaper: { value: new Color() },
      uCount: { value: 0 }, uRect: { value: Array.from({ length: MAX_PANES }, () => new Vector4()) }, uStyle: { value: Array.from({ length: MAX_PANES }, () => new Vector2()) },
      uDrop: { value: new Vector3() }, uMark: { value: new Vector3() },
    }),
    [],
  )
  useEffect(() => {
    passUniforms.uMap.value = target.texture
  }, [target, passUniforms])
  useEffect(() => {
    // Shader colours are used as sRGB numbers, so no conversion to three's linear working space.
    const set = (c: Color, hex: string) => c.setStyle(hex, '')
    set(groundUniforms.uColorA.value, params.a)
    set(groundUniforms.uColorB.value, params.b)
    set(groundUniforms.uColorC.value, params.c)
    set(groundUniforms.uColorD.value, params.d)
    set(passUniforms.uPaper.value, PAPER)
    groundUniforms.uStrength.value = params.strength
  }, [params, groundUniforms, passUniforms])

  // The elements the stage draws for, found once and again when the page's structure changes.
  const els = useRef<{ panes: HTMLElement[]; mark: HTMLElement | null; demo: HTMLElement | null; text: HTMLElement | null }>({ panes: [], mark: null, demo: null, text: null })
  useEffect(() => {
    const root = gl.domElement.closest<HTMLElement>('[data-stage-root]')
    if (!root) return
    const find = () => {
      els.current = { panes: [...root.querySelectorAll<HTMLElement>('[data-lq]')], mark: root.querySelector<HTMLElement>('[data-lq-mark]'), demo: root.querySelector<HTMLElement>('[data-lq-demo]'), text: root.querySelector<HTMLElement>('[data-lq-text]') }
    }
    find()
    const mo = new MutationObserver(find)
    mo.observe(root, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [gl])

  // The browser can take the GPU away at any time (sleep, driver reset, too many tabs): the CSS panes come back.
  useEffect(() => {
    const el = gl.domElement
    const lost = () => onSlow?.()
    el.addEventListener('webglcontextlost', lost)
    return () => el.removeEventListener('webglcontextlost', lost)
  }, [gl, onSlow])

  // The pointer drop: eased towards the mouse, gone over controls and text panes so it never competes with them.
  const pointer = useRef({ x: 0, y: 0, on: false })
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const t = e.target as Element | null
      pointer.current = { x: e.clientX, y: e.clientY, on: !t?.closest?.('a, button, input, select, [data-lq]:not([data-lq-lens]), [data-lq-demo], nav') }
    }
    const out = () => (pointer.current.on = false)
    window.addEventListener('pointermove', move, { passive: true })
    document.documentElement.addEventListener('pointerleave', out)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', out)
    }
  }, [])

  const time = useRef(14)
  const ready = useRef(false)
  const pace = useRef({ frames: 0, time: 0, slow: 0 })
  useFrame(({ gl: r, scene: root, camera: cam }, delta) => {
    if (!paused) time.current += Math.min(delta, 0.05) * params.speed
    const box = r.domElement.getBoundingClientRect()
    if (box.width < 2 || box.height < 2) return
    const u = passUniforms
    u.uResolution.value.set(box.width, box.height)
    u.uTime.value = groundUniforms.uTime.value = time.current

    // Panes on screen only; y is flipped (GL counts from the bottom).
    let n = 0
    for (const el of els.current.panes) {
      if (n >= MAX_PANES) break
      const b = el.getBoundingClientRect()
      if (b.bottom < box.top - 40 || b.top > box.bottom + 40 || b.width < 2) continue
      u.uRect.value[n].set(b.left - box.left + b.width / 2, box.height - (b.top - box.top + b.height / 2), b.width / 2, b.height / 2)
      u.uStyle.value[n].set(Number(el.dataset.lqR ?? 28), Number(el.dataset.lq || 0.6))
      n++
    }
    u.uCount.value = n

    const m = els.current.mark?.getBoundingClientRect()
    if (m && m.bottom > box.top && m.top < box.bottom) u.uMark.value.set(m.left - box.left + m.width / 2, box.height - (m.top - box.top + m.height / 2), m.width)
    else u.uMark.value.z = 0

    const text = els.current.text?.getBoundingClientRect()
    u.uText.value = text ? box.height - (text.bottom - box.top) : 0

    const demo = els.current.demo?.getBoundingClientRect()
    u.uScroll.value = demo ? Math.max(0, Math.min(1, 1 - (demo.top - box.top) / (box.height * 0.85))) : 0

    const k = 1 - Math.exp(-delta * 7)
    const d = u.uDrop.value
    const p = pointer.current
    const tx = p.x - box.left
    const ty = box.height - (p.y - box.top)
    if (d.z < 2) d.set(tx, ty, d.z)
    d.x += (tx - d.x) * k
    d.y += (ty - d.y) * k
    d.z += ((p.on && !paused ? 44 : 0) - d.z) * k

    camera.aspect = box.width / box.height
    camera.position.set(0, -0.6, 5.6)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()

    r.setRenderTarget(target)
    r.clear()
    r.render(scene, camera)
    r.setRenderTarget(null)
    r.render(root, cam)
    if (!ready.current) {
      ready.current = true
      onReady?.()
    }
    // Three seconds in a row under 24 frames a second (a weak GPU, whatever its name): hand back to the still backdrop.
    // Browsers also slow a page down on purpose: to 30 in power saving, and to a trickle in a hidden tab or a covered
    // window. Neither is this scene's doing, so hidden time starts the count again and long gaps are left out.
    const q = pace.current
    if (document.visibilityState === 'hidden') q.frames = q.time = q.slow = 0
    else if (delta < 0.25) {
      q.frames++
      q.time += delta
    }
    if (q.time >= 1) {
      q.slow = q.frames / q.time < 24 ? q.slow + 1 : 0
      q.frames = q.time = 0
      if (q.slow >= 3) onSlow?.()
    }
  }, 1)

  const seg = full ? 150 : 90
  return (
    <>
      {createPortal(
        <mesh rotation={[params.tilt, 0, -0.42]}>
          <planeGeometry args={[22, 17, seg, seg]} />
          <shaderMaterial ref={ground} vertexShader={gradientVertex} fragmentShader={gradientFragment} uniforms={groundUniforms} toneMapped={false} />
        </mesh>,
        scene,
      )}
      <mesh frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial ref={pass} vertexShader={stageVertex} fragmentShader={stageFragment} uniforms={passUniforms} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

export default function HeroScene({ className, paused = false, onReady, onSlow }: { className?: string; paused?: boolean; onReady?: () => void; onSlow?: () => void }) {
  const tier = useMotionTier()
  const [p, setP] = useState<HeroParams>(DEFAULTS)
  const tune = Tuning && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tune')
  return (
    <>
      {tune && Tuning && <Suspense fallback={null}><Tuning onChange={setP} /></Suspense>}
      <Scene className={className} maxDpr={1.5} flat linear>
        <Stage params={p} full={tier === 'full'} paused={paused} onReady={onReady} onSlow={onSlow} />
      </Scene>
    </>
  )
}
