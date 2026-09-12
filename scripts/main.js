/**
 * main.js
 * Point d'entree. Rien de lourd ici : on branche les modules legers tout de
 * suite, et on ne va chercher Three.js qu'une fois la page peinte, pour ne pas
 * peser sur le LCP.
 */

import { onFrame } from './core/loop.js';
import { initTheme } from './core/theme.js';
import { initI18n } from './core/i18n.js';
import { initReveal, initScrollSpy } from './core/reveal.js';
import { initParallax } from './fx/parallax.js';

// Signale au garde-fou du <head> que le module a bien demarre. Sans cette
// marque, la classe `js` est retiree apres 1,8 s et le contenu reapparait.
document.documentElement.setAttribute('data-booted', '');

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ------------------------------------------------------- socle immediat */

initTheme();
initI18n();
initReveal();
initScrollSpy();
initParallax();

// Les captures produit absentes sont gerees par un `onerror` en ligne dans le
// HTML, pas ici : il se declenche meme quand ce module ne charge pas.

/* ------------------------------------------------------------- la scene */

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

function whenIdle(fn) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1500 });
  else setTimeout(fn, 400);
}

async function bootScene() {
  const canvas = document.getElementById('viz');
  const stage = document.getElementById('stage');
  const fallback = document.getElementById('vizfallback');
  const hud = document.getElementById('hud');
  const annoRoot = document.getElementById('annos');
  if (!canvas || !stage) return;

  if (!webglAvailable()) return; // le repli reste affiche

  const mobile = window.innerWidth < 860 || navigator.hardwareConcurrency <= 4;

  let scene;
  try {
    const { createScene } = await import('./scene/index.js');
    scene = createScene({ canvas, annoRoot, hud, reduced: REDUCE, mobile });
  } catch (err) {
    console.warn('[scene] chargement impossible, repli affiche', err);
    return;
  }

  if (fallback) fallback.hidden = true;
  canvas.classList.add('is-live');
  hud?.classList.add('is-live');

  document.addEventListener('theme:change', () => scene.retint());

  if (REDUCE) {
    scene.still(0.1);
    window.addEventListener('resize', () => scene.still(0.1), { passive: true });
    return;
  }

  // Avancee dans le bloc scene : 0 au premier pixel, 1 quand le canvas se
  // decolle.
  //
  // Les bornes sont mesurees une fois et remesurees au redimensionnement.
  // Appeler getBoundingClientRect a chaque frame forcerait un recalcul de mise
  // en page juste apres les ecritures du parallax, ce qui coute cher au scroll.
  let stageTop = 0;
  let stageHeight = 0;
  const measureStage = () => {
    const rect = stage.getBoundingClientRect();
    stageTop = rect.top + window.scrollY;
    stageHeight = stage.offsetHeight;
  };
  measureStage();
  window.addEventListener('resize', measureStage, { passive: true });
  window.addEventListener('orientationchange', measureStage, { passive: true });
  // Les polices arrivent apres le premier rendu et changent la hauteur du bloc.
  if (document.fonts?.ready) document.fonts.ready.then(measureStage);

  // Croisement des deux voiles. Dans le heros le texte est a gauche, dans les
  // chapitres il passe a droite : sans bascule, le voile recouvrirait
  // exactement le sujet 3D au lieu de proteger le texte.
  const scrimL = document.getElementById('scrim-l');
  const scrimR = document.getElementById('scrim-r');
  let lastFlip = -1;
  const setScrim = (p) => {
    const flip = clamp01((p - 0.14) / 0.18);      // bascule entre le heros et le 1er chapitre
    if (Math.abs(flip - lastFlip) < 0.01) return; // on n'ecrit pas a chaque frame
    lastFlip = flip;
    if (scrimL) scrimL.style.opacity = String(1 - flip);
    if (scrimR) scrimR.style.opacity = String(flip);
  };

  onFrame(({ dt, time, vh, scrollY }) => {
    const travel = stageHeight - vh;
    const p = travel > 0 ? clamp01((scrollY - stageTop) / travel) : 0;
    scene.setProgress(p);
    setScrim(p);
    scene.render(dt, time);
  });
}

whenIdle(bootScene);
