/**
 * marquee.js
 * La bande qui annonce le freelance. Elle defile seule, accelere avec le
 * defilement de la page, change de sens avec lui et s'incline sous la vitesse.
 *
 * Le contenu est duplique une fois : quand la premiere copie est sortie, on
 * revient en arriere d'exactement sa largeur, sans saut visible.
 */

import { onFrame } from '../core/loop.js';

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initMarquee() {
  const band = document.querySelector('.band');
  const track = band?.querySelector('.band__track');
  if (!band || !track || REDUCE) return;

  const copy = track.querySelector('.band__set');
  if (!copy) return;
  // La copie porte les memes data-i18n : i18n.js la traduit avec l'original.
  const clone = copy.cloneNode(true);
  track.append(clone);

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(band);

  let width = 0;
  const measure = () => { width = copy.getBoundingClientRect().width; };
  measure();
  new ResizeObserver(measure).observe(copy);

  let x = 0;
  let dir = -1;
  let skew = 0;

  onFrame(({ dt, velocity }) => {
    if (!visible || !width) return;
    if (Math.abs(velocity) > 40) dir = velocity > 0 ? -1 : 1;
    const speed = 70 + Math.min(900, Math.abs(velocity) * 0.6);
    x += dir * speed * dt;
    if (x <= -width) x += width;
    if (x > 0) x -= width;
    const targetSkew = Math.max(-7, Math.min(7, -velocity * 0.004));
    skew += (targetSkew - skew) * Math.min(1, dt * 6);
    track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
  });
}
