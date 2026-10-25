// Komando — Contra tarzı yandan kayan koş-vur oyunu.
import { makeSprite } from '../../js/engine/gfx.js';
import { HERO, HERO_FLASH, SOLDIER, SNOW_SOLDIER, RIFLEMAN, MEDAL, CAPSULE, FALCON } from './art.js';
import { STAGES, ROWS, buildStage } from './levels.js';

export const meta = {
  id: 'komando',
  width: 256,
  height: 240,
  buttons: { a: 'ATEŞ', b: 'ZIPLA' },
  help: [
    'Ok tuşlarıyla 8 yöne nişan al; A basılı tutunca sürekli ateş eder.',
    'Aşağı: yere yat. Aşağı + B: platformdan aşağı in. Suda aşağı: dal.',
    'Uçan kapsülü ve hap kutularını vur: M makineli, S saçma, L lazer, R hızlı ateş.',
    'Tek isabet öldürür! Bölüm sonundaki dev kalenin çekirdeğini yok et.',
  ],
};

const T = 16;
const SW = 256;
const SH = 240;
const PLAT = new Set(['=', 'b', 'm']);
const SPEED = 1.3;
const JUMP_V = -5.2;
const GRAV = 0.25;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hit = (px, py, b) => px >= b.x && px < b.x + b.w && py >= b.y && py < b.y + b.h;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------------------------------------------------------------- karolar
const ROCK = [
  'DLLLRRRDDLLRRRRD',
  'LRRRRRDLLRRRRRDD',
  'RRRRRDLRRRRRRDDL',
  'RRRRDDLRRRRRDDLR',
  'RRDDDLRRRRRDDLRR',
  'DDDLLRRRRDDDLRRR',
  'LLLRRRRRDDLLRRRR',
  'RRRRRRDDLRRRRRRD',
  'RRRRRDLLRRRRRRDD',
  'RRRDDLRRRRRRRDDL',
  'RDDLLRRRRRRDDLLR',
  'DLLRRRRRRDDDLRRR',
  'LRRRRRRDDLLLRRRR',
  'RRRRRDDLRRRRRRRD',
  'RRRDDLRRRRRRRDDL',
  'DDDLLRRRRRRDDLLR',
];
const GRASS_TOP = [
  '.G..G...G.G..G..',
  'GgGGgG.GgGGGgGG.',
  'GGGGGGGGGGGGGGGG',
  'gGGgGGGgGGgGGGgG',
  'ggGgggGggGggGgGg',
  'kgkkgkkgkkgkkgkk',
];
const SNOW_TOP = [
  '..WWWW....WWWW..',
  '.WWWWWWWWWWWWWW.',
  'WWWWWWWWWWWWWWWW',
  'WWLWWWWWLWWWWWLW',
  'LWLLWLWLLLWLWLLL',
  'RLRRLRRRLRRLRRLR',
];
const WATER_TOP = [
  '..WW......WW....',
  '.WLLW....WLLW...',
  'WLLLLWWWWLLLLWWW',
  'LLLLLLLLLLLLLLLL',
  'BBLLBBBBBBLLBBBB',
  'BBBBBBBBBBBBBBBB',
  'BBBBBBBLLBBBBBBB',
  'BBBBBBBBBBBBBBBB',
  'BLLBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBLLBBB',
  'BBBBBBBBBBBBBBBB',
  'BBBBBLLBBBBBBBBB',
  'BBBBBBBBBBBBBBBB',
  'BBBBBBBBBBBBBBLL',
  'BBBBBBBBBBBBBBBB',
];
const BRIDGE = [
  'LLLLLLLLLLLLLLLL',
  'GGGGGGGGGGGGGGGG',
  'GDGGGGGDGGGGGGGD',
  'DDDDDDDDDDDDDDDD',
  'D.D.....D.....D.',
  'D..D...D.D...D..',
  'D...D.D...D.D...',
  'D....D.....D....',
  'D...D.D...D.D...',
  'D..D...D.D...D..',
  'D.D.....D.....D.',
  'DDDDDDDDDDDDDDDD',
];
const METAL_TOP = [
  'LLLLLLLLLLLLLLLL',
  'WWWWWWWWWWWWWWWW',
  'MMMMMMMMMMMMMMMM',
  'DMMDMMMDMMMDMMMD',
  'MMMMMMMMMMMMMMMM',
  'YYKKYYKKYYKKYYKK',
  'KYYKKYYKKYYKKYYK',
  'DDDDDDDDDDDDDDDD',
];
const METAL_WALL = [
  'DMMMMMMMDMMMMMMM',
  'MLMMMMLMDMLMMMML',
  'MMMMMMMMDMMMMMMM',
  'MMMMMMMMDMMMMMMM',
  'MMMMMMMMDMMMMMMM',
  'MMMMMMMMDMMMMMMM',
  'MLMMMMLMDMLMMMML',
  'DDDDDDDDDDDDDDDD',
  'MMMMDMMMMMMMMDMM',
  'MLMMDMMLMLMMMDML',
  'MMMMDMMMMMMMMDMM',
  'MMMMDMMMMMMMMDMM',
  'MMMMDMMMMMMMMDMM',
  'MMMMDMMMMMMMMDMM',
  'MLMMDMMLMLMMMDML',
  'DDDDDDDDDDDDDDDD',
];

const THEMES = {
  jungle: {
    rock: { R: '#8a6a40', D: '#4a3018', L: '#b89060' },
    top: { G: '#68d828', g: '#209010', k: '#0c4008' },
    water: { W: '#f0f8ff', L: '#58a8f8', B: '#1848c0' },
    bush: ['#209010', '#68d828', '#0c4008'],
    soldier: SOLDIER,
  },
  snow: {
    rock: { R: '#6a80a8', D: '#38486a', L: '#a8bcd8' },
    top: { W: '#f8f8ff', L: '#c0d0e8', R: '#6a80a8' },
    water: { W: '#f0f8ff', L: '#58a8f8', B: '#1848c0' },
    bush: ['#e8f0f8', '#ffffff', '#8098b8'],
    soldier: SNOW_SOLDIER,
  },
};
const METAL_PAL = { L: '#c8d8e8', W: '#e8f0f8', M: '#5a6878', D: '#2a3240', Y: '#e8c020', K: '#202020' };
const BRIDGE_PAL = { L: '#d8d8d8', G: '#888888', D: '#404040' };

function buildTiles(theme) {
  const th = THEMES[theme];
  const t = {};
  t.rock = makeSprite(ROCK, th.rock);
  const topRows = theme === 'snow' ? SNOW_TOP : GRASS_TOP;
  t.top = makeSprite([...topRows, ...ROCK.slice(topRows.length)], { ...th.rock, ...th.top });
  t.water = [0, 8].map((o) => makeSprite(WATER_TOP.map((r, i) => (i < 4 ? (r + r).slice(o, o + 16) : r)), th.water));
  t.deep = makeSprite(WATER_TOP.slice(4).concat(WATER_TOP.slice(4, 8)), th.water);
  t.bridge = makeSprite(BRIDGE, BRIDGE_PAL);
  t.metal = makeSprite([...METAL_TOP, ...METAL_WALL.slice(8)], METAL_PAL);
  t.wall = makeSprite(METAL_WALL, METAL_PAL);
  return t;
}

const WEAPON_SEQ = ['S', 'M', 'R', 'L', 'S', 'M'];
const WEAPON_NAMES = { N: '', M: 'MAKİNELİ', S: 'SAÇMA', L: 'LAZER', R: 'HIZLI ATEŞ' };

export default class Komando {
  constructor(api) {
    this.api = api;
    this.preview = !!api.preview;
    this.stage = 0;
    this.lives = 3;
    this.nextExtra = 20000;
    this.tileCache = {};
    this.weaponIdx = 0;
    this.botT = 0;
    this.botKeys = new Set();
    this.botPress = new Set();
    this.ctl = this.preview ? {
      held: (b) => this.botKeys.has(b),
      pressed: (b) => this.botPress.has(b),
    } : api.input;
    this.loadStage();
    this.mode = this.preview ? 'play' : 'intro';
    this.modeT = 0;
    this.firstFrame = true;
  }

  get loop() { return Math.floor(this.stage / STAGES.length); }

  get mul() { return 1 + 0.2 * Math.min(4, this.loop); }

  // ---------------------------------------------------------------- yükleme
  loadStage() {
    const st = STAGES[this.stage % STAGES.length];
    this.st = st;
    this.theme = st.theme;
    this.th = THEMES[st.theme];
    if (!this.tileCache[st.theme]) this.tileCache[st.theme] = buildTiles(st.theme);
    this.ts = this.tileCache[st.theme];
    this.map = buildStage(st.chunks);
    this.cols = this.map[0].length;
    this.camX = 0;
    this.maxCam = this.cols * T - SW;
    this.ents = [];
    this.pb = [];
    this.eb = [];
    this.fx = [];
    this.spawns = [];
    this.bridges = [];
    this.boss = null;
    this.runnerT = 120;
    this.clearT = 0;
    let start = { x: 40, y: 176 };
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        const c = this.map[ty][tx];
        if ('@SHTCPFGX'.includes(c)) {
          this.map[ty][tx] = c === 'T' ? (this.tileAtRaw(tx - 1, ty) === 'M' ? 'M' : 'r') : '.';
          if (c === '@') start = { x: tx * T + 8, y: (ty + 1) * T };
          else this.spawns.push({ c, tx, ty, x: tx * T });
        }
      }
    }
    // Köprüler: ardışık 'b' karoları
    for (let ty = 0; ty < ROWS; ty++) {
      let run = null;
      for (let tx = 0; tx <= this.cols; tx++) {
        const isB = tx < this.cols && this.map[ty][tx] === 'b';
        if (isB && !run) run = { ty, x0: tx, x1: tx };
        else if (isB) run.x1 = tx;
        else if (run) { this.bridges.push({ ...run, next: run.x0, t: 0, on: false }); run = null; }
      }
    }
    this.spawns.sort((a, b) => a.x - b.x);
    this.start = start;
    this.p = this.newPlayer(start.x, start.y);
    this.p.inv = 0;
  }

  tileAtRaw(tx, ty) {
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= this.cols) return '.';
    return this.map[ty][tx];
  }

  newPlayer(x, y) {
    return {
      x, y, vx: 0, vy: 0, dir: 1, onGround: true, ball: false, prone: false, swim: false, dive: false,
      ax: 1, ay: 0, anim: 0, dead: false, deadT: 0, inv: 150, cd: 0, weapon: 'N', rapid: false,
      dropY: -1, pose: 'stand', fireAnim: 0,
    };
  }

  tile(tx, ty) {
    if (ty < 0 || ty >= ROWS || tx < 0 || tx >= this.cols) return '.';
    return this.map[ty][tx];
  }

  isPlat(tx, ty) { return PLAT.has(this.tile(tx, ty)); }

  // Ayak çizgisinde (x0..x1) platform var mı
  platRow(ty, x0, x1) {
    for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) if (this.isPlat(tx, ty)) return true;
    return false;
  }

  waterRow(ty, x) { return this.tile(Math.floor(x / T), ty) === '~'; }

  // Tek yönlü platformlara düşme. Dönen: 'ground' | 'water' | null
  fall(e, ignoreY = -1) {
    const prevY = e.y;
    e.y += e.vy;
    e.vy = Math.min(e.vy + (e.g ?? GRAV), 6);
    if (e.vy - (e.g ?? GRAV) < 0) return null;
    const r0 = Math.floor(prevY / T);
    const r1 = Math.floor(e.y / T);
    for (let ty = r0; ty <= r1; ty++) {
      const top = ty * T;
      if (prevY <= top + 4 && e.y >= top) {
        if (top !== ignoreY && this.platRow(ty, e.x - 4, e.x + 4)) {
          e.y = top; e.vy = 0;
          return 'ground';
        }
        if (this.waterRow(ty, e.x)) { e.y = top; e.vy = 0; return 'water'; }
      }
    }
    return null;
  }

  // ---------------------------------------------------------------- güncelleme
  update() {
    try {
      this.step();
    } catch (err) {
      if (this.preview) return;
      // Beklenmedik durum: oyuncuyu güvenli yere al
      this.p = this.newPlayer(this.camX + 40, 0);
      this.mode = 'play';
    }
  }

  step() {
    this.firstFrame = false;
    this.modeT++;
    if (this.preview) this.botThink();
    switch (this.mode) {
      case 'intro':
        if (this.modeT === 1) this.api.sfx.seq([['E4', 0.12], ['G4', 0.12], ['A4', 0.12], ['E5', 0.3], ['D5', 0.12], ['E5', 0.4]], { vol: 0.1 });
        if (this.modeT >= 160) { this.mode = 'play'; this.modeT = 0; }
        break;
      case 'play':
        this.updatePlay();
        break;
      case 'clear':
        this.updateClear();
        break;
      case 'gameover':
        if (this.modeT === 1) this.api.sfx.play('gameover');
        if (this.modeT === 180) this.api.gameOver();
        this.updateFx();
        break;
      default: break;
    }
  }

  updatePlay() {
    this.updatePlayer();
    // Kamera: sadece ileri
    const p = this.p;
    if (!p.dead && p.x - this.camX > 112 && this.camX < this.maxCam) {
      this.camX = Math.min(this.maxCam, p.x - 112);
    }
    this.spawnCheck();
    this.updateBridges();
    this.updateRunners();
    this.updateEnts();
    this.updateBullets();
    this.updateFx();
    this.extraLife();
  }

  extraLife() {
    if (this.api.score >= this.nextExtra) {
      this.nextExtra += this.nextExtra === 20000 ? 40000 : 60000;
      this.lives++;
      this.api.sfx.play('levelup');
    }
  }

  // ---------------------------------------------------------------- oyuncu
  playerBox() {
    const p = this.p;
    if (p.dead || p.dive) return null;
    if (p.ball) return { x: p.x - 7, y: p.y - 26, w: 14, h: 16 };
    if (p.prone) return { x: p.x - 10, y: p.y - 9, w: 20, h: 9 };
    if (p.swim) return { x: p.x - 5, y: p.y - 10, w: 10, h: 8 };
    return { x: p.x - 5, y: p.y - 30, w: 10, h: 30 };
  }

  updatePlayer() {
    const p = this.p;
    const c = this.ctl;
    if (p.inv > 0) p.inv--;
    if (p.cd > 0) p.cd--;
    if (p.fireAnim > 0) p.fireAnim--;
    if (p.dead) {
      p.deadT++;
      if (p.deadT < 40) { p.x += p.vx; p.y += p.vy; p.vy += 0.25; if (this.fallOk(p)) { p.vy = 0; } }
      if (p.deadT === 100) this.respawn();
      return;
    }
    const ix = (c.held('right') ? 1 : 0) - (c.held('left') ? 1 : 0);
    const iy = (c.held('down') ? 1 : 0) - (c.held('up') ? 1 : 0);
    if (ix) p.dir = ix;

    p.prone = false;
    if (p.swim) {
      p.dive = iy > 0;
      p.vx = p.dive ? 0 : ix * 1.0;
      p.ax = iy < 0 && !ix ? 0 : p.dir;
      p.ay = iy < 0 ? -1 : 0;
      if (p.ax === 0) p.ay = -1;
      p.x += p.vx;
      // Kıyıya tırman (su yüzeyinden bir karo yukarıdaki zemine)
      const ahead = Math.floor((p.x + p.dir * 7) / T);
      const wr = Math.floor((p.y - 9) / T) - 1;
      if (this.cliffAt(Math.floor((p.x + p.dir * 6) / T), p.y)) p.x -= p.vx;
      if (ix && this.isPlat(ahead, wr) && !this.isPlat(ahead, wr - 1)) {
        p.swim = false; p.dive = false; p.y = wr * T; p.onGround = true; p.x += p.dir * 4;
      } else if (c.pressed('b') && !p.dive) {
        p.swim = false; p.vy = -4.2; p.ball = true; p.onGround = false;
        this.api.sfx.noise(0.15, { vol: 0.15, freq: 2500 });
      }
    } else if (p.onGround) {
      p.ball = false;
      if (iy > 0 && ix === 0) {
        p.prone = true; p.vx = 0; p.ax = p.dir; p.ay = 0;
      } else {
        p.vx = ix * SPEED;
        p.ax = ix || p.dir;
        p.ay = iy;
        if (iy < 0 && ix === 0) { p.ax = 0; p.ay = -1; }
        if (iy > 0) p.ay = 1;
      }
      if (c.pressed('b')) {
        if (iy > 0 && this.canDrop(p)) {
          // Platformdan aşağı in
          p.dropY = p.y; p.onGround = false; p.vy = 0.5;
        } else {
          p.vy = JUMP_V; p.onGround = false; p.ball = true;
          this.api.sfx.tone(260, 0.12, { slide: 520, vol: 0.08 });
        }
      }
    } else {
      p.vx = ix * SPEED;
      p.ax = ix;
      p.ay = iy;
      if (!ix && !iy) p.ax = p.dir;
    }

    // Yatay (uçurum yüzüne girilemez)
    if (!p.swim) {
      const nx = p.x + p.vx;
      if (p.vx === 0 || p.onGround || !this.cliffAt(Math.floor((nx + Math.sign(p.vx) * 5) / T), p.y)) p.x = nx;
    }
    const minX = this.camX + 8;
    let maxX = this.camX + SW - 8;
    if (this.boss && !this.boss.dead) maxX = Math.min(maxX, this.boss.wallX - 6);
    p.x = clamp(p.x, minX, maxX);

    // Dikey
    if (!p.swim) {
      if (p.onGround) {
        // Zemin hâlâ altta mı
        const ty = Math.floor(p.y / T);
        if (!this.platRow(ty, p.x - 4, p.x + 4) || p.y % T !== 0) { p.onGround = false; p.vy = 0; }
      }
      if (!p.onGround) {
        const r = this.fall(p, p.dropY);
        if (r === 'ground') { p.onGround = true; p.ball = false; p.dropY = -1; }
        else if (r === 'water') {
          p.swim = true; p.ball = false; p.onGround = false; p.y += 9; p.vy = 0; p.dropY = -1;
          this.splash(p.x, p.y - 8);
        }
        if (p.dropY >= 0 && p.y > p.dropY + T) p.dropY = -1;
      }
    }
    if (p.y > SH + 24) { this.killPlayer(true); return; }

    if (p.onGround && p.vx !== 0) p.anim += 0.14;
    // Ateş
    if (c.held('a') && !p.dive) this.tryFire();
    p.pose = this.calcPose();
  }

  // Ayak hizasının hemen üstünde, altı dolu bir zemin karosu (uçurum kenarı) var mı
  cliffAt(tx, y) {
    for (let ty = Math.floor((y - 24) / T); ty <= Math.floor((y - 1) / T); ty++) {
      const top = ty * T;
      if (top < y && y - top <= 22 && this.isPlat(tx, ty) && 'r=M'.includes(this.tile(tx, ty + 1))) return true;
    }
    return false;
  }

  // Altta inilecek bir platform ya da su var mı
  canDrop(p) {
    const ty = Math.floor(p.y / T);
    for (let r = ty + 1; r < ROWS; r++) {
      if (this.platRow(r, p.x - 4, p.x + 4) || this.waterRow(r, p.x)) return true;
    }
    return false;
  }

  fallOk(p) {
    const ty = Math.floor(p.y / T);
    return this.platRow(ty, p.x - 4, p.x + 4) && p.y - ty * T < 6;
  }

  calcPose() {
    const p = this.p;
    if (p.swim) return p.dive ? 'dive' : 'swim';
    if (p.ball) return 'ball';
    if (p.prone) return 'prone';
    if (p.ax === 0 && p.ay < 0) return 'up';
    if (p.ay < 0) return p.vx ? 'runUp' : 'diagup';
    if (p.ay > 0) return p.vx ? 'runDn' : 'diagdn';
    return p.vx ? 'run' : 'stand';
  }

  muzzle() {
    const p = this.p;
    const d = p.dir;
    let ax = p.ax;
    let ay = p.ay;
    if (!ax && !ay) ax = d;
    let ox;
    let oy;
    if (p.ball) { ox = ax * 8; oy = -18 + ay * 8; }
    else if (p.prone) { ox = d * 15; oy = -6; ax = d; ay = 0; }
    else if (p.swim) { ox = ax * 12; oy = ay < 0 ? -22 : -12; }
    else if (ax === 0 && ay < 0) { ox = d * 1; oy = -40; }
    else if (ay < 0) { ox = ax * 11; oy = -35; }
    else if (ay > 0 && ax !== 0) { ox = ax * 11; oy = -17; }
    else if (ay > 0) { ox = 0; oy = -10; }
    else { ox = ax * 14; oy = -25; }
    return { x: p.x + ox, y: p.y + oy, ax, ay };
  }

  tryFire() {
    const p = this.p;
    if (p.cd > 0) return;
    const w = p.weapon;
    const myBullets = this.pb.length;
    const rate = { N: 11, M: 6, S: 15, L: 18, R: 11 }[w] || 11;
    const max = { N: 4, M: 7, S: 10, L: 1, R: 5 }[w] || 4;
    if (w !== 'L' && w !== 'S' && myBullets >= max) return;
    if (w === 'S' && myBullets > 6) return;
    const m = this.muzzle();
    const len = Math.hypot(m.ax, m.ay) || 1;
    const ux = m.ax / len;
    const uy = m.ay / len;
    const spd = (w === 'L' ? 6 : w === 'S' ? 3.6 : w === 'M' ? 4.4 : 4) * (p.rapid ? 1.5 : 1);
    if (w === 'S') {
      const base = Math.atan2(uy, ux);
      for (const da of [-0.32, -0.16, 0, 0.16, 0.32]) {
        const a = base + da;
        this.pb.push({ x: m.x, y: m.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, k: 'S', t: 0, dmg: 1 });
      }
      this.api.sfx.tone(700, 0.08, { slide: 200, vol: 0.07 });
    } else if (w === 'L') {
      this.pb = this.pb.filter((b) => b.k !== 'L');
      this.pb.push({ x: m.x, y: m.y, vx: ux * spd, vy: uy * spd, k: 'L', t: 0, dmg: 2, hits: new Set() });
      this.api.sfx.play('laser');
    } else {
      this.pb.push({ x: m.x, y: m.y, vx: ux * spd, vy: uy * spd, k: w, t: 0, dmg: 1 });
      this.api.sfx.tone(w === 'M' ? 1100 : 900, 0.05, { slide: 300, vol: 0.06 });
    }
    p.cd = Math.round(rate * (p.rapid ? 0.7 : 1));
    p.fireAnim = 6;
  }

  killPlayer(fell = false) {
    const p = this.p;
    if (p.dead || this.preview) return;
    if (!fell && p.inv > 0) return;
    p.dead = true;
    p.deadT = 0;
    p.vx = -p.dir * 1.2;
    p.vy = fell ? 0 : -3.5;
    p.ball = false;
    p.swim = false;
    this.api.sfx.play('die');
    if (fell) p.deadT = 40;
  }

  respawn() {
    this.lives--;
    if (this.lives <= 0) {
      this.mode = 'gameover';
      this.modeT = 0;
      return;
    }
    // Ekranda zemin olan ilk sütunu bul
    let x = this.camX + 40;
    for (let cx = this.camX + 32; cx < this.camX + 220; cx += 8) {
      let ok = false;
      for (let ty = 3; ty < ROWS; ty++) if (this.platRow(ty, cx - 4, cx + 4)) { ok = true; break; }
      if (ok) { x = cx; break; }
    }
    const p = this.newPlayer(x, -10);
    p.onGround = false;
    p.ball = false;
    this.p = p;
  }

  splash(x, y) {
    this.fx.push({ k: 'splash', x, y, t: 0 });
    this.api.sfx.noise(0.2, { vol: 0.12, freq: 1500 });
  }

  // ---------------------------------------------------------------- düşmanlar
  spawnCheck() {
    const edge = this.camX + SW + 32;
    while (this.spawns.length && this.spawns[0].x < edge) {
      const s = this.spawns.shift();
      this.spawnEnt(s);
    }
  }

  spawnEnt(s) {
    const x = s.tx * T + 8;
    const y = (s.ty + 1) * T;
    const L = this.loop;
    switch (s.c) {
      case 'S': this.ents.push({ k: 'rifle', x, y, hp: 1, t: 0, cd: 60, dir: -1, ax: -1, ay: 0 }); break;
      case 'H': this.ents.push({ k: 'bush', x, y, hp: 1, t: 0, cd: 0, up: 0, dir: -1, ax: -1, ay: 0 }); break;
      case 'T': this.ents.push({ k: 'turret', x, y: s.ty * T + 8, hp: 8 + L * 2, t: 0, ang: 6, open: 0, cd: 60 }); break;
      case 'C': this.ents.push({ k: 'cannon', x, y, hp: 10 + L * 2, t: 0, rise: 0, ang: 0, cd: 80 }); break;
      case 'P': this.ents.push({ k: 'pill', x, y, hp: 4, t: 0, open: false, w: WEAPON_SEQ[this.weaponIdx++ % WEAPON_SEQ.length] }); break;
      case 'G': this.ents.push({ k: 'gren', x, y, hp: 1, t: 0, cd: 80, dir: -1 }); break;
      case 'F': this.ents.push({ k: 'capsule', x: this.camX - 20, y: 56 + (s.tx % 3) * 10, oy: 56 + (s.tx % 3) * 10, hp: 1, t: 0, w: WEAPON_SEQ[this.weaponIdx++ % WEAPON_SEQ.length] }); break;
      case 'X': this.makeBoss(s); break;
      default: break;
    }
  }

  // Koşan askerler ekran kenarından gelir
  updateRunners() {
    if (this.boss && this.camX >= this.maxCam - 1) return;
    if (--this.runnerT > 0) return;
    this.runnerT = Math.round((60 + Math.random() * 90) / this.mul);
    const fromLeft = this.camX > 64 && Math.random() < 0.25;
    const x = fromLeft ? this.camX - 8 : this.camX + SW + 8;
    const tx = Math.floor(x / T);
    const tops = [];
    for (let ty = 2; ty < ROWS; ty++) if (this.isPlat(tx, ty) && !this.isPlat(tx, ty - 1)) tops.push(ty * T);
    if (!tops.length) return;
    const y = tops[Math.floor(Math.random() * tops.length)];
    const n = Math.random() < 0.3 + this.loop * 0.15 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      this.ents.push({
        k: 'runner', x: x + (fromLeft ? -i * 18 : i * 18), y, vy: 0, dir: fromLeft ? 1 : -1, hp: 1, t: 0, onGround: true,
        shoots: Math.random() < 0.2 + this.loop * 0.15, shot: false, anim: Math.random() * 4,
      });
    }
  }

  aimAt(x, y, spd) {
    const p = this.p;
    const tx = p.x;
    const ty = p.y - (p.prone ? 5 : p.swim ? 8 : 18);
    const d = Math.hypot(tx - x, ty - y) || 1;
    return { vx: (tx - x) / d * spd, vy: (ty - y) / d * spd };
  }

  enemyShoot(x, y, vx, vy) {
    if (x < this.camX - 8 || x > this.camX + SW + 8) return;
    this.eb.push({ x, y, vx, vy, t: 0 });
  }

  updateEnts() {
    const p = this.p;
    const m = this.mul;
    for (const e of this.ents) {
      e.t++;
      if (e.dying) {
        e.dying++;
        if (e.k === 'runner' || e.k === 'rifle' || e.k === 'gren' || e.k === 'bush') { e.x += e.dvx || 0; e.y += e.dvy || 0; e.dvy = (e.dvy || 0) + 0.2; }
        if (e.dying > 30) e.gone = true;
        continue;
      }
      switch (e.k) {
        case 'runner': this.updateRunner(e, m); break;
        case 'rifle': {
          e.dir = p.x < e.x ? -1 : 1;
          const dy = (p.y - 16) - (e.y - 24);
          const dx = Math.abs(p.x - e.x);
          e.ay = dy < -dx * 0.5 ? -1 : dy > dx * 0.5 ? 1 : 0;
          if (--e.cd <= 0 && this.onScreen(e.x)) {
            e.cd = Math.round((90 + Math.random() * 50) / m);
            const shots = 1 + (this.loop > 0 && Math.random() < 0.5 ? 1 : 0);
            for (let i = 0; i < shots; i++) {
              const mx = e.x + e.dir * 13;
              const my = e.y + (e.ay < 0 ? -34 : e.ay > 0 ? -16 : -25);
              const v = 1.4 * m;
              const len = Math.hypot(1, e.ay);
              this.enemyShoot(mx - e.dir * i * 10, my - e.ay * i * 10, e.dir / len * v, e.ay / len * v);
            }
          }
          break;
        }
        case 'bush': {
          // Gizlenir, kalkar, ateş eder
          const cyc = e.t % 200;
          e.up = cyc > 110 ? 1 : 0;
          e.dir = p.x < e.x ? -1 : 1;
          if (cyc === 140 && this.onScreen(e.x)) {
            const v = this.aimAt(e.x + e.dir * 10, e.y - 18, 1.5 * m);
            this.enemyShoot(e.x + e.dir * 10, e.y - 18, v.vx, v.vy);
          }
          break;
        }
        case 'turret': {
          if (!this.onScreen(e.x)) break;
          if (e.open < 20) { e.open++; break; }
          const want = this.angIndex(p.x - e.x, (p.y - 16) - e.y);
          if (e.t % 14 === 0 && want !== e.ang) {
            const diff = (want - e.ang + 12) % 12;
            e.ang = (e.ang + (diff < 6 ? 1 : 11)) % 12;
          }
          if (--e.cd <= 0) {
            e.cd = Math.round((70 + Math.random() * 40) / m);
            if (want === e.ang || Math.random() < 0.3) {
              const a = e.ang * Math.PI / 6;
              const v = 1.5 * m;
              this.enemyShoot(e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14, Math.cos(a) * v, Math.sin(a) * v);
            }
          }
          break;
        }
        case 'cannon': {
          if (!this.onScreen(e.x)) break;
          if (e.rise < 24) { e.rise++; break; }
          const dx = p.x - e.x;
          const dy = (p.y - 16) - (e.y - 14);
          // Sadece sola, sol-yukarı ve daha dik nişan alabilir
          e.ang = dx >= 0 ? 0 : dy < dx * 1.2 ? 2 : dy < dx * 0.3 ? 1 : 0;
          if (--e.cd <= 0) {
            e.cd = Math.round((80 + Math.random() * 40) / m);
            if (dx < 0) {
              const a = Math.PI + e.ang * Math.PI / 6;
              const v = 1.6 * m;
              this.enemyShoot(e.x + Math.cos(a) * 16, e.y - 14 + Math.sin(a) * 16, Math.cos(a) * v, Math.sin(a) * v);
              this.fx.push({ k: 'flash', x: e.x + Math.cos(a) * 16, y: e.y - 14 + Math.sin(a) * 16, t: 0 });
            }
          }
          break;
        }
        case 'pill':
          e.open = (e.t % 220) > 120;
          break;
        case 'gren': {
          e.dir = p.x < e.x ? -1 : 1;
          if (--e.cd <= 0 && this.onScreen(e.x)) {
            e.cd = Math.round((100 + Math.random() * 40) / m);
            const dx = clamp((p.x - e.x) / 60, -2.2, 2.2);
            this.ents.push({ k: 'grenade', x: e.x + e.dir * 6, y: e.y - 30, vx: dx, vy: -3.2, g: 0.12, t: 0, hp: 99 });
          }
          break;
        }
        case 'grenade': {
          e.x += e.vx;
          const r = this.fall(e);
          if (r || e.t > 160) { e.gone = true; this.boom(e.x, e.y - 4, 1.2, true); }
          break;
        }
        case 'capsule':
          e.x += 1.3;
          e.y = e.oy + Math.sin(e.t * 0.06) * 18;
          if (e.x > this.camX + SW + 30) e.gone = true;
          break;
        case 'item': {
          if (!e.landed) {
            e.x += e.vx;
            const r = this.fall(e);
            if (r === 'ground') { e.landed = true; }
            if (r === 'water') { e.landed = true; e.y -= 4; }
            if (e.y > SH + 20) e.gone = true;
          }
          if (e.x < this.camX - 30) e.gone = true;
          break;
        }
        case 'shell': {
          e.x += e.vx;
          e.y += e.vy;
          e.vy += 0.06;
          if (e.y > SH || this.platRow(Math.floor(e.y / T), e.x - 2, e.x + 2) && e.vy > 0) { e.gone = true; this.boom(e.x, e.y - 4, 1, true); }
          break;
        }
        case 'bosspart': this.updateBossPart(e); break;
        default: break;
      }
      // Kameranın gerisinde kalanlar
      if (e.k !== 'bosspart' && e.x < this.camX - 48) e.gone = true;
    }
    // Oyuncuya temas
    const box = this.playerBox();
    if (box && this.mode === 'play') {
      for (const e of this.ents) {
        if (e.gone || e.dying) continue;
        if (e.k === 'item') {
          if (overlap(box, { x: e.x - 12, y: e.y - 14, w: 24, h: 14 })) {
            e.gone = true;
            if (e.w === 'R') this.p.rapid = true;
            else this.p.weapon = e.w;
            this.api.sfx.play('power');
            this.api.addScore(1000);
            this.fx.push({ k: 'text', x: e.x, y: e.y - 20, t: 0, text: WEAPON_NAMES[e.w] });
          }
          continue;
        }
        if (e.k === 'runner' || e.k === 'gren' || (e.k === 'rifle')) {
          if (overlap(box, { x: e.x - 5, y: e.y - 28, w: 10, h: 28 })) this.killPlayer();
        }
      }
    }
    this.ents = this.ents.filter((e) => !e.gone);
  }

  onScreen(x) { return x > this.camX - 8 && x < this.camX + SW + 8; }

  angIndex(dx, dy) {
    let a = Math.atan2(dy, dx);
    if (a < 0) a += Math.PI * 2;
    return Math.round(a / (Math.PI / 6)) % 12;
  }

  updateRunner(e, m) {
    e.anim += 0.15 * m;
    const sp = 1.1 * m;
    if (e.stop > 0) {
      e.stop--;
      if (e.stop === 12) {
        const v = this.aimAt(e.x + e.dir * 12, e.y - 25, 1.5 * m);
        this.enemyShoot(e.x + e.dir * 12, e.y - 25, v.vx, v.vy);
      }
      return;
    }
    e.x += e.dir * sp;
    if (e.onGround) {
      const ty = Math.floor(e.y / T);
      if (!this.platRow(ty, e.x - 3, e.x + 3)) {
        // Kenar: bazen zıplar, bazen düşer
        if (Math.random() < 0.5) { e.vy = -3.6; e.jumped = true; }
        e.onGround = false;
      }
    }
    if (!e.onGround) {
      const r = this.fall(e);
      if (r === 'ground') e.onGround = true;
      else if (r === 'water') { e.gone = true; this.splash(e.x, e.y); }
    }
    if (e.shoots && !e.shot && e.onGround && Math.abs(e.x - this.p.x) < 110 && Math.sign(this.p.x - e.x) === e.dir && this.onScreen(e.x)) {
      e.shot = true;
      e.stop = 24;
    }
    if (e.y > SH + 20 || e.x > this.camX + SW + 40) e.gone = true;
  }

  // ---------------------------------------------------------------- köprüler
  updateBridges() {
    const p = this.p;
    for (const b of this.bridges) {
      if (b.next > b.x1) continue;
      if (!b.on && p.x > b.x0 * T - 20 && !p.dead) b.on = true;
      if (!b.on) continue;
      if (++b.t % 22 === 0) {
        const tx = b.next++;
        this.map[b.ty][tx] = '.';
        this.boom(tx * T + 8, b.ty * T + 6, 1.4, false);
        this.api.sfx.play('explode');
      }
    }
  }

  // ---------------------------------------------------------------- boss
  makeBoss(s) {
    const bx = s.tx * T;
    const by = (s.ty + 1) * T;
    const L = this.loop;
    const kind = this.st.boss;
    this.boss = { kind, bx, by, wallX: bx - 4, dead: false, t: 0, deathT: 0 };
    if (kind === 1) {
      this.ents.push({ k: 'bosspart', part: 'core', x: bx + 6, y: by - 60, w: 28, h: 36, hp: 30 + L * 8, t: 0, flash: 0 });
      this.ents.push({ k: 'bosspart', part: 'gun', x: bx + 8, y: by - 116, w: 18, h: 12, hp: 8 + L * 2, t: 0, cd: 60, flash: 0 });
      this.ents.push({ k: 'bosspart', part: 'gun', x: bx + 40, y: by - 116, w: 18, h: 12, hp: 8 + L * 2, t: 0, cd: 110, flash: 0 });
      this.ents.push({ k: 'bosspart', part: 'sniperSpot', x: bx + 88, y: by - 128, w: 0, h: 0, hp: 9999, t: 0, cd: 0 });
    } else {
      this.ents.push({ k: 'bosspart', part: 'eye', x: bx + 14, y: by - 84, w: 32, h: 32, hp: 40 + L * 10, t: 0, flash: 0 });
      this.ents.push({ k: 'bosspart', part: 'tgun', x: bx + 20, y: by - 132, w: 24, h: 24, hp: 12 + L * 2, t: 0, cd: 50, ang: 6, flash: 0 });
      this.ents.push({ k: 'bosspart', part: 'tgun', x: bx + 76, y: by - 108, w: 24, h: 24, hp: 12 + L * 2, t: 0, cd: 90, ang: 6, flash: 0 });
      this.ents.push({ k: 'bosspart', part: 'door', x: bx + 64, y: by - 40, w: 0, h: 0, hp: 9999, t: 0, cd: 100 });
    }
  }

  bossActive() { return this.boss && !this.boss.dead && this.camX >= this.maxCam - 1; }

  updateBossPart(e) {
    if (e.flash > 0) e.flash--;
    if (!this.bossActive()) return;
    const m = this.mul;
    const p = this.p;
    switch (e.part) {
      case 'gun':
        if (--e.cd <= 0) {
          e.cd = Math.round((100 + Math.random() * 60) / m);
          const dx = clamp((p.x - (e.x + 4)) / 70, -2.5, -0.4);
          this.ents.push({ k: 'shell', x: e.x + 2, y: e.y + 4, vx: dx, vy: -2.2, t: 0, hp: 99 });
          this.api.sfx.tone(200, 0.1, { vol: 0.1 });
        }
        break;
      case 'sniperSpot':
        if (!this.ents.some((o) => o.k === 'rifle' && o.boss) && ++e.cd > 200) {
          e.cd = 0;
          this.ents.push({ k: 'rifle', boss: true, x: e.x, y: e.y, hp: 1, t: 0, cd: 60, dir: -1, ax: -1, ay: 0 });
        }
        break;
      case 'eye':
        e.open = (e.t % 200) < 120;
        if (e.open && e.t % 200 === 60) {
          for (const a of [-0.35, 0, 0.35]) {
            const v = this.aimAt(e.x + 16, e.y + 16, 1.4 * m);
            const ang = Math.atan2(v.vy, v.vx) + a;
            this.enemyShoot(e.x + 8, e.y + 16, Math.cos(ang) * 1.4 * m, Math.sin(ang) * 1.4 * m);
          }
        }
        break;
      case 'tgun': {
        const cx = e.x + 12;
        const cy = e.y + 12;
        const want = this.angIndex(p.x - cx, (p.y - 16) - cy);
        if (e.t % 12 === 0 && want !== e.ang) {
          const diff = (want - e.ang + 12) % 12;
          e.ang = (e.ang + (diff < 6 ? 1 : 11)) % 12;
        }
        if (--e.cd <= 0) {
          e.cd = Math.round((60 + Math.random() * 40) / m);
          const a = e.ang * Math.PI / 6;
          this.enemyShoot(cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, Math.cos(a) * 1.7 * m, Math.sin(a) * 1.7 * m);
        }
        break;
      }
      case 'door':
        if (++e.cd > Math.round(170 / m)) {
          e.cd = 0;
          this.ents.push({ k: 'runner', x: e.x, y: e.y + 40, vy: 0, dir: -1, hp: 1, t: 0, onGround: true, shoots: Math.random() < 0.5, shot: false, anim: 0 });
        }
        break;
      default: break;
    }
  }

  bossDestroyed() {
    const b = this.boss;
    b.dead = true;
    for (const e of this.ents) {
      if (e.k === 'bosspart' || e.k === 'rifle' || e.k === 'runner' || e.k === 'shell') { e.gone = true; }
    }
    this.eb = [];
    this.api.addScore(10000);
    this.api.sfx.play('bigexplode');
    this.mode = 'clear';
    this.modeT = 0;
  }

  updateClear() {
    const b = this.boss;
    if (this.modeT < 150 && this.modeT % 6 === 0) {
      this.boom(b.bx + Math.random() * 120, b.by - Math.random() * 130, 1.5 + Math.random(), false);
      if (this.modeT % 18 === 0) this.api.sfx.play('explode');
    }
    if (this.modeT === 160) this.api.sfx.seq([['C5', 0.15], ['E5', 0.15], ['G5', 0.15], ['C6', 0.3], ['G5', 0.15], ['C6', 0.5]], { vol: 0.1 });
    const p = this.p;
    if (p.dead) { if (p.deadT < 100) p.deadT++; }
    else if (this.modeT > 160) {
      // Kalenin içine koş
      p.vx = SPEED;
      p.x += p.vx;
      p.anim += 0.14;
      p.ax = 1; p.ay = 0; p.dir = 1; p.prone = false;
      if (!p.onGround) { const r = this.fall(p); if (r === 'ground') { p.onGround = true; p.ball = false; } }
      p.pose = p.ball ? 'ball' : 'run';
    }
    this.updateFx();
    if (this.modeT > 360) {
      this.stage++;
      const keep = this.p;
      this.loadStage();
      if (!keep.dead) { this.p.weapon = keep.weapon; this.p.rapid = keep.rapid; }
      this.mode = 'intro';
      this.modeT = 0;
    }
  }

  // ---------------------------------------------------------------- mermiler
  updateBullets() {
    // Oyuncu mermileri
    for (const b of this.pb) {
      b.t++;
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < this.camX - 8 || b.x > this.camX + SW + 8 || b.y < -8 || b.y > SH + 8) { b.gone = true; continue; }
      for (const e of this.ents) {
        if (e.gone || e.dying) continue;
        const box = this.entBox(e);
        if (!box) continue;
        const pts = b.k === 'L' ? [[b.x, b.y], [b.x - b.vx * 2, b.y - b.vy * 2], [b.x - b.vx * 4, b.y - b.vy * 4]] : [[b.x, b.y]];
        if (!pts.some(([x, y]) => hit(x, y, box))) continue;
        if (b.k === 'L') { if (b.hits.has(e)) continue; b.hits.add(e); }
        else b.gone = true;
        this.damage(e, b.dmg);
        if (!b.gone && b.k !== 'L') break;
        if (b.gone) break;
      }
    }
    this.pb = this.pb.filter((b) => !b.gone);

    // Düşman mermileri
    const box = this.playerBox();
    for (const b of this.eb) {
      b.t++;
      b.x += b.vx;
      b.y += b.vy;
      if (b.x < this.camX - 16 || b.x > this.camX + SW + 16 || b.y < -16 || b.y > SH + 16 || b.t > 400) { b.gone = true; continue; }
      if (box && this.mode === 'play' && hit(b.x, b.y, { x: box.x - 1, y: box.y - 1, w: box.w + 2, h: box.h + 2 })) {
        b.gone = true;
        this.killPlayer();
      }
    }
    this.eb = this.eb.filter((b) => !b.gone);
    // Bomba / top patlamaları da öldürür
    if (box && this.mode === 'play') {
      for (const f of this.fx) {
        if (f.k === 'boom' && f.hurt && f.t < 10 && overlap(box, { x: f.x - 9, y: f.y - 9, w: 18, h: 18 })) this.killPlayer();
      }
    }
  }

  entBox(e) {
    switch (e.k) {
      case 'runner': case 'rifle': case 'gren': return { x: e.x - 6, y: e.y - 31, w: 12, h: 31 };
      case 'bush': return e.up ? { x: e.x - 7, y: e.y - 26, w: 14, h: 26 } : null;
      case 'turret': return e.open >= 20 ? { x: e.x - 13, y: e.y - 13, w: 26, h: 26 } : null;
      case 'cannon': return e.rise >= 24 ? { x: e.x - 14, y: e.y - 26, w: 28, h: 26 } : null;
      case 'pill': return e.open ? { x: e.x - 14, y: e.y - 30, w: 28, h: 30 } : null;
      case 'capsule': return { x: e.x - 11, y: e.y - 5, w: 22, h: 12 };
      case 'bosspart':
        if (!this.bossActive() || e.w === 0) return null;
        if (e.part === 'eye' && !e.open) return null;
        return { x: e.x, y: e.y, w: e.w, h: e.h };
      default: return null;
    }
  }

  // Kapalı hedeflere isabet: mermi sekip yok olur
  damage(e, dmg) {
    e.hp -= dmg;
    e.flash = 6;
    if (e.hp > 0) {
      this.api.sfx.tone(160, 0.04, { vol: 0.08 });
      return;
    }
    switch (e.k) {
      case 'runner': case 'rifle': case 'gren': case 'bush':
        e.dying = 1;
        e.dvx = -(e.dir || -1) * 0.8;
        e.dvy = -2.5;
        this.api.addScore(e.k === 'runner' ? 100 : 300);
        this.api.sfx.play('hit');
        break;
      case 'turret': case 'cannon': case 'pill':
        e.gone = true;
        this.boom(e.x, e.y - (e.k === 'turret' ? 0 : 14), 2, false);
        this.api.sfx.play('explode');
        this.api.addScore(500);
        if (e.k === 'turret') this.fx.push({ k: 'scar', x: e.x, y: e.y, t: 0, keep: true });
        if (e.k === 'pill') this.dropItem(e.x, e.y - 20, e.w);
        break;
      case 'capsule':
        e.gone = true;
        this.boom(e.x, e.y, 1.5, false);
        this.api.sfx.play('explode');
        this.api.addScore(500);
        this.dropItem(e.x, e.y, e.w);
        break;
      case 'bosspart':
        if (e.part === 'core' || e.part === 'eye') {
          this.boom(e.x + e.w / 2, e.y + e.h / 2, 3, false);
          this.bossDestroyed();
        } else {
          e.gone = true;
          this.boom(e.x + e.w / 2, e.y + e.h / 2, 2, false);
          this.api.sfx.play('explode');
          this.api.addScore(1000);
          this.fx.push({ k: 'scar', x: e.x + e.w / 2, y: e.y + e.h / 2, t: 0, keep: true });
        }
        break;
      default: break;
    }
  }

  dropItem(x, y, w) {
    this.ents.push({ k: 'item', x, y, vx: 0.7, vy: -3.5, g: 0.15, w, t: 0, landed: false });
  }

  boom(x, y, s, hurt) {
    this.fx.push({ k: 'boom', x, y, t: 0, s, hurt });
  }

  updateFx() {
    for (const f of this.fx) {
      f.t++;
      if (f.k === 'boom' && f.t > 24) f.gone = true;
      if ((f.k === 'splash' || f.k === 'flash') && f.t > 16) f.gone = true;
      if (f.k === 'text') { f.y -= 0.4; if (f.t > 70) f.gone = true; }
      if (f.k === 'scar' && f.x < this.camX - 40) f.gone = true;
    }
    this.fx = this.fx.filter((f) => !f.gone);
  }

  // ---------------------------------------------------------------- otomatik pilot (önizleme)
  botThink() {
    const p = this.p;
    const keys = new Set(['right', 'a']);
    const press = new Set();
    this.botT++;
    if (this.botT % 90 > 60) keys.add('up');
    if (p.onGround && !p.swim) {
      const ty = Math.floor(p.y / T);
      const aheadX = p.x + 18;
      if (!this.platRow(ty, aheadX - 2, aheadX + 2) && !this.waterRow(ty + 1, aheadX)) press.add('b');
    }
    if (this.botT % 120 === 0) press.add('b');
    this.botKeys = keys;
    this.botPress = press;
  }

  // ---------------------------------------------------------------- çizim
  draw() {
    const g = this.api.gfx;
    if ((this.mode === 'intro' && !this.firstFrame) || this.mode === 'gameover') {
      g.cls('#000');
      this.drawHud(g);
      if (this.mode === 'gameover') {
        g.text('OYUN BİTTİ', SW / 2, 110, '#e01800', { align: 'center', scale: 2 });
      } else {
        g.text(`BÖLÜM ${this.stage + 1}`, SW / 2, 84, '#fff', { align: 'center', scale: 2 });
        g.text(this.st.name, SW / 2, 110, '#f8b078', { align: 'center' });
        g.text(`CAN  ${this.lives}`, SW / 2, 140, '#fff', { align: 'center' });
        g.text(`REKOR ${String(Math.max(this.api.hiScore || 0, this.api.score)).padStart(6, '0')}`, SW / 2, 160, '#c8c8c8', { align: 'center' });
        if (this.loop > 0) g.text('DÜŞMAN DAHA GÜÇLÜ!', SW / 2, 186, '#e01800', { align: 'center' });
      }
      return;
    }
    const cam = Math.round(this.camX);
    this.drawBg(g, cam);
    this.drawTiles(g, cam);
    for (const f of this.fx) if (f.k === 'scar') this.drawFx(g, f, cam);
    if (this.boss) this.drawBoss(g, cam);
    for (const e of this.ents) this.drawEnt(g, e, cam);
    this.drawPlayer(g, cam);
    for (const b of this.pb) this.drawPBullet(g, b, cam);
    for (const b of this.eb) {
      const x = Math.round(b.x - cam);
      const y = Math.round(b.y);
      g.rect(x - 2, y - 1, 4, 2, '#ffe0e0');
      g.rect(x - 1, y - 2, 2, 4, '#ffe0e0');
      g.pset(x, y, '#e01800');
    }
    for (const f of this.fx) if (f.k !== 'scar') this.drawFx(g, f, cam);
    this.drawHud(g);
    if (this.mode === 'clear' && this.modeT > 150) {
      g.text('BÖLÜM TEMİZLENDİ!', SW / 2, 90, '#fff', { align: 'center', shadow: '#000' });
    }
  }

  drawBg(g, cam) {
    const f = this.api.frame;
    if (this.theme === 'jungle') {
      // Gece göğü
      const bands = ['#000010', '#00001c', '#000828', '#001034', '#081840'];
      for (let i = 0; i < bands.length; i++) g.rect(0, i * 24, SW, 24, bands[i]);
      g.rect(0, 120, SW, 120, '#081840');
      for (let i = 0; i < 30; i++) {
        const x = ((i * 89 + 7) % 320) - (cam * 0.05) % 320;
        g.pset((x + 320) % 320 - 32, 10 + (i * 37) % 90, i % 5 ? '#8090c0' : '#ffffff');
      }
      // Uzak orman siluetleri (yarı hız)
      const off = cam * 0.35;
      for (let k = Math.floor(off / 64) - 1; k <= Math.floor((off + SW) / 64) + 1; k++) {
        const x = k * 64 - off;
        const h = 18 + ((k * 7919) % 5) * 6;
        g.circ(x + 16, 120 - h, 22, '#04200c');
        g.circ(x + 46, 128 - h / 2, 20, '#04200c');
        g.rect(x, 128 - h / 2, 64, 120, '#04200c');
      }
      // Palmiyeler (3/4 hız)
      const off2 = cam * 0.7;
      for (let k = Math.floor(off2 / 96) - 1; k <= Math.floor((off2 + SW) / 96) + 1; k++) {
        const x = Math.round(k * 96 - off2 + ((k * 31) % 40));
        this.palm(g, x, 168, (k * 13) % 3);
      }
    } else {
      const bands = ['#3858a8', '#4868b8', '#5878c8', '#6888d0', '#7898d8', '#88a8e0', '#98b8e8'];
      for (let i = 0; i < bands.length; i++) g.rect(0, i * 18, SW, 18, bands[i]);
      g.rect(0, 126, SW, 114, '#a8c8f0');
      // Dağlar
      const off = cam * 0.2;
      for (let k = Math.floor(off / 128) - 1; k <= Math.floor((off + SW) / 128) + 1; k++) {
        const x = k * 128 - off;
        const h = 70 + ((k * 37) % 3) * 14;
        for (let i = 0; i < 128; i++) {
          const y = 180 - Math.max(0, h - Math.abs(i - 64) * h / 64);
          g.rect(x + i, y, 1, 200 - y, '#8098c0');
          if (180 - y > h - 22) g.rect(x + i, y, 1, 4 + ((i * 3) % 5), '#f0f4ff');
        }
      }
      // Çam ağaçları
      const off2 = cam * 0.55;
      for (let k = Math.floor(off2 / 48) - 1; k <= Math.floor((off2 + SW) / 48) + 1; k++) {
        const x = Math.round(k * 48 - off2 + ((k * 17) % 20));
        this.pine(g, x, 190 - ((k * 7) % 3) * 6);
      }
      // Kar taneleri
      for (let i = 0; i < 40; i++) {
        const x = ((i * 53 + f * (0.3 + (i % 3) * 0.2)) % 270) - 8;
        const y = (i * 71 + f * (0.6 + (i % 4) * 0.15)) % 250;
        g.pset(x, y, '#ffffff');
      }
    }
  }

  palm(g, x, base, v) {
    if (x < -40 || x > SW + 40) return;
    const h = 60 + v * 12;
    for (let i = 0; i < h; i += 4) g.rect(x + Math.round(Math.sin(i / 20) * 3), base - i, 5, 4, i % 8 ? '#3a2410' : '#5a3a18');
    const tx = x + Math.round(Math.sin(h / 20) * 3) + 2;
    const ty = base - h;
    for (const [dx, dy] of [[-18, 6], [18, 6], [-12, 12], [12, 12], [-20, -2], [20, -2], [0, -6]]) {
      g.line(tx, ty, tx + dx, ty + dy, '#0c5018');
      g.line(tx, ty + 1, tx + dx, ty + dy + 1, '#187828');
    }
    g.circ(tx, ty, 3, '#187828');
  }

  pine(g, x, base) {
    if (x < -20 || x > SW + 20) return;
    g.rect(x - 1, base - 6, 3, 8, '#3a2a20');
    for (let i = 0; i < 4; i++) {
      const w = 12 - i * 3;
      const y = base - 8 - i * 9;
      for (let j = 0; j < 10; j++) g.rect(x - Math.round(w * (j / 10)), y - 10 + j, Math.round(w * (j / 10)) * 2 + 1, 1, '#1c4030');
      g.rect(x - Math.round(w * 0.4), y - 4, Math.round(w * 0.8), 1, '#e8f0f8');
    }
  }

  drawTiles(g, cam) {
    const ts = this.ts;
    const f = this.api.frame;
    const x0 = Math.floor(cam / T);
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = x0; tx <= x0 + 16; tx++) {
        const c = this.tile(tx, ty);
        if (c === '.') continue;
        const x = tx * T - cam;
        const y = ty * T;
        switch (c) {
          case 'r': g.sprite(ts.rock, x, y); break;
          case '=': g.sprite(ts.top, x, y); break;
          case '~': g.sprite(ts.water[Math.floor(f / 16 + tx) % 2], x, y); break;
          case 'w': g.sprite(ts.deep, x, y); break;
          case 'b': g.sprite(ts.bridge, x, y); break;
          case 'm': g.sprite(ts.metal, x, y); break;
          case 'M': g.sprite(ts.wall, x, y); break;
          default: break;
        }
      }
    }
  }

  drawBoss(g, cam) {
    const b = this.boss;
    const x = b.bx - cam;
    const y = b.by;
    if (x > SW + 8) return;
    if (b.kind === 1) {
      // Taş/metal duvar
      g.rect(x, y - 136, 128, 136, '#40382c');
      for (let r = 0; r < 17; r++) {
        for (let c = 0; c < 8; c++) {
          const ox = (r % 2) * 8;
          g.rect(x + c * 16 + ox, y - 136 + r * 8, 15, 7, r % 3 === 0 ? '#6a5a40' : '#5a4c36');
        }
      }
      g.rect(x, y - 136, 128, 4, '#8a7a58');
      g.rect(x - 4, y - 124, 72, 6, '#707070');
      g.rect(x + 2, y - 72, 36, 72, '#202020');
      g.rect(x + 2, y - 72, 36, 3, '#909090');
      for (let i = 0; i < 4; i++) g.rect(x + 80, y - 110 + i * 26, 30, 16, '#303030');
      for (let i = 0; i < 4; i++) g.rect(x + 82, y - 108 + i * 26, 26, 3, '#e01800');
    } else {
      g.rect(x - 8, y - 160, 136, 160, '#2a3240');
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 8; c++) g.sprite(this.ts.wall, x - 8 + c * 16, y - 160 + r * 16);
      }
      for (let r = 1; r < 10; r += 3) g.rect(x - 8, y - 160 + r * 16, 136, 2, '#1a2028');
      g.rect(x - 8, y - 160, 136, 6, '#e8c020');
      for (let i = 0; i < 17; i++) g.rect(x - 8 + i * 8, y - 160, 4, 6, '#202020');
      g.rect(x + 56, y - 44, 40, 44, '#101010');
      g.rect(x + 56, y - 44, 40, 4, '#e8c020');
    }
  }

  drawEnt(g, e, cam) {
    const f = this.api.frame;
    const x = Math.round(e.x - cam);
    const y = Math.round(e.y);
    if (x < -48 || x > SW + 48) return;
    const flick = e.dying && e.dying % 4 < 2;
    switch (e.k) {
      case 'runner': {
        if (flick) break;
        const set = this.th.soldier;
        let spr;
        if (e.dying) spr = set.lying;
        else if (e.stop > 0) spr = set.stand;
        else if (!e.onGround && e.jumped) spr = set.ball[Math.floor(e.t / 4) % 4];
        else spr = set.runArms[Math.floor(e.anim) % 4];
        this.drawChar(g, spr, x, y, e.dir, e.dying);
        break;
      }
      case 'rifle': {
        if (flick) break;
        const spr = e.dying ? RIFLEMAN.lying : e.ay < 0 ? RIFLEMAN.diagup : e.ay > 0 ? RIFLEMAN.diagdn : RIFLEMAN.stand;
        this.drawChar(g, spr, x, y, e.dir, e.dying);
        break;
      }
      case 'gren': {
        if (flick) break;
        const spr = e.dying ? RIFLEMAN.lying : (e.cd > 80 ? RIFLEMAN.up : RIFLEMAN.stand);
        this.drawChar(g, spr, x, y, e.dir, e.dying);
        break;
      }
      case 'bush': {
        if (e.up && !flick) {
          const spr = e.dying ? RIFLEMAN.lying : RIFLEMAN.stand;
          this.drawChar(g, spr, x, y + (e.dying ? 0 : 4), e.dir, e.dying);
        }
        const [c1, c2, c3] = this.th.bush;
        g.circ(x - 8, y - 6, 7, c3);
        g.circ(x + 8, y - 6, 7, c3);
        g.circ(x, y - 10, 8, c3);
        g.circ(x - 8, y - 6, 6, c1);
        g.circ(x + 8, y - 6, 6, c1);
        g.circ(x, y - 10, 7, c1);
        g.circ(x - 2, y - 12, 3, c2);
        g.circ(x - 9, y - 8, 2, c2);
        g.rect(x - 14, y - 4, 28, 4, c1);
        break;
      }
      case 'turret': {
        g.rect(x - 14, y - 14, 28, 28, '#303030');
        g.rect(x - 13, y - 13, 26, 26, '#585858');
        for (const [dx, dy] of [[-11, -11], [9, -11], [-11, 9], [9, 9]]) g.rect(x + dx, y + dy, 2, 2, '#a0a0a0');
        if (e.open < 20) {
          const o = Math.floor(e.open / 2);
          g.rect(x - 10, y - 10, 20, 20, '#404040');
          g.rect(x - 10, y - 1 - o, 20, 2, '#909090');
          break;
        }
        g.circ(x, y, 10, e.flash ? '#ffffff' : '#9a9a9a');
        g.circ(x, y, 7, e.flash ? '#ffd0d0' : '#c84020');
        const a = e.ang * Math.PI / 6;
        const ex = x + Math.cos(a) * 15;
        const ey = y + Math.sin(a) * 15;
        for (let i = -1; i <= 1; i++) g.line(x + (Math.abs(Math.sin(a)) > 0.5 ? i : 0), y + (Math.abs(Math.sin(a)) > 0.5 ? 0 : i), ex, ey, '#e0e0e0');
        g.circ(x, y, 3, '#303030');
        break;
      }
      case 'cannon': {
        const r = e.rise;
        const by = y + 24 - r;
        g.rect(x - 14, by - 14, 28, 14, '#404850');
        g.rect(x - 14, by - 14, 28, 2, '#8090a0');
        if (r >= 12) {
          g.circ(x, by - 14, 9, e.flash ? '#ffffff' : '#607080');
          const a = Math.PI + e.ang * Math.PI / 6;
          for (let i = -1; i <= 1; i++) g.line(x, by - 14 + i, x + Math.cos(a) * 18, by - 14 + Math.sin(a) * 18 + i, '#202830');
        }
        g.rect(x - 16, y - 2, 32, 2, '#202020');
        break;
      }
      case 'pill': {
        g.rect(x - 15, y - 31, 30, 31, '#303840');
        g.rect(x - 14, y - 30, 28, 29, '#6878a0');
        if (e.open) {
          g.rect(x - 10, y - 26, 20, 20, '#101010');
          g.sprite(FALCON, x - 12, y - 23, {});
          if (f % 8 < 4) g.circ(x, y - 16, 3, '#ffffff');
        } else {
          const o = e.t % 220 > 100 ? Math.min(10, (e.t % 220) - 100) : 0;
          g.rect(x - 10, y - 26, 20, 20, '#4a5878');
          g.line(x - 10, y - 26, x + 9, y - 7, '#2a3240');
          g.line(x + 9, y - 26, x - 10, y - 7, '#2a3240');
          if (o) g.rect(x - 10, y - 17 - o / 2, 20, o, '#101010');
        }
        break;
      }
      case 'capsule':
        g.sprite(CAPSULE[Math.floor(e.t / 6) % 2], x - 11, y - 5);
        break;
      case 'item': {
        const bob = e.landed ? 0 : 0;
        g.sprite(FALCON, x - 12, y - 14 + bob);
        g.rect(x - 4, y - 13, 9, 9, '#202020');
        g.text(e.w, x - 2, y - 12, f % 20 < 10 ? '#ffffff' : '#ffd800');
        break;
      }
      case 'grenade':
        g.circ(x, y - 3, 2, '#303030');
        g.pset(x, y - 6, '#e01800');
        break;
      case 'shell':
        g.circ(x, y, 3, '#e0e0e0');
        g.circ(x, y, 2, '#e01800');
        break;
      case 'bosspart': this.drawBossPart(g, e, x, y); break;
      default: break;
    }
  }

  drawBossPart(g, e, x, y) {
    const f = this.api.frame;
    const fl = e.flash > 0 && f % 2 === 0;
    switch (e.part) {
      case 'core': {
        const pulse = Math.floor(f / 6) % 3;
        g.rect(x, y, e.w, e.h, '#300000');
        g.rect(x + 2, y + 2, e.w - 4, e.h - 4, fl ? '#ffffff' : ['#b00000', '#e01800', '#ff5030'][pulse]);
        g.circ(x + e.w / 2, y + e.h / 2, 7, fl ? '#ffffff' : '#ffd0a0');
        g.circ(x + e.w / 2, y + e.h / 2, 4, '#ff8040');
        break;
      }
      case 'gun':
        g.rect(x, y, e.w, e.h, fl ? '#ffffff' : '#606060');
        g.rect(x - 8, y + 4, 10, 4, '#303030');
        g.rect(x + 2, y + 2, e.w - 4, 2, '#a0a0a0');
        break;
      case 'eye': {
        const open = e.open;
        g.circ(x + 16, y + 16, 17, '#101010');
        g.circ(x + 16, y + 16, 15, '#405060');
        if (open) {
          g.circ(x + 16, y + 16, 12, fl ? '#ffffff' : '#f0f0f0');
          const p = this.p;
          const a = Math.atan2(p.y - 20 - (y + 16), p.x - this.camX - (x + 16));
          g.circ(x + 16 + Math.cos(a) * 5, y + 16 + Math.sin(a) * 5, 6, '#e01800');
          g.circ(x + 16 + Math.cos(a) * 5, y + 16 + Math.sin(a) * 5, 2, '#101010');
        } else {
          g.rect(x + 2, y + 14, 28, 4, '#202830');
        }
        break;
      }
      case 'tgun': {
        const cx = x + 12;
        const cy = y + 12;
        g.rect(x, y, 24, 24, '#303030');
        g.circ(cx, cy, 10, fl ? '#ffffff' : '#808890');
        const a = e.ang * Math.PI / 6;
        for (let i = -1; i <= 1; i++) g.line(cx + (Math.abs(Math.sin(a)) > 0.5 ? i : 0), cy + (Math.abs(Math.sin(a)) > 0.5 ? 0 : i), cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, '#e0e0e0');
        g.circ(cx, cy, 4, '#e01800');
        break;
      }
      default: break;
    }
  }

  drawChar(g, spr, x, y, dir, dying) {
    if (dying) {
      g.sprite(spr, x - 16, y - spr.height, { flipX: dir < 0 });
      return;
    }
    const flip = dir < 0;
    g.sprite(spr, flip ? x - 15 : x - 9, y - spr.height, { flipX: flip });
  }

  drawPlayer(g, cam) {
    const p = this.p;
    const x = Math.round(p.x - cam);
    const y = Math.round(p.y);
    if (p.inv > 0 && !p.dead && Math.floor(p.inv / 3) % 2) return;
    const set = p.inv > 0 && p.inv < 150 && this.api.frame % 8 < 2 ? HERO_FLASH : HERO;
    if (p.dead) {
      if (p.deadT < 40) {
        g.sprite(set.ball[Math.floor(p.deadT / 5) % 4], x - 10, y - 26);
      } else if (p.deadT < 100) {
        g.sprite(set.lying, x - 16, y - 6, { flipX: p.dir < 0 });
      }
      return;
    }
    const d = p.dir;
    const frame = Math.floor(p.anim) % 4;
    switch (p.pose) {
      case 'ball': g.sprite(set.ball[Math.floor(this.api.frame / 4) % 4], x - 10, y - 28, { flipX: d < 0 }); break;
      case 'prone': g.sprite(set.prone, d < 0 ? x - 16 : x - 16, y - 10, { flipX: d < 0 }); break;
      case 'swim': case 'dive': {
        if (p.pose === 'swim') {
          const spr = set.swim[p.ax === 0 ? 2 : p.ay < 0 ? 1 : 0];
          g.sprite(spr, d < 0 ? x - 15 : x - 9, y - spr.height, { flipX: d < 0 });
        }
        const f = this.api.frame;
        g.rect(x - 9, y - 1, 18, 2, '#f0f8ff');
        if (f % 20 < 10) { g.pset(x - 11, y - 2, '#f0f8ff'); g.pset(x + 11, y - 2, '#f0f8ff'); }
        break;
      }
      default: {
        let spr;
        switch (p.pose) {
          case 'up': spr = set.up; break;
          case 'diagup': spr = set.diagup; break;
          case 'diagdn': spr = set.diagdn; break;
          case 'runUp': spr = set.runUp[frame]; break;
          case 'runDn': spr = set.runDn[frame]; break;
          case 'run': spr = set.run[frame]; break;
          default: spr = set.stand;
        }
        this.drawChar(g, spr, x, y, d, false);
      }
    }
    // Namlu ateşi
    if (p.fireAnim > 3) {
      const m = this.muzzle();
      g.circ(m.x - cam, m.y, 2, '#fff8c0');
    }
  }

  drawPBullet(g, b, cam) {
    const x = Math.round(b.x - cam);
    const y = Math.round(b.y);
    switch (b.k) {
      case 'S': {
        const r = Math.min(3, 1 + Math.floor(b.t / 6));
        g.circ(x, y, r, '#e01800');
        g.circ(x, y, Math.max(0, r - 1), '#ffb0a0');
        break;
      }
      case 'L': {
        const l = Math.hypot(b.vx, b.vy) || 1;
        const ux = b.vx / l;
        const uy = b.vy / l;
        g.line(x, y, x - ux * 22, y - uy * 22, '#60e8ff');
        g.line(x + (Math.abs(uy) > 0.5 ? 1 : 0), y + (Math.abs(uy) > 0.5 ? 0 : 1), x - ux * 22 + (Math.abs(uy) > 0.5 ? 1 : 0), y - uy * 22 + (Math.abs(uy) > 0.5 ? 0 : 1), '#ffffff');
        break;
      }
      case 'M':
        g.circ(x, y, 2, '#ffd800');
        g.pset(x, y, '#ffffff');
        break;
      default:
        g.rect(x - 1, y - 1, 3, 3, '#ffffff');
        g.pset(x, y, '#ffb0a0');
    }
  }

  drawFx(g, f, cam) {
    const x = Math.round(f.x - cam);
    const y = Math.round(f.y);
    switch (f.k) {
      case 'boom': {
        const s = f.s || 1;
        const t = f.t;
        if (t < 4) g.circ(x, y, 3 * s, '#ffffff');
        else if (t < 10) { g.circ(x, y, 6 * s, '#ffd800'); g.circ(x, y, 4 * s, '#ffffff'); }
        else if (t < 18) { g.circ(x, y, 8 * s, '#ff7000'); g.circ(x, y, 5 * s, '#ffd800'); }
        else { g.circ(x, y, 7 * s, '#a02000'); g.circ(x - 3 * s, y - 3 * s, 3 * s, '#505050'); g.circ(x + 3 * s, y - 2 * s, 3 * s, '#404040'); }
        break;
      }
      case 'splash':
        for (let i = -2; i <= 2; i++) g.rect(x + i * 4, y - f.t * 0.6 - Math.abs(i) * 2 + 8, 2, 3, '#f0f8ff');
        break;
      case 'flash':
        if (f.t < 6) g.circ(x, y, 4, '#fff0a0');
        break;
      case 'scar':
        g.circ(x, y, 9, '#202020');
        g.circ(x - 2, y - 1, 4, '#000000');
        break;
      case 'text':
        g.text(f.text, x, y, '#ffd800', { align: 'center', shadow: '#000' });
        break;
      default: break;
    }
  }

  drawHud(g) {
    const score = this.api.score;
    const hi = Math.max(this.api.hiScore || 0, score);
    const n = Math.min(6, Math.max(0, this.lives - (this.mode === 'intro' ? 0 : 1)));
    for (let i = 0; i < n; i++) g.sprite(MEDAL, 8 + i * 8, 6);
    g.text('1P', 8, 18, '#e01800', { shadow: '#000' });
    g.text(String(score).padStart(6, '0'), 22, 18, '#fff', { shadow: '#000' });
    g.text('REKOR', 100, 6, '#c8c8c8', { shadow: '#000' });
    g.text(String(hi).padStart(6, '0'), 100, 15, '#fff', { shadow: '#000' });
    g.text(`BÖLÜM ${this.stage + 1}`, SW - 8, 6, '#fff', { align: 'right', shadow: '#000' });
    const p = this.p;
    if (p && (p.weapon !== 'N' || p.rapid)) {
      const label = (p.weapon !== 'N' ? p.weapon : '') + (p.rapid ? '+R' : '');
      g.rect(SW - 8 - label.length * 6 - 3, 14, label.length * 6 + 3, 10, '#e01800');
      g.text(label, SW - 8, 16, '#fff', { align: 'right' });
    }
  }
}
