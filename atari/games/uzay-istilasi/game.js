// Uzay İstilası — Space Invaders tarzı.
// 5x11 uzaylı sürüsü (tek tek ilerleyen "dalga" hareketi), aşınan sığınaklar,
// üç tür bomba, gizemli UFO ve kabin selofanı gibi renkli bantlar.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'uzay-istilasi',
  width: 224,
  height: 256,
  buttons: { a: 'ATEŞ' },
  help: [
    'Sağ/sol ok: topu kaydır. A (Z/Boşluk): ateş; basılı tutunca otomatik ateş.',
    'Ekranda aynı anda tek mermin olabilir. Sığınaklar mermiyle aşınır.',
    'Alt sıra 10, orta sıra 20, üst sıra 30 puan. UFO gizemli bonus verir.',
    'Uzaylılar azaldıkça hızlanır; yere inerlerse oyun biter. 1500 puanda can.',
  ],
};

const W = 224;
const H = 256;
const WHITE = '#f4f4f4';
const PAL = { X: WHITE };

// --- Sprite'lar (özgün tasarım, klasik ruh) ---------------------------------
const SQUID = [
  makeSprite([
    '...XX...',
    '..XXXX..',
    '.XXXXXX.',
    'XX.XX.XX',
    'XXXXXXXX',
    '.X.XX.X.',
    'X......X',
    '.X....X.',
  ], PAL),
  makeSprite([
    '...XX...',
    '..XXXX..',
    '.XXXXXX.',
    'XX.XX.XX',
    'XXXXXXXX',
    '..X..X..',
    '.X.XX.X.',
    'X.X..X.X',
  ], PAL),
];
const CRAB = [
  makeSprite([
    '..X.....X..',
    '...X...X...',
    '..XXXXXXX..',
    '.XX.XXX.XX.',
    'XXXXXXXXXXX',
    'X.XXXXXXX.X',
    'X.X.....X.X',
    '...XX.XX...',
  ], PAL),
  makeSprite([
    '..X.....X..',
    'X..X...X..X',
    'X.XXXXXXX.X',
    'XXX.XXX.XXX',
    'XXXXXXXXXXX',
    '.XXXXXXXXX.',
    '..X.....X..',
    '.X.......X.',
  ], PAL),
];
const OCTO = [
  makeSprite([
    '....XXXX....',
    '.XXXXXXXXXX.',
    'XXXXXXXXXXXX',
    'XX..XXXX..XX',
    'XXXXXXXXXXXX',
    '...XX..XX...',
    '..XX.XX.XX..',
    'XX........XX',
  ], PAL),
  makeSprite([
    '....XXXX....',
    '.XXXXXXXXXX.',
    'XXXXXXXXXXXX',
    'XX..XXXX..XX',
    'XXXXXXXXXXXX',
    '..XXX..XXX..',
    '.XX..XX..XX.',
    '..XX....XX..',
  ], PAL),
];
const TYPES = [
  { spr: OCTO, w: 12, off: 2, pts: 10 },
  { spr: CRAB, w: 11, off: 2, pts: 20 },
  { spr: SQUID, w: 8, off: 4, pts: 30 },
];
const ALIEN_BOOM = makeSprite([
  '....X...X....',
  '.X...X.X...X.',
  '..X.......X..',
  '...X.....X...',
  'XX.........XX',
  '...X.....X...',
  '..X..X.X..X..',
  '.X..X...X..X.',
], PAL);
const CANNON = makeSprite([
  '......X......',
  '.....XXX.....',
  '.....XXX.....',
  '.XXXXXXXXXXX.',
  'XXXXXXXXXXXXX',
  'XXXXXXXXXXXXX',
  'XXXXXXXXXXXXX',
  'XXXXXXXXXXXXX',
], PAL);
const CANNON_BOOM = [
  makeSprite([
    '.....X.......',
    '..X.....X..X.',
    '.....X.X.....',
    '.X..XX....X..',
    '...XXXXX.X...',
    'X.XXXXXXX..X.',
    '.XXXXXXXXX...',
    'XXXXXXXXXXXXX',
  ], PAL),
  makeSprite([
    'X.......X..X.',
    '...X.X.....X.',
    '.X......X....',
    '....X.X...X.X',
    'X..XX.XXX....',
    '..XXXXX.X.X..',
    '.XXXXXXXXX.X.',
    'XXXXX.XXXXXXX',
  ], PAL),
];
const UFO = makeSprite([
  '.....XXXXXX.....',
  '...XXXXXXXXXX...',
  '..XXXXXXXXXXXX..',
  '.XX.XX.XX.XX.XX.',
  'XXXXXXXXXXXXXXXX',
  '..XXX..XX..XXX..',
  '...X........X...',
], PAL);
const UFO_BOOM = makeSprite([
  'X.X....X..X.....X.X',
  '...X.XXXXXX.X.X....',
  '.X.XXXXXXXXXX..X..X',
  '..XX.XX.XX.XX.XX...',
  'X.XXXXXXXXXXXXXXX.X',
  '...XXX..XX..XXX....',
  '.X..X..X...X..X.X..',
], PAL);
const SHOT_BOOM = makeSprite([
  'X...X..X',
  '..X...X.',
  '.XXXXXX.',
  'XXXXXXXX',
  'XXXXXXXX',
  '.XXXXXX.',
  '..X..X..',
  'X..X...X',
], PAL);
const BOMB_BOOM = makeSprite([
  '..X...',
  'X...X.',
  '.XXXX.',
  'XXXXXX',
  '.XXXX.',
  'XXXXXX',
  '.X.XX.',
  'X..X.X',
], PAL);
// Üç bomba türü, 4'er kare
const BOMBS = [
  // yuvarlanan (oyuncuya nişan alır)
  [
    ['.X.', '.X.', '.X.', 'XXX', '.X.', '.X.', '.X.', '.X.'],
    ['.X.', '.X.', '.X.', '.X.', '.X.', 'XXX', '.X.', '.X.'],
    ['.X.', 'XXX', '.X.', '.X.', '.X.', '.X.', '.X.', '.X.'],
    ['.X.', '.X.', '.X.', '.X.', '.X.', '.X.', 'XXX', '.X.'],
  ],
  // pistonlu
  [
    ['.X.', '.X.', 'XXX', '.X.', '.X.', '.X.', '.X.', 'XXX'],
    ['.X.', '.X.', '.X.', '.X.', 'XXX', '.X.', '.X.', 'XXX'],
    ['XXX', '.X.', '.X.', '.X.', '.X.', 'XXX', '.X.', 'XXX'],
    ['.X.', '.X.', '.X.', 'XXX', '.X.', '.X.', '.X.', 'XXX'],
  ],
  // zikzak
  [
    ['.X.', 'X..', '.X.', '..X', '.X.', 'X..', '.X.', '..X'],
    ['X..', '.X.', '..X', '.X.', 'X..', '.X.', '..X', '.X.'],
    ['.X.', '..X', '.X.', 'X..', '.X.', '..X', '.X.', 'X..'],
    ['..X', '.X.', 'X..', '.X.', '..X', '.X.', 'X..', '.X.'],
  ],
].map((frames) => frames.map((f) => makeSprite(f, PAL)));

const SHIELD_ROWS = [
  '....XXXXXXXXXXXXXX....',
  '...XXXXXXXXXXXXXXXX...',
  '..XXXXXXXXXXXXXXXXXX..',
  '.XXXXXXXXXXXXXXXXXXXX.',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXX',
  'XXXXXXX........XXXXXXX',
  'XXXXXX..........XXXXXX',
  'XXXXX............XXXXX',
  'XXXXX............XXXXX',
];
const SHOT_SPLASH = [
  'X..X..X.',
  '..X..X..',
  '.XXXXXX.',
  'XXXXXXXX',
  'XXXXXXXX',
  '.XXXXXX.',
  '..X.XX..',
  'X..X..X.',
];
const BOMB_SPLASH = [
  '..X...',
  'X...X.',
  '.XXXX.',
  'XXXXXX',
  '.XXXX.',
  'XXXXXX',
  '.X.XX.',
  'X..X.X',
];

const SW = 22;
const SH = 16;
const SHIELD_Y = 192;
const PLAYER_Y = 216;
const GROUND_Y = 239;
const TOP_LIMIT = 30;
const UFO_Y = 40;
const COLS = 11;
const ROWS = 5;
const START_X = 24;
const START_Y = [64, 80, 88, 88, 88, 96, 96, 96];
const UFO_SCORES = [100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100];
const PLUNGER_COLS = [0, 6, 0, 0, 0, 3, 10, 0, 5, 2, 0, 0, 10, 8, 1, 7];
const SQUIGGLY_COLS = [10, 0, 5, 2, 0, 0, 10, 8, 1, 7, 1, 10, 3, 6, 9];
const MARCH = [98, 87, 78, 73];

class Shield {
  constructor(x) {
    this.x = x;
    this.y = SHIELD_Y;
    this.mask = new Uint8Array(SW * SH);
    SHIELD_ROWS.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'X') this.mask[y * SW + x] = 1; }));
    this.canvas = document.createElement('canvas');
    this.canvas.width = SW;
    this.canvas.height = SH;
    this.dirty = true;
  }

  at(px, py) {
    const x = Math.floor(px - this.x);
    const y = Math.floor(py - this.y);
    if (x < 0 || y < 0 || x >= SW || y >= SH) return false;
    return this.mask[y * SW + x] === 1;
  }

  // Desenin 'X' olan piksellerini siler (sol üst köşe gx, gy ekran koordinatı)
  erode(pattern, gx, gy) {
    const ox = Math.round(gx - this.x);
    const oy = Math.round(gy - this.y);
    pattern.forEach((row, py) => [...row].forEach((c, px) => {
      if (c !== 'X') return;
      const x = ox + px;
      const y = oy + py;
      if (x >= 0 && y >= 0 && x < SW && y < SH) this.mask[y * SW + x] = 0;
    }));
    this.dirty = true;
  }

  clearRect(rx, ry, rw, rh) {
    for (let y = Math.max(0, Math.floor(ry - this.y)); y < Math.min(SH, Math.ceil(ry + rh - this.y)); y++) {
      for (let x = Math.max(0, Math.floor(rx - this.x)); x < Math.min(SW, Math.ceil(rx + rw - this.x)); x++) {
        if (this.mask[y * SW + x]) { this.mask[y * SW + x] = 0; this.dirty = true; }
      }
    }
  }

  render() {
    if (!this.dirty) return this.canvas;
    this.dirty = false;
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, SW, SH);
    ctx.fillStyle = WHITE;
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (this.mask[y * SW + x]) ctx.fillRect(x, y, 1, 1);
    return this.canvas;
  }
}

export default class SpaceInvaders {
  constructor(api) {
    this.api = api;
    this.lives = 3;
    this.wave = 0;
    this.extraGiven = false;
    this.shotCount = 0;
    this.ticks = 0;
    this.ground = new Uint8Array(W).fill(1);
    this.over = 0;
    this.player = { x: 16, alive: true };
    this.nextWave();
    if (api.preview) {
      // Önizleme: sürü hazır, savaş hemen başlasın
      this.spawned = this.inv.length;
      this.intro = 0;
      this.player.x = 100;
    }
  }

  nextWave() {
    this.wave++;
    const sy = START_Y[Math.min(this.wave - 1, START_Y.length - 1)];
    this.inv = [];
    // Dalga sırası: alttan üste, soldan sağa (tek tek ilerleyiş bu sırayla)
    for (let r = 0; r < ROWS; r++) {
      const type = r < 2 ? 0 : r < 4 ? 1 : 2;
      for (let c = 0; c < COLS; c++) {
        this.inv.push({ col: c, row: r, type, x: START_X + c * 16, y: sy + (ROWS - 1 - r) * 16, alive: true, f: 0 });
      }
    }
    this.ptr = 0;
    this.dx = 2;
    this.dropping = false;
    this.spawned = 0;
    this.intro = 100;
    this.shields = [32, 77, 122, 167].map((x) => new Shield(x));
    this.bombs = [null, null, null];
    this.bombTimer = 60;
    this.plungerIdx = 0;
    this.squigIdx = 0;
    this.shot = null;
    this.shotCool = 0;
    this.booms = [];
    this.alienBoom = null;
    this.ufo = null;
    this.ufoTimer = 1500;
    this.marchTimer = 30;
    this.marchNote = 0;
    this.clearTimer = 0;
    this.dying = 0;
    this.player.alive = true;
  }

  get alive() {
    let n = 0;
    for (const v of this.inv) if (v.alive) n++;
    return n;
  }

  update() {
    this.ticks++;
    const api = this.api;
    if (this.over) {
      if (--this.over === 0) api.gameOver();
      this.updateBooms();
      return;
    }
    // Dalga başında sürü tek tek belirir
    if (this.intro > 0) {
      for (let k = 0; k < 2 && this.spawned < this.inv.length; k++) this.spawned++;
      this.intro--;
      this.updatePlayer();
      return;
    }
    if (this.dying) {
      this.updateDying();
      return;
    }
    if (this.clearTimer) {
      this.updatePlayer();
      this.updateShot();
      this.updateBooms();
      if (--this.clearTimer === 0) {
        this.nextWave();
        api.sfx.play('levelup');
      }
      return;
    }

    this.updatePlayer();
    this.updateShot();
    if (this.alienBoom) {
      // Uzaylı patlarken sürü bir an durur (klasik his)
      if (--this.alienBoom.t <= 0) this.alienBoom = null;
    } else {
      this.stepInvaders();
    }
    this.updateMarch();
    this.updateBombs();
    this.updateUfo();
    this.updateBooms();

    if (this.alive === 0 && !this.alienBoom) {
      this.clearTimer = 90;
      this.bombs = [null, null, null];
      if (this.ufo) this.ufo = null;
    }
    if (!this.extraGiven && api.score >= 1500) {
      this.extraGiven = true;
      this.lives++;
      api.sfx.play('coin');
    }
  }

  // ---- Oyuncu ----
  updatePlayer() {
    const { input, preview } = this.api;
    const p = this.player;
    if (!p.alive) return;
    let dx = input.dx;
    let fire = input.pressed('a') || (input.held('a') && this.shotCool <= 0);
    if (preview) [dx, fire] = this.autopilot();
    p.x = Math.max(8, Math.min(W - 8 - 13, p.x + dx));
    if (this.shotCool > 0) this.shotCool--;
    if (fire && !this.shot && !this.intro && !this.clearTimer) {
      this.shot = { x: p.x + 6, y: PLAYER_Y - 4 };
      this.shotCount++;
      this.shotCool = 8;
      this.api.sfx.tone(1500, 0.09, { slide: 300, vol: 0.05 });
      this.api.sfx.noise(0.05, { vol: 0.06, freq: 4000 });
    }
  }

  autopilot() {
    const p = this.player;
    // en alttaki uzaylıların altına git, bombalardan kaç
    const targets = this.inv.filter((v) => v.alive);
    let tx = p.x;
    if (targets.length) {
      const t = targets.reduce((a, b) => (Math.abs(a.x + 8 - p.x - 6) < Math.abs(b.x + 8 - p.x - 6) ? a : b));
      tx = t.x + 2 + ((this.ticks >> 6) % 3) * 2;
    }
    for (const b of this.bombs) if (b && b.y > 150 && Math.abs(b.x - p.x - 6) < 10) tx = p.x + (b.x > p.x + 6 ? -20 : 20);
    const dx = Math.sign(Math.round(tx - p.x));
    return [dx, Math.abs(tx - p.x) < 6];
  }

  updateShot() {
    const s = this.shot;
    if (!s) return;
    for (let i = 0; i < 4; i++) {
      s.y -= 1;
      if (this.shotCollide(s)) return;
    }
  }

  shotCollide(s) {
    const api = this.api;
    // Bombalarla çarpışma
    for (let i = 0; i < 3; i++) {
      const b = this.bombs[i];
      if (b && Math.abs(b.x + 1 - s.x) <= 1 && s.y < b.y + 8 && s.y + 4 > b.y) {
        this.bombs[i] = null;
        this.shot = null;
        this.booms.push({ spr: SHOT_BOOM, x: s.x - 4, y: s.y - 4, t: 12 });
        return true;
      }
    }
    // Sığınaklar
    for (const sh of this.shields) {
      if (sh.at(s.x, s.y)) {
        sh.erode(SHOT_SPLASH, s.x - 4, s.y - 6);
        this.booms.push({ spr: SHOT_BOOM, x: s.x - 4, y: s.y - 6, t: 10 });
        this.shot = null;
        return true;
      }
    }
    // Uzaylılar
    for (const v of this.inv) {
      if (!v.alive) continue;
      const t = TYPES[v.type];
      const vx = v.x + t.off;
      if (s.x >= vx && s.x < vx + t.w && s.y >= v.y && s.y < v.y + 8) {
        v.alive = false;
        this.shot = null;
        this.alienBoom = { x: v.x + 1, y: v.y, t: 16 };
        api.addScore(t.pts);
        api.sfx.noise(0.18, { vol: 0.2, freq: 2500 });
        api.sfx.tone(700, 0.14, { slide: 120, vol: 0.08 });
        return true;
      }
    }
    // UFO
    const u = this.ufo;
    if (u && !u.dead && s.x >= u.x && s.x < u.x + 16 && s.y >= UFO_Y && s.y < UFO_Y + 7) {
      u.dead = 90;
      u.pts = UFO_SCORES[this.shotCount % UFO_SCORES.length];
      api.addScore(u.pts);
      this.shot = null;
      api.sfx.seq([['E6', 0.05], ['B5', 0.05], ['E6', 0.05], ['B5', 0.05], ['E6', 0.12]], { vol: 0.08 });
      api.sfx.noise(0.4, { vol: 0.2, freq: 1500 });
      return true;
    }
    if (s.y <= TOP_LIMIT) {
      this.booms.push({ spr: SHOT_BOOM, x: s.x - 4, y: TOP_LIMIT, t: 14 });
      this.shot = null;
      return true;
    }
    return false;
  }

  // ---- Sürü ----
  stepInvaders() {
    const n = this.inv.length;
    const alive = this.alive;
    if (!alive) return;
    for (let k = 0; k < n; k++) {
      const i = this.ptr;
      const v = this.inv[i];
      let moved = false;
      if (v.alive) {
        if (this.dropping) v.y += 8;
        else v.x += alive === 1 && this.dx > 0 ? 3 : this.dx;
        v.f ^= 1;
        moved = true;
        this.invaderSideEffects(v);
      }
      this.ptr++;
      if (this.ptr >= n) {
        this.ptr = 0;
        this.cycleEnd();
      }
      if (moved) return;
    }
  }

  cycleEnd() {
    if (this.dropping) {
      this.dropping = false;
      return;
    }
    for (const v of this.inv) {
      if (!v.alive) continue;
      const t = TYPES[v.type];
      const l = v.x + t.off;
      const r = l + t.w;
      if ((this.dx > 0 && r >= W - 6) || (this.dx < 0 && l <= 6)) {
        this.dropping = true;
        this.dx = -this.dx;
        return;
      }
    }
  }

  invaderSideEffects(v) {
    const t = TYPES[v.type];
    // Sığınakların üstünden geçerken onları yer
    if (v.y + 8 > SHIELD_Y) for (const sh of this.shields) sh.clearRect(v.x + t.off, v.y, t.w, 8);
    // Yere ulaştılar: istila!
    if (v.y + 8 >= PLAYER_Y && this.player.alive) {
      this.lives = 0;
      this.killPlayer(true);
    }
  }

  updateMarch() {
    const alive = this.alive;
    if (!alive) return;
    if (--this.marchTimer > 0) return;
    this.marchTimer = Math.max(6, Math.round(alive * 0.9 + 5));
    const f = MARCH[this.marchNote];
    this.marchNote = (this.marchNote + 1) % 4;
    this.api.sfx.tone(f, 0.09, { type: 'square', vol: 0.16 });
  }

  // ---- Bombalar ----
  bombSpeed() {
    let s = 1.2 + Math.min(0.8, (this.wave - 1) * 0.12);
    if (this.alive <= 8) s += 0.6;
    return s;
  }

  lowestInColumn(col) {
    let best = null;
    for (const v of this.inv) if (v.alive && v.col === col && (!best || v.y > best.y)) best = v;
    return best;
  }

  updateBombs() {
    const api = this.api;
    const sp = this.bombSpeed();
    for (let i = 0; i < 3; i++) {
      const b = this.bombs[i];
      if (!b) continue;
      b.y += sp;
      if (++b.at >= 4) { b.at = 0; b.f = (b.f + 1) % 4; }
      const by = Math.floor(b.y) + 7;
      // sığınak
      let hit = false;
      for (const sh of this.shields) {
        for (let dx = 0; dx < 3 && !hit; dx++) {
          if (sh.at(b.x + dx, by)) {
            sh.erode(BOMB_SPLASH, b.x - 2 + dx, by - 2);
            hit = true;
          }
        }
        if (hit) break;
      }
      if (hit) {
        this.bombs[i] = null;
        continue;
      }
      // oyuncu
      const p = this.player;
      if (p.alive && b.x + 2 >= p.x && b.x <= p.x + 12 && by >= PLAYER_Y + 1 && b.y <= PLAYER_Y + 7) {
        this.bombs[i] = null;
        this.killPlayer(false);
        return;
      }
      // zemin
      if (by >= GROUND_Y) {
        this.booms.push({ spr: BOMB_BOOM, x: b.x - 1, y: GROUND_Y - 7, t: 12 });
        for (let x = b.x - 1; x <= b.x + 3; x++) if (x >= 0 && x < W && api.rand() < 0.6) this.ground[x] = 0;
        this.bombs[i] = null;
      }
    }

    if (--this.bombTimer > 0) return;
    const sc = this.api.score;
    const base = sc < 200 ? 48 : sc < 1000 ? 30 : sc < 2000 ? 22 : sc < 3000 ? 16 : 11;
    const reload = Math.max(7, base - (this.wave - 1) * 3);
    this.bombTimer = reload;
    const free = [0, 1, 2].filter((i) => !this.bombs[i]);
    if (!free.length) return;
    const type = this.api.pick(free);
    let col;
    if (type === 0) {
      const p = this.player;
      let bestD = 1e9;
      for (const v of this.inv) {
        if (!v.alive) continue;
        const d = Math.abs(v.x + 8 - (p.x + 6));
        if (d < bestD) { bestD = d; col = v.col; }
      }
    } else if (type === 1) {
      if (this.alive === 1) return;
      col = PLUNGER_COLS[this.plungerIdx++ % PLUNGER_COLS.length];
    } else {
      col = SQUIGGLY_COLS[this.squigIdx++ % SQUIGGLY_COLS.length];
    }
    const v = col == null ? null : this.lowestInColumn(col);
    if (!v) return;
    this.bombs[type] = { x: v.x + 7, y: v.y + 8, f: 0, at: 0, type };
  }

  // ---- UFO ----
  updateUfo() {
    const api = this.api;
    const u = this.ufo;
    if (!u) {
      if (--this.ufoTimer <= 0) {
        this.ufoTimer = 1500;
        if (this.alive >= 8) {
          const fromLeft = this.shotCount % 2 === 0;
          this.ufo = { x: fromLeft ? -16 : W, dir: fromLeft ? 1 : -1, dead: 0, pts: 0 };
        }
      }
      return;
    }
    if (u.dead) {
      if (--u.dead <= 0) this.ufo = null;
      return;
    }
    u.x += u.dir * 0.75;
    if (this.ticks % 8 === 0) api.sfx.tone(this.ticks % 16 ? 520 : 760, 0.12, { type: 'sawtooth', vol: 0.035, slide: this.ticks % 16 ? 760 : 520 });
    if (u.x < -20 || u.x > W + 4) this.ufo = null;
  }

  updateBooms() {
    this.booms = this.booms.filter((b) => --b.t > 0);
  }

  // ---- Ölüm ----
  killPlayer(invasion) {
    const api = this.api;
    if (!this.player.alive) return;
    this.player.alive = false;
    this.dying = 150;
    this.shot = null;
    if (!invasion) this.lives--;
    api.sfx.noise(1.1, { vol: 0.35, freq: 900 });
    api.sfx.tone(220, 0.9, { slide: 40, type: 'sawtooth', vol: 0.08 });
  }

  updateDying() {
    this.updateBooms();
    if (--this.dying > 0) return;
    this.bombs = [null, null, null];
    if (this.lives <= 0) {
      this.over = 120;
      this.api.sfx.play('gameover');
      return;
    }
    this.player.alive = true;
    this.player.x = 16;
    this.bombTimer = 60;
  }

  // ---- Çizim ----
  draw() {
    const { gfx, score, hiScore } = this.api;
    const ctx = gfx.ctx;
    gfx.cls('#000');

    // HUD
    gfx.text('SKOR', 16, 6, WHITE);
    gfx.text('REKOR', 112, 6, WHITE, { align: 'center' });
    gfx.text('DALGA', W - 16, 6, WHITE, { align: 'right' });
    gfx.text(String(score).padStart(5, '0'), 16, 17, WHITE);
    gfx.text(String(Math.max(score, hiScore)).padStart(5, '0'), 112, 17, WHITE, { align: 'center' });
    gfx.text(String(this.wave), W - 16, 17, WHITE, { align: 'right' });

    // UFO
    const u = this.ufo;
    if (u) {
      if (!u.dead) gfx.sprite(UFO, u.x, UFO_Y);
      else if (u.dead > 60) gfx.sprite(UFO_BOOM, u.x - 1, UFO_Y);
      else gfx.text(String(u.pts), u.x + 8, UFO_Y, WHITE, { align: 'center' });
    }

    // Sürü
    const showAll = this.ticks === 0;
    for (let i = 0; i < this.inv.length; i++) {
      const v = this.inv[i];
      if (!v.alive || (!showAll && i >= this.spawned)) continue;
      const t = TYPES[v.type];
      gfx.sprite(t.spr[v.f], v.x + t.off, v.y);
    }
    if (this.alienBoom) gfx.sprite(ALIEN_BOOM, this.alienBoom.x, this.alienBoom.y);

    // Sığınaklar
    for (const sh of this.shields) gfx.sprite(sh.render(), sh.x, sh.y);

    // Bombalar, mermi, patlamalar
    for (const b of this.bombs) if (b) gfx.sprite(BOMBS[b.type][b.f], b.x, Math.floor(b.y));
    if (this.shot) gfx.rect(this.shot.x, this.shot.y, 1, 4, WHITE);
    for (const b of this.booms) gfx.sprite(b.spr, b.x, b.y);

    // Oyuncu
    const p = this.player;
    if (p.alive) {
      if (this.intro <= 0 || this.intro % 16 < 12 || this.api.preview) gfx.sprite(CANNON, p.x, PLAYER_Y);
    } else if (this.dying > 70) {
      gfx.sprite(CANNON_BOOM[(this.dying >> 3) & 1], p.x, PLAYER_Y);
    }

    // Zemin çizgisi (bombalarla aşınır)
    ctx.fillStyle = WHITE;
    for (let x = 0; x < W; x++) if (this.ground[x]) ctx.fillRect(x, GROUND_Y, 1, 1);

    // Alt bilgi: canlar
    gfx.text(String(Math.max(0, this.lives)), 8, 244, WHITE);
    for (let i = 0; i < Math.min(5, this.lives - 1); i++) gfx.sprite(CANNON, 24 + i * 16, 244);
    gfx.text(`DALGA ${this.wave}`, W - 8, 244, WHITE, { align: 'right' });

    // Ortadaki mesajlar
    if (this.intro > 0 && !this.api.preview && this.ticks > 0) {
      gfx.text(`DALGA ${this.wave}`, 112, 166, WHITE, { align: 'center' });
      if (this.intro < 60) gfx.text('HAZIR!', 112, 178, WHITE, { align: 'center' });
    }
    if (this.clearTimer) gfx.text('DALGA TEMİZLENDİ!', 112, 170, WHITE, { align: 'center' });
    if (this.over) {
      gfx.rect(56, 102, 112, 22, '#000');
      gfx.text('OYUN BİTTİ', 112, 109, WHITE, { align: 'center' });
    }

    // Kabin selofanı: beyaz pikselleri bantlara göre boya
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = '#ff2a3a';
    ctx.fillRect(0, 30, W, 18);
    ctx.fillStyle = '#2aff5a';
    ctx.fillRect(0, 184, W, GROUND_Y + 1 - 184);
    ctx.fillRect(0, GROUND_Y + 1, 136, H - GROUND_Y - 1);
    ctx.restore();
  }
}
