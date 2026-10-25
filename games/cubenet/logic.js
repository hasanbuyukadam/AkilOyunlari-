// Küp Açılımları mantığı — hem tarayıcıda hem Node'da çalışır (DOM yok).
//
// Koordinatlar: yön indeksleri 0..5 = +X, -X, +Y, -Y, +Z, -Z.
// Bir küp, 6 elemanlı bir dizidir: cube[yön] = [sembol, yukarıYönü]
//   (yüzün dış normali "yön"dür; "yukarıYönü" o yüzdeki şeklin tepesinin baktığı 3B yöndür).
// Açılım (net): { c: [[satır, sütun] × 6], f: [[sembol, dönüş] × 6] }
//   dönüş = şeklin açılımdaki saat yönünde çeyrek dönüş sayısı (0..3).
// Görünüm (view): izometrik küp resminde görünen 3 yüz [üst(+Z), sol(+X), sağ(+Y)],
//   her biri [sembol, yukarıYönü].
//
// Soru tipleri:
//   isnet   — 4 altılı şekil; yalnızca biri küp açılımı.
//   opp     — açılımda vurgulu yüzün karşısındaki yüz.
//   fold    — açılım katlanınca hangi küp (görünüm) oluşur.
//   unfold  — verilen küp hangi açılımdan katlanmış olabilir.
//   twoview — aynı küpün iki görünümünden bir yüzün karşısını bulma.
//
// Ana katlama modeli (A): açılım ağacında her kareye bir 3B çerçeve (normal, yukarı, sağ)
// taşınır. Bağımsız doğrulama modeli (B): kareler gerçek 3B köşe noktalarıyla, menteşe
// kenarları etrafında 90° döndürülerek fiziksel olarak katlanır. verifyLevel yalnızca B'yi
// ve kaba kuvvet aramalarını kullanır.

// ------------------------------------------------------------------ Semboller
export const SYMBOLS = {
  circle: { name: 'kırmızı daire', kind: 'full', color: '#e5483b' },
  square: { name: 'mavi kare', kind: 'full', color: '#2f7de1' },
  plus: { name: 'yeşil artı', kind: 'full', color: '#1f9d55' },
  cross: { name: 'turuncu çarpı', kind: 'full', color: '#f08c00' },
  ring: { name: 'mor halka', kind: 'full', color: '#8b5cf6' },
  dots: { name: 'turkuaz noktalar', kind: 'full', color: '#0e9f9e' },
  arrow: { name: 'pembe ok', kind: 'one', color: '#e0457b', tip: 'Pembe okun ucu' },
  tri: { name: 'sarı üçgen', kind: 'one', color: '#d9a400', tip: 'Sarı üçgenin sivri ucu' },
  F: { name: 'F harfi', kind: 'one', color: '#1d4ed8', tip: 'F harfinin tepesi' },
  L: { name: 'L harfi', kind: 'one', color: '#be123c', tip: 'L harfinin tepesi' },
  flag: { name: 'bayrak', kind: 'one', color: '#15803d', tip: 'Bayrağın tepesi' },
  half: { name: 'yarısı boyalı kare', kind: 'one', color: '#7c3aed', tip: 'Karenin boyalı yarısı' },
};
const FULL = ['circle', 'square', 'plus', 'cross', 'ring', 'dots'];
const ONE = ['arrow', 'tri', 'F', 'L', 'flag', 'half'];
export const symName = (s) => SYMBOLS[s].name;
const cap = (s) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
const LETTERS = ['A', 'B', 'C', 'D'];

// ------------------------------------------------------------------ Vektörler, dönmeler
export const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const dirOf = (v) => DIRS.findIndex((d) => d[0] === v[0] && d[1] === v[1] && d[2] === v[2]);
const opp = (d) => d ^ 1;
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const unit = (v) => { const m = Math.max(Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])); return m ? v.map((x) => Math.sign(x)) : v; };
export const VIS = [4, 0, 2]; // görünen yüzler: üst, sol, sağ

// 24 dönme matrisi (determinantı +1 olan işaretli permütasyon matrisleri), yön tablosu olarak.
export const ROTS = (() => {
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const parity = [1, -1, -1, 1, 1, -1];
  const out = [];
  perms.forEach((p, pi) => {
    for (let s = 0; s < 8; s++) {
      const sg = [s & 1 ? -1 : 1, s & 2 ? -1 : 1, s & 4 ? -1 : 1];
      if (parity[pi] * sg[0] * sg[1] * sg[2] !== 1) continue;
      // satır i: çıktı[i] = sg[i] * girdi[p[i]]
      out.push(DIRS.map((v) => dirOf([sg[0] * v[p[0]], sg[1] * v[p[1]], sg[2] * v[p[2]]])));
    }
  });
  return out;
})();

// ------------------------------------------------------------------ Küp yardımcıları
const isFull = (s) => SYMBOLS[s].kind === 'full';
const faceKey = (e) => (isFull(e[0]) ? e[0] : `${e[0]}:${e[1]}`);
const sameFace = (a, b) => a[0] === b[0] && (isFull(a[0]) || a[1] === b[1]);
export const rotateCube = (g, cube) => {
  const out = new Array(6);
  cube.forEach((e, d) => { out[ROTS[g][d]] = [e[0], ROTS[g][e[1]]]; });
  return out;
};
export function cubeKey(cube) {
  let best = null;
  for (let g = 0; g < 24; g++) {
    const k = rotateCube(g, cube).map(faceKey).join('|');
    if (best === null || k < best) best = k;
  }
  return best;
}
export const viewOf = (cube) => VIS.map((d) => cube[d].slice());
export function viewConsistent(cube, view) {
  for (let g = 0; g < 24; g++) {
    const r = rotateCube(g, cube);
    if (VIS.every((d, i) => sameFace(r[d], view[i]))) return true;
  }
  return false;
}
const VIS_ROTS = ROTS.map((_, g) => g).filter((g) => VIS.every((d) => VIS.includes(ROTS[g][d])));
export function viewKey(view) {
  let best = null;
  for (const g of VIS_ROTS) {
    const part = [];
    VIS.forEach((d, i) => { part[VIS.indexOf(ROTS[g][d])] = [view[i][0], ROTS[g][view[i][1]]]; });
    const k = part.map(faceKey).join('|');
    if (best === null || k < best) best = k;
  }
  return best;
}
// Ayna görüntüsü: X ve Y eksenlerini değiştir (sol ↔ sağ).
const SWAPXY = [2, 3, 0, 1, 4, 5];
const mirrorView = (v) => [[v[0][0], SWAPXY[v[0][1]]], [v[2][0], SWAPXY[v[2][1]]], [v[1][0], SWAPXY[v[1][1]]]];
const mirrorCube = (c) => { const o = new Array(6); c.forEach((e, d) => { o[SWAPXY[d]] = [e[0], SWAPXY[e[1]]]; }); return o; };
const posOf = (cube, s) => cube.findIndex((e) => e[0] === s);

// ------------------------------------------------------------------ Model A: çerçeve taşıma
export function foldFrames(cells) {
  const idx = new Map(cells.map(([r, c], i) => [`${r},${c}`, i]));
  const fr = new Array(cells.length).fill(null);
  const parent = new Array(cells.length).fill(-1);
  fr[0] = { n: 4, u: 2, r: 0 };
  const queue = [0];
  while (queue.length) {
    const i = queue.shift();
    const { n, u, r } = fr[i];
    for (const [dr, dc] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
      const j = idx.get(`${cells[i][0] + dr},${cells[i][1] + dc}`);
      if (j === undefined || fr[j]) continue;
      let f;
      if (dc === 1) f = { n: r, u, r: opp(n) };
      else if (dc === -1) f = { n: opp(r), u, r: n };
      else if (dr === -1) f = { n: u, u: opp(n), r };
      else f = { n: opp(u), u: n, r };
      fr[j] = f;
      parent[j] = i;
      queue.push(j);
    }
  }
  if (!fr.every(Boolean)) return null;
  return fr.map((f, i) => ({ ...f, parent: parent[i] }));
}
export function isNetA(cells) {
  const fr = cells.length === 6 && foldFrames(cells);
  return Boolean(fr) && new Set(fr.map((f) => f.n)).size === 6;
}
export function cubeFromNetA(net) {
  const fr = foldFrames(net.c);
  if (!fr || new Set(fr.map((f) => f.n)).size !== 6) return null;
  const cube = new Array(6);
  fr.forEach((f, i) => {
    const [s, rot] = net.f[i];
    cube[f.n] = [s, [f.u, f.r, opp(f.u), opp(f.r)][rot]];
  });
  return cube;
}
// Küpü verilen açılım şekline sar (A modeliyle): her karenin içeriği ve dönüşü.
function netFromCube(cells, cube) {
  const fr = foldFrames(cells);
  return {
    c: cells,
    f: fr.map((f) => {
      const [s, up] = cube[f.n];
      return [s, isFull(s) ? 0 : [f.u, f.r, opp(f.u), opp(f.r)].indexOf(up)];
    }),
  };
}

// ------------------------------------------------------------------ Model B: fiziksel katlama
// Kareler 2 birimlik; köşe noktaları gerçekten menteşe etrafında döndürülür.
function rot90(v, p, k, sgn) {
  // v noktasını p'den geçen, k (birim eksen) doğrultusundaki doğru etrafında sgn·90° döndür.
  const w = sub(v, p);
  const par = scale(k, dot(k, w));
  const kx = cross(k, w);
  return add(p, add(par, scale(kx, sgn)));
}
export function foldB(cells) {
  if (cells.length !== 6) return null;
  const pts = cells.map(([r, c]) => ({
    tl: [2 * c, -2 * r, 0], tr: [2 * c + 2, -2 * r, 0], br: [2 * c + 2, -2 * r - 2, 0], bl: [2 * c, -2 * r - 2, 0],
    ce: [2 * c + 1, -2 * r - 1, 0], top: [2 * c + 1, -2 * r, 0],
  }));
  const key = (r, c) => `${r},${c}`;
  const idx = new Map(cells.map(([r, c], i) => [key(r, c), i]));
  // DFS ağacı (B için farklı ağaç: derinlik öncelikli, ters komşu sırası)
  const children = cells.map(() => []);
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length) {
    const i = stack.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) {
      const j = idx.get(key(cells[i][0] + dr, cells[i][1] + dc));
      if (j === undefined || seen.has(j)) continue;
      seen.add(j);
      children[i].push(j);
      stack.push(j);
    }
  }
  if (seen.size !== 6) return null;
  const subtree = (i) => [i, ...children[i].flatMap(subtree)];
  const normal = (P) => unit(cross(sub(P.bl, P.tl), sub(P.tr, P.tl)));
  const corners = (P) => [P.tl, P.tr, P.br, P.bl];
  const eq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
  const fold = (i) => {
    for (const j of children[i]) {
      const shared = corners(pts[i]).filter((a) => corners(pts[j]).some((b) => eq(a, b)));
      if (shared.length !== 2) return false;
      const [p, q] = shared;
      const k = unit(sub(q, p));
      const n = normal(pts[i]);
      const ids = subtree(j);
      const moved = [1, -1].map((sgn) => ids.map((t) => Object.fromEntries(Object.entries(pts[t]).map(([nm, v]) => [nm, rot90(v, p, k, sgn)]))));
      // Kâğıt, kökün dışından bakan kişiden uzağa (küpün içine) katlanır.
      const pick = moved.find((m) => dot(sub(m[0].ce, p), n) < 0);
      ids.forEach((t, x) => { pts[t] = pick[x]; });
      if (!fold(j)) return false;
    }
    return true;
  };
  if (!fold(0)) return null;
  return pts.map((P) => ({ n: normal(P), ce: P.ce, up: unit(sub(P.top, P.ce)) }));
}
export function isNetB(cells) {
  const f = foldB(cells);
  if (!f) return false;
  const centre = sub(f[0].ce, f[0].n);
  return new Set(f.map((x) => dirOf(x.n))).size === 6 && f.every((x) => eq3(sub(x.ce, x.n), centre));
}
const eq3 = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
export function cubeFromNetB(net) {
  if (!isNetB(net.c)) return null;
  const f = foldB(net.c);
  const cube = new Array(6);
  f.forEach((x, i) => {
    const [s, rot] = net.f[i];
    const right = cross(x.up, x.n);
    const ups = [x.up, right, scale(x.up, -1), scale(right, -1)];
    cube[dirOf(x.n)] = [s, dirOf(ups[rot])];
  });
  return cube;
}

// ------------------------------------------------------------------ Altılılar
const TRANSFORMS = [
  ([r, c]) => [r, c], ([r, c]) => [c, -r], ([r, c]) => [-r, -c], ([r, c]) => [-c, r],
  ([r, c]) => [r, -c], ([r, c]) => [-c, -r], ([r, c]) => [-r, c], ([r, c]) => [c, r],
];
export function normalize(cells) {
  const mr = Math.min(...cells.map((x) => x[0])), mc = Math.min(...cells.map((x) => x[1]));
  return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
const shapeStr = (cells) => normalize(cells).map((x) => x.join(',')).join(' ');
export const freeKey = (cells) => TRANSFORMS.map((t) => shapeStr(cells.map(t))).sort()[0];

const HEXOMINOES = (() => {
  let cur = new Map([['0,0', [[0, 0]]]]);
  for (let k = 1; k < 6; k++) {
    const next = new Map();
    for (const cells of cur.values()) {
      const has = new Set(cells.map((x) => x.join(',')));
      for (const [r, c] of cells) {
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          if (has.has(`${r + dr},${c + dc}`)) continue;
          const n = normalize([...cells, [r + dr, c + dc]]);
          next.set(shapeStr(n), n);
        }
      }
    }
    cur = next;
  }
  const free = new Map();
  for (const cells of cur.values()) free.set(freeKey(cells), normalize(cells));
  return [...free.values()];
})();
const maxLine = (cells) => {
  const has = new Set(cells.map((x) => x.join(',')));
  let best = 0;
  for (const [r, c] of cells) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      let k = 0;
      while (has.has(`${r + dr * k},${c + dc * k}`)) k++;
      best = Math.max(best, k);
    }
  }
  return best;
};
const hasBlock = (cells) => {
  const has = new Set(cells.map((x) => x.join(',')));
  return cells.some(([r, c]) => has.has(`${r},${c + 1}`) && has.has(`${r + 1},${c}`) && has.has(`${r + 1},${c + 1}`));
};
export const NETS = HEXOMINOES.filter(isNetA);
const NETS141 = NETS.filter((c) => maxLine(c) === 4);
const NETS_OTHER = NETS.filter((c) => maxLine(c) < 4);
const NONNETS = HEXOMINOES.filter((c) => !isNetA(c));
const OBVIOUS = NONNETS.filter((c) => hasBlock(c) || maxLine(c) >= 5);
const TRICKY = NONNETS.filter((c) => !hasBlock(c) && maxLine(c) < 5);

function nonNetReason(cells) {
  if (hasBlock(cells)) return '2×2’lik bir kare bloğu var; bu dört kare bir köşede düz kalır, katlanamaz.';
  if (maxLine(cells) >= 5) return `${maxLine(cells)} kare yan yana; katlayınca 1. ve 5. kare aynı yüze gelip üst üste biner.`;
  return 'katlayınca iki kare aynı yüze gelip üst üste biner, bir yüz de açıkta kalır.';
}

// ------------------------------------------------------------------ Rastgele yardımcılar
const pick = (rng, arr) => arr[rng.int(0, arr.length - 1)];
const place = (rng, cells) => normalize(cells.map(pick(rng, TRANSFORMS)));
const randomPerp = (rng, d) => pick(rng, [0, 1, 2, 3, 4, 5].filter((x) => x !== d && x !== opp(d)));

function randomCube(rng, syms) {
  const order = rng.shuffle(syms.slice());
  return order.map((s, d) => [s, randomPerp(rng, d)]);
}
function netAdj(cells) {
  const idx = new Map(cells.map(([r, c], i) => [`${r},${c}`, i]));
  return cells.map(([r, c]) => [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([dr, dc]) => idx.get(`${r + dr},${c + dc}`)).filter((j) => j !== undefined));
}

// ------------------------------------------------------------------ Açıklamalar
const oppPairsText = (cube) => [0, 2, 4].map((d) => `${symName(cube[d][0])} – ${symName(cube[opp(d)][0])}`).join(', ');
function tipText(cube, s) {
  const d = posOf(cube, s);
  return `${SYMBOLS[s].tip}, ${symName(cube[cube[d][1]][0])} tarafını gösterir.`;
}
// Bir görünüm küple neden uyuşmuyor? (açıklama için)
function mismatch(cube, view) {
  for (let i = 0; i < 3; i++) {
    for (let j = i + 1; j < 3; j++) {
      if (posOf(cube, view[i][0]) === opp(posOf(cube, view[j][0]))) return { type: 'opp', a: view[i][0], b: view[j][0] };
    }
  }
  let bestRot = null;
  for (let g = 0; g < 24; g++) {
    const r = rotateCube(g, cube);
    if (!VIS.every((d, i) => r[d][0] === view[i][0])) continue;
    const bad = VIS.map((d, i) => i).filter((i) => !sameFace(r[VIS[i]], view[i]));
    if (bad.length && (!bestRot || bad.length < bestRot.length)) bestRot = bad;
  }
  if (bestRot) return { type: 'rot', s: view[bestRot[0]][0] };
  return { type: 'mirror' };
}

// ------------------------------------------------------------------ Soru üreticileri
function qIsNet(rng, hard) {
  const correct = place(rng, pick(rng, hard ? NETS : NETS141));
  const used = new Set([freeKey(correct)]);
  const wrong = [];
  const pools = hard ? [TRICKY, TRICKY, OBVIOUS] : [OBVIOUS, OBVIOUS, TRICKY];
  for (const pool of pools) {
    let s;
    do s = pick(rng, pool); while (used.has(freeKey(s)));
    used.add(freeKey(s));
    wrong.push(place(rng, s));
  }
  const opts = rng.shuffle([correct, ...wrong]);
  const a = opts.indexOf(correct);
  const why = opts.map((o, i) => (i === a ? null : `${LETTERS[i]}: ${cap(nonNetReason(o))}`)).filter(Boolean);
  return {
    q: { t: 'isnet', opts },
    a,
    ex: `Doğru cevap ${LETTERS[a]}! Bu açılım katlanınca 6 kare küpün 6 yüzüne tam oturur, hiçbiri üst üste binmez. ${why.join(' ')}`,
    hint: 'Bir küpün 6 yüzü var. 2×2’lik kare bloğu olan ya da 5–6 karesi yan yana dizilen şekiller küp olmaz. Kalanları kafanda katla: hiçbir kare üst üste binmemeli.',
  };
}

function makeNet(rng, pool, syms, oriented) {
  const cells = place(rng, pick(rng, pool));
  const order = rng.shuffle(syms.slice());
  return { c: cells, f: order.map((s) => [s, oriented && !isFull(s) ? rng.int(0, 3) : 0]) };
}

function qOpp(rng, pool) {
  const net = makeNet(rng, pool, rng.shuffle(FULL.slice()), false);
  const fr = foldFrames(net.c);
  const hl = rng.int(0, 5);
  const target = fr.findIndex((f) => f.n === opp(fr[hl].n));
  const adj = netAdj(net.c)[hl];
  const others = [0, 1, 2, 3, 4, 5].filter((i) => i !== hl && i !== target);
  // Çeldiriciler: önce açılımda vurgulu yüze değen kareler (en sık yapılan hata)
  const near = rng.shuffle(others.filter((i) => adj.includes(i)));
  const far = rng.shuffle(others.filter((i) => !adj.includes(i)));
  const wrong = [...far.slice(0, 1), ...near, ...far.slice(1)].slice(0, 3);
  const opts = rng.shuffle([target, ...wrong]);
  const a = opts.indexOf(target);
  const X = symName(net.f[hl][0]), Y = symName(net.f[target][0]);
  const nb = others.map((i) => symName(net.f[i][0]));
  const [r1, c1] = net.c[hl], [r2, c2] = net.c[target];
  const inLine = (r1 === r2 && Math.abs(c1 - c2) === 2) || (c1 === c2 && Math.abs(r1 - r2) === 2);
  const line = inLine ? `Karşılıklı yüzler açılımda yan yana gelmez, aralarında bir kare olur: ${X} ile ${Y} aynı sırada ve aralarında tek bir kare var. ` : 'Karşılıklı yüzler açılımda yan yana gelmez. ';
  return {
    q: { t: 'opp', net, hl, opts },
    a,
    ex: `${line}Katlayınca ${X} yüzüne değen 4 yüz: ${nb.join(', ')}. Geriye kalan ${Y} tam karşıya gelir.`,
    hint: `Karşılıklı yüzler açılımda yan yana gelmez, aralarında bir kare olur. Parlayan yüze değen kareler onun karşısına gelemez.`,
  };
}

function viewText(view) {
  return `üstte ${symName(view[0][0])}, solda ${symName(view[1][0])}, sağda ${symName(view[2][0])}`;
}

// Görünüm çeldiricileri: tür etiketleriyle aday listesi
function viewDistractors(rng, cube, view) {
  const c = [];
  const vs = view.map((x) => x[0]);
  for (let p = 0; p < 3; p++) {
    for (let q = 0; q < 3; q++) {
      if (p === q) continue;
      const s = cube[opp(posOf(cube, vs[q]))][0];
      if (vs.includes(s)) continue;
      const v = view.map((x) => x.slice());
      v[p] = [s, isFull(s) ? view[p][1] : randomPerp(rng, VIS[p])];
      c.push({ tag: 'opp', v });
    }
  }
  c.push({ tag: 'mirror', v: mirrorView(view) });
  for (let p = 0; p < 3; p++) {
    for (let q = p + 1; q < 3; q++) {
      const v = view.map((x) => x.slice());
      v[p] = [view[q][0], view[p][1]];
      v[q] = [view[p][0], view[q][1]];
      c.push({ tag: 'swap', v });
    }
  }
  for (let p = 0; p < 3; p++) {
    if (isFull(view[p][0])) continue;
    for (const d of [0, 1, 2, 3, 4, 5]) {
      if (d === VIS[p] || d === opp(VIS[p]) || d === view[p][1]) continue;
      const v = view.map((x) => x.slice());
      v[p] = [view[p][0], d];
      c.push({ tag: 'rot', v });
      // dönmüş + ayna karışımı
      c.push({ tag: 'mixrot', v: mirrorView(v) });
    }
  }
  return rng.shuffle(c);
}

function chooseOptions(rng, correctKey, cands, prefs, consistent, keyOf) {
  const used = new Set([correctKey]);
  const out = [];
  for (const tag of prefs) {
    const cand = cands.find((x) => (tag === '*' || x.tag === tag) && !x.taken && !consistent(x.v) && !used.has(keyOf(x.v)));
    if (!cand) continue;
    cand.taken = true;
    used.add(keyOf(cand.v));
    out.push(cand);
    if (out.length === 3) break;
  }
  for (const cand of cands) {
    if (out.length === 3) break;
    if (cand.taken || consistent(cand.v) || used.has(keyOf(cand.v))) continue;
    cand.taken = true;
    used.add(keyOf(cand.v));
    out.push(cand);
  }
  return out.length === 3 ? out : null;
}

function reasonText(m, letter, mode) {
  if (m.type === 'opp') {
    const A = symName(m.a), B = symName(m.b);
    return mode === 'net'
      ? `${letter} açılımında ${A} ile ${B} karşılıklı; ama küpte yan yana görünüyorlar.`
      : `${letter} küpünde ${A} ile ${B} yan yana, ama bunlar karşılıklı yüzler; aynı anda görünemezler.`;
  }
  if (m.type === 'rot') return `${letter} ${mode === 'net' ? 'açılımında' : 'küpünde'} ${symName(m.s)} yanlış yöne dönmüş.`;
  return mode === 'net'
    ? `${letter} açılımı katlanınca bu üç yüz ters sırayla dizilir (ayna görüntüsü).`
    : `${letter} küpünde yüzler doğru ama sıraları ters (ayna görüntüsü).`;
}

function qFold(rng, { pool, oriented = 0, prefs }) {
  for (let tries = 0; tries < 200; tries++) {
    const syms = [...rng.shuffle(ONE.slice()).slice(0, oriented), ...rng.shuffle(FULL.slice()).slice(0, 6 - oriented)];
    const net = makeNet(rng, pool, syms, oriented > 0);
    const cube = cubeFromNetA(net);
    // Zor sorularda en az bir yönlü şekil görünsün
    const gs = rng.shuffle(ROTS.map((_, g) => g));
    const need = Math.min(oriented, oriented >= 3 ? 2 : 1);
    const g = gs.find((x) => viewOf(rotateCube(x, cube)).filter((e) => !isFull(e[0])).length >= need);
    if (g === undefined) continue;
    const view = viewOf(rotateCube(g, cube));
    const cands = viewDistractors(rng, cube, view);
    const wrong = chooseOptions(rng, viewKey(view), cands, prefs, (v) => viewConsistent(cube, v), viewKey);
    if (!wrong) continue;
    const opts = rng.shuffle([view, ...wrong.map((x) => x.v)]);
    const a = opts.indexOf(view);
    const why = opts.map((v, i) => (i === a ? null : reasonText(mismatch(cube, v), LETTERS[i], 'cube'))).filter(Boolean);
    const orientedVisible = view.filter((e) => !isFull(e[0])).map((e) => e[0]);
    const tips = orientedVisible.map((s) => tipText(cube, s));
    const pair = pick(rng, [0, 2, 4]);
    return {
      q: { t: 'fold', net, opts },
      a,
      ex: `Doğru cevap ${LETTERS[a]}! Karşılıklı yüzler açılımda yan yana gelmez, aralarında bir kare olur. Bu açılımda karşılıklı yüzler: ${oppPairsText(cube)}. Karşılıklı iki yüz küpte aynı anda görünmez. ${tips.join(' ')} ${why.join(' ')}`.replace(/\s+/g, ' ').trim(),
      hint: `Önce karşılıklı yüzleri bul. Örneğin ${symName(cube[pair][0])} ile ${symName(cube[opp(pair)][0])} karşılıklı: küpte bu ikisi asla aynı anda görünmez.${orientedVisible.length ? ' Yönlü şekillerde, şeklin tepesinin hangi yüze baktığını açılımda kontrol et.' : ''}`,
    };
  }
  throw new Error('fold sorusu üretilemedi');
}

function qUnfold(rng, { oriented = 0, prefs }) {
  for (let tries = 0; tries < 300; tries++) {
    const syms = [...rng.shuffle(ONE.slice()).slice(0, oriented), ...rng.shuffle(FULL.slice()).slice(0, 6 - oriented)];
    const cube = randomCube(rng, syms);
    const gs = rng.shuffle(ROTS.map((_, g) => g));
    const need = oriented ? Math.min(2, oriented) : 0;
    const g = gs.find((x) => viewOf(rotateCube(x, cube)).filter((e) => !isFull(e[0])).length >= need);
    if (g === undefined) continue;
    const view = viewOf(rotateCube(g, cube));
    // Aday küpler (yanlış): görünür yüzlerle ilgili değişiklikler
    const cands = [];
    const vis = view.map((e) => posOf(cube, e[0]));
    for (const p of vis) {
      for (let q = 0; q < 6; q++) {
        if (q === p) continue;
        const c = cube.map((e) => e.slice());
        c[p] = [cube[q][0], isFull(cube[q][0]) ? cube[p][1] : randomPerp(rng, p)];
        c[q] = [cube[p][0], isFull(cube[p][0]) ? cube[q][1] : randomPerp(rng, q)];
        cands.push({ tag: q === opp(p) ? 'swapopp' : 'swap', v: c });
      }
      if (!isFull(cube[p][0])) {
        for (const d of [0, 1, 2, 3, 4, 5]) {
          if (d === p || d === opp(p) || d === cube[p][1]) continue;
          const c = cube.map((e) => e.slice());
          c[p] = [cube[p][0], d];
          cands.push({ tag: 'rot', v: c });
        }
      }
    }
    cands.push({ tag: 'mirror', v: mirrorCube(cube) });
    rng.shuffle(cands);
    const wrong = chooseOptions(rng, cubeKey(cube), cands, prefs, (c) => viewConsistent(c, view), cubeKey);
    if (!wrong) continue;
    // Her seçenek farklı bir açılım şekli üzerine sarılır.
    const shapes = rng.shuffle(NETS.slice()).slice(0, 4);
    const cubes = [cube, ...wrong.map((x) => x.v)];
    const nets = cubes.map((c, i) => netFromCube(place(rng, shapes[i]), rotateCube(rng.int(0, 23), c)));
    const order = rng.shuffle([0, 1, 2, 3]);
    const opts = order.map((i) => nets[i]);
    const a = order.indexOf(0);
    const why = order.map((i, k) => (i === 0 ? null : reasonText(mismatch(cubes[i], view), LETTERS[k], 'net'))).filter(Boolean);
    const tips = view.filter((e) => !isFull(e[0])).map((e) => tipText(cube, e[0]));
    return {
      q: { t: 'unfold', view, opts },
      a,
      ex: `Doğru cevap ${LETTERS[a]}! Küpte ${viewText(view)} var. Bu üç yüz birbirine komşu olmalı, yani açılımda hiçbiri diğerinin karşısına gelmemeli. ${tips.join(' ')} ${why.join(' ')}`.replace(/\s+/g, ' ').trim(),
      hint: `Küpte yan yana görünen yüzler açılımda karşılıklı olamaz (aralarında bir kare olacak şekilde dizilemez). Her açılımda ${symName(view[0][0])} yüzünün karşısına hangi yüzün geldiğini bul.${oriented ? ' Sonra yönlü şekillerin tepesinin hangi yüze baktığını kontrol et.' : ''}`,
    };
  }
  throw new Error('unfold sorusu üretilemedi');
}

// Kaba kuvvet: iki görünüme uyan tüm küplerde x'in karşısındaki semboller
export function twoViewOpposites(syms, views, x) {
  const res = new Set();
  const perm = (arr, k) => {
    if (k === arr.length) {
      const cube = arr.map((s, d) => [s, d < 4 ? 4 : 0]);
      if (views.every((v) => viewConsistent(cube, v))) res.add(cube[opp(cube.findIndex((e) => e[0] === x))][0]);
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      perm(arr, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  };
  perm(syms.slice(), 0);
  return res;
}

function qTwoView(rng, sameSpot) {
  for (let tries = 0; tries < 300; tries++) {
    const cube = randomCube(rng, rng.shuffle(FULL.slice()));
    const g1 = rng.int(0, 23), g2 = rng.int(0, 23);
    const v1 = viewOf(rotateCube(g1, cube)), v2 = viewOf(rotateCube(g2, cube));
    const common = v1.map((e) => e[0]).filter((s) => v2.some((e) => e[0] === s));
    if (common.length !== 1) continue;
    const x = common[0];
    const i1 = v1.findIndex((e) => e[0] === x), i2 = v2.findIndex((e) => e[0] === x);
    if (sameSpot !== (i1 === i2)) continue;
    const res = twoViewOpposites(FULL, [v1, v2], x);
    if (res.size !== 1) continue;
    const y = [...res][0];
    const shown = [...v1, ...v2].map((e) => e[0]).filter((s) => s !== x);
    const wrong = rng.shuffle(shown.slice()).slice(0, 3);
    const opts = rng.shuffle([y, ...wrong]);
    const a = opts.indexOf(y);
    return {
      q: { t: 'twoview', views: [v1, v2], x, opts },
      a,
      ex: `Doğru cevap ${LETTERS[a]}! İki resimde de ${symName(x)} görünüyor. Yanında görünen şekiller onun 4 komşusu: ${shown.map(symName).join(', ')}. Karşıdaki yüz hiçbir zaman yanında görünmez; geriye kalan tek şekil ${symName(y)}, o yüzden ${symName(x)} ile karşılıklıdır.`,
      hint: `Bir yüzün 4 komşusu vardır ve karşısındaki yüz onun yanında hiçbir zaman görünmez. İki resimde ${symName(x)} yüzünün yanında görünen şekilleri say.`,
    };
  }
  throw new Error('twoview sorusu üretilemedi');
}

// ------------------------------------------------------------------ Level üretimi
const strip = ({ q }) => q;
// Kısa ve benzersiz parmak izi: soruların verisinden iki ayrı 32 bitlik özet.
function fingerprint(data) {
  const str = JSON.stringify(data);
  const h = (seed) => {
    let x = seed >>> 0;
    for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 16777619); }
    return (x >>> 0).toString(16).padStart(8, '0');
  };
  return `${h(2166136261)}${h(0x9e3779b9)}-${str.length}`;
}
export function generateLevel(rng, difficulty, index, total = 20) {
  const t = index / Math.max(1, total - 1);
  const qs = [];
  if (difficulty === 'easy') {
    const pool = index < 10 ? NETS141 : NETS;
    qs.push(qIsNet(rng, index >= 8));
    qs.push(qOpp(rng, pool));
    if (index < 6) qs.push(qOpp(rng, pool));
    else if (index < 14) qs.push(qIsNet(rng, index >= 10));
    else qs.push(qFold(rng, { pool: NETS141, prefs: ['opp', 'opp', 'opp'] }));
  } else if (difficulty === 'medium') {
    const early = index < 10;
    qs.push(qFold(rng, { pool: early ? NETS141 : NETS, prefs: ['opp', 'opp', 'opp'] }));
    qs.push(qOpp(rng, NETS_OTHER));
    qs.push(qFold(rng, { pool: NETS, prefs: index < 6 ? ['opp', 'opp', 'opp'] : ['opp', 'opp', 'mirror'] }));
    if (index < 8) qs.push(qFold(rng, { pool: NETS, prefs: ['opp', 'mirror', 'opp'] }));
    else qs.push(qUnfold(rng, { oriented: 0, prefs: index < 14 ? ['swap', 'swap', 'swap'] : ['swap', 'swapopp', 'mirror'] }));
  } else {
    const k = 2 + Math.round(t * 2); // 2..4 yönlü şekil
    qs.push(qFold(rng, { pool: NETS, oriented: k, prefs: ['opp', 'rot', 'mirror'] }));
    qs.push(qFold(rng, { pool: NETS, oriented: k, prefs: index < 10 ? ['rot', 'opp', 'swap'] : ['rot', 'rot', 'mixrot'] }));
    qs.push(qUnfold(rng, { oriented: k, prefs: ['rot', 'swap', 'mirror'] }));
    qs.push(qTwoView(rng, index % 2 === 0));
    if (index < 10) qs.push(qFold(rng, { pool: NETS_OTHER, oriented: k, prefs: ['mixrot', 'rot', 'swap'] }));
    else qs.push(qUnfold(rng, { oriented: k, prefs: ['rot', 'rot', 'swapopp'] }));
  }
  const questions = qs.map((x) => ({ ...x.q, ex: x.ex, hint: x.hint }));
  return {
    difficulty,
    questions,
    solution: qs.map((x) => x.a),
    puzzle: fingerprint(qs.map(strip)),
  };
}

// ------------------------------------------------------------------ Doğrulama (bağımsız model B)
const dataOf = (q) => { const { ex, hint, ...rest } = q; void ex; void hint; return rest; };
const validSym = (s) => typeof s === 'string' && Object.hasOwn(SYMBOLS, s);
function checkView(v) {
  if (!Array.isArray(v) || v.length !== 3) return 'görünüm 3 yüz içermeli';
  for (let i = 0; i < 3; i++) {
    const [s, up] = v[i];
    if (!validSym(s)) return 'bilinmeyen sembol';
    if (!(up >= 0 && up < 6) || up === VIS[i] || up === opp(VIS[i])) return 'görünümde geçersiz yön';
  }
  if (new Set(v.map((e) => e[0])).size !== 3) return 'görünümde tekrar eden sembol';
  return null;
}
function checkNet(net) {
  if (!net || !Array.isArray(net.c) || net.c.length !== 6 || !Array.isArray(net.f) || net.f.length !== 6) return 'açılım biçimi hatalı';
  if (new Set(net.c.map((x) => x.join(','))).size !== 6) return 'açılımda üst üste kare';
  if (new Set(net.f.map((x) => x[0])).size !== 6 || !net.f.every(([s, r]) => validSym(s) && r >= 0 && r < 4)) return 'açılım yüzleri hatalı';
  return null;
}
function uniqueAnswer(flags, a) {
  const n = flags.filter(Boolean).length;
  if (n !== 1) return `${n} doğru seçenek var (tam 1 olmalı)`;
  if (!flags[a]) return 'kayıtlı cevap doğru seçenek değil';
  return null;
}

function verifyQuestion(q, a) {
  if (!Array.isArray(q.opts) || q.opts.length !== 4) return 'tam 4 seçenek olmalı';
  if (typeof q.ex !== 'string' || !q.ex || typeof q.hint !== 'string' || !q.hint) return 'açıklama/ipucu eksik';
  switch (q.t) {
    case 'isnet': {
      if (!q.opts.every((o) => Array.isArray(o) && o.length === 6 && new Set(o.map((x) => x.join(','))).size === 6)) return 'şekil 6 kare olmalı';
      if (new Set(q.opts.map(freeKey)).size !== 4) return 'şekiller birbirinin aynısı (döndürme/yansıtma)';
      return uniqueAnswer(q.opts.map(isNetB), a);
    }
    case 'opp': {
      const e = checkNet(q.net); if (e) return e;
      const f = foldB(q.net.c);
      if (!isNetB(q.net.c)) return 'açılım küp olmuyor';
      if (new Set(q.opts).size !== 4 || q.opts.some((i) => !(i >= 0 && i < 6) || i === q.hl)) return 'seçenekler hatalı';
      const target = dirOf(scale(f[q.hl].n, -1));
      return uniqueAnswer(q.opts.map((i) => dirOf(f[i].n) === target), a);
    }
    case 'fold': {
      const e = checkNet(q.net); if (e) return e;
      const cube = cubeFromNetB(q.net);
      if (!cube) return 'açılım küp olmuyor';
      for (const v of q.opts) { const ev = checkView(v); if (ev) return ev; if (!v.every((x) => q.net.f.some((y) => y[0] === x[0]))) return 'seçenekte açılımda olmayan sembol'; }
      if (new Set(q.opts.map(viewKey)).size !== 4) return 'iki seçenek aynı küp görünümü';
      return uniqueAnswer(q.opts.map((v) => viewConsistent(cube, v)), a);
    }
    case 'unfold': {
      const ev = checkView(q.view); if (ev) return ev;
      const cubes = [];
      for (const net of q.opts) {
        const e = checkNet(net); if (e) return e;
        const c = cubeFromNetB(net);
        if (!c) return 'seçenek açılımı küp olmuyor';
        cubes.push(c);
      }
      if (new Set(cubes.map(cubeKey)).size !== 4) return 'iki seçenek aynı küpü veriyor';
      return uniqueAnswer(cubes.map((c) => viewConsistent(c, q.view)), a);
    }
    case 'twoview': {
      for (const v of q.views) { const ev = checkView(v); if (ev) return ev; if (!v.every((x) => isFull(x[0]))) return 'iki görünüm sorusunda yönsüz semboller olmalı'; }
      const syms = [...new Set([...q.views.flat().map((x) => x[0]), ...q.opts, q.x])];
      if (!syms.every(validSym) || syms.length > 6) return 'sembol sayısı hatalı';
      const all = [...syms, ...FULL.filter((s) => !syms.includes(s))].slice(0, 6);
      if (new Set(q.opts).size !== 4 || q.opts.includes(q.x)) return 'seçenekler hatalı';
      const res = twoViewOpposites(all, q.views, q.x);
      if (res.size !== 1) return `karşı yüz belirlenemiyor (${res.size} olasılık)`;
      const y = [...res][0];
      return uniqueAnswer(q.opts.map((s) => s === y), a);
    }
    default:
      return `bilinmeyen soru tipi ${q.t}`;
  }
}

export function verifyLevel(level) {
  const { questions, solution } = level;
  if (!Array.isArray(questions) || !questions.length) return 'soru yok';
  if (!Array.isArray(solution) || solution.length !== questions.length) return 'cevap listesi hatalı';
  if (level.puzzle !== fingerprint(questions.map(dataOf))) return 'puzzle alanı sorularla uyuşmuyor';
  const want = { easy: 3, medium: 4, hard: 5 }[level.difficulty];
  if (want && questions.length !== want) return `soru sayısı ${want} olmalı`;
  for (let i = 0; i < questions.length; i++) {
    const err = verifyQuestion(questions[i], solution[i]);
    if (err) return `soru ${i + 1}: ${err}`;
  }
  return null;
}

// Arayüz için: açılımın katlanma ağacı ve her karenin 3B yönü (Katla animasyonu)
// Kök, en çok komşusu olan (ortadaki) karedir; böylece katlanan küp ortada durur.
export function foldTree(cells) {
  const adj = netAdj(cells);
  const root = adj.reduce((b, a, i) => (a.length > adj[b].length ? i : b), 0);
  const tree = cells.map(() => ({ parent: -1, dr: 0, dc: 0 }));
  const seen = new Set([root]);
  const queue = [root];
  while (queue.length) {
    const i = queue.shift();
    for (const j of adj[i]) {
      if (seen.has(j)) continue;
      seen.add(j);
      tree[j] = { parent: i, dr: cells[j][0] - cells[i][0], dc: cells[j][1] - cells[i][1] };
      queue.push(j);
    }
  }
  return { root, tree };
}
