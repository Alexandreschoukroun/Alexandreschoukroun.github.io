/**
 * theme.js
 * Bascule clair / sombre. Le theme initial est deja pose par le script inline
 * du <head> pour eviter le flash au chargement ; ce module gere seulement le
 * bouton, la persistance et la diffusion du changement.
 *
 * La scene 3D ecoute `theme:change` pour relire ses couleurs dans les tokens CSS.
 */

const KEY = 'theme';

export function initTheme() {
  const btn = document.getElementById('themebtn');
  if (!btn) return;

  const apply = (theme, persist) => {
    document.documentElement.dataset.theme = theme;
    btn.setAttribute('aria-label', theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre');
    if (persist) { try { localStorage.setItem(KEY, theme); } catch (e) { /* mode prive */ } }
    document.dispatchEvent(new CustomEvent('theme:change', { detail: { theme } }));
  };

  apply(document.documentElement.dataset.theme || 'dark', false);

  btn.addEventListener('click', () => {
    apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true);
  });

  // Suit le systeme tant que l'utilisateur n'a pas choisi explicitement.
  const mq = matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', (e) => {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (err) { /* ignore */ }
    if (!saved) apply(e.matches ? 'light' : 'dark', false);
  });
}
