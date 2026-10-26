// Her oyunu ayrı bir web oyunu olarak paketler: dist/oyunlar/<id>.zip
// İçinde: index.html (yalnızca o oyun), oyun dosyaları, 2 kapak görseli, bilgi.txt
// Kullanım: node tools/package-games.mjs [oyun-id ...]
// Gerekenler: playwright (kapaklar için) ve sistemde `zip` komutu.
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { ROOT } from './common.mjs';
import { GAMES, CATEGORIES } from '../js/core/registry.js';
import { DIFFICULTIES, LEVELS_PER_DIFFICULTY } from '../js/core/config.js';

const OUT = path.join(ROOT, 'dist', 'oyunlar');
const meta = JSON.parse(readFileSync(path.join(ROOT, 'tools', 'store-meta.json'), 'utf8'));
const only = process.argv.slice(2);
const entries = GAMES.filter((g) => !only.length || only.includes(g.id));

// Kategoriye göre kapak renkleri
const THEME = {
  number: { bg: '#ffd84d', grid: '#e9bd1f', pop: '#ff6b5b' },
  visual: { bg: '#8fd8ff', grid: '#5fbde9', pop: '#ff6b5b' },
  spatial: { bg: '#a6e8a0', grid: '#7cc976', pop: '#ff8a3d' },
  path: { bg: '#ffb1a6', grid: '#ec8f82', pop: '#3f6bff' },
  verbal: { bg: '#dcc2ff', grid: '#bb9cec', pop: '#ff6b5b' },
  geometry: { bg: '#ffc38a', grid: '#eba25e', pop: '#3f6bff' },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function indexHtml(id, game) {
  return `<!doctype html>
<html lang="tr" data-game="${id}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(game.name)}</title>
  <meta name="description" content="${esc(game.description)}">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="topbar">
    <a href="#/" class="brand">${game.icon} ${esc(game.name)}</a>
  </header>
  <main id="app" class="container"></main>
  <div id="toast" class="toast" role="status" aria-live="polite"></div>
  <script type="module" src="js/app.js"></script>
</body>
</html>
`;
}

function infoText(id, game, category) {
  const m = meta[id];
  return [
    `Oyun Adı: ${game.name}`,
    `Kategori: ${m.category}`,
    `Etiketler: ${m.tags.join(', ')}`,
    '',
    `Kısa açıklama: ${game.description}`,
    '',
    `Uzun açıklama: ${game.rules.replace(/\s*Her (bulmacanın|mesajın) tek (bir )?(doğru )?çözümü vardır[^.]*\./, '').trim()} ` +
      `Kolay, Orta ve Zor seviyelerde ${LEVELS_PER_DIFFICULTY}'şer level var (toplam ${DIFFICULTIES.length * LEVELS_PER_DIFFICULTY}). ` +
      `Her bulmacanın tek bir çözümü vardır. Takılınca ${game.boosters.map((b) => b.name).join(', ')} boosterları yardım eder.`,
    '',
    `Oyun grubu: ${category}`,
    'Kapaklar: thumbnail-1280x720.png, thumbnail-512x512.png',
    '',
  ].join('\n');
}

// --- Klasörleri hazırla ---
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const games = [];
for (const entry of entries) {
  const game = (await import(pathToFileURL(path.join(ROOT, 'games', entry.id, 'index.js')).href)).default;
  const dir = path.join(OUT, entry.id);
  mkdirSync(dir, { recursive: true });
  cpSync(path.join(ROOT, 'css'), path.join(dir, 'css'), { recursive: true });
  cpSync(path.join(ROOT, 'js'), path.join(dir, 'js'), { recursive: true });
  cpSync(path.join(ROOT, 'games', entry.id), path.join(dir, 'games', entry.id), { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), indexHtml(entry.id, game));
  const categoryName = CATEGORIES.find((c) => c.id === entry.category).name;
  writeFileSync(path.join(dir, 'bilgi.txt'), infoText(entry.id, game, categoryName));
  games.push({ ...entry, game, dir, categoryName });
}

// --- Kapak görselleri ---
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer((req, res) => {
  const file = path.join(OUT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(OUT) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(0);
const port = server.address().port;

function coverHtml(g, boardPng, w, h) {
  const t = THEME[g.category];
  const square = w === h;
  const u = Math.min(w, h) / (square ? 64 : 72);
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: ${w}px; height: ${h}px; overflow: hidden; }
  body { font-family: system-ui, sans-serif; background: ${t.bg}; position: relative; color: #1d2b53; }
  body::before { content: ""; position: absolute; inset: 0; opacity: .55;
    background-image: linear-gradient(${t.grid} 2px, transparent 2px), linear-gradient(90deg, ${t.grid} 2px, transparent 2px);
    background-size: ${u * 6}px ${u * 6}px; }
  .wrap { position: relative; height: 100%; display: flex; align-items: center; gap: ${u * 4}px; padding: ${u * 5}px; }
  .text { flex: 1; min-width: 0; }
  .chip { display: inline-block; background: #1d2b53; color: ${t.bg}; font-weight: 800; font-size: ${u * 2.3}px;
    padding: ${u * 0.6}px ${u * 1.6}px; border-radius: 999px; letter-spacing: .04em; text-transform: uppercase; }
  .icon { font-size: ${u * 8}px; line-height: 1; margin-top: ${u * 2}px; }
  h1 { font-size: ${u * (g.game.name.length > 14 ? 7.2 : 9)}px; line-height: 1; font-weight: 800; margin: ${u * 1.2}px 0 ${u * 1.4}px;
    text-shadow: ${u * 0.5}px ${u * 0.5}px 0 ${t.pop}; text-wrap: balance; }
  .sub { font-size: ${u * 2.8}px; font-weight: 700; }
  .card { flex: none; background: #fff; border: ${u * 0.5}px solid #1d2b53; border-radius: ${u * 2.4}px;
    box-shadow: ${u * 0.9}px ${u * 0.9}px 0 #1d2b53; padding: ${u * 1.2}px; transform: rotate(3deg);
    display: grid; place-items: center; overflow: hidden; }
  .card img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
  body:not(.sq) .card { width: ${u * 52}px; height: ${u * 60}px; }
  body.sq .wrap { flex-direction: column; align-items: center; text-align: center; gap: ${u * 2.4}px; padding: ${u * 4}px ${u * 5}px ${u * 5}px; }
  body.sq .text { flex: none; }
  body.sq .icon { display: none; }
  body.sq h1 { margin-bottom: 0; font-size: ${u * (g.game.name.length > 18 ? 5.6 : g.game.name.length > 11 ? 6.6 : 8)}px; }
  body.sq .card { flex: 1 1 auto; min-height: 0; width: ${u * 46}px; transform: rotate(-2deg); }
</style></head><body class="${square ? 'sq' : ''}"><div class="wrap">
  <div class="text">
    <span class="chip">${esc(g.categoryName)}</span>
    <div class="icon">${g.game.icon}</div>
    <h1>${esc(g.game.name)}</h1>
    ${square ? '' : `<p class="sub">3 seviye · ${DIFFICULTIES.length * LEVELS_PER_DIFFICULTY} level · ipuçlarıyla öğren</p>`}
  </div>
  <div class="card"><img src="data:image/png;base64,${boardPng.toString('base64')}" alt=""></div>
</div></body></html>`;
}

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
for (const g of games) {
  const page = await browser.newPage({ viewport: { width: 640, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await page.addInitScript((id) => {
    try { localStorage.setItem('akiloyunlari:howto', JSON.stringify({ [id]: true })); } catch {}
  }, g.id);
  await page.goto(`http://localhost:${port}/${g.id}/index.html#/${g.id}/medium/1`);
  await page.waitForSelector('.booster');
  await page.addStyleTag({ content: '.toast{display:none!important}' });
  // Izgara oyunlarında birkaç doğru parçayı açarak tahtayı canlandır (soru tipi oyunlarda ilk booster şık eler).
  const first = g.game.boosters[0].id;
  if (!['fifty', 'half'].includes(first)) {
    for (let i = 0; i < 3; i++) await page.click(`.booster[data-id="${first}"]`).catch(() => {});
  }
  await page.waitForTimeout(700);
  const board = await page.locator('#board').screenshot();
  await page.close();
  for (const [w, h] of [[1280, 720], [512, 512]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.setContent(coverHtml(g, board, w, h));
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(g.dir, `thumbnail-${w}x${h}.png`) });
    await p.close();
  }
  console.log(`${g.id}: kapaklar hazır`);
}
await browser.close();
server.close();

// --- Zip ---
for (const g of games) {
  const zip = path.join(OUT, `${g.id}.zip`);
  execFileSync('zip', ['-qr', '-X', zip, '.'], { cwd: g.dir });
  console.log(`${g.id}.zip`);
}

// --- Hepsi bir arada: 21 zip + oyun listesi ---
if (!only.length) {
  const list = games.map((g) => readFileSync(path.join(g.dir, 'bilgi.txt'), 'utf8').split('\n\nOyun grubu')[0]);
  writeFileSync(path.join(OUT, 'OYUNLAR.txt'), `${games.length} oyun — her biri ayrı zip olarak yüklenir.\n\n` +
    games.map((g, i) => `### ${g.id}.zip\n${list[i]}\n`).join('\n'));
  const all = path.join(ROOT, 'dist', 'akil-oyunlari-ayri-oyunlar.zip');
  rmSync(all, { force: true });
  execFileSync('zip', ['-q', '-X', all, 'OYUNLAR.txt', ...games.map((g) => `${g.id}.zip`)], { cwd: OUT });
  console.log(`\n${path.relative(ROOT, all)} hazır`);
}
