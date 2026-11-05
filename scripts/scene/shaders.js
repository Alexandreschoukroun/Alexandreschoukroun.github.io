/**
 * shaders.js
 * Tout le mouvement des particules vit ici, sur le GPU. Le CPU ne pousse que
 * quelques uniformes par image : les deux formes entre lesquelles on se
 * trouve (uA, uB), l'avancee de la transition (uT), le temps, le pointeur.
 *
 * Chaque particule porte ses positions dans les sept formes. Elle passe de
 * l'une a l'autre avec un leger decalage propre (aRand.x), ce qui donne un
 * flux organique plutot qu'un fondu rigide, et traverse une turbulence au
 * milieu du trajet.
 *
 * Les constantes geometriques sont injectees depuis shapes.js : un seul
 * endroit fait foi pour la forme et pour son animation.
 */

import {
  PART, VIEW, BIRD, RADAR, HUB, DUST, viewMatrix, glslMat3,
} from './shapes.js';

const f = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
const vec3 = ([x, y, z]) => `vec3(${f(x)}, ${f(y)}, ${f(z)})`;

function constants() {
  const m = {};
  for (const name of ['voir', 'ecoute', 'turbine', 'city']) {
    const v = viewMatrix(VIEW[name]);
    m[name] = glslMat3(v);
  }
  return `
#define PI 3.141592653589793
#define TAU 6.283185307179586
const float SPHERE_SHELL = ${f(PART.sphereShell)};
const float BIRD_END = ${f(PART.bird)};
const float SPEC_GRID = ${f(PART.specGrid)};
const float NACELLE_START = ${f(PART.tower)};
const float BLADE_START = ${f(PART.hub)};
const float BLADE_END = ${f(PART.blades)};
const vec3 BIRD_BASE = ${vec3(BIRD.base)};
const float BIRD_YAW = ${f(BIRD.yaw)};
const float BIRD_SCALE = ${f(BIRD.scale)};
const vec3 RADAR_C = ${vec3(RADAR.center)};
const vec3 HUB = ${vec3(HUB)};
const float DUST_Y = ${f(DUST.y)};
const float DUST_ZF = ${f(DUST.zFar)};
const float DUST_ZN = ${f(DUST.zNear)};
const mat3 V_VOIR = ${m.voir};
const mat3 V_ECOUTE = ${m.ecoute};
const mat3 V_TURBINE = ${m.turbine};
const mat3 V_CITY = ${m.city};
`;
}

export const vertexShader = /* glsl */ `
precision highp float;
${constants()}

uniform float uTime;
uniform int uA;
uniform int uB;
uniform float uT;
uniform float uIntro;
uniform float uScroll;
uniform float uCalm;
uniform vec3 uBird;
uniform float uRotor;
uniform float uAlert;
uniform float uWave;
uniform float uStopped;
uniform vec3 uPointer;
uniform float uPointerK;
uniform float uSize[7];
uniform float uAlpha[7];
uniform float uPxScale;
uniform float uGroupScale;

attribute vec3 aP1;
attribute vec3 aP2;
attribute vec3 aP3;
attribute vec3 aP4;
attribute vec3 aP5;
attribute vec3 aP6;
attribute vec4 aRand;

varying float vHi;
varying float vAlpha;
varying float vAccent;

float gFade;

vec3 rotY(vec3 p, float a) {
  float c = cos(a); float s = sin(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}
vec3 rotZ(vec3 p, float a) {
  float c = cos(a); float s = sin(a);
  return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}
// Champ d'ecoulement bon marche : quelques sinus croises suffisent a donner
// une derive organique, sans le cout d'un vrai bruit 3D.
vec3 flow(vec3 p, float t) {
  return vec3(
    sin(p.y * 2.7 + t) + sin(p.z * 1.9 - t * 0.6),
    sin(p.z * 2.3 + t * 0.8) + sin(p.x * 1.7 + t * 0.4),
    sin(p.x * 2.9 - t * 0.7) + sin(p.y * 2.1 + t * 0.5)
  ) * 0.5;
}

vec3 rawPos(int k) {
  if (k == 0) return position;
  if (k == 1) return aP1;
  if (k == 2) return aP2;
  if (k == 3) return aP3;
  if (k == 4) return aP4;
  if (k == 5) return aP5;
  return aP6;
}

// xyz : position locale apres animation et vue ; w : surbrillance 0..1.
vec4 shapeAt(int k) {
  vec3 p = rawPos(k);
  float idx = aRand.w;
  float t = uTime;
  float hi = 0.0;

  if (k == 0) {
    // Capteur : la surface respire, tourne, et une ligne de scan la parcourt.
    float r = length(p);
    vec3 n = p / max(r, 1e-4);
    if (idx < SPHERE_SHELL) p += n * flow(n * 2.2, t * 0.4).x * 0.045 * uCalm;
    p = rotY(p, t * 0.11);
    float scan = sin(t * 0.55) * 1.05;
    hi = exp(-pow((p.y - scan) / 0.07, 2.0)) * step(idx, SPHERE_SHELL);
  } else if (k == 1) {
    vec3 q = p;
    if (idx < BIRD_END) {
      // Retour en coordonnees oiseau pour battre des ailes, puis on repose.
      vec3 b = rotY(q - BIRD_BASE, -BIRD_YAW);
      float side = abs(b.z) / BIRD_SCALE;
      float flap = sin(t * 6.5 - side * 2.0);
      b.y += flap * pow(side, 1.25) * 0.42 * BIRD_SCALE * smoothstep(0.05, 0.18, side);
      b.y += sin(t * 6.5 + 1.2) * 0.012;
      q = rotY(b, BIRD_YAW) + BIRD_BASE + uBird;
      hi = 0.1;
    } else {
      // Radar : un faisceau tourne, laisse une trainee, et allume l'echo
      // sous la position de l'oiseau quand il passe.
      vec2 rp = q.xz - RADAR_C.xz;
      float ang = atan(rp.y, rp.x);
      float sweep = mod(t * 1.25, TAU);
      float d = mod(sweep - ang + 2.0 * TAU, TAU);
      hi = exp(-d * 2.4) * 0.95;
      vec2 echo = (BIRD_BASE.xz + uBird.xz) - RADAR_C.xz;
      vec2 de = rp - echo;
      hi += exp(-dot(de, de) * 40.0) * (0.35 + 0.65 * exp(-d * 0.8));
    }
    p = V_VOIR * q;
  } else if (k == 2) {
    vec3 q = p;
    if (idx < SPEC_GRID) {
      // Spectrogramme qui defile : le temps en x, la frequence en z (les
      // aigus au fond). Chaque cri descend en frequence pendant sa duree,
      // la signature d'un sonar de chauve-souris.
      float v = -q.z;
      float ph = q.x + t * 0.22;
      float period = 0.62;
      float callT = mod(ph, period) / period / 0.34;
      float on = 1.0 - step(1.0, callT);
      float f = mix(0.55, -0.42, pow(clamp(callT, 0.0, 1.0), 0.55));
      float e = on * exp(-pow((v - f) / 0.045, 2.0)) * (1.0 - 0.45 * callT);
      e += on * 0.35 * exp(-pow((v - (f + 0.32)) / 0.035, 2.0));
      float ci = floor(ph / period);
      e *= 0.6 + 0.4 * fract(sin(ci * 12.9898) * 43758.5453);
      float noiseFloor = sin(q.x * 41.0 + t * 2.3) * sin(v * 37.0 - t * 1.7) * 0.012;
      q.y += e * 0.42 + noiseFloor;
      hi = clamp(e * 1.3, 0.0, 1.0);
    } else {
      hi = 0.05;
    }
    p = V_ECOUTE * q;
  } else if (k == 3) {
    vec3 q = p;
    if (idx >= BLADE_START && idx < BLADE_END) {
      q = rotZ(q - HUB, uRotor) + HUB;
    } else if (idx >= NACELLE_START && idx < BLADE_START) {
      // feu de nacelle : clignote quand la machine est a l'arret
      hi = uStopped * (0.55 + 0.45 * sin(t * 5.0));
    } else if (idx >= BLADE_END) {
      float r = length(q.xz);
      hi = uAlert * exp(-pow((r - uWave) / 0.07, 2.0));
    }
    p = V_TURBINE * q;
  } else if (k == 4) {
    // Poussiere : derive lente, et parallax de defilement. Les points
    // proches defilent plus vite que les lointains, et rebouclent hors champ.
    float depth = clamp((p.z - DUST_ZF) / (DUST_ZN - DUST_ZF), 0.0, 1.0);
    float sp = 0.18 + 0.5 * depth;
    p.y = mod(p.y + DUST_Y + uScroll * sp, 2.0 * DUST_Y) - DUST_Y;
    gFade = smoothstep(DUST_Y, DUST_Y * 0.8, abs(p.y));
    p += flow(p * 0.7 + aRand.xyz, t * 0.12) * 0.05 * uCalm;
    hi = step(0.992, fract(aRand.y * 31.0 + t * 0.07));
  } else if (k == 5) {
    vec3 q = p;
    q = rotY(q, t * 0.14);
    hi = smoothstep(0.82, 1.0, sin(q.y * 5.5 - t * 2.2)) * 0.9;
    p = V_CITY * q;
  } else {
    p += flow(p * 4.0 + aRand.xyz, t * 0.5) * 0.006 * uCalm;
    float sx = mod(t * 0.4, 3.4) - 1.7;
    hi = exp(-pow((p.x - sx) / 0.09, 2.0)) * 0.85;
  }
  return vec4(p, hi);
}

void main() {
  // Avancee propre a la particule : chacune part un peu plus tot ou plus tard.
  float st = clamp((uT - aRand.x * 0.4) / 0.6, 0.0, 1.0);
  st = st * st * (3.0 - 2.0 * st);

  gFade = 1.0;
  vec4 S = shapeAt(uA);
  float fade = gFade;
  if (uB != uA && st > 0.0) {
    gFade = 1.0;
    vec4 B = shapeAt(uB);
    S = mix(S, B, st);
    fade = mix(fade, gFade, st);
  }
  vec3 p = S.xyz;

  // Turbulence au milieu du trajet seulement.
  float turb = sin(PI * st) * uCalm;
  p += flow(p * 1.6 + aRand.xyz * 5.0, uTime * 0.7) * turb * 0.32;

  // Ouverture : du bruit vers la forme.
  float ie = clamp((uIntro - aRand.x * 0.45) / 0.55, 0.0, 1.0);
  ie = 1.0 - pow(1.0 - ie, 3.0);
  vec3 chaos = (aRand.xyz - 0.5) * vec3(7.0, 4.5, 5.0) + flow(aRand.zyx * 6.0, uTime * 0.5) * 0.4;
  p = mix(chaos, p, ie);

  // Le pointeur ecarte les particules, comme une main devant un capteur.
  vec2 dp = p.xy - uPointer.xy;
  float push = uPointerK * exp(-dot(dp, dp) * 9.0);
  p.xy += normalize(dp + 1e-5) * push * 0.16;
  p.z += push * 0.12;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float size = mix(uSize[uA], uSize[uB], st);
  float alpha = mix(uAlpha[uA], uAlpha[uB], st);
  gl_PointSize = max(1.0, size * (0.5 + aRand.z) * uGroupScale * uPxScale / -mv.z);

  vHi = clamp(S.w + push * 0.8, 0.0, 1.0);
  vAccent = step(0.965, aRand.y);
  vAlpha = alpha * fade * mix(0.35, 1.0, ie);
}
`;

export const fragmentShader = /* glsl */ `
precision highp float;
uniform vec3 uBase;
uniform vec3 uAccent;
uniform float uGain;
varying float vHi;
varying float vAlpha;
varying float vAccent;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c) * 4.0;
  if (d > 1.0) discard;
  float a = 1.0 - d;
  a *= a;
  float h = clamp(max(vHi, vAccent), 0.0, 1.0);
  vec3 col = mix(uBase, uAccent, h);
  gl_FragColor = vec4(col, a * vAlpha * uGain * (0.6 + 0.8 * h));
}
`;
