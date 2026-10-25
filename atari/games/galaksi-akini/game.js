// Galaksi Akını — Galaxian tarzı.
// Salınan konvoy, kanadından kopup kavisli dalışa geçen uzaylılar, muhafızlı bayrak gemisi
// dalışları ve ünlü kısıt: ekranda aynı anda yalnızca TEK füze.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'galaksi-akini',
  width: 224,
  height: 256,
  buttons: { a: 'ATEŞ' },
  help: [
    'Sağ/sol ok: gemiyi kaydır. A (Z/Boşluk): füze at; basılı tutunca füze dönünce yine atar.',
    'Aynı anda tek füzen olur: ıskalarsan dönmesini beklersin!',
    'Dalış halindeki düşmanlar iki kat puan verir.',
    'Bayrak gemisini muhafızlarından sonra vurursan 800 puana kadar bonus!',
  ],
};

const W = 224;
const H = 256;
const DEG = Math.PI / 180;
const PLAYER_Y = 228;
const FORM_TOP = 38;

function rotSet(rows, pal, n = 16) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const S = Math.max(w, h) + 2 * Math.ceil((Math.hypot(w, h) - Math.max(w, h)) / 2) + ((Math.max(w, h) - w) % 2);
  const out = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const c = document.createElement('canvas');
    c.width = S;
    c.height = S;
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
// Sprite'lar aşağı bakacak şekilde çizildi: yön 90° iken döndürme yok.
const dirIndex = (th) => ((Math.round((th / DEG - 90) / 22.5) % 16) + 16) % 16;

const DRONE = [
  [
    'B..........B',
    'BB........BB',
    'BBB.PPPP.BBB',
    '.BBBPYYPBBB.',
    '..BBPPPPBB..',
    '...BPPPPB...',
    '....PYYP....',
    '.....PP.....',
    '.....PP.....',
    '............',
  ],
  [
    '............',
    '............',
    '....PPPP....',
    'BBBBPYYPBBBB',
    'BBBBPPPPBBBB',
    'B..BPPPPB..B',
    '....PYYP....',
    '.....PP.....',
    '.....PP.....',
    '............',
  ],
  [
    '............',
    '............',
    '....PPPP....',
    '...BPYYPB...',
    '.BBBPPPPBBB.',
    'BB.BPPPPB.BB',
    'B...PYYP...B',
    '.....PP.....',
    '.....PP.....',
    '............',
  ],
];
const FLAG = [
  [
    '..R........R..',
    '.RR..YYYY..RR.',
    'RRR.YYRRYY.RRR',
    'RRRYYYYYYYYRRR',
    'RR.YYBYYBYY.RR',
    'R...YYYYYY...R',
    '.....YYYY.....',
    '....Y.YY.Y....',
    '...Y..YY..Y...',
    '..............',
  ],
  [
    '..............',
    '.....YYYY.....',
    '....YYRRYY....',
    'RRRYYYYYYYYRRR',
    'RRRYYBYYBYYRRR',
    'RR..YYYYYY..RR',
    'R....YYYY....R',
    '....Y.YY.Y....',
    '...Y..YY..Y...',
    '..............',
  ],
];
const SHIP_ROWS = [
  '.......W.......',
  '......WWW......',
  '......RWR......',
  '...B..WWW..B...',
  '...B.WWWWW.B...',
  '...BWWRWRWWB...',
  '..BBWWWWWWWBB..',
  '.BBWWW.W.WWWBB.',
  'BBB..W...W..BBB',
  'BB...........BB',
];
const PAL_SHIP = { W: '#e8e8e8', R: '#ff3030', B: '#3a6cff' };
const SHIP = makeSprite(SHIP_ROWS, PAL_SHIP);
const LIFE = makeSprite(SHIP_ROWS, PAL_SHIP);
const FLAG_ICON = makeSprite(['RRRR', 'RRRR', 'RRR.', 'W...', 'W...', 'W...', 'W...'], { R: '#ff3030', W: '#ffd400' });

const KINDS = {
  blue: { rows: DRONE, pal: { B: '#2f7bff', P: '#b040ff', Y: '#ffd400' }, form: 30, dive: 60 },
  purple: { rows: DRONE, pal: { B: '#c040ff', P: '#3a6cff', Y: '#ff3030' }, form: 40, dive: 80 },
  red: { rows: DRONE, pal: { B: '#ff3030', P: '#3a6cff', Y: '#ffd400' }, form: 50, dive: 100 },
  flag: { rows: FLAG, pal: { R: '#ff3030', Y: '#ffd400', B: '#3a6cff' }, form: 60, dive: 150 },
};
const SPR = {};
for (const [k, v] of Object.entries(KINDS)) SPR[k] = v.rows.map((r) => rotSet(r, v.pal));

const STAR_COLS = ['#ff4040', '#40ff60', '#4080ff', '#ffff40', '#ff40ff', '#40ffff', '#ffffff'];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrapA = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export default class Galaxian {
  constructor(api) {
    this.api = api;
    this.t = 0;
    this.wave = 0;
    this.lives = 3;
    this.extraGiven = false;
    this.stars = [];
    for (let i = 0; i < 60; i++) this.stars.push({ x: api.rand(W), y: api.rand(H), c: STAR_COLS[i % STAR_COLS.length], g: i % 4 });
    this.player = { x: W / 2, alive: false };
    this.missile = null;
    this.ebul = [];
    this.fx = [];
    this.popups = [];
    this.over = 0;
    this.ended = false;
    this.startWave();
    if (api.preview) {
      this.player.alive = true;
      this.phase = 'play';
      this.attackTimer = 10;
      for (let i = 0; i < 200; i++) this.update();
    }
  }

  startWave() {
    this.wave++;
    this.aliens = [];
    const add = (kind, r, cols) => cols.forEach((c) => this.aliens.push({ kind, r, c, x: 0, y: 0, th: Math.PI / 2, state: 'form', fl: 0 }));
    add('flag', 0, [3, 6]);
    add('red', 1, [2, 3, 4, 5, 6, 7]);
    add('purple', 2, [1, 2, 3, 4, 5, 6, 7, 8]);
    for (let r = 3; r < 6; r++) add('blue', r, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    this.formX = 0;
    this.formDir = 1;
    for (const a of this.aliens) [a.x, a.y] = this.slotPos(a);
    this.phase = 'intro';
    this.phaseT = 0;
    this.attackTimer = 150;
    this.ebul = [];
    this.missile = null;
  }

  slotPos(a) {
    return [112 + (a.c - 4.5) * 16 + this.formX, FORM_TOP + a.r * 12];
  }

  diff() {
    const w = this.wave;
    return {
      vy: Math.min(2.6, 1.35 + w * 0.12),
      acc: Math.min(0.12, 0.05 + w * 0.008),
      vmax: Math.min(2.4, 1.3 + w * 0.12),
      bsp: Math.min(3.6, 2.0 + w * 0.15),
      burst: Math.min(4, 1 + Math.floor((w + 1) / 2)),
      interval: Math.max(26, 110 - w * 10),
      maxDivers: Math.min(7, 2 + w),
    };
  }

  // ---------- Ana döngü ----------
  update() {
    const api = this.api;
    this.t++;
    this.phaseT++;
    for (const s of this.stars) {
      s.y += 0.5;
      if (s.y >= H) { s.y -= H; s.x = api.rand(W); }
    }
    this.fx = this.fx.filter((f) => ++f.t < f.life);
    this.popups = this.popups.filter((p) => --p.t > 0);

    if (this.over) {
      this.updateAliens();
      this.updateBullets();
      if (this.over > 1) this.over--;
      else if (!this.ended) {
        this.ended = true;
        api.gameOver();
      }
      return;
    }

    this.updateConvoy();
    if (this.phase === 'intro') {
      for (const a of this.aliens) if (a.state === 'form') [a.x, a.y] = this.slotPos(a);
      if (this.phaseT > 110) {
        this.phase = 'play';
        this.player.alive = true;
        this.player.inv = 0;
      }
      return;
    }
    if (this.phase === 'clear') {
      this.updatePlayer();
      this.updateMissile();
      if (this.phaseT > 90) {
        this.startWave();
        api.sfx.play('levelup');
      }
      return;
    }

    this.updatePlayer();
    this.updateMissile();
    this.updateAliens();
    this.updateBullets();
    this.schedule();
    this.respawnCheck();

    if (!this.aliens.some((a) => a.state !== 'dead') && this.player.alive) {
      this.phase = 'clear';
      this.phaseT = 0;
      this.ebul = [];
    }
    if (!this.extraGiven && api.score >= 7000) {
      this.extraGiven = true;
      this.lives++;
      api.sfx.play('coin');
    }
  }

  updateConvoy() {
    // Konvoy en dıştaki uzaylı kenara değene kadar kayar
    let minX = 1e9;
    let maxX = -1e9;
    for (const a of this.aliens) {
      if (a.state === 'dead') continue;
      const x = 112 + (a.c - 4.5) * 16 + this.formX;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    if (minX > maxX) return;
    this.formX += this.formDir * 0.35;
    if (maxX + 0.35 > W - 10) this.formDir = -1;
    if (minX - 0.35 < 10) this.formDir = 1;
  }

  // ---------- Oyuncu ----------
  updatePlayer() {
    const { input, preview, sfx } = this.api;
    const p = this.player;
    if (!p.alive) return;
    if (p.inv > 0) p.inv--;
    let dx = input.dx;
    let fire = input.pressed('a') || input.held('a');
    if (preview) [dx, fire] = this.autopilot();
    p.x = clamp(p.x + dx * 1.5, 10, W - 10);
    if (fire && !this.missile && this.phase === 'play') {
      this.missile = { x: Math.round(p.x), y: PLAYER_Y - 6 };
      sfx.tone(900, 0.15, { slide: 1800, vol: 0.05, type: 'square' });
    }
  }

  autopilot() {
    const p = this.player;
    let tx = 112 + Math.sin(this.t / 50) * 50;
    let low = null;
    for (const a of this.aliens) if (a.state !== 'dead' && (!low || a.y > low.y)) low = a;
    if (low) tx = low.x + (low.state === 'form' ? this.formDir * 6 : 0);
    for (const b of this.ebul) if (b.y > 150 && Math.abs(b.x - p.x) < 10) tx = p.x + (b.x > p.x ? -24 : 24);
    return [Math.abs(tx - p.x) < 2 ? 0 : Math.sign(tx - p.x), Math.abs(tx - p.x) < 8];
  }

  updateMissile() {
    const m = this.missile;
    if (!m) return;
    for (let k = 0; k < 2; k++) {
      m.y -= 2.5;
      for (const a of this.aliens) {
        if (a.state === 'dead') continue;
        if (Math.abs(a.x - m.x) < 7 && Math.abs(a.y - (m.y + 2)) < 6) {
          this.missile = null;
          this.killAlien(a);
          return;
        }
      }
    }
    if (m.y < 16) this.missile = null;
  }

  killAlien(a) {
    const api = this.api;
    const K = KINDS[a.kind];
    const diving = a.state !== 'form';
    let pts = diving ? K.dive : K.form;
    if (a.kind === 'flag' && diving) {
      const n = a.escorts || 0;
      const k = a.escortsKilled || 0;
      if (n === 0) pts = 150;
      else if (n === 2 && k === 2) pts = 800;
      else if (n === 1 && k === 1) pts = 300;
      else pts = n === 2 ? 300 : 200;
    }
    api.addScore(pts);
    if (a.kind === 'flag' && diving) this.popups.push({ x: a.x, y: a.y, text: String(pts), t: 80 });
    if (a.leader && a.leader.state !== 'dead') a.leader.escortsKilled = (a.leader.escortsKilled || 0) + 1;
    for (const o of this.aliens) if (o.leader === a) {
      o.leader = null;
      o.vx = a.vx || 0;
    }
    a.state = 'dead';
    this.boom(a.x, a.y, a.kind === 'flag');
    if (a.kind === 'flag') api.sfx.play('explode');
    else {
      api.sfx.noise(0.16, { vol: 0.18, freq: 3000 });
      api.sfx.tone(500, 0.1, { slide: 120, vol: 0.06 });
    }
  }

  boom(x, y, big) {
    this.fx.push({ x, y, t: 0, life: big ? 28 : 20, big });
  }

  // ---------- Uzaylılar ----------
  updateAliens() {
    const p = this.player;
    const d = this.diff();
    for (const a of this.aliens) {
      if (a.state === 'dead') continue;
      a.fl = Math.floor((this.t + a.c * 6) / 10) % 3;
      switch (a.state) {
        case 'form':
          [a.x, a.y] = this.slotPos(a);
          a.th += clamp(wrapA(Math.PI / 2 - a.th), -0.2, 0.2);
          break;
        case 'peel': {
          a.pt++;
          a.th += a.turn;
          const sp = 1.6;
          a.x += Math.cos(a.th) * sp;
          a.y += Math.sin(a.th) * sp;
          if (a.pt >= 24) {
            a.state = 'attack';
            a.vx = Math.cos(a.th) * sp;
            a.shots = d.burst;
            a.fireT = 0;
          }
          break;
        }
        case 'attack':
          this.attack(a, d);
          break;
        case 'return': {
          const [tx, ty] = this.slotPos(a);
          a.y += 1.6;
          a.x += clamp(tx - a.x, -1.5, 1.5);
          a.th = Math.PI / 2;
          if (a.y >= ty) {
            a.y = ty;
            a.state = 'form';
          }
          break;
        }
        default:
          break;
      }
      // çarpışma
      if (p.alive && !p.inv && a.state !== 'form' && Math.abs(a.x - p.x) < 9 && Math.abs(a.y - PLAYER_Y) < 8) {
        this.killAlien(a);
        this.killPlayer();
      }
    }
  }

  attack(a, d) {
    const p = this.player;
    const lead = a.leader && a.leader.state === 'attack' ? a.leader : null;
    if (lead) {
      if (a.ox == null) {
        a.ox = a.x - lead.x;
        a.oy = a.y - lead.y;
      }
      a.x = lead.x + a.ox;
      a.y = lead.y + a.oy;
      a.th = lead.th;
      a.vx = lead.vx;
    } else {
      const tx = p.alive ? p.x : 112;
      if (a.y < PLAYER_Y - 20) a.vx = clamp((a.vx || 0) + Math.sign(tx - a.x) * d.acc, -d.vmax, d.vmax);
      a.x += a.vx;
      a.y += d.vy;
      if (a.x < 6) { a.x = 6; a.vx = Math.abs(a.vx); }
      if (a.x > W - 6) { a.x = W - 6; a.vx = -Math.abs(a.vx); }
      const want = Math.atan2(d.vy, a.vx);
      a.th += clamp(wrapA(want - a.th), -0.15, 0.15);
    }
    // Ateş: belli yükseklikte kısa seriler
    if (a.shots > 0 && a.y > 90 && a.y < 170 && p.alive) {
      if (a.fireT > 0) a.fireT--;
      else if (this.api.rand() < 0.08) {
        a.shots--;
        a.fireT = 9;
        this.shoot(a, d);
      }
    }
    if (a.y > H + 10) {
      a.state = 'return';
      a.y = -12;
      a.leader = null;
      a.x = this.slotPos(a)[0];
    }
  }

  shoot(a, d) {
    if (this.ebul.length >= 12) return;
    const p = this.player;
    const t = Math.max(12, (PLAYER_Y - a.y) / d.bsp);
    const vx = clamp((p.x - a.x) / t, -0.9, 0.9);
    this.ebul.push({ x: a.x, y: a.y + 5, vx, vy: d.bsp });
  }

  updateBullets() {
    const p = this.player;
    for (const b of this.ebul) {
      b.x += b.vx;
      b.y += b.vy;
      if (p.alive && !p.inv && Math.abs(b.x - p.x) < 6 && b.y > PLAYER_Y - 6 && b.y < PLAYER_Y + 5) {
        b.dead = true;
        this.killPlayer();
      }
      if (b.y > H) b.dead = true;
    }
    this.ebul = this.ebul.filter((b) => !b.dead);
  }

  killPlayer() {
    const p = this.player;
    if (!p.alive) return;
    p.alive = false;
    this.lives--;
    this.deadT = 0;
    this.missile = null;
    this.fx.push({ x: p.x, y: PLAYER_Y, t: 0, life: 70, player: true });
    this.api.sfx.play('bigexplode');
  }

  respawnCheck() {
    const p = this.player;
    if (p.alive) return;
    this.deadT++;
    if (this.lives <= 0) {
      if (this.deadT > 80) {
        this.over = 200;
        this.api.sfx.play('gameover');
      }
      return;
    }
    const busy = this.aliens.some((a) => a.state === 'attack' || a.state === 'peel');
    if (this.deadT > 120 && !busy && !this.ebul.length) {
      p.alive = true;
      p.x = W / 2;
      p.inv = 40;
      this.attackTimer = 120;
    }
  }

  // ---------- Saldırı planı ----------
  schedule() {
    if (!this.player.alive) return;
    const d = this.diff();
    const alive = this.aliens.filter((a) => a.state !== 'dead');
    const divers = alive.filter((a) => a.state === 'peel' || a.state === 'attack').length;
    const few = alive.length <= 5;
    if (--this.attackTimer > 0) return;
    this.attackTimer = few ? 20 : Math.floor(d.interval * this.api.rand(0.6, 1.4));
    if (!few && divers >= d.maxDivers) return;
    const inForm = alive.filter((a) => a.state === 'form');
    if (!inForm.length) return;
    const api = this.api;
    const flags = inForm.filter((a) => a.kind === 'flag');
    if (flags.length && api.rand() < 0.28) {
      const f = api.pick(flags);
      const esc = inForm.filter((o) => o.kind === 'red' && Math.abs(o.c - f.c) <= 1).slice(0, 2);
      this.launch(f, f.c < 5 ? -1 : 1);
      f.escorts = esc.length;
      f.escortsKilled = 0;
      for (const o of esc) {
        this.launch(o, f.c < 5 ? -1 : 1);
        o.leader = f;
      }
      return;
    }
    // Kenardaki (yanında komşusu olmayan) uzaylılar kopar
    const edge = inForm.filter((a) => a.kind !== 'flag' && (!inForm.some((o) => o.r === a.r && o.c === a.c - 1) || !inForm.some((o) => o.r === a.r && o.c === a.c + 1)));
    const pool = edge.length ? edge : inForm;
    const a = api.pick(pool);
    const leftSide = !inForm.some((o) => o.r === a.r && o.c < a.c);
    const dir = leftSide ? -1 : !inForm.some((o) => o.r === a.r && o.c > a.c) ? 1 : a.c < 5 ? -1 : 1;
    this.launch(a, dir);
    // daha ileri dalgalarda bazen ikili kopma
    if (this.wave >= 3 && api.rand() < 0.3) {
      const mate = inForm.find((o) => o !== a && o.r === a.r && Math.abs(o.c - a.c) === 1 && o.kind !== 'flag');
      if (mate) this.launch(mate, dir);
    }
  }

  launch(a, dir) {
    a.state = 'peel';
    a.pt = 0;
    a.th = -Math.PI / 2;
    a.turn = dir * 7.5 * DEG;
    a.leader = null;
    a.escorts = 0;
    a.escortsKilled = 0;
    a.ox = null;
    a.oy = null;
    this.api.sfx.tone(1400, 0.6, { slide: 200, type: 'triangle', vol: 0.05 });
  }

  // ---------- Çizim ----------
  draw() {
    const { gfx, score, hiScore } = this.api;
    gfx.cls('#000');
    for (const s of this.stars) if (((this.t >> 4) + s.g) % 4 !== 0) gfx.pset(s.x, s.y, s.c);

    for (const a of this.aliens) {
      if (a.state === 'dead') continue;
      const set = SPR[a.kind];
      const fr = a.state === 'form' ? a.fl % set.length : (this.t >> 3) % set.length;
      const spr = set[fr][a.state === 'form' ? 0 : dirIndex(a.th)];
      gfx.sprite(spr, a.x - spr.width / 2, a.y - spr.height / 2);
    }

    const p = this.player;
    if (p.alive && !(p.inv && (this.t >> 2) & 1)) {
      gfx.sprite(SHIP, p.x - 7, PLAYER_Y - 5);
      // Yüklü füze geminin burnunda bekler
      if (!this.missile) gfx.rect(Math.round(p.x), PLAYER_Y - 9, 1, 4, '#ffff40');
    }
    if (this.missile) gfx.rect(this.missile.x, this.missile.y, 1, 4, '#ffff40');
    for (const b of this.ebul) {
      gfx.rect(b.x, b.y, 1, 3, '#ffffff');
      gfx.pset(b.x, b.y + 3, '#ffd400');
    }

    for (const f of this.fx) this.drawBoom(gfx, f);
    for (const pu of this.popups) gfx.text(pu.text, pu.x, pu.y - 3, '#ffffff', { align: 'center' });

    // HUD
    if ((this.t >> 5) & 1 || this.t < 2) gfx.text('1UP', 16, 2, '#ff3030');
    gfx.text(String(score).padStart(6, '0'), 8, 11, '#ffffff');
    gfx.text('REKOR', 112, 2, '#ff3030', { align: 'center' });
    gfx.text(String(Math.max(score, hiScore)).padStart(6, '0'), 112, 11, '#ffffff', { align: 'center' });
    for (let i = 0; i < Math.min(6, this.lives - 1); i++) gfx.sprite(LIFE, 4 + i * 17, H - 11);
    for (let i = 0; i < Math.min(12, this.wave); i++) gfx.sprite(FLAG_ICON, W - 8 - i * 6, H - 9);

    const cx = W / 2;
    if (this.phase === 'intro') {
      gfx.text(`DALGA ${this.wave}`, cx, 150, '#40c8ff', { align: 'center' });
      if (this.phaseT > 40 || this.t < 2) gfx.text('HAZIR!', cx, 164, '#ff3030', { align: 'center' });
    }
    if (this.phase === 'clear') gfx.text('DALGA TEMİZLENDİ!', cx, 150, '#ffd400', { align: 'center' });
    if (!p.alive && this.phase === 'play' && !this.over && this.lives > 0 && this.deadT > 80) gfx.text('HAZIR!', cx, 164, '#ff3030', { align: 'center' });
    if (this.over) {
      gfx.rect(cx - 50, 140, 100, 22, '#000');
      gfx.text('OYUN BİTTİ', cx, 147, '#ff3030', { align: 'center' });
    }
  }

  drawBoom(gfx, f) {
    const k = f.t / f.life;
    if (f.player) {
      // Oyuncu patlaması: büyüyen kırmızı-sarı halkalar
      const cols = ['#ffffff', '#ffd400', '#ff3030', '#ff8a00'];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + i;
        const r = Math.min(f.t, 30) * (0.4 + (i % 3) * 0.2);
        if (f.t < 50 || (f.t & 2)) gfx.rect(f.x + Math.cos(a) * r - 1, f.y + Math.sin(a) * r - 1, 2, 2, cols[i % 4]);
      }
      if (f.t < 12) gfx.circ(f.x, f.y, 3 + f.t / 2, f.t < 6 ? '#ffffff' : '#ffd400');
      return;
    }
    const n = f.big ? 16 : 10;
    const cols = f.big ? ['#ffffff', '#ffd400', '#ff3030'] : ['#ffffff', '#ff3030', '#ffd400', '#3a6cff'];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = f.t * (f.big ? 0.8 : 0.6);
      const s = k < 0.5 ? 2 : 1;
      gfx.rect(f.x + Math.cos(a) * r - 1, f.y + Math.sin(a) * r - 1, s, s, cols[i % cols.length]);
    }
    if (f.t < 5) gfx.circ(f.x, f.y, 2 + f.t * 0.6, '#ffffff');
  }
}
