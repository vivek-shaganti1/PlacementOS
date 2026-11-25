import { simplex3 } from './noise'

/**
 * Shaders for the landing stage (HeroScene). Three ideas from open-source projects, rebuilt to share one WebGL context:
 * - the flowing gradient surface: noise-displaced plane and three-colour mix adapted from ShaderGradient (MIT, ruucm);
 * - the glass: edge / rim refraction falloff adapted from liquid-glass-js (MIT, Armagan Amcalar), but refracting the live
 *   gradient instead of a screenshot of the page;
 * - the liquid metal mark: written for this project (the look of Paper's Liquid Logo; no code from it).
 * Notices: THIRD_PARTY_NOTICES.md. Colours are sRGB throughout; nothing here is tone mapped.
 */

export const MAX_PANES = 10

export const gradientVertex = /* glsl */ `
${simplex3}
uniform float uTime;
uniform float uStrength;
varying vec3 vPos;
varying vec3 vNormal;
// One slow swell folded by a second one: silk, not mountains. Both drift, neither pulses.
float height(vec2 p){
  vec2 q = p + 0.9 * vec2(snoise(vec3(p * 0.16, uTime * 0.07)), snoise(vec3(p * 0.16 + 7.0, uTime * 0.07)));
  return snoise(vec3(q.x * 0.17, q.y * 0.31, uTime * 0.09)) + 0.16 * snoise(vec3(q * 0.55 + 4.0, uTime * 0.12));
}
void main(){
  float h = height(position.xy);
  float e = 0.06;
  float hx = height(position.xy + vec2(e, 0.0));
  float hy = height(position.xy + vec2(0.0, e));
  vNormal = normalize(vec3(-(hx - h) / e * uStrength, -(hy - h) / e * uStrength, 1.0));
  vec3 p = vec3(position.xy, h * uStrength);
  vPos = vec3(position.xy, h);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`

export const gradientFragment = /* glsl */ `
precision highp float;
uniform vec3 uColorA; uniform vec3 uColorB; uniform vec3 uColorC; uniform vec3 uColorD;
varying vec3 vPos;
varying vec3 vNormal;
void main(){
  vec3 n = normalize(vNormal);
  // ShaderGradient's mix: two colours across the surface, a third by height; a fourth warms the crests.
  vec3 col = mix(uColorA, uColorB, smoothstep(-2.6, 2.6, vPos.x * 0.55 - vPos.y * 0.9));
  col = mix(col, uColorC, smoothstep(0.05, 0.85, vPos.z));
  col = mix(col, uColorD, smoothstep(0.48, 1.05, vPos.z - vPos.x * 0.03) * 0.9);
  // Soft light from the upper left, a satin highlight, and a little depth in the valleys.
  vec3 l = normalize(vec3(-0.5, 0.62, 0.72));
  float diff = dot(n, l) * 0.5 + 0.5;
  float spec = pow(max(dot(reflect(-l, n), normalize(vec3(0.1, 0.0, 1.0))), 0.0), 18.0);
  col *= 0.72 + 0.40 * diff;
  col += spec * 0.34;
  // Fine pleats that follow the folds: what the glass visibly bends.
  float v = (vPos.z * 1.5 + vPos.x * 0.42 + vPos.y * 0.62) * 7.0;
  float pleat = 0.5 + 0.5 * cos(v * 6.2831853);
  col += (pow(pleat, 6.0) - 0.22) * 0.075 * smoothstep(0.55, 0.0, fwidth(v));
  gl_FragColor = vec4(col, 1.0);
}`

export const stageVertex = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

export const stageFragment = /* glsl */ `
precision highp float;
${simplex3}
uniform sampler2D uMap;
uniform vec2 uResolution;          // CSS pixels
uniform float uTime;
uniform float uScroll;             // 0 in the hero, 1 in the demo
uniform vec3 uPaper;
uniform float uFade;               // bottom of the stage (CSS pixels, y up)
uniform float uText;               // bottom of the hero text (CSS pixels, y up)
uniform int uCount;
uniform vec4 uRect[${MAX_PANES}];  // centre xy, half size xy (CSS pixels, y up)
uniform vec2 uStyle[${MAX_PANES}]; // corner radius, whiteness
uniform vec3 uDrop;                // pointer drop: centre xy, radius
uniform vec3 uMark;                // mark: centre xy, size (0 = none)
varying vec2 vUv;

vec3 field(vec2 px){ return texture2D(uMap, clamp(px / uResolution, 0.001, 0.999)).rgb; }

float box(vec2 p, vec2 b, float r){
  r = min(r, min(b.x, b.y));
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }

// Signed distance to all the glass (xy = distance, whiteness). The pointer drop melts into a pane as it nears it.
vec2 glass(vec2 px){
  float d = 1e5; float white = 0.0;
  for (int i = 0; i < ${MAX_PANES}; i++) {
    if (i >= uCount) break;
    float di = box(px - uRect[i].xy, uRect[i].zw, uStyle[i].x);
    white = di < d ? uStyle[i].y : white;
    d = min(d, di);
  }
  if (uDrop.z > 1.0) {
    float dd = length(px - uDrop.xy) - uDrop.z;
    white = mix(0.02, white, smoothstep(0.0, 1.0, clamp(0.5 + 0.5 * (dd - d) / 60.0, 0.0, 1.0)));
    d = smin(d, dd, 46.0);
  }
  return vec2(d, white);
}

/* ---- the mark, in its own 64-unit space (same geometry as components/Logo.tsx) ---- */
float seg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)); }
float glyph(vec2 p){
  float stem = seg(p, vec2(21.75, 19.25), vec2(21.75, 44.75));
  vec2 q = p - vec2(33.0, 28.0);
  float arc = q.x > 0.0 ? abs(length(q) - 8.75) : 1e3;
  float bowl = min(min(seg(p, vec2(21.75, 19.25), vec2(33.0, 19.25)), arc), seg(p, vec2(33.0, 36.75), vec2(26.5, 36.75)));
  return smin(stem, bowl, 2.6) - 4.25;
}
float spark(vec2 p){
  vec2 q = abs(p - vec2(46.0, 44.5)) / 6.4;
  return (pow(q.x, 0.62) + pow(q.y, 0.62) - 1.0) * 2.6;
}
vec2 wobble(vec2 p){
  return p + 0.42 * vec2(snoise(vec3(p * 0.075, uTime * 0.22)), snoise(vec3(p * 0.075 + 9.0, uTime * 0.22)));
}
float bands(float v){
  v = fract(v);
  float a = smoothstep(0.00, 0.07, v) * (1.0 - smoothstep(0.26, 0.46, v));
  float b = smoothstep(0.52, 0.56, v) * (1.0 - smoothstep(0.66, 0.98, v));
  return clamp(a + 0.72 * b, 0.0, 1.0);
}
// Liquid metal: a rounded surface from the distance field, reflecting drifting bands and the real gradient behind it.
vec4 metal(vec2 p, float d, vec2 g, float thick, vec2 px, float tint){
  float aa = 64.0 / uMark.z;
  float cover = 1.0 - smoothstep(-aa, aa * 0.6, d);
  float t = clamp(-d / thick, 0.0, 1.0);
  float slope = pow(1.0 - t, 1.25);
  vec3 n = normalize(vec3(g * slope, 0.34 + 0.66 * t));
  vec3 r = reflect(vec3(0.0, 0.0, -1.0), n);
  float flow = snoise(vec3(p * 0.05, uTime * 0.14));
  float v = r.y * 0.52 + r.x * 0.24 + flow * 0.22 + (p.x - p.y) * 0.011 - uTime * 0.055;
  vec3 band = vec3(bands(v + 0.018), bands(v), bands(v - 0.022));
  vec3 env = field(px + r.xy * 150.0);
  vec3 col = mix(vec3(0.085, 0.07, 0.19), vec3(0.99, 0.985, 1.0), band);
  col = mix(col, env, 0.22 + 0.20 * (1.0 - band.g));
  col = mix(col, vec3(0.56, 0.96, 0.85), tint * 0.45);
  col += pow(1.0 - n.z, 3.0) * 0.16 + pow(max(dot(r, normalize(vec3(-0.5, 0.7, 0.6))), 0.0), 30.0) * 0.7;
  return vec4(col, cover);
}

void main(){
  vec2 px = vUv * uResolution;
  vec3 bg = field(px);

  // Reading side: the colour opens up to the right in the hero and lifts evenly behind the demo.
  float x = px.x / uResolution.x, y = px.y / uResolution.y;
  float clear = (1.0 - smoothstep(0.18, 0.66, x + (0.5 - y) * 0.10)) * 0.93;
  // Below the two-column width the words sit at the top and run the full width, so that is where it opens up.
  if (uResolution.x < 1024.0) clear = smoothstep(uText - 170.0, uText - 10.0, px.y) * 0.93;
  clear = max(clear, (1.0 - smoothstep(0.0, 0.34, y)) * 0.80);
  clear = mix(clear, 0.74, uScroll);
  vec3 col = mix(bg, uPaper, clear);

  vec2 gl = glass(px);
  float d = gl.x;
  // Contact shadow under the glass.
  float sh = glass(px + vec2(0.0, 16.0)).x;
  col *= 1.0 - 0.13 * (1.0 - smoothstep(-14.0, 34.0, sh)) * step(0.0, d);

  if (d < 1.5) {
    vec2 e = vec2(1.0, 0.0);
    vec2 nrm = vec2(glass(px + e.xy).x - glass(px - e.xy).x, glass(px + e.yx).x - glass(px - e.yx).x);
    nrm = normalize(nrm + 1e-5);
    float inside = max(-d, 0.0);
    // liquid-glass-js falloff: a broad bend, a tight edge and a hard rim.
    float bend = exp(-inside * 0.020) * 26.0 + exp(-inside * 0.085) * 46.0 + exp(-inside * 0.34) * 34.0;
    vec2 off = -nrm * bend;
    vec3 lens = vec3(field(px + off * 1.08).r, field(px + off).g, field(px + off * 0.92).b);
    float lensClear = mix(clear, 0.0, 0.55) * (1.0 - exp(-inside * 0.05) * 0.35);
    lens = mix(lens, uPaper, lensClear);
    lens = mix(lens, vec3(1.0), gl.y);
    // Light caught by the rim, brighter towards the upper left, and a fine dark line opposite it.
    float facing = dot(nrm, normalize(vec2(-0.55, 0.83)));
    float rim = exp(-inside * 0.55);
    lens += rim * (0.28 + 0.62 * max(facing, 0.0));
    lens -= exp(-inside * 0.16) * 0.10 * max(-facing, 0.0);
    lens += exp(-abs(inside - 9.0) * 0.30) * 0.07 * max(facing, 0.0);
    col = mix(col, lens, 1.0 - smoothstep(-0.8, 0.8, d));
  }

  if (uMark.z > 1.0) {
    vec2 p = vec2(px.x - uMark.x, uMark.y - px.y) / uMark.z * 64.0 + 32.0;
    if (p.x > 4.0 && p.x < 62.0 && p.y > 4.0 && p.y < 64.0) {
      vec2 w = wobble(p);
      vec2 sp = w - vec2(0.8, 2.2);
      float s = min(glyph(sp), length(sp - vec2(46.0, 44.5)) - 1.6);
      col *= 1.0 - 0.20 * (1.0 - smoothstep(-2.0, 4.5, s));
      vec2 h = vec2(0.35, 0.0);
      float g = glyph(w);
      if (g < 1.0) {
        vec2 gr = vec2(glyph(w + h.xy) - glyph(w - h.xy), glyph(w + h.yx) - glyph(w - h.yx)) / 0.7;
        vec4 m = metal(p, g, vec2(gr.x, -gr.y), 4.25, px, 0.0);
        col = mix(col, m.rgb, m.a);
      }
      float k = spark(w);
      if (k < 1.0 && length(w - vec2(46.0, 44.5)) < 7.0) {
        vec2 gr = normalize(vec2(spark(w + h.xy) - spark(w - h.xy), spark(w + h.yx) - spark(w - h.yx)) + 1e-5);
        vec4 m = metal(p, k, vec2(gr.x, -gr.y), 1.8, px, 1.0);
        col = mix(col, m.rgb, m.a);
      }
    }
  }

  // Grain hides banding on wide smooth gradients.
  float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  float alpha = smoothstep(0.0, 260.0, px.y - uFade);
  gl_FragColor = vec4((col + grain * 0.018) * alpha, alpha);
}`
