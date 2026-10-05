import { useTexture } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { ShaderMaterial } from 'three'
import { Scene } from './Scene'
import { distortionFragment, distortionVertex } from './shaders/distortion'

function Plane({ src, strength }: { src: string; strength: number }) {
  const tex = useTexture(src)
  const mat = useRef<ShaderMaterial>(null)
  const { viewport } = useThree()
  const uniforms = useMemo(() => ({ uTex: { value: tex }, uTime: { value: 0 }, uMouse: { value: [0.5, 0.5] }, uHover: { value: 0 }, uStrength: { value: strength } }), [tex, strength])
  useFrame(({ clock, pointer }, delta) => {
    const u = mat.current?.uniforms
    if (!u) return
    u.uTime.value = clock.elapsedTime
    u.uMouse.value = [(pointer.x + 1) / 2, (pointer.y + 1) / 2]
    const inside = Math.abs(pointer.x) < 1 && Math.abs(pointer.y) < 1 ? 1 : 0
    u.uHover.value += (inside - u.uHover.value) * Math.min(1, delta * 4)
  })
  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial ref={mat} vertexShader={distortionVertex} fragmentShader={distortionFragment} uniforms={uniforms} />
    </mesh>
  )
}

/** Lazy-loaded by effects/Distortion. Orthographic-feeling plane that fills its box. */
export default function DistortionImage({ src, strength }: { src: string; strength: number }) {
  return (
    <Scene className="absolute inset-0" interactive camera={{ position: [0, 0, 1], fov: 90 }}>
      <Plane src={src} strength={strength} />
    </Scene>
  )
}
