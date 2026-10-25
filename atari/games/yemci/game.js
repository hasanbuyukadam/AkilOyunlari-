// Yemci — Pac-Man tarzı labirent oyunu.
// 28x31 karolu labirent (8 px karo), 4 güç hapı, dört farklı kovalama zekâsına sahip hayalet,
// dağıl/kovala zamanlayıcısı, korkmuş (mavi) mod, gözlerin eve dönüşü, tünel ve meyve bonusu.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'yemci',
  width: 224,
  height: 288,
  buttons: {},
  help: [
    'Ok tuşlarıyla labirentte yönlen; dönüşü önceden basılı tutabilirsin.',
    'Yem 10, güç hapı 50 puan. Güç hapından sonra mavi hayaletleri ye: 200-400-800-1600.',
    'Yan tünelden geçip öbür taraftan çıkabilirsin. Meyveler bonus puan verir.',
    '10000 puanda ek can. Her seviyede hayaletler hızlanır, mavi süre kısalır.',
  ],
};

const T = 8;
const COLS = 28;
const ROWS = 31;
const OY = 24; // labirentin ekrandaki dikey kayması
const MAZE = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '     #.##### ## #####.#     ',
  '     #.##          ##.#     ',
  '     #.## ###--### ##.#     ',
  '######.## #      # ##.######',
  '      .   #      #   .      ',
  '######.## #      # ##.######',
  '     #.## ######## ##.#     ',
  '     #.##          ##.#     ',
  '     #.## ######## ##.#     ',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

const DIRS = { up: [0, -1], left: [-1, 0], down: [0, 1], right: [1, 0] };
const ORDER = ['up', 'left', 'down', 'right'];
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const mod = (a, n) => ((a % n) + n) % n;

function tileAt(c, r) {
  if (r < 0 || r >= ROWS) return '#';
  if (c < 0 || c >= COLS) return r === 14 ? ' ' : '#';
  return MAZE[r][c];
}
const walkable = (c, r) => { const ch = tileAt(c, r); return ch !== '#' && ch !== '-'; };
// Kırmızı bölgeler: hayaletler (kovala/dağıl modunda) buradan yukarı dönemez
const NO_UP = new Set(['12,11', '15,11', '12,23', '15,23']);

// ---------- Labirent duvarı ön çizimi ----------
// Açık karoları (oyuncunun gidebildiği yerler + hayalet evi) taşkın dolgusuyla bulur,
// duvar piksellerinden açık alana uzaklığa göre yuvarlak köşeli çizgiler çizer.
let MAZE_CANVAS = null;
function buildMaze() {
  const open = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const stack = [[13, 23]];
  while (stack.length) {
    const [c, r] = stack.pop();
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS || open[r][c] || MAZE[r][c] === '#') continue;
    open[r][c] = true;
    stack.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  // dış duvar: kenara bağlı duvar karoları
  const outer = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const st2 = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if ((r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) && !open[r][c]) st2.push([c, r]);
  }
  while (st2.length) {
    const [c, r] = st2.pop();
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS || outer[r][c] || open[r][c]) continue;
    outer[r][c] = true;
    st2.push([c + 1, r], [c - 1, r], [c, r + 1], [c, r - 1]);
  }
  const W = COLS * T, H = ROWS * T;
  const isOpenPx = (x, y) => {
    const c = Math.floor(x / T), r = Math.floor(y / T);
    if (r < 0 || r >= ROWS) return false;
    if (c < 0 || c >= COLS) return r === 14;
    return open[r][c];
  };
  const openMap = new Uint8Array((W + 32) * (H + 32));
  for (let y = -16; y < H + 16; y++) for (let x = -16; x < W + 16; x++) openMap[(y + 16) * (W + 32) + x + 16] = isOpenPx(x, y) ? 1 : 0;
  const make = (color) => {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = color;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (openMap[(y + 16) * (W + 32) + x + 16]) continue;
      let best = 99;
      for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
        if (openMap[(y + dy + 16) * (W + 32) + x + dx + 16]) {
          const d = dx * dx + dy * dy;
          if (d < best) best = d;
        }
      }
      const d = Math.sqrt(best);
      const c = Math.floor(x / T), r = Math.floor(y / T);
      const house = r >= 12 && r <= 16 && c >= 10 && c <= 17;
      let on = false;
      if (house) on = d >= 2.5 && d < 3.5;
      else {
        on = d >= 3.5 && d < 4.5;
        if (outer[r][c] && d >= 6.5 && d < 7.5) on = true;
      }
      if (on) ctx.fillRect(x, y, 1, 1);
    }
    // hayalet evi kapısı
    ctx.fillStyle = '#ffb8de';
    ctx.fillRect(13 * T, 12 * T + 3, 2 * T, 2);
    return cv;
  };
  MAZE_CANVAS = { blue: make('#2121de'), white: make('#dedeff') };
}

// ---------- Sprite üretimi ----------
const PAC_PAL = { Y: '#ffff00' };
function pacRows(dirAngle, half) {
  const rows = [];
  for (let j = 0; j < 13; j++) {
    let s = '';
    for (let i = 0; i < 13; i++) {
      const dx = i - 6, dy = j - 6;
      let inside = dx * dx + dy * dy <= 42;
      if (inside && half > 0 && (dx || dy)) {
        let a = Math.atan2(dy, dx) - dirAngle;
        a = Math.atan2(Math.sin(a), Math.cos(a));
        if (Math.abs(a) < half) inside = false;
      }
      if (inside && half > 0 && !dx && !dy && half > 0.3) inside = true;
      s += inside ? 'Y' : '.';
    }
    rows.push(s);
  }
  return rows;
}
const ANG = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
let PAC = null; // PAC[dir][frame]
let PAC_DEATH = null;
let GHOST = null;
let FRUIT_SPR = null;

const GHOST_BODY = [
  [
    '.....####.....',
    '...########...',
    '..##########..',
    '.############.',
    '.############.',
    '.############.',
    '##############',
    '##############',
    '##############',
    '##############',
    '##############',
    '##############',
    '##.###..###.##',
    '#...##..##...#',
  ],
  [
    '.....####.....',
    '...########...',
    '..##########..',
    '.############.',
    '.############.',
    '.############.',
    '##############',
    '##############',
    '##############',
    '##############',
    '##############',
    '##############',
    '####.####.####',
    '.##...##...##.',
  ],
];
const EYE_POS = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
function eyeRows(dir) {
  const rows = Array.from({ length: 14 }, () => new Array(14).fill('.'));
  const [ox, oy] = EYE_POS[dir];
  const white = ['.##.', '####', '####', '####', '.##.'];
  for (const ex of [2, 8]) {
    const bx = ex + ox, by = 3 + oy;
    white.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') rows[by + y][bx + x] = 'W'; }));
    const px = bx + 1 + ox, py = by + 2 + oy;
    rows[py][px] = 'B'; rows[py][px + 1] = 'B'; rows[py + 1][px] = 'B'; rows[py + 1][px + 1] = 'B';
  }
  return rows.map((r) => r.join(''));
}
const SCARED_FACE = [
  '..............',
  '..............',
  '..............',
  '..............',
  '..............',
  '....##..##....',
  '....##..##....',
  '..............',
  '..............',
  '..##..##..##..',
  '.#..##..##..#.',
  '..............',
  '..............',
  '..............',
];

const FRUIT_ROWS = {
  cherry: ['.........GG.', '.......GGG..', '......G..G..', '.....G...G..', '..RRG...G...', '.RRRRR.RRR..', 'RWRRRRRRRRR.', 'RWRRRRWRRRRR', 'RRRRRRWRRRRR', '.RRRRRRRRRRR', '..RRR.RRRRR.', '.......RRR..'],
  straw: ['....GGGG....', '..GGGGGGGG..', '.RRRGGGGRRR.', 'RRWRRRRRRWRR', 'RRRRRWRRRRRR', 'RWRRRRRRWRRR', 'RRRRWRRRRRWR', '.RRRRRRWRRR.', '.RWRRRRRRR..', '..RRRWRRRR..', '...RRRRRR...', '.....RR.....'],
  orange: ['.....B......', '.....BGG....', '...OOBOGG...', '.OOOOOOOOO..', 'OOOOOOOOOOO.', 'OWOOOOOOOOO.', 'OWOOOOOOOOO.', 'OOOOOOOOOOO.', 'OOOOOOOOOOO.', '.OOOOOOOOO..', '..OOOOOOO...', '....OOO.....'],
  apple: ['.....B......', '.....B.GG...', '..RRRBRGGR..', '.RRRRRRRRRR.', 'RRWRRRRRRRRR', 'RWRRRRRRRRRR', 'RWRRRRRRRRRR', 'RRRRRRRRRRRR', 'RRRRRRRRRRRR', '.RRRRRRRRRR.', '..RRRRRRRR..', '...RR..RR...'],
  grape: ['.....GG.....', '....G.......', '..PPLPPLP...', '.PLPPLPPLPP.', '.PPLPPLPPLP.', '..PLPPLPPL..', '..PPLPPLPP..', '...PLPPLP...', '...PPLPPL...', '....PLPP....', '.....PP.....', '............'],
  star: ['.....YY.....', '.....YY.....', '....YYYY....', 'YYYYYOOYYYYY', '.YYYYOOYYYY.', '..YYYYYYYY..', '...YYYYYY...', '...YYYYYY...', '..YYY..YYY..', '..YY....YY..', '.YY......YY.', '............'],
  bell: ['.....YY.....', '....YYYY....', '...YYWYYY...', '...YWYYYY...', '..YYWYYYYY..', '..YWYYYYYY..', '..YWYYYYYY..', '.YYYYYYYYYY.', 'YYYYYYYYYYYY', 'YYYYYYYYYYYY', '.....CC.....', '.....CC.....'],
  key: ['...CCCCCC...', '..CC....CC..', '..CC....CC..', '...CCCCCC...', '.....WW.....', '.....WWW....', '.....WW.....', '.....WWWW...', '.....WW.....', '.....WWW....', '.....WW.....', '......W.....'],
};
const FRUIT_PAL = { R: '#ff0000', W: '#ffffff', G: '#00c000', B: '#a05000', O: '#ffa000', P: '#a040ff', L: '#e0a0ff', Y: '#ffe000', C: '#00e0ff' };
const FRUIT_TABLE = [
  ['cherry', 100], ['straw', 300], ['orange', 500], ['orange', 500], ['apple', 700], ['apple', 700],
  ['grape', 1000], ['grape', 1000], ['star', 2000], ['star', 2000], ['bell', 3000], ['bell', 3000], ['key', 5000],
];
const fruitFor = (L) => FRUIT_TABLE[Math.min(L - 1, FRUIT_TABLE.length - 1)];

function buildSprites() {
  if (PAC) return;
  buildMaze();
  PAC = {};
  for (const d of ORDER) {
    PAC[d] = [0, 0.38, 0.8].map((h) => makeSprite(pacRows(ANG[d], h), PAC_PAL));
  }
  PAC_DEATH = [];
  for (let i = 0; i < 11; i++) PAC_DEATH.push(makeSprite(pacRows(-Math.PI / 2, 0.25 + (i / 10) * (Math.PI - 0.25)), PAC_PAL));
  const colors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852'];
  GHOST = { body: [], eyes: {}, scared: [], flash: [] };
  colors.forEach((col, gi) => { GHOST.body[gi] = GHOST_BODY.map((rows) => makeSprite(rows, { '#': col })); });
  for (const d of ORDER) GHOST.eyes[d] = makeSprite(eyeRows(d), { W: '#ffffff', B: '#2121ff' });
  GHOST.scared = GHOST_BODY.map((rows) => makeSprite(rows, { '#': '#2121ff' }));
  GHOST.flash = GHOST_BODY.map((rows) => makeSprite(rows, { '#': '#dedeff' }));
  GHOST.face = makeSprite(SCARED_FACE, { '#': '#ffb8ae' });
  GHOST.faceFlash = makeSprite(SCARED_FACE, { '#': '#ff0000' });
  FRUIT_SPR = {};
  for (const [k, rows] of Object.entries(FRUIT_ROWS)) FRUIT_SPR[k] = makeSprite(rows, FRUIT_PAL);
}

// ---------- Seviye parametreleri ----------
function params(L) {
  const s = 1.25; // %100 hız = 1.25 px/kare
  const lv = (a, b, c) => (L === 1 ? a : L < 5 ? b : c);
  const frightSec = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1][L - 1] ?? 1;
  return {
    pac: lv(0.8, 0.9, 1.0) * s,
    pacF: lv(0.9, 0.95, 1.0) * s,
    ghost: Math.min(1.05, lv(0.75, 0.85, 0.95) + Math.max(0, L - 5) * 0.01) * s,
    ghostF: lv(0.5, 0.55, 0.6) * s,
    tunnel: lv(0.4, 0.45, 0.5) * s,
    fright: frightSec * 60,
    elroy: L === 1 ? 20 : L === 2 ? 30 : L < 5 ? 40 : L < 8 ? 50 : L < 11 ? 60 : 80,
    modes: (L === 1 ? [7, 20, 7, 20, 5, 20, 5] : L < 5 ? [7, 20, 7, 20, 5, 1033, 1 / 60] : [5, 20, 5, 20, 5, 1037, 1 / 60]).map((x) => Math.round(x * 60)),
    limits: L === 1 ? [0, 0, 30, 60] : L === 2 ? [0, 0, 0, 50] : [0, 0, 0, 0],
    idle: L < 5 ? 240 : 180,
  };
}

const SCATTER = [[25, -3], [2, -3], [27, 31], [0, 31]];
const HOUSE_X = [112, 112, 96, 128];

export default class Yemci {
  constructor(api) {
    this.api = api;
    buildSprites();
    this.level = 1;
    this.lives = 3;
    this.extraGiven = false;
    this.popups = [];
    this.fruitsShown = [];
    this.startLevel(true);
  }

  startLevel(first) {
    this.dots = MAZE.map((row) => [...row].map((ch) => (ch === '.' ? 1 : ch === 'o' ? 2 : 0)));
    this.dotsLeft = 0;
    for (const row of this.dots) for (const v of row) if (v) this.dotsLeft++;
    this.dotsEaten = 0;
    this.p = params(this.level);
    this.fruit = null;
    this.fruitCount = 0;
    this.useGlobal = false;
    this.ghostDots = [0, 0, 0, 0];
    this.resetActors();
    this.state = 'ready';
    this.timer = this.api.preview ? 0 : first ? 150 : 110;
    if (!this.api.preview) {
      if (first) this.api.sfx.seq([['C5', 0.12], ['C6', 0.12], ['G5', 0.12], ['E5', 0.12], ['C6', 0.06], ['G5', 0.18], ['E5', 0.24],
        ['Db5', 0.12], ['Db6', 0.12], ['Ab5', 0.12], ['F5', 0.12], ['Db6', 0.06], ['Ab5', 0.18], ['F5', 0.24],
        ['C5', 0.12], ['C6', 0.12], ['G5', 0.12], ['E5', 0.12], ['C6', 0.06], ['G5', 0.18], ['E5', 0.24],
        ['E5', 0.06], ['F5', 0.06], ['G5', 0.12], ['G5', 0.06], ['A5', 0.06], ['B5', 0.12], ['C6', 0.24]], { vol: 0.07 });
    }
  }

  resetActors() {
    this.pac = { x: 112, y: 23 * T + 4, dir: 'left', want: 'left', acc: 0, anim: 0, pause: 0, moving: true };
    this.ghosts = [0, 1, 2, 3].map((i) => ({
      i,
      x: i === 0 ? 112 : HOUSE_X[i],
      y: i === 0 ? 11 * T + 4 : 14 * T + 4,
      dir: i === 0 ? 'left' : i === 2 ? 'up' : 'down',
      state: i === 0 ? 'active' : 'house',
      fright: false,
      acc: 0,
      rev: false,
      anim: 0,
    }));
    this.modeIdx = 0;
    this.modeT = 0;
    this.frightT = 0;
    this.eatCount = 0;
    this.idle = 0;
    this.freeze = 0;
    this.sirenT = 0;
  }

  get chase() { return this.modeIdx % 2 === 1; }

  // ---------- Güncelleme ----------
  update() {
    const { api } = this;
    this.popups = this.popups.filter((p) => --p.t > 0);
    switch (this.state) {
      case 'ready':
        if (--this.timer <= 0) this.state = 'play';
        return;
      case 'dying':
        this.timer++;
        if (this.timer === 50) api.sfx.play('die');
        if (this.timer >= 170) {
          this.lives--;
          if (this.lives <= 0) {
            this.state = 'over';
            api.sfx.play('gameover');
            api.gameOver();
            return;
          }
          this.resetActors();
          this.useGlobal = true;
          this.globalDots = 0;
          this.fruit = null;
          this.state = 'ready';
          this.timer = api.preview ? 0 : 110;
        }
        return;
      case 'clear':
        if (--this.timer <= 0) {
          this.level++;
          this.startLevel(false);
        }
        return;
      case 'over':
        return;
      default:
        break;
    }

    if (this.freeze > 0) {
      this.freeze--;
      for (const g of this.ghosts) if (g !== this.frozenGhost && (g.state === 'eyes' || g.state === 'enter')) this.moveGhost(g);
      if (this.freeze === 0) this.frozenGhost = null;
      return;
    }

    this.readInput();
    this.tickModes();
    this.movePac();
    for (const g of this.ghosts) this.moveGhost(g);
    this.checkCollisions();
    this.releaseCheck();
    this.tickFruit();
    this.sounds();

    if (this.dotsLeft === 0 && this.state === 'play') {
      this.state = 'clear';
      this.timer = 150;
      api.sfx.play('levelup');
    }
  }

  readInput() {
    const { input, preview } = this.api;
    if (preview) { const d = this.autopilot(); if (d) this.pac.want = d; return; }
    let w = null;
    for (const d of ORDER) if (input.pressed(d)) w = d;
    if (!w) for (const d of ORDER) if (input.held(d)) { w = d; break; }
    if (w) this.pac.want = w;
  }

  tickModes() {
    if (this.frightT > 0) {
      if (--this.frightT === 0) {
        for (const g of this.ghosts) g.fright = false;
      }
      return; // korkmuş modda dağıl/kovala sayacı durur
    }
    const modes = this.p.modes;
    if (this.modeIdx < modes.length && ++this.modeT >= modes[this.modeIdx]) {
      this.modeIdx++;
      this.modeT = 0;
      for (const g of this.ghosts) if (g.state === 'active') g.rev = true;
    }
  }

  // ---- Yemci hareketi ----
  movePac() {
    const pc = this.pac;
    if (pc.pause > 0) { pc.pause--; return; }
    const speed = this.frightT > 0 ? this.p.pacF : this.p.pac;
    pc.acc += speed;
    while (pc.acc >= 1) {
      pc.acc -= 1;
      this.stepPac();
    }
  }

  stepPac() {
    const pc = this.pac;
    if (pc.want === OPP[pc.dir]) pc.dir = pc.want;
    const atC = mod(pc.x, T) === 4 && mod(pc.y, T) === 4;
    if (atC) {
      const c = Math.floor(pc.x / T), r = Math.floor(pc.y / T);
      const [wx, wy] = DIRS[pc.want];
      if (walkable(c + wx, r + wy)) pc.dir = pc.want;
      const [dx, dy] = DIRS[pc.dir];
      if (!walkable(c + dx, r + dy)) { pc.moving = false; return; }
      this.eatAt(c, r);
    }
    const [dx, dy] = DIRS[pc.dir];
    pc.x += dx; pc.y += dy;
    pc.moving = true;
    pc.anim++;
    this.wrap(pc);
    if (mod(pc.x, T) === 4 && mod(pc.y, T) === 4) this.eatAt(Math.floor(pc.x / T), Math.floor(pc.y / T));
  }

  wrap(e) {
    if (e.x < -8) e.x += 240;
    else if (e.x > 231) e.x -= 240;
  }

  eatAt(c, r) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const v = this.dots[r][c];
    if (!v) return;
    const { api } = this;
    this.dots[r][c] = 0;
    this.dotsLeft--;
    this.dotsEaten++;
    this.idle = 0;
    if (this.useGlobal) this.globalDots++;
    else {
      const g = this.ghosts.find((gh) => gh.state === 'house');
      if (g) this.ghostDots[g.i]++;
    }
    this.waka = !this.waka;
    if (!api.preview) api.sfx.tone(this.waka ? 260 : 420, 0.07, { slide: this.waka ? 420 : 260, type: 'triangle', vol: 0.12 });
    if (v === 1) {
      this.addScore(10);
      this.pac.pause = 1;
    } else {
      this.addScore(50);
      this.pac.pause = 3;
      this.frighten();
    }
    if (this.dotsEaten === 70 || this.dotsEaten === 170) {
      const [kind, pts] = fruitFor(this.level);
      this.fruit = { kind, pts, t: 560 + Math.floor(Math.random() * 60) };
    }
  }

  addScore(n) {
    this.api.addScore(n);
    if (!this.extraGiven && this.api.score >= 10000) {
      this.extraGiven = true;
      this.lives++;
      this.api.sfx.play('coin');
    }
  }

  frighten() {
    this.eatCount = 0;
    this.frightT = this.p.fright;
    for (const g of this.ghosts) {
      if (g.state === 'eyes' || g.state === 'enter') continue;
      g.fright = true;
      if (g.state === 'active') g.rev = true;
    }
    this.api.sfx.play('power');
  }

  // ---- Hayalet hareketi ----
  ghostSpeed(g) {
    const { p } = this;
    if (g.state === 'eyes' || g.state === 'enter') return 2;
    if (g.state === 'house' || g.state === 'leave') return 0.6;
    const r = Math.floor(g.y / T), c = Math.floor(g.x / T);
    if (r === 14 && (c <= 5 || c >= 22)) return p.tunnel;
    if (g.fright) return p.ghostF;
    if (g.i === 0) {
      if (this.dotsLeft <= p.elroy / 2) return p.ghost + 0.125;
      if (this.dotsLeft <= p.elroy) return p.ghost + 0.0625;
    }
    return p.ghost;
  }

  moveGhost(g) {
    g.acc += this.ghostSpeed(g);
    g.anim++;
    while (g.acc >= 1) {
      g.acc -= 1;
      this.stepGhost(g);
    }
  }

  stepGhost(g) {
    switch (g.state) {
      case 'house':
        if (g.y <= 14 * T + 4 - 4) g.dir = 'down';
        else if (g.y >= 14 * T + 4 + 4) g.dir = 'up';
        g.y += g.dir === 'up' ? -1 : 1;
        return;
      case 'leave':
        if (g.x !== 112) g.x += g.x < 112 ? 1 : -1;
        else if (g.y > 11 * T + 4) { g.y--; g.dir = 'up'; } else {
          g.state = 'active';
          g.dir = 'left';
          g.rev = false;
        }
        return;
      case 'enter':
        if (g.y < 11 * T + 4) { g.y++; return; }
        if (g.x !== 112) { g.x += g.x < 112 ? 1 : -1; return; }
        if (g.y < 14 * T + 4) { g.y++; g.dir = 'down'; return; }
        g.state = 'leave';
        g.fright = false;
        return;
      default:
        break;
    }
    // active veya eyes
    if (g.rev && g.state === 'active') { g.dir = OPP[g.dir]; g.rev = false; }
    if (mod(g.x, T) === 4 && mod(g.y, T) === 4) {
      const c = Math.floor(g.x / T), r = Math.floor(g.y / T);
      if (g.state === 'eyes' && r === 11 && (c === 13 || c === 14)) {
        g.state = 'enter';
        return;
      }
      g.dir = this.chooseDir(g, c, r);
    }
    const [dx, dy] = DIRS[g.dir];
    g.x += dx; g.y += dy;
    this.wrap(g);
  }

  target(g) {
    const pc = this.pac;
    const pcT = [Math.floor(pc.x / T), Math.floor(pc.y / T)];
    if (g.state === 'eyes') return [13, 11];
    const elroy = g.i === 0 && this.dotsLeft <= this.p.elroy;
    if (!this.chase && !elroy) return SCATTER[g.i];
    const [dx, dy] = DIRS[pc.dir];
    switch (g.i) {
      case 0: return pcT;
      case 1: return [pcT[0] + dx * 4 - (pc.dir === 'up' ? 4 : 0), pcT[1] + dy * 4];
      case 2: {
        const piv = [pcT[0] + dx * 2 - (pc.dir === 'up' ? 2 : 0), pcT[1] + dy * 2];
        const b = this.ghosts[0];
        const bt = [Math.floor(b.x / T), Math.floor(b.y / T)];
        return [piv[0] * 2 - bt[0], piv[1] * 2 - bt[1]];
      }
      default: {
        const gx = Math.floor(g.x / T), gy = Math.floor(g.y / T);
        const d2 = (gx - pcT[0]) ** 2 + (gy - pcT[1]) ** 2;
        return d2 > 64 ? pcT : SCATTER[3];
      }
    }
  }

  chooseDir(g, c, r) {
    const opts = ORDER.filter((d) => {
      if (d === OPP[g.dir]) return false;
      const [dx, dy] = DIRS[d];
      if (!walkable(c + dx, r + dy)) return false;
      if (d === 'up' && !g.fright && g.state === 'active' && NO_UP.has(`${c},${r}`)) return false;
      return true;
    });
    if (!opts.length) return OPP[g.dir];
    if (g.fright && g.state === 'active') return opts[Math.floor(Math.random() * opts.length)];
    const [tx, ty] = this.target(g);
    let best = opts[0], bd = Infinity;
    for (const d of opts) {
      const [dx, dy] = DIRS[d];
      const dd = (c + dx - tx) ** 2 + (r + dy - ty) ** 2;
      if (dd < bd) { bd = dd; best = d; }
    }
    return best;
  }

  releaseCheck() {
    this.idle++;
    const g = [1, 2, 3].map((i) => this.ghosts[i]).find((gh) => gh.state === 'house');
    if (!g) { this.useGlobal = false; return; }
    let go = false;
    if (this.useGlobal) go = this.globalDots >= [0, 7, 17, 32][g.i];
    else go = this.ghostDots[g.i] >= this.p.limits[g.i];
    if (this.idle >= this.p.idle) { go = true; this.idle = 0; }
    if (go) g.state = 'leave';
  }

  checkCollisions() {
    const pc = this.pac;
    const pt = [Math.floor(pc.x / T), Math.floor(pc.y / T)];
    for (const g of this.ghosts) {
      if (g.state === 'eyes' || g.state === 'enter' || g.state === 'house' || g.state === 'leave') continue;
      const same = Math.floor(g.x / T) === pt[0] && Math.floor(g.y / T) === pt[1];
      if (!same) continue;
      if (g.fright) {
        const pts = 200 * 2 ** Math.min(3, this.eatCount);
        this.eatCount++;
        this.addScore(pts);
        this.popups.push({ x: g.x, y: g.y, text: String(pts), t: 60, color: '#00ffff' });
        g.state = 'eyes';
        g.fright = false;
        this.frozenGhost = g;
        this.freeze = 60;
        this.api.sfx.tone(200, 0.4, { slide: 1600, type: 'square', vol: 0.12 });
        return;
      }
      // yakalandı
      this.state = 'dying';
      this.timer = 0;
      return;
    }
  }

  tickFruit() {
    if (this.fruit && --this.fruit.t <= 0) this.fruit = null;
    if (this.fruit) {
      const pc = this.pac;
      if (Math.floor(pc.y / T) === 17 && Math.abs(pc.x - 112) < 6) {
        this.addScore(this.fruit.pts);
        this.popups.push({ x: 112, y: 17 * T + 4, text: String(this.fruit.pts), t: 120, color: '#ffb8ff' });
        this.api.sfx.play('pickup');
        this.fruit = null;
      }
    }
  }

  sounds() {
    const { sfx, preview } = this.api;
    if (preview) return;
    this.sirenT++;
    if (this.ghosts.some((g) => g.state === 'eyes')) {
      if (this.sirenT % 8 === 0) sfx.tone(1400, 0.08, { slide: 700, type: 'sawtooth', vol: 0.03 });
    } else if (this.frightT > 0) {
      if (this.sirenT % 14 === 0) sfx.tone(160, 0.12, { slide: 420, type: 'square', vol: 0.03 });
    } else if (this.sirenT % 26 === 0) {
      const base = 380 + Math.min(240, (244 - this.dotsLeft));
      sfx.tone(base, 0.2, { slide: base * 1.5, type: 'sine', vol: 0.035 });
    }
  }

  // Önizleme otopilotu: hayaletlerden uzak en yakın yeme BFS ile git.
  autopilot() {
    const pc = this.pac;
    if (!(mod(pc.x, T) === 4 && mod(pc.y, T) === 4)) return null;
    const sc = Math.floor(pc.x / T), sr = Math.floor(pc.y / T);
    const danger = new Set();
    for (const g of this.ghosts) {
      if (g.fright || g.state !== 'active') continue;
      const gc = Math.floor(g.x / T), gr = Math.floor(g.y / T);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2) danger.add(`${gc + dx},${gr + dy}`);
    }
    const seen = new Set([`${sc},${sr}`]);
    const q = [];
    for (const d of ORDER) {
      const [dx, dy] = DIRS[d];
      const c = mod(sc + dx, COLS), r = sr + dy;
      if (!walkable(c, r) || danger.has(`${c},${r}`)) continue;
      seen.add(`${c},${r}`);
      q.push([c, r, d]);
    }
    for (let i = 0; i < q.length; i++) {
      const [c, r, d] = q[i];
      if (this.dots[r]?.[c]) return d;
      for (const dd of ORDER) {
        const [dx, dy] = DIRS[dd];
        const nc = mod(c + dx, COLS), nr = r + dy;
        const k = `${nc},${nr}`;
        if (seen.has(k) || !walkable(nc, nr) || danger.has(k)) continue;
        seen.add(k);
        q.push([nc, nr, d]);
      }
    }
    return q.length ? q[0][2] : null;
  }

  // ---------- Çizim ----------
  draw() {
    const { gfx, frame } = this.api;
    gfx.cls('#000');
    const flashWhite = this.state === 'clear' && this.timer < 110 && Math.floor(this.timer / 14) % 2 === 0;
    gfx.sprite(flashWhite ? MAZE_CANVAS.white : MAZE_CANVAS.blue, 0, OY);

    // yemler
    const blinkOn = this.state !== 'play' || Math.floor(frame / 10) % 2 === 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const v = this.dots[r][c];
      if (v === 1) gfx.rect(c * T + 3, OY + r * T + 3, 2, 2, '#ffb8ae');
      else if (v === 2 && blinkOn) gfx.circ(c * T + 4, OY + r * T + 4, 3, '#ffb8ae');
    }
    if (this.fruit) gfx.sprite(FRUIT_SPR[this.fruit.kind], 112 - 6, OY + 17 * T + 4 - 6);

    const hideGhosts = (this.state === 'dying' && this.timer >= 45) || this.state === 'clear';
    // Yemci
    const pc = this.pac;
    if (this.state === 'dying' && this.timer >= 45) {
      const f = Math.floor((this.timer - 50) / 7);
      if (f < 0) gfx.sprite(PAC.up[0], pc.x - 6, OY + pc.y - 6);
      else if (f < 11) gfx.sprite(PAC_DEATH[f], pc.x - 6, OY + pc.y - 6);
      else if (f < 14) {
        const rr = 2 + (f - 11) * 2;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          gfx.line(pc.x + Math.cos(a) * rr, OY + pc.y + Math.sin(a) * rr, pc.x + Math.cos(a) * (rr + 2), OY + pc.y + Math.sin(a) * (rr + 2), '#ffff00');
        }
      }
    } else if (!(this.freeze > 0)) {
      let fr = 0;
      if (this.state === 'play' || this.state === 'ready') {
        if (this.state === 'ready' && this.timer > 0) fr = 0;
        else { const k = Math.floor(pc.anim / 2) % 4; fr = [2, 1, 0, 1][k]; }
        if (!pc.moving) fr = 1;
      }
      gfx.sprite(PAC[pc.dir][fr], pc.x - 6, OY + pc.y - 6);
    }

    if (!hideGhosts) {
      for (const g of this.ghosts) {
        if (this.freeze > 0 && g === this.frozenGhost) continue;
        const gx = g.x - 7, gy = OY + g.y - 7;
        const af = Math.floor(g.anim / 8) % 2;
        if (g.state === 'eyes' || g.state === 'enter') {
          gfx.sprite(GHOST.eyes[g.dir], gx, gy);
        } else if (g.fright) {
          const flashing = this.frightT < 140 && Math.floor(this.frightT / 14) % 2 === 0;
          gfx.sprite(flashing ? GHOST.flash[af] : GHOST.scared[af], gx, gy);
          gfx.sprite(flashing ? GHOST.faceFlash : GHOST.face, gx, gy);
        } else {
          gfx.sprite(GHOST.body[g.i][af], gx, gy);
          gfx.sprite(GHOST.eyes[g.dir], gx, gy);
        }
      }
    }
    for (const p of this.popups) gfx.text(p.text, p.x, OY + p.y - 3, p.color, { align: 'center' });

    // tünel kenarlarını kapat
    if (this.state === 'ready') {
      gfx.text('HAZIR!', 112, OY + 17 * T + 1, '#ffff00', { align: 'center' });
      if (this.level > 1 || this.timer > 110) gfx.text(`SEVİYE ${this.level}`, 112, OY + 11 * T + 1, '#00ffff', { align: 'center' });
    }
    if (this.state === 'over') gfx.text('OYUN BİTTİ', 112, OY + 17 * T + 1, '#ff0000', { align: 'center' });

    // HUD
    const { score, hiScore } = this.api;
    if (Math.floor(frame / 16) % 2 === 0 || this.state !== 'play') gfx.text('1UP', 24, 2, '#fff');
    gfx.text('EN YÜKSEK', 112, 2, '#fff', { align: 'center' });
    gfx.text(String(score).padStart(2, '0'), 54, 12, '#fff', { align: 'right' });
    gfx.text(String(Math.max(hiScore, score)).padStart(2, '0'), 136, 12, '#fff', { align: 'right' });
    gfx.text(`SV ${this.level}`, 218, 12, '#ffb852', { align: 'right' });
    const lifeN = Math.max(0, this.lives - 1);
    for (let i = 0; i < Math.min(5, lifeN); i++) gfx.sprite(PAC.left[1], 16 + i * 16, 274);
    // son seviyelerin meyveleri
    const startL = Math.max(1, this.level - 6);
    for (let L = this.level, k = 0; L >= startL; L--, k++) gfx.sprite(FRUIT_SPR[fruitFor(L)[0]], 200 - k * 15, 274);
  }
}
