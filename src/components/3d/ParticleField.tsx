import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, type ShaderMaterial } from 'three'
import { intensity, useMotionTier } from '../../lib/motion'
import { particlesFragment, particlesVertex } from './shaders/particles'

/** Drifting points in a shallow volume. Count scales with the device tier (desktop full, low-power none). */
export function ParticleField({ count = 900, spread = [9, 5, 4], color = '#a993ff', size = 26 }: { count?: number; spread?: [number, number, number]; color?: string; size?: number }) {
  const tier = useMotionTier()
  const n = Math.round(count * intensity[tier].particles)
  const mat = useRef<ShaderMaterial>(null)
  const dpr = useThree((s) => s.viewport.dpr)

  // Built imperatively, so disposed explicitly below.
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    const pos = new Float32Array(n * 3)
    const seed = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * spread[0]
      pos[i * 3 + 1] = (Math.random() - 0.5) * spread[1]
      pos[i * 3 + 2] = (Math.random() - 0.5) * spread[2]
      seed[i] = Math.random()
    }
    g.setAttribute('position', new BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))
    return g
  }, [n, spread])
  useEffect(() => () => geometry.dispose(), [geometry])

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPixelRatio: { value: dpr }, uSize: { value: size }, uColor: { value: new Color(color) }, uMouse: { value: [0, 0] } }), [dpr, size, color])
  useFrame(({ clock, pointer }) => {
    if (!mat.current) return
    mat.current.uniforms.uTime.value = clock.elapsedTime
    mat.current.uniforms.uMouse.value = [pointer.x, pointer.y]
  })
  if (!n) return null
  return (
    <points geometry={geometry}>
      <shaderMaterial ref={mat} vertexShader={particlesVertex} fragmentShader={particlesFragment} uniforms={uniforms} transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  )
}
