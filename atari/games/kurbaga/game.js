// Kurbağa — Frogger tarzı.
// 5 şeritli yol, orta kaldırım, kütük ve dalan kaplumbağalı nehir, 5 yuva, zaman çubuğu.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'kurbaga',
  width: 224,
  height: 256,
  buttons: { a: 'İLERİ ZIPLA' },
  help: [
    'Yön tuşları: her basışta bir kare zıpla.',
    'Yolda araçlara çarpma; nehirde kütük ve kaplumbağaların üstünde kal (suya düşersen boğulursun).',
    'Kırmızı kaplumbağalar ara sıra dalar! Beş yuvayı da doldurunca seviye atlarsın.',
    'Yuvadaki sinek +200 puan; timsah kafası olan yuvaya girme.',
  ],
};

const W = 224;
const H = 256;
const T = 16;
const HOME_ROW = 1;
const START_ROW = 13;
const MEDIAN_ROW = 7;
const BAY_X = [8, 56, 104, 152, 200]; // yuvalardaki kurbağa x'i
const TIME_MAX = 60 * 40;

const rot = (rows) => {
  const n = rows.length;
  const out = [];
  for (let y = 0; y < n; y++) {
    let r = '';
    for (let x = 0; x < n; x++) r += rows[n - 1 - x][y] || '.';
    out.push(r);
  }
  return out;
};

const FROG_PAL = { G: '#20a020', L: '#6cfc4c', Y: '#fcfc54', R: '#fc3c3c', K: '#0c2c0c', W: '#fff' };
const FROG_SIT = [
  '................',
  '..LL........LL..',
  '..GL.RR..RR.LG..',
  '...GLRKLLKRLG...',
  '....GLLLLLLG....',
  '.....GLLLLG.....',
  '...GGGLYYLGGG...',
  '..GG.GLYYLG.GG..',
  '..G..GLLLLG..G..',
  '.....GLYYLG.....',
  '....GGLLLLGG....',
  '...GG.GLLG.GG...',
  '..GG..GGGG..GG..',
  '..GL........LG..',
  '..LL........LL..',
  '................',
];
const FROG_HOP = [
  '..L..........L..',
  '..GL........LG..',
  '...G.RR..RR.G...',
  '...GLRKLLKRLG...',
  '....GLLLLLLG....',
  '.....GLLLLG.....',
  '....GGLYYLGG....',
  '.....GLYYLG.....',
  '.....GLLLLG.....',
  '.....GLYYLG.....',
  '....GGLLLLGG....',
  '....G.GLLG.G....',
  '...G..GGGG..G...',
  '..G..........G..',
  '..GL........LG..',
  '..LL........LL..',
];
// Yön: 0 yukarı, 1 sağ, 2 aşağı, 3 sol
const FROG = [[], []];
{
  let s = FROG_SIT, h = FROG_HOP;
  for (let d = 0; d < 4; d++) {
    FROG[0][d] = makeSprite(s, FROG_PAL);
    FROG[1][d] = makeSprite(h, FROG_PAL);
    s = rot(s);
    h = rot(h);
  }
}
const HOME_FROG = makeSprite([
  '................',
  '...LL......LL...',
  '..LGGL....LGGL..',
  '..LKWG....GWKL..',
  '..GLLLLLLLLLLG..',
  '.GLLLLLLLLLLLLG.',
  '.GLLRRRRRRRRLLG.',
  '.GLLLRRRRRRLLLG.',
  '..GLLLLLLLLLLG..',
  '...GGLLLLLLGG...',
  '..GG.GGGGGG.GG..',
  '.GL..........LG.',
  '................',
], { ...FROG_PAL, R: '#fc5c9c' });
const LIFE = makeSprite([
  '.L....L.',
  'GLRLLRLG',
  '.GLLLLG.',
  'GGLYYLGG',
  '.GLLLLG.',
  'G.GLLG.G',
  'L......L',
], FROG_PAL);

const CAR = [
  '................',
  '..KK.......KK...',
  '..KK.......KK...',
  '.CCCCCCCCCCCCC..',
  'CCWWCCCCCCCCCCC.',
  'CCWBBBCCCCCBBCC.',
  'CCCBBBCCCCCBBCC.',
  'CCCBBBCCCCCBBCC.',
  'CCCBBBCCCCCBBCC.',
  'CCWBBBCCCCCBBCC.',
  'CCWWCCCCCCCCCCC.',
  '.CCCCCCCCCCCCC..',
  '..KK.......KK...',
  '..KK.......KK...',
  '................',
  '................',
];
const RACER = [
  '................',
  '..KKK.....KKK...',
  '..KKK.....KKK...',
  '...C..CCCCC..CC.',
  '.CCCCCCCCCCCCCC.',
  'CCCCCWWBCCCCCCCC',
  'CCCDCWWBBCCCCCDD',
  'CCCDCWWBBCCCCCDD',
  'CCCCCWWBCCCCCCCC',
  '.CCCCCCCCCCCCCC.',
  '...C..CCCCC..CC.',
  '..KKK.....KKK...',
  '..KKK.....KKK...',
  '................',
  '................',
  '................',
];
const DOZER = [
  '................',
  '.KKKKK..........',
  '.KKKKK....KKKK..',
  '.KKKKK....KKKK..',
  'Y.GGGGGGGGGG....',
  'Y.GWWWWGGGGGGD..',
  'YYGWBBWGGGGGGD..',
  'YYGWBBWGGGGGGD..',
  'Y.GWWWWGGGGGGD..',
  'Y.GGGGGGGGGG....',
  '.KKKKK....KKKK..',
  '.KKKKK....KKKK..',
  '.KKKKK..........',
  '................',
  '................',
  '................',
];
const TRUCK = [
  '................................',
  '..KKK.......KKK.......KKK.KKK...',
  '..KKK.......KKK.......KKK.KKK...',
  '.CCCCCC.WWWWWWWWWWWWWWWWWWWWWWW.',
  'CCBBCCC.WWWWWWWWWWWWWWWWWWWWWWWW',
  'CCBBCCCKWSSWWWWWWWWWWWWWWWWWSSWW',
  'CCBBCCCKWSSWWWWWWWWWWWWWWWWWSSWW',
  'CCBBCCCKWSSWWWWWWWWWWWWWWWWWSSWW',
  'CCBBCCCKWSSWWWWWWWWWWWWWWWWWSSWW',
  'CCBBCCC.WWWWWWWWWWWWWWWWWWWWWWWW',
  '.CCCCCC.WWWWWWWWWWWWWWWWWWWWWWW.',
  '..KKK.......KKK.......KKK.KKK...',
  '..KKK.......KKK.......KKK.KKK...',
  '................................',
  '................................',
  '................................',
];
const VPAL = { K: '#202020', W: '#fcfcfc', B: '#2038a8', D: '#fc5c00', Y: '#fcd800', G: '#00a844', S: '#bcbcbc' };
const VEH = {
  yellow: makeSprite(CAR, { ...VPAL, C: '#fcd800' }),
  pink: makeSprite(CAR, { ...VPAL, C: '#fc5cc8' }),
  racer: makeSprite(RACER, { ...VPAL, C: '#fcfcfc', B: '#d82800' }),
  dozer: makeSprite(DOZER, VPAL),
  truck: makeSprite(TRUCK, { ...VPAL, C: '#d87c00' }),
};

const TURTLE_PAL = { R: '#d82800', r: '#881400', G: '#5cc85c', K: '#000', W: '#fcfcfc' };
const TURTLE = [
  makeSprite([
    '................',
    '..G........G....',
    '...G.rrrr.G.....',
    '....rRRRRr......',
    '...rRrRRrRr..G..',
    'GGrRRRRRRRRrGGG.',
    'GKrRrRRRRrRr....',
    'GGrRRRRRRRRr....',
    'GGrRRRRRRRRrGGG.',
    'GWrRrRRRRrRr.G..',
    '..rRRRRRRRRr....',
    '...rRRRRRRr.....',
    '...G.rrrr.G.....',
    '..G........G....',
    '................',
    '................',
  ], TURTLE_PAL),
  makeSprite([
    '................',
    '................',
    '....G.rrrr.G....',
    '....rRRRRr.G....',
    '...rRrRRrRr.....',
    'GGrRRRRRRRRrG...',
    'GKrRrRRRRrRrGG..',
    'GGrRRRRRRRRr....',
    'GGrRRRRRRRRrG...',
    'GWrRrRRRRrRrGG..',
    '..rRRRRRRRRr....',
    '...rRRRRRRr.....',
    '....G.rrrr.G....',
    '...........G....',
    '................',
    '................',
  ], TURTLE_PAL),
];
const TURTLE_SINK = makeSprite([
  '................',
  '................',
  '................',
  '................',
  '.....rrrrr......',
  '....rRrRRrr.....',
  '...rRRRRRRRr....',
  '...rRrRRRrRr....',
  '...rRRRRRRRr....',
  '....rRrRRrr.....',
  '.....rrrrr......',
  '................',
  '................',
  '................',
  '................',
  '................',
], { R: '#683030', r: '#401818' });
const FLY = makeSprite([
  '.W....W.',
  'WWW..WWW',
  '.WWBBWW.',
  '..BBBB..',
  '..BBBB..',
  '...BB...',
], { W: '#bcd8fc', B: '#2050fc' });
const CROC_HEAD = makeSprite([
  '................',
  '..GG........GG..',
  '.GYGG......GGYG.',
  '.GGGGG....GGGGG.',
  '..GGGGGGGGGGGG..',
  '..GgGgGGGGgGgG..',
  '...GGGGGGGGGG...',
  '...WGWGWGWGWG...',
  '...G........G...',
  '...WGWGWGWGWG...',
  '...GGGGGGGGGG...',
  '....GGGGGGGG....',
  '.....GGGGGG.....',
  '......GGGG......',
  '................',
], { G: '#20a020', g: '#106010', Y: '#fcfc54', W: '#fff' });
const CROC_BODY = makeSprite([
  '................................................',
  '....G.....G.....G.....G.........................',
  '...GGG...GGG...GGG...GGG........................',
  '.GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....',
  'GGgGGgGGgGGgGGgGGgGGgGGgGGgGGgGGgGGGGGGGGGGGGGG.',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGYYGGGGGG',
  'gGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGW',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
  'GGgGGgGGgGGgGGgGGgGGgGGgGGgGGgGGgGGGGGGGWGWGWGWG',
  '.GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...........',
  '...GGG...GGG...GGG...GGG.......GGGG.............',
  '....G.....G.....G.....G.........................',
  '................................................',
], { G: '#20a020', g: '#106010', Y: '#fcfc54', W: '#fff' });
const CROC_OPEN = makeSprite([
  '................................................',
  '....G.....G.....G.....G.........................',
  '...GGG...GGG...GGG...GGG.....................GG.',
  '.GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWGGG.',
  'GGgGGgGGgGGgGGgGGgGGgGGgGGgGGgGGgGGGGGGGGGGGG...',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGYYGG....',
  'gGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGR.....',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG.....',
  'GGgGGgGGgGGgGGgGGgGGgGGgGGgGGgGGgGGGGGGGGGGGG...',
  '.GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGWGGGG.',
  '...GGG...GGG...GGG...GGG.......GGGG..........GG.',
  '....G.....G.....G.....G.........................',
  '................................................',
], { G: '#20a020', g: '#106010', Y: '#fcfc54', W: '#fff', R: '#fc3c3c' });
const SKULL = makeSprite([
  '................',
  '.W............W.',
  'WWW..WWWWWW..WWW',
  '.WWWWWWWWWWWWWW.',
  '....WWWWWWWW....',
  '...WWWWWWWWWW...',
  '...WKKWWWWKKW...',
  '...WKKWWWWKKW...',
  '...WWWWKKWWWW...',
  '....WWWWWWWW....',
  '.....W.W.W.W....',
  '.WWWWWWWWWWWWWW.',
  'WWW..........WWW',
  '.W............W.',
  '................',
  '................',
], { W: '#fcfcfc', K: '#000' });
const SPLAT = [
  makeSprite([
    '................',
    '..L....L....L...',
    '...G...G...G....',
    '....GLLLLLG.....',
    '.L.GLRYYRLLG.L..',
    '..GLYYYYYYYLG...',
    'LGLLYYYRYYYLLGL.',
    '..GLYYYYYYYLG...',
    '.L.GLLYYYLLG.L..',
    '....GLLLLLG.....',
    '...G...G...G....',
    '..L....L....L...',
    '................',
    '................',
    '................',
    '................',
  ], FROG_PAL),
  makeSprite([
    '................',
    'R.....R......R..',
    '..R..YRY...R....',
    '...RYYYYYR......',
    '..RYYRRRYYR..R..',
    'R.YYRRWRRYY.....',
    '..RYRRRRRYR.R...',
    '...RYYRYYR......',
    '.R...RYR...R....',
    '..R...R.....R...',
    'R.........R.....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ], { R: '#fc3c3c', Y: '#fcfc54', W: '#fff' }),
];

// Şerit tanımları: satır, yön*hız, tür, nesneler (x, genişlik), periyot
function makeLanes(level) {
  const m = 1 + level * 0.18;
  const L = (row, v, kind, xs, w, span, extra = {}) => ({
    row, v: v * m, kind, span, items: xs.map((x, i) => ({ x, w, ...(extra.items?.[i] || {}) })),
  });
  const lanes = [
    // Yol
    L(12, -0.6, 'yellow', [0, 72, 144], 16, 240),
    L(11, 0.45, 'dozer', [16, 96, 176], 16, 240),
    L(10, -0.8, 'pink', [8, 68, 148], 16, 240),
    L(9, 1.7, 'racer', level >= 2 ? [40, 160] : [40], 16, 256),
    L(8, -0.55, 'truck', [32, 144], 32, 256),
    // Nehir
    L(6, -0.7, 'turtle', [0, 96, 192], 48, 288, { items: [{ dive: false }, { dive: true, phase: 0 }, { dive: level >= 1, phase: 120 }] }),
    L(5, 0.45, 'log', [0, 112, 224], 48, 320),
    L(4, 1.3, 'log', [0, 176], 96, 352),
    L(3, -0.8, 'turtle', [0, 64, 128, 192], 32, 256, { items: [{ dive: true, phase: 60 }, {}, { dive: level >= 2, phase: 180 }, {}] }),
    L(2, 0.8, 'log', [0, 104, 208], 64, 312),
  ];
  // Seviye 3'ten sonra üst nehirde bir kütük timsah olur
  if (level >= 2) {
    const top = lanes[lanes.length - 1];
    top.items[1].croc = true;
    top.items[1].w = 48;
  }
  for (const ln of lanes) {
    ln.water = ln.row >= 2 && ln.row <= 6;
    for (const it of ln.items) { it.dive = !!it.dive; it.phase = it.phase || 0; }
  }
  return lanes;
}

export default class Frogger {
  constructor(api) {
    this.api = api;
    this.level = 0;
    this.lives = 4;
    this.homes = [false, false, false, false, false];
    this.lanes = makeLanes(0);
    this.t = 0;
    this.fly = null;
    this.croc = null;
    this.bonusTimer = 300;
    this.msg = null;
    this.particles = [];
    this.respawn();
    if (api.preview) {
      this.homes = [true, false, true, false, false];
      // Trafik oturmuş görünsün
      for (let i = 0; i < 240; i++) this.moveLanes();
    }
  }

  respawn() {
    this.frog = { x: 104, y: START_ROW * T, dir: 0, hop: 0, hx: 0, hy: 0, best: START_ROW, dead: 0, cause: null, queue: null };
    this.timer = Math.max(60 * 25, TIME_MAX - this.level * 120);
    this.timerMax = this.timer;
  }

  laneAtRow(r) {
    return this.lanes.find((l) => l.row === r);
  }

  // Kaplumbağa dalış durumu: 0 yüzeyde, 1 batıyor, 2 suyun altında, 3 çıkıyor
  diveState(it) {
    if (!it.dive) return 0;
    const p = (this.t + it.phase) % 300;
    if (p < 180) return 0;
    if (p < 210) return 1;
    if (p < 250) return 2;
    if (p < 280) return 1;
    return 0;
  }

  moveLanes() {
    this.t++;
    for (const ln of this.lanes) {
      for (const it of ln.items) {
        it.x += ln.v;
        if (ln.v > 0 && it.x >= ln.span - it.w) it.x -= ln.span;
        if (ln.v < 0 && it.x < -it.w) it.x += ln.span;
      }
    }
  }

  // Nesnenin ekrandaki görünür x'leri (sarma dahil)
  itemXs(ln, it) {
    return [it.x, it.x - ln.span, it.x + ln.span];
  }

  platformUnder(cx, row) {
    const ln = this.laneAtRow(row);
    if (!ln) return null;
    for (const it of ln.items) {
      for (const x of this.itemXs(ln, it)) {
        if (cx >= x + 2 && cx < x + it.w - 2) {
          if (ln.kind === 'turtle' && this.diveState(it) === 2) return null;
          return { ln, it, x };
        }
      }
    }
    return null;
  }

  vehicleHit(fx, row) {
    const ln = this.laneAtRow(row);
    if (!ln || ln.water) return false;
    for (const it of ln.items) {
      for (const x of this.itemXs(ln, it)) {
        if (fx + 3 < x + it.w - 1 && fx + 13 > x + 1) return true;
      }
    }
    return false;
  }

  kill(cause) {
    const f = this.frog;
    if (f.dead) return;
    f.dead = 1;
    f.cause = cause;
    f.hop = 0;
    if (cause === 'water') this.api.sfx.noise(0.4, { vol: 0.25, freq: 700 });
    else this.api.sfx.play('hit');
    this.api.sfx.tone(600, 0.6, { slide: 80, type: 'triangle', vol: 0.15, delay: 0.15 });
  }

  tryHop(dir) {
    const f = this.frog;
    const dx = [0, 1, 0, -1][dir];
    const dy = [-1, 0, 1, 0][dir];
    const row = f.y / T + dy;
    if (row > START_ROW) return;
    if (f.x + dx * T < -2 || f.x + dx * T > W - 14) return;
    f.dir = dir;
    f.hop = 8;
    f.hx = dx;
    f.hy = dy;
    this.api.sfx.tone(dir === 0 ? 520 : 440, 0.05, { type: 'square', vol: 0.06, slide: 700 });
  }

  landHome() {
    const f = this.frog;
    const cx = f.x + 8;
    const i = BAY_X.findIndex((bx) => Math.abs(cx - (bx + 8)) <= 8);
    if (i < 0 || this.homes[i]) { this.kill('hedge'); return; }
    if (this.croc && this.croc.bay === i && this.croc.t > 60) { this.kill('croc'); return; }
    this.homes[i] = true;
    let pts = 50 + 10 * Math.floor(this.timer / 30);
    if (this.fly && this.fly.bay === i) { pts += 200; this.fly = null; this.msg = { text: 'SİNEK +200', t: 60 }; }
    this.api.addScore(pts);
    this.api.sfx.play('coin');
    if (this.homes.every(Boolean)) {
      this.api.addScore(1000);
      this.levelClear = 150;
      this.api.sfx.play('levelup');
      this.msg = { text: 'TEBRİKLER! +1000', t: 150 };
      this.frog.dead = 0;
      this.frog.hidden = true;
      return;
    }
    this.respawn();
  }

  update() {
    const { input, preview, sfx } = this.api;
    if (this.msg && --this.msg.t <= 0) this.msg = null;

    if (this.levelClear) {
      this.moveLanes();
      if (--this.levelClear <= 0) {
        this.level++;
        this.homes = [false, false, false, false, false];
        this.lanes = makeLanes(this.level);
        this.fly = null;
        this.croc = null;
        this.respawn();
        this.msg = { text: `SEVİYE ${this.level + 1}`, t: 90 };
      }
      return;
    }

    this.moveLanes();
    this.updateBonuses();
    const f = this.frog;

    if (f.dead) {
      f.dead++;
      if (f.dead > 80) {
        this.lives--;
        if (this.lives <= 0) {
          this.lives = 0;
          if (!this.overDone) { this.overDone = true; sfx.play('gameover'); this.api.gameOver(); }
          f.dead = 80;
          return;
        }
        this.respawn();
      }
      return;
    }

    // Zaman
    if (--this.timer <= 0) { this.kill('time'); this.msg = { text: 'ZAMAN DOLDU', t: 80 }; return; }
    if (this.timer === 60 * 10) sfx.tone(880, 0.1, { vol: 0.1 });

    // Giriş
    let want = null;
    if (preview) want = this.autopilot();
    else {
      if (input.pressed('up') || input.pressed('a')) want = 0;
      else if (input.pressed('right')) want = 1;
      else if (input.pressed('down')) want = 2;
      else if (input.pressed('left')) want = 3;
    }
    if (f.hop) {
      if (want !== null) f.queue = want;
      f.x += f.hx * 2;
      f.y += f.hy * 2;
      f.hop--;
      if (f.hop === 0) {
        const row = Math.round(f.y / T);
        f.y = row * T;
        if (row < f.best) {
          f.best = row;
          if (row > HOME_ROW) this.api.addScore(10);
        }
        if (row === HOME_ROW) { this.landHome(); return; }
      }
    } else {
      if (want === null && f.queue !== null) { want = f.queue; }
      f.queue = null;
      if (want !== null) this.tryHop(want);
    }

    const row = Math.round(f.y / T);
    const ln = this.laneAtRow(row);
    // Araç çarpması (zıplarken de)
    if (this.vehicleHit(f.x, row) || (f.hop && this.vehicleHit(f.x, f.hy > 0 ? Math.ceil(f.y / T) : Math.floor(f.y / T)))) {
      this.kill('road');
      return;
    }
    // Nehir
    if (ln?.water && !f.hop) {
      const pl = this.platformUnder(f.x + 8, row);
      if (!pl) { this.kill('water'); return; }
      if (pl.it.croc) {
        // Timsahın ağzı (ön kısmı) açıkken üstüne basma
        const head = ln.v > 0 ? pl.x + pl.it.w - 16 : pl.x;
        if (f.x + 8 >= head && f.x + 8 < head + 16 && this.crocOpen()) { this.kill('croc'); return; }
      }
      f.x += ln.v;
      if (f.x < -6 || f.x > W - 10) { this.kill('water'); return; }
    } else if (ln?.water && f.hop) {
      // Zıplarken de akıntıyla sürüklen
      f.x += ln.v * 0.5;
    }
  }

  crocOpen() { return (this.t >> 6) % 2 === 1; }

  updateBonuses() {
    const free = this.homes.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
    if (this.fly && --this.fly.t <= 0) this.fly = null;
    if (this.croc && --this.croc.t <= 0) this.croc = null;
    if (--this.bonusTimer <= 0) {
      this.bonusTimer = this.api.randInt(240, 420);
      if (!free.length) return;
      const bay = this.api.pick(free);
      if (this.level >= 1 && Math.random() < 0.4) {
        if (!this.croc && (!this.fly || this.fly.bay !== bay)) this.croc = { bay, t: 260 };
      } else if (!this.fly && (!this.croc || this.croc.bay !== bay)) {
        this.fly = { bay, t: 300 };
      }
    }
    if (this.fly && this.homes[this.fly.bay]) this.fly = null;
    if (this.croc && this.homes[this.croc.bay]) this.croc = null;
  }

  // Önizleme: güvenliyse yukarı zıpla
  autopilot() {
    const f = this.frog;
    if (f.hop || f.dead) return null;
    const row = Math.round(f.y / T);
    const next = row - 1;
    if (next === HOME_ROW) {
      const cx = f.x + 8;
      const i = BAY_X.findIndex((bx, k) => !this.homes[k] && Math.abs(cx - (bx + 8)) <= 6);
      return i >= 0 ? 0 : null;
    }
    const ln = this.laneAtRow(next);
    if (!ln) return 0;
    if (ln.water) {
      // 8 kare sonra altında platform olacak mı?
      const save = this.lanes.map((l) => l.items.map((it) => it.x));
      for (let k = 0; k < 8; k++) for (const l of this.lanes) for (const it of l.items) it.x += l.v;
      const ok = this.platformUnder(f.x + 8 + (this.laneAtRow(row)?.water ? this.laneAtRow(row).v * 8 : 0), next);
      this.lanes.forEach((l, i) => l.items.forEach((it, j) => { it.x = save[i][j]; }));
      return ok && Math.abs(ok.x + ok.it.w / 2 - (f.x + 8)) < ok.it.w / 2 - 6 ? 0 : null;
    }
    for (let k = 0; k <= 14; k += 2) {
      const fx = f.x;
      const hit = ln.items.some((it) => this.itemXs(ln, it).some((x0) => {
        const x = x0 + ln.v * k;
        return fx + 1 < x + it.w && fx + 15 > x;
      }));
      if (hit) return null;
    }
    return 0;
  }

  // ----- Çizim -----
  drawLog(x, y, w) {
    const { gfx } = this.api;
    gfx.rect(x + 2, y + 3, w - 4, 10, '#8c4c14');
    gfx.rect(x + 2, y + 4, w - 4, 2, '#c87c3c');
    gfx.rect(x + 2, y + 11, w - 4, 2, '#5c2c08');
    for (let i = 10; i < w - 6; i += 14) gfx.rect(x + i, y + 7, 6, 1, '#5c2c08');
    // Uçlar
    gfx.rect(x, y + 4, 3, 8, '#e8b080');
    gfx.rect(x + 1, y + 6, 1, 4, '#8c4c14');
    gfx.rect(x + w - 3, y + 4, 3, 8, '#e8b080');
    gfx.rect(x + w - 2, y + 6, 1, 4, '#8c4c14');
  }

  draw() {
    const { gfx, score, hiScore, frame } = this.api;
    gfx.cls('#000');
    // Nehir
    gfx.rect(0, 2 * T, W, 5 * T, '#000047');
    for (let r = 2; r <= 6; r++) {
      for (let x = (r * 37 + Math.floor(this.t / 6)) % 40 - 40; x < W; x += 40) gfx.rect(x, r * T + 12, 6, 1, '#1c1c8c');
    }
    // Üst çit ve yuvalar
    gfx.rect(0, T, W, T, '#000047');
    gfx.rect(0, T - 4, W, 6, '#00a800');
    for (let x = 0; x < W; x += 4) gfx.rect(x + (x % 8 ? 0 : 2), T - 4, 2, 2, '#5cfc5c');
    for (let i = 0; i <= 5; i++) {
      const x0 = i === 0 ? 0 : BAY_X[i - 1] + 20;
      const x1 = i === 5 ? W : BAY_X[i] - 4;
      gfx.rect(x0, T, x1 - x0, T, '#00a800');
      for (let y = T + 2; y < 2 * T; y += 4) for (let x = x0 + (y % 8 ? 1 : 3); x < x1 - 1; x += 4) gfx.rect(x, y, 2, 2, '#007000');
    }
    // Kaldırımlar
    for (const r of [MEDIAN_ROW, START_ROW]) {
      gfx.rect(0, r * T, W, T, '#6c1c9c');
      for (let x = 0; x < W; x += 8) {
        gfx.rect(x, r * T, 7, 7, '#9c3cd8');
        gfx.rect(x + 4, r * T + 8, 7, 7, '#9c3cd8');
      }
      gfx.rect(0, r * T, W, 1, '#c87cfc');
    }
    // Yol şerit çizgileri
    for (let r = 9; r <= 12; r++) for (let x = 4; x < W; x += 24) gfx.rect(x, r * T, 10, 1, '#5c5c5c');

    // Şerit nesneleri
    for (const ln of this.lanes) {
      const y = ln.row * T;
      for (const it of ln.items) {
        for (const x of this.itemXs(ln, it)) {
          if (x > W || x + it.w < 0) continue;
          if (ln.kind === 'log') {
            if (it.croc) gfx.sprite(this.crocOpen() ? CROC_OPEN : CROC_BODY, x, y + 2, { flipX: ln.v < 0 });
            else this.drawLog(x, y, it.w);
          } else if (ln.kind === 'turtle') {
            const ds = this.diveState(it);
            for (let k = 0; k < it.w / T; k++) {
              const tx = x + k * T;
              if (ds === 0) gfx.sprite(TURTLE[((this.t >> 4) + k) % 2], tx, y, { flipX: ln.v > 0 });
              else if (ds === 1) gfx.sprite(TURTLE_SINK, tx, y);
              else {
                gfx.rect(tx + 5, y + 7, 2, 2, '#3c5cfc');
                gfx.rect(tx + 9, y + 9, 1, 1, '#3c5cfc');
              }
            }
          } else {
            const spr = VEH[ln.kind];
            // Sprite'lar sola bakar; sağa gidenler aynalanır
            gfx.sprite(spr, x, y, { flipX: ln.v > 0 });
          }
        }
      }
    }

    // Yuvalar
    this.homes.forEach((h, i) => { if (h) gfx.sprite(HOME_FROG, BAY_X[i], T + 2); });
    if (this.fly && (this.fly.t > 60 || frame % 8 < 5)) gfx.sprite(FLY, BAY_X[this.fly.bay] + 4, T + 5);
    if (this.croc) {
      const peek = this.croc.t > 60 && this.croc.t < 230;
      gfx.sprite(CROC_HEAD, BAY_X[this.croc.bay], T + (peek ? 1 : 8));
      if (!peek) gfx.rect(BAY_X[this.croc.bay], T + 12, 16, 4, '#000047');
    }

    // Kurbağa
    const f = this.frog;
    if (!f.hidden) {
      if (f.dead) {
        const k = f.dead;
        if (f.cause === 'water' || f.cause === 'croc') {
          if (k < 40) {
            const r = 2 + (k % 20) / 3;
            gfx.circb(f.x + 8, f.y + 8, r, '#fcfcfc');
            if (k > 10) gfx.circb(f.x + 8, f.y + 8, Math.max(1, r - 4), '#6c8cfc');
          } else gfx.sprite(SKULL, f.x, f.y);
        } else if (k < 20) gfx.sprite(SPLAT[0], f.x, f.y);
        else if (k < 40) gfx.sprite(SPLAT[1], f.x, f.y);
        else gfx.sprite(SKULL, f.x, f.y);
      } else {
        gfx.sprite(FROG[f.hop ? 1 : 0][f.dir], f.x, f.y);
      }
    }

    // HUD
    gfx.text('SKOR', 4, 1, '#fcfcfc');
    gfx.text(String(score).padStart(6, '0'), 32, 1, '#fc3c3c');
    gfx.text('REKOR', 128, 1, '#fcfcfc');
    gfx.text(String(Math.max(score, hiScore)).padStart(6, '0'), W - 4, 1, '#fc3c3c', { align: 'right' });
    for (let i = 0; i < Math.min(this.lives - 1, 8); i++) gfx.sprite(LIFE, 4 + i * 10, 14 * T + 4);
    gfx.text(`SEVİYE ${this.level + 1}`, W - 4, 14 * T + 4, '#fcd800', { align: 'right' });
    // Zaman çubuğu
    const frac = Math.max(0, this.timer / this.timerMax);
    const bw = Math.round(150 * frac);
    gfx.rect(W - 40 - bw, 15 * T + 4, bw, 8, frac < 0.25 ? (frame % 10 < 5 ? '#fc3c3c' : '#fcd800') : '#00d800');
    gfx.text('ZAMAN', W - 4, 15 * T + 5, '#fcd800', { align: 'right' });

    if (this.msg) {
      const w = gfx.textWidth(this.msg.text) + 10;
      gfx.rect(W / 2 - w / 2, MEDIAN_ROW * T + 1, w, 14, '#000');
      gfx.text(this.msg.text, W / 2, MEDIAN_ROW * T + 5, frame % 10 < 6 ? '#fcfcfc' : '#fcd800', { align: 'center' });
    }
    if (this.lives <= 0) {
      gfx.rect(W / 2 - 40, MEDIAN_ROW * T + 1, 80, 14, '#000');
      gfx.text('OYUN BİTTİ', W / 2, MEDIAN_ROW * T + 5, '#fc3c3c', { align: 'center' });
    }
  }
}
