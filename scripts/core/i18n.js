/**
 * i18n.js
 * Bascule francais / anglais.
 *
 * Le francais vit dans le HTML : c'est la langue par defaut, celle qui
 * s'affiche si ce module ne charge jamais. L'anglais est un dictionnaire
 * charge a la demande, applique sur les elements portant `data-i18n`.
 *
 * Le retour au francais ne recharge rien : le texte d'origine est memorise au
 * premier passage en anglais.
 */

const KEY = 'lang';
const original = new Map();
let dict = null;
let current = 'fr';

/** Cle de stockage pour un element et son attribut cible. */
function slot(el, attr) {
  return attr ? `${attr}` : '#text';
}

function remember(el, attr) {
  const store = original.get(el) || {};
  const k = slot(el, attr);
  if (!(k in store)) {
    store[k] = attr ? el.getAttribute(attr) : el.innerHTML;
    original.set(el, store);
  }
}

function write(el, attr, value) {
  if (attr) el.setAttribute(attr, value);
  else el.innerHTML = value;
}

function restore(el) {
  const store = original.get(el);
  if (!store) return;
  for (const [k, v] of Object.entries(store)) {
    if (k === '#text') el.innerHTML = v;
    else if (v === null) el.removeAttribute(k);
    else el.setAttribute(k, v);
  }
}

/**
 * Applique une langue.
 * `data-i18n="cle"` traduit le contenu, `data-i18n-attr="attr:cle"` traduit un
 * attribut (plusieurs paires separees par une virgule).
 */
function apply(lang) {
  const nodes = document.querySelectorAll('[data-i18n], [data-i18n-attr]');

  if (lang === 'fr') {
    nodes.forEach(restore);
  } else if (dict) {
    for (const el of nodes) {
      const key = el.dataset.i18n;
      if (key && key in dict) {
        remember(el, null);
        write(el, null, dict[key]);
      }
      const attrs = el.dataset.i18nAttr;
      if (attrs) {
        for (const pair of attrs.split(',')) {
          const [attr, k] = pair.split(':').map((x) => x.trim());
          if (attr && k && k in dict) {
            remember(el, attr);
            write(el, attr, dict[k]);
          }
        }
      }
    }
  }

  document.documentElement.lang = lang;
  current = lang;
  document.documentElement.dataset.lang = lang;
  document.dispatchEvent(new CustomEvent('lang:change', { detail: { lang, dict: lang === 'en' ? dict : null } }));
}

export function initI18n() {
  const btn = document.getElementById('langbtn');

  // Une langue passee en URL prime : cela rend un lien anglais partageable.
  let wanted = null;
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'fr') wanted = q;
    if (!wanted) wanted = localStorage.getItem(KEY);
  } catch (e) { /* mode prive */ }
  if (!wanted && typeof navigator !== 'undefined') {
    wanted = (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  const setLang = async (lang, persist) => {
    if (lang === 'en' && !dict) {
      try {
        ({ EN: dict } = await import('../i18n/en.js'));
      } catch (err) {
        console.warn('[i18n] dictionnaire anglais indisponible', err);
        return;
      }
    }
    apply(lang);
    if (persist) { try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ } }
    if (btn) btn.setAttribute('aria-label', lang === 'fr' ? 'Switch site to English' : 'Passer le site en français');
  };

  if (btn) {
    btn.addEventListener('click', () => setLang(current === 'fr' ? 'en' : 'fr', true));
  }

  if (wanted === 'en') setLang('en', false);
  else apply('fr');

  return { setLang, get current() { return current; } };
}
