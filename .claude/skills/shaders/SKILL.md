---
name: shaders
description: Writing and organizing GLSL shaders for PlacementIQ (shared noise chunk, uniforms conventions, gradient distortion, particles, image displacement, RGB shift, mouse influence). Load before writing or editing any vertex or fragment shader.
---

# Shaders

## 1. Purpose
Small, modular GLSL for the brand's organic surfaces and distortion effects.

## 2. When to use
Noise-displaced surfaces, gradient flows, particle motion, image displacement, RGB shift, glows that react to the pointer.

## 3. When NOT to use
If CSS (`radial-gradient`, `filter`, `mix-blend-mode`), Motion or a Canvas 2D sketch can do it. Shaders are the last resort, not the first.

## 4. Preferred libraries
`ShaderMaterial` in R3F. Shader source lives in `src/components/3d/shaders/*.ts` as template strings tagged `/* glsl */`. Shared chunks: `noise.ts` (`simplex3`, 3D simplex noise).

## 5. Implementation patterns
- Uniform names: `uTime`, `uMouse` (normalized), `uResolution`, `uColorA/B/C`, `uStrength`, `uHover`. Varyings: `vUv`, `vNormal`, `vNoise`.
- Create the `uniforms` object once (`useMemo`) and mutate `.value` in `useFrame`.
- Ease pointer input on the CPU (`m += (target - m) * k`) instead of in GLSL.
- Include chunks by interpolation: `${simplex3}` at the top of the shader.
- Existing: `gradientSphere.ts` (displacement + fresnel), `particles.ts` (drift + twinkle), `distortion.ts` (displacement + RGB shift).

## 6. Performance rules
Prefer vertex work over fragment work; avoid loops over uniforms; one or two noise calls per fragment; `mediump` is enough for color; discard fully transparent particle fragments.

## 7. Accessibility rules
Keep motion slow (time multipliers 0.1 to 0.4); no strobing or high-contrast flicker; respect the reduced-motion gate upstream.

## 8. Reusable code
```glsl
${simplex3}
uniform float uTime; uniform vec2 uMouse;
varying vec2 vUv;
void main(){
  float n = snoise(vec3(vUv * 3.0, uTime * 0.2));
  gl_FragColor = vec4(mix(vec3(0.43,0.29,1.0), vec3(0.22,0.74,0.97), n * 0.5 + 0.5), 1.0);
}
```

## 9. Anti-patterns
Copy-pasting the noise function into every shader; per-frame string rebuilding of shader source (forces recompilation); `Date.now()` instead of the clock; huge `for` loops for blur.

## 10. Examples
`src/components/3d/shaders/gradientSphere.ts`, `particles.ts`, `distortion.ts`.
