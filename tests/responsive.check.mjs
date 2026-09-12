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
  await new Promise((r) => setTimeout(r, 1800));

  console.log(`\n== ${vp.name}  ${vp.w}x${vp.h} ==`);

  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const doc = document.documentElement;

    // Elements qui depassent reellement le bord droit ou gauche du viewport.
    const overflow = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
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
    const navItems = [...document.querySelectorAll('.nav__links a, .nav__name, .themebtn')]
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
      vizH: Math.round((document.querySelector('.stage__viz')?.getBoundingClientRect().height) || 0),
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

  // --- le canvas doit rester visible pendant tout le bloc scene -----------
  // C'est la regression a empecher : un canvas non colle defile et disparait,
  // on passe du plan d'ouverture directement a la section suivante.
  const story = await page.evaluate(async () => {
    const stage = document.getElementById('stage');
    const viz = document.querySelector('.stage__viz');
    if (!stage || !viz) return null;
    const travel = stage.offsetHeight - innerHeight;
    const out = [];
    for (const frac of [0, 0.25, 0.5, 0.75, 1]) {
      window.scrollTo(0, Math.round(stage.offsetTop + frac * travel));
      await new Promise((r) => setTimeout(r, 260));
      const b = viz.getBoundingClientRect();
      const visible = Math.max(0, Math.min(b.bottom, innerHeight) - Math.max(b.top, 0));
      out.push({ frac, visible: Math.round(visible), pct: Math.round((visible / innerHeight) * 100) });
    }
    window.scrollTo(0, 0);
    return { travel: Math.round(travel), steps: out, sticky: getComputedStyle(viz).position };
  });

  if (story) {
    const worst = Math.min(...story.steps.map((x) => x.pct));
    if (worst < 25) {
      bad(`la scene disparait pendant le defilement (${story.sticky}) : ` +
        story.steps.map((x) => `${x.frac}=${x.pct}%`).join(' '));
    } else {
      ok(`scene visible tout du long (min ${worst}% de l ecran, ${story.sticky})`);
    }
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
