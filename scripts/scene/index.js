/**
 * scene/index.js
 * Assemble la scene : une carte electronique, trois canaux capteur qui
 * convergent vers le SoC, et une commande qui ressort vers la machine.
 *
 * C'est le metier represente litteralement : capteur, calcul temps reel,
 * decision. L'eolienne n'est plus le sujet, seulement ce que le code pilote.
 *
 * Le module ne possede pas sa propre boucle. Il expose `render(dt, time)` que
 * la boucle unique de la page appelle, et `setProgress(p)` que le defilement
 * alimente. Le rendu est suspendu des que le bloc sort du viewport.
 */

import * as THREE from 'three';
import { readPalette } from './palette.js';
import { createBoard } from './board.js';
import { createSignals } from './signals.js';
import { createPipeline } from './pipeline.js';
import { createTurbine } from './turbine.js';
import { createTerrain } from './terrain.js';
import { createRig } from './camera-rig.js';

const MACHINE = { x: 74, z: 14, scale: 0.34 };

const ANNO_WINDOWS = {
  vision: [0.34, 0.62],
  chip: [0.60, 0.86],
  machine: [0.82, 1.01],
};

/** Fondu doux aux deux bords d'une fenetre de progression. */
function windowFade(p, [from, to]) {
  const edge = 0.05;
  if (p < from - edge || p > to + edge) return 0;
  const inFade = Math.min(1, Math.max(0, (p - (from - edge)) / edge));
  const outFade = Math.min(1, Math.max(0, ((to + edge) - p) / edge));
  return Math.min(inFade, outFade);
}

function createSky(pal) {
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const colors = [];
  const pos = geo.getAttribute('position');
  const c = new THREE.Color();
  const top = pal.bg.clone().lerp(pal.metal, pal.isLight ? 0.10 : 0.06);
  const horizon = pal.bg.clone().lerp(pal.key, pal.isLight ? 0.26 : 0.09);

  for (let i = 0; i < pos.count; i++) {
    const k = Math.min(1, Math.max(0, pos.getY(i) / 900));
    c.copy(horizon).lerp(top, Math.pow(Math.max(0, k), 0.6));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
  return new THREE.Mesh(geo, mat);
}

export function createScene({ canvas, annoRoot, hud, reduced = false, mobile = false }) {
  let pal = readPalette();
  const detail = mobile ? 0 : 1;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobile,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.4 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // ACES ecrase les tons moyens : sans exposition relevee, un decor sombre
  // s'effondre en aplat noir et la machine disparait completement.
  renderer.toneMappingExposure = pal.isLight ? 1.15 : 1.35;

  const scene = new THREE.Scene();
  scene.background = pal.bg.clone();
  scene.fog = new THREE.Fog(pal.fog.clone(), 130, 520);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 2000);
  const rig = createRig(camera);

  // --- Lumieres ------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(pal.key, pal.grid, pal.isLight ? 1.3 : 1.15);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(pal.key, pal.isLight ? 1.4 : 2.4);
  key.position.set(60, 110, 70);
  scene.add(key);

  const rim = new THREE.DirectionalLight(pal.rim, pal.isLight ? 0.35 : 1.25);
  rim.position.set(-90, 40, -80);
  scene.add(rim);

  // --- Decor ---------------------------------------------------------------
  const sky = createSky(pal);
  scene.add(sky);

  const terrainOpts = { extent: mobile ? 460 : 620, step: mobile ? 32 : 26 };
  const terrain = createTerrain(pal, terrainOpts);
  terrain.object.position.y = -46;   // plan de reference loin sous la carte
  scene.add(terrain.object);

  // --- Carte, capteurs, machine -------------------------------------------
  const board = createBoard(pal, { detail });
  scene.add(board.group);

  const signals = createSignals(pal, board.traces, { detail });
  scene.add(signals.group);

  const machine = createTurbine(pal, { detail, scale: MACHINE.scale, compact: true });
  machine.group.position.set(MACHINE.x, 0, MACHINE.z);
  machine.group.rotation.y = -0.5;
  scene.add(machine.group);

  // Liaison visuelle entre le connecteur de la carte et le pied de la machine
  const link = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(61, 0.96, 14),
      new THREE.Vector3(MACHINE.x, 0.96, MACHINE.z),
    ]),
    new THREE.LineBasicMaterial({ color: pal.signal, transparent: true, opacity: 0.45 })
  );
  scene.add(link);

  const pipeline = createPipeline({ signals, die: board.chip.die, palette: pal });

  // --- Annotations HTML ancrees sur des points 3D --------------------------
  const anchorFor = {
    vision: signals.anchors.vision,
    chip: board.anchors.chip,
    machine: machine.anchors.machine,
  };
  const annos = annoRoot
    ? [...annoRoot.querySelectorAll('.anno')].map((el) => ({
      el,
      anchor: anchorFor[el.dataset.anchor],
      window: ANNO_WINDOWS[el.dataset.anchor] || [0, 0],
      shown: -1,
    }))
    : [];

  // --- HUD -----------------------------------------------------------------
  const hudState = hud?.querySelector('#hud-state');
  const hudMetric = hud?.querySelector('#hud-metric');
  const hudDot = hud?.querySelector('#hud-dot');
  let lastHud = '';

  // Le HUD est ecrit par le pipeline, pas par le HTML : il ne peut donc pas
  // porter de data-i18n. Il lit le dictionnaire au changement de langue.
  let hudDict = null;
  document.addEventListener('lang:change', (e) => {
    hudDict = e.detail?.dict || null;
    lastHud = '';
    updateHud();
  });

  // --- Etat ----------------------------------------------------------------
  const ndc = new THREE.Vector3();
  let rotorSpeed = 1;
  let progress = 0;
  let visible = true;
  let width = 1;
  let height = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const vis = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  vis.observe(canvas);

  function updateAnnos() {
    for (const a of annos) {
      if (!a.anchor) continue;
      const alpha = windowFade(progress, a.window);
      if (alpha <= 0.001) {
        if (a.shown !== 0) { a.el.style.opacity = '0'; a.shown = 0; }
        continue;
      }
      a.anchor.getWorldPosition(ndc);
      ndc.project(camera);
      const behind = ndc.z > 1;
      const x = (ndc.x * 0.5 + 0.5) * width;
      const y = (-ndc.y * 0.5 + 0.5) * height;
      a.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      a.el.style.opacity = behind ? '0' : alpha.toFixed(3);
      a.shown = alpha;
    }
  }

  function updateHud() {
    if (!hudState || !hudMetric) return;
    const line = `${pipeline.stage}|${hudDict ? 'en' : 'fr'}`;
    if (line === lastHud) return;
    lastHud = line;

    hudState.textContent = hudDict?.[`hud.${pipeline.stage}`] ?? pipeline.label;
    hudMetric.textContent = hudDict?.[`hud.${pipeline.stage}Metric`] ?? pipeline.metric;
    const alert = pipeline.alert;
    hudState.dataset.alert = String(alert);
    if (hudDot) hudDot.dataset.alert = String(alert);
  }

  const api = {
    renderer,
    rig,
    scene,
    camera,

    setProgress(p) {
      progress = Math.max(0, Math.min(1, p));
      rig.setProgress(progress);
    },

    render(dt, time) {
      if (!visible) return;

      pipeline.update(dt, time);

      rotorSpeed += (pipeline.rotorTarget - rotorSpeed) * Math.min(1, dt * 1.3);
      machine.rotor.rotation.z += dt * rotorSpeed * 1.15;
      machine.discMat.opacity = pipeline.alert ? 0.5 : 0.2;

      rig.update(dt, time);
      updateAnnos();
      updateHud();

      renderer.render(scene, camera);
    },

    /** Un seul rendu fige, pour prefers-reduced-motion. */
    still(p = 0.08) {
      rig.snap(p);
      progress = p;
      pipeline.update(0.016, 0);
      updateAnnos();
      updateHud();
      renderer.render(scene, camera);
    },

    /** Relit les tokens CSS et reapplique les couleurs sans rebatir la scene. */
    retint() {
      pal = readPalette();
      scene.background = pal.bg.clone();
      scene.fog.color.copy(pal.fog);
      renderer.toneMappingExposure = pal.isLight ? 1.15 : 1.35;

      hemi.color.copy(pal.key); hemi.groundColor.copy(pal.grid);
      hemi.intensity = pal.isLight ? 1.3 : 1.15;
      key.color.copy(pal.key); key.intensity = pal.isLight ? 1.4 : 2.4;
      rim.color.copy(pal.rim); rim.intensity = pal.isLight ? 0.35 : 1.25;

      const bm = board.materials;
      bm.substrate.color.copy(pal.metal);
      bm.package.color.copy(pal.metal2);
      bm.trim.color.copy(pal.rim);
      bm.copper.color.copy(pal.signal);
      bm.copper.emissive.copy(pal.signal);
      bm.copper.emissiveIntensity = pal.isLight ? 0 : 0.12;
      bm.die.color.copy(pal.metal2);
      bm.die.emissive.copy(pal.signal);

      machine.materials.shell.color.copy(pal.metal);
      machine.materials.trim.color.copy(pal.metal2);
      machine.materials.signal.color.copy(pal.signal);
      machine.materials.signal.emissive.copy(pal.signal);
      machine.materials.discMat.color.copy(pal.grid);
      link.material.color.copy(pal.signal);

      signals.retint(pal);
      pipeline.setPalette(pal);

      sky.geometry.dispose();
      sky.material.dispose();
      const nextSky = createSky(pal);
      sky.geometry = nextSky.geometry;
      sky.material = nextSky.material;

      terrain.object.geometry.dispose();
      const nextTerrain = createTerrain(pal, terrainOpts);
      terrain.object.geometry = nextTerrain.geometry;
      nextTerrain.material.dispose();
      terrain.material.opacity = pal.isLight ? 0.55 : 0.4;

      if (reduced) api.still(progress);
    },

    dispose() {
      ro.disconnect();
      vis.disconnect();
      rig.dispose();
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
      renderer.dispose();
    },
  };

  return api;
}
