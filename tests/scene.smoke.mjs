/**
 * Test de la scene, hors navigateur.
 *
 * Il monte la geometrie et la machine a etats avec le vrai code de production,
 * sans WebGL, et verifie ce qui casse en silence : NaN, index hors bornes,
 * normales degenerees, etats jamais atteints.
 *
 * Il verifie aussi le CADRAGE : pour chaque plan, les objets qui comptent sont
 * projetes dans l'espace ecran et on controle qu'ils tiennent dans l'image.
 * C'est ce qui remplace le fait de regarder le rendu.
 */

import * as THREE from 'three';
import { createBoard, Trace } from '../scripts/scene/board.js';
import { createSignals } from '../scripts/scene/signals.js';
import { createPipeline } from '../scripts/scene/pipeline.js';
import { createTurbine, TOWER_H, BLADE_L } from '../scripts/scene/turbine.js';
import { placeCamera, createRig, KEYS } from '../scripts/scene/camera-rig.js';

const pal = {
  bg: new THREE.Color('#090C0B'), fog: new THREE.Color('#090C0B'),
  metal: new THREE.Color('#202826'), metal2: new THREE.Color('#39433F'),
  grid: new THREE.Color('#223029'), key: new THREE.Color('#C8D4CE'),
  rim: new THREE.Color('#6E7C76'), signal: new THREE.Color('#D8E021'),
  isLight: false,
};

let fails = 0;
const check = (name, cond, extra = '') => {
  console.log((cond ? '  ok    ' : '  ECHEC ') + name + (extra ? '  ' + extra : ''));
  if (!cond) fails++;
  return cond;
};
const head = (t) => console.log('\n-- ' + t + ' --');

function scanGeometry(label, geo) {
  const pos = geo.getAttribute('position');
  let bad = 0;
  for (let i = 0; i < pos.count * 3; i++) if (!Number.isFinite(pos.array[i])) bad++;
  check(label + ' positions finies', bad === 0, `verts=${pos.count} nan=${bad}`);

  const idx = geo.getIndex();
  if (idx) {
    let oob = 0;
    for (let i = 0; i < idx.count; i++) if (idx.array[i] >= pos.count) oob++;
    check(label + ' indices dans les bornes', oob === 0, `tris=${idx.count / 3} oob=${oob}`);
  }
  const nrm = geo.getAttribute('normal');
  if (nrm) {
    let degen = 0;
    for (let i = 0; i < nrm.count; i++) {
      const l = Math.hypot(nrm.getX(i), nrm.getY(i), nrm.getZ(i));
      if (!Number.isFinite(l) || l < 0.5) degen++;
    }
    check(label + ' normales valides', degen === 0, `degen=${degen}/${nrm.count}`);
  }
}

/* ------------------------------------------------------------- pistes */

head('pistes cuivre');
const t = new Trace([[0, 0], [10, 0], [10, 20]]);
const v = new THREE.Vector3();
check('longueur = somme des segments', Math.abs(t.length - 30) < 1e-6, `${t.length}`);
t.pointAt(0, v);
check('pointAt(0) part du premier sommet', v.x === 0 && v.z === 0);
t.pointAt(1, v);
check('pointAt(1) arrive au dernier sommet', Math.abs(v.x - 10) < 1e-6 && Math.abs(v.z - 20) < 1e-6);
t.pointAt(1 / 3, v);
check('pointAt respecte l abscisse curviligne', Math.abs(v.x - 10) < 1e-6 && Math.abs(v.z) < 1e-6,
  `(${v.x.toFixed(1)}, ${v.z.toFixed(1)})`);
let monotone = true;
const prev = new THREE.Vector3();
let travelled = 0;
t.pointAt(0, prev);
for (let i = 1; i <= 60; i++) {
  t.pointAt(i / 60, v);
  travelled += v.distanceTo(prev);
  prev.copy(v);
}
check('progression continue, sans saut', Math.abs(travelled - 30) < 0.2, `parcouru=${travelled.toFixed(2)}`);
void monotone;

/* -------------------------------------------------------------- carte */

head('carte');
const board = createBoard(pal, { detail: 1 });
let meshes = 0;
board.group.traverse((o) => { if (o.isMesh) meshes++; });
check('maillages construits', meshes > 30, `meshes=${meshes}`);
check('quatre pistes routees', Object.keys(board.traces).length === 4,
  Object.keys(board.traces).join(' '));
scanGeometry('die du SoC', board.chip.die.geometry);

board.group.updateMatrixWorld(true);
const boardBox = new THREE.Box3().setFromObject(board.group);
check('carte a plat, pas de composant sous le substrat', boardBox.min.y > -1.5,
  `min.y=${boardBox.min.y.toFixed(2)}`);

// Chaque piste doit toucher le SoC a une extremite : sinon le flux part de nulle part.
const chipBox = new THREE.Box3().setFromObject(board.chip.body).expandByScalar(2);
for (const [name, trace] of Object.entries(board.traces)) {
  const a = trace.points[0];
  const b = trace.points[trace.points.length - 1];
  check(`piste ${name} branchee au SoC`, chipBox.containsPoint(a) || chipBox.containsPoint(b));
}

const foot = new THREE.Box3(
  new THREE.Vector3(boardBox.min.x - 0.5, -10, boardBox.min.z - 0.5),
  new THREE.Vector3(boardBox.max.x + 0.5, 10, boardBox.max.z + 0.5)
);
for (const [name, trace] of Object.entries(board.traces)) {
  const outside = trace.points.filter((pt) => !foot.containsPoint(pt.clone().setY(0)));
  check(`piste ${name} entierement sur le substrat`, outside.length === 0,
    outside.length ? `${outside.length} sommet(s) hors carte` : '');
}

/* ------------------------------------------------------------ capteurs */

head('capteurs et impulsions');
const signals = createSignals(pal, board.traces, { detail: 1 });
for (const name of ['vision', 'audio', 'radar']) {
  check(`module ${name} present`, !!signals.anchors[name]);
}
for (const ch of ['vision', 'audio', 'radar']) signals.pulses.setActive(ch, true);
let nan = 0;
for (let i = 0; i < 600; i++) {
  signals.update(1 / 60, i / 60);
  signals.group.traverse((o) => {
    if (o.isMesh && !Number.isFinite(o.position.x + o.position.y + o.position.z)) nan++;
  });
}
check('aucune position NaN apres 10 s', nan === 0, `nan=${nan}`);

let landed = false;
signals.pulses.fire('output', () => { landed = true; });
for (let i = 0; i < 300 && !landed; i++) signals.pulses.update(1 / 60);
check('la commande atteint le bout de sa piste', landed);

/* ------------------------------------------------------------ pipeline */

head('pipeline');
const pipeline = createPipeline({ signals, die: board.chip.die, palette: pal });
const seen = new Set();
let stopped = false;
let glowMin = Infinity;
let glowMax = -Infinity;
for (let i = 0; i < 3600; i++) {           // 60 s simulees
  pipeline.update(1 / 60, i / 60);
  seen.add(pipeline.stage);
  if (pipeline.rotorTarget < 0.1) stopped = true;
  const g = board.chip.die.material.emissiveIntensity;
  glowMin = Math.min(glowMin, g);
  glowMax = Math.max(glowMax, g);
}
check('les quatre etapes sont atteintes', seen.size === 4, [...seen].join(' '));
check('la machine est bien arretee dans le cycle', stopped);
check('le die varie de luminosite', glowMax - glowMin > 0.1,
  `${glowMin.toFixed(2)} a ${glowMax.toFixed(2)}`);
check('luminosite du die toujours finie', Number.isFinite(glowMin) && Number.isFinite(glowMax));

/* ------------------------------------------------------------- machine */

head('machine en bout de chaine');
const MACHINE = { x: 74, z: 14, scale: 0.34 };
const machine = createTurbine(pal, { detail: 1, scale: MACHINE.scale, compact: true });
machine.group.position.set(MACHINE.x, 0, MACHINE.z);
const blades = machine.rotor.children.filter(
  (c) => c.isMesh && c.geometry.getAttribute('position').count > 200
);
check('trois pales', blades.length === 3, `blades=${blades.length}`);
scanGeometry('pale', blades[0].geometry);
check('mode compact : pas de bloc camera', machine.anchors.camera === null);
check('mode compact : pas de calculateur sur la nacelle', machine.anchors.compute === null);

machine.group.updateMatrixWorld(true);
const machBox = new THREE.Box3().setFromObject(machine.group);
const machH = machBox.max.y - machBox.min.y;
check('machine a l echelle d un composant', machH > 12 && machH < 26,
  `hauteur=${machH.toFixed(1)} (mat+pale bruts ${(TOWER_H + BLADE_L).toFixed(0)})`);
check('machine posee au-dela du bord de carte', machBox.min.x > boardBox.max.x - 6,
  `machine.min.x=${machBox.min.x.toFixed(1)} carte.max.x=${boardBox.max.x.toFixed(1)}`);

/* -------------------------------------------------------------- cadrage */

head('cadrage des cinq plans');
const world = new THREE.Group();
world.add(board.group, signals.group, machine.group);
world.updateMatrixWorld(true);

/** Projette la boite d'un objet et renvoie ses bornes en NDC. */
function project(camera, object) {
  const box = new THREE.Box3().setFromObject(object);
  const p = new THREE.Vector3();
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let anyFront = false;
  for (let i = 0; i < 8; i++) {
    p.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
    p.project(camera);
    if (p.z < 1) anyFront = true;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, anyFront };
}

const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 2000);

// Plan 0, le heros : le texte occupe la colonne de GAUCHE, donc la chaine
// entiere doit tenir dans l image et se tasser dans la moitie droite.
placeCamera(camera, 0);
const hero = project(camera, world);
check('plan 0 : la scene est devant la camera', hero.anyFront);
check('plan 0 : la scene tient en hauteur', hero.minY > -1.25 && hero.maxY < 1.25,
  `y ${hero.minY.toFixed(2)} a ${hero.maxY.toFixed(2)}`);
check('plan 0 : centre de scene dans la moitie droite', hero.cx > 0.05,
  `centre x=${hero.cx.toFixed(2)}`);
check('plan 0 : la scene ne deborde pas du cadre', hero.maxX < 1.15 && hero.minX > -1.15,
  `x ${hero.minX.toFixed(2)} a ${hero.maxX.toFixed(2)}`);

// Le SoC doit rester visible dans le heros : c est le point focal de la scene.
const heroChip = project(camera, board.chip.body);
check('plan 0 : le SoC est visible', Math.abs(heroChip.cx) < 1 && Math.abs(heroChip.cy) < 1,
  `centre (${heroChip.cx.toFixed(2)}, ${heroChip.cy.toFixed(2)})`);

// Chapitres : le texte passe a DROITE (.chap__in occupe les colonnes 7 a 12),
// donc chaque sujet doit se placer dans la moitie gauche de l image.
const shots = [
  [0.5, 'capteur vision', signals.anchors.vision],
  [0.75, 'le SoC', board.chip.body],
  [1.0, 'la machine', machine.group],
];
for (const [p, label, subject] of shots) {
  placeCamera(camera, p);
  const s = project(camera, subject);
  check(`plan ${p} : ${label} est devant la camera`, s.anyFront);
  check(`plan ${p} : ${label} tient dans le cadre`,
    s.minX > -1.1 && s.maxX < 1.1 && s.minY > -1.1 && s.maxY < 1.1,
    `x ${s.minX.toFixed(2)}..${s.maxX.toFixed(2)}  y ${s.minY.toFixed(2)}..${s.maxY.toFixed(2)}`);
  check(`plan ${p} : ${label} est dans la moitie gauche`, s.cx < -0.02,
    `centre x=${s.cx.toFixed(2)}`);
  const size = Math.max(s.maxX - s.minX, s.maxY - s.minY);
  check(`plan ${p} : ${label} occupe assez de place`, size > 0.2 && size < 1.7,
    `taille=${size.toFixed(2)}`);
}

// createRig n'etait couvert par aucun test parce qu'il touche `window`, et
// c'est exactement la qu'une propriete renommee dans KEYS est passee au
// travers : le rig levait au montage, main.js avalait l'erreur en warn, et la
// page affichait le repli sans rien dire. Un stub minimal suffit a le couvrir.
globalThis.window = {
  addEventListener() {}, removeEventListener() {},
  innerWidth: 1440, innerHeight: 900,
};
{
  const cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 2000);
  let rig;
  let threw = null;
  try {
    rig = createRig(cam);
    rig.setProgress(0.4);
    for (let i = 0; i < 90; i++) rig.update(1 / 60, i / 60);
    rig.snap(1);
    rig.dispose();
  } catch (e) { threw = e; }
  check('le rig se monte et tourne sans lever', threw === null,
    threw ? String(threw.message || threw) : '');
  check('la camera reste a une position finie',
    threw === null && Number.isFinite(cam.position.x + cam.position.y + cam.position.z),
    threw ? '' : cam.position.toArray().map((n) => n.toFixed(0)).join(', '));
}

// Toute cle doit porter les memes champs : un renommage partiel casse le rig.
const FIELDS = ['stop', 'pos', 'focus', 'shift', 'fov'];
for (const f of FIELDS) {
  check(`chaque repere definit "${f}"`, KEYS.every((k) => k[f] !== undefined),
    KEYS.map((k, i) => (k[f] === undefined ? `#${i} manquant` : '')).filter(Boolean).join(' '));
}
check('cinq reperes definis', KEYS.length === 5);
check('reperes ordonnes de 0 a 1',
  KEYS[0].stop === 0 && KEYS[KEYS.length - 1].stop === 1 &&
  KEYS.every((k, i) => i === 0 || k.stop > KEYS[i - 1].stop));

/* ---------------------------------------------------------- theme clair */

head('theme clair');
const light = { ...pal, isLight: true, metal2: new THREE.Color('#6E7872'), signal: new THREE.Color('#6C7400') };
signals.retint(light);
pipeline.setPalette(light);
pipeline.update(1 / 60, 1);
check('retint sans erreur', true);

console.log(fails === 0 ? '\nTOUT PASSE\n' : `\n${fails} ECHEC(S)\n`);
process.exit(fails === 0 ? 0 : 1);
