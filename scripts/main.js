/**
 * main.js
 * Point d'entree. Les modules legers se branchent tout de suite ; Three.js
 * n'est demande qu'une fois la page peinte, pour ne pas peser sur le LCP.
 */

import { onFrame } from './core/loop.js';
import { initTheme } from './core/theme.js';
import { initI18n } from './core/i18n.js';
import { initReveal, initScrollSpy } from './core/reveal.js';
import { initParallax } from './fx/parallax.js';
import { initProgress } from './fx/progress.js';
import { initWords } from './fx/words.js';
import { initStackCards } from './fx/stack-cards.js';
import { initMarquee } from './fx/marquee.js';
import { initMagnetic } from './fx/magnetic.js';
import { initContact } from './ui/contact.js';

const root = document.documentElement;

// Signale au garde-fou du <head> que le module a bien demarre. Sans cette
// marque, la classe `js` est retiree apres 1,8 s et le contenu reapparait.
root.setAttribute('data-booted', '');

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------- socle immediat */

initTheme();
initI18n();
initWords();
initReveal();
initScrollSpy();
initProgress();
initParallax();
initStackCards();
initMarquee();
initMagnetic();
initContact();

// Ouverture du titre : on attend une image pour que l'etat de depart soit
// peint, sinon la transition n'a pas de point de depart.
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('ready')));

/* ------------------------------------------------------------- la scene */

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && c.getContext('webgl2'));
  } catch (e) {
    return false;
  }
}

function whenIdle(fn) {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 1200 });
  else setTimeout(fn, 300);
}

/** Petit appareil ou peu de coeurs : moins de particules, pixels plus gros. */
function deviceTier() {
  const small = window.innerWidth < 860;
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
  return small || weak ? 'low' : 'high';
}

async function bootScene() {
  const canvas = document.getElementById('viz');
  if (!canvas) return;
  if (!webglAvailable()) { root.classList.add('no-gl'); return; }

  let scene;
  try {
    const { createScene } = await import('./scene/index.js');
    scene = createScene({
      canvas,
      overlay: document.getElementById('overlay'),
      hud: document.getElementById('hud'),
      reduced: REDUCE,
      tier: deviceTier(),
    });
  } catch (err) {
    console.warn('[scene] chargement impossible, repli affiche', err);
    root.classList.add('no-gl');
    return;
  }

  canvas.classList.add('is-live');
  document.addEventListener('theme:change', () => scene.retint());

  onFrame((f) => scene.read(f), 'read');
  onFrame((f) => scene.render(f));
}

whenIdle(bootScene);
