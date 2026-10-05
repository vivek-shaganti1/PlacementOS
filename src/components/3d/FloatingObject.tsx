import { Float } from '@react-three/drei'
import type { ReactNode } from 'react'

/** Gentle bob and sway for any 3D child (drei Float). Keep intensity low; this is ambience, not a bounce. */
export function FloatingObject({ children, speed = 1.2, rotation = 0.25, float = 0.4 }: { children: ReactNode; speed?: number; rotation?: number; float?: number }) {
  return (
    <Float speed={speed} rotationIntensity={rotation} floatIntensity={float}>
      {children}
    </Float>
  )
}
