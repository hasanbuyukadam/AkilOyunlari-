// Balon Ejder — Bubble Bobble tarzı tek ekranlı platform oyunu.
import { DRAGON, DRAGON_HURT, DRAGON_ICON, ENEMY, BARON, ROCK, FRUITS, BLOCKS, BLOCK_SHADOW } from './art.js';
import { LEVELS, COLS, ROWS, buildLevel } from './levels.js';

export const meta = {
  id: 'balon-ejder',
  width: 256,
  height: 224,
  buttons: { a: 'BALON', b: 'ZIPLA' },
  help: [
    'A ile balon üfle: düşmanı balona hapset, sonra balona dokunarak patlat.',
    'Zıplama (B) basılıyken balonların üstünde sekebilirsin.',
    'Birbirine değen balonlar zincirleme patlar: aynı anda çok düşman = büyük bonus!',
    'Geç kalırsan "ACELE ET!" der, sonra yenilmez hayalet gelir. EKSTRA harflerini topla: +1 can.',
  ],
};

const TS = 8;
const OY = 16; // oyun alanının ekrandaki üst kenarı
const PW = COLS * TS; // 256
const PH = ROWS * TS; // 208
const WORD = 'EKSTRA';
const START = { x: 32, y: 200 };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export default class BalonEjder {
  constructor(api) {
    this.api = api;
    this.preview = !!api.preview;
    this.levelNo = 0;
    this.lives = 3;
    this.letters = new Set();
    this.botKeys = new Set();
    this.botPress = new Set();
    this.botT = 0;
    this.ctl = this.preview ? { held: (b) => this.botKeys.has(b), pressed: (b) => this.botPress.has(b) } : api.input;
    this.p = this.newPlayer();
    this.loadLevel(0);
    this.mode = this.preview ? 'play' : 'start';
    this.modeT = this.preview ? 100 : 0;
    this.fx = [];
  }

  get loop() { return Math.floor(this.levelNo / LEVELS.length); }

  get mul() { return Math.min(1.8, 1 + 0.08 * this.levelNo); }

  newPlayer() {
    return { x: START.x, y: START.y, vx: 0, vy: 0, dir: 1, onGround: true, anim: 0, blowT: 0, cd: 0, inv: 120, dead: 0 };
  }

  // ---------------------------------------------------------------- tur yükleme
  loadLevel(n) {
    const def = LEVELS[n % LEVELS.length];
    this.def = def;
    this.map = buildLevel(def);
    this.pal = def.pal % BLOCKS.length;
    this.enemies = [];
    this.bubbles = [];
    this.items = [];
    this.shots = [];
    this.dying = [];
    this.baron = null;
    this.levelT = 0;
    this.clearT = 0;
    this.hurryAt = Math.max(900, 1800 - this.loop * 300);
    this.hurryShown = 0;
    this.letterT = 400 + Math.floor(Math.random() * 400);
    let i = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const ch = this.map[r][c];
        if ('abcd'.includes(ch)) {
          this.map[r][c] = '.';
          this.enemies.push(this.mkEnemy(ch, c * TS + 8, (r + 1) * TS, i++));
        }
      }
    }
  }

  mkEnemy(type, x, y, i) {
    return {
      type, x, y, vx: 0, vy: 0, dir: i % 2 ? 1 : -1, onGround: false, angry: this.loop > 0 && i % 3 === 0, t: 0,
      enter: 50 + i * 8, ex: x, ey: y, cd: 60 + i * 20, fly: type === 'c', fdx: i % 2 ? 1 : -1, fdy: 1,
    };
  }

  // ---------------------------------------------------------------- harita
  solid(c, r) {
    if (c < 0 || c >= COLS) return true;
    if (r < 0 || r >= ROWS) return false;
    return this.map[r][c] === '#';
  }

  // Yandan geçilmez: yan duvarlar ve en az 2 karo yüksekliğindeki yapılar
  wall(c, r) {
    if (c <= 1 || c >= COLS - 2) return true;
    return this.solid(c, r) && (this.solid(c, r - 1) || this.solid(c, r + 1));
  }

  // Ayak altı yüzey (üstü boş blok)
  surface(c, r) { return r > 0 && this.solid(c, r) && !this.solid(c, r - 1); }

  surfaceRow(r, x0, x1) {
    for (let c = Math.floor(x0 / TS); c <= Math.floor(x1 / TS); c++) if (this.surface(c, r)) return true;
    return false;
  }

  // Karakter fiziği (x: merkez, y: ayak). grav/maxFall ile.
  moveChar(e, grav, maxFall) {
    // Yatay
    if (e.vx) {
      const nx = e.x + e.vx;
      const edge = nx + Math.sign(e.vx) * 6;
      const r = Math.floor((e.y - 7) / TS);
      if (this.wall(Math.floor(edge / TS), r)) e.vx = 0, e.hitWall = true;
      else { e.x = nx; e.hitWall = false; }
    }
    e.x = clamp(e.x, 22, PW - 22);
    // Dikey
    const prevY = e.y;
    e.y += e.vy;
    e.vy = Math.min(e.vy + grav, maxFall);
    e.onGround = false;
    if (e.vy >= 0 && e.y >= prevY) {
      for (let r = Math.floor(prevY / TS); r <= Math.floor(e.y / TS); r++) {
        const top = r * TS;
        if (prevY <= top + 2 && e.y >= top && this.surfaceRow(r, e.x - 5, e.x + 5)) {
          e.y = top; e.vy = 0; e.onGround = true;
          break;
        }
      }
    } else if (e.y - 16 < TS && this.solid(Math.floor(e.x / TS), 0)) {
      // Tavan
      e.y = TS + 16; e.vy = 0;
    }
    // Alttan düşen üstten girer
    if (e.y > PH + 18) e.y -= PH + 8;
    if (e.y < 4) e.y = 4;
  }

  // ---------------------------------------------------------------- güncelleme
  update() {
    try {
      this.step();
    } catch (err) {
      if (this.preview) return;
      this.p = this.newPlayer();
      this.mode = 'play';
    }
  }

  step() {
    this.modeT++;
    if (this.preview) this.botThink();
    switch (this.mode) {
      case 'start':
        if (this.modeT === 1) this.api.sfx.seq([['C5', 0.1], ['E5', 0.1], ['G5', 0.1], ['E5', 0.1], ['C6', 0.25]], { vol: 0.1 });
        if (this.modeT > 100) { this.mode = 'play'; this.modeT = 0; }
        this.updateEnemiesEnter();
        break;
      case 'play': this.updatePlay(); break;
      case 'dead': this.updateDead(); break;
      case 'trans': this.updateTrans(); break;
      case 'gameover':
        if (this.modeT === 1) this.api.sfx.play('gameover');
        if (this.modeT === 180) this.api.gameOver();
        break;
      default: break;
    }
    this.updateFx();
  }

  updateEnemiesEnter() {
    for (const e of this.enemies) if (e.enter > 0) this.enterStep(e);
  }

  enterStep(e) {
    e.enter--;
    // Yukarıdan yerine süzülerek iner
    e.x = e.ex;
    e.y = e.ey - Math.max(0, e.enter) * 3;
    if (e.y < 4) e.y = 4;
  }

  updatePlay() {
    this.levelT++;
    this.updatePlayer();
    this.updateEnemies();
    this.updateBubbles();
    this.updateShots();
    this.updateDying();
    this.updateItems();
    this.updateBaron();
    this.updateLetters();
    if (this.mode !== 'play') return;
    // Acele et
    if (this.levelT === this.hurryAt) {
      this.hurryShown = 150;
      this.api.sfx.seq([['A5', 0.08], ['A5', 0.08], [0, 0.04], ['A5', 0.08], ['A5', 0.08]], { vol: 0.12 });
      for (const e of this.enemies) e.angry = true;
    }
    if (this.hurryShown > 0) this.hurryShown--;
    // Tur bitti mi
    const alive = this.enemies.length + this.dying.length + this.bubbles.filter((b) => b.enemy).length;
    if (alive === 0) {
      this.clearT++;
      if (this.clearT === 1) this.baron = null;
      if (this.clearT > 200) this.startTrans();
    } else this.clearT = 0;
  }

  // ---------------------------------------------------------------- oyuncu
  updatePlayer() {
    const p = this.p;
    const c = this.ctl;
    if (p.inv > 0) p.inv--;
    if (p.cd > 0) p.cd--;
    if (p.blowT > 0) p.blowT--;
    const ix = (c.held('right') ? 1 : 0) - (c.held('left') ? 1 : 0);
    if (ix) p.dir = ix;
    p.vx = ix * 1.1;
    if (p.onGround && c.pressed('b')) {
      p.vy = -3.6;
      p.onGround = false;
      this.api.sfx.tone(400, 0.1, { slide: 800, vol: 0.08 });
    }
    const grav = p.vy < 0 ? 0.15 : 0.12;
    this.moveChar(p, grav, 1.6);
    if (p.onGround && p.vx) p.anim += 0.15;
    // Balon üfle
    if (c.pressed('a') && p.cd <= 0) {
      const n = this.bubbles.filter((b) => !b.enemy && !b.letter).length;
      if (n < 12) {
        this.bubbles.push({ x: p.x + p.dir * 8, y: p.y - 8, vx: p.dir * 3.4, vy: 0, phase: 'shot', t: 0, dir: p.dir, enemy: null, life: 0 });
        p.blowT = 10;
        p.cd = 12;
        this.api.sfx.tone(700, 0.08, { slide: 1100, type: 'triangle', vol: 0.12 });
      }
    }
  }

  playerBox() {
    const p = this.p;
    return { x: p.x - 6, y: p.y - 14, w: 12, h: 13 };
  }

  killPlayer() {
    const p = this.p;
    if (p.inv > 0 || this.mode !== 'play' || this.preview) return;
    this.mode = 'dead';
    this.modeT = 0;
    this.api.sfx.play('die');
  }

  updateDead() {
    if (this.modeT >= 110) {
      this.lives--;
      if (this.lives <= 0) {
        this.mode = 'gameover';
        this.modeT = 0;
        return;
      }
      this.p = this.newPlayer();
      this.baron = null;
      this.levelT = Math.min(this.levelT, Math.max(0, this.hurryAt - 600));
      this.shots = [];
      this.mode = 'play';
      this.modeT = 0;
    }
  }

  // ---------------------------------------------------------------- düşmanlar
  updateEnemies() {
    const p = this.p;
    for (const e of this.enemies) {
      e.t++;
      if (e.enter > 0) { this.enterStep(e); continue; }
      const sp = (e.angry ? 1.0 : 0.55) * this.mul;
      switch (e.type) {
        case 'a': case 'b': {
          if (e.onGround) {
            e.vx = e.dir * sp;
            // Kenarda dön veya düş
            const ahead = e.x + e.dir * 7;
            if (!this.surfaceRow(Math.floor(e.y / TS), ahead - 1, ahead + 1) && Math.random() < 0.6) e.dir = -e.dir;
            // Oyuncu yukarıdaysa zıpla
            if (p.y < e.y - 20 && Math.abs(p.x - e.x) < 60 && Math.random() < 0.012 * (e.angry ? 2 : 1)) { e.vy = -3.5; e.onGround = false; }
            else if (Math.random() < 0.004) e.dir = -e.dir;
            // Oyuncuya yönel (bazen)
            if (Math.random() < 0.01) e.dir = p.x < e.x ? -1 : 1;
            // Büyücü taş atar
            if (e.type === 'b' && --e.cd <= 0 && Math.abs(p.y - e.y) < 10 && Math.sign(p.x - e.x) === e.dir) {
              e.cd = Math.round(120 / this.mul);
              this.shots.push({ x: e.x + e.dir * 8, y: e.y - 8, vx: e.dir * (e.angry ? 2 : 1.5), t: 0 });
              this.api.sfx.tone(200, 0.06, { vol: 0.08 });
            }
          } else {
            e.vx = e.dir * sp * 0.6;
          }
          this.moveChar(e, e.vy < 0 ? 0.15 : 0.12, 1.6);
          if (e.hitWall) e.dir = -e.dir;
          break;
        }
        case 'c': {
          // Çapraz uçar, bloklardan seker
          const s = sp * 0.9;
          const nx = e.x + e.fdx * s;
          const ny = e.y + e.fdy * s;
          const cx = Math.floor((nx + e.fdx * 7) / TS);
          if (this.solid(cx, Math.floor((e.y - 8) / TS)) || nx < 24 || nx > PW - 24) e.fdx = -e.fdx; else e.x = nx;
          const cy = Math.floor((e.fdy > 0 ? ny : ny - 15) / TS);
          if (this.solid(Math.floor(e.x / TS), cy) || ny < 26 || ny > PH - 8) e.fdy = -e.fdy; else e.y = ny;
          e.dir = e.fdx;
          break;
        }
        case 'd': {
          if (e.onGround) {
            e.squash = (e.squash || 0) + 1;
            if (e.squash > 12) {
              e.squash = 0;
              e.vy = -3.4 - Math.random() * 0.6;
              e.dir = p.x < e.x ? -1 : 1;
              if (Math.random() < 0.3) e.dir = -e.dir;
            }
            e.vx = 0;
          } else e.vx = e.dir * sp * 1.1;
          this.moveChar(e, e.vy < 0 ? 0.15 : 0.12, 1.8);
          if (e.hitWall) e.dir = -e.dir;
          break;
        }
        default: break;
      }
      // Oyuncuya temas
      if (Math.abs(e.x - p.x) < 11 && Math.abs((e.y - 8) - (p.y - 8)) < 12) this.killPlayer();
    }
  }

  updateShots() {
    const p = this.p;
    for (const s of this.shots) {
      s.t++;
      s.x += s.vx;
      if (this.wall(Math.floor((s.x + Math.sign(s.vx) * 4) / TS), Math.floor(s.y / TS)) || s.x < 16 || s.x > PW - 16) s.gone = true;
      if (Math.abs(s.x - p.x) < 8 && Math.abs(s.y - (p.y - 8)) < 9) { this.killPlayer(); s.gone = true; }
    }
    this.shots = this.shots.filter((s) => !s.gone);
  }

  // ---------------------------------------------------------------- balonlar
  updateBubbles() {
    const p = this.p;
    const tx = this.def.gx * TS + 16 + 4;
    const ty = this.def.gy * TS + 12;
    const c = this.ctl;
    for (const b of this.bubbles) {
      b.t++;
      if (b.popT > 0) {
        if (--b.popT === 0) this.popBubble(b, b.chain);
        continue;
      }
      if (b.phase === 'shot') {
        b.x += b.vx;
        b.vx *= 0.93;
        if (this.wall(Math.floor((b.x + b.dir * 7) / TS), Math.floor(b.y / TS))) { b.x -= b.vx; b.vx = 0; }
        // Düşman yakala
        for (const e of this.enemies) {
          if (e.enter > 0) continue;
          if (Math.abs(e.x - b.x) < 11 && Math.abs((e.y - 8) - b.y) < 11) {
            b.enemy = e;
            e.caught = true;
            b.phase = 'float';
            b.t = 0;
            this.api.sfx.tone(500, 0.1, { slide: 250, type: 'triangle', vol: 0.12 });
            break;
          }
        }
        if (b.enemy) this.enemies = this.enemies.filter((e) => !e.caught);
        if (Math.abs(b.vx) < 0.4 || b.t > 26) { b.phase = 'float'; b.t = 0; }
        continue;
      }
      // Süzülme: rüzgâr toplanma noktasına
      const dx = tx - b.x;
      const dy = ty - b.y;
      b.vx = clamp(b.vx + Math.sign(dx) * 0.02, -0.45, 0.45);
      if (Math.abs(dx) < 3) b.vx *= 0.8;
      const up = b.y > ty + 3 ? -0.45 : clamp(dy * 0.05, -0.3, 0.3);
      b.vy = b.vy * 0.85 + up * 0.15;
      b.x += b.vx + Math.sin((b.t + b.x) * 0.08) * 0.15;
      b.y += b.vy;
      b.x = clamp(b.x, 24, PW - 24);
      b.y = clamp(b.y, 16, PH);
      b.life++;
      // Süre doldu
      if (b.enemy) {
        const esc = Math.max(300, 600 - this.loop * 60 - (b.enemy.angry ? 120 : 0));
        if (b.life > esc) {
          // Düşman kaçar, öfkelenir
          const e = b.enemy;
          e.caught = false;
          e.angry = true;
          e.x = b.x; e.y = b.y + 8; e.vy = -1; e.onGround = false; e.enter = 0;
          this.enemies.push(e);
          b.gone = true;
          this.api.sfx.tone(300, 0.15, { slide: 600, vol: 0.1 });
          continue;
        }
      } else if (b.letter) {
        if (b.life > 900) b.gone = true;
      } else if (b.life > 540) {
        b.gone = true;
        this.fx.push({ k: 'pop', x: b.x, y: b.y, t: 0 });
        continue;
      }
      // Oyuncu ile temas
      if (this.mode === 'play' && Math.abs(b.x - p.x) < 12 && Math.abs(b.y - (p.y - 8)) < 13) {
        if (p.vy > 0 && p.y <= b.y + 2 && c.held('b')) {
          p.vy = -3.3;
          p.y = b.y - 7;
          b.vy += 0.6;
          this.api.sfx.tone(600, 0.05, { type: 'triangle', vol: 0.08 });
        } else if (b.t > 6) {
          this.popBubble(b, { kills: 0 });
        }
      }
    }
    // Birbirini it
    const fl = this.bubbles.filter((b) => b.phase === 'float' && !b.gone);
    for (let i = 0; i < fl.length; i++) {
      for (let j = i + 1; j < fl.length; j++) {
        const a = fl[i];
        const b = fl[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d < 15 && d > 0.01) {
          const push = (15 - d) * 0.08;
          a.x -= dx / d * push; a.y -= dy / d * push;
          b.x += dx / d * push; b.y += dy / d * push;
        }
      }
    }
    this.bubbles = this.bubbles.filter((b) => !b.gone);
  }

  popBubble(b, chain) {
    if (b.gone) return;
    b.gone = true;
    this.fx.push({ k: 'pop', x: b.x, y: b.y, t: 0 });
    this.api.addScore(10);
    if (b.letter) {
      this.letters.add(b.letter);
      this.api.sfx.play('pickup');
      if (WORD.split('').every((l) => this.letters.has(l))) {
        this.letters.clear();
        this.lives++;
        this.fx.push({ k: 'text', x: PW / 2, y: 90, t: 0, text: 'EKSTRA! +1 CAN', big: true });
        this.api.sfx.play('levelup');
      }
    } else if (b.enemy) {
      chain.kills = (chain.kills || 0) + 1;
      const k = chain.kills;
      const pts = 1000 * 2 ** Math.min(6, k - 1);
      this.api.addScore(pts);
      this.fx.push({ k: 'text', x: b.x, y: b.y - 6, t: 0, text: String(pts) });
      this.dying.push({ type: b.enemy.type, x: b.x, y: b.y + 8, vx: (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random()), vy: -3.2, t: 0, chain, order: k });
      this.api.sfx.play('hit');
    } else {
      this.api.sfx.tone(900, 0.04, { vol: 0.06 });
    }
    // Zincirleme: değen balonlar da patlar
    for (const o of this.bubbles) {
      if (o.gone || o === b || o.popT > 0 || o.phase !== 'float') continue;
      if (Math.hypot(o.x - b.x, o.y - b.y) < 19) { o.popT = 4; o.chain = chain; }
    }
  }

  // Öldürülen düşmanlar dönerek düşer, meyveye dönüşür
  updateDying() {
    for (const d of this.dying) {
      d.t++;
      d.x += d.vx;
      if (d.x < 24 || d.x > PW - 24) { d.vx = -d.vx; d.x = clamp(d.x, 24, PW - 24); }
      const prevY = d.y;
      d.y += d.vy;
      d.vy = Math.min(d.vy + 0.12, 2.2);
      if (d.y > PH + 18) d.y -= PH + 8;
      if (d.t > 30 && d.vy > 0) {
        for (let r = Math.floor(prevY / TS); r <= Math.floor(d.y / TS); r++) {
          if (prevY <= r * TS + 2 && d.y >= r * TS && this.surfaceRow(r, d.x - 4, d.x + 4)) {
            d.gone = true;
            const idx = Math.min(FRUITS.length - 1, (d.order - 1) + Math.floor(this.levelNo / 6));
            this.items.push({ x: d.x, y: r * TS, fruit: idx, t: 0 });
            break;
          }
        }
      }
      if (d.t > 400) d.gone = true;
    }
    this.dying = this.dying.filter((d) => !d.gone);
  }

  updateItems() {
    const p = this.p;
    for (const it of this.items) {
      it.t++;
      if (it.t > 720) it.gone = true;
      if (this.mode === 'play' && it.t > 10 && Math.abs(it.x - p.x) < 12 && Math.abs(it.y - p.y) < 14) {
        it.gone = true;
        const v = FRUITS[it.fruit].v;
        this.api.addScore(v);
        this.fx.push({ k: 'text', x: it.x, y: it.y - 16, t: 0, text: String(v) });
        this.api.sfx.play('coin');
      }
    }
    this.items = this.items.filter((i) => !i.gone);
  }

  updateBaron() {
    const p = this.p;
    if (!this.baron && this.levelT > this.hurryAt + 300 && this.clearT === 0) {
      this.baron = { x: PW / 2, y: 30, t: 0, sp: 0.45 + this.loop * 0.1 };
      this.api.sfx.seq([['E4', 0.15], ['D#4', 0.15], ['D4', 0.15], ['C#4', 0.3]], { type: 'sawtooth', vol: 0.08 });
    }
    const b = this.baron;
    if (!b) return;
    b.t++;
    b.sp = Math.min(1.4, b.sp + 0.0006);
    const dx = p.x - b.x;
    const dy = (p.y - 8) - b.y;
    const d = Math.hypot(dx, dy) || 1;
    b.x += dx / d * b.sp;
    b.y += dy / d * b.sp;
    if (d < 11) this.killPlayer();
  }

  updateLetters() {
    if (--this.letterT > 0) return;
    this.letterT = 700 + Math.floor(Math.random() * 500);
    const missing = WORD.split('').filter((l) => !this.letters.has(l));
    const pool = missing.length && Math.random() < 0.7 ? missing : WORD.split('');
    const letter = pool[Math.floor(Math.random() * pool.length)];
    const fromLeft = Math.random() < 0.5;
    this.bubbles.push({ x: fromLeft ? 40 : PW - 40, y: PH - 4, vx: 0, vy: -0.4, phase: 'float', t: 0, dir: 1, enemy: null, letter, life: 0 });
  }

  updateFx() {
    for (const f of this.fx) {
      f.t++;
      if (f.k === 'pop' && f.t > 10) f.gone = true;
      if (f.k === 'text') { if (!f.big) f.y -= 0.5; if (f.t > (f.big ? 150 : 50)) f.gone = true; }
    }
    this.fx = this.fx.filter((f) => !f.gone);
  }

  // ---------------------------------------------------------------- tur geçişi
  startTrans() {
    this.mode = 'trans';
    this.modeT = 0;
    this.oldMap = this.map;
    this.oldPal = this.pal;
    this.transFrom = { x: this.p.x, y: this.p.y };
    this.levelNo++;
    this.loadLevel(this.levelNo);
    for (const e of this.enemies) e.enter = 9999;
    this.api.sfx.play('levelup');
  }

  updateTrans() {
    const t = this.modeT;
    const k = Math.min(1, t / 120);
    const p = this.p;
    p.x = this.transFrom.x + (START.x - this.transFrom.x) * k;
    p.y = this.transFrom.y + (START.y - this.transFrom.y) * k;
    if (t >= 130) {
      this.p = this.newPlayer();
      this.p.inv = 60;
      for (const [i, e] of this.enemies.entries()) e.enter = 50 + i * 8;
      this.mode = 'start';
      this.modeT = 0;
    }
  }

  // ---------------------------------------------------------------- otomatik pilot
  botThink() {
    const p = this.p;
    this.botT++;
    const keys = new Set();
    const press = new Set();
    const target = this.enemies.find((e) => e.enter <= 0) || this.items[0] || this.bubbles.find((b) => b.enemy);
    if (target) {
      const ty = target.y;
      if (Math.abs(target.x - p.x) > 20) keys.add(target.x < p.x ? 'left' : 'right');
      if (ty < p.y - 12 && p.onGround && this.botT % 40 === 0) press.add('b');
      if (Math.abs(ty - p.y) < 12 && this.botT % 14 === 0) press.add('a');
    } else if (this.botT % 30 === 0) press.add('a');
    if (this.botT % 120 === 60) press.add('b');
    this.botKeys = keys;
    this.botPress = press;
  }

  // ---------------------------------------------------------------- çizim
  draw() {
    const g = this.api.gfx;
    g.cls('#000');
    if (this.mode === 'gameover') {
      this.drawHud(g);
      g.text('OYUN BİTTİ', PW / 2, 100, '#ff4060', { align: 'center', scale: 2 });
      return;
    }
    if (this.mode === 'trans') {
      const off = Math.round(Math.min(1, this.modeT / 120) * PH);
      this.drawMap(g, this.oldMap, this.oldPal, OY - off);
      this.drawMap(g, this.map, this.pal, OY + PH - off);
      g.rect(0, 0, PW, OY, '#000');
      this.drawPlayerBubble(g);
      this.drawHud(g);
      return;
    }
    this.drawMap(g, this.map, this.pal, OY);
    for (const it of this.items) {
      if (it.t > 600 && it.t % 8 < 4) continue;
      const s = FRUITS[it.fruit].s;
      g.sprite(s, Math.round(it.x - 8), Math.round(it.y - s.height + OY));
    }
    for (const e of this.enemies) this.drawEnemy(g, e);
    for (const d of this.dying) {
      const set = ENEMY[d.type].angry;
      const fl = Math.floor(d.t / 4) % 4;
      g.sprite(set[0], Math.round(d.x - 8), Math.round(d.y - 16 + OY), { flipX: fl % 2 === 1, flipY: fl >= 2 });
    }
    for (const s of this.shots) g.sprite(ROCK, Math.round(s.x - 4), Math.round(s.y - 4 + OY), { flipX: s.t % 8 < 4, flipY: s.t % 16 < 8 });
    this.drawPlayer(g);
    for (const b of this.bubbles) this.drawBubble(g, b);
    if (this.baron) g.sprite(BARON[Math.floor(this.baron.t / 10) % 2], Math.round(this.baron.x - 8), Math.round(this.baron.y - 7 + OY), { flipX: this.p.x < this.baron.x });
    for (const f of this.fx) {
      if (f.k === 'pop') {
        const r = 4 + f.t;
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          g.pset(f.x + Math.cos(a) * r, f.y + Math.sin(a) * r + OY, f.t < 5 ? '#ffffff' : '#80e0ff');
        }
      } else if (f.k === 'text') {
        if (f.big) g.text(f.text, f.x, f.y + OY, f.t % 10 < 5 ? '#ffe040' : '#ff6080', { align: 'center', shadow: '#000' });
        else g.text(f.text, Math.round(f.x), Math.round(f.y + OY), '#ffffff', { align: 'center', shadow: '#000' });
      }
    }
    if (this.mode === 'start') {
      g.text(`TUR ${this.levelNo + 1}`, PW / 2, 84 + OY, '#ffe040', { align: 'center', scale: 2, shadow: '#000' });
      if (this.modeT > 40) g.text('HAZIR!', PW / 2, 110 + OY, '#ffffff', { align: 'center', shadow: '#000' });
    }
    if (this.hurryShown > 0 && this.hurryShown % 20 < 13) {
      g.text('ACELE ET!', PW / 2, 96 + OY, '#ff4040', { align: 'center', scale: 2, shadow: '#000' });
    }
    this.drawHud(g);
  }

  drawMap(g, map, pal, oy) {
    const spr = BLOCKS[pal];
    const sh = BLOCK_SHADOW[pal];
    for (let r = 0; r < ROWS; r++) {
      const y = oy + r * TS;
      if (y < -TS || y > 224) continue;
      for (let c = 0; c < COLS; c++) {
        if (map[r][c] !== '#') continue;
        // BB tarzı gölge (sağ-alt)
        if (c + 1 < COLS && map[r][c + 1] !== '#' && c < COLS - 2) g.rect(c * TS + TS, y + 2, 2, TS, sh);
        if (r + 1 < ROWS && map[r + 1][c] !== '#') g.rect(c * TS + 2, y + TS, TS, 2, sh);
        g.sprite(spr, c * TS, y);
      }
    }
  }

  drawEnemy(g, e) {
    const set = ENEMY[e.type][e.angry ? 'angry' : 'normal'];
    const fr = e.type === 'd' ? (e.onGround && e.squash < 6 ? 1 : 0) : Math.floor(e.t / 10) % 2;
    const x = Math.round(e.x - 8);
    const y = Math.round(e.y - 16 + OY);
    if (e.enter > 0 && e.enter < 9999) {
      // Giriş: hafif yanıp sönme
      if (e.enter % 6 < 3) return;
    }
    if (e.enter >= 9999) return;
    g.sprite(set[fr], x, y, { flipX: e.dir > 0 });
  }

  drawPlayer(g) {
    const p = this.p;
    if (this.mode === 'dead') {
      const t = this.modeT;
      const fl = Math.floor(t / 4) % 4;
      g.sprite(DRAGON_HURT.walk[0], Math.round(p.x - 8), Math.round(p.y - 16 + OY - Math.min(10, t / 3)), { flipX: fl % 2 === 1, flipY: fl >= 2 });
      for (let i = 0; i < 5; i++) {
        const a = t * 0.12 + i * 1.26;
        g.text('*', p.x + Math.cos(a) * 14 - 2, p.y - 20 + Math.sin(a) * 6 + OY, '#ffe040');
      }
      return;
    }
    if (p.inv > 0 && p.inv % 6 < 3 && this.mode === 'play') return;
    const set = DRAGON;
    let spr;
    if (p.blowT > 0) spr = set.blow;
    else if (!p.onGround) spr = set.jump;
    else spr = set.walk[p.vx ? Math.floor(p.anim) % 3 : 0];
    g.sprite(spr, Math.round(p.x - 8), Math.round(p.y - 16 + OY), { flipX: p.dir < 0 });
  }

  drawPlayerBubble(g) {
    const p = this.p;
    const x = Math.round(p.x);
    const y = Math.round(p.y - 8 + OY);
    g.sprite(DRAGON.walk[0], x - 8, y - 8, { flipX: p.dir < 0 });
    g.circb(x, y, 11, '#80f0c0');
    g.circb(x, y, 10, '#40c090');
    g.rect(x - 6, y - 7, 3, 2, '#ffffff');
  }

  drawBubble(g, b) {
    const x = Math.round(b.x);
    const y = Math.round(b.y + OY);
    const f = this.api.frame;
    if (b.enemy) {
      const set = ENEMY[b.enemy.type][b.enemy.angry ? 'angry' : 'normal'];
      const esc = Math.max(300, 600 - this.loop * 60 - (b.enemy.angry ? 120 : 0));
      const left = esc - b.life;
      g.sprite(set[Math.floor(b.t / 20) % 2], x - 8, y - 8, { flipY: false });
      let col = '#70e8ff';
      if (left < 180) col = '#ffe040';
      if (left < 80) col = f % 6 < 3 ? '#ff4040' : '#ffffff';
      g.circb(x, y, 8, col);
      g.circb(x, y, 9, col);
      g.rect(x - 5, y - 6, 2, 2, '#ffffff');
      return;
    }
    if (b.letter) {
      g.circ(x, y, 9, '#2060e0');
      g.circb(x, y, 9, '#a0d0ff');
      g.text(b.letter, x - 2, y - 3, f % 20 < 10 ? '#ffffff' : '#ffe040');
      return;
    }
    let col = b.phase === 'shot' ? '#a0ffb0' : '#60e090';
    if (b.life > 440) col = f % 8 < 4 ? '#ff80a0' : '#60e090';
    g.circb(x, y, 7, col);
    g.circb(x, y, 6, b.phase === 'shot' ? '#60d080' : '#2a9060');
    g.rect(x - 4, y - 4, 2, 2, '#ffffff');
    g.pset(x + 3, y + 3, '#ffffff');
  }

  drawHud(g) {
    const score = this.api.score;
    const hi = Math.max(this.api.hiScore || 0, score);
    g.text('1UP', 8, 1, '#40ff60');
    g.text(String(score).padStart(6, '0'), 8, 9, '#ffffff');
    g.text('REKOR', PW / 2, 1, '#ff6060', { align: 'center' });
    g.text(String(hi).padStart(6, '0'), PW / 2, 9, '#ffffff', { align: 'center' });
    g.text(`TUR ${String(this.levelNo + 1).padStart(2, '0')}`, PW - 8, 5, '#ffe040', { align: 'right' });
    // Canlar (alt sol köşe)
    const n = Math.min(8, Math.max(0, this.lives - 1));
    for (let i = 0; i < n; i++) g.sprite(DRAGON_ICON, 2 + i * 9, OY + PH - 7);
    // EKSTRA harfleri (sağ kenar)
    WORD.split('').forEach((l, i) => {
      const got = this.letters.has(l);
      g.text(l, PW - 7, OY + 24 + i * 10, got ? '#ffe040' : '#404060');
    });
  }
}
