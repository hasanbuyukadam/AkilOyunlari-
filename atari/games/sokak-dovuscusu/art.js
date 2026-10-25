// Dövüşçü çizimi: iskelet + ters kinematik (IK) ile pozlanan, piksel piksel taranan
// "kapsül" uzuvlar. Her uzuv dış çizgi + 3 tonlu (gölge/orta/ışık) dolgu alır.
import { makeSprite } from '../../js/engine/gfx.js';

const D2R = Math.PI / 180;
const LX = -0.55;
const LY = -0.83; // ışık sol üstten

// ---- Renk yardımcıları ----
export function rgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function hex(a) {
  return `#${a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}
export function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return hex(A.map((v, i) => v + (B[i] - v) * t));
}
export function tones(c) {
  return { o: mix(c, '#100808', 0.74), d: mix(c, '#1c0c14', 0.36), m: c, l: mix(c, '#fff8e8', 0.36) };
}
export const FLASH = { o: '#ffffff', d: '#fff0c0', m: '#ffffff', l: '#ffffff' };

// ---- Pozlar ----
// Kalça (x,y), gövde eğimi (derece, + ileri), ön el / arka el (göğse göre),
// ön ayak / arka ayak (yere göre), tüm gövde dönüşü (derece, + geriye).
export const P = (hx, hy, lean, hfx, hfy, hbx, hby, ffx, ffy, fbx, fby, rot = 0) => ({
  hx, hy, lean, hf: [hfx, hfy], hb: [hbx, hby], ff: [ffx, ffy], fb: [fbx, fby], rot,
});

// İki kemikli IK: kökten hedefe, eklemi tercih yönüne büker
function ik(r, t, l1, l2, pref) {
  let dx = t[0] - r[0];
  let dy = t[1] - r[1];
  let d = Math.hypot(dx, dy) || 0.001;
  const maxd = (l1 + l2) * 0.999;
  const mind = Math.abs(l1 - l2) + 0.5;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; } else if (d < mind) { dx *= mind / d; dy *= mind / d; d = mind; }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const th = Math.atan2(dy, dx);
  const j1 = [r[0] + l1 * Math.cos(th + a), r[1] + l1 * Math.sin(th + a)];
  const j2 = [r[0] + l1 * Math.cos(th - a), r[1] + l1 * Math.sin(th - a)];
  const s1 = (j1[0] - r[0]) * pref[0] + (j1[1] - r[1]) * pref[1];
  const s2 = (j2[0] - r[0]) * pref[0] + (j2[1] - r[1]) * pref[1];
  return [s1 >= s2 ? j1 : j2, [r[0] + dx, r[1] + dy]];
}

// Pozdan yerel (sağa bakan, y yukarı) iskelet noktaları
export function solve(p, b) {
  const ln = p.lean * D2R;
  const ux = Math.sin(ln);
  const uy = Math.cos(ln);
  const hip = [p.hx, p.hy];
  const chest = [hip[0] + ux * b.sp, hip[1] + uy * b.sp];
  const neck = [chest[0] + ux * b.nk, chest[1] + uy * b.nk];
  const shF = [chest[0] + 1, chest[1] - 1.5];
  const shB = [chest[0] - 2, chest[1] - 0.5];
  const hipF = [hip[0] + 1.5, hip[1]];
  const hipB = [hip[0] - 2, hip[1]];
  const [elF, haF] = ik(shF, [chest[0] + p.hf[0], chest[1] + p.hf[1]], b.ua, b.fa, [-0.3, -1]);
  const [elB, haB] = ik(shB, [chest[0] + p.hb[0], chest[1] + p.hb[1]], b.ua, b.fa, [-0.3, -1]);
  const [knF, anF] = ik(hipF, p.ff, b.th, b.sh, [1, 0.25]);
  const [knB, anB] = ik(hipB, p.fb, b.th, b.sh, [1, 0.25]);
  const toeF = [anF[0] + b.foot, anF[1] - 1.2];
  const toeB = [anB[0] + b.foot, anB[1] - 1.2];
  const beltC = [hip[0] + ux * 3, hip[1] + uy * 3];
  const beltA = [beltC[0] - uy * 6, beltC[1] + ux * 6];
  const beltZ = [beltC[0] + uy * 6, beltC[1] - ux * 6];
  const sk = { hip, chest, neck, shF, shB, hipF, hipB, elF, haF, elB, haB, knF, anF, knB, anB, toeF, toeB, beltC, beltA, beltZ };
  if (p.rot) {
    const a = p.rot * D2R;
    const c = Math.cos(a);
    const s = Math.sin(a);
    for (const k in sk) {
      if (k === 'hip') continue;
      const q = sk[k];
      const x = q[0] - hip[0];
      const y = q[1] - hip[1];
      sk[k] = [hip[0] + x * c - y * s, hip[1] + x * s + y * c];
    }
  }
  return sk;
}

// Yerel noktayı dünya/ekran koordinatına çevirir
export function toWorld(sk, ox, oy, face, S) {
  const o = {};
  for (const k in sk) o[k] = [ox + face * sk[k][0] * S, oy - sk[k][1] * S];
  return o;
}

// ---- Kapsül tarayıcı ----
// pass 0: dış çizgi, pass 1: tonlu dolgu
function capPass(ctx, s, pass, dither) {
  const [x0, y0] = s.a;
  const [x1, y1] = s.b;
  const r0 = s.r0;
  const r1 = s.r1;
  const t = s.t;
  const rm = Math.max(r0, r1) + 2;
  const minX = Math.floor(Math.min(x0, x1) - rm);
  const maxX = Math.ceil(Math.max(x0, x1) + rm);
  const minY = Math.floor(Math.min(y0, y1) - rm);
  const maxY = Math.ceil(Math.max(y0, y1) + rm);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const L2 = dx * dx + dy * dy || 1e-6;
  for (let py = minY; py <= maxY; py++) {
    let runC = null;
    let runX = 0;
    for (let px = minX; px <= maxX + 1; px++) {
      let col = null;
      if (px <= maxX) {
        const cx = px + 0.5 - x0;
        const cy = py + 0.5 - y0;
        let u = (cx * dx + cy * dy) / L2;
        u = u < 0 ? 0 : u > 1 ? 1 : u;
        const ex = cx - u * dx;
        const ey = cy - u * dy;
        const d2 = ex * ex + ey * ey;
        const r = r0 + (r1 - r0) * u;
        if (pass === 0) {
          if (d2 <= (r + 1) * (r + 1)) col = t.o;
        } else if (d2 <= r * r) {
          const sh = d2 < 0.01 ? 0 : (ex * LX + ey * LY) / r;
          if (dither) {
            const th = ((px + py) & 1) ? 0.08 : -0.08;
            col = sh > 0.62 + th && t.h ? t.h : sh > 0.3 + th ? t.l : sh < -0.55 + th && t.x ? t.x : sh < -0.22 + th ? t.d : t.m;
          } else {
            col = sh > 0.4 ? t.l : sh < -0.3 ? t.d : t.m;
          }
        }
      }
      if (col !== runC) {
        if (runC) { ctx.fillStyle = runC; ctx.fillRect(runX, py, px - runX, 1); }
        runC = col;
        runX = px;
      }
    }
  }
}

export function drawGroup(ctx, segs, dither = false) {
  for (const s of segs) capPass(ctx, s, 0, dither);
  for (const s of segs) capPass(ctx, s, 1, dither);
}

export const seg = (a, b, r0, r1, t) => ({ a, b, r0, r1, t });

// Pikselli çizgi (lapel, kemer ucu, bant kuyruğu için)
export function pline(ctx, x0, y0, x1, y1, color) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = color;
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

// Kafa sprite'ı: normal, aynalı, beyaz (vuruş parlaması) ve özel paletli sürümler
export function headSet(rows, pal, extra = {}) {
  const flip = rows.map((r) => [...r].reverse().join(''));
  const white = {};
  for (const k in pal) white[k] = '#ffffff';
  const out = {
    r: makeSprite(rows, pal), l: makeSprite(flip, pal),
    wr: makeSprite(rows, white), wl: makeSprite(flip, white),
    w: rows[0].length, h: rows.length, rows, flip, pal,
  };
  for (const [name, p2] of Object.entries(extra)) {
    out[name] = { r: makeSprite(rows, p2), l: makeSprite(flip, p2) };
  }
  return out;
}
