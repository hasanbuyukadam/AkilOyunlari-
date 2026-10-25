// Alan Problemleri — saf mantık (DOM yok). Node ve tarayıcıda çalışır.
// Koordinatlar: x sağa, y aşağı; [x, y] hücresi [x, x+1] × [y, y+1] karesidir.
// Bir bölge (region) = { cells: [[x,y]], tris: [[x,y,k]], polys: [{pts, sign}] }.
//   tris: hücrenin yarısı olan dik üçgen; k = dik açının olduğu köşe (0 sol-üst, 1 sağ-üst, 2 sağ-alt, 3 sol-alt).
//   polys: kafes noktalarında köşeleri olan çokgen; sign = 1 boyalı, -1 kesilip çıkarılmış parça.
// Her şeklin `parts` listesi, açıklamada kullanılan ayrıştırmadır (dikdörtgen/üçgen, işaretli).

export const QUESTIONS_PER = { easy: 3, medium: 4, hard: 5 };
const EPS = 1e-9;

// ---------- Geometri yardımcıları ----------
export const fmt = (n) => {
  const r = Math.round(n * 2) / 2;
  return Number.isInteger(r) ? String(r) : String(r).replace('.', ',');
};
export const rectPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export function triPts(x, y, k) {
  const c = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
  return [c[(k + 3) % 4], c[k], c[(k + 1) % 4]];
}
export function shoelace2(pts) {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return s;
}
export const polyArea = (pts) => Math.abs(shoelace2(pts)) / 2;
export const partsArea = (parts) => parts.reduce((s, p) => s + p.sign * polyArea(p.pts), 0);

export function regionPieces(region) {
  const out = [];
  for (const [x, y] of region.cells ?? []) out.push({ pts: rectPts(x, y, 1, 1), sign: 1 });
  for (const [x, y, k] of region.tris ?? []) out.push({ pts: triPts(x, y, k), sign: 1 });
  for (const p of region.polys ?? []) out.push({ pts: p.pts, sign: p.sign });
  return out;
}

export function bboxOf(ptsList) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pts of ptsList) for (const [x, y] of pts) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}
export const regionBox = (region) => bboxOf(regionPieces(region).map((p) => p.pts));

// Sutherland–Hodgman: çokgeni [x0,x0+1]×[y0,y0+1] birim karesine kırp.
function clipUnit(pts, x0, y0) {
  const planes = [(p) => p[0] - x0, (p) => x0 + 1 - p[0], (p) => p[1] - y0, (p) => y0 + 1 - p[1]];
  let out = pts;
  for (const f of planes) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const cur = inp[i], prev = inp[(i + inp.length - 1) % inp.length];
      const fc = f(cur), fp = f(prev);
      const cross = () => {
        const t = fp / (fp - fc);
        return [prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])];
      };
      if (fc >= 0) { if (fp < 0) out.push(cross()); out.push(cur); }
      else if (fp >= 0) out.push(cross());
    }
    if (!out.length) return out;
  }
  return out;
}

// Bağımsız alan hesabı: her birim kareye düşen payı kırparak bul (hücre hücre).
export function cellCoverage(region) {
  const cov = new Map();
  for (const { pts, sign } of regionPieces(region)) {
    const b = bboxOf([pts]);
    for (let y = Math.floor(b.y0); y < Math.ceil(b.y1); y++) {
      for (let x = Math.floor(b.x0); x < Math.ceil(b.x1); x++) {
        const c = clipUnit(pts, x, y);
        if (c.length < 3) continue;
        const a = polyArea(c);
        if (a < EPS) continue;
        const key = `${x},${y}`;
        cov.set(key, (cov.get(key) ?? 0) + sign * a);
      }
    }
  }
  return cov;
}
export function clipArea(region) {
  let s = 0;
  for (const v of cellCoverage(region).values()) s += v;
  return s;
}
export function fullCellCount(region) {
  let n = 0;
  for (const v of cellCoverage(region).values()) if (v > 1 - EPS) n++;
  return n;
}

export function inPoly(pts, px, py) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Örnekleme ile geçerlilik: boyalı parçalar çakışmaz, kesilen parçalar boyalı parçanın içindedir,
// ve açıklama parçaları (parts) bölgeyi tam olarak kaplar.
export function sampleCheck(region, parts) {
  const pieces = regionPieces(region);
  const b = bboxOf([...pieces.map((p) => p.pts), ...(parts ?? []).map((p) => p.pts)]);
  const S = 4;
  for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) {
    for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) {
      const px = x + (i + 0.3141592) / S, py = y + (j + 0.2718281) / S;
      let pos = 0, neg = 0;
      for (const p of pieces) if (inPoly(p.pts, px, py)) { if (p.sign > 0) pos++; else neg++; }
      if (pos > 1) return `Parçalar üst üste biniyor (${x},${y})`;
      if (neg > pos) return `Kesilen parça şeklin dışında (${x},${y})`;
      if (parts) {
        let pv = 0;
        for (const p of parts) if (inPoly(p.pts, px, py)) pv += p.sign;
        if (pv !== pos - neg) return `Açıklama parçaları şekli tam kaplamıyor (${x},${y})`;
      }
    }
  }
  return null;
}

// Kenar çizgileri: birim kenarlar paylaşılırsa iç kenardır ve çizilmez.
const segKey = (a, b) => {
  const s = [a, b].map((p) => `${p[0]},${p[1]}`).sort();
  return s.join('|');
};
export function outlineSegments(region) {
  const count = new Map();
  const add = (a, b) => {
    const k = segKey(a, b);
    const e = count.get(k);
    if (e) e.n++; else count.set(k, { a, b, n: 1 });
  };
  for (const [x, y] of region.cells ?? []) {
    const p = rectPts(x, y, 1, 1);
    for (let i = 0; i < 4; i++) add(p[i], p[(i + 1) % 4]);
  }
  for (const [x, y, k] of region.tris ?? []) {
    const p = triPts(x, y, k);
    for (let i = 0; i < 3; i++) add(p[i], p[(i + 1) % 3]);
  }
  const segs = [...count.values()].filter((e) => e.n === 1).map(({ a, b }) => [a, b]);
  for (const p of region.polys ?? []) {
    for (let i = 0; i < p.pts.length; i++) segs.push([p.pts[i], p.pts[(i + 1) % p.pts.length]]);
  }
  return segs;
}

// ---------- Hücre kümesi yardımcıları ----------
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const ck = (x, y) => `${x},${y}`;
const cellSet = (cells) => new Set(cells.map(([x, y]) => ck(x, y)));

function normalize(cells) {
  const mx = Math.min(...cells.map((c) => c[0])), my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
export function isConnected(cells) {
  if (!cells.length) return false;
  const set = cellSet(cells), seen = new Set([ck(...cells[0])]), st = [cells[0]];
  while (st.length) {
    const [x, y] = st.pop();
    for (const [dx, dy] of DIRS) {
      const k = ck(x + dx, y + dy);
      if (set.has(k) && !seen.has(k)) { seen.add(k); st.push([x + dx, y + dy]); }
    }
  }
  return seen.size === set.size;
}
export function hasHole(cells) {
  const set = cellSet(cells);
  const b = bboxOf([cells]);
  const x0 = b.x0 - 1, y0 = b.y0 - 1, x1 = b.x1 + 1, y1 = b.y1 + 1;
  const seen = new Set([ck(x0, y0)]), st = [[x0, y0]];
  while (st.length) {
    const [x, y] = st.pop();
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy, k = ck(nx, ny);
      if (nx < x0 || ny < y0 || nx > x1 || ny > y1 || set.has(k) || seen.has(k)) continue;
      seen.add(k); st.push([nx, ny]);
    }
  }
  return seen.size + set.size !== (x1 - x0 + 1) * (y1 - y0 + 1);
}
function polyomino(rng, n, maxW, maxH) {
  for (let tries = 0; tries < 2000; tries++) {
    const cells = [[0, 0]], set = new Set([ck(0, 0)]);
    let guard = 0;
    while (cells.length < n && guard++ < 500) {
      const [x, y] = cells[rng.int(0, cells.length - 1)];
      const [dx, dy] = DIRS[rng.int(0, 3)];
      const nx = x + dx, ny = y + dy;
      if (set.has(ck(nx, ny))) continue;
      const xs = cells.map((c) => c[0]).concat(nx), ys = cells.map((c) => c[1]).concat(ny);
      if (Math.max(...xs) - Math.min(...xs) + 1 > maxW || Math.max(...ys) - Math.min(...ys) + 1 > maxH) continue;
      cells.push([nx, ny]); set.add(ck(nx, ny));
    }
    if (cells.length < n) continue;
    const norm = normalize(cells);
    if (!hasHole(norm)) return norm;
  }
  throw new Error('Polyomino üretilemedi');
}
const shift = (cells, dx, dy) => cells.map(([x, y]) => [x + dx, y + dy]);

// Satır satır yatay koşular (her biri yüksekliği 1 olan dikdörtgen).
export function rowRuns(cells) {
  const set = cellSet(cells);
  const rects = [];
  const ys = [...new Set(cells.map((c) => c[1]))].sort((a, b) => a - b);
  for (const y of ys) {
    const xs = cells.filter((c) => c[1] === y).map((c) => c[0]).sort((a, b) => a - b);
    let start = xs[0];
    for (let i = 1; i <= xs.length; i++) {
      if (i === xs.length || xs[i] !== xs[i - 1] + 1) {
        rects.push([start, y, xs[i - 1] - start + 1, 1]);
        if (i < xs.length) start = xs[i];
      }
    }
  }
  void set;
  return rects;
}
// Aynı koşulara sahip ardışık satırları birleştirerek dikdörtgenlere böl.
export function strips(cells) {
  const runs = rowRuns(cells);
  const byRow = new Map();
  for (const r of runs) { if (!byRow.has(r[1])) byRow.set(r[1], []); byRow.get(r[1]).push(r); }
  const ys = [...byRow.keys()].sort((a, b) => a - b);
  const out = [];
  let open = [];
  for (const y of ys) {
    const row = byRow.get(y);
    const sig = (rs) => rs.map((r) => `${r[0]}:${r[2]}`).join(';');
    if (open.length && sig(open) === sig(row) && open[0][1] + open[0][3] === y) {
      open = open.map((r) => [r[0], r[1], r[2], r[3] + 1]);
    } else {
      out.push(...open);
      open = row.map((r) => [...r]);
    }
  }
  out.push(...open);
  return out;
}
const rectPart = ([x, y, w, h]) => ({ pts: rectPts(x, y, w, h), sign: 1 });

// Birim sınır kenarları (dışa bakan normal ile).
export function boundaryEdges(cells) {
  const set = cellSet(cells);
  const out = [];
  for (const [x, y] of cells) {
    if (!set.has(ck(x, y - 1))) out.push({ a: [x, y], b: [x + 1, y], n: [0, -1] });
    if (!set.has(ck(x + 1, y))) out.push({ a: [x + 1, y], b: [x + 1, y + 1], n: [1, 0] });
    if (!set.has(ck(x, y + 1))) out.push({ a: [x + 1, y + 1], b: [x, y + 1], n: [0, 1] });
    if (!set.has(ck(x - 1, y))) out.push({ a: [x, y + 1], b: [x, y], n: [-1, 0] });
  }
  return out;
}
// Sınır kenarlarını saat yönünde bir tur olarak sırala (numaralandırma için).
export function boundaryTour(cells) {
  const edges = boundaryEdges(cells);
  const from = new Map();
  for (const e of edges) { const k = ck(...e.a); if (!from.has(k)) from.set(k, []); from.get(k).push(e); }
  const used = new Set(), tour = [];
  for (const start of edges) {
    if (used.has(start)) continue;
    let e = start;
    while (e && !used.has(e)) {
      used.add(e); tour.push(e);
      const nexts = (from.get(ck(...e.b)) ?? []).filter((x) => !used.has(x));
      e = nexts[0];
    }
  }
  return tour;
}
// Birleştirilmiş kenarlar (kenar uzunluğu etiketleri için).
export function mergedSides(cells) {
  const edges = boundaryEdges(cells);
  const groups = new Map();
  for (const e of edges) {
    const horiz = e.n[0] === 0;
    const key = horiz ? `h${e.a[1]}:${e.n[1]}` : `v${e.a[0]}:${e.n[0]}`;
    const lo = horiz ? Math.min(e.a[0], e.b[0]) : Math.min(e.a[1], e.b[1]);
    if (!groups.has(key)) groups.set(key, { horiz, c: horiz ? e.a[1] : e.a[0], n: e.n, list: [] });
    groups.get(key).list.push(lo);
  }
  const out = [];
  for (const g of groups.values()) {
    const l = g.list.sort((a, b) => a - b);
    let s = l[0];
    for (let i = 1; i <= l.length; i++) {
      if (i === l.length || l[i] !== l[i - 1] + 1) {
        const e = l[i - 1] + 1;
        const a = g.horiz ? [s, g.c] : [g.c, s], b = g.horiz ? [e, g.c] : [g.c, e];
        out.push({ a, b, len: e - s, n: g.n });
        if (i < l.length) s = l[i];
      }
    }
  }
  return out;
}
const sideLabel = (s, text) => ({
  x: (s.a[0] + s.b[0]) / 2 + s.n[0] * 0.45, y: (s.a[1] + s.b[1]) / 2 + s.n[1] * 0.45, text: String(text ?? s.len),
});

// 8 simetriden biri (döndürme/yansıtma) uygula.
function symCells(cells, s) {
  const m = cells.map(([x, y]) => {
    let p = [x, y];
    if (s & 1) p = [-p[0], p[1]];
    if (s & 2) p = [p[0], -p[1]];
    if (s & 4) p = [p[1], p[0]];
    return p;
  });
  return normalize(m);
}

// ---------- Kafes çokgeni ailesi: köşeleri çevreleyen dikdörtgenin kenarlarında ----------
// Her köşe kenara değer, her kenarda en az bir köşe vardır; dışarıda kalanlar dik üçgenlerdir.
const sidesOf = ([x, y], W, H) => {
  const s = [];
  if (y === 0) s.push('t');
  if (x === W) s.push('r');
  if (y === H) s.push('b');
  if (x === 0) s.push('l');
  return s;
};
const CORNERS = (W, H) => [{ p: [0, 0], s: ['t', 'l'] }, { p: [W, 0], s: ['t', 'r'] }, { p: [W, H], s: ['r', 'b'] }, { p: [0, H], s: ['b', 'l'] }];

// Kesilen köşe üçgenleri (P, köşe, Q). null → geçersiz.
export function cornerTriangles(pts) {
  const b = bboxOf([pts]);
  if (b.x0 !== 0 || b.y0 !== 0) return null;
  const W = b.w, H = b.h;
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const P = pts[i], Q = pts[(i + 1) % pts.length];
    const sp = sidesOf(P, W, H), sq = sidesOf(Q, W, H);
    if (!sp.length || !sq.length) return null;
    if (sp.some((s) => sq.includes(s))) continue;
    const R = pts[(i + 2) % pts.length];
    const side = (C) => Math.sign((Q[0] - P[0]) * (C[1] - P[1]) - (Q[1] - P[1]) * (C[0] - P[0]));
    const inner = side(R);
    const c = CORNERS(W, H).find((cc) => cc.s.some((s) => sp.includes(s)) && cc.s.some((s) => sq.includes(s)) && inner !== 0 && side(cc.p) === -inner);
    if (!c) return null;
    const area = (Math.abs(P[0] - c.p[0]) + Math.abs(P[1] - c.p[1])) * (Math.abs(Q[0] - c.p[0]) + Math.abs(Q[1] - c.p[1])) / 2;
    if (area > 0) out.push([P, c.p, Q]);
  }
  return out;
}
function familyParts(pts) {
  const b = bboxOf([pts]);
  const tris = cornerTriangles(pts);
  return [{ pts: rectPts(0, 0, b.w, b.h), sign: 1 }, ...tris.map((t) => ({ pts: t, sign: -1 }))];
}
export function isStrictlyConvex(pts) {
  let sgn = 0;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length], [cx, cy] = pts[(i + 2) % pts.length];
    const cr = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    if (cr === 0) return false;
    if (sgn && Math.sign(cr) !== sgn) return false;
    sgn = Math.sign(cr);
  }
  return true;
}
function flipPts(pts, W, H, fx, fy, swap) {
  let r = pts.map(([x, y]) => [fx ? W - x : x, fy ? H - y : y]);
  if (swap) r = r.map(([x, y]) => [y, x]);
  if (fx !== fy) r.reverse(); // yönü saat yönünde tut
  if (swap) r.reverse();
  return r;
}

// ---------- Soru üreticileri ----------
const lerp = (a, b, t) => Math.round(a + (b - a) * t);
const pick = (rng, arr) => arr[rng.int(0, arr.length - 1)];
const poly = (pts, sign = 1) => ({ pts, sign });
const ABE = ['A', 'B', 'İkisi eşit'];

function genCount(rng, t) {
  const n = lerp(4, 11, t) + rng.int(0, 1);
  const cells = polyomino(rng, n, Math.min(6, 3 + Math.ceil(n / 3)), 5);
  return {
    kind: 'count', input: 'num', grid: true,
    prompt: 'Bu şeklin alanı kaç birim kare?',
    shapes: [{ region: { cells }, parts: rowRuns(cells).map(rectPart) }],
    labels: [], meta: {}, answer: n,
  };
}
function genRect(rng, t) {
  let w, h;
  do { w = rng.int(lerp(2, 4, t), lerp(4, 7, t)); h = rng.int(lerp(2, 3, t), lerp(3, 5, t)); } while (w * h < 4 || (t > 0.3 && w === h));
  return {
    kind: 'rect', input: 'num', grid: true,
    prompt: `Bu dikdörtgenin eni ${w}, boyu ${h} birim. Alanı kaç birim kare?`,
    shapes: [{ region: { polys: [poly(rectPts(0, 0, w, h))] }, parts: rowRuns(cellsOfRect(w, h)).map(rectPart) }],
    labels: [{ x: w / 2, y: h + 0.5, text: `${w}` }, { x: -0.5, y: h / 2, text: `${h}` }],
    meta: { w, h }, answer: w * h,
  };
}
const cellsOfRect = (w, h, x0 = 0, y0 = 0) => {
  const c = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) c.push([x0 + x, y0 + y]);
  return c;
};
function genCompare(rng, t) {
  const base = lerp(5, 10, t) + rng.int(0, 1);
  const eq = rng.next() < 0.25;
  const d = eq ? 0 : rng.int(1, t < 0.5 ? 2 : 1) * (rng.next() < 0.5 ? 1 : -1);
  const nA = base, nB = base + d;
  let A, B;
  do {
    A = polyomino(rng, nA, 5, 5);
    B = polyomino(rng, nB, 5, 5);
  } while (JSON.stringify(A) === JSON.stringify(B));
  const wA = bboxOf([A]).w + 1;
  B = shift(B, wA + 2, 0);
  return {
    kind: 'compare', input: 'mc', grid: true, options: ABE,
    prompt: 'Hangi şeklin alanı daha büyük?',
    shapes: [{ name: 'A', region: { cells: A }, parts: rowRuns(A).map(rectPart) }, { name: 'B', region: { cells: B }, parts: rowRuns(B).map(rectPart) }],
    labels: [], meta: {}, answer: nA > nB ? 0 : nB > nA ? 1 : 2,
  };
}

function genComposite(rng, t, labelMode) {
  for (;;) {
    const W = lerp(4, 7, t) + rng.int(0, 1), H = lerp(3, 5, t) + rng.int(0, 1);
    const cut = new Set();
    const cutRect = (x, y, w, h) => { for (const [cx, cy] of cellsOfRect(w, h, x, y)) cut.add(ck(cx, cy)); };
    const sub = pick(rng, ['L', 'T', 'U', 'Z']);
    if (sub === 'L') cutRect(0, 0, rng.int(1, W - 2), rng.int(1, H - 1));
    else if (sub === 'T') {
      const ch = rng.int(1, H - 1), a = rng.int(1, W - 2), b = rng.int(1, W - 1 - a);
      cutRect(0, H - ch, a, ch); cutRect(W - b, H - ch, b, ch);
    } else if (sub === 'U') {
      const a = rng.int(1, W - 2), b = rng.int(a + 1, W - 1), ch = rng.int(1, H - 1);
      cutRect(a, 0, b - a, ch);
    } else {
      const w1 = rng.int(1, W - 2), h1 = rng.int(1, H - 2), w2 = rng.int(1, W - 1 - w1), h2 = rng.int(1, H - 1 - h1);
      cutRect(0, 0, w1, h1); cutRect(W - w2, H - h2, w2, h2);
    }
    let cells = cellsOfRect(W, H).filter(([x, y]) => !cut.has(ck(x, y)));
    if (cells.length < 5 || !isConnected(cells) || hasHole(cells)) continue;
    cells = symCells(cells, rng.int(0, 7));
    const parts = strips(cells);
    if (parts.length < 2 || parts.length > 3 || parts.some((p) => p[2] * p[3] < 2) || W * H - cells.length < 2) continue;
    if (labelMode && mergedSides(cells).some((sd) => sd.len < 2)) continue; // etiketler sığsın
    const area = cells.length;
    return {
      kind: 'composite', input: 'num', grid: !labelMode,
      prompt: labelMode ? 'Kenar uzunlukları verilen bu şeklin alanı kaç birim kare?' : 'Bu şeklin alanı kaç birim kare? Şekli dikdörtgenlere bölebilirsin.',
      shapes: [{ region: { cells }, parts: parts.map(rectPart) }],
      labels: labelMode ? mergedSides(cells).map((s) => sideLabel(s)) : [],
      meta: { labelMode: !!labelMode }, answer: area,
    };
  }
}

function genHalf(rng, t) {
  const n = lerp(4, 9, t) + rng.int(0, 1);
  const want = t < 0.35 ? 2 : rng.next() < 0.5 ? 2 : 4;
  for (;;) {
    const cells = polyomino(rng, n, 5, 4);
    const set = cellSet(cells);
    const triCells = new Set();
    const tris = [];
    // köşe k için: dik kenarların komşuları ve hipotenüs tarafındaki komşular
    const legN = [[[0, -1], [-1, 0]], [[0, -1], [1, 0]], [[1, 0], [0, 1]], [[0, 1], [-1, 0]]];
    const hypN = [[[1, 0], [0, 1]], [[0, 1], [-1, 0]], [[0, -1], [-1, 0]], [[0, -1], [1, 0]]];
    const b = bboxOf([cells]);
    const cands = [];
    for (let y = b.y0 - 1; y <= b.y1 + 1; y++) for (let x = b.x0 - 1; x <= b.x1 + 1; x++) {
      if (set.has(ck(x, y))) continue;
      for (let k = 0; k < 4; k++) if (legN[k].some(([dx, dy]) => set.has(ck(x + dx, y + dy)))) cands.push([x, y, k]);
    }
    rng.shuffle(cands);
    for (const [x, y, k] of cands) {
      if (tris.length >= want) break;
      if (triCells.has(ck(x, y))) continue;
      if (hypN[k].some(([dx, dy]) => set.has(ck(x + dx, y + dy)) || triCells.has(ck(x + dx, y + dy)))) continue;
      // var olan üçgenlerin hipotenüs tarafına koyma
      if (tris.some(([tx, ty, tk]) => hypN[tk].some(([dx, dy]) => tx + dx === x && ty + dy === y))) continue;
      tris.push([x, y, k]); triCells.add(ck(x, y));
    }
    if (tris.length !== want) continue;
    const all = [...cells, ...tris.map(([x, y]) => [x, y])];
    const mx = Math.min(...all.map((c) => c[0])), my = Math.min(...all.map((c) => c[1]));
    const C = shift(cells, -mx, -my), T = tris.map(([x, y, k]) => [x - mx, y - my, k]);
    return {
      kind: 'half', input: 'num', grid: true,
      prompt: 'Bu şeklin alanı kaç birim kare? (Çapraz kesilmiş kareler yarım karedir.)',
      shapes: [{ region: { cells: C, tris: T }, parts: [...rowRuns(C).map(rectPart), ...T.map(([x, y, k]) => poly(triPts(x, y, k)))] }],
      labels: [], meta: { full: n, halves: want }, answer: n + want / 2,
    };
  }
}

function genPerim(rng, t) {
  const n = lerp(5, 10, t) + rng.int(0, 1);
  const cells = polyomino(rng, n, 5, 4);
  return {
    kind: 'perim', input: 'num', grid: true,
    prompt: 'Bu şeklin çevresi kaç birim? (Çevre: şeklin etrafını dolaşan çizginin uzunluğu.)',
    shapes: [{ region: { cells }, parts: rowRuns(cells).map(rectPart) }],
    labels: [], meta: { area: n }, answer: boundaryEdges(cells).length,
  };
}

function genSamePer(rng, t) {
  for (;;) {
    const s = lerp(5, 9, t) + rng.int(0, 1); // yarı çevre
    const a = rng.int(1, s - 1), b = rng.int(1, s - 1);
    if (a === b || a === s - b) continue;
    const dims = [[a, s - a], [b, s - b]].map(([p, q]) => (p >= q ? [p, q] : [q, p]));
    if (dims.some(([w, h]) => w > 7 || h > 5)) continue;
    if (dims[0][0] + dims[1][0] > 13) continue;
    const [wA, hA] = dims[0], [wB, hB] = dims[1];
    const ox = wA + 2;
    return {
      kind: 'sameper', input: 'mc', grid: true, options: ABE,
      prompt: `İki dikdörtgenin de çevresi ${2 * s} birim. Hangisinin alanı daha büyük?`,
      shapes: [
        { name: 'A', region: { polys: [poly(rectPts(0, 0, wA, hA))] }, parts: [poly(rectPts(0, 0, wA, hA))] },
        { name: 'B', region: { polys: [poly(rectPts(ox, 0, wB, hB))] }, parts: [poly(rectPts(ox, 0, wB, hB))] },
      ],
      labels: [
        { x: wA / 2, y: hA + 0.5, text: `${wA}` }, { x: -0.5, y: hA / 2, text: `${hA}` },
        { x: ox + wB / 2, y: hB + 0.5, text: `${wB}` }, { x: ox + wB + 0.5, y: hB / 2, text: `${hB}` },
      ],
      meta: { per: 2 * s }, answer: wA * hA > wB * hB ? 0 : 1,
    };
  }
}

function genInverse(rng, t) {
  let en, boy;
  do { en = rng.int(lerp(2, 4, t), lerp(4, 7, t)); boy = rng.int(lerp(3, 5, t), lerp(5, 9, t)); } while (en === boy);
  const area = en * boy;
  return {
    kind: 'inverse', input: 'num', grid: false,
    prompt: `Bu dikdörtgenin alanı ${area} birim kare, eni ${en} birim. Boyu kaç birim?`,
    shapes: [{ region: { polys: [poly(rectPts(0, 0, en, boy))] }, parts: [poly(rectPts(0, 0, en, boy))] }],
    labels: [{ x: en / 2, y: boy + 0.5, text: `${en}` }, { x: -0.5, y: boy / 2, text: '?', cls: 'q' }, { x: en / 2, y: boy / 2, text: `${area}`, cls: 'big' }],
    meta: { area, en }, answer: boy,
  };
}

// Sayısal çoktan seçmeli şıklar: doğru + tipik hatalar.
function numericOptions(rng, ans, mistakes) {
  const opts = [ans];
  for (const m of mistakes) if (opts.length < 4 && m > 0 && Number.isInteger(m) && !opts.includes(m)) opts.push(m);
  for (const d of [2, -2, 1, -1, 3, 4, -3]) if (opts.length < 4 && ans + d > 0 && !opts.includes(ans + d)) opts.push(ans + d);
  rng.shuffle(opts);
  return { options: opts.map(String), answer: opts.indexOf(ans) };
}

function genTriangle(rng, t, idx) {
  for (;;) {
    let pts, meta;
    if (idx < 14) {
      const b = rng.int(3, lerp(5, 8, t)), h = rng.int(2, lerp(4, 6, t));
      if ((b * h) % 2) continue;
      const obtuse = idx >= 8 && rng.next() < 0.7;
      const ax = obtuse ? (rng.next() < 0.5 ? -rng.int(1, 2) : b + rng.int(1, 2)) : rng.int(0, b);
      const lo = Math.min(0, ax);
      pts = [[ax - lo, 0], [b - lo, h], [-lo, h]];
      const W = Math.max(b, ax) - lo;
      const fx = rng.next() < 0.5, fy = rng.next() < 0.4, sw = rng.next() < 0.3;
      pts = flipPts(pts, W, h, fx, fy, sw);
      meta = { mode: 'base', b, h, vertical: sw };
    } else {
      const W = rng.int(3, lerp(5, 7, t)), H = rng.int(3, lerp(4, 6, t));
      pts = [[0, 0], [W, rng.int(1, H - 1)], [rng.int(1, W - 1), H]];
      pts = flipPts(pts, W, H, rng.next() < 0.5, rng.next() < 0.5, false);
      meta = { mode: 'general' };
    }
    const area = polyArea(pts);
    if (!Number.isInteger(area) || area < 3) continue;
    const region = { polys: [poly(pts)] };
    const bb = bboxOf([pts]);
    const mc = numericOptions(rng, area, meta.mode === 'base'
      ? [meta.b * meta.h, fullCellCount(region), meta.b + meta.h]
      : [bb.w * bb.h / 2, fullCellCount(region), bb.w * bb.h - area]);
    return {
      kind: 'triangle', input: 'mc', grid: true, ...mc,
      prompt: 'Boyalı üçgenin alanı kaç birim kare?',
      shapes: [{ region, parts: familyParts(pts) }], labels: [], meta,
      answer: mc.answer,
    };
  }
}

function genPara(rng, t) {
  for (;;) {
    const b = rng.int(3, lerp(4, 6, t)), h = rng.int(2, lerp(3, 5, t)), s = rng.int(1, lerp(2, 3, t));
    let pts = [[s, 0], [s + b, 0], [b, h], [0, h]];
    const sw = rng.next() < 0.3;
    pts = flipPts(pts, b + s, h, rng.next() < 0.5, false, sw);
    const area = b * h;
    const mc = numericOptions(rng, area, [(b + s) * h, b * h / 2, b * (h + 1), 2 * (b + h)]);
    return {
      kind: 'para', input: 'mc', grid: true, ...mc,
      prompt: 'Boyalı paralelkenarın alanı kaç birim kare?',
      shapes: [{ region: { polys: [poly(pts)] }, parts: familyParts(pts) }], labels: [],
      meta: { b, h, s, vertical: sw }, answer: mc.answer,
    };
  }
}

function genCutout(rng, t) {
  for (;;) {
    const W = lerp(5, 8, t) + rng.int(0, 1), H = lerp(4, 6, t) + rng.int(0, 1);
    const nh = 1 + (t > 0.25 ? 1 : 0) + (t > 0.7 && rng.next() < 0.6 ? 1 : 0);
    const holes = [];
    const boxes = [];
    const usedCorners = new Set();
    let guard = 0;
    while (holes.length < nh && guard++ < 200) {
      let pts, box;
      if (rng.next() < 0.35 && t > 0.15) {
        const c = rng.int(0, 3);
        if (usedCorners.has(c)) continue;
        const a = rng.int(1, Math.min(3, W - 2)), bb = rng.int(1, Math.min(3, H - 2));
        if (a * bb < 2) continue;
        const cx = c === 1 || c === 2 ? W : 0, cy = c >= 2 ? H : 0;
        const dx = cx ? -a : a, dy = cy ? -bb : bb;
        pts = [[cx, cy], [cx + dx, cy], [cx, cy + dy]];
        if (shoelace2(pts) < 0) pts.reverse();
        box = { x0: Math.min(cx, cx + dx), y0: Math.min(cy, cy + dy), x1: Math.max(cx, cx + dx), y1: Math.max(cy, cy + dy) };
        if (boxes.some((o) => !(box.x1 + 1 <= o.x0 || o.x1 + 1 <= box.x0 || box.y1 + 1 <= o.y0 || o.y1 + 1 <= box.y0))) continue;
        usedCorners.add(c);
      } else {
        const w = rng.int(1, Math.min(3, W - 2)), h = rng.int(1, Math.min(3, H - 2));
        if (w * h < 2) continue;
        const x = rng.int(0, W - w), y = rng.int(0, H - h);
        box = { x0: x, y0: y, x1: x + w, y1: y + h };
        if (boxes.some((o) => !(box.x1 + 1 <= o.x0 || o.x1 + 1 <= box.x0 || box.y1 + 1 <= o.y0 || o.y1 + 1 <= box.y0))) continue;
        pts = rectPts(x, y, w, h);
      }
      holes.push(poly(pts, -1)); boxes.push(box);
    }
    if (holes.length !== nh) continue;
    const region = { polys: [poly(rectPts(0, 0, W, H)), ...holes] };
    const area = partsArea(region.polys);
    if (!Number.isInteger(area)) continue;
    return {
      kind: 'cutout', input: 'num', grid: true,
      prompt: 'Büyük dikdörtgenden bazı parçalar kesilip çıkarıldı. Kalan boyalı bölgenin alanı kaç birim kare?',
      shapes: [{ region, parts: region.polys.map((p) => ({ ...p })) }], labels: [],
      meta: { W, H }, answer: area,
    };
  }
}

function genPolygon(rng, t) {
  for (;;) {
    const W = lerp(4, 7, t) + rng.int(0, 1), H = lerp(4, 6, t) + rng.int(0, 1);
    const corner = [0, 1, 2, 3].map(() => rng.next() < 0.3);
    const sideLen = [W, H, W, H];
    // kenar i: köşe i ile köşe i+1 arasında (t, r, b, l)
    const interior = [0, 1, 2, 3].map((i) => {
      const cnt = (corner[i] ? 1 : 0) + (corner[(i + 1) % 4] ? 1 : 0);
      const max = Math.min(2 - cnt, sideLen[i] - 1);
      const min = cnt === 0 ? 1 : 0;
      if (max < min) return null;
      const k = rng.int(min, max);
      const vals = rng.shuffle(Array.from({ length: sideLen[i] - 1 }, (_, j) => j + 1)).slice(0, k).sort((a, b) => a - b);
      return vals;
    });
    if (interior.includes(null)) continue;
    const C = [[0, 0], [W, 0], [W, H], [0, H]];
    const pts = [];
    for (let i = 0; i < 4; i++) {
      if (corner[i]) pts.push(C[i]);
      const v = interior[i];
      if (i === 0) v.forEach((x) => pts.push([x, 0]));
      if (i === 1) v.forEach((y) => pts.push([W, y]));
      if (i === 2) v.slice().reverse().forEach((x) => pts.push([x, H]));
      if (i === 3) v.slice().reverse().forEach((y) => pts.push([0, y]));
    }
    if (pts.length < 4 || pts.length > 6 || !isStrictlyConvex(pts)) continue;
    const area = polyArea(pts);
    if (!Number.isInteger(area)) continue;
    const tris = cornerTriangles(pts);
    if (!tris || tris.length < (t > 0.5 ? 3 : 2)) continue;
    return {
      kind: 'polygon', input: 'num', grid: true,
      prompt: 'Köşeleri ızgara noktalarında olan bu şeklin alanı kaç birim kare?',
      shapes: [{ region: { polys: [poly(pts)] }, parts: familyParts(pts) }], labels: [],
      meta: {}, answer: area,
    };
  }
}

export function generateLevel(rng, difficulty, index, total) {
  const t = total > 1 ? index / (total - 1) : 0;
  let qs;
  if (difficulty === 'easy') qs = [genCount(rng, t), genRect(rng, t), genCompare(rng, t)];
  else if (difficulty === 'medium') {
    qs = [genComposite(rng, t, index >= 10 && index % 2 === 0), genHalf(rng, t), genPerim(rng, t), genSamePer(rng, t)];
    if (index >= 14) qs[2] = genComposite(rng, t, true);
  } else qs = [genInverse(rng, t), genTriangle(rng, t, index), genPara(rng, t), genCutout(rng, t), genPolygon(rng, t)];
  // ilk soru en kolayı kalsın, diğerlerini karıştır
  const rest = rng.shuffle(qs.slice(1));
  qs = [qs[0], ...rest].map(pack);
  return { difficulty, puzzle: puzzleKey(qs), questions: qs, solution: qs.map((q) => q.answer) };
}

// ---------- Kısa kayıt biçimi: noktalar "x,y x,y" metni; parts kayıtta tutulmaz, yeniden hesaplanır ----------
const encPts = (pts) => pts.map((p) => p.join(',')).join(' ');
const decPts = (s) => (s ? s.split(' ').map((p) => p.split(',').map(Number)) : []);
export function pack(q) {
  const { shapes, ...rest } = q;
  return {
    ...rest,
    shapes: shapes.map(({ region, parts, ...sh }) => {
      const r = {};
      if (region.cells?.length) r.cells = encPts(region.cells);
      if (region.tris?.length) r.tris = encPts(region.tris);
      if (region.polys?.length) r.polys = region.polys.map((p) => (p.sign < 0 ? `-${encPts(p.pts)}` : encPts(p.pts)));
      return { ...sh, region: r };
    }),
  };
}
export function partsFor(kind, region) {
  switch (kind) {
    case 'composite': return strips(region.cells).map(rectPart);
    case 'half': return [...rowRuns(region.cells).map(rectPart), ...region.tris.map(([x, y, k]) => poly(triPts(x, y, k)))];
    case 'count': case 'compare': case 'perim': return rowRuns(region.cells).map(rectPart);
    case 'rect': { const b = regionBox(region); return rowRuns(cellsOfRect(b.w, b.h, b.x0, b.y0)).map(rectPart); }
    case 'sameper': case 'inverse': case 'cutout': return region.polys.map((p) => ({ pts: p.pts, sign: p.sign }));
    case 'triangle': case 'para': case 'polygon': return familyParts(region.polys[0].pts);
    default: return [];
  }
}
export function unpack(q) {
  return {
    ...q,
    shapes: q.shapes.map((sh) => {
      const r = sh.region;
      const region = {
        cells: decPts(r.cells), tris: decPts(r.tris),
        polys: (r.polys ?? []).map((s) => (s.startsWith('-') ? { pts: decPts(s.slice(1)), sign: -1 } : { pts: decPts(s), sign: 1 })),
      };
      let parts;
      try { parts = partsFor(q.kind, region); } catch { parts = []; }
      return { ...sh, region, parts };
    }),
  };
}
const puzzleKey = (qs) => qs.map((q) => `${q.kind}:${q.shapes.map((s) => JSON.stringify(s.region)).join('/')}`).join('|');

// ---------- Doğrulama ----------
const close = (a, b) => Math.abs(a - b) < 1e-7;
function axisBaseHeight(pts) {
  // eksene paralel bir kenar ve karşı köşenin o kenara uzaklığı
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const others = pts.filter((_, j) => j !== i && j !== (i + 1) % pts.length);
    if (a[1] === b[1]) out.push({ b: Math.abs(a[0] - b[0]), h: Math.max(...others.map((p) => Math.abs(p[1] - a[1]))), vertical: false });
    if (a[0] === b[0]) out.push({ b: Math.abs(a[1] - b[1]), h: Math.max(...others.map((p) => Math.abs(p[0] - a[0]))), vertical: true });
  }
  return out;
}

export function shapeArea(shape) { return clipArea(shape.region); }

export function verifyQuestion(q) {
  if (!q.shapes?.length) return 'Şekil yok';
  const areas = [];
  for (const s of q.shapes) {
    const err = sampleCheck(s.region, s.parts);
    if (err) return err;
    const a = clipArea(s.region), b = partsArea(s.parts);
    if (!close(a, b)) return `Alan uyuşmuyor: kırpma ${a}, parçalar ${b}`;
    if (Math.abs(a * 2 - Math.round(a * 2)) > 1e-7) return 'Alan yarımın katı değil';
    areas.push(Math.round(a * 2) / 2);
  }
  const area = areas[0];
  const checkNum = (v) => {
    if (!Number.isInteger(v)) return 'Cevap tam sayı değil';
    if (q.input === 'num') return q.answer === v ? null : `Cevap ${q.answer}, hesaplanan ${v}`;
    const nums = q.options.map(Number);
    if (nums.some((x) => !Number.isFinite(x))) return 'Şık sayı değil';
    if (new Set(nums).size !== nums.length) return 'Şıklar farklı değil';
    const hits = nums.filter((x) => x === v).length;
    if (hits !== 1) return `${hits} doğru şık var`;
    return nums[q.answer] === v ? null : 'Kayıtlı şık yanlış';
  };
  const checkAB = () => {
    if (JSON.stringify(q.options) !== JSON.stringify(ABE) || areas.length !== 2) return 'Karşılaştırma şıkları hatalı';
    const correct = areas[0] > areas[1] ? 0 : areas[1] > areas[0] ? 1 : 2;
    return q.answer === correct ? null : 'Karşılaştırma cevabı hatalı';
  };
  const singleCells = () => {
    const r = q.shapes[0].region;
    if (q.shapes.length !== 1 || r.polys?.length || !isConnected(r.cells) || hasHole(r.cells)) return 'Şekil tek parça değil';
    return null;
  };
  switch (q.kind) {
    case 'count': case 'composite':
      return singleCells() ?? (r(q).tris?.length ? 'Beklenmeyen yarım kare' : null) ?? checkNum(area);
    case 'half': {
      const reg = q.shapes[0].region;
      if (!isConnected(reg.cells)) return 'Şekil tek parça değil';
      if (reg.cells.length + reg.tris.length / 2 !== area) return 'Tam/yarım kare sayısı uyuşmuyor';
      if (q.meta.full !== reg.cells.length || q.meta.halves !== reg.tris.length) return 'Açıklama sayıları hatalı';
      return checkNum(area);
    }
    case 'rect': {
      const b = regionBox(q.shapes[0].region);
      if (b.w !== q.meta.w || b.h !== q.meta.h || !close(area, b.w * b.h)) return 'Dikdörtgen ölçüleri hatalı';
      return checkNum(area);
    }
    case 'compare':
      for (const s of q.shapes) if (!isConnected(s.region.cells) || hasHole(s.region.cells)) return 'Şekil tek parça değil';
      return checkAB();
    case 'sameper': {
      if (q.shapes.some((s, i) => s.region.polys?.length !== 1 || s.region.cells?.length || !close(areas[i], regionBox(s.region).w * regionBox(s.region).h))) return 'Dikdörtgen değil';
      const pers = q.shapes.map((s) => { const b = regionBox(s.region); return 2 * (b.w + b.h); });
      if (pers[0] !== pers[1] || pers[0] !== q.meta.per) return 'Çevreler eşit değil';
      if (areas[0] === areas[1]) return 'Alanlar eşit olmamalı';
      return checkAB();
    }
    case 'perim': {
      const e = singleCells();
      if (e) return e;
      const cells = q.shapes[0].region.cells, set = cellSet(cells);
      let adj = 0;
      for (const [x, y] of cells) { if (set.has(ck(x + 1, y))) adj++; if (set.has(ck(x, y + 1))) adj++; }
      if (q.meta.area !== area) return 'Alan bilgisi hatalı';
      return checkNum(4 * cells.length - 2 * adj);
    }
    case 'inverse': {
      const b = regionBox(q.shapes[0].region);
      if (q.meta.area !== area || q.meta.en !== b.w) return 'Verilen sayılar şekille uyuşmuyor';
      if (!q.prompt.includes(`alanı ${q.meta.area} birim kare`) || !q.prompt.includes(`eni ${q.meta.en} birim`)) return 'Soru metni hatalı';
      if (area % q.meta.en) return 'Boy tam sayı değil';
      return q.answer === area / q.meta.en && q.answer === b.h ? null : 'Boy cevabı hatalı';
    }
    case 'triangle': case 'para': case 'polygon': {
      const pts = q.shapes[0].region.polys[0].pts;
      if (q.shapes[0].region.polys.length !== 1) return 'Tek çokgen olmalı';
      const n = { triangle: 3, para: 4 }[q.kind];
      if (n && pts.length !== n) return 'Köşe sayısı hatalı';
      if (!isStrictlyConvex(pts) || !cornerTriangles(pts)) return 'Çokgen geçersiz';
      if (q.kind === 'triangle' && q.meta.mode === 'base') {
        if (!axisBaseHeight(pts).some((o) => o.b === q.meta.b && o.h === q.meta.h) || !close(q.meta.b * q.meta.h / 2, area)) return 'Taban/yükseklik hatalı';
      }
      if (q.kind === 'para') {
        const [a, b, c, d] = pts;
        if (a[0] + c[0] !== b[0] + d[0] || a[1] + c[1] !== b[1] + d[1]) return 'Paralelkenar değil';
        if (!axisBaseHeight(pts).some((o) => o.b === q.meta.b && o.h === q.meta.h) || q.meta.b * q.meta.h !== area) return 'Taban/yükseklik hatalı';
      }
      return checkNum(area);
    }
    case 'cutout': {
      const ps = q.shapes[0].region.polys;
      if (ps[0].sign !== 1 || ps.slice(1).some((p) => p.sign !== -1)) return 'Kesik yapı hatalı';
      const b = bboxOf([ps[0].pts]);
      if (b.w !== q.meta.W || b.h !== q.meta.H || polyArea(ps[0].pts) !== b.w * b.h) return 'Büyük dikdörtgen hatalı';
      return checkNum(area);
    }
    default:
      return `Bilinmeyen soru türü ${q.kind}`;
  }
}
const r = (q) => q.shapes[0].region;

export function verifyLevel(level) {
  const qs = level.questions;
  const want = QUESTIONS_PER[level.difficulty];
  if (!Array.isArray(qs) || qs.length !== want) return `Soru sayısı ${qs?.length}, ${want} olmalı`;
  if (level.puzzle !== puzzleKey(qs)) return 'puzzle alanı sorularla uyuşmuyor';
  if (JSON.stringify(level.solution) !== JSON.stringify(qs.map((q) => q.answer))) return 'solution alanı hatalı';
  for (let i = 0; i < qs.length; i++) {
    let e;
    try { e = verifyQuestion(unpack(qs[i])); } catch (err) { e = `Hata: ${err.message}`; }
    if (e) return `Soru ${i + 1} (${qs[i].kind}): ${e}`;
  }
  return null;
}

// ---------- Öğretici metinler ve çizim katmanları (arayüz kullanır) ----------
export function answerValue(q) {
  if (q.input === 'num') return q.answer;
  return q.options[q.answer];
}
function rectDims(p) {
  const b = bboxOf([p.pts]);
  return p.pts.length === 4 && polyArea(p.pts) === b.w * b.h ? b : null;
}
const sumText = (nums) => nums.map(fmt).join(' + ');

export function hintText(q) {
  const parts = q.shapes[0].parts;
  switch (q.kind) {
    case 'count': return 'Kareleri satır satır say, sonra her satırın sayısını topla. Her küçük kare 1 birim karedir.';
    case 'rect': return `Bir satırda kaç kare var? Kaç satır var? Alan = en × boy, yani ${q.meta.w} × ${q.meta.h} işlemini yap.`;
    case 'compare': return 'İki şeklin karelerini ayrı ayrı say ve karşılaştır. Daha uzun görünen şekil her zaman daha büyük değildir!';
    case 'composite': {
      const dims = parts.map((p) => { const b = rectDims(p); return `${b.w} × ${b.h}`; });
      return `Şekli ${parts.length} dikdörtgene bölebilirsin: ${dims.join(', ')}. Her birinin alanını bul ve topla.`
        + (q.meta.labelMode ? ' Yazmayan bir kenarı, karşı kenarlardan çıkararak bulabilirsin.' : '');
    }
    case 'half': return `Önce tam kareleri say. Sonra yarım kareleri say: iki yarım kare bir tam kare eder. Bu şekilde ${q.meta.halves} yarım kare var.`;
    case 'perim': return 'Bir köşeden başla, şeklin etrafını dolaş ve dıştaki her birim çizgiyi say. Şeklin içindeki çizgiler sayılmaz!';
    case 'sameper': return 'Çevreleri aynı ama alanları da aynı mı? Her dikdörtgen için en × boy hesapla ve karşılaştır.';
    case 'inverse': return `Alan = en × boy. ${q.meta.en} × ? = ${q.meta.area}. Hangi sayıyı ${q.meta.en} ile çarparsan ${q.meta.area} eder? (Bölme de işe yarar!)`;
    case 'triangle':
      return q.meta.mode === 'base'
        ? `Üçgenin tabanı ${q.meta.b}, yüksekliği ${q.meta.h} birim. Üçgen, taban × yükseklik dikdörtgeninin yarısı kadardır: taban × yükseklik ÷ 2.`
        : 'Üçgeni tam saran dikdörtgeni düşün. Dikdörtgenin alanından köşelerde kalan dik üçgenleri çıkar. Her dik üçgen, kendi küçük dikdörtgeninin yarısıdır.';
    case 'para': return `Bir yandaki üçgeni kesip öbür yana taşırsan dikdörtgen olur! Alan = taban × yükseklik. Taban ${q.meta.b}, yükseklik ${q.meta.h} (eğik kenarı değil, dik yüksekliği kullan).`;
    case 'cutout': {
      const n = parts.length - 1;
      const tri = parts.some((p) => p.pts.length === 3) ? ' Üçgen bir parça, aynı kenarlı dikdörtgenin yarısıdır.' : '';
      return `Önce büyük dikdörtgenin alanını bul (${q.meta.W} × ${q.meta.H}), sonra ${n === 1 ? 'kesilen parçanın alanını' : `kesilen ${n} parçanın alanlarını`} çıkar.${tri}`;
    }
    case 'polygon': return `Şekli tam saran ${bboxOf([parts[0].pts]).w} × ${bboxOf([parts[0].pts]).h} dikdörtgeni düşün. Dikdörtgenden köşelerdeki ${parts.length - 1} dik üçgeni çıkar.`;
    default: return '';
  }
}

function triLegs(pts) {
  // dik üçgenin dik kenarları
  for (let i = 0; i < 3; i++) {
    const c = pts[i], a = pts[(i + 2) % 3], b = pts[(i + 1) % 3];
    const ax = a[0] - c[0], ay = a[1] - c[1], bx = b[0] - c[0], by = b[1] - c[1];
    if (ax * bx + ay * by === 0 && (ax === 0 || ay === 0)) return [Math.abs(ax + ay), Math.abs(bx + by)];
  }
  return null;
}
const partFormula = (p) => {
  const r = rectDims(p);
  if (r) return `${r.w} × ${r.h} = ${r.w * r.h}`;
  const legs = p.pts.length === 3 && triLegs(p.pts);
  if (legs) return `${legs[0]} × ${legs[1]} ÷ 2 = ${fmt(polyArea(p.pts))}`;
  return fmt(polyArea(p.pts));
};

export function explainText(q) {
  const parts = q.shapes[0].parts;
  const ans = q.input === 'num' ? q.answer : null;
  const v = (q.kind === 'compare' || q.kind === 'sameper') ? null : Number(answerValue(q));
  switch (q.kind) {
    case 'count': {
      const rows = new Map();
      for (const p of parts) { const b = bboxOf([p.pts]); rows.set(b.y0, (rows.get(b.y0) ?? 0) + b.w); }
      return `Satır satır sayalım: ${sumText([...rows.values()])} = ${ans} birim kare.`;
    }
    case 'rect': return `Alan = en × boy = ${q.meta.w} × ${q.meta.h} = ${ans} birim kare. Her satırda ${q.meta.w} kare var ve ${q.meta.h} satır var.`;
    case 'compare': case 'sameper': {
      const [a, b] = q.shapes.map((s) => partsArea(s.parts));
      const f = (s, x) => q.kind === 'sameper' ? `${partFormula(s.parts[0])}` : `${x}`;
      const pre = q.kind === 'sameper' ? `İkisinin de çevresi ${q.meta.per} birim. ` : '';
      const res = a === b ? 'Alanları eşit!' : a > b ? "A'nın alanı daha büyük." : "B'nin alanı daha büyük.";
      const post = q.kind === 'sameper' ? ' Çevresi aynı olan şekillerin alanı farklı olabilir; kareye daha yakın olan dikdörtgenin alanı daha büyüktür.' : '';
      return `${pre}A: ${f(q.shapes[0], a)} birim kare, B: ${f(q.shapes[1], b)} birim kare. ${res}${post}`;
    }
    case 'composite': {
      const areas = parts.map((p) => polyArea(p.pts));
      return `Şekli ${parts.length} dikdörtgene böldük: ${parts.map(partFormula).join(' ve ')}. Toplam: ${sumText(areas)} = ${ans} birim kare.`;
    }
    case 'half': {
      const { full, halves } = q.meta;
      return `${full} tam kare + ${halves} yarım kare. İki yarım kare bir tam kare eder: ${halves} yarım kare = ${halves / 2} tam kare. ${full} + ${halves / 2} = ${ans} birim kare.`;
    }
    case 'perim': return `Şeklin etrafını dolaşıp dıştaki birim çizgileri saydık: ${ans} birim. Dikkat: bu şeklin alanı ${q.meta.area} birim kare, çevresi ise ${ans} birim. Alan şeklin içini, çevre kenarını ölçer!`;
    case 'inverse': return `Alan = en × boy olduğundan ${q.meta.en} × ? = ${q.meta.area}. ${q.meta.area} ÷ ${q.meta.en} = ${ans}, yani boyu ${ans} birim. Kontrol: ${q.meta.en} × ${ans} = ${q.meta.area} ✓`;
    case 'triangle':
      if (q.meta.mode === 'base') return `Taban = ${q.meta.b}, yükseklik = ${q.meta.h}. Alan = taban × yükseklik ÷ 2 = ${q.meta.b} × ${q.meta.h} ÷ 2 = ${fmt(v)} birim kare.`;
    // eslint-disable-next-line no-fallthrough
    case 'polygon': {
      const box = rectDims(parts[0]);
      const tris = parts.slice(1);
      const cut = tris.reduce((s, p) => s + polyArea(p.pts), 0);
      return `Şekli saran dikdörtgen: ${box.w} × ${box.h} = ${box.w * box.h}. Köşelerdeki dik üçgenler: ${tris.map(partFormula).join(', ')}. Toplam ${fmt(cut)}. ${box.w * box.h} − ${fmt(cut)} = ${fmt(v)} birim kare.`;
    }
    case 'para': return `Paralelkenarın alanı = taban × yükseklik = ${q.meta.b} × ${q.meta.h} = ${v} birim kare. Bir yandaki üçgeni kesip öbür yana koyunca ${q.meta.b} × ${q.meta.h}'lük bir dikdörtgen oluşur.`;
    case 'cutout': {
      const holes = parts.slice(1);
      const big = q.meta.W * q.meta.H;
      return `Büyük dikdörtgen: ${q.meta.W} × ${q.meta.H} = ${big}. Kesilen parçalar: ${holes.map(partFormula).join(', ')}. ${big} − ${holes.map((p) => fmt(polyArea(p.pts))).join(' − ')} = ${ans} birim kare.`;
    }
    default: return '';
  }
}

// Çizim katmanı: { t:'poly'|'line'|'text', ... }. full=false → "Böl ve Say" (sonuç sayısız).
export function overlay(q, full) {
  const out = [];
  const label = (p) => {
    const r = rectDims(p);
    if (r) return r.w > 1 && r.h > 1 ? `${r.w}×${r.h}` : `${r.w * r.h}`;
    const a = polyArea(p.pts);
    return a === 0.5 ? '½' : fmt(a);
  };
  const center = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  const drawParts = (parts, opt = {}) => {
    parts.forEach((p, i) => {
      out.push({ t: 'poly', pts: p.pts, cls: p.sign < 0 ? 'ov-neg' : opt.box && i === 0 ? 'ov-box' : `ov-p${i % 4}` });
    });
    parts.forEach((p, i) => {
      if (opt.box && i === 0) return;
      const [cx, cy] = p.pts.length === 3 ? center(p.pts) : center(p.pts);
      out.push({ t: 'text', x: cx, y: cy, text: label(p), cls: 'ov-txt' });
    });
  };
  const shapes = q.shapes;
  switch (q.kind) {
    case 'perim': {
      const tour = boundaryTour(shapes[0].region.cells);
      tour.forEach((e, i) => {
        out.push({ t: 'line', a: e.a, b: e.b, cls: i % 2 ? 'ov-e1' : 'ov-e0' });
        if (full) out.push({ t: 'text', x: (e.a[0] + e.b[0]) / 2, y: (e.a[1] + e.b[1]) / 2, text: `${i + 1}`, cls: 'ov-small' });
      });
      break;
    }
    case 'inverse': {
      const { en, area } = q.meta, boy = area / en;
      for (let y = 0; y < boy; y++) {
        out.push({ t: 'poly', pts: rectPts(0, y, en, 1), cls: `ov-p${y % 2}` });
        for (let x = 1; x < en; x++) out.push({ t: 'line', a: [x, y], b: [x, y + 1], cls: 'ov-thin' });
        if (full || y < 2) out.push({ t: 'text', x: en + 0.7, y: y + 0.5, text: `${(y + 1) * en}`, cls: 'ov-small' });
      }
      break;
    }
    case 'triangle': case 'polygon': {
      drawParts(shapes[0].parts, { box: true });
      if (q.kind === 'triangle' && q.meta.mode === 'base') {
        const pts = shapes[0].region.polys[0].pts;
        const o = axisBaseHeight(pts).find((x) => x.b === q.meta.b && x.h === q.meta.h);
        // yükseklik çizgisi: tabana dik, karşı köşeden
        for (let i = 0; i < 3; i++) {
          const a = pts[i], b = pts[(i + 1) % 3], c = pts[(i + 2) % 3];
          if (!o.vertical && a[1] === b[1]) out.push({ t: 'line', a: c, b: [c[0], a[1]], cls: 'ov-h' }, { t: 'line', a, b, cls: 'ov-base' });
          if (o.vertical && a[0] === b[0]) out.push({ t: 'line', a: c, b: [a[0], c[1]], cls: 'ov-h' }, { t: 'line', a, b, cls: 'ov-base' });
        }
      }
      break;
    }
    case 'para': {
      const pts = shapes[0].region.polys[0].pts;
      const tris = cornerTriangles(pts);
      // birini kes (kırmızı), öbür tarafa taşı (yeşil kesikli)
      const [cut, dest] = tris;
      out.push({ t: 'poly', pts: cut, cls: 'ov-neg' }, { t: 'poly', pts: dest, cls: 'ov-move' });
      const [x1, y1] = center(cut), [x2, y2] = center(dest);
      out.push({ t: 'arrow', a: [x1, y1], b: [x2, y2], cls: 'ov-arrow' });
      break;
    }
    case 'half': {
      const p = shapes[0].parts;
      p.forEach((part, i) => out.push({ t: 'poly', pts: part.pts, cls: part.pts.length === 3 ? 'ov-p1' : 'ov-p0' }));
      p.forEach((part) => { if (part.pts.length === 3) out.push({ t: 'text', x: center(part.pts)[0], y: center(part.pts)[1], text: '½', cls: 'ov-txt' }); });
      for (const [x, y] of shapes[0].region.cells) out.push({ t: 'poly', pts: rectPts(x, y, 1, 1), cls: 'ov-cell' });
      break;
    }
    case 'cutout': {
      const parts = shapes[0].parts;
      drawParts(parts, { box: true });
      out.push({ t: 'text', x: q.meta.W / 2, y: q.meta.H + 0.5, text: `${q.meta.W} × ${q.meta.H}`, cls: 'ov-txt' });
      break;
    }
    default:
      for (const s of shapes) drawParts(s.parts);
  }
  return out;
}

// "Aralık Göster" için cevabı içeren aralık.
export function rangeFor(q) {
  const v = Number(answerValue(q));
  const w = v <= 10 ? 5 : 10;
  const lo = Math.floor((v - 1) / w) * w + 1;
  return [lo, lo + w - 1];
}
