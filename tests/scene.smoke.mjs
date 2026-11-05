/**
 * Test de la scene, hors navigateur.
 *
 * Il construit les sept nuages de points avec le vrai code de production,
 * sans WebGL, et verifie ce qui casse en silence : NaN, plages d'index qui ne
 * correspondent plus a la geometrie, formes qui debordent de leur emplacement.
 *
 * Il verifie surtout le CADRAGE : chaque forme est posee dans une boite comme
 * le fait la page, projetee par une vraie camera three.js, et on controle
 * qu'elle tient dans sa boite, perspective comprise.
 */

import * as THREE from 'three';
import {
  buildShapes, SHAPES, SHAPE, PART, VIEW, BIRD, RADAR, HUB, BLADE, FIT,
  viewMatrix, transpose, applyMat, viewed, pointsFromPixels, birdPath, rng,
} from '../scripts/scene/shapes.js';
import { vertexShader, fragmentShader } from '../scripts/scene/shaders.js';
import { resolveStory, ease, fitScale, blendLayout, measureAnchor } from '../scripts/scene/story.js';

let fails = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '  ok    ' : '  ECHEC ') + name + (extra ? '  ' + extra : ''));
  if (!cond) fails++;
  return cond;
};
const head = (t) => console.log('\n-- ' + t + ' --');

const N = 6000;
const data = buildShapes(N);

/* ------------------------------------------------------------ geometrie */

head('nuages de points');
check('sept formes construites', data.positions.length === SHAPES.length, SHAPES.join(' '));
for (let k = 0; k < SHAPES.length; k++) {
  const p = data.positions[k];
  let bad = 0;
  for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) bad++;
  check(`${SHAPES[k]} : ${N} points finis`, p.length === N * 3 && bad === 0, `nan=${bad}`);
}
let badRand = 0;
for (let i = 0; i < N; i++) {
  for (let c = 0; c < 4; c++) {
    const v = data.rand[i * 4 + c];
    if (!(v >= 0 && v <= 1)) badRand++;
  }
}
check('attributs aleatoires dans [0, 1]', badRand === 0, `hors bornes=${badRand}`);
// Float32 : une precision de 1e-6 suffit largement face a un pas de 1/N.
const idxOk = Math.abs(data.rand[3] - 0.5 / N) < 1e-6 && Math.abs(data.rand[(N - 1) * 4 + 3] - (N - 0.5) / N) < 1e-6;
check('index normalise croissant', idxOk);

head('etendues');
for (let k = 0; k < SHAPES.length; k++) {
  const e = data.extents[k];
  check(`${SHAPES[k]} : etendue finie et raisonnable`,
    Number.isFinite(e.rx) && Number.isFinite(e.ry) && e.rx > 0.05 && e.ry > 0.05 && e.rx < 4 && e.ry < 4,
    `rx=${e.rx.toFixed(2)} ry=${e.ry.toFixed(2)}`);
}

head('plages d index');
{
  const v = data.positions[SHAPE.voir];
  let birdLow = 0;
  let radarOff = 0;
  for (let i = 0; i < N; i++) {
    const y = v[i * 3 + 1];
    if (i / N < PART.bird) { if (y < RADAR.center[1] + 0.3) birdLow++; }
    else if (Math.abs(y - RADAR.center[1]) > 1e-6) radarOff++;
  }
  check('oiseau au-dessus du radar', birdLow === 0, `points trop bas=${birdLow}`);
  check('radar a plat', radarOff === 0, `hors plan=${radarOff}`);

  const t = data.positions[SHAPE.turbine];
  let towerOff = 0;
  let bladeFar = 0;
  let bladeNear = 0;
  for (let i = 0; i < N; i++) {
    const idx = i / N;
    const x = t[i * 3]; const y = t[i * 3 + 1]; const z = t[i * 3 + 2];
    if (idx < PART.tower && Math.hypot(x, z) > 0.06) towerOff++;
    if (idx >= PART.hub && idx < PART.blades) {
      const d = Math.hypot(x - HUB[0], y - HUB[1]);
      if (d > BLADE.length + BLADE.root + 0.05) bladeFar++;
      if (Math.abs(z - HUB[2]) > 0.05) bladeNear++;
    }
  }
  check('mat vertical, centre sur l axe', towerOff === 0, `ecarts=${towerOff}`);
  check('pales dans le disque du rotor', bladeFar === 0, `trop loin=${bladeFar}`);
  check('pales dans le plan du rotor', bladeNear === 0, `hors plan=${bladeNear}`);
}

head('rotations de vue');
for (const name of Object.keys(VIEW)) {
  const m = viewMatrix(VIEW[name]);
  const it = transpose(m);
  const a = applyMat(m, 0.3, -0.7, 0.5);
  const b = applyMat(it, a[0], a[1], a[2]);
  const err = Math.hypot(b[0] - 0.3, b[1] + 0.7, b[2] - 0.5);
  check(`${name} : la transposee inverse la vue`, err < 1e-9, `err=${err.toExponential(1)}`);
}

head('shaders');
for (const [label, src] of [['vertex', vertexShader], ['fragment', fragmentShader]]) {
  check(`${label} : aucune constante indefinie`, !/undefined|NaN/.test(src));
}
check('vertex : les sept attributs de forme', ['position', 'aP1', 'aP2', 'aP3', 'aP4', 'aP5', 'aP6'].every((a) => vertexShader.includes(a)));
check('vertex : bornes injectees depuis shapes.js', vertexShader.includes(`BIRD_END = ${PART.bird}`));

head('trajectoire de l oiseau');
{
  let bad = 0;
  let maxD = 0;
  const o = [0, 0, 0];
  for (let i = 0; i < 2000; i++) {
    birdPath(i * 0.05, o);
    if (!o.every(Number.isFinite)) bad++;
    maxD = Math.max(maxD, Math.hypot(o[0], o[2]));
  }
  check('trajectoire finie et bornee', bad === 0 && maxD < 0.35, `ecart max=${maxD.toFixed(2)}`);
  const b = BIRD.base;
  check('l oiseau reste au-dessus du disque radar', Math.hypot(b[0], b[2]) + maxD < RADAR.radius);
}

head('texte en points');
{
  // Un rectangle de pixels allumes, 200 x 40 : sa largeur doit couvrir [-1, 1].
  const px = [];
  for (let y = 100; y < 140; y += 2) for (let x = 50; x < 250; x += 2) px.push(x, y);
  const pts = pointsFromPixels(px, 3000, rng(3));
  let minX = Infinity; let maxX = -Infinity; let maxY = 0;
  for (let i = 0; i < 3000; i++) {
    minX = Math.min(minX, pts[i * 3]); maxX = Math.max(maxX, pts[i * 3]);
    maxY = Math.max(maxY, Math.abs(pts[i * 3 + 1]));
  }
  check('largeur normalisee sur [-1, 1]', minX > -1.05 && maxX < 1.05 && maxX - minX > 1.8,
    `${minX.toFixed(2)}..${maxX.toFixed(2)}`);
  check('proportions conservees', Math.abs(maxY - 0.2) < 0.05, `demi-hauteur=${maxY.toFixed(2)}`);
  const empty = pointsFromPixels([], 100, rng(1));
  check('aucun pixel : forme d attente finie', empty.every(Number.isFinite));
}

/* --------------------------------------------------------------- story */

head('enchainement des formes');
{
  const item = (shape, timing) => ({ shape, timing, place: { cx: 0, cy: 0, w: 100, h: 100 } });
  const items = [item(0, 400), item(4, 1200), item(1, 2000)];
  const s0 = resolveStory(items, 100);
  check('avant le premier emplacement : premiere forme', s0.a.shape === 0 && s0.t === 0);
  const s1 = resolveStory(items, 800);
  check('entre deux emplacements : a mi-chemin', s1.a.shape === 0 && s1.b.shape === 4 && Math.abs(s1.t - 0.5) < 1e-9);
  const s2 = resolveStory(items, 5000);
  check('apres le dernier : derniere forme', s2.a.shape === 1 && s2.b.shape === 1);
  check('palier au depart', ease(0.05) === 0 && ease(0.95) === 1);
  let mono = true;
  for (let i = 1; i <= 100; i++) if (ease(i / 100) < ease((i - 1) / 100)) mono = false;
  check('transition monotone', mono);

  const vh = 900;
  const screen = measureAnchor({ shape: SHAPE.dust, screen: true }, { top: 300, left: 0, width: 1200, height: 4000 }, vh, 1440, 900);
  check('emplacement ecran : timing sur le premier ecran', screen.timing === 300 + vh / 2);
  check('emplacement ecran : cadrage sur le canvas', screen.place.cx === 720 && screen.place.h === 900);
  const hidden = measureAnchor({ shape: 0, screen: false }, { top: 0, left: 0, width: 0, height: 0 }, vh, 1440, 900);
  check('emplacement masque ignore', hidden === null);
}

/* -------------------------------------------------------------- cadrage */

head('cadrage : chaque forme tient dans sa boite');

// Meme camera et meme conversion que scene/index.js.
const FOV = 30;
const DIST = 10;

function frame(shape, place, cw, ch) {
  const camera = new THREE.PerspectiveCamera(FOV, cw / ch, 0.1, 100);
  camera.position.set(0, 0, DIST);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const story = { a: { shape, place }, b: { shape, place }, t: 0 };
  const lay = blendLayout(story, 0, data.extents);
  const worldPerPx = (2 * DIST * Math.tan((FOV * Math.PI) / 360)) / ch;
  const group = new THREE.Group();
  group.position.set((lay.cx - cw / 2) * worldPerPx, -(lay.cy - ch / 2) * worldPerPx, 0);
  group.scale.setScalar(lay.s * worldPerPx);
  group.updateMatrixWorld(true);

  const pts = viewed(shape, data.positions[shape]);
  const v = new THREE.Vector3();
  let out = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 3) {
    v.set(pts[i], pts[i + 1], pts[i + 2]).applyMatrix4(group.matrixWorld).project(camera);
    const x = (v.x * 0.5 + 0.5) * cw;
    const y = (-v.y * 0.5 + 0.5) * ch;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    // marge de 8 % : la perspective grossit un peu ce qui avance vers la camera
    const mx = place.w * 0.08; const my = place.h * 0.08;
    if (x < place.cx - place.w / 2 - mx || x > place.cx + place.w / 2 + mx
      || y < place.cy - place.h / 2 - my || y > place.cy + place.h / 2 + my) out++;
  }
  return { out: out / (pts.length / 3), minX, maxX, minY, maxY, s: lay.s };
}

const VIEWPORTS = [
  { name: 'bureau', cw: 1440, ch: 900 },
  { name: 'telephone', cw: 390, ch: 844 },
];
for (const vp of VIEWPORTS) {
  // Boites typiques : moitie droite du heros, colonne de chapitre, bandeau du contact.
  const boxes = {
    sphere: vp.cw > 800 ? { cx: 1000, cy: 470, w: 640, h: 680 } : { cx: 195, cy: 260, w: 350, h: 300 },
    voir: vp.cw > 800 ? { cx: 420, cy: 482, w: 720, h: 650 } : { cx: 195, cy: 330, w: 350, h: 380 },
    ecoute: vp.cw > 800 ? { cx: 1000, cy: 482, w: 700, h: 650 } : { cx: 195, cy: 330, w: 350, h: 380 },
    turbine: vp.cw > 800 ? { cx: 420, cy: 482, w: 720, h: 650 } : { cx: 195, cy: 330, w: 350, h: 380 },
    city: vp.cw > 800 ? { cx: 1060, cy: 420, w: 480, h: 500 } : { cx: 195, cy: 300, w: 350, h: 300 },
    name: vp.cw > 800 ? { cx: 720, cy: 300, w: 1240, h: 320 } : { cx: 195, cy: 300, w: 350, h: 130 },
  };
  for (const [name, place] of Object.entries(boxes)) {
    const k = SHAPE[name];
    check(`${vp.name} : ${name} dans sa boite`, FIT[k] === 'box' && frame(k, place, vp.cw, vp.ch).out < 0.002,
      `${(frame(k, place, vp.cw, vp.ch).out * 100).toFixed(2)} % hors cadre`);
  }
  const dustPlace = { cx: vp.cw / 2, cy: vp.ch / 2, w: vp.cw, h: vp.ch };
  const s = fitScale(dustPlace, SHAPE.dust, data.extents);
  check(`${vp.name} : la poussiere couvre la hauteur de l ecran`, Math.abs(s * data.extents[SHAPE.dust].ry * 2 - vp.ch) < 1);
}

// Une forme doit aussi REMPLIR sa boite, pas y flotter en miniature.
{
  const place = { cx: 420, cy: 482, w: 720, h: 650 };
  const f = frame(SHAPE.turbine, place, 1440, 900);
  const fill = Math.max((f.maxX - f.minX) / place.w, (f.maxY - f.minY) / place.h);
  check('l eolienne remplit sa boite', fill > 0.7, `occupation=${(fill * 100).toFixed(0)} %`);
}

console.log(fails === 0 ? '\nSCENE OK\n' : `\n${fails} ECHEC(S)\n`);
process.exit(fails === 0 ? 0 : 1);
