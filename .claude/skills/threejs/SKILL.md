---
name: threejs
description: three.js fundamentals and resource rules for PlacementIQ (version pinned, disposal, geometry and material choices, asset formats). Load when writing any three.js object, material, texture, loader or when debugging 3D memory or performance.
---

# three.js

## 1. Purpose
The rendering engine under every 3D scene. Most code should go through React Three Fiber (`react-three-fiber` skill); this skill covers the three.js rules underneath.

## 2. When to use
Custom geometries, materials, buffer attributes, loaders, render settings, disposal questions.

## 3. When NOT to use
Anything CSS can do (glows, gradients, grain). Decorative 3D on the signed-in app pages.

## 4. Preferred libraries
`three@0.170.0` (pinned: `postprocessing@6.36` supports three < 0.171; upgrade both together). Helpers from `@react-three/drei`. Do not add OGL or Vanta (Vanta pins an old three and is unmaintained).

## 5. Implementation patterns
- Prefer `ShaderMaterial` with small uniforms over heavy PBR for brand visuals.
- Build `BufferGeometry` once in `useMemo`, update attributes in place, set `needsUpdate` only when data changes.
- Reuse geometries and materials across instances; use `InstancedMesh` past ~50 identical meshes.
- Models: glTF binary (`.glb`) compressed with Draco or Meshopt, textures as KTX2 or WebP, under ~1.5 MB per scene.

## 6. Performance rules
- Dispose everything created imperatively: `geometry.dispose()`, `material.dispose()`, `texture.dispose()` in effect cleanup (see `ParticleField`). JSX-declared objects are disposed by R3F.
- Cap pixel ratio (handled by `Scene`), avoid real-time shadows unless the scene is about them, keep draw calls under ~100.
- Stop rendering when off screen (`Scene` sets `frameloop="never"`).

## 7. Accessibility rules
3D is decorative here: `aria-hidden`, no essential information only in the canvas, static fallback when WebGL is off.

## 8. Reusable code
```ts
const geometry = useMemo(() => new BufferGeometry().setAttribute('position', new BufferAttribute(positions, 3)), [positions])
useEffect(() => () => geometry.dispose(), [geometry])
```

## 9. Anti-patterns
Creating materials inside `useFrame`; loading uncompressed 20 MB models; `new THREE.Color()` every frame; mixing three versions (check `npm ls three`).

## 10. Examples
`src/components/3d/ParticleField.tsx`, `src/components/3d/GradientSphere.tsx`.
