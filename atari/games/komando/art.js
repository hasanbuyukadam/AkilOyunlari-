// Komando — piksel sanatı (özgün).
import { makeSprite } from '../../js/engine/gfx.js';

const HERO_PAL = {
  K: '#101010', S: '#f8b078', s: '#b85c28', R: '#e01800', B: '#2850d8', b: '#14287c',
  G: '#c8c8c8', g: '#606060', W: '#ffffff',
};
const SOLDIER_PAL = {
  K: '#202020', S: '#f0a070', s: '#a05020', R: '#787878', B: '#8c8c8c', b: '#4c4c4c',
  G: '#585858', g: '#303030', W: '#d0d0d0', H: '#6c6c6c', h: '#3c3c3c',
};
const SNOW_SOLDIER_PAL = { ...SOLDIER_PAL, B: '#d8d8e8', b: '#8080a0', R: '#c0c0d0', H: '#e8e8f0', h: '#9090a8' };
const RIFLE_PAL = { ...SOLDIER_PAL, B: '#b03020', b: '#601010', R: '#903020', H: '#c04030', h: '#702010' };

// Üst gövdeler: son 16 satır ortak gövde; üstteki fazla satırlar silah içindir.
const UP_FWD = [
  '.......KKKK.............',
  '......KKKKKK............',
  '.RR..RRRRRRR............',
  'R..RRRRSSSSK............',
  '......SSSKSS............',
  '......SSSSSs............',
  '.....ssSSSs.............',
  '....sSSSSSSSSSSGGGGGGGGW',
  '...sSSSSSSSSSSsggggggg..',
  '...sSSSSssSSSs.g........',
  '...sSSSSSSSs............',
  '....sSSSSSSs............',
  '....sSSSSSs.............',
  '.....SSSSSs.............',
  '.....KKKKKK.............',
  '.....BBBBBBB............',
];
const UP_DIAGUP = [
  '....................W...',
  '...................GG...',
  '..................GGg...',
  '.................GGg....',
  '.......KKKK.....GGg.....',
  '......KKKKKK...GGg......',
  '.RR..RRRRRRR..SSg.......',
  'R..RRRRSSSSK.SSS........',
  '......SSSKSSSSS.........',
  '......SSSSSSSs..........',
  '.....ssSSSSSs...........',
  '....sSSSSSSSs...........',
  '...sSSSSSSSSs...........',
  '...sSSSSSSSs............',
  '....sSSSSSSs............',
  '....sSSSSSs.............',
  '.....SSSSSs.............',
  '.....SSSSSs.............',
  '.....KKKKKK.............',
  '.....BBBBBBB............',
];
const UP_UP = [
  '.........W..............',
  '.........G..............',
  '.........G..............',
  '........gG..............',
  '........gG..............',
  '........gG..............',
  '.......sSSs.............',
  '.......SSSS.............',
  '.......KKKK.............',
  '......KKKKKK............',
  '.RR..RRRRRRR............',
  'R..RRRRSSSSK............',
  '......SSSKSS............',
  '......SSSSSs............',
  '....sssSSSs.............',
  '...sSSSSSSSSs...........',
  '...sSSSSSSSSs...........',
  '...sSSSSSSSSs...........',
  '....sSSSSSSs............',
  '....sSSSSSs.............',
  '.....SSSSSs.............',
  '.....SSSSSs.............',
  '.....KKKKKK.............',
  '.....BBBBBBB............',
];
const UP_DIAGDN = [
  '.......KKKK.............',
  '......KKKKKK............',
  '.RR..RRRRRRR............',
  'R..RRRRSSSSK............',
  '......SSSKSS............',
  '......SSSSSs............',
  '.....ssSSSs.............',
  '....sSSSSSSSs...........',
  '...sSSSSSSSSSs..........',
  '...sSSSSSSSSSSS.........',
  '...sSSSSSSSs.SSg........',
  '....sSSSSSSs..GGg.......',
  '....sSSSSSs....GGg......',
  '.....SSSSSs.....GGg.....',
  '.....KKKKKK......GGg....',
  '.....BBBBBBB......GW....',
];
// Koşarken kollar sallanır (asker) — silahsız
const UP_RUN = [
  '.......KKKK.............',
  '......KKKKKK............',
  '.RR..RRRRRRR............',
  'R..RRRRSSSSK............',
  '......SSSKSS............',
  '......SSSSSs............',
  '.....ssSSSs.............',
  '....sSSSSSSSs...........',
  '...sSSSSSSSSSs..........',
  '...sSSsSSSSSSSs.........',
  '..sSS.sSSSSs.SSS........',
  '..SS..sSSSSs..SS........',
  '.SS...sSSSs.............',
  '......SSSSs.............',
  '.....KKKKKK.............',
  '.....BBBBBBB............',
];

const LEGS = {
  stand: [
    '.....BBBBBBBB...........',
    '.....BBBBbBBB...........',
    '.....BBBb.BBB...........',
    '.....BBB..BBB...........',
    '.....BBB..BBB...........',
    '.....BBB..BBB...........',
    '....BBBB..BBBB..........',
    '....BBB....BBB..........',
    '....BBB....BBB..........',
    '....bBB....BBb..........',
    '....bBB....BBb..........',
    '....bBB....BBb..........',
    '....KKK....KKK..........',
    '....KKK....KKK..........',
    '...KKKK....KKKK.........',
    '...KKKK....KKKKK........',
  ],
  run1: [
    '.....BBBBBBBB...........',
    '.....BBBBBBBBB..........',
    '.....BBBb.BBBBB.........',
    '....BBBB...BBBBB........',
    '....BBB.....BBBB........',
    '...BBB.......BBB........',
    '...BBB........BBB.......',
    '..BBB.........BBB.......',
    '..BBb..........BBb......',
    '.BBb...........BBb......',
    '.bBb...........BBb......',
    'KKK.............KKK.....',
    'KKK.............KKK.....',
    'KK..............KKKK....',
    '................KKKKK...',
    '................KKKKK...',
  ],
  run2: [
    '.....BBBBBBBB...........',
    '.....BBBBBBBBB..........',
    '......BBBBBBBB..........',
    '......BBB.BBBB..........',
    '......BBB..BBBB.........',
    '......BBB...BBBB........',
    '......BBB....BBb........',
    '......BBB...BBb.........',
    '.....BBB...KKKK.........',
    '.....BBB...KKK..........',
    '.....bBB................',
    '.....bBB................',
    '.....KKK................',
    '.....KKK................',
    '....KKKK................',
    '....KKKKK...............',
  ],
  run3: [
    '.....BBBBBBBB...........',
    '.....BBBBBBBBB..........',
    '....BBBBB.BBBB..........',
    '...BBBBB...BBB..........',
    '...BBBB.....BBB.........',
    '..BBB.......BBB.........',
    '..BBB........BBB........',
    '.BBB.........BBB........',
    '.BBb..........BBb.......',
    'KKK...........BBb.......',
    'KKK...........BBb.......',
    'KK.............KKK......',
    '...............KKK......',
    '...............KKKK.....',
    '...............KKKKK....',
    '...............KKKKK....',
  ],
  run4: [
    '.....BBBBBBBB...........',
    '.....BBBBBBBBB..........',
    '.....BBBBBBBB...........',
    '.....BBBB.BBB...........',
    '....BBBB..BBB...........',
    '...BBBB...BBB...........',
    '..BBBb....BBB...........',
    '..KKK.....BBB...........',
    '.KKKK.....BBB...........',
    '..........bBB...........',
    '..........bBB...........',
    '..........bBB...........',
    '..........KKK...........',
    '..........KKK...........',
    '..........KKKK..........',
    '..........KKKKK.........',
  ],
};

const PRONE = [
  '................KKKK............',
  '.......RR......KKKKKK...........',
  '........RRRRRRRRRRRRK...........',
  '...............SSSKSS...........',
  '..............sSSSSSSSSGGGGGGGGW',
  'BBBBBBBBBBBBBsSSSSSSSSSgggggg...',
  'BBBBBBBBBBBBBSSSSSSSSs.g........',
  'KKKBBBBBBBBBBsSSSSSSs...........',
  'KKK.bbbbbbbbbbSSSSSs............',
  'KK..............................',
];
const BALL = [
  '.......KKKKK........',
  '.....KKKKKKKKR......',
  '....KSSSSSKKRRR.....',
  '...SSSSSSSSKRR......',
  '..SSSSSSSSSSSR......',
  '..SSSSSSSSSSSS......',
  '.sSSSSSssSSSSSS.....',
  '.sSSSSs..sSSSSSS....',
  '.sSSSs....BBBBBBB...',
  '.sSSs.....BBBBBBBB..',
  '.BBBB.....BBBBBBBB..',
  '.BBBBB....BBBBBBBK..',
  '..BBBBBB..BBBBBBKK..',
  '..BBBBBBBBBBBBBKKK..',
  '...BBBBBBBBBBBKKK...',
  '....BBBBBBBBBKKK....',
  '.....KKKBBBBKK......',
  '......KKKKKKK.......',
  '........KKK.........',
  '....................',
];
const LYING = [
  '...........................KK...',
  'KKK.......................KKKK..',
  'KKKBBBBBBBBBBBSSSSSSSSSSSKKKKK..',
  'KK.BBBBBBBBBBBSSSSSSSSSSSSKSSS..',
  '...bbbbbbbbbbbsSSSSSSSSSSSSSSS..',
  '................sSSSs..RRRRR.RR.',
];

const rot90 = (rows) => rows[0].split('').map((_, x) => rows.map((r) => r[x]).reverse().join(''));

function heroSet(pal, headless = false) {
  const head = (up) => {
    if (!headless) return up;
    // Asker: kask (bandana yerine)
    const base = up.length - 16;
    const r = up.slice();
    r[base] = '......hhhhh.............';
    r[base + 1] = '.....hHHHHHh............';
    r[base + 2] = '....hHHHHHHHh...........';
    r[base + 3] = '.....hhSSSSK............';
    return r;
  };
  const make = (up, legs) => makeSprite([...head(up), ...legs], pal);
  const s = {
    stand: make(UP_FWD, LEGS.stand),
    up: make(UP_UP, LEGS.stand),
    diagup: make(UP_DIAGUP, LEGS.stand),
    run: ['run1', 'run2', 'run3', 'run4'].map((k) => make(UP_FWD, LEGS[k])),
    runUp: ['run1', 'run2', 'run3', 'run4'].map((k) => make(UP_DIAGUP, LEGS[k])),
    runDn: ['run1', 'run2', 'run3', 'run4'].map((k) => make(UP_DIAGDN, LEGS[k])),
    runArms: ['run1', 'run2', 'run3', 'run4'].map((k) => make(UP_RUN, LEGS[k])),
    diagdn: make(UP_DIAGDN, LEGS.stand),
    prone: makeSprite(PRONE, pal),
    lying: makeSprite(LYING, pal),
    swim: [UP_FWD, UP_DIAGUP, UP_UP].map((u) => makeSprite(head(u).slice(0, u.length - 6), pal)),
  };
  let b = BALL;
  s.ball = [];
  for (let i = 0; i < 4; i++) { s.ball.push(makeSprite(b, pal)); b = rot90(b); }
  return s;
}

export const HERO = heroSet(HERO_PAL);
export const HERO_FLASH = heroSet({ ...HERO_PAL, B: '#f8f8f8', b: '#a0a0a0', R: '#f8f8f8' });
export const SOLDIER = heroSet(SOLDIER_PAL, true);
export const SNOW_SOLDIER = heroSet(SNOW_SOLDIER_PAL, true);
export const RIFLEMAN = heroSet(RIFLE_PAL, true);

export const MEDAL = makeSprite([
  '.RRRR.',
  '.RWWR.',
  '..RR..',
  '.BBBB.',
  'BBWWBB',
  'BWBBWB',
  'BWBBWB',
  'BBWWBB',
  '.BBBB.',
], { R: '#e01800', W: '#ffffff', B: '#2850d8' });

// Uçan silah kapsülü
export const CAPSULE = [
  makeSprite([
    'WW..................WW',
    'WWW................WWW',
    '.WWWW....GGGG....WWWW.',
    '..WWWWWGGRRRRGGWWWWW..',
    '...WWWGRRRRRRRRGWWW...',
    '.....GRRWWRRRRRRG.....',
    '.....GRRRRRRRRRRG.....',
    '......GRRRRRRRRG......',
    '.......GGGGGGGG.......',
  ], { W: '#d0d0d0', G: '#606060', R: '#e01800' }),
  makeSprite([
    '......................',
    '......................',
    '.........GGGG.........',
    'WWWWWWWGGRRRRGGWWWWWWW',
    '.WWWWWGRRRRRRRRGWWWWW.',
    '..WWWGRRWWRRRRRRGWWW..',
    '.....GRRRRRRRRRRG.....',
    '......GRRRRRRRRG......',
    '.......GGGGGGGG.......',
  ], { W: '#d0d0d0', G: '#606060', R: '#e01800' }),
];
// Kartal amblemli güç simgesi
export const FALCON = makeSprite([
  'R......................R',
  'RR....................RR',
  'RRR..................RRR',
  '.RRRR..............RRRR.',
  '..RRRRR..........RRRRR..',
  '...RRRRRR......RRRRRR...',
  '....RRRRRR....RRRRRR....',
  '.....RRRRRR..RRRRRR.....',
  '......RRRRRRRRRRRR......',
  '.......RRRRRRRRRR.......',
  '........RRRRRRRR........',
  '.........RRRRRR.........',
  '..........RRRR..........',
  '...........RR...........',
], { R: '#e01800' });
