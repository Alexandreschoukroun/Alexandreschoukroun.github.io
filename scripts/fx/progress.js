/**
 * progress.js
 * Un seul mecanisme pour tous les effets lies au defilement : chaque element
 * marque `data-progress` recoit une variable CSS `--p`, de 0 a 1, et le CSS
 * en fait ce qu'il veut (translation, opacite, trace d'une ligne).
 *
 * Modes :
 *   through  0 quand le haut entre par le bas de l'ecran, 1 quand le bas sort par le haut
 *   pin      avancee dans un bloc dont l'enfant est colle (chapitres)
 *   exit     0 quand le haut touche le haut de l'ecran, 1 quand l'element est passe
 *   enter    0 quand le haut entre par le bas, 1 quand il atteint le quart superieur
 *
 * Seuls les elements proches de l'ecran sont mesures, via IntersectionObserver.
 */

import { onFrame } from '../core/loop.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function compute(mode, top, h, vh) {
  switch (mode) {
    case 'pin': return h > vh ? clamp01(-top / (h - vh)) : 0;
    case 'exit': return clamp01(-top / Math.max(1, h));
    case 'enter': return clamp01((vh - top) / (vh * 0.75));
    default: return clamp01((vh - top) / (vh + h));
  }
}

export function initProgress() {
  const items = [...document.querySelectorAll('[data-progress]')].map((el) => ({
    el, mode: el.dataset.progress || 'through', top: 0, h: 0, v: -1,
  }));
  if (!items.length) return;

  const byEl = new Map(items.map((it) => [it.el, it]));
  const active = new Set();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const it = byEl.get(e.target);
      if (!it) continue;
      if (e.isIntersecting) active.add(it);
      else active.delete(it);
    }
  }, { rootMargin: '40% 0px 40% 0px' });
  items.forEach((it) => io.observe(it.el));

  onFrame(() => {
    for (const it of active) {
      const r = it.el.getBoundingClientRect();
      it.top = r.top;
      it.h = r.height;
    }
  }, 'read');

  onFrame(({ vh }) => {
    for (const it of active) {
      const p = compute(it.mode, it.top, it.h, vh);
      if (Math.abs(p - it.v) < 0.0005) continue;
      it.v = p;
      it.el.style.setProperty('--p', p.toFixed(4));
    }
  });
}

export { compute as progressFor };
