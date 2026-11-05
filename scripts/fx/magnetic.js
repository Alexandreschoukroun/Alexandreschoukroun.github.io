/**
 * magnetic.js
 * Les boutons d'appel s'inclinent vers le pointeur quand il s'approche, et
 * leur texte suit un peu plus loin : le bouton repond avant meme le clic.
 *
 * Souris uniquement : au doigt, il n'y a pas de survol a suivre.
 */

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initMagnetic() {
  if (REDUCE || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  for (const el of document.querySelectorAll('[data-magnetic]')) {
    const label = el.querySelector('.btn__label');
    let rect = null;
    el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
    el.addEventListener('pointermove', (e) => {
      if (!rect) rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      el.style.translate = `${(dx * 0.22).toFixed(1)}px ${(dy * 0.32).toFixed(1)}px`;
      if (label) label.style.translate = `${(dx * 0.1).toFixed(1)}px ${(dy * 0.14).toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => {
      rect = null;
      el.style.translate = '';
      if (label) label.style.translate = '';
    });
  }
}
