// Kart resimleri: 30x14 piksellik küçük çizimler (ekranda 2 kat büyütülür).
import { createGfx, makeSprite } from '../../js/engine/gfx.js';

const IW = 30;
const IH = 14;

const STEEL = '#a8b4c4';
const STEELD = '#5a6678';
const DARK = '#1a1e28';
const YEL = '#ffd040';
const RED = '#e04030';
const GRN = '#50d060';
const CYAN = '#60e0ff';

// Küçük robot gövdesi (ortak)
function bot(g, x, y, c, eye = RED) {
  g.rect(x, y, 8, 6, c);
  g.rect(x + 1, y + 1, 6, 2, DARK);
  g.pset(x + 2, y + 2, eye);
  g.pset(x + 5, y + 2, eye);
  g.rect(x + 3, y - 2, 1, 2, STEELD);
  g.pset(x + 3, y - 3, eye);
}

const P = {
  vida(g) {
    for (let k = 0; k < 3; k++) {
      const x = 4 + k * 9;
      g.rect(x, 2, 6, 3, STEEL);
      g.rect(x + 2, 2, 2, 1, STEELD);
      g.rect(x + 2, 5, 2, 8, STEELD);
      for (let y = 6; y < 13; y += 2) g.pset(x + 1, y, STEEL);
    }
  },
  kaynak(g) {
    g.rect(2, 7, 14, 3, STEELD);
    g.rect(16, 6, 4, 5, '#c04020');
    g.rect(20, 8, 3, 1, STEEL);
    for (const [x, y] of [[24, 6], [26, 9], [25, 11], [27, 5], [23, 12]]) g.pset(x, y, YEL);
    g.rect(23, 8, 2, 1, '#ffffff');
  },
  sac(g) {
    g.rect(3, 2, 24, 10, STEEL);
    g.rect(3, 2, 24, 1, '#e0e8f0');
    g.rect(3, 11, 24, 1, STEELD);
    for (const [x, y] of [[5, 4], [24, 4], [5, 9], [24, 9]]) g.pset(x, y, STEELD);
    g.line(8, 4, 13, 9, '#d0d8e0');
  },
  kazici(g) {
    g.rect(2, 10, 26, 4, '#7a5a40');
    g.circ(20, 9, 4, '#8a7a6a');
    g.line(5, 2, 14, 11, '#8a6040');
    g.line(6, 2, 15, 11, '#8a6040');
    g.rect(2, 1, 9, 2, STEEL);
    g.pset(1, 3, STEEL);
    g.pset(11, 3, STEEL);
    g.pset(22, 7, YEL);
  },
  takviye(g) {
    P.sac(g);
    g.rect(18, 0, 8, 14, '#6a7a90');
    g.rect(20, 3, 4, 3, CYAN);
  },
  miknatis(g) {
    g.rect(6, 2, 4, 9, RED);
    g.rect(18, 2, 4, 9, RED);
    g.rect(6, 9, 16, 4, RED);
    g.rect(6, 2, 4, 2, STEEL);
    g.rect(18, 2, 4, 2, STEEL);
    g.rect(13, 1, 3, 2, STEELD);
    g.rect(24, 3, 3, 2, STEELD);
    g.line(11, 0, 12, 2, CYAN);
    g.line(16, 0, 15, 2, CYAN);
  },
  pas(g) {
    P.sac(g);
    for (const [x, y, r] of [[9, 6, 2], [17, 8, 3], [22, 4, 1], [12, 10, 1]]) g.circ(x, y, r, '#a05a20');
    g.pset(17, 8, '#704010');
  },
  iskele(g) {
    for (let x = 4; x < 27; x += 7) g.rect(x, 0, 1, 14, STEELD);
    for (let y = 2; y < 14; y += 5) g.rect(4, y, 22, 1, STEELD);
    for (let x = 4; x < 25; x += 7) g.line(x, 2, x + 7, 7, STEEL);
    g.rect(11, 3, 8, 4, '#c08030');
  },
  duvar(g) {
    for (let y = 0; y < 14; y += 4) for (let x = (y / 4) % 2 ? 0 : 4; x < 30; x += 8) { g.rect(x, y, 7, 3, STEEL); g.pset(x + 1, y + 1, STEELD); }
  },
  deprem(g) {
    g.rect(0, 8, 30, 6, '#7a5a40');
    g.line(2, 8, 8, 11, DARK);
    g.line(8, 11, 13, 8, DARK);
    g.line(13, 8, 18, 12, DARK);
    g.line(18, 12, 24, 9, DARK);
    g.line(24, 9, 29, 12, DARK);
    for (const x of [6, 15, 24]) { g.rect(x, 2, 2, 2, '#9a7a60'); g.pset(x - 1, 5, '#9a7a60'); }
  },
  hurda(g) {
    g.rect(3, 9, 24, 5, '#5a5040');
    g.rect(5, 6, 8, 4, '#806a50');
    g.rect(14, 5, 6, 5, STEELD);
    g.circb(22, 7, 3, STEEL);
    g.line(8, 3, 12, 6, STEEL);
    g.pset(17, 3, RED);
  },
  kale(g) {
    P.duvar(g);
    g.rect(10, 0, 10, 14, '#6a7a90');
    g.rect(10, 0, 2, 2, DARK);
    g.rect(14, 0, 2, 2, DARK);
    g.rect(18, 0, 2, 2, DARK);
    g.rect(13, 5, 4, 4, CYAN);
  },
  takas(g) {
    g.rect(3, 4, 6, 9, STEEL);
    g.rect(21, 4, 6, 9, STEEL);
    g.line(10, 4, 19, 4, YEL);
    g.line(17, 2, 19, 4, YEL);
    g.line(17, 6, 19, 4, YEL);
    g.line(10, 10, 19, 10, YEL);
    g.line(12, 8, 10, 10, YEL);
    g.line(12, 12, 10, 10, YEL);
  },
  pil(g) {
    g.rect(6, 3, 18, 9, '#303840');
    g.rect(24, 6, 2, 3, STEEL);
    g.rect(7, 4, 5, 7, GRN);
    g.rect(12, 4, 5, 7, GRN);
    g.rect(17, 4, 5, 7, '#204020');
    g.rect(8, 4, 1, 7, '#a0ffa0');
  },
  kivilcim(g) {
    g.line(15, 0, 15, 13, YEL);
    g.line(8, 7, 22, 7, YEL);
    g.line(10, 2, 20, 12, '#ffa020');
    g.line(20, 2, 10, 12, '#ffa020');
    g.rect(14, 6, 3, 3, '#ffffff');
  },
  reaktor(g) {
    g.circ(15, 7, 6, '#304050');
    g.circ(15, 7, 4, CYAN);
    g.circ(15, 7, 2, '#ffffff');
    g.rect(3, 6, 5, 2, STEELD);
    g.rect(22, 6, 5, 2, STEELD);
  },
  anten(g) {
    g.line(15, 3, 9, 13, STEEL);
    g.line(15, 3, 21, 13, STEEL);
    g.line(12, 8, 18, 8, STEELD);
    g.rect(14, 1, 3, 3, RED);
    g.circb(15, 2, 6, CYAN);
  },
  lazer(g) {
    g.rect(1, 5, 8, 5, STEEL);
    g.rect(3, 4, 4, 1, STEELD);
    g.rect(9, 6, 21, 3, RED);
    g.rect(9, 7, 21, 1, '#ffb0a0');
  },
  emp(g) {
    g.circ(6, 7, 3, CYAN);
    for (const r of [6, 10, 14]) g.circb(6, 7, r, r === 10 ? '#4080ff' : CYAN);
  },
  kuantum(g) {
    g.circ(15, 7, 2, '#ffffff');
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * Math.PI * 2;
      g.pset(15 + Math.cos(a) * 11, 7 + Math.sin(a) * 3, CYAN);
      g.pset(15 + Math.cos(a) * 5, 7 + Math.sin(a) * 6, '#c080ff');
    }
  },
  yansitici(g) {
    g.line(15, 0, 21, 7, CYAN);
    g.line(21, 7, 15, 13, CYAN);
    g.line(15, 13, 9, 7, CYAN);
    g.line(9, 7, 15, 0, CYAN);
    g.rect(13, 5, 5, 5, '#c0f0ff');
    g.line(0, 3, 10, 6, RED);
    g.line(20, 8, 29, 11, RED);
  },
  kisadevre(g) {
    g.rect(0, 6, 11, 2, '#c08030');
    g.rect(19, 6, 11, 2, '#c08030');
    g.line(11, 7, 14, 3, YEL);
    g.line(14, 3, 16, 10, YEL);
    g.line(16, 10, 19, 6, YEL);
    g.pset(15, 1, '#ffffff');
  },
  plazma(g) {
    g.circ(15, 7, 6, '#a040ff');
    g.circ(15, 7, 4, '#e080ff');
    g.circ(14, 6, 2, '#ffffff');
    g.rect(1, 6, 6, 1, '#a040ff');
    g.rect(3, 9, 4, 1, '#a040ff');
  },
  gkalkan(g) {
    for (let k = 0; k < 30; k++) {
      const a = Math.PI + (k / 29) * Math.PI;
      g.pset(15 + Math.cos(a) * 12, 13 + Math.sin(a) * 12, CYAN);
      g.pset(15 + Math.cos(a) * 10, 13 + Math.sin(a) * 10, '#2080c0');
    }
    g.rect(12, 9, 6, 5, STEEL);
  },
  devreak(g) {
    g.rect(5, 1, 20, 13, '#304050');
    g.circ(15, 7, 5, CYAN);
    g.circ(15, 7, 3, '#ffffff');
    g.rect(5, 1, 20, 1, STEEL);
    g.rect(7, 12, 2, 2, YEL);
    g.rect(21, 12, 2, 2, YEL);
  },
  firtina(g) {
    g.circ(9, 4, 4, '#606878');
    g.circ(16, 3, 5, '#707888');
    g.circ(22, 5, 4, '#606878');
    g.line(15, 7, 12, 10, YEL);
    g.line(12, 10, 16, 10, YEL);
    g.line(16, 10, 13, 13, YEL);
  },
  dron(g) {
    g.rect(10, 6, 10, 4, STEELD);
    g.rect(12, 7, 6, 2, RED);
    g.rect(6, 4, 4, 1, STEEL);
    g.rect(20, 4, 4, 1, STEEL);
    g.rect(8, 5, 1, 2, STEELD);
    g.rect(21, 5, 1, 2, STEELD);
    g.pset(15, 11, RED);
  },
  orumcek(g) {
    g.circ(15, 6, 4, '#404858');
    g.pset(13, 5, RED);
    g.pset(17, 5, RED);
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
      g.line(15 + s * 3, 6 + k, 15 + s * (8 + k * 2), 3 + k * 2, STEEL);
      g.line(15 + s * (8 + k * 2), 3 + k * 2, 15 + s * (10 + k * 2), 12, STEEL);
    }
  },
  avci(g) {
    bot(g, 11, 3, STEELD);
    g.rect(12, 9, 6, 5, STEELD);
    g.rect(18, 9, 8, 2, '#303030');
    g.pset(27, 9, YEL);
  },
  fabrika(g) {
    g.rect(2, 6, 26, 8, '#6a5a50');
    for (let k = 0; k < 3; k++) { g.line(2 + k * 8, 6, 10 + k * 8, 2, '#8a7a6a'); g.line(10 + k * 8, 2, 10 + k * 8, 6, '#8a7a6a'); }
    g.rect(23, 0, 3, 6, '#5a4a40');
    for (let k = 0; k < 3; k++) g.rect(5 + k * 8, 9, 4, 3, YEL);
  },
  tank(g) {
    g.rect(3, 9, 24, 5, '#303030');
    for (let x = 4; x < 27; x += 3) g.pset(x, 11, STEEL);
    g.rect(7, 4, 16, 5, '#5a6a40');
    g.rect(11, 1, 8, 4, '#4a5a30');
    g.rect(19, 2, 10, 2, '#303030');
    g.pset(14, 3, RED);
  },
  sabotaj(g) {
    bot(g, 4, 5, '#404040');
    g.rect(5, 11, 6, 3, '#404040');
    g.line(16, 12, 25, 3, STEEL);
    g.rect(23, 1, 4, 3, STEEL);
    g.pset(24, 2, DARK);
  },
  hirsiz(g) {
    bot(g, 4, 4, '#3a3a50');
    g.rect(5, 10, 6, 4, '#3a3a50');
    g.circ(21, 9, 5, '#b09060');
    g.rect(19, 3, 4, 2, '#b09060');
    g.rect(19, 8, 4, 3, YEL);
  },
  kamikaze(g) {
    g.circ(13, 8, 5, '#202020');
    g.circ(11, 6, 1, '#606060');
    g.line(16, 3, 20, 1, '#a08060');
    g.rect(20, 0, 2, 2, YEL);
    g.pset(22, 0, RED);
    g.rect(11, 7, 1, 1, RED);
    g.rect(15, 7, 1, 1, RED);
  },
  suru(g) {
    for (const [x, y] of [[2, 3], [12, 8], [20, 2]]) {
      g.rect(x + 1, y + 2, 6, 3, STEELD);
      g.rect(x, y + 1, 3, 1, STEEL);
      g.rect(x + 5, y + 1, 3, 1, STEEL);
      g.pset(x + 4, y + 3, RED);
    }
  },
  casus(g) {
    g.circ(15, 7, 6, '#303848');
    g.circ(15, 7, 4, '#ffffff');
    g.circ(15, 7, 2, RED);
    g.pset(15, 7, DARK);
    g.line(4, 7, 8, 7, STEELD);
    g.line(22, 7, 26, 7, STEELD);
  },
  meka(g) {
    g.rect(10, 0, 10, 5, '#5a5a6a');
    g.rect(12, 1, 6, 2, RED);
    g.rect(7, 5, 16, 5, '#6a6a7a');
    g.rect(3, 5, 4, 7, '#5a5a6a');
    g.rect(23, 5, 4, 7, '#5a5a6a');
    g.rect(9, 10, 4, 4, '#4a4a5a');
    g.rect(17, 10, 4, 4, '#4a4a5a');
    g.rect(13, 6, 4, 3, YEL);
  },
  tamirci(g) {
    bot(g, 3, 5, '#4a7a4a', GRN);
    g.rect(4, 11, 6, 3, '#4a7a4a');
    g.rect(19, 3, 2, 10, GRN);
    g.rect(15, 7, 10, 2, GRN);
  },
  intikam(g) {
    bot(g, 11, 5, '#7a2020', YEL);
    g.line(12, 4, 14, 5, YEL);
    g.line(18, 4, 16, 5, YEL);
    g.rect(12, 11, 6, 3, '#7a2020');
    g.line(3, 3, 7, 6, RED);
    g.line(27, 3, 23, 6, RED);
  },
  yedek(g) {
    const gear = (cx, cy, r, c) => {
      g.circ(cx, cy, r, c);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.rect(Math.round(cx + Math.cos(a) * (r + 1)) - 1, Math.round(cy + Math.sin(a) * (r + 1)) - 1, 2, 2, c); }
      g.circ(cx, cy, 1, DARK);
    };
    gear(10, 7, 4, STEEL);
    gear(20, 6, 3, YEL);
  },
};

const cache = {};
export function cardIcon(id) {
  if (cache[id]) return cache[id];
  const c = document.createElement('canvas');
  c.width = IW;
  c.height = IH;
  const g = createGfx(c);
  try { (P[id] || P.vida)(g); } catch { /* boş bırak */ }
  cache[id] = c;
  return c;
}

// Kaynak simgeleri (10x10)
let RICON = null;
export function resIcons() {
  if (RICON) return RICON;
  RICON = {
    metal: makeSprite([
      '..........',
      '...WWWW...',
      '..WSSSSW..',
      '.WSSSSSSW.',
      'WSSSSSSSSW',
      'DSSSSSSSSD',
      '.DDDDDDDD.',
      '..........',
    ], { W: '#e0e8f0', S: '#a8b4c4', D: '#5a6678' }),
    enerji: makeSprite([
      '.....YY...',
      '....YY....',
      '...YY.....',
      '..YYYYYY..',
      '.....YY...',
      '....YY....',
      '...YY.....',
      '..Y.......',
    ], { Y: '#ffd040' }),
    robot: makeSprite([
      '....R.....',
      '....S.....',
      '.SSSSSSS..',
      '.SDDDDDS..',
      '.SDRDRDS..',
      '.SSSSSSS..',
      '..S...S...',
      '.SS...SS..',
    ], { S: '#c0c8d0', D: '#202830', R: '#ff4030' }),
  };
  return RICON;
}
