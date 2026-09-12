/**
 * parallax.js
 * Decalage vertical leger des blocs marques `data-parallax="0.05"`.
 *
 * Deux precautions :
 *  - on ecrit dans la propriete CSS `translate`, pas dans `transform`, pour ne
 *    pas ecraser la transformation d'apparition des memes elements ;
 *  - seuls les elements actuellement visibles sont recalcules, via un
 *    IntersectionObserver qui les ajoute et les retire de la liste active.
 */

import { onFrame } from '../core/loop.js';

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_SHIFT = 64; // px, garde-fou pour ne jamais desaligner une section

export function initParallax() {
  if (REDUCE) return;

  const nodes = [...document.querySelectorAll('[data-parallax]')];
  if (!nodes.length) return;

  const items = nodes.map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax) || 0.05,
    active: false,
    y: 0,
  }));
  const byEl = new Map(items.map((it) => [it.el, it]));
  const active = new Set();

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const item = byEl.get(entry.target);
      if (!item) continue;
      if (entry.isIntersecting) {
        active.add(item);
      } else {
        active.delete(item);
        item.el.style.translate = '';
      }
    }
  }, { rootMargin: '20% 0px 20% 0px' });

  items.forEach((it) => io.observe(it.el));

  const pending = [];

  onFrame(({ vh }) => {
    if (!active.size) return;
    const mid = vh / 2;

    // Deux passes : on lit toutes les positions, puis on ecrit. Lire et ecrire
    // en alternance forcerait un recalcul de mise en page a chaque element.
    pending.length = 0;
    for (const item of active) {
      const rect = item.el.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2) - mid;
      const next = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, -offset * item.speed));
      if (Math.abs(next - item.y) >= 0.05) pending.push([item, next]);
    }
    for (const [item, next] of pending) {
      item.y = next;
      item.el.style.translate = `0 ${next.toFixed(2)}px`;
    }
  });
}
