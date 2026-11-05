/**
 * loop.js
 * Une seule boucle requestAnimationFrame pour toute la page.
 *
 * Aucun `addEventListener('scroll')` sur ce site. La position de defilement
 * est lue une fois par image, au moment ou l'on va de toute facon ecrire dans
 * le DOM.
 *
 * Deux phases : tous les abonnes `read` passent d'abord (mesures), puis tous
 * les abonnes `write` (styles, rendu). Lire une position apres avoir ecrit un
 * style forcerait un recalcul de mise en page ; regrouper les lectures en tete
 * d'image garantit qu'elles tombent sur une mise en page deja propre.
 */

const readers = new Set();
const writers = new Set();

export const frame = {
  scrollY: 0,
  vw: 0,
  vh: 0,
  dt: 0,        // secondes ecoulees, plafonnees
  time: 0,      // secondes depuis le demarrage
  velocity: 0,  // pixels par seconde, lisse ; positif vers le bas
};

let running = false;
let last = 0;
let lastY = 0;

function measure() {
  frame.vw = window.innerWidth;
  frame.vh = window.innerHeight;
}

function run(set) {
  for (const fn of set) {
    try { fn(frame); } catch (err) { console.error('[loop]', err); }
  }
}

function tick(now) {
  if (!running) return;

  const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
  last = now;

  frame.dt = dt;
  frame.time += dt;
  frame.scrollY = window.scrollY || window.pageYOffset || 0;
  const v = (frame.scrollY - lastY) / Math.max(dt, 1e-3);
  frame.velocity += (v - frame.velocity) * Math.min(1, dt * 10);
  lastY = frame.scrollY;

  run(readers);
  run(writers);

  requestAnimationFrame(tick);
}

function start() {
  if (running || (readers.size + writers.size) === 0) return;
  running = true;
  last = 0;
  lastY = window.scrollY || 0;
  requestAnimationFrame(tick);
}

function stop() {
  running = false;
}

/**
 * Abonne une fonction a la boucle. `phase` vaut 'read' ou 'write' (defaut).
 * Retourne la fonction de desabonnement.
 */
export function onFrame(fn, phase = 'write') {
  const set = phase === 'read' ? readers : writers;
  set.add(fn);
  start();
  return () => {
    set.delete(fn);
    if (readers.size + writers.size === 0) stop();
  };
}

measure();
window.addEventListener('resize', measure, { passive: true });
window.addEventListener('orientationchange', measure, { passive: true });

// Onglet en arriere-plan : on arrete de bruler des images.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stop();
  else start();
});
