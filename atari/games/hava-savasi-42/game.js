// Hava Savaşı 42 — 1942 tarzı dikey kaydırmalı uçak savaşı.
// Uçak gemisinden kalkış, adalı okyanus, filolar, ağır bombardıman uçakları,
// kırmızı filodan düşen POW güçlendirmeleri, takla ile kaçış ve aşama sonu boss + iniş.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'hava-savasi-42',
  width: 224,
  height: 256,
  buttons: { a: 'ATEŞ', b: 'TAKLA' },
  help: [
    'Ok tuşları: uçağı 8 yönde uçur. A (Z/Boşluk): ateş, basılı tut: seri ateş.',
    'B (X): TAKLA at — kısa süre dokunulmaz olursun. Her aşamada 3 takla hakkın var.',
    'Kırmızı filonun hepsini düşür: POW çıkar (çift ateş, yan uçaklar, bomba, ekstra takla).',
    'Aşama sonunda dev bombardıman uçağını indir; uçak gemisine inişte düşürme oranı kadar bonus.',
  ],
};

const W = 224;
const H = 256;
const DEG = Math.PI / 180;
const SCROLL = 0.5;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------- Tohumlu rastgele (ada ve deniz desenleri hep aynı olsun) ----------
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ---------- Döndürülmüş sprite ----------
function rotSet(rows, pal, n = 16) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const m = Math.max(w, h);
  const S = m + 2 * Math.ceil((Math.hypot(w, h) - m) / 2) + ((m - w) % 2);
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const c = canvas(S, S);
    const ctx = c.getContext('2d');
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x + 0.5 - S / 2;
        const dy = y + 0.5 - S / 2;
        const sx = Math.floor(dx * ca + dy * sa + w / 2);
        const sy = Math.floor(-dx * sa + dy * ca + h / 2);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        const col = pal[rows[sy][sx]];
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    out.push(c);
  }
  return out;
}
// Düşman sprite'ları aşağı bakıyor (burun altta).
const dirIndex = (th) => ((Math.round((th / DEG - 90) / 22.5) % 16) + 16) % 16;
const shadowPal = (pal) => Object.fromEntries(Object.keys(pal).map((k) => [k, '#000']));

// ---------- Oyuncu uçağı (çift gövdeli) ----------
const PLAYER_ROWS = [
  [
    '..PPPP....PPPP..',
    '...W...WW...W...',
    '..WSW..WW..WSW..',
    'WWWWWWWWWWWWWWWW',
    'SWWWWWWBBWWWWWWS',
    '..WSW.WBBW.WSW..',
    '..WSW..WW..WSW..',
    '...W...SS...W...',
    '...W........W...',
    '...W........W...',
    '..RWWWWWWWWWWR..',
    '..S..........S..',
  ],
  [
    '...P........P...',
    '...W...WW...W...',
    '..WSW..WW..WSW..',
    'WWWWWWWWWWWWWWWW',
    'SWWWWWWBBWWWWWWS',
    '..WSW.WBBW.WSW..',
    '..WSW..WW..WSW..',
    '...W...SS...W...',
    '...W........W...',
    '...W........W...',
    '..RWWWWWWWWWWR..',
    '..S..........S..',
  ],
];
const PAL_PLAYER = { W: '#e2e2da', S: '#8f948c', B: '#3a8cff', R: '#e03030', P: '#d8d8d8' };
const PLAYER_SPR = PLAYER_ROWS.map((r) => makeSprite(r, PAL_PLAYER));
const PLAYER_SHADOW = makeSprite(PLAYER_ROWS[1], shadowPal(PAL_PLAYER));
const MINI_SPR = makeSprite([
  '..P...P..',
  '.WSW.WSW.',
  'WWWWWWWWW',
  '.WSWBWSW.',
  '..W...W..',
  '.RWWWWWR.',
], PAL_PLAYER);
const LIFE_ICON = makeSprite([
  '.W....W.',
  'WWWWWWWW',
  '.WS..SW.',
  '.W....W.',
  '.WWWWWW.',
], PAL_PLAYER);

// ---------- Küçük düşman avcı (burun aşağı) ----------
const FIGHTER_ROWS = [
  '......G......',
  '....GGGGG....',
  '......G......',
  '......G......',
  'GDGGGGGGGGGDG',
  'GGRGGGGGGGRGG',
  '.GGGGGGGGGGG.',
  '......G......',
  '.....GKG.....',
  '......D......',
  '.....YYY.....',
];
const PAL_GREEN = { G: '#5a8a3a', D: '#3a5a26', R: '#e83030', K: '#8ad0ff', Y: '#e0e0e0' };
const PAL_RED = { G: '#d83a2a', D: '#8a1a14', R: '#ffffff', K: '#8ad0ff', Y: '#e0e0e0' };
const PAL_GRAY = { G: '#8a8f9a', D: '#5a5f6a', R: '#e83030', K: '#8ad0ff', Y: '#e0e0e0' };
const FIGHTER = {
  green: rotSet(FIGHTER_ROWS, PAL_GREEN),
  red: rotSet(FIGHTER_ROWS, PAL_RED),
  gray: rotSet(FIGHTER_ROWS, PAL_GRAY),
  shadow: rotSet(FIGHTER_ROWS, shadowPal(PAL_GREEN)),
};

// ---------- Büyük uçaklar (prosedürel çizim) ----------
// Burun aşağıda. engines: kanattaki motor sayısı.
function bigPlane(span, len, engines, col, flash) {
  const c = canvas(span, len);
  const g = c.getContext('2d');
  const base = flash ? '#ffffff' : col.body;
  const dark = flash ? '#ffffff' : col.dark;
  const light = flash ? '#ffffff' : col.light;
  const cx = Math.floor(span / 2);
  const fw = Math.max(6, Math.round(span * 0.12)) & ~1;
  const R = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  // yatay kuyruk (üstte)
  const tw = Math.round(span * 0.38);
  R(cx - tw / 2, 2, tw, Math.max(3, len * 0.07), base);
  R(cx - tw / 2, 2, tw, 1, light);
  R(cx - 1, 0, 2, Math.max(5, len * 0.12), dark);
  // ana kanat
  const wy = Math.round(len * 0.48);
  const wh = Math.max(5, Math.round(len * 0.16));
  for (let i = 0; i < wh; i++) {
    const inset = Math.round((wh - i) * 0.6);
    R(inset, wy + i, span - inset * 2, 1, i === 0 ? light : i === wh - 1 ? dark : base);
  }
  // gövde
  R(cx - fw / 2, 3, fw, len - 6, base);
  R(cx - fw / 2, 3, 1, len - 6, light);
  R(cx + fw / 2 - 1, 3, 1, len - 6, dark);
  // burun ve kokpit
  R(cx - fw / 2 + 1, len - 6, fw - 2, 3, base);
  R(cx - fw / 2 + 2, len - 3, fw - 4, 2, dark);
  R(cx - 2, len - 12, 4, 4, flash ? '#fff' : '#9ad8ff');
  R(cx - 1, Math.round(len * 0.25), 2, 2, flash ? '#fff' : '#9ad8ff');
  // motorlar
  for (let k = 0; k < engines; k++) {
    const t = (k + 0.5) / engines;
    let ex = Math.round(span * 0.12 + t * span * 0.76);
    if (Math.abs(ex - cx) < fw) ex += ex < cx ? -fw : fw;
    R(ex - 2, wy - 3, 5, wh + 7, dark);
    R(ex - 1, wy - 2, 3, wh + 6, base);
    R(ex - 1, wy + wh + 3, 3, 1, light);
  }
  // panel çizgileri, kamuflaj lekeleri, taretler (yalnız boyalı piksellerin üstüne)
  if (!flash && col.body !== '#000') {
    g.globalCompositeOperation = 'source-atop';
    const r = lcg(span * 31 + len);
    for (let x = 4; x < span - 4; x += 6) R(x, wy + 1, 1, wh - 2, col.dark);
    for (let i = 0; i < span / 3; i++) {
      const bx = r() * span;
      const by = r() * len;
      R(bx, by, 2 + r() * 4, 1 + r() * 2, r() < 0.5 ? col.dark : col.light);
    }
    for (let y = 8; y < len - 12; y += 7) R(cx - fw / 2 + 1, y, fw - 2, 1, col.dark);
    g.globalCompositeOperation = 'source-over';
    // taretler
    for (const ty of [Math.round(len * 0.3), Math.round(len * 0.7)]) {
      R(cx - 2, ty - 1, 4, 3, '#2a2a2a');
      R(cx - 1, ty, 2, 1, '#b0b0b0');
    }
    // dikey kuyruk dümenleri
    R(cx - tw / 2, 0, 2, Math.max(4, len * 0.1), col.dark);
    R(cx + tw / 2 - 2, 0, 2, Math.max(4, len * 0.1), col.dark);
  }
  // nişanlar
  if (!flash) {
    for (const sx of [Math.round(span * 0.2), Math.round(span * 0.8)]) {
      R(sx - 2, wy + 1, 5, 3, col.mark);
      R(sx - 1, wy, 3, 5, col.mark);
    }
  }
  return c;
}
function engineXs(span, engines) {
  const cx = Math.floor(span / 2);
  const fw = Math.max(6, Math.round(span * 0.12)) & ~1;
  const xs = [];
  for (let k = 0; k < engines; k++) {
    const t = (k + 0.5) / engines;
    let ex = Math.round(span * 0.12 + t * span * 0.76);
    if (Math.abs(ex - cx) < fw) ex += ex < cx ? -fw : fw;
    xs.push(ex);
  }
  return xs;
}
const BIG_TYPES = {
  med: { span: 40, len: 30, engines: 2, col: { body: '#5f7f45', dark: '#3c5530', light: '#89a86a', mark: '#e03030' } },
  big: { span: 64, len: 44, engines: 4, col: { body: '#6c7468', dark: '#454c43', light: '#9aa396', mark: '#e03030' } },
  boss: { span: 104, len: 64, engines: 4, col: { body: '#5c6a7a', dark: '#36404c', light: '#8a9bb0', mark: '#e03030' } },
};
for (const t of Object.values(BIG_TYPES)) {
  t.spr = bigPlane(t.span, t.len, t.engines, t.col, false);
  t.flash = bigPlane(t.span, t.len, t.engines, t.col, true);
  t.shadow = bigPlane(t.span, t.len, t.engines, { body: '#000', dark: '#000', light: '#000', mark: '#000' }, false);
  t.ex = engineXs(t.span, t.engines);
}

// ---------- Okyanus, adalar, bulutlar, uçak gemisi ----------
const OCEAN = (() => {
  const c = canvas(W, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#1b4a9c';
  g.fillRect(0, 0, W, 64);
  const r = lcg(7);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * 64);
    const w = 2 + Math.floor(r() * 5);
    g.fillStyle = r() < 0.75 ? '#2a5fb5' : '#5a8ad6';
    g.fillRect(x, y, w, 1);
    if (x + w > W) g.fillRect(x - W, y, w, 1);
  }
  return c;
})();

function makeIsland(seed, size) {
  const r = lcg(seed);
  const pad = 6;
  const S = size + pad * 2;
  const c = canvas(S, S);
  const g = c.getContext('2d');
  const k = [r() * 6, r() * 6, r() * 6];
  const amp = [0.18 + r() * 0.1, 0.1 + r() * 0.08, 0.06];
  const rad = (a) => (size / 2) * (0.72 + amp[0] * Math.sin(a * 2 + k[0]) + amp[1] * Math.sin(a * 3 + k[1]) + amp[2] * Math.sin(a * 5 + k[2]));
  const trees = lcg(seed * 3 + 1);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x - S / 2 + 0.5;
      const dy = y - S / 2 + 0.5;
      const d = Math.hypot(dx, dy);
      const rr = rad(Math.atan2(dy, dx));
      let col = null;
      if (d < rr - 4) col = trees() < 0.12 ? '#1f5e24' : trees() < 0.2 ? '#4aa04a' : '#2f7d32';
      else if (d < rr - 1) col = '#e3cf8c';
      else if (d < rr + 1) col = '#d0b878';
      else if (d < rr + 4) col = (x + y) % 2 ? '#3f86d8' : '#2f70c4';
      if (col) {
        g.fillStyle = col;
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}
const ISLANDS = [makeIsland(11, 44), makeIsland(23, 62), makeIsland(37, 80), makeIsland(41, 36), makeIsland(53, 70)];

function makeCloud(seed, w, h) {
  const r = lcg(seed);
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const blobs = [];
  for (let i = 0; i < 7; i++) blobs.push([w * (0.2 + r() * 0.6), h * (0.3 + r() * 0.4), h * (0.25 + r() * 0.25)]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let inside = 0;
      for (const [bx, by, br] of blobs) inside = Math.max(inside, 1 - Math.hypot(x - bx, (y - by) * 1.3) / br);
      if (inside > 0) {
        g.fillStyle = inside > 0.35 ? '#ffffff' : '#d8e4f0';
        g.fillRect(x, y, 1, 1);
      }
    }
  }
  return c;
}
const CLOUDS = [makeCloud(5, 70, 30), makeCloud(9, 50, 24), makeCloud(13, 90, 36)];

const CARRIER = (() => {
  const w = 44;
  const h = 170;
  const c = canvas(w, h);
  const g = c.getContext('2d');
  const R = (x, y, ww, hh, col) => {
    g.fillStyle = col;
    g.fillRect(x, y, ww, hh);
  };
  // gövde (burun yukarıda, sivri)
  for (let y = 0; y < h; y++) {
    const t = y < 30 ? y / 30 : 1;
    const hw = Math.round(6 + t * 14);
    R(22 - hw, y, hw * 2, 1, '#6d737c');
    R(22 - hw, y, 1, 1, '#9aa1ab');
    R(22 + hw - 1, y, 1, 1, '#454a52');
  }
  // uçuş güvertesi
  R(8, 22, 26, h - 26, '#55595f');
  R(9, 22, 1, h - 26, '#6a6f76');
  for (let y = 28; y < h - 8; y += 10) R(20, y, 2, 5, '#f0f0f0');
  R(10, 26, 22, 1, '#f0f0f0');
  R(10, h - 10, 22, 1, '#f0f0f0');
  R(14, h - 30, 14, 1, '#e0c040');
  // komuta adası (sağda)
  R(34, 70, 8, 30, '#3d4249');
  R(35, 72, 6, 4, '#8a9099');
  R(36, 80, 4, 12, '#2a2e33');
  R(37, 66, 2, 6, '#2a2e33');
  // dalga izi
  R(0, h - 2, w, 2, '#c8dcf0');
  return c;
})();
const CARRIER_DECK = 100; // iniş noktası (gemi görüntüsünde y)

// ---------- Mermiler ve POW ----------
const BULLET = makeSprite(['.Y.', 'YWY', 'YWY', '.Y.'], { Y: '#ffd040', W: '#ffffff' });
const EBUL = makeSprite(['.O.', 'OWO', '.O.'], { O: '#ff7a20', W: '#ffffff' });
const POW_TYPES = {
  W: { col: '#e83030', label: 'ÇİFT ATEŞ' },
  S: { col: '#30b040', label: 'YAN UÇAKLAR' },
  B: { col: '#e0b020', label: 'BOMBA!' },
  L: { col: '#3070e0', label: '+1 TAKLA' },
  P: { col: '#e0e0e0', label: '1000' },
};

export default class Air1942 {
  constructor(api) {
    this.api = api;
    this.t = 0;
    this.stage = 0;
    this.lives = 3;
    this.extraNext = 20000;
    this.scrollY = 0;
    this.islands = [];
    this.clouds = [];
    this.player = { x: W / 2, y: 200, alive: true, inv: 0, power: 0, sides: [false, false], loop: 0, scale: 1 };
    this.ended = false;
    this.over = 0;
    this.startStage();
    if (api.preview) {
      this.phase = 'fly';
      this.phaseT = 0;
      this.carrierY = null;
      this.player.y = 200;
      this.nextSpawn = 0;
      this.redTimer = 30;
      for (let i = 0; i < 160; i++) this.update();
    }
  }

  startStage() {
    this.stage++;
    this.enemies = [];
    this.shots = [];
    this.ebul = [];
    this.fx = [];
    this.pows = [];
    this.popups = [];
    this.squads = [];
    this.loops = 3;
    this.spawned = 0;
    this.killed = 0;
    this.phase = 'takeoff';
    this.phaseT = 0;
    this.carrierY = H - CARRIER.height + 20;
    this.player.x = W / 2;
    this.player.y = this.carrierY + CARRIER_DECK;
    this.player.scale = 0.75;
    this.player.alive = true;
    this.player.inv = 0;
    this.player.loop = 0;
    this.stageLen = Math.min(5400, 3000 + this.stage * 360);
    this.nextSpawn = 120;
    this.redTimer = 500;
    this.medTimer = 700;
    this.bigAt = this.stage >= 2 ? [Math.floor(this.stageLen * 0.55)] : [];
    if (this.stage >= 4) this.bigAt.push(Math.floor(this.stageLen * 0.25));
    this.boss = null;
    this.flash = 0;
    if (!this.islands.length) this.spawnIsland(60);
  }

  diff() {
    const s = this.stage;
    return {
      gap: Math.max(55, 130 - s * 10),
      fire: Math.min(0.022, 0.004 + s * 0.0025),
      bsp: Math.min(2.8, 1.5 + s * 0.15),
      sp: Math.min(2.4, 1.5 + s * 0.1),
    };
  }

  // ---------- Ana döngü ----------
  update() {
    const api = this.api;
    this.t++;
    this.phaseT++;
    if (this.flash > 0) this.flash--;
    const scrolling = this.phase !== 'landed' && this.phase !== 'tally' && !(this.phase === 'takeoff' && this.phaseT < 60);
    if (scrolling) this.scrollBg();
    this.fx = this.fx.filter((f) => ++f.t < f.life);
    this.popups = this.popups.filter((p) => --p.t > 0);

    if (this.over) {
      this.updateEnemies();
      this.updateEbul();
      if (this.over > 1) this.over--;
      else if (!this.ended) {
        this.ended = true;
        api.gameOver();
      }
      return;
    }

    switch (this.phase) {
      case 'takeoff':
        this.updateTakeoff();
        return;
      case 'landing':
        this.updateLanding();
        return;
      case 'landed':
      case 'tally':
        this.updateTally();
        return;
      default:
        break;
    }

    this.updatePlayer();
    this.updateShots();
    this.updateEnemies();
    this.updateEbul();
    this.updatePows();
    if (this.phase === 'fly') this.spawner();
    if (this.phase === 'boss') this.bossPhase();
    this.respawn();

    if (api.score >= this.extraNext) {
      this.extraNext += 40000;
      this.lives++;
      api.sfx.play('coin');
      this.popups.push({ x: W / 2, y: 120, text: 'EKSTRA UÇAK!', t: 90, c: '#ffd040' });
    }
  }

  scrollBg() {
    if (this.phase === 'landing' && this.carrierY != null && this.carrierY >= 150 - CARRIER_DECK) return;
    this.scrollY += SCROLL;
    if (this.carrierY != null) {
      this.carrierY += SCROLL;
      if (this.phase !== 'landing' && this.carrierY > H + 10) this.carrierY = null;
    }
    for (const i of this.islands) i.y += SCROLL;
    for (const c of this.clouds) c.y += SCROLL * 2;
    this.islands = this.islands.filter((i) => i.y < H + 10);
    this.clouds = this.clouds.filter((c) => c.y < H + 10);
    if (this.t % 7 === 0 && this.phase !== 'landing') {
      const top = Math.min(...this.islands.map((i) => i.y), 999);
      if (top > 40 && this.api.rand() < 0.04) this.spawnIsland(null);
    }
    if (this.api.rand() < 0.003 && this.clouds.length < 2) {
      const spr = this.api.pick(CLOUDS);
      this.clouds.push({ spr, x: this.api.rand(-30, W - 30), y: -spr.height });
    }
  }

  spawnIsland(y) {
    const spr = this.api.pick(ISLANDS);
    this.islands.push({ spr, x: this.api.rand(-spr.width / 3, W - (spr.width * 2) / 3), y: y == null ? -spr.height : y });
  }

  // ---------- Kalkış / iniş ----------
  updateTakeoff() {
    const p = this.player;
    const api = this.api;
    if (this.phaseT === 1 && !api.preview) api.sfx.seq([['C5', 0.1], ['G4', 0.1], ['C5', 0.1], ['E5', 0.1], ['G5', 0.25], ['E5', 0.1], ['G5', 0.35]], { vol: 0.08, type: 'square' });
    if (this.phaseT < 60) return;
    // Kalkış: uçak güverteden hızlanıp yükselir
    p.y = Math.max(196, p.y - 1.2);
    p.scale = Math.min(1, p.scale + 0.006);
    if (this.phaseT > 150) {
      p.scale = 1;
      this.phase = 'fly';
      this.phaseT = 0;
    }
  }

  updateLanding() {
    const p = this.player;
    // Uçak gemisi yukarıdan gelir; uçak güverteye hizalanır
    if (this.carrierY == null) this.carrierY = -CARRIER.height;
    const stopY = 150 - CARRIER_DECK;
    if (this.carrierY < stopY) this.carrierY = Math.min(stopY, this.carrierY + SCROLL * 2);
    this.updateShots();
    this.updateEnemies();
    this.updateEbul();
    if (!p.alive) return;
    const tx = W / 2;
    const ty = this.carrierY + CARRIER_DECK;
    p.x += clamp(tx - p.x, -1, 1);
    if (this.carrierY >= stopY) p.y += clamp(ty - p.y, -0.8, 0.8);
    else p.y += clamp(200 - p.y, -1, 1);
    if (this.carrierY >= stopY && Math.abs(p.x - tx) < 1 && Math.abs(p.y - ty) < 1) {
      p.scale = Math.max(0.75, p.scale - 0.01);
      if (p.scale <= 0.75) {
        this.phase = 'tally';
        this.phaseT = 0;
        this.api.sfx.play('levelup');
      }
    }
  }

  updateTally() {
    const api = this.api;
    const pct = this.spawned ? Math.floor((this.killed / this.spawned) * 100) : 0;
    if (this.phaseT === 70) {
      this.bonus = pct * 30 + (pct >= 100 ? 10000 : 0);
      api.addScore(this.bonus);
      api.sfx.play('coin');
    }
    if (this.phaseT > 260) this.startStage();
  }

  // ---------- Oyuncu ----------
  updatePlayer() {
    const { input, preview, sfx } = this.api;
    const p = this.player;
    if (!p.alive) return;
    if (p.inv > 0) p.inv--;
    let dx = input.dx;
    let dy = input.dy;
    let fire = input.pressed('a') || (input.held('a') && this.t % 7 === 0);
    let loop = input.pressed('b');
    if (preview) [dx, dy, fire, loop] = this.autopilot();
    if (p.loop > 0) {
      p.loop--;
      p.x = clamp(p.x + dx * 0.8, 12, W - 12);
      if (p.loop === 0) p.inv = Math.max(p.inv, 10);
      return;
    }
    const sp = dx && dy ? 1.3 : 1.8;
    p.x = clamp(p.x + dx * sp, 10, W - 10);
    p.y = clamp(p.y + dy * sp, 40, H - 22);
    if (loop && this.loops > 0) {
      this.loops--;
      p.loop = 72;
      sfx.tone(300, 0.5, { slide: 900, type: 'triangle', vol: 0.1 });
      sfx.tone(900, 0.5, { slide: 300, type: 'triangle', vol: 0.1, delay: 0.5 });
      return;
    }
    if (fire) this.fire();
  }

  fire() {
    const p = this.player;
    if (this.shots.length > 24) return;
    const xs = p.power ? [-8, -3, 3, 8] : [-3, 3];
    for (const o of xs) this.shots.push({ x: p.x + o, y: p.y - 8, vx: p.power ? o * 0.04 : 0 });
    p.sides.forEach((on, i) => {
      if (on) for (const o of [-2, 2]) this.shots.push({ x: p.x + (i ? 20 : -20) + o, y: p.y - 2, vx: 0 });
    });
    this.api.sfx.noise(0.04, { vol: 0.08, freq: 3500 });
    this.api.sfx.tone(240, 0.03, { vol: 0.04 });
  }

  autopilot() {
    const p = this.player;
    let tx = W / 2 + Math.sin(this.t / 60) * 70;
    let ty = 200;
    const near = this.enemies.filter((e) => e.y > 0 && e.y < p.y - 20);
    if (near.length) tx = near.reduce((a, b) => (b.y > a.y ? b : a)).x;
    for (const pw of this.pows) { tx = pw.x; ty = pw.y; }
    let dodge = false;
    for (const b of this.ebul) {
      if (Math.abs(b.x - p.x) < 12 && b.y < p.y && p.y - b.y < 40) {
        tx = p.x + (b.x > p.x ? -30 : 30);
        dodge = true;
      }
    }
    const dx = Math.abs(tx - p.x) < 2 ? 0 : Math.sign(tx - p.x);
    const dy = Math.abs(ty - p.y) < 2 ? 0 : Math.sign(ty - p.y);
    return [dx, dy, this.t % 8 === 0, dodge && this.loops > 1 && this.api.rand() < 0.03];
  }

  updateShots() {
    for (const s of this.shots) {
      s.y -= 5;
      s.x += s.vx;
      if (s.y < -8) { s.dead = true; continue; }
      for (const e of this.enemies) {
        if (e.dead || !this.onScreen(e)) continue;
        if (this.hits(e, s.x, s.y + 2, 1)) {
          s.dead = true;
          this.damage(e, 1);
          break;
        }
      }
    }
    this.shots = this.shots.filter((s) => !s.dead);
  }

  onScreen(e) {
    return e.y > -10 && e.y < H + 10 && e.x > -10 && e.x < W + 10;
  }

  hits(e, x, y, r) {
    if (e.kind === 'small') return Math.abs(e.x - x) < 7 + r && Math.abs(e.y - y) < 6 + r;
    const T = BIG_TYPES[e.kind];
    // gövde ve kanatlar ayrı kutular
    const inWing = Math.abs(x - e.x) < T.span / 2 - 2 + r && Math.abs(y - (e.y - T.len / 2 + T.len * 0.55)) < T.len * 0.13 + r;
    const inBody = Math.abs(x - e.x) < T.span * 0.1 + r && Math.abs(y - e.y) < T.len / 2 + r;
    return inWing || inBody;
  }

  damage(e, n) {
    const api = this.api;
    e.hp -= n;
    e.flash = 3;
    if (e.hp > 0) {
      if (e.kind !== 'small' && this.t % 3 === 0) api.sfx.tone(900, 0.02, { vol: 0.03 });
      return;
    }
    e.dead = true;
    this.killed++;
    const pts = e.kind === 'small' ? (e.red ? 200 : 100) : e.kind === 'med' ? 500 : e.kind === 'big' ? 2000 : 10000 + this.stage * 2000;
    api.addScore(pts);
    if (e.kind === 'small') {
      this.explode(e.x, e.y, 0);
      api.sfx.noise(0.25, { vol: 0.2, freq: 1800 });
    } else {
      this.explode(e.x, e.y, e.kind === 'boss' ? 2 : 1);
      if (e.kind === 'boss') {
        for (let i = 0; i < 6; i++) this.explode(e.x + api.rand(-40, 40), e.y + api.rand(-24, 24), 1, i * 6);
      }
      api.sfx.play('bigexplode');
      this.popups.push({ x: e.x, y: e.y, text: String(pts), t: 70, c: '#ffffff' });
    }
    // kırmızı filo: hepsi düşerse POW
    if (e.squad) {
      e.squad.killed++;
      if (e.squad.killed >= e.squad.n) this.dropPow(e.x, e.y);
    }
  }

  explode(x, y, size, delay = 0) {
    this.fx.push({ x, y, t: -delay, life: [24, 36, 60][size], size });
  }

  dropPow(x, y) {
    const p = this.player;
    const api = this.api;
    const opts = [];
    if (!p.power) opts.push('W', 'W');
    if (!p.sides[0] || !p.sides[1]) opts.push('S', 'S');
    opts.push('B', 'L');
    if (p.power && p.sides[0] && p.sides[1]) opts.push('P', 'P');
    this.pows.push({ x, y, type: api.pick(opts), t: 0 });
    api.sfx.seq([['A5', 0.06], ['E6', 0.1]], { vol: 0.08 });
  }

  updatePows() {
    const p = this.player;
    const api = this.api;
    for (const pw of this.pows) {
      pw.t++;
      pw.y += 0.45;
      pw.x += Math.sin(pw.t / 20) * 0.4;
      if (pw.y > H + 10) pw.dead = true;
      if (p.alive && !p.loop && Math.abs(pw.x - p.x) < 12 && Math.abs(pw.y - p.y) < 12) {
        pw.dead = true;
        this.applyPow(pw.type);
        api.sfx.play('power');
        this.popups.push({ x: pw.x, y: pw.y - 10, text: POW_TYPES[pw.type].label, t: 80, c: POW_TYPES[pw.type].col });
      }
    }
    this.pows = this.pows.filter((pw) => !pw.dead);
  }

  applyPow(type) {
    const p = this.player;
    const api = this.api;
    if (type === 'W') p.power = 1;
    else if (type === 'S') p.sides = [true, true];
    else if (type === 'L') this.loops++;
    else if (type === 'P') api.addScore(1000);
    else if (type === 'B') {
      this.flash = 8;
      this.ebul = [];
      for (const e of this.enemies) if (!e.dead && this.onScreen(e)) this.damage(e, e.kind === 'small' ? 99 : 12);
    }
  }

  // ---------- Düşman üretimi ----------
  spawner() {
    const d = this.diff();
    const api = this.api;
    if (this.phaseT >= this.stageLen) {
      if (!this.enemies.some((e) => !e.dead && e.kind !== 'small') && this.phaseT > this.stageLen + 120) {
        this.phase = 'boss';
        this.phaseT = 0;
        this.spawnBoss();
      }
      return;
    }
    if (--this.nextSpawn <= 0) {
      this.nextSpawn = Math.floor(d.gap * api.rand(0.8, 1.3));
      const pats = ['dive', 'dive', 'cross', 'snake', 'line'];
      if (this.stage >= 2) pats.push('rise', 'rise');
      if (this.stage >= 3) pats.push('cross', 'line');
      this.spawnGroup(api.pick(pats), false);
    }
    if (--this.redTimer <= 0) {
      this.redTimer = Math.max(600, 1000 - this.stage * 60);
      this.spawnGroup(api.pick(['circle', 'dive', 'cross']), true);
    }
    if (--this.medTimer <= 0) {
      this.medTimer = Math.max(360, 900 - this.stage * 90);
      this.spawnBig('med', api.rand(40, W - 40), -20);
    }
    for (const at of this.bigAt) if (this.phaseT === at) this.spawnBig('big', api.rand(60, W - 60), H + 30);
  }

  spawnGroup(pat, red) {
    const api = this.api;
    const d = this.diff();
    const n = red ? 5 : api.randInt(3, 5);
    const side = api.rand() < 0.5 ? -1 : 1;
    const squad = red ? { n, killed: 0 } : null;
    const x0 = api.rand(40, W - 40);
    for (let i = 0; i < n; i++) {
      let e;
      const base = { kind: 'small', red, hp: 1, sp: d.sp, si: 0, st: 0, wait: i * 12, squad, flash: 0, shots: api.rand() < 0.3 + this.stage * 0.1 ? 1 + (this.stage > 3 ? 1 : 0) : 0 };
      switch (pat) {
        case 'dive': {
          e = { ...base, x: x0, y: -10, th: 90 * DEG, script: [[60 + api.randInt(0, 20), 0], [45, 4 * side], [200, 0]] };
          break;
        }
        case 'cross': {
          const fromLeft = side < 0;
          e = { ...base, x: fromLeft ? -10 : W + 10, y: 40 + (x0 % 60), th: (fromLeft ? 20 : 160) * DEG, script: [[60, 0], [60, fromLeft ? -0.6 : 0.6], [200, 0]] };
          break;
        }
        case 'snake':
          e = { ...base, x: x0, y: -10, th: 90 * DEG, script: [[20, 0], [30, 3], [30, -3], [30, 3], [30, -3], [30, 3], [200, 0]] };
          break;
        case 'line':
          e = { ...base, x: x0 + (i - (n - 1) / 2) * 18, y: -10 - Math.abs(i - (n - 1) / 2) * 12, wait: 0, th: 90 * DEG, sp: d.sp + 0.4, script: [[400, 0]] };
          break;
        case 'rise':
          e = { ...base, x: x0, y: H + 10, th: -90 * DEG, sp: d.sp + 0.6, script: [[80, 0], [45, 4 * side], [300, 0]] };
          break;
        case 'circle':
        default: {
          const fromLeft = side < 0;
          e = { ...base, x: fromLeft ? -10 : W + 10, y: 30, th: (fromLeft ? 30 : 150) * DEG, script: [[40, 0], [90, fromLeft ? 4 : -4], [300, 0]] };
          break;
        }
      }
      this.enemies.push(e);
      this.spawned++;
    }
  }

  spawnBig(kind, x, y) {
    const T = BIG_TYPES[kind];
    const s = this.stage;
    const hp = kind === 'med' ? 10 + s * 2 : kind === 'big' ? 40 + s * 6 : 160 + s * 40;
    this.enemies.push({ kind, x, y, hp, maxHp: hp, flash: 0, fireT: 60, t: 0, vx: 0, vy: kind === 'big' && y > H ? -1.2 : 0.7, w: T.span, h: T.len });
    this.spawned++;
  }

  spawnBoss() {
    this.spawnBig('boss', W / 2, -40);
    this.boss = this.enemies[this.enemies.length - 1];
    this.boss.vy = 0.6;
    this.api.sfx.seq([['C3', 0.2], ['C3', 0.2], ['Eb3', 0.2], ['C3', 0.4]], { type: 'sawtooth', vol: 0.1 });
    this.popups.push({ x: W / 2, y: 120, text: 'DEV BOMBARDIMAN UÇAĞI!', t: 120, c: '#ff4040' });
  }

  bossPhase() {
    const b = this.boss;
    if (!b || b.dead || b.gone) {
      if (this.phaseT > 60 && !this.enemies.some((e) => !e.dead && this.onScreen(e)) && this.player.alive && !this.player.loop) {
        this.phase = 'landing';
        this.phaseT = 0;
        this.ebul = [];
        this.carrierY = -CARRIER.height;
      } else if (!b || b.dead || b.gone) {
        // kalan düşmanlar ekrandan çıksın
      }
      return;
    }
    if (this.phaseT % 240 === 0) this.spawnGroup('dive', false);
  }

  updateEnemies() {
    const d = this.diff();
    const p = this.player;
    const api = this.api;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.flash > 0) e.flash--;
      if (e.kind === 'small') {
        if (e.wait > 0) { e.wait--; continue; }
        const seg = e.script[e.si];
        if (seg) {
          e.th += seg[1] * DEG;
          if (++e.st >= seg[0]) { e.si++; e.st = 0; }
        }
        e.x += Math.cos(e.th) * e.sp;
        e.y += Math.sin(e.th) * e.sp;
        if (this.onScreen(e)) e.seen = true;
        else if (e.seen) { e.dead = true; e.gone = true; continue; }
        if (!e.seen && (e.y > H + 40 || e.y < -60 || e.x < -40 || e.x > W + 40)) { e.dead = true; e.gone = true; continue; }
        if (e.shots > 0 && p.alive && e.y > 10 && e.y < p.y - 40 && api.rand() < d.fire) {
          e.shots--;
          this.aim(e.x, e.y + 4, d.bsp, 0);
        }
      } else {
        this.updateBig(e, d);
      }
      // çarpışma
      if (p.alive && !p.loop && !p.inv && !e.dead) {
        if (this.hits(e, p.x, p.y, 3)) {
          if (e.kind === 'small') this.damage(e, 99);
          this.playerHit();
        } else {
          p.sides.forEach((on, i) => {
            if (on && this.hits(e, p.x + (i ? 20 : -20), p.y + 2, 2)) {
              p.sides[i] = false;
              this.explode(p.x + (i ? 20 : -20), p.y, 0);
              if (e.kind === 'small') this.damage(e, 99);
            }
          });
        }
      }
    }
    if (this.enemies.length > 80) this.enemies = this.enemies.filter((e) => !e.dead);
  }

  updateBig(e, d) {
    const p = this.player;
    const api = this.api;
    const T = BIG_TYPES[e.kind];
    e.t++;
    if (e.kind === 'med') {
      e.y += e.vy;
      e.x += Math.sin(e.t / 60) * 0.3;
      if (--e.fireT <= 0 && e.y > 0 && e.y < p.y - 40) {
        e.fireT = Math.max(50, 110 - this.stage * 8);
        for (const a of [-0.35, 0, 0.35]) this.aim(e.x, e.y + T.len / 2, d.bsp, a);
      }
      if (e.y > H + T.len) { e.dead = true; e.gone = true; }
    } else if (e.kind === 'big') {
      // arkadan gelir, öne geçer, bir süre ateş eder, sonra uzaklaşır
      if (!e.mode) e.mode = e.vy < 0 ? 'in' : 'hold';
      if (e.mode === 'in') {
        e.y += e.vy;
        if (e.y < 70) e.mode = 'hold';
      } else if (e.mode === 'hold') {
        e.x += Math.sin(e.t / 80) * 0.5;
        if (e.y < 70) e.y += 0.5;
        if (e.t > 700) e.mode = 'out';
      } else {
        e.y -= 0.8;
        if (e.y < -T.len) { e.dead = true; e.gone = true; }
      }
      if (--e.fireT <= 0 && e.y < 180) {
        e.fireT = Math.max(45, 90 - this.stage * 6);
        for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) this.aim(e.x, e.y + T.len / 2, d.bsp, a);
      }
    } else if (e.kind === 'boss') {
      if (e.y < 64) e.y += e.vy;
      else {
        e.x = W / 2 + Math.sin(e.t / 120) * 50;
        e.y = 64 + Math.sin(e.t / 60) * 10;
      }
      if (--e.fireT <= 0 && e.y > 20) {
        const ring = e.t % 3 === 0;
        e.fireT = Math.max(40, 80 - this.stage * 5);
        if (Math.floor(e.t / 90) % 3 === 2) {
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2 + e.t * 0.1;
            this.ebul.push({ x: e.x, y: e.y + 10, vx: Math.cos(a) * d.bsp * 0.8, vy: Math.sin(a) * d.bsp * 0.8 });
          }
        } else {
          for (const ex of [-30, 30]) for (const a of [-0.2, 0, 0.2]) this.aim(e.x + ex, e.y + 14, d.bsp, a);
        }
        if (ring) api.sfx.tone(200, 0.08, { vol: 0.05 });
      }
      if (e.t > 45 * 60) {
        // kaçar
        e.y -= 1.5;
        if (e.y < -T.len) { e.dead = true; e.gone = true; }
      }
    }
  }

  aim(x, y, sp, spread) {
    if (this.ebul.length > 60) return;
    const p = this.player;
    const a = Math.atan2(p.y - y, p.x - x) + spread;
    this.ebul.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
  }

  updateEbul() {
    const p = this.player;
    for (const b of this.ebul) {
      b.x += b.vx;
      b.y += b.vy;
      if (b.y > H + 4 || b.y < -4 || b.x < -4 || b.x > W + 4) { b.dead = true; continue; }
      if (!p.alive || p.loop) continue;
      if (!p.inv && Math.abs(b.x - p.x) < 4 && Math.abs(b.y - p.y) < 5) {
        b.dead = true;
        this.playerHit();
        continue;
      }
      p.sides.forEach((on, i) => {
        if (on && Math.abs(b.x - (p.x + (i ? 20 : -20))) < 4 && Math.abs(b.y - p.y) < 4) {
          b.dead = true;
          p.sides[i] = false;
          this.explode(p.x + (i ? 20 : -20), p.y, 0);
          this.api.sfx.play('hit');
        }
      });
    }
    this.ebul = this.ebul.filter((b) => !b.dead);
  }

  playerHit() {
    const p = this.player;
    if (!p.alive || p.inv || p.loop) return;
    p.alive = false;
    p.power = 0;
    p.sides = [false, false];
    this.lives--;
    this.deadT = 0;
    this.explode(p.x, p.y, 1);
    this.api.sfx.play('bigexplode');
    this.api.sfx.play('die');
  }

  respawn() {
    const p = this.player;
    if (p.alive) return;
    this.deadT++;
    if (this.lives <= 0) {
      if (this.deadT > 60) {
        this.over = 180;
        this.api.sfx.play('gameover');
      }
      return;
    }
    if (this.deadT > 100) {
      p.alive = true;
      p.x = W / 2;
      p.y = H - 40;
      p.inv = 150;
      p.loop = 0;
      this.ebul = [];
    }
  }

  // ---------- Çizim ----------
  draw() {
    const { gfx, score, hiScore } = this.api;
    const ctx = gfx.ctx;
    // Okyanus
    const oy = Math.floor(this.scrollY % 64);
    for (let y = oy - 64; y < H; y += 64) ctx.drawImage(OCEAN, 0, y);
    for (const i of this.islands) gfx.sprite(i.spr, i.x, i.y);
    if (this.carrierY != null) gfx.sprite(CARRIER, W / 2 - CARRIER.width / 2, this.carrierY);

    // Gölgeler
    for (const e of this.enemies) {
      if (e.dead || (e.kind === 'small' && e.wait > 0)) continue;
      if (e.kind === 'small') {
        const s = FIGHTER.shadow[dirIndex(e.th)];
        gfx.sprite(s, e.x - s.width / 2 + 6, e.y - s.height / 2 + 10, { alpha: 0.3 });
      } else {
        const T = BIG_TYPES[e.kind];
        gfx.sprite(T.shadow, e.x - T.span / 2 + 10, e.y - T.len / 2 + 16, { alpha: 0.3 });
      }
    }
    const p = this.player;
    if (p.alive && !(this.phase === 'takeoff' && this.phaseT < 100) && this.phase !== 'tally') {
      const off = p.loop ? 6 + Math.sin((1 - p.loop / 72) * Math.PI) * 20 : 8;
      gfx.sprite(PLAYER_SHADOW, p.x - 8 + off, p.y - 6 + off * 1.4, { alpha: 0.3 });
    }

    // Büyük uçaklar önce, küçükler üstte
    for (const e of this.enemies) {
      if (e.dead || e.kind === 'small') continue;
      const T = BIG_TYPES[e.kind];
      gfx.sprite(e.flash ? T.flash : T.spr, e.x - T.span / 2, e.y - T.len / 2);
      // pervaneler
      const py = e.y - T.len / 2 + Math.round(T.len * 0.48) + Math.max(5, Math.round(T.len * 0.16)) + 4;
      for (const ex of T.ex) {
        const x = e.x - T.span / 2 + ex;
        if ((this.t >> 1) & 1) gfx.rect(x - 4, py, 9, 1, '#d0d0d0');
        else gfx.rect(x, py - 1, 1, 3, '#d0d0d0');
      }
    }
    for (const e of this.enemies) {
      if (e.dead || e.kind !== 'small' || e.wait > 0) continue;
      const set = e.flash ? FIGHTER.gray : e.red ? FIGHTER.red : FIGHTER.green;
      const s = set[dirIndex(e.th)];
      gfx.sprite(s, e.x - s.width / 2, e.y - s.height / 2);
    }

    // POW
    for (const pw of this.pows) {
      const T = POW_TYPES[pw.type];
      gfx.rect(pw.x - 9, pw.y - 5, 18, 10, (pw.t >> 3) & 1 ? T.col : '#ffffff');
      gfx.rect(pw.x - 8, pw.y - 4, 16, 8, '#202020');
      gfx.text('POW', pw.x - 8, pw.y - 3, (pw.t >> 3) & 1 ? '#ffffff' : T.col);
    }

    // Oyuncu
    this.drawPlayer(gfx);

    for (const s of this.shots) gfx.sprite(BULLET, s.x - 1, s.y);
    for (const b of this.ebul) gfx.sprite(EBUL, b.x - 1, b.y - 1);
    for (const f of this.fx) this.drawFx(gfx, f);

    // Bulutlar en üstte
    for (const c of this.clouds) gfx.sprite(c.spr, c.x, c.y, { alpha: 0.55 });

    if (this.flash) {
      gfx.ctx.fillStyle = 'rgba(255,255,255,0.6)';
      gfx.ctx.fillRect(0, 0, W, H);
    }

    for (const pu of this.popups) {
      const hw = gfx.textWidth(pu.text) / 2;
      gfx.text(pu.text, clamp(pu.x, hw + 2, W - hw - 2), pu.y, pu.c || '#ffffff', { align: 'center', shadow: '#000' });
    }
    this.drawHud(gfx, score, hiScore);
  }

  drawPlayer(gfx) {
    const p = this.player;
    if (!p.alive || this.phase === 'tally' && this.phaseT > 400) return;
    if (p.inv && (this.t >> 2) & 1 && this.phase !== 'takeoff') return;
    const spr = PLAYER_SPR[(this.t >> 1) & 1];
    const ctx = gfx.ctx;
    let sx = p.scale;
    let sy = p.scale;
    let yo = 0;
    if (p.loop) {
      const ph = 1 - p.loop / 72;
      const s = Math.sin(ph * Math.PI);
      yo = -s * 34;
      sx = 1 + s * 0.6;
      sy = Math.cos(ph * Math.PI * 2) * (1 + s * 0.6);
      if (Math.abs(sy) < 0.15) sy = sy < 0 ? -0.15 : 0.15;
    }
    if (sx === 1 && sy === 1) {
      gfx.sprite(spr, p.x - 8, p.y - 6);
    } else {
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y + yo));
      ctx.scale(sx, sy);
      ctx.drawImage(spr, -8, -6);
      ctx.restore();
    }
    if (!p.loop) {
      p.sides.forEach((on, i) => {
        if (on) gfx.sprite(MINI_SPR, p.x + (i ? 20 : -20) - 4, p.y - 1);
      });
    }
  }

  drawFx(gfx, f) {
    if (f.t < 0) return;
    const k = f.t / f.life;
    const R = [7, 14, 22][f.size];
    const cols = ['#ffffff', '#ffe060', '#ff9a20', '#e03010', '#5a3a2a'];
    const n = [8, 14, 20][f.size];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + i * 1.7;
      const r = R * Math.min(1, k * 1.6) * (0.5 + ((i * 7) % 5) / 8);
      const c = cols[Math.min(4, Math.floor(k * 5 + (i % 2)))];
      const s = k < 0.5 ? 3 : 2;
      gfx.rect(f.x + Math.cos(a) * r - 1, f.y + Math.sin(a) * r - 1, s, s, c);
    }
    if (k < 0.3) gfx.circ(f.x, f.y, R * 0.35 + k * 10, k < 0.15 ? '#ffffff' : '#ffd040');
  }

  drawHud(gfx, score, hiScore) {
    const cx = W / 2;
    gfx.text('1UP', 8, 2, '#ff4040', { shadow: '#000' });
    gfx.text(String(score).padStart(6, '0'), 8, 11, '#ffffff', { shadow: '#000' });
    gfx.text('REKOR', cx, 2, '#ff4040', { align: 'center', shadow: '#000' });
    gfx.text(String(Math.max(score, hiScore)).padStart(6, '0'), cx, 11, '#ffffff', { align: 'center', shadow: '#000' });
    // Takla hakları (R)
    for (let i = 0; i < Math.min(6, this.loops); i++) {
      const x = W - 12 - i * 10;
      gfx.rect(x, 3, 9, 9, '#3070e0');
      gfx.text('R', x + 2, 4, '#ffffff');
    }
    gfx.text('TAKLA', W - 8, 15, '#a0c0ff', { align: 'right', shadow: '#000' });
    // Can ve aşama
    for (let i = 0; i < Math.min(6, this.lives - 1); i++) gfx.sprite(LIFE_ICON, 6 + i * 11, H - 9);
    gfx.text(`AŞAMA ${this.stage}`, W - 6, H - 10, '#ffffff', { align: 'right', shadow: '#000' });
    // Boss can çubuğu
    const b = this.boss;
    if (b && !b.dead && !b.gone && this.phase === 'boss') {
      gfx.rect(40, 24, W - 80, 4, '#000');
      gfx.rect(41, 25, (W - 82) * clamp(b.hp / b.maxHp, 0, 1), 2, '#ff4040');
    }

    if (this.phase === 'takeoff') {
      gfx.text(`AŞAMA ${this.stage}`, cx, 96, '#ffffff', { align: 'center', shadow: '#000', scale: 2 });
      if (this.phaseT > 40 || this.t < 2) gfx.text('HAZIR!', cx, 118, '#ffd040', { align: 'center', shadow: '#000' });
    }
    if (this.phase === 'fly' && this.phaseT >= this.stageLen && this.phaseT < this.stageLen + 200) {
      gfx.text('DİKKAT!', cx, 100, (this.t >> 3) & 1 ? '#ff4040' : '#ffffff', { align: 'center', shadow: '#000', scale: 2 });
    }
    if (this.phase === 'landing') gfx.text('İNİŞE GEÇ', cx, 40, '#ffffff', { align: 'center', shadow: '#000' });
    if (this.phase === 'tally') {
      const pct = this.spawned ? Math.floor((this.killed / this.spawned) * 100) : 0;
      gfx.rect(24, 60, W - 48, 64, 'rgba(0,0,0,0.75)');
      gfx.text(`AŞAMA ${this.stage} TAMAM`, cx, 68, '#ffd040', { align: 'center' });
      gfx.text('DÜŞÜRME ORANI', cx, 84, '#ffffff', { align: 'center' });
      if (this.phaseT > 30) gfx.text(`%${pct}`, cx, 96, '#ffffff', { align: 'center' });
      if (this.phaseT > 70) gfx.text(`BONUS ${this.bonus || 0}`, cx, 110, pct >= 100 ? '#ff4040' : '#40ff80', { align: 'center' });
    }
    if (!this.player.alive && !this.over && this.lives > 0 && this.deadT > 50) gfx.text('HAZIR!', cx, 120, '#ffd040', { align: 'center', shadow: '#000' });
    if (this.over) {
      gfx.rect(cx - 52, 112, 104, 22, '#000');
      gfx.text('OYUN BİTTİ', cx, 119, '#ff4040', { align: 'center' });
    }
  }
}
