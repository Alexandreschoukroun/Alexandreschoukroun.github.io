/**
 * story.js
 * Relie la page a la scene. Le cadrage n'est pas decide en 3D : il est
 * decide par le CSS.
 *
 * Chaque forme est rattachee a un element HTML qui porte `data-shape` : un
 * emplacement vide, pose dans la grille de la section, qui dit OU la forme
 * doit apparaitre et a quelle taille. Le responsive se regle donc comme le
 * reste de la page, avec des media queries, et la scene suit.
 *
 * Deux sortes d'emplacements :
 *  - un element ordinaire : la forme epouse sa boite ;
 *  - `data-slot="screen"` : la forme couvre l'ecran (la poussiere), et
 *    l'element ne sert qu'a dire QUAND elle doit apparaitre.
 *
 * La ligne de lecture est le milieu de l'ecran. On cherche les deux
 * emplacements qui l'encadrent, et la transition avance de l'un a l'autre.
 * Un emplacement colle (chapitres) reste au milieu de l'ecran tant qu'il est
 * epingle : la forme y tient sans rien faire de plus.
 */

import { SHAPE, FIT } from './shapes.js';

export function collectAnchors(root) {
  return [...root.querySelectorAll('[data-shape]')]
    .filter((el) => el.dataset.shape in SHAPE)
    .map((el) => ({
      el,
      shape: SHAPE[el.dataset.shape],
      screen: el.dataset.slot === 'screen',
    }));
}

/**
 * Mesure un emplacement. `rect` vient de getBoundingClientRect, `cw` et `ch`
 * sont les dimensions du canvas, `vh` la hauteur visible.
 * Renvoie null pour un emplacement masque.
 */
export function measureAnchor(anchor, rect, vh, cw, ch) {
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;
  const timing = anchor.screen
    ? rect.top + Math.min(rect.height, vh) / 2
    : rect.top + rect.height / 2;
  const place = anchor.screen
    ? { cx: cw / 2, cy: ch / 2, w: cw, h: ch }
    : { cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, w: rect.width, h: rect.height };
  return { shape: anchor.shape, timing, place };
}

/** Les deux emplacements qui encadrent la ligne de lecture, et l'avancee entre eux. */
export function resolveStory(items, focus) {
  if (!items.length) return null;
  if (focus <= items[0].timing) return { a: items[0], b: items[0], t: 0 };
  for (let i = 0; i < items.length - 1; i++) {
    const A = items[i];
    const B = items[i + 1];
    if (focus >= A.timing && focus < B.timing) {
      return { a: A, b: B, t: (focus - A.timing) / Math.max(1, B.timing - A.timing) };
    }
  }
  const last = items[items.length - 1];
  return { a: last, b: last, t: 0 };
}

/**
 * Palier : la forme tient pres de chaque emplacement et ne se transforme que
 * dans l'entre-deux. Sans lui, elle serait toujours a mi-chemin de quelque chose.
 */
export function ease(t) {
  const x = Math.min(1, Math.max(0, (t - 0.12) / 0.76));
  return x * x * (3 - 2 * x);
}

/** Pixels par unite locale pour qu'une forme tienne dans sa boite. */
export function fitScale(place, shape, extents) {
  const ext = extents[shape];
  if (FIT[shape] === 'height') return place.h / 2 / ext.ry;
  return Math.min(place.w / 2 / ext.rx, place.h / 2 / ext.ry);
}

/** Cadrage interpole : centre et echelle en pixels. */
export function blendLayout(story, k, extents) {
  const A = story.a.place;
  const B = story.b.place;
  const sA = fitScale(A, story.a.shape, extents);
  const sB = fitScale(B, story.b.shape, extents);
  return {
    cx: A.cx + (B.cx - A.cx) * k,
    cy: A.cy + (B.cy - A.cy) * k,
    s: sA + (sB - sA) * k,
  };
}
