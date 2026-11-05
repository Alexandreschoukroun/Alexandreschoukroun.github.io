/**
 * text-points.js
 * Ecrit un mot dans un canvas 2D hors ecran et en releve les pixels allumes.
 * La conversion en points est faite par pointsFromPixels (shapes.js), testee
 * a part : seule la lecture du canvas a besoin d'un navigateur.
 */

import { pointsFromPixels, rng } from './shapes.js';

export function sampleText(text, N, { weight = 800, family = 'Archivo', seed = 5 } = {}) {
  const size = 220;
  const font = `${weight} ${size}px ${family}, ui-sans-serif, system-ui, sans-serif`;
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const width = Math.ceil(probe.measureText(text).width) + 40;
  const height = Math.round(size * 1.4);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = font;
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20, height / 2);

  const data = ctx.getImageData(0, 0, width, height).data;
  const pixels = [];
  const step = 2;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] > 128) pixels.push(x, y);
    }
  }
  return pointsFromPixels(pixels, N, rng(seed));
}
