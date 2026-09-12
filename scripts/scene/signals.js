/**
 * signals.js
 * Les trois canaux capteur poses autour de la carte, et les impulsions qui
 * courent sur les pistes cuivre.
 *
 *   vision      un cadre qui balaie et verrouille une cible
 *   acoustique  une forme d'onde qui vit
 *   radar       un balayage tournant avec ses echos
 *
 * Chacun est un petit module autonome : une embase, son organe, sa mise a jour.
 */

import * as THREE from 'three';
import { SURFACE } from './board.js';

/* ------------------------------------------------------------ commun */

function pedestal(mat, w = 7, d = 7, h = 3.2) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.y = SURFACE + h / 2;
  return m;
}

function rectOutline(w, h, mat) {
  const pts = [
    new THREE.Vector3(-w / 2, -h / 2, 0), new THREE.Vector3(w / 2, -h / 2, 0),
    new THREE.Vector3(w / 2, h / 2, 0), new THREE.Vector3(-w / 2, h / 2, 0),
  ];
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat);
}

/* ------------------------------------------------------------ vision */

function visionModule(pal, mats) {
  const group = new THREE.Group();
  group.position.set(-44, 0, 26);
  // Oriente vers la camera : 0,88 rad convient au plan large comme au plan
  // capteurs, qui arrivent tous deux par le quadrant +X +Z.
  group.rotation.y = 0.88;
  group.add(pedestal(mats.body, 9, 5, 3));

  const screen = new THREE.Group();
  screen.position.y = SURFACE + 10;
  group.add(screen);

  const W = 17;
  const H = 11;

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshBasicMaterial({
      color: pal.metal2, transparent: true, opacity: 0.95,
      side: THREE.DoubleSide, toneMapped: false,
    })
  );
  screen.add(panel);
  screen.add(rectOutline(W, H, mats.line));

  // Ligne de balayage : le capteur lit son image, en continu.
  const scan = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 0.6, 0.22),
    new THREE.MeshBasicMaterial({ color: pal.signal, transparent: true, opacity: 0.95, toneMapped: false })
  );
  scan.position.z = 0.05;
  screen.add(scan);

  const target = new THREE.Mesh(new THREE.CircleGeometry(0.8, 14), mats.solid);
  target.position.z = 0.08;
  screen.add(target);

  const lock = rectOutline(4.4, 4, mats.lock);
  lock.position.z = 0.12;
  screen.add(lock);

  const support = new THREE.Mesh(new THREE.BoxGeometry(0.7, 8, 0.7), mats.body);
  support.position.y = SURFACE + 5.5;
  group.add(support);

  let locked = false;
  return {
    group,
    get locked() { return locked; },
    update(dt, time) {
      scan.position.y = Math.sin(time * 1.4) * (H / 2 - 0.6);
      const tx = Math.sin(time * 0.74) * (W / 2 - 3);
      const ty = Math.sin(time * 0.51 + 1.1) * (H / 2 - 2.2);
      target.position.x = tx;
      target.position.y = ty;
      // Le cadre rattrape la cible, il ne colle jamais instantanement.
      lock.position.x += (tx - lock.position.x) * Math.min(1, dt * 4.5);
      lock.position.y += (ty - lock.position.y) * Math.min(1, dt * 4.5);
      locked = Math.hypot(tx - lock.position.x, ty - lock.position.y) < 0.5;
      mats.lock.opacity = locked ? 0.95 : 0.4;
    },
  };
}

/* -------------------------------------------------------- acoustique */

function audioModule(pal, mats, detail) {
  const group = new THREE.Group();
  group.position.set(-40, 0, -26);
  group.rotation.y = -0.35;
  group.add(pedestal(mats.body, 9, 5, 3));

  const N = detail ? 72 : 40;
  const SPAN = 20;
  const positions = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) positions[i * 3] = -SPAN / 2 + SPAN * (i / (N - 1));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const wave = new THREE.Line(geo, mats.wave);
  wave.position.y = SURFACE + 8;
  wave.frustumCulled = false;
  group.add(wave);

  const axis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-SPAN / 2, 0, 0), new THREE.Vector3(SPAN / 2, 0, 0),
    ]),
    mats.line
  );
  axis.position.y = SURFACE + 8;
  group.add(axis);

  const support = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.5, 0.7), mats.body);
  support.position.y = SURFACE + 4.7;
  group.add(support);

  let energy = 0;
  return {
    group,
    get energy() { return energy; },
    update(dt, time) {
      // Trois sinusoides en battement : l'enveloppe respire au lieu de boucler.
      const env = 0.55 + 0.45 * Math.sin(time * 0.62);
      energy = env;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const x = positions[i * 3];
        positions[i * 3 + 1] =
          (Math.sin(u * 21 - time * 6.2) * 1.5 +
            Math.sin(u * 47 + time * 3.4) * 0.7 +
            Math.sin(u * 9 - time * 1.9) * 0.9) * env *
          Math.sin(u * Math.PI);                 // extremites amorties
        positions[i * 3 + 2] = 0;
        void x;
      }
      geo.getAttribute('position').needsUpdate = true;
    },
  };
}

/* -------------------------------------------------------------- radar */

function radarModule(pal, mats, detail) {
  const group = new THREE.Group();
  group.position.set(28, 0, -30);
  group.add(pedestal(mats.body, 6, 6, 2.4));

  const head = new THREE.Group();
  head.position.y = SURFACE + 3.2;
  group.add(head);

  for (const r of [4, 8, 12]) {
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 0, r, 0, Math.PI * 2, false).getSpacedPoints(detail ? 48 : 24)
      ),
      mats.line
    );
    ring.rotation.x = -Math.PI / 2;
    head.add(ring);
  }

  // Secteur balaye : degrade par couleur de sommet, bord d'attaque lumineux.
  const arc = 0.5;
  const segs = detail ? 24 : 12;
  const R = 12;
  const pos = [0, 0, 0];
  const col = [];
  const c = new THREE.Color();
  c.copy(pal.signal);
  col.push(c.r, c.g, c.b);
  for (let i = 0; i <= segs; i++) {
    const k = i / segs;
    const a = -arc / 2 + arc * k;
    pos.push(Math.cos(a) * R, 0, Math.sin(a) * R);
    c.copy(pal.fog).lerp(pal.signal, Math.pow(k, 2.2) * 0.9);
    col.push(c.r, c.g, c.b);
  }
  const idx = [];
  for (let i = 1; i <= segs; i++) idx.push(0, i, i + 1);

  const sweepGeo = new THREE.BufferGeometry();
  sweepGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sweepGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  sweepGeo.setIndex(idx);
  const sweep = new THREE.Mesh(sweepGeo, mats.sweep);
  sweep.position.y = 0.1;
  head.add(sweep);

  const blips = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.5, 8), mats.solid);
    b.rotation.x = -Math.PI / 2;
    b.position.set(Math.cos(i * 2.1) * (5 + i * 2.5), 0.15, Math.sin(i * 2.1) * (5 + i * 2.5));
    head.add(b);
    blips.push(b);
  }

  return {
    group,
    update(dt, time) {
      sweep.rotation.y -= dt * 1.15;
      for (let i = 0; i < blips.length; i++) {
        blips[i].scale.setScalar(0.7 + 0.5 * Math.abs(Math.sin(time * 1.3 + i * 2)));
      }
    },
  };
}

/* --------------------------------------------------------- impulsions */

function createPulses(pal, traces, mats) {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.55, 0.45, 3.2);
  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const channels = {};
  for (const [name, trace] of Object.entries(traces)) {
    const pool = [];
    for (let i = 0; i < 4; i++) {
      const mesh = new THREE.Mesh(geo, mats.pulse);
      mesh.visible = false;
      group.add(mesh);
      pool.push({ mesh, t: 0, alive: false });
    }
    channels[name] = {
      trace, pool, active: false, timer: 0,
      period: name === 'output' ? 999 : 0.85,
      speed: name === 'output' ? 0.55 : 0.42,
      onArrive: null,
    };
  }

  return {
    group,
    setActive(name, on) {
      const ch = channels[name];
      if (!ch || ch.active === on) return;
      ch.active = on;
      if (on) ch.timer = ch.period;     // emission immediate
    },
    /** Lance une impulsion unique, utilisee pour la commande de sortie. */
    fire(name, onArrive) {
      const ch = channels[name];
      if (!ch) return;
      const slot = ch.pool.find((p) => !p.alive);
      if (!slot) return;
      slot.alive = true;
      slot.t = 0;
      ch.onArrive = onArrive || null;
    },
    update(dt) {
      for (const ch of Object.values(channels)) {
        if (ch.active) {
          ch.timer += dt;
          if (ch.timer >= ch.period) {
            ch.timer = 0;
            const slot = ch.pool.find((p) => !p.alive);
            if (slot) { slot.alive = true; slot.t = 0; }
          }
        }
        for (const p of ch.pool) {
          if (!p.alive) { p.mesh.visible = false; continue; }
          p.t += dt * ch.speed;
          if (p.t >= 1) {
            p.alive = false;
            p.mesh.visible = false;
            if (ch.onArrive) { const cb = ch.onArrive; ch.onArrive = null; cb(); }
            continue;
          }
          ch.trace.pointAt(p.t, tmp);
          ch.trace.directionAt(p.t, dir);
          p.mesh.position.copy(tmp);
          p.mesh.lookAt(tmp.clone().add(dir));
          p.mesh.visible = true;
        }
      }
    },
  };
}

/* ------------------------------------------------------------- module */

export function createSignals(pal, traces, options = {}) {
  const detail = options.detail ?? 1;

  const mats = {
    body: new THREE.MeshStandardMaterial({ color: pal.metal2, roughness: 0.6, metalness: 0.3 }),
    line: new THREE.LineBasicMaterial({ color: pal.rim, transparent: true, opacity: 0.85, toneMapped: false }),
    wave: new THREE.LineBasicMaterial({ color: pal.signal, transparent: true, opacity: 0.95, toneMapped: false }),
    lock: new THREE.LineBasicMaterial({ color: pal.signal, transparent: true, opacity: 0.4, toneMapped: false }),
    solid: new THREE.MeshBasicMaterial({ color: pal.signal, side: THREE.DoubleSide, toneMapped: false }),
    sweep: new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      toneMapped: false, opacity: pal.isLight ? 0.3 : 0.3,
      blending: pal.isLight ? THREE.NormalBlending : THREE.AdditiveBlending,
    }),
    pulse: new THREE.MeshBasicMaterial({ color: pal.signal, toneMapped: false }),
  };

  const group = new THREE.Group();
  const vision = visionModule(pal, mats);
  const audio = audioModule(pal, mats, detail);
  const radar = radarModule(pal, mats, detail);
  const pulses = createPulses(pal, traces, mats);
  group.add(vision.group, audio.group, radar.group, pulses.group);

  return {
    group,
    vision,
    audio,
    radar,
    pulses,
    materials: mats,
    anchors: { vision: vision.group, audio: audio.group, radar: radar.group },
    update(dt, time) {
      vision.update(dt, time);
      audio.update(dt, time);
      radar.update(dt, time);
      pulses.update(dt);
    },
    retint(next) {
      mats.body.color.copy(next.metal2);
      mats.line.color.copy(next.rim);
      mats.wave.color.copy(next.signal);
      mats.lock.color.copy(next.signal);
      mats.solid.color.copy(next.signal);
      mats.pulse.color.copy(next.signal);
      mats.sweep.opacity = next.isLight ? 0.3 : 0.22;
      mats.sweep.blending = next.isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
      mats.sweep.needsUpdate = true;
    },
  };
}
