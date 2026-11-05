/**
 * stack-cards.js
 * Les cartes produit se collent l'une apres l'autre en haut de l'ecran. Quand
 * la suivante arrive, la precedente recule : elle retrecit et s'assombrit,
 * comme une feuille qu'on recouvre.
 *
 * Desactive sous 860 px (les cartes y sont trop hautes pour etre collees) et
 * en mouvement reduit.
 */

import { onFrame } from '../core/loop.js';

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initStackCards() {
  if (REDUCE) return;
  const cards = [...document.querySelectorAll('.pcard')];
  if (cards.length < 2) return;
  const wide = matchMedia('(min-width: 861px)');
  const inners = cards.map((c) => c.querySelector('.pcard__in'));
  const tops = new Array(cards.length).fill(0);
  const sticks = new Array(cards.length).fill(0);
  const last = new Array(cards.length).fill(-1);

  onFrame(() => {
    if (!wide.matches) return;
    for (let i = 1; i < cards.length; i++) {
      tops[i] = cards[i].getBoundingClientRect().top;
      sticks[i] = parseFloat(getComputedStyle(cards[i]).top) || 0;
    }
  }, 'read');

  onFrame(({ vh }) => {
    if (!wide.matches) {
      if (last[0] !== -2) {
        inners.forEach((el) => { el.style.transform = ''; el.style.removeProperty('--dim'); });
        last.fill(-2);
      }
      return;
    }
    for (let i = 0; i < cards.length - 1; i++) {
      const top = tops[i + 1];
      const stick = sticks[i + 1];
      const p = Math.min(1, Math.max(0, (vh - top) / Math.max(1, vh - stick)));
      if (Math.abs(p - last[i]) < 0.002) continue;
      last[i] = p;
      inners[i].style.transform = `scale(${(1 - 0.06 * p).toFixed(4)})`;
      inners[i].style.setProperty('--dim', p.toFixed(3));
    }
  });
}
