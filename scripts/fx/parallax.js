/**
 * parallax.js
 * Decalage vertical des blocs marques `data-parallax="0.05"`. Un plafond
 * optionnel `data-parallax-max` (pixels) borne le deplacement.
 *
 * Deux precautions :
 *  - on ecrit dans la propriete CSS `translate`, pas dans `transform`, pour ne
 *    pas ecraser la transformation d'apparition des memes elements ;
 *  - seuls les elements visibles sont recalcules, et les mesures passent dans
 *    la phase de lecture de la boucle, avant toute ecriture.
 */

import { onFrame } from '../core/loop.js';

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initParallax() {
  if (REDUCE) return;

  const items = [...document.querySelectorAll('[data-parallax]')].map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax) || 0.05,
    max: parseFloat(el.dataset.parallaxMax) || 64,
    mid: 0,
    y: 0,
  }));
  if (!items.length) return;

  const byEl = new Map(items.map((it) => [it.el, it]));
  const active = new Set();

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const item = byEl.get(entry.target);
      if (!item) continue;
      if (entry.isIntersecting) active.add(item);
      else { active.delete(item); item.el.style.translate = ''; item.y = 0; }
    }
  }, { rootMargin: '20% 0px 20% 0px' });
  items.forEach((it) => io.observe(it.el));

  onFrame(() => {
    for (const item of active) {
      const rect = item.el.getBoundingClientRect();
      // On retire le decalage deja applique : on mesure la position de repos.
      item.mid = rect.top - item.y + rect.height / 2;
    }
  }, 'read');

  onFrame(({ vh }) => {
    for (const item of active) {
      const next = Math.max(-item.max, Math.min(item.max, -(item.mid - vh / 2) * item.speed));
      if (Math.abs(next - item.y) < 0.05) continue;
      item.y = next;
      item.el.style.translate = `0 ${next.toFixed(2)}px`;
    }
  });
}
