// Tank 90 — Tank 1990 / Battle City tarzı. 13x13 bloklu alan (16 px blok, 4 px'lik tuğla parçaları),
// çelik, su, ağaç, buz; kartal karargâh; 20 düşmanlık dalgalar; yanıp sönen bonus tanklar ve güçlendirmeler.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'tank-90',
  width: 256,
  height: 224,
  buttons: { a: 'ATEŞ', b: 'ATEŞ' },
  help: [
    'Oklarla tankı sür, A (veya B) ile ateş et. Tuğla kırılır, çelik kırılmaz (3 yıldızla kırılır).',
    'Kartalı koru! Kartal vurulursa ya da canın biterse oyun biter. Her aşamada 20 düşman tank var.',
    'Yanıp sönen kırmızı tankı vurunca güçlendirme çıkar: YILDIZ, BOMBA, MİĞFER, KÜREK, SAAT, TANK.',
    'Su tankları durdurur ama mermiler geçer; ağaçlar tankları gizler; buzda tank kayar.',
  ],
};

const FX = 16, FY = 8; // alanın ekrandaki yeri
const FS = 208; // alan boyutu
const MC = 52; // 4 px'lik mikro hücre sayısı (kenar)
const EMPTY = 0, BRICK = 1, STEEL = 2, WATER = 3, TREES = 4, ICE = 5;
const EAGLE = { x: 96, y: 192 };
const SPAWNS = [[96, 0], [192, 0], [0, 0]];
const PLAYER_SPAWN = [64, 192];

// ---------- Aşamalar (13x13 blok) ----------
// . boş  # tuğla  L/R/U/D yarım tuğla (sol/sağ/üst/alt)  @ çelik  l/r/u/d yarım çelik  ~ su  % ağaç  - buz
const STAGES = [
  [
    '.............',
    '.#.#.#.#.#.#.',
    '.#.#.#.#.#.#.',
    '.#.#.#@#.#.#.',
    '.#.#.#.#.#.#.',
    '.#.#.D.D.#.#.',
    'D.DD.....DD.D',
    '@.UU.#.#.UU.@',
    '.#.#.###.#.#.',
    '.#.#.#.#.#.#.',
    '.#.#.....#.#.',
    '.#.#.....#.#.',
    '.............',
  ],
  [
    '...@...@.....',
    '.#.@...#.#.#.',
    '.#.....#@#.#.',
    '.#.#..#..#@#.',
    '%..#..@..#..%',
    '%%..#..@..%%.',
    '.%%.#..#.%%.@',
    '..%%..#..%%..',
    '@.#.#.#.#.#.@',
    '.#.#.u.u.#.#.',
    '.#.#.....#.#.',
    '.#.......#.@.',
    '.............',
  ],
  [
    '.............',
    '.#.##~~~##.#.',
    '.#.#.....#.#.',
    '.#...%%%...#.',
    '~~~.%%@%%.~~~',
    '....%%%%%....',
    '.#.#.....#.#.',
    '.#.#.#~#.#.#.',
    '.....#~#.....',
    'll.#.....#.rr',
    '.#.#.###.#.#.',
    '.#.........#.',
    '.............',
  ],
  [
    '......-......',
    '.#-#-.-.-#-#.',
    '.#-#-----#-#.',
    '.---@-#-@---.',
    '..-#-----#-..',
    '%.-#-#-#-#-.%',
    '%%---------%%',
    '.#.#-#-#-#.#.',
    '.#.@-----@.#.',
    '--.#.#.#.#.--',
    '.#.#.....#.#.',
    '.#.#.....#.#.',
    '.............',
  ],
  [
    '.............',
    '.@@#.....#@@.',
    '.@...#.#...@.',
    '.#.#.#.#.#.#.',
    '...#~~.~~#...',
    '#.%#.....#%.#',
    '#%%%.@@@.%%%#',
    '#.%#.....#%.#',
    '...#~~.~~#...',
    '.#.#.#.#.#.#.',
    '.@...###...@.',
    '.@@.......@@.',
    '.............',
  ],
  [
    '..#.......#..',
    '..#.#.#.#.#..',
    '@.#.#...#.#.@',
    '..#.#@#@#.#..',
    '#...#...#...#',
    '#.#...%...#.#',
    '..#.#%%%#.#..',
    '@.#.#.%.#.#.@',
    '..#...#...#..',
    '#.#.#.#.#.#.#',
    '..#.#...#.#..',
    '..#.......#..',
    '.............',
  ],
];
// [temel, hızlı, güçlü, zırhlı]
const COMPOSITION = [[18, 2, 0, 0], [14, 4, 0, 2], [14, 4, 0, 2], [2, 5, 10, 3], [8, 5, 5, 2], [9, 2, 7, 2]];
const TYPE_NAMES = ['basic', 'fast', 'power', 'armor'];
const TYPE_INFO = {
  basic: { speed: 0.5, bullet: 2, hp: 1, pts: 100 },
  fast: { speed: 1.25, bullet: 2, hp: 1, pts: 200 },
  power: { speed: 0.75, bullet: 4, hp: 1, pts: 300 },
  armor: { speed: 0.625, bullet: 2.5, hp: 4, pts: 400 },
};

// ---------- Sprite'lar ----------
const TANKS = {
  basic: ['.......GG.......', '.......GG.......', '.......GG.......', 'TTTT...GG...TTTT', 'TttT.LLGGLD.TttT', 'TTTTLLBGGBDDTTTT', 'TttTLBBGGBBDTttT', 'TTTTLBLLLDBDTTTT', 'TttTLBLBBDBDTttT', 'TTTTLBLDDDBDTTTT', 'TttTLBBBBBBDTttT', 'TTTTLBBBBBBDTTTT', 'TttT.DDDDDD.TttT', 'TTTT........TTTT', 'TttT........TttT', 'TTTT........TTTT'],
  fast: ['.......GG.......', '.......GG.......', '.......GG.......', '.TTT...GG...TTT.', '.TtT..LGGD..TtT.', '.TTT.LBGGBD.TTT.', '.TtTLBBGGBBDTtT.', '.TTTLBLLLDBDTTT.', '.TtTLBLBBDBDTtT.', '.TTTLBLDDDBDTTT.', '.TtT.LBBBBD.TtT.', '.TTT..LBBD..TTT.', '.TtT...DD...TtT.', '.TTT........TTT.', '.TtT........TtT.', '.TTT........TTT.'],
  power: ['.......GG.......', '.......GG.......', '.......GG.......', 'TTTT...GG...TTTT', 'TttTLLLGGLLDTttT', 'TTTTLBBGGBBDTTTT', 'TttTLBLLLLDDTttT', 'TTTTLBLBBBDDTttT', 'TttTLBLBBBDDTttT', 'TTTTLBLDDDDDTTTT', 'TttTLBBBBBBDTttT', 'TTTTLBBBBBBDTTTT', 'TttTLDDDDDDDTttT', 'TTTTLDDDDDDDTTTT', 'TttT........TttT', 'TTTT........TTTT'],
  armor: ['................', '.......GG.......', '.......GG.......', 'TTTT...GG...TTTT', 'TttTLLLGGLLDTttT', 'TTTTLBBGGBBDTTTT', 'TttTLBLLLLBDTttT', 'TTTTLBLBBLBDTTTT', 'TttTLBLBBLBDTttT', 'TTTTLBLLLLBDTTTT', 'TttTLBBBBBBDTttT', 'TTTTLBBBBBBDTTTT', 'TttTLBDBDBDDTttT', 'TTTTLDDDDDDDTTTT', 'TttTLDDDDDDDTttT', 'TTTT........TTTT'],
};
const PAL = {
  player: { T: '#7c5c00', t: '#e7a539', L: '#fce4a0', B: '#e7a539', D: '#8c6c00', G: '#fce4a0' },
  enemy: { T: '#585858', t: '#bcbcbc', L: '#fcfcfc', B: '#bcbcbc', D: '#636363', G: '#fcfcfc' },
  red: { T: '#880000', t: '#fcb4b4', L: '#fcb4b4', B: '#d82800', D: '#880000', G: '#fcb4b4' },
  green: { T: '#005800', t: '#58d854', L: '#b8f8b8', B: '#00a800', D: '#005800', G: '#b8f8b8' },
  gold: { T: '#7c5c00', t: '#e7a539', L: '#fce4a0', B: '#c89000', D: '#7c5c00', G: '#fce4a0' },
};
const rot = (rows) => {
  const n = rows.length;
  const out = [];
  for (let r = 0; r < n; r++) { let s = ''; for (let c = 0; c < n; c++) s += rows[n - 1 - c][r]; out.push(s); }
  return out;
};
const swapTread = (rows) => rows.map((r) => r.replace(/[Tt]/g, (ch) => (ch === 'T' ? 't' : 'T')));

const ICONS = {
  star: ['.....WW.....', '.....WW.....', '....WWWW....', 'WWWWWWWWWWWW', '.WWWWWWWWWW.', '..WWWWWWWW..', '...WWWWWW...', '...WWWWWW...', '..WWW..WWW..', '..WW....WW..', '.WW......WW.', '............'],
  grenade: ['.....RR.....', '....W..R....', '...WWW..R...', '..WWWWW.....', '.WWKWKWW....', '.WKWKWKW....', '.WWKWKWW....', '.WKWKWKW....', '.WWKWKWW....', '..WWWWW.....', '...WWW......', '............'],
  helmet: ['............', '....WWWW....', '..WWWWWWWW..', '.WWWWWWWWWW.', '.WWWKKKKWWW.', 'WWWK....KWWW', 'WWK......KWW', 'WWK......KWW', 'WWWWWWWWWWWW', '.WWW....WWW.', '............', '............'],
  shovel: ['.........WW.', '........W..W', '.......W..W.', '......W.WW..', '.....W.W....', '....W.W.....', '..WWWW......', '.WWWWW......', '.WWWWW......', '.WWWW.......', '..W.........', '............'],
  clock: ['...WWWWWW...', '..W......W..', '.W...R....W.', 'W....R.....W', 'W....R.....W', 'W....RRRR..W', 'W..........W', 'W..........W', '.W........W.', '..W......W..', '...WWWWWW...', '............'],
  tank: ['............', '.....WW.....', '.....WW.....', '..WWWWWWWW..', 'WWWKKKKKKWWW', 'WWWKWWWWKWWW', 'WWWKWWWWKWWW', 'WWWKKKKKKWWW', 'WWW......WWW', '............', '............', '............'],
};
const POWERUPS = Object.keys(ICONS);

let S = null;
function buildSprites() {
  if (S) return;
  S = { tank: {} };
  const dirsOf = (rows) => {
    const up = rows;
    const right = rot(up);
    const down = rot(right);
    const left = rot(down);
    return { up, right, down, left };
  };
  for (const [palName, pal] of Object.entries(PAL)) {
    S.tank[palName] = {};
    for (const [tName, rows] of Object.entries(TANKS)) {
      const d = dirsOf(rows);
      const o = {};
      for (const [dir, r] of Object.entries(d)) o[dir] = [makeSprite(r, pal), makeSprite(swapTread(r), pal)];
      S.tank[palName][tName] = o;
    }
  }
  const tex = (rows, pal) => makeSprite(rows, pal);
  S.brick = tex(['OOOOOOOG', 'RRRRRRRG', 'RRRRRRRG', 'GGGGGGGG', 'OOOGOOOO', 'RRRGRRRR', 'RRRGRRRR', 'GGGGGGGG'], { O: '#e07040', R: '#9c4a00', G: '#636363' });
  S.steel = tex(['LLLLLLLD', 'LWWWWWDD', 'LWLLLLDD', 'LWLLLLDD', 'LWLLLLDD', 'LWLLLLDD', 'LDDDDDDD', 'DDDDDDDD'], { W: '#fcfcfc', L: '#bcbcbc', D: '#7c7c7c' });
  const waterRows = ['BBBBBBBB', 'BWWBBBBB', 'WBBWBBBB', 'BBBBBBBB', 'BBBBBWWB', 'BBBBWBBW', 'BBBBBBBB', 'BBBBBBBB'];
  S.water = [tex(waterRows, { B: '#4240ff', W: '#adadff' }), tex(waterRows.map((r) => r.slice(4) + r.slice(0, 4)), { B: '#4240ff', W: '#adadff' })];
  S.trees = tex(['.GGg.GGg', 'GgGGGgGG', 'GGgGGGgG', 'gGGG.GGg', '.GgGGGG.', 'GGGgGgGG', 'GgGGGGgG', 'gGG.gGG.'], { G: '#2b7a00', g: '#8cd600' });
  S.ice = tex(['WLLLWLLL', 'LWLLLWLL', 'LLWLLLWL', 'LLLWLLLW', 'WLLLWLLL', 'LWLLLWLL', 'LLWLLLWL', 'LLLWLLLW'], { W: '#fcfcfc', L: '#bcbcbc' });
  const eagle = ['................', '.W............W.', '.WW....GG....WW.', '.WWW..GGGG..WWW.', '.WWWW.GWWG.WWWW.', '..WWWWGGGGWWWW..', '...WWWWGGWWWW...', '....WWWGGWWW....', '.....WWGGWW.....', '......WGGW......', '.....GGGGGG.....', '....GG.GG.GG....', '...GGGGGGGGGG...', '....GGGGGGGG....', '...GGGGGGGGGG...', '................'];
  S.eagle = makeSprite(eagle, { W: '#bcbcbc', G: '#636363' });
  S.eagleDead = makeSprite(['................', '................', '.........K......', '....K...KK..K...', '...KGK.KGGK.KK..', '..KGGGKGGGGKGK..', '..KGGGGGGGGGGK..', '.KGGWGGGGGWGGGK.', '.KGGGGGWGGGGGGK.', '..KGGGGGGGGWGK..', '...KGGWGGGGGK...', '..KGGGGGGGGGGK..', '.KGGGGGGGGGGGGK.', '..KKKKKKKKKKKK..', '................', '................'], { W: '#bcbcbc', G: '#636363', K: '#2a2a2a' });
  S.icons = {};
  for (const [k, rows] of Object.entries(ICONS)) S.icons[k] = makeSprite(rows, { W: '#fcfcfc', K: '#000', R: '#d82800' });
  S.mini = makeSprite(['...KK...', '.K.KK.K.', 'KKKKKKKK', 'KK.KK.KK', 'KKKKKKKK', 'KK.KK.KK', 'KKKKKKKK', 'K......K'], { K: '#000' });
  S.lifeIcon = makeSprite(['.K....K.', 'KK.KK.KK', 'KKKKKKKK', 'KK.KK.KK', 'KKKKKKKK', 'KK....KK', 'K......K'], { K: '#e7a539' });
  S.flag = makeSprite(['K...............', 'KWWWWWWWWWWW....', 'KWWWWRRWWWWW....', 'KWWWRRRRWWWW....', 'KWWWWRRWWWWW....', 'KWWWWWWWWWWW....', 'K...............', 'K...............', 'K...............', 'K...............', 'K...............', 'KK..............'], { K: '#000', W: '#fcfcfc', R: '#d82800' });
}

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DLIST = ['up', 'down', 'left', 'right'];

export default class Tank90 {
  constructor(api) {
    this.api = api;
    buildSprites();
    this.stageNo = 1;
    this.lives = 3;
    this.star = 0;
    this.extraGiven = 0;
    this.dirOrder = [];
    this.terrain = document.createElement('canvas');
    this.terrain.width = FS;
    this.terrain.height = FS;
    this.startStage();
  }

  // ---------- Kurulum ----------
  startStage() {
    const { api } = this;
    const layout = STAGES[(this.stageNo - 1) % STAGES.length];
    this.map = new Uint8Array(MC * MC);
    const set = (bc, br, mask, type) => {
      // mask: 4x4 mikro hücre içindeki 2x2 çeyrekler [sol-üst, sağ-üst, sol-alt, sağ-alt]
      for (let q = 0; q < 4; q++) {
        if (!mask[q]) continue;
        const qx = bc * 4 + (q % 2) * 2, qy = br * 4 + Math.floor(q / 2) * 2;
        for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) this.map[(qy + y) * MC + qx + x] = type;
      }
    };
    const FULL = [1, 1, 1, 1], L = [1, 0, 1, 0], R = [0, 1, 0, 1], U = [1, 1, 0, 0], D = [0, 0, 1, 1];
    for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) {
      const ch = (layout[r] || '')[c] || '.';
      const t = { '#': [BRICK, FULL], L: [BRICK, L], R: [BRICK, R], U: [BRICK, U], D: [BRICK, D], '@': [STEEL, FULL], l: [STEEL, L], r: [STEEL, R], u: [STEEL, U], d: [STEEL, D], '~': [WATER, FULL], '%': [TREES, FULL], '-': [ICE, FULL] }[ch];
      if (t) set(c, r, t[1], t[0]);
    }
    // kartal ve kalesi
    for (let y = 44; y < 52; y++) for (let x = 20; x < 32; x++) this.map[y * MC + x] = EMPTY;
    this.buildFort(BRICK);
    for (const [sx, sy] of [...SPAWNS, PLAYER_SPAWN]) for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) this.map[(sy / 4 + y) * MC + sx / 4 + x] = EMPTY;

    // düşman listesi
    const loop = Math.floor((this.stageNo - 1) / STAGES.length);
    const comp = [...COMPOSITION[(this.stageNo - 1) % COMPOSITION.length]];
    for (let i = 0; i < loop * 3; i++) { // döngülerde daha güçlü tanklar
      const from = comp[0] > 0 ? 0 : comp[1] > 0 ? 1 : 2;
      if (from >= 3 || comp[from] <= 0) break;
      comp[from]--;
      comp[Math.min(3, from + 2)]++;
    }
    const list = [];
    comp.forEach((n, i) => { for (let k = 0; k < n; k++) list.push(TYPE_NAMES[i]); });
    // hafif karıştır (zor tanklar sona doğru)
    for (let i = list.length - 1; i > 0; i--) {
      if (Math.random() < 0.5) { const j = Math.max(0, i - 1 - Math.floor(Math.random() * 4)); [list[i], list[j]] = [list[j], list[i]]; }
    }
    this.queue = list;
    this.spawned = 0;
    this.enemies = [];
    this.bullets = [];
    this.effects = [];
    this.popups = [];
    this.powerup = null;
    this.freezeT = 0;
    this.shovelT = 0;
    this.spawnIdx = 0;
    this.spawnTimer = 30;
    this.spawnInterval = Math.max(70, 190 - this.stageNo * 6 - loop * 20);
    this.fireChance = Math.min(0.06, 0.014 + this.stageNo * 0.003);
    this.speedMul = 1 + Math.min(0.4, loop * 0.15);
    this.kills = [0, 0, 0, 0];
    this.eagleDead = false;
    this.player = null;
    this.spawnPlayer();
    this.state = 'curtain';
    this.timer = api.preview ? 0 : 120;
    this.dirty = true;
    if (api.preview) { this.state = 'play'; }
  }

  buildFort(type) {
    const cells = [];
    for (let y = 46; y < 52; y++) for (let x = 22; x < 30; x++) {
      if (x >= 24 && x < 28 && y >= 48) continue; // kartal
      cells.push([x, y]);
    }
    for (const [x, y] of cells) this.map[y * MC + x] = type;
    this.dirty = true;
  }

  spawnPlayer() {
    this.player = { x: PLAYER_SPAWN[0], y: PLAYER_SPAWN[1], dir: 'up', acc: 0, anim: 0, born: 60, shield: 180, slide: 0, moving: false, isPlayer: true };
  }

  // ---------- Harita yardımcıları ----------
  cellAt(mx, my) {
    if (mx < 0 || my < 0 || mx >= MC || my >= MC) return -1;
    return this.map[my * MC + mx];
  }
  boxBlocked(x, y) {
    if (x < 0 || y < 0 || x + 16 > FS || y + 16 > FS) return true;
    for (let my = Math.floor(y / 4); my <= Math.floor((y + 15) / 4); my++) {
      for (let mx = Math.floor(x / 4); mx <= Math.floor((x + 15) / 4); mx++) {
        const t = this.map[my * MC + mx];
        if (t === BRICK || t === STEEL || t === WATER) return true;
      }
    }
    // kartal
    if (x < EAGLE.x + 16 && x + 16 > EAGLE.x && y < EAGLE.y + 16 && y + 16 > EAGLE.y) return true;
    return false;
  }
  overlap(a, b, ax = a.x, ay = a.y) {
    return ax < b.x + 16 && ax + 16 > b.x && ay < b.y + 16 && ay + 16 > b.y;
  }
  allTanks() {
    const list = this.enemies.filter((e) => !e.born);
    if (this.player && !this.player.born && !this.player.dead) list.push(this.player);
    return list;
  }

  // Tankı bir yöne hareket ettir (dikey dönüşte 8 px ızgaraya hizalar)
  moveTank(t, dir, speed) {
    if (t.dir !== dir) {
      const perp = (DIRS[t.dir][0] !== 0) !== (DIRS[dir][0] !== 0);
      if (perp) {
        if (DIRS[dir][0] !== 0) t.y = Math.round(t.y / 8) * 8;
        else t.x = Math.round(t.x / 8) * 8;
      }
      t.dir = dir;
    }
    t.acc += speed;
    let moved = false;
    const others = this.allTanks().filter((o) => o !== t);
    while (t.acc >= 1) {
      t.acc -= 1;
      const nx = t.x + DIRS[dir][0], ny = t.y + DIRS[dir][1];
      if (this.boxBlocked(nx, ny)) { t.acc = 0; return moved ? 'moved-blocked' : 'blocked'; }
      const hit = others.find((o) => this.overlap(t, o, nx, ny) && !this.overlap(t, o));
      if (hit) { t.acc = 0; return moved ? 'moved-blocked' : 'blocked'; }
      t.x = nx; t.y = ny;
      moved = true;
    }
    if (moved) t.anim++;
    return 'ok';
  }

  onIce(t) {
    const mx = Math.floor((t.x + 8) / 4), my = Math.floor((t.y + 8) / 4);
    return this.cellAt(mx, my) === ICE;
  }

  fire(t) {
    const [dx, dy] = DIRS[t.dir];
    const cx = t.x + 8 + dx * 6, cy = t.y + 8 + dy * 6;
    const speed = t.isPlayer ? (this.star >= 1 ? 4 : 2.5) : TYPE_INFO[t.type].bullet;
    const b = { x: cx, y: cy, dir: t.dir, speed, owner: t, player: !!t.isPlayer, power: t.isPlayer && this.star >= 3, acc: 0 };
    this.bullets.push(b);
    if (t.isPlayer && !this.api.preview) this.api.sfx.tone(260, 0.08, { slide: 120, vol: 0.12 });
  }

  // ---------- Güncelleme ----------
  update() {
    const { api } = this;
    this.popups = this.popups.filter((p) => --p.t > 0);
    this.effects = this.effects.filter((e) => ++e.t < e.life);
    switch (this.state) {
      case 'curtain':
        if (--this.timer <= 0) {
          this.state = 'play';
          api.sfx.seq([['C5', 0.1], ['E5', 0.1], ['G5', 0.1], ['C6', 0.1], ['D5', 0.1], ['F5', 0.1], ['A5', 0.1], ['D6', 0.2]], { vol: 0.08 });
        }
        return;
      case 'tally':
        if (--this.timer <= 0) { this.stageNo++; this.startStage(); }
        return;
      case 'over':
        this.timer++;
        if (this.timer === 150) api.gameOver();
        this.updateBullets();
        return;
      default:
        break;
    }
    this.updatePlayer();
    this.updateEnemies();
    this.updateBullets();
    this.updatePowerup();
    if (this.shovelT > 0 && --this.shovelT === 0) this.buildFort(BRICK);
    else if (this.shovelT > 0 && this.shovelT < 180 && this.shovelT % 30 === 0) this.buildFort(this.shovelT % 60 === 0 ? STEEL : BRICK);
    if (this.freezeT > 0) this.freezeT--;

    if (this.state === 'play') {
      if (this.spawned >= this.queue.length && this.enemies.length === 0) {
        this.state = 'clearWait';
        this.timer = 180;
      }
    } else if (this.state === 'clearWait') {
      if (--this.timer <= 0) {
        this.state = 'tally';
        this.timer = 300;
        this.api.sfx.play('levelup');
      }
    }
  }

  readDir() {
    const { input } = this.api;
    for (const d of DLIST) if (input.pressed(d)) { this.dirOrder = this.dirOrder.filter((x) => x !== d); this.dirOrder.push(d); }
    this.dirOrder = this.dirOrder.filter((d) => input.held(d));
    for (const d of DLIST) if (input.held(d) && !this.dirOrder.includes(d)) this.dirOrder.push(d);
    return this.dirOrder.length ? this.dirOrder[this.dirOrder.length - 1] : null;
  }

  updatePlayer() {
    const p = this.player;
    const { api } = this;
    if (!p) return;
    if (p.dead) {
      if (--p.dead <= 0) {
        if (this.lives > 0) this.spawnPlayer();
        else this.player = null;
      }
      return;
    }
    if (p.born > 0) { p.born--; return; }
    if (p.shield > 0) p.shield--;
    if (this.state !== 'play' && this.state !== 'clearWait') return;
    let dir, fire;
    if (api.preview) ({ dir, fire } = this.autopilot());
    else {
      dir = this.readDir();
      fire = api.input.pressed('a') || api.input.pressed('b');
    }
    p.moving = false;
    const speed = 0.875;
    if (dir) {
      const r = this.moveTank(p, dir, speed);
      p.moving = r !== 'blocked';
      p.slide = this.onIce(p) ? 28 : 0;
    } else if (p.slide > 0) {
      p.slide--;
      const r = this.moveTank(p, p.dir, speed);
      if (r === 'blocked') p.slide = 0;
      p.moving = true;
    } else p.acc = 0;
    if (p.moving && !api.preview && api.frame % 8 === 0) api.sfx.tone(70, 0.06, { type: 'sawtooth', vol: 0.03 });
    if (fire) {
      const mine = this.bullets.filter((b) => b.owner === p).length;
      if (mine < (this.star >= 2 ? 2 : 1)) this.fire(p);
    }
    // güçlendirme
    const pu = this.powerup;
    if (pu && this.overlap(p, pu)) this.takePowerup(pu.kind);
  }

  takePowerup(kind) {
    const { api } = this;
    this.powerup = null;
    api.addScore(500);
    this.checkExtra();
    this.popups.push({ x: this.player.x + 8, y: this.player.y + 4, text: '500', t: 50 });
    api.sfx.play('power');
    switch (kind) {
      case 'star': this.star = Math.min(3, this.star + 1); break;
      case 'grenade':
        for (const e of this.enemies) if (!e.born) this.explodeTank(e, false);
        this.enemies = this.enemies.filter((e) => e.born);
        api.sfx.play('bigexplode');
        break;
      case 'helmet': this.player.shield = 600; break;
      case 'shovel': this.shovelT = 1200; this.buildFort(STEEL); break;
      case 'clock': this.freezeT = 600; break;
      case 'tank': this.lives++; api.sfx.play('coin'); break;
      default: break;
    }
  }

  checkExtra() {
    const n = Math.floor(this.api.score / 20000);
    if (n > this.extraGiven) { this.extraGiven = n; this.lives++; this.api.sfx.play('coin'); }
  }

  updatePowerup() {
    if (this.powerup && --this.powerup.t <= 0) this.powerup = null;
  }

  spawnPowerup() {
    const kind = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    let x = 0, y = 0;
    for (let i = 0; i < 30; i++) {
      x = Math.floor(Math.random() * 12) * 16 + (Math.random() < 0.5 ? 8 : 0);
      y = Math.floor(Math.random() * 11) * 16 + 8;
      if (!(x + 16 > EAGLE.x - 8 && x < EAGLE.x + 24 && y + 16 > EAGLE.y - 8)) break;
    }
    this.powerup = { kind, x, y, t: 1200 };
    this.api.sfx.play('pickup');
  }

  updateEnemies() {
    const { api } = this;
    // doğma
    const active = this.enemies.length;
    if ((this.state === 'play') && this.spawned < this.queue.length && active < 4) {
      if (--this.spawnTimer <= 0) {
        const [sx, sy] = SPAWNS[this.spawnIdx % 3];
        const occupied = this.allTanks().some((t) => this.overlap(t, { x: sx, y: sy }, t.x, t.y));
        if (!occupied) {
          const type = this.queue[this.spawned];
          const n = this.spawned + 1;
          const bonus = n === 4 || n === 11 || n === 18;
          this.enemies.push({ type, x: sx, y: sy, dir: 'down', acc: 0, anim: 0, born: 60, hp: TYPE_INFO[type].hp, bonus, turnT: 60, fireT: 30 });
          this.spawned++;
          this.spawnIdx++;
          this.spawnTimer = this.spawnInterval;
        } else this.spawnTimer = 20;
      }
    }
    for (const e of this.enemies) {
      if (e.born > 0) { e.born--; continue; }
      if (this.freezeT > 0) continue;
      const info = TYPE_INFO[e.type];
      e.turnT--;
      const r = this.moveTank(e, e.dir, info.speed * this.speedMul);
      if (r === 'blocked' || e.turnT <= 0) {
        if (r === 'blocked' && Math.random() < 0.5 && !this.bullets.some((b) => b.owner === e)) this.fire(e);
        e.dir = this.enemyChoose(e, r === 'blocked');
        e.turnT = 40 + Math.floor(Math.random() * 140);
      }
      if (!this.bullets.some((b) => b.owner === e) && --e.fireT <= 0) {
        if (Math.random() < this.fireChance * 4) this.fire(e);
        e.fireT = 6;
      }
    }
    void api;
  }

  enemyChoose(e, blocked) {
    const r = Math.random();
    let want;
    if (r < 0.35) {
      // karargâha doğru
      if (Math.abs(e.x - EAGLE.x) > 16 && Math.random() < 0.5) want = e.x < EAGLE.x ? 'right' : 'left';
      else want = 'down';
    } else if (r < 0.55 && this.player && !this.player.dead) {
      const p = this.player;
      want = Math.abs(p.x - e.x) > Math.abs(p.y - e.y) ? (p.x < e.x ? 'left' : 'right') : (p.y < e.y ? 'up' : 'down');
    } else want = DLIST[Math.floor(Math.random() * 4)];
    if (blocked && want === e.dir) want = DLIST[(DLIST.indexOf(want) + 1 + Math.floor(Math.random() * 3)) % 4];
    return want;
  }

  updateBullets() {
    for (const b of this.bullets) {
      if (b.dead) continue;
      b.acc += b.speed;
      while (b.acc >= 1 && !b.dead) {
        b.acc -= 1;
        b.x += DIRS[b.dir][0];
        b.y += DIRS[b.dir][1];
        this.bulletStep(b);
      }
    }
    // mermi-mermi
    for (const a of this.bullets) {
      if (a.dead || !a.player) continue;
      for (const b of this.bullets) {
        if (b.dead || b.player) continue;
        if (Math.abs(a.x - b.x) < 4 && Math.abs(a.y - b.y) < 4) { a.dead = true; b.dead = true; }
      }
    }
    this.bullets = this.bullets.filter((b) => !b.dead);
  }

  bulletStep(b) {
    const { api } = this;
    // alan dışı
    if (b.x < 1 || b.y < 1 || b.x > FS - 1 || b.y > FS - 1) {
      b.dead = true;
      this.effects.push({ x: b.x, y: b.y, t: 0, life: 12, big: false });
      if (b.player && !api.preview) api.sfx.tone(900, 0.04, { type: 'square', vol: 0.06 });
      return;
    }
    // arazi: öndeki mikro hücreler
    const [dx, dy] = DIRS[b.dir];
    const lx = Math.floor((b.x + dx * 2 - (dx === 0 ? 2 : 0)) / 4), ly = Math.floor((b.y + dy * 2 - (dy === 0 ? 2 : 0)) / 4);
    const cells = dx === 0 ? [[lx, ly], [Math.floor((b.x + 1) / 4), ly]] : [[lx, ly], [lx, Math.floor((b.y + 1) / 4)]];
    let hitSolid = false;
    for (const [mx, my] of cells) {
      const t = this.cellAt(mx, my);
      if (t === BRICK || t === STEEL) hitSolid = true;
    }
    if (hitSolid) {
      b.dead = true;
      this.impactTerrain(b, dx === 0 ? ly : lx);
      this.effects.push({ x: b.x, y: b.y, t: 0, life: 12, big: false });
      return;
    }
    // kartal
    if (b.x >= EAGLE.x && b.x < EAGLE.x + 16 && b.y >= EAGLE.y && b.y < EAGLE.y + 16 && !this.eagleDead) {
      b.dead = true;
      this.killEagle();
      return;
    }
    // tanklar
    if (b.player) {
      for (const e of this.enemies) {
        if (e.born || e.dying) continue;
        if (b.x >= e.x && b.x < e.x + 16 && b.y >= e.y && b.y < e.y + 16) {
          b.dead = true;
          this.hitEnemy(e);
          return;
        }
      }
    } else {
      const p = this.player;
      if (p && !p.born && !p.dead && b.x >= p.x && b.x < p.x + 16 && b.y >= p.y && b.y < p.y + 16) {
        b.dead = true;
        if (p.shield > 0) return;
        this.killPlayer();
        return;
      }
      // düşman mermisi başka düşmana çarpar ve kaybolur
      for (const e of this.enemies) {
        if (e === b.owner || e.born) continue;
        if (b.x >= e.x && b.x < e.x + 16 && b.y >= e.y && b.y < e.y + 16) { b.dead = true; return; }
      }
    }
  }

  // Merminin çarptığı yerde 16 px genişliğinde tuğla şeridi yıkılır (güçlüyse 8 px derinlik, çelik dahil)
  impactTerrain(b, lead) {
    const { api } = this;
    const [dx, dy] = DIRS[b.dir];
    const depth = b.power ? 2 : 1;
    let broke = false, steel = false;
    for (let d = 0; d < depth; d++) {
      const line = lead + (dx + dy) * d;
      const center = dx === 0 ? b.x : b.y;
      const from = Math.floor((center - 8) / 4), to = Math.floor((center + 7) / 4);
      for (let k = from; k <= to; k++) {
        const mx = dx === 0 ? k : line, my = dx === 0 ? line : k;
        const t = this.cellAt(mx, my);
        if (t === BRICK) { this.map[my * MC + mx] = EMPTY; broke = true; }
        else if (t === STEEL) {
          steel = true;
          if (b.power) {
            // çelik 8x8 çeyrek olarak yıkılır
            const qx = mx - (mx % 2), qy = my - (my % 2);
            for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) this.map[(qy + y) * MC + qx + x] = EMPTY;
            broke = true;
          }
        }
      }
    }
    if (broke) this.dirty = true;
    if (b.player && !api.preview) {
      if (broke) api.sfx.noise(0.12, { vol: 0.2, freq: 1800 });
      else if (steel) api.sfx.tone(1200, 0.05, { type: 'square', vol: 0.08 });
    }
  }

  hitEnemy(e) {
    const { api } = this;
    if (e.bonus) {
      e.bonus = false;
      this.spawnPowerup();
    }
    e.hp--;
    if (e.hp > 0) {
      api.sfx.tone(600, 0.06, { type: 'square', vol: 0.1 });
      return;
    }
    const info = TYPE_INFO[e.type];
    this.kills[TYPE_NAMES.indexOf(e.type)]++;
    api.addScore(info.pts);
    this.checkExtra();
    this.explodeTank(e, true);
    this.enemies = this.enemies.filter((x) => x !== e);
  }

  explodeTank(e, showPts) {
    this.effects.push({ x: e.x + 8, y: e.y + 8, t: 0, life: 30, big: true, pts: showPts ? TYPE_INFO[e.type]?.pts : null });
    this.api.sfx.play('explode');
  }

  killPlayer() {
    const p = this.player;
    this.effects.push({ x: p.x + 8, y: p.y + 8, t: 0, life: 30, big: true });
    this.api.sfx.play('bigexplode');
    this.lives--;
    this.star = 0;
    p.dead = 60;
    if (this.lives <= 0) this.gameOverNow();
  }

  killEagle() {
    this.eagleDead = true;
    this.effects.push({ x: EAGLE.x + 8, y: EAGLE.y + 8, t: 0, life: 40, big: true });
    this.api.sfx.play('bigexplode');
    this.gameOverNow();
  }

  gameOverNow() {
    if (this.state === 'over') return;
    this.state = 'over';
    this.timer = 0;
    this.api.sfx.play('gameover');
  }

  // Önizleme otopilotu: rastgele dolaş, düşmana dönükse ateş et
  autopilot() {
    const p = this.player;
    if (!this.apDir || Math.random() < 0.02) this.apDir = DLIST[Math.floor(Math.random() * 4)];
    let fire = Math.random() < 0.08;
    for (const e of this.enemies) {
      if (e.born) continue;
      if (Math.abs(e.x - p.x) < 8) { this.apDir = e.y < p.y ? 'up' : 'down'; fire = true; }
      else if (Math.abs(e.y - p.y) < 8) { this.apDir = e.x < p.x ? 'left' : 'right'; fire = true; }
    }
    if (this.boxBlocked(p.x + DIRS[this.apDir][0], p.y + DIRS[this.apDir][1])) {
      fire = true;
      if (Math.random() < 0.05) this.apDir = DLIST[Math.floor(Math.random() * 4)];
    }
    return { dir: this.apDir, fire };
  }

  // ---------- Çizim ----------
  renderTerrain() {
    const ctx = this.terrain.getContext('2d');
    ctx.clearRect(0, 0, FS, FS);
    for (let my = 0; my < MC; my++) for (let mx = 0; mx < MC; mx++) {
      const t = this.map[my * MC + mx];
      const tex = t === BRICK ? S.brick : t === STEEL ? S.steel : t === ICE ? S.ice : null;
      if (tex) ctx.drawImage(tex, (mx % 2) * 4, (my % 2) * 4, 4, 4, mx * 4, my * 4, 4, 4);
    }
    this.dirty = false;
  }

  drawLayer(type, spr) {
    const { ctx } = this.api.gfx;
    for (let my = 0; my < MC; my++) for (let mx = 0; mx < MC; mx++) {
      if (this.map[my * MC + mx] === type) ctx.drawImage(spr, (mx % 2) * 4, (my % 2) * 4, 4, 4, FX + mx * 4, FY + my * 4, 4, 4);
    }
  }

  draw() {
    const { gfx, frame } = this.api;
    if (this.state === 'curtain' && this.timer > 0) {
      gfx.cls('#636363');
      gfx.text(`AŞAMA ${this.stageNo}`, 128, 108, '#000', { align: 'center', scale: 2 });
      return;
    }
    if (this.state === 'tally') { this.drawTally(); return; }
    gfx.cls('#636363');
    gfx.rect(FX, FY, FS, FS, '#000');
    if (this.dirty) this.renderTerrain();
    this.drawLayer(WATER, S.water[Math.floor(frame / 30) % 2]);
    gfx.sprite(this.terrain, FX, FY);
    // kartal
    gfx.sprite(this.eagleDead ? S.eagleDead : S.eagle, FX + EAGLE.x, FY + EAGLE.y);
    // tanklar
    for (const e of this.enemies) {
      if (e.born) { this.drawSpawn(e.x, e.y, e.born); continue; }
      let pal = 'enemy';
      if (e.type === 'armor') pal = e.hp >= 4 ? 'green' : e.hp === 3 ? 'gold' : e.hp === 2 ? 'enemy' : 'enemy';
      if (e.bonus && Math.floor(frame / 8) % 2) pal = 'red';
      const tf = Math.floor(e.anim / 2) % 2;
      gfx.sprite(S.tank[pal][e.type][e.dir][tf], FX + e.x, FY + e.y);
    }
    const p = this.player;
    if (p && !p.dead) {
      if (p.born) this.drawSpawn(p.x, p.y, p.born);
      else {
        const shape = this.star >= 3 ? 'armor' : this.star >= 2 ? 'power' : this.star >= 1 ? 'fast' : 'basic';
        gfx.sprite(S.tank.player[shape][p.dir][p.moving ? Math.floor(p.anim / 2) % 2 : 0], FX + p.x, FY + p.y);
        if (p.shield > 0) this.drawShield(p.x, p.y, frame);
      }
    }
    // mermiler
    for (const b of this.bullets) {
      const vert = b.dir === 'up' || b.dir === 'down';
      gfx.rect(FX + b.x - (vert ? 1 : 2), FY + b.y - (vert ? 2 : 1), vert ? 3 : 4, vert ? 4 : 3, '#bcbcbc');
      gfx.rect(FX + b.x - (vert ? 0 : 1), FY + b.y - (vert ? 1 : 0), 1, 1, '#fcfcfc');
    }
    // ağaçlar tankların üstünde
    this.drawLayer(TREES, S.trees);
    // güçlendirme
    if (this.powerup && Math.floor(frame / 12) % 2 === 0) {
      const pu = this.powerup;
      gfx.rect(FX + pu.x, FY + pu.y, 16, 16, '#000');
      gfx.rectb(FX + pu.x, FY + pu.y, 16, 16, '#fcfcfc');
      gfx.sprite(S.icons[pu.kind], FX + pu.x + 2, FY + pu.y + 2);
    }
    // patlamalar
    for (const e of this.effects) this.drawEffect(e);
    for (const pp of this.popups) gfx.text(pp.text, FX + pp.x, FY + pp.y, '#fcfcfc', { align: 'center' });

    this.drawPanel();
    if (this.state === 'over') {
      const y = Math.max(100, 216 - this.timer * 1.2);
      gfx.text('OYUN', FX + FS / 2, y, '#d82800', { align: 'center', scale: 2 });
      gfx.text('BİTTİ', FX + FS / 2, y + 18, '#d82800', { align: 'center', scale: 2 });
    }
    if (this.freezeT > 0 && frame % 40 < 25) gfx.text('DONDU!', FX + FS / 2, FY + 2, '#58d8fc', { align: 'center' });
  }

  drawSpawn(x, y, t) {
    const { gfx } = this.api;
    const k = [1, 3, 5, 7, 5, 3][Math.floor(t / 4) % 6];
    const cx = FX + x + 8, cy = FY + y + 8;
    gfx.rect(cx - k, cy, k * 2 + 1, 1, '#fcfcfc');
    gfx.rect(cx, cy - k, 1, k * 2 + 1, '#fcfcfc');
    const d = Math.floor(k * 0.6);
    for (let i = 1; i <= d; i++) {
      gfx.pset(cx - i, cy - i, '#bcbcbc'); gfx.pset(cx + i, cy - i, '#bcbcbc');
      gfx.pset(cx - i, cy + i, '#bcbcbc'); gfx.pset(cx + i, cy + i, '#bcbcbc');
    }
  }

  drawShield(x, y, frame) {
    const { gfx } = this.api;
    const off = Math.floor(frame / 2) % 2;
    for (let i = off; i < 16; i += 2) {
      gfx.pset(FX + x + i, FY + y - 1, '#fcfcfc');
      gfx.pset(FX + x + 15 - i, FY + y + 16, '#fcfcfc');
      gfx.pset(FX + x - 1, FY + y + 15 - i, '#fcfcfc');
      gfx.pset(FX + x + 16, FY + y + i, '#fcfcfc');
    }
  }

  drawEffect(e) {
    const { gfx } = this.api;
    const x = FX + e.x, y = FY + e.y;
    if (e.big) {
      const k = e.t / e.life;
      if (k < 0.75) {
        const r = 3 + Math.sin(k * Math.PI / 0.75) * 12;
        gfx.circ(x, y, r, '#d82800');
        gfx.circ(x, y, r * 0.7, '#fc7460');
        gfx.circ(x, y, r * 0.4, '#fcfcfc');
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05 + e.t * 0.1;
          gfx.rect(x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 2, '#6b0047');
        }
      } else if (e.pts) gfx.text(String(e.pts), x, y - 3, '#fcfcfc', { align: 'center' });
    } else {
      const r = [2, 4, 3][Math.min(2, Math.floor(e.t / 4))];
      gfx.circ(x, y, r, '#fcfcfc');
      gfx.circ(x, y, Math.max(1, r - 2), '#d82800');
    }
  }

  drawPanel() {
    const { gfx } = this.api;
    // kalan düşmanlar (2 sütun)
    const left = this.queue.length - this.spawned;
    for (let i = 0; i < left; i++) gfx.sprite(S.mini, 232 + (i % 2) * 9, 16 + Math.floor(i / 2) * 9);
    // can
    gfx.text('IP', 232, 124, '#000');
    gfx.sprite(S.lifeIcon, 232, 133);
    gfx.text(String(Math.max(0, this.lives - (this.player && !this.player.dead ? 1 : 0))), 243, 133, '#000');
    // bayrak + aşama
    gfx.sprite(S.flag, 232, 160);
    gfx.text(String(this.stageNo), 250, 174, '#000', { align: 'right' });
    // skor
    gfx.text(String(this.api.score).padStart(6, '0'), 128, 0, '#fcfcfc', { align: 'center' });
    void 0;
  }

  drawTally() {
    const { gfx } = this.api;
    gfx.cls('#000');
    const t = 300 - this.timer;
    gfx.text('EN YÜKSEK', 70, 16, '#d82800');
    gfx.text(String(Math.max(this.api.hiScore, this.api.score)).padStart(6, '0'), 190, 16, '#e7a539', { align: 'right' });
    gfx.text(`AŞAMA ${this.stageNo}`, 128, 36, '#fcfcfc', { align: 'center' });
    gfx.text('I-OYUNCU', 40, 56, '#d82800');
    gfx.text(String(this.api.score).padStart(6, '0'), 40, 68, '#e7a539');
    const names = ['basic', 'fast', 'power', 'armor'];
    let total = 0;
    names.forEach((n, i) => {
      const y = 90 + i * 22;
      const shown = Math.min(this.kills[i], Math.max(0, Math.floor((t - i * 40) / 6)));
      total += shown;
      gfx.text(String(shown * TYPE_INFO[n].pts).padStart(4, ' ') + ' PUAN', 30, y + 4, '#fcfcfc');
      gfx.text(String(shown).padStart(2, ' '), 120, y + 4, '#fcfcfc');
      gfx.text('<', 136, y + 4, '#fcfcfc');
      gfx.sprite(S.tank.enemy[n].up[0], 148, y);
    });
    gfx.rect(110, 178, 60, 2, '#fcfcfc');
    gfx.text(`TOPLAM ${String(total).padStart(2, ' ')}`, 70, 186, '#fcfcfc');
  }
}
