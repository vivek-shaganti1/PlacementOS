import { lazy, Suspense } from 'react'
import { intensity, useMotionTier } from '../../lib/motion'

const DistortionCanvas = lazy(() => import('../3d/DistortionImage'))

/**
 * Image with a WebGL hover distortion (displacement + RGB shift). Loads three.js only when rendered,
 * and only on devices that get WebGL; everyone else sees the plain image, which is also the loading state.
 */
export function Distortion({ src, alt, className, strength = 0.35 }: { src: string; alt: string; className?: string; strength?: number }) {
  const tier = useMotionTier()
  const img = <img src={src} alt={alt} className="h-full w-full object-cover" loading="lazy" decoding="async" />
  if (!intensity[tier].webgl) return <div className={className}>{img}</div>
  return (
    <div className={`relative ${className ?? ''}`} role="img" aria-label={alt}>
      <Suspense fallback={img}>
        <DistortionCanvas src={src} strength={strength} />
      </Suspense>
    </div>
  )
}
