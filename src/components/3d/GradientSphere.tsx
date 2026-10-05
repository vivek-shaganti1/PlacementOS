import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, type Mesh, type ShaderMaterial } from 'three'
import { gradientSphereFragment, gradientSphereVertex } from './shaders/gradientSphere'

/** The brand orb: a slowly breathing, noise-displaced sphere that leans toward the pointer. */
export function GradientSphere({ radius = 1.4, amp = 0.22, detail = 48, colors = ['#6d4aff', '#38bdf8', '#8ef5d9'] }: { radius?: number; amp?: number; detail?: number; colors?: [string, string, string] }) {
  const mesh = useRef<Mesh>(null)
  const mat = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uAmp: { value: amp }, uMouse: { value: [0, 0] }, uColorA: { value: new Color(colors[0]) }, uColorB: { value: new Color(colors[1]) }, uColorC: { value: new Color(colors[2]) } }),
    // Uniform objects are created once; colors and amp are read on mount (remount to change them).
    [],
  )
  useFrame(({ clock, pointer }, delta) => {
    if (!mat.current || !mesh.current) return
    mat.current.uniforms.uTime.value = clock.elapsedTime
    const m = mat.current.uniforms.uMouse.value as number[]
    m[0] += (pointer.x - m[0]) * Math.min(1, delta * 2)
    m[1] += (pointer.y - m[1]) * Math.min(1, delta * 2)
    mesh.current.rotation.y += delta * 0.08
    mesh.current.rotation.x = m[1] * 0.25
  })
  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[radius, detail]} />
      <shaderMaterial ref={mat} vertexShader={gradientSphereVertex} fragmentShader={gradientSphereFragment} uniforms={uniforms} />
    </mesh>
  )
}
