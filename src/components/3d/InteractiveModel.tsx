import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'

/**
 * A GLB/GLTF model that turns toward the pointer. Ship Draco- or Meshopt-compressed .glb files under /public/models,
 * ideally under 1.5 MB. useGLTF caches by URL; call useGLTF.preload(url) where the route is known ahead of time.
 */
export function InteractiveModel({ url, scale = 1, follow = 0.35 }: { url: string; scale?: number; follow?: number }) {
  const { scene } = useGLTF(url, true)
  const group = useRef<Group>(null)
  useFrame(({ pointer }, delta) => {
    if (!group.current) return
    const k = Math.min(1, delta * 3)
    group.current.rotation.y += (pointer.x * follow - group.current.rotation.y) * k
    group.current.rotation.x += (-pointer.y * follow * 0.5 - group.current.rotation.x) * k
  })
  return (
    <group ref={group} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}
