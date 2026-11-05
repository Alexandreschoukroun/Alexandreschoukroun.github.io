/**
 * words.js
 * Decoupe un texte marque `data-words` en mots, chacun porteur de son rang
 * `--i`. Le CSS les allume l'un apres l'autre en lisant `--p`, la progression
 * de defilement posee par progress.js.
 *
 * Le texte est traduit par i18n.js, qui reecrit le contenu de l'element : on
 * redecoupe donc a chaque changement de langue. On repart du textContent, ce
 * qui ignore les balises d'un decoupage precedent. Les mots restent separes
 * par de vraies espaces : un lecteur d'ecran lit la phrase normalement.
 */

function split(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const span = document.createElement('span');
    span.className = 'mw';
    span.style.setProperty('--i', String(i));
    span.textContent = w;
    el.append(span, ' ');
  });
  el.style.setProperty('--n', String(words.length));
}

export function initWords() {
  const targets = [...document.querySelectorAll('[data-words]')];
  if (!targets.length) return;
  targets.forEach(split);
  document.addEventListener('lang:change', () => targets.forEach(split));
}
