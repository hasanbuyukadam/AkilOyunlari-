// Duman testi: her oyunu gerçek tarayıcıda (Playwright/Chromium) açar, başlatır,
// rastgele tuşlara basar ve konsol hatası / oyun içi hata olup olmadığını kontrol eder.
//
//   node atari/tools/smoke.mjs                 # tüm oyunlar
//   node atari/tools/smoke.mjs yilan tank-90   # seçili oyunlar
//   node atari/tools/smoke.mjs --shots ./out --seconds 12 yilan
//
// Playwright kurulu olmalıdır (require('playwright')).
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const shots = opt('--shots', null);
const seconds = Number(opt('--seconds', 8));
const { GAMES } = await import(join(ROOT, 'js/games.js'));
const ids = args.length ? args : GAMES.map((g) => g.id);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
  try {
    const file = !path || path === '.' ? 'index.html' : path;
    const body = await readFile(join(ROOT, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('yok');
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;
if (shots) await mkdir(shots, { recursive: true });

const browser = await chromium.launch();
const KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'z', 'x', 'c', 'Space'];
let failed = 0;

async function check(name, fn) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on('requestfailed', (r) => { if (!/fonts\./.test(r.url())) errors.push(`requestfailed: ${r.url()}`); });
  try {
    await fn(page, errors);
  } catch (e) {
    errors.push(`exception: ${e.message}`);
  }
  if (errors.length) {
    failed++;
    console.log(`✗ ${name}\n  ${errors.slice(0, 8).join('\n  ')}`);
  } else {
    console.log(`✓ ${name}`);
  }
  await page.close();
}

// Menü: tüm küçük resimler üretilebiliyor mu?
if (!args.length) {
  await check('menü', async (page, errors) => {
    await page.goto(base);
    await page.waitForTimeout(4000);
    const noimg = await page.$$eval('.label.noimg canvas', (els) => els.map((e) => e.dataset.id));
    if (noimg.length) errors.push(`önizleme üretilemedi: ${noimg.join(', ')}`);
    if (shots) await page.screenshot({ path: join(shots, '_menu.png'), fullPage: true });
  });
}

for (const id of ids) {
  await check(id, async (page, errors) => {
    await page.goto(`${base}#/oyun/${id}`);
    await page.waitForSelector('canvas');
    await page.waitForTimeout(300);
    if (shots) await page.screenshot({ path: join(shots, `${id}-0-title.png`) });
    await page.keyboard.press('Enter');
    const end = Date.now() + seconds * 1000;
    let restarts = 0;
    let shot = 1;
    const shotEvery = (seconds * 1000) / 3;
    let nextShot = Date.now() + shotEvery;
    while (Date.now() < end) {
      const k = KEYS[Math.floor(Math.random() * KEYS.length)];
      await page.keyboard.down(k);
      await page.waitForTimeout(40 + Math.random() * 200);
      await page.keyboard.up(k);
      const state = await page.$eval('.overlay', (o) => (o.classList.contains('show') ? o.querySelector('h2')?.textContent : ''));
      if (state === 'HATA') {
        errors.push(`oyun içi hata: ${await page.$eval('.overlay .desc', (e) => e.textContent)}`);
        break;
      }
      if (state === 'YENİ REKOR!') {
        await page.keyboard.press('Enter');
      } else if (state === 'OYUN BİTTİ') {
        restarts++;
        await page.keyboard.press('Enter');
      }
      if (shots && Date.now() > nextShot && shot < 3) {
        await page.screenshot({ path: join(shots, `${id}-${shot++}.png`) });
        nextShot += shotEvery;
      }
    }
    if (shots) await page.screenshot({ path: join(shots, `${id}-${shot}.png`) });
    if (restarts) console.log(`  (${id}: ${restarts} kez oyun bitti ve yeniden başladı)`);
  });
}

await browser.close();
server.close();
console.log(failed ? `\n${failed} test başarısız` : '\nTüm testler geçti');
process.exit(failed ? 1 : 0);
