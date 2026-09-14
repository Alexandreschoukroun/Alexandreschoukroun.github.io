/**
 * camera-rig.js
 * La camera suit le defilement : cinq reperes, interpoles en douceur.
 *
 *   0.00  vue large de la carte entiere
 *   0.25  on descend vers la surface
 *   0.50  acquisition : les trois modules capteur
 *   0.75  suivi : le SoC, les impulsions qui convergent
 *   1.00  decision : la piste de sortie jusqu'a la machine
 *
 * S'y ajoutent une respiration lente dans le heros et un leger suivi du
 * pointeur, tous deux amortis pour ne jamais donner de saccade.
 */

import * as THREE from 'three';

/**
 * Chaque repere vise un `focus`, le point qui compte dans le plan, puis
 * applique un `shift` lateral en unites monde le long du vecteur droit de la
 * camera. Un shift positif pousse le sujet vers la GAUCHE de l'image, un shift
 * negatif vers la droite.
 *
 * C'est ce qui tient la composition : dans le heros le texte occupe la colonne
 * de gauche, donc la scene est poussee a droite ; dans les chapitres le texte
 * passe a droite, donc le sujet repart a gauche. Viser un point fixe ne suffit
 * pas, le decalage depend de l'orientation de la camera.
 */
const KEYS = [
  { stop: 0.00, pos: [116, 78, 152], focus: [10, 6, 6], shift: -20, fov: 40 },
  { stop: 0.25, pos: [88, 54, 112], focus: [2, 5, 4], shift: -14, fov: 38 },
  { stop: 0.50, pos: [4, 33, 68], focus: [-42, 9, 24], shift: 11, fov: 33 },
  { stop: 0.75, pos: [30, 22, 37], focus: [0, 3, 0], shift: 7, fov: 34 },
  { stop: 1.00, pos: [110, 32, 80], focus: [70, 9, 14], shift: 12, fov: 36 },
];

const smooth = (x) => x * x * (3 - 2 * x);

const REF_ASPECT = 1.6;   // proportion pour laquelle les fov ont ete regles

/**
 * Le fov de three.js est VERTICAL. Sur un viewport en portrait, un fov vertical
 * constant retrecit le champ horizontal et rogne la scene sur les cotes. On
 * recalcule donc le fov vertical pour conserver le champ HORIZONTAL de
 * reference, plafonne pour eviter une distorsion de grand angle.
 */
export function fitFov(fov, aspect) {
  if (!aspect || aspect >= REF_ASPECT) return fov;
  const tanHalfH = Math.tan((fov * Math.PI) / 360) * REF_ASPECT;
  const v = (Math.atan(tanHalfH / aspect) * 360) / Math.PI;
  return Math.min(FOV_MAX, v);
}

const FOV_MAX = 76;   // au-dela, la distorsion de grand angle se voit

/**
 * Adapte le cadrage a la proportion du viewport, en deux temps.
 *
 * On ouvre d'abord le fov vertical, mais on le plafonne : un plein ecran de
 * telephone a une proportion de 0,46, ou la compensation par le seul fov
 * demanderait plus de 100 degres et deformerait toute la scene. Ce qui reste
 * a rattraper est donc obtenu en RECULANT la camera, ce qui ne coute aucune
 * distorsion. Le champ horizontal redevient celui du bureau.
 *
 * Modifie `pos` en place et pose le fov sur la camera.
 */
export function fitCamera(camera, fovBase, pos, look) {
  const aspect = camera.aspect || REF_ASPECT;
  const fov = fitFov(fovBase, aspect);

  const wanted = Math.tan((fovBase * Math.PI) / 360) * REF_ASPECT;
  const got = Math.tan((fov * Math.PI) / 360) * aspect;
  if (got > 1e-6 && got < wanted - 1e-4) {
    pos.sub(look).multiplyScalar(Math.min(3, wanted / got)).add(look);
  }
  return fov;
}

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Echantillonne les reperes a l'avancee `p`. Fonction pure, utilisee aussi bien
 * par le rig que par les tests de cadrage, qui verifient hors navigateur que
 * chaque plan tient dans l'image.
 */
export function sampleKeys(p, out = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 0 }) {
  const t = Math.max(0, Math.min(1, p));
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].stop) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const span = b.stop - a.stop;
  const k = smooth(span > 0 ? Math.min(1, Math.max(0, (t - a.stop) / span)) : 0);

  out.pos.copy(_a.set(...a.pos)).lerp(_b.set(...b.pos), k);
  out.look.copy(_a.set(...a.focus)).lerp(_b.set(...b.focus), k);
  out.fov = a.fov + (b.fov - a.fov) * k;

  // Decalage lateral : on deplace la cible de regard le long du vecteur droit
  // de la camera, ce qui glisse le sujet dans le cadre sans changer l'angle.
  const shift = a.shift + (b.shift - a.shift) * k;
  if (shift !== 0) {
    _dir.subVectors(out.look, out.pos).normalize();
    _right.crossVectors(_dir, _up).normalize();
    out.look.addScaledVector(_right, shift);
  }
  return out;
}

/**
 * Pose une camera exactement sur l'avancee `p`, sans amortissement.
 *
 * `updateMatrixWorld` est indispensable : `lookAt` ne touche que la matrice
 * locale, alors que projeter un point passe par `matrixWorldInverse`. En rendu
 * normal c'est `renderer.render` qui rafraichit ; ici, personne ne le ferait.
 */
export function placeCamera(camera, p) {
  const s = sampleKeys(p);
  const fov = fitCamera(camera, s.fov, s.pos, s.look);
  camera.position.copy(s.pos);
  camera.lookAt(s.look);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return s;
}

export function createRig(camera) {
  const pos = new THREE.Vector3(...KEYS[0].pos);
  // `focus`, pas `look` : le point vise avant application du decalage lateral.
  // Valeur de depart seulement, sampleKeys la reecrit des la premiere frame.
  const look = new THREE.Vector3(...KEYS[0].focus);
  const sample = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: KEYS[0].fov };

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  const onPointer = (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  let progress = 0;
  let eased = 0;

  const rig = {
    keys: KEYS,

    setProgress(p) { progress = Math.max(0, Math.min(1, p)); },

    /** Pose la camera exactement sur un repere, sans amortissement ni derive. */
    place(p) { placeCamera(camera, p); },

    update(dt, time) {
      // Amortissement du defilement : la camera arrive toujours en retard,
      // ce qui absorbe les scrolls brusques et les molettes a crans.
      eased += (progress - eased) * Math.min(1, dt * 4.5);

      const s = sampleKeys(eased, sample);
      pos.copy(s.pos);
      look.copy(s.look);
      const fov = fitCamera(camera, s.fov, pos, look);

      // Respiration : presente dans le heros, elle disparait des qu'on avance.
      const idle = Math.max(0, 1 - eased * 4);
      pos.x += Math.sin(time * 0.16) * 5.5 * idle;
      pos.y += Math.cos(time * 0.21) * 2.2 * idle;

      // Suivi du pointeur, amorti et volontairement discret.
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 2.4);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 2.4);
      pos.x += pointer.x * 5;
      pos.y += -pointer.y * 3;

      camera.position.copy(pos);
      camera.lookAt(look);
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    },

    /** Pose la camera sans animation, pour prefers-reduced-motion. */
    snap(p) {
      progress = eased = p;
      rig.place(p);
    },

    dispose() { window.removeEventListener('pointermove', onPointer); },
  };

  return rig;
}

export { KEYS };
