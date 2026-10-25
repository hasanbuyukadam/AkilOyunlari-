// Bombacı — Bomberman tarzı. 31x13 karoluk arena, yatay kaydırmalı kamera.
// Bomba koy (A), artı şeklinde patlama ve zincirleme patlamalar, tuğlaların altına gizli
// güçlendirmeler ve çıkış kapısı. Bütün düşmanlar ölünce kapı açılır.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'bombaci',
  width: 256,
  height: 232,
  buttons: { a: 'BOMBA', b: 'PATLAT' },
  help: [
    'A: bomba koy. Patlama artı şeklinde yayılır, tuğlaları yıkar, diğer bombaları da patlatır.',
    'Tuğlaların altında güçlendirmeler var: ek bomba, ateş menzili, hız, uzaktan patlatma (B ile).',
    'Kapı da bir tuğlanın altında gizli. Bütün düşmanları yok edince kapı açılır, içine gir.',
    'Süre biterse ya da açık kapıyı/güçlendirmeyi patlatırsan yeni düşmanlar gelir!',
  ],
};

const TS = 16;
const COLS = 31;
const ROWS = 13;
const HUD = 24;
const AW = COLS * TS;
const STAGE_TIME = 200;

// ---------- Sprite'lar ----------
const PLAYER_PAL = { W: '#fcfcfc', S: '#fcbcb0', K: '#000000', P: '#f878f8', B: '#0058f8', R: '#a81000', L: '#bcbcbc' };
const HEAD_DOWN = [
  '.......PP.......',
  '.......PP.......',
  '........K.......',
  '.....WWWWWW.....',
  '....WWWWWWWW....',
  '...WWSSSSSSWW...',
  '...WSKSSSSKSW...',
  '...WSKSSSSKSW...',
  '...WWSSSSSSWW...',
  '....WWWWWWWW....',
  '...PBBBBBBBBP...',
  '..PP.BBBBBB.PP..',
];
const HEAD_UP = [
  '.......PP.......',
  '.......PP.......',
  '........K.......',
  '.....WWWWWW.....',
  '....WWWWWWWW....',
  '...WWWWWWWWWW...',
  '...WWWWWWWWWW...',
  '...WWWWWWWWWW...',
  '...WLWWWWWWLW...',
  '....WWWWWWWW....',
  '...PBBBBBBBBP...',
  '..PP.BBBBBB.PP..',
];
const HEAD_SIDE = [
  '........PP......',
  '........PP......',
  '.......K........',
  '.....WWWWWW.....',
  '....WWWWWWWW....',
  '...WWWWSSSSSW...',
  '...WWWSSSKSSW...',
  '...WWWSSSKSSW...',
  '...WWWWSSSSSW...',
  '....WWWWWWWW....',
  '.....BBBBBBP....',
  '.....BBBBBPP....',
];
const LEGS_STAND = ['.....BBWWBB.....', '.....BB..BB.....', '....RRR..RRR....', '....RRR..RRR....'];
const LEGS_WALK = ['.....BBWWBB.....', '.....BB..BB.....', '....RRR..BB.....', '.........RRR....'];
const LEGS_SIDE_STAND = ['.....BBWWB......', '......BBB.......', '.....RRRR.......', '.....RRRR.......'];
const LEGS_SIDE_WALK = ['.....BBWWB......', '....BB..BB......', '...RRR...RRR....', '................'];
const mirror = (rows) => rows.map((r) => [...r.padEnd(16, '.')].reverse().join(''));

const ENEMY_ROWS = {
  balon: ['.....OOOOOO.....', '...OOOOOOOOOO...', '..OOOOOOOOOOOO..', '.OOOOOOOOOOOOOO.', '.OOWWKOOOOWWKOO.', 'OOOWWKOOOOWWKOOO', 'OOOWWKOOOOWWKOOO', 'OOOOOOOOOOOOOOOO', 'OOOOOOOOOOOOOOOO', 'OOOKOOOOOOOOKOOO', '.OOOKKKKKKKKOOO.', '.OOOOOOOOOOOOOO.', '..OOOOOOOOOOOO..', '...OOOOOOOOOO...', '.....OOOOOO.....', '.......OO.......'],
  sogan: ['.......BB.......', '......BBBB......', '.....BBBBBB.....', '....BBBBBBBB....', '...BBBBBBBBBB...', '..BBWWBBBBWWBB..', '..BBWKBBBBWKBB..', '.BBBWKBBBBWKBBB.', '.BBBBBBBBBBBBBB.', '.BBBBBBBBBBBBBB.', '.BBBBKKKKKKBBBB.', '.BBBBBBBBBBBBBB.', '..BBBBBBBBBBBB..', '...BBBBBBBBBB...', '....BBBBBBBB....', '......BBBB......'],
  varil: ['...YYYYYYYYYY...', '..YYYYYYYYYYYY..', '.YYOOOOOOOOOOYY.', '.YYYYYYYYYYYYYY.', '.YYWWKYYYYWWKYY.', '.YYWWKYYYYWWKYY.', '.YYYYYYYYYYYYYY.', '.YYOOOOOOOOOOYY.', '.YYYYYYYYYYYYYY.', '.YYYYKKKKKKYYYY.', '.YYYYYYYYYYYYYY.', '.YYOOOOOOOOOOYY.', '..YYYYYYYYYYYY..', '...YYYYYYYYYY...', '...OO......OO...', '..OOO......OOO..'],
  gulen: ['.....PPPPPP.....', '...PPPPPPPPPP...', '..PPPPPPPPPPPP..', '.PPPWWPPPPWWPPP.', '.PPWKKWPPWKKWPP.', 'PPPWKKWPPWKKWPPP', 'PPPPWWPPPPWWPPPP', 'PPPPPPPPPPPPPPPP', 'PPKPPPPPPPPPPKPP', 'PPPKPPPPPPPPKPPP', '.PPPKKKKKKKKPPP.', '.PPPPKKKKKKPPPP.', '..PPPPPPPPPPPP..', '...PPPPPPPPPP...', '..PP.PPPPPP.PP..', '.PP..........PP.'],
  hayalet: ['.....GGGGGG.....', '...GGGGGGGGGG...', '..GGGGGGGGGGGG..', '.GGGGGGGGGGGGGG.', '.GGKKGGGGGGKKGG.', '.GGKKGGGGGGKKGG.', 'GGGGGGGGGGGGGGGG', 'GGGGGGKKKKGGGGGG', 'GGGGGKGGGGKGGGGG', 'GGGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', 'GGGGGGGGGGGGGGGG', 'GG.GGGG..GGGG.GG', 'G...GG....GG...G', '................'],
  kaplan: ['....RRRRRRRR....', '..RRRRRRRRRRRR..', '.RRYYRRRRRRYYRR.', '.RYYYYRRRRYYYYR.', 'RRRYKKRRRRKKYRRR', 'RRRRKKRRRRKKRRRR', 'RRRRRRRRRRRRRRRR', 'WWWRRRRYYRRRRWWW', 'RRRRRRYYYYRRRRRR', 'WWWRRRRRRRRRRWWW', 'RRRRRKKKKKKRRRRR', '.RRRRRKKKKRRRRR.', '.RRRRRRRRRRRRRR.', '..RRRRRRRRRRRR..', '...RR......RR...', '..RRR......RRR..'],
};
const ENEMY_PAL = {
  balon: { O: '#fc7460', W: '#fcfcfc', K: '#000' },
  sogan: { B: '#3cbcfc', W: '#fcfcfc', K: '#000' },
  varil: { Y: '#f8b800', O: '#c84c0c', W: '#fcfcfc', K: '#000' },
  gulen: { P: '#f878f8', W: '#fcfcfc', K: '#000' },
  hayalet: { G: '#b8b8f8', K: '#2038ec' },
  kaplan: { R: '#d82800', Y: '#fce0a8', W: '#fcfcfc', K: '#000' },
};
// hız (px/kare), zekâ (takip menzili), duvar geçer mi, puan
const ENEMY_TYPES = {
  balon: { speed: 0.5, smart: 0, wallpass: false, pts: 100 },
  sogan: { speed: 0.75, smart: 4, wallpass: false, pts: 200 },
  varil: { speed: 1, smart: 0, wallpass: false, pts: 400 },
  gulen: { speed: 1, smart: 6, wallpass: false, pts: 800 },
  hayalet: { speed: 0.5, smart: 6, wallpass: true, pts: 1000 },
  kaplan: { speed: 1.34, smart: 12, wallpass: false, pts: 4000 },
};
const TIER = ['balon', 'sogan', 'varil', 'gulen', 'hayalet', 'kaplan'];

const ITEM_ROWS = {
  bomba: ['................', '.....KK.........', '......K.Y.......', '.......K........', '.....KKKK.......', '....KKKKKK......', '...KKWKKKKK.....', '...KWKKKKKK.....', '...KKKKKKKK.....', '...KKKKKKKK.....', '....KKKKKK......', '.....KKKK.......'],
  ates: ['.......Y........', '......YY........', '.....YYW.Y......', '....YYWW.YY.....', '....YWWWYYY.....', '...YYWWWWWY.....', '...YWWWWWWYY....', '...YWWWWWWWY....', '...YYWWWWWYY....', '....YYWWWYY.....', '.....YYYYY......', '................'],
  hiz: ['................', '....WWWW........', '....WKKW........', '....WKKW........', '....WKKWWWW.....', '....WKKKKKWW....', '...WKKKKKKKW....', '...WWWWWWWWW....', '....K.K..K......', '...KYK.KYK......', '....K...K.......', '................'],
  kumanda: ['................', '......Y..Y......', '.......YY.......', '....KKKKKKK.....', '....KWWWWWK.....', '....KWRRRWK.....', '....KWRRRWK.....', '....KWWWWWK.....', '....KKKKKKK.....', '.....K...K......', '................', '................'],
  gecis: ['................', '....KK..........', '...KKKK...W.....', '..KKKKKK..WW....', '..KWKKKK.WWWW...', '..KKKKKK.WWWW...', '..KKKKKK..WW....', '...KKKK...W.....', '................', '..W.W.W.W.W.....', '................', '................'],
  kalkan: ['................', '...WWWWWWWW.....', '...WYYYYYYW.....', '...WYYRYYYW.....', '...WYRRRYYW.....', '...WYRRRRYW.....', '....WYRRYW......', '....WYYYYW......', '.....WYYW.......', '......WW........', '................', '................'],
  can: ['................', '...RR...RR......', '..RRRR.RRRR.....', '..RWRRRRRRR.....', '..RRRRRRRRR.....', '...RRRRRRR......', '....RRRRR.......', '.....RRR........', '......R.........', '................', '................', '................'],
};
const ITEM_PAL = { K: '#000', W: '#fcfcfc', Y: '#fcd800', R: '#e40058' };

let S = null;
function tileRows(fn) {
  const rows = [];
  for (let y = 0; y < 16; y++) { let s = ''; for (let x = 0; x < 16; x++) s += fn(x, y); rows.push(s); }
  return rows;
}
function buildSprites() {
  if (S) return;
  S = {};
  const legsFor = (head, a, b) => [makeSprite([...head, ...a], PLAYER_PAL), makeSprite([...head, ...b], PLAYER_PAL), makeSprite([...head, ...mirror(b)], PLAYER_PAL)];
  S.player = {
    down: legsFor(HEAD_DOWN, LEGS_STAND, LEGS_WALK),
    up: legsFor(HEAD_UP, LEGS_STAND, LEGS_WALK),
    right: [makeSprite([...HEAD_SIDE, ...LEGS_SIDE_STAND], PLAYER_PAL), makeSprite([...HEAD_SIDE, ...LEGS_SIDE_WALK], PLAYER_PAL), makeSprite([...HEAD_SIDE, ...LEGS_SIDE_STAND], PLAYER_PAL)],
  };
  S.playerWhite = makeSprite([...HEAD_DOWN, ...LEGS_STAND], { W: '#fcfcfc', S: '#fcfcfc', K: '#fcfcfc', P: '#fcfcfc', B: '#fcfcfc', R: '#fcfcfc', L: '#fcfcfc' });
  S.playerDark = makeSprite([...HEAD_DOWN, ...LEGS_STAND], { W: '#7c7c7c', S: '#bc7c70', K: '#000', P: '#a03898', B: '#0028a0', R: '#600800', L: '#7c7c7c' });
  // sert blok (kolon)
  S.wall = makeSprite(tileRows((x, y) => {
    if (y === 0 || x === 0) return 'W';
    if (y === 15 || x === 15) return 'D';
    if (y === 1 || x === 1) return 'L';
    if (y === 14 || x === 14) return 'M';
    return 'G';
  }), { W: '#fcfcfc', L: '#d8d8d8', G: '#bcbcbc', M: '#7c7c7c', D: '#3c3c3c' });
  // tuğla
  const brick = (x, y, burn) => {
    const row = Math.floor(y / 4);
    const off = row % 2 ? 4 : 0;
    if (y % 4 === 3) return 'D';
    if ((x + off) % 8 === 7) return 'D';
    if (y % 4 === 0 || (x + off) % 8 === 0) return 'L';
    return burn ? ((x * 7 + y * 3) % 5 === 0 ? 'Y' : 'G') : 'G';
  };
  S.soft = makeSprite(tileRows((x, y) => brick(x, y, false)), { L: '#d8d8d8', G: '#a4a4a4', D: '#585858' });
  S.burn = [0, 1, 2].map((k) => makeSprite(tileRows((x, y) => {
    const n = (x * 13 + y * 7 + k * 5) % 9;
    if (n < k * 2) return '.';
    if ((x + y + k) % 5 === 0) return 'Y';
    return brick(x, y, true);
  }), { L: '#fc9838', G: '#a81000', D: '#503000', Y: '#fce0a8' }));
  // bomba
  const bombRows = (r) => tileRows((x, y) => {
    const dx = x - 7.5, dy = y - 8.5;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (y <= 3 && x >= 9 && x <= 11 && y >= 1) return y === 1 ? (x === 11 ? 'Y' : '.') : (x === 10 ? 'F' : '.');
    if (d <= r) {
      if (dx < -1 && dy < -1 && d > r - 3 && d < r - 1) return 'W';
      return 'K';
    }
    return '.';
  });
  S.bomb = [6.5, 7, 6].map((r) => makeSprite(bombRows(r), { K: '#101010', W: '#fcfcfc', F: '#c84c0c', Y: '#fcd800' }));
  // kapı
  S.door = [0, 1].map((open) => makeSprite(tileRows((x, y) => {
    if (x === 0 || y === 0 || x === 15) return 'K';
    if (x === 1 || y === 1 || x === 14) return 'L';
    if (y === 15) return 'K';
    if (x === 7 || x === 8) return 'D';
    if ((x === 5 || x === 10) && y === 8) return 'Y';
    if (y % 4 === 2) return 'D';
    return open ? 'O' : 'G';
  }), { K: '#000', L: '#bcbcbc', D: '#3c3c3c', G: '#7c7c7c', Y: '#fcd800', O: '#fc9838' }));
  // düşmanlar
  S.enemy = {};
  S.enemyFlip = {};
  S.enemyWhite = {};
  for (const [k, rows] of Object.entries(ENEMY_ROWS)) {
    S.enemy[k] = makeSprite(rows, ENEMY_PAL[k]);
    S.enemyFlip[k] = makeSprite(mirror(rows), ENEMY_PAL[k]);
    const white = {};
    for (const ch of Object.keys(ENEMY_PAL[k])) white[ch] = ENEMY_PAL[k][ch] === '#000' ? '#000' : '#fcfcfc';
    S.enemyWhite[k] = makeSprite(rows, white);
  }
  S.items = {};
  for (const [k, rows] of Object.entries(ITEM_ROWS)) S.items[k] = makeSprite(rows, ITEM_PAL);
}

// Aşama düşman listeleri
const STAGES = [
  { balon: 6 },
  { balon: 3, sogan: 3 },
  { balon: 2, sogan: 2, varil: 2 },
  { balon: 1, sogan: 1, varil: 2, gulen: 2 },
  { sogan: 4, varil: 3 },
  { sogan: 2, varil: 3, gulen: 2 },
  { sogan: 2, varil: 3, hayalet: 2 },
  { sogan: 1, varil: 2, gulen: 4 },
  { sogan: 1, varil: 1, gulen: 4, hayalet: 1 },
  { sogan: 1, varil: 1, gulen: 1, hayalet: 3, kaplan: 1 },
];
const STAGE_ITEMS = ['ates', 'bomba', 'kumanda', 'hiz', 'bomba', 'ates', 'gecis', 'bomba', 'kalkan', 'can'];

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DLIST = ['up', 'down', 'left', 'right'];
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

export default class Bombaci {
  constructor(api) {
    this.api = api;
    buildSprites();
    this.stage = 1;
    this.lives = 3;
    this.power = { bombs: 1, fire: 1, speed: 0, remote: false, bombpass: false, flamepass: false };
    this.popups = [];
    this.lastDirs = [];
    this.startStage();
  }

  // ---------- Aşama kurulumu ----------
  startStage() {
    const { api } = this;
    this.grid = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const wall = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1 || (r % 2 === 0 && c % 2 === 0);
        row.push(wall ? 1 : 0);
      }
      this.grid.push(row);
    }
    const density = Math.min(0.42, 0.3 + this.stage * 0.01);
    const softCells = [];
    for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) {
      if (this.grid[r][c]) continue;
      if (r + c <= 3) continue; // başlangıç köşesi boş
      if (Math.random() < density) { this.grid[r][c] = 2; softCells.push([c, r]); }
    }
    this.items = new Map(); // "c,r" -> tür (gizli veya açık)
    this.itemShown = new Set();
    const pickSoft = () => {
      if (!softCells.length) return [COLS - 2, ROWS - 2];
      const i = Math.floor(Math.random() * softCells.length);
      return softCells.splice(i, 1)[0];
    };
    // kapı oyuncudan uzakta
    let door;
    for (let tries = 0; tries < 30; tries++) {
      door = pickSoft();
      if (door[0] + door[1] > 10 || !softCells.length) break;
      softCells.push(door);
    }
    if (this.grid[door[1]][door[0]] !== 2) this.grid[door[1]][door[0]] = 2;
    this.door = { c: door[0], r: door[1], shown: false, penalty: 0 };
    const item = STAGE_ITEMS[(this.stage - 1) % STAGE_ITEMS.length];
    const ic = pickSoft();
    if (this.grid[ic[1]][ic[0]] === 2) this.items.set(`${ic[0]},${ic[1]}`, item);
    if (this.stage > 3 && softCells.length) {
      const ic2 = pickSoft();
      this.items.set(`${ic2[0]},${ic2[1]}`, this.stage % 2 ? 'bomba' : 'ates');
    }
    this.burning = new Map(); // "c,r" -> kalan kare
    this.bombs = [];
    this.flames = [];
    this.flameGrid = new Map();
    this.enemies = [];
    const comp = this.stage <= STAGES.length ? STAGES[this.stage - 1] : this.randomComp();
    for (const [type, n] of Object.entries(comp)) for (let i = 0; i < n; i++) this.spawnEnemy(type);
    this.player = { x: TS, y: TS, dir: 'down', anim: 0, acc: 0, moving: false };
    this.time = STAGE_TIME * 60;
    this.timeUp = false;
    this.state = 'intro';
    this.timer = api.preview ? 0 : 150;
    this.camX = 0;
    if (!api.preview) api.sfx.seq([['E5', 0.1], ['G5', 0.1], ['C6', 0.1], ['G5', 0.1], ['E5', 0.1], ['C5', 0.1], ['D5', 0.1], ['G5', 0.3]], { vol: 0.08 });
  }

  randomComp() {
    const n = Math.min(10, 6 + Math.floor(this.stage / 4));
    const comp = {};
    const maxTier = Math.min(TIER.length - 1, 2 + Math.floor(this.stage / 4));
    for (let i = 0; i < n; i++) {
      const t = TIER[Math.max(1, maxTier - Math.floor(Math.random() * 3))];
      comp[t] = (comp[t] || 0) + 1;
    }
    return comp;
  }

  spawnEnemy(type, at) {
    let c, r;
    if (at) [c, r] = at;
    else {
      for (let tries = 0; tries < 400; tries++) {
        c = 1 + Math.floor(Math.random() * (COLS - 2));
        r = 1 + Math.floor(Math.random() * (ROWS - 2));
        if (this.grid[r][c] === 0 && c + r > 7) break;
      }
      if (this.grid[r][c] !== 0) { c = COLS - 2; r = ROWS - 2; this.grid[r][c] = 0; }
    }
    const T = ENEMY_TYPES[type];
    this.enemies.push({ type, x: c * TS, y: r * TS, dir: DLIST[Math.floor(Math.random() * 4)], acc: 0, speed: T.speed * (this.stage > 10 ? 1.1 : 1), dead: 0, anim: Math.floor(Math.random() * 60), wait: at ? 60 : 0 });
  }

  // ---------- Yardımcılar ----------
  cell(x, y) { return [Math.round(x / TS), Math.round(y / TS)]; }
  bombAt(c, r) { return this.bombs.find((b) => b.c === c && b.r === r); }
  solidFor(c, r, who) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
    const g = this.grid[r][c];
    if (g === 1) return true;
    if (g === 2 && !(who.wallpass)) return true;
    const b = this.bombAt(c, r);
    if (b && !(who.isPlayer && (b.inside || this.power.bombpass))) return true;
    return false;
  }

  // ---------- Güncelleme ----------
  update() {
    const { api } = this;
    this.popups = this.popups.filter((p) => --p.t > 0);
    if (this.state === 'intro') {
      if (--this.timer <= 0) this.state = 'play';
      return;
    }
    if (this.state === 'over') return;
    if (this.state === 'clear') {
      if (--this.timer <= 0) { this.stage++; this.startStage(); }
      this.updateCamera();
      return;
    }
    if (this.state === 'dying') {
      this.timer--;
      this.updateBombs();
      this.updateEnemies();
      if (this.timer <= 0) {
        this.lives--;
        if (this.lives <= 0) {
          this.state = 'over';
          api.sfx.play('gameover');
          api.gameOver();
          return;
        }
        Object.assign(this.power, { remote: false, bombpass: false, flamepass: false });
        this.startStage();
      }
      return;
    }

    // oyun
    if (this.time > 0) {
      this.time--;
      if (this.time === 0 && !this.timeUp) {
        this.timeUp = true;
        for (let i = 0; i < 8; i++) this.spawnEnemy('kaplan');
        api.sfx.play('bigexplode');
      }
    }
    this.handlePlayer();
    this.updateBombs();
    this.updateEnemies();
    this.checkPlayerHits();
    this.updateCamera();
  }

  handlePlayer() {
    const { input, preview, sfx } = this.api;
    const p = this.player;
    let dir = null;
    let wantBomb = false;
    let wantDet = false;
    if (preview) {
      const ai = this.autopilot();
      dir = ai.dir; wantBomb = ai.bomb;
    } else {
      for (const d of DLIST) if (input.pressed(d)) { this.lastDirs = this.lastDirs.filter((x) => x !== d); this.lastDirs.push(d); }
      this.lastDirs = this.lastDirs.filter((d) => input.held(d));
      for (const d of DLIST) if (input.held(d) && !this.lastDirs.includes(d)) this.lastDirs.push(d);
      dir = this.lastDirs.length ? this.lastDirs[this.lastDirs.length - 1] : null;
      wantBomb = input.pressed('a');
      wantDet = input.pressed('b');
    }
    p.moving = false;
    if (dir) {
      p.dir = dir;
      p.acc += 1 + this.power.speed * 0.34;
      while (p.acc >= 1) { p.acc -= 1; if (this.stepPlayer(dir)) p.moving = true; }
      if (p.moving) p.anim++;
    } else p.acc = 0;

    // bomba üstündeyken "içeride" bayrağını güncelle
    for (const b of this.bombs) {
      if (b.inside && (Math.abs(p.x - b.c * TS) >= TS || Math.abs(p.y - b.r * TS) >= TS)) b.inside = false;
    }

    if (wantBomb) {
      const [c, r] = this.cell(p.x, p.y);
      if (this.bombs.length < this.power.bombs && !this.bombAt(c, r) && this.grid[r][c] === 0) {
        this.bombs.push({ c, r, fuse: 150, inside: true, anim: 0 });
        sfx.tone(180, 0.06, { type: 'square', vol: 0.12 });
      }
    }
    if (wantDet && this.power.remote && this.bombs.length) {
      this.explode(this.bombs[0]);
    }

    // kapı
    const [pc, pr] = this.cell(p.x, p.y);
    if (this.door.shown && pc === this.door.c && pr === this.door.r && !this.enemies.some((e) => !e.dead)
      && Math.abs(p.x - pc * TS) < 4 && Math.abs(p.y - pr * TS) < 4) {
      this.state = 'clear';
      this.timer = 180;
      this.api.sfx.play('levelup');
      this.api.addScore(Math.floor(this.time / 60) * 10);
    }
    // güçlendirme alma
    const key = `${pc},${pr}`;
    if (this.itemShown.has(key) && this.items.has(key)) {
      const it = this.items.get(key);
      this.items.delete(key);
      this.itemShown.delete(key);
      this.applyItem(it);
    }
  }

  applyItem(it) {
    const pw = this.power;
    if (it === 'bomba') pw.bombs = Math.min(8, pw.bombs + 1);
    else if (it === 'ates') pw.fire = Math.min(8, pw.fire + 1);
    else if (it === 'hiz') pw.speed = Math.min(2, pw.speed + 1);
    else if (it === 'kumanda') pw.remote = true;
    else if (it === 'gecis') pw.bombpass = true;
    else if (it === 'kalkan') pw.flamepass = true;
    else if (it === 'can') this.lives++;
    const names = { bomba: '+BOMBA', ates: '+ATEŞ', hiz: '+HIZ', kumanda: 'KUMANDA', gecis: 'BOMBA GEÇİŞ', kalkan: 'ALEV KALKANI', can: '+CAN' };
    this.popups.push({ x: this.player.x + 8, y: this.player.y - 4, text: names[it], t: 90, color: '#fcd800' });
    this.api.addScore(1000);
    this.api.sfx.play('power');
  }

  // 1 piksellik adım; köşelerde kayarak hizalanma
  stepPlayer(dir) {
    const p = this.player;
    const [dx, dy] = DIRS[dir];
    const who = { isPlayer: true, wallpass: false };
    if (dx) {
      const r = Math.round(p.y / TS);
      if (p.y !== r * TS) {
        const ahead = dx > 0 ? Math.floor(p.x / TS) + 1 : Math.ceil(p.x / TS) - 1;
        if (!this.solidFor(ahead, r, who) || (p.x % TS !== 0)) { p.y += p.y < r * TS ? 1 : -1; return true; }
        return false;
      }
      const nx = p.x + dx;
      const c = dx > 0 ? Math.floor((nx + TS - 1) / TS) : Math.floor(nx / TS);
      if (this.solidFor(c, r, who) && !(this.bombAt(c, r)?.inside)) return false;
      p.x = nx;
      return true;
    }
    const c = Math.round(p.x / TS);
    if (p.x !== c * TS) {
      const ahead = dy > 0 ? Math.floor(p.y / TS) + 1 : Math.ceil(p.y / TS) - 1;
      if (!this.solidFor(c, ahead, who) || (p.y % TS !== 0)) { p.x += p.x < c * TS ? 1 : -1; return true; }
      return false;
    }
    const ny = p.y + dy;
    const r = dy > 0 ? Math.floor((ny + TS - 1) / TS) : Math.floor(ny / TS);
    if (this.solidFor(c, r, who) && !(this.bombAt(c, r)?.inside)) return false;
    p.y = ny;
    return true;
  }

  updateBombs() {
    for (const b of [...this.bombs]) {
      b.anim++;
      if (this.power.remote && !b.chain && this.state === 'play') continue; // kumandayla patlar
      if (--b.fuse <= 0) this.explode(b);
    }
    // alevler
    for (const f of this.flames) f.t--;
    this.flames = this.flames.filter((f) => f.t > 0);
    this.flameGrid = new Map();
    for (const f of this.flames) this.flameGrid.set(`${f.c},${f.r}`, f.t);
    // yanan tuğlalar
    for (const [k, t] of this.burning) {
      if (t <= 1) {
        this.burning.delete(k);
        const [c, r] = k.split(',').map(Number);
        this.grid[r][c] = 0;
        if (this.items.has(k)) this.itemShown.add(k);
        if (this.door.c === c && this.door.r === r) this.door.shown = true;
      } else this.burning.set(k, t - 1);
    }
  }

  explode(b) {
    const idx = this.bombs.indexOf(b);
    if (idx < 0) return;
    this.bombs.splice(idx, 1);
    const { sfx } = this.api;
    sfx.noise(0.45, { vol: 0.35, freq: 1000 });
    const range = this.power.fire;
    const life = 32;
    this.addFlame(b.c, b.r, 'center', life);
    for (const d of DLIST) {
      const [dx, dy] = DIRS[d];
      for (let i = 1; i <= range; i++) {
        const c = b.c + dx * i, r = b.r + dy * i;
        const g = this.grid[r]?.[c];
        if (g === undefined || g === 1) break;
        const k = `${c},${r}`;
        if (g === 2) {
          if (!this.burning.has(k)) this.burning.set(k, 30);
          break;
        }
        const other = this.bombAt(c, r);
        if (other) { other.fuse = 1; other.chain = true; this.addFlame(c, r, i === range ? `end-${d}` : (dx ? 'h' : 'v'), life); break; }
        // açıktaki güçlendirme yanar
        if (this.itemShown.has(k)) {
          this.itemShown.delete(k);
          this.items.delete(k);
          this.penalty(c, r);
        } else if (this.door.shown && this.door.c === c && this.door.r === r && this.door.penalty <= 0) {
          this.penalty(c, r);
          this.door.penalty = 120;
        }
        this.addFlame(c, r, i === range ? `end-${d}` : (dx ? 'h' : 'v'), life);
      }
    }
    if (this.door.shown && this.door.c === b.c && this.door.r === b.r && this.door.penalty <= 0) {
      this.penalty(b.c, b.r);
      this.door.penalty = 120;
    }
    // patlamada ölen düşmanlara artan puan için zincir sayacı
    this.killChain = 0;
  }

  penalty(c, r) {
    const live = this.enemies.filter((e) => !e.dead).length;
    if (live > 14) return;
    const tier = TIER[Math.min(TIER.length - 1, 1 + Math.floor(this.stage / 3))];
    for (let i = 0; i < 4; i++) this.spawnEnemy(tier, [c, r]);
    this.api.sfx.play('hit');
  }

  addFlame(c, r, kind, t) {
    const k = `${c},${r}`;
    const ex = this.flames.find((f) => f.c === c && f.r === r);
    if (ex) {
      ex.t = Math.max(ex.t, t);
      const axis = (kd) => (kd === 'h' || kd === 'end-left' || kd === 'end-right' ? 'h' : kd === 'center' ? 'c' : 'v');
      if (ex.kind !== kind) {
        const a1 = axis(ex.kind), a2 = axis(kind);
        ex.kind = a1 === 'c' || a2 === 'c' || a1 !== a2 ? 'center' : a1;
      }
    } else this.flames.push({ c, r, kind, t, life: t });
    this.flameGrid.set(k, t);
  }

  updateEnemies() {
    if (this.door.penalty > 0) this.door.penalty--;
    const p = this.player;
    const [pc, pr] = this.cell(p.x, p.y);
    let chain = 0;
    for (const e of this.enemies) {
      e.anim++;
      if (e.dead) { e.dead++; continue; }
      const T = ENEMY_TYPES[e.type];
      const [ec, er] = this.cell(e.x, e.y);
      if (this.flameGrid.has(`${ec},${er}`)) {
        e.dead = 1;
        chain++;
        const pts = T.pts * (2 ** Math.min(4, chain - 1));
        this.api.addScore(pts);
        e.pts = pts;
        this.api.sfx.play('hit');
        continue;
      }
      if (e.wait > 0) { e.wait--; continue; }
      if (this.state !== 'play') continue;
      e.acc += e.speed;
      while (e.acc >= 1) {
        e.acc -= 1;
        this.stepEnemy(e, T, pc, pr);
      }
    }
    this.enemies = this.enemies.filter((e) => e.dead < 120);
    if (chain) {
      const alive = this.enemies.some((e) => !e.dead);
      if (!alive && this.door.shown) this.api.sfx.play('coin');
    }
  }

  stepEnemy(e, T, pc, pr) {
    const who = { isPlayer: false, wallpass: T.wallpass };
    const aligned = e.x % TS === 0 && e.y % TS === 0;
    if (aligned) {
      const c = e.x / TS, r = e.y / TS;
      const open = DLIST.filter((d) => !this.solidFor(c + DIRS[d][0], r + DIRS[d][1], who));
      if (!open.length) return;
      const dist = Math.abs(c - pc) + Math.abs(r - pr);
      let choice = e.dir;
      if (T.smart && dist <= T.smart && Math.random() < 0.8) {
        const good = open.filter((d) => Math.abs(c + DIRS[d][0] - pc) + Math.abs(r + DIRS[d][1] - pr) < dist);
        if (good.length) choice = good[Math.floor(Math.random() * good.length)];
        else if (!open.includes(choice)) choice = open[Math.floor(Math.random() * open.length)];
      } else if (!open.includes(choice)) {
        const nonBack = open.filter((d) => d !== OPP[e.dir]);
        choice = (nonBack.length ? nonBack : open)[Math.floor(Math.random() * (nonBack.length ? nonBack.length : open.length))];
      } else if (Math.random() < 0.12) {
        const turns = open.filter((d) => d !== OPP[e.dir]);
        if (turns.length) choice = turns[Math.floor(Math.random() * turns.length)];
      }
      e.dir = choice;
    } else {
      // önüne bomba konduysa geri dön
      const [dx, dy] = DIRS[e.dir];
      const nc = dx > 0 ? Math.floor(e.x / TS) + 1 : dx < 0 ? Math.floor(e.x / TS) : Math.round(e.x / TS);
      const nr = dy > 0 ? Math.floor(e.y / TS) + 1 : dy < 0 ? Math.floor(e.y / TS) : Math.round(e.y / TS);
      if (this.bombAt(nc, nr)) e.dir = OPP[e.dir];
    }
    const [dx, dy] = DIRS[e.dir];
    e.x += dx; e.y += dy;
  }

  checkPlayerHits() {
    const p = this.player;
    if (this.state !== 'play') return;
    const [pc, pr] = this.cell(p.x, p.y);
    let hit = false;
    if (this.flameGrid.has(`${pc},${pr}`) && !this.power.flamepass) hit = true;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.abs(e.x - p.x) < 11 && Math.abs(e.y - p.y) < 11) hit = true;
    }
    if (hit) {
      this.state = 'dying';
      this.timer = 110;
      this.api.sfx.play('die');
    }
  }

  updateCamera() {
    const target = this.player.x + 8 - this.api.W / 2;
    this.camX = Math.max(0, Math.min(AW - this.api.W, Math.round(target)));
  }

  // ---------- Önizleme otopilotu ----------
  dangerSet() {
    const set = new Set(this.flameGrid.keys());
    for (const b of this.bombs) {
      set.add(`${b.c},${b.r}`);
      for (const d of DLIST) {
        const [dx, dy] = DIRS[d];
        for (let i = 1; i <= this.power.fire; i++) {
          const c = b.c + dx * i, r = b.r + dy * i;
          if (this.grid[r]?.[c] !== 0) break;
          set.add(`${c},${r}`);
        }
      }
    }
    return set;
  }

  bfs(sc, sr, goal, avoid) {
    const who = { isPlayer: true, wallpass: false };
    const seen = new Map([[`${sc},${sr}`, null]]);
    const q = [[sc, sr]];
    for (let i = 0; i < q.length; i++) {
      const [c, r] = q[i];
      if (goal(c, r)) {
        let k = `${c},${r}`, prev = seen.get(k), last = [c, r];
        while (prev && prev !== `${sc},${sr}`) { last = prev.split(',').map(Number); prev = seen.get(prev); }
        return { dest: [c, r], first: last };
      }
      for (const d of DLIST) {
        const nc = c + DIRS[d][0], nr = r + DIRS[d][1];
        const k = `${nc},${nr}`;
        if (seen.has(k) || this.solidFor(nc, nr, who) || (avoid && avoid.has(k))) continue;
        seen.set(k, `${c},${r}`);
        q.push([nc, nr]);
      }
    }
    return null;
  }

  autopilot() {
    const p = this.player;
    const res = { dir: null, bomb: false };
    // hizalı değilse mevcut yönde devam
    if (p.x % TS !== 0 || p.y % TS !== 0) { res.dir = p.dir; return res; }
    const c = p.x / TS, r = p.y / TS;
    const danger = this.dangerSet();
    const enemyNear = (cc, rr) => this.enemies.some((e) => !e.dead && Math.abs(Math.round(e.x / TS) - cc) + Math.abs(Math.round(e.y / TS) - rr) <= 1);
    const toDir = (t) => (t[0] > c ? 'right' : t[0] < c ? 'left' : t[1] > r ? 'down' : 'up');
    if (danger.has(`${c},${r}`)) {
      const path = this.bfs(c, r, (x, y) => !danger.has(`${x},${y}`), null);
      if (path) res.dir = toDir(path.first);
      return res;
    }
    const adjSoft = DLIST.some((d) => this.grid[r + DIRS[d][1]]?.[c + DIRS[d][0]] === 2);
    const enemyClose = this.enemies.some((e) => !e.dead && Math.abs(e.x / TS - c) + Math.abs(e.y / TS - r) <= 2);
    if ((adjSoft || enemyClose) && this.bombs.length < this.power.bombs) {
      // kaçış yolu var mı?
      const fake = new Set(danger);
      fake.add(`${c},${r}`);
      for (const d of DLIST) for (let i = 1; i <= this.power.fire; i++) {
        const x = c + DIRS[d][0] * i, y = r + DIRS[d][1] * i;
        if (this.grid[y]?.[x] !== 0) break;
        fake.add(`${x},${y}`);
      }
      const esc = this.bfs(c, r, (x, y) => !fake.has(`${x},${y}`), null);
      if (esc) { res.bomb = true; return res; }
    }
    const path = this.bfs(c, r, (x, y) => (x !== c || y !== r) && (DLIST.some((d) => this.grid[y + DIRS[d][1]]?.[x + DIRS[d][0]] === 2) || this.itemShown.has(`${x},${y}`)), danger);
    if (path && !enemyNear(...path.first)) res.dir = toDir(path.first);
    return res;
  }

  // ---------- Çizim ----------
  draw() {
    const { gfx, frame } = this.api;
    gfx.cls('#000');
    if (this.state === 'intro' && this.timer > 0) {
      gfx.text(`AŞAMA ${this.stage}`, gfx.W / 2, 100, '#fcfcfc', { align: 'center', scale: 2 });
      gfx.text(`CAN ${this.lives}`, gfx.W / 2, 130, '#fcd800', { align: 'center' });
      return;
    }
    const cam = this.camX;
    const oy = HUD;
    // zemin + gölgeler
    gfx.rect(0, oy, gfx.W, ROWS * TS, '#388700');
    const c0 = Math.floor(cam / TS), c1 = Math.min(COLS - 1, c0 + 17);
    for (let r = 0; r < ROWS; r++) for (let c = c0; c <= c1; c++) {
      const x = c * TS - cam, y = oy + r * TS;
      const g = this.grid[r][c];
      const k = `${c},${r}`;
      if (g === 1) gfx.sprite(S.wall, x, y);
      else if (g === 2) {
        if (this.burning.has(k)) gfx.sprite(S.burn[Math.min(2, Math.floor((30 - this.burning.get(k)) / 10))], x, y);
        else gfx.sprite(S.soft, x, y);
      } else {
        if (this.grid[r - 1]?.[c]) gfx.rect(x, y, TS, 3, '#005800');
        if (this.grid[r][c - 1]) gfx.rect(x, y, 3, TS, '#005800');
        if (this.door.shown && this.door.c === c && this.door.r === r) {
          const open = !this.enemies.some((e) => !e.dead);
          gfx.sprite(S.door[open && Math.floor(frame / 8) % 2 ? 1 : 0], x, y);
        }
        if (this.itemShown.has(k)) {
          const it = this.items.get(k);
          gfx.rect(x, y, TS, TS, Math.floor(frame / 6) % 2 ? '#a81000' : '#d82800');
          gfx.rectb(x, y, TS, TS, '#fcfcfc');
          if (it) gfx.sprite(S.items[it], x, y + 2);
        }
      }
    }
    // bombalar
    for (const b of this.bombs) gfx.sprite(S.bomb[Math.floor(b.anim / 10) % 3], b.c * TS - cam, oy + b.r * TS);
    // alevler
    for (const f of this.flames) this.drawFlame(f, f.c * TS - cam, oy + f.r * TS);
    // düşmanlar
    for (const e of this.enemies) {
      const x = e.x - cam, y = oy + e.y;
      if (x < -16 || x > gfx.W) continue;
      if (e.dead) {
        if (e.dead < 40) gfx.sprite(Math.floor(e.dead / 4) % 2 ? S.enemyWhite[e.type] : S.enemy[e.type], x, y);
        else gfx.text(String(e.pts), x + 8, y + 4, '#fcfcfc', { align: 'center' });
        continue;
      }
      const flip = Math.floor(e.anim / 16) % 2 === 1;
      const bob = Math.floor(e.anim / 8) % 2;
      const spr = flip ? S.enemyFlip[e.type] : S.enemy[e.type];
      if (ENEMY_TYPES[e.type].wallpass) gfx.sprite(spr, x, y + bob, { alpha: 0.8 });
      else gfx.sprite(spr, x, y + bob);
    }
    // oyuncu
    const p = this.player;
    const px = p.x - cam, py = oy + p.y;
    if (this.state === 'dying') {
      const t = 110 - this.timer;
      if (t < 50) gfx.sprite(Math.floor(t / 4) % 2 ? S.playerWhite : S.playerDark, px, py);
      else if (t < 80) {
        const k = (t - 50) / 30;
        gfx.circ(px + 8, py + 8, 3 + k * 8, '#fcfcfc');
        gfx.circ(px + 8, py + 8, 2 + k * 6, '#bcbcbc');
      }
    } else if (this.state !== 'over') {
      const frames = p.dir === 'left' || p.dir === 'right' ? S.player.right : S.player[p.dir];
      const fi = p.moving ? [1, 0, 2, 0][Math.floor(p.anim / 6) % 4] : 0;
      gfx.sprite(frames[fi], px, py, { flipX: p.dir === 'left' });
    }
    for (const pp of this.popups) gfx.text(pp.text, pp.x - cam, oy + pp.y - (90 - pp.t) / 6, pp.color, { align: 'center', shadow: '#000' });

    // HUD
    gfx.rect(0, 0, gfx.W, HUD, '#bcbcbc');
    gfx.rect(0, HUD - 2, gfx.W, 2, '#7c7c7c');
    const secs = Math.ceil(this.time / 60);
    gfx.text(`SÜRE ${String(secs).padStart(3, ' ')}`, 6, 9, secs < 30 && frame % 30 < 15 ? '#d82800' : '#000');
    gfx.text(String(this.api.score).padStart(7, '0'), 128, 4, '#000', { align: 'center' });
    gfx.text(`HI ${String(Math.max(this.api.hiScore, this.api.score)).padStart(7, '0')}`, 128, 13, '#585858', { align: 'center' });
    gfx.text(`CAN ${Math.max(0, this.lives - 1)}`, 250, 4, '#000', { align: 'right' });
    gfx.text(`AŞ ${this.stage}`, 250, 13, '#000', { align: 'right' });
    // güç göstergesi
    gfx.sprite(S.bomb[0], 62, 4);
    gfx.text(String(this.power.bombs), 78, 9, '#000');
    gfx.sprite(S.items.ates, 180, 6);
    gfx.text(String(this.power.fire), 194, 9, '#000');
    if (this.power.remote) gfx.text('K', 204, 9, '#0058f8');
    if (this.power.speed) gfx.text('H', 212, 9, '#0058f8');

    if (this.state === 'clear') gfx.text('AŞAMA TAMAM!', gfx.W / 2, oy + 90, '#fcd800', { align: 'center', scale: 2, shadow: '#000' });
    if (this.state === 'over') gfx.text('OYUN BİTTİ', gfx.W / 2, oy + 90, '#fcfcfc', { align: 'center', scale: 2, shadow: '#000' });
    if (this.timeUp && this.time === 0 && frame % 60 < 40 && this.state === 'play') gfx.text('SÜRE DOLDU!', gfx.W / 2, oy + 4, '#fcd800', { align: 'center', shadow: '#000' });
  }

  drawFlame(f, x, y) {
    const { gfx } = this.api;
    const age = f.life - f.t;
    const ph = Math.min(age, f.t);
    const k = ph < 4 ? 1 : ph < 8 ? 2 : 3;
    const layers = [[7 + k * 2, '#f83800'], [4 + k * 2, '#fca044'], [k * 2, '#fcfcfc']];
    for (const [w0, col] of layers) {
      const w = Math.min(16, w0);
      const o = Math.floor((16 - w) / 2);
      const kind = f.kind;
      if (kind === 'center') {
        gfx.rect(x, y + o, 16, w, col);
        gfx.rect(x + o, y, w, 16, col);
      } else if (kind === 'h') gfx.rect(x, y + o, 16, w, col);
      else if (kind === 'v') gfx.rect(x + o, y, w, 16, col);
      else if (kind === 'end-left') { gfx.rect(x + 3, y + o, 13, w, col); gfx.rect(x + 1, y + o + 1, 2, Math.max(0, w - 2), col); }
      else if (kind === 'end-right') { gfx.rect(x, y + o, 13, w, col); gfx.rect(x + 13, y + o + 1, 2, Math.max(0, w - 2), col); }
      else if (kind === 'end-up') { gfx.rect(x + o, y + 3, w, 13, col); gfx.rect(x + o + 1, y + 1, Math.max(0, w - 2), 2, col); }
      else if (kind === 'end-down') { gfx.rect(x + o, y, w, 13, col); gfx.rect(x + o + 1, y + 13, Math.max(0, w - 2), 2, col); }
    }
  }
}
