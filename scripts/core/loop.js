/**
 * loop.js
 * Une seule boucle requestAnimationFrame pour toute la page.
 *
 * Pourquoi : aucun `addEventListener('scroll')` n'est utilise sur ce site.
 * La position de defilement est lue une fois par frame, au moment ou l'on va
 * de toute facon ecrire dans le DOM. Cela evite les rafales d'evenements de
 * scroll et garde lectures et ecritures groupees.
 */

const subscribers = new Set();

export const frame = {
  scrollY: 0,
  vw: 0,
  vh: 0,
  dt: 0,      // secondes ecoulees, plafonnees
  time: 0,    // secondes depuis le demarrage
};

let running = false;
let last = 0;

function measure() {
  frame.vw = window.innerWidth;
  frame.vh = window.innerHeight;
}

function tick(now) {
  if (!running) return;

  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
  last = now;

  frame.dt = dt;
  frame.time += dt;
  frame.scrollY = window.scrollY || window.pageYOffset || 0;

  for (const fn of subscribers) {
    try { fn(frame); } catch (err) { console.error('[loop]', err); }
  }

  requestAnimationFrame(tick);
}

function start() {
  if (running || subscribers.size === 0) return;
  running = true;
  last = 0;
  requestAnimationFrame(tick);
}

function stop() {
  running = false;
}

/** Abonne une fonction a la boucle. Retourne la fonction de desabonnement. */
export function onFrame(fn) {
  subscribers.add(fn);
  start();
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) stop();
  };
}

measure();
window.addEventListener('resize', measure, { passive: true });
window.addEventListener('orientationchange', measure, { passive: true });

// Onglet en arriere-plan : on arrete de bruler des frames.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else start();
});
