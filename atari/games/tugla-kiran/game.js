// Tuğla Kıran — Breakout / Arkanoid tarzı.
// Raket (uzay gemisi), açıya duyarlı top, gümüş/altın tuğlalar, düşen kapsüller, lazer, çoklu top, düşmanlar.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'tugla-kiran',
  width: 192,
  height: 232,
  buttons: { a: 'FIRLAT / LAZER' },
  help: [
    'Sol/Sağ: raketi sür. A: topu fırlat, lazer kapsülü varken ateş et.',
    'Topun rakete değdiği yer açıyı belirler: kenarlara yakın vuruş daha yatık gider.',
    'Gümüş tuğla birkaç vuruşta, altın tuğla hiç kırılmaz.',
    'Kapsüller: U uzat, Y yavaşlat, T tut, Ç üç top, L lazer, C can, K kapı (sonraki tur).',
  ],
};

const W = 192;
const H = 232;
const LEFT = 8;
const RIGHT = 184;
const TOP = 24;
const BW = 16;
const BH = 8;
const BCOLS = 11;
const BROWS = 18;
const BY0 = 40;
const PADDLE_Y = 206;

// Tuğla tipleri
const BRICK = {
  W: { c: '#fcfcfc', s: '#bcbcbc', d: '#7c7c7c', pts: 50 },
  O: { c: '#fc9838', s: '#e45c10', d: '#a03c00', pts: 60 },
  C: { c: '#3cf0fc', s: '#00b8d8', d: '#00788c', pts: 70 },
  G: { c: '#5cf05c', s: '#00b800', d: '#007800', pts: 80 },
  R: { c: '#fc5c5c', s: '#d82800', d: '#881400', pts: 90 },
  B: { c: '#6c8cfc', s: '#2048e8', d: '#0c2894', pts: 100 },
  P: { c: '#fc78f8', s: '#d800cc', d: '#880080', pts: 110 },
  Y: { c: '#fcfc6c', s: '#e8d000', d: '#987c00', pts: 120 },
  S: { c: '#ececec', s: '#a8a8b4', d: '#5c5c6c', pts: 0 },
  D: { c: '#fce49c', s: '#e0a020', d: '#885800', pts: 0 },
};

// El yapımı tur düzenleri (11 sütun)
const LAYOUTS = [
  [
    '...........',
    '...........',
    'SSSSSSSSSSS',
    'RRRRRRRRRRR',
    'YYYYYYYYYYY',
    'BBBBBBBBBBB',
    'PPPPPPPPPPP',
    'GGGGGGGGGGG',
  ],
  [
    'W..........',
    'WO.........',
    'WOC........',
    'WOCG.......',
    'WOCGR......',
    'WOCGRB.....',
    'WOCGRBP....',
    'WOCGRBPY...',
    'WOCGRBPYW..',
    'WOCGRBPYWO.',
    'SSSSSSSSSSW',
  ],
  [
    '...........',
    'GGGGGGGGGGG',
    '...........',
    'WWWDDDDDDDD',
    '...........',
    'RRRRRRRRRRR',
    '...........',
    'DDDDDDDDWWW',
    '...........',
    'PPPPPPPPPPP',
    '...........',
    'BBBDDDDDBBB',
  ],
  [
    '...........',
    '..Y.....Y..',
    '...Y...Y...',
    '..CCCCCCC..',
    '.CCRCCCRCC.',
    'CCCCCCCCCCC',
    'C.CCCCCCC.C',
    'C.C.....C.C',
    '...CC.CC...',
    '...........',
    'SSS.....SSS',
  ],
  [
    '.O.G.C.B.P.',
    '.O.G.C.B.P.',
    '.O.G.C.B.P.',
    '.S.S.S.S.S.',
    '.O.G.C.B.P.',
    '.O.G.C.B.P.',
    '.O.G.C.B.P.',
    '.D.D.D.D.D.',
  ],
  [
    '.....W.....',
    '....WOW....',
    '...WOCOW...',
    '..WOCGCOW..',
    '.WOCGRGCOW.',
    'WOCGRSRGCOW',
    '.WOCGRGCOW.',
    '..WOCGCOW..',
    '...WOCOW...',
    '....WOW....',
    '.....W.....',
  ],
  [
    'DDDDDDDDDDD',
    'D.........D',
    'D.RRRRRRR.D',
    'D.RYYYYYR.D',
    'D.RYSSSYR.D',
    'D.RYYYYYR.D',
    'D.RRRRRRR.D',
    'D.........D',
    'DDDD...DDDD',
  ],
  [
    'SBSBSBSBSBS',
    'B.G.B.G.B.G',
    'G.B.G.B.G.B',
    'SPSPSPSPSPS',
    'P.Y.P.Y.P.Y',
    'Y.P.Y.P.Y.P',
    'SCSCSCSCSCS',
    '...........',
    'D...D.D...D',
  ],
];

// Kapsüller
const CAPS = {
  U: { col: '#2048e8', light: '#6c8cfc', w: 3, name: 'UZUN RAKET' },
  Y: { col: '#e45c10', light: '#fc9838', w: 3, name: 'YAVAŞ TOP' },
  T: { col: '#00a800', light: '#5cf05c', w: 3, name: 'TUTUCU' },
  Ç: { col: '#00a0b8', light: '#3cf0fc', w: 3, name: 'ÜÇ TOP' },
  L: { col: '#c81400', light: '#fc5c5c', w: 3, name: 'LAZER' },
  C: { col: '#6c6c7c', light: '#c8c8d8', w: 1, name: 'EKSTRA CAN' },
  K: { col: '#c800b8', light: '#fc78f8', w: 1, name: 'KAPI AÇILDI' },
};
const CAP_BAG = Object.entries(CAPS).flatMap(([k, v]) => new Array(v.w).fill(k));

// --- Sprite'lar ---
const brickSprites = {};
for (const [k, b] of Object.entries(BRICK)) {
  const rows = [];
  for (let y = 0; y < BH; y++) {
    let r = '';
    for (let x = 0; x < BW; x++) {
      if (x === BW - 1 || y === BH - 1) r += 'k';
      else if (x === BW - 2 || y === BH - 2) r += 'd';
      else if (y === 0 || x === 0) r += 'h';
      else r += 'c';
    }
    rows.push(r);
  }
  // Gümüş/altın için parlak çizgi
  if (k === 'S' || k === 'D') rows[2] = rows[2].slice(0, 3) + 'hh' + rows[2].slice(5);
  brickSprites[k] = makeSprite(rows, { k: '#000', d: b.d, c: b.s, h: b.c });
}
const BRICK_FLASH = makeSprite(new Array(BH).fill(null).map((_, y) => (y === BH - 1 ? 'k'.repeat(BW) : 'w'.repeat(BW - 1) + 'k')), { w: '#fff', k: '#000' });

const BALL = makeSprite([
  '.WW.',
  'WWWS',
  'WWSS',
  '.SS.',
], { W: '#fcfcfc', S: '#9c9cac' });

function makeVaus(w, laser) {
  const cap = laser
    ? ['..gRgg', '.gRggg', 'ggRggg', 'gggggg', 'gggggg', 'kggggd', '.kgggd', '..kddd']
    : ['..rRRR', '.rRWRR', 'rRWRRR', 'RRRRRR', 'RRRRRR', 'rRRRRd', '.rRRdd', '..dddd'];
  const body = ['K', 'W', 'S', 'S', 'S', 'G', 'D', 'K'];
  const rows = [];
  for (let y = 0; y < 8; y++) {
    const l = cap[y];
    const r = [...cap[y]].reverse().join('');
    const mid = 'B' + body[y].repeat(w - 14) + 'B';
    rows.push(l + mid + r);
  }
  return makeSprite(rows, {
    r: '#881400', R: '#d82800', W: '#fcb8b8', d: '#500800', K: '#3c3c4c', S: '#bcbcc8', G: '#8c8c9c', D: '#5c5c6c',
    B: '#3cf0fc', g: '#7c7c8c', k: '#2c2c3c',
  });
}
const vausCache = new Map();
function vausSprite(w, laser) {
  const key = `${w}:${laser}`;
  if (!vausCache.has(key)) vausCache.set(key, makeVaus(w, laser));
  return vausCache.get(key);
}

const LIFE_ICON = makeSprite([
  '.rRRSSSSRRr.',
  'rRRRSSSSRRRr',
  '.ddDDDDDDdd.',
], { r: '#881400', R: '#d82800', S: '#bcbcc8', D: '#5c5c6c', d: '#500800' });

const ENEMY_FRAMES = [
  makeSprite([
    '...YY...',
    '..YRRY..',
    '.YRRRRY.',
    'YRRWRRRY',
    'YRRRRRRY',
    '.YRRRRY.',
    '..YRRY..',
    '...YY...',
  ], { Y: '#fcfc6c', R: '#d82800', W: '#fff' }),
  makeSprite([
    '...YY...',
    '..YGGY..',
    '.YGGGGY.',
    'YGGGWGGY',
    'YGGGGGGY',
    '.YGGGGY.',
    '..YGGY..',
    '...YY...',
  ], { Y: '#fcfc6c', G: '#00b800', W: '#fff' }),
  makeSprite([
    '..C..C..',
    '.CBCCBC.',
    'CBBBBBBC',
    '.CBWBBC.',
    '.CBBBBC.',
    'CBBBBBBC',
    '.CBCCBC.',
    '..C..C..',
  ], { C: '#3cf0fc', B: '#2048e8', W: '#fff' }),
  makeSprite([
    '..C..C..',
    '.CPCCPC.',
    'CPPPPPPC',
    '.CPPWPC.',
    '.CPPPPC.',
    'CPPPPPPC',
    '.CPCCPC.',
    '..C..C..',
  ], { C: '#3cf0fc', P: '#d800cc', W: '#fff' }),
];

// Tur arka planları (desenli döşemeler)
const BG_STYLES = [
  ['#000c48', '#00186c', '#0c2894'],
  ['#003000', '#004800', '#006c00'],
  ['#300018', '#48002c', '#68003c'],
  ['#1c0848', '#2c0c6c', '#401894'],
  ['#002c38', '#00404c', '#005c6c'],
];
function makeBg(style, kind) {
  const c = document.createElement('canvas');
  c.width = RIGHT - LEFT;
  c.height = H - TOP;
  const g = c.getContext('2d');
  const [a, b, d] = BG_STYLES[style];
  g.fillStyle = a;
  g.fillRect(0, 0, c.width, c.height);
  for (let ty = 0; ty < c.height; ty += 16) {
    for (let tx = 0; tx < c.width; tx += 16) {
      g.fillStyle = b;
      if (kind === 0) { // altıgen benzeri
        const ox = (ty / 16) % 2 ? 8 : 0;
        g.fillRect(tx + ox + 2, ty + 1, 8, 1);
        g.fillRect(tx + ox + 1, ty + 2, 1, 6);
        g.fillRect(tx + ox + 10, ty + 2, 1, 6);
        g.fillRect(tx + ox + 2, ty + 8, 8, 1);
        g.fillStyle = d;
        g.fillRect(tx + ox + 2, ty + 2, 1, 1);
      } else if (kind === 1) { // devre
        g.fillRect(tx, ty + 7, 16, 1);
        g.fillRect(tx + 7, ty, 1, 7);
        g.fillStyle = d;
        g.fillRect(tx + 6, ty + 6, 3, 3);
      } else { // pullar
        g.fillRect(tx + 1, ty + 1, 14, 6);
        g.fillRect(tx + 9, ty + 9, 14, 6);
        g.fillStyle = d;
        g.fillRect(tx + 1, ty + 1, 14, 1);
        g.fillRect(tx + 9, ty + 9, 14, 1);
      }
    }
  }
  return c;
}
const bgCache = new Map();
function bgFor(round) {
  const key = round % 15;
  if (!bgCache.has(key)) bgCache.set(key, makeBg(round % BG_STYLES.length, round % 3));
  return bgCache.get(key);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export default class Breakout {
  constructor(api) {
    this.api = api;
    this.round = 0;
    this.lives = 3;
    this.nextLifeAt = 20000;
    this.particles = [];
    this.startRound(0);
    if (api.preview) {
      this.round = 5;
      this.startRound(5);
      this.banner = null;
      this.launch();
    }
  }

  startRound(r) {
    this.round = r;
    const lay = LAYOUTS[r % LAYOUTS.length];
    this.bricks = Array.from({ length: BROWS }, () => new Array(BCOLS).fill(null));
    const silverHits = 2 + Math.floor(r / 8);
    lay.forEach((row, y) => [...row].forEach((ch, x) => {
      if (BRICK[ch]) this.bricks[y][x] = { t: ch, hp: ch === 'S' ? silverHits : ch === 'D' ? Infinity : 1, flash: 0 };
    }));
    this.baseSpeed = Math.min(3.0, 1.9 + 0.1 * r);
    this.maxSpeed = Math.min(4.6, 3.6 + 0.12 * r);
    this.capsules = [];
    this.lasers = [];
    this.enemies = [];
    this.enemyTimer = 400;
    this.warp = false;
    this.clearT = 0;
    this.resetPaddle();
    this.banner = { lines: [`TUR ${r + 1}`, 'HAZIR!'], t: 100 };
    if (!this.api.preview && r > 0) this.api.sfx.play('start');
  }

  resetPaddle() {
    this.paddle = { x: (LEFT + RIGHT) / 2, w: 32, tw: 32, mode: null, dead: 0, vx: 0, cool: 0 };
    this.balls = [{ x: this.paddle.x, y: PADDLE_Y - 4, vx: 0, vy: 0, s: this.baseSpeed, stuck: true, off: 2, stuckT: 0 }];
    this.runTime = 0;
  }

  launch() {
    for (const b of this.balls) {
      if (!b.stuck) continue;
      b.stuck = false;
      const rel = clamp((b.x + 2 - this.paddle.x) / (this.paddle.w / 2), -1, 1);
      const ang = (rel * 55 + (Math.abs(rel) < 0.15 ? 20 : 0)) * Math.PI / 180;
      b.vx = Math.sin(ang) * b.s;
      b.vy = -Math.cos(ang) * b.s;
      this.api.sfx.tone(520, 0.05, { type: 'triangle', vol: 0.12 });
    }
  }

  liveBricks() {
    let n = 0;
    for (const row of this.bricks) for (const b of row) if (b && b.t !== 'D') n++;
    return n;
  }

  brickAt(px, py) {
    const c = Math.floor((px - LEFT) / BW);
    const r = Math.floor((py - BY0) / BH);
    if (c < 0 || c >= BCOLS || r < 0 || r >= BROWS) return null;
    const b = this.bricks[r][c];
    return b ? { b, r, c } : null;
  }

  hitBrick(r, c, fromLaser = false) {
    const b = this.bricks[r]?.[c];
    if (!b) return;
    const { sfx } = this.api;
    if (b.t === 'D') {
      b.flash = 10;
      sfx.tone(1400, 0.06, { vol: 0.08 });
      return;
    }
    b.hp--;
    if (b.hp > 0) {
      b.flash = 10;
      sfx.tone(1100, 0.06, { vol: 0.08 });
      return;
    }
    this.bricks[r][c] = null;
    const pts = b.t === 'S' ? 50 * (this.round + 1) : BRICK[b.t].pts;
    this.api.addScore(pts);
    sfx.tone(b.t === 'S' ? 900 : 660 + (r % 4) * 60, 0.05, { vol: 0.1 });
    const x = LEFT + c * BW, y = BY0 + r * BH;
    for (let i = 0; i < 6; i++) {
      this.particles.push({ x: x + 8, y: y + 4, vx: this.api.rand(-1.2, 1.2), vy: this.api.rand(-1.2, 0.8), life: 18, col: BRICK[b.t].c });
    }
    // Kapsül düşür
    if (!fromLaser || Math.random() < 0.7) {
      if (!this.capsules.length && this.balls.length === 1 && b.t !== 'S' && Math.random() < 0.2) {
        let k = this.api.pick(CAP_BAG);
        if (k === this.paddle.mode && Math.random() < 0.7) k = this.api.pick(CAP_BAG);
        this.capsules.push({ x, y, k, t: 0 });
      }
    }
    if (this.liveBricks() === 0) {
      this.clearT = 1;
      sfx.play('levelup');
    }
  }

  // Topu eksen eksen hareket ettirip tuğla/duvar çarpışmasını çözer
  moveBall(ball) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(ball.vx), Math.abs(ball.vy))));
    for (let i = 0; i < steps; i++) {
      // X ekseni
      ball.x += ball.vx / steps;
      if (ball.x < LEFT) { ball.x = LEFT; ball.vx = Math.abs(ball.vx); this.wallSound(); }
      if (ball.x + 4 > RIGHT) { ball.x = RIGHT - 4; ball.vx = -Math.abs(ball.vx); this.wallSound(); }
      let hits = this.ballBricks(ball);
      if (hits.length) {
        ball.x -= ball.vx / steps;
        ball.vx = -ball.vx;
        for (const h of hits) this.hitBrick(h.r, h.c);
      }
      // Y ekseni
      ball.y += ball.vy / steps;
      if (ball.y < TOP) { ball.y = TOP; ball.vy = Math.abs(ball.vy); this.wallSound(); }
      hits = this.ballBricks(ball);
      if (hits.length) {
        ball.y -= ball.vy / steps;
        ball.vy = -ball.vy;
        for (const h of hits) this.hitBrick(h.r, h.c);
        this.speedUp(ball, 0.012);
      }
      // Düşmanlar
      for (const e of this.enemies) {
        if (!e.dead && ball.x < e.x + 8 && ball.x + 4 > e.x && ball.y < e.y + 8 && ball.y + 4 > e.y) {
          this.killEnemy(e);
          ball.vy = -ball.vy;
        }
      }
      // Raket
      const p = this.paddle;
      if (ball.vy > 0 && !p.dead && ball.y + 4 >= PADDLE_Y && ball.y + 4 <= PADDLE_Y + 5 && ball.x + 4 > p.x - p.w / 2 && ball.x < p.x + p.w / 2) {
        ball.y = PADDLE_Y - 4;
        const rel = clamp((ball.x + 2 - p.x) / (p.w / 2), -1, 1);
        const ang = rel * 60 * Math.PI / 180;
        this.speedUp(ball, 0.02);
        ball.vx = Math.sin(ang) * ball.s;
        ball.vy = -Math.cos(ang) * ball.s;
        if (p.mode === 'T') {
          ball.stuck = true;
          ball.off = ball.x - p.x;
          ball.stuckT = 0;
          this.api.sfx.tone(300, 0.05, { vol: 0.1 });
        } else {
          this.api.sfx.tone(440, 0.05, { type: 'triangle', vol: 0.14 });
        }
        return;
      }
      if (ball.y > H) return;
    }
    this.fixAngle(ball);
  }

  ballBricks(ball) {
    const seen = new Set();
    const out = [];
    for (const [ox, oy] of [[0, 0], [3, 0], [0, 3], [3, 3]]) {
      const h = this.brickAt(ball.x + ox, ball.y + oy);
      if (h && !seen.has(h.b)) { seen.add(h.b); out.push(h); }
    }
    return out;
  }

  fixAngle(ball) {
    // Top hiçbir zaman neredeyse yatay gitmesin
    const s = Math.hypot(ball.vx, ball.vy) || ball.s;
    if (Math.abs(ball.vy) < s * 0.3) {
      ball.vy = (ball.vy < 0 ? -1 : 1) * s * 0.3;
      ball.vx = Math.sign(ball.vx || 1) * Math.sqrt(Math.max(0, s * s - ball.vy * ball.vy));
    }
  }

  speedUp(ball, amt) {
    const ns = Math.min(this.maxSpeed, ball.s + amt);
    const k = ns / (ball.s || 1);
    ball.s = ns;
    ball.vx *= k;
    ball.vy *= k;
  }

  setSpeed(ball, s) {
    const cur = Math.hypot(ball.vx, ball.vy);
    ball.s = s;
    if (cur > 0) { ball.vx *= s / cur; ball.vy *= s / cur; }
  }

  wallSound() { this.api.sfx.tone(260, 0.03, { type: 'triangle', vol: 0.1 }); }

  applyCapsule(k) {
    const { sfx } = this.api;
    const p = this.paddle;
    this.api.addScore(1000);
    this.capText = { text: CAPS[k].name, t: 70 };
    // Raket kipleri birbirini iptal eder
    if (p.mode === 'T' && k !== 'T') this.launch();
    if (k === 'U' || k === 'T' || k === 'L') {
      p.mode = k;
      p.tw = k === 'U' ? 48 : 32;
      sfx.play('power');
    } else if (k === 'Y') {
      for (const b of this.balls) this.setSpeed(b, Math.max(1.6, this.baseSpeed - 0.3));
      this.runTime = 0;
      sfx.play('pickup');
    } else if (k === 'Ç') {
      const src = this.balls.find((b) => !b.stuck) || this.balls[0];
      if (src.stuck) this.launch();
      const s = src.s;
      const base = Math.atan2(src.vx, -src.vy);
      for (const d of [-0.5, 0.5]) {
        const a = base + d;
        const vy = -Math.cos(a) * s;
        this.balls.push({ x: src.x, y: src.y, vx: Math.sin(a) * s, vy: Math.abs(vy) < 0.3 * s ? -0.5 * s : vy, s, stuck: false });
      }
      sfx.play('power');
    } else if (k === 'C') {
      this.lives++;
      sfx.play('coin');
    } else if (k === 'K') {
      this.warp = true;
      sfx.play('levelup');
    }
    if (p.mode !== 'U') p.tw = 32;
  }

  killEnemy(e) {
    e.dead = 20;
    this.api.addScore(100);
    this.api.sfx.play('hit');
    for (let i = 0; i < 8; i++) {
      this.particles.push({ x: e.x + 4, y: e.y + 4, vx: this.api.rand(-1.5, 1.5), vy: this.api.rand(-1.5, 1.5), life: 20, col: i % 2 ? '#fcfc6c' : '#fc5c5c' });
    }
  }

  loseLife() {
    const p = this.paddle;
    p.dead = 1;
    this.api.sfx.play('die');
    this.capsules = [];
    this.lasers = [];
  }

  update() {
    const { input, sfx, preview } = this.api;
    if (this.capText && --this.capText.t <= 0) this.capText = null;
    this.updateParticles();
    for (const row of this.bricks) for (const b of row) if (b && b.flash) b.flash--;

    if (this.banner) {
      this.banner.t--;
      if (this.banner.t <= 0) this.banner = null;
    }

    const p = this.paddle;
    // Ölüm animasyonu
    if (p.dead) {
      p.dead++;
      if (p.dead === 2) {
        for (let i = 0; i < 20; i++) this.particles.push({ x: p.x, y: PADDLE_Y + 4, vx: this.api.rand(-2, 2), vy: this.api.rand(-2.5, 0.5), life: 40, col: i % 3 ? '#d82800' : '#bcbcc8' });
        sfx.play('explode');
      }
      if (p.dead > 90) {
        if (this.overDone) return;
        this.lives--;
        if (this.lives <= 0) {
          this.lives = 0;
          this.overDone = true;
          sfx.play('gameover');
          this.api.gameOver();
          return;
        }
        this.resetPaddle();
        this.banner = { lines: [`TUR ${this.round + 1}`, 'HAZIR!'], t: 80 };
      }
      return;
    }

    // Tur bitti
    if (this.clearT) {
      this.clearT++;
      if (this.clearT > 120) this.startRound(this.round + 1);
      return;
    }

    // Raket hareketi
    let dir = input.dx;
    if (preview) dir = this.autopilot();
    const speed = 3.2;
    if (dir) p.vx = clamp(p.vx + dir * 0.8, -speed, speed);
    else p.vx *= 0.5;
    if (Math.abs(p.vx) < 0.1) p.vx = 0;
    if (input.pointer.down && !preview) {
      const tx = input.pointer.x;
      p.vx = clamp((tx - p.x) * 0.4, -4, 4);
    }
    p.x += p.vx;
    // Genişlik animasyonu
    if (p.w < p.tw) p.w = Math.min(p.tw, p.w + 1);
    if (p.w > p.tw) p.w = Math.max(p.tw, p.w - 1);
    const maxX = this.warp ? RIGHT + p.w / 2 : RIGHT - p.w / 2;
    p.x = clamp(p.x, LEFT + p.w / 2, maxX);
    if (this.warp && p.x + p.w / 2 > RIGHT + 4) {
      this.api.addScore(10000);
      sfx.play('levelup');
      this.startRound(this.round + 1);
      return;
    }

    // Top(lar)
    this.runTime++;
    if (this.runTime % 600 === 0) for (const b of this.balls) this.speedUp(b, 0.15);
    const fire = input.pressed('a') || (preview && this.api.frame % 20 === 0);
    if (fire) this.launch();
    for (const b of this.balls) {
      if (b.stuck) {
        b.x = clamp(p.x + b.off - 2, p.x - p.w / 2, p.x + p.w / 2 - 4);
        b.y = PADDLE_Y - 4;
        b.stuckT++;
        if (b.stuckT > (p.mode === 'T' ? 180 : 300) || (this.banner === null && b.stuckT > 240)) {
          b.stuckT = 0;
          this.launch();
        }
      } else {
        this.moveBall(b);
      }
    }
    this.balls = this.balls.filter((b) => b.y < H);
    if (!this.balls.length) { this.loseLife(); return; }
    if (this.clearT) return;

    // Lazer
    if (p.cool > 0) p.cool--;
    if (p.mode === 'L' && (input.pressed('a') || (preview && this.api.frame % 15 === 0)) && p.cool === 0 && this.lasers.length < 4) {
      this.lasers.push({ x: p.x - p.w / 2 + 3, y: PADDLE_Y - 4 }, { x: p.x + p.w / 2 - 4, y: PADDLE_Y - 4 });
      p.cool = 12;
      sfx.play('laser');
    }
    for (const l of this.lasers) {
      for (let i = 0; i < 5 && !l.done; i++) {
        l.y -= 1;
        if (l.y < TOP) { l.done = true; break; }
        const h = this.brickAt(l.x, l.y);
        if (h) { this.hitBrick(h.r, h.c, true); l.done = true; }
        for (const e of this.enemies) if (!e.dead && l.x >= e.x && l.x < e.x + 8 && l.y >= e.y && l.y < e.y + 8) { this.killEnemy(e); l.done = true; }
      }
    }
    this.lasers = this.lasers.filter((l) => !l.done);

    // Kapsüller
    for (const c of this.capsules) {
      c.y += 1;
      c.t++;
      if (c.y + 7 >= PADDLE_Y && c.y <= PADDLE_Y + 6 && c.x + 16 > p.x - p.w / 2 && c.x < p.x + p.w / 2) {
        c.got = true;
        this.applyCapsule(c.k);
      }
    }
    this.capsules = this.capsules.filter((c) => !c.got && c.y < H);

    this.updateEnemies();

    if (this.api.score >= this.nextLifeAt) {
      this.nextLifeAt += 40000;
      this.lives++;
      sfx.play('coin');
    }
  }

  updateEnemies() {
    const { api } = this;
    const p = this.paddle;
    if (--this.enemyTimer <= 0 && this.enemies.filter((e) => !e.dead).length < 3) {
      this.enemyTimer = Math.max(200, 520 - this.round * 30);
      const gate = api.pick([52, 132]);
      this.enemies.push({ x: gate, y: TOP - 4, kind: this.round % 2, dir: api.pick([-1, 1]), t: 0, dead: 0, gate: 30 });
      this.gateOpen = { x: gate, t: 30 };
    }
    if (this.gateOpen && --this.gateOpen.t <= 0) this.gateOpen = null;
    for (const e of this.enemies) {
      if (e.dead) { e.dead--; if (e.dead === 0) e.gone = true; continue; }
      e.t++;
      // Aşağı süzül, tuğlaya takılırsa yana kay
      const sp = 0.45;
      const blockedDown = this.enemyHits(e.x, e.y + sp);
      if (!blockedDown) e.y += sp;
      const wob = Math.sin(e.t / 30) * 0.4;
      const nx = e.x + (blockedDown ? e.dir * 0.6 : wob);
      if (nx < LEFT || nx + 8 > RIGHT || this.enemyHits(nx, e.y)) e.dir = -e.dir;
      else e.x = nx;
      // Raket çarpması
      if (e.y + 8 >= PADDLE_Y && e.y <= PADDLE_Y + 6 && e.x + 8 > p.x - p.w / 2 && e.x < p.x + p.w / 2) this.killEnemy(e);
      if (e.y > H) e.gone = true;
    }
    this.enemies = this.enemies.filter((e) => !e.gone);
  }

  enemyHits(x, y) {
    for (const [ox, oy] of [[0, 0], [7, 0], [0, 7], [7, 7]]) if (this.brickAt(x + ox, y + oy)) return true;
    return false;
  }

  updateParticles() {
    for (const pt of this.particles) {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.08;
      pt.life--;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  autopilot() {
    const p = this.paddle;
    // En alçaktaki (aşağı inen) topu takip et
    let target = null;
    for (const b of this.balls) if (!b.stuck && b.vy > 0 && (!target || b.y > target.y)) target = b;
    if (!target) target = this.balls[0];
    if (!target) return 0;
    const tx = target.x + 2 + Math.sin(this.api.frame / 40) * 6;
    if (tx < p.x - 3) return -1;
    if (tx > p.x + 3) return 1;
    return 0;
  }

  // ----- Çizim -----
  drawWalls() {
    const { gfx, frame } = this.api;
    const pipeV = ['#3c3c4c', '#8c8c9c', '#dcdce8', '#fcfcfc', '#bcbcc8', '#8c8c9c', '#5c5c6c', '#2c2c3c'];
    for (let i = 0; i < 8; i++) {
      gfx.rect(i, TOP - 8, 1, H - TOP + 8, pipeV[i]);
      gfx.rect(RIGHT + i, TOP - 8, 1, H - TOP + 8, pipeV[i]);
      gfx.rect(0, TOP - 8 + i, W, 1, pipeV[i]);
    }
    // Bağlantı halkaları
    for (let y = TOP + 20; y < H; y += 40) {
      gfx.rect(0, y, 8, 4, '#2048e8');
      gfx.rect(RIGHT, y, 8, 4, '#2048e8');
      gfx.rect(1, y + 1, 6, 1, '#6c8cfc');
      gfx.rect(RIGHT + 1, y + 1, 6, 1, '#6c8cfc');
    }
    for (let x = 24; x < W; x += 48) {
      gfx.rect(x, TOP - 8, 4, 8, '#2048e8');
      gfx.rect(x + 1, TOP - 7, 1, 6, '#6c8cfc');
    }
    // Düşman kapakları
    for (const gx of [52, 132]) {
      const open = this.gateOpen && this.gateOpen.x === gx;
      gfx.rect(gx - 4, TOP - 8, 16, 8, open ? '#000' : '#5c5c6c');
      if (!open) {
        gfx.rect(gx - 3, TOP - 6, 14, 1, '#8c8c9c');
        gfx.rect(gx - 3, TOP - 3, 14, 1, '#8c8c9c');
      }
    }
    // Kapı (warp)
    if (this.warp) {
      const c = frame % 10 < 5 ? '#fc78f8' : '#fcfcfc';
      gfx.rect(RIGHT, PADDLE_Y - 10, 8, 22, '#000');
      for (let i = 0; i < 4; i++) gfx.rect(RIGHT + 1 + ((frame / 3 + i * 2) % 6), PADDLE_Y - 8, 1, 18, c);
    }
  }

  draw() {
    const { gfx, score, hiScore, frame } = this.api;
    gfx.cls('#000');
    gfx.sprite(bgFor(this.round), LEFT, TOP);
    // Gölge
    for (let r = 0; r < BROWS; r++) {
      for (let c = 0; c < BCOLS; c++) {
        if (this.bricks[r][c]) gfx.ctx.globalAlpha = 0.5;
        if (this.bricks[r][c]) gfx.rect(LEFT + c * BW + 4, BY0 + r * BH + 4, BW, BH, '#000');
      }
    }
    gfx.ctx.globalAlpha = 1;
    for (let r = 0; r < BROWS; r++) {
      for (let c = 0; c < BCOLS; c++) {
        const b = this.bricks[r][c];
        if (!b) continue;
        gfx.sprite(b.flash && b.flash % 4 < 2 ? BRICK_FLASH : brickSprites[b.t], LEFT + c * BW, BY0 + r * BH);
      }
    }
    this.drawWalls();

    // Kapsüller
    for (const cp of this.capsules) {
      const cd = CAPS[cp.k];
      gfx.rect(cp.x + 1, cp.y, 14, 7, cd.col);
      gfx.rect(cp.x, cp.y + 1, 16, 5, cd.col);
      gfx.rect(cp.x + 2, cp.y + 1, 12, 1, cd.light);
      gfx.rect(cp.x + 1, cp.y + 6, 14, 1, '#000');
      const sh = (cp.t >> 2) % 7;
      gfx.rect(cp.x + 2 + sh, cp.y + 1, 2, 5, cd.light);
      gfx.text(cp.k, cp.x + 5, cp.y, '#fcfc6c', { shadow: '#000' });
    }

    // Lazer
    for (const l of this.lasers) {
      gfx.rect(l.x, l.y, 1, 6, '#fcfc6c');
      gfx.pset(l.x, l.y, '#fff');
    }

    // Düşmanlar
    for (const e of this.enemies) {
      if (e.dead) {
        gfx.circb(e.x + 4, e.y + 4, 8 - e.dead / 3, e.dead % 4 < 2 ? '#fcfc6c' : '#fc5c5c');
        continue;
      }
      gfx.sprite(ENEMY_FRAMES[e.kind * 2 + ((e.t >> 3) % 2)], e.x, e.y);
    }

    // Raket
    const p = this.paddle;
    if (!p.dead) {
      const w = Math.round(p.w / 2) * 2;
      gfx.sprite(vausSprite(w, p.mode === 'L'), Math.round(p.x - w / 2), PADDLE_Y);
    } else if (p.dead < 30) {
      const w = Math.round(p.w / 2) * 2;
      if (p.dead % 6 < 3) gfx.sprite(vausSprite(w, false), Math.round(p.x - w / 2), PADDLE_Y);
    }
    for (const b of this.balls) gfx.sprite(BALL, b.x, b.y);

    for (const pt of this.particles) gfx.pset(pt.x, pt.y, pt.col);

    // Canlar
    for (let i = 0; i < Math.min(this.lives - 1, 7); i++) gfx.sprite(LIFE_ICON, LEFT + 2 + i * 14, H - 6);

    // HUD
    gfx.rect(0, 0, W, TOP - 8, '#000');
    gfx.text('SKOR', 4, 1, '#d82800');
    gfx.text(String(score).padStart(6, '0'), 4, 9 - 1, '#fcfcfc');
    gfx.text('REKOR', W - 4, 1, '#d82800', { align: 'right' });
    gfx.text(String(Math.max(score, hiScore)).padStart(6, '0'), W - 4, 8, '#fcfcfc', { align: 'right' });
    gfx.text(`TUR ${this.round + 1}`, W / 2, 4, '#fcfc6c', { align: 'center' });

    if (this.banner) {
      const ls = this.banner.lines;
      ls.forEach((t, i) => gfx.text(t, W / 2, 150 + i * 12, i ? '#fcfcfc' : '#fcfc6c', { align: 'center', shadow: '#000' }));
    }
    if (this.capText && !this.banner) gfx.text(this.capText.text, W / 2, 180, frame % 8 < 4 ? '#fcfcfc' : '#fcfc6c', { align: 'center', shadow: '#000' });
    if (this.clearT) gfx.text('TUR TAMAM!', W / 2, 160, frame % 10 < 5 ? '#fcfcfc' : '#fcfc6c', { align: 'center', shadow: '#000' });
    if (this.lives <= 0 || (this.paddle.dead > 60 && this.lives === 1)) gfx.text('OYUN BİTTİ', W / 2, 160, '#fc5c5c', { align: 'center', shadow: '#000' });
  }
}
