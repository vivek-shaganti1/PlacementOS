/** Drifting point field. Per-point seed in the `aSeed` attribute; uniforms: uTime, uPixelRatio, uSize, uColor, uMouse. */
export const particlesVertex = /* glsl */ `
uniform float uTime; uniform float uPixelRatio; uniform float uSize; uniform vec2 uMouse;
attribute float aSeed;
varying float vAlpha;
void main(){
  vec3 p = position;
  p.y += sin(uTime * 0.3 + aSeed * 6.2831) * 0.25;
  p.x += cos(uTime * 0.2 + aSeed * 12.0) * 0.18 + uMouse.x * 0.25 * (aSeed - 0.5);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed) * (1.0 / -mv.z);
  vAlpha = 0.35 + 0.65 * abs(sin(uTime * 0.6 + aSeed * 20.0));
}`

export const particlesFragment = /* glsl */ `
uniform vec3 uColor; varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor, a);
}`
