// Sokak Dövüşçüsü — Street Fighter II tarzı, bilgisayara karşı birebir dövüş.
// Karakter seçimi, salon merdiveni, 3 rauntluk maçlar, hareket girdili özel vuruşlar.
import { makeSprite } from '../../js/engine/gfx.js';
import { P, solve, toWorld, drawGroup, seg, tones, mix, FLASH, pline, headSet } from './art.js';
import { STAGE_W, VIEW_W, GY, getStage, drawStage, STAGE_NAMES } from './stages.js';

export const meta = {
  id: 'sokak-dovuscusu',
  width: 320,
  height: 224,
  buttons: { a: 'YUMRUK', b: 'TEKME', c: 'ÖZEL' },
  help: [
    'Geri tut: blok (alçak vuruşlara karşı çömelerek). Yukarı: zıpla, aşağı: çömel.',
    'Yakındayken ileri/geri + YUMRUK: fırlatma.',
    'C: karakterin özel hareketi. Ya da hareket girdisi: KEREM ↓↘→+A, AYLA ↓↙←+B, BORA ↓↙←+A, TUNCAY →↓↘+B.',
    'Normal vuruş isabet edince özel harekete bağlayabilirsin (kombo).',
    'Raunt sonu: zaman, can ve mükemmel bonusu. Maçı kaybedersen oyun biter.',
  ],
};

const W = 320;
const H = 224;
const GRAV = 0.36;
const D2R = Math.PI / 180;

// ---------------- Kafalar ----------------
const HEADPAL = {
  K: '#1a1014', W: '#ffffff', E: '#1a1a2a', M: '#a83838',
};
const HEADS = {
  kerem: {
    rows: [
      '....KKKKKK....',
      '..KKHHHHHHKK..',
      '.KHHHHHhhHHHK.',
      '.KHHHhhHHHHHHK',
      'KRRRRRRRRRRRRK',
      'KrRRRRRRRRRRRK',
      'KHHSSSSSSSSSSK',
      'KHSSKKSSSKKSK.',
      '.KSSWESSSWESK.',
      '.KsSSSSSSSSSK.',
      '.KsSSSSSSsSSK.',
      '..KsSSSSSSSK..',
      '..KsSSMMMSSK..',
      '...KsSSSSSK...',
      '....KKssKK....',
      '.....KssK.....',
    ],
    pal: { H: '#201818', h: '#4a3a34', R: '#d42020', r: '#901010', S: '#e0a070', s: '#b07048' },
  },
  ayla: {
    rows: [
      '...KKKKKK.....',
      '.KKHHHHHHKK...',
      'KHHHHHHHHHHK..',
      'KHHhhHHHHHHHK.',
      'KHHHHHHHHHHHHK',
      'KHHHHSSSHHSHHK',
      'KHHSSSSSSSSSSK',
      'KHHSKKSSSKKSK.',
      '.KHSWESSSWESK.',
      'KHHSSSSSSSSSK.',
      'KHHSSSSSSsSSK.',
      'KHHKSSSSSSSK..',
      'KHK.KSSMMSSK..',
      'KHK..KSSSSK...',
      '.K...KKssKK...',
      '.....KssK.....',
    ],
    pal: { H: '#4a2418', h: '#7a4428', S: '#f0c090', s: '#c89060' },
  },
  bora: {
    rows: [
      '....KKKKKK....',
      '..KKSSSSSSKK..',
      '.KSSSSSllSSSK.',
      '.KSSSSSSllSSSK',
      'KSSSSSSSSSSSSK',
      'KSSSSSSSSSSSSK',
      'KsSSKKKSSKKKSK',
      'KsSSWESSSWESK.',
      'KsSSSSSSSSSSK.',
      'KssSSSSSsSSSK.',
      'KsSBBBBBBBBSK.',
      '.KBBBBBBBBBBK.',
      '.KsBSSMMSSBK..',
      '..KsSSSSSSK...',
      '...KKssssKK...',
      '....KssssK....',
    ],
    pal: { S: '#d89068', s: '#a86040', l: '#f8c8a0', B: '#2a1a10' },
  },
  tuncay: {
    rows: [
      '...KKKKKKK....',
      '.KKGGGGGGGKK..',
      'KGGGGgGGGGGGK.',
      'KGGGGGGGGGGGGK',
      'KKKKKKKKKKKKKK',
      'KYYSSSSSSSSSK.',
      'KYSSSSSSSSSSSK',
      'KYSKKKKSKKKKK.',
      '.KSKkkKKKkkKK.',
      '.KsSSSSSSSSSK.',
      '.KsSSSSSSsSSK.',
      '..KsSSSSSSSK..',
      '..KsSSKKKSSK..',
      '...KsSSSSSK...',
      '....KKssKK....',
      '.....KssK.....',
    ],
    pal: { G: '#3e5e2a', g: '#6a8a4a', Y: '#e8c050', S: '#e8b080', s: '#b88050', k: '#4a5a7a' },
  },
};

function rotRows(rows, q) {
  let r = rows;
  for (let i = 0; i < q; i++) {
    // 90° saat yönü tersine: üst sola döner
    const h = r.length;
    const w = r[0].length;
    const out = [];
    for (let y = 0; y < w; y++) {
      let s = '';
      for (let x = 0; x < h; x++) s += r[x][w - 1 - y];
      out.push(s);
    }
    r = out;
  }
  return r;
}

const shadowize = (c) => mix(c, '#2a0838', 0.6);

function buildHead(id) {
  const d = HEADS[id];
  const pal = { ...HEADPAL, ...d.pal };
  const spal = {};
  for (const k in pal) spal[k] = shadowize(pal[k]);
  spal.W = '#ff60ff';
  const out = { normal: [], shadow: [] };
  for (let q = 0; q < 4; q++) {
    const rows = rotRows(d.rows, q);
    out.normal.push(headSet(rows, pal));
    out.shadow.push(headSet(rows, spal));
  }
  return out;
}

// ---------------- Karakterler ----------------
const BASE = { sp: 22, nk: 3, ua: 13, fa: 12, th: 17, sh: 17, foot: 5, tr0: 6.5, tr1: 8.5, ar0: 3.4, ar1: 2.8, fr0: 2.8, fr1: 2.6, lr0: 4.8, lr1: 3.6, sr0: 3.4, sr1: 2.6, fist: 3.2, pel: 6 };

const CHARS = [
  {
    id: 'kerem', name: 'KEREM', from: 'TÜRKİYE', style: 'KARATE', stage: 0, s: 1.2, hp: 100, spd: 1, pow: 1, jmp: 1,
    stats: [3, 3, 3], b: { ...BASE },
    col: { skin: '#e0a070', top: '#eeeae0', pants: '#eeeae0', thigh: '#eeeae0', shin: '#eeeae0', feet: '#e0a070', fist: '#c82020', belt: '#1a1a1a', wrist: null },
    sleeves: false, lapel: true, band: '#d42020',
    sp: { kind: 'fireball', name: 'ATEŞ TOPU', motion: 'qcf', btn: 'a', icons: ['d', 'df', 'f', 'A'] },
  },
  {
    id: 'ayla', name: 'AYLA', from: 'TÜRKİYE', style: 'TEKME USTASI', stage: 1, s: 1.14, hp: 90, spd: 1.25, pow: 0.92, jmp: 1.1,
    stats: [2, 5, 2],
    b: { ...BASE, tr0: 5.2, tr1: 7, ar0: 2.8, ar1: 2.4, fr0: 2.4, fr1: 2.2, lr0: 4.6, lr1: 3.4, sr0: 3.2, sr1: 2.4, fist: 2.8, pel: 5.5 },
    col: { skin: '#f0c090', top: '#2a5ad0', pants: '#2a5ad0', thigh: '#c08860', shin: '#c08860', feet: '#f4f4f4', fist: '#f0c090', belt: '#e8c040', wrist: '#e8c040' },
    sleeves: false, lapel: false,
    sp: { kind: 'spin', name: 'KASIRGA TEKMESİ', motion: 'qcb', btn: 'b', icons: ['d', 'db', 'b', 'B'] },
  },
  {
    id: 'bora', name: 'BORA', from: 'TÜRKİYE', style: 'GÜREŞÇİ', stage: 2, s: 1.3, hp: 120, spd: 0.8, pow: 1.2, jmp: 0.9,
    stats: [5, 1, 5],
    b: { ...BASE, tr0: 8, tr1: 11, ar0: 4.6, ar1: 4, fr0: 4, fr1: 3.6, lr0: 5.6, lr1: 4.4, sr0: 4.2, sr1: 3.4, fist: 4, pel: 7.5 },
    col: { skin: '#d89068', top: '#d89068', pants: '#c02828', thigh: '#d89068', shin: '#b02020', feet: '#b02020', fist: '#f0f0f0', belt: '#e8c040', wrist: '#f0f0f0' },
    sleeves: false, lapel: false, chest: true,
    sp: { kind: 'lariat', name: 'DEĞİRMEN KOLU', motion: 'qcb', btn: 'a', icons: ['d', 'db', 'b', 'A'] },
  },
  {
    id: 'tuncay', name: 'TUNCAY', from: 'TÜRKİYE', style: 'ASKER', stage: 3, s: 1.24, hp: 105, spd: 0.95, pow: 1.05, jmp: 0.95,
    stats: [4, 3, 3],
    b: { ...BASE, tr0: 7, tr1: 9, ar0: 3.9, ar1: 3.3, fr0: 3.2, fr1: 2.9, fist: 3.4 },
    col: { skin: '#e8b080', top: '#56682e', pants: '#6a7444', thigh: '#6a7444', shin: '#6a7444', feet: '#2a2a2a', fist: '#3a3a3a', belt: '#3a2a1a', wrist: null },
    sleeves: false, lapel: false, tags: true,
    sp: { kind: 'flash', name: 'ŞİMŞEK TEKMESİ', motion: 'dp', btn: 'b', icons: ['f', 'd', 'df', 'B'] },
  },
];

function prepChar(base, shadow = false) {
  const ch = { ...base, b: { ...base.b }, col: { ...base.col } };
  if (shadow) {
    for (const k in ch.col) if (ch.col[k]) ch.col[k] = shadowize(ch.col[k]);
    if (ch.band) ch.band = shadowize(ch.band);
    ch.name = `GÖLGE ${base.name}`;
    ch.hp = Math.round(base.hp * 1.1);
    ch.pow = base.pow * 1.1;
    ch.stage = 4;
  }
  const T = {};
  for (const k in ch.col) {
    if (!ch.col[k]) continue;
    T[k] = tones(ch.col[k]);
    T[`${k}B`] = tones(mix(ch.col[k], '#000000', 0.2));
  }
  ch.T = T;
  ch.heads = buildHead(base.id)[shadow ? 'shadow' : 'normal'];
  ch.b.hc = (ch.heads[0].h / 2 - 1) / ch.s;
  ch.shadow = shadow;
  return ch;
}

// ---------------- Pozlar ----------------
const POSES = {
  idle0: P(0, 31, 8, 11, 1, 6, -4, 9, 2, -11, 2),
  idle1: P(0, 30, 9, 11, 0, 6, -5, 9, 2, -11, 2),
  walk0: P(0, 31, 8, 11, 1, 6, -4, 10, 2, -10, 2),
  walk1: P(1, 32, 9, 11, 2, 6, -3, 5, 2, -2, 9),
  walk2: P(0, 31, 8, 11, 1, 6, -4, -6, 2, 8, 2),
  walk3: P(1, 32, 9, 11, 2, 6, -3, 3, 9, 2, 2),
  crouch: P(-2, 18, 20, 10, 0, 7, -5, 11, 2, -11, 2),
  prejump: P(0, 26, 15, 10, -2, 6, -6, 9, 2, -9, 2),
  jumpUp: P(0, 34, 4, 8, 6, 4, 2, 3, 2, -4, 6),
  tuck: P(0, 38, 12, 8, 4, 4, 0, 10, 24, -4, 22),
  p0: P(1, 31, 10, 5, 0, 6, -4, 10, 2, -11, 2),
  p1: P(3, 30, 16, 26, 0, 2, -10, 12, 2, -11, 2),
  k0: P(-1, 33, 0, 8, 2, 4, -3, 12, 20, -8, 2),
  k1: P(-3, 34, -14, 4, 2, -4, -2, 34, 30, -6, 2),
  cp0: P(-2, 18, 20, 5, -2, 7, -5, 11, 2, -11, 2),
  cp1: P(0, 18, 24, 24, -4, 4, -8, 12, 2, -10, 2),
  ck0: P(-3, 16, 22, 9, -2, 6, -12, 14, 4, -9, 2),
  ck1: P(-5, 13, 28, 8, -4, 4, -14, 34, 3, -9, 2),
  jp: P(0, 38, 14, 20, -10, 4, 2, 9, 22, -4, 20),
  jk0: P(0, 38, 0, 6, 4, 0, 0, 12, 26, -4, 24),
  jk: P(0, 38, -8, 4, 4, -2, 0, 28, 16, -6, 24),
  block: P(-2, 31, -2, 7, 8, 9, 4, 8, 2, -12, 2),
  cblock: P(-3, 18, 10, 7, 8, 9, 4, 10, 2, -11, 2),
  hit: P(-3, 31, -16, 2, -8, -4, -6, 9, 2, -12, 2),
  hit2: P(-5, 30, -26, -2, -4, -8, -2, 8, 2, -13, 2),
  chit: P(-3, 18, 0, 4, -6, -2, -8, 10, 2, -11, 2),
  fall: P(0, 30, -10, 4, 8, -6, 10, 14, 16, 4, 10, 60),
  down: P(0, 5, 0, 4, -20, -4, -20, 2, -29, -2, -29, 90),
  getup: P(-2, 14, 30, 8, -10, 4, -14, 14, 2, -6, 2),
  win: P(0, 33, 0, 4, 26, 4, -16, 6, 2, -8, 2),
  win2: P(0, 34, -4, 6, 22, 6, -14, 6, 2, -8, 2),
  lose: P(-1, 28, 26, 4, -16, 2, -18, 8, 2, -10, 2),
  throw0: P(2, 31, 14, 18, 2, 16, -2, 11, 2, -11, 2),
  throw1: P(-2, 31, -24, -6, 16, -10, 12, 13, 2, -9, 2),
  fb0: P(-2, 31, -6, -4, -14, -6, -12, 10, 2, -11, 2),
  fb1: P(4, 28, 18, 24, -3, 22, 1, 15, 2, -13, 2),
  spin: P(0, 36, -8, -10, 6, 12, 8, 30, 34, -2, 16),
  lariat: P(0, 31, 0, 24, 0, -24, 0, 9, 2, -9, 2),
  lariat2: P(0, 31, 0, 22, 4, -22, 4, 8, 2, -10, 2),
  flash: P(0, 34, -20, -6, 10, -10, 6, 14, 46, -4, 8),
  dizzy: P(0, 31, 10, 4, -12, -2, -14, 9, 2, -11, 2),
};

// ---------------- Vuruş verileri ----------------
// seq: [poz, kare, aktif?]
const NORMALS = {
  sp: { seq: [['p0', 3], ['p1', 4, 1], ['p0', 8]], dmg: 6, limb: 'hf', r: 5, hs: 14, bs: 10, push: 2.6, lvl: 'mid', heavy: 0 },
  sk: { seq: [['k0', 6], ['k1', 5, 1], ['k0', 13]], dmg: 10, limb: 'ff', r: 6, hs: 17, bs: 12, push: 3.2, lvl: 'mid', heavy: 1 },
  cp: { seq: [['cp0', 3], ['cp1', 4, 1], ['cp0', 7]], dmg: 5, limb: 'hf', r: 5, hs: 13, bs: 9, push: 2.4, lvl: 'mid', crouch: 1 },
  ck: { seq: [['ck0', 6], ['ck1', 6, 1], ['ck0', 19]], dmg: 9, limb: 'ff', r: 6, hs: 20, bs: 14, push: 2.8, lvl: 'low', kd: 1, crouch: 1, heavy: 1 },
  jp: { seq: [['jp', 4], ['jp', 40, 1]], dmg: 8, limb: 'hf', r: 6, hs: 16, bs: 12, push: 2, lvl: 'high', air: 1 },
  jk: { seq: [['jk0', 4], ['jk', 40, 1]], dmg: 10, limb: 'ff', r: 7, hs: 18, bs: 13, push: 2.4, lvl: 'high', air: 1, heavy: 1 },
};
for (const k in NORMALS) { NORMALS[k].normal = true; NORMALS[k].id = k; }

const SPECIALS = {
  fireball: { id: 'fireball', seq: [['fb0', 11], ['fb1', 4], ['fb1', 26]], dmg: 0, spawnAt: 1 },
  spin: { id: 'spin', seq: [['tuck', 6], ['spin', 42, 1], ['jumpUp', 40]], dmg: 6, limb: 'ff', r: 7, hs: 16, bs: 11, push: 1.2, lvl: 'mid', multi: 9, max: 3, heavy: 1, special: 1 },
  lariat: { id: 'lariat', seq: [['lariat', 5], ['lariat', 46, 1], ['idle0', 16]], dmg: 7, limb: 'hands', r: 7, hs: 16, bs: 12, push: 3, lvl: 'mid', multi: 11, max: 3, heavy: 1, special: 1, projImmune: 1 },
  flash: { id: 'flash', seq: [['crouch', 3], ['flash', 24, 1], ['fall', 60]], dmg: 15, limb: 'feet', r: 8, hs: 20, bs: 16, push: 3, lvl: 'mid', kd: 1, heavy: 1, special: 1, invuln: 9 },
};

const MOTIONS = { qcf: [[2, 3, 6], [2, 6]], qcb: [[2, 1, 4], [2, 4]], dp: [[6, 2, 3], [6, 3, 6]] };

// ---------------- Küçük sprite'lar ----------------
const ARROW_ROWS = {
  f: ['...W...', '...WW..', 'WWWWWW.', 'WWWWWWW', 'WWWWWW.', '...WW..', '...W...'],
  d: ['..WWW..', '..WWW..', '..WWW..', 'WWWWWWW', '.WWWWW.', '..WWW..', '...W...'],
  df: ['WW.....', 'WWW....', '.WWW..W', '..WWW.W', '...WWWW', '..WWWWW', '.WWWWWW'],
};
ARROW_ROWS.b = ARROW_ROWS.f.map((r) => [...r].reverse().join(''));
ARROW_ROWS.db = ARROW_ROWS.df.map((r) => [...r].reverse().join(''));

let ART = null;
function art() {
  if (ART) return ART;
  const arrows = {};
  for (const k in ARROW_ROWS) arrows[k] = makeSprite(ARROW_ROWS[k], { W: '#ffe060' });
  const fire = [
    makeSprite([
      '.......ooo........',
      '....oooOOOoo......',
      '..ooOOOyyyOOoo....',
      '.oOOyyyyyyyyOOo...',
      'oOyyyWWWWWyyyyOo..',
      'oOyyWWWWWWWWyyOOo.',
      'oOyyWWWWWWWWyyOOo.',
      'oOyyyWWWWWyyyyOo..',
      '.oOOyyyyyyyyOOo...',
      '..ooOOOyyyOOoo....',
      '....oooOOOoo......',
      '.......ooo........',
    ], { o: '#c02010', O: '#f06020', y: '#ffc030', W: '#fff8d0' }),
    makeSprite([
      '..........oo......',
      '...ooo..ooOOo.....',
      '.ooOOOooOOyyOoo...',
      'oOOyyyOOyyyyyOOo..',
      '.oyyyWWWWWyyyyOOo.',
      'oOyyWWWWWWWWyyyOo.',
      'oOyyWWWWWWWWyyyOo.',
      '.oyyyWWWWWyyyyOOo.',
      'oOOyyyOOyyyyyOOo..',
      '.ooOOOooOOyyOoo...',
      '...ooo..ooOOo.....',
      '..........oo......',
    ], { o: '#c02010', O: '#f06020', y: '#ffc030', W: '#fff8d0' }),
  ];
  const portraitBg = makeSprite(['a'], { a: '#000' });
  ART = { arrows, fire, portraitBg };
  return ART;
}

// ---------------- Dövüşçü ----------------
let ATK_ID = 1;
const blankCmd = () => ({ left: false, right: false, up: false, down: false, a: false, b: false, c: false });

class Fighter {
  constructor(ch, side, game) {
    this.ch = ch;
    this.side = side;
    this.g = game;
    this.maxHp = ch.hp;
    this.hp = ch.hp;
    this.dispHp = ch.hp;
    this.wins = 0;
    this.reset(0, 1);
  }

  reset(x, face) {
    this.x = x;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.face = face;
    this.drawFace = face;
    this.state = 'idle';
    this.t = 0;
    this.atk = null;
    this.ph = 0;
    this.pt = 0;
    this.hits = 0;
    this.hitCd = 0;
    this.stun = 0;
    this.flash = 0;
    this.buf = [];
    this.invuln = 0;
    this.airAtk = false;
    this.pose = 'idle0';
    this.rot = 0;
    this.jdir = 0;
    this.combo = 0;
    this.comboShow = 0;
    this.ko = false;
    this.airId = 0;
    this.atkId = 0;
    this.cmdBack = false;
    this.cmdDown = false;
    this.lastHitConnected = 0;
    this.sk = null;
  }

  get S() { return this.ch.s; }
  get opp() { return this.g.f[1 - this.side]; }
  get grounded() { return this.y >= 0; }
  canAct() { return ['idle', 'walk', 'crouch', 'guard', 'cguard'].includes(this.state); }
  isCrouching() { return ['crouch', 'cguard', 'cblock'].includes(this.state) || (this.state === 'attack' && this.atk?.crouch) || (this.state === 'hit' && this.hitCrouch); }

  setState(s) {
    this.state = s;
    this.t = 0;
  }

  // Yön tamponu (numpad notasyonu, yüze göre)
  record(cmd) {
    const dx = (cmd.right ? 1 : 0) - (cmd.left ? 1 : 0);
    const dy = (cmd.down ? 1 : 0) - (cmd.up ? 1 : 0);
    const fx = dx * this.face;
    const n = (dy > 0 ? 0 : dy < 0 ? 6 : 3) + (fx < 0 ? 1 : fx > 0 ? 3 : 2);
    const last = this.buf[this.buf.length - 1];
    if (!last || last.n !== n) this.buf.push({ n, f: this.g.tick });
    if (this.buf.length > 16) this.buf.shift();
    this.cmdBack = fx < 0;
    this.cmdDown = dy > 0;
    this.cmdDx = dx;
    this.cmdDy = dy;
  }

  motion(name) {
    const pats = MOTIONS[name];
    const recent = this.buf.filter((e) => this.g.tick - e.f <= 18).map((e) => e.n);
    for (const pat of pats) {
      let i = 0;
      for (const n of recent) if (n === pat[i]) i++;
      if (i >= pat.length) return true;
    }
    return false;
  }

  wantsSpecial(cmd) {
    const sp = this.ch.sp;
    if (cmd.c) return true;
    if (cmd[sp.btn] && this.motion(sp.motion)) return true;
    return false;
  }

  startAttack(def) {
    this.atk = def;
    this.ph = 0;
    this.pt = 0;
    this.hits = 0;
    this.hitCd = 0;
    this.atkId = ATK_ID++;
    this.lastHitConnected = 0;
    this.setState('attack');
    this.pose = def.seq[0][0];
    if (!def.air) this.vx = 0;
    if (!def.air && this.y >= 0) { this.vy = 0; this.y = 0; }
    this.g.whoosh(def.heavy);
  }

  startSpecial() {
    const kind = this.ch.sp.kind;
    if (kind === 'fireball' && this.g.projs.some((p) => p.owner === this)) return false;
    const def = SPECIALS[kind];
    this.startAttack(def);
    this.buf = [];
    if (kind === 'flash') this.invuln = def.invuln;
    if (kind === 'spin') { this.vy = -3.2; this.vx = 0; }
    if (kind === 'lariat') this.g.sfx.tone(220, 0.3, { slide: 440, type: 'sawtooth', vol: 0.06 });
    return true;
  }

  tryThrow(cmd) {
    const o = this.opp;
    if (!cmd.a || !(cmd.left || cmd.right)) return false;
    if (Math.abs(o.x - this.x) > 30 * this.S + 6 || !o.grounded) return false;
    if (!['idle', 'walk', 'crouch', 'guard', 'cguard'].includes(o.state) || o.invuln > 0) return false;
    this.setState('throw');
    this.pose = 'throw0';
    o.setState('thrown');
    o.pose = 'hit2';
    o.vx = 0;
    this.thrownBack = this.cmdBack;
    this.g.sfx.play('punch');
    return true;
  }

  update(cmd) {
    this.t++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.hitCd > 0) this.hitCd--;
    if (this.comboShow > 0) this.comboShow--;
    const o = this.opp;
    const spd = 1.4 * this.ch.spd;
    this.rot = 0;
    this.drawFace = this.face;

    switch (this.state) {
      case 'idle': case 'walk': case 'crouch': case 'guard': case 'cguard': {
        if (this.grounded) this.face = o.x >= this.x ? 1 : -1;
        this.drawFace = this.face;
        this.record(cmd);
        if (this.wantsSpecial(cmd) && this.startSpecial()) break;
        if (this.tryThrow(cmd)) break;
        if (cmd.a || cmd.b) {
          const crouch = cmd.down;
          this.startAttack(NORMALS[crouch ? (cmd.a ? 'cp' : 'ck') : (cmd.a ? 'sp' : 'sk')]);
          break;
        }
        if (cmd.up) {
          this.setState('prejump');
          this.jdir = this.cmdDx;
          this.pose = 'prejump';
          break;
        }
        const threat = this.g.threatTo(this);
        if (cmd.down) {
          this.vx = 0;
          if (this.state !== 'crouch' && this.state !== 'cguard') this.t = 0;
          this.state = this.cmdBack && threat ? 'cguard' : 'crouch';
          this.pose = this.state === 'cguard' ? 'cblock' : 'crouch';
          break;
        }
        if (this.cmdBack && threat) {
          this.state = 'guard';
          this.vx = 0;
          this.pose = 'block';
          break;
        }
        if (this.cmdDx) {
          if (this.state !== 'walk') { this.state = 'walk'; this.t = 0; }
          this.vx = this.cmdDx * (this.cmdBack ? spd * 0.8 : spd);
          const fr = Math.floor(this.t / 7) % 4;
          this.pose = `walk${this.cmdBack ? 3 - fr : fr}`;
        } else {
          if (this.state !== 'idle') { this.state = 'idle'; this.t = 0; }
          this.vx = 0;
          this.pose = Math.floor(this.t / 14) % 2 ? 'idle1' : 'idle0';
        }
        break;
      }
      case 'prejump':
        this.record(cmd);
        if (this.t >= 3) {
          this.setState('air');
          this.airId++;
          this.vy = -7.6 * this.ch.jmp;
          this.vx = this.jdir * 2.5 * (this.ch.spd > 1 ? 1.1 : 1);
          this.airAtk = false;
          this.g.sfx.play('jump');
        }
        break;
      case 'air': {
        this.record(cmd);
        this.vy += GRAV;
        if ((cmd.a || cmd.b) && !this.airAtk) {
          this.airAtk = true;
          const vx = this.vx;
          const vy = this.vy;
          this.startAttack(NORMALS[cmd.a ? 'jp' : 'jk']);
          this.vx = vx;
          this.vy = vy;
          break;
        }
        if (this.jdir !== 0) {
          this.pose = 'tuck';
          if (this.t > 4 && this.vy < 4) this.rot = -this.jdir * this.face * 360 * Math.min(1, (this.t - 4) / 30);
          if (Math.abs(this.rot) >= 359) this.rot = 0;
        } else {
          this.pose = this.vy < -3 || this.vy > 3 ? 'jumpUp' : 'tuck';
        }
        break;
      }
      case 'attack':
        this.record(cmd);
        this.updateAttack(cmd);
        break;
      case 'hit':
      case 'block':
        this.record(cmd);
        this.vx *= 0.85;
        if (this.state === 'hit') this.pose = this.hitCrouch ? 'chit' : (this.t < 6 ? 'hit2' : 'hit');
        else this.pose = this.cmdDown ? 'cblock' : 'block';
        if (this.t >= this.stun) {
          this.combo = 0;
          this.setState(this.cmdDown ? 'crouch' : 'idle');
        }
        break;
      case 'fall':
        this.vy += GRAV;
        this.pose = 'fall';
        this.rot = Math.min(80, this.t * 4) - 20;
        if (this.y >= 0 && this.vy > 0 && this.t > 2) {
          this.y = 0;
          if (this.bounced || this.ko) {
            this.vy = 0;
            this.setState(this.ko ? 'ko' : 'down');
            this.vx = 0;
            this.g.dust(this.x, 10);
            this.g.sfx.noise(0.15, { vol: 0.3, freq: 500 });
            this.g.shake = Math.max(this.g.shake, 4);
          } else {
            this.bounced = true;
            this.vy = -2.6;
            this.vx *= 0.5;
            this.g.dust(this.x, 6);
            this.g.sfx.noise(0.12, { vol: 0.25, freq: 600 });
          }
        }
        break;
      case 'down':
        this.pose = 'down';
        this.vx = 0;
        if (this.t >= 34) { this.setState('getup'); this.invuln = 24; }
        break;
      case 'getup':
        this.pose = this.t < 10 ? 'getup' : 'crouch';
        if (this.t >= 18) { this.setState('idle'); this.invuln = 6; this.combo = 0; }
        break;
      case 'ko':
        this.pose = 'down';
        this.vx = 0;
        break;
      case 'throw':
        this.pose = this.t < 10 ? 'throw0' : 'throw1';
        if (this.t === 10) {
          const tf = this.thrownBack ? -this.face : this.face;
          o.setState('fall');
          o.bounced = false;
          o.vy = -6;
          o.vx = tf * 3.2;
          o.y = -10;
          o.face = -tf;
          this.g.applyDamage(this, o, 13 * this.ch.pow, true);
          this.g.sfx.play('hit');
          this.g.shake = 6;
        }
        if (this.t >= 26) this.setState('idle');
        break;
      case 'thrown':
        this.pose = 'hit2';
        this.vx = 0;
        if (this.t > 30) this.setState('idle');
        break;
      case 'win':
        this.pose = Math.floor(this.t / 20) % 2 ? 'win2' : 'win';
        if (this.t < 30) this.pose = 'idle0';
        break;
      case 'lose':
        this.pose = 'lose';
        break;
      case 'intro':
        this.pose = Math.floor(this.t / 14) % 2 ? 'idle1' : 'idle0';
        this.face = o.x >= this.x ? 1 : -1;
        this.drawFace = this.face;
        break;
      default:
        break;
    }

    // Fizik
    this.x += this.vx;
    if (this.state === 'air' || this.state === 'fall' || (this.state === 'attack' && (this.atk.air || this.y < 0 || this.vy !== 0))) {
      this.y += this.vy;
    }
    if (this.y > 0 && this.state !== 'fall') { this.y = 0; if (this.vy > 0) this.vy = 0; }
    if (this.state === 'air' && this.y >= 0) {
      this.y = 0;
      this.vy = 0;
      this.vx = 0;
      this.setState('idle');
      this.g.dust(this.x, 3);
    }
    this.sk = toWorld(solve(POSES[this.pose] ? { ...POSES[this.pose], rot: this.rot || POSES[this.pose].rot } : POSES.idle0, this.ch.b), this.x, this.y, this.drawFace, this.S);
  }

  updateAttack(cmd) {
    const a = this.atk;
    const step = a.seq[this.ph];
    this.pt++;
    this.pose = step[0];
    // Kombo: normal vuruş isabet ettiyse özel harekete iptal
    if (a.normal && !a.air && this.lastHitConnected && this.wantsSpecial(cmd)) {
      if (this.startSpecial()) return;
    }
    // Özel hareket davranışları
    if (a.id === 'spin') {
      if (this.ph === 0) { if (this.y <= -22) this.vy = 0; }
      if (this.ph === 1) {
        this.vy = 0;
        this.y = Math.max(this.y, -24);
        this.vx = this.face * 2.6;
        this.drawFace = Math.floor(this.pt / 5) % 2 ? -this.face : this.face;
        if (this.pt % 10 === 0) this.g.sfx.noise(0.06, { vol: 0.12, freq: 3000 });
      }
      if (this.ph === 2) {
        this.vy += GRAV;
        this.vx = this.face * 0.6;
        if (this.y >= 0) { this.y = 0; this.vy = 0; this.vx = 0; this.atk = null; this.setState('idle'); return; }
      }
    } else if (a.id === 'lariat') {
      if (this.ph === 1) {
        this.drawFace = Math.floor(this.pt / 4) % 2 ? -this.face : this.face;
        this.pose = Math.floor(this.pt / 8) % 2 ? 'lariat2' : 'lariat';
        this.vx = this.cmdDx * 0.9;
      } else this.vx = 0;
    } else if (a.id === 'flash') {
      if (this.ph === 0) { this.vx = 0; }
      if (this.ph === 1) {
        if (this.pt === 1) { this.vy = -8.2; this.vx = -this.face * 0.9; this.g.sfx.tone(300, 0.25, { slide: 1200, vol: 0.08 }); }
        this.vy += GRAV;
        this.rot = Math.min(360, this.pt * 15);
        if (this.rot >= 360) this.rot = 0;
      }
      if (this.ph === 2) {
        this.vy += GRAV;
        this.pose = 'jumpUp';
        if (this.y >= 0) { this.y = 0; this.vy = 0; this.vx = 0; this.setState('land'); this.state = 'attack'; this.atk = { id: 'landlag', seq: [['crouch', 14]] }; this.ph = 0; this.pt = 0; return; }
      }
    } else if (a.air) {
      this.vy += GRAV;
      if (this.y >= 0 && this.vy > 0) {
        this.y = 0; this.vy = 0; this.vx = 0;
        this.atk = { id: 'landlag', seq: [['crouch', 3]] };
        this.ph = 0; this.pt = 0;
        return;
      }
    }
    if (a.spawnAt === this.ph && this.pt === 1) this.g.spawnFire(this);
    if (this.pt >= step[1]) {
      this.ph++;
      this.pt = 0;
      if (this.ph >= a.seq.length) {
        // Havada bitti mi?
        if (this.y < 0) { this.setState('air'); this.jdir = 0; this.airAtk = true; return; }
        this.atk = null;
        this.setState(this.cmdDown ? 'crouch' : 'idle');
      }
    }
  }

  activeHit() {
    if (this.state !== 'attack' || !this.atk || !this.atk.seq) return null;
    const step = this.atk.seq[this.ph];
    if (!step || !step[2] || !this.sk) return null;
    const a = this.atk;
    if (a.multi) {
      if (this.hits >= a.max || this.hitCd > 0) return null;
    } else if (this.hits > 0) return null;
    const r = a.r * this.S;
    const sk = this.sk;
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    switch (a.limb) {
      case 'hf': return [[sk.haF, r], [mid(sk.elF, sk.haF), r * 0.8]];
      case 'ff': return [[sk.toeF, r], [sk.anF, r], [mid(sk.knF, sk.anF), r * 0.8]];
      case 'feet': return [[sk.toeF, r], [sk.anF, r], [sk.knF, r]];
      case 'hands': return [[sk.haF, r], [sk.haB, r], [sk.elF, r * 0.8], [sk.elB, r * 0.8]];
      default: return null;
    }
  }

  hurtbox() {
    const s = this.state;
    if (['down', 'ko', 'getup', 'thrown'].includes(s) || this.invuln > 0) return null;
    if (s === 'fall') return null;
    const hw = 11 * this.S * (this.ch.id === 'bora' ? 1.15 : 1);
    if (this.isCrouching()) return { x0: this.x - hw, x1: this.x + hw, y0: this.y - 52 * this.S, y1: this.y };
    if (this.y < 0) return { x0: this.x - hw, x1: this.x + hw, y0: this.y - 66 * this.S, y1: this.y - 6 * this.S };
    return { x0: this.x - hw, x1: this.x + hw, y0: this.y - 74 * this.S, y1: this.y };
  }

  draw(gfx, camX, opt = {}) {
    const ox = this.x - camX;
    const oy = GY + this.y;
    let rot = this.rot || 0;
    const base = POSES[this.pose] || POSES.idle0;
    if (!rot) rot = base.rot || 0;
    const pose = rot !== base.rot ? { ...base, rot } : base;
    drawFighterArt(gfx.ctx, this.ch, pose, this.drawFace, ox, oy, this.flash > 0 && this.flash % 4 < 2, this.g.tick, opt);
  }
}

// Dövüşçü çizimi (hem oyun içi hem seçim ekranı için)
function drawFighterArt(ctx, ch, pose, face, ox, oy, flash, tick, opt = {}) {
  const b = ch.b;
  const S = ch.s;
  const L = solve(pose, b);
  const w = toWorld(L, ox, oy, face, S);
  const T = flash ? null : ch.T;
  const t = (k) => (T ? T[k] || T.skin : FLASH);
  const R = (v) => v * S;
  const up = ch.sleeves ? 'top' : 'skin';
  // Gölge (zeminde)
  if (!opt.noShadow) {
    const hgt = Math.max(0, GY - oy);
    const sw = Math.max(8, 26 - hgt / 6) * S;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(Math.round(ox - sw / 2), GY - 1, Math.round(sw), 3);
    ctx.fillRect(Math.round(ox - sw / 2 + 3), GY + 2, Math.round(sw - 6), 1);
  }
  const fist = (p, k) => seg(p, p, R(b.fist), R(b.fist), t(k));
  const wrist = (el, ha, k) => {
    const p = [ha[0] + (el[0] - ha[0]) * 0.28, ha[1] + (el[1] - ha[1]) * 0.28];
    return seg(p, p, R(b.fr1 + 0.6), R(b.fr1 + 0.6), t(k));
  };
  // Arka kol
  const armB = [seg(w.shB, w.elB, R(b.ar0), R(b.ar1), t(`${up}B`)), seg(w.elB, w.haB, R(b.fr0), R(b.fr1), t('skinB'))];
  if (ch.col.wrist) armB.push(wrist(w.elB, w.haB, 'wristB'));
  armB.push(fist(w.haB, 'fistB'));
  drawGroup(ctx, armB);
  // Arka bacak
  drawGroup(ctx, [seg(w.hipB, w.knB, R(b.lr0), R(b.lr1), t('thighB')), seg(w.knB, w.anB, R(b.sr0), R(b.sr1), t('shinB')), seg(w.anB, w.toeB, R(1.9), R(1.5), t('feetB'))]);
  // Gövde
  drawGroup(ctx, [seg(w.hipB, w.hipF, R(b.pel), R(b.pel), t('pants')), seg(w.hip, w.chest, R(b.tr0), R(b.tr1), t('top'))]);
  if (T) {
    if (ch.lapel) {
      pline(ctx, w.shF[0], w.shF[1] + 1, w.beltC[0], w.beltC[1] - 2, T.top.d);
      pline(ctx, w.shB[0], w.shB[1] + 1, w.beltC[0] + face, w.beltC[1] - 3, T.top.d);
    }
    if (ch.chest) {
      const c = w.chest;
      pline(ctx, c[0] - 4 * S, c[1] + 6, c[0] + face * 3, c[1] + 7, T.skin.d);
      pline(ctx, c[0] + face * 3, c[1] + 7, c[0] + 6 * S, c[1] + 6, T.skin.d);
    }
    if (ch.tags) {
      pline(ctx, w.chest[0] - 2, w.chest[1] + 1, w.chest[0] + face * 2, w.chest[1] + 8, '#c0c0c0');
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(Math.round(w.chest[0] + face * 2), Math.round(w.chest[1] + 8), 2, 3);
    }
  }
  // Kemer
  drawGroup(ctx, [seg(w.beltA, w.beltZ, R(1.4), R(1.4), t('belt'))]);
  if (T && ch.id === 'kerem') {
    pline(ctx, w.beltC[0] + face * 3, w.beltC[1], w.beltC[0] + face * 1, w.beltC[1] + 9, T.belt.m);
    pline(ctx, w.beltC[0] + face * 4, w.beltC[1], w.beltC[0] + face * 5, w.beltC[1] + 8, T.belt.m);
  }
  // Boyun + kafa
  drawGroup(ctx, [seg(w.chest, w.neck, R(2.4), R(2.4), t('skin'))]);
  const L2 = solveHeadC(L, pose, b);
  const hc = [ox + face * L2[0] * S, oy - L2[1] * S];
  let q = Math.round(((pose.rot || 0) % 360) / 90);
  q = ((q % 4) + 4) % 4;
  const hs = ch.heads[q];
  const spr = flash ? (face > 0 ? hs.wr : hs.wl) : (face > 0 ? hs.r : hs.l);
  // Bandana kuyruğu (kafanın arkasında)
  if (ch.band && !flash && q === 0) {
    const bx = hc[0] - face * (hs.w / 2);
    const by = hc[1] - hs.h / 2 + 5;
    const wv = Math.sin(tick / 5) * 2;
    pline(ctx, bx, by, bx - face * 8, by + 3 + wv, ch.band);
    pline(ctx, bx, by + 1, bx - face * 7, by + 6 + wv * 0.5, ch.band);
    pline(ctx, bx, by + 2, bx - face * 6, by + 6 + wv, mix(ch.band, '#000', 0.4));
  }
  ctx.drawImage(spr, Math.round(hc[0] - spr.width / 2), Math.round(hc[1] - spr.height / 2));
  // Ön bacak
  drawGroup(ctx, [seg(w.hipF, w.knF, R(b.lr0), R(b.lr1), t('thigh')), seg(w.knF, w.anF, R(b.sr0), R(b.sr1), t('shin')), seg(w.anF, w.toeF, R(1.9), R(1.5), t('feet'))]);
  // Ön kol
  const armF = [seg(w.shF, w.elF, R(b.ar0), R(b.ar1), t(up)), seg(w.elF, w.haF, R(b.fr0), R(b.fr1), t('skin'))];
  if (ch.col.wrist) armF.push(wrist(w.elF, w.haF, 'wrist'));
  armF.push(fist(w.haF, 'fist'));
  drawGroup(ctx, armF);
}

function solveHeadC(L, pose, b) {
  const ln = pose.lean * D2R;
  const ux = Math.sin(ln);
  const uy = Math.cos(ln);
  let x = L.neck[0];
  let y = L.neck[1];
  let dx = ux * b.hc;
  let dy = uy * b.hc;
  if (pose.rot) {
    const a = pose.rot * D2R;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const ndx = dx * c - dy * s;
    const ndy = dx * s + dy * c;
    dx = ndx;
    dy = ndy;
  }
  return [x + dx, y + dy];
}

// ---------------- Bilgisayar zekası ----------------
class Brain {
  constructor(lv) {
    this.lv = lv;
    this.plan = 'wait';
    this.pt = 10;
    this.seenAtk = 0;
    this.blockRoll = false;
    this.seenAir = -1;
    this.aa = false;
    this.seenProj = 0;
    this.projPlan = 'none';
    this.cancelTried = 0;
    this.guardT = 0;
    this.cool = 0;
  }

  get(me, op, g) {
    const c = blankCmd();
    const lv = this.lv;
    const f = me.face;
    const fw = () => { if (f > 0) c.right = true; else c.left = true; };
    const bk = () => { if (f > 0) c.left = true; else c.right = true; };
    const dist = Math.abs(op.x - me.x);
    const R = Math.random;
    const kind = me.ch.sp.kind;

    if (me.state === 'hit' || me.state === 'block') {
      if (this.guardT > 0 || R() < lv * 0.5) { bk(); if (op.atk?.lvl === 'low' || op.isCrouching()) c.down = true; }
      return c;
    }
    // Kendi saldırısı sırasında kombo iptali
    if (me.state === 'attack') {
      if (me.atk?.normal && me.lastHitConnected && this.cancelTried !== me.atkId) {
        this.cancelTried = me.atkId;
        if (R() < lv * 0.55 && dist < 70) c.c = true;
      }
      if (kind === 'lariat' && me.atk?.id === 'lariat') fw();
      return c;
    }
    if (me.state === 'air') {
      if (!me.airAtk && op.y > -40 && dist < 60 && me.vy > -1) c[R() < 0.5 ? 'a' : 'b'] = true;
      return c;
    }
    if (!me.canAct()) return c;
    if (this.cool > 0) this.cool--;

    // 1) Rakip saldırıyor: blok
    if (op.state === 'attack' && op.atk && op.atkId !== this.seenAtk) {
      this.seenAtk = op.atkId;
      this.blockRoll = R() < 0.12 + 0.62 * lv;
    }
    if (op.state === 'attack' && op.atk && this.blockRoll && dist < 120 && !op.atk.spawnAt) {
      bk();
      if (op.atk.lvl === 'low' || (op.atk.crouch && R() < 0.8)) c.down = true;
      this.guardT = 8;
      return c;
    }
    if (this.guardT > 0) { this.guardT--; bk(); if (op.isCrouching()) c.down = true; return c; }

    // 2) Gelen ateş topu
    const pr = g.projs.find((p) => p.owner === op && Math.sign(p.vx) === Math.sign(me.x - p.x) && Math.abs(p.x - me.x) < 170);
    if (pr) {
      if (pr.id !== this.seenProj) {
        this.seenProj = pr.id;
        const r = R();
        if (r < 0.15 + 0.55 * lv) {
          if (kind === 'lariat' || kind === 'spin') this.projPlan = R() < 0.6 ? 'special' : 'block';
          else this.projPlan = R() < 0.45 && lv > 0.35 ? 'jump' : 'block';
        } else this.projPlan = 'none';
      }
      const pd = Math.abs(pr.x - me.x);
      if (this.projPlan === 'block') { bk(); return c; }
      if (this.projPlan === 'jump' && pd < 90 && pd > 40) { c.up = true; fw(); this.projPlan = 'none'; return c; }
      if (this.projPlan === 'special' && pd < 70) { c.c = true; this.projPlan = 'none'; return c; }
    }

    // 3) Havadan gelen rakip: hava savunması
    if (op.state === 'air' || (op.state === 'attack' && op.atk?.air)) {
      if (op.airId !== this.seenAir) {
        this.seenAir = op.airId;
        this.aa = R() < 0.18 + 0.7 * lv;
        this.aaBlock = R() < 0.3 + 0.5 * lv;
      }
      if (this.aa && dist < 72 && op.vy > -2 && op.y < -16) {
        this.aa = false;
        if (kind === 'flash' || kind === 'lariat') c.c = true;
        else if (dist < 48) { c.down = true; c.a = true; } else c.b = true;
        return c;
      }
      if (!this.aa && this.aaBlock && dist < 100) { bk(); return c; }
    }

    // 4) Plan
    if (--this.pt <= 0) this.choose(me, op, g, dist);
    const tooFarFire = kind === 'fireball' && dist > 110 && !g.projs.some((p) => p.owner === me);
    switch (this.plan) {
      case 'fwd': fw(); break;
      case 'back': bk(); break;
      case 'crouch': c.down = true; if (R() < 0.3) bk(); break;
      case 'guard': bk(); if (op.isCrouching()) c.down = true; break;
      case 'jump': c.up = true; fw(); this.plan = 'wait'; this.pt = 30; break;
      case 'fire':
        if (tooFarFire || dist > 60) { c.c = true; }
        this.plan = 'wait';
        this.pt = 26 - Math.floor(lv * 12);
        break;
      case 'poke': {
        if (dist > 62 * me.S) { fw(); break; }
        const r = R();
        if (dist < 30 * me.S + 6 && r < 0.25 + lv * 0.2) { c.a = true; fw(); } // fırlatma
        else if (r < 0.4) c.a = true;
        else if (r < 0.7) c.b = true;
        else { c.down = true; c[R() < 0.5 ? 'b' : 'a'] = true; }
        this.plan = 'wait';
        this.pt = 14 + Math.floor((1 - lv) * 16 + R() * 10);
        break;
      }
      case 'special': c.c = true; this.plan = 'wait'; this.pt = 30; break;
      default: break;
    }
    return c;
  }

  choose(me, op, g, dist) {
    const R = Math.random;
    const lv = this.lv;
    const kind = me.ch.sp.kind;
    const aggro = 0.35 + lv * 0.45;
    let plan = 'wait';
    let t = 8 + Math.floor(R() * 14);
    if (op.state === 'down' || op.state === 'getup') { plan = R() < 0.6 ? 'fwd' : 'wait'; t = 12; } else if (dist > 150) {
      const r = R();
      if (kind === 'fireball' && r < 0.45) plan = 'fire';
      else if (r < 0.8) { plan = 'fwd'; t = 18 + Math.floor(R() * 20); } else if (r < 0.9) plan = 'jump';
    } else if (dist > 75) {
      const r = R();
      if (kind === 'fireball' && r < 0.3 + lv * 0.15) plan = 'fire';
      else if (kind === 'spin' && r < 0.12 + lv * 0.1) plan = 'special';
      else if (r < 0.65) { plan = 'fwd'; t = 10 + Math.floor(R() * 14); } else if (r < 0.72 + lv * 0.08) plan = 'jump';
      else if (r < 0.85) plan = 'guard';
      else plan = 'back';
    } else {
      const r = R();
      if (r < aggro) plan = 'poke';
      else if (r < aggro + 0.08 && (kind === 'lariat' || kind === 'flash') && dist < 50) plan = 'special';
      else if (r < aggro + 0.25) { plan = 'guard'; t = 10 + Math.floor(R() * 16); } else if (r < aggro + 0.32) plan = 'crouch';
      else if (r < aggro + 0.38) plan = 'jump';
      else plan = 'back';
    }
    this.plan = plan;
    this.pt = t;
  }
}

// ---------------- Oyun ----------------
export default class StreetGame {
  constructor(api) {
    this.api = api;
    this.sfx = api.sfx;
    this.tick = 0;
    this.projs = [];
    this.sparks = [];
    this.shake = 0;
    this.stop = 0;
    this.slow = 0;
    this.banner = null;
    this.projId = 1;
    this.loop = 0;
    this.ladderPos = 0;
    this.sel = 0;
    this.gameOverSent = false;
    art();
    if (api.preview) {
      const a = api.randInt(0, 3);
      let b = api.randInt(0, 3);
      if (b === a) b = (a + 1) % 4;
      this.playerCh = prepChar(CHARS[a]);
      this.startFight(prepChar(CHARS[b]), 0.6, true);
      this.phase = 'fight';
      this.f[0].setState('idle');
      this.f[1].setState('idle');
      this.f[0].x = STAGE_W / 2 - 45;
      this.f[1].x = STAGE_W / 2 + 45;
      this.brains = [new Brain(0.7), new Brain(0.7)];
    } else {
      this.mode = 'select';
      this.t = 0;
      this.selPreview = CHARS.map((c) => prepChar(c));
    }
  }

  // ----- Akış -----
  buildLadder() {
    const others = CHARS.filter((c) => c.id !== this.playerCh.id);
    // Rastgele sıra, sonda gölge
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    this.ladder = [...others.map((c) => ({ base: c, shadow: false })), { base: CHARS.find((c) => c.id === this.playerCh.id), shadow: true }];
    this.ladderPos = 0;
  }

  level() {
    return Math.min(1.25, 0.12 + this.ladderPos * 0.2 + this.loop * 0.4);
  }

  startVs() {
    const e = this.ladder[this.ladderPos];
    this.cpuCh = prepChar(e.base, e.shadow);
    this.mode = 'vs';
    this.t = 0;
    this.sfx.play('start');
  }

  startFight(cpuCh, lv, preview = false) {
    this.mode = 'fight';
    this.cpuCh = cpuCh;
    this.stageIdx = cpuCh.stage;
    getStage(this.stageIdx);
    this.f = [new Fighter(this.playerCh, 0, this), new Fighter(cpuCh, 1, this)];
    this.brain = new Brain(lv);
    this.brains = preview ? [new Brain(lv), new Brain(lv)] : [null, this.brain];
    this.round = 1;
    this.matchDamage = 0;
    this.startRound();
  }

  startRound() {
    const [a, b] = this.f;
    a.reset(STAGE_W / 2 - 70, 1);
    b.reset(STAGE_W / 2 + 70, -1);
    a.hp = a.maxHp; a.dispHp = a.hp;
    b.hp = b.maxHp; b.dispHp = b.hp;
    a.setState('intro');
    b.setState('intro');
    this.projs = [];
    this.sparks = [];
    this.timer = 99;
    this.timerT = 0;
    this.phase = 'intro';
    this.pt = 0;
    this.roundDamageTaken = 0;
    this.camX = STAGE_W / 2 - W / 2;
    this.banner = null;
    this.bonusLines = null;
  }

  threatTo(me) {
    const o = me.opp;
    const d = Math.abs(o.x - me.x);
    if (o.state === 'attack' && d < 130) return true;
    if ((o.state === 'air') && d < 110) return true;
    return this.projs.some((p) => p.owner === o && Math.abs(p.x - me.x) < 110);
  }

  whoosh(heavy) {
    this.sfx.noise(heavy ? 0.1 : 0.06, { vol: 0.08, freq: heavy ? 2500 : 4000 });
  }

  spawnFire(f) {
    this.projs.push({ id: this.projId++, owner: f, x: f.x + f.face * 30 * f.S, y: -52 * f.S, vx: f.face * 3.4, t: 0, dmg: 10 * f.ch.pow });
    this.sfx.tone(200, 0.35, { slide: 80, type: 'sawtooth', vol: 0.1 });
    this.sfx.noise(0.3, { vol: 0.15, freq: 900 });
  }

  dust(x, n) {
    for (let i = 0; i < n; i++) this.sparks.push({ kind: 'dust', x: x + (Math.random() - 0.5) * 30, y: -2, vx: (Math.random() - 0.5) * 1.5, vy: -Math.random() * 0.8, t: 0, life: 18 + Math.random() * 10 });
  }

  spark(x, y, blocked, big) {
    this.sparks.push({ kind: blocked ? 'block' : 'hit', x, y, t: 0, life: big ? 14 : 10, big });
    if (!blocked) for (let i = 0; i < (big ? 8 : 4); i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 1 + Math.random() * 2.5;
      this.sparks.push({ kind: 'px', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, t: 0, life: 12 + Math.random() * 8 });
    }
  }

  applyDamage(att, def, dmg, noScore) {
    const d = Math.max(1, Math.round(dmg));
    def.hp = Math.max(0, def.hp - d);
    if (att.side === 0 && !this.api.preview && !noScore) this.api.addScore(d * 20);
    if (att.side === 0 && noScore && !this.api.preview) this.api.addScore(d * 20);
    if (def.side === 0) this.roundDamageTaken += d;
    if (def.hp <= 0 && !def.ko) {
      def.ko = true;
      def.setState('fall');
      def.bounced = true;
      def.vy = -6;
      def.vx = (def.x >= att.x ? 1 : -1) * 2.5;
      def.y = Math.min(def.y, -1);
      this.onKO();
    }
  }

  // Vuruş çözümü
  resolveHit(att, def, a, pt, isProj = false) {
    if (def.ko || this.phase !== 'fight') return false;
    const crouching = def.isCrouching();
    const canBlock = ['idle', 'walk', 'crouch', 'guard', 'cguard', 'block'].includes(def.state) && def.cmdBack && def.grounded;
    let blocked = false;
    if (canBlock) {
      if (a.lvl === 'low') blocked = def.cmdDown;
      else if (a.lvl === 'high') blocked = !def.cmdDown;
      else blocked = true;
    }
    const dir = def.x >= att.x ? 1 : -1;
    if (blocked) {
      def.setState('block');
      def.stun = a.bs;
      def.vx = dir * a.push;
      if (a.special || isProj) this.applyDamage(att, def, Math.max(1, (a.dmg * att.ch.pow) / 5), true);
      this.stop = 6;
      this.spark(pt[0], pt[1], true);
      this.sfx.tone(700, 0.05, { type: 'triangle', vol: 0.12 });
      this.sfx.noise(0.04, { vol: 0.12, freq: 5000 });
      if (!isProj) att.lastHitConnected = 1;
      return true;
    }
    const dmg = a.dmg * att.ch.pow;
    def.combo = def.state === 'hit' || def.state === 'fall' ? def.combo + 1 : 1;
    if (def.combo >= 2) { att.comboShow = 70; att.comboN = def.combo; }
    def.flash = 8;
    const airborne = def.y < 0;
    this.applyDamage(att, def, dmg);
    if (!def.ko) {
      if (a.kd || airborne) {
        def.setState('fall');
        def.bounced = false;
        def.vy = a.kd && !airborne ? -4.5 : -4;
        def.vx = dir * 2.2;
        def.y = Math.min(def.y, -1);
        def.atk = null;
      } else {
        def.setState('hit');
        def.hitCrouch = crouching;
        def.stun = a.hs;
        def.vx = dir * a.push;
        def.atk = null;
      }
    }
    this.stop = a.heavy ? 10 : 7;
    if (a.heavy) this.shake = Math.max(this.shake, 6);
    this.spark(pt[0], pt[1], false, a.heavy);
    this.sfx.play(a.heavy ? 'hit' : 'punch');
    if (!isProj) att.lastHitConnected = 1;
    return true;
  }

  onKO() {
    this.phase = 'ko';
    this.pt = 0;
    this.slow = 70;
    this.banner = { text: 'K.O.', t: 0, color: '#ff3020', scale: 6 };
    this.sfx.play('bigexplode');
    this.shake = 10;
  }

  // ----- Güncelleme -----
  update() {
    this.tick++;
    try {
      if (this.mode === 'select') this.updateSelect();
      else if (this.mode === 'vs') this.updateVs();
      else if (this.mode === 'fight') this.updateFight();
      else if (this.mode === 'over') this.updateOver();
      else if (this.mode === 'ending') this.updateEnding();
    } catch (e) {
      // Oyun asla çökmemeli; beklenmeyen durumda raundu sıfırla
      if (!this.errLogged) { this.errLogged = true; console.error(e); }
      if (this.mode === 'fight' && this.f) this.startRound();
    }
  }

  updateSelect() {
    const { input } = this.api;
    this.t++;
    const n = CHARS.length;
    let moved = false;
    if (input.pressed('left')) { this.sel = (this.sel + n - 1) % n; moved = true; }
    if (input.pressed('right')) { this.sel = (this.sel + 1) % n; moved = true; }
    if (input.pressed('up') || input.pressed('down')) { this.sel = (this.sel + 2) % n; moved = true; }
    const p = input.pointer;
    let confirm = input.pressed('a') || input.pressed('c') || (input.pressed('start') && this.t > 10);
    if (p && p.pressed) {
      for (let i = 0; i < n; i++) {
        const bx = 40 + i * 62;
        if (p.x >= bx && p.x < bx + 52 && p.y >= 160 && p.y < 208) {
          if (this.sel === i) confirm = true;
          else { this.sel = i; moved = true; }
        }
      }
    }
    if (moved) this.sfx.play('select');
    if (confirm && this.t > 6) {
      this.sfx.play('coin');
      this.playerCh = prepChar(CHARS[this.sel]);
      this.buildLadder();
      this.startVs();
    }
  }

  updateVs() {
    this.t++;
    const { input } = this.api;
    if (this.t > 170 || (this.t > 40 && (input.pressed('a') || input.pressed('start') || input.pointer?.pressed))) {
      this.startFight(this.cpuCh, this.level());
    }
  }

  updateOver() {
    this.t++;
    if (this.t === 1) this.sfx.play('gameover');
    if (this.t > 150 && !this.gameOverSent) {
      this.gameOverSent = true;
      this.api.gameOver();
    }
  }

  updateEnding() {
    this.t++;
    const { input } = this.api;
    if (this.t === 1) this.sfx.play('levelup');
    if (this.t > 360 || (this.t > 90 && (input.pressed('a') || input.pressed('start')))) {
      this.loop++;
      this.buildLadder();
      this.startVs();
    }
  }

  playerCmd() {
    const { input } = this.api;
    return {
      left: input.held('left'), right: input.held('right'), up: input.held('up'), down: input.held('down'),
      a: input.pressed('a'), b: input.pressed('b'), c: input.pressed('c'),
    };
  }

  updateFight() {
    const [p1, p2] = this.f;
    this.pt++;
    if (this.banner) this.banner.t++;
    if (this.shake > 0) this.shake--;

    // Raunt girişi
    if (this.phase === 'intro') {
      if (this.pt === 1) this.banner = { text: `RAUNT ${this.round}`, t: 0, color: '#ffe040', scale: 4 };
      if (this.pt === 70) { this.banner = { text: 'DÖVÜŞ!', t: 0, color: '#ff4020', scale: 5 }; this.sfx.play('start'); }
      if (this.pt >= 110) {
        this.phase = 'fight';
        this.banner = null;
        p1.setState('idle');
        p2.setState('idle');
      }
      p1.update(blankCmd());
      p2.update(blankCmd());
      this.updateCamera();
      return;
    }

    if (this.stop > 0) {
      this.stop--;
      // Vuruş donması sırasında girişleri yine de tampona yaz
      if (this.phase === 'fight') {
        const c = this.brains[0] ? blankCmd() : this.playerCmd();
        p1.record(c);
        if (c.c || c.a || c.b) this.pendingCmd = c;
      }
      this.updateSparks();
      return;
    }
    if (this.slow > 0) {
      this.slow--;
      if (this.slow % 3 !== 0) { this.updateSparks(); return; }
    }

    let c1 = blankCmd();
    let c2 = blankCmd();
    if (this.phase === 'fight') {
      c1 = this.brains[0] ? this.brains[0].get(p1, p2, this) : this.playerCmd();
      if (this.pendingCmd) {
        c1.a = c1.a || this.pendingCmd.a;
        c1.b = c1.b || this.pendingCmd.b;
        c1.c = c1.c || this.pendingCmd.c;
        this.pendingCmd = null;
      }
      c2 = this.brains[1].get(p2, p1, this);
    }
    p1.update(c1);
    p2.update(c2);
    this.updateProjectiles();
    this.collide();
    this.updateCamera();
    if (this.phase === 'fight') this.checkHits();
    this.updateSparks();
    for (const f of this.f) {
      if (f.dispHp > f.hp) f.dispHp = Math.max(f.hp, f.dispHp - 0.4);
    }

    if (this.phase === 'fight') {
      if (++this.timerT >= 60) {
        this.timerT = 0;
        this.timer--;
        if (this.timer <= 10 && this.timer > 0) this.sfx.play('blip');
        if (this.timer <= 0) {
          this.timer = 0;
          this.phase = 'ko';
          this.pt = 0;
          this.timeOver = true;
          this.banner = { text: 'SÜRE BİTTİ', t: 0, color: '#ffe040', scale: 3 };
          this.sfx.play('explode');
        }
      }
    } else if (this.phase === 'ko') {
      const settled = this.f.every((f) => f.state !== 'fall' && f.state !== 'attack' && f.state !== 'air' && f.state !== 'hit' && f.state !== 'block' && f.state !== 'throw' && f.state !== 'thrown');
      if (this.pt > 90 && settled) this.endRound();
    } else if (this.phase === 'result') {
      if (this.bonusLines) {
        const ln = this.bonusLines.find((l) => !l.done);
        if (ln && this.pt > 50) {
          const step = Math.min(ln.left, Math.max(50, Math.ceil(ln.total / 30)));
          ln.left -= step;
          ln.shown += step;
          this.api.addScore(step);
          if (this.pt % 4 === 0) this.sfx.play('blip');
          if (ln.left <= 0) { ln.done = true; this.sfx.play('coin'); }
        }
      }
      const doneBonus = !this.bonusLines || this.bonusLines.every((l) => l.done);
      if (this.pt > 200 && doneBonus) this.nextAfterRound();
    }
  }

  endRound() {
    const [p1, p2] = this.f;
    const r1 = p1.hp / p1.maxHp;
    const r2 = p2.hp / p2.maxHp;
    let winner = null;
    if (p1.ko && p2.ko) winner = null;
    else if (p2.ko || (this.timeOver && r1 > r2 + 0.001)) winner = p1;
    else if (p1.ko || (this.timeOver && r2 > r1 + 0.001)) winner = p2;
    this.timeOver = false;
    this.phase = 'result';
    this.pt = 0;
    this.roundWinner = winner;
    this.bonusLines = null;
    if (winner) {
      winner.wins++;
      winner.setState('win');
      const loser = winner.opp;
      if (!loser.ko) loser.setState('lose');
      if (winner === p1) {
        this.banner = { text: `${p1.ch.name} KAZANDI`, t: 0, color: '#40ff60', scale: 2 };
        if (!this.api.preview) {
          const perfect = this.roundDamageTaken === 0;
          this.bonusLines = [
            { label: 'ZAMAN BONUSU', total: this.timer * 100, left: this.timer * 100, shown: 0 },
            { label: 'CAN BONUSU', total: Math.round((p1.hp / p1.maxHp) * 5000 / 10) * 10, left: Math.round((p1.hp / p1.maxHp) * 5000 / 10) * 10, shown: 0 },
          ];
          if (perfect) this.bonusLines.push({ label: 'MÜKEMMEL!', total: 10000, left: 10000, shown: 0 });
          this.bonusLines.forEach((l) => { if (l.left <= 0) l.done = true; });
        }
        this.sfx.play('levelup');
      } else {
        this.banner = { text: `${p2.ch.name} KAZANDI`, t: 0, color: '#ff6040', scale: 2 };
        this.sfx.play('die');
      }
    } else {
      this.banner = { text: 'BERABERE', t: 0, color: '#ffe040', scale: 3 };
    }
  }

  nextAfterRound() {
    const [p1, p2] = this.f;
    if (this.api.preview) { p1.wins = 0; p2.wins = 0; this.startRound(); return; }
    if (p1.wins >= 2) {
      // Maç kazanıldı
      this.api.addScore(3000 * (this.ladderPos + 1) * (this.loop + 1));
      this.ladderPos++;
      if (this.ladderPos >= this.ladder.length) {
        this.mode = 'ending';
        this.t = 0;
      } else this.startVs();
      return;
    }
    if (p2.wins >= 2 || this.round >= 5) {
      this.mode = 'over';
      this.t = 0;
      return;
    }
    this.round++;
    this.startRound();
  }

  updateProjectiles() {
    for (const p of this.projs) {
      p.x += p.vx;
      p.t++;
      if (p.x < this.camX - 30 || p.x > this.camX + W + 30) p.dead = true;
    }
    // Ateş topları birbirini yok eder
    for (const p of this.projs) for (const q of this.projs) {
      if (p !== q && p.owner !== q.owner && !p.dead && !q.dead && Math.abs(p.x - q.x) < 16) {
        p.dead = q.dead = true;
        this.spark((p.x + q.x) / 2, p.y, false, true);
        this.sfx.play('explode');
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  collide() {
    const [a, b] = this.f;
    const minD = (11 * a.S + 11 * b.S) * 0.9;
    const overlapY = !(a.y < -50 || b.y < -50) || (Math.abs(a.y - b.y) < 40);
    const dx = b.x - a.x;
    if (overlapY && Math.abs(dx) < minD && !['down', 'ko', 'thrown'].includes(a.state) && !['down', 'ko', 'thrown'].includes(b.state)) {
      const push = (minD - Math.abs(dx)) / 2;
      const s = dx === 0 ? (a.face > 0 ? 1 : -1) : Math.sign(dx);
      a.x -= s * push;
      b.x += s * push;
    }
    // Sahne ve kamera sınırları
    const cam = this.camX ?? 0;
    for (const f of this.f) {
      const lo = Math.max(14, cam + 12);
      const hi = Math.min(STAGE_W - 14, cam + W - 12);
      if (f.x < lo) f.x = lo;
      if (f.x > hi) f.x = hi;
    }
    // Atış: savunan duvara yaslıysa saldıran geri itilir
    for (const f of this.f) {
      if ((f.state === 'hit' || f.state === 'block') && (f.x <= Math.max(14, cam + 12) + 0.5 || f.x >= Math.min(STAGE_W - 14, cam + W - 12) - 0.5)) {
        const o = f.opp;
        if (o.state === 'attack' && o.grounded) o.x -= o.face * 1.2;
      }
    }
  }

  updateCamera() {
    const [a, b] = this.f;
    const mid = (a.x + b.x) / 2;
    const target = Math.max(0, Math.min(STAGE_W - W, mid - W / 2));
    this.camX = this.camX == null ? target : this.camX + (target - this.camX) * 0.25;
    if (Math.abs(target - this.camX) < 0.3) this.camX = target;
  }

  checkHits() {
    const [a, b] = this.f;
    const tests = [[a, b], [b, a]];
    const results = [];
    for (const [att, def] of tests) {
      const circles = att.activeHit();
      if (!circles) continue;
      const hb = def.hurtbox();
      if (!hb) continue;
      for (const [p, r] of circles) {
        const cx = Math.max(hb.x0, Math.min(p[0], hb.x1));
        const cy = Math.max(hb.y0, Math.min(p[1], hb.y1));
        if ((cx - p[0]) ** 2 + (cy - p[1]) ** 2 <= r * r) {
          results.push([att, def, [(p[0] + cx) / 2, (p[1] + cy) / 2]]);
          break;
        }
      }
    }
    // Aynı karede iki vuruş: ikisi de işler (takas)
    for (const [att, def, pt] of results) {
      const a2 = att.atk;
      if (!a2) continue;
      att.hits++;
      if (a2.multi) att.hitCd = a2.multi;
      this.resolveHit(att, def, a2, pt);
    }
    // Ateş topları
    for (const p of this.projs) {
      const def = p.owner.opp;
      if (def.atk?.projImmune && def.state === 'attack') {
        if (Math.abs(p.x - def.x) < 24 * def.S) { p.dead = true; this.spark(p.x, p.y, true); }
        continue;
      }
      const hb = def.hurtbox();
      if (!hb) continue;
      if (p.x + 8 > hb.x0 && p.x - 8 < hb.x1 && p.y + 6 > hb.y0 && p.y - 6 < hb.y1) {
        p.dead = true;
        this.resolveHit(p.owner, def, { dmg: p.dmg, hs: 18, bs: 16, push: 2.4, lvl: 'mid', heavy: 1, special: 1 }, [p.x, p.y], true);
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  updateSparks() {
    for (const s of this.sparks) {
      s.t++;
      if (s.vx !== undefined) { s.x += s.vx; s.y += s.vy; if (s.kind === 'px') s.vy += 0.2; }
    }
    this.sparks = this.sparks.filter((s) => s.t < s.life);
  }

  // ----- Çizim -----
  draw() {
    const { gfx } = this.api;
    try {
      if (this.mode === 'select') this.drawSelect(gfx);
      else if (this.mode === 'vs') this.drawVs(gfx);
      else if (this.mode === 'fight') this.drawFight(gfx);
      else if (this.mode === 'over') this.drawFight(gfx, true);
      else if (this.mode === 'ending') this.drawEnding(gfx);
    } catch (e) {
      if (!this.drawErrLogged) { this.drawErrLogged = true; console.error(e); }
      gfx.cls('#000');
    }
  }

  drawFight(gfx, over = false) {
    const ctx = gfx.ctx;
    const sx = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    const sy = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake * 0.6) : 0;
    ctx.save();
    ctx.translate(sx, sy);
    const cam = Math.round(this.camX);
    drawStage(gfx, this.stageIdx, cam, this.tick, this.phase === 'ko' || this.phase === 'result');
    // Arkadaki dövüşçü önce: saldıran öne
    const order = [...this.f].sort((a, b) => (a.state === 'attack' ? 1 : 0) - (b.state === 'attack' ? 1 : 0));
    for (const f of order) f.draw(gfx, cam);
    // Ateş topları
    for (const p of this.projs) {
      const spr = ART.fire[Math.floor(p.t / 4) % 2];
      const x = Math.round(p.x - cam - spr.width / 2);
      const y = Math.round(GY + p.y - spr.height / 2);
      if (p.vx < 0) gfx.sprite(spr, x, y, { flipX: true }); else gfx.sprite(spr, x, y);
      // iz
      gfx.rect(x - Math.sign(p.vx) * 6 + (p.vx < 0 ? spr.width : 0), y + 5, 3, 2, '#f06020');
    }
    this.drawSparks(gfx, cam);
    ctx.restore();
    this.drawHud(gfx);
    this.drawBanner(gfx);
    if (over) {
      gfx.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      gfx.ctx.fillRect(0, 70, W, 60);
      gfx.text('KAYBETTİN', W / 2, 80, '#ff4030', { align: 'center', scale: 3, shadow: '#000' });
      if (this.t > 40) gfx.text('OYUN BİTTİ', W / 2, 110, '#ffffff', { align: 'center', shadow: '#000' });
    }
  }

  drawSparks(gfx, cam) {
    for (const s of this.sparks) {
      const x = Math.round(s.x - cam);
      const y = Math.round(GY + s.y);
      if (s.kind === 'dust') {
        const r = 2 + s.t / 6;
        gfx.circ(x, y - s.t / 4, r, s.t < 8 ? '#d8d0c0' : '#a09888');
      } else if (s.kind === 'px') {
        gfx.rect(x, y, 2, 2, s.t < 6 ? '#ffffff' : '#ffd040');
      } else if (s.kind === 'hit' || s.kind === 'block') {
        const blocked = s.kind === 'block';
        const r = (s.big ? 14 : 9) * Math.min(1, (s.t + 2) / 5);
        const c1 = blocked ? '#80c0ff' : '#ffffff';
        const c2 = blocked ? '#2060ff' : (s.t < 4 ? '#ffff80' : '#ff8020');
        if (s.t < 3) gfx.circ(x, y, r * 0.6, c1);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + (blocked ? 0.4 : 0);
          const len = (k % 2 ? r : r * 0.6);
          gfx.line(x + Math.cos(a) * 2, y + Math.sin(a) * 2, x + Math.cos(a) * len, y + Math.sin(a) * len, k % 2 ? c2 : c1);
        }
      }
    }
  }

  drawHud(gfx) {
    const { score, hiScore } = this.api;
    const [p1, p2] = this.f;
    const pad = (n) => String(n).padStart(6, '0');
    if (!this.api.preview) {
      gfx.text(`1P ${pad(score)}`, 8, 3, '#ffe040', { shadow: '#000' });
      gfx.text(`HI ${pad(Math.max(hiScore, score))}`, W - 8, 3, '#ffffff', { align: 'right', shadow: '#000' });
    }
    // Can barları
    const bar = (f, x, right) => {
      const w = 124;
      gfx.rect(x - 1, 13, w + 2, 10, '#000');
      gfx.rect(x, 14, w, 8, '#c01010');
      const dw = Math.round((f.dispHp / f.maxHp) * w);
      const hw = Math.round((f.hp / f.maxHp) * w);
      if (right) {
        gfx.rect(x + w - dw, 14, dw, 8, '#ff8020');
        gfx.rect(x + w - hw, 14, hw, 8, '#ffe020');
        gfx.rect(x + w - hw, 14, hw, 2, '#fff8a0');
      } else {
        gfx.rect(x, 14, dw, 8, '#ff8020');
        gfx.rect(x, 14, hw, 8, '#ffe020');
        gfx.rect(x, 14, hw, 2, '#fff8a0');
      }
      gfx.rectb(x - 1, 13, w + 2, 10, '#f0f0f0');
    };
    const low = (f) => f.hp / f.maxHp < 0.25 && this.tick % 20 < 10;
    bar(p1, 12, false);
    bar(p2, W - 12 - 124, true);
    if (low(p1)) gfx.rectb(11, 12, 128, 12, '#ff2020');
    if (low(p2)) gfx.rectb(W - 12 - 126, 12, 128, 12, '#ff2020');
    // KO rozeti
    gfx.rect(W / 2 - 11, 12, 22, 12, '#000');
    gfx.text('KO', W / 2, 14, this.tick % 40 < 20 || this.phase !== 'ko' ? '#ff3020' : '#ffe040', { align: 'center' });
    // Süre
    gfx.rect(W / 2 - 13, 26, 26, 18, '#000');
    gfx.text(String(this.timer).padStart(2, '0'), W / 2, 28, this.timer <= 10 ? '#ff4040' : '#ffffff', { align: 'center', scale: 2 });
    // İsimler
    gfx.text(p1.ch.name, 12, 27, '#ffffff', { shadow: '#000' });
    gfx.text(p2.ch.name, W - 12, 27, '#ffffff', { align: 'right', shadow: '#000' });
    // Raunt galibiyet işaretleri
    for (let i = 0; i < p1.wins; i++) this.winMark(gfx, 12 + i * 10, 37);
    for (let i = 0; i < p2.wins; i++) this.winMark(gfx, W - 20 - i * 10, 37);
    // Kombo
    for (const f of this.f) {
      if (f.comboShow > 0 && f.comboN >= 2) {
        const x = f.side === 0 ? 12 : W - 12;
        gfx.text(`${f.comboN} VURUŞ`, x, 60, this.tick % 8 < 4 ? '#ffe040' : '#ff8020', { align: f.side === 0 ? 'left' : 'right', scale: 2, shadow: '#000' });
      }
    }
    // Bonus satırları
    if (this.phase === 'result' && this.bonusLines) {
      gfx.ctx.fillStyle = 'rgba(0,0,20,0.6)';
      gfx.ctx.fillRect(60, 104, 200, 14 + this.bonusLines.length * 12);
      this.bonusLines.forEach((l, i) => {
        if (this.pt < 30 + i * 10) return;
        gfx.text(l.label, 70, 110 + i * 12, '#ffffff');
        gfx.text(String(l.shown), 250, 110 + i * 12, '#ffe040', { align: 'right' });
      });
    }
  }

  winMark(gfx, x, y) {
    gfx.rect(x, y, 8, 8, '#000');
    gfx.rect(x + 1, y + 1, 6, 6, '#ffd020');
    gfx.rect(x + 2, y + 2, 4, 4, '#ff8020');
    gfx.rect(x + 3, y + 3, 2, 2, '#fff');
  }

  drawBanner(gfx) {
    const b = this.banner;
    if (!b) return;
    const sc = b.scale;
    let y = 76;
    if (b.text === 'K.O.' && b.t < 10) {
      // zoom etkisi
      const s2 = Math.max(1, Math.round(sc * (b.t / 10) + 1));
      gfx.text(b.text, W / 2, y + 10 - s2 * 3, b.color, { align: 'center', scale: s2, shadow: '#000' });
      return;
    }
    if (b.t < 8) y -= (8 - b.t) * 3;
    const col = b.text === 'DÖVÜŞ!' && this.tick % 6 < 3 ? '#ffe040' : b.color;
    gfx.text(b.text, W / 2 + 2, y + 2, '#000', { align: 'center', scale: sc });
    gfx.text(b.text, W / 2, y, col, { align: 'center', scale: sc, shadow: mix(b.color, '#000', 0.5) });
  }

  drawPortrait(gfx, ch, x, y, w, h, shadow = false) {
    gfx.rect(x, y, w, h, shadow ? '#1a0828' : '#1a2848');
    gfx.rect(x, y + h - 10, w, 10, shadow ? '#2a1038' : '#24365a');
    const hs = ch.heads ? ch.heads[0] : prepChar(ch).heads[0];
    gfx.sprite(hs.r, x + Math.floor((w - hs.w * 2) / 2), y + Math.floor((h - hs.h * 2) / 2) + 2, { scale: 2 });
  }

  drawSelect(gfx) {
    const t = this.tick;
    // Arka plan: koyu ızgara + dünya şeridi
    gfx.cls('#0a0a2a');
    for (let y = 0; y < H; y += 8) gfx.rect(0, y, W, 1, '#121240');
    for (let x = (t >> 1) % 16; x < W; x += 16) gfx.rect(x, 0, 1, H, '#121240');
    gfx.text('DÖVÜŞÇÜNÜ SEÇ', W / 2, 8, '#ffe040', { align: 'center', scale: 2, shadow: '#a02000' });
    const ch = this.selPreview[this.sel];
    // Büyük dövüşçü
    gfx.rect(10, 34, 140, 122, '#101040');
    gfx.rectb(10, 34, 140, 122, '#3a3a90');
    const sx = 80;
    const pose = Math.floor(t / 14) % 2 ? POSES.idle1 : POSES.idle0;
    const savedGY = GY;
    void savedGY;
    drawFighterArt(gfx.ctx, ch, pose, 1, sx, 148, false, t, { noShadow: true });
    gfx.rect(30, 149, 100, 2, '#3a3a90');
    // Bilgi
    gfx.text(ch.name, 160, 40, '#ffffff', { scale: 2, shadow: '#a02000' });
    gfx.text(ch.style, 160, 58, '#80c0ff');
    const labels = ['GÜÇ', 'HIZ', 'CAN'];
    labels.forEach((l, i) => {
      gfx.text(l, 160, 74 + i * 12, '#ffffff');
      for (let k = 0; k < 5; k++) gfx.rect(190 + k * 12, 74 + i * 12, 10, 7, k < ch.stats[i] ? '#ffd020' : '#303060');
    });
    gfx.text('ÖZEL HAREKET', 160, 114, '#ff8040');
    gfx.text(ch.sp.name, 160, 126, '#ffffff');
    let ix = 160;
    for (const ic of ch.sp.icons) {
      if (ART.arrows[ic]) { gfx.sprite(ART.arrows[ic], ix, 140); ix += 10; } else { gfx.text(`+ ${ic}`, ix + 2, 140, '#ffe040'); ix += 30; }
    }
    gfx.text('VEYA C', ix + 4, 140, '#80c0ff');
    // Portreler
    CHARS.forEach((c, i) => {
      const bx = 40 + i * 62;
      this.drawPortrait(gfx, this.selPreview[i], bx, 160, 52, 48);
      gfx.text(c.name, bx + 26, 199, '#ffffff', { align: 'center' });
      if (i === this.sel) {
        const col = t % 20 < 10 ? '#ffe040' : '#ff4020';
        gfx.rectb(bx - 2, 158, 56, 52, col);
        gfx.rectb(bx - 1, 159, 54, 50, col);
        gfx.text('1P', bx + 1, 162, col, { shadow: '#000' });
      }
    });
    if (t % 60 < 40) gfx.text('YÖN: DEĞİŞTİR   A: SEÇ', W / 2, 214, '#ffffff', { align: 'center' });
  }

  drawVs(gfx) {
    const t = this.t;
    gfx.cls('#000010');
    // Çapraz şeritler
    for (let i = 0; i < 12; i++) gfx.rect(0, i * 20 + ((t * 2) % 20), W, 6, i % 2 ? '#200820' : '#081020');
    const p = this.playerCh;
    const c = this.cpuCh;
    const slide = Math.max(0, 40 - t) * 4;
    gfx.rect(0, 40, W / 2 - 4, 140, '#102050');
    gfx.rect(W / 2 + 4, 40, W / 2, 140, c.shadow ? '#300a30' : '#501010');
    drawFighterArt(gfx.ctx, p, POSES.idle0, 1, 80 - slide, 170, false, this.tick, { noShadow: true });
    drawFighterArt(gfx.ctx, c, POSES.idle0, -1, 240 + slide, 170, false, this.tick, { noShadow: true });
    gfx.text(p.name, 80, 182, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
    gfx.text(c.name, 240, 182, '#ffffff', { align: 'center', scale: c.name.length > 9 ? 1 : 2, shadow: '#000' });
    if (t > 30) gfx.text('VS', W / 2, 90, t % 10 < 5 ? '#ffe040' : '#ff4020', { align: 'center', scale: 5, shadow: '#000' });
    gfx.text(`RAKİP ${this.ladderPos + 1}/${this.ladder.length}${this.loop ? `  TUR ${this.loop + 1}` : ''}`, W / 2, 8, '#ffe040', { align: 'center', shadow: '#000' });
    gfx.text(`SAHNE: ${STAGE_NAMES[c.stage]}`, W / 2, 204, '#80c0ff', { align: 'center', shadow: '#000' });
    // Merdiven
    this.ladder.forEach((e, i) => {
      const x = W / 2 - this.ladder.length * 13 + i * 26;
      const hs = e.shadow ? prepCached(e.base, true).heads[0] : prepCached(e.base, false).heads[0];
      gfx.rect(x, 18, 22, 20, i === this.ladderPos ? '#ffe040' : i < this.ladderPos ? '#303030' : '#304080');
      gfx.sprite(hs.r, x + 4, 20);
      if (i < this.ladderPos) { gfx.line(x + 2, 20, x + 20, 36, '#ff2020'); gfx.line(x + 20, 20, x + 2, 36, '#ff2020'); }
    });
  }

  drawEnding(gfx) {
    const t = this.t;
    gfx.cls('#000');
    for (let i = 0; i < 40; i++) gfx.pset((i * 97 + t) % W, (i * 53) % H, '#8080c0');
    drawFighterArt(gfx.ctx, this.playerCh, Math.floor(t / 20) % 2 ? POSES.win2 : POSES.win, 1, W / 2, 180, false, this.tick, { noShadow: true });
    gfx.text('ŞAMPİYON', W / 2, 20, t % 20 < 10 ? '#ffe040' : '#ff8020', { align: 'center', scale: 4, shadow: '#802000' });
    gfx.text(`${this.playerCh.name} SOKAKLARIN KRALI OLDU!`, W / 2, 196, '#ffffff', { align: 'center' });
    gfx.text('DAHA ZOR RAKİPLER GELİYOR...', W / 2, 210, '#80c0ff', { align: 'center' });
  }
}

const PREP_CACHE = new Map();
function prepCached(base, shadow) {
  const k = `${base.id}:${shadow}`;
  if (!PREP_CACHE.has(k)) PREP_CACHE.set(k, prepChar(base, shadow));
  return PREP_CACHE.get(k);
}
