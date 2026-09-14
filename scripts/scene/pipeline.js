/**
 * pipeline.js
 * La machine a etats qui fait vivre la scene : le cycle d'une chaine de
 * traitement temps reel, capteur par capteur jusqu'a la commande.
 *
 *   acquisition -> suivi -> decision -> action -> et on recommence
 *
 * Elle ne dessine rien. Elle pilote la luminosite du die, l'emission des
 * impulsions, la consigne de rotor et le texte du HUD.
 */

const STAGES = [
  { name: 'acquire', duration: 3.2, label: 'Acquisition', metric: () => '3 flux capteur' },
  { name: 'track', duration: 2.6, label: 'Traitement et suivi', metric: () => '40 images/s' },
  { name: 'decide', duration: 2.1, label: 'Décision', metric: () => 'consigne émise' },
  { name: 'act', duration: 2.8, label: 'Machine arrêtée', metric: () => 'rotor en décélération' },
];

export function createPipeline({ signals, die, palette }) {
  let pal = palette;
  let index = 0;
  let elapsed = 0;
  let commandLanded = false;
  let glow = 0;

  // Les capteurs ne s'arretent jamais : le flux entrant tourne en permanence,
  // c'est le calcul et la commande qui rythment le cycle.
  for (const channel of ['vision', 'audio', 'radar']) signals.pulses.setActive(channel, true);

  function enter(stage) {
    if (stage.name === 'decide') {
      signals.pulses.fire('output', () => { commandLanded = true; });
    } else if (stage.name === 'acquire') {
      commandLanded = false;
    }
  }

  const api = {
    get stage() { return STAGES[index].name; },
    get label() { return STAGES[index].label; },
    get metric() { return STAGES[index].metric(); },
    get alert() { return commandLanded || STAGES[index].name === 'decide'; },

    /** Consigne de rotor : 1 en marche, presque 0 quand la commande est arrivee. */
    get rotorTarget() { return commandLanded ? 0.04 : 1; },

    update(dt, time) {
      elapsed += dt;
      const stage = STAGES[index];
      if (elapsed >= stage.duration) {
        elapsed = 0;
        index = (index + 1) % STAGES.length;
        enter(STAGES[index]);
      }

      signals.update(dt, time);

      // Le die chauffe pendant le suivi et la decision, puis retombe.
      const wanted = (stage.name === 'track' || stage.name === 'decide') ? 1 : 0.25;
      glow += (wanted - glow) * Math.min(1, dt * 3);
      const base = pal.isLight ? 0.06 : 0.18;
      const span = pal.isLight ? 0.16 : 0.55;
      die.material.emissiveIntensity = base + span * glow * (0.82 + 0.18 * Math.sin(time * 7));
    },

    /** Appele au changement de theme : le die suit la nouvelle palette. */
    setPalette(next) { pal = next; },

    reset() {
      index = 0;
      elapsed = 0;
      commandLanded = false;
    },
  };

  return api;
}
