/**
 * shapes.js
 * Les nuages de points que les particules prennent tour a tour.
 *
 *   sphere   le capteur, du heros
 *   voir     un oiseau en vol au-dessus d'un radar qui balaie
 *   ecoute   un spectrogramme ou defilent des cris de chauve-souris
 *   turbine  l'eolienne pilotee, et le parc autour
 *   dust     un champ de poussiere, derriere les sections de lecture
 *   city     des blocs empiles : ce qu'on construit en freelance
 *   name     le prenom, ecrit en points, au contact
 *
 * Fonctions pures, sans WebGL ni DOM : le test les execute hors navigateur.
 *
 * Chaque forme est stockee en coordonnees LOCALES, avant sa rotation de vue.
 * Le shader anime ces coordonnees (battement d'ailes, rotor, hauteur du
 * spectre) puis applique la rotation de vue. Les points d'une meme forme sont
 * repartis par plages d'index (PART) : c'est ainsi que le shader sait qu'un
 * point appartient a une pale plutot qu'au mat.
 */

export const SHAPES = ['sphere', 'voir', 'ecoute', 'turbine', 'dust', 'city', 'name'];
export const SHAPE = Object.fromEntries(SHAPES.map((n, i) => [n, i]));

/** Bornes des plages d'index, en fraction de N. */
export const PART = {
  sphereShell: 0.62,   // [0, shell)       sphere en anneaux de latitude
  sphereOrbit: 0.80,   // [shell, orbit)   trois orbites inclinees
  sphereCore: 0.97,    // [orbit, core)    noyau dense, puis halo
  bird: 0.5,           // voir : [0, bird) oiseau, le reste radar
  specGrid: 0.93,      // ecoute : grille, puis cadre
  tower: 0.22,         // turbine : mat
  nacelle: 0.30,       //           nacelle
  hub: 0.34,           //           moyeu
  blades: 0.82,        //           pales [hub, blades), puis sol
};

/** Rotations de vue, appliquees apres l'animation. Radians. */
export const VIEW = {
  sphere: { x: 0, y: 0 },
  voir: { x: 0.42, y: 0 },
  ecoute: { x: 0.62, y: -0.32 },
  turbine: { x: 0.2, y: -0.55 },
  dust: { x: 0, y: 0 },
  city: { x: 0.45, y: 0.62 },
  name: { x: 0, y: 0 },
};

export const BIRD = { base: [-0.05, 0.38, 0.05], yaw: -0.5, scale: 0.62 };
export const RADAR = { center: [0, -0.5, 0], radius: 1.0 };
export const HUB = [0, 0.37, 0.15];
export const DUST = { x: 2.6, y: 1.15, zNear: 0.9, zFar: -1.6 };

/** Rendu par forme : taille de point (unites locales) et opacite. */
export const STYLE = {
  size: [0.0125, 0.0105, 0.0105, 0.0095, 0.0056, 0.0105, 0.0052],
  alpha: [0.55, 0.42, 0.6, 0.42, 0.28, 0.58, 0.62],
};

/** Comment une forme remplit son emplacement dans la page. */
export const FIT = ['box', 'box', 'box', 'box', 'height', 'box', 'box'];

/* ------------------------------------------------------------ outils */

/** Generateur pseudo-aleatoire deterministe : memes points a chaque visite. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Matrice de vue, en lignes : Rx(x) * Ry(y). */
export function viewMatrix({ x = 0, y = 0 }) {
  const cx = Math.cos(x), sx = Math.sin(x), cy = Math.cos(y), sy = Math.sin(y);
  // Ry = [[cy,0,sy],[0,1,0],[-sy,0,cy]] ; Rx = [[1,0,0],[0,cx,-sx],[0,sx,cx]]
  return [
    [cy, 0, sy],
    [sx * sy, cx, -sx * cy],
    [-cx * sy, sx, cx * cy],
  ];
}

export function applyMat(m, x, y, z, out = [0, 0, 0]) {
  out[0] = m[0][0] * x + m[0][1] * y + m[0][2] * z;
  out[1] = m[1][0] * x + m[1][1] * y + m[1][2] * z;
  out[2] = m[2][0] * x + m[2][1] * y + m[2][2] * z;
  return out;
}

export function transpose(m) {
  return [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];
}

/** Litteral GLSL : mat3 est rangee par COLONNES. */
export function glslMat3(m) {
  const f = (v) => (Math.abs(v) < 1e-9 ? '0.0' : v.toFixed(7));
  const cols = [0, 1, 2].map((j) => `${f(m[0][j])}, ${f(m[1][j])}, ${f(m[2][j])}`);
  return `mat3(${cols.join(', ')})`;
}

function randomDir(r) {
  const u = r() * 2 - 1;
  const a = r() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return [s * Math.cos(a), u, s * Math.sin(a)];
}

function put(out, i, x, y, z) {
  out[i * 3] = x; out[i * 3 + 1] = y; out[i * 3 + 2] = z;
}

const rotY = (x, z, a) => [Math.cos(a) * x + Math.sin(a) * z, -Math.sin(a) * x + Math.cos(a) * z];

/* ------------------------------------------------------------ sphere */

function sphere(N, r) {
  const out = new Float32Array(N * 3);
  const RINGS = 46;
  const orbits = [
    { radius: 1.28, tiltX: 1.15, tiltZ: 0.35 },
    { radius: 1.36, tiltX: -0.55, tiltZ: 0.9 },
    { radius: 1.44, tiltX: 0.25, tiltZ: -1.1 },
  ];
  for (let i = 0; i < N; i++) {
    const idx = i / N;
    if (idx < PART.sphereShell) {
      // Distribution uniforme sur la sphere, puis latitude arrondie a l'anneau
      // le plus proche : la surface se lit en lignes, comme un balayage.
      const lat = Math.asin(r() * 2 - 1);
      const q = Math.round((lat / (Math.PI / 2)) * (RINGS / 2)) / (RINGS / 2) * (Math.PI / 2);
      const lon = r() * Math.PI * 2;
      put(out, i, Math.cos(q) * Math.cos(lon), Math.sin(q), Math.cos(q) * Math.sin(lon));
    } else if (idx < PART.sphereOrbit) {
      const o = orbits[Math.floor(r() * 3)];
      const a = r() * Math.PI * 2;
      const j = (r() - 0.5) * 0.012;
      let x = Math.cos(a) * (o.radius + j);
      let y = 0;
      let z = Math.sin(a) * (o.radius + j);
      // inclinaison autour de X puis de Z
      const y1 = y * Math.cos(o.tiltX) - z * Math.sin(o.tiltX);
      const z1 = y * Math.sin(o.tiltX) + z * Math.cos(o.tiltX);
      const x2 = x * Math.cos(o.tiltZ) - y1 * Math.sin(o.tiltZ);
      const y2 = x * Math.sin(o.tiltZ) + y1 * Math.cos(o.tiltZ);
      x = x2; y = y2; z = z1;
      put(out, i, x, y, z);
    } else if (idx < PART.sphereCore) {
      const d = randomDir(r);
      const rad = 0.34 * Math.cbrt(r());
      put(out, i, d[0] * rad, d[1] * rad, d[2] * rad);
    } else {
      const d = randomDir(r);
      const rad = 1.12 + r() * 0.42;
      put(out, i, d[0] * rad, d[1] * rad, d[2] * rad);
    }
  }
  return out;
}

/* ------------------------------------------------- oiseau et radar */

/** Un point de l'oiseau, en coordonnees oiseau : x vers l'avant, z envergure. */
function birdPoint(r) {
  const k = r();
  if (k < 0.6) {
    // Ailes : 35 % sur le bord d'attaque, 15 % sur le bord de fuite, le reste
    // en remplissage. Les bords nets font lire la silhouette.
    const side = r() < 0.5 ? -1 : 1;
    const s = r();
    const e = r();
    const u = e < 0.35 ? r() * 0.03 : e < 0.5 ? 1 - r() * 0.03 : r();
    const xle = 0.1 - 0.3 * Math.pow(s, 1.5);
    const chord = 0.3 * Math.pow(1 - s, 0.55) + 0.04;
    const x = xle - u * chord;
    const y = 0.03 * Math.sin(Math.PI * u) * (1 - 0.6 * s);
    const z = side * (0.07 + 0.93 * s);
    return [x, y, z];
  }
  if (k < 0.82) {
    const d = randomDir(r);
    return [d[0] * 0.3, d[1] * 0.075, d[2] * 0.075];
  }
  if (k < 0.89) {
    const d = randomDir(r);
    return [0.3 + d[0] * 0.07, 0.035 + d[1] * 0.07, d[2] * 0.07];
  }
  if (k < 0.91) {
    const t = r();
    const rad = 0.022 * (1 - t);
    const a = r() * Math.PI * 2;
    return [0.36 + t * 0.09, 0.03 - t * 0.02 + Math.cos(a) * rad, Math.sin(a) * rad];
  }
  // queue en eventail
  const t = r();
  const x = -0.26 - t * 0.26;
  const half = 0.04 + t * 0.11;
  return [x, -0.01 * t, (r() * 2 - 1) * half];
}

function radarPoint(r) {
  const R = RADAR.radius;
  const k = r();
  let rad;
  let a = r() * Math.PI * 2;
  if (k < 0.22) {
    rad = [0.25, 0.5, 0.75, 1][Math.floor(r() * 4)] * R + (r() - 0.5) * 0.006;
  } else if (k < 0.32) {
    a = Math.floor(r() * 8) * (Math.PI / 4);
    rad = r() * R;
  } else if (k < 0.4) {
    const step = (6 * Math.PI) / 180;
    a = Math.round(a / step) * step;
    rad = R + r() * 0.06;
  } else {
    rad = R * Math.sqrt(r());
  }
  return [RADAR.center[0] + Math.cos(a) * rad, RADAR.center[1], RADAR.center[2] + Math.sin(a) * rad];
}

function voir(N, r) {
  const out = new Float32Array(N * 3);
  const { base, yaw, scale } = BIRD;
  for (let i = 0; i < N; i++) {
    if (i / N < PART.bird) {
      const [bx, by, bz] = birdPoint(r);
      const [x, z] = rotY(bx * scale, bz * scale, yaw);
      put(out, i, x + base[0], by * scale + base[1], z + base[2]);
    } else {
      const [x, y, z] = radarPoint(r);
      put(out, i, x, y, z);
    }
  }
  return out;
}

/** Trajectoire de l'oiseau dans le plan local, partagee par le shader et le suivi. */
export function birdPath(t, out = [0, 0, 0]) {
  out[0] = 0.22 * Math.sin(t * 0.5);
  out[1] = 0.07 * Math.sin(t * 1.1);
  out[2] = 0.18 * Math.sin(t * 0.35);
  return out;
}

/* ------------------------------------------------------- spectrogramme */

export const SPEC = { w: 1.1, d: 0.65 };

function ecoute(N, r) {
  const out = new Float32Array(N * 3);
  const M = Math.floor(N * PART.specGrid);
  const cols = Math.max(2, Math.round(Math.sqrt((M * SPEC.w) / SPEC.d)));
  const rows = Math.max(2, Math.ceil(M / cols));
  for (let i = 0; i < N; i++) {
    if (i < M) {
      const c = i % cols;
      const row = Math.floor(i / cols);
      const x = -SPEC.w + (2 * SPEC.w * c) / (cols - 1);
      const z = -SPEC.d + (2 * SPEC.d * row) / (rows - 1);
      put(out, i, x, 0, z);
    } else {
      // cadre : le perimetre du plan
      const p = r() * 2 * (2 * SPEC.w + 2 * SPEC.d);
      let x; let z;
      if (p < 2 * SPEC.w) { x = -SPEC.w + p; z = -SPEC.d; }
      else if (p < 2 * SPEC.w + 2 * SPEC.d) { x = SPEC.w; z = -SPEC.d + (p - 2 * SPEC.w); }
      else if (p < 4 * SPEC.w + 2 * SPEC.d) { x = SPEC.w - (p - 2 * SPEC.w - 2 * SPEC.d); z = SPEC.d; }
      else { x = -SPEC.w; z = SPEC.d - (p - 4 * SPEC.w - 2 * SPEC.d); }
      put(out, i, x, 0, z);
    }
  }
  return out;
}

/* ------------------------------------------------------------ eolienne */

export const BLADE = { length: 0.72, root: 0.045 };
const GROUND_Y = -1.0;

function towerPoint(r, ox, oz, s, out) {
  const h = 1.37;
  const t = r();
  const y = GROUND_Y + t * h * s;
  const rad = (0.05 - 0.02 * t) * s;
  const a = r() * Math.PI * 2;
  out[0] = ox + Math.cos(a) * rad; out[1] = y; out[2] = oz + Math.sin(a) * rad;
}

function bladePoint(r, hub, s, angle, out) {
  const span = r();
  const L = BLADE.length * s;
  const taper = 0.6 + 0.4 * Math.min(1, span / 0.15);
  const chord = (0.085 * Math.pow(1 - span, 0.8) + 0.012) * taper * s;
  const w = (r() - 0.3) * chord;
  const dist = BLADE.root * s + span * L;
  const dx = Math.cos(angle); const dy = Math.sin(angle);
  out[0] = hub[0] + dx * dist - dy * w;
  out[1] = hub[1] + dy * dist + dx * w;
  out[2] = hub[2] + 0.02 * s + (r() - 0.5) * 0.012 * s;
}

function turbine(N, r) {
  const out = new Float32Array(N * 3);
  const p = [0, 0, 0];
  const minis = [
    { x: -0.82, z: -0.5, s: 0.34, a: 0.4 },
    { x: 0.88, z: -0.7, s: 0.3, a: 1.3 },
  ];
  for (let i = 0; i < N; i++) {
    const idx = i / N;
    if (idx < PART.tower) {
      towerPoint(r, 0, 0, 1, p);
    } else if (idx < PART.nacelle) {
      // boite : un point sur une face au hasard
      const size = [0.11, 0.1, 0.3];
      const c = [0, 0.37, -0.03];
      const face = Math.floor(r() * 6);
      const ax = face >> 1;
      const v = [(r() - 0.5) * size[0], (r() - 0.5) * size[1], (r() - 0.5) * size[2]];
      v[ax] = (face & 1 ? 0.5 : -0.5) * size[ax];
      p[0] = c[0] + v[0]; p[1] = c[1] + v[1]; p[2] = c[2] + v[2];
    } else if (idx < PART.hub) {
      const d = randomDir(r);
      p[0] = HUB[0] + d[0] * 0.045; p[1] = HUB[1] + d[1] * 0.045; p[2] = HUB[2] + Math.abs(d[2]) * 0.06;
    } else if (idx < PART.blades) {
      const b = Math.min(2, Math.floor(((idx - PART.hub) / (PART.blades - PART.hub)) * 3));
      bladePoint(r, HUB, 1, Math.PI / 2 + b * (2 * Math.PI) / 3, p);
    } else {
      const k = r();
      if (k < 0.55) {
        const rad = [0.25, 0.47, 0.69, 0.91, 1.12][Math.floor(r() * 5)] + (r() - 0.5) * 0.006;
        const a = r() * Math.PI * 2;
        p[0] = Math.cos(a) * rad; p[1] = GROUND_Y; p[2] = Math.sin(a) * rad;
      } else if (k < 0.8) {
        const rad = 1.12 * Math.sqrt(r());
        const a = r() * Math.PI * 2;
        p[0] = Math.cos(a) * rad; p[1] = GROUND_Y; p[2] = Math.sin(a) * rad;
      } else {
        // deux eoliennes au loin, figees : le parc
        const m = minis[r() < 0.5 ? 0 : 1];
        if (r() < 0.45) {
          towerPoint(r, m.x, m.z, m.s, p);
        } else {
          const hub = [m.x, GROUND_Y + 1.37 * m.s, m.z + 0.05 * m.s];
          bladePoint(r, hub, m.s, m.a + Math.floor(r() * 3) * (2 * Math.PI) / 3, p);
        }
      }
    }
    put(out, i, p[0], p[1], p[2]);
  }
  return out;
}

/* -------------------------------------------------------------- poussiere */

function dust(N, r) {
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    put(out, i,
      (r() * 2 - 1) * DUST.x,
      (r() * 2 - 1) * DUST.y,
      DUST.zFar + r() * (DUST.zNear - DUST.zFar));
  }
  return out;
}

/* --------------------------------------------------------- blocs empiles */

export function cityVoxels(seed = 7) {
  const r = rng(seed);
  const cells = [];
  const n = 5;
  const pitch = 0.34;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dist = Math.hypot(i - 2, j - 2);
      const h = Math.max(0, Math.min(5, Math.round(4.2 - 1.3 * dist + (r() - 0.5) * 1.8)));
      if (h === 0 || r() < 0.08) continue;
      cells.push({ x: (i - 2) * pitch, z: (j - 2) * pitch, h });
    }
  }
  return cells;
}

function city(N, r) {
  const out = new Float32Array(N * 3);
  const cube = 0.28;
  const step = 0.3;
  const y0 = -0.72;
  const edges = [];
  const tops = [];
  for (const c of cityVoxels()) {
    for (let k = 0; k < c.h; k++) {
      const a = [c.x - cube / 2, y0 + k * step, c.z - cube / 2];
      const b = [c.x + cube / 2, y0 + k * step + cube, c.z + cube / 2];
      const corners = [];
      for (let m = 0; m < 8; m++) corners.push([m & 1 ? b[0] : a[0], m & 2 ? b[1] : a[1], m & 4 ? b[2] : a[2]]);
      for (const [u, v] of [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]) {
        edges.push([corners[u], corners[v]]);
      }
    }
    tops.push({ x: c.x, z: c.z, y: y0 + (c.h - 1) * step + cube });
  }
  for (let i = 0; i < N; i++) {
    if (r() < 0.78 || !tops.length) {
      const [a, b] = edges[Math.floor(r() * edges.length)];
      const t = r();
      put(out, i, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
    } else {
      const top = tops[Math.floor(r() * tops.length)];
      put(out, i, top.x + (r() - 0.5) * cube, top.y, top.z + (r() - 0.5) * cube);
    }
  }
  return out;
}

/* -------------------------------------------------------------- prenom */

/** Forme d'attente, avant que le texte soit echantillonne. */
function namePlaceholder(N, r) {
  const out = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) put(out, i, (r() * 2 - 1), (r() * 2 - 1) * 0.18, (r() - 0.5) * 0.08);
  return out;
}

/**
 * Transforme des pixels allumes en N points. `pixels` est une liste plate
 * [x0, y0, x1, y1, ...] en pixels canvas. Fonction pure, testee hors navigateur.
 * Le texte est centre et mis a l'echelle pour que sa largeur couvre [-1, 1].
 */
export function pointsFromPixels(pixels, N, r) {
  const out = new Float32Array(N * 3);
  const count = pixels.length / 2;
  if (!count) return namePlaceholder(N, r);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = pixels[i * 2]; const y = pixels[i * 2 + 1];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const k = 2 / Math.max(1, maxX - minX);
  for (let i = 0; i < N; i++) {
    const j = Math.floor(r() * count);
    const x = (pixels[j * 2] + r() - cx) * k;
    const y = -(pixels[j * 2 + 1] + r() - cy) * k;
    put(out, i, x, y, (r() - 0.5) * 0.05);
  }
  return out;
}

/* ------------------------------------------------------------- assemblage */

/** Positions finales immobiles (apres vue), pour le cadrage et les tests. */
export function viewed(shapeIndex, local) {
  const m = viewMatrix(VIEW[SHAPES[shapeIndex]]);
  const out = new Float32Array(local.length);
  const v = [0, 0, 0];
  for (let i = 0; i < local.length; i += 3) {
    applyMat(m, local[i], local[i + 1], local[i + 2], v);
    out[i] = v[0]; out[i + 1] = v[1]; out[i + 2] = v[2];
  }
  return out;
}

/**
 * Demi-etendues ecran (rx, ry) d'une forme, animations comprises : une forme
 * qui tourne ou dont le rotor balaie doit tenir dans son emplacement a tout
 * instant, pas seulement a l'image zero.
 */
export function extentsOf(shapeIndex, local) {
  const name = SHAPES[shapeIndex];
  const m = viewMatrix(VIEW[name]);
  const v = [0, 0, 0];
  let rx = 0;
  let ry = 0;
  const N = local.length / 3;
  const grow = (x, y, z) => {
    applyMat(m, x, y, z, v);
    if (Math.abs(v[0]) > rx) rx = Math.abs(v[0]);
    if (Math.abs(v[1]) > ry) ry = Math.abs(v[1]);
  };
  const angles = name === 'sphere' || name === 'city' || name === 'turbine'
    ? [0, 0.52, 1.05, 1.57, 2.09, 2.62, 3.14, 3.67, 4.19, 4.71, 5.24, 5.76] : [0];
  for (let i = 0; i < N; i++) {
    const x = local[i * 3]; const y = local[i * 3 + 1]; const z = local[i * 3 + 2];
    const idx = i / N;
    if (name === 'sphere' || name === 'city') {
      for (const a of angles) { const [rx2, rz2] = rotY(x, z, a); grow(rx2, y, rz2); }
    } else if (name === 'turbine' && idx >= PART.hub && idx < PART.blades) {
      for (const a of angles) {
        const dx = x - HUB[0]; const dy = y - HUB[1];
        grow(HUB[0] + Math.cos(a) * dx - Math.sin(a) * dy, HUB[1] + Math.sin(a) * dx + Math.cos(a) * dy, z);
      }
    } else if (name === 'ecoute') {
      grow(x, y, z); grow(x, y + 0.48, z);
    } else {
      grow(x, y, z);
    }
  }
  if (name === 'voir') { rx += 0.26; ry += 0.14; }
  if (name === 'sphere') { rx += 0.05; ry += 0.05; }
  if (name === 'name') { ry = Math.max(ry, 0.12); }
  if (name === 'dust') return { rx: DUST.x, ry: DUST.y };
  // Marge de perspective : ce qui avance vers la camera parait plus grand
  // (le sol de l'eolienne, le bord avant du radar).
  return { rx: (rx || 1) * 1.08, ry: (ry || 1) * 1.08 };
}

/** Attributs aleatoires par particule : decalage, accent, taille, index. */
export function randomAttr(N, r) {
  const out = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    out[i * 4] = r();
    out[i * 4 + 1] = r();
    out[i * 4 + 2] = r();
    out[i * 4 + 3] = (i + 0.5) / N;
  }
  return out;
}

export function buildShapes(N, seed = 11) {
  const builders = [sphere, voir, ecoute, turbine, dust, city, namePlaceholder];
  const positions = builders.map((fn, k) => fn(N, rng(seed + k * 101)));
  const extents = positions.map((p, k) => extentsOf(k, p));
  return { N, positions, extents, rand: randomAttr(N, rng(seed + 999)) };
}
