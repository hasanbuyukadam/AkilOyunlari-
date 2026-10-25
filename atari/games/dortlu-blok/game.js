// Dörtlü Blok — Tetris tarzı (NES / Game Boy dönemi hissi).
// 10x20 kuyu, 7'li torba, SRS dönüşü + duvar tekmeleri, DAS, kilit gecikmesi, hayalet parça.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'dortlu-blok',
  width: 160,
  height: 144,
  buttons: { a: 'SAĞA ÇEVİR', b: 'SOLA ÇEVİR', c: 'MÜZİK' },
  help: [
    'Sol/Sağ: kaydır (basılı tut: hızlı kayar). Aşağı: hızlı düşür, Yukarı: anında bırak.',
    'Dolan satırlar silinir: 1 satır 40, 2 satır 100, 3 satır 300, 4 satır 1200 x (seviye+1).',
    'Her 10 satırda seviye artar, bloklar daha hızlı düşer.',
  ],
};

const COLS = 10;
const ROWS = 22; // üstteki 2 satır görünmez
const HIDDEN = 2;
const CELL = 7;
const WX = 12; // kuyunun ekrandaki sol üst köşesi
const WY = 2;
const PX = 90; // yan panel

// Parçalar: durum 0 hücreleri ve kutu boyu
const PIECES = {
  I: { n: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]], style: 0 },
  O: { n: 4, cells: [[1, 0], [2, 0], [1, 1], [2, 1]], style: 0 },
  T: { n: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]], style: 0 },
  J: { n: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]], style: 1 },
  L: { n: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]], style: 2 },
  S: { n: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], style: 1 },
  Z: { n: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], style: 2 },
};
const TYPES = Object.keys(PIECES);

// Dört dönüş durumunu önceden hesapla
const SHAPES = {};
for (const t of TYPES) {
  const { n, cells } = PIECES[t];
  const states = [cells];
  for (let r = 1; r < 4; r++) {
    const prev = states[r - 1];
    states.push(t === 'O' ? prev : prev.map(([x, y]) => [n - 1 - y, x]));
  }
  SHAPES[t] = states;
}

// SRS tekme tabloları (y yukarı pozitif; kullanırken ters çevrilir)
const KICK_JLSTZ = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
};
const KICK_I = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
};

// Seviyeye göre kaç karede bir satır düşer (NES'e yakın)
const GRAVITY = [48, 43, 38, 33, 28, 23, 18, 13, 8, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1];
const LINE_SCORE = [0, 40, 100, 300, 1200];
const DAS_DELAY = 12;
const DAS_REPEAT = 4;
const LOCK_DELAY = 30;
const LOCK_RESETS = 15;
const ARE = 8; // yeni parça gelmeden önceki kısa bekleme

// Seviye renk çiftleri (NES gibi her seviyede değişir)
const LEVEL_COLORS = [
  ['#0058f8', '#3cbcfc'], ['#00a800', '#b8f818'], ['#d800cc', '#f878f8'], ['#0058f8', '#58d854'],
  ['#e40058', '#58f898'], ['#58f898', '#6888fc'], ['#f83800', '#a0a0a0'], ['#6844fc', '#a80020'],
  ['#0058f8', '#f83800'], ['#f83800', '#fca044'],
];

const BLOCK_ROWS = [
  [ // çerçeveli beyaz (I, O, T)
    'WAAAAA',
    'AWWWWA',
    'AWWWWA',
    'AWWWWA',
    'AWWWWA',
    'AAAAAA',
  ],
  [ // dolu, parlak köşe
    'WAAAAA',
    'AWWAAA',
    'AWAAAA',
    'AAAAAA',
    'AAAAAA',
    'AAAAAA',
  ],
];
const blockCache = new Map();
function blockSprite(style, level) {
  const key = `${style}:${level % 10}`;
  let s = blockCache.get(key);
  if (!s) {
    const [c1, c2] = LEVEL_COLORS[level % 10];
    const col = style === 2 ? c2 : c1;
    s = makeSprite(BLOCK_ROWS[style === 0 ? 0 : 1], { A: col, W: '#fcfcfc' });
    blockCache.set(key, s);
  }
  return s;
}
const GRAY_BLOCK = makeSprite(BLOCK_ROWS[1], { A: '#7c7c7c', W: '#bcbcbc' });
const BRICK = makeSprite([
  'GGGGGGGLGGGGGGGL',
  'GGGGGGGLGGGGGGGL',
  'GGGGGGGLGGGGGGGL',
  'LLLLLLLLLLLLLLLL',
  'GGGLGGGGGGGLGGGG',
  'GGGLGGGGGGGLGGGG',
  'GGGLGGGGGGGLGGGG',
  'LLLLLLLLLLLLLLLL',
], { G: '#5c5c6c', L: '#34343c' });

// Özgün, sade arka plan ezgisi (A minör). [nota, adım]
const MELODY = [
  ['A4', 2], ['C5', 1], ['E5', 1], ['D5', 2], ['C5', 1], ['B4', 1],
  ['A4', 2], ['A4', 1], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1],
  ['B4', 2], ['G4', 1], ['B4', 1], ['C5', 2], ['D5', 2],
  ['E5', 2], ['C5', 2], ['A4', 2], [0, 2],
  ['D5', 3], ['F5', 1], ['A5', 2], ['G5', 1], ['F5', 1],
  ['E5', 3], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1],
  ['B4', 2], ['B4', 1], ['C5', 1], ['D5', 2], ['E5', 2],
  ['C5', 2], ['A4', 2], ['A4', 2], [0, 2],
];
const BASS = ['A2', 'E3', 'A2', 'E3', 'F2', 'C3', 'G2', 'D3', 'A2', 'E3', 'A2', 'E3', 'E2', 'B2', 'A2', 'E3'];

export default class Blocks {
  constructor(api) {
    this.api = api;
    this.board = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    this.bag = [];
    this.queue = [];
    this.level = 0;
    this.lines = 0;
    this.piece = null;
    this.are = 20;
    this.clearing = null; // { rows, t }
    this.flash = 0;
    this.dying = 0;
    this.das = { dir: 0, t: 0 };
    this.music = true;
    this.mStep = 0;
    this.mTimer = 0;
    this.mIdx = 0;
    this.mLeft = 0;
    this.banner = { text: 'HAZIR!', t: 70 };
    this.stats = { tetris: 0 };
    this.ai = null;
    for (let i = 0; i < 3; i++) this.queue.push(this.nextFromBag());
    if (api.preview) {
      // Önizlemede alt kısım dolu, ortadan bir oyun gibi görünsün
      this.level = 3;
      for (let y = ROWS - 7; y < ROWS; y++) {
        const gap = api.randInt(0, COLS - 1);
        for (let x = 0; x < COLS; x++) {
          if (x !== gap && Math.random() < 0.85) this.board[y][x] = api.pick(TYPES);
        }
      }
      this.are = 1;
      this.banner = null;
    }
  }

  nextFromBag() {
    if (!this.bag.length) {
      this.bag = [...TYPES];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop();
  }

  cellsOf(p, rot = p.rot, x = p.x, y = p.y) {
    return SHAPES[p.type][rot].map(([cx, cy]) => [x + cx, y + cy]);
  }

  fits(p, rot = p.rot, x = p.x, y = p.y) {
    for (const [cx, cy] of this.cellsOf(p, rot, x, y)) {
      if (cx < 0 || cx >= COLS || cy >= ROWS) return false;
      if (cy >= 0 && this.board[cy][cx]) return false;
    }
    return true;
  }

  spawn() {
    const type = this.queue.shift();
    this.queue.push(this.nextFromBag());
    const n = PIECES[type].n;
    const p = { type, rot: 0, x: Math.floor((COLS - n) / 2), y: 0, lockT: 0, resets: 0, fall: 0, lowest: 0 };
    if (type === 'O') p.x = 3;
    if (!this.fits(p)) {
      this.piece = p;
      this.die();
      return;
    }
    // Görünür alana bir satır in
    if (this.fits(p, p.rot, p.x, p.y + 1)) p.y++;
    p.lowest = p.y;
    this.piece = p;
    this.ai = null;
  }

  die() {
    this.dying = 1;
    this.api.sfx.play('gameover');
  }

  gravityFrames() {
    return GRAVITY[Math.min(this.level, GRAVITY.length - 1)];
  }

  move(dx) {
    const p = this.piece;
    if (!p || !this.fits(p, p.rot, p.x + dx, p.y)) return false;
    p.x += dx;
    this.onManipulate();
    this.api.sfx.tone(220, 0.03, { vol: 0.06 });
    return true;
  }

  rotate(dir) {
    const p = this.piece;
    if (!p || p.type === 'O') return false;
    const from = p.rot;
    const to = (from + dir + 4) % 4;
    const table = p.type === 'I' ? KICK_I : KICK_JLSTZ;
    const kicks = table[`${from}>${to}`] || [[0, 0]];
    for (const [kx, ky] of kicks) {
      if (this.fits(p, to, p.x + kx, p.y - ky)) {
        p.rot = to;
        p.x += kx;
        p.y -= ky;
        this.onManipulate();
        this.api.sfx.tone(dir > 0 ? 660 : 590, 0.04, { vol: 0.07, type: 'square' });
        return true;
      }
    }
    return false;
  }

  onManipulate() {
    const p = this.piece;
    // Kilit gecikmesi sınırlı sayıda sıfırlanır (sonsuz döndürme olmasın)
    if (!this.fits(p, p.rot, p.x, p.y + 1) && p.resets < LOCK_RESETS) {
      p.lockT = 0;
      p.resets++;
    }
  }

  ghostY() {
    const p = this.piece;
    let y = p.y;
    while (this.fits(p, p.rot, p.x, y + 1)) y++;
    return y;
  }

  hardDrop() {
    const p = this.piece;
    const gy = this.ghostY();
    this.api.addScore((gy - p.y) * 2);
    this.dropTrail = { x: p.x, y0: p.y, y1: gy, rot: p.rot, type: p.type, t: 8 };
    p.y = gy;
    this.lock();
  }

  lock() {
    const p = this.piece;
    let above = true;
    for (const [cx, cy] of this.cellsOf(p)) {
      if (cy >= 0) this.board[cy][cx] = p.type;
      if (cy >= HIDDEN) above = false;
    }
    this.piece = null;
    this.api.sfx.noise(0.06, { vol: 0.18, freq: 900 });
    this.api.sfx.tone(110, 0.05, { vol: 0.08, type: 'triangle' });
    if (above) { this.die(); return; }
    const full = [];
    for (let y = 0; y < ROWS; y++) if (this.board[y].every(Boolean)) full.push(y);
    if (full.length) {
      this.clearing = { rows: full, t: 0 };
      const n = full.length;
      this.api.addScore(LINE_SCORE[n] * (this.level + 1));
      if (n === 4) {
        this.flash = 24;
        this.stats.tetris++;
        this.api.sfx.seq([['C5', 0.06], ['E5', 0.06], ['G5', 0.06], ['C6', 0.06], ['E6', 0.06], ['G6', 0.18]], { vol: 0.1 });
      } else {
        this.api.sfx.seq([['E5', 0.05], ['G5', 0.05], ['C6', 0.08 * n]], { vol: 0.09 });
      }
    } else {
      this.are = ARE;
    }
  }

  finishClear() {
    const rows = this.clearing.rows;
    for (const y of rows) {
      this.board.splice(y, 1);
      this.board.unshift(new Array(COLS).fill(null));
    }
    const before = Math.floor(this.lines / 10);
    this.lines += rows.length;
    if (Math.floor(this.lines / 10) > before) {
      this.level++;
      this.banner = { text: `SEVİYE ${this.level}`, t: 90 };
      this.api.sfx.play('levelup');
    }
    this.clearing = null;
    this.are = ARE + 4;
  }

  update() {
    const { input, preview } = this.api;
    if (input.pressed('c')) this.music = !this.music;
    if (this.banner && --this.banner.t <= 0) this.banner = null;
    if (this.flash > 0) this.flash--;
    if (this.dropTrail && --this.dropTrail.t <= 0) this.dropTrail = null;

    if (this.dying) {
      // Perde aşağı iner, sonra oyun biter
      this.dying++;
      if (this.dying % 3 === 0 && this.dying < 3 * (ROWS - HIDDEN) + 3) this.api.sfx.noise(0.03, { vol: 0.08, freq: 600 });
      if (this.dying === 3 * (ROWS - HIDDEN) + 40) this.api.gameOver();
      return;
    }
    if (!preview) this.tickMusic();

    if (this.clearing) {
      if (++this.clearing.t >= 22) this.finishClear();
      return;
    }
    if (!this.piece) {
      if (--this.are <= 0) this.spawn();
      return;
    }

    // Girişler (önizlemede otomatik pilot)
    const ctl = preview ? this.autopilot() : {
      left: input.held('left'), right: input.held('right'),
      pl: input.pressed('left'), pr: input.pressed('right'),
      cw: input.pressed('a'), ccw: input.pressed('b'),
      soft: input.held('down'), hard: input.pressed('up'),
    };
    if (ctl.cw) this.rotate(1);
    if (ctl.ccw) this.rotate(-1);
    if (!this.piece) return;

    // DAS: ilk basışta bir adım, sonra gecikme + tekrar
    const dir = ctl.left && !ctl.right ? -1 : ctl.right && !ctl.left ? 1 : 0;
    if (dir === 0) this.das = { dir: 0, t: 0 };
    else if (dir !== this.das.dir || (dir === -1 && ctl.pl) || (dir === 1 && ctl.pr)) {
      this.das = { dir, t: 0 };
      this.move(dir);
    } else {
      this.das.t++;
      if (this.das.t >= DAS_DELAY && (this.das.t - DAS_DELAY) % DAS_REPEAT === 0) this.move(dir);
    }

    if (ctl.hard) { this.hardDrop(); return; }

    const p = this.piece;
    const g = this.gravityFrames();
    const step = ctl.soft ? Math.min(2, g) : g;
    p.fall++;
    const grounded = !this.fits(p, p.rot, p.x, p.y + 1);
    if (!grounded && p.fall >= step) {
      p.fall = 0;
      p.y++;
      if (ctl.soft) this.api.addScore(1);
      if (p.y > p.lowest) { p.lowest = p.y; p.resets = 0; }
      p.lockT = 0;
    }
    if (!this.fits(p, p.rot, p.x, p.y + 1)) {
      p.lockT++;
      if (p.lockT >= LOCK_DELAY || (ctl.soft && p.lockT >= 4 && !preview)) this.lock();
    }
  }

  tickMusic() {
    if (!this.music) return;
    const stepFrames = Math.max(6, 10 - Math.floor(this.level / 3));
    if (++this.mTimer < stepFrames) return;
    this.mTimer = 0;
    const sfx = this.api.sfx;
    if (this.mLeft <= 0) {
      const [note, len] = MELODY[this.mIdx % MELODY.length];
      this.mIdx++;
      this.mLeft = len;
      if (note) sfx.tone(note, (len * stepFrames) / 60 * 0.9, { type: 'square', vol: 0.035 });
    }
    this.mLeft--;
    if (this.mStep % 2 === 0) {
      const b = BASS[(this.mStep / 2) % BASS.length];
      sfx.tone(b, (stepFrames * 2) / 60 * 0.8, { type: 'triangle', vol: 0.06 });
    }
    this.mStep++;
  }

  // ----- Otomatik pilot (önizleme) -----
  evaluate(board) {
    let agg = 0, holes = 0, bump = 0, lines = 0;
    const heights = [];
    for (let x = 0; x < COLS; x++) {
      let h = 0, seen = false;
      for (let y = 0; y < ROWS; y++) {
        if (board[y][x]) { if (!seen) { h = ROWS - y; seen = true; } } else if (seen) holes++;
      }
      heights.push(h);
      agg += h;
    }
    for (let x = 0; x < COLS - 1; x++) bump += Math.abs(heights[x] - heights[x + 1]);
    for (let y = 0; y < ROWS; y++) if (board[y].every(Boolean)) lines++;
    return -0.51 * agg + 0.76 * lines - 0.36 * holes - 0.18 * bump;
  }

  plan() {
    const p = this.piece;
    let best = null;
    for (let rot = 0; rot < 4; rot++) {
      for (let x = -2; x < COLS; x++) {
        const test = { ...p, rot, x, y: p.y };
        if (!this.fits(test)) continue;
        while (this.fits(test, rot, x, test.y + 1)) test.y++;
        const b = this.board.map((r) => r.slice());
        for (const [cx, cy] of this.cellsOf(test)) if (cy >= 0) b[cy][cx] = p.type;
        const s = this.evaluate(b);
        if (!best || s > best.s) best = { s, rot, x };
      }
    }
    return best || { rot: p.rot, x: p.x };
  }

  autopilot() {
    const ctl = {};
    if (!this.ai) this.ai = { ...this.plan(), wait: 4 };
    const p = this.piece;
    if (--this.ai.wait > 0) return ctl;
    this.ai.wait = 3;
    if (p.rot !== this.ai.rot) ctl.cw = true;
    else if (p.x < this.ai.x) { ctl.right = true; ctl.pr = true; } else if (p.x > this.ai.x) { ctl.left = true; ctl.pl = true; } else ctl.hard = true;
    return ctl;
  }

  // ----- Çizim -----
  drawBlock(type, sx, sy) {
    const spr = type === '#' ? GRAY_BLOCK : blockSprite(PIECES[type].style, this.level);
    this.api.gfx.sprite(spr, sx, sy);
  }

  drawPanelBox(y, h, label, value) {
    const { gfx } = this.api;
    gfx.rect(PX, y, 66, h, '#000');
    gfx.rectb(PX, y, 66, h, '#fcfcfc');
    gfx.rectb(PX + 1, y + 1, 64, h - 2, '#5c5c6c');
    gfx.text(label, PX + 33, y + 4, '#fca044', { align: 'center' });
    if (value !== undefined) gfx.text(value, PX + 33, y + 13, '#fcfcfc', { align: 'center' });
  }

  draw() {
    const { gfx, score, hiScore, frame } = this.api;
    // Tuğla arka plan
    for (let y = 0; y < gfx.H; y += 8) {
      for (let x = (y / 8) % 2 ? -8 : 0; x < gfx.W; x += 16) gfx.sprite(BRICK, x, y);
    }
    // Kuyu
    gfx.rect(WX - 2, WY - 2, COLS * CELL + 4, (ROWS - HIDDEN) * CELL + 4, '#fcfcfc');
    gfx.rect(WX - 1, WY - 1, COLS * CELL + 2, (ROWS - HIDDEN) * CELL + 2, '#3c3c4c');
    gfx.rect(WX, WY, COLS * CELL, (ROWS - HIDDEN) * CELL, this.flash && this.flash % 6 < 3 ? '#fcfcfc' : '#000');

    const sx = (x) => WX + x * CELL;
    const sy = (y) => WY + (y - HIDDEN) * CELL;
    const clearRows = this.clearing ? new Set(this.clearing.rows) : null;
    // Silinen satırlar ortadan dışa doğru kaybolur
    const gone = this.clearing ? Math.min(5, Math.floor(this.clearing.t / 4)) : 0;
    for (let y = HIDDEN; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const t = this.board[y][x];
        if (!t) continue;
        if (clearRows?.has(y)) {
          const d = x < 5 ? 4 - x : x - 5;
          if (d < gone) continue;
          if (this.clearing.rows.length === 4 && frame % 4 < 2) { gfx.rect(sx(x), sy(y), 6, 6, '#fcfcfc'); continue; }
        }
        this.drawBlock(this.dying && y - HIDDEN < this.dying / 3 ? '#' : t, sx(x), sy(y));
      }
    }

    // Perde (oyun sonu)
    if (this.dying) {
      const n = Math.min(ROWS - HIDDEN, Math.floor(this.dying / 3));
      for (let r = 0; r < n; r++) {
        for (let x = 0; x < COLS; x++) {
          if (!this.board[r + HIDDEN][x]) gfx.rect(sx(x), WY + r * CELL, 6, 6, '#3c3c3c');
        }
      }
    }

    if (this.dropTrail) {
      const d = this.dropTrail;
      const alpha = d.t / 16;
      for (const [cx, cy] of SHAPES[d.type][d.rot]) {
        const top = Math.max(HIDDEN, d.y0 + cy);
        const bot = d.y1 + cy;
        if (bot > top) gfx.ctx.globalAlpha = alpha;
        if (bot > top) gfx.rect(sx(d.x + cx) + 2, sy(top), 2, (bot - top) * CELL, '#fcfcfc');
        gfx.ctx.globalAlpha = 1;
      }
    }

    const p = this.piece;
    if (p && !this.dying) {
      // Hayalet parça
      const gy = this.ghostY();
      if (gy > p.y) {
        const [c1] = LEVEL_COLORS[this.level % 10];
        for (const [cx, cy] of this.cellsOf(p, p.rot, p.x, gy)) {
          if (cy < HIDDEN) continue;
          gfx.rectb(sx(cx), sy(cy), 6, 6, c1);
          gfx.pset(sx(cx) + 2, sy(cy) + 2, '#5c5c6c');
        }
      }
      for (const [cx, cy] of this.cellsOf(p)) {
        if (cy < HIDDEN) continue;
        this.drawBlock(p.type, sx(cx), sy(cy));
      }
    }

    // Panel
    this.drawPanelBox(2, 22, 'SKOR', String(score).padStart(6, '0'));
    this.drawPanelBox(26, 22, 'REKOR', String(Math.max(hiScore, score)).padStart(6, '0'));
    this.drawPanelBox(50, 22, 'SATIR', String(this.lines).padStart(3, '0'));
    this.drawPanelBox(74, 22, 'SEVİYE', String(this.level).padStart(2, '0'));
    this.drawPanelBox(98, 44, 'SIRADAKİ');
    const nt = this.queue[0];
    if (nt) {
      const cells = SHAPES[nt][0];
      const minX = Math.min(...cells.map((c) => c[0])), maxX = Math.max(...cells.map((c) => c[0]));
      const minY = Math.min(...cells.map((c) => c[1])), maxY = Math.max(...cells.map((c) => c[1]));
      const w = (maxX - minX + 1) * CELL, h = (maxY - minY + 1) * CELL;
      const ox = PX + 33 - Math.floor(w / 2), oy = 98 + 27 - Math.floor(h / 2);
      for (const [cx, cy] of cells) this.drawBlock(nt, ox + (cx - minX) * CELL, oy + (cy - minY) * CELL);
    }

    if (this.banner) {
      const b = this.banner;
      if (b.t > 20 || frame % 8 < 5) {
        const cx = WX + (COLS * CELL) / 2;
        const w = gfx.textWidth(b.text) + 8;
        gfx.rect(cx - w / 2, 60, w, 15, '#000');
        gfx.rectb(cx - w / 2, 60, w, 15, '#fca044');
        gfx.text(b.text, cx, 64, '#fcfcfc', { align: 'center' });
      }
    }
    if (this.clearing && this.clearing.rows.length === 4 && !this.api.preview) {
      gfx.text('DÖRTLÜ!', WX + (COLS * CELL) / 2, 40, frame % 6 < 3 ? '#fca044' : '#fcfcfc', { align: 'center', shadow: '#000' });
    }
    if (this.dying > 3 * (ROWS - HIDDEN)) {
      const cx = WX + (COLS * CELL) / 2;
      gfx.rect(cx - 30, 62, 60, 26, '#000');
      gfx.rectb(cx - 30, 62, 60, 26, '#fcfcfc');
      gfx.text('OYUN', cx, 66, '#f83800', { align: 'center' });
      gfx.text('BİTTİ', cx, 77, '#f83800', { align: 'center' });
    }
  }
}
