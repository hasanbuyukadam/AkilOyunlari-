// Süper Bıyık — Super Mario Bros. tarzı yandan kayan platform oyunu.
import {
  HERO, WALKER, KOOPA, PIRANHA, PODOBOO, BOSS, BOSS_FIRE, MUSHROOM, ONEUP, FLOWER, STAR,
  COIN, COIN_DIM, FIREBALL, PUFF, FLAG, CASTLE_FLAG, NPC, THEMES, buildTiles,
} from './art.js';
import { LEVELS, ROWS, buildArea } from './levels.js';

export const meta = {
  id: 'super-biyik',
  width: 256,
  height: 240,
  buttons: { a: 'ZIPLA', b: 'KOŞ / ATEŞ' },
  help: [
    'Düşmanların üstüne basarak onları ez. Kaplumbağa kabuğunu tekmele!',
    'Basılı tutarak daha yükseğe zıpla; B ile koş, ateş çiçeğiyle B ateş eder.',
    'Kutulara alttan vur: altın, mantar, çiçek, yıldız. 100 altın = 1 can.',
    'Aşağı ok ile bazı borulara girebilirsin. Bayrağa ne kadar yüksekten tutunursan o kadar puan.',
  ],
};

const T = 16;
const SW = 256;
const SH = 240;
const SOLID = new Set('#BXE?MCSPUO[]()qwst{T}G'.split(''));
const BUMPABLE = new Set('B?MCSPUhu'.split(''));
const MARKERS = new Set('@gkrfpvbNlnmj'.split(''));

// Fizik (piksel / kare), NES değerlerine yakın
const WALK_MAX = 1.5625;
const RUN_MAX = 2.5625;
const WALK_ACC = 0.037;
const RUN_ACC = 0.0557;
const RELEASE_DEC = 0.0508;
const SKID_DEC = 0.1016;
const MAX_FALL = 4.5;
const JUMP = [
  { v: -4, hold: 0.125, fall: 0.4375 },
  { v: -4, hold: 0.117, fall: 0.375 },
  { v: -5, hold: 0.156, fall: 0.5625 },
];
const STOMP_CHAIN = [100, 200, 400, 500, 800, 1000, 2000, 4000, 5000, 8000];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export default class SuperBiyik {
  constructor(api) {
    this.api = api;
    this.preview = !!api.preview;
    this.world = 1;
    this.lvl = 0;
    this.lives = 3;
    this.coins = 0;
    this.tileCache = {};
    this.p = this.newPlayer(false, false);
    this.botKeys = new Set();
    this.botPress = new Set();
    this.botJump = 0;
    const bot = {
      held: (b) => this.botKeys.has(b),
      pressed: (b) => this.botPress.has(b),
      get dx() { return 0; },
    };
    this.ctl = this.preview ? bot : api.input;
    this.loadLevel(false);
    this.mode = this.preview ? 'play' : 'intro';
    this.modeT = 0;
    this.firstFrame = true;
  }

  newPlayer(big, fire) {
    return {
      x: 0, y: 0, w: 12, h: big ? 32 : 16, vx: 0, vy: 0, dir: 1,
      big, fire, duck: false, onGround: false, onLift: null,
      jumpG: JUMP[0], jumpHeld: false, airMax: WALK_MAX,
      anim: 0, skid: false, inv: 0, star: 0, throwT: 0, chain: 0, hidden: false,
    };
  }

  // ------------------------------------------------------------------ yükleme
  get speedMul() { return Math.min(1.6, 1 + 0.15 * (this.world - 1)); }

  loadLevel(fromCheck) {
    this.level = LEVELS[this.lvl];
    this.time = this.world === 1 ? 400 : 300;
    if (this.lvl === 3) this.time = Math.min(this.time, 300);
    this.timeTick = 0;
    this.hurryPlayed = false;
    this.checkReached = fromCheck;
    this.loadArea('main', fromCheck ? { check: true } : { start: true });
  }

  tilesFor(theme) {
    if (!this.tileCache[theme]) this.tileCache[theme] = buildTiles(theme);
    return this.tileCache[theme];
  }

  loadArea(name, spec) {
    const A = this.level.areas[name] || this.level.areas.main;
    this.areaName = name;
    this.area = A;
    this.theme = A.theme;
    this.th = THEMES[A.theme];
    this.ts = this.tilesFor(A.theme);
    this.map = buildArea(A.chunks);
    this.cols = this.map[0].length;
    this.warps = A.warps || [];
    this.spawns = [];
    this.ents = [];
    this.fx = [];
    this.fires = [];
    this.bumps = [];
    this.multi = {};
    this.pole = null;
    this.castle = null;
    this.flagY = 0;
    this.castleFlag = 0;
    let start = { x: 32, y: 192 };
    let n = 0;
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < this.cols; tx++) {
        const c = this.map[ty][tx];
        if (MARKERS.has(c)) {
          this.map[ty][tx] = c === 'v' ? 'z' : '.';
          if (c === '@') start = { x: tx * T + 2, y: (ty + 1) * T };
          else {
            let kind = c;
            // Döngüde zorlaşma: bazı yürüyenler kaplumbağa, yeşiller kırmızı olur
            if (this.world >= 2 && c === 'g' && (n++ % 3 === 1)) kind = 'k';
            if (this.world >= 3 && kind === 'k' && (tx % 2 === 0)) kind = 'r';
            this.spawns.push({ c: kind, tx, ty, x: tx * T, y: (ty + 1) * T });
          }
        } else if (c === 'K') {
          this.map[ty][tx] = '.';
          this.castle = { x: tx * T, y: (ty + 1) * T - 80, door: tx * T + 40 };
        } else if (c === 'F' || (c === '|' && !this.pole)) {
          if (!this.pole) this.pole = { col: tx, x: tx * T + 7, top: ty * T + 8, base: 0 };
        } else if (c === 'O') {
          this.ents.push(this.mkFirebar(tx, ty));
        }
      }
    }
    if (this.pole) {
      for (let ty = 0; ty < ROWS; ty++) if (this.map[ty][this.pole.col] === 'X') { this.pole.base = ty * T; break; }
      this.flagY = this.pole.top + 8;
    }
    this.spawns.sort((a, b) => a.x - b.x);

    const p = this.p;
    p.h = p.big ? 32 : 16;
    p.duck = false;
    p.vx = 0;
    p.vy = 0;
    p.onLift = null;
    p.hidden = false;
    p.dir = 1;
    if (spec.start) {
      p.x = start.x; p.y = start.y - p.h;
    } else if (spec.check) {
      let tx = this.level.check;
      let found = false;
      for (; tx < this.cols && !found; tx++) {
        for (let ty = 3; ty < ROWS; ty++) {
          if (this.solidAt(tx, ty) && !this.solidAt(tx, ty - 1) && !this.solidAt(tx, ty - 2)) {
            p.x = tx * T + 2; p.y = ty * T - p.h; found = true; break;
          }
        }
      }
      if (!found) { p.x = start.x; p.y = start.y - p.h; }
    } else if (spec.emerge === 'up') {
      p.x = spec.tx * T + 10; p.y = spec.ty * T;
      this.emergeTop = spec.ty * T;
    } else {
      p.x = spec.tx * T + 2; p.y = spec.ty * T;
    }
    this.camX = A.fixedCam ? 0 : clamp(Math.round(p.x - 112), 0, Math.max(0, this.cols * T - SW));
    // Kameranın gerisindeki düşmanlar doğmasın
    this.spawns = this.spawns.filter((s) => s.x >= this.camX - 8 || s.c === 'N');
    this.spawnCheck();
  }

  // ------------------------------------------------------------------ karolar
  tile(tx, ty) {
    if (ty < 0 || ty >= ROWS) return '.';
    if (tx < 0 || tx >= this.cols) return 'X';
    return this.map[ty][tx];
  }

  solidAt(tx, ty) { return SOLID.has(this.tile(tx, ty)); }

  solidPt(x, y) { return this.solidAt(Math.floor(x / T), Math.floor(y / T)); }

  // Yatay sütundaki dikey aralıkta katı karo var mı
  solidCol(tx, y0, y1) {
    for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++) if (this.solidAt(tx, ty)) return true;
    return false;
  }

  solidRow(ty, x0, x1) {
    for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) if (this.solidAt(tx, ty)) return true;
    return false;
  }

  setTile(tx, ty, c) {
    if (ty >= 0 && ty < ROWS && tx >= 0 && tx < this.cols) this.map[ty][tx] = c;
  }

  // ------------------------------------------------------------------ yardımcılar
  sfx(name) { this.api.sfx.play(name); }

  tone(...a) { this.api.sfx.tone(...a); }

  addScore(n, x, y) {
    this.api.addScore(n);
    if (x != null) this.fx.push({ k: 'pop', x, y, t: 0, text: String(n) });
  }

  oneUp(x, y) {
    this.lives++;
    this.fx.push({ k: 'pop', x, y, t: 0, text: '1UP' });
    this.api.sfx.seq([['E5', 0.08], ['G5', 0.08], ['E6', 0.08], ['C6', 0.08], ['D6', 0.08], ['G6', 0.12]], { vol: 0.1 });
  }

  addCoin(x, y) {
    this.coins++;
    this.api.addScore(200);
    this.sfx('coin');
    if (this.coins >= 100) { this.coins -= 100; this.oneUp(x, y); }
  }

  chainScore(e, chain) {
    if (chain >= STOMP_CHAIN.length) { this.oneUp(e.x, e.y); return; }
    this.addScore(STOMP_CHAIN[chain], e.x, e.y);
  }

  // ------------------------------------------------------------------ varlıklar
  mkFirebar(tx, ty) {
    const dir = (tx % 2) ? -1 : 1;
    return { k: 'firebar', cx: tx * T + 8, cy: ty * T + 8, a: dir > 0 ? 0 : Math.PI, sp: dir * 0.036 * Math.min(1.5, this.speedMul), n: 6, x: tx * T - 40, y: ty * T - 40, w: 96, h: 96 };
  }

  spawnCheck() {
    const edge = this.camX + SW + 24;
    while (this.spawns.length && this.spawns[0].x < edge) {
      const s = this.spawns.shift();
      const e = this.mkEnemy(s);
      if (e) this.ents.push(e);
    }
  }

  mkEnemy(s) {
    const m = this.speedMul;
    switch (s.c) {
      case 'g': return { k: 'walker', x: s.x + 1, y: s.y - 15, w: 14, h: 15, vx: -0.5 * m, vy: 0, st: 'walk', t: 0 };
      case 'k': case 'r': return { k: 'koopa', red: s.c === 'r', x: s.x + 2, y: s.y - 22, w: 12, h: 22, vx: -0.5 * m, vy: 0, st: 'walk', t: 0 };
      case 'f': return { k: 'koopa', red: false, fly: true, x: s.x + 2, y: s.y - 22, w: 12, h: 22, vx: -0.5 * m, vy: 0, st: 'walk', t: 0 };
      case 'p': return { k: 'piranha', x: s.x + 8 + 2, base: s.y, y: s.y, w: 12, h: 0, off: 0, st: 'wait', t: 60 };
      case 'v': return { k: 'podoboo', x: s.x + 3, y: 260, w: 10, h: 12, vy: 0, st: 'wait', t: 30 + s.tx % 4 * 20 };
      case 'b': return { k: 'boss', x: s.x, y: s.y - 30, w: 28, h: 30, vx: -0.4, vy: 0, hp: 4 + this.world, st: 'walk', t: 0, home: s.x, fireT: 90, jumpT: 120, flash: 0 };
      case 'N': return { k: 'npc', x: s.x, y: s.y - 23, w: 16, h: 23 };
      case 'l': case 'n': case 'm': case 'j':
        return { k: 'lift', type: s.c, x: s.x, y: s.y - 8, w: 48, h: 8, ox: s.x, oy: s.y - 8, t: 0, dx: 0, dy: 0 };
      default: return null;
    }
  }

  // Basit varlık fiziği: yatay duvarda döner, yerçekimiyle düşer
  moveEnt(e, grav = 0.25, maxFall = 4) {
    e.hitWall = false;
    e.x += e.vx;
    if (e.vx !== 0) {
      const col = e.vx > 0 ? Math.floor((e.x + e.w - 1) / T) : Math.floor(e.x / T);
      if (this.solidCol(col, e.y, e.y + e.h - 1)) {
        e.x = e.vx > 0 ? col * T - e.w : (col + 1) * T;
        e.vx = -e.vx;
        e.hitWall = true;
      }
    }
    e.vy = Math.min(e.vy + grav, maxFall);
    e.y += e.vy;
    e.onGround = false;
    if (e.vy > 0) {
      const row = Math.floor((e.y + e.h) / T);
      if (row >= 0 && this.solidRow(row, e.x, e.x + e.w - 1)) {
        e.y = row * T - e.h;
        e.vy = 0;
        e.onGround = true;
      }
    } else if (e.vy < 0) {
      const row = Math.floor(e.y / T);
      if (this.solidRow(row, e.x, e.x + e.w - 1)) { e.y = (row + 1) * T; e.vy = 0; }
    }
  }

  killFlip(e, dir = 1) {
    e.st = 'dead';
    e.vy = -3.5;
    e.vx = dir * 0.8;
    e.t = 0;
  }

  // ------------------------------------------------------------------ güncelleme
  update() {
    try {
      this.step();
    } catch (err) {
      // Asla oyunu çökertme: beklenmedik bir durumda bölümü baştan kur
      if (this.preview) return;
      this.loadLevel(this.checkReached);
      this.mode = 'play';
    }
  }

  step() {
    this.firstFrame = false;
    if (this.preview) this.botThink();
    this.modeT++;
    switch (this.mode) {
      case 'intro':
        if (this.modeT === 1) this.sfx('start');
        if (this.modeT >= 150) this.setMode('play');
        break;
      case 'play': this.updatePlay(); break;
      case 'trans':
        if (this.modeT >= 48) this.setMode('play');
        break;
      case 'pipe': this.updatePipe(); break;
      case 'emerge':
        this.p.y -= 1;
        if (this.p.y + this.p.h <= this.emergeTop) { this.p.y = this.emergeTop - this.p.h; this.setMode('play'); }
        break;
      case 'dying': this.updateDying(); break;
      case 'flag': this.updateFlag(); break;
      case 'axe': this.updateAxe(); break;
      case 'npc': this.updateNpc(); break;
      case 'gameover':
        if (this.modeT === 1) this.sfx('gameover');
        if (this.modeT === 200) this.api.gameOver();
        break;
      default: break;
    }
    this.updateFx();
  }

  setMode(m) {
    this.mode = m;
    this.modeT = 0;
  }

  updatePlay() {
    const p = this.p;
    // Süre
    if (++this.timeTick >= 24) {
      this.timeTick = 0;
      if (this.time > 0) this.time--;
      if (this.time === 100 && !this.hurryPlayed) {
        this.hurryPlayed = true;
        this.api.sfx.seq([['C6', 0.08], ['G5', 0.08], ['C6', 0.08], ['G5', 0.08], ['C6', 0.16]], { vol: 0.1 });
      }
      if (this.time === 0 && !this.preview) { this.die(false); return; }
    }
    if (p.inv > 0) p.inv--;
    if (p.star > 0) p.star--;
    if (p.throwT > 0) p.throwT--;

    this.updateLifts();
    this.updatePlayer();
    if (this.mode !== 'play') return;

    // Kamera: geri dönmez
    if (!this.area.fixedCam) {
      const target = p.x - 112;
      if (target > this.camX) this.camX = Math.min(Math.round(target), Math.max(0, this.cols * T - SW));
    }
    this.spawnCheck();
    this.updateEnts();
    this.updateFires();
    this.updateBumps();
    if (this.mode !== 'play') return;

    // Bayrak
    if (this.pole && p.x + p.w >= this.pole.col * T && p.x <= this.pole.x + 4 && p.y + p.h > this.pole.top) this.grabFlag();
    // Balta
    if (this.mode === 'play') {
      const cx = Math.floor((p.x + p.w / 2) / T);
      for (let ty = Math.floor(p.y / T); ty <= Math.floor((p.y + p.h - 1) / T); ty++) {
        if (this.tile(cx, ty) === 'A' || this.tile(cx + 1, ty) === 'A' && p.x + p.w > (cx + 1) * T + 4) { this.startAxe(); break; }
      }
    }
    // Çukur / lav
    if (this.mode === 'play') {
      if (p.y > SH + 8) this.die(true);
      else if (this.touchLava(p)) this.die(false);
    }
  }

  touchLava(e) {
    const y = e.y + e.h - 4;
    return this.tile(Math.floor((e.x + 2) / T), Math.floor(y / T)) === 'Z' && y % T >= 4
      || this.tile(Math.floor((e.x + e.w - 3) / T), Math.floor(y / T)) === 'Z' && y % T >= 4
      || 'z'.includes(this.tile(Math.floor((e.x + e.w / 2) / T), Math.floor(y / T)));
  }

  // ------------------------------------------------------------------ oyuncu
  setDuck(on) {
    const p = this.p;
    if (on === p.duck || !p.big) { if (!p.big) p.duck = false; return true; }
    if (on) { p.duck = true; p.y += 16; p.h = 16; return true; }
    // Kalkmak için yer var mı?
    if (this.solidRow(Math.floor((p.y - 16) / T), p.x, p.x + p.w - 1)) return false;
    p.duck = false; p.y -= 16; p.h = 32;
    return true;
  }

  updatePlayer() {
    const p = this.p;
    const c = this.ctl;
    const left = c.held('left');
    const right = c.held('right');
    const dx = (right ? 1 : 0) - (left ? 1 : 0);
    const run = c.held('b');

    // Boru girişleri
    if (p.onGround) {
      for (const w of this.warps) {
        if (w.kind === 'down' && c.held('down')) {
          const cx = p.x + p.w / 2;
          if (Math.abs(p.y + p.h - w.ty * T) < 1 && cx >= w.tx * T + 4 && cx <= w.tx * T + 28) { this.enterPipe(w); return; }
        }
        if (w.kind === 'right' && right) {
          if (p.x + p.w >= w.tx * T - 1 && p.x < w.tx * T + 8 && Math.abs(p.y + p.h - (w.ty + 2) * T) < 1) { this.enterPipe(w); return; }
        }
      }
    }

    // Çömelme
    if (p.onGround) {
      if (c.held('down') && p.big) this.setDuck(true);
      else if (p.duck) this.setDuck(false);
    }
    const forcedDuck = p.duck && !c.held('down');

    // Ateş
    if (p.fire && c.pressed('b') && this.fires.length < 2 && !p.duck) {
      this.fires.push({ x: p.x + (p.dir > 0 ? p.w : -8), y: p.y + 4, w: 8, h: 8, vx: p.dir * 4, vy: 2, t: 0 });
      p.throwT = 8;
      this.tone(1500, 0.06, { slide: 300, vol: 0.08 });
    }

    if (p.onGround) {
      p.skid = false;
      const maxV = run ? RUN_MAX : WALK_MAX;
      if (dx !== 0 && (!p.duck || forcedDuck)) {
        if (p.vx !== 0 && Math.sign(p.vx) !== dx) {
          // Kayma (skid)
          p.vx += dx * SKID_DEC;
          if (Math.abs(p.vx) < 0.5625 && Math.sign(p.vx) !== dx) { p.vx = 0; }
          p.skid = true;
          p.dir = dx;
          if (this.api.frame % 8 === 0) this.api.sfx.noise(0.05, { vol: 0.08, freq: 3000 });
        } else {
          p.dir = dx;
          const sp = Math.abs(p.vx);
          if (sp < maxV) p.vx = dx * Math.min(maxV, sp + (run ? RUN_ACC : WALK_ACC));
          else p.vx = dx * Math.max(maxV, sp - RELEASE_DEC);
          if (forcedDuck) p.vx = clamp(p.vx, -0.8, 0.8);
        }
      } else {
        const dec = p.duck ? RELEASE_DEC * 0.6 : RELEASE_DEC;
        if (Math.abs(p.vx) <= dec) p.vx = 0;
        else p.vx -= Math.sign(p.vx) * dec;
      }
      if (c.pressed('a')) {
        const sp = Math.abs(p.vx);
        const cat = sp < 1 ? 0 : sp < 2.31 ? 1 : 2;
        p.jumpG = JUMP[cat];
        p.vy = JUMP[cat].v;
        p.jumpHeld = true;
        p.onGround = false;
        p.onLift = null;
        p.airMax = Math.max(WALK_MAX, sp);
        if (p.big) this.tone(220, 0.2, { slide: 600, vol: 0.12 });
        else this.tone(330, 0.18, { slide: 800, vol: 0.12 });
      }
    } else {
      // Havada: yön değişmez, ivme sınırlı
      if (dx !== 0) {
        const acc = Math.sign(p.vx) !== dx && p.vx !== 0 ? RUN_ACC : (run ? RUN_ACC : WALK_ACC);
        p.vx += dx * acc;
        const cap = Math.max(p.airMax, run ? RUN_MAX : WALK_MAX);
        if (Math.abs(p.vx) > cap) p.vx = Math.sign(p.vx) * cap;
      }
    }
    if (!c.held('a')) p.jumpHeld = false;
    const g = p.vy < 0 && p.jumpHeld ? p.jumpG.hold : p.jumpG.fall;

    // Yatay hareket
    p.x += p.vx;
    if (p.x < this.camX) { p.x = this.camX; if (p.vx < 0) p.vx = 0; }
    if (p.vx > 0) {
      const col = Math.floor((p.x + p.w - 1) / T);
      if (this.solidCol(col, p.y + 1, p.y + p.h - 1)) { p.x = col * T - p.w; p.vx = 0; }
    } else if (p.vx < 0) {
      const col = Math.floor(p.x / T);
      if (this.solidCol(col, p.y + 1, p.y + p.h - 1)) { p.x = (col + 1) * T; p.vx = 0; }
    }
    // Karonun içine sıkışırsa sağa it
    if (this.solidCol(Math.floor((p.x + p.w / 2) / T), p.y + 2, p.y + p.h - 2) && !this.solidCol(Math.floor((p.x + p.w / 2) / T) + 1, p.y + 2, p.y + p.h - 2)) {
      p.x += 1;
    }

    // Dikey hareket
    const prevBottom = p.y + p.h;
    const vyUsed = p.vy;
    p.y += vyUsed;
    p.vy = Math.min(p.vy + g, MAX_FALL);
    const wasGround = p.onGround;
    p.onGround = false;
    p.onLift = null;
    if (vyUsed >= 0) {
      const row = Math.floor((p.y + p.h) / T);
      if (row >= 0 && row < ROWS && this.solidRow(row, p.x + 1, p.x + p.w - 2)) {
        p.y = row * T - p.h;
        p.vy = 0;
        p.onGround = true;
      } else {
        for (const l of this.ents) {
          if (l.k !== 'lift') continue;
          if (p.x + p.w > l.x && p.x < l.x + l.w && prevBottom <= l.y + Math.max(0, l.dy) + 2 && p.y + p.h >= l.y) {
            p.y = l.y - p.h;
            p.vy = 0;
            p.onGround = true;
            p.onLift = l;
            break;
          }
        }
      }
    } else {
      this.headCheck();
    }
    if (p.onGround) {
      if (!wasGround) p.chain = 0;
      p.jumpG = JUMP[0];
    }

    // Altınlar
    for (let ty = Math.floor(p.y / T); ty <= Math.floor((p.y + p.h - 1) / T); ty++) {
      for (let tx = Math.floor(p.x / T); tx <= Math.floor((p.x + p.w - 1) / T); tx++) {
        if (this.tile(tx, ty) === 'o') { this.setTile(tx, ty, '.'); this.addCoin(tx * T, ty * T); }
      }
    }

    // Animasyon
    if (p.onGround) p.anim += Math.abs(p.vx) * 0.12 + (p.vx !== 0 ? 0.05 : 0);
    if (!this.checkReached && this.areaName === 'main' && p.x > this.level.check * T) this.checkReached = true;
  }

  headCheck() {
    const p = this.p;
    const row = Math.floor(p.y / T);
    const hit = (tx) => {
      const c = this.tile(tx, row);
      return SOLID.has(c) || c === 'h' || c === 'u';
    };
    const cl = Math.floor((p.x + 1) / T);
    const cr = Math.floor((p.x + p.w - 2) / T);
    const hl = hit(cl);
    const hr = cr !== cl && hit(cr);
    if (!hl && !hr) return;
    // Köşe düzeltmesi: kenara sadece birkaç pikselle değiyorsa kaydır
    if (hl && !hr) {
      const ov = (cl + 1) * T - (p.x + 1);
      if (ov <= 4 && !this.solidCol(cl + 1, p.y, p.y + p.h - 1)) { p.x += ov; return; }
    }
    if (hr && !hl) {
      const ov = (p.x + p.w - 1) - cr * T;
      if (ov <= 4 && !this.solidCol(cr - 1, p.y, p.y + p.h - 1)) { p.x -= ov; return; }
    }
    p.y = (row + 1) * T;
    p.vy = 1;
    p.jumpHeld = false;
    const cx = Math.floor((p.x + p.w / 2) / T);
    const tx = (cx === cl && hl) || (cx === cr && hr) ? cx : (hl ? cl : cr);
    this.bumpBlock(tx, row);
  }

  bumpBlock(tx, ty) {
    const c = this.tile(tx, ty);
    const p = this.p;
    if (!BUMPABLE.has(c)) {
      this.tone(110, 0.06, { vol: 0.12 });
      return;
    }
    const bx = tx * T;
    const by = ty * T;
    let bump = true;
    switch (c) {
      case '?': case 'h':
        this.setTile(tx, ty, 'E');
        this.fx.push({ k: 'bcoin', x: bx + 3, y: by - 16, vy: -5, t: 0 });
        this.addCoin(bx, by - 16);
        break;
      case 'C': {
        const key = `${tx},${ty}`;
        if (!this.multi[key]) this.multi[key] = { t: 0, n: 0 };
        const m = this.multi[key];
        m.n++;
        this.fx.push({ k: 'bcoin', x: bx + 3, y: by - 16, vy: -5, t: 0 });
        this.addCoin(bx, by - 16);
        if (m.t > 240 || m.n >= 10) this.setTile(tx, ty, 'E');
        break;
      }
      case 'M': case 'P':
        this.setTile(tx, ty, 'E');
        this.spawnItem(p.big ? 'flower' : 'mush', bx, by);
        break;
      case 'S':
        this.setTile(tx, ty, 'E');
        this.spawnItem('star', bx, by);
        break;
      case 'U': case 'u':
        this.setTile(tx, ty, 'E');
        this.spawnItem('oneup', bx, by);
        break;
      case 'B':
        if (p.big) {
          this.setTile(tx, ty, '.');
          bump = false;
          this.api.addScore(50);
          for (const [dx, dy, vx, vy] of [[0, 0, -1.2, -6], [8, 0, 1.2, -6], [0, 8, -1.2, -4], [8, 8, 1.2, -4]]) {
            this.fx.push({ k: 'debris', x: bx + dx, y: by + dy, vx, vy, t: 0 });
          }
          this.api.sfx.noise(0.25, { vol: 0.3, freq: 1800 });
        } else {
          this.tone(110, 0.06, { vol: 0.12 });
        }
        break;
      default: break;
    }
    if (bump) this.bumps.push({ tx, ty, t: 0 });
    // Üstteki düşmanlar ölür, eşyalar zıplar, altınlar toplanır
    for (const e of this.ents) {
      if (e.x + e.w > bx && e.x < bx + T && Math.abs(e.y + e.h - by) <= 3) {
        if ((e.k === 'walker' || e.k === 'koopa') && e.st !== 'dead') {
          this.killFlip(e, e.x + e.w / 2 < bx + 8 ? -1 : 1);
          this.addScore(100, e.x, e.y);
          this.sfx('punch');
        } else if (e.k === 'item' && e.st === 'move' && e.type !== 'flower') {
          e.vy = -4;
          e.vx = Math.abs(e.vx || 1) * (e.x + e.w / 2 < bx + 8 ? -1 : 1);
        }
      }
    }
    if (this.tile(tx, ty - 1) === 'o') { this.setTile(tx, ty - 1, '.'); this.addCoin(bx, by - 16); }
  }

  spawnItem(type, bx, by) {
    this.ents.push({ k: 'item', type, x: bx + 1, y: by, w: 14, h: 16, vx: 0, vy: 0, st: 'emerge', t: 0, topY: by - 16 });
    this.api.sfx.seq([['C5', 0.04], ['G5', 0.04], ['C6', 0.04], ['D5', 0.04], ['A5', 0.04], ['D6', 0.04]], { vol: 0.08 });
  }

  updateBumps() {
    for (const b of this.bumps) b.t++;
    this.bumps = this.bumps.filter((b) => b.t < 10);
    for (const m of Object.values(this.multi)) m.t++;
  }

  // ------------------------------------------------------------------ asansörler
  updateLifts() {
    const p = this.p;
    for (const l of this.ents) {
      if (l.k !== 'lift') continue;
      const ox = l.x;
      const oy = l.y;
      l.t++;
      switch (l.type) {
        case 'l': l.y -= 1; if (l.y < -10) l.y = SH + 10; break;
        case 'n': l.y += 1; if (l.y > SH + 10) l.y = -10; break;
        case 'm': l.x = l.ox + Math.round(Math.sin(l.t * 0.02) * 40); break;
        case 'j': l.y = l.oy + Math.round(Math.sin(l.t * 0.022) * 44); break;
        default: break;
      }
      l.dx = l.x - ox;
      l.dy = l.y - oy;
      if (p.onLift === l && Math.abs(l.dy) < 50) {
        p.x += l.dx;
        p.y = l.y - p.h;
        if (l.dx > 0) {
          const col = Math.floor((p.x + p.w - 1) / T);
          if (this.solidCol(col, p.y + 1, p.y + p.h - 1)) p.x = col * T - p.w;
        } else if (l.dx < 0) {
          const col = Math.floor(p.x / T);
          if (this.solidCol(col, p.y + 1, p.y + p.h - 1)) p.x = (col + 1) * T;
        }
      }
    }
  }

  // ------------------------------------------------------------------ düşmanlar / eşyalar
  updateEnts() {
    const p = this.p;
    const m = this.speedMul;
    for (const e of this.ents) {
      e.t = (e.t || 0) + 1;
      switch (e.k) {
        case 'walker':
          if (e.st === 'walk') this.moveEnt(e);
          else if (e.st === 'flat') { if (e.t > 30) e.gone = true; }
          else this.moveDead(e);
          break;
        case 'koopa': this.updateKoopa(e, m); break;
        case 'piranha': this.updatePiranha(e); break;
        case 'podoboo':
          if (e.st === 'wait') {
            if (e.t > 70) { e.st = 'jump'; e.y = SH + 8; e.vy = -7.2; e.t = 0; }
          } else {
            e.vy += 0.2; e.y += e.vy;
            if (e.vy > 0 && e.y > SH + 8) { e.st = 'wait'; e.t = -Math.floor(Math.random() * 60); }
          }
          break;
        case 'firebar': e.a += e.sp; break;
        case 'boss': this.updateBoss(e); break;
        case 'bossfire':
          e.x += e.vx;
          if (Math.abs(e.y - e.ty) > 1) e.y += Math.sign(e.ty - e.y) * 0.5;
          if (e.x < this.camX - 40) e.gone = true;
          break;
        case 'item': this.updateItem(e); break;
        default: break;
      }
      // Ekrandan çıkanları sil
      if (e.k !== 'firebar' && e.k !== 'lift' && e.k !== 'npc' && e.k !== 'podoboo' && e.k !== 'boss') {
        if (e.x < this.camX - 64 || e.y > SH + 32 || e.x > this.camX + SW + 160) e.gone = true;
      } else if (e.x + (e.w || 0) < this.camX - 160) e.gone = true;
    }

    // Düşman-düşman çarpışması (yürüyenler birbirinden döner, dönen kabuk öldürür)
    const act = this.ents.filter((e) => (e.k === 'walker' || e.k === 'koopa') && e.st !== 'dead' && e.st !== 'flat');
    for (let i = 0; i < act.length; i++) {
      for (let j = i + 1; j < act.length; j++) {
        const a = act[i];
        const b = act[j];
        if (a.st === 'dead' || b.st === 'dead' || !overlap(a, b)) continue;
        const aSpin = a.st === 'spin';
        const bSpin = b.st === 'spin';
        if (aSpin || bSpin) {
          const s = aSpin ? a : b;
          const o = aSpin ? b : a;
          if (aSpin && bSpin) { this.killFlip(a, -1); this.killFlip(b, 1); continue; }
          this.killFlip(o, Math.sign(s.vx) || 1);
          s.chain = (s.chain || 0) + 1;
          this.chainScore(o, Math.min(STOMP_CHAIN.length, 3 + s.chain));
          this.sfx('punch');
        } else if (a.st === 'walk' && b.st === 'walk') {
          if ((a.x < b.x && a.vx > 0) || (a.x > b.x && a.vx < 0)) a.vx = -a.vx;
          if ((b.x < a.x && b.vx > 0) || (b.x > a.x && b.vx < 0)) b.vx = -b.vx;
        }
      }
    }

    // Oyuncu ile çarpışma
    if (this.mode === 'play') {
      for (const e of this.ents) {
        if (e.gone || this.mode !== 'play') continue;
        this.collidePlayer(e, p);
      }
    }
    this.ents = this.ents.filter((e) => !e.gone);
  }

  moveDead(e) {
    e.vy += 0.25;
    e.x += e.vx;
    e.y += e.vy;
    if (e.y > SH + 20) e.gone = true;
  }

  updateKoopa(e, m) {
    if (e.st === 'dead') { this.moveDead(e); return; }
    if (e.st === 'walk') {
      if (e.fly) {
        this.moveEnt(e, 0.15, 3);
        if (e.onGround) e.vy = -3.6;
      } else {
        this.moveEnt(e);
        if (e.red && e.onGround) {
          const col = e.vx > 0 ? Math.floor((e.x + e.w + 1) / T) : Math.floor((e.x - 2) / T);
          const row = Math.floor((e.y + e.h + 2) / T);
          if (!this.solidAt(col, row)) e.vx = -e.vx;
        }
      }
    } else if (e.st === 'shell') {
      e.vx = 0;
      this.moveEnt(e);
      if (e.t > 420) {
        e.st = 'walk';
        e.y -= 8; e.h = 22;
        e.vx = (this.p.x < e.x ? -0.5 : 0.5) * m;
      }
    } else if (e.st === 'spin') {
      this.moveEnt(e);
      if (e.hitWall && e.x > this.camX - 16 && e.x < this.camX + SW) this.tone(150, 0.05, { vol: 0.12 });
      if (e.grace > 0) e.grace--;
    }
  }

  updatePiranha(e) {
    const p = this.p;
    const near = Math.abs(p.x + p.w / 2 - (e.x + 6)) < 28 && this.world < 3;
    if (e.dead) { e.gone = true; return; }
    switch (e.st) {
      case 'wait': if (e.t > 80 && !near) { e.st = 'up'; e.t = 0; } break;
      case 'up': e.off = Math.min(24, e.off + 1); if (e.off >= 24) { e.st = 'out'; e.t = 0; } break;
      case 'out': if (e.t > 70) { e.st = 'down'; e.t = 0; } break;
      case 'down': e.off = Math.max(0, e.off - 1); if (e.off <= 0) { e.st = 'wait'; e.t = 0; } break;
      default: break;
    }
    e.y = e.base - e.off;
    e.h = Math.max(0, e.off - 2);
  }

  updateBoss(e) {
    if (e.flash > 0) e.flash--;
    if (e.st === 'dead' || e.st === 'fall') { this.moveDead(e); return; }
    const p = this.p;
    const onScreen = e.x < this.camX + SW + 32;
    if (!onScreen) return;
    if (e.t % 90 === 0) e.vx = (Math.random() < 0.5 ? -0.4 : 0.4);
    if (e.x < e.home - 40) e.vx = 0.4;
    if (e.x > e.home + 24) e.vx = -0.4;
    this.moveEnt(e, 0.15, 3);
    if (--e.jumpT <= 0 && e.onGround) { e.vy = -3.5; e.jumpT = 120 + Math.floor(Math.random() * 120); }
    if (--e.fireT <= 0) {
      e.fireT = Math.max(70, 170 - this.world * 20) + Math.floor(Math.random() * 60);
      const ty = clamp(Math.round((p.y + p.h - 12) / 16) * 16, 112, 160);
      this.ents.push({ k: 'bossfire', x: e.x - 20, y: e.y + 6, ty, w: 22, h: 6, vx: -1.6 - this.world * 0.1, t: 0 });
      this.api.sfx.noise(0.6, { vol: 0.2, freq: 600 });
    }
    if (e.y > SH) { e.st = 'fall'; }
  }

  updateItem(e) {
    if (e.st === 'emerge') {
      e.y -= 0.5;
      if (e.y <= e.topY) {
        e.y = e.topY;
        e.st = 'move';
        if (e.type === 'mush' || e.type === 'oneup') e.vx = 1;
        if (e.type === 'star') { e.vx = 1; e.vy = -4; }
      }
      return;
    }
    if (e.type === 'flower') return;
    if (e.type === 'star') {
      this.moveEnt(e, 0.2, 4);
      if (e.onGround) e.vy = -4.5;
      return;
    }
    this.moveEnt(e, 0.25, 4);
  }

  // Oyuncu - varlık çarpışması
  collidePlayer(e, p) {
    if (e.k === 'firebar') {
      for (let i = 0; i < e.n; i++) {
        const bx = e.cx + Math.cos(e.a) * i * 8 - 3;
        const by = e.cy + Math.sin(e.a) * i * 8 - 3;
        if (overlap(p, { x: bx, y: by, w: 6, h: 6 })) { this.hurt(); return; }
      }
      return;
    }
    if (e.k === 'lift' || e.k === 'npc') return;
    const box = e.k === 'piranha' ? { x: e.x, y: e.y + 2, w: e.w, h: e.h } : e;
    if (!overlap(p, box)) return;
    switch (e.k) {
      case 'item':
        if (e.st !== 'move') return;
        e.gone = true;
        if (e.type === 'oneup') { this.oneUp(e.x, e.y); return; }
        if (e.type === 'star') { p.star = 600; this.addScore(1000, e.x, e.y); this.sfx('power'); return; }
        this.addScore(1000, e.x, e.y);
        if (!p.big) this.grow();
        else if (e.type === 'flower' && !p.fire) { p.fire = true; this.setMode('trans'); this.transKind = 'fire'; this.sfx('power'); }
        else this.sfx('pickup');
        return;
      case 'piranha':
      case 'podoboo':
      case 'bossfire':
        if (p.star > 0 && e.k === 'piranha') { e.gone = true; this.addScore(200, e.x, e.y - 16); this.sfx('punch'); return; }
        this.hurt();
        return;
      case 'boss':
        if (e.st === 'dead' || e.st === 'fall') return;
        this.hurt();
        return;
      case 'walker':
      case 'koopa': {
        if (e.st === 'dead' || e.st === 'flat') return;
        if (p.star > 0) {
          this.killFlip(e, p.x < e.x ? 1 : -1);
          p.chain++;
          this.chainScore(e, Math.min(p.chain - 1, STOMP_CHAIN.length));
          this.sfx('punch');
          return;
        }
        const stomp = p.vy > 0 && p.y + p.h - p.vy <= e.y + 8;
        if (e.k === 'koopa' && e.st === 'shell') {
          // Duran kabuğu tekmele
          const dir = p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1;
          e.st = 'spin';
          e.vx = dir * 3.6;
          e.grace = 12;
          e.chain = 0;
          e.t = 0;
          if (stomp) { p.vy = -3; p.y = e.y - p.h; }
          else p.x = dir > 0 ? e.x - p.w - 1 : e.x + e.w + 1;
          this.addScore(400, e.x, e.y);
          this.sfx('punch');
          return;
        }
        if (stomp) {
          p.vy = this.ctl.held('a') ? -5 : -3.5;
          p.jumpHeld = this.ctl.held('a');
          p.jumpG = JUMP[1];
          p.y = e.y - p.h;
          this.chainScore(e, Math.min(p.chain, STOMP_CHAIN.length));
          p.chain++;
          this.tone(500, 0.08, { type: 'square', slide: 900, vol: 0.12 });
          if (e.k === 'walker') { e.st = 'flat'; e.t = 0; }
          else if (e.fly) { e.fly = false; e.vy = 0; }
          else if (e.st === 'spin') { e.st = 'shell'; e.vx = 0; e.t = 0; }
          else { e.st = 'shell'; e.vx = 0; e.y += 8; e.h = 14; e.t = 0; }
          return;
        }
        if (e.st === 'spin' && e.grace > 0) return;
        this.hurt();
        break;
      }
      default: break;
    }
  }

  grow() {
    const p = this.p;
    p.big = true;
    p.h = 32;
    p.y -= 16;
    // Tavan varsa çömelmiş başla
    if (this.solidRow(Math.floor(p.y / T), p.x + 1, p.x + p.w - 2)) { p.duck = true; p.y += 16; p.h = 16; }
    this.transKind = 'grow';
    this.setMode('trans');
    this.sfx('power');
  }

  hurt() {
    const p = this.p;
    if (p.star > 0 || p.inv > 0 || this.mode !== 'play' || this.preview) return;
    if (p.big) {
      p.big = false;
      p.fire = false;
      if (!p.duck) p.y += 16;
      p.duck = false;
      p.h = 16;
      p.inv = 150;
      this.transKind = 'shrink';
      this.setMode('trans');
      this.api.sfx.seq([['A5', 0.06], ['E5', 0.06], ['A4', 0.06], ['E4', 0.1]], { vol: 0.12 });
    } else {
      this.die(false);
    }
  }

  die(pit) {
    if (this.preview) return;
    const p = this.p;
    p.big = false;
    p.fire = false;
    p.star = 0;
    p.duck = false;
    if (p.h !== 16) { p.y += p.h - 16; p.h = 16; }
    p.vx = 0;
    p.vy = 0;
    this.pitDeath = pit;
    this.setMode('dying');
    this.api.sfx.seq([['C5', 0.1], ['C#5', 0.1], ['D5', 0.12], [0, 0.25], ['B4', 0.12], ['F5', 0.12], [0, 0.06], ['F5', 0.12], ['F5', 0.15], ['E5', 0.15], ['D5', 0.15], ['C5', 0.3]], { vol: 0.1 });
  }

  updateDying() {
    const p = this.p;
    if (!this.pitDeath && this.modeT > 30 && this.modeT < 200) {
      if (this.modeT === 31) p.vy = -5;
      p.vy += 0.25;
      p.y += p.vy;
    }
    if (this.modeT >= 200) {
      this.lives--;
      if (this.lives <= 0) {
        this.setMode('gameover');
        return;
      }
      this.p = this.newPlayer(false, false);
      this.loadLevel(this.checkReached);
      this.setMode('intro');
    }
  }

  // ------------------------------------------------------------------ ateş topları
  updateFires() {
    for (const f of this.fires) {
      f.t++;
      f.x += f.vx;
      const cy = f.y + 4;
      if (this.solidPt(f.vx > 0 ? f.x + 7 : f.x, cy)) {
        f.gone = true;
        this.fx.push({ k: 'puff', x: f.x, y: f.y, t: 0 });
        this.tone(200, 0.04, { vol: 0.08 });
        continue;
      }
      f.vy = Math.min(f.vy + 0.35, 4);
      f.y += f.vy;
      if (f.vy > 0 && this.solidPt(f.x + 4, f.y + 8)) {
        f.y = Math.floor((f.y + 8) / T) * T - 8;
        f.vy = -3;
      } else if (f.vy < 0 && this.solidPt(f.x + 4, f.y)) {
        f.vy = 1;
      }
      if (f.x < this.camX - 8 || f.x > this.camX + SW || f.y > SH) { f.gone = true; continue; }
      for (const e of this.ents) {
        if (e.gone || !overlap(f, e.k === 'piranha' ? { x: e.x, y: e.y, w: e.w, h: e.h } : e)) continue;
        if (e.k === 'walker' || e.k === 'koopa') {
          if (e.st === 'dead') continue;
          this.killFlip(e, Math.sign(f.vx));
          this.addScore(e.k === 'walker' ? 100 : 200, e.x, e.y);
        } else if (e.k === 'piranha' && e.h > 2) {
          e.dead = true;
          this.addScore(200, e.x, e.y - 16);
        } else if (e.k === 'boss' && e.st !== 'dead' && e.st !== 'fall') {
          e.hp--;
          e.flash = 10;
          if (e.hp <= 0) { this.killFlip(e, 1); this.addScore(5000, e.x, e.y); this.sfx('bigexplode'); }
        } else continue;
        f.gone = true;
        this.fx.push({ k: 'puff', x: f.x, y: f.y, t: 0 });
        this.sfx('punch');
        break;
      }
    }
    this.fires = this.fires.filter((f) => !f.gone);
  }

  // ------------------------------------------------------------------ efektler
  updateFx() {
    for (const f of this.fx) {
      f.t++;
      if (f.k === 'pop') { f.y -= 0.7; if (f.t > 45) f.gone = true; }
      else if (f.k === 'bcoin') { f.vy += 0.35; f.y += f.vy; if (f.t > 28) f.gone = true; }
      else if (f.k === 'debris') { f.vy += 0.3; f.x += f.vx; f.y += f.vy; if (f.y > SH + 16) f.gone = true; }
      else if (f.k === 'puff' && f.t > 10) f.gone = true;
    }
    this.fx = this.fx.filter((f) => !f.gone);
  }

  // ------------------------------------------------------------------ borular
  enterPipe(w) {
    this.pipe = w;
    const p = this.p;
    if (p.duck) this.setDuck(false);
    p.vx = 0;
    p.vy = 0;
    if (w.kind === 'down') p.x = w.tx * T + 10;
    this.setMode('pipe');
    this.api.sfx.seq([['C4', 0.06], ['G3', 0.06], ['C3', 0.06]], { vol: 0.15 });
  }

  updatePipe() {
    const p = this.p;
    const w = this.pipe;
    if (w.kind === 'down') p.y += 1;
    else { p.x += 0.75; p.anim += 0.15; }
    if (this.modeT >= (w.kind === 'down' ? 36 : 30)) {
      const to = w.to;
      this.loadArea(to.area, to);
      if (to.emerge === 'up') {
        this.setMode('emerge');
        this.api.sfx.seq([['C3', 0.06], ['G3', 0.06], ['C4', 0.06]], { vol: 0.15 });
      } else this.setMode('play');
    }
  }

  // ------------------------------------------------------------------ bayrak / şato
  grabFlag() {
    const p = this.p;
    const pl = this.pole;
    const span = pl.base - pl.top;
    const h = (pl.base - (p.y + p.h)) / span;
    const pts = h > 0.85 ? 5000 : h > 0.6 ? 2000 : h > 0.4 ? 800 : h > 0.2 ? 400 : 100;
    this.addScore(pts, pl.x + 4, p.y);
    p.x = pl.x - p.w + 1;
    p.vx = 0;
    p.vy = 0;
    p.star = 0;
    if (p.duck) this.setDuck(false);
    this.setMode('flag');
    this.flagPhase = 0;
    this.api.sfx.tone(1000, 1.0, { slide: 200, type: 'square', vol: 0.08 });
  }

  updateFlag() {
    const p = this.p;
    const pl = this.pole;
    if (this.flagPhase === 0) {
      let done = true;
      if (p.y + p.h < pl.base) { p.y = Math.min(pl.base - p.h, p.y + 2); done = false; }
      if (this.flagY < pl.base - 18) { this.flagY = Math.min(pl.base - 18, this.flagY + 2); done = false; }
      if (done) { this.flagPhase = 1; this.modeT = 0; p.x = pl.x + 3; p.dir = -1; }
    } else if (this.flagPhase === 1) {
      if (this.modeT > 25) {
        this.flagPhase = 2; this.modeT = 0; p.dir = 1;
        this.api.sfx.seq([['G4', 0.12], ['C5', 0.12], ['E5', 0.12], ['G5', 0.12], ['C6', 0.12], ['E6', 0.12], ['G6', 0.3], ['E6', 0.3]], { vol: 0.09 });
      }
    } else if (this.flagPhase === 2) {
      // Şatoya yürü
      p.vx = 1.25;
      p.x += p.vx;
      const col = Math.floor((p.x + p.w - 1) / T);
      if (this.solidCol(col, p.y + 1, p.y + p.h - 1)) p.x = col * T - p.w;
      p.vy = Math.min(p.vy + 0.4, 4);
      p.y += p.vy;
      const row = Math.floor((p.y + p.h - 1) / T);
      p.onGround = false;
      if (this.solidRow(row, p.x + 1, p.x + p.w - 2)) { p.y = row * T - p.h; p.vy = 0; p.onGround = true; }
      p.anim += 0.25;
      const cam = p.x - 112;
      if (cam > this.camX) this.camX = Math.min(Math.round(cam), Math.max(0, this.cols * T - SW));
      const door = this.castle ? this.castle.door : this.cols * T - 40;
      if (p.x + p.w / 2 >= door) { p.hidden = true; this.flagPhase = 3; this.modeT = 0; }
    } else if (this.flagPhase === 3) {
      if (this.time > 0) {
        const n = Math.min(this.time, 2);
        this.time -= n;
        this.api.addScore(50 * n);
        if (this.modeT % 4 === 0) this.tone(1200, 0.03, { vol: 0.05 });
      } else if (this.castleFlag < 20) {
        this.castleFlag++;
      } else if (this.modeT > 60) {
        this.flagPhase = 4; this.modeT = 0;
      }
    } else if (this.modeT > 50) {
      this.nextLevel();
    }
  }

  nextLevel() {
    const keep = this.p;
    this.lvl++;
    if (this.lvl >= LEVELS.length) { this.lvl = 0; this.world++; }
    this.p = this.newPlayer(keep.big, keep.fire);
    this.loadLevel(false);
    this.setMode('intro');
  }

  startAxe() {
    this.setMode('axe');
    this.axeCols = [];
    for (let tx = 0; tx < this.cols; tx++) {
      for (let ty = 0; ty < ROWS; ty++) {
        if (this.map[ty][tx] === 'A') this.map[ty][tx] = '.';
      }
    }
    for (let tx = this.cols - 1; tx >= 0; tx--) {
      for (let ty = 0; ty < ROWS; ty++) if (this.map[ty][tx] === 'G') this.axeCols.push([tx, ty]);
    }
    this.p.vx = 0;
    this.p.vy = 0;
    this.sfx('select');
  }

  updateAxe() {
    if (this.modeT > 20 && this.modeT % 3 === 0 && this.axeCols.length) {
      const [tx, ty] = this.axeCols.shift();
      this.setTile(tx, ty, '.');
      this.tone(300 - this.axeCols.length * 10, 0.04, { vol: 0.08 });
    }
    for (const e of this.ents) {
      if (e.k === 'boss') {
        if (e.st !== 'dead' && e.st !== 'fall' && !this.solidRow(Math.floor((e.y + e.h + 1) / T), e.x, e.x + e.w - 1)) {
          e.st = 'fall'; e.vx = 0; e.vy = 0;
          this.tone(500, 1.2, { slide: 60, type: 'triangle', vol: 0.15 });
          this.addScore(5000, e.x, e.y);
        }
        if (e.st === 'fall' || e.st === 'dead') this.moveDead(e);
      }
      if (e.k === 'bossfire') e.gone = true;
    }
    this.ents = this.ents.filter((e) => !e.gone);
    this.updateFx();
    if (!this.axeCols.length && this.modeT > 120) {
      this.setMode('npc');
      this.api.sfx.seq([['C5', 0.15], ['G4', 0.15], ['E4', 0.15], ['A4', 0.2], ['B4', 0.2], ['A4', 0.2], ['G#4', 0.2], ['A#4', 0.2], ['G#4', 0.2], ['G4', 0.15], ['F4', 0.15], ['G4', 0.4]], { vol: 0.09 });
    }
  }

  updateNpc() {
    const p = this.p;
    const npc = this.ents.find((e) => e.k === 'npc');
    const stopX = npc ? npc.x - 24 : p.x;
    if (p.x < stopX) {
      p.x = Math.min(stopX, p.x + 1.25);
      p.anim += 0.25;
      p.vy = Math.min(p.vy + 0.4, 4);
      p.y += p.vy;
      const row = Math.floor((p.y + p.h - 1) / T);
      if (this.solidRow(row, p.x + 1, p.x + p.w - 2)) { p.y = row * T - p.h; p.vy = 0; }
      const cam = p.x - 112;
      if (cam > this.camX) this.camX = Math.min(Math.round(cam), Math.max(0, this.cols * T - SW));
    }
    if (this.time > 0 && this.modeT > 60) {
      const n = Math.min(this.time, 3);
      this.time -= n;
      this.api.addScore(50 * n);
    }
    if (this.modeT > 420) this.nextLevel();
  }

  // ------------------------------------------------------------------ otomatik pilot
  botThink() {
    const p = this.p;
    const keys = new Set(['right', 'b']);
    const press = new Set();
    if (p.onGround) {
      const ahead = p.x + p.w + 6 + Math.abs(p.vx) * 6;
      const feet = Math.floor((p.y + p.h - 1) / T);
      const col = Math.floor(ahead / T);
      const wall = this.solidAt(col, feet) || this.solidAt(col, feet - 1);
      const pit = !this.solidAt(col, feet + 1) && !this.solidAt(col, feet + 2) && !this.solidAt(col, feet + 3) && !p.onLift;
      const enemy = this.ents.some((e) => (e.k === 'walker' || e.k === 'koopa' || e.k === 'piranha') && e.st !== 'dead'
        && e.x > p.x && e.x - p.x < 56 && Math.abs(e.y - p.y) < 40);
      if ((wall || pit || enemy) && this.botJump <= 0) { press.add('a'); this.botJump = 40; }
    }
    if (this.botJump > 0) { this.botJump--; keys.add('a'); }
    if (this.botJump === 0 && p.onGround) this.botJump = -1;
    this.botKeys = keys;
    this.botPress = press;
  }

  // ------------------------------------------------------------------ çizim
  draw() {
    const g = this.api.gfx;
    if ((this.mode === 'intro' && !this.firstFrame) || this.mode === 'gameover') {
      g.cls('#000');
      this.drawHud();
      if (this.mode === 'gameover') {
        g.text('OYUN BİTTİ', SW / 2, 112, '#fff', { align: 'center' });
      } else {
        g.text(`DÜNYA ${this.world}-${this.level.name}`, SW / 2, 84, '#fff', { align: 'center' });
        g.sprite(HERO.normal.small.stand, 100, 108);
        g.text(`X  ${this.lives}`, 124, 113, '#fff');
        if (this.world > 1 && this.lvl === 0) g.text('DÜŞMANLAR DAHA HIZLI!', SW / 2, 150, '#fc9838', { align: 'center' });
      }
      return;
    }
    const cam = Math.round(this.camX);
    g.cls(this.th.sky);
    this.drawDeco(g, cam);

    const p = this.p;
    const behind = this.mode === 'pipe' || this.mode === 'emerge';
    // Borunun / bloğun arkasında kalanlar
    for (const e of this.ents) {
      if (e.k === 'piranha' && e.off > 0) {
        g.sprite(PIRANHA[Math.floor(this.api.frame / 12) % 2], e.x - 2 - cam, e.base - e.off);
      } else if (e.k === 'item' && e.st === 'emerge') this.drawItem(g, e, cam);
    }
    if (behind) this.drawPlayer(g, cam);
    this.drawTiles(g, cam);
    if (this.castle) this.drawCastle(g, this.castle.x - cam, this.castle.y);
    if (this.pole) g.sprite(FLAG, this.pole.x - 15 - cam, this.flagY);

    for (const e of this.ents) this.drawEnt(g, e, cam);
    for (const f of this.fires) g.sprite(FIREBALL[Math.floor(f.t / 4) % 2], f.x - cam, f.y, { flipX: f.t % 8 < 4 });
    for (const f of this.fx) this.drawFx(g, f, cam);
    if (!behind) this.drawPlayer(g, cam);

    this.drawHud();
    if (this.mode === 'npc' && this.modeT > 90) {
      g.text('TEŞEKKÜRLER BIYIK USTA!', SW / 2, 72, '#fff', { align: 'center' });
      if (this.modeT > 170) {
        g.text('AMA PRENSESİMİZ', SW / 2, 96, '#fff', { align: 'center' });
        g.text('BAŞKA BİR ŞATODA!', SW / 2, 108, '#fff', { align: 'center' });
      }
    }
    if (this.time <= 100 && this.time > 90 && this.mode === 'play' && this.api.frame % 30 < 20) {
      g.text('ACELE ET!', SW / 2, 48, '#fc9838', { align: 'center', shadow: '#000' });
    }
  }

  drawDeco(g, cam) {
    const deco = this.th.deco;
    if (deco === 'hills') {
      const base = 13 * T;
      const per = 48 * T;
      // Bulutlar (yarı hızda) ve tepeler (tam hızda) — 48 karoluk desen
      const cc = cam * 0.5;
      for (let k = Math.floor(cc / per) - 1; k <= Math.floor((cc + SW) / per) + 1; k++) {
        const o = k * per - cc;
        this.cloud(g, o + 8 * T, 40, 1);
        this.cloud(g, o + 19 * T, 24, 3);
        this.cloud(g, o + 28 * T, 40, 2);
        this.cloud(g, o + 37 * T, 28, 1);
      }
      for (let k = Math.floor(cam / per) - 1; k <= Math.floor((cam + SW) / per) + 1; k++) {
        const o = k * per - cam;
        this.hill(g, o, base, 80, 36);
        this.hill(g, o + 16 * T, base, 48, 20);
        this.bush(g, o + 11 * T, base, 3);
        this.bush(g, o + 23 * T, base, 1);
        this.hill(g, o + 30 * T, base, 64, 28);
        this.bush(g, o + 41 * T, base, 2);
      }
    } else if (deco === 'stars') {
      const f = this.api.frame;
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 97 + 13) % 400) - (cam * 0.1) % 400;
        const x = ((sx % 400) + 400) % 400 - 72;
        const y = 34 + (i * 53) % 150;
        g.pset(x, y, (i + Math.floor(f / 20)) % 7 === 0 ? '#5060a0' : '#e8e8ff');
      }
      g.circ(200 - (cam * 0.05) % 300, 60, 10, '#f8f0c0');
      g.circ(205 - (cam * 0.05) % 300, 56, 9, this.th.sky);
      // Uzak dağ silüetleri
      const off = cam * 0.4;
      for (let k = Math.floor(off / 160) - 1; k <= Math.floor((off + SW) / 160) + 1; k++) {
        const x = k * 160 - off;
        for (let i = 0; i < 160; i++) {
          const h = 30 + Math.abs(((i + k * 37) % 80) - 40) * 0.9;
          g.rect(x + i, SH - h, 1, h, '#1c2c68');
        }
      }
    }
  }

  cloud(g, x, y, n) {
    const w = 16 + n * 16;
    for (let i = 0; i < n + 1; i++) g.circ(x + 8 + i * 16, y + 12, 11, '#000');
    g.rect(x - 1, y + 12, w + 2, 11, '#000');
    for (let i = 0; i < n + 1; i++) g.circ(x + 8 + i * 16, y + 12, 10, '#fcfcfc');
    for (let i = 0; i < n; i++) g.circ(x + 16 + i * 16, y + 7, 8, '#fcfcfc');
    g.rect(x, y + 12, w, 10, '#fcfcfc');
    g.rect(x + 3, y + 18, w - 6, 3, '#bce0fc');
  }

  bush(g, x, base, n) {
    const w = 16 + n * 16;
    for (let i = 0; i < n + 1; i++) g.circ(x + 8 + i * 16, base - 6, 9, '#003800');
    for (let i = 0; i < n + 1; i++) g.circ(x + 8 + i * 16, base - 6, 8, '#80d010');
    g.rect(x, base - 6, w, 6, '#80d010');
    for (let i = 0; i < n + 1; i++) g.rect(x + 6 + i * 16, base - 9, 3, 2, '#00a800');
  }

  hill(g, x, base, w, h) {
    if (x > SW || x + w < 0) return;
    const hw = w / 2;
    for (let pass = 0; pass < 2; pass++) {
      for (let yy = 0; yy <= h; yy++) {
        const t = (h - yy) / h;
        const half = Math.round(hw * Math.sqrt(Math.max(0, 1 - t * t)));
        if (pass === 0) g.rect(x + hw - half - 1, base - h + yy, half * 2 + 2, 1, '#003800');
        else if (yy > 0) g.rect(x + hw - half, base - h + yy, half * 2, 1, '#00a800');
      }
    }
    g.rect(x + hw - 6, base - h + 10, 2, 6, '#003800');
    g.rect(x + hw + 5, base - h + 12, 2, 6, '#003800');
    if (h > 25) g.rect(x + hw - 1, base - h + 20, 2, 6, '#003800');
  }

  drawTiles(g, cam) {
    const ts = this.ts;
    const f = this.api.frame;
    const x0 = Math.floor(cam / T);
    const qf = [0, 0, 0, 1, 2, 1][Math.floor(f / 8) % 6];
    const castle = this.theme === 'castle';
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = x0; tx <= x0 + 16; tx++) {
        const c = this.tile(tx, ty);
        if (c === '.' || c === 'h' || c === 'u') continue;
        let x = tx * T - cam;
        let y = ty * T;
        const b = this.bumps.find((bb) => bb.tx === tx && bb.ty === ty);
        if (b) y -= Math.round(Math.sin((b.t / 10) * Math.PI) * 6);
        switch (c) {
          case '#': g.sprite(castle ? ts.brick : ts.ground, x, y); break;
          case 'B': case 'C': case 'S': case 'P': case 'U': g.sprite(ts.brick, x, y); break;
          case 'X': g.sprite(castle ? ts.brick : ts.hard, x, y); break;
          case 'E': case 'O': g.sprite(ts.used, x, y); break;
          case '?': case 'M': g.sprite(ts.ques[qf], x, y); break;
          case '[': g.sprite(ts.pipeTL, x, y); break;
          case ']': g.sprite(ts.pipeTR, x, y); break;
          case '(': g.sprite(ts.pipeBL, x, y); break;
          case ')': g.sprite(ts.pipeBR, x, y); break;
          case 'q': g.sprite(ts.sideT, x, y); break;
          case 'w': g.sprite(ts.sideB, x, y); break;
          case 's': g.sprite(ts.sideBT, x, y); break;
          case 't': g.sprite(ts.sideBB, x, y); break;
          case '{': g.sprite(ts.treeL, x, y); break;
          case 'T': g.sprite(ts.treeM, x, y); break;
          case '}': g.sprite(ts.treeR, x, y); break;
          case 'I': g.sprite(ts.trunk, x, y); break;
          case '|': g.rect(x + 7, y, 2, T, '#80d010'); g.rect(x + 7, y, 1, T, '#00a800'); break;
          case 'F': g.rect(x + 7, y + 8, 2, 8, '#80d010'); g.circ(x + 8, y + 5, 4, '#00a800'); g.circ(x + 8, y + 5, 3, '#80d010'); break;
          case 'Z': g.sprite(ts.lavaTop[Math.floor(f / 10) % 4], x, y + 4); g.rect(x, y + 8, T, 8, '#d82800'); break;
          case 'z': g.rect(x, y, T, T, '#d82800'); break;
          case 'G': g.sprite(ts.bridge, x, y); break;
          case 'A': g.sprite(ts.axe, x, y); break;
          case 'o': g.sprite((this.theme === 'under' ? COIN_DIM : COIN)[[0, 0, 1, 2, 1][Math.floor(f / 8) % 5]], x + 3, y + 1); break;
          default: break;
        }
      }
    }
    // Zincir (köprünün sağ ucunda)
    if (this.theme === 'castle') {
      for (let ty = 0; ty < ROWS; ty++) {
        for (let tx = x0; tx <= x0 + 16; tx++) {
          if (this.tile(tx, ty) === 'A' && this.tile(tx - 2, ty + 1) === 'G') {
            g.line(tx * T - cam - 1, ty * T + 12, tx * T - cam - 18, ty * T + 14, '#a0a0a0');
          }
        }
      }
    }
  }

  drawCastle(g, x, y) {
    if (x > SW || x + 80 < 0) return;
    const br = this.ts.brick;
    // Alt gövde 5x2 + mazgallar, üst kule 3x2
    for (let i = 0; i < 5; i++) {
      g.sprite(br, x + i * 16, y + 64);
      g.sprite(br, x + i * 16, y + 48);
    }
    for (let i = 0; i < 5; i++) {
      g.rect(x + i * 16, y + 40, 16, 8, '#000');
      g.sprite(br, x + i * 16, y + 32 + 8, { alpha: 1 });
    }
    for (let i = 0; i < 5; i++) g.rect(x + i * 16 + 4, y + 36, 8, 4, this.th.sky);
    for (let i = 1; i < 4; i++) {
      g.sprite(br, x + i * 16, y + 16);
      g.sprite(br, x + i * 16, y + 24);
    }
    for (let i = 1; i < 4; i++) g.sprite(br, x + i * 16, y + 8);
    for (let i = 1; i < 4; i++) g.rect(x + i * 16 + 4, y + 8, 8, 5, this.th.sky);
    // Pencereler ve kapı
    g.rect(x + 22, y + 18, 5, 10, '#000');
    g.rect(x + 53, y + 18, 5, 10, '#000');
    g.rect(x + 32, y + 60, 16, 20, '#000');
    g.circ(x + 40, y + 60, 8, '#000');
    if (this.castleFlag > 0) g.sprite(CASTLE_FLAG, x + 36, y + 8 - this.castleFlag);
  }

  drawItem(g, e, cam) {
    const f = this.api.frame;
    const x = Math.round(e.x - 1 - cam);
    const y = Math.round(e.y);
    if (e.type === 'mush') g.sprite(MUSHROOM, x, y);
    else if (e.type === 'oneup') g.sprite(ONEUP, x, y);
    else if (e.type === 'flower') g.sprite(FLOWER[Math.floor(f / 4) % 4], x, y);
    else if (e.type === 'star') g.sprite(STAR[Math.floor(f / 3) % 4], x, y);
  }

  drawEnt(g, e, cam) {
    const f = this.api.frame;
    const x = Math.round(e.x - cam);
    switch (e.k) {
      case 'walker': {
        const set = WALKER[this.th.walker] || WALKER.over;
        if (e.st === 'flat') g.sprite(set.flat, x - 1, e.y + e.h - 7);
        else g.sprite(set.walk, x - 1, e.y - 1, { flipX: e.st === 'walk' ? Math.floor(e.t / 10) % 2 === 0 : false, flipY: e.st === 'dead' });
        break;
      }
      case 'koopa': {
        const set = e.red ? KOOPA.red : KOOPA.green;
        if (e.st === 'walk') {
          const fr = set.walk[Math.floor(e.t / 12) % 2];
          g.sprite(fr, x - 2, e.y + e.h - 24, { flipX: e.vx > 0 });
          if (e.fly) g.sprite(KOOPA.wing[Math.floor(e.t / 8) % 2], x + (e.vx > 0 ? -4 : 8), e.y + 2, { flipX: e.vx > 0 });
        } else if (e.st === 'dead') {
          g.sprite(set.shell, x - 2, e.y, { flipY: true });
        } else {
          const peek = e.st === 'shell' && e.t > 330;
          g.sprite(peek ? set.peek : set.shell, x - 2 + (peek && f % 4 < 2 ? 1 : 0), e.y + e.h - 14);
        }
        break;
      }
      case 'podoboo':
        if (e.st === 'jump') g.sprite(PODOBOO[0], x - 1, e.y, { flipY: e.vy > 0 });
        break;
      case 'firebar':
        for (let i = 0; i < e.n; i++) {
          const bx = e.cx + Math.cos(e.a) * i * 8 - cam;
          const by = e.cy + Math.sin(e.a) * i * 8;
          g.sprite(FIREBALL[(Math.floor(f / 4) + i) % 2], bx - 4, by - 4);
        }
        break;
      case 'boss':
        if (e.flash % 4 >= 2) break;
        g.sprite(BOSS[Math.floor(e.t / 20) % 2], x - 2, e.y - 2, { flipY: e.st === 'dead' });
        break;
      case 'bossfire':
        g.sprite(BOSS_FIRE[Math.floor(e.t / 6) % 2], x, e.y - 1);
        break;
      case 'item':
        if (e.st !== 'emerge') this.drawItem(g, e, cam);
        break;
      case 'lift': {
        const col = this.theme === 'night' ? '#fca044' : '#fc9838';
        g.rect(x, e.y, e.w, e.h, col);
        for (let i = 0; i < e.w; i += 8) g.rect(x + i + 3, e.y + 2, 3, 3, '#783808');
        g.rect(x, e.y + e.h - 1, e.w, 1, '#783808');
        break;
      }
      case 'npc':
        g.sprite(NPC, x, e.y);
        break;
      default: break;
    }
  }

  drawFx(g, f, cam) {
    const x = Math.round(f.x - cam);
    switch (f.k) {
      case 'pop': g.text(f.text, x, Math.round(f.y), '#fff', { shadow: '#000' }); break;
      case 'bcoin': g.sprite(COIN[Math.floor(f.t / 3) % 4], x, Math.round(f.y)); break;
      case 'debris': g.sprite(this.ts.debris, x, Math.round(f.y), { flipX: f.t % 8 < 4, flipY: f.t % 16 < 8 }); break;
      case 'puff': g.sprite(PUFF, x, Math.round(f.y)); break;
      default: break;
    }
  }

  playerSprite() {
    const p = this.p;
    let set = p.fire ? HERO.fire : HERO.normal;
    if (p.star > 0) set = HERO.star[Math.floor(this.api.frame / (p.star < 120 ? 6 : 2)) % 4];
    if (this.mode === 'trans') {
      const ph = Math.floor(this.modeT / 4) % 2;
      if (this.transKind === 'grow') return ph ? set.big.stand : set.small.mid;
      if (this.transKind === 'shrink') return ph ? HERO.normal.big.stand : HERO.normal.small.stand;
      return HERO.star[Math.floor(this.modeT / 3) % 4].big.stand;
    }
    if (this.mode === 'dying') return HERO.normal.small.die;
    const s = p.big ? set.big : set.small;
    if (p.big && p.duck) return s.duck;
    if (this.mode === 'flag' && this.flagPhase < 2) return s.jump;
    if (this.mode === 'pipe' && this.pipe?.kind === 'down') return s.stand;
    if (this.mode === 'emerge') return s.stand;
    if (!p.onGround && this.mode === 'play') return s.jump;
    if (p.throwT > 0 && p.big) return s.throw;
    if (p.skid) return s.skid;
    if (Math.abs(p.vx) > 0.05 || this.mode !== 'play') {
      return [s.walk1, s.walk2, s.walk3][Math.floor(p.anim) % 3];
    }
    return s.stand;
  }

  drawPlayer(g, cam) {
    const p = this.p;
    if (p.hidden) return;
    if (p.inv > 0 && this.mode === 'play' && Math.floor(p.inv / 2) % 2) return;
    const spr = this.playerSprite();
    const x = Math.round(p.x - 2 - cam);
    const y = Math.round(p.y + p.h - spr.height);
    if (this.mode === 'pipe' && this.pipe?.kind === 'down') {
      // Boru ağzından aşağı: sprite borunun arkasında kalır
      g.sprite(spr, x, y);
      return;
    }
    g.sprite(spr, x, y, { flipX: p.dir < 0 });
  }

  drawHud() {
    const g = this.api.gfx;
    const score = this.api.score;
    const hi = Math.max(this.api.hiScore || 0, score);
    const f = this.api.frame;
    const sh = '#000';
    g.text('BIYIK', 8, 6, '#fff', { shadow: sh });
    g.text(String(score).padStart(6, '0'), 8, 15, '#fff', { shadow: sh });
    g.text('REKOR', 52, 6, '#fff', { shadow: sh });
    g.text(String(hi).padStart(6, '0'), 52, 15, '#fff', { shadow: sh });
    const cw = [5, 5, 3, 1, 3][Math.floor(f / 8) % 5];
    g.rect(100 - Math.ceil(cw / 2), 15, cw, 7, '#fcd800');
    if (cw > 2) g.rect(100 - Math.ceil(cw / 2) + 1, 16, 1, 4, '#fcfcd0');
    g.text(`X${String(this.coins).padStart(2, '0')}`, 106, 15, '#fff', { shadow: sh });
    g.text('DÜNYA', 136, 6, '#fff', { shadow: sh });
    g.text(`${this.world}-${this.level.name}`, 145, 15, '#fff', { shadow: sh });
    g.text('SÜRE', 178, 6, '#fff', { shadow: sh });
    if (this.mode !== 'intro' || this.firstFrame) g.text(String(this.time).padStart(3, '0'), 181, 15, this.time <= 100 ? '#fc9838' : '#fff', { shadow: sh });
    g.text('CAN', 222, 6, '#fff', { shadow: sh });
    g.text(String(Math.max(0, this.lives)), 228, 15, '#fff', { shadow: sh });
  }
}

