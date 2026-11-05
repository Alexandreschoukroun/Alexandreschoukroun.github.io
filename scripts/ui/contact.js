/**
 * contact.js
 * Deux publics arrivent au contact : un client avec un projet, un recruteur
 * avec un poste. Le selecteur change le titre, le texte et l'objet du mail,
 * sans changer de page.
 *
 * Le formulaire n'envoie rien a un serveur : le site est statique. Il compose
 * un mail dans la messagerie du visiteur, pret a partir. Sans JavaScript, le
 * formulaire fonctionne encore en GET vers mailto:, de facon plus brute.
 */

const EMAIL = 'alexandresch01@hotmail.com';

export function initContact() {
  const section = document.getElementById('contact');
  if (!section) return;

  const radios = [...section.querySelectorAll('[data-intent]')];
  const form = section.querySelector('.compose');
  const subject = form?.querySelector('input[name="subject"]');

  const setIntent = (intent, focus = false) => {
    section.dataset.mode = intent;
    for (const r of radios) {
      const on = r.dataset.intent === intent;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
      if (on && focus) r.focus();
    }
    syncSubject();
  };

  const syncSubject = () => {
    const active = radios.find((r) => r.getAttribute('aria-checked') === 'true');
    if (subject && active) subject.value = active.dataset.subject || '';
  };

  radios.forEach((r, i) => {
    r.addEventListener('click', () => setIntent(r.dataset.intent));
    // Groupe radio : les fleches passent d'une option a l'autre.
    r.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const next = radios[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + radios.length) % radios.length];
      setIntent(next.dataset.intent, true);
    });
  });

  // Un lien ailleurs dans la page peut ouvrir le contact sur le bon public.
  for (const link of document.querySelectorAll('[data-intent-set]')) {
    link.addEventListener('click', () => setIntent(link.dataset.intentSet));
  }

  // L'objet du mail est traduit par i18n.js dans data-subject : on le relit.
  document.addEventListener('lang:change', syncSubject);

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const body = form.querySelector('textarea')?.value.trim() || '';
    // encodeURIComponent et non URLSearchParams : ce dernier code les espaces
    // en "+", que les messageries affichent tels quels.
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject?.value || '')}`
      + (body ? `&body=${encodeURIComponent(body)}` : '');
  });

  const copyBtn = section.querySelector('[data-copy]');
  const status = section.querySelector('.way__status');
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(copyBtn.dataset.copy);
      copyBtn.dataset.done = 'true';
      if (status) status.hidden = false;
      setTimeout(() => {
        copyBtn.dataset.done = 'false';
        if (status) status.hidden = true;
      }, 2200);
    } catch (err) {
      // Presse-papiers refuse : on bascule sur le lien mailto juste a cote.
      window.location.href = `mailto:${EMAIL}`;
    }
  });

  setIntent(section.dataset.mode || 'project');
}
