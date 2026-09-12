/**
 * terrain.js
 * Sol de reperage : une trame de lignes dont la couleur se fond vers le fond
 * a mesure qu'elle s'eloigne. Pas de plan texture, pas d'ombres portees :
 * la profondeur vient du brouillard et de cette attenuation.
 */

import * as THREE from 'three';

export function createTerrain(pal, options = {}) {
  const extent = options.extent ?? 520;
  const step = options.step ?? 18;
  const fadeFrom = extent * 0.18;

  const positions = [];
  const colors = [];
  const c = new THREE.Color();

  const push = (x1, z1, x2, z2) => {
    positions.push(x1, 0, z1, x2, 0, z2);
    for (const [x, z] of [[x1, z1], [x2, z2]]) {
      const d = Math.hypot(x, z);
      const k = Math.min(1, Math.max(0, (d - fadeFrom) / (extent * 0.62 - fadeFrom)));
      c.copy(pal.grid).lerp(pal.fog, k * 0.95);
      colors.push(c.r, c.g, c.b);
    }
  };

  for (let v = -extent; v <= extent; v += step) {
    push(-extent, v, extent, v);
    push(v, -extent, v, extent);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: pal.isLight ? 0.75 : 0.55,
    depthWrite: false,
  });

  const grid = new THREE.LineSegments(geo, mat);
  grid.position.y = 0.02;

  return { object: grid, material: mat, geometry: geo };
}
