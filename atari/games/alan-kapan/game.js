// Alan Kapan — Volfied / Qix tarzı.
// Kenarda gez, boş alana girerek çizgi çek, kenara dönünce canavarın olmadığı bölge senin olur
// ve gizli resim açılır. Alanın %80'ini al; canavar çizgine değerse canın gider.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'alan-kapan',
  width: 192,
  height: 184,
  buttons: { a: 'YAVAŞ ÇİZ (2X)' },
  help: [
    'Yön tuşları: kenarda dolaş. Boş alana doğru gidince çizgi çekmeye başlarsın.',
    'Çizgiyi tekrar kenara bağlayınca canavarın bulunmadığı bölge(ler) senin olur.',
    'Canavar ya da küçük düşmanlar çizgine değerse ölürsün. Kenardaki kıvılcımlardan kaç!',
    'Çizerken durursan fitil yanar. A basılıyken yavaş çizersin ama puan iki katı.',
    'Alanın %80\'ini al: hedefi ne kadar aşarsan bonus o kadar büyür.',
  ],
};

const W = 192;
const H = 184;
const FX = 8;
const FY = 20;
const CS = 2; // hücre boyu (piksel)
const GW = 88;
const GH = 80;
const FW = GW * CS;
const FH = GH * CS;
const TARGET = 80;
const INTERIOR = (GW - 2) * (GH - 2);

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // sağ, aşağı, sol, yukarı

// ---- Sprite'lar ----
const BOSS_FRAMES = [
  makeSprite([
    '........MMMMMMMM........',
    '......MMPPPPPPPPMM......',
    '....MMPPPPPPPPPPPPMM....',
    '...MPPPPPPPPPPPPPPPPM...',
    '..MPPPWWWPPPPPPWWWPPPM..',
    '..MPPWWKKWPPPPWKKWWPPM..',
    '.MPPPWWKKWPPPPWKKWWPPPM.',
    '.MPPPPWWWPPPPPPWWWPPPPM.',
    'MPPPPPPPPPPPPPPPPPPPPPPM',
    'MPPPPPPPPPPPPPPPPPPPPPPM',
    'MPPPPKPPPPPPPPPPPPKPPPPM',
    'MPPPPKKYYYYYYYYYYKKPPPPM',
    'MPPPPPKYWYWYWYWYWKPPPPPM',
    'MPPPPPKRRRRRRRRRRKPPPPPM',
    '.MPPPPKYWYWYWYWYWKPPPPM.',
    '.MPPPPPKKKKKKKKKKPPPPPM.',
    '..MPPPPPPPPPPPPPPPPPPM..',
    '..MMPPPPPPPPPPPPPPPPMM..',
    '.M.MMPPPPPPPPPPPPPPMM.M.',
    'M..M.MMPPPPPPPPPPMM.M..M',
    'M.M..M.MMMMMMMMMM.M..M.M',
    '.M..M..M...MM...M..M..M.',
    '...M..M...M..M...M..M...',
    '..M...M...M..M...M...M..',
  ], { M: '#600090', P: '#b040e0', W: '#fcfcfc', K: '#200030', Y: '#fcfc6c', R: '#e01040' }),
  makeSprite([
    '........MMMMMMMM........',
    '......MMPPPPPPPPMM......',
    '....MMPPPPPPPPPPPPMM....',
    '...MPPPPPPPPPPPPPPPPM...',
    '..MPPPWWWPPPPPPWWWPPPM..',
    '..MPPWKKWWPPPPWWKKWPPM..',
    '.MPPPWKKWWPPPPWWKKWPPPM.',
    '.MPPPPWWWPPPPPPWWWPPPPM.',
    'MPPPPPPPPPPPPPPPPPPPPPPM',
    'MPPPPPPPPPPPPPPPPPPPPPPM',
    'MPPPPKPPPPPPPPPPPPKPPPPM',
    'MPPPPKKYYYYYYYYYYKKPPPPM',
    'MPPPPPKRRRRRRRRRRKPPPPPM',
    'MPPPPPKRRRRRRRRRRKPPPPPM',
    '.MPPPPKYWYWYWYWYWKPPPPM.',
    '.MPPPPPKKKKKKKKKKPPPPPM.',
    '..MPPPPPPPPPPPPPPPPPPM..',
    '..MMPPPPPPPPPPPPPPPPMM..',
    '...MMMPPPPPPPPPPPPMMM...',
    '..M..MMPPPPPPPPPPMM..M..',
    '.M..M..MMMMMMMMMM..M..M.',
    'M..M...M..M..M..M...M..M',
    '..M...M..M....M..M...M..',
    '.M....M..M....M..M....M.',
  ], { M: '#600090', P: '#b040e0', W: '#fcfcfc', K: '#200030', Y: '#fcfc6c', R: '#e01040' }),
];
const BOSS_W = 24;
const BUG = [
  makeSprite(['.RR.', 'RYYR', 'RYYR', '.RR.'], { R: '#fc3c3c', Y: '#fcd800' }),
  makeSprite(['R..R', '.YY.', '.YY.', 'R..R'], { R: '#fc3c3c', Y: '#fcd800' }),
];

// ---- Gizli resimler (özgün, prosedürel piksel sanatı) ----
function dither(g, x, y, w, h, c1, c2, mode = 0) {
  g.fillStyle = c1;
  g.fillRect(x, y, w, h);
  g.fillStyle = c2;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (((i + j) % 2 === 0 && mode === 0) || (mode === 1 && i % 2 === 0 && j % 2 === 0)) g.fillRect(x + i, y + j, 1, 1);
}
function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}
function rnd(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const SCENES = [
  // 0: Gün batımı, deniz, palmiye
  (g) => {
    const bands = ['#200848', '#401060', '#701870', '#a82868', '#d84858', '#f07848', '#f8a840', '#fcd060'];
    bands.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * 12, FW, 12); });
    for (let i = 1; i < bands.length; i++) dither(g, 0, i * 12 - 2, FW, 2, bands[i], bands[i - 1]);
    disc(g, 118, 92, 22, '#fce890');
    disc(g, 118, 92, 18, '#fcfcb0');
    g.fillStyle = '#301040';
    const mtn = [[0, 90], [20, 70], [40, 84], [62, 62], [90, 92]];
    for (let x = 0; x < 90; x++) {
      let y = 96;
      for (let i = 0; i < mtn.length - 1; i++) if (x >= mtn[i][0] && x <= mtn[i + 1][0]) y = mtn[i][1] + ((mtn[i + 1][1] - mtn[i][1]) * (x - mtn[i][0])) / (mtn[i + 1][0] - mtn[i][0]);
      g.fillRect(x, Math.round(y), 1, 96 - Math.round(y));
    }
    g.fillStyle = '#183078';
    g.fillRect(0, 96, FW, FH - 96);
    for (let y = 98; y < FH; y += 4) {
      g.fillStyle = y % 8 ? '#2048a0' : '#1c3c90';
      g.fillRect(0, y, FW, 2);
      g.fillStyle = '#fcd060';
      const w = Math.max(2, 30 - (y - 96) / 3);
      for (let x = 118 - w; x < 118 + w; x += 6) g.fillRect(x + ((y / 4) % 2) * 3, y, 3, 1);
    }
    // Ada ve palmiye
    g.fillStyle = '#c89048';
    disc(g, 40, 150, 26, '#c89048');
    g.fillStyle = '#183078';
    g.fillRect(0, 158, FW, 2);
    g.fillStyle = '#6c3c18';
    for (let i = 0; i < 40; i++) g.fillRect(40 + Math.round(Math.sin(i / 12) * 4), 128 - i, 3, 1);
    g.fillStyle = '#186c28';
    const leaves = [[-1, 0], [1, 0], [-1, -0.5], [1, -0.5], [-0.6, 0.6], [0.6, 0.6]];
    for (const [dx, dy] of leaves) for (let i = 0; i < 18; i++) g.fillRect(44 + Math.round(dx * i), 88 + Math.round(dy * i + (i * i) / 30), 3, 2);
    disc(g, 44, 90, 3, '#7c4c18');
  },
  // 1: Gece şehri
  (g) => {
    const r = rnd(42);
    g.fillStyle = '#080828';
    g.fillRect(0, 0, FW, FH);
    for (let i = 0; i < 6; i++) dither(g, 0, 60 + i * 10, FW, 10, ['#0c0c38', '#141448', '#1c1c58', '#282868', '#383078', '#483888'][i], '#080828', 1);
    for (let i = 0; i < 80; i++) { g.fillStyle = r() < 0.2 ? '#fcfc9c' : '#fcfcfc'; g.fillRect(Math.floor(r() * FW), Math.floor(r() * 80), 1, 1); }
    disc(g, 140, 30, 14, '#fcf0c0');
    disc(g, 146, 26, 12, '#080828');
    let x = 0;
    while (x < FW) {
      const w = 12 + Math.floor(r() * 18);
      const h = 40 + Math.floor(r() * 80);
      const c = r() < 0.5 ? '#202040' : '#282850';
      g.fillStyle = c;
      g.fillRect(x, FH - h, w, h);
      g.fillStyle = '#383868';
      g.fillRect(x, FH - h, 1, h);
      for (let wy = FH - h + 4; wy < FH - 4; wy += 6) for (let wx = x + 3; wx < x + w - 3; wx += 4) if (r() < 0.45) { g.fillStyle = r() < 0.8 ? '#fcd860' : '#9ce0fc'; g.fillRect(wx, wy, 2, 3); }
      if (r() < 0.3) { g.fillStyle = '#fc3c3c'; g.fillRect(x + Math.floor(w / 2), FH - h - 6, 1, 6); }
      x += w + 1;
    }
  },
  // 2: Halkalı gezegen ve uzay
  (g) => {
    const r = rnd(7);
    g.fillStyle = '#04040c';
    g.fillRect(0, 0, FW, FH);
    for (let i = 0; i < 40; i++) disc(g, Math.floor(r() * FW), Math.floor(r() * FH), 6 + Math.floor(r() * 10), ['#100c28', '#180c30', '#0c1430'][i % 3]);
    for (let i = 0; i < 140; i++) { g.fillStyle = ['#fcfcfc', '#9cc0fc', '#fcd8a0'][i % 3]; g.fillRect(Math.floor(r() * FW), Math.floor(r() * FH), 1, 1); }
    // Halka arkası
    g.fillStyle = '#c89860';
    for (let a = Math.PI; a < Math.PI * 2; a += 0.01) for (let k = 0; k < 6; k++) g.fillRect(Math.round(88 + Math.cos(a) * (60 + k)), Math.round(80 + Math.sin(a) * (16 + k / 3)), 1, 1);
    disc(g, 88, 80, 38, '#c0602c');
    for (let y = -38; y <= 38; y += 6) {
      const w = Math.floor(Math.sqrt(38 * 38 - y * y));
      g.fillStyle = (y / 6) % 2 ? '#e08840' : '#a04820';
      g.fillRect(88 - w, 80 + y, w * 2, 3);
    }
    disc(g, 104, 72, 6, '#f0a868');
    // Gölge
    g.fillStyle = 'rgba(0,0,0,0.35)';
    for (let y = -38; y <= 38; y++) { const w = Math.floor(Math.sqrt(38 * 38 - y * y)); g.fillRect(88 + Math.floor(w * 0.3), 80 + y, w - Math.floor(w * 0.3), 1); }
    // Halka önü
    for (let a = 0; a < Math.PI; a += 0.01) for (let k = 0; k < 6; k++) { g.fillStyle = k % 3 ? '#e8c890' : '#a88050'; g.fillRect(Math.round(88 + Math.cos(a) * (60 + k)), Math.round(80 + Math.sin(a) * (16 + k / 3)), 1, 1); }
    disc(g, 30, 30, 9, '#6c9ce0');
    disc(g, 27, 27, 3, '#b0d0fc');
    disc(g, 150, 140, 5, '#9c9c9c');
  },
  // 3: Karlı dağlar ve göl
  (g) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = ['#3c78d8', '#4888e0', '#5898e8', '#68a8f0', '#78b8f0', '#88c8f8', '#98d0f8', '#a8d8fc'][i]; g.fillRect(0, i * 10, FW, 10); }
    disc(g, 30, 24, 10, '#fcfce0');
    const peaks = [[0, 70], [30, 30], [55, 60], [85, 18], [120, 58], [150, 34], [176, 66]];
    for (let x = 0; x < FW; x++) {
      let y = 80;
      for (let i = 0; i < peaks.length - 1; i++) if (x >= peaks[i][0] && x <= peaks[i + 1][0]) y = peaks[i][1] + ((peaks[i + 1][1] - peaks[i][1]) * (x - peaks[i][0])) / (peaks[i + 1][0] - peaks[i][0]);
      y = Math.round(y);
      g.fillStyle = '#58587c';
      g.fillRect(x, y, 1, 100 - y);
      g.fillStyle = '#fcfcfc';
      g.fillRect(x, y, 1, Math.max(0, Math.min(12, 46 - y)));
      g.fillStyle = '#383858';
      if (x % 7 < 3) g.fillRect(x, y + 14, 1, 100 - y - 14);
    }
    g.fillStyle = '#2c7c3c';
    g.fillRect(0, 96, FW, 10);
    g.fillStyle = '#2858a8';
    g.fillRect(0, 106, FW, FH - 106);
    for (let y = 108; y < FH; y += 3) { g.fillStyle = '#4878c8'; g.fillRect((y * 13) % 40, y, 20, 1); g.fillRect((y * 13) % 40 + 80, y, 24, 1); }
    // Çamlar
    for (let k = 0; k < 9; k++) {
      const tx = 6 + k * 20 + (k % 2) * 6, ty = 104 - (k % 3) * 4;
      for (let i = 0; i < 16; i++) { g.fillStyle = i % 4 === 0 ? '#104c20' : '#186c2c'; g.fillRect(tx - Math.floor(i / 2.5), ty - 18 + i, Math.floor(i / 2.5) * 2 + 1, 1); }
      g.fillStyle = '#5c3c1c';
      g.fillRect(tx, ty - 2, 1, 4);
    }
  },
];

export default class AreaClaim {
  constructor(api) {
    this.api = api;
    this.level = 0;
    this.lives = 3;
    this.grid = new Uint8Array(GW * GH);
    this.edge = new Uint8Array(GW * GH);
    this.canvas = document.createElement('canvas');
    this.canvas.width = FW;
    this.canvas.height = FH;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.auto = !!api.preview;
    this.startLevel();
    if (api.preview) {
      // Önizlemede alanın bir kısmı zaten alınmış olsun
      this.fakeClaim(1, 1, 30, 26);
      this.fakeClaim(60, 50, 86, 78);
      this.fakeClaim(1, 60, 22, 78);
      this.banner = null;
    }
  }

  idx(x, y) { return y * GW + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < GW && y < GH; }

  startLevel() {
    const lv = this.level;
    this.grid.fill(0);
    for (let x = 0; x < GW; x++) { this.grid[this.idx(x, 0)] = 1; this.grid[this.idx(x, GH - 1)] = 1; }
    for (let y = 0; y < GH; y++) { this.grid[this.idx(0, y)] = 1; this.grid[this.idx(GW - 1, y)] = 1; }
    // Resim
    const pic = document.createElement('canvas');
    pic.width = FW;
    pic.height = FH;
    const g = pic.getContext('2d');
    SCENES[lv % SCENES.length](g);
    this.pic = g.getImageData(0, 0, FW, FH).data;
    this.view = this.ctx.createImageData(FW, FH);

    const ang = this.api.rand(0, Math.PI * 2);
    const bs = Math.min(1.9, 0.7 + lv * 0.15);
    this.boss = { x: FW / 2 - BOSS_W / 2, y: FH / 2 - BOSS_W / 2, vx: Math.cos(ang) * bs, vy: Math.sin(ang) * bs, s: bs, turn: 90, t: 0 };
    this.bugs = [];
    for (let i = 0; i < Math.min(4, lv + (lv > 0 ? 1 : 0)); i++) {
      const a = this.api.rand(0, Math.PI * 2);
      const s = Math.min(2.2, 1.1 + lv * 0.12);
      this.bugs.push({ x: this.api.rand(20, FW - 24), y: this.api.rand(20, FH - 24), vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 });
    }
    const nSparx = Math.min(4, 1 + Math.floor((lv + 1) / 2));
    this.sparxEvery = Math.max(1, 3 - Math.floor(lv / 2));
    this.sparx = [];
    for (let i = 0; i < nSparx; i++) this.sparx.push({ x: GW / 2 + (i % 2 ? -1 : 1) * (i >> 1) * 10, y: 0, dir: i % 2 ? 2 : 0, hand: i % 2 ? 1 : -1, t: 0 });
    this.player = { x: GW >> 1, y: GH - 1, drawing: false, trail: [], slowOnly: true, still: 0, fuse: -1, dead: 0, moveT: 0, lastDir: 3 };
    this.pct = 0;
    this.clearT = 0;
    this.banner = { lines: [`SEVİYE ${lv + 1}`, `HEDEF %${TARGET}`], t: 100 };
    this.recompute(true);
  }

  // Önizleme için doğrudan dikdörtgen alanı al
  fakeClaim(x0, y0, x1, y1) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.grid[this.idx(x, y)] = 1;
    this.recompute(true);
  }

  recompute(full) {
    const { grid, edge } = this;
    let claimed = 0;
    for (let y = 0; y < GH; y++) {
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x;
        edge[i] = 0;
        if (grid[i] !== 1) continue;
        if (x > 0 && y > 0 && x < GW - 1 && y < GH - 1) claimed++;
        for (let dy = -1; dy <= 1 && !edge[i]; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx, ny = y + dy;
            if (this.inb(nx, ny) && grid[ny * GW + nx] !== 1) { edge[i] = 1; break; }
          }
        }
      }
    }
    this.pct = Math.floor((claimed * 100) / INTERIOR);
    this.renderView(full);
  }

  renderView(revealAll = false) {
    const d = this.view.data;
    const pic = this.pic;
    const { grid, edge } = this;
    const all = revealAll === 'all';
    for (let cy = 0; cy < GH; cy++) {
      for (let cx = 0; cx < GW; cx++) {
        const i = cy * GW + cx;
        const own = grid[i] === 1 || all;
        const isEdge = edge[i] && !all;
        for (let sy = 0; sy < CS; sy++) {
          for (let sx = 0; sx < CS; sx++) {
            const p = ((cy * CS + sy) * FW + cx * CS + sx) * 4;
            if (isEdge) {
              d[p] = 0x9c; d[p + 1] = 0xf0; d[p + 2] = 0xfc; d[p + 3] = 255;
            } else if (own) {
              d[p] = pic[p]; d[p + 1] = pic[p + 1]; d[p + 2] = pic[p + 2]; d[p + 3] = 255;
            } else d[p + 3] = 0;
          }
        }
      }
    }
    this.ctx.putImageData(this.view, 0, 0);
  }

  // Kutu, verilen hücre değerine değiyor mu?
  boxHits(x, y, w, h, val) {
    const x0 = Math.floor(x / CS), y0 = Math.floor(y / CS);
    const x1 = Math.floor((x + w - 1) / CS), y1 = Math.floor((y + h - 1) / CS);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (!this.inb(cx, cy)) { if (val === 1) return true; continue; }
        if (this.grid[cy * GW + cx] === val) return true;
      }
    }
    return false;
  }

  moveBouncer(o, w, h) {
    o.x += o.vx;
    if (this.boxHits(o.x, o.y, w, h, 1)) { o.x -= o.vx; o.vx = -o.vx; }
    o.y += o.vy;
    if (this.boxHits(o.x, o.y, w, h, 1)) { o.y -= o.vy; o.vy = -o.vy; }
    // Sıkıştıysa en yakın boş hücreye kaç
    if (this.boxHits(o.x, o.y, w, h, 1)) this.unstick(o, w, h);
  }

  unstick(o, w, h) {
    for (let r = 2; r < 60; r += 2) {
      for (const [dx, dy] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
        if (!this.boxHits(o.x + dx, o.y + dy, w, h, 1)) { o.x += dx; o.y += dy; return; }
      }
    }
  }

  playerPx() { return { x: this.player.x * CS + 1, y: this.player.y * CS + 1 }; }

  kill() {
    const p = this.player;
    if (p.dead || this.clearT) return;
    p.dead = 1;
    this.api.sfx.play('bigexplode');
    const { x, y } = this.playerPx();
    for (let i = 0; i < 30; i++) this.particles.push({ x, y, vx: this.api.rand(-1.5, 1.5), vy: this.api.rand(-1.5, 1.5), life: this.api.randInt(20, 50), col: this.api.pick(['#fcfc6c', '#fc5c3c', '#fcfcfc']) });
  }

  respawn() {
    const p = this.player;
    for (const c of p.trail) if (this.grid[c] === 2) this.grid[c] = 0;
    if (p.start != null) { p.x = p.start % GW; p.y = Math.floor(p.start / GW); }
    p.drawing = false;
    p.trail = [];
    p.fuse = -1;
    p.still = 0;
    p.dead = 0;
    p.inv = 90;
    // Kıvılcımları uzaklaştır
    for (const s of this.sparx) {
      if (Math.abs(s.x - p.x) + Math.abs(s.y - p.y) < 30) {
        const far = this.nearestEdge(GW - 1 - p.x, GH - 1 - p.y);
        if (far) { s.x = far[0]; s.y = far[1]; }
      }
    }
  }

  nearestEdge(sx, sy) {
    sx = Math.max(0, Math.min(GW - 1, sx));
    sy = Math.max(0, Math.min(GH - 1, sy));
    const seen = new Uint8Array(GW * GH);
    const q = [this.idx(sx, sy)];
    seen[q[0]] = 1;
    for (let h = 0; h < q.length; h++) {
      const i = q[h];
      if (this.edge[i]) return [i % GW, Math.floor(i / GW)];
      const x = i % GW, y = Math.floor(i / GW);
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!this.inb(nx, ny)) continue;
        const j = ny * GW + nx;
        if (!seen[j]) { seen[j] = 1; q.push(j); }
      }
    }
    return null;
  }

  closeTrail() {
    const p = this.player;
    const { grid } = this;
    for (const c of p.trail) grid[c] = 1;
    // Canavarın bulunduğu bölge(ler)i işaretle
    const mark = new Uint8Array(GW * GH);
    const q = [];
    const b = this.boss;
    const x0 = Math.floor(b.x / CS), y0 = Math.floor(b.y / CS);
    const x1 = Math.floor((b.x + BOSS_W - 1) / CS), y1 = Math.floor((b.y + BOSS_W - 1) / CS);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (this.inb(x, y) && grid[y * GW + x] === 0 && !mark[y * GW + x]) { mark[y * GW + x] = 1; q.push(y * GW + x); }
    }
    for (let h = 0; h < q.length; h++) {
      const i = q[h];
      const x = i % GW, y = (i / GW) | 0;
      if (x > 0 && !mark[i - 1] && grid[i - 1] === 0) { mark[i - 1] = 1; q.push(i - 1); }
      if (x < GW - 1 && !mark[i + 1] && grid[i + 1] === 0) { mark[i + 1] = 1; q.push(i + 1); }
      if (y > 0 && !mark[i - GW] && grid[i - GW] === 0) { mark[i - GW] = 1; q.push(i - GW); }
      if (y < GH - 1 && !mark[i + GW] && grid[i + GW] === 0) { mark[i + GW] = 1; q.push(i + GW); }
    }
    let gained = p.trail.length;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i] === 0 && !mark[i]) { grid[i] = 1; gained++; }
    }
    const before = this.pct;
    this.recompute(false);
    const mult = p.slowOnly ? 2 : 1;
    this.api.addScore(gained * mult);
    this.lastGain = { text: `+${gained * mult}${mult > 1 ? ' (2X)' : ''}`, t: 50, x: p.x * CS, y: p.y * CS };
    // Kapana kısılan küçük düşmanlar ölür
    for (const bug of this.bugs) {
      if (this.boxHits(bug.x, bug.y, 4, 4, 1) && !this.boxHits(bug.x, bug.y, 4, 4, 0)) {
        bug.dead = 1;
        this.api.addScore(500);
        for (let i = 0; i < 10; i++) this.particles.push({ x: bug.x + 2, y: bug.y + 2, vx: this.api.rand(-1, 1), vy: this.api.rand(-1, 1), life: 30, col: '#fcd800' });
      }
    }
    this.bugs = this.bugs.filter((bg) => !bg.dead);
    p.drawing = false;
    p.trail = [];
    p.fuse = -1;
    if (!this.edge[this.idx(p.x, p.y)]) {
      const e = this.nearestEdge(p.x, p.y);
      if (e) { p.x = e[0]; p.y = e[1]; }
    }
    for (const s of this.sparx) {
      if (!this.edge[this.idx(s.x, s.y)]) {
        const e = this.nearestEdge(s.x, s.y);
        if (e) { s.x = e[0]; s.y = e[1]; }
      }
    }
    this.api.sfx.seq([['C5', 0.05], ['E5', 0.05], ['G5', 0.08]], { vol: 0.08 });
    if (this.pct - before >= 15) this.api.sfx.play('power');
    if (this.pct >= TARGET) {
      this.clearT = 1;
      const bonus = (this.pct - TARGET) * 1000 + 2000;
      this.bonus = bonus;
      this.api.addScore(bonus);
      this.renderView('all');
      this.api.sfx.play('levelup');
    }
  }

  stepPlayer(dx, dy) {
    const p = this.player;
    const nx = p.x + dx, ny = p.y + dy;
    if (!this.inb(nx, ny)) return false;
    const ni = this.idx(nx, ny);
    const v = this.grid[ni];
    if (!p.drawing) {
      if (v === 1 && this.edge[ni]) { p.x = nx; p.y = ny; return true; }
      if (v === 0) {
        p.drawing = true;
        p.start = this.idx(p.x, p.y);
        p.trail = [ni];
        p.slowOnly = true;
        this.grid[ni] = 2;
        p.x = nx; p.y = ny;
        this.api.sfx.tone(300, 0.05, { vol: 0.06 });
        return true;
      }
      return false;
    }
    if (v === 2) return false;
    if (v === 1) { p.x = nx; p.y = ny; this.closeTrail(); return true; }
    this.grid[ni] = 2;
    p.trail.push(ni);
    p.x = nx; p.y = ny;
    return true;
  }

  update() {
    const { input, sfx } = this.api;
    for (const pt of this.particles) { pt.x += pt.vx; pt.y += pt.vy; pt.life--; }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    if (this.banner && --this.banner.t <= 0) this.banner = null;
    if (this.lastGain && --this.lastGain.t <= 0) this.lastGain = null;

    if (this.clearT) {
      this.clearT++;
      if (this.clearT > 200) { this.level++; this.startLevel(); }
      return;
    }

    const p = this.player;
    // Canavar ve böcekler
    const b = this.boss;
    b.t++;
    if (--b.turn <= 0) {
      b.turn = this.api.randInt(60, 160);
      const a = Math.atan2(b.vy, b.vx) + this.api.rand(-1, 1);
      b.vx = Math.cos(a) * b.s;
      b.vy = Math.sin(a) * b.s;
    }
    this.moveBouncer(b, BOSS_W, BOSS_W);
    for (const bug of this.bugs) { bug.t++; this.moveBouncer(bug, 4, 4); }

    if (p.dead) {
      p.dead++;
      if (p.dead > 80) {
        this.lives--;
        if (this.lives <= 0) {
          this.lives = 0;
          if (!this.overDone) { this.overDone = true; sfx.play('gameover'); this.api.gameOver(); }
          p.dead = 80;
          return;
        }
        this.respawn();
      }
      return;
    }
    if (p.inv) p.inv--;

    // Oyuncu hareketi
    let dx = 0, dy = 0, slow = false;
    if (this.auto) ({ dx, dy, slow } = this.autopilot());
    else {
      dx = input.dx; dy = input.dy; slow = input.held('a');
    }
    // Hız: kenarda 1 hücre/kare, çizerken 0.75, yavaş çizimde 0.4
    const spd = !p.drawing ? 1 : slow ? 0.4 : 0.75;
    let moved = false;
    if (dx || dy) p.moveT = Math.min(1, p.moveT + spd);
    if (p.moveT >= 1 && (dx || dy)) {
      p.moveT -= 1;
      // Önce yatay sonra dikey dene; köşelerde akıcı dönüş için ikincisini de dene
      if (dx && this.stepPlayer(dx, 0)) moved = true;
      else if (dy && this.stepPlayer(0, dy)) moved = true;
      if (moved && p.drawing && !slow) p.slowOnly = false;
    }
    if (p.drawing) {
      if (moved) { p.still = 0; if (this.api.frame % 4 === 0) sfx.tone(slow ? 220 : 330, 0.03, { vol: 0.04 }); }
      else if (++p.still > 40) {
        // Fitil: çizginin başından oyuncuya doğru yanar
        if (p.fuse < 0) p.fuse = 0;
        if (this.api.frame % 2 === 0) p.fuse++;
        if (this.api.frame % 6 === 0) sfx.noise(0.04, { vol: 0.08, freq: 3000 });
        if (p.fuse >= p.trail.length) { this.kill(); return; }
      }
    }
    if (this.clearT) return;

    // Çizgiye değme kontrolü
    if (p.drawing) {
      const pp = this.playerPx();
      if (this.boxHits(b.x + 2, b.y + 2, BOSS_W - 4, BOSS_W - 4, 2) || (pp.x > b.x && pp.x < b.x + BOSS_W && pp.y > b.y && pp.y < b.y + BOSS_W)) { this.kill(); return; }
      for (const bug of this.bugs) {
        if (this.boxHits(bug.x, bug.y, 4, 4, 2) || (Math.abs(bug.x + 2 - pp.x) < 4 && Math.abs(bug.y + 2 - pp.y) < 4)) { this.kill(); return; }
      }
    }

    // Kıvılcımlar kenarda dolaşır
    for (const s of this.sparx) {
      if (++s.t >= this.sparxEvery) {
        s.t = 0;
        this.moveSparx(s);
      }
      if (!p.inv && !p.drawing && Math.abs(s.x - p.x) <= 1 && Math.abs(s.y - p.y) <= 1) { this.kill(); return; }
      if (!p.inv && p.drawing && p.start != null && s.x === p.start % GW && s.y === Math.floor(p.start / GW) && p.trail.length < 3) { this.kill(); return; }
    }
  }

  moveSparx(s) {
    // Duvar takibi: önce bir yana dön, sonra düz, sonra öbür yana, en son geri
    const order = [s.dir + s.hand, s.dir, s.dir - s.hand, s.dir + 2];
    for (const d0 of order) {
      const d = ((d0 % 4) + 4) % 4;
      const nx = s.x + DIRS[d][0], ny = s.y + DIRS[d][1];
      if (this.inb(nx, ny) && this.edge[this.idx(nx, ny)]) {
        s.x = nx; s.y = ny; s.dir = d;
        return;
      }
    }
  }

  // ---- Otomatik pilot (önizleme) ----
  autopilot() {
    const p = this.player;
    const ap = this.ap || (this.ap = { phase: 0, dir: 0, n: 0, walk: 0 });
    const free = (d) => {
      const nx = p.x + DIRS[d][0], ny = p.y + DIRS[d][1];
      return this.inb(nx, ny) && this.grid[this.idx(nx, ny)] === 0;
    };
    const ok = (d) => {
      const nx = p.x + DIRS[d][0], ny = p.y + DIRS[d][1];
      if (!this.inb(nx, ny)) return false;
      const v = this.grid[this.idx(nx, ny)];
      return p.drawing ? v !== 2 : (v === 1 && this.edge[this.idx(nx, ny)]) || v === 0;
    };
    if (!p.drawing) {
      ap.walk++;
      const inward = [0, 1, 2, 3].filter(free);
      if (inward.length && ap.walk > 12) {
        ap.dir = inward[0];
        ap.phase = 1;
        ap.n = this.api.randInt(10, 22);
        ap.walk = 0;
      } else {
        // Kenarda yürü
        const opts = [ap.edgeDir ?? 0, 0, 1, 2, 3].filter((d) => {
          const nx = p.x + DIRS[d][0], ny = p.y + DIRS[d][1];
          return this.inb(nx, ny) && this.edge[this.idx(nx, ny)] && d !== (((ap.edgeDir ?? 0) + 2) % 4);
        });
        ap.edgeDir = opts.length ? opts[0] : (((ap.edgeDir ?? 0) + 1) % 4);
        const [dx, dy] = DIRS[ap.edgeDir];
        return { dx, dy, slow: false };
      }
    }
    if (ap.n <= 0) {
      if (ap.phase === 1) { ap.phase = 2; ap.dir = (ap.dir + 1) % 4; ap.n = this.api.randInt(10, 24); } else if (ap.phase === 2) { ap.phase = 3; ap.dir = (ap.dir + 1) % 4; ap.n = 999; }
    }
    if (!ok(ap.dir)) {
      const alt = [0, 1, 2, 3].find(ok);
      if (alt === undefined) return { dx: 0, dy: 0, slow: false };
      ap.dir = alt;
    }
    ap.n--;
    const [dx, dy] = DIRS[ap.dir];
    return { dx, dy, slow: false };
  }

  // ---- Çizim ----
  draw() {
    const { gfx, score, hiScore, frame } = this.api;
    gfx.cls('#000');
    // Boş alan deseni
    gfx.rect(FX, FY, FW, FH, '#0c0c24');
    const off = (frame >> 2) % 8;
    for (let y = FY + off; y < FY + FH; y += 8) gfx.rect(FX, y, FW, 1, '#16163a');
    for (let x = FX + off; x < FX + FW; x += 8) gfx.rect(x, FY, 1, FH, '#16163a');
    gfx.sprite(this.canvas, FX, FY);
    gfx.rectb(FX - 2, FY - 2, FW + 4, FH + 4, '#5c3cb0');

    const p = this.player;
    // Çizgi
    if (p.trail.length) {
      const col = frame % 6 < 3 ? '#fcfc6c' : '#fc9c3c';
      for (let k = 0; k < p.trail.length; k++) {
        const c = p.trail[k];
        const burnt = p.fuse >= 0 && k < p.fuse;
        gfx.rect(FX + (c % GW) * CS, FY + Math.floor(c / GW) * CS, CS, CS, burnt ? '#3c3c3c' : col);
      }
      if (p.fuse >= 0 && p.fuse < p.trail.length) {
        const c = p.trail[p.fuse];
        gfx.rect(FX + (c % GW) * CS - 1, FY + Math.floor(c / GW) * CS - 1, 4, 4, frame % 4 < 2 ? '#fcfcfc' : '#fc3c3c');
      }
    }

    // Canavar
    const b = this.boss;
    if (this.clearT) {
      if (this.clearT < 60 && this.clearT % 6 < 3) gfx.sprite(BOSS_FRAMES[0], FX + b.x, FY + b.y);
      if (this.clearT < 60) gfx.circb(FX + b.x + 12, FY + b.y + 12, this.clearT / 2, '#fcfc6c');
    } else {
      gfx.sprite(BOSS_FRAMES[(b.t >> 4) % 2], FX + b.x, FY + b.y);
      for (const bug of this.bugs) gfx.sprite(BUG[(bug.t >> 3) % 2], FX + bug.x, FY + bug.y);
    }
    // Kıvılcımlar
    for (const s of this.sparx) {
      const sx = FX + s.x * CS + 1, sy = FY + s.y * CS + 1;
      const c = frame % 4 < 2 ? '#fcfcfc' : '#fc3c3c';
      gfx.rect(sx - 1, sy - 1, 3, 3, '#fc3c3c');
      gfx.pset(sx, sy, '#fcfcfc');
      gfx.pset(sx + (frame % 3) - 1 - 1, sy - 2, c);
      gfx.pset(sx + 2, sy + (frame % 3) - 1, c);
      gfx.pset(sx - 2, sy + 1, c);
    }
    // Oyuncu
    if (!p.dead && !this.clearT && (!p.inv || frame % 6 < 4)) {
      const { x, y } = this.playerPx();
      const px = FX + x, py = FY + y;
      gfx.rect(px - 2, py, 5, 1, '#3cfc3c');
      gfx.rect(px, py - 2, 1, 5, '#3cfc3c');
      gfx.rect(px - 1, py - 1, 3, 3, '#3cfc3c');
      gfx.pset(px, py, frame % 8 < 4 ? '#fcfcfc' : '#00a000');
    }
    for (const pt of this.particles) gfx.rect(FX + pt.x, FY + pt.y, 1, 1, pt.col);
    if (this.lastGain) gfx.text(this.lastGain.text, Math.min(W - 50, Math.max(FX, FX + this.lastGain.x - 10)), Math.max(FY, FY + this.lastGain.y - 10 - (50 - this.lastGain.t) / 3), '#fcfcfc', { shadow: '#000' });

    // HUD
    gfx.text('SKOR', 4, 2, '#a070ff');
    gfx.text(String(score).padStart(6, '0'), 32, 2, '#fcfcfc');
    gfx.text('REKOR', 112, 2, '#a070ff');
    gfx.text(String(Math.max(score, hiScore)).padStart(6, '0'), W - 4, 2, '#fcfcfc', { align: 'right' });
    const pc = this.pct >= TARGET ? '#3cfc3c' : '#fcfc6c';
    gfx.text(`%${String(this.pct).padStart(2, '0')}`, 4, 11, pc);
    gfx.text(`/${TARGET}`, 22, 11, '#7c7c9c');
    // Yüzde çubuğu
    gfx.rect(44, 12, 60, 5, '#202040');
    gfx.rect(44, 12, Math.round((60 * Math.min(100, this.pct)) / 100), 5, pc);
    gfx.rect(44 + Math.round((60 * TARGET) / 100), 11, 1, 7, '#fc3c3c');
    gfx.text(`SV${this.level + 1}`, 110, 11, '#a070ff');
    gfx.text('CAN', 144, 11, '#a070ff');
    for (let i = 0; i < Math.min(this.lives, 6); i++) {
      const lx = 166 + i * 5;
      gfx.rect(lx, 13, 3, 3, '#3cfc3c');
      gfx.pset(lx + 1, 12, '#3cfc3c');
    }

    if (this.banner) {
      this.banner.lines.forEach((s, i) => gfx.text(s, FX + FW / 2, FY + 60 + i * 12, i ? '#fcfcfc' : '#fcfc6c', { align: 'center', shadow: '#000' }));
    }
    if (this.clearT) {
      const cy = FY + FH / 2 - 16;
      gfx.rect(FX + 30, cy - 4, FW - 60, 38, 'rgba(0,0,0,0.7)');
      gfx.text('TEMİZLENDİ!', FX + FW / 2, cy, frame % 10 < 5 ? '#fcfc6c' : '#fcfcfc', { align: 'center' });
      gfx.text(`ALAN %${this.pct}`, FX + FW / 2, cy + 11, '#fcfcfc', { align: 'center' });
      gfx.text(`BONUS ${this.bonus}`, FX + FW / 2, cy + 22, '#3cfc3c', { align: 'center' });
    }
    if (this.lives <= 0) gfx.text('OYUN BİTTİ', FX + FW / 2, FY + FH / 2, '#fc3c3c', { align: 'center', shadow: '#000' });
  }
}
