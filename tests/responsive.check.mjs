/**
 * Controle du responsive.
 *
 * Pour chaque largeur : detecte le debordement horizontal, nomme les elements
 * coupables, verifie que la navigation tient sur une ligne, que les cibles
 * tactiles sont assez grandes et que le texte reste lisible.
 *
 *   node tests/responsive.check.mjs [--shots] [--url=https://...]
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5397;
const SHOTS = process.argv.includes('--shots');
const urlArg = process.argv.find((a) => a.startsWith('--url='));
const TARGET = urlArg ? urlArg.slice(6).replace(/\/$/, '') : null;

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p));

const VIEWPORTS = [
  { name: 'iphone-se', w: 375, h: 667, mobile: true },
  { name: 'iphone-pro', w: 390, h: 844, mobile: true },
  { name: 'android-l', w: 412, h: 915, mobile: true },
  { name: 'tablette-p', w: 768, h: 1024, mobile: true },
  { name: 'tablette-l', w: 1024, h: 768, mobile: false },
  { name: 'laptop', w: 1280, h: 800, mobile: false },
  { name: 'desktop', w: 1440, h: 900, mobile: false },
];

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.pdf': 'application/pdf',
};

function serve() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, rel === '/' ? 'index.html' : rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(PORT, '127.0.0.1', () => ok(server)));
}

let fails = 0;
const bad = (msg) => { console.log('  ECHEC ' + msg); fails++; };
const ok = (msg) => console.log('  ok    ' + msg);

const server = TARGET ? null : await serve();
const BASE = TARGET || `http://127.0.0.1:${PORT}`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--hide-scrollbars', '--no-sandbox'],
});

if (SHOTS) fs.mkdirSync(path.join(ROOT, 'tests/shots/responsive'), { recursive: true });

for (const vp of VIEWPORTS) {
  const page = await browser.newPage();
  await page.setViewport({
    width: vp.w, height: vp.h, deviceScaleFactor: 1,
    isMobile: vp.mobile, hasTouch: vp.mobile,
  });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 45000 });
  await page.waitForFunction(
    () => document.documentElement.hasAttribute('data-booted'), { timeout: 15000 }
  ).catch(() => {});
  // Le site defile en douceur : un test qui saute d'un point a l'autre
  // mesurerait en plein trajet. On coupe l'animation pour les mesures.
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  await new Promise((r) => setTimeout(r, 1800));

  console.log(`\n== ${vp.name}  ${vp.w}x${vp.h} ==`);

  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const doc = document.documentElement;

    // Elements qui depassent reellement le bord droit ou gauche du viewport.
    const overflow = [];
    // Un element rogne par un ancetre qui coupe (overflow hidden ou clip) et
    // qui tient lui-meme dans l'ecran ne deborde pas : c'est voulu (bande
    // inclinee, verbes geants, captures tournees). body et html ne comptent pas.
    const clipped = (el) => {
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox === 'hidden' || ox === 'clip') {
          const r = a.getBoundingClientRect();
          if (r.left >= -1 && r.right <= vw + 1) return true;
        }
      }
      return false;
    };
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      if (clipped(el)) continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 && b.height === 0) continue;
      const right = b.right - vw;
      if (right > 1 || b.left < -1) {
        overflow.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().split(' ').filter(Boolean).slice(0, 3).join('.'),
          left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width),
          txt: (el.textContent || '').trim().slice(0, 28),
        });
      }
    }
    // On ne garde que les plus externes : un parent qui deborde emmene ses enfants.
    const trimmed = overflow.filter((o, i) => !overflow.some((p, j) =>
      j !== i && p.left <= o.left && p.right >= o.right && p.w > o.w));

    const nav = document.querySelector('.nav__in');
    const navRect = nav ? nav.getBoundingClientRect() : null;
    const navItems = [...document.querySelectorAll('.nav__links a, .nav__name, .avail, .themebtn')]
      .filter((e) => getComputedStyle(e).display !== 'none')
      .map((e) => ({ t: e.textContent.trim().slice(0, 12), ...e.getBoundingClientRect().toJSON() }));
    // On compare les CENTRES verticaux, pas les `top` : des elements de
    // hauteurs differentes alignes sur une meme ligne ont des `top` differents.
    const centers = navItems.map((i) => i.top + i.height / 2);
    const navLines = centers.length
      ? centers.reduce((acc, c) => acc.some((v) => Math.abs(v - c) < 6) ? acc : [...acc, c], []).length
      : 0;

    // Cibles tactiles : 24x24 minimum (WCAG 2.2 AA, critere 2.5.8).
    //
    // On ne mesure PAS la boite de l'element : la zone cliquable peut etre
    // etendue par un pseudo-element, ce qui est justement la technique
    // employee ici pour ne pas decaler la mise en page. On pointe donc les
    // quatre coins d'un carre de 24 px centre sur l'element et on regarde si
    // le clic y atterrirait bien sur le lien.
    const REQ = 24;
    const hits = (el, x, y) => {
      const t = document.elementFromPoint(x, y);
      return !!t && (t === el || el.contains(t) || t.contains(el));
    };
    const small = [];
    for (const el of document.querySelectorAll('a, button')) {
      if (getComputedStyle(el).display === 'none') continue;
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.bottom < 0 || b.top > innerHeight) continue;
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      const h = REQ / 2 - 1;
      const corners = [[cx - h, cy - h], [cx + h, cy - h], [cx - h, cy + h], [cx + h, cy + h]];
      if (!corners.every(([x, y]) => hits(el, x, y))) {
        small.push(`${el.tagName.toLowerCase()}.${(el.className || '').toString().split(' ')[0]} ${Math.round(b.width)}x${Math.round(b.height)}`);
      }
    }

    const h1 = document.querySelector('h1');
    const h1cs = h1 ? getComputedStyle(h1) : null;

    // Le bouton d'appel doit tenir dans le premier ecran, sans defilement.
    const cta = document.querySelector('.hero__cta .btn');
    const ctaBox = cta ? cta.getBoundingClientRect() : null;

    return {
      vw,
      scrollW: doc.scrollWidth,
      overflowX: doc.scrollWidth > vw + 1,
      offenders: trimmed.slice(0, 8),
      navH: navRect ? Math.round(navRect.height) : 0,
      navLines,
      smallTargets: [...new Set(small)].slice(0, 6),
      h1Size: h1cs ? parseFloat(h1cs.fontSize) : 0,
      h1Lines: h1 ? Math.round(h1.getBoundingClientRect().height / parseFloat(h1cs.lineHeight)) : 0,
      ctaBottom: ctaBox ? Math.round(ctaBox.bottom) : 0,
      ctaVisible: !!ctaBox && ctaBox.bottom <= innerHeight && ctaBox.top >= 0,
      bodyFont: parseFloat(getComputedStyle(document.body).fontSize),
    };
  });

  if (r.overflowX) bad(`debordement horizontal : scrollWidth ${r.scrollW} > ${r.vw}`);
  else ok('aucun debordement horizontal');

  if (r.offenders.length) {
    bad(`${r.offenders.length} element(s) hors cadre :`);
    for (const o of r.offenders) {
      console.log(`          <${o.tag} class="${o.cls}"> x ${o.left}..${o.right} (l=${o.w})  "${o.txt}"`);
    }
  } else ok('tous les elements tiennent dans la largeur');

  if (r.navLines > 1) bad(`navigation sur ${r.navLines} lignes`);
  else ok(`navigation sur une ligne, hauteur ${r.navH}px`);

  // Le critere ne vaut que pour le pointage tactile.
  if (vp.mobile) {
    if (r.smallTargets.length) bad(`zone tactile < 24px : ${r.smallTargets.join(', ')}`);
    else ok('zones tactiles suffisantes');
  }

  if (r.h1Lines > 3) bad(`titre sur ${r.h1Lines} lignes (${Math.round(r.h1Size)}px)`);
  else ok(`titre sur ${r.h1Lines} ligne(s), ${Math.round(r.h1Size)}px`);

  if (!r.ctaVisible) bad(`bouton d'appel sous le pli : bas a ${r.ctaBottom}px pour ${vp.h}px d ecran`);
  else ok(`bouton d'appel visible sans defiler (bas a ${r.ctaBottom}px)`);

  if (r.bodyFont < 14) bad(`texte courant a ${r.bodyFont}px`);

  // --- les formes de la scene doivent avoir leur place a chaque chapitre --
  // Chaque chapitre est colle : on se place au milieu et on mesure
  // l'emplacement de la forme. Il doit etre entierement a l'ecran, occuper au
  // moins un quart de sa hauteur, et ne pas passer sous le texte.
  const chapters = await page.evaluate(async () => {
    const out = [];
    for (const id of ['voir', 'entendre', 'decider']) {
      const sec = document.getElementById(id);
      window.scrollTo(0, sec.offsetTop + (sec.offsetHeight - innerHeight) / 2);
      await new Promise((r) => setTimeout(r, 260));
      const slot = sec.querySelector('.slot').getBoundingClientRect();
      const text = sec.querySelector('.chap__text').getBoundingClientRect();
      const ix = Math.max(0, Math.min(slot.right, text.right) - Math.max(slot.left, text.left));
      const iy = Math.max(0, Math.min(slot.bottom, text.bottom) - Math.max(slot.top, text.top));
      out.push({
        id,
        inView: slot.top >= -1 && slot.bottom <= innerHeight + 1 && slot.left >= -1 && slot.right <= innerWidth + 1,
        pct: Math.round((slot.height / innerHeight) * 100),
        textIn: text.top >= 0 && text.bottom <= innerHeight + 1,
        overlap: Math.round((ix * iy) / Math.max(1, text.width * text.height) * 100),
      });
    }
    window.scrollTo(0, 0);
    return out;
  });
  for (const c of chapters) {
    const why = [];
    if (!c.inView) why.push('emplacement hors ecran');
    if (c.pct < 25) why.push(`emplacement trop petit (${c.pct} %)`);
    if (!c.textIn) why.push('texte coupe');
    if (c.overlap > 5) why.push(`texte sur la forme (${c.overlap} %)`);
    if (why.length) bad(`chapitre ${c.id} : ${why.join(', ')}`);
    else ok(`chapitre ${c.id} : forme sur ${c.pct} % de l ecran, texte degage`);
  }

  if (SHOTS) {
    const f = `tests/shots/responsive/${vp.name}.png`;
    await page.screenshot({ path: path.join(ROOT, f), fullPage: false });
    console.log(`        ${f}`);
  }
  await page.close();
}

await browser.close();
if (server) server.close();
console.log(fails === 0 ? '\nRESPONSIVE OK\n' : `\n${fails} PROBLEME(S)\n`);
process.exit(fails === 0 ? 0 : 1);
