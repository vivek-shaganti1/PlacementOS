import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { lazy, Suspense, useState } from 'react'
import { useMotionTier } from '../../lib/motion'
import type { HeroParams } from './HeroTuning'
import { FloatingObject } from './FloatingObject'
import { GradientSphere } from './GradientSphere'
import { ParticleField } from './ParticleField'
import { Scene } from './Scene'

/**
 * Landing hero backdrop: the brand orb floating in a light particle field, with soft bloom on full-power desktops.
 * Default export so it can be React.lazy-loaded; three.js stays out of the main bundle.
 */
const Tuning = import.meta.env.DEV ? lazy(() => import('./HeroTuning')) : null

export default function HeroScene({ className }: { className?: string }) {
  const tier = useMotionTier()
  const [p, setP] = useState<HeroParams>({ amp: 0.2, particles: 700, bloom: 0.45 })
  const tune = Tuning && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tune')
  return (
    <>
    {tune && Tuning && <Suspense fallback={null}><Tuning onChange={setP} /></Suspense>}
    <Scene className={className} camera={{ position: [0, 0, 6], fov: 38 }}>
      <FloatingObject speed={1} rotation={0.2} float={0.35}>
        <group position={[1.6, 0.1, 0]}>
          <GradientSphere key={p.amp} radius={1.25} amp={p.amp} detail={tier === 'full' ? 64 : 32} />
        </group>
      </FloatingObject>
      <ParticleField count={p.particles} />
      {tier === 'full' && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={p.bloom} luminanceThreshold={0.55} luminanceSmoothing={0.3} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.25} />
        </EffectComposer>
      )}
    </Scene>
    </>
  )
}
