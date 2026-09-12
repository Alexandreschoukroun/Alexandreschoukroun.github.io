/**
 * palette.js
 * La scene 3D ne code aucune couleur en dur : elle relit les tokens CSS.
 * Changer de theme met donc a jour le rendu WebGL en meme temps que la page.
 */

import * as THREE from 'three';

const KEYS = {
  bg: '--scene-bg',
  fog: '--scene-fog',
  metal: '--scene-metal',
  metal2: '--scene-metal2',
  grid: '--scene-grid',
  key: '--scene-key',
  rim: '--scene-rim',
  signal: '--scene-signal',
};

export function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const [name, token] of Object.entries(KEYS)) {
    const raw = cs.getPropertyValue(token).trim();
    out[name] = new THREE.Color(raw || '#808080');
  }
  out.isLight = document.documentElement.dataset.theme === 'light';
  return out;
}
