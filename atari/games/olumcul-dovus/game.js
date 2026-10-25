// Ölümcül Dövüş — Mortal Kombat tarzı: karanlık arenalar, "dijital" görünümlü dövüşçüler,
// havada kombo yapılabilen aparkat, mermi ve ışınlanma/kayma özel hareketleri,
// son rauntta "BİTİR ONU!" anı ve (kansız, çizgi film tadında) ölümcül hamleler.
import { makeSprite } from '../../js/engine/gfx.js';
import { P, solve, toWorld, drawGroup, seg, tones5, mix, FLASH, pline, headSet } from './art.js';
import { STAGE_W, GY, getStage, drawStage, STAGE_NAMES } from './stages.js';

export const meta = {
  id: 'olumcul-dovus',
  width: 320,
  height: 224,
  buttons: { a: 'YUMRUK', b: 'TEKME', c: 'ÖZEL' },
  help: [
    'Blok: geri yönü basılı tut (alçak tekmelere karşı aşağı-geri).',
    'Aşağı + YUMRUK: aparkat — rakibi havaya uçurur, havadayken tekrar vurabilirsin.',
    'Aşağı + TEKME: alçak tekme. Geri + TEKME: döner tekme (yere serer).',
    'C: mermi atar. İleri + C: ışınlanma / kayma / uçan tekme. (Ya da geri-ileri + A ve aşağı-ileri + B.)',
    'Yakında ileri + YUMRUK: fırlatma.',
    'Maçı alınca "BİTİR ONU!" yazar: yaklaş ve İLERİ, İLERİ + C ile ölümcül hamleyi yap.',
  ],
};

const W = 320;
const H = 224;
const GRAV = 0.38;
const D2R = Math.PI / 180;

// ---------------- Kafalar ----------------
const NINJA = [
  '...KKKKKK...',
  '..KcCCCCCdK.',
  '.KcCCCCCCCdK',
  '.KcCCCCCCCCK',
  'KcCCCCCCCCCK',
  'KCCCCSSSSSSK',
  'KCCCSWEsSWEK',
  'KdCCCsSSSSSK',
  'KdCCMMMMMMMK',
  'KdCMMmMMMMMK',
  '.KdMMMmMMMK.',
  '.KddMMMMMK..',
  '..KddMMMK...',
  '...KddddK...',
  '....KddK....',
];
const HEADS = {
  ayaz: { rows: NINJA, pal: { C: '#2a4a9a', c: '#4a6ac0', d: '#14244a', M: '#1a2a5a', m: '#3a5aa0', S: '#c89070', s: '#8a5a40', W: '#e8f0ff', E: '#e8f0ff' } },
  kor: { rows: NINJA, pal: { C: '#b03810', c: '#d85a20', d: '#581808', M: '#3a1008', m: '#702010', S: '#c89070', s: '#8a5a40', W: '#fff0c0', E: '#ffe080' } },
  zehir: { rows: NINJA, pal: { C: '#2a7a2a', c: '#4aa040', d: '#103a10', M: '#143814', m: '#2a6a2a', S: '#c89070', s: '#8a5a40', W: '#e0ffe0', E: '#c0ff80' } },
  kesis: {
    rows: [
      '...KKKKKK...',
      '..KHHHHHHK..',
      '.KHHHhhHHHK.',
      'KHHHHHHHHHHK',
      'KRRRRRRRRRRK',
      'KHHSSSSSSSSK',
      'KHSSKKSSKKSK',
      'KHSSWESSWESK',
      'KHsSSSSSSSSK',
      'KHsSSSSsSSK.',
      'KHHsSSSSSSK.',
      'KHHKsSMMSK..',
      'KHK.KsSSK...',
      'KHK..KssK...',
      '.K...KssK...',
    ],
    pal: { H: '#141010', h: '#3a3030', R: '#b01818', S: '#d0a070', s: '#8a6040', W: '#f0f0f0', E: '#201010', M: '#7a3030' },
  },
  demir: {
    rows: [
      '...KKKKKK...',
      '..KlLLLLLdK.',
      '.KlLLLLLLLdK',
      '.KLLLLLLLLdK',
      'KLLLLLLLLLLK',
      'KLLdKKKKKKdK',
      'KLLdRRrKSSSK',
      'KdLdKKKKSWEK',
      'KdLLLLLsSSSK',
      'KdLLLLLsSSSK',
      '.KdLLLLsSSK.',
      '.KddLLKSMSK.',
      '..KddLsSSK..',
      '...KdddssK..',
      '....KddK....',
    ],
    pal: { L: '#8a8a98', l: '#c0c0cc', d: '#40404c', R: '#ff2020', r: '#ff9090', S: '#c89070', s: '#8a5a40', W: '#f0f0f0', E: '#201010', M: '#7a3030' },
  },
  han: {
    rows: [
      'K............K',
      'KK..........KK',
      '.KHK.KKKKK.KHK',
      '..KHKAAAAAKHK.',
      '...KAAAAAAAK..',
      '..KAaAAAAAAAK.',
      '..KAAAAAAAAAK.',
      '..KSSKKSKKSSK.',
      '..KSWESSWESSK.',
      '..KsSSSSSSSSK.',
      '..KsSBBBBBSSK.',
      '...KsBMMBSK...',
      '...KsBBBBSK...',
      '....KKssKK....',
      '.....KssK.....',
    ],
    pal: { H: '#d8d0b0', A: '#3a3a44', a: '#6a6a78', S: '#8a9a70', s: '#5a6a48', B: '#202018', W: '#ffe060', E: '#ff2010', M: '#501010' },
  },
};

function rotRows(rows, q) {
  let r = rows;
  for (let i = 0; i < q; i++) {
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

function buildHeads(id, palMap) {
  const d = HEADS[id];
  let pal = { K: '#0a0608', ...d.pal };
  if (palMap) { const p2 = {}; for (const k in pal) p2[k] = palMap(pal[k]); pal = p2; }
  const out = [];
  for (let q = 0; q < 4; q++) out.push(headSet(rotRows(d.rows, q), pal));
  return out;
}

// ---------------- Karakterler ----------------
const BASE = { sp: 24, nk: 3, ua: 14, fa: 13, th: 18, sh: 18, foot: 5, tr0: 6, tr1: 8, ar0: 3.1, ar1: 2.6, fr0: 2.6, fr1: 2.4, lr0: 4.4, lr1: 3.4, sr0: 3.2, sr1: 2.4, fist: 2.8, pel: 5.6 };
const NINJA_COL = (top, panel) => ({ skin: '#c89070', top, panel, pants: top, thigh: top, shin: top, feet: mix(top, '#000', 0.5), fist: '#1c1c22', belt: '#0e0e12', wrist: '#8a8a98' });

const CHARS = [
  { id: 'ayaz', name: 'AYAZ', style: 'BUZ NİNJASI', s: 1.22, hp: 100, spd: 1, pow: 1, stats: [3, 3, 3], b: { ...BASE }, col: NINJA_COL('#2a4a9a', '#16244e'),
    proj: 'ice', mob: 'slide', fatal: 'ice', projName: 'BUZ TOPU', mobName: 'BUZ KAYMASI', fatalName: 'BUZ HEYKELİ' },
  { id: 'kor', name: 'KOR', style: 'ATEŞ NİNJASI', s: 1.22, hp: 100, spd: 1.05, pow: 1, stats: [3, 4, 3], b: { ...BASE }, col: NINJA_COL('#a83810', '#3a1008'),
    proj: 'chain', mob: 'tele', fatal: 'ash', projName: 'ALEV ZİNCİRİ', mobName: 'IŞINLANMA', fatalName: 'KÜL OL' },
  { id: 'zehir', name: 'ZEHİR', style: 'ZEHİR NİNJASI', s: 1.22, hp: 95, spd: 1.12, pow: 0.95, stats: [2, 4, 3], b: { ...BASE }, col: NINJA_COL('#2a7a2a', '#143814'),
    proj: 'acid', mob: 'tele', fatal: 'frog', projName: 'ASİT TÜKÜRÜĞÜ', mobName: 'GÖLGE ADIMI', fatalName: 'KURBAĞA OL' },
  { id: 'kesis', name: 'KEŞİŞ', style: 'DÖVÜŞ KEŞİŞİ', s: 1.2, hp: 95, spd: 1.18, pow: 1, stats: [3, 5, 2], b: { ...BASE, tr0: 6.4, tr1: 8.6 },
    col: { skin: '#d0a070', top: '#d0a070', panel: null, pants: '#8a1818', thigh: '#8a1818', shin: '#8a1818', feet: '#141010', fist: '#d0a070', belt: '#141010', wrist: '#141010' }, chest: true,
    proj: 'dragon', mob: 'fly', fatal: 'sky', projName: 'EJDER ATEŞİ', mobName: 'UÇAN TEKME', fatalName: 'GÖĞE UÇUR' },
  { id: 'demir', name: 'DEMİR-X', style: 'SİBORG', s: 1.26, hp: 110, spd: 0.92, pow: 1.1, stats: [4, 2, 4], b: { ...BASE, tr0: 6.6, tr1: 8.8, ar0: 3.4, ar1: 3, fr0: 3, fr1: 2.8, fist: 3.2 },
    col: { skin: '#9a9aa8', top: '#7a7a88', panel: '#34343e', pants: '#26262e', thigh: '#26262e', shin: '#5a5a68', feet: '#5a5a68', fist: '#4a4a58', belt: '#c02020', wrist: '#c02020' }, sleeves: true,
    proj: 'rocket', mob: 'tele', fatal: 'pixel', projName: 'ROKET', mobName: 'IŞIN GEÇİŞİ', fatalName: 'PİKSEL BULUTU' },
];
const BOSS = { id: 'han', name: 'KARA HAN', style: 'SAVAŞ LORDU', s: 1.5, hp: 150, spd: 0.85, pow: 1.25, stats: [5, 2, 5], b: { ...BASE, tr0: 7.5, tr1: 10, ar0: 4, ar1: 3.6, fr0: 3.6, fr1: 3.2, fist: 3.6, lr0: 5.2, lr1: 4 },
  col: { skin: '#7a8a60', top: '#3a3a44', panel: '#b08a30', pants: '#4a1010', thigh: '#4a1010', shin: '#2a2a30', feet: '#2a2a30', fist: '#2a2a30', belt: '#b08a30', wrist: '#b08a30' },
  proj: 'bossfire', mob: 'charge', fatal: 'ash', projName: 'CEHENNEM ATEŞİ', mobName: 'HÜCUM', fatalName: 'KÜL OL' };

const ICE = (c) => mix(c, '#a0e0ff', 0.7);
const ASH = (c) => mix(c, '#4a4440', 0.8);

function prepChar(base) {
  const ch = { ...base, b: { ...base.b } };
  const T = {};
  for (const k in ch.col) {
    if (!ch.col[k]) continue;
    T[k] = tones5(ch.col[k]);
    T[`${k}B`] = tones5(mix(ch.col[k], '#000000', 0.25));
  }
  ch.T = T;
  ch.heads = buildHeads(base.id);
  ch.headsIce = buildHeads(base.id, ICE);
  ch.headsAsh = buildHeads(base.id, ASH);
  ch.b.hc = (ch.heads[0].h / 2 - 1) / ch.s;
  return ch;
}
const TONE_ICE = tones5('#90d0f0');
const TONE_ASH = tones5('#5a5450');

// ---------------- Pozlar ----------------
const POSES = {
  idle0: P(0, 32, 4, 9, 3, 12, 6, 9, 2, -10, 2),
  idle1: P(0, 31, 5, 9, 2, 12, 5, 9, 2, -10, 2),
  walk0: P(0, 32, 5, 9, 3, 12, 6, 11, 2, -10, 2),
  walk1: P(1, 33, 6, 9, 4, 12, 7, 6, 2, -2, 9),
  walk2: P(0, 32, 5, 9, 3, 12, 6, -6, 2, 9, 2),
  walk3: P(1, 33, 6, 9, 4, 12, 7, 3, 9, 3, 2),
  crouch: P(-2, 19, 18, 9, 2, 12, 4, 11, 2, -11, 2),
  prejump: P(0, 27, 14, 9, 0, 11, 2, 9, 2, -9, 2),
  jumpUp: P(0, 35, 2, 6, 10, 10, 8, 3, 2, -4, 6),
  tuck: P(0, 38, 12, 8, 6, 10, 4, 10, 24, -4, 22),
  p0: P(1, 32, 8, 5, 2, 12, 5, 10, 2, -11, 2),
  p1: P(3, 31, 12, 27, 3, 6, 2, 12, 2, -11, 2),
  p1b: P(3, 31, 12, 8, 3, 27, 4, 12, 2, -11, 2),
  k0: P(-1, 33, -2, 8, 4, 10, 2, 12, 22, -8, 2),
  k1: P(-3, 34, -18, 6, 6, 2, 2, 33, 40, -6, 2),
  rh0: P(0, 33, 0, 6, 4, 2, 2, 4, 20, -8, 2, -20),
  rh1: P(-2, 34, -22, -8, 6, -12, 2, 34, 34, -6, 2),
  up0: P(-2, 18, 24, 2, -14, 10, 2, 12, 2, -10, 2),
  up1: P(2, 34, 2, 12, 28, 6, -8, 8, 2, -10, 4),
  lk0: P(-2, 18, 16, 9, 2, 12, 4, 13, 6, -11, 2),
  lk1: P(-4, 17, 6, 9, 2, 12, 4, 32, 5, -11, 2),
  jp: P(0, 38, 14, 22, -8, 6, 2, 9, 22, -4, 20),
  jk0: P(0, 38, 0, 6, 4, 0, 0, 12, 26, -4, 24),
  jk: P(0, 38, -12, 4, 6, -2, 2, 32, 22, -6, 26),
  block: P(-2, 32, -2, 8, 10, 10, 6, 8, 2, -12, 2),
  cblock: P(-3, 19, 8, 8, 10, 10, 6, 10, 2, -11, 2),
  hit: P(-3, 32, -16, 2, -8, -4, -6, 9, 2, -12, 2),
  hit2: P(-5, 31, -26, -2, -4, -8, -2, 8, 2, -13, 2),
  chit: P(-3, 19, 0, 4, -6, -2, -8, 10, 2, -11, 2),
  fall: P(0, 30, -10, 4, 8, -6, 10, 14, 16, 4, 10, 60),
  down: P(0, 5, 0, 4, -20, -4, -20, 2, -30, -2, -30, 90),
  getup: P(-2, 14, 30, 8, -10, 4, -14, 14, 2, -6, 2),
  win: P(0, 34, -2, 4, 28, 10, 24, 7, 2, -8, 2),
  win2: P(0, 33, 4, 12, 2, 14, -2, 7, 2, -8, 2),
  lose: P(-1, 29, 26, 4, -16, 2, -18, 8, 2, -10, 2),
  dizzy0: P(-1, 31, 14, 2, -18, -2, -20, 9, 2, -10, 2, -4),
  dizzy1: P(1, 31, 10, 4, -18, 0, -20, 9, 2, -10, 2, 4),
  throw0: P(2, 32, 14, 18, 2, 16, -2, 11, 2, -11, 2),
  throw1: P(-2, 32, -24, -6, 16, -10, 12, 13, 2, -9, 2),
  cast0: P(-2, 32, -8, -6, -10, -4, -8, 10, 2, -11, 2),
  cast1: P(4, 30, 16, 26, 2, 22, -2, 15, 2, -13, 2),
  slide: P(0, 12, -40, -6, 10, -12, -6, 32, 3, 6, 6),
  fly: P(0, 36, -16, 4, 8, -8, 4, 36, 30, -6, 22),
  charge: P(4, 30, 34, 8, -6, 6, -8, 14, 2, -12, 2),
  fatal0: P(0, 32, 0, 26, 8, 24, 4, 9, 2, -10, 2),
};

// ---------------- Vuruşlar ----------------
const NORMALS = {
  hp: { seq: [['p0', 3], ['p1', 3, 1], ['p0', 6]], dmg: 5, limb: 'hf', r: 5, hs: 13, bs: 9, push: 2.4, lvl: 'mid', chain: 'hp2' },
  hp2: { seq: [['p0', 2], ['p1b', 3, 1], ['p0', 7]], dmg: 5, limb: 'hb', r: 5, hs: 13, bs: 9, push: 2.6, lvl: 'mid', chain: 'hp' },
  hk: { seq: [['k0', 5], ['k1', 5, 1], ['k0', 12]], dmg: 9, limb: 'ff', r: 6, hs: 16, bs: 12, push: 3.2, lvl: 'mid', heavy: 1 },
  rh: { seq: [['rh0', 7], ['rh1', 5, 1], ['rh0', 16]], dmg: 12, limb: 'ff', r: 7, hs: 18, bs: 14, push: 3.4, lvl: 'mid', heavy: 1, kd: 1 },
  up: { seq: [['up0', 5], ['up1', 5, 1], ['up1', 18]], dmg: 13, limb: 'hf', r: 7, hs: 20, bs: 14, push: 2, lvl: 'mid', heavy: 1, launch: 1, crouchStart: 1 },
  lk: { seq: [['lk0', 4], ['lk1', 4, 1], ['lk0', 9]], dmg: 5, limb: 'ff', r: 6, hs: 13, bs: 10, push: 2.4, lvl: 'low', crouch: 1 },
  jp: { seq: [['jp', 3], ['jp', 40, 1]], dmg: 8, limb: 'hf', r: 6, hs: 16, bs: 12, push: 2, lvl: 'high', air: 1 },
  jk: { seq: [['jk0', 4], ['jk', 40, 1]], dmg: 10, limb: 'ff', r: 7, hs: 18, bs: 13, push: 2.4, lvl: 'high', air: 1, heavy: 1, kd: 1 },
};
for (const k in NORMALS) { NORMALS[k].normal = true; NORMALS[k].id = k; }

const SPECIALS = {
  proj: { id: 'proj', seq: [['cast0', 9], ['cast1', 4], ['cast1', 20]], spawnAt: 1, special: 1 },
  slide: { id: 'slide', seq: [['crouch', 4], ['slide', 22, 1], ['crouch', 14]], dmg: 9, limb: 'ff', r: 8, hs: 18, bs: 14, push: 2, lvl: 'low', kd: 1, heavy: 1, special: 1 },
  tele: { id: 'tele', seq: [['idle0', 12], ['idle0', 8], ['p0', 3], ['p1', 6, 1], ['p0', 14]], dmg: 10, limb: 'hf', r: 7, hs: 18, bs: 14, push: 3, lvl: 'mid', kd: 1, heavy: 1, special: 1 },
  fly: { id: 'fly', seq: [['tuck', 5], ['fly', 26, 1], ['jumpUp', 40]], dmg: 11, limb: 'ff', r: 8, hs: 18, bs: 14, push: 3, lvl: 'mid', kd: 1, heavy: 1, special: 1 },
  charge: { id: 'charge', seq: [['charge', 6], ['charge', 26, 1], ['idle0', 16]], dmg: 12, limb: 'body', r: 10, hs: 18, bs: 14, push: 3.5, lvl: 'mid', kd: 1, heavy: 1, special: 1 },
};
const PROJ = {
  ice: { vx: 3.8, dmg: 4, fx: 'freeze', y: -58 },
  chain: { vx: 5.5, dmg: 6, fx: 'pull', y: -62, life: 34 },
  acid: { vx: 3.2, vy: -2.6, g: 0.1, dmg: 9, y: -62 },
  dragon: { vx: 3.4, dmg: 10, y: -60 },
  rocket: { vx: 1.6, acc: 0.18, max: 6, dmg: 12, y: -64 },
  bossfire: { vx: 3.6, dmg: 13, y: -70 },
};

const MOTIONS = { bf: [[4, 6]], df: [[2, 6], [2, 3, 6]], ff: [[6, 5, 6]] };

// ---------------- Sprite'lar ----------------
let ART = null;
function art() {
  if (ART) return ART;
  const ice = makeSprite([
    '...wwww...',
    '.wwBBBBww.',
    'wBBbbbbBBw',
    'wBbWWWWbBw',
    'wBbWWWWbBw',
    'wBBbbbbBBw',
    '.wwBBBBww.',
    '...wwww...',
  ], { w: '#c0f0ff', B: '#4090e0', b: '#80c0ff', W: '#ffffff' });
  const acid = makeSprite([
    '..gggg..',
    '.gGGGGg.',
    'gGGyyGGg',
    'gGyyyyGg',
    'gGGyyGGg',
    '.gGGGGg.',
    '..gggg..',
  ], { g: '#1a6a10', G: '#40c020', y: '#c0ff60' });
  const dragon = [0, 1].map((f) => makeSprite([
    '......oooo......',
    '...ooOOOOOoo....',
    '.ooOOyyyyyOOo...',
    'oOOyyyWWWyyyOOo.',
    'OOyyWWWWWWWyyOOo',
    'oOOyyyWWWyyyOOo.',
    '.ooOOyyyyyOOo...',
    '...ooOOOOOoo....',
    '......oooo......',
  ].map((r, i) => (f && i % 2 ? `${r.slice(1)}.` : r)), { o: '#801008', O: '#e03010', y: '#ffa020', W: '#fff0a0' }));
  const rocket = makeSprite([
    '....GGGG......',
    'rr.GGGGGGGGGw.',
    'rrRGGGGGGGGGWw',
    'rr.GGGGGGGGGw.',
    '....GGGG......',
  ], { G: '#6a7060', R: '#ff4010', r: '#ffd040', w: '#c0c0c0', W: '#ffffff' });
  const fire = makeSprite([
    '....oooooo....',
    '..ooOOOOOOoo..',
    '.oOOyyyyyyOOo.',
    'oOyyyWWWWyyyOo',
    'oOyyWWWWWWyyOo',
    'oOyyWWWWWWyyOo',
    'oOyyyWWWWyyyOo',
    '.oOOyyyyyyOOo.',
    '..ooOOOOOOoo..',
    '....oooooo....',
  ], { o: '#600808', O: '#c02010', y: '#ff7010', W: '#ffd060' });
  const frog = [
    makeSprite([
      '..GG..GG..',
      '.GWEGGWEG.',
      '.GGGGGGGG.',
      'GGgggggGGG',
      'GgggggggGG',
      '.GGGGGGGG.',
      'GG......GG',
    ], { G: '#30a020', g: '#80e050', W: '#ffffff', E: '#000000' }),
    makeSprite([
      '..GG..GG..',
      '.GWEGGWEG.',
      '.GGGGGGGG.',
      'GGgggggGGG',
      '.GgggggGG.',
      'G.GGGGGG.G',
      'G........G',
    ], { G: '#30a020', g: '#80e050', W: '#ffffff', E: '#000000' }),
  ];
  const medal = makeSprite([
    '..yyyy..',
    '.yYYYYy.',
    'yYYrrYYy',
    'yYrrrrYy',
    'yYrrrrYy',
    'yYYrrYYy',
    '.yYYYYy.',
    '..yyyy..',
  ], { y: '#806010', Y: '#e0b030', r: '#a01010' });
  ART = { ice, acid, dragon, rocket, fire, frog, medal };
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
    Object.assign(this, {
      x, y: 0, vx: 0, vy: 0, face, drawFace: face, state: 'idle', t: 0, atk: null, ph: 0, pt: 0, hits: 0, stun: 0,
      flash: 0, buf: [], invuln: 0, airAtk: false, pose: 'idle0', rot: 0, jdir: 0, combo: 0, comboShow: 0, ko: false,
      airId: 0, atkId: 0, cmdBack: false, cmdDown: false, cmdDx: 0, lastHitConnected: 0, sk: null, juggle: 0, alpha: 1,
      fx: null, hidden: false, chainQueued: false, hitCrouch: false,
    });
  }

  get S() { return this.ch.s; }
  get opp() { return this.g.f[1 - this.side]; }
  get grounded() { return this.y >= 0; }
  canAct() { return ['idle', 'walk', 'crouch', 'guard', 'cguard'].includes(this.state); }
  isCrouching() { return ['crouch', 'cguard'].includes(this.state) || (this.state === 'attack' && this.atk?.crouch) || (this.state === 'block' && this.cmdDown) || (this.state === 'hit' && this.hitCrouch); }
  setState(s) { this.state = s; this.t = 0; }

  record(cmd) {
    const dx = (cmd.right ? 1 : 0) - (cmd.left ? 1 : 0);
    const dy = (cmd.down ? 1 : 0) - (cmd.up ? 1 : 0);
    const fx = dx * this.face;
    const n = (dy > 0 ? 0 : dy < 0 ? 6 : 3) + (fx < 0 ? 1 : fx > 0 ? 3 : 2);
    const last = this.buf[this.buf.length - 1];
    if (!last || last.n !== n) this.buf.push({ n, f: this.g.tick });
    if (this.buf.length > 16) this.buf.shift();
    this.cmdBack = fx < 0;
    this.cmdFwd = fx > 0;
    this.cmdDown = dy > 0;
    this.cmdDx = dx;
  }

  motion(name) {
    const recent = this.buf.filter((e) => this.g.tick - e.f <= 20).map((e) => e.n);
    for (const pat of MOTIONS[name]) {
      let i = 0;
      for (const n of recent) if (n === pat[i]) i++;
      if (i >= pat.length) return true;
    }
    return false;
  }

  // 'proj' | 'mob' | null
  wantsSpecial(cmd) {
    if (cmd.c) return this.cmdFwd ? 'mob' : 'proj';
    if (cmd.a && this.motion('bf')) return 'proj';
    if (cmd.b && this.motion('df')) return 'mob';
    return null;
  }

  startAttack(def) {
    this.atk = def;
    this.ph = 0;
    this.pt = 0;
    this.hits = 0;
    this.atkId = ATK_ID++;
    this.lastHitConnected = 0;
    this.chainQueued = false;
    this.setState('attack');
    this.pose = def.seq[0][0];
    if (!def.air) { this.vx = 0; if (this.y >= 0) { this.vy = 0; this.y = 0; } }
    this.g.whoosh(def.heavy);
  }

  startSpecial(kind) {
    if (kind === 'proj') {
      if (this.g.projs.some((p) => p.owner === this)) return false;
      this.startAttack(SPECIALS.proj);
    } else {
      const m = this.ch.mob;
      this.startAttack(SPECIALS[m]);
      if (m === 'tele') { this.invuln = 22; this.g.sfx.tone(900, 0.25, { slide: 120, type: 'triangle', vol: 0.08 }); }
      if (m === 'fly') { this.vy = -4.5; }
      if (m === 'slide') this.g.sfx.noise(0.3, { vol: 0.15, freq: 1500 });
    }
    this.buf = [];
    return true;
  }

  tryThrow(cmd) {
    const o = this.opp;
    if (!cmd.a || !(cmd.left || cmd.right)) return false;
    if (Math.abs(o.x - this.x) > 28 * this.S + 6 || !o.grounded) return false;
    if (!['idle', 'walk', 'crouch', 'guard', 'cguard'].includes(o.state) || o.invuln > 0) return false;
    this.setState('throw');
    this.pose = 'throw0';
    o.setState('thrown');
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
    const spd = 1.75 * this.ch.spd;
    this.rot = 0;
    this.drawFace = this.face;
    this.alpha = 1;

    switch (this.state) {
      case 'idle': case 'walk': case 'crouch': case 'guard': case 'cguard': {
        if (this.grounded) this.face = o.x >= this.x ? 1 : -1;
        this.drawFace = this.face;
        this.record(cmd);
        const sp = this.wantsSpecial(cmd);
        if (sp && this.startSpecial(sp)) break;
        if (this.tryThrow(cmd)) break;
        if (cmd.a || cmd.b) {
          let k;
          if (cmd.down) k = cmd.a ? 'up' : 'lk';
          else if (cmd.b && this.cmdBack) k = 'rh';
          else k = cmd.a ? 'hp' : 'hk';
          this.startAttack(NORMALS[k]);
          break;
        }
        if (cmd.up) { this.setState('prejump'); this.jdir = this.cmdDx; this.pose = 'prejump'; break; }
        const threat = this.g.threatTo(this);
        if (cmd.down) {
          this.vx = 0;
          if (this.state !== 'crouch' && this.state !== 'cguard') this.t = 0;
          this.state = this.cmdBack && threat ? 'cguard' : 'crouch';
          this.pose = this.state === 'cguard' ? 'cblock' : 'crouch';
          break;
        }
        if (this.cmdBack && threat) { this.state = 'guard'; this.vx = 0; this.pose = 'block'; break; }
        if (this.cmdDx) {
          if (this.state !== 'walk') { this.state = 'walk'; this.t = 0; }
          this.vx = this.cmdDx * (this.cmdBack ? spd * 0.8 : spd);
          const fr = Math.floor(this.t / 6) % 4;
          this.pose = `walk${this.cmdBack ? 3 - fr : fr}`;
        } else {
          if (this.state !== 'idle') { this.state = 'idle'; this.t = 0; }
          this.vx = 0;
          this.pose = Math.floor(this.t / 16) % 2 ? 'idle1' : 'idle0';
        }
        break;
      }
      case 'prejump':
        this.record(cmd);
        if (this.t >= 3) {
          this.setState('air');
          this.airId++;
          this.vy = -8.8;
          this.vx = this.jdir * 2.9 * this.ch.spd;
          this.airAtk = false;
          this.g.sfx.play('jump');
        }
        break;
      case 'air':
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
          if (this.t > 3) this.rot = -this.jdir * this.face * 360 * Math.min(1, (this.t - 3) / 28);
          if (Math.abs(this.rot) >= 359) this.rot = 0;
        } else this.pose = this.vy < -3 || this.vy > 3 ? 'jumpUp' : 'tuck';
        break;
      case 'attack':
        this.record(cmd);
        this.updateAttack(cmd);
        break;
      case 'hit': case 'block':
        this.record(cmd);
        this.vx *= 0.85;
        if (this.state === 'hit') this.pose = this.hitCrouch ? 'chit' : (this.t < 6 ? 'hit2' : 'hit');
        else this.pose = this.cmdDown ? 'cblock' : 'block';
        if (this.t >= this.stun) { this.combo = 0; this.setState(this.cmdDown ? 'crouch' : 'idle'); }
        break;
      case 'frozen':
        this.vx = 0;
        if (this.t >= this.stun) { this.setState('idle'); this.combo = 0; }
        break;
      case 'pulled': {
        const tx = this.pullTo;
        const d = tx - this.x;
        this.x += Math.sign(d) * Math.min(Math.abs(d), 7);
        this.pose = 'hit2';
        if (Math.abs(d) < 2 || this.t > 30) { this.setState('stunned'); this.stun = 46; }
        break;
      }
      case 'stunned':
        this.pose = Math.floor(this.t / 12) % 2 ? 'dizzy1' : 'dizzy0';
        this.vx = 0;
        if (this.t >= this.stun) { this.setState('idle'); this.combo = 0; }
        break;
      case 'fall':
        this.vy += GRAV;
        this.pose = 'fall';
        this.rot = Math.min(110, 20 + this.t * 5);
        if (this.y >= 0 && this.vy > 0 && this.t > 2) {
          this.y = 0;
          this.vy = 0;
          this.vx = 0;
          this.juggle = 0;
          this.setState(this.ko ? 'ko' : 'down');
          this.g.dust(this.x, 10);
          this.g.sfx.noise(0.18, { vol: 0.3, freq: 450 });
          this.g.shake = Math.max(this.g.shake, 5);
        }
        break;
      case 'down':
        this.pose = 'down';
        this.vx = 0;
        if (this.t >= 30) { this.setState('getup'); this.invuln = 22; }
        break;
      case 'getup':
        this.pose = this.t < 9 ? 'getup' : 'crouch';
        if (this.t >= 16) { this.setState('idle'); this.invuln = 4; this.combo = 0; }
        break;
      case 'ko':
        this.pose = 'down';
        this.vx = 0;
        break;
      case 'dizzy':
        this.pose = Math.floor(this.t / 14) % 2 ? 'dizzy1' : 'dizzy0';
        this.vx = 0;
        break;
      case 'throw':
        this.pose = this.t < 10 ? 'throw0' : 'throw1';
        if (this.t === 10) {
          const tf = this.thrownBack ? -this.face : this.face;
          o.setState('fall');
          o.vy = -6.5;
          o.vx = tf * 3.4;
          o.y = -10;
          o.face = -tf;
          o.juggle = 3;
          this.g.applyDamage(this, o, 13 * this.ch.pow);
          this.g.sfx.play('hit');
          this.g.shake = 6;
        }
        if (this.t >= 24) this.setState('idle');
        break;
      case 'thrown':
        this.pose = 'hit2';
        this.vx = 0;
        if (this.t > 30) this.setState('idle');
        break;
      case 'win':
        this.pose = this.t < 30 ? 'idle0' : (Math.floor(this.t / 24) % 2 ? 'win2' : 'win');
        break;
      case 'lose':
        this.pose = 'lose';
        break;
      case 'intro':
        this.pose = Math.floor(this.t / 16) % 2 ? 'idle1' : 'idle0';
        this.face = o.x >= this.x ? 1 : -1;
        this.drawFace = this.face;
        break;
      case 'fatal':
        // ölümcül hamle sırasında saldıran poz
        this.vx = 0;
        break;
      case 'victim':
        this.vx = 0;
        break;
      default:
        break;
    }

    this.x += this.vx;
    if (this.state === 'air' || this.state === 'fall' || this.state === 'victim' || (this.state === 'attack' && (this.atk?.air || this.y < 0 || this.vy !== 0))) this.y += this.vy;
    if (this.y > 0 && this.state !== 'fall' && this.state !== 'victim') { this.y = 0; if (this.vy > 0) this.vy = 0; }
    if (this.state === 'air' && this.y >= 0) {
      this.y = 0; this.vy = 0; this.vx = 0;
      this.setState('idle');
      this.g.dust(this.x, 3);
    }
    const base = POSES[this.pose] || POSES.idle0;
    this.sk = toWorld(solve(this.rot ? { ...base, rot: this.rot } : base, this.ch.b), this.x, this.y, this.drawFace, this.S);
  }

  updateAttack(cmd) {
    const a = this.atk;
    const step = a.seq[this.ph];
    this.pt++;
    this.pose = step[0];
    // Seri yumruk (zincir)
    if (a.chain && cmd.a && this.ph >= 1 && !this.cmdDown) this.chainQueued = true;
    if (a.normal && !a.air && this.lastHitConnected) {
      const sp = this.wantsSpecial(cmd);
      if (sp && this.startSpecial(sp)) return;
    }
    if (a.chain && this.chainQueued && this.ph === 2 && this.pt >= 2) { this.startAttack(NORMALS[a.chain]); return; }
    const o = this.opp;
    switch (a.id) {
      case 'slide':
        if (this.ph === 1) { this.vx = this.face * Math.max(1, 5.2 - this.pt * 0.12); if (this.pt % 4 === 0) this.g.dust(this.x - this.face * 10, 1); } else this.vx = 0;
        break;
      case 'tele':
        if (this.ph === 0) this.alpha = Math.max(0, 1 - this.pt / 10);
        if (this.ph === 1) {
          this.alpha = 0;
          if (this.pt === 1) {
            const side = Math.sign(o.x - this.x) || 1;
            this.x = Math.max(20, Math.min(STAGE_W - 20, o.x + side * 34 * this.S));
            this.face = o.x >= this.x ? 1 : -1;
            this.drawFace = this.face;
            this.g.smoke(this.x);
          }
          if (this.pt > 4) this.alpha = (this.pt - 4) / 4;
        }
        break;
      case 'fly':
        if (this.ph === 0) { this.vx = 0; this.vy += GRAV * 0.2; }
        if (this.ph === 1) {
          this.vy = 0;
          if (this.y > -28) this.y -= 2;
          this.vx = this.face * 5.4;
          if (this.hits > 0) this.vx = -this.face * 1;
        }
        if (this.ph === 2) {
          this.vy += GRAV;
          this.vx = this.face * 0.5;
          if (this.y >= 0) { this.y = 0; this.vy = 0; this.vx = 0; this.atk = null; this.setState('idle'); return; }
        }
        break;
      case 'charge':
        this.vx = this.ph === 1 && !this.hits ? this.face * 4.4 : 0;
        if (this.ph === 1 && this.pt % 5 === 0) this.g.dust(this.x - this.face * 14, 1);
        break;
      default:
        if (a.air) {
          this.vy += GRAV;
          if (this.y >= 0 && this.vy > 0) {
            this.y = 0; this.vy = 0; this.vx = 0;
            this.atk = { id: 'land', seq: [['crouch', 3]] };
            this.ph = 0; this.pt = 0;
            return;
          }
        }
        if (a.id === 'up' && this.ph === 1 && this.pt === 1) this.g.sfx.tone(160, 0.2, { slide: 600, vol: 0.08 });
    }
    if (a.spawnAt === this.ph && this.pt === 1) this.g.spawnProj(this);
    if (this.pt >= step[1]) {
      this.ph++;
      this.pt = 0;
      if (this.ph >= a.seq.length) {
        if (this.y < 0) { this.setState('air'); this.jdir = 0; this.airAtk = true; return; }
        this.atk = null;
        this.setState(this.cmdDown ? 'crouch' : 'idle');
      }
    }
  }

  activeHit() {
    if (this.state !== 'attack' || !this.atk?.seq) return null;
    const step = this.atk.seq[this.ph];
    if (!step || !step[2] || !this.sk || this.hits > 0) return null;
    const a = this.atk;
    const r = a.r * this.S;
    const sk = this.sk;
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    switch (a.limb) {
      case 'hf': return [[sk.haF, r], [mid(sk.elF, sk.haF), r * 0.8]];
      case 'hb': return [[sk.haB, r], [mid(sk.elB, sk.haB), r * 0.8]];
      case 'ff': return [[sk.toeF, r], [sk.anF, r], [mid(sk.knF, sk.anF), r * 0.8]];
      case 'body': return [[sk.chest, r], [sk.shF, r], [sk.haF, r]];
      default: return null;
    }
  }

  hurtbox() {
    const s = this.state;
    if (['down', 'ko', 'getup', 'thrown', 'victim', 'fatal'].includes(s) || this.invuln > 0) return null;
    const hw = 10 * this.S;
    if (s === 'fall') {
      if (this.ko || this.juggle >= 3) return null;
      return { x0: this.x - hw * 1.4, x1: this.x + hw * 1.4, y0: this.y - 56 * this.S, y1: this.y };
    }
    if (this.isCrouching()) return { x0: this.x - hw, x1: this.x + hw, y0: this.y - 52 * this.S, y1: this.y };
    if (this.atk?.id === 'slide' && this.state === 'attack') return { x0: this.x - hw * 1.5, x1: this.x + hw * 1.5, y0: this.y - 30 * this.S, y1: this.y };
    if (this.y < 0) return { x0: this.x - hw, x1: this.x + hw, y0: this.y - 68 * this.S, y1: this.y - 6 * this.S };
    return { x0: this.x - hw, x1: this.x + hw, y0: this.y - 78 * this.S, y1: this.y };
  }

  draw(gfx, camX) {
    if (this.hidden) return;
    const base = POSES[this.pose] || POSES.idle0;
    const rot = this.rot || base.rot || 0;
    const pose = rot !== base.rot ? { ...base, rot } : base;
    let tint = null;
    if (this.state === 'frozen') tint = 'ice';
    if (this.fx?.tint) tint = this.fx.tint;
    const ctx = gfx.ctx;
    const a = this.alpha * (this.fx?.alpha ?? 1);
    if (a <= 0.02) return;
    if (a < 1) ctx.globalAlpha = a;
    drawFighterArt(ctx, this.ch, pose, this.drawFace, this.x - camX, GY + this.y, this.flash > 0 && this.flash % 4 < 2, this.g.tick, { tint, scale: this.fx?.scale });
    ctx.globalAlpha = 1;
  }
}

function drawFighterArt(ctx, ch0, pose, face, ox, oy, flash, tick, opt = {}) {
  const ch = opt.scale ? { ...ch0, s: ch0.s * opt.scale } : ch0;
  const b = ch.b;
  const S = ch.s;
  const L = solve(pose, b);
  const w = toWorld(L, ox, oy, face, S);
  const tintT = opt.tint === 'ice' ? TONE_ICE : opt.tint === 'ash' ? TONE_ASH : null;
  const t = (k) => (flash ? FLASH : tintT || ch.T[k] || ch.T.skin);
  const R = (v) => v * S;
  const up = ch.sleeves ? 'top' : 'skin';
  if (!opt.noShadow) {
    const hgt = Math.max(0, GY - oy);
    const sw = Math.max(8, 26 - hgt / 6) * S;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(Math.round(ox - sw / 2), GY - 1, Math.round(sw), 3);
  }
  const D = true;
  const fist = (p, k) => seg(p, p, R(b.fist), R(b.fist), t(k));
  const wrist = (el, ha, k) => {
    const p = [ha[0] + (el[0] - ha[0]) * 0.3, ha[1] + (el[1] - ha[1]) * 0.3];
    const q = [ha[0] + (el[0] - ha[0]) * 0.55, ha[1] + (el[1] - ha[1]) * 0.55];
    return seg(p, q, R(b.fr1 + 0.5), R(b.fr1 + 0.5), t(k));
  };
  const armB = [seg(w.shB, w.elB, R(b.ar0), R(b.ar1), t(`${up}B`)), seg(w.elB, w.haB, R(b.fr0), R(b.fr1), t('skinB'))];
  if (ch.col.wrist) armB.push(wrist(w.elB, w.haB, 'wristB'));
  armB.push(fist(w.haB, 'fistB'));
  drawGroup(ctx, armB, D);
  drawGroup(ctx, [seg(w.hipB, w.knB, R(b.lr0), R(b.lr1), t('thighB')), seg(w.knB, w.anB, R(b.sr0), R(b.sr1), t('shinB')), seg(w.anB, w.toeB, R(1.8), R(1.4), t('feetB'))], D);
  drawGroup(ctx, [seg(w.hipB, w.hipF, R(b.pel), R(b.pel), t('pants')), seg(w.hip, w.chest, R(b.tr0), R(b.tr1), t('top'))], D);
  if (ch.col.panel) {
    const hp = [w.hip[0] + (w.chest[0] - w.hip[0]) * -0.1, w.hip[1] + (w.chest[1] - w.hip[1]) * -0.1];
    drawGroup(ctx, [seg(hp, w.chest, R(b.tr0 * 0.5), R(b.tr1 * 0.42), t('panel'))], D);
  }
  if (ch.chest && !flash && !tintT) {
    const c = w.chest;
    pline(ctx, c[0] - 4 * S, c[1] + 6, c[0] + face * 3, c[1] + 7, ch.T.skin.x);
    pline(ctx, c[0] + face * 3, c[1] + 7, c[0] + 6 * S, c[1] + 6, ch.T.skin.x);
    pline(ctx, c[0] + face * 1, c[1] + 10, c[0] + face * 1, c[1] + 18, ch.T.skin.d);
  }
  drawGroup(ctx, [seg(w.beltA, w.beltZ, R(1.4), R(1.4), t('belt'))], D);
  if (!flash && !tintT && (ch.id === 'ayaz' || ch.id === 'kor' || ch.id === 'zehir')) {
    // ninja önlüğü ucu
    const c = w.beltC;
    const pc = ch.T.panel.m;
    for (let k = 0; k < 7; k++) { ctx.fillStyle = k < 6 ? pc : ch.T.panel.o; ctx.fillRect(Math.round(c[0] - 2 + face), Math.round(c[1] + k), 4, 1); }
  }
  drawGroup(ctx, [seg(w.chest, w.neck, R(2.3), R(2.3), t('skin'))], D);
  // Kafa
  const ln = pose.lean * D2R;
  let dx = Math.sin(ln) * b.hc;
  let dy = Math.cos(ln) * b.hc;
  if (pose.rot) {
    const a = pose.rot * D2R;
    const c = Math.cos(a);
    const s = Math.sin(a);
    [dx, dy] = [dx * c - dy * s, dx * s + dy * c];
  }
  const hc = [ox + face * (L.neck[0] + dx) * S, oy - (L.neck[1] + dy) * S];
  let q = Math.round(((pose.rot || 0) % 360) / 90);
  q = ((q % 4) + 4) % 4;
  const set = opt.tint === 'ice' ? ch.headsIce : opt.tint === 'ash' ? ch.headsAsh : ch.heads;
  const hs = set[q];
  const spr = flash ? (face > 0 ? hs.wr : hs.wl) : (face > 0 ? hs.r : hs.l);
  if (opt.scale && opt.scale < 0.9) {
    const sc = Math.max(0.3, opt.scale);
    ctx.drawImage(spr, Math.round(hc[0] - (spr.width * sc) / 2), Math.round(hc[1] - (spr.height * sc) / 2), Math.max(1, Math.round(spr.width * sc)), Math.max(1, Math.round(spr.height * sc)));
  } else ctx.drawImage(spr, Math.round(hc[0] - spr.width / 2), Math.round(hc[1] - spr.height / 2));
  drawGroup(ctx, [seg(w.hipF, w.knF, R(b.lr0), R(b.lr1), t('thigh')), seg(w.knF, w.anF, R(b.sr0), R(b.sr1), t('shin')), seg(w.anF, w.toeF, R(1.8), R(1.4), t('feet'))], D);
  const armF = [seg(w.shF, w.elF, R(b.ar0), R(b.ar1), t(up)), seg(w.elF, w.haF, R(b.fr0), R(b.fr1), t('skin'))];
  if (ch.col.wrist) armF.push(wrist(w.elF, w.haF, 'wrist'));
  armF.push(fist(w.haF, 'fist'));
  drawGroup(ctx, armF, D);
  return w;
}

// ---------------- Bilgisayar ----------------
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
    this.finT = 0;
  }

  get(me, op, g) {
    const c = blankCmd();
    const lv = this.lv;
    const f = me.face;
    const fw = () => { if (f > 0) c.right = true; else c.left = true; };
    const bk = () => { if (f > 0) c.left = true; else c.right = true; };
    const dist = Math.abs(op.x - me.x);
    const R = Math.random;

    // Bitir onu anı
    if (g.phase === 'finish') {
      if (op.state !== 'dizzy') return c;
      this.finT++;
      if (!this.finPlan) this.finPlan = { fatal: R() < 0.45 + lv * 0.35, at: 50 + Math.floor(R() * 80) };
      if (dist > 70) { fw(); return c; }
      if (this.finT > this.finPlan.at && me.canAct()) {
        if (this.finPlan.fatal) { g.doFatality(me); } else { c.down = true; c.a = true; }
      }
      return c;
    }
    this.finPlan = null;
    this.finT = 0;

    if (me.state === 'hit' || me.state === 'block') {
      if (this.guardT > 0 || R() < lv * 0.5) { bk(); if (op.atk?.lvl === 'low') c.down = true; }
      return c;
    }
    if (me.state === 'attack') {
      if (me.atk?.chain && me.lastHitConnected && R() < 0.3 + lv * 0.5) c.a = true;
      if (me.atk?.normal && me.lastHitConnected && this.cancelTried !== me.atkId) {
        this.cancelTried = me.atkId;
        if (R() < lv * 0.45 && dist < 80) { c.c = true; if (R() < 0.5) fw(); }
      }
      return c;
    }
    if (me.state === 'air') {
      if (!me.airAtk && dist < 64 && me.vy > -2) c[R() < 0.4 ? 'a' : 'b'] = true;
      return c;
    }
    if (!me.canAct()) return c;

    // Hokkabazlık: rakip havada süzülüyorsa (aparkat sonrası) takip
    if (op.state === 'fall' && !op.ko && op.juggle < 3 && R() < lv * 0.25) {
      if (dist < 60) { c.up = true; fw(); } else if (dist < 160) c.c = true;
      return c;
    }

    if (op.state === 'attack' && op.atk && op.atkId !== this.seenAtk) {
      this.seenAtk = op.atkId;
      this.blockRoll = R() < 0.1 + 0.62 * lv;
    }
    if (op.state === 'attack' && op.atk && this.blockRoll && dist < 120 && op.atk.id !== 'proj') {
      bk();
      if (op.atk.lvl === 'low') c.down = true;
      this.guardT = 8;
      return c;
    }
    if (this.guardT > 0) { this.guardT--; bk(); return c; }

    const pr = g.projs.find((p) => p.owner === op && Math.sign(p.vx || 1) === Math.sign(me.x - p.x) && Math.abs(p.x - me.x) < 170);
    if (pr) {
      if (pr.id !== this.seenProj) {
        this.seenProj = pr.id;
        const r = R();
        if (r < 0.12 + 0.6 * lv) this.projPlan = R() < 0.4 && lv > 0.3 ? (me.ch.mob === 'tele' && R() < 0.5 ? 'tele' : 'jump') : 'block';
        else this.projPlan = 'none';
      }
      const pd = Math.abs(pr.x - me.x);
      if (this.projPlan === 'block') { bk(); return c; }
      if (this.projPlan === 'jump' && pd < 95 && pd > 40) { c.up = true; fw(); this.projPlan = 'none'; return c; }
      if (this.projPlan === 'tele' && pd < 120) { c.c = true; fw(); this.projPlan = 'none'; return c; }
    }

    if (op.state === 'air' || (op.state === 'attack' && op.atk?.air)) {
      if (op.airId !== this.seenAir) {
        this.seenAir = op.airId;
        this.aa = R() < 0.15 + 0.7 * lv;
        this.aaBlock = R() < 0.3 + 0.5 * lv;
      }
      if (this.aa && dist < 62 && op.vy > -3 && op.y < -14) {
        this.aa = false;
        c.down = true;
        c.a = true;
        return c;
      }
      if (!this.aa && this.aaBlock && dist < 100) { bk(); return c; }
    }

    if (--this.pt <= 0) this.choose(me, op, g, dist);
    switch (this.plan) {
      case 'fwd': fw(); break;
      case 'back': bk(); break;
      case 'crouch': c.down = true; break;
      case 'guard': bk(); if (op.isCrouching()) c.down = true; break;
      case 'jump': c.up = true; fw(); this.plan = 'wait'; this.pt = 30; break;
      case 'proj': c.c = true; this.plan = 'wait'; this.pt = 30 - Math.floor(lv * 12); break;
      case 'mob': c.c = true; fw(); this.plan = 'wait'; this.pt = 30; break;
      case 'poke': {
        if (dist > 58 * me.S) { fw(); break; }
        const r = R();
        if (dist < 28 * me.S + 6 && r < 0.2 + lv * 0.2) { c.a = true; fw(); } else if (r < 0.35) c.a = true;
        else if (r < 0.55) c.b = true;
        else if (r < 0.75) { c.down = true; c.a = true; } else if (r < 0.88) { c.down = true; c.b = true; } else { c.b = true; bk(); }
        this.plan = 'wait';
        this.pt = 12 + Math.floor((1 - lv) * 16 + R() * 10);
        break;
      }
      default: break;
    }
    return c;
  }

  choose(me, op, g, dist) {
    const R = Math.random;
    const lv = this.lv;
    const aggro = 0.4 + lv * 0.45;
    let plan = 'wait';
    let t = 6 + Math.floor(R() * 12);
    const hasProj = g.projs.some((p) => p.owner === me);
    if (op.state === 'down' || op.state === 'getup') { plan = R() < 0.6 ? 'fwd' : 'wait'; t = 10; } else if (dist > 140) {
      const r = R();
      if (!hasProj && r < 0.35 + lv * 0.1) plan = 'proj';
      else if (r < 0.5 && me.ch.mob !== 'slide') plan = 'mob';
      else if (r < 0.85) { plan = 'fwd'; t = 16 + Math.floor(R() * 20); } else plan = 'jump';
    } else if (dist > 70) {
      const r = R();
      if (!hasProj && r < 0.22 + lv * 0.12) plan = 'proj';
      else if (r < 0.34 + lv * 0.08) plan = 'mob';
      else if (r < 0.7) { plan = 'fwd'; t = 10 + Math.floor(R() * 12); } else if (r < 0.8) plan = 'jump';
      else if (r < 0.9) plan = 'guard';
      else plan = 'back';
    } else {
      const r = R();
      if (r < aggro) plan = 'poke';
      else if (r < aggro + 0.2) { plan = 'guard'; t = 10 + Math.floor(R() * 14); } else if (r < aggro + 0.28) plan = 'crouch';
      else if (r < aggro + 0.34) plan = 'mob';
      else plan = 'back';
    }
    this.plan = plan;
    this.pt = t;
  }
}

// ---------------- Oyun ----------------
export default class DeadlyGame {
  constructor(api) {
    this.api = api;
    this.sfx = api.sfx;
    this.tick = 0;
    this.projs = [];
    this.parts = [];
    this.shake = 0;
    this.stop = 0;
    this.slow = 0;
    this.banner = null;
    this.sub = null;
    this.projId = 1;
    this.loop = 0;
    this.ladderPos = 0;
    this.sel = 0;
    this.gameOverSent = false;
    art();
    if (api.preview) {
      const a = api.randInt(0, CHARS.length - 1);
      let b = api.randInt(0, CHARS.length - 1);
      if (b === a) b = (a + 1) % CHARS.length;
      this.playerCh = prepChar(CHARS[a]);
      this.startFight(prepChar(CHARS[b]), 0.7, api.randInt(0, 2), true);
      this.phase = 'fight';
      this.f[0].setState('idle');
      this.f[1].setState('idle');
      this.f[0].x = STAGE_W / 2 - 40;
      this.f[1].x = STAGE_W / 2 + 40;
    } else {
      this.mode = 'select';
      this.t = 0;
      this.selPreview = CHARS.map((c) => prepChar(c));
    }
  }

  buildLadder() {
    const others = CHARS.filter((c) => c.id !== this.playerCh.id);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    this.ladder = [...others, BOSS];
    this.ladderPos = 0;
  }

  level() { return Math.min(1.3, 0.15 + this.ladderPos * 0.2 + this.loop * 0.4); }

  startLadderScreen() {
    this.cpuBase = this.ladder[this.ladderPos];
    this.cpuCh = prepChar(this.cpuBase);
    this.mode = 'ladder';
    this.t = 0;
    this.sfx.seq([['C3', 0.2], ['G2', 0.2], ['C3', 0.4]], { type: 'sawtooth', vol: 0.08 });
  }

  startFight(cpuCh, lv, stage, preview = false) {
    this.mode = 'fight';
    this.cpuCh = cpuCh;
    this.stageIdx = stage;
    getStage(stage);
    this.f = [new Fighter(this.playerCh, 0, this), new Fighter(cpuCh, 1, this)];
    this.brain = new Brain(lv);
    this.brains = preview ? [new Brain(lv), new Brain(lv)] : [null, this.brain];
    this.round = 1;
    this.startRound();
  }

  startRound() {
    const [a, b] = this.f;
    a.reset(STAGE_W / 2 - 64, 1);
    b.reset(STAGE_W / 2 + 64, -1);
    a.hp = a.maxHp; a.dispHp = a.hp;
    b.hp = b.maxHp; b.dispHp = b.hp;
    a.setState('intro');
    b.setState('intro');
    this.projs = [];
    this.parts = [];
    this.timer = 90;
    this.timerT = 0;
    this.phase = 'intro';
    this.pt = 0;
    this.dmgTaken = 0;
    this.camX = STAGE_W / 2 - W / 2;
    this.banner = null;
    this.sub = null;
    this.fatal = null;
    this.dark = 0;
  }

  threatTo(me) {
    const o = me.opp;
    const d = Math.abs(o.x - me.x);
    if (o.state === 'attack' && d < 140) return true;
    if (o.state === 'air' && d < 110) return true;
    return this.projs.some((p) => p.owner === o && Math.abs(p.x - me.x) < 120);
  }

  whoosh(heavy) { this.sfx.noise(heavy ? 0.1 : 0.05, { vol: 0.07, freq: heavy ? 2200 : 4200 }); }

  spawnProj(f) {
    const k = f.ch.proj;
    const d = PROJ[k];
    const p = { id: this.projId++, kind: k, owner: f, x: f.x + f.face * 26 * f.S, y: d.y * f.S / 1.22, vx: f.face * d.vx, vy: d.vy || 0, t: 0, dmg: d.dmg * f.ch.pow, fx: d.fx, life: d.life || 400, ox: f.x };
    this.projs.push(p);
    if (k === 'ice') this.sfx.tone(1400, 0.3, { slide: 500, type: 'triangle', vol: 0.08 });
    else if (k === 'chain') this.sfx.noise(0.25, { vol: 0.12, freq: 6000 });
    else if (k === 'acid') this.sfx.tone(300, 0.2, { slide: 120, vol: 0.08 });
    else if (k === 'rocket') this.sfx.noise(0.5, { vol: 0.15, freq: 800 });
    else { this.sfx.tone(180, 0.35, { slide: 70, type: 'sawtooth', vol: 0.1 }); this.sfx.noise(0.3, { vol: 0.12, freq: 900 }); }
  }

  dust(x, n) {
    for (let i = 0; i < n; i++) this.parts.push({ kind: 'dust', x: x + (Math.random() - 0.5) * 30, y: -2, vx: (Math.random() - 0.5) * 1.4, vy: -Math.random() * 0.7, t: 0, life: 18 + Math.random() * 10 });
  }

  smoke(x) {
    for (let i = 0; i < 14; i++) this.parts.push({ kind: 'smoke', x: x + (Math.random() - 0.5) * 24, y: -Math.random() * 90, vx: (Math.random() - 0.5) * 0.6, vy: -0.4 - Math.random() * 0.4, t: 0, life: 26 + Math.random() * 12 });
  }

  spark(x, y, blocked, big) {
    this.parts.push({ kind: blocked ? 'block' : 'hit', x, y, t: 0, life: big ? 12 : 9, big });
    if (!blocked) {
      // küçük kırmızı piksel kıvılcımları (abartısız)
      for (let i = 0; i < (big ? 5 : 3); i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
        const v = 1.2 + Math.random() * 1.8;
        this.parts.push({ kind: 'red', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 22 + Math.random() * 10 });
      }
    }
  }

  // Bedensel parçacık patlaması (ölümcül hamle efektleri)
  burst(f, cols, mode) {
    const sk = f.sk;
    if (!sk) return;
    const pts = Object.values(sk);
    for (let i = 0; i < 90; i++) {
      const a = pts[i % pts.length];
      const b2 = pts[(i * 7) % pts.length];
      const u = Math.random();
      const x = a[0] + (b2[0] - a[0]) * u + (Math.random() - 0.5) * 6;
      const y = a[1] + (b2[1] - a[1]) * u + (Math.random() - 0.5) * 6;
      const p = { kind: 'chunk', x, y, t: 0, life: 70 + Math.random() * 40, c: cols[i % cols.length], sz: Math.random() < 0.3 ? 3 : 2 };
      if (mode === 'shatter') { p.vx = (Math.random() - 0.5) * 3; p.vy = -Math.random() * 3; p.g = 0.15; }
      if (mode === 'ash') { p.vx = 0.4 + Math.random() * 1.2; p.vy = -0.2 - Math.random() * 0.5; p.g = 0.01; }
      if (mode === 'pixel') { p.vx = (Math.random() - 0.5) * 0.8; p.vy = -0.4 - Math.random() * 1.2; p.g = -0.01; }
      this.parts.push(p);
    }
  }

  applyDamage(att, def, dmg) {
    const d = Math.max(1, Math.round(dmg));
    def.hp = Math.max(0, def.hp - d);
    if (att.side === 0 && !this.api.preview) this.api.addScore(d * 15);
    if (def.side === 0) this.dmgTaken += d;
    if (def.hp <= 0 && !def.ko) {
      def.ko = true;
      const deciding = att.wins >= 1 && !this.api.preview;
      if (deciding && def.y >= -4 && !['fall', 'thrown'].includes(def.state)) {
        // Bitir onu!
        def.setState('dizzy');
        def.atk = null;
        def.vx = 0;
        def.y = 0;
        this.phase = 'finish';
        this.pt = 0;
        this.finishT = 330;
        this.banner = { text: 'BİTİR ONU!', t: 0, color: '#ff2010', scale: 4 };
        this.sub = att.side === 0 ? 'YAKLAŞ: İLERİ, İLERİ + C' : null;
        this.sfx.seq([['C3', 0.15], ['C3', 0.15], ['G2', 0.4]], { type: 'sawtooth', vol: 0.12 });
        this.projs = [];
        return;
      }
      if (deciding && (def.state === 'fall' || def.y < -4)) {
        // havada bitti: yere düşünce sersemlesin
        this.pendingFinish = def;
        def.setState('fall');
        def.vy = Math.min(def.vy, -3);
        return;
      }
      def.setState('fall');
      def.vy = -7;
      def.vx = (def.x >= att.x ? 1 : -1) * 2.6;
      def.y = Math.min(def.y, -1);
      this.onKO();
    }
  }

  resolveHit(att, def, a, pt, isProj = false) {
    if (def.ko && def.state !== 'dizzy') return false;
    if (this.phase !== 'fight' && this.phase !== 'finish') return false;
    if (def.state === 'dizzy') {
      // Bitir onu anında normal vuruş: rakip yere yığılır
      def.setState('fall');
      def.vy = -6;
      def.vx = (def.x >= att.x ? 1 : -1) * 2.4;
      def.y = -1;
      this.spark(pt[0], pt[1], false, true);
      this.sfx.play('hit');
      this.stop = 8;
      this.onKO();
      return true;
    }
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
      if (a.special || isProj) this.applyDamage(att, def, Math.max(1, (a.dmg * att.ch.pow) / 5));
      this.stop = 5;
      this.spark(pt[0], pt[1], true);
      this.sfx.tone(650, 0.05, { type: 'triangle', vol: 0.12 });
      if (!isProj) att.lastHitConnected = 1;
      return true;
    }
    const airborne = def.y < 0 || def.state === 'fall';
    let dmg = a.dmg * att.ch.pow;
    if (def.state === 'fall') dmg *= 0.75 ** (def.juggle + 1);
    def.combo = ['hit', 'fall', 'frozen', 'stunned', 'pulled'].includes(def.state) ? def.combo + 1 : 1;
    if (def.combo >= 2) { att.comboShow = 70; att.comboN = def.combo; }
    def.flash = 8;
    def.atk = null;
    this.applyDamage(att, def, dmg);
    if (!def.ko || (this.pendingFinish === def)) {
      if (!def.ko) {
        if (a.fx === 'freeze' && !airborne) {
          def.setState('frozen');
          def.stun = 60;
          def.vx = 0;
          this.sfx.tone(2000, 0.4, { slide: 800, type: 'triangle', vol: 0.08 });
        } else if (a.fx === 'pull' && !airborne) {
          def.setState('pulled');
          def.pullTo = att.x + att.face * 30 * att.S;
          this.banner = { text: 'BURAYA GEL!', t: 0, color: '#ffa020', scale: 2, life: 50 };
        } else if (a.launch) {
          def.setState('fall');
          def.vy = airborne ? -6.5 : -9.6;
          def.vx = dir * 1.2;
          def.y = Math.min(def.y, -2);
          def.juggle = airborne ? def.juggle + 1 : 0;
        } else if (airborne) {
          def.setState('fall');
          def.vy = -4.6;
          def.vx = dir * 2;
          def.y = Math.min(def.y, -2);
          def.juggle++;
        } else if (a.kd) {
          def.setState('fall');
          def.vy = -5;
          def.vx = dir * 2.6;
          def.y = -1;
          def.juggle = 2;
        } else {
          def.setState('hit');
          def.hitCrouch = crouching;
          def.stun = a.hs;
          def.vx = dir * a.push;
        }
      }
    }
    this.stop = a.heavy ? 9 : 6;
    if (a.heavy) this.shake = Math.max(this.shake, 6);
    if (a.launch) this.shake = 9;
    this.spark(pt[0], pt[1], false, a.heavy);
    this.sfx.play(a.heavy ? 'hit' : 'punch');
    if (!isProj) att.lastHitConnected = 1;
    return true;
  }

  onKO() {
    if (this.phase === 'ko') return;
    this.phase = 'ko';
    this.pt = 0;
    this.slow = 50;
    this.sub = null;
    this.banner = null;
    this.sfx.play('bigexplode');
    this.shake = 10;
  }

  doFatality(att) {
    if (this.phase !== 'finish') return;
    const vic = att.opp;
    this.phase = 'fatality';
    this.pt = 0;
    this.banner = null;
    this.sub = null;
    this.fatal = { kind: att.ch.fatal, t: 0, att, vic };
    att.setState('fatal');
    att.atk = null;
    att.face = vic.x >= att.x ? 1 : -1;
    att.drawFace = att.face;
    vic.setState('victim');
    vic.atk = null;
    this.sfx.seq([['C2', 0.3], ['C#2', 0.3], ['C2', 0.6]], { type: 'sawtooth', vol: 0.12 });
  }

  updateFatality() {
    const F = this.fatal;
    F.t++;
    const { att, vic, kind } = F;
    const t = F.t;
    this.dark = Math.min(0.72, this.dark + 0.03);
    const pose = (n) => { att.pose = n; };
    switch (kind) {
      case 'ice':
        pose(t < 20 ? 'cast0' : t < 70 ? 'fatal0' : 'idle0');
        if (t === 22) this.sfx.tone(1800, 0.8, { slide: 300, type: 'triangle', vol: 0.1 });
        if (t > 22 && t < 70) { vic.fx = { tint: t > 40 ? 'ice' : null }; if (t % 3 === 0) this.parts.push({ kind: 'frost', x: vic.x + (Math.random() - 0.5) * 30, y: -Math.random() * 90, t: 0, life: 20 }); }
        if (t === 110) { this.burst(vic, ['#c0f0ff', '#80c0ff', '#ffffff', '#4090e0'], 'shatter'); vic.hidden = true; this.sfx.play('explode'); this.shake = 10; }
        break;
      case 'ash':
        pose(t < 20 ? 'cast0' : t < 90 ? 'fatal0' : 'win');
        if (t > 20 && t < 90) {
          for (let k = 0; k < 2; k++) this.parts.push({ kind: 'flame', x: vic.x + (Math.random() - 0.5) * 34, y: -Math.random() * 90, vx: 0, vy: -0.8, t: 0, life: 18 });
          if (t % 12 === 0) this.sfx.noise(0.2, { vol: 0.1, freq: 900 });
          if (t > 50) vic.fx = { tint: 'ash' };
        }
        if (t === 120) { this.burst(vic, ['#5a5450', '#3a3430', '#7a7470', '#2a2420'], 'ash'); vic.hidden = true; this.sfx.noise(0.8, { vol: 0.2, freq: 600 }); }
        break;
      case 'frog':
        pose(t < 20 ? 'cast0' : t < 60 ? 'fatal0' : 'idle0');
        if (t > 24 && t < 80) {
          vic.fx = { scale: Math.max(0.25, 1 - (t - 24) / 56) };
          if (t % 4 === 0) this.parts.push({ kind: 'bubble', x: vic.x + (Math.random() - 0.5) * 30, y: -Math.random() * 60, vx: 0, vy: -0.6, t: 0, life: 24 });
        }
        if (t === 82) { vic.hidden = true; this.frog = { x: vic.x, y: 0, vx: (vic.x >= att.x ? 1 : -1) * 1.3, t: 0 }; this.smoke(vic.x); this.sfx.seq([['G5', 0.08], ['C6', 0.12]], { vol: 0.1 }); }
        if (this.frog) {
          const fr = this.frog;
          fr.t++;
          fr.x += fr.vx;
          fr.y = -Math.abs(Math.sin(fr.t / 9)) * 16;
          if (fr.t % 28 === 0) this.sfx.tone(300, 0.08, { slide: 600, vol: 0.06 });
        }
        break;
      case 'sky':
        pose(t < 20 ? 'up0' : t < 60 ? 'up1' : 'win');
        if (t === 20) {
          vic.setState('victim');
          vic.vy = -14;
          vic.vx = 0;
          vic.y = -2;
          this.shake = 12;
          this.sfx.play('hit');
          this.spark(vic.x, -60, false, true);
        }
        if (t > 20) { vic.pose = 'fall'; vic.rot = t * 18; vic.vy += 0.02; }
        if (t === 150) { vic.hidden = true; this.star = { x: vic.x, t: 0 }; this.sfx.seq([['E6', 0.06], ['B6', 0.15]], { vol: 0.08 }); }
        if (this.star) this.star.t++;
        break;
      case 'pixel':
        pose(t < 100 ? 'fatal0' : 'win');
        if (t > 20 && t < 100) {
          this.laser = { x0: att.sk ? att.sk.neck[0] : att.x, y0: att.sk ? att.sk.neck[1] - 6 : -80, x1: vic.x, y1: -90 + ((t * 3) % 90) };
          if (t % 6 === 0) this.sfx.tone(1200 + (t % 30) * 20, 0.05, { vol: 0.05 });
        } else this.laser = null;
        if (t === 100) { this.burst(vic, ['#ff2020', '#20ff20', '#2060ff', '#ffff20', '#ffffff'], 'pixel'); vic.hidden = true; this.sfx.play('bigexplode'); }
        break;
      default: break;
    }
    if (t === 160) {
      this.banner = { text: 'ÖLÜMCÜL HAMLE', t: 0, color: '#ff2010', scale: 3 };
      this.sub = att.ch.fatalName;
      this.sfx.play('explode');
      if (att.side === 0 && !this.api.preview) this.api.addScore(10000);
    }
    if (t >= 300) {
      this.fatal = null;
      this.frog = null;
      this.star = null;
      this.laser = null;
      this.endRound(true);
    }
  }

  // ---------------- Güncelleme ----------------
  update() {
    this.tick++;
    try {
      if (this.mode === 'select') this.updateSelect();
      else if (this.mode === 'ladder') this.updateLadder();
      else if (this.mode === 'fight') this.updateFight();
      else if (this.mode === 'over') this.updateOver();
      else if (this.mode === 'ending') this.updateEnding();
    } catch (e) {
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
    let confirm = input.pressed('a') || input.pressed('c') || (input.pressed('start') && this.t > 10);
    const p = input.pointer;
    if (p?.pressed) {
      for (let i = 0; i < n; i++) {
        const bx = 22 + i * 58;
        if (p.x >= bx && p.x < bx + 50 && p.y >= 158 && p.y < 208) {
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
      this.startLadderScreen();
    }
  }

  updateLadder() {
    this.t++;
    const { input } = this.api;
    if (this.t > 180 || (this.t > 40 && (input.pressed('a') || input.pressed('start') || input.pointer?.pressed))) {
      const stage = this.cpuBase === BOSS ? 2 : [0, 1, 2, 0][this.ladderPos % 4];
      this.startFight(this.cpuCh, this.level(), stage);
    }
  }

  updateOver() {
    this.t++;
    if (this.t === 1) this.sfx.play('gameover');
    if (this.t > 150 && !this.gameOverSent) { this.gameOverSent = true; this.api.gameOver(); }
  }

  updateEnding() {
    this.t++;
    const { input } = this.api;
    if (this.t === 1) this.sfx.play('levelup');
    if (this.t > 360 || (this.t > 90 && (input.pressed('a') || input.pressed('start')))) {
      this.loop++;
      this.buildLadder();
      this.startLadderScreen();
    }
  }

  playerCmd() {
    const { input } = this.api;
    return { left: input.held('left'), right: input.held('right'), up: input.held('up'), down: input.held('down'), a: input.pressed('a'), b: input.pressed('b'), c: input.pressed('c') };
  }

  updateFight() {
    const [p1, p2] = this.f;
    this.pt++;
    if (this.banner) { this.banner.t++; if (this.banner.life && this.banner.t > this.banner.life) this.banner = null; }
    if (this.shake > 0) this.shake--;
    if (this.phase !== 'fatality' && this.dark > 0) this.dark = Math.max(0, this.dark - 0.05);

    if (this.phase === 'intro') {
      if (this.pt === 1) this.banner = { text: `RAUNT ${this.round}`, t: 0, color: '#e0e0e0', scale: 4 };
      if (this.pt === 70) { this.banner = { text: 'DÖVÜŞ!', t: 0, color: '#ff2010', scale: 5 }; this.sfx.play('start'); }
      if (this.pt >= 105) { this.phase = 'fight'; this.banner = null; p1.setState('idle'); p2.setState('idle'); }
      p1.update(blankCmd());
      p2.update(blankCmd());
      this.updateCamera();
      return;
    }
    if (this.phase === 'fatality') {
      this.updateFatality();
      p1.update(blankCmd());
      p2.update(blankCmd());
      this.updateParts();
      this.updateCamera();
      return;
    }
    if (this.stop > 0) {
      this.stop--;
      if (!this.brains[0]) {
        const c = this.playerCmd();
        p1.record(c);
        if (c.a || c.b || c.c) this.pendingCmd = c;
      }
      this.updateParts();
      return;
    }
    if (this.slow > 0) {
      this.slow--;
      if (this.slow % 3 !== 0) { this.updateParts(); return; }
    }

    let c1 = blankCmd();
    let c2 = blankCmd();
    if (this.phase === 'fight' || this.phase === 'finish') {
      c1 = this.brains[0] ? this.brains[0].get(p1, p2, this) : this.playerCmd();
      if (this.pendingCmd) {
        c1.a = c1.a || this.pendingCmd.a;
        c1.b = c1.b || this.pendingCmd.b;
        c1.c = c1.c || this.pendingCmd.c;
        this.pendingCmd = null;
      }
      c2 = this.brains[1].get(p2, p1, this);
      if (this.phase === 'finish') {
        // Sersemlemiş taraf hiçbir şey yapamaz
        if (p1.state === 'dizzy') c1 = blankCmd();
        if (p2.state === 'dizzy') c2 = blankCmd();
        // Ölümcül hamle girdisi: İLERİ, İLERİ + C
        const att = p1.state === 'dizzy' ? p2 : p1;
        if (att === p1 && !this.brains[0] && c1.c) {
          if (Math.abs(p2.x - p1.x) < 100 && p1.canAct() && p1.motion('ff')) { this.doFatality(p1); return; }
          if (Math.abs(p2.x - p1.x) >= 100) this.sub = 'ÇOK UZAKSIN: YAKLAŞ!';
          c1.c = false; // bitir onu anında mermi yok
        }
      }
    }
    p1.update(c1);
    p2.update(c2);
    // Havada biten son raunt: yere düşünce sersemlet
    if (this.pendingFinish && this.pendingFinish.state === 'ko') {
      const d = this.pendingFinish;
      this.pendingFinish = null;
      d.setState('dizzy');
      this.phase = 'finish';
      this.pt = 0;
      this.finishT = 330;
      this.banner = { text: 'BİTİR ONU!', t: 0, color: '#ff2010', scale: 4 };
      this.sub = d.opp.side === 0 ? 'YAKLAŞ: İLERİ, İLERİ + C' : null;
      this.sfx.seq([['C3', 0.15], ['C3', 0.15], ['G2', 0.4]], { type: 'sawtooth', vol: 0.12 });
    }
    this.updateProjectiles();
    this.collide();
    this.updateCamera();
    if (this.phase === 'fight' || this.phase === 'finish') this.checkHits();
    this.updateParts();
    for (const f of this.f) if (f.dispHp > f.hp) f.dispHp = Math.max(f.hp, f.dispHp - 0.5);

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
          this.banner = { text: 'SÜRE DOLDU', t: 0, color: '#e0e0e0', scale: 3 };
        }
      }
    } else if (this.phase === 'finish') {
      if (--this.finishT <= 0) {
        // Süre doldu: sersemleyen yığılır
        const d = this.f.find((f) => f.state === 'dizzy');
        if (d) { d.setState('fall'); d.vy = -3; d.vx = 0; d.y = -1; }
        this.onKO();
      }
    } else if (this.phase === 'ko') {
      const busy = ['fall', 'attack', 'air', 'hit', 'block', 'throw', 'thrown', 'pulled', 'frozen'];
      if (this.pt > 80 && this.f.every((f) => !busy.includes(f.state))) this.endRound(false);
    } else if (this.phase === 'result') {
      if (this.pt > 190) this.nextAfterRound();
    }
  }

  endRound(fatality) {
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
    if (winner) {
      winner.wins++;
      winner.setState('win');
      if (!winner.opp.ko) winner.opp.setState('lose');
      const flawless = winner === p1 ? this.dmgTaken === 0 : p2.hp === p2.maxHp;
      if (!fatality) {
        this.banner = { text: `${winner.ch.name} KAZANDI`, t: 0, color: winner === p1 ? '#e0e0e0' : '#ff4020', scale: 2 };
        this.sub = flawless ? 'KUSURSUZ ZAFER' : null;
      } else {
        this.banner = { text: `${winner.ch.name} KAZANDI`, t: 0, color: '#ff2010', scale: 2 };
        this.sub = 'ÖLÜMCÜL HAMLE';
      }
      if (winner === p1 && !this.api.preview) {
        this.api.addScore(2000 + this.timer * 40 + Math.round(r1 * 2000) + (flawless ? 5000 : 0));
        this.sfx.play('levelup');
      } else this.sfx.play('die');
    } else {
      this.banner = { text: 'BERABERE', t: 0, color: '#e0e0e0', scale: 3 };
    }
  }

  nextAfterRound() {
    const [p1, p2] = this.f;
    if (this.api.preview) { p1.wins = 0; p2.wins = 0; this.startRound(); return; }
    if (p1.wins >= 2) {
      this.api.addScore(4000 * (this.ladderPos + 1) * (this.loop + 1));
      this.ladderPos++;
      if (this.ladderPos >= this.ladder.length) { this.mode = 'ending'; this.t = 0; } else this.startLadderScreen();
      return;
    }
    if (p2.wins >= 2 || this.round >= 5) { this.mode = 'over'; this.t = 0; return; }
    this.round++;
    this.startRound();
  }

  updateProjectiles() {
    for (const p of this.projs) {
      p.t++;
      const d = PROJ[p.kind];
      if (d.acc) p.vx = Math.sign(p.vx) * Math.min(d.max, Math.abs(p.vx) + d.acc);
      if (d.g) { p.vy += d.g; p.y += p.vy; if (p.y > -4) { p.dead = true; this.splash(p.x, '#40c020'); } }
      p.x += p.vx;
      if (p.kind === 'rocket' && p.t % 3 === 0) this.parts.push({ kind: 'smoke', x: p.x - Math.sign(p.vx) * 8, y: p.y, vx: 0, vy: -0.2, t: 0, life: 20 });
      if (p.t > p.life || p.x < this.camX - 30 || p.x > this.camX + W + 30) p.dead = true;
      // Zincir sahibine bağlı: sahibi vurulursa kopar
      if (p.kind === 'chain' && p.owner.state !== 'attack') p.dead = true;
    }
    for (const p of this.projs) for (const q of this.projs) {
      if (p !== q && p.owner !== q.owner && !p.dead && !q.dead && Math.abs(p.x - q.x) < 16 && Math.abs(p.y - q.y) < 20) {
        p.dead = q.dead = true;
        this.spark((p.x + q.x) / 2, p.y, false, true);
        this.sfx.play('explode');
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  splash(x, c) {
    for (let i = 0; i < 8; i++) this.parts.push({ kind: 'chunk', x, y: -2, vx: (Math.random() - 0.5) * 2.4, vy: -Math.random() * 2.4, g: 0.15, t: 0, life: 24, c, sz: 2 });
  }

  collide() {
    const [a, b] = this.f;
    const minD = (10 * a.S + 10 * b.S) * 0.9;
    const overlapY = !(a.y < -50 || b.y < -50) || Math.abs(a.y - b.y) < 40;
    const dx = b.x - a.x;
    const skip = ['down', 'ko', 'thrown', 'victim', 'pulled'];
    const teleporting = (f) => f.atk?.id === 'tele' && f.state === 'attack' && f.ph < 2;
    if (overlapY && Math.abs(dx) < minD && !skip.includes(a.state) && !skip.includes(b.state) && !teleporting(a) && !teleporting(b)) {
      const push = (minD - Math.abs(dx)) / 2;
      const s = dx === 0 ? (a.face > 0 ? 1 : -1) : Math.sign(dx);
      a.x -= s * push;
      b.x += s * push;
    }
    const cam = this.camX ?? 0;
    for (const f of this.f) {
      if (f.state === 'victim') continue;
      const lo = Math.max(14, cam + 12);
      const hi = Math.min(STAGE_W - 14, cam + W - 12);
      if (f.x < lo) f.x = lo;
      if (f.x > hi) f.x = hi;
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
    const results = [];
    for (const [att, def] of [[a, b], [b, a]]) {
      const circles = att.activeHit();
      if (!circles) continue;
      const hb = def.state === 'dizzy' ? { x0: def.x - 12 * def.S, x1: def.x + 12 * def.S, y0: def.y - 78 * def.S, y1: def.y } : def.hurtbox();
      if (!hb) continue;
      for (const [p, r] of circles) {
        const cx = Math.max(hb.x0, Math.min(p[0], hb.x1));
        const cy = Math.max(hb.y0, Math.min(p[1], hb.y1));
        if ((cx - p[0]) ** 2 + (cy - p[1]) ** 2 <= r * r) { results.push([att, def, [(p[0] + cx) / 2, (p[1] + cy) / 2]]); break; }
      }
    }
    for (const [att, def, pt] of results) {
      if (!att.atk) continue;
      att.hits++;
      this.resolveHit(att, def, att.atk, pt);
    }
    for (const p of this.projs) {
      const def = p.owner.opp;
      const hb = def.hurtbox();
      if (!hb) continue;
      if (p.x + 7 > hb.x0 && p.x - 7 < hb.x1 && p.y + 6 > hb.y0 && p.y - 6 < hb.y1) {
        p.dead = true;
        this.resolveHit(p.owner, def, { dmg: p.dmg, hs: 18, bs: 14, push: 2.2, lvl: 'mid', heavy: 1, special: 1, fx: p.fx, kd: p.kind === 'rocket' || p.kind === 'bossfire' }, [p.x, p.y], true);
        if (p.kind === 'acid') this.splash(p.x, '#40c020');
      }
    }
    this.projs = this.projs.filter((p) => !p.dead);
  }

  updateParts() {
    for (const s of this.parts) {
      s.t++;
      if (s.vx !== undefined) { s.x += s.vx; s.y += s.vy; }
      if (s.kind === 'red') s.vy += 0.18;
      if (s.g) s.vy += s.g;
      if (s.kind === 'chunk' && s.g > 0.05 && s.y > 0) { s.y = 0; s.vy *= -0.3; s.vx *= 0.6; }
    }
    this.parts = this.parts.filter((s) => s.t < s.life);
  }

  // ---------------- Çizim ----------------
  draw() {
    const { gfx } = this.api;
    try {
      if (this.mode === 'select') this.drawSelect(gfx);
      else if (this.mode === 'ladder') this.drawLadder(gfx);
      else if (this.mode === 'fight') this.drawFight(gfx);
      else if (this.mode === 'over') this.drawFight(gfx, true);
      else if (this.mode === 'ending') this.drawEnding(gfx);
    } catch (e) {
      if (!this.drawErr) { this.drawErr = true; console.error(e); }
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
    drawStage(gfx, this.stageIdx, cam, this.tick);
    if (this.dark > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.dark.toFixed(2)})`;
      ctx.fillRect(-10, -10, W + 20, H + 20);
    }
    // Zincirler (dövüşçülerin arkasında değil önünde çizilsin diye sonra)
    const order = [...this.f].sort((a, b) => (a.state === 'attack' || a.state === 'fatal' ? 1 : 0) - (b.state === 'attack' || b.state === 'fatal' ? 1 : 0));
    for (const f of order) f.draw(gfx, cam);
    for (const p of this.projs) this.drawProj(gfx, p, cam);
    if (this.laser) {
      const L = this.laser;
      gfx.line(L.x0 - cam, GY + L.y0, L.x1 - cam, GY + L.y1, '#ff2020');
      gfx.line(L.x0 - cam, GY + L.y0 + 1, L.x1 - cam, GY + L.y1 + 1, '#ff9090');
      gfx.rect(L.x1 - cam - 14, GY + L.y1, 28, 1, '#ff4040');
    }
    if (this.frog) {
      const fr = this.frog;
      const spr = ART.frog[fr.y < -4 ? 1 : 0];
      gfx.sprite(spr, Math.round(fr.x - cam - 5), Math.round(GY + fr.y - 7), { flipX: fr.vx < 0, scale: 2 });
    }
    if (this.star && this.star.t < 80) {
      const x = Math.round(this.star.x - cam);
      const r = this.star.t % 10 < 5 ? 3 : 5;
      gfx.line(x - r, 20, x + r, 20, '#ffffff');
      gfx.line(x, 20 - r, x, 20 + r, '#ffffff');
      gfx.pset(x, 20, '#ffff80');
    }
    this.drawParts(gfx, cam);
    ctx.restore();
    this.drawHud(gfx);
    this.drawBanner(gfx);
    if (over) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 60, W, 70);
      gfx.text('YENİLDİN', W / 2 + 2, 74, '#300000', { align: 'center', scale: 4 });
      gfx.text('YENİLDİN', W / 2, 72, '#d01010', { align: 'center', scale: 4 });
      if (this.t > 40) gfx.text('OYUN BİTTİ', W / 2, 112, '#c0c0c0', { align: 'center' });
    }
  }

  drawProj(gfx, p, cam) {
    const x = Math.round(p.x - cam);
    const y = Math.round(GY + p.y);
    const flip = p.vx < 0;
    switch (p.kind) {
      case 'ice': {
        gfx.sprite(ART.ice, x - 5, y - 4);
        for (let k = 1; k < 4; k++) gfx.pset(x - Math.sign(p.vx) * (6 + k * 4), y + ((p.t + k) % 3) - 1, '#a0e0ff');
        break;
      }
      case 'chain': {
        const o = p.owner;
        const hx = o.sk ? o.sk.haF[0] - cam : x;
        const hy = o.sk ? o.sk.haF[1] + GY : y;
        const n = Math.max(1, Math.floor(Math.abs(x - hx) / 4));
        for (let k = 0; k <= n; k++) {
          const u = k / n;
          gfx.rect(Math.round(hx + (x - hx) * u) - 1, Math.round(hy + (y - hy) * u) - 1, 3, 2, k % 2 ? '#a0a0a8' : '#606068');
        }
        // uç
        gfx.rect(x - 2, y - 3, 5, 6, '#d0d0d8');
        gfx.rect(x + (flip ? -5 : 3), y - 1, 3, 2, '#ffa020');
        break;
      }
      case 'acid': gfx.sprite(ART.acid, x - 4, y - 3); break;
      case 'dragon': gfx.sprite(ART.dragon[Math.floor(p.t / 4) % 2], x - 8, y - 4, { flipX: flip }); break;
      case 'rocket': gfx.sprite(ART.rocket, x - 7, y - 2, { flipX: flip }); if (p.t % 4 < 2) gfx.rect(x - Math.sign(p.vx) * 9, y - 1, 3, 2, '#ffd040'); break;
      case 'bossfire': gfx.sprite(ART.fire, x - 7, y - 5, { flipX: flip }); break;
      default: break;
    }
  }

  drawParts(gfx, cam) {
    for (const s of this.parts) {
      const x = Math.round(s.x - cam);
      const y = Math.round(GY + s.y);
      switch (s.kind) {
        case 'dust': gfx.circ(x, y - s.t / 4, 2 + s.t / 6, s.t < 8 ? '#6a5a50' : '#4a3a34'); break;
        case 'smoke': gfx.circ(x, y, 2 + s.t / 8, s.t < 10 ? '#8a8a90' : '#5a5a60'); break;
        case 'red': gfx.rect(x, y, s.t < 8 ? 2 : 1, s.t < 8 ? 2 : 1, s.t < 12 ? '#d01010' : '#801010'); break;
        case 'chunk': gfx.rect(x, y, s.sz, s.sz, s.c); break;
        case 'frost': gfx.pset(x, y, s.t % 4 < 2 ? '#ffffff' : '#80d0ff'); break;
        case 'flame': gfx.rect(x - 1, y, 3, 3, s.t < 6 ? '#ffe080' : s.t < 12 ? '#ff7010' : '#a01008'); break;
        case 'bubble': gfx.circb(x, y, 2, '#80ff60'); break;
        case 'hit': case 'block': {
          const blocked = s.kind === 'block';
          const r = (s.big ? 13 : 8) * Math.min(1, (s.t + 2) / 4);
          const c1 = blocked ? '#a0c0ff' : '#ffffff';
          const c2 = blocked ? '#3060ff' : '#ffb040';
          if (s.t < 3) gfx.circ(x, y, r * 0.5, c1);
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2 + s.t * 0.2;
            gfx.line(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, k % 2 ? c2 : c1);
          }
          break;
        }
        default: break;
      }
    }
  }

  drawHud(gfx) {
    const { score, hiScore } = this.api;
    const [p1, p2] = this.f;
    const pad = (n) => String(n).padStart(7, '0');
    if (!this.api.preview) {
      gfx.text(pad(score), 8, 2, '#d0d0d0', { shadow: '#000' });
      gfx.text(`REKOR ${pad(Math.max(hiScore, score))}`, W - 8, 2, '#a0a0a0', { align: 'right', shadow: '#000' });
    }
    const bar = (f, x, right) => {
      const w = 132;
      gfx.rect(x - 2, 11, w + 4, 13, '#000');
      gfx.rect(x, 13, w, 9, '#a00000');
      const dw = Math.round((f.dispHp / f.maxHp) * w);
      const hw = Math.round((f.hp / f.maxHp) * w);
      if (right) {
        gfx.rect(x + w - dw, 13, dw, 9, '#e0d020');
        gfx.rect(x + w - hw, 13, hw, 9, '#20b020');
        gfx.rect(x + w - hw, 13, hw, 2, '#60e060');
      } else {
        gfx.rect(x, 13, dw, 9, '#e0d020');
        gfx.rect(x, 13, hw, 9, '#20b020');
        gfx.rect(x, 13, hw, 2, '#60e060');
      }
      gfx.rectb(x - 1, 12, w + 2, 11, '#808080');
      gfx.text(f.ch.name, right ? x + w - 3 : x + 3, 14, '#000000', { align: right ? 'right' : 'left' });
    };
    bar(p1, 10, false);
    bar(p2, W - 10 - 132, true);
    // Süre
    gfx.text(String(this.timer).padStart(2, '0'), W / 2, 12, this.timer <= 10 ? '#ff3020' : '#e0e0e0', { align: 'center', scale: 2, shadow: '#000' });
    for (let i = 0; i < p1.wins; i++) gfx.sprite(ART.medal, 10 + i * 10, 26);
    for (let i = 0; i < p2.wins; i++) gfx.sprite(ART.medal, W - 18 - i * 10, 26);
    for (const f of this.f) {
      if (f.comboShow > 0 && f.comboN >= 2) {
        const x = f.side === 0 ? 10 : W - 10;
        gfx.text(`${f.comboN} VURUŞ KOMBO`, x, 40, '#e0e0e0', { align: f.side === 0 ? 'left' : 'right', shadow: '#600000' });
      }
    }
  }

  drawBanner(gfx) {
    const b = this.banner;
    if (b) {
      let y = 70;
      if (b.t < 6) y -= (6 - b.t) * 4;
      const flashing = b.text === 'BİTİR ONU!' && this.tick % 10 < 5;
      const col = flashing ? '#ffe040' : b.color;
      // metalik gölgeli başlık
      gfx.text(b.text, W / 2 + 2, y + 2, '#000000', { align: 'center', scale: b.scale });
      gfx.text(b.text, W / 2 + 1, y + 1, mix(b.color, '#000', 0.6), { align: 'center', scale: b.scale });
      gfx.text(b.text, W / 2, y, col, { align: 'center', scale: b.scale });
    }
    if (this.sub) {
      const y = b ? 72 + b.scale * 7 + 8 : 100;
      gfx.text(this.sub, W / 2 + 1, y + 1, '#000', { align: 'center', scale: this.sub.length > 18 ? 1 : 2 });
      gfx.text(this.sub, W / 2, y, '#e0c060', { align: 'center', scale: this.sub.length > 18 ? 1 : 2 });
    }
  }

  drawSelect(gfx) {
    const t = this.tick;
    gfx.cls('#0c0406');
    // taş çerçeve
    for (let y = 0; y < H; y += 10) for (let x = (y / 10) % 2 ? 0 : -11; x < W; x += 22) { gfx.rect(x, y, 21, 9, '#1c1012'); gfx.rect(x, y, 21, 1, '#2a1a1c'); }
    gfx.text('ÖLÜMCÜL DÖVÜŞ', W / 2 + 2, 8, '#300000', { align: 'center', scale: 2 });
    gfx.text('ÖLÜMCÜL DÖVÜŞ', W / 2, 6, '#d02010', { align: 'center', scale: 2 });
    gfx.text('SAVAŞÇINI SEÇ', W / 2, 24, '#c0a060', { align: 'center' });
    const ch = this.selPreview[this.sel];
    gfx.rect(14, 36, 132, 116, '#000000');
    gfx.rectb(13, 35, 134, 118, '#5a4030');
    drawStageMini(gfx, t);
    const pose = Math.floor(t / 16) % 2 ? POSES.idle1 : POSES.idle0;
    gfx.ctx.save();
    gfx.ctx.beginPath();
    gfx.ctx.rect(14, 36, 132, 116);
    gfx.ctx.clip();
    drawFighterArt(gfx.ctx, ch, pose, 1, 80, 146, false, t, { noShadow: true });
    gfx.ctx.restore();
    gfx.text(ch.name, 158, 40, '#e0e0e0', { scale: 2, shadow: '#600000' });
    gfx.text(ch.style, 158, 58, '#c0a060');
    ['GÜÇ', 'HIZ', 'CAN'].forEach((l, i) => {
      gfx.text(l, 158, 72 + i * 11, '#a0a0a0');
      for (let k = 0; k < 5; k++) gfx.rect(186 + k * 11, 72 + i * 11, 9, 7, k < ch.stats[i] ? '#c02010' : '#301818');
    });
    gfx.text(`C: ${ch.projName}`, 158, 110, '#e0e0e0');
    gfx.text(`İLERİ+C: ${ch.mobName}`, 158, 122, '#e0e0e0');
    gfx.text(`BİTİRİŞ: ${ch.fatalName}`, 158, 134, '#d02010');
    CHARS.forEach((c, i) => {
      const bx = 22 + i * 58;
      gfx.rect(bx, 158, 50, 50, '#140808');
      const hs = this.selPreview[i].heads[0];
      gfx.sprite(hs.r, bx + 13, 160, { scale: 2 });
      gfx.rect(bx, 194, 50, 14, '#000');
      gfx.text(c.name, bx + 25, 198, '#c0c0c0', { align: 'center' });
      if (i === this.sel) {
        const col = t % 16 < 8 ? '#ff2010' : '#ffd040';
        gfx.rectb(bx - 2, 156, 54, 54, col);
        gfx.rectb(bx - 1, 157, 52, 52, col);
      } else gfx.rectb(bx - 1, 157, 52, 52, '#3a2a20');
    });
    if (t % 60 < 40) gfx.text('YÖN: DEĞİŞTİR   A: SEÇ', W / 2, 214, '#c0c0c0', { align: 'center' });
  }

  drawLadder(gfx) {
    const t = this.t;
    gfx.cls('#060204');
    gfx.text('KADERİNE YÜRÜ', W / 2 + 1, 7, '#300000', { align: 'center', scale: 2 });
    gfx.text('KADERİNE YÜRÜ', W / 2, 6, '#d02010', { align: 'center', scale: 2 });
    // Kule
    const n = this.ladder.length;
    const tx = 60;
    gfx.rect(tx - 4, 30, 48, 190, '#1a1012');
    for (let i = 0; i < n; i++) {
      const y = 196 - i * 36;
      const e = this.ladder[i];
      const done = i < this.ladderPos;
      const cur = i === this.ladderPos;
      gfx.rect(tx, y - 12, 40, 32, cur ? (t % 16 < 8 ? '#a01010' : '#601010') : done ? '#202020' : '#2a1a1a');
      const hs = buildHeadCached(e.id);
      gfx.sprite(hs.r, tx + 20 - hs.w / 2, y - 8, { alpha: done ? 0.35 : 1 });
      if (done) gfx.text('X', tx + 20, y + 10, '#d02010', { align: 'center' });
    }
    const py = 196 - Math.min(this.ladderPos, n - 1) * 36;
    gfx.text('◀', 0, 0, '#000');
    gfx.rect(tx + 46, py - 2, 6, 6, '#ffd040');
    gfx.text('SEN', tx + 56, py - 2, '#ffd040');
    // Rakip bilgisi
    const c = this.cpuCh;
    drawFighterArt(gfx.ctx, this.playerCh, POSES.idle0, 1, 170, 176, false, this.tick, { noShadow: true });
    drawFighterArt(gfx.ctx, c, POSES.idle0, -1, 262, 176, false, this.tick, { noShadow: true });
    if (t > 20) gfx.text('VS', 216, 100, t % 10 < 5 ? '#ff2010' : '#ffd040', { align: 'center', scale: 3, shadow: '#000' });
    gfx.text(c.name, 262, 184, '#e0e0e0', { align: 'center', shadow: '#600000' });
    gfx.text(this.playerCh.name, 170, 184, '#e0e0e0', { align: 'center', shadow: '#600000' });
    const stage = this.cpuBase === BOSS ? 2 : [0, 1, 2, 0][this.ladderPos % 4];
    gfx.text(STAGE_NAMES[stage], 216, 200, '#c0a060', { align: 'center' });
    gfx.text(`DÖVÜŞ ${this.ladderPos + 1}/${n}${this.loop ? `  TUR ${this.loop + 1}` : ''}`, 216, 30, '#a0a0a0', { align: 'center' });
  }

  drawEnding(gfx) {
    const t = this.t;
    gfx.cls('#000');
    drawStageMini(gfx, t);
    drawFighterArt(gfx.ctx, this.playerCh, Math.floor(t / 24) % 2 ? POSES.win2 : POSES.win, 1, W / 2, 180, false, this.tick, { noShadow: true });
    gfx.text('ZAFER', W / 2 + 2, 22, '#300000', { align: 'center', scale: 4 });
    gfx.text('ZAFER', W / 2, 20, '#d02010', { align: 'center', scale: 4 });
    gfx.text(`${this.playerCh.name} KARA HAN'I YENDİ!`, W / 2, 194, '#e0e0e0', { align: 'center' });
    gfx.text('TURNUVA YENİDEN BAŞLIYOR...', W / 2, 208, '#c0a060', { align: 'center' });
  }
}

function drawStageMini(gfx, t) {
  // seçim ekranı fon ateşi
  for (let k = 0; k < 12; k++) {
    const x = 20 + k * 11;
    const h = 6 + ((k * 7 + Math.floor(t / 3)) % 7);
    gfx.rect(x, 152 - h, 4, h, k % 2 ? '#601008' : '#a02008');
  }
}

const HEAD_CACHE = {};
function buildHeadCached(id) {
  if (!HEAD_CACHE[id]) HEAD_CACHE[id] = buildHeads(id)[0];
  return HEAD_CACHE[id];
}
