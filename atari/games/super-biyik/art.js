// Süper Bıyık — piksel sanatı. Tüm çizimler özgündür.
import { makeSprite } from '../../js/engine/gfx.js';

// ---------- Kahraman ----------
const HERO_PAL = {
  R: '#d82800', B: '#2848d8', S: '#fcb880', H: '#5a2400', K: '#1a0800',
  W: '#ffffff', Y: '#ffd800', N: '#783808', O: '#e07858',
};
const FIRE_PAL = { ...HERO_PAL, R: '#f8f8f8', B: '#d82800', W: '#f8f8f8', H: '#783808', N: '#b84800' };
const STAR_PALS = [
  { ...HERO_PAL, R: '#00a800', B: '#101010', W: '#80d010', S: '#fcd8a8' },
  { ...HERO_PAL, R: '#fcfcfc', B: '#d82800', W: '#fc9838' },
  { ...HERO_PAL, R: '#101010', B: '#fc9838', W: '#fcfcfc', S: '#fca044' },
  { ...HERO_PAL, R: '#fc9838', B: '#00a800', W: '#ffd800' },
];

const SMALL_HEAD = [
  '.....RRRRR......',
  '....RRRRWWRR....',
  '....RRRRRRRRRRR.',
  '....HHSSSKS.....',
  '...HSHSSSKSSS...',
  '...HSSSSSSSSOO..',
  '....SSSSSSSOOO..',
  '...KKKKKKKKKKKK.',
  '...K..SSSSS..K..',
];
const SMALL_BODY = {
  stand: [
    '....RRBRRBR.....',
    '...RRRBBBBRRR...',
    '..WWRBYBBYBRWW..',
    '..WWBBBBBBBBWW..',
    '....BBB..BBB....',
    '...NNN....NNN...',
    '..NNNN....NNNN..',
  ],
  walk1: [
    '....RRBRRB......',
    '..WRRRBBBBRRW...',
    '..WWRBYBBYBWW...',
    '....BBBBBBBB....',
    '...BBBB..BBBB...',
    '..NNN......NNN..',
    '..NNNN.....NNNN.',
  ],
  walk2: [
    '.....RBRRB......',
    '....RRBBBBR.....',
    '....RBYBBYWW....',
    '....WBBBBBWW....',
    '.....BBBBB......',
    '.....NNNNN......',
    '.....NNNNNN.....',
  ],
  walk3: [
    '....RRBRRB......',
    '...RRRBBBBRR....',
    '..WWRBYBBYBRW...',
    '..WWBBBBBBBBW...',
    '...BBBB.BBB.....',
    '...NNN...NNN....',
    '....NNN..NNNN...',
  ],
  jump: [
    '....RRBRRB..WW..',
    '...RRRBBBBRRWW..',
    '..WRRBYBBYBRR...',
    '..WWBBBBBBBB....',
    '...BBBBBBBBNN...',
    '..NNBB....BNN...',
    '..NN............',
  ],
  skid: [
    '..W.RRBRRB......',
    '..WWRRBBBBRR....',
    '...RRBYBBYB.....',
    '...BBBBBBBB.....',
    '..NBBBB.BBBB....',
    '.NNN.....BBNN...',
    'NNN.......NNN...',
  ],
};
const SMALL_DIE = [
  '..WW.RRRRRR.WW..',
  '..WWRRRWWRRRWW..',
  '..SSRRRRRRRRSS..',
  '..SSHKSSSSKHSS..',
  '...SSKSSSSKSS...',
  '...SSSSOOSSSS...',
  '..KKKKKKKKKKKK..',
  '..K..SSSSSS..K..',
  '....RRRBBRRR....',
  '...RRRRBBRRRR...',
  '...RRBYBBYBRR...',
  '...BBBBBBBBBB...',
  '...BBBB..BBBB...',
  '...BBB....BBB...',
  '..NNN......NNN..',
  '.NNNN......NNNN.',
];

const BIG_HEAD = [
  '.....RRRRRR.....',
  '...RRRRRWWRRR...',
  '...RRRRWWWWRRR..',
  '...RRRRRWWRRRRR.',
  '...RRRRRRRRRRRRR',
  '...HHHSSSSKK....',
  '..HHSHSSSSKKS...',
  '..HSSHSSSSKKSS..',
  '..HSSHSSSSSSSOO.',
  '..HHSSSSSSSSOOOO',
  '...HSSSSSSSSOOO.',
  '..KKKKKKKKKKKKKK',
  '.KK.KKSSSSSKK.KK',
  '.K...SSSSSSS...K',
  '......SSSSS.....',
];
const BIG_BODY = {
  stand: [
    '.....RRRBRRR....',
    '....RRRRBRRRR...',
    '...RRRRRBBRRRR..',
    '..RRRRRBBBBRRRR.',
    '..RRRRBBYBBYRRR.',
    '..WWRRBBBBBBRWW.',
    '.WWWWBBBBBBBBWWW',
    '.WWWBBBBBBBBBBWW',
    '..WBBBBBBBBBBBW.',
    '...BBBBBBBBBBB..',
    '...BBBBBBBBBBB..',
    '...BBBBB.BBBBB..',
    '...BBBB...BBBB..',
    '...BBBB...BBBB..',
    '..NNNNN...NNNNN.',
    '.NNNNNN...NNNNNN',
    '.NNNNNN...NNNNNN',
  ],
  walk1: [
    '.....RRRBRRR....',
    '....RRRRBRRRR...',
    '...RRRRRBBRRRW..',
    '..RRRRRBBBBRWWW.',
    '..WRRRBBYBBYWW..',
    '.WWWRRBBBBBBB...',
    '.WWWBBBBBBBBB...',
    '..WBBBBBBBBBB...',
    '...BBBBBBBBBBB..',
    '..BBBBBB.BBBBB..',
    '..BBBBB...BBBBB.',
    '.BBBBB.....BBBB.',
    '.BBBB......BBBB.',
    'NNNN........NNN.',
    'NNNNN.......NNNN',
    'NNNNN.......NNNN',
    'NNNN........NNNN',
  ],
  walk2: [
    '.....RRRBRRR....',
    '....RRRRBRRRR...',
    '....RRRRBBRRR...',
    '....RRRBBBBRR...',
    '....RRBBYBBYR...',
    '....RWWBBBBBB...',
    '....WWWBBBBBB...',
    '....WWBBBBBBB...',
    '.....BBBBBBBB...',
    '.....BBBBBBB....',
    '.....BBBBBBB....',
    '......BBBBB.....',
    '......BBBBB.....',
    '......NNNNN.....',
    '.....NNNNNNN....',
    '.....NNNNNNNN...',
    '.....NNNNNNNN...',
  ],
  walk3: [
    '.....RRRBRRR....',
    '....RRRRBRRRR...',
    '...RRRRRBBRRRR..',
    '..WRRRRBBBBRRRR.',
    '..WWRRBBYBBYRRW.',
    '..WWWRBBBBBBRWW.',
    '...WBBBBBBBBBWW.',
    '....BBBBBBBBB...',
    '....BBBBBBBBB...',
    '...BBBBB.BBBB...',
    '...BBBB...BBBB..',
    '..BBBB....BBBB..',
    '..BBBB.....BBB..',
    '.NNNN.....NNNN..',
    '.NNNNN....NNNNN.',
    '.NNNNN....NNNNN.',
    '..........NNNN..',
  ],
  jump: [
    '.....RRRBRRR.WW.',
    '....RRRRBRRRWWW.',
    '...RRRRRBBRRWW..',
    '..RRRRRBBBBRRR..',
    '..RRRRBBYBBYRR..',
    '.WWRRRBBBBBBBR..',
    'WWWWBBBBBBBBBB..',
    'WWWBBBBBBBBBBBB.',
    '..BBBBBBBBBBBBBN',
    '..BBBBBBB.BBBBNN',
    '.BBBBBB....BBNNN',
    '.BBBBB......NNNN',
    'NNNNN...........',
    'NNNNN...........',
    'NNNN............',
    '................',
    '................',
  ],
  skid: [
    '..WW.RRRBRRR....',
    '..WWRRRRBRRRR...',
    '...WRRRRBBRRR...',
    '...RRRRBBBBRR...',
    '...RRRBBYBBYR...',
    '...RRRBBBBBBB...',
    '....BBBBBBBBB...',
    '....BBBBBBBBBB..',
    '...BBBBBBBBBBB..',
    '...BBBBBB.BBBB..',
    '..BBBBB...BBBB..',
    '.BBBBB.....BBBB.',
    'NNNNB......BBBB.',
    'NNNN........NNNN',
    'NNN.........NNNN',
    'NN...........NNN',
    '................',
  ],
  throw: [
    '.....RRRBRRR....',
    '....RRRRBRRRR...',
    '...RRRRRBBRRRR..',
    '..RRRRRBBBBRRRWW',
    '..RRRRBBYBBYRWWW',
    '..WWRRBBBBBBB.WW',
    '.WWWWBBBBBBBBB..',
    '.WWWBBBBBBBBBB..',
    '..WBBBBBBBBBBB..',
    '...BBBBBBBBBBB..',
    '...BBBBBBBBBBB..',
    '...BBBBB.BBBBB..',
    '...BBBB...BBBB..',
    '...BBBB...BBBB..',
    '..NNNNN...NNNNN.',
    '.NNNNNN...NNNNNN',
    '.NNNNNN...NNNNNN',
  ],
};
const BIG_DUCK = [
  ...BIG_HEAD,
  '..WWRRBBYBBYRWW.',
  '.WWWBBBBBBBBBWWW',
  '..BBBBBBBBBBBB..',
  '.NNNBBBBBBBBNNN.',
  'NNNNN......NNNNN',
  'NNNNN......NNNNN',
];

function heroSet(pal) {
  const s = {};
  for (const k of Object.keys(SMALL_BODY)) s[k] = makeSprite([...SMALL_HEAD, ...SMALL_BODY[k]], pal);
  s.die = makeSprite(SMALL_DIE, pal);
  const b = {};
  for (const k of Object.keys(BIG_BODY)) b[k] = makeSprite([...BIG_HEAD, ...BIG_BODY[k]], pal);
  b.duck = makeSprite(BIG_DUCK, pal);
  // Büyürken ara kare (orta boy)
  s.mid = makeSprite([...SMALL_HEAD, ...SMALL_BODY.stand.slice(0, 2), ...BIG_BODY.stand.slice(5)], pal);
  return { small: s, big: b };
}

export const HERO = {
  normal: heroSet(HERO_PAL),
  fire: heroSet(FIRE_PAL),
  star: STAR_PALS.map(heroSet),
};

// ---------- Düşmanlar ----------
const WALKER_ROWS = [
  '.......D........',
  '....D..ND..D....',
  '.....DNNNND.....',
  '....NNNNNNNN....',
  '...NNNNNNNNNN...',
  '..NKKNNNNNNKKN..',
  '.NNNKKNNNNKKNNN.',
  '.NNNWKNNNNKWNNN.',
  'NNNNWKNNNNKWNNNN',
  'NNNNWWNNNNWWNNNN',
  '.NNNNNNNNNNNNNN.',
  '..NNNWNNNNWNNN..',
  '....LLLLLLLL....',
  '..KKLLLLLLLL....',
  '.KKKKKLLLLKKK...',
  '.KKKKK...KKKKK..',
];
const WALKER_FLAT = [
  '...D.DNNNND.D...',
  '..NNNNNNNNNNNN..',
  '.NKKWNNNNNNWKKN.',
  'NNNNNNNNNNNNNNNN',
  '.NNNNNWNNWNNNNN.',
  '..KKKLLLLLLKKK..',
  '.KKKKK....KKKKK.',
];
const WALKER_PALS = {
  over: { N: '#b85010', D: '#6a2800', W: '#fcf0d0', K: '#101010', L: '#f0b878' },
  under: { N: '#2878b0', D: '#083860', W: '#fcf0d0', K: '#101010', L: '#a8d8f0' },
  castle: { N: '#888888', D: '#404040', W: '#fcf0d0', K: '#101010', L: '#d0d0d0' },
};

const KOOPA_ROWS = [
  '....YYY.........',
  '...YYYYY........',
  '..YKWYYY........',
  '..YKWYYY........',
  '..YYYYYY........',
  '.YYYYYYY........',
  '..YYYYYY.WWWW...',
  '...YYYY.WGGGGW..',
  '....YYYWGGLGGGW.',
  '.....YWGGLLLGGGW',
  '.....YWGLGGGLGGW',
  '....YYWGLGGGLGGW',
  '....YWGGGLLLGGGW',
  '....YWGGLGGGLGGW',
  '...YYWGGLGGGLGGW',
  '...YYYWGGLLLGGW.',
  '....YYWWWWWWWW..',
  '.....WWWWWWWWW..',
  '.....WYYYYYYYW..',
];
const KOOPA_FEET = [
  [
    '......YYY..YYY..',
    '.....YYYY..YYYY.',
    '.....OOOO..OOOO.',
    '....OOOOO..OOOOO',
    '................',
  ],
  [
    '.......YYYYY....',
    '.......YYYYY....',
    '......OOOOOO....',
    '.....OOOOOOO....',
    '................',
  ],
];
const SHELL_ROWS = [
  '.....WWWWWW.....',
  '...WWGGGGGGWW...',
  '..WGGGLLLLGGGW..',
  '.WGGGLGGGGLGGGW.',
  '.WGGLGGGGGGLGGW.',
  'WGGGLGGGGGGLGGGW',
  'WGGGGLLLLLLGGGGW',
  'WGGGLGGGGGGLGGGW',
  'WGGLGGGGGGGGLGGW',
  '.WGGLLLLLLLLGGW.',
  '.WWWWWWWWWWWWWW.',
  'WWYYWWWWWWWWYYWW',
  '.WWWWWWWWWWWWWW.',
  '..WWWWWWWWWWWW..',
];
const SHELL_PEEK = [
  '.....WWWWWW.....',
  '...WWGGGGGGWW...',
  '..WGGGLLLLGGGW..',
  '.WGGGLGGGGLGGGW.',
  '.WGGLGGGGGGLGGW.',
  'WGGGLGGGGGGLGGGW',
  'WGGGGLLLLLLGGGGW',
  'WGGGLGGGGGGLGGGW',
  'WGGLGGGGGGGGLGGW',
  '.WGGLLLLLLLLGGW.',
  '.WWWWWWWWWWWWWW.',
  'WWYYWWWWWWWWYYWW',
  '.WWYKWWWWWWKYWW.',
  '..WYYWWWWWWYYW..',
];
const WING = [
  [
    '..WW....',
    '.WWWW...',
    'WWWWWW..',
    'WWWWWWW.',
    '.WWWWWWW',
    '...WWWWW',
    '.....WWW',
  ],
  [
    '........',
    '........',
    '........',
    'WWWW....',
    'WWWWWWW.',
    '.WWWWWWW',
    '...WWWWW',
  ],
];
const GREEN_K = { Y: '#fcc860', K: '#101010', W: '#fcfcfc', G: '#00a800', L: '#80d010', O: '#c84c0c' };
const RED_K = { ...GREEN_K, G: '#d82800', L: '#fca044' };
export const KOOPA = {};
for (const [name, pal] of [['green', GREEN_K], ['red', RED_K]]) {
  KOOPA[name] = {
    walk: KOOPA_FEET.map((f) => makeSprite([...KOOPA_ROWS, ...f], pal)),
    shell: makeSprite(SHELL_ROWS, pal),
    peek: makeSprite(SHELL_PEEK, pal),
  };
}
KOOPA.wing = WING.map((w) => makeSprite(w, { W: '#fcfcfc' }));

export const WALKER = {};
for (const [k, pal] of Object.entries(WALKER_PALS)) {
  WALKER[k] = { walk: makeSprite(WALKER_ROWS, pal), flat: makeSprite(WALKER_FLAT, pal) };
}

const PIR_OPEN = [
  '....RRRRRRRR....',
  '...RRWRRRRWRR...',
  '..RRWWRRRRRRWR..',
  '..RRRRRRWRRRRR..',
  '..WWWWWWWWWWWW..',
  '..W.W.W..W.W.W..',
  '................',
  '..W.W.W..W.W.W..',
  '..WWWWWWWWWWWW..',
  '..RRRRWRRRRRRR..',
  '...RRRRRRRWRR...',
  '....RRRRRRRR....',
];
const PIR_CLOSED = [
  '................',
  '....RRRRRRRR....',
  '...RRWRRRRWRR...',
  '..RRWWRRRRRRWR..',
  '..RRRRRRWRRRRR..',
  '..WWWWWWWWWWWW..',
  '..WWWWWWWWWWWW..',
  '..RRRRWRRRRRRR..',
  '...RRRRRRRWRR...',
  '....RRRRRRRR....',
  '................',
  '................',
];
const PIR_STEM = [
  '.......GG.......',
  '.......GG.......',
  '.gg....GG....gg.',
  'gGGg...GG...gGGg',
  'gGGGg..GG..gGGGg',
  '.gGGGg.GG.gGGGg.',
  '..gGGGgGGgGGGg..',
  '...gGGGGGGGGg...',
  '.....ggGGgg.....',
  '.......GG.......',
  '.......GG.......',
  '.......GG.......',
];
const PIR_PAL = { R: '#d82800', W: '#fcfcfc', G: '#00a800', g: '#80d010' };
export const PIRANHA = [makeSprite([...PIR_OPEN, ...PIR_STEM], PIR_PAL), makeSprite([...PIR_CLOSED, ...PIR_STEM], PIR_PAL)];

// Lav topu (zıplayan alev)
export const PODOBOO = [
  makeSprite([
    '....YY....',
    '...YWWY...',
    '..YWWWWY..',
    '.YOWWWWOY.',
    'YOOWKWKOOY',
    'YOOWKWKOOY',
    'YOOWWWWOOY',
    '.YOOWWOOY.',
    '..YOOOOY..',
    '..ROYYOR..',
    '...R..R...',
    '..R....R..',
  ], { Y: '#fca044', W: '#fcfcd8', O: '#fc7400', K: '#600000', R: '#d82800' }),
];

// Ejder Kral (boss) 32x32
const BOSS_ROWS = [
  '...........W....W...............',
  '..........WW...WW...............',
  '.........WYW..WYW...............',
  '........GGGGGGGGGG..............',
  '.......GGGGGGGGGGGG.............',
  '......GGKKGGGGGGGGGG............',
  '.....GGGWKGGGGGGGGGG...W.W.W....',
  '....GGGGWKGGGGGGGGGGG.WYWYWYW...',
  '...GGGGGGGGGGGGGGGGGG.GGGGGGGG..',
  '..GGGGGGGGGGGGGGGGGGGGGGGGGGGGG.',
  '.RRRRGGGGGGGGGGGGGGGGLLLLLLLGGG.',
  'RRRRRRRGGGGGGGGGGGGGLLWWLLWWLGG.',
  'W.W.W.RRGGGGGGGGGGGLLWYYWWYYWLGG',
  '.......RRGGGGGGGGGLLLWYYWWYYWLLG',
  'W.W.W.RRGGGGGGGGGLLLLLWWLLWWLLLG',
  'RRRRRRRGGGGGGGGGLLWWLLLLLLLLWWLG',
  '.RRRRGGGGGGYYYYGLWYYWLLWWLLWYYWL',
  '.....GGGGYYYYYYYLWYYWLWYYWLWYYWL',
  '.....GGGYYYYYYYYLLWWLLWYYWLLWWLL',
  '....GGGYYYYYYYYYYLLLLLLWWLLLLLL.',
  '....GGYYYYYYYYYYYYLLWWLLLLWWLL..',
  '...GGGYYYYYYYYYYYYYLWYYWLLWYYWL.',
  '...GGYYYYYYYYYYYYYYLWYYWLLWYYWL.',
  '...GGYYYYYYYYYYYYYYLLWWLLLLWWLL.',
  '...GGYYYYYYYYYYYYYYYLLLLLLLLLL..',
  '....GYYYYYYYYYYYYYYYYYGGG.......',
  '....GGYYYYYYYYYYYYYYYGGGG.......',
  '.....GGGYYYYYYYYYYYGGGGGG.......',
  '......GGGGGG...GGGGGGGGGGG......',
  '.....GGGGGGG...GGGGG..GGGG......',
  '....WGWGWGWG..WGWGWG..WGWGW.....',
  '................................',
];
const BOSS_PAL = { G: '#00a800', L: '#80d010', Y: '#fcd8a8', W: '#fcfcfc', K: '#101010', R: '#d82800' };
const BOSS_MOUTH_CLOSED = BOSS_ROWS.map((r, i) => (i >= 10 && i <= 15 ? r.replace(/^[RW.]{7}/, (m) => m.replace(/[RW]/g, (c, j) => (i === 12 || i === 14 ? '.' : c))) : r));
export const BOSS = [makeSprite(BOSS_ROWS, BOSS_PAL), makeSprite(BOSS_MOUTH_CLOSED, BOSS_PAL)];
export const BOSS_FIRE = [
  makeSprite([
    '.....OOOOYYY............',
    '...OOOYYYYYYYYYY........',
    '.OOOYYYYWWWWWWYYYYYOOO..',
    'OOYYYWWWWWWWWWWWWYYYYYOO',
    '.OOOYYYYWWWWWWYYYYYOOO..',
    '...OOOYYYYYYYYYY........',
    '.....OOOOYYY............',
    '........................',
  ], { O: '#d82800', Y: '#fc9838', W: '#fcfcd8' }),
  makeSprite([
    '........................',
    '....OOOOYYY.............',
    '..OOOYYYYYYYYYY.........',
    'OOOYYYYWWWWWWYYYYYOOOOO.',
    '.OOYYYWWWWWWWWWWWYYYYOOO',
    '..OOOYYYYYYYYYYYYOOO....',
    '....OOOOYYY.............',
    '........................',
  ], { O: '#d82800', Y: '#fc9838', W: '#fcfcd8' }),
];

// ---------- Eşyalar ----------
const MUSH = [
  '.....KKKKKK.....',
  '...KKCCWWCCKK...',
  '..KCCCWWWWCCCK..',
  '.KWWCCWWWWCCWWK.',
  '.KWWWCCCCCCWWWK.',
  'KWWWCCCCCCCCWWWK',
  'KCCCCCWWWWCCCCCK',
  'KCCCCWWWWWWCCCCK',
  'KCCCCWWWWWWCCCCK',
  '.KKKKKKKKKKKKKK.',
  '...KSSSSSSSSK...',
  '..KSSSKSSKSSSK..',
  '..KSSSKSSKSSSK..',
  '..KSSSSSSSSSSK..',
  '...KSSSSSSSSK...',
  '....KKKKKKKK....',
];
export const MUSHROOM = makeSprite(MUSH, { K: '#101010', C: '#e04000', W: '#fcfcfc', S: '#fcd8a8' });
export const ONEUP = makeSprite(MUSH, { K: '#101010', C: '#00a800', W: '#fcfcfc', S: '#fcd8a8' });
const FLOWER_ROWS = [
  '...FFFFFFFFFF...',
  '..FffffffffffF..',
  '.FffYYYYYYYYffF.',
  '.FffYYYYYYYYffF.',
  '..FffffffffffF..',
  '...FFFFFFFFFF...',
  '.......GG.......',
  '..gg...GG...gg..',
  '.gGGg..GG..gGGg.',
  '.gGGGg.GG.gGGGg.',
  '..gGGGgGGgGGGg..',
  '...gGGGGGGGGg...',
  '....ggGGGGgg....',
  '.......GG.......',
  '.......GG.......',
  '.......GG.......',
];
export const FLOWER = [
  ['#d82800', '#fc9838', '#fcfcd8'],
  ['#fc9838', '#fcfcd8', '#d82800'],
  ['#fcfcd8', '#d82800', '#fc9838'],
  ['#fc9838', '#d82800', '#fcfcd8'],
].map(([F, f, Y]) => makeSprite(FLOWER_ROWS, { F, f, Y, G: '#00a800', g: '#80d010' }));
const STAR_ROWS = [
  '.......YY.......',
  '.......YY.......',
  '......YYYY......',
  '......YYYY......',
  'YYYYYYYYYYYYYYYY',
  '.YYYYYYYYYYYYYY.',
  '..YYYYKYYKYYYY..',
  '...YYYKYYKYYY...',
  '....YYKYYKYY....',
  '....YYYYYYYY....',
  '...YYYYYYYYYY...',
  '...YYYYYYYYYY...',
  '..YYYYY..YYYYY..',
  '..YYYY....YYYY..',
  '.YYY........YYY.',
  '.Y............Y.',
];
export const STAR = ['#fcd800', '#fc9838', '#fcfcfc', '#80d010'].map((Y) => makeSprite(STAR_ROWS, { Y, K: '#101010' }));

// Altın (elips, programla)
function coinRows(w) {
  const rows = [];
  const h = 14;
  for (let y = 0; y < h; y++) {
    const t = (y + 0.5) / h * 2 - 1;
    const hw = Math.max(0.5, Math.sqrt(1 - t * t) * w / 2);
    let r = '';
    for (let x = 0; x < 10; x++) {
      const d = Math.abs(x + 0.5 - 5);
      if (d > hw) r += '.';
      else if (d > hw - 1.2) r += 'D';
      else if (x + 0.5 < 5 - hw / 3 && y > 2 && y < 11) r += 'W';
      else r += 'Y';
    }
    rows.push(r);
  }
  return rows;
}
const COIN_PAL = { D: '#b05800', Y: '#fcd800', W: '#fcfcd0' };
export const COIN = [10, 6, 2, 6].map((w) => makeSprite(coinRows(w), COIN_PAL));
export const COIN_DIM = [10, 6, 2, 6].map((w) => makeSprite(coinRows(w), { D: '#8a4000', Y: '#d8a000', W: '#fcd890' }));

export const FIREBALL = [
  makeSprite(['..OO....', '.OYYO...', 'OYWWYO..', 'OYWWWYO.', '.OYWWYO.', '..OYYO..', '...OO...', '........'], { O: '#d82800', Y: '#fc9838', W: '#fcfcd8' }),
  makeSprite(['...OO...', '..OYYO..', '.OYWWYO.', 'OYWWWWYO', 'OYWWWWYO', '.OYWWYO.', '..OYYO..', '...OO...'], { O: '#d82800', Y: '#fc9838', W: '#fcfcd8' }),
];
export const PUFF = makeSprite([
  '..W..W..',
  '.W.WW.W.',
  'W.WWWW.W',
  '.WWYYWW.',
  '.WWYYWW.',
  'W.WWWW.W',
  '.W.WW.W.',
  '..W..W..',
], { W: '#fcfcfc', Y: '#fc9838' });

export const FLAG = makeSprite([
  'WWWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWW',
  '..WWWWWWWWWWWWWW',
  '...WWWWGGGGWWWWW',
  '....WWGGGGGGWWWW',
  '.....GKKGGKKGWWW',
  '......GGGGGGWWWW',
  '.......GGGGWWWWW',
  '........WWWWWWWW',
  '.........WWWWWWW',
  '..........WWWWWW',
  '...........WWWWW',
  '............WWWW',
  '.............WWW',
  '..............WW',
  '...............W',
], { W: '#fcfcfc', G: '#00a800', K: '#101010' });
export const CASTLE_FLAG = makeSprite([
  'R........',
  'RWWWWW...',
  'RWWRWWWW.',
  'RWRRRWWWW',
  'RWWRWWWW.',
  'RWWWWW...',
  'R........',
], { R: '#783808', W: '#d82800' });

// Mantarcık (şatodaki dost)
export const NPC = makeSprite([
  '.....WWWWWW.....',
  '...WWRRWWRRWW...',
  '..WRRRRWWRRRRW..',
  '.WWRRRWWWWRRRWW.',
  '.WWWWWWWWWWWWWW.',
  'WWRRWWWWWWWWRRWW',
  'WRRRRWWWWWWRRRRW',
  '.KKKKKKKKKKKKKK.',
  '...KSSSSSSSSK...',
  '...SSKSSSSKSS...',
  '...SSKSSSSKSS...',
  '...SSSSSSSSSS...',
  '....SSSKKSSS....',
  '.....SSSSSS.....',
  '...BBBBBBBBBB...',
  '..BBBYBBBBYBBB..',
  '..SBBBBBBBBBBS..',
  '..SSBBBBBBBBSS..',
  '...BBBBBBBBBB...',
  '...BBBBBBBBBB...',
  '....SSS..SSS....',
  '...NNNN..NNNN...',
  '..NNNNN..NNNNN..',
  '................',
], { W: '#fcfcfc', R: '#d82800', K: '#101010', S: '#fcd8a8', B: '#2848d8', Y: '#fcd800', N: '#783808' });

// ---------- Karolar ----------
const T_GROUND = [
  'MLLLLLLLDMLLLLLM',
  'LMMMMMMMDLMMMMMD',
  'LMMMMMMMDLMMMMMD',
  'LMMMMMMMDLMMMMMD',
  'LMMMMMMMDLMMMMMD',
  'LMMMMMMMDDMMMMMD',
  'DMMMMMMMDLDMMMMD',
  'DDMMMMMMDLMDDMMD',
  'LLDDMMMMDLMMMDDL',
  'LMLLDDDDLMMMMMMD',
  'LMMMMMMDLMMMMMMD',
  'LMMMMMMDLMMMMMMD',
  'LMMMMMMDLMMMMMMD',
  'LMMMMMMDLMMMMMDD',
  'LMMMMMMDLMMMMDDD',
  'MDDDDDDDLDDDDDDM',
];
const T_BRICK = [
  'LLLLLLLLLLLLLLLL',
  'MMMMMMMDMMMMMMMD',
  'MMMMMMMDMMMMMMMD',
  'MMMMMMMDMMMMMMMD',
  'DDDDDDDDDDDDDDDD',
  'MMMDMMMMMMMDMMMM',
  'MMMDMMMMMMMDMMMM',
  'MMMDMMMMMMMDMMMM',
  'DDDDDDDDDDDDDDDD',
  'MMMMMMMDMMMMMMMD',
  'MMMMMMMDMMMMMMMD',
  'MMMMMMMDMMMMMMMD',
  'DDDDDDDDDDDDDDDD',
  'MMMDMMMMMMMDMMMM',
  'MMMDMMMMMMMDMMMM',
  'DDDDDDDDDDDDDDDD',
];
const T_HARD = [
  'MLLLLLLLLLLLLLLD',
  'LMLLLLLLLLLLLLDD',
  'LLMLLLLLLLLLLDDD',
  'LLLMMMMMMMMMMDDD',
  'LLLMMMMMMMMMMDDD',
  'LLLMMMMMMMMMMDDD',
  'LLLMMMMMMMMMMDDD',
  'LLLMMMMMMMMMMDDD',
  'LLLMMMMMMMMMMDDD',
  'LLLMMMMMMMMMMDDD',
  'LLLMMMMMMMMMMDDD',
  'LLLMMMMMMMMMMDDD',
  'LLLMMMMMMMMMMDDD',
  'LLDDDDDDDDDDDMDD',
  'LDDDDDDDDDDDDDMD',
  'DDDDDDDDDDDDDDDM',
];
const T_QUES = [
  '.DDDDDDDDDDDDDD.',
  'DQQQQQQQQQQQQQQK',
  'DQKQQQQQQQQQQKQK',
  'DQQQQLLLLLQQQQQK',
  'DQQQLLKKKLLKQQQK',
  'DQQQLLKQQLLKQQQK',
  'DQQQQKKQQLLKQQQK',
  'DQQQQQQQLLKKQQQK',
  'DQQQQQQLLKKQQQQK',
  'DQQQQQQLLKQQQQQK',
  'DQQQQQQQKKQQQQQK',
  'DQQQQQQLLQQQQQQK',
  'DQQQQQQLLKQQQQQK',
  'DQKQQQQQKKQQQKQK',
  'DQQQQQQQQQQQQQQK',
  'KKKKKKKKKKKKKKKK',
];
const T_USED = [
  '.DDDDDDDDDDDDDD.',
  'DQQQQQQQQQQQQQQD',
  'DQDQQQQQQQQQQDQD',
  'DQQQQQQQQQQQQQQD',
  'DQQQQQQQQQQQQQQD',
  'DQQQQQQQQQQQQQQD',
  'DQQQQQQQQQQQQQQD',
  'DQQQQQQQQQQQQQQD',
  'DQQQQQQQQQQQQQQD',
  'DQQQQQQQQQQQQQQD',
  'DQQQQQQQQQQQQQQD',
  'DQQQQQQQQQQQQQQD',
  'DQQQQQQQQQQQQQQD',
  'DQDQQQQQQQQQQDQD',
  'DQQQQQQQQQQQQQQD',
  'DDDDDDDDDDDDDDDD',
];
const T_TREE_L = [
  '....KKKKKKKKKKKK',
  '..KKGGGGGGGGGGGG',
  '.KGGLLGGGGGGLLGG',
  'KGGLLGGGGGGLLGGG',
  'KGGGGGGGGGGGGGGG',
  'KGGGGGLLGGGGGGLL',
  '.KGGGLLGGGGGGLLG',
  '..KKGGGGGGGGGGGG',
  '....KKKKKKKKKKKK',
];
const T_TREE_M = [
  'KKKKKKKKKKKKKKKK',
  'GGGGGGGGGGGGGGGG',
  'GGLLGGGGGGLLGGGG',
  'GLLGGGGGGLLGGGGG',
  'GGGGGGGGGGGGGGGG',
  'GGGGLLGGGGGGLLGG',
  'GGGLLGGGGGGLLGGG',
  'GGGGGGGGGGGGGGGG',
  'KKKKKKKKKKKKKKKK',
];
const T_TRUNK = [
  'TtTTtTTTtTTtTTtT',
  'TtTTtTTTtTTtTTtT',
  'TTtTTtTTTtTTtTTt',
  'TTtTTtTTTtTTtTTt',
  'TtTTTtTTtTTtTTTt',
  'TtTTTtTTtTTtTTTt',
  'TTtTTTtTTtTTtTTT',
  'TTtTTTtTTtTTtTTT',
];

function tileSprite(rows, pal, h = 16) {
  const r = rows.slice();
  while (r.length < h) r.push(...rows.slice(0, h - r.length));
  return makeSprite(r, pal);
}

// Boru: kolon desenleri dikey tekrarlanır, yatay boru için transpoze edilir.
function pipeRows(cols, cap) {
  const rows = [];
  for (let y = 0; y < 16; y++) {
    if (cap && (y === 0 || y === 15)) rows.push(cols.replace(/[^.]/g, 'K'));
    else rows.push(cols);
  }
  return rows;
}
const transpose = (rows) => rows[0].split('').map((_, x) => rows.map((r) => r[x]).join(''));
const PIPE_PAL = { K: '#0a2a00', L: '#b8f818', G: '#00a800', D: '#005800' };
const P_TL = pipeRows('KLLGLLGGGGGGGGGG', true);
const P_TR = pipeRows('GGGGGGGGDGDDGDDK', true);
const P_BL = pipeRows('..KLGLLGGGGGGGGG', false);
const P_BR = pipeRows('GGGGGGDGDDGDDK..', false);

export const THEMES = {
  over: {
    sky: '#5c94fc', deco: 'hills',
    ground: { M: '#c84c0c', L: '#fcbcb0', D: '#3a1000' },
    brick: { M: '#c84c0c', L: '#fcbcb0', D: '#1a0800' },
    hard: { M: '#c84c0c', L: '#fcbcb0', D: '#3a1000' },
    ques: { Q: '#fc9838', D: '#c84c0c', K: '#1a0800', L: '#fcfcfc' },
    used: { Q: '#c84c0c', D: '#1a0800' },
    walker: 'over',
  },
  night: {
    sky: '#101848', deco: 'stars',
    ground: { M: '#8c3c10', L: '#d0a080', D: '#1a0800' },
    brick: { M: '#8c3c10', L: '#d0a080', D: '#1a0800' },
    hard: { M: '#8c3c10', L: '#d0a080', D: '#1a0800' },
    ques: { Q: '#fc9838', D: '#c84c0c', K: '#1a0800', L: '#fcfcfc' },
    used: { Q: '#8c3c10', D: '#1a0800' },
    walker: 'over',
  },
  under: {
    sky: '#000000', deco: 'none',
    ground: { M: '#0070e8', L: '#9cfcf0', D: '#002058' },
    brick: { M: '#0070e8', L: '#9cfcf0', D: '#000000' },
    hard: { M: '#0070e8', L: '#9cfcf0', D: '#002058' },
    ques: { Q: '#fc9838', D: '#c84c0c', K: '#000000', L: '#fcfcfc' },
    used: { Q: '#c84c0c', D: '#000000' },
    walker: 'under',
  },
  castle: {
    sky: '#000000', deco: 'none',
    ground: { M: '#9c9c9c', L: '#ececec', D: '#404040' },
    brick: { M: '#9c9c9c', L: '#ececec', D: '#000000' },
    hard: { M: '#9c9c9c', L: '#ececec', D: '#404040' },
    ques: { Q: '#fc9838', D: '#c84c0c', K: '#000000', L: '#fcfcfc' },
    used: { Q: '#c84c0c', D: '#000000' },
    walker: 'castle',
  },
};

const QUES_FLASH = ['#fc9838', '#fc9838', '#c84c0c', '#883000'];
const TREE_PAL = { K: '#003800', G: '#00a800', L: '#80d010' };
const TRUNK_PAL = { T: '#a85000', t: '#683000' };
const LAVA_TOP = [
  'RR..RRRR..RRRR..',
  'RRRRRRRRRRRRRRRR',
  'OORROOOORROOOORR',
  'OOOOOOOOOOOOOOOO',
];
const LAVA_PAL = { R: '#fc7400', O: '#d82800' };
const BRIDGE = [
  'GGGGGGGGGGGGGGGG',
  'LLLLLLLLLLLLLLLL',
  'GGGGGGGGGGGGGGGG',
  '.G...G...G...G..',
  'G.G.G.G.G.G.G.G.',
  '................',
];
const AXE = [
  '.....DD.........',
  '..LLLDDLLL......',
  '.LWWLDDLWWL.....',
  'LWWWLDDLWWWL....',
  'LWWWLDDLWWWL....',
  'LWWWLDDLWWWL....',
  '.LWWLDDLWWL.....',
  '..LLLDDLLL......',
  '.....DD.........',
  '.....DD.........',
  '.....DD.........',
  '.....DD.........',
  '.....DD.........',
  '.....DD.........',
  '.....DD.........',
  '.....DD.........',
];

// Temaya göre karo sprite'ları üretir
export function buildTiles(name) {
  const th = THEMES[name];
  const t = {};
  t.ground = tileSprite(T_GROUND, th.ground);
  t.brick = tileSprite(T_BRICK, th.brick);
  t.hard = tileSprite(T_HARD, th.hard);
  t.ques = QUES_FLASH.map((q) => tileSprite(T_QUES, { ...th.ques, Q: q }));
  t.used = tileSprite(T_USED, th.used);
  t.pipeTL = makeSprite(P_TL, PIPE_PAL);
  t.pipeTR = makeSprite(P_TR, PIPE_PAL);
  t.pipeBL = makeSprite(P_BL, PIPE_PAL);
  t.pipeBR = makeSprite(P_BR, PIPE_PAL);
  t.sideT = makeSprite(transpose(P_TL), PIPE_PAL);
  t.sideB = makeSprite(transpose(P_TR), PIPE_PAL);
  t.sideBT = makeSprite(transpose(P_BL), PIPE_PAL);
  t.sideBB = makeSprite(transpose(P_BR), PIPE_PAL);
  t.treeL = makeSprite(T_TREE_L, TREE_PAL);
  t.treeM = makeSprite(T_TREE_M, TREE_PAL);
  t.treeR = makeSprite(T_TREE_L.map((r) => r.split('').reverse().join('')), TREE_PAL);
  t.trunk = tileSprite(T_TRUNK, TRUNK_PAL);
  t.lavaTop = [0, 4, 8, 12].map((o) => makeSprite(LAVA_TOP.map((r) => (r + r).slice(o, o + 16)), LAVA_PAL));
  t.bridge = makeSprite(BRIDGE, { G: '#c84c0c', L: '#fc9838' });
  t.axe = makeSprite(AXE, { D: '#783808', L: '#606060', W: '#d8d8d8' });
  t.debris = makeSprite(T_BRICK.slice(0, 8).map((r) => r.slice(0, 8)), th.brick);
  return t;
}
