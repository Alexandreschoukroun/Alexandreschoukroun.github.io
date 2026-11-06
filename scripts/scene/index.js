/**
 * scene/index.js
 * Une seule scene pour toute la page : un nuage de particules, fixe derriere
 * le contenu, qui change de forme au fil des sections.
 *
 *   heros     un capteur, ne d'un nuage de bruit au chargement
 *   voir      un oiseau suivi au-dessus d'un radar
 *   entendre  un spectrogramme de cris de chauve-souris
 *   decider   l'eolienne, qui s'arrete quand la consigne part
 *   lecture   une poussiere en parallax derriere le texte
 *   freelance des blocs empiles
 *   contact   le prenom, ecrit en points
 *
 * Le module n'a pas de boucle a lui. La boucle de la page appelle `read` en
 * premier (mesures), puis `render` (ecritures et rendu) : jamais de lecture
 * de mise en page apres une ecriture dans la meme image.
 */

import * as THREE from 'three';
import {
  buildShapes, SHAPE, SHAPES, STYLE, BIRD, VIEW, viewMatrix, applyMat, birdPath, extentsOf,
} from './shapes.js';
import { vertexShader, fragmentShader } from './shaders.js';
import { readPalette } from './palette.js';
import { collectAnchors, measureAnchor, resolveStory, ease, blendLayout } from './story.js';
import { sampleText } from './text-points.js';

// Les couleurs viennent des tokens CSS et doivent ressortir telles quelles :
// pas de conversion d'espace colorimetrique entre le CSS et le canvas.
THREE.ColorManagement.enabled = false;

const FOV = 30;
const DIST = 10;
const ROTOR_RUN = 1.5;

// Chaque etat commence par la competence qu'il illustre.
const HUD_FR = {
  track: ['Vision · suivi de cible', '40 images/s'],
  listen: ['Signal · écoute ultrasonore', 'Filtrage en continu'],
  run: ['Temps réel · turbine en marche', 'Zone à risque surveillée'],
  stop: ['Temps réel · arrêt commandé', 'Rotor en décélération'],
};

const V_VOIR = viewMatrix(VIEW.voir);

export function createScene({ canvas, overlay, hud, reduced = false, tier = 'high' }) {
  const N = tier === 'low' ? 16000 : 42000;
  const data = buildShapes(N);
  let pal = readPalette();

  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, alpha: true, powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.set(0, 0, DIST);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(data.positions[0], 3));
  for (let k = 1; k < SHAPES.length; k++) {
    geo.setAttribute(`aP${k}`, new THREE.BufferAttribute(data.positions[k], 3));
  }
  geo.setAttribute('aRand', new THREE.BufferAttribute(data.rand, 4));

  const uniforms = {
    uTime: { value: 0 },
    uA: { value: 0 },
    uB: { value: 0 },
    uT: { value: 0 },
    uIntro: { value: reduced ? 1 : 0 },
    uScroll: { value: 0 },
    uCalm: { value: reduced ? 0 : 1 },
    uBird: { value: new THREE.Vector3() },
    uRotor: { value: 0 },
    uAlert: { value: 0 },
    uWave: { value: 0 },
    uStopped: { value: 0 },
    uPointer: { value: new THREE.Vector3(99, 99, 0) },
    uPointerK: { value: 0 },
    // Moins de particules sur petit appareil : chacune est plus grosse, pour
    // que la forme garde la meme densite apparente.
    uSize: { value: STYLE.size.map((s) => s * (tier === 'low' ? 1.45 : 1)) },
    uAlpha: { value: STYLE.alpha.slice() },
    uPxScale: { value: 1 },
    uGroupScale: { value: 1 },
    uBase: { value: pal.particle.clone() },
    uAccent: { value: pal.accent.clone() },
    uGain: { value: 1 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader,
    transparent: true, depthWrite: false, depthTest: false,
  });

  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;   // le shader deplace tout : la boite d'origine ne vaut rien
  scene.add(points);

  function applyTheme() {
    uniforms.uBase.value.copy(pal.particle);
    uniforms.uAccent.value.copy(pal.accent);
    // Sur fond sombre les points s'additionnent et brillent ; sur fond clair
    // l'addition tendrait vers le blanc et ferait disparaitre la forme.
    material.blending = pal.isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    uniforms.uGain.value = pal.isLight ? 1.15 : 0.95;
  }
  applyTheme();

  /* --------------------------------------------------- emplacements */

  const anchors = collectAnchors(document);
  const measured = [];
  const voirSec = document.getElementById('voir');
  const deciderSec = document.getElementById('decider');
  let voirP = 0;
  let deciderP = 0;
  let vh = window.innerHeight;
  let cw = 1;
  let ch = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    cw = Math.max(1, rect.width);
    ch = Math.max(1, rect.height);
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    // Pixels ecran par unite monde a distance 1, en pixels physiques.
    uniforms.uPxScale.value = camera.projectionMatrix.elements[5] * renderer.getDrawingBufferSize(_size).y * 0.5;
    dirty = true;
  }
  const _size = new THREE.Vector2();
  let dirty = true;
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const pinProgress = (el) => {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const travel = r.height - vh;
    return travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0;
  };

  /* ------------------------------------------------------- pointeur */

  const pointer = { x: -1e4, y: -1e4, last: -1e4, tiltX: 0, tiltY: 0, nx: 0, ny: 0 };
  const onPointer = (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.last = performance.now();
  };
  if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true });
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();

  /* --------------------------------------------------- suivi et HUD */

  const tracker = overlay?.querySelector('#tracker');
  const dots = overlay ? [...overlay.querySelectorAll('.tpath i')] : [];
  const pathLbl = overlay?.querySelector('#tpath-lbl');
  const box = { x: 0, y: 0, w: 0, h: 0, init: false, shown: -1, locked: null };
  const _v = new THREE.Vector3();
  const _m = [0, 0, 0];
  const _b = [0, 0, 0];

  function project(lx, ly, lz) {
    applyMat(V_VOIR, lx, ly, lz, _m);
    _v.set(_m[0], _m[1], _m[2]);
    points.localToWorld(_v);
    _v.project(camera);
    return [(_v.x * 0.5 + 0.5) * cw, (-_v.y * 0.5 + 0.5) * ch];
  }

  function updateTracker(weight, dt, scalePx) {
    if (!tracker) return;
    if (weight < 0.02) {
      if (box.shown !== 0) { overlay.style.opacity = '0'; box.shown = 0; box.init = false; }
      return;
    }
    birdPath(simTime, _b);
    const [tx, ty] = project(BIRD.base[0] + _b[0], BIRD.base[1] + _b[1] + 0.03, BIRD.base[2] + _b[2]);
    const w = scalePx * 0.9;
    const h = scalePx * 0.36;
    // Le cadre arrive en retard sur la cible : c'est un suivi, pas un calque.
    const k = box.init ? Math.min(1, dt * 7) : 1;
    box.x += (tx - box.x) * k;
    box.y += (ty - box.y) * k;
    box.w += (w - box.w) * k;
    box.h += (h - box.h) * k;
    box.init = true;
    tracker.style.transform = `translate3d(${(box.x - box.w / 2).toFixed(1)}px, ${(box.y - box.h / 2).toFixed(1)}px, 0)`;
    tracker.style.width = `${box.w.toFixed(1)}px`;
    tracker.style.height = `${box.h.toFixed(1)}px`;

    // Trajectoire predite : ou sera l'oiseau dans les secondes qui viennent.
    let last = null;
    for (let j = 0; j < dots.length; j++) {
      birdPath(simTime + (j + 1) * 0.34, _b);
      const [px, py] = project(BIRD.base[0] + _b[0], BIRD.base[1] + _b[1], BIRD.base[2] + _b[2]);
      dots[j].style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0)`;
      last = [px, py];
    }
    if (pathLbl && last) pathLbl.style.transform = `translate3d(${(last[0] + 14).toFixed(1)}px, ${(last[1] - 8).toFixed(1)}px, 0)`;

    const locked = voirP > 0.12 || reduced;
    if (locked !== box.locked) { tracker.classList.toggle('is-locked', locked); box.locked = locked; }
    const op = Math.round(weight * 100) / 100;
    if (op !== box.shown) { overlay.style.opacity = String(op); box.shown = op; }
  }

  const hudState = hud?.querySelector('#hud-state');
  const hudMetric = hud?.querySelector('#hud-metric');
  const hudDot = hud?.querySelector('#hud-dot');
  let hudDict = null;
  let hudKey = '';
  let hudLive = null;

  function updateHud(dominant, decided) {
    if (!hud) return;
    let key = null;
    if (dominant === SHAPE.voir) key = 'track';
    else if (dominant === SHAPE.ecoute) key = 'listen';
    else if (dominant === SHAPE.turbine) key = decided ? 'stop' : 'run';
    const live = key !== null;
    if (live !== hudLive) { hud.classList.toggle('is-live', live); hudLive = live; }
    if (!key) return;
    const sig = `${key}|${hudDict ? 'en' : 'fr'}`;
    if (sig === hudKey) return;
    hudKey = sig;
    if (hudState) hudState.textContent = hudDict?.[`hud.${key}`] ?? HUD_FR[key][0];
    if (hudMetric) hudMetric.textContent = hudDict?.[`hud.${key}Metric`] ?? HUD_FR[key][1];
    const alert = key === 'stop';
    if (hudState) hudState.dataset.alert = String(alert);
    if (hudDot) hudDot.dataset.alert = String(alert);
  }

  document.addEventListener('lang:change', (e) => {
    hudDict = e.detail?.dict || null;
    hudKey = '';
  });

  /* ------------------------------------------------------- prenom */

  async function writeName() {
    try {
      if (document.fonts?.load) await document.fonts.load('800 220px Archivo');
    } catch (e) { /* police indisponible : repli systeme */ }
    const arr = sampleText('Alexandre', N);
    const attr = geo.getAttribute('aP6');
    attr.array.set(arr);
    attr.needsUpdate = true;
    data.extents[SHAPE.name] = extentsOf(SHAPE.name, arr);
    dirty = true;
  }
  writeName();

  /* ------------------------------------------------------------ etat */

  let simTime = reduced ? 2.0 : 0;
  let intro = reduced ? 1 : 0;
  let rotorSpeed = ROTOR_RUN;
  let rotor = 0;
  let wasDecided = false;
  let alertT = 99;
  let lastSig = '';
  let lastShape = -1;

  const api = {
    renderer, scene, camera, points, data,

    /** Phase de lecture : toutes les mesures de la page, avant toute ecriture. */
    read(frame) {
      vh = frame.vh || window.innerHeight;
      measured.length = 0;
      for (const a of anchors) {
        const m = measureAnchor(a, a.el.getBoundingClientRect(), vh, cw, ch);
        if (m) measured.push(m);
      }
      voirP = pinProgress(voirSec);
      deciderP = pinProgress(deciderSec);
    },

    /** Phase d'ecriture : uniformes, rendu, puis calques HTML. */
    render(frame) {
      const dt = frame.dt || 0.016;
      const story = resolveStory(measured, vh / 2);
      if (!story) return;

      let k = ease(story.t);
      if (reduced) k = k < 0.5 ? 0 : 1;
      const A = story.a.shape;
      const B = story.b.shape;
      const lay = blendLayout(story, k, data.extents);
      const dominant = k < 0.5 ? A : B;

      if (!reduced) {
        simTime += dt;
        intro = Math.min(1, intro + dt / 2.6);
      }

      // Decision : la consigne part au premier tiers du chapitre.
      const turbineOn = A === SHAPE.turbine || B === SHAPE.turbine;
      const decided = turbineOn && deciderP > 0.33;
      if (decided && !wasDecided) alertT = 0;
      wasDecided = decided;
      alertT += reduced ? 99 : dt;
      const target = decided ? 0.04 : ROTOR_RUN;
      rotorSpeed += (target - rotorSpeed) * Math.min(1, dt * (decided ? 0.75 : 1.4));
      if (reduced) rotorSpeed = target;
      rotor += rotorSpeed * (reduced ? 0 : dt);

      // En mouvement reduit, on ne redessine que si quelque chose a change.
      if (reduced) {
        const sig = `${A}|${B}|${k}|${lay.cx | 0}|${lay.cy | 0}|${lay.s | 0}|${decided}`;
        if (sig === lastSig && !dirty) return;
        lastSig = sig;
      }
      dirty = false;

      const worldPerPx = (2 * DIST * Math.tan((FOV * Math.PI) / 360)) / ch;
      const s = lay.s * worldPerPx;
      points.position.set((lay.cx - cw / 2) * worldPerPx, -(lay.cy - ch / 2) * worldPerPx, 0);
      points.scale.setScalar(s);

      // Leger suivi du pointeur : la forme pivote vers la main.
      const recent = !reduced && performance.now() - pointer.last < 2500;
      pointer.tiltY += ((recent ? pointer.nx * 0.09 : 0) - pointer.tiltY) * Math.min(1, dt * 2.5);
      pointer.tiltX += ((recent ? pointer.ny * 0.05 : 0) - pointer.tiltX) * Math.min(1, dt * 2.5);
      points.rotation.set(pointer.tiltX, pointer.tiltY, 0);
      points.updateMatrixWorld(true);

      const u = uniforms;
      u.uTime.value = simTime;
      u.uA.value = A;
      u.uB.value = B;
      u.uT.value = A === B ? 0 : k;
      u.uIntro.value = intro;
      u.uScroll.value = ((frame.scrollY || 0) * 2.3) / ch;
      u.uGroupScale.value = s;
      birdPath(simTime, _b);
      u.uBird.value.set(_b[0], _b[1], _b[2]);
      u.uRotor.value = rotor;
      u.uStopped.value = Math.max(0, Math.min(1, 1 - rotorSpeed / ROTOR_RUN));
      u.uAlert.value = Math.exp(-alertT * 1.1);
      u.uWave.value = 0.12 + Math.min(1.3, alertT * 0.8);

      if (recent && pointer.x > -1e3) {
        ndc.set((pointer.x / cw) * 2 - 1, -(pointer.y / ch) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        if (raycaster.ray.intersectPlane(plane, hit)) {
          points.worldToLocal(hit);
          u.uPointer.value.copy(hit);
        }
      }
      u.uPointerK.value += ((recent ? 1 : 0) - u.uPointerK.value) * Math.min(1, dt * 3);

      renderer.render(scene, camera);

      const wVoir = (A === SHAPE.voir ? 1 - k : 0) + (B === SHAPE.voir && A !== B ? k : 0);
      updateTracker(wVoir, dt, lay.s);
      updateHud(dominant, decided);

      // Expose la forme dominante : les tests lisent cet attribut.
      if (dominant !== lastShape) { canvas.dataset.shape = SHAPES[dominant]; lastShape = dominant; }
    },

    /** Relit les tokens CSS, sans rebatir la scene. */
    retint() {
      pal = readPalette();
      applyTheme();
      dirty = true;
    },

    dispose() {
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      geo.dispose();
      material.dispose();
      renderer.dispose();
    },
  };

  return api;
}
