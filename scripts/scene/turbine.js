/**
 * turbine.js
 * Eolienne construite par programme : mat, nacelle, moyeu, trois pales.
 *
 * Les pales ne sont pas des cones. Chaque pale est un loft : une suite de
 * sections elliptiques cambrees dont la corde, l'epaisseur et le vrillage
 * varient le long de l'envergure, comme un vrai profil. C'est ce qui donne la
 * silhouette qui change quand la pale tourne.
 *
 * En mode `compact`, le mat est nu : dans la scene principale l'eolienne n'est
 * qu'un composant en bout de chaine, la machine que le code pilote. Les organes
 * embarques, eux, sont sur la carte (voir board.js).
 */

import * as THREE from 'three';

const TOWER_H = 30;
const BLADE_L = 27;

/** Section transversale du profil, a la position `t` sur l'envergure. */
function profileAt(t, opt) {
  const widen = Math.min(1, t / 0.12);                  // epaississement rapide au pied
  const taper = Math.pow(1 - t, 0.7);                   // effilement vers le bout
  const chord = opt.tipChord + (opt.rootChord - opt.tipChord) * widen * taper;
  const thick = chord * (0.34 - 0.18 * t) + 0.02;
  const twist = opt.twist * Math.pow(1 - t, 1.7);       // vrillage maximal au pied
  return { chord, thick, twist };
}

function bladeGeometry(opt) {
  const { spanSeg, profSeg, length } = opt;
  const pos = [];
  const idx = [];

  for (let i = 0; i <= spanSeg; i++) {
    const t = i / spanSeg;
    const { chord, thick, twist } = profileAt(t, opt);
    const ct = Math.cos(twist);
    const st = Math.sin(twist);
    const y = t * length;

    for (let j = 0; j < profSeg; j++) {
      const a = (j / profSeg) * Math.PI * 2;
      const x = Math.cos(a) * chord * 0.5;
      let z = Math.sin(a) * thick * 0.5;
      // Cambrure : on gonfle l'extrados, pas l'intrados.
      z += 0.24 * thick * Math.max(0, Math.sin(a));
      pos.push(x * ct - z * st, y, x * st + z * ct);
    }
  }

  for (let i = 0; i < spanSeg; i++) {
    for (let j = 0; j < profSeg; j++) {
      const a = i * profSeg + j;
      const b = i * profSeg + ((j + 1) % profSeg);
      const c = (i + 1) * profSeg + ((j + 1) % profSeg);
      const d = (i + 1) * profSeg + j;
      idx.push(a, b, c, a, c, d);
    }
  }

  // Capuchon au pied
  const rootC = pos.length / 3;
  pos.push(0, 0, 0);
  for (let j = 0; j < profSeg; j++) idx.push(rootC, (j + 1) % profSeg, j);

  // Capuchon en bout
  const tipC = pos.length / 3;
  pos.push(0, length, 0);
  const base = spanSeg * profSeg;
  for (let j = 0; j < profSeg; j++) idx.push(tipC, base + j, base + ((j + 1) % profSeg));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * @param {object} pal      palette lue dans les tokens CSS
 * @param {object} options  { detail: 0 mobile | 1 bureau, scale }
 */
export function createTurbine(pal, options = {}) {
  const detail = options.detail ?? 1;
  const scale = options.scale ?? 1;
  const compact = options.compact ?? false;

  const shell = new THREE.MeshStandardMaterial({
    color: pal.metal,
    roughness: 0.62,
    metalness: 0.18,
    side: THREE.DoubleSide,
    flatShading: false,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: pal.metal2,
    roughness: 0.45,
    metalness: 0.35,
  });
  const signal = new THREE.MeshStandardMaterial({
    color: pal.signal,
    roughness: 0.5,
    metalness: 0.1,
    emissive: pal.signal,
    emissiveIntensity: pal.isLight ? 0.0 : 0.35,
  });

  const group = new THREE.Group();
  const seg = detail ? 26 : 14;

  // --- Mat -----------------------------------------------------------------
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 1.45, TOWER_H, seg, 1, true),
    shell
  );
  tower.position.y = TOWER_H / 2;
  group.add(tower);

  const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.2, 0.7, seg), trim);
  foot.position.y = 0.35;
  group.add(foot);

  // --- Nacelle -------------------------------------------------------------
  const nacelle = new THREE.Group();
  nacelle.position.y = TOWER_H + 0.6;
  group.add(nacelle);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(1.3, 3.4, 4, seg), shell);
  body.rotation.x = Math.PI / 2;
  body.position.z = -0.4;
  nacelle.add(body);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 1.9), trim);
  fin.position.set(0, 1.1, -2.6);
  nacelle.add(fin);

  let compute = null;
  if (!compact) {
    compute = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 2.1), trim);
    compute.position.set(0, -1.35, -1.1);
    nacelle.add(compute);

    const computeLed = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.16), signal);
    computeLed.position.set(0.78, -1.35, -0.2);
    nacelle.add(computeLed);
  }

  // --- Moyeu et rotor ------------------------------------------------------
  const rotor = new THREE.Group();
  rotor.position.z = 2.5;
  nacelle.add(rotor);

  const hub = new THREE.Mesh(new THREE.ConeGeometry(1.05, 2.1, seg), shell);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 1.0;
  rotor.add(hub);

  const bladeGeo = bladeGeometry({
    length: BLADE_L,
    rootChord: 2.9,
    tipChord: 0.5,
    spanSeg: detail ? 20 : 10,
    profSeg: detail ? 12 : 8,
    twist: 0.52,
  });

  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(bladeGeo, shell);
    blade.rotation.z = (i * Math.PI * 2) / 3;
    blade.rotation.x = -0.045;           // angle de cone, les pales s'ecartent du mat
    rotor.add(blade);
  }

  // Cercle balaye par le rotor : sert de reperage visuel pendant la detection.
  const discGeo = new THREE.BufferGeometry().setFromPoints(
    new THREE.Path().absarc(0, 0, BLADE_L + 0.6, 0, Math.PI * 2, false).getSpacedPoints(96)
  );
  const discMat = new THREE.LineBasicMaterial({ color: pal.grid, transparent: true, opacity: 0.35 });
  const disc = new THREE.LineLoop(discGeo, discMat);
  disc.position.z = rotor.position.z + 1.2;
  nacelle.add(disc);

  let lens = null;
  if (!compact) {
    const camPod = new THREE.Group();
    camPod.position.set(0, TOWER_H - 3.4, 0);
    group.add(camPod);

    const podBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 1.5), trim);
    podBody.position.z = 1.1;
    camPod.add(podBody);

    lens = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.5, 14), signal);
    lens.rotation.x = Math.PI / 2;
    lens.position.z = 2.0;
    camPod.add(lens);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 1.0), trim);
    arm.position.z = 0.5;
    camPod.add(arm);
  }

  group.scale.setScalar(scale);

  return {
    group,
    nacelle,
    rotor,
    disc,
    discMat,
    materials: { shell, trim, signal, discMat },
    /** Points d'ancrage des annotations HTML, en coordonnees monde. */
    anchors: { camera: lens, compute, rotor: hub, machine: nacelle },
    height: TOWER_H,
    radius: BLADE_L,
  };
}

export { TOWER_H, BLADE_L };
