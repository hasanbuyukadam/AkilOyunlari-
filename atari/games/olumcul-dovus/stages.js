// Ölümcül Dövüş sahneleri: karanlık tapınak, çukur köprüsü, taht odası.
import { createGfx } from '../../js/engine/gfx.js';
import { mix } from './art.js';

export const STAGE_W = 512;
export const VIEW_W = 320;
export const VIEW_H = 224;
export const GY = 208;

function layer(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(createGfx(c), w, h);
  return c;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Dither ile iki renk arası geçiş bandı
function ditherBand(g, x, y, w, h, c1, c2) {
  for (let yy = 0; yy < h; yy++) {
    const t = yy / h;
    for (let xx = 0; xx < w; xx += 1) {
      const th = ((xx & 1) + ((yy & 1) << 1)) / 4;
      g.pset(x + xx, y + yy, t > th ? c2 : c1);
    }
  }
}

function stoneWall(g, x0, y0, w, h, base, seed) {
  const r = rng(seed);
  g.rect(x0, y0, w, h, base);
  const dk = mix(base, '#000', 0.45);
  const lt = mix(base, '#fff', 0.12);
  for (let y = y0; y < y0 + h; y += 10) {
    const off = ((y - y0) / 10) % 2 ? 0 : 11;
    g.rect(x0, y, w, 1, dk);
    for (let x = x0 - off; x < x0 + w; x += 22) {
      g.rect(x, y, 1, 10, dk);
      g.rect(x + 1, y + 1, 20, 1, lt);
      if (r() < 0.3) g.rect(x + 3 + Math.floor(r() * 14), y + 3 + Math.floor(r() * 5), 2, 1, dk);
    }
  }
}

function statue(g, cx, by, c) {
  const dk = mix(c, '#000', 0.4);
  const lt = mix(c, '#fff', 0.15);
  g.rect(cx - 14, by - 10, 28, 10, dk);
  g.rect(cx - 12, by - 12, 24, 2, lt);
  // gövde
  g.rect(cx - 7, by - 52, 14, 40, c);
  g.rect(cx - 7, by - 52, 3, 40, lt);
  g.rect(cx + 4, by - 52, 3, 40, dk);
  g.rect(cx - 12, by - 50, 5, 22, c);
  g.rect(cx + 7, by - 50, 5, 22, dk);
  g.circ(cx, by - 58, 6, c);
  g.rect(cx - 2, by - 60, 2, 2, dk);
  // kılıç
  g.rect(cx - 1, by - 74, 2, 36, '#8a8a90');
  g.rect(cx - 5, by - 40, 10, 2, dk);
}

// ---- 0: Karanlık tapınak ----
function temple() {
  const far = layer(416, VIEW_H, (g, w) => {
    g.cls('#0a0610');
    stoneWall(g, 0, 0, w, 170, '#2a2030', 3);
    // Kemerli pencereler (kırmızı gökyüzü)
    for (let k = 0; k < 4; k++) {
      const x = 30 + k * 100;
      g.rect(x, 40, 40, 70, '#3a0808');
      ditherBand(g, x, 40, 40, 70, '#601010', '#200404');
      g.circ(x + 20, 40, 20, '#601010');
      g.rect(x, 40, 40, 2, '#601010');
      g.rect(x + 19, 30, 2, 80, '#120a14');
      g.rect(x, 70, 40, 2, '#120a14');
    }
  });
  const main = layer(STAGE_W, VIEW_H, (g, w) => {
    // Sütunlar
    for (let k = 0; k < 6; k++) {
      const x = 20 + k * 96;
      g.rect(x, 0, 26, 170, '#3a3040');
      g.rect(x, 0, 5, 170, '#4a4050');
      g.rect(x + 20, 0, 6, 170, '#221a28');
      g.rect(x - 4, 158, 34, 12, '#2a2230');
      g.rect(x - 4, 20, 34, 8, '#2a2230');
      for (let y = 30; y < 158; y += 16) g.rect(x + 2, y, 22, 1, '#2a2230');
    }
    statue(g, 165, 168, '#5a5048');
    statue(g, 355, 168, '#5a5048');
    // Altar
    g.rect(226, 140, 60, 28, '#302430');
    g.rect(222, 136, 68, 5, '#4a3a48');
    g.rect(244, 120, 24, 16, '#1a1018');
    g.circ(256, 116, 6, '#701818');
    // Zemin: kırmızımsı taş, perspektif
    g.rect(0, 170, w, 54, '#24181c');
    let y = 170;
    let h = 3;
    while (y < VIEW_H) {
      g.rect(0, y, w, 1, '#120a0e');
      for (let x = (y * 7) % 30; x < w; x += 30 + h * 3) g.rect(x, y, 1, h, '#120a0e');
      g.rect(0, y + 1, w, 1, '#30222a');
      y += h + 1;
      h += 2;
    }
  });
  return { far, main, torches: [70, 262, 450], fog: '#200810' };
}

// ---- 1: Çukur köprüsü ----
function bridge() {
  const far = layer(416, VIEW_H, (g, w) => {
    const bands = ['#0c0618', '#140a24', '#1c0e30', '#26123a', '#301644', '#3a1a48'];
    bands.forEach((c, i) => g.rect(0, i * 25, w, 26, c));
    for (let i = 0; i < 5; i++) ditherBand(g, 0, i * 25 + 20, w, 6, bands[i], bands[i + 1]);
    const r = rng(5);
    for (let k = 0; k < 60; k++) g.pset(Math.floor(r() * w), Math.floor(r() * 120), r() < 0.3 ? '#e0d0ff' : '#806090');
    g.circ(300, 46, 22, '#d8c8b0');
    g.circ(294, 40, 5, '#b8a890');
    g.circ(308, 54, 3, '#b8a890');
    // Uzak dağ kayalıkları
    for (let x = 0; x < w; x++) {
      const hh = 40 + Math.sin(x / 23) * 14 + Math.sin(x / 7) * 4;
      g.rect(x, 150 - hh, 1, hh + 74, '#120a1a');
    }
  });
  const main = layer(STAGE_W, VIEW_H, (g, w) => {
    // Çukurdaki kazıklar (arka planda, köprünün altında)
    g.rect(0, 120, w, 60, '#08040c');
    for (let x = 0; x < w; x += 9) {
      const hh = 26 + ((x * 13) % 17);
      for (let k = 0; k < hh; k++) {
        const ww = Math.max(1, Math.floor(((hh - k) / hh) * 5));
        g.rect(x + 4 - Math.floor(ww / 2), 180 - k, ww, 1, k > hh - 4 ? '#c8c0c8' : '#6a6070');
      }
    }
    for (let x = 0; x < w; x += 9) g.pset(x + 4, 180 - 26 - ((x * 13) % 17), '#ffffff');
    // Köprü korkulukları
    g.rect(0, 150, w, 4, '#4a3428');
    for (let x = 0; x < w; x += 24) {
      g.rect(x, 126, 6, 30, '#5a4030');
      g.rect(x, 126, 2, 30, '#6a5040');
      g.rect(x - 1, 124, 8, 3, '#3a2a20');
    }
    g.line(0, 132, w, 132, '#2a1e18');
    for (let x = 0; x < w; x += 24) g.line(x + 3, 132, x + 15, 138, '#2a1e18');
    // Köprü tahtaları (zemin)
    g.rect(0, 180, w, 44, '#3a2a20');
    let y = 180;
    let h = 3;
    while (y < VIEW_H) {
      g.rect(0, y, w, 1, '#1e140e');
      g.rect(0, y + 1, w, 1, '#4a3628');
      y += h + 1;
      h += 2;
    }
    for (let x = 0; x < w; x += 36) g.line(x + 18, 180, x - 6, 224, '#1e140e');
    g.rect(0, 178, w, 3, '#5a4434');
  });
  return { far, main, torches: [24, 256, 488], fog: '#1a0a28' };
}

// ---- 2: Taht odası ----
function throne() {
  const far = layer(416, VIEW_H, (g, w) => {
    g.cls('#100808');
    stoneWall(g, 0, 0, w, 170, '#2a1a14', 9);
  });
  const main = layer(STAGE_W, VIEW_H, (g, w) => {
    // Sancaklar
    for (const x of [60, 150, 350, 440]) {
      g.rect(x, 10, 30, 90, '#5a0a0a');
      g.rect(x, 10, 30, 3, '#d0a030');
      for (let k = 0; k < 6; k++) g.rect(x + k * 5, 100, 5, 6 - (k % 2) * 3, '#5a0a0a');
      g.circ(x + 15, 50, 9, '#d0a030');
      g.circ(x + 15, 50, 6, '#5a0a0a');
      g.rect(x + 13, 44, 4, 12, '#d0a030');
    }
    // Taht
    const tx = 256;
    g.rect(tx - 30, 60, 60, 108, '#2a1810');
    g.rect(tx - 34, 56, 68, 8, '#d0a030');
    for (let k = 0; k < 5; k++) g.rect(tx - 30 + k * 14, 44 - (k === 2 ? 10 : 0), 4, 14 + (k === 2 ? 10 : 0), '#d0a030');
    g.rect(tx - 22, 70, 44, 50, '#6a0c0c');
    g.rect(tx - 40, 120, 80, 14, '#3a2418');
    g.rect(tx - 40, 120, 80, 2, '#d0a030');
    g.rect(tx - 44, 134, 88, 34, '#2a1810');
    // Basamaklar
    for (let k = 0; k < 3; k++) g.rect(tx - 60 - k * 12, 160 + k * 4, 120 + k * 24, 4, '#3a2a22');
    // Kafatası süsleri yerine taş küreler (sade)
    for (const x of [tx - 50, tx + 46]) { g.circ(x, 112, 5, '#4a4040'); g.rect(x - 3, 116, 7, 12, '#3a3030'); }
    // Zemin: siyah-kırmızı kare desen
    g.rect(0, 170, w, 54, '#1a0c0c');
    let y = 170;
    let h = 3;
    let row = 0;
    while (y < VIEW_H) {
      for (let x = 0; x < w; x += 24) {
        if ((Math.floor(x / 24) + row) % 2) g.rect(x + (row % 2) * 6, y, 24, h, '#2e1212');
      }
      g.rect(0, y + h, w, 1, '#0a0404');
      y += h + 1;
      h += 2;
      row++;
    }
  });
  return { far, main, torches: [24, 200, 312, 488], fog: '#200a04', braziers: [120, 392] };
}

const BUILDERS = [temple, bridge, throne];
export const STAGE_NAMES = ['KARANLIK TAPINAK', 'ÇUKUR KÖPRÜSÜ', 'TAHT ODASI'];
const cache = [];
export function getStage(i) {
  const k = ((i % 3) + 3) % 3;
  if (!cache[k]) cache[k] = BUILDERS[k]();
  return cache[k];
}

function flame(gfx, x, y, frame, big = 1) {
  const f = frame / 4;
  for (let k = 0; k < 6; k++) {
    const ph = Math.sin(f + k * 1.7);
    const fx = x + Math.round(ph * 2 * big);
    const fy = y - k * 2 * big;
    const ww = Math.max(1, Math.round((6 - k) * big));
    gfx.rect(fx - ww / 2, fy, ww, 2 * big, k < 2 ? '#ffe080' : k < 4 ? '#ff8020' : '#c02010');
  }
}

export function drawStage(gfx, i, camX, frame) {
  const st = getStage(i);
  const ctx = gfx.ctx;
  ctx.drawImage(st.far, -Math.round(camX * 0.5), 0);
  ctx.drawImage(st.main, -Math.round(camX), 0);
  // Meşaleler
  for (const tx of st.torches) {
    const x = Math.round(tx - camX);
    if (x < -20 || x > VIEW_W + 20) continue;
    gfx.rect(x - 2, 86, 5, 16, '#3a2a20');
    gfx.rect(x - 4, 84, 9, 3, '#5a4a3a');
    flame(gfx, x, 80, frame + tx);
    // ışık halesi
    ctx.fillStyle = 'rgba(255,120,40,0.07)';
    ctx.fillRect(x - 20, 60, 40, 40);
  }
  if (st.braziers) {
    for (const bx of st.braziers) {
      const x = Math.round(bx - camX);
      gfx.rect(x - 10, 150, 20, 6, '#6a5040');
      gfx.rect(x - 3, 156, 6, 14, '#4a3828');
      gfx.rect(x - 8, 168, 16, 3, '#4a3828');
      flame(gfx, x - 4, 146, frame + bx, 1.4);
      flame(gfx, x + 4, 146, frame + bx + 9, 1.4);
    }
  }
  // Yerde süzülen sis
  ctx.fillStyle = st.fog;
  for (let k = 0; k < 8; k++) {
    const fx = ((k * 83 + frame * 0.4) % 600) - 60 - camX * 0.2;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(Math.round(fx), 196 + (k % 3) * 6, 50, 3);
    ctx.globalAlpha = 1;
  }
}
