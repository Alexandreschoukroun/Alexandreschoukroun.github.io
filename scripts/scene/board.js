/**
 * board.js
 * La carte electronique : substrat, SoC central, composants, et les pistes
 * cuivre qui relient les capteurs au calculateur puis la sortie a la machine.
 *
 * Les pistes sont routees en angles droits, comme un vrai routage Manhattan.
 * Chaque piste sait donner un point a une abscisse curviligne donnee, ce qui
 * permet d'y faire courir des impulsions (voir signals.js).
 */

import * as THREE from 'three';

export const SURFACE = 0.9;        // hauteur de la face superieure du PCB
const TRACE_Y = SURFACE + 0.06;
const TRACE_W = 0.55;

/* ------------------------------------------------------------- pistes */

export class Trace {
  /** @param {Array<[number, number]>} points sommets du routage, en X et Z */
  constructor(points) {
    this.points = points.map(([x, z]) => new THREE.Vector3(x, TRACE_Y, z));
    this.segments = [];
    let total = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];
      const len = a.distanceTo(b);
      this.segments.push({ a, b, len, start: total });
      total += len;
    }
    this.length = total || 1;
  }

  /** Position a l'abscisse t dans [0, 1], repartie sur la longueur reelle. */
  pointAt(t, target) {
    const d = Math.max(0, Math.min(1, t)) * this.length;
    const segs = this.segments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (d <= s.start + s.len || i === segs.length - 1) {
        const k = s.len > 0 ? (d - s.start) / s.len : 0;
        return target.copy(s.a).lerp(s.b, Math.max(0, Math.min(1, k)));
      }
    }
    return target.copy(this.points[this.points.length - 1]);
  }

  /** Direction locale, pour orienter une impulsion dans le sens du flux. */
  directionAt(t, target) {
    const d = Math.max(0, Math.min(1, t)) * this.length;
    for (let i = 0; i < this.segments.length; i++) {
      const s = this.segments[i];
      if (d <= s.start + s.len || i === this.segments.length - 1) {
        return target.subVectors(s.b, s.a).normalize();
      }
    }
    return target.set(1, 0, 0);
  }
}

function traceMesh(trace, mat) {
  const group = new THREE.Group();
  for (const s of trace.segments) {
    const dx = Math.abs(s.b.x - s.a.x);
    const dz = Math.abs(s.b.z - s.a.z);
    // Routage Manhattan : chaque segment est aligne sur un axe, pas de rotation.
    const geo = new THREE.BoxGeometry(
      dx > dz ? s.len + TRACE_W : TRACE_W,
      0.12,
      dz >= dx ? s.len + TRACE_W : TRACE_W
    );
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set((s.a.x + s.b.x) / 2, TRACE_Y, (s.a.z + s.b.z) / 2);
    group.add(mesh);
  }
  // Vias aux changements de direction : le detail qui fait vrai.
  const viaGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.26, 10);
  for (let i = 1; i < trace.points.length - 1; i++) {
    const via = new THREE.Mesh(viaGeo, mat);
    via.position.copy(trace.points[i]);
    group.add(via);
  }
  return group;
}

/* ---------------------------------------------------------- le SoC */

function createChip(pal, mats, detail) {
  const chip = new THREE.Group();

  const body = new THREE.Mesh(new THREE.BoxGeometry(18, 2.6, 18), mats.package);
  body.position.y = SURFACE + 1.3;
  chip.add(body);

  // Die expose sur le dessus, legerement emissif : c'est la ou ca calcule.
  const die = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 10), mats.die);
  die.position.y = SURFACE + 2.85;
  chip.add(die);

  const notch = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.3, 12), mats.trim);
  notch.position.set(-6.6, SURFACE + 2.75, -6.6);
  chip.add(notch);

  // Broches : un seul InstancedMesh pour les quatre rangees.
  const perSide = detail ? 13 : 7;
  const pins = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.42, 0.5, 1.5), mats.trim, perSide * 4
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);
  let n = 0;
  for (let side = 0; side < 4; side++) {
    q.setFromAxisAngle(up, (side * Math.PI) / 2);
    for (let i = 0; i < perSide; i++) {
      const k = (i / (perSide - 1) - 0.5) * 15;
      const v = new THREE.Vector3(k, SURFACE + 0.35, 9.6).applyQuaternion(q);
      m.compose(v, q, one);
      pins.setMatrixAt(n++, m);
    }
  }
  pins.instanceMatrix.needsUpdate = true;
  chip.add(pins);

  return { group: chip, die, body };
}

/* ------------------------------------------------------------ module */

export function createBoard(pal, options = {}) {
  const detail = options.detail ?? 1;
  const group = new THREE.Group();

  const mats = {
    substrate: new THREE.MeshStandardMaterial({
      color: pal.metal, roughness: 0.86, metalness: 0.05,
    }),
    package: new THREE.MeshStandardMaterial({
      color: pal.metal2, roughness: 0.52, metalness: 0.25,
    }),
    trim: new THREE.MeshStandardMaterial({
      color: pal.rim, roughness: 0.38, metalness: 0.6,
    }),
    copper: new THREE.MeshStandardMaterial({
      color: pal.signal, roughness: 0.42, metalness: 0.5,
      emissive: pal.signal, emissiveIntensity: pal.isLight ? 0 : 0.12,
    }),
    die: new THREE.MeshStandardMaterial({
      color: pal.metal2, roughness: 0.3, metalness: 0.15,
      emissive: pal.signal, emissiveIntensity: pal.isLight ? 0.06 : 0.22,
    }),
  };

  // --- Substrat ----------------------------------------------------------
  const substrate = new THREE.Mesh(new THREE.BoxGeometry(124, 1.8, 84), mats.substrate);
  substrate.position.y = SURFACE - 0.9;
  group.add(substrate);

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(124, 1.8, 84)),
    new THREE.LineBasicMaterial({ color: pal.grid, transparent: true, opacity: 0.55 })
  );
  outline.position.copy(substrate.position);
  group.add(outline);

  // --- Pistes ------------------------------------------------------------
  const traces = {
    vision: new Trace([[-44, 26], [-26, 26], [-26, 6], [-9, 6]]),
    audio: new Trace([[-40, -26], [-24, -26], [-24, -6], [-9, -6]]),
    radar: new Trace([[28, -30], [28, -18], [0, -18], [0, -9]]),
    output: new Trace([[9, 0], [34, 0], [34, 14], [54, 14]]),
  };
  for (const t of Object.values(traces)) group.add(traceMesh(t, mats.copper));

  // --- SoC ---------------------------------------------------------------
  const chip = createChip(pal, mats, detail);
  group.add(chip.group);

  // --- Composants passifs, pour la texture -------------------------------
  // Positions fixes et choisies : une dispersion aleatoire se voit tout de suite.
  const parts = [
    [-52, 8, 3.4, 1.6], [-52, 14, 3.4, 1.6], [-52, 20, 3.4, 1.6],
    [22, 24, 5, 2.4], [30, 24, 5, 2.4], [38, 24, 5, 2.4],
    [-14, 30, 2.2, 2.2], [-6, 30, 2.2, 2.2], [2, 30, 2.2, 2.2],
    [44, -8, 6, 6], [44, -20, 4, 4],
    [-52, -12, 5, 2.4], [-52, -18, 5, 2.4],
    [18, 34, 8, 3], [-34, -36, 7, 3],
  ];
  for (const [x, z, w, d] of parts) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, d), mats.package);
    part.position.set(x, SURFACE + 0.55, z);
    group.add(part);
  }

  // Connecteur en bord de carte, la ou la commande quitte le PCB
  const connector = new THREE.Mesh(new THREE.BoxGeometry(5, 2.6, 9), mats.trim);
  connector.position.set(57, SURFACE + 1.3, 14);
  group.add(connector);

  return {
    group,
    traces,
    chip,
    materials: mats,
    anchors: { chip: chip.body, connector },
  };
}
