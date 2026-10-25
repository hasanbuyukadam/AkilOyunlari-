// Kule Kartları — Arcomage / Ant Cards mantığıyla, robot kuleleri temalı kart düellosu.
import { createGfx } from '../../js/engine/gfx.js';
import * as L from './logic.js';
import { cardIcon, resIcons } from './icons.js';

export const meta = {
  id: 'kule-kartlari',
  width: 480,
  height: 272,
  buttons: { a: 'OYNA', b: 'AT' },
  help: [
    'Sağ/sol: kart seç. A: kartı oyna, B: kartı at (sıranı harcar). Dokunmatik: karta dokun, tekrar dokununca oynanır.',
    'Her tur başında MADEN, REAKTÖR ve FABRİKA seviyesi kadar METAL, ENERJİ ve ROBOT kazanırsın.',
    'Hasar önce ZIRH\'a, sonra KULE\'ye işler. "TEKRAR OYNA" kartlarından sonra bir kart daha oynarsın.',
    'Kazanmak için: kuleni 50\'ye çıkar, bir kaynağı 150\'ye ulaştır ya da rakip kuleyi yık.',
    'Her galibiyet seriyi artırır, rakip güçlenir. Bir düello kaybedersen oyun biter.',
  ],
};

const W = 480;
const H = 272;
const GROUND = 150;
const CARD_W = 74;
const CARD_H = 94;
const HAND_Y = 174;
const cardX = (i) => 7 + i * 78;
const TOWER_X = [140, 340];
const WALL_X = [176, 294];
const PANEL_X = [4, 388];
const BTN_PLAY = { x: 190, y: 153, w: 48, h: 15 };
const BTN_DISC = { x: 242, y: 153, w: 48, h: 15 };
const CENTER = { x: 240 - CARD_W / 2, y: 30 };

const TYPE_COL = {
  metal: { body: '#34507a', light: '#5a7aa8', dark: '#1a2a44', text: '#c8dcff' },
  enerji: { body: '#8a6a14', light: '#c8a030', dark: '#4a3808', text: '#fff0b0' },
  robot: { body: '#8a2a26', light: '#c04a40', dark: '#4a1210', text: '#ffd0c8' },
};
const SIDE_COL = [
  { main: '#4aa8ff', dark: '#1a4a80', light: '#a0d8ff', name: 'SEN' },
  { main: '#ff5a4a', dark: '#801a14', light: '#ffb0a0', name: 'CPU' },
];

let BG = null;
function background() {
  if (BG) return BG;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = createGfx(c);
  const bands = ['#06061a', '#0a0a24', '#100c30', '#18103a', '#221446', '#2c1850', '#3a1e58'];
  bands.forEach((col, i) => g.rect(0, i * 22, W, 23, col));
  let s = 7;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let k = 0; k < 120; k++) g.pset(Math.floor(r() * W), Math.floor(r() * 140), r() < 0.25 ? '#ffffff' : r() < 0.5 ? '#a0a0d0' : '#605890');
  // Halkalı gezegen
  g.circ(240, 70, 18, '#c07040');
  g.circ(236, 66, 14, '#e09050');
  g.rect(222, 66, 36, 2, '#a05a30');
  g.rect(226, 74, 30, 2, '#a05a30');
  for (let k = 0; k < 80; k++) {
    const a = (k / 80) * Math.PI * 2;
    const x = 240 + Math.cos(a) * 30;
    const y = 70 + Math.sin(a) * 6;
    if (Math.sin(a) < 0 && Math.abs(x - 240) < 17) continue;
    g.pset(x, y, '#f0d0a0');
  }
  g.circ(70, 24, 5, '#9090b0');
  g.circ(68, 22, 4, '#b0b0d0');
  // Uzak kayalıklar
  for (let x = 0; x < W; x++) {
    const h = 14 + Math.sin(x / 31) * 8 + Math.sin(x / 9) * 3;
    g.rect(x, GROUND - h, 1, h, '#2a1a3a');
  }
  // Zemin
  g.rect(0, GROUND, W, 22, '#4a3a50');
  g.rect(0, GROUND, W, 1, '#7a6a80');
  for (let k = 0; k < 40; k++) {
    const x = Math.floor(r() * W);
    const y = GROUND + 3 + Math.floor(r() * 16);
    g.rect(x, y, 4 + Math.floor(r() * 6), 1, '#3a2a40');
    g.pset(x, y - 1, '#5a4a60');
  }
  // Kontrol konsolu (el alanı)
  g.rect(0, 171, W, H - 171, '#14161e');
  g.rect(0, 171, W, 2, '#3a4050');
  for (let x = 0; x < W; x += 16) g.rect(x, 173, 1, H - 173, '#181a24');
  BG = c;
  return c;
}

export default class TowerCards {
  constructor(api) {
    this.api = api;
    this.sfx = api.sfx;
    this.streak = 0;
    this.duel = 1;
    this.sel = 0;
    this.popups = [];
    this.parts = [];
    this.fxAnims = [];
    this.msg = null;
    this.tick = 0;
    this.gameOverSent = false;
    background();
    resIcons();
    this.newDuel();
  }

  newDuel() {
    const preview = this.api.preview;
    const s = this.streak;
    // Zorluk: önce CPU hataları azalır, sonra CPU fazladan kaynakla başlar
    this.g = L.newGame({ first: this.duel % 2 === 1 ? 0 : 1, bonus1: Math.min(12, Math.max(0, s - 3) * 3) });
    this.shown = this.g.p.map(L.clonePlayer);
    this.disp = this.g.p.map((p) => ({ tower: p.tower, wall: p.wall }));
    this.noise = preview ? 6 : [80, 40, 16, 6][s] ?? 0;
    this.phase = 'intro';
    this.t = preview ? 60 : 0;
    this.flying = null;
    this.handAnim = [0, 0, 0, 0, 0, 0];
    this.again = 0;
    this.againCount = 0;
    this.lastCard = null;
    this.banner = null;
    this.shake = [0, 0];
  }

  // ---------- Akış ----------
  beginTurn() {
    const g = this.g;
    const i = g.turn;
    const before = L.clonePlayer(g.p[i]);
    L.produce(g, i);
    L.checkWin(g);
    this.diffPopups(i, before, g.p[i], 4, true);
    this.syncAt = 6;
    this.phase = 'produce';
    this.t = 0;
    this.again = 0;
    if (i === 0) this.sfx.play('pickup');
  }

  startFly(i, action, idx) {
    const id = this.g.hands[i][idx];
    const from = i === 0 ? { x: cardX(idx), y: HAND_Y } : { x: W + 10, y: -CARD_H };
    this.flying = { side: i, action, idx, id, from, t: 0 };
    this.phase = 'fly';
    this.t = 0;
    this.sfx.play(action === 'play' ? 'select' : 'blip');
  }

  land() {
    const f = this.flying;
    const g = this.g;
    const i = f.side;
    const card = L.CARD_BY_ID[f.id];
    const b0 = L.clonePlayer(g.p[0]);
    const b1 = L.clonePlayer(g.p[1]);
    let again = false;
    if (f.action === 'play') {
      L.playCard(g, i, f.idx);
      again = !!card.again;
    } else L.discardCard(g, i, f.idx);
    if (i === 0) this.handAnim[f.idx] = 14;
    this.lastCard = { id: f.id, side: i, discard: f.action !== 'play', t: 0 };
    this.flying = null;
    // Görsel etkiler
    const att = f.action === 'play' && (g.p[1 - i].tower < [b0, b1][1 - i].tower || g.p[1 - i].wall < [b0, b1][1 - i].wall);
    const delay = att ? 20 : 4;
    if (att) {
      const tgtWall = g.p[1 - i].tower === [b0, b1][1 - i].tower;
      const direct = card.type === 'enerji' || (card.id === 'casus');
      this.fxAnims.push({ kind: direct ? 'beam' : card.type === 'robot' ? 'bots' : 'bolts', from: i, toWall: tgtWall && !direct, t: 0, life: 22 });
      this.sfx.play(direct ? 'laser' : 'shoot');
    } else if (f.action === 'play') {
      this.sfx.play(card.type === 'robot' ? 'power' : 'coin');
    }
    this.diffPopups(0, b0, g.p[0], delay);
    this.diffPopups(1, b1, g.p[1], delay);
    this.syncAt = delay;
    this.again = again && g.winner < 0 ? 1 : 0;
    this.phase = 'resolve';
    this.t = 0;
  }

  diffPopups(i, a, b, delay, prodOnly = false) {
    const pushP = (x, y, v, kind) => {
      if (!v) return;
      this.popups.push({ x, y, text: v > 0 ? `+${v}` : `${v}`, color: v > 0 ? '#60ff80' : '#ff5040', t: -delay, kind });
    };
    const px = PANEL_X[i];
    L.RES.forEach((r, k) => pushP(px + 74, 76 + k * 30, b.stock[r] - a.stock[r]));
    if (prodOnly) return;
    L.RES.forEach((r, k) => pushP(px + 66, 58 + k * 30, b.prod[r] - a.prod[r]));
    const dT = b.tower - a.tower;
    const dW = b.wall - a.wall;
    pushP(TOWER_X[i] + (i === 0 ? -32 : 32), this.towerTop(i, b.tower) + 4, dT, 'big');
    pushP(WALL_X[i] + 5 + (i === 0 ? 14 : -14), this.wallTop(b.wall) - 4, dW, 'big');
    // parçacıklar
    const later = (fn) => this.fxAnims.push({ kind: 'later', t: -delay, fn });
    if (dT < 0) later(() => { this.debris(TOWER_X[i], this.towerTop(i, this.disp[i].tower) + 10, '#8090a8', 14); this.shake[i] = 10; this.sfx.play('explode'); });
    if (dW < 0) later(() => { this.debris(WALL_X[i] + 5, this.wallTop(this.disp[i].wall) + 4, '#5a6a7a', 10); this.sfx.play('hit'); });
    if (dT > 0) later(() => this.sparkle(TOWER_X[i], this.towerTop(i, b.tower) + 6, SIDE_COL[i].light));
    if (dW > 0) later(() => this.sparkle(WALL_X[i] + 5, this.wallTop(b.wall) + 4, '#80e0ff'));
  }

  debris(x, y, c, n) {
    for (let k = 0; k < n; k++) this.parts.push({ x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, g: 0.2, t: 0, life: 40, c, sz: Math.random() < 0.4 ? 3 : 2 });
  }

  sparkle(x, y, c) {
    for (let k = 0; k < 10; k++) this.parts.push({ x: x + (Math.random() - 0.5) * 24, y: y + Math.random() * 20, vx: 0, vy: -0.6 - Math.random(), g: 0, t: 0, life: 24, c, sz: 1, tw: true });
  }

  towerTop(i, v) { return GROUND - 6 - Math.round(Math.min(64, Math.max(0, v)) * 1.6) - 14; }
  wallTop(v) { return GROUND - Math.round(Math.min(80, Math.max(0, v)) * 1.15); }

  update() {
    this.tick++;
    try { this.step(); } catch (e) {
      if (!this.errLogged) { this.errLogged = true; console.error(e); }
      this.phase = 'think';
      this.flying = null;
    }
  }

  step() {
    const g = this.g;
    const pv = this.api.preview;
    this.t++;
    // görsel değerleri yaklaştır
    if (this.syncAt !== undefined && this.syncAt !== null) {
      if (--this.syncAt <= 0) { this.shown = g.p.map(L.clonePlayer); this.syncAt = null; }
    }
    for (let i = 0; i < 2; i++) {
      const d = this.disp[i];
      const s = this.shown[i];
      d.tower += Math.sign(s.tower - d.tower) * Math.min(Math.abs(s.tower - d.tower), 0.35);
      d.wall += Math.sign(s.wall - d.wall) * Math.min(Math.abs(s.wall - d.wall), 0.4);
      if (this.shake[i] > 0) this.shake[i]--;
    }
    for (const p of this.popups) p.t++;
    this.popups = this.popups.filter((p) => p.t < 50);
    for (const p of this.parts) { p.t++; p.x += p.vx; p.y += p.vy; p.vy += p.g; if (p.y > GROUND && p.g) { p.y = GROUND; p.vy *= -0.3; p.vx *= 0.5; } }
    this.parts = this.parts.filter((p) => p.t < p.life);
    for (const a of this.fxAnims) { a.t++; if (a.kind === 'later' && a.t === 0) a.fn(); }
    this.fxAnims = this.fxAnims.filter((a) => (a.kind === 'later' ? a.t < 0 : a.t < a.life));
    for (let k = 0; k < 6; k++) if (this.handAnim[k] > 0) this.handAnim[k]--;
    if (this.lastCard) this.lastCard.t++;
    if (this.msg && --this.msg.t <= 0) this.msg = null;
    if (this.banner) this.banner.t++;

    switch (this.phase) {
      case 'intro':
        if (this.t === 1) { this.banner = { text: `DÜELLO ${this.duel}`, sub: this.streak ? `SERİ ${this.streak}` : 'ROBOT KULELERİ', t: 0 }; this.sfx.play('start'); }
        if (this.t > 80) { this.banner = null; this.beginTurn(); }
        break;
      case 'produce':
        if (this.t >= (pv ? 4 : 18)) {
          if (g.winner >= 0) { this.endDuel(); break; }
          this.phase = 'think';
          this.t = 0;
        }
        break;
      case 'think':
        if (g.turn === 0 && !pv) this.playerInput();
        else if (this.t >= (pv ? 8 : 36)) {
          const ch = L.aiChoose(g, g.turn, g.turn === 1 ? this.noise : 4);
          this.startFly(g.turn, ch.action, ch.idx);
        }
        break;
      case 'fly':
        if (this.t >= (pv ? 8 : 16)) this.land();
        break;
      case 'resolve':
        if (this.t >= (pv ? 16 : 44)) {
          if (g.winner >= 0) { this.endDuel(); break; }
          if (this.again && this.againCount < 6) {
            this.againCount++;
            this.phase = 'think';
            this.t = 0;
            this.msg = { text: g.turn === 0 ? 'TEKRAR OYNA!' : 'CPU TEKRAR OYNUYOR', t: 50, col: '#ffe060' };
            break;
          }
          this.againCount = 0;
          g.turn = 1 - g.turn;
          g.turns++;
          this.beginTurn();
        }
        break;
      case 'end':
        if (this.t > (pv ? 30 : 170)) {
          if (pv) { this.newDuel(); break; }
          if (g.winner === 0) {
            this.duel++;
            this.newDuel();
          } else if (!this.gameOverSent) {
            this.gameOverSent = true;
            this.api.gameOver();
          }
        }
        break;
      default: break;
    }
  }

  endDuel() {
    const g = this.g;
    this.phase = 'end';
    this.t = 0;
    const won = g.winner === 0;
    const reason = g.reason === 'kule' ? 'KULE 50\'YE ULAŞTI' : g.reason === 'kaynak' ? 'KAYNAK 150\'YE ULAŞTI' : 'KULE YIKILDI';
    if (won) {
      this.streak++;
      const me = g.p[0];
      const op = g.p[1];
      const pts = 500 + 250 * this.streak + 20 * Math.max(0, me.tower - op.tower) + 10 * me.wall + 5 * Math.max(0, 80 - g.turns);
      if (!this.api.preview) this.api.addScore(pts);
      this.banner = { text: 'KAZANDIN!', sub: `${reason}  +${pts}`, t: 0, col: '#60ff80' };
      this.sfx.play('levelup');
    } else {
      this.banner = { text: 'KAYBETTİN', sub: reason, t: 0, col: '#ff5040' };
      this.sfx.play('gameover');
    }
  }

  playerInput() {
    const { input } = this.api;
    const g = this.g;
    if (input.pressed('left')) { this.sel = (this.sel + 5) % 6; this.sfx.play('blip'); }
    if (input.pressed('right')) { this.sel = (this.sel + 1) % 6; this.sfx.play('blip'); }
    let act = null;
    if (input.pressed('a')) act = 'play';
    if (input.pressed('b')) act = 'discard';
    const p = input.pointer;
    if (p?.pressed) {
      const inR = (r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
      for (let i = 0; i < 6; i++) {
        if (inR({ x: cardX(i), y: HAND_Y - 8, w: CARD_W, h: CARD_H + 8 })) {
          if (this.sel === i) act = 'play';
          else { this.sel = i; this.sfx.play('blip'); }
        }
      }
      if (inR(BTN_PLAY)) act = 'play';
      if (inR(BTN_DISC)) act = 'discard';
    }
    if (!act) return;
    const card = L.CARD_BY_ID[g.hands[0][this.sel]];
    if (act === 'play' && !L.canAfford(g.p[0], card)) {
      this.msg = { text: `YETERSİZ ${L.RES_NAME[card.type]}`, t: 60, col: '#ff6050' };
      this.sfx.play('bounce');
      return;
    }
    this.startFly(0, act, this.sel);
  }

  // ---------- Çizim ----------
  draw() {
    const { gfx } = this.api;
    try { this.render(gfx); } catch (e) {
      if (!this.drawErr) { this.drawErr = true; console.error(e); }
      gfx.cls('#000');
    }
  }

  render(gfx) {
    const ctx = gfx.ctx;
    ctx.drawImage(background(), 0, 0);
    const g = this.g;
    const turn = g.turn;
    // kuleler ve zırhlar
    for (let i = 0; i < 2; i++) {
      const sx = this.shake[i] ? Math.round((Math.random() - 0.5) * 3) : 0;
      this.drawTower(gfx, TOWER_X[i] + sx, this.disp[i].tower, i);
      this.drawWall(gfx, WALL_X[i], this.disp[i].wall, i);
    }
    this.drawFx(gfx);
    for (const p of this.parts) {
      if (p.tw && p.t % 4 < 2) continue;
      gfx.rect(p.x, p.y, p.sz, p.sz, p.c);
    }
    // paneller
    for (let i = 0; i < 2; i++) this.drawPanel(gfx, i, turn === i && ['think', 'produce', 'fly'].includes(this.phase));
    // üst bilgi
    const pad = (n) => String(n).padStart(6, '0');
    gfx.text(`SKOR ${pad(this.api.score)}`, 4, 4, '#ffe060', { shadow: '#000' });
    gfx.text(`REKOR ${pad(Math.max(this.api.hiScore, this.api.score))}`, W - 4, 4, '#c0c0d0', { align: 'right', shadow: '#000' });
    gfx.text(`DÜELLO ${this.duel}${this.streak ? `  SERİ ${this.streak}` : ''}`, W / 2, 4, '#a0e0ff', { align: 'center', shadow: '#000' });
    // ortadaki son kart
    if (this.lastCard && !this.flying) {
      const lc = this.lastCard;
      this.drawCard(gfx, lc.id, CENTER.x, CENTER.y, { dim: lc.discard });
      if (lc.discard) {
        gfx.rect(CENTER.x + 4, CENTER.y + 38, CARD_W - 8, 13, '#000');
        gfx.text('ATILDI', CENTER.x + CARD_W / 2, CENTER.y + 41, '#ff6050', { align: 'center' });
      }
      gfx.rect(CENTER.x, CENTER.y - 9, CARD_W, 8, SIDE_COL[lc.side].dark);
      gfx.text(lc.side === 0 ? 'SEN' : 'CPU', CENTER.x + CARD_W / 2, CENTER.y - 8, SIDE_COL[lc.side].light, { align: 'center' });
    }
    // butonlar / durum
    const myTurn = turn === 0 && this.phase === 'think' && !this.api.preview;
    if (myTurn) {
      this.button(gfx, BTN_PLAY, 'OYNA', '#2a6a3a', '#60ff80');
      this.button(gfx, BTN_DISC, 'AT', '#6a2a2a', '#ff8070');
    } else if (this.phase === 'think' || this.phase === 'fly') {
      const dots = '.'.repeat(1 + (Math.floor(this.tick / 15) % 3));
      gfx.text(turn === 1 ? `CPU DÜŞÜNÜYOR${dots}` : `SIRA SENDE${dots}`, W / 2, 157, SIDE_COL[turn].light, { align: 'center', shadow: '#000' });
    }
    if (this.msg) {
      gfx.rect(W / 2 - 60, 134, 120, 13, '#000000');
      gfx.text(this.msg.text, W / 2, 137, this.msg.col, { align: 'center' });
    }
    // el
    const hand = g.hands[this.api.preview ? (turn === 1 ? 1 : 0) : 0];
    const me = g.p[this.api.preview ? (turn === 1 ? 1 : 0) : 0];
    for (let i = 0; i < 6; i++) {
      if (this.flying && this.flying.side === 0 && this.flying.idx === i && !this.api.preview) continue;
      const id = hand[i];
      const card = L.CARD_BY_ID[id];
      const sel = myTurn && i === this.sel;
      const rise = sel ? -7 : 0;
      const drop = this.handAnim[i] * 7;
      this.drawCard(gfx, id, cardX(i), HAND_Y + rise + drop, { dim: !L.canAfford(me, card), sel });
    }
    // uçan kart
    if (this.flying) {
      const f = this.flying;
      const u = Math.min(1, f.t / 16);
      const e = 1 - (1 - u) * (1 - u);
      const x = f.from.x + (CENTER.x - f.from.x) * e;
      const y = f.from.y + (CENTER.y - f.from.y) * e - Math.sin(u * Math.PI) * 20;
      if (f.side === 1 && u < 0.35) this.drawBack(gfx, x, y);
      else this.drawCard(gfx, f.id, x, y, { dim: f.action !== 'play' });
    }
    // sayılar
    for (const p of this.popups) {
      if (p.t < 0) continue;
      const big = p.kind === 'big';
      gfx.text(p.text, p.x, p.y - p.t * (big ? 0.4 : 0.1), p.t % 6 < 3 || p.t < 30 ? p.color : '#ffffff', { align: 'center', scale: big ? 2 : 1, shadow: '#000' });
    }
    // afiş
    if (this.banner) {
      const b = this.banner;
      const y = 62 - Math.max(0, 8 - b.t) * 3;
      gfx.ctx.fillStyle = 'rgba(0,0,10,0.75)';
      gfx.ctx.fillRect(100, y - 8, 280, 50);
      gfx.rectb(100, y - 8, 280, 50, b.col || '#a0e0ff');
      gfx.text(b.text, W / 2, y, b.col || '#ffe060', { align: 'center', scale: 3, shadow: '#000' });
      if (b.sub) gfx.text(b.sub, W / 2, y + 28, '#ffffff', { align: 'center', shadow: '#000' });
    }
  }

  button(gfx, r, label, bg, fg) {
    const pulse = this.tick % 40 < 20;
    gfx.rect(r.x, r.y, r.w, r.h, bg);
    gfx.rectb(r.x, r.y, r.w, r.h, pulse ? fg : '#ffffff');
    gfx.text(label, r.x + r.w / 2, r.y + 4, fg, { align: 'center' });
  }

  drawTower(gfx, x, val, i) {
    const col = SIDE_COL[i];
    const h = Math.round(Math.min(64, Math.max(0, val)) * 1.6);
    const base = GROUND - 6;
    // kaide
    gfx.rect(x - 22, base, 44, 7, '#2a2a36');
    gfx.rect(x - 22, base, 44, 1, '#5a5a6a');
    gfx.rect(x - 18, base + 2, 4, 2, col.main);
    gfx.rect(x + 14, base + 2, 4, 2, col.main);
    if (h <= 0) {
      // enkaz
      for (let k = 0; k < 6; k++) gfx.rect(x - 16 + k * 6, base - 3 - (k % 3) * 2, 5, 3 + (k % 3) * 2, '#5a6070');
      return;
    }
    const top = base - h;
    // gövde
    gfx.rect(x - 14, top, 28, h, '#6a7488');
    gfx.rect(x - 14, top, 3, h, '#9aa4b8');
    gfx.rect(x + 11, top, 3, h, '#3a4254');
    for (let y = base - 8; y > top; y -= 8) {
      gfx.rect(x - 14, y, 28, 1, '#2a3040');
      gfx.pset(x - 12, y + 2, '#c0c8d8');
      gfx.pset(x + 11, y + 2, '#c0c8d8');
      const lit = ((y >> 3) + Math.floor(this.tick / 30) + i) % 3 !== 0;
      gfx.rect(x - 4, y + 2, 8, 4, '#1a1e28');
      gfx.rect(x - 3, y + 3, 6, 2, lit ? col.main : col.dark);
    }
    gfx.rectb(x - 15, top, 30, h, '#1a1e28');
    // kubbe
    gfx.rect(x - 17, top - 3, 34, 4, '#3a4254');
    for (let k = 0; k < 10; k++) {
      const w = Math.round(Math.sqrt(100 - k * k) * 1.3);
      gfx.rect(x - w, top - 4 - k, w * 2, 1, k < 2 ? col.dark : k > 7 ? col.light : col.main);
    }
    gfx.rect(x - 6, top - 10, 4, 3, '#ffffff');
    // anten
    gfx.rect(x, top - 22, 1, 9, '#c0c8d8');
    if (this.tick % 40 < 20) gfx.rect(x - 1, top - 24, 3, 3, col.light); else gfx.rect(x - 1, top - 24, 3, 3, col.dark);
    // değer
    gfx.text(String(Math.round(val)), x, top - 34, '#ffffff', { align: 'center', shadow: '#000' });
  }

  drawWall(gfx, x, val, i) {
    const h = Math.round(Math.min(80, Math.max(0, val)) * 1.15);
    if (h <= 0) {
      gfx.text('0', x + 5, GROUND - 10, '#a0a0a0', { align: 'center', shadow: '#000' });
      return;
    }
    const top = GROUND - h;
    for (let y = GROUND - 6; y > top - 6; y -= 6) {
      const yy = Math.max(top, y);
      const hh = Math.min(6, y + 6 - yy);
      gfx.rect(x, yy, 11, hh - 1, '#5a6a7e');
      gfx.rect(x, yy, 11, 1, '#8a9ab0');
      gfx.pset(x + 2, yy + 2, '#2a3444');
      gfx.pset(x + 8, yy + 2, '#2a3444');
      gfx.rect(x, yy + hh - 1, 11, 1, '#2a3444');
    }
    // enerji kenarı
    const glow = this.tick % 30 < 15 ? '#80f0ff' : '#40a0d0';
    gfx.rect(x - 1, top - 1, 13, 1, glow);
    gfx.rect(i === 0 ? x + 11 : x - 1, top, 1, h, i === 0 ? '#40a0d0' : '#40a0d0');
    gfx.text(String(Math.round(val)), x + 5, top - 10, '#80e0ff', { align: 'center', shadow: '#000' });
  }

  drawFx(gfx) {
    for (const a of this.fxAnims) {
      if (a.kind === 'later' || a.t < 0) continue;
      const fromX = TOWER_X[a.from];
      const toI = 1 - a.from;
      const fromY = this.towerTop(a.from, this.disp[a.from].tower) - 6;
      const toX = a.toWall ? WALL_X[toI] + 5 : TOWER_X[toI];
      const toY = a.toWall ? this.wallTop(this.disp[toI].wall) + 6 : this.towerTop(toI, this.disp[toI].tower) + 10;
      const u = Math.min(1, a.t / 20);
      if (a.kind === 'beam') {
        if (a.t > 4 && a.t < 20) {
          const c1 = a.t % 4 < 2 ? '#ff4040' : '#ffd0d0';
          gfx.line(fromX, fromY, toX, toY, c1);
          gfx.line(fromX, fromY + 1, toX, toY + 1, '#ff8080');
          gfx.circ(toX, toY, 3 + (a.t % 3), '#ffffff');
        } else if (a.t <= 4) gfx.circ(fromX, fromY, a.t, '#ff8080');
      } else {
        for (let k = 0; k < 3; k++) {
          const uu = Math.max(0, Math.min(1, u * 1.3 - k * 0.12));
          const x = fromX + (toX - fromX) * uu;
          const y = fromY + (toY - fromY) * uu - Math.sin(uu * Math.PI) * 30 + k * 4;
          if (a.kind === 'bots') {
            gfx.rect(x - 3, y - 2, 6, 4, '#c0c8d0');
            gfx.rect(x - 2, y - 1, 4, 1, '#202830');
            gfx.pset(x - 1, y - 1, '#ff4030');
            gfx.pset(x + 1, y - 1, '#ff4030');
            gfx.rect(x - 4, y - 3, 2, 1, '#808890');
            gfx.rect(x + 2, y - 3, 2, 1, '#808890');
          } else {
            gfx.rect(x - 2, y - 2, 4, 4, '#a8b4c4');
            gfx.pset(x, y, '#ffffff');
          }
        }
      }
    }
  }

  drawPanel(gfx, i, active) {
    const x = PANEL_X[i];
    const col = SIDE_COL[i];
    const p = this.shown[i];
    const ic = resIcons();
    gfx.rect(x, 18, 88, 132, '#10121a');
    gfx.rectb(x, 18, 88, 132, active && this.tick % 30 < 20 ? col.light : col.dark);
    gfx.rect(x + 1, 19, 86, 11, col.dark);
    gfx.text(col.name, x + 44, 21, '#ffffff', { align: 'center' });
    if (active) { gfx.text('>', x + 4, 21, col.light); gfx.text('<', x + 79, 21, col.light); }
    gfx.text(`KULE ${p.tower}`, x + 4, 34, '#ffffff');
    gfx.text(`ZIRH ${p.wall}`, x + 4, 44, '#80e0ff');
    L.RES.forEach((r, k) => {
      const y = 56 + k * 30;
      const tc = TYPE_COL[r];
      gfx.rect(x + 2, y, 84, 28, tc.dark);
      gfx.rect(x + 2, y, 84, 1, tc.light);
      gfx.sprite(ic[r], x + 4, y + 3);
      gfx.text(L.PROD_NAME[r], x + 16, y + 4, tc.text);
      gfx.text(String(p.prod[r]), x + 84, y + 2, '#ffffff', { align: 'right', scale: 2 });
      gfx.text(`${L.RES_NAME[r]} ${p.stock[r]}`, x + 4, y + 18, '#ffffff');
    });
  }

  drawBack(gfx, x, y) {
    x = Math.round(x);
    y = Math.round(y);
    gfx.rect(x, y, CARD_W, CARD_H, '#1a1a2a');
    gfx.rectb(x, y, CARD_W, CARD_H, '#000');
    gfx.rectb(x + 2, y + 2, CARD_W - 4, CARD_H - 4, '#ff5a4a');
    for (let k = 0; k < 6; k++) gfx.rect(x + 6, y + 10 + k * 13, CARD_W - 12, 6, '#2a2a40');
    gfx.text('KK', x + CARD_W / 2, y + 40, '#ff5a4a', { align: 'center', scale: 2 });
  }

  drawCard(gfx, id, x, y, opt = {}) {
    const card = L.CARD_BY_ID[id];
    if (!card) return;
    x = Math.round(x);
    y = Math.round(y);
    const tc = TYPE_COL[card.type];
    gfx.rect(x, y, CARD_W, CARD_H, tc.body);
    gfx.rect(x + 1, y + 1, CARD_W - 2, 1, tc.light);
    gfx.rectb(x, y, CARD_W, CARD_H, opt.sel ? '#ffffff' : '#000000');
    if (opt.sel) gfx.rectb(x - 1, y - 1, CARD_W + 2, CARD_H + 2, this.tick % 20 < 10 ? '#ffe060' : '#ffffff');
    // isim
    gfx.rect(x + 2, y + 2, CARD_W - 4, 10, tc.dark);
    gfx.text(card.name, x + CARD_W / 2, y + 4, '#ffffff', { align: 'center' });
    // resim
    gfx.rect(x + 5, y + 14, CARD_W - 10, 32, '#0c0e16');
    gfx.rectb(x + 5, y + 14, CARD_W - 10, 32, tc.light);
    gfx.sprite(cardIcon(card.id), x + 7, y + 16, { scale: 2 });
    // metin
    card.text.forEach((ln, k) => gfx.text(ln, x + CARD_W / 2, y + 50 + k * 10, tc.text, { align: 'center' }));
    // bedel
    const can = !opt.dim;
    gfx.rect(x + 2, y + CARD_H - 13, CARD_W - 4, 11, tc.dark);
    gfx.sprite(resIcons()[card.type], x + 4, y + CARD_H - 12);
    gfx.text(`${card.cost} ${L.RES_NAME[card.type]}`, x + 16, y + CARD_H - 11, can ? '#ffffff' : '#ff6050');
    if (opt.dim) {
      gfx.ctx.fillStyle = 'rgba(0,0,0,0.45)';
      gfx.ctx.fillRect(x, y, CARD_W, CARD_H);
    }
  }
}
