/**
 * reveal.js
 * Apparition des blocs a l'entree dans le viewport, et surlignage du lien de
 * navigation correspondant a la section lue.
 *
 * IntersectionObserver uniquement : pas d'ecouteur de scroll, pas de mesure
 * de position dans la boucle de rendu.
 */

const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initReveal() {
  const targets = document.querySelectorAll('.reveal, .rule');
  if (REDUCE) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

  targets.forEach((el) => io.observe(el));
}

export function initScrollSpy() {
  const links = [...document.querySelectorAll('.nav__links a[href^="#"]')];
  if (!links.length) return;

  const byId = new Map();
  for (const link of links) {
    const id = link.getAttribute('href').slice(1);
    const section = document.getElementById(id);
    if (section) byId.set(section, link);
  }

  const visible = new Set();

  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    // La section active est la plus haute parmi celles visibles.
    let top = null;
    for (const section of visible) {
      if (!top || section.offsetTop < top.offsetTop) top = section;
    }
    links.forEach((l) => l.removeAttribute('aria-current'));
    if (top && byId.has(top)) byId.get(top).setAttribute('aria-current', 'true');
  }, { rootMargin: '-45% 0px -45% 0px' });

  byId.forEach((_link, section) => io.observe(section));
}
