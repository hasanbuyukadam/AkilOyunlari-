// Balon Ejder — piksel sanatı (özgün).
import { makeSprite } from '../../js/engine/gfx.js';

const DRAGON_PAL = { G: '#58d858', g: '#108810', Y: '#f8e8a0', W: '#ffffff', K: '#101010', O: '#f88000', R: '#e02020' };
const HEAD = [
  '......OO........',
  '.....OOGGGG.....',
  '....OGGGGGGGG...',
  '...OGGGGGGWWWG..',
  '...GGGGGGWWWKWG.',
  '..OGGGGGGWWKKWG.',
  '..GGGGGGGGWWWGG.',
];
const MOUTH = [
  '.OGGGGGGGGGGGGGg',
  '.GGGGGGGGGGGGGgg',
];
const MOUTH_OPEN = [
  '.OGGGGGGGGGGGRRR',
  '.GGGGGGGGGGGgRR.',
];
const BODY = [
  'OGGYYYYGGGGGGg..',
  '.GGYYYYYGGGGG...',
  '.GYYYYYYYGGG....',
  '.GYYYYYYYGGGg...',
  '..GYYYYYGGGGgg..',
];
const FEET = [
  ['..ggGGGGgggggg..', '.gggg....gggg...'],
  ['..ggGGGGggggg...', '...ggg..gggg....'],
  ['..ggGGGGgggggg..', '..gggg..ggggg...'],
];
const JUMP_BODY = [
  'OGGYYYYGGGGGGg..',
  '.GGYYYYYGGGGGgg.',
  '.GYYYYYYYGGGGgg.',
  '.GYYYYYYYGGGg...',
  '..GYYYYYGGGg....',
  '..gggGGGggg.....',
  '...gggg.ggg.....',
];

function dragonSet(pal) {
  return {
    walk: FEET.map((f) => makeSprite([...HEAD, ...MOUTH, ...BODY, ...f], pal)),
    blow: makeSprite([...HEAD, ...MOUTH_OPEN, ...BODY, ...FEET[0]], pal),
    jump: makeSprite([...HEAD, ...MOUTH, ...JUMP_BODY], pal),
  };
}
export const DRAGON = dragonSet(DRAGON_PAL);
export const DRAGON_HURT = dragonSet({ ...DRAGON_PAL, G: '#ffffff', g: '#a0a0a0', Y: '#ffffff' });
export const DRAGON_ICON = makeSprite([
  '..OOGGG.',
  '.OGGGWWG',
  'OGGGGWKG',
  'GGGGGGGG',
  'GYYYGGg.',
  '.gg.gg..',
], DRAGON_PAL);

// ---------------- düşmanlar
const ROBOT = [
  '.......KK.......',
  '......KWWK......',
  '.......KK.......',
  '....BBBBBBBB....',
  '...BWWWWWWWWB...',
  '..BWWKWWWWKWWB..',
  '..BWWKWWWWKWWB..',
  '..BWWWWWWWWWWB..',
  '..BWWRRRRRRWWB..',
  '..BWWWWWWWWWWB..',
  '...BWWWWWWWWB...',
  '....BBBBBBBB....',
];
const ROBOT_FEET = [
  ['.....KK..KK.....', '....KKK..KKK....', '................', '................'],
  ['....KK....KK....', '...KKK....KKK...', '................', '................'],
];
const WIZARD = [
  '......PPPP......',
  '.....PPPPPP.....',
  '....PPPPPPPP....',
  '...PPKKKKKKPP...',
  '...PKWKKKKWKP...',
  '...PKKKKKKKKP...',
  '...PPKKKKKKPP...',
  '..PPPPPPPPPPPP..',
  '..PPPPPPPPPPPP..',
  '.SPPPPpPPPPPPPS.',
  '.SPPPPpPPPPPPPS.',
  '..PPPPpPPPPPPP..',
  '..PPPPPPPPPPPP..',
  '...PPPPPPPPPP...',
];
const WIZ_FEET = [
  ['....NN....NN....', '...NNN....NNN...'],
  ['...NN......NN...', '..NNN......NNN..'],
];
const WHALE = [
  '................',
  '....MMMMMM......',
  '..MMMMMMMMMM....',
  '.MMMMMMMMMMMM...',
  'MMMWWMMMMWWMM...',
  'MMWKWMMMMWKWMM..',
  'MMMWWMMMMWWMMM.M',
  'MMMMMMMMMMMMMMMM',
  'MMMMMmmmmMMMMMM.',
  '.MMMMMMMMMMMMM.M',
  '..MMMMMMMMMMMM..',
  '...MMMMMMMMM....',
];
const WHALE_TAIL = [
  ['....M.M.M.M.....', '................', '................', '................'],
  ['.....M.M.M.M....', '................', '................', '................'],
];
const SPRING = [
  '.....CCCCCC.....',
  '....CCCCCCCC....',
  '...CCWWCCWWCC...',
  '...CCWKCCWKCC...',
  '...CCCCCCCCCC...',
  '...CCCRRRRCCC...',
  '....CCCCCCCC....',
  '.....CCCCCC.....',
];
const SPRING_COIL = [
  ['......KKKK......', '.....GGGGGG.....', '......KKKK......', '.....GGGGGG.....', '......KKKK......', '.....GGGGGG.....', '....KKKKKKKK....', '....KKKKKKKK....'],
  ['................', '................', '......KKKK......', '.....GGGGGG.....', '......KKKK......', '.....GGGGGG.....', '....KKKKKKKK....', '....KKKKKKKK....'],
];

const ENEMY_DEFS = {
  a: { rows: ROBOT, feet: ROBOT_FEET, pal: { B: '#3050e0', W: '#e0e8ff', K: '#202020', R: '#e04040' }, angry: { B: '#c01818', W: '#ff9a9a', K: '#300000', R: '#ffff40' } },
  b: { rows: WIZARD, feet: WIZ_FEET, pal: { P: '#b060f0', p: '#7030b0', K: '#201030', W: '#ffffff', S: '#f8c8a0', N: '#603010' }, angry: { P: '#f04040', p: '#a01010', K: '#300000', W: '#ffff40', S: '#ffd0a0', N: '#601010' } },
  c: { rows: WHALE, feet: WHALE_TAIL, pal: { M: '#c070ff', m: '#7020b0', W: '#ffffff', K: '#101010' }, angry: { M: '#ff5050', m: '#a01010', W: '#ffff60', K: '#101010' } },
  d: { rows: SPRING, feet: SPRING_COIL, pal: { C: '#40c8e8', W: '#ffffff', K: '#202020', R: '#e04040', G: '#a0a0a0' }, angry: { C: '#ff6040', W: '#ffff60', K: '#300000', R: '#ffffff', G: '#ffa0a0' } },
};

export const ENEMY = {};
for (const [k, d] of Object.entries(ENEMY_DEFS)) {
  ENEMY[k] = {
    normal: d.feet.map((f) => makeSprite([...d.rows, ...f], d.pal)),
    angry: d.feet.map((f) => makeSprite([...d.rows, ...f], d.angry)),
  };
}

export const BARON = [
  makeSprite([
    '.....WWWWWW.....',
    '...WWWWWWWWWW...',
    '..WWWWWWWWWWWW..',
    '.WWKKWWWWWWKKWW.',
    '.WWRKKWWWWKKRWW.',
    'WWWWWWWWWWWWWWWW',
    'WWWWWKKKKKKWWWWW',
    'WWWWKWKWKWKKWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWW.WWWW.WWWW.WW',
    '.W...WW...WW...W',
  ], { W: '#f0f0ff', K: '#101010', R: '#ff2020' }),
  makeSprite([
    '.....WWWWWW.....',
    '...WWWWWWWWWW...',
    '..WWWWWWWWWWWW..',
    '.WWKKWWWWWWKKWW.',
    '.WWRKKWWWWKKRWW.',
    'WWWWWWWWWWWWWWWW',
    'WWWWWKKKKKKWWWWW',
    'WWWWKKWKWKWKWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WWWWWWWWWWWWWWWW',
    'WW.WWWW.WWWW.WWW',
    'W...WW...WW...W.',
  ], { W: '#f0f0ff', K: '#101010', R: '#ff2020' }),
];

export const ROCK = makeSprite([
  '..DDDD..',
  '.DLLLDD.',
  'DLLLLLDD',
  'DLLLLDDD',
  'DLLLDDDD',
  'DDLDDDDD',
  '.DDDDDD.',
  '..DDDD..',
], { L: '#c0b0a0', D: '#706050' });

// ---------------- meyveler (değer sırasıyla)
const F_PAL = {
  K: '#101010', R: '#e02020', r: '#901010', G: '#40c040', g: '#107010', Y: '#f8e040', y: '#c0a010',
  W: '#ffffff', P: '#ffa0b0', p: '#e06070', B: '#60c0ff', b: '#2060c0', O: '#f89020', N: '#8a5020',
};
export const FRUITS = [
  { v: 500, s: makeSprite([
    '.......gg.......',
    '......g..g......',
    '.....g....g.....',
    '....g......g....',
    '...g........g...',
    '..RRR......RRR..',
    '.RRWRR....RRWRR.',
    '.RWRRR....RWRRR.',
    '.RRRRr....RRRRr.',
    '..RRr......RRr..',
  ], F_PAL) },
  { v: 1000, s: makeSprite([
    '..........NN....',
    '..........YY....',
    '.........YYY....',
    '........YYYy....',
    '.......YYYYy....',
    '.....YYYYYy.....',
    '..YYYYYYYy......',
    'YYYYYYYyy.......',
    '.yyyyyy.........',
  ], F_PAL) },
  { v: 2000, s: makeSprite([
    '.......g........',
    '......gG........',
    '....PPPPPPP.....',
    '...PPWPPPPPP....',
    '..PPWPPPPPPPP...',
    '..PPPPPPPPpPP...',
    '..PPPPPPPpPPP...',
    '..PPPPPPPPPpP...',
    '...PPPPPPPpp....',
    '....ppppppp.....',
  ], F_PAL) },
  { v: 4000, s: makeSprite([
    '..GGGGGGGGGGGG..',
    '.GgGGgGGgGGgGGG.',
    'GRRRRRRRRRRRRRRG',
    'GRRKRRRKRRRKRRRG',
    '.GRRRRRRRRRRRRG.',
    '..GRRKRRRKRRRG..',
    '...GRRRRRRRRG...',
    '....GGRRRRGG....',
    '......GGGG......',
  ], F_PAL) },
  { v: 6000, s: makeSprite([
    '.......R........',
    '.......Y........',
    '...WWWWWWWWWW...',
    '..WPWPWPWPWPWW..',
    '..PPPPPPPPPPPP..',
    '..NNNNNNNNNNNN..',
    '..WWWWWWWWWWWW..',
    '..NNNNNNNNNNNN..',
    '..pppppppppppp..',
  ], F_PAL) },
  { v: 10000, s: makeSprite([
    '...WBBBBBBBW....',
    '..WBBWBBBBBBW...',
    '.BBBBBBBBBBBBB..',
    '..BbBBBBBBBbB...',
    '...BbBBBBBbB....',
    '....BbBBBbB.....',
    '.....BbBbB......',
    '......BbB.......',
    '.......B........',
  ], F_PAL) },
];

// ---------------- blok desenleri (8x8)
const PATTERNS = [
  ['LLLLLLLD', 'LMMMMMMD', 'LMMMMMMD', 'LMMMMMMD', 'LMMMMMMD', 'LMMMMMMD', 'LMMMMMMD', 'DDDDDDDD'],
  ['MMMDMMMM', 'LLLDLLLL', 'MMMDMMMM', 'DDDDDDDD', 'MMMMMMMD', 'LLLLLLLD', 'MMMMMMMD', 'DDDDDDDD'],
  ['MMMLLMMM', 'MMLLLLMM', 'MLLDDLLM', 'LLDDDDLL', 'LLDDDDLL', 'MLLDDLLM', 'MMLLLLMM', 'MMMLLMMM'],
  ['MMMMMMMM', 'MLLMMLLM', 'MLDMMLDM', 'MMMMMMMM', 'MMMMMMMM', 'MLLMMLLM', 'MLDMMLDM', 'MMMMMMMM'],
  ['LMMMLMMM', 'MLMMMLMM', 'MMLMMMLM', 'MMMLMMML', 'LMMMDMMM', 'MLMMMDMM', 'MMDMMMDM', 'DMMMDMMM'],
  ['LLLLLLLL', 'LMMMMMMD', 'LMDDDDMD', 'LMDLLDMD', 'LMDLLDMD', 'LMDDDDMD', 'LMMMMMMD', 'DDDDDDDD'],
];
const BLOCK_PALS = [
  [0, '#ffb0c8', '#f05090', '#902050'],
  [1, '#ffd890', '#f09020', '#904800'],
  [2, '#b0f0ff', '#40a0f0', '#204890'],
  [5, '#d0ffb0', '#60c040', '#206010'],
  [3, '#ffc0ff', '#c050e0', '#602080'],
  [0, '#fff0a0', '#e0c020', '#806000'],
  [4, '#c0e0ff', '#6080ff', '#2030a0'],
  [2, '#ffb0a0', '#e05040', '#802018'],
  [5, '#f0f0f0', '#a0a0b0', '#505060'],
  [1, '#a0ffe0', '#20c090', '#106040'],
];
export const BLOCKS = BLOCK_PALS.map(([p, L, M, D]) => makeSprite(PATTERNS[p], { L, M, D }));
export const BLOCK_SHADOW = BLOCK_PALS.map(([, , , D]) => D);
