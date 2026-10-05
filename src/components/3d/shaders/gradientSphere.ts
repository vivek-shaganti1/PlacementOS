import { simplex3 } from './noise'

/** Noise-displaced sphere with a brand gradient and a fresnel rim. Uniforms: uTime, uAmp, uMouse, uColorA/B/C. */
export const gradientSphereVertex = /* glsl */ `
${simplex3}
uniform float uTime; uniform float uAmp; uniform vec2 uMouse;
varying float vNoise; varying vec3 vNormal; varying vec3 vView;
void main(){
  float n = snoise(normal * 1.4 + vec3(uTime * 0.18, uMouse * 0.6));
  vNoise = n;
  vec3 p = position + normal * n * uAmp;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`

export const gradientSphereFragment = /* glsl */ `
uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC;
varying float vNoise; varying vec3 vNormal; varying vec3 vView;
void main(){
  float t = smoothstep(-0.6, 0.6, vNoise);
  vec3 col = mix(uColorA, uColorB, t);
  float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.4);
  col = mix(col, uColorC, fres * 0.85);
  gl_FragColor = vec4(col, 1.0);
}`
