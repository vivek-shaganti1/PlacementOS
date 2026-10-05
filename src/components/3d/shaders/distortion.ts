import { simplex3 } from './noise'

/** Image displacement with RGB shift around the pointer. Uniforms: uTex, uTime, uMouse (0..1), uHover (0..1), uStrength. */
export const distortionVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

export const distortionFragment = /* glsl */ `
${simplex3}
uniform sampler2D uTex; uniform float uTime; uniform vec2 uMouse; uniform float uHover; uniform float uStrength;
varying vec2 vUv;
void main(){
  float d = distance(vUv, uMouse);
  float falloff = smoothstep(0.45, 0.0, d) * uHover;
  float n = snoise(vec3(vUv * 3.0, uTime * 0.4));
  vec2 offset = vec2(n) * 0.04 * uStrength * falloff;
  float r = texture2D(uTex, vUv + offset * 1.4).r;
  float g = texture2D(uTex, vUv + offset).g;
  float b = texture2D(uTex, vUv + offset * 0.6).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}`
