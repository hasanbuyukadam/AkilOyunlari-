// Galaksi Savaşı — Galaga tarzı.
// Kavisli yollarla formasyona giren filo, "nefes alan" formasyon, ilmekli dalışlar,
// çekici ışınla gemini kaçıran komutan, kurtarılınca çift savaşçı, meydan okuma aşamaları.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'galaksi-savasi',
  width: 224,
  height: 288,
  buttons: { a: 'ATEŞ' },
  help: [
    'Sağ/sol ok: gemiyi kaydır. A (Z/Boşluk): ateş; basılı tutunca otomatik ateş (en fazla 2 atış).',
    'Yeşil komutanlar 2 vuruşta düşer. Çekici ışınına yakalanırsan gemin kaçırılır!',
    'Gemini taşıyan komutanı dalışta vurursan gemin geri gelir: ÇİFT SAVAŞÇI.',
    'Her 4 aşamadan biri MEYDAN OKUMA: düşmanlar ateş etmez, hepsini vurmaya çalış.',
  ],
};

const W = 224;
const H = 288;
const DEG = Math.PI / 180;
const PLAYER_Y = 258;
const FORM_TOP = 52;

// ---------- Döndürülmüş sprite üretimi (16 yön, en yakın komşu) ----------
function rotSet(rows, pal, n = 16) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const S = w + 2 * Math.ceil((Math.hypot(w, h) - w) / 2);
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
const dirIndex = (th) => ((Math.round((th / DEG + 90) / 22.5) % 16) + 16) % 16;

// ---------- Piksel sanatı ----------
const FIGHTER_ROWS = [
  '................',
  '.......W........',
  '.......W........',
  '......WWW.......',
  '......WWW.......',
  '...R..WWW..R....',
  '...R.WWWWW.R....',
  '...W.WBWBW.W....',
  'R..WWWWWWWWW..R.',
  'R..WWWRWRWWW..R.',
  'W.WWWRRWRRWWW.W.',
  'WWWWRRWWWRRWWWW.',
  'WWW.RRWWWRR.WWW.',
  'WW...WWWWW...WW.',
  'W.....W.W.....W.',
  '................',
];
const BEE_ROWS = [
  [
    '................',
    '.......YY.......',
    '..B...YRRY...B..',
    '..BB..YRRY..BB..',
    '..BBB.YYYY.BBB..',
    '...BBBYRRYBBB...',
    '....BBYYYYBB....',
    '.....BYRRYB.....',
    '....BBYYYYBB....',
    '...BBB.YY.BBB...',
    '..BB...YY...BB..',
    '..B....YY....B..',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '.......YY.......',
    '......YRRY......',
    '....B.YRRY.B....',
    '...BB.YYYY.BB...',
    '...BBBYRRYBBB...',
    '...BBBYYYYBBB...',
    '....BBYRRYBB....',
    '.....BYYYYB.....',
    '.....B.YY.B.....',
    '....B..YY..B....',
    '.......YY.......',
    '................',
    '................',
    '................',
    '................',
  ],
];
const BUT_ROWS = [
  [
    '................',
    '......W..W......',
    '.......WW.......',
    '..RR..RBBR..RR..',
    '.RRRR.RBBR.RRRR.',
    '.RWWRRRBBRRRWWR.',
    '.RWWRRRBBRRRWWR.',
    '.RRRR.RBBR.RRRR.',
    '..RR..RBBR..RR..',
    '.......BB.......',
    '......B..B......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '......W..W......',
    '.......WW.......',
    '......RBBR......',
    '...RR.RBBR.RR...',
    '..RWWRRBBRRWWR..',
    '..RWWRRBBRRWWR..',
    '...RR.RBBR.RR...',
    '......RBBR......',
    '.......BB.......',
    '......B..B......',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
];
const BOSS_ROWS = [
  [
    '................',
    '......Y..Y......',
    '.......YY.......',
    '......GGGG......',
    '.....GGRRGG.....',
    '..GG.GRRRRG.GG..',
    '.GGGGGGGGGGGGGG.',
    'GGGYGGGGGGGGYGGG',
    'GGYYG.GGGG.GYYGG',
    'GG.....GG.....GG',
    'G......GG......G',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  [
    '................',
    '......Y..Y......',
    '.......YY.......',
    '......GGGG......',
    '.....GGRRGG.....',
    '.....GRRRRG.....',
    '...GGGGGGGGGG...',
    '..GGYGGGGGGYGG..',
    '.GGYYG.GG.GYYGG.',
    '.GG....GG....GG.',
    '..G....GG....G..',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
];
const P_FIGHTER = { W: '#f2f2f2', R: '#e8262b', B: '#3a6cff' };
const P_CAPTIVE = { W: '#ff3b3b', R: '#ffffff', B: '#ffd23a' };
const P_BEE = { Y: '#ffd400', R: '#e8262b', B: '#2f5bff' };
const P_BUT = { W: '#f2f2f2', R: '#e8262b', B: '#2f5bff' };
const P_BOSS_G = { Y: '#ffd400', G: '#27c43a', R: '#ff7a1c' };
const P_BOSS_P = { Y: '#ffd400', G: '#7b4dff', R: '#f04cff' };

const SPR = {
  fighter: [rotSet(FIGHTER_ROWS, P_FIGHTER), rotSet(FIGHTER_ROWS, P_FIGHTER)],
  cap: [rotSet(FIGHTER_ROWS, P_CAPTIVE), rotSet(FIGHTER_ROWS, P_CAPTIVE)],
  bee: BEE_ROWS.map((r) => rotSet(r, P_BEE)),
  but: BUT_ROWS.map((r) => rotSet(r, P_BUT)),
  boss: BOSS_ROWS.map((r) => rotSet(r, P_BOSS_G)),
  boss2: BOSS_ROWS.map((r) => rotSet(r, P_BOSS_P)),
};
const FIGHTER = makeSprite(FIGHTER_ROWS, P_FIGHTER);
const LIFE_ICON = makeSprite(FIGHTER_ROWS.slice(1, 15), P_FIGHTER);
const SHOT = makeSprite(['.R.', 'RWR', '.W.', '.W.', '.W.', 'W.W', '...', '.W.'], { W: '#f2f2f2', R: '#ff3030' });
const EBULLET = makeSprite(['.W.', 'RWR', 'RWR', '.R.'], { W: '#ffffff', R: '#ff3030' });

// Aşama rozetleri (1, 5, 10, 20, 30, 50)
const BADGES = [
  { v: 50, spr: makeSprite(['.YYYYY.', 'YRRRRRY', 'YRYYYRY', 'YRYRYRY', 'YRYYYRY', 'YRRRRRY', '.YYYYY.', '...Y...', '..YYY..'], { Y: '#ffd400', R: '#e8262b' }) },
  { v: 30, spr: makeSprite(['..B..', '.BBB.', 'BBWBB', '.BBB.', '..B..', '..W..', '..W..', '..W..', '.WWW.'], { B: '#3a6cff', W: '#f2f2f2' }) },
  { v: 20, spr: makeSprite(['..P..', '.PPP.', 'PPYPP', '.PPP.', '..P..', '..W..', '..W..', '..W..', '.WWW.'], { P: '#c040ff', Y: '#ffd400', W: '#f2f2f2' }) },
  { v: 10, spr: makeSprite(['RRRR.', 'RYYR.', 'RRRR.', 'W....', 'W....', 'W....', 'W....', 'W....', 'WW...'], { R: '#e8262b', Y: '#ffd400', W: '#f2f2f2' }) },
  { v: 5, spr: makeSprite(['RRR', 'RRR', 'W..', 'W..', 'W..', 'W..', 'W..'], { R: '#e8262b', W: '#f2f2f2' }) },
  { v: 1, spr: makeSprite(['YY', 'Y.', 'W.', 'W.', 'W.', 'W.', 'W.'], { Y: '#ffd400', W: '#f2f2f2' }) },
];

const STAR_COLS = ['#ff4040', '#40ff60', '#4080ff', '#ffff40', '#ff40ff', '#40ffff', '#ffffff', '#ff9a30'];

// ---------- Yollar (kaplumbağa betikleri: [kare, dönüş derece/kare, hız?]) ----------
const PATHS = {
  top: { x: 92, y: -10, th: 90, script: [[42, 0], [68, 4], [14, 0]] },
  bottom: { x: -10, y: 236, th: -35, script: [[30, 0], [56, -6.5], [10, 0]] },
  side: { x: -10, y: 24, th: 22, script: [[30, 0], [74, 4.2], [6, 0]] },
};
const CHALLENGE_PATHS = [
  { x: -10, y: 30, th: 30, script: [[30, 0], [60, -3], [60, 4], [40, 0], [40, -3], [80, 0]] },
  { x: 112, y: -10, th: 90, script: [[45, 0], [90, 4], [20, 0], [90, -4], [100, 0]] },
  { x: -10, y: 250, th: -40, script: [[40, 0], [80, 4.5], [30, -2], [60, 0], [40, 3], [80, 0]] },
  { x: 40, y: -10, th: 80, script: [[30, 0], [15, -3], [30, 3], [30, -3], [30, 3], [30, -3], [30, 3], [80, 0]] },
  { x: -10, y: 160, th: -20, script: [[50, 0], [80, -4.5], [40, 0], [60, 3], [100, 0]] },
];

// Formasyon yuvaları (merkezden dışa dolma sırası)
function slotOrder(rows, cols) {
  const out = [];
  const sorted = [...cols].sort((a, b) => Math.abs(a - 4.5) - Math.abs(b - 4.5) || a - b);
  for (let i = 0; i < sorted.length; i += 2) {
    for (const r of rows) {
      out.push({ c: sorted[i], r });
      if (sorted[i + 1] != null) out.push({ c: sorted[i + 1], r });
    }
  }
  return out;
}
const SLOTS = {
  boss: slotOrder([0], [3, 4, 5, 6]),
  but: slotOrder([1, 2], [1, 2, 3, 4, 5, 6, 7, 8]),
  bee: slotOrder([3, 4], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
};

const wrapA = (a) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export default class Galaga {
  constructor(api) {
    this.api = api;
    this.t = 0;
    this.stage = 0;
    this.lives = 3;
    this.shotsFired = 0;
    this.hits = 0;
    this.nextExtra = 20000;
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({ x: api.rand(W), y: api.rand(H), c: STAR_COLS[i % STAR_COLS.length], g: i % 4, s: 0.6 + (i % 3) * 0.35 });
    }
    this.player = { x: W / 2, alive: true, dual: false, inv: 0 };
    this.shots = [];
    this.ebul = [];
    this.fx = [];
    this.popups = [];
    this.msg = null;
    this.rescue = null;
    this.capturing = null;
    this.over = 0;
    this.startStage();
    if (api.preview) {
      // Önizleme: girişin ortasından başla
      this.phaseT = 0;
      this.phase = 'play';
      for (let i = 0; i < 300; i++) this.update();
    }
  }

  // ---------- Aşama kurulumu ----------
  startStage() {
    this.stage++;
    this.challenge = this.stage % 4 === 3;
    this.enemies = [];
    this.groups = [];
    this.waveIdx = 0;
    this.waveTimer = 0;
    this.entryDone = false;
    this.formMode = 'sway';
    this.breathT = 0;
    this.swayT = 0;
    this.attackTimer = 180;
    this.phase = 'intro';
    this.phaseT = 0;
    this.chHits = 0;
    this.chTotal = 0;
    this.slotFree = { boss: [...SLOTS.boss], but: [...SLOTS.but], bee: [...SLOTS.bee] };
    this.ebul = [];
    if (this.challenge) this.buildChallenge();
    else this.buildWaves();
    if (this.stage > 1 && !this.api.preview) this.api.sfx.seq([['G5', 0.08], ['C6', 0.08], ['E6', 0.08], ['G6', 0.16], ['E6', 0.08], ['G6', 0.24]], { vol: 0.08 });
  }

  // Normal aşama: 5 dalga x 8 düşman
  buildWaves() {
    const s = this.stage;
    const flip = s % 2 === 0;
    this.waves = [
      [{ path: 'top', mirror: false, types: ['but', 'but', 'but', 'but'] }, { path: 'top', mirror: true, types: ['bee', 'bee', 'bee', 'bee'] }],
      [{ path: 'bottom', mirror: flip, pair: true, types: ['boss', 'but', 'boss', 'but', 'boss', 'but', 'boss', 'but'] }],
      [{ path: 'bottom', mirror: !flip, pair: true, types: ['but', 'but', 'but', 'but', 'but', 'but', 'but', 'but'] }],
      [{ path: 'side', mirror: true, pair: true, types: ['bee', 'bee', 'bee', 'bee', 'bee', 'bee', 'bee', 'bee'] }],
      [{ path: 'side', mirror: false, pair: true, types: ['bee', 'bee', 'bee', 'bee', 'bee', 'bee', 'bee', 'bee'] }],
    ];
  }

  buildChallenge() {
    const n = Math.floor(this.stage / 4);
    const tset = [['bee', 'but'], ['but', 'boss'], ['bee', 'boss'], ['but', 'bee']][n % 4];
    this.waves = [];
    for (let g = 0; g < 5; g++) {
      const p = (g + n) % CHALLENGE_PATHS.length;
      const type = tset[g % 2];
      if (g === 0 || g === 3) {
        this.waves.push([{ cpath: p, mirror: false, types: Array(4).fill(type), group: g }, { cpath: p, mirror: true, types: Array(4).fill(tset[(g + 1) % 2]), group: g }]);
      } else {
        this.waves.push([{ cpath: p, mirror: g % 2 === 0, pair: g === 2, types: Array(8).fill(type), group: g }]);
      }
    }
    this.groupHits = [0, 0, 0, 0, 0];
  }

  launchWave(lines) {
    for (const line of lines) {
      const P = line.cpath != null ? CHALLENGE_PATHS[line.cpath] : PATHS[line.path];
      const mx = line.mirror ? -1 : 1;
      let th0 = P.th * DEG;
      let x0 = P.x;
      if (line.mirror) {
        x0 = W - P.x;
        th0 = Math.PI - th0;
      }
      const script = P.script.map(([f, turn, sp]) => [f, turn * mx, sp]);
      line.types.forEach((type, i) => {
        const pairSide = line.pair ? i % 2 : 0;
        const idx = line.pair ? Math.floor(i / 2) : i;
        const off = pairSide ? 14 : 0;
        const e = {
          type,
          x: x0 + -Math.sin(th0) * off * mx,
          y: P.y + Math.cos(th0) * off * mx,
          th: th0,
          sp: 2.4 + Math.min(0.6, this.stage * 0.04),
          script,
          si: 0,
          st: 0,
          wait: idx * 8,
          state: this.challenge ? 'challenge' : 'enter',
          hp: type === 'boss' && !this.challenge ? 2 : 1,
          flap: 0,
          shotsLeft: 0,
          yo: 0,
          group: line.group,
        };
        if (!this.challenge) {
          const slot = this.slotFree[type].shift() || { c: 4, r: 3 };
          e.c = slot.c;
          e.r = slot.r;
          e.shotsLeft = this.stage >= 2 && this.api.rand() < 0.15 + this.stage * 0.03 ? 1 : 0;
        } else {
          this.chTotal++;
        }
        this.enemies.push(e);
      });
    }
  }

  slotPos(e) {
    const b = this.formMode === 'breathe' ? (1 - Math.cos(this.breathT * Math.PI * 2 / 180)) / 2 : 0;
    const sway = this.formMode === 'sway' ? Math.sin(this.swayT * Math.PI * 2 / 240) * 12 : 0;
    const sx = 16 + b * 4;
    const sy = 16 + b * 3;
    return [112 + (e.c - 4.5) * sx + sway, FORM_TOP + e.r * sy + (e.yo || 0)];
  }

  // ---------- Ana döngü ----------
  update() {
    const api = this.api;
    this.t++;
    this.phaseT++;
    this.updateStars();
    this.fx = this.fx.filter((f) => ++f.t < f.life);
    this.popups = this.popups.filter((p) => --p.t > 0);
    if (this.msg && --this.msg.t <= 0) this.msg = null;

    if (this.over) {
      this.updateEnemies();
      this.updateBullets();
      if (this.over > 1) this.over--;
      else if (!this.ended) {
        this.ended = true;
        api.gameOver();
      }
      return;
    }

    switch (this.phase) {
      case 'intro':
        if (this.phaseT === 1 && this.stage === 1 && !api.preview) {
          api.sfx.seq([['C5', 0.12], ['G5', 0.12], ['E5', 0.12], ['C6', 0.12], ['B5', 0.12], ['G5', 0.12], ['A5', 0.12], ['B5', 0.12], ['C6', 0.36]], { vol: 0.08, type: 'square' });
          api.sfx.seq([['C3', 0.24], ['E3', 0.24], ['G3', 0.24], ['G3', 0.24], ['C3', 0.36]], { vol: 0.1, type: 'triangle' });
        }
        this.updatePlayer();
        this.updateShots();
        if (this.phaseT > (this.stage === 1 ? 170 : 120)) {
          this.phase = 'play';
          this.phaseT = 0;
        }
        return;
      case 'clear':
        this.updatePlayer();
        this.updateShots();
        this.updateBullets();
        if (this.phaseT > 100) this.startStage();
        return;
      case 'chresult':
        this.updatePlayer();
        if (this.phaseT === 60) {
          const bonus = this.chHits === this.chTotal ? 10000 : this.chHits * 100;
          api.addScore(bonus);
          api.sfx.play(this.chHits === this.chTotal ? 'levelup' : 'power');
        }
        if (this.phaseT > 260) this.startStage();
        return;
      default:
        break;
    }

    // Formasyon salınımı / nefes
    if (this.formMode === 'sway') {
      this.swayT++;
      if (this.entryDone && Math.abs(Math.sin(this.swayT * Math.PI * 2 / 240)) < 0.03) {
        this.formMode = 'breathe';
        this.breathT = 0;
      }
    } else {
      this.breathT++;
    }

    // Dalgaları sırayla sal
    if (this.waveIdx < this.waves.length && --this.waveTimer <= 0) {
      this.launchWave(this.waves[this.waveIdx++]);
      this.waveTimer = this.challenge ? 190 : 150;
    }
    if (!this.entryDone && this.waveIdx >= this.waves.length && !this.enemies.some((e) => e.state === 'enter' || (e.state === 'home' && e.fromEntry))) {
      this.entryDone = true;
    }

    this.updatePlayer();
    this.updateShots();
    this.updateEnemies();
    this.updateBullets();
    this.updateCapture();
    this.updateRescue();
    if (!this.challenge) this.scheduleAttacks();
    this.checkRespawn();
    this.checkStageEnd();

    if (api.score >= this.nextExtra) {
      this.lives++;
      this.nextExtra += this.nextExtra === 20000 ? 50000 : 70000;
      api.sfx.play('coin');
      this.msg = { text: 'EKSTRA GEMİ!', t: 100 };
    }
  }

  updateStars() {
    const moving = this.player.alive || this.phase !== 'play';
    for (const s of this.stars) {
      if (moving) s.y += s.s;
      if (s.y >= H) { s.y -= H; s.x = this.api.rand(W); }
    }
  }

  // ---------- Oyuncu ----------
  updatePlayer() {
    const { input, preview } = this.api;
    const p = this.player;
    if (p.inv > 0) p.inv--;
    if (!p.alive || this.rescue) return;
    let dx = input.dx;
    let fire = input.pressed('a') || (input.held('a') && this.t % 9 === 0);
    if (preview) [dx, fire] = this.autopilot();
    const half = p.dual ? 15 : 7;
    p.x = clamp(p.x + dx * 1.6, 8 + half, W - 8 - half);
    if (fire) this.fire();
  }

  fire() {
    const p = this.player;
    const volleys = new Set(this.shots.map((s) => s.v)).size;
    if (volleys >= 2) return;
    this.volleyId = (this.volleyId || 0) + 1;
    const v = this.volleyId;
    const xs = p.dual ? [p.x - 8, p.x + 8] : [p.x];
    for (const x of xs) this.shots.push({ x, y: PLAYER_Y - 10, v });
    this.shotsFired += xs.length;
    this.api.sfx.tone(1250, 0.08, { slide: 500, vol: 0.05, type: 'square' });
  }

  autopilot() {
    const p = this.player;
    let tx = W / 2 + Math.sin(this.t / 70) * 60;
    let best = null;
    for (const e of this.enemies) {
      if (e.state === 'dead' || e.wait > 0 || e.state === 'gone') continue;
      if (!best || e.y > best.y) best = e;
    }
    if (best) tx = best.x;
    for (const b of this.ebul) if (b.y > 190 && Math.abs(b.x - p.x) < 12) tx = p.x + (b.x > p.x ? -30 : 30);
    const dx = Math.abs(tx - p.x) < 2 ? 0 : Math.sign(tx - p.x);
    return [dx, this.t % 12 === 0];
  }

  updateShots() {
    for (const s of this.shots) {
      for (let k = 0; k < 2 && !s.dead; k++) {
        s.y -= 3.5;
        this.shotHit(s);
      }
      if (s.y < 14) s.dead = true;
    }
    this.shots = this.shots.filter((s) => !s.dead);
  }

  shotHit(s) {
    for (const e of this.enemies) {
      if (!this.isTarget(e)) continue;
      if (Math.abs(e.x - s.x) < 7 && Math.abs(e.y - (s.y + 3)) < 7) {
        s.dead = true;
        this.hits++;
        this.damage(e);
        return;
      }
    }
  }

  isTarget(e) {
    return e.state !== 'dead' && e.state !== 'gone' && e.wait <= 0 && !(e.state === 'challenge' && e.y < -6);
  }

  // ---------- Düşmanlar ----------
  damage(e) {
    const api = this.api;
    if (e.type === 'boss' && e.hp > 1) {
      e.hp--;
      api.sfx.tone(420, 0.07, { vol: 0.12, type: 'square', slide: 300 });
      return;
    }
    this.kill(e);
  }

  kill(e) {
    const api = this.api;
    const diving = e.state !== 'form';
    let pts = 0;
    if (this.challenge) {
      pts = 100;
      this.chHits++;
      if (e.group != null && ++this.groupHits[e.group] === 8) {
        api.addScore(1000);
        this.popups.push({ x: e.x, y: e.y, text: '1000', t: 70 });
      }
    } else if (e.type === 'bee') pts = diving ? 100 : 50;
    else if (e.type === 'but') pts = diving ? 160 : 80;
    else if (e.type === 'cap') pts = 1000;
    else if (e.type === 'boss') {
      if (!diving) pts = 150;
      else pts = [400, 800, 1600][clamp(e.escortsKilled || 0, 0, 2)];
    }
    api.addScore(pts);
    if (pts >= 400 && !this.challenge) this.popups.push({ x: e.x, y: e.y, text: String(pts), t: 70 });
    e.state = 'dead';
    this.boom(e.x, e.y, e.type === 'boss' ? 1 : 0);
    if (e.type === 'boss') api.sfx.play('explode');
    else {
      api.sfx.noise(0.18, { vol: 0.18, freq: 2600 });
      api.sfx.tone(600, 0.12, { slide: 140, vol: 0.06 });
    }
    // Muhafızlar
    if (e.leader && e.leader.state !== 'dead') e.leader.escortsKilled = (e.leader.escortsKilled || 0) + 1;
    for (const o of this.enemies) if (o.leader === e) o.leader = null;
    // Esir gemi
    if (e.captive) {
      const cap = e.captive;
      e.captive = null;
      if (diving && cap.state === 'attached') {
        this.startRescue(cap);
      } else if (cap.state === 'attached') {
        // Formasyonda vuruldu: esir gemi düşman olur
        cap.state = 'form';
        cap.type = 'cap';
        cap.c = e.c;
        cap.r = e.r;
        cap.yo = -16;
        cap.carrier = null;
        this.msg = { text: 'ESİR GEMİ DÜŞMAN OLDU!', t: 120 };
      }
    }
    if (e.state === 'dead' && e.type === 'cap' && e.carrier) e.carrier.captive = null;
  }

  boom(x, y, big) {
    const parts = [];
    const n = big ? 22 : 14;
    const cols = big ? ['#ffffff', '#ffd400', '#ff3030', '#40ff60'] : ['#ffffff', '#ffd400', '#ff3030', '#3a6cff'];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + this.api.rand(0.3);
      parts.push({ a, v: this.api.rand(0.5, big ? 1.6 : 1.2), c: cols[i % cols.length] });
    }
    this.fx.push({ x, y, t: 0, life: big ? 30 : 22, parts });
  }

  updateEnemies() {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.state === 'dead' || e.state === 'gone') continue;
      if (e.wait > 0) {
        e.wait--;
        continue;
      }
      e.flap = (e.state === 'form' ? (this.t >> 4) & 1 : (this.t >> 3) & 1);
      switch (e.state) {
        case 'enter':
          this.entryFire(e);
          if (this.turtle(e)) {
            e.state = 'home';
            e.fromEntry = true;
          }
          break;
        case 'home':
          this.home(e);
          break;
        case 'form': {
          const [x, y] = this.slotPos(e);
          e.x = x;
          e.y = y;
          e.th += clamp(wrapA(-Math.PI / 2 - e.th), -0.25, 0.25);
          break;
        }
        case 'dive':
          if (this.turtle(e)) {
            e.state = e.beamer ? 'beamgo' : 'attack';
            e.attackT = 0;
          }
          break;
        case 'attack':
          this.attack(e);
          break;
        case 'beamgo':
          this.beamGo(e);
          break;
        case 'beam':
          this.beam(e);
          break;
        case 'leave':
          e.x += Math.cos(e.th) * e.sp;
          e.y += Math.sin(e.th) * e.sp;
          e.th += clamp(wrapA(Math.PI / 2 - e.th), -0.05, 0.05);
          if (e.y > H + 16) this.reenter(e);
          break;
        case 'challenge':
          if (this.turtle(e)) {
            e.x += Math.cos(e.th) * e.sp;
            e.y += Math.sin(e.th) * e.sp;
            if (e.x < -24 || e.x > W + 24 || e.y < -24 || e.y > H + 24) e.state = 'gone';
          }
          break;
        default:
          break;
      }
      // Esir gemi komutanı izler
      if (e.captive && e.captive.state === 'attached') {
        const c = e.captive;
        c.x = e.x;
        c.y = e.y - 16;
        c.th = e.th;
        c.flap = 0;
      }
      // Oyuncuya çarpma
      if (p.alive && !this.challenge && e.state !== 'form' && e.state !== 'attached' && !p.inv && !this.rescue) {
        const hx = this.hitPlayerAt(e.x, e.y, 9);
        if (hx) {
          this.kill(e);
          this.playerHit(hx);
        }
      }
    }
    if (this.challenge) return;
    // Bitmiş düşmanları temizle (patlama efektleri ayrı tutulur)
    if (this.enemies.length > 60) this.enemies = this.enemies.filter((e) => e.state !== 'dead');
  }

  turtle(e) {
    const seg = e.script[e.si];
    if (!seg) return true;
    e.th += seg[1] * DEG;
    const sp = seg[2] || e.sp;
    e.x += Math.cos(e.th) * sp;
    e.y += Math.sin(e.th) * sp;
    if (++e.st >= seg[0]) {
      e.si++;
      e.st = 0;
    }
    return e.si >= e.script.length;
  }

  home(e) {
    const [tx, ty] = this.slotPos(e);
    const dx = tx - e.x;
    const dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    const sp = 2.4;
    if (d <= sp + 0.5) {
      e.x = tx;
      e.y = ty;
      e.state = 'form';
      e.fromEntry = false;
      return;
    }
    const want = Math.atan2(dy, dx);
    if (d < 28) {
      e.th += clamp(wrapA(want - e.th), -0.3, 0.3);
      e.x += (dx / d) * sp;
      e.y += (dy / d) * sp;
    } else {
      e.th += clamp(wrapA(want - e.th), -0.12, 0.12);
      e.x += Math.cos(e.th) * sp;
      e.y += Math.sin(e.th) * sp;
    }
  }

  diff() {
    const s = this.stage;
    return {
      sp: Math.min(3.3, 2.0 + s * 0.1),
      turn: Math.min(3.2, 1.4 + s * 0.13) * DEG,
      bsp: Math.min(4.2, 2.5 + s * 0.12),
      fire: Math.min(0.045, 0.014 + s * 0.003),
      maxDivers: Math.min(8, 2 + Math.floor(s / 2)),
      interval: Math.max(24, 105 - s * 8),
    };
  }

  attack(e) {
    const p = this.player;
    const d = this.diff();
    e.attackT++;
    const lead = e.leader && e.leader.state === 'attack' ? e.leader : null;
    if (lead) {
      e.th = lead.th;
      e.sp = lead.sp;
    } else if (e.y < 205) {
      let want = Math.atan2(H + 40 - e.y, (p.alive ? p.x : W / 2) - e.x);
      if (e.type === 'but' || e.type === 'cap') want += Math.sin(e.attackT / 14) * 0.7;
      if (e.type === 'boss') want += Math.sin(e.attackT / 22) * 0.4;
      want = clamp(want, 25 * DEG, 155 * DEG);
      e.th += clamp(wrapA(want - e.th), -d.turn, d.turn);
    }
    e.x += Math.cos(e.th) * e.sp;
    e.y += Math.sin(e.th) * e.sp;
    if (e.x < 6) { e.x = 6; e.th = Math.PI - e.th; }
    if (e.x > W - 6) { e.x = W - 6; e.th = Math.PI - e.th; }
    // Ateş
    if (e.shotsLeft > 0 && e.y > 70 && e.y < 200 && p.alive && this.api.rand() < d.fire) {
      e.shotsLeft--;
      this.enemyShoot(e);
    }
    if (e.y > H + 16) this.reenter(e);
  }

  reenter(e) {
    // Alttan çıkan düşman yukarıdan dönüp yerine geçer
    e.y = -16;
    e.x = this.slotPos(e)[0];
    e.th = Math.PI / 2;
    e.state = 'home';
    e.leader = null;
    e.beamer = false;
  }

  entryFire(e) {
    if (e.shotsLeft > 0 && this.player.alive && e.y > 90 && e.y < 190 && Math.sin(e.th) > 0.3 && this.api.rand() < 0.03) {
      e.shotsLeft--;
      this.enemyShoot(e);
    }
  }

  enemyShoot(e) {
    if (this.ebul.length >= 10) return;
    const p = this.player;
    const d = this.diff();
    const vy = d.bsp;
    const t = Math.max(10, (PLAYER_Y - e.y) / vy);
    const vx = clamp((p.x - e.x) / t, -1.3, 1.3);
    this.ebul.push({ x: e.x, y: e.y + 6, vx, vy });
  }

  updateBullets() {
    for (const b of this.ebul) {
      b.x += b.vx;
      b.y += b.vy;
      if (this.player.alive && !this.player.inv && !this.rescue) {
        const hx = this.hitPlayerAt(b.x, b.y + 2, 4);
        if (hx) {
          b.dead = true;
          this.playerHit(hx);
        }
      }
      if (b.y > H + 4) b.dead = true;
    }
    this.ebul = this.ebul.filter((b) => !b.dead);
  }

  // Bir nokta oyuncu gemisine (veya çift gemiden birine) çarpıyor mu? Çarpılan geminin x'i döner.
  hitPlayerAt(x, y, r) {
    const p = this.player;
    if (Math.abs(y - PLAYER_Y) > r + 5) return 0;
    const xs = p.dual ? [p.x - 8, p.x + 8] : [p.x];
    for (const sx of xs) if (Math.abs(x - sx) < r + 4) return sx;
    return 0;
  }

  playerHit(sx) {
    const p = this.player;
    const api = this.api;
    this.boom(sx, PLAYER_Y, 1);
    api.sfx.play('bigexplode');
    if (p.dual) {
      p.dual = false;
      p.x = sx === p.x - 8 ? p.x + 8 : p.x - 8;
      p.inv = 30;
      return;
    }
    p.alive = false;
    this.lives--;
    this.deadT = 0;
    this.shots = [];
  }

  // ---------- Saldırı planlayıcı ----------
  scheduleAttacks() {
    if (!this.entryDone && this.waveIdx < 3) return;
    const p = this.player;
    if (!p.alive || this.rescue || this.capturing || this.phase !== 'play') return;
    const d = this.diff();
    const alive = this.enemies.filter((e) => e.state !== 'dead');
    const divers = alive.filter((e) => e.state !== 'form' && e.state !== 'attached').length;
    const inForm = alive.filter((e) => e.state === 'form');
    const few = this.entryDone && alive.length <= 6;
    const maxDiv = few ? 99 : d.maxDivers;
    if (--this.attackTimer > 0 || divers >= maxDiv || !inForm.length) return;
    this.attackTimer = few ? 12 : Math.floor(d.interval * this.api.rand(0.6, 1.3));
    const api = this.api;
    const r = api.rand();
    const bosses = inForm.filter((e) => e.type === 'boss');
    const hasCaptive = this.enemies.some((e) => e.type === 'cap' && e.state !== 'dead') || this.capturing;
    let e;
    if (bosses.length && r < 0.3) {
      e = api.pick(bosses);
      const canBeam = !hasCaptive && !p.dual && !e.captive && api.rand() < 0.45;
      if (canBeam) {
        this.launchDive(e, true);
        return;
      }
      this.launchDive(e, false);
      // muhafızlar
      const esc = inForm.filter((o) => o.type === 'but' && o.r <= 2 && Math.abs(o.c - e.c) <= 1).slice(0, 2);
      for (const o of esc) {
        this.launchDive(o, false, e);
        o.leader = e;
      }
      e.escortsKilled = 0;
      return;
    }
    const pool = inForm.filter((o) => o.type !== 'boss');
    e = pool.length ? api.pick(pool) : api.pick(inForm);
    this.launchDive(e, false);
  }

  launchDive(e, beam, leader) {
    const d = this.diff();
    const L = leader || e;
    const dir = L.c < 4.5 ? -1 : 1;
    e.state = 'dive';
    e.beamer = beam;
    e.sp = d.sp;
    e.si = 0;
    e.st = 0;
    e.th = -Math.PI / 2;
    e.script = [[6, 0, 1.5], [45, 4 * dir, 2]];
    e.shotsLeft = beam ? 0 : (this.stage < 2 ? 1 : 2);
    if (!leader) this.api.sfx.tone(1500, 0.45, { slide: 400, type: 'triangle', vol: 0.05 });
  }

  // ---------- Çekici ışın ----------
  beamGo(e) {
    if (e.beamX == null) e.beamX = clamp(this.player.x, 30, W - 30);
    const tx = e.beamX;
    const ty = 150;
    const dx = tx - e.x;
    const dy = ty - e.y;
    const d = Math.hypot(dx, dy);
    if (d < 2.5) {
      e.x = tx;
      e.y = ty;
      e.th = Math.PI / 2;
      e.state = 'beam';
      e.beamT = 0;
      return;
    }
    const want = Math.atan2(dy, dx);
    e.th += clamp(wrapA(want - e.th), -0.08, 0.08);
    if (d < 40) e.th = want;
    e.x += Math.cos(e.th) * 2;
    e.y += Math.sin(e.th) * 2;
  }

  beamLen(e) {
    const t = e.beamT;
    const full = PLAYER_Y + 10 - (e.y + 8);
    if (t < 50) return (full * t) / 50;
    if (t < 190) return full;
    if (t < 230) return (full * (230 - t)) / 40;
    return 0;
  }

  beam(e) {
    const api = this.api;
    if (e.captured) {
      if (!this.capturing) {
        e.state = 'home';
        e.beamX = null;
        e.captured = false;
      }
      return;
    }
    e.beamT++;
    if (e.beamT % 14 === 0 && e.beamT < 230 && !e.captured) api.sfx.tone(e.beamT % 28 ? 330 : 440, 0.12, { type: 'triangle', vol: 0.06, slide: e.beamT % 28 ? 440 : 330 });
    const p = this.player;
    if (!e.captured && e.beamT > 60 && e.beamT < 190 && p.alive && !p.dual && !p.inv && !this.rescue && !this.capturing && Math.abs(p.x - e.x) < 15) {
      // Yakalandın!
      e.captured = true;
      p.alive = false;
      this.shots = [];
      this.capturing = { boss: e, x: p.x, y: PLAYER_Y, rot: 0 };
      api.sfx.seq([['E5', 0.12], ['D5', 0.12], ['C5', 0.12], ['B4', 0.12], ['A4', 0.12], ['G4', 0.3]], { type: 'triangle', vol: 0.12 });
    }
    if (e.captured) return;
    if (e.beamT >= 240) {
      e.beamX = null;
      e.state = 'leave';
      e.sp = 2.2;
    }
  }

  updateCapture() {
    const c = this.capturing;
    if (!c) return;
    const b = c.boss;
    c.rot++;
    const ty = b.y - 16;
    c.x += clamp(b.x - c.x, -0.6, 0.6);
    c.y -= 0.9;
    if (b.state === 'dead') {
      // Komutan yakalarken vuruldu: gemi kurtulur
      this.capturing = null;
      this.player.alive = true;
      this.player.x = c.x;
      this.player.inv = 60;
      return;
    }
    if (c.y <= ty) {
      const cap = { type: 'cap', state: 'attached', x: b.x, y: ty, th: -Math.PI / 2, flap: 0, wait: 0, hp: 1, carrier: b, sp: 2 };
      b.captive = cap;
      this.enemies.push(cap);
      this.capturing = null;
      this.lives--;
      this.deadT = 0;
      this.msg = { text: 'SAVAŞÇI YAKALANDI', t: 160 };
    }
  }

  startRescue(cap) {
    const p = this.player;
    cap.state = 'dead';
    const toX = p.alive ? (p.x + 16 > W - 16 ? p.x - 16 : p.x + 16) : W / 2;
    this.rescue = { x: cap.x, y: cap.y, tx: toX, rot: 0, t: 0, solo: !p.alive };
    this.api.sfx.seq([['C5', 0.1], ['E5', 0.1], ['G5', 0.1], ['C6', 0.1], ['E6', 0.1], ['G6', 0.3]], { vol: 0.1 });
    this.msg = { text: 'GEMİN KURTARILDI!', t: 120 };
  }

  updateRescue() {
    const r = this.rescue;
    if (!r) return;
    const p = this.player;
    r.t++;
    r.rot++;
    if (r.t < 60) {
      r.y += 0.3;
      return;
    }
    if (p.alive) r.tx = p.x + 16 > W - 16 ? p.x - 16 : p.x + 16;
    r.x += clamp(r.tx - r.x, -1.5, 1.5);
    r.y += clamp(PLAYER_Y - r.y, -2.2, 2.2);
    if (Math.abs(r.x - r.tx) < 1.6 && Math.abs(r.y - PLAYER_Y) < 2.3) {
      if (p.alive) {
        p.dual = true;
        p.x = (p.x + r.tx) / 2;
        p.x = clamp(p.x, 23, W - 23);
      } else {
        p.alive = true;
        p.x = r.tx;
        this.lives++;
        p.inv = 60;
      }
      this.rescue = null;
      this.api.sfx.play('power');
    }
  }

  checkRespawn() {
    const p = this.player;
    if (p.alive || this.capturing || this.over) return;
    this.deadT = (this.deadT || 0) + 1;
    const busy = this.enemies.some((e) => e.state !== 'dead' && e.state !== 'form' && e.state !== 'attached' && e.state !== 'gone' && e.wait <= 0 && e.state !== 'enter' && e.state !== 'challenge');
    if (this.lives <= 0) {
      if (this.deadT > 60) {
        this.over = 300;
        this.api.sfx.play('gameover');
      }
      return;
    }
    if (this.deadT === 1) this.respawnAt = 0;
    if (this.deadT > 90 && !busy && this.ebul.length === 0 && !this.rescue) {
      if (!this.respawnAt) this.respawnAt = this.deadT + 80;
      if (this.deadT >= this.respawnAt) {
        p.alive = true;
        p.x = W / 2;
        p.inv = 30;
        this.attackTimer = 120;
      }
    }
  }

  checkStageEnd() {
    if (this.waveIdx < this.waves.length) return;
    const left = this.enemies.some((e) => e.state !== 'dead' && e.state !== 'gone');
    if (left || this.rescue || this.capturing) return;
    if (!this.player.alive) return;
    this.phaseT = 0;
    this.ebul = [];
    this.phase = this.challenge ? 'chresult' : 'clear';
  }

  // ---------- Çizim ----------
  draw() {
    const { gfx, score, hiScore } = this.api;
    gfx.cls('#000');
    // Yıldızlar
    for (const s of this.stars) if (((this.t >> 4) + s.g) % 4 !== 0) gfx.pset(s.x, s.y, s.c);

    // Işınlar
    for (const e of this.enemies) if (e.state === 'beam') this.drawBeam(e);

    // Düşmanlar
    for (const e of this.enemies) {
      if (e.state === 'dead' || e.state === 'gone' || e.wait > 0) continue;
      let set;
      if (e.type === 'boss') set = e.hp > 1 || this.challenge ? SPR.boss : SPR.boss2;
      else set = SPR[e.type];
      const spr = set[e.flap || 0][dirIndex(e.th)];
      gfx.sprite(spr, e.x - spr.width / 2, e.y - spr.height / 2);
    }

    // Yakalanan / kurtarılan gemi
    if (this.capturing) {
      const c = this.capturing;
      const spr = SPR.fighter[0][(c.rot >> 2) % 16];
      gfx.sprite(spr, c.x - spr.width / 2, c.y - spr.height / 2);
    }
    if (this.rescue) {
      const r = this.rescue;
      const spr = SPR.fighter[0][r.t < 100 ? (r.rot >> 2) % 16 : 0];
      gfx.sprite(spr, r.x - spr.width / 2, r.y - spr.height / 2);
    }

    // Oyuncu
    const p = this.player;
    if (p.alive && !(p.inv && (this.t >> 2) & 1)) {
      if (p.dual) {
        gfx.sprite(FIGHTER, p.x - 8 - 8, PLAYER_Y - 8);
        gfx.sprite(FIGHTER, p.x + 8 - 8, PLAYER_Y - 8);
      } else {
        gfx.sprite(FIGHTER, p.x - 8, PLAYER_Y - 8);
      }
    }
    for (const s of this.shots) gfx.sprite(SHOT, s.x - 1, s.y);
    for (const b of this.ebul) gfx.sprite(EBULLET, b.x - 1, b.y);

    // Patlamalar
    for (const f of this.fx) {
      const k = f.t / f.life;
      for (const q of f.parts) {
        const r = q.v * f.t * 0.9;
        const x = f.x + Math.cos(q.a) * r;
        const y = f.y + Math.sin(q.a) * r;
        if (k < 0.8 || (f.t & 1)) gfx.rect(x - 1, y - 1, k < 0.4 ? 2 : 1, k < 0.4 ? 2 : 1, q.c);
      }
      if (f.t < 6) gfx.circ(f.x, f.y, 2 + f.t * 0.7, f.t < 3 ? '#ffffff' : '#ffd400');
    }
    for (const pu of this.popups) gfx.text(pu.text, pu.x, pu.y - 3, '#40c8ff', { align: 'center' });

    this.drawHud(gfx, score, hiScore);
  }

  drawBeam(e) {
    const { gfx } = this.api;
    const len = this.beamLen(e);
    const y0 = e.y + 8;
    const cols = ['#3a6cff', '#40ffff', '#c040ff', '#ffffff'];
    for (let d = 0; d < len; d += 2) {
      const half = 3 + d * 0.16;
      const band = Math.floor((d - this.t * 1.5) / 6);
      const c = cols[((band % 4) + 4) % 4];
      // kenarlar parlak, orta seyrek
      gfx.rect(e.x - half, y0 + d, 2, 1, c);
      gfx.rect(e.x + half - 2, y0 + d, 2, 1, c);
      if ((d >> 1) % 3 === 0) gfx.rect(e.x - half + 2, y0 + d, half * 2 - 4, 1, c);
    }
  }

  drawHud(gfx, score, hiScore) {
    const blink = (this.t >> 5) & 1;
    if (blink || this.t < 2) gfx.text('1UP', 16, 2, '#ff3030');
    gfx.text(String(score).padStart(6, ' '), 8, 11, '#ffffff');
    gfx.text('REKOR', 112, 2, '#ff3030', { align: 'center' });
    gfx.text(String(Math.max(score, hiScore)).padStart(6, '0'), 112, 11, '#ffffff', { align: 'center' });

    // Yedek gemiler
    for (let i = 0; i < Math.min(6, this.lives - 1); i++) gfx.sprite(LIFE_ICON, 4 + i * 15, H - 15);
    // Aşama rozetleri
    let n = this.stage;
    let x = W - 4;
    for (const b of BADGES) {
      while (n >= b.v && x > 120) {
        x -= b.spr.width + 1;
        gfx.sprite(b.spr, x, H - 3 - b.spr.height);
        n -= b.v;
      }
    }

    const cx = W / 2;
    if (this.phase === 'intro' && this.t > 1) {
      if (this.stage === 1 && this.phaseT < 80) gfx.text('1. OYUNCU', cx, 140, '#40c8ff', { align: 'center' });
      else gfx.text(this.challenge ? 'MEYDAN OKUMA' : `AŞAMA ${this.stage}`, cx, 140, '#40c8ff', { align: 'center' });
      if (this.challenge) gfx.text('AŞAMASI', cx, 152, '#40c8ff', { align: 'center' });
      if (this.phaseT > 60 && !this.challenge) gfx.text('HAZIR!', cx, 156, '#ff3030', { align: 'center' });
    } else if (this.phase === 'intro' && this.t <= 1) {
      gfx.text(`AŞAMA ${this.stage}`, cx, 140, '#40c8ff', { align: 'center' });
    }
    if (this.phase === 'chresult') {
      gfx.text('VURULAN DÜŞMAN', cx, 120, '#40c8ff', { align: 'center' });
      gfx.text(String(this.chHits), cx, 134, '#ffffff', { align: 'center' });
      if (this.phaseT > 60) {
        if (this.chHits === this.chTotal) gfx.text('MÜKEMMEL!', cx, 154, '#ff3030', { align: 'center' });
        gfx.text(`BONUS ${this.chHits === this.chTotal ? 10000 : this.chHits * 100}`, cx, 168, '#ffd400', { align: 'center' });
      }
    }
    if (!this.player.alive && !this.capturing && !this.over && this.lives > 0 && this.respawnAt && this.deadT > this.respawnAt - 80) {
      gfx.text('HAZIR!', cx, 156, '#ff3030', { align: 'center' });
    }
    if (this.msg) gfx.text(this.msg.text, cx, 176, this.msg.t % 20 < 14 ? '#ff3030' : '#ffffff', { align: 'center' });

    if (this.over) {
      gfx.rect(28, 104, W - 56, 76, '#000');
      gfx.rectb(28, 104, W - 56, 76, '#3a6cff');
      gfx.text('OYUN BİTTİ', cx, 112, '#ff3030', { align: 'center' });
      const ratio = this.shotsFired ? Math.round((this.hits / this.shotsFired) * 1000) / 10 : 0;
      gfx.text('- SONUÇLAR -', cx, 128, '#ffd400', { align: 'center' });
      gfx.text(`ATIŞ       ${this.shotsFired}`, 40, 142, '#ffffff');
      gfx.text(`İSABET     ${this.hits}`, 40, 154, '#ffffff');
      gfx.text(`ORAN       %${ratio}`, 40, 166, '#ffffff');
    }
  }
}
