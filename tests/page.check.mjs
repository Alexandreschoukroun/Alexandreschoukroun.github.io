/**
 * Controle de la page dans un vrai navigateur.
 *
 * Sert un serveur statique, ouvre Chrome en mode headless, remonte les erreurs
 * console et verifie que le canvas WebGL dessine reellement quelque chose.
 * Enregistre aussi des captures, une par plan de la scene.
 *
 *   node tests/page.check.mjs [--shots]
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5399;
const SHOTS = process.argv.includes('--shots');

// --url permet de controler le site deja en ligne au lieu du serveur local.
const urlArg = process.argv.find((a) => a.startsWith('--url='));
const TARGET = urlArg ? urlArg.slice(6).replace(/\/$/, '') : null;

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p));

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png',
  '.json': 'application/json', '.pdf': 'application/pdf',
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
const check = (name, cond, extra = '') => {
  console.log((cond ? '  ok    ' : '  ECHEC ') + name + (extra ? '  ' + extra : ''));
  if (!cond) fails++;
  return cond;
};

const server = TARGET ? null : await serve();
const BASE = TARGET || `http://127.0.0.1:${PORT}`;
if (TARGET) console.log(`cible : ${TARGET}`);
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--enable-unsafe-swiftshader',   // WebGL logiciel : pas de GPU en headless
    '--use-gl=angle', '--use-angle=swiftshader',
    '--hide-scrollbars', '--no-sandbox',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const errors = [];
const warnings = [];
page.on('console', (m) => {
  const t = m.type();
  if (t === 'error') errors.push(m.text());
  else if (t === 'warning') warnings.push(m.text());
});
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.message || e)));
page.on('requestfailed', (r) => errors.push(`requete echouee: ${r.url()} (${r.failure()?.errorText})`));

console.log('\n-- chargement --');
await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 45000 });

// La scene est chargee en requestIdleCallback : on lui laisse le temps.
await page.waitForFunction(
  () => document.getElementById('viz')?.classList.contains('is-live'),
  { timeout: 25000 }
).catch(() => {});
await new Promise((r) => setTimeout(r, 2500));

const state = await page.evaluate(() => {
  const c = document.getElementById('viz');
  const fb = document.getElementById('vizfallback');
  const r = c.getBoundingClientRect();
  return {
    live: c.classList.contains('is-live'),
    fallbackHidden: fb ? fb.hidden : null,
    w: Math.round(r.width), h: Math.round(r.height),
    drawW: c.width, drawH: c.height,
    opacity: getComputedStyle(c).opacity,
    booted: document.documentElement.hasAttribute('data-booted'),
    hasJsClass: document.documentElement.classList.contains('js'),
    stageH: document.getElementById('stage')?.offsetHeight,
  };
});

check('le module principal a demarre', state.booted);
check('le canvas est passe en direct', state.live,
  `live=${state.live} fallback masque=${state.fallbackHidden}`);
check('le canvas a une taille non nulle', state.w > 100 && state.h > 100, `${state.w}x${state.h} css`);
check('le backbuffer est alloue', state.drawW > 100 && state.drawH > 100, `${state.drawW}x${state.drawH} px`);
check('le canvas est opaque', state.opacity === '1', `opacity=${state.opacity}`);

console.log('\n-- erreurs console --');
if (errors.length === 0) console.log('  aucune');
for (const e of errors.slice(0, 12)) console.log('  ' + e.slice(0, 220));
check('aucune erreur console', errors.length === 0, `${errors.length} erreur(s)`);

// main.js rattrape l'echec de la scene avec un console.warn : sans lire les
// avertissements, une scene qui ne charge pas reste parfaitement silencieuse.
console.log('\n-- avertissements --');
if (warnings.length === 0) console.log('  aucun');
for (const w of warnings.slice(0, 12)) console.log('  ' + w.slice(0, 300));

console.log('\n-- sonde WebGL et imports --');
const probe = await page.evaluate(async () => {
  const out = {};
  try {
    const c = document.createElement('canvas');
    out.webgl2 = !!c.getContext('webgl2');
    out.webgl1 = !!c.getContext('webgl');
  } catch (e) { out.webglError = String(e); }
  out.cores = navigator.hardwareConcurrency;
  out.innerWidth = window.innerWidth;
  try {
    await import('three');
    out.threeOk = true;
  } catch (e) { out.threeError = String((e && e.message) || e); }
  try {
    const m = await import('./scripts/scene/index.js');
    out.sceneModuleOk = typeof m.createScene === 'function';
  } catch (e) { out.sceneImportError = String((e && e.message) || e); }
  return out;
});
for (const [k, v] of Object.entries(probe)) console.log(`  ${k} = ${v}`);

// Pas de lecture de pixels ici : readPixels depuis l'exterieur de la boucle
// de rendu tombe sur un backbuffer deja presente, donc vide. La verification
// visuelle passe par les captures (--shots), relues a la main.

console.log('\n-- bascule de langue --');
const langBtn = await page.$('#langbtn');
check('le bouton de langue existe', !!langBtn);
if (langBtn) {
  const fr = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    h1: document.querySelector('h1').textContent.trim(),
    nav: document.querySelector('.nav__links a[href="#experience"]').textContent.trim(),
    contact: document.querySelector('#contact h2').textContent.trim(),
  }));
  check('la page demarre en francais', fr.lang === 'fr', `h1="${fr.h1}"`);

  await langBtn.click();
  await new Promise((r) => setTimeout(r, 600));
  const en = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    h1: document.querySelector('h1').textContent.trim(),
    nav: document.querySelector('.nav__links a[href="#experience"]').textContent.trim(),
    contact: document.querySelector('#contact h2').textContent.trim(),
    title: document.title,
    hud: document.getElementById('hud-state').textContent.trim(),
    // Couverture : toute cle posee dans le HTML doit exister dans le
    // dictionnaire. C'est ce qui attrape un bloc oublie a la traduction,
    // la ou chercher des accents signale a tort les noms propres.
    keysInDom: [...document.querySelectorAll('[data-i18n]')].map((el) => el.dataset.i18n)
      .concat([...document.querySelectorAll('[data-i18n-attr]')]
        .flatMap((el) => el.dataset.i18nAttr.split(',').map((x) => x.split(':')[1].trim()))),
  }));
  check('lang passe a en', en.lang === 'en');
  check('le titre h1 est traduit', en.h1 !== fr.h1, `"${en.h1}"`);
  check('la navigation est traduite', en.nav === 'Experience', `"${en.nav}"`);
  check('le contact est traduit', en.contact !== fr.contact, `"${en.contact}"`);
  check('le titre du document est traduit', /embedded/i.test(en.title), `"${en.title}"`);
  check('le HUD est traduit', !/[éè]/.test(en.hud), `"${en.hud}"`);
  const { EN } = await import('../scripts/i18n/en.js');
  const missing = [...new Set(en.keysInDom)].filter((k) => !(k in EN));
  check('toutes les cles du HTML sont traduites', missing.length === 0,
    missing.length ? missing.join(' ') : `${new Set(en.keysInDom).size} cles couvertes`);

  const unused = Object.keys(EN).filter((k) => !en.keysInDom.includes(k) && !k.startsWith('hud.') && k !== 'nav.langLabel');
  check('aucune entree morte dans le dictionnaire', unused.length === 0, unused.join(' '));

  if (SHOTS) {
    fs.mkdirSync(path.join(ROOT, 'tests/shots'), { recursive: true });
    await page.screenshot({ path: path.join(ROOT, 'tests/shots/en-heros.png') });
    console.log('  tests/shots/en-heros.png');
  }

  await langBtn.click();
  await new Promise((r) => setTimeout(r, 400));
  const back = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    h1: document.querySelector('h1').textContent.trim(),
  }));
  check('retour au francais', back.lang === 'fr' && back.h1 === fr.h1, `"${back.h1}"`);
}

if (SHOTS) {
  console.log('\n-- captures --');
  fs.mkdirSync(path.join(ROOT, 'tests/shots'), { recursive: true });
  const stageH = state.stageH || 4000;
  const vh = 900;
  for (const [name, p] of [['0-heros', 0], ['1-acquisition', 0.5], ['2-inference', 0.75], ['3-decision', 1]]) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(p * (stageH - vh)));
    await new Promise((r) => setTimeout(r, 2200));   // laisser la camera arriver
    const f = `tests/shots/${name}.png`;
    await page.screenshot({ path: path.join(ROOT, f) });
    console.log('  ' + f);
  }
}

await browser.close();
if (server) server.close();

console.log(fails === 0 ? '\nPAGE OK\n' : `\n${fails} ECHEC(S)\n`);
process.exit(fails === 0 ? 0 : 1);
