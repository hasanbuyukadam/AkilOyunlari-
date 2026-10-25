// Sahne arka planları: iki katman (uzak paralaks + ana sahne) bir kez önceden çizilir,
// hareketli ayrıntılar (seyirci, su, martı, fener) her karede eklenir.
import { createGfx } from '../../js/engine/gfx.js';
import { mix } from './art.js';

export const STAGE_W = 512;
export const VIEW_W = 320;
export const VIEW_H = 224;
export const GY = 206; // zemin çizgisi (ekran y)

function layer(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = createGfx(c);
  paint(g, w, h);
  return c;
}

// Basit deterministik rastgele (sahne her açılışta aynı görünsün)
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function skyBands(g, w, top, bottom, cols) {
  const n = cols.length;
  const bh = (bottom - top) / n;
  cols.forEach((c, i) => g.rect(0, Math.floor(top + i * bh), w, Math.ceil(bh) + 1, c));
}

// Arnavut kaldırımı / taş zemin
function floorStones(g, w, y0, base, line, hi, seed) {
  const r = rng(seed);
  g.rect(0, y0, w, VIEW_H - y0, base);
  let y = y0;
  let row = 0;
  while (y < VIEW_H) {
    const h = 3 + Math.floor((y - y0) / 7);
    let x = (row % 2) * 5 - 6;
    while (x < w) {
      const sw = 8 + Math.floor(r() * 6) + Math.floor((y - y0) / 5);
      g.rect(x, y, 1, h, line);
      g.rect(x + 1, y, sw - 2, 1, hi);
      x += sw;
    }
    g.rect(0, y + h, w, 1, line);
    y += h + 1;
    row++;
  }
}

// ---- 0: İstanbul sokağı (alacakaranlık) ----
function istanbul() {
  const far = layer(416, VIEW_H, (g, w) => {
    skyBands(g, w, 0, 150, ['#1c1040', '#2a1650', '#3e1c5c', '#5a2460', '#7c2c5c', '#a63c52', '#cc5640', '#e8783a', '#f8a048']);
    g.circ(300, 118, 14, '#ffd070');
    g.circ(300, 118, 10, '#ffe8a0');
    const sil = '#2c1838';
    // Cami siluetleri
    const mosque = (cx, s) => {
      g.rect(cx - 30 * s, 128 - 12 * s, 60 * s, 30, sil);
      g.circ(cx, 128 - 14 * s, 16 * s, sil);
      g.circ(cx - 22 * s, 128 - 10 * s, 8 * s, sil);
      g.circ(cx + 22 * s, 128 - 10 * s, 8 * s, sil);
      g.rect(cx - 1, 128 - 34 * s, 2, 6 * s, sil);
      for (const mx of [-40, 40]) {
        g.rect(cx + mx * s - 2, 128 - 52 * s, 4, 60 * s, sil);
        g.rect(cx + mx * s - 3, 128 - 40 * s, 6, 2, sil);
        g.line(cx + mx * s - 2, 128 - 52 * s, cx + mx * s, 128 - 62 * s, sil);
        g.line(cx + mx * s + 1, 128 - 52 * s, cx + mx * s, 128 - 62 * s, sil);
      }
    };
    mosque(110, 1);
    mosque(240, 0.7);
    // Galata kulesi
    g.rect(360, 80, 18, 70, sil);
    g.rect(358, 92, 22, 4, sil);
    for (let i = 0; i < 12; i++) g.rect(369 - i * 0.9, 68 + i, 1 + i * 1.8, 1, sil);
    for (let i = 0; i < 6; i++) g.rect(363 + i * 3, 100, 1, 3, '#ffcc60');
    // Deniz
    g.rect(0, 140, w, 12, '#3a3478');
    for (let i = 0; i < 40; i++) g.rect((i * 37) % w, 142 + (i * 7) % 9, 6, 1, '#e88a5a');
  });
  const main = layer(STAGE_W, VIEW_H, (g, w) => {
    const r = rng(7);
    const houseCols = ['#b84a3a', '#d8a050', '#5a7a9a', '#c87a5a', '#7a9a5a', '#d0c0a0', '#9a5a7a'];
    let x = -6;
    let i = 0;
    while (x < w) {
      const hw = 54 + Math.floor(r() * 26);
      const top = 66 + Math.floor(r() * 30);
      const col = houseCols[i % houseCols.length];
      const dark = mix(col, '#000', 0.35);
      const light = mix(col, '#fff', 0.25);
      g.rect(x, top, hw, 160 - top, col);
      for (let yy = top + 3; yy < 160; yy += 4) g.rect(x, yy, hw, 1, mix(col, '#000', 0.12));
      // çatı
      for (let k = 0; k < 7; k++) g.rect(x - 4 + k, top - 7 + k, hw + 8 - k * 2, 1, '#6a2a22');
      g.rect(x - 4, top, hw + 8, 2, '#4a1a16');
      // cumba
      const cx = x + 8 + Math.floor(r() * (hw - 40));
      g.rect(cx, top + 18, 28, 26, light);
      g.rect(cx - 2, top + 16, 32, 3, dark);
      g.rect(cx - 2, top + 44, 32, 3, dark);
      for (let k = 0; k < 3; k++) {
        g.rect(cx + 3 + k * 8, top + 22, 6, 16, '#2a2440');
        g.rect(cx + 3 + k * 8, top + 22, 6, 6, (i + k) % 3 === 0 ? '#ffd070' : '#3a3460');
        g.rect(cx + 5 + k * 8, top + 22, 1, 16, dark);
      }
      // alt kat pencereleri / kapı
      g.rect(x + 6, 124, 10, 16, '#2a2030');
      g.rect(x + hw - 22, 116, 14, 30, '#3a2418');
      g.rect(x + hw - 20, 118, 10, 26, '#5a3a24');
      g.rect(x + hw - 12, 130, 2, 2, '#ffd070');
      g.rect(x, 158, hw, 2, dark);
      g.rect(x, top, 1, 160 - top, dark);
      x += hw;
      i++;
    }
    // Çay ocağı tentesi
    for (let k = 0; k < 10; k++) g.rect(180 + k * 10, 108, 10, 8, k % 2 ? '#f0e8d8' : '#c02828');
    for (let k = 0; k < 10; k++) g.rect(180 + k * 10 + 2, 116, 6, 2, k % 2 ? '#d8d0c0' : '#901818');
    g.text('ÇAY', 270, 98, '#ffd070', { shadow: '#301010' });
    // Kaldırım ve yol
    g.rect(0, 160, w, 6, '#8a7a6a');
    g.rect(0, 166, w, 2, '#5a4a40');
    floorStones(g, w, 168, '#7a6656', '#4a3a32', '#9a8676', 3);
    // Tramvay rayı
    g.rect(0, 214, w, 2, '#c0b0a0');
    g.rect(0, 216, w, 1, '#3a2a22');
    // Sokak lambaları
    for (const lx of [60, 300, 460]) {
      g.rect(lx, 96, 3, 66, '#1e1a22');
      g.rect(lx - 6, 92, 15, 6, '#1e1a22');
      g.rect(lx - 4, 98, 11, 6, '#ffd890');
    }
    // Simit tezgahı
    g.rect(392, 140, 36, 20, '#c08040');
    g.rect(390, 136, 40, 4, '#e0a050');
    for (let k = 0; k < 5; k++) g.circb(396 + k * 7, 132, 3, '#b06020');
    g.circ(396, 162, 3, '#202020');
    g.circ(424, 162, 3, '#202020');
  });
  return { far, main, crowd: { y: 158, cols: ['#c84040', '#4060b0', '#e0c040', '#40a060', '#a050a0', '#e08040', '#f0f0f0'], skin: ['#e0a070', '#c08050', '#f0c090'], xs: [20, 38, 150, 166, 182, 340, 356, 372, 488] }, extra: 'lamps' };
}

// ---- 1: Dağ tapınağı ----
function temple() {
  const far = layer(416, VIEW_H, (g, w) => {
    skyBands(g, w, 0, 150, ['#7ab0e8', '#8abcec', '#9ac8f0', '#acd2f2', '#c0dcf4', '#d4e6f6']);
    // Dağlar
    const mount = (cx, hw, top, c, snow) => {
      for (let y = top; y < 150; y++) {
        const k = (y - top) / (150 - top);
        g.rect(cx - hw * k, y, hw * 2 * k, 1, c);
        if (snow && y < top + 12) g.rect(cx - hw * k, y, hw * 2 * k, 1, '#f4f8ff');
      }
    };
    mount(80, 120, 40, '#7a8cb0', true);
    mount(260, 150, 26, '#6a7ca4', true);
    mount(380, 90, 60, '#7a8cb0', false);
    mount(170, 140, 80, '#5a7a6a', false);
    mount(340, 130, 90, '#4e6e5e', false);
    // Bulutlar
    for (const [cx, cy] of [[60, 30], [200, 18], [330, 40]]) {
      g.circ(cx, cy, 8, '#ffffff');
      g.circ(cx + 10, cy - 3, 10, '#ffffff');
      g.circ(cx + 22, cy, 7, '#ffffff');
      g.rect(cx - 6, cy + 2, 34, 6, '#ffffff');
    }
  });
  const main = layer(STAGE_W, VIEW_H, (g, w) => {
    // Tapınak binası
    const tx = 120;
    const tw = 270;
    g.rect(tx, 92, tw, 70, '#d8c8a8');
    for (let k = 0; k < 7; k++) {
      const px = tx + 8 + k * 42;
      g.rect(px, 92, 8, 70, '#b02a20');
      g.rect(px + 1, 92, 2, 70, '#d04030');
      g.rect(px + 6, 92, 2, 70, '#801c18');
    }
    for (let k = 0; k < 6; k++) {
      const px = tx + 20 + k * 42;
      g.rect(px, 104, 22, 40, '#3a2a20');
      for (let j = 0; j < 4; j++) g.rect(px + 1, 106 + j * 10, 20, 1, '#6a5240');
      g.rect(px + 10, 104, 1, 40, '#6a5240');
    }
    // Kıvrık çatılar
    const roof = (x0, wid, y, h, c, dk) => {
      for (let k = 0; k < h; k++) {
        const curve = Math.floor(((h - k) * (h - k)) / (h * 1.3));
        g.rect(x0 + k * 2 - 6, y + k - curve, wid - k * 4 + 12, 1, k % 3 === 0 ? dk : c);
      }
      g.rect(x0 - 10, y + h - 1, wid + 20, 3, dk);
    };
    roof(tx - 10, tw + 20, 72, 20, '#3a4a5a', '#1e2a36');
    g.rect(tx + 60, 50, tw - 120, 22, '#d8c8a8');
    g.rect(tx + 60, 62, tw - 120, 2, '#b02a20');
    roof(tx + 40, tw - 80, 34, 16, '#3a4a5a', '#1e2a36');
    g.rect(tx + tw / 2 - 18, 52, 36, 14, '#b02a20');
    g.text('DOJO', tx + tw / 2, 55, '#ffd060', { align: 'center' });
    // Kiraz ağaçları
    const tree = (cx, cy) => {
      g.rect(cx - 2, cy, 5, 60, '#5a3424');
      g.line(cx, cy + 10, cx - 14, cy - 4, '#5a3424');
      g.line(cx, cy + 6, cx + 16, cy - 8, '#5a3424');
      for (const [ox, oy, r] of [[-14, -8, 12], [12, -12, 13], [0, -18, 12], [-4, -2, 10], [20, -2, 9]]) {
        g.circ(cx + ox, cy + oy, r, '#f0a0c0');
        g.circ(cx + ox - 2, cy + oy - 3, r - 4, '#ffc8dc');
      }
    };
    tree(50, 100);
    tree(450, 104);
    // Taş zemin
    g.rect(0, 160, w, 8, '#9a9080');
    g.rect(0, 160, w, 1, '#c8c0b0');
    let y = 168;
    let h = 4;
    while (y < VIEW_H) {
      g.rect(0, y, w, h, (Math.floor((y - 168) / 5) % 2) ? '#a89c88' : '#b4a894');
      for (let x = (y % 3) * 7; x < w; x += 24 + h * 2) g.rect(x, y, 1, h, '#7a6e5e');
      g.rect(0, y + h, w, 1, '#7a6e5e');
      y += h + 1;
      h += 1;
    }
    // Taş fenerler
    for (const lx of [100, 404]) {
      g.rect(lx - 6, 150, 12, 10, '#8a8478');
      g.rect(lx - 3, 136, 6, 14, '#8a8478');
      g.rect(lx - 8, 124, 16, 12, '#9a9488');
      g.rect(lx - 4, 127, 8, 6, '#3a2a20');
      g.rect(lx - 10, 120, 20, 4, '#6a6458');
    }
    // Büyük çan
    g.rect(244, 100, 24, 3, '#3a2a20');
    g.circ(256, 116, 9, '#8a6a30');
    g.rect(247, 116, 19, 10, '#8a6a30');
    g.rect(245, 125, 23, 2, '#6a4a20');
    g.rect(250, 110, 3, 12, '#b08a40');
  });
  return { far, main, crowd: { y: 160, cols: ['#e0e0e0', '#c04030', '#202838', '#d0a040'], skin: ['#f0c090', '#e0a878'], xs: [136, 152, 360, 376] }, extra: 'petals' };
}

// ---- 2: Liman ----
function harbor() {
  const far = layer(416, VIEW_H, (g, w) => {
    skyBands(g, w, 0, 120, ['#3a8ad8', '#4a96dc', '#5aa2e0', '#6caee4', '#80bae8', '#96c8ec']);
    for (const [cx, cy] of [[40, 40], [180, 26], [320, 50]]) {
      g.circ(cx, cy, 9, '#f8fcff');
      g.circ(cx + 12, cy - 4, 11, '#f8fcff');
      g.circ(cx + 26, cy, 8, '#f8fcff');
      g.rect(cx - 7, cy + 2, 40, 7, '#f8fcff');
      g.rect(cx - 7, cy + 7, 40, 2, '#d0e0f0');
    }
    // Uzak kıyı
    g.rect(0, 112, w, 8, '#5a7a8a');
    for (let x = 0; x < w; x += 9) g.rect(x, 106 + ((x * 7) % 6), 7, 8, '#6a8a9a');
    g.rect(0, 120, w, 40, '#1e5a9a');
    for (let k = 0; k < 60; k++) g.rect((k * 53) % w, 122 + (k * 11) % 36, 5 + (k % 4), 1, '#4a8ac8');
    // Uzak gemi
    g.rect(250, 104, 60, 10, '#2a2a3a');
    g.rect(262, 94, 30, 10, '#e0e0e0');
    g.rect(270, 84, 8, 10, '#c03030');
  });
  const main = layer(STAGE_W, VIEW_H, (g, w) => {
    // Vinçler
    for (const cx of [80, 420]) {
      g.rect(cx, 30, 6, 130, '#e0a020');
      for (let y = 34; y < 160; y += 8) { g.line(cx, y, cx + 5, y + 8, '#a07010'); }
      g.rect(cx - 50, 30, 90, 5, '#e0a020');
      for (let x = cx - 50; x < cx + 40; x += 6) g.line(x, 30, x + 6, 35, '#a07010');
      g.line(cx - 40, 35, cx - 40, 90, '#303030');
      g.rect(cx - 44, 90, 9, 6, '#505050');
    }
    // Konteynerler
    const cont = (x, y, cw, c) => {
      g.rect(x, y, cw, 22, c);
      for (let k = 2; k < cw; k += 4) g.rect(x + k, y + 2, 1, 18, mix(c, '#000', 0.3));
      g.rect(x, y, cw, 2, mix(c, '#fff', 0.3));
    };
    cont(140, 116, 70, '#c04030');
    cont(210, 116, 70, '#3060a0');
    cont(170, 94, 70, '#3a9a5a');
    cont(300, 116, 60, '#d08a30');
    // Rıhtım
    g.rect(0, 138, w, 22, '#1e5a9a');
    g.rect(0, 156, w, 4, '#3a2a1a');
    // Ahşap iskele zemini
    let y = 160;
    let h = 4;
    while (y < VIEW_H) {
      g.rect(0, y, w, h, (Math.floor(y / 3) % 2) ? '#8a6040' : '#9a6c48');
      g.rect(0, y + h, w, 1, '#5a3a24');
      for (let x = (y * 13) % 40; x < w; x += 60 + h * 3) { g.rect(x, y, 1, h, '#5a3a24'); g.pset(x + 3, y + 1, '#3a2418'); }
      y += h + 1;
      h += 1;
    }
    // Babalar ve halat
    for (const bx of [30, 250, 480]) {
      g.rect(bx - 4, 150, 9, 10, '#303038');
      g.rect(bx - 6, 148, 13, 3, '#404048');
    }
    g.line(0, 150, 30, 152, '#c0a070');
    // Varil
    for (const bx of [370, 386]) {
      g.rect(bx, 142, 14, 18, '#3a6a3a');
      g.rect(bx, 146, 14, 1, '#2a4a2a');
      g.rect(bx, 154, 14, 1, '#2a4a2a');
      g.rect(bx + 2, 142, 2, 18, '#5a8a5a');
    }
  });
  return { far, main, crowd: { y: 158, cols: ['#3a5a9a', '#e0e0e0', '#c08030', '#2a2a2a', '#a03030'], skin: ['#d8a070', '#b08050'], xs: [110, 124, 290, 452, 466] }, extra: 'gulls' };
}

// ---- 3: Hava üssü (çöl gün batımı) ----
function airbase() {
  const far = layer(416, VIEW_H, (g, w) => {
    skyBands(g, w, 0, 140, ['#2a3a6a', '#4a4a7a', '#7a5a7a', '#b0687a', '#e08070', '#f0a060', '#f8c070', '#fce090']);
    g.circ(110, 124, 18, '#fff0b0');
    for (let k = 0; k < 6; k++) g.rect(80, 116 + k * 4, 60, 1, '#f8c070');
    // Kum tepeleri
    for (let x = 0; x < w; x++) {
      const hgt = 10 + Math.sin(x / 40) * 6 + Math.sin(x / 13) * 2;
      g.rect(x, 140 - hgt, 1, hgt + 20, '#c8945a');
      g.pset(x, 140 - hgt, '#e8b878');
    }
  });
  const main = layer(STAGE_W, VIEW_H, (g, w) => {
    // Hangar
    g.rect(150, 70, 220, 90, '#6a7060');
    for (let k = 0; k < 18; k++) {
      const yy = 70 - Math.floor(Math.sin((k / 17) * Math.PI) * 26);
      g.rect(150 + k * 12, yy, 12, 70 - yy + 2, '#7a8070');
      g.rect(150 + k * 12, yy, 12, 2, '#9aa090');
    }
    g.rect(180, 96, 160, 64, '#2a2e2a');
    for (let k = 0; k < 8; k++) g.rect(180 + k * 20, 96, 1, 64, '#3a3e3a');
    g.text('HANGAR 3', 260, 80, '#f0e0a0', { align: 'center' });
    // Jet
    const jx = 210;
    g.rect(jx, 132, 100, 10, '#8a9098');
    g.rect(jx, 132, 100, 2, '#b0b8c0');
    for (let k = 0; k < 12; k++) g.rect(jx + 100 + k, 134 + Math.floor(k / 4), 12 - k, 1, '#8a9098');
    g.rect(jx + 70, 126, 18, 6, '#4a90c0');
    g.rect(jx + 72, 126, 6, 2, '#a0d0f0');
    for (let k = 0; k < 16; k++) g.rect(jx + 30 + k, 142 + Math.floor(k / 2), 40 - k * 2, 1, '#6a7078');
    for (let k = 0; k < 14; k++) g.rect(jx + 4, 118 + k, 4 + k, 1, '#7a8088');
    g.rect(jx + 40, 150, 3, 8, '#303030');
    g.circ(jx + 41, 158, 2, '#202020');
    g.rect(jx + 90, 146, 2, 10, '#303030');
    g.circ(jx + 91, 157, 2, '#202020');
    // Kum torbaları ve çit
    for (let k = 0; k < 10; k++) {
      const bx = 14 + (k % 5) * 14;
      const by = 146 - Math.floor(k / 5) * 7;
      g.rect(bx, by, 13, 7, '#b09a6a');
      g.rect(bx, by + 6, 13, 1, '#7a6a48');
    }
    for (let x = 400; x < w; x += 10) { g.rect(x, 120, 2, 40, '#505450'); }
    for (let k = 0; k < 4; k++) g.rect(400, 124 + k * 9, 112, 1, '#707470');
    for (let x = 400; x < w; x += 5) g.line(x, 124, x + 9, 151, '#5a5e5a');
    // Beton zemin
    g.rect(0, 160, w, 64, '#8a8478');
    let y = 160;
    let h = 4;
    while (y < VIEW_H) {
      g.rect(0, y + h, w, 1, '#6a6458');
      y += h + 1;
      h += 2;
    }
    for (let x = 0; x < w; x += 64) g.line(x + 32, 160, x - 20, 224, '#6a6458');
    for (let x = 0; x < w; x += 40) g.rect(x, 194, 22, 3, '#e8d050');
  });
  return { far, main, crowd: { y: 158, cols: ['#4a6a2a', '#5a6a3a', '#3a4a2a'], skin: ['#d8a070', '#a07050', '#f0c090'], xs: [120, 134, 380, 394] }, extra: 'beacon' };
}

// ---- 4: Gece çatısı (son düşman) ----
function rooftop() {
  const far = layer(416, VIEW_H, (g, w) => {
    skyBands(g, w, 0, 150, ['#06061a', '#0a0a24', '#10102e', '#16163a', '#1e1c46', '#2a2450']);
    const r = rng(11);
    for (let k = 0; k < 70; k++) g.pset(Math.floor(r() * w), Math.floor(r() * 110), r() < 0.3 ? '#ffffff' : '#8080b0');
    g.circ(320, 40, 18, '#f0f0d0');
    g.circ(326, 36, 16, '#06061a');
    // Şehir
    let x = 0;
    while (x < w) {
      const bw = 16 + Math.floor(r() * 26);
      const bh = 30 + Math.floor(r() * 70);
      g.rect(x, 150 - bh, bw, bh, '#14142a');
      for (let yy = 150 - bh + 4; yy < 146; yy += 6) {
        for (let xx = x + 3; xx < x + bw - 3; xx += 5) if (r() < 0.35) g.rect(xx, yy, 2, 3, r() < 0.5 ? '#f0d070' : '#a0b0f0');
      }
      x += bw + 2;
    }
  });
  const main = layer(STAGE_W, VIEW_H, (g, w) => {
    // Su deposu
    g.rect(60, 70, 50, 60, '#4a3a3a');
    for (let k = 0; k < 6; k++) g.rect(60, 74 + k * 10, 50, 1, '#2a2020');
    for (let k = 0; k < 12; k++) g.rect(56 + k * 2, 70 - k, 58 - k * 4, 1, '#3a2a2a');
    for (const lx of [64, 102]) g.rect(lx, 130, 4, 30, '#2a2020');
    // Neon tabela
    g.rect(300, 60, 120, 30, '#1a1028');
    g.rectb(300, 60, 120, 30, '#ff40a0');
    g.text('GECE KULÜBÜ', 360, 72, '#ff60c0', { align: 'center' });
    // Korkuluk
    g.rect(0, 140, w, 3, '#3a3a50');
    for (let x = 0; x < w; x += 12) g.rect(x, 140, 2, 20, '#3a3a50');
    g.rect(0, 156, w, 4, '#2a2a3a');
    // Çatı zemini
    g.rect(0, 160, w, 64, '#3a3846');
    let y = 160;
    let h = 4;
    while (y < VIEW_H) {
      g.rect(0, y + h, w, 1, '#2a2834');
      y += h + 1;
      h += 2;
    }
    for (let x = 0; x < w; x += 48) g.line(x + 24, 160, x - 16, 224, '#2a2834');
  });
  return { far, main, crowd: null, extra: 'neon' };
}

const BUILDERS = [istanbul, temple, harbor, airbase, rooftop];
export const STAGE_NAMES = ['İSTANBUL SOKAĞI', 'DAĞ TAPINAĞI', 'LİMAN', 'HAVA ÜSSÜ', 'GECE ÇATISI'];
const cache = [];

export function getStage(i) {
  const k = ((i % BUILDERS.length) + BUILDERS.length) % BUILDERS.length;
  if (!cache[k]) cache[k] = BUILDERS[k]();
  return cache[k];
}

// Seyirciler (zıplayıp el sallayan basit figürler)
function crowd(ctx, st, camX, frame, excite) {
  const c = st.crowd;
  if (!c) return;
  c.xs.forEach((x, i) => {
    const sx = Math.round(x - camX);
    if (sx < -20 || sx > VIEW_W + 20) return;
    const bob = (Math.floor(frame / (excite ? 6 : 14) + i * 3) % 2);
    const y = c.y - 22 - bob;
    const col = c.cols[i % c.cols.length];
    const sk = c.skin[i % c.skin.length];
    ctx.fillStyle = mix(col, '#000', 0.2);
    ctx.fillRect(sx - 5, y + 8, 11, 14);
    ctx.fillStyle = col;
    ctx.fillRect(sx - 4, y + 8, 9, 12);
    ctx.fillStyle = sk;
    ctx.fillRect(sx - 3, y, 7, 7);
    ctx.fillStyle = '#2a1a14';
    ctx.fillRect(sx - 3, y, 7, 2);
    ctx.fillStyle = sk;
    if (excite || bob) { ctx.fillRect(sx - 7, y - 2 + bob * 2, 2, 9); ctx.fillRect(sx + 6, y - 2 + (1 - bob) * 2, 2, 9); } else { ctx.fillRect(sx - 6, y + 9, 2, 8); ctx.fillRect(sx + 5, y + 9, 2, 8); }
  });
}

export function drawStage(gfx, i, camX, frame, excite = false) {
  const st = getStage(i);
  const ctx = gfx.ctx;
  ctx.drawImage(st.far, -Math.round(camX * 0.5), 0);
  ctx.drawImage(st.main, -Math.round(camX), 0);
  crowd(ctx, st, camX, frame, excite);
  switch (st.extra) {
    case 'gulls':
      for (let k = 0; k < 3; k++) {
        const gx = ((frame * (0.4 + k * 0.15) + k * 150) % 600) - 100 - camX * 0.3;
        const gy = 30 + k * 14 + Math.sin(frame / 20 + k) * 4;
        const wing = Math.floor(frame / 10 + k) % 2;
        gfx.pset(gx, gy, '#ffffff');
        gfx.rect(gx - 3, gy - wing, 3, 1, '#ffffff');
        gfx.rect(gx + 1, gy - wing, 3, 1, '#ffffff');
      }
      for (let k = 0; k < 12; k++) {
        const wx = ((k * 47 + frame * 0.3) % STAGE_W) - camX;
        gfx.rect(wx, 142 + (k % 4) * 3, 6, 1, '#6aa0e0');
      }
      break;
    case 'petals':
      for (let k = 0; k < 10; k++) {
        const px = ((k * 61 + frame * 0.5) % 560) - 30 - camX * 0.9;
        const py = ((k * 37 + frame * 0.6) % 160) + 20;
        gfx.rect(px + Math.sin(frame / 15 + k) * 4, py, 2, 1, '#ffb8d0');
      }
      break;
    case 'lamps':
      if (frame % 60 < 50) for (const lx of [60, 300, 460]) gfx.rect(lx - 4 - camX, 98, 11, 2, '#fff4c0');
      break;
    case 'beacon':
      if (frame % 50 < 8) gfx.rect(256 - camX, 42, 4, 4, '#ff3030');
      gfx.rect(257 - camX, 46, 2, 24, '#505450');
      break;
    case 'neon':
      if (frame % 90 < 80) gfx.ctx.drawImage(st.main, 300, 60, 120, 30, 300 - Math.round(camX), 60, 120, 30);
      else gfx.rect(300 - camX, 60, 120, 30, '#1a1028');
      break;
    default:
      break;
  }
}
