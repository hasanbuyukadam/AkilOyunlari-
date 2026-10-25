// Köprü Kurma (Hashi) mantığı — hem tarayıcıda hem Node'da çalışır (DOM yok).
//
// Level biçimi:
//   w, h      : ızgara boyutu
//   puzzle    : h*w karakter, '.' = boş, '1'..'8' = ada (satır satır)
//   solution  : kanonik kenar listesinin her kenarı için '0' | '1' | '2' köprü sayısı
// Kanonik kenar listesi: adalar okuma sırasıyla; her ada için önce sağdaki, sonra
// aşağıdaki ilk ada (aradaki hücreler boşsa). Böylece çözüm metni bulmacadan türetilen
// kenar sırasına bağlıdır ve kısa kalır.

/** Bulmacayı ayrıştırır: adalar, olası kenarlar, kesişmeler, adaya gelen kenarlar. */
export function parsePuzzle(level) {
  const { w, h, puzzle } = level;
  const at = new Array(w * h).fill(-1);
  const islands = [];
  for (let i = 0; i < w * h; i++) {
    const ch = puzzle[i];
    if (ch !== '.') {
      at[i] = islands.length;
      islands.push({ id: islands.length, r: Math.floor(i / w), c: i % w, n: Number(ch) });
    }
  }
  const edges = [];
  const inc = islands.map(() => []);
  const dirEdge = islands.map(() => [-1, -1, -1, -1]); // sağ, aşağı, sol, yukarı
  for (const isl of islands) {
    for (const [dr, dc, hor] of [[0, 1, true], [1, 0, false]]) {
      let r = isl.r + dr, c = isl.c + dc;
      while (r < h && c < w && at[r * w + c] < 0) { r += dr; c += dc; }
      if (r < h && c < w) {
        const b = at[r * w + c];
        const e = edges.length;
        edges.push({ id: e, a: isl.id, b, hor });
        inc[isl.id].push(e);
        inc[b].push(e);
        dirEdge[isl.id][hor ? 0 : 1] = e;
        dirEdge[b][hor ? 2 : 3] = e;
      }
    }
  }
  const cross = edges.map(() => []);
  for (const e of edges) {
    if (!e.hor) continue;
    const r = islands[e.a].r, c1 = islands[e.a].c, c2 = islands[e.b].c;
    for (const f of edges) {
      if (f.hor) continue;
      const c = islands[f.a].c, r1 = islands[f.a].r, r2 = islands[f.b].r;
      if (r1 < r && r < r2 && c1 < c && c < c2) { cross[e.id].push(f.id); cross[f.id].push(e.id); }
    }
  }
  return { w, h, islands, edges, inc, cross, dirEdge, at };
}

export const parseSolution = (level) => [...level.solution].map(Number);

/** Verilen köprü sayılarıyla tüm kurallar sağlanıyor mu? (tam çözüm kontrolü) */
export function isValidSolution(P, vals) {
  if (vals.length !== P.edges.length) return false;
  if (vals.some((v) => !(v >= 0 && v <= 2))) return false;
  for (const isl of P.islands) {
    let s = 0;
    for (const e of P.inc[isl.id]) s += vals[e];
    if (s !== isl.n) return false;
  }
  for (const e of P.edges) if (vals[e.id] > 0 && P.cross[e.id].some((f) => vals[f] > 0)) return false;
  return isConnected(P, (e) => vals[e] > 0);
}

/** use(e) true olan kenarlarla tüm adalar tek grup mu? */
export function isConnected(P, use) {
  const n = P.islands.length;
  if (n === 0) return true;
  const seen = new Uint8Array(n);
  const stack = [0];
  seen[0] = 1;
  let cnt = 1;
  while (stack.length) {
    const i = stack.pop();
    for (const e of P.inc[i]) {
      if (!use(e)) continue;
      const E = P.edges[e];
      const j = E.a === i ? E.b : E.a;
      if (!seen[j]) { seen[j] = 1; cnt++; stack.push(j); }
    }
  }
  return cnt === n;
}

// ---------------------------------------------------------------------------
// TAM ARAMA (çözüm sayacı) — buluşsal çözücüden bağımsız.
// Her kenar için [alt, üst] sınırı tutar; derece sınırları ve kesişmelerle daraltır,
// "olası köprüler" grafiği bağlı değilse dalı keser, karar verilmemiş bir kenarda dallanır.
// ---------------------------------------------------------------------------
function propagateBounds(P, lo, hi) {
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of P.edges) {
      if (lo[e.id] > 0) for (const f of P.cross[e.id]) {
        if (lo[f] > 0) return false;
        if (hi[f] > 0) { hi[f] = 0; changed = true; }
      }
    }
    for (const isl of P.islands) {
      const es = P.inc[isl.id];
      let sl = 0, sh = 0;
      for (const e of es) { sl += lo[e]; sh += hi[e]; }
      if (sl > isl.n || sh < isl.n) return false;
      for (const e of es) {
        const nl = Math.max(lo[e], isl.n - (sh - hi[e]));
        const nh = Math.min(hi[e], isl.n - (sl - lo[e]));
        if (nl > nh) return false;
        if (nl !== lo[e] || nh !== hi[e]) {
          sl += nl - lo[e]; sh += nh - hi[e];
          lo[e] = nl; hi[e] = nh; changed = true;
        }
      }
    }
  }
  return isConnected(P, (e) => hi[e] > 0);
}

export function countSolutions(P, limit = 2) {
  let count = 0;
  const rec = (lo, hi) => {
    if (count >= limit) return;
    if (!propagateBounds(P, lo, hi)) return;
    let best = -1, bestScore = Infinity;
    for (let e = 0; e < lo.length; e++) {
      if (lo[e] === hi[e]) continue;
      const E = P.edges[e];
      const score = (hi[e] - lo[e]) * 16 + P.inc[E.a].length + P.inc[E.b].length;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (best < 0) {
      if (isValidSolution(P, lo)) count++;
      return;
    }
    for (let v = hi[best]; v >= lo[best] && count < limit; v--) {
      const l2 = lo.slice(), h2 = hi.slice();
      l2[best] = v; h2[best] = v;
      rec(l2, h2);
    }
  };
  rec(new Array(P.edges.length).fill(0), new Array(P.edges.length).fill(2));
  return count;
}

// ---------------------------------------------------------------------------
// İNSAN TARZI MANTIKSAL ÇÖZÜCÜ (zorluk derecelendirme + Akıllı İpucu)
// Seviye 1: kesişme ve sayma kuralları (tek komşu, "sayı = en fazla kapasite", en az 1 köprü).
// Seviye 2: izolasyon (bir grubu kapatıp ayırmak yasak) ve "tek çıkış" kuralı.
// ---------------------------------------------------------------------------
function components(P, lo) {
  const parent = P.islands.map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (const e of P.edges) if (lo[e.id] > 0) parent[find(e.a)] = find(e.b);
  return P.islands.map((_, i) => find(i));
}

/** Sıradaki tek mantıklı adımı bulur. {tier, kind, island?, edges:[...], changes:[{e,lo,hi}]} | {contradiction} | null */
export function findStep(P, lo, hi, maxTier = 2) {
  // Kesişme
  for (const e of P.edges) {
    if (lo[e.id] === 0) continue;
    const fs = P.cross[e.id].filter((f) => hi[f] > 0);
    if (fs.some((f) => lo[f] > 0)) return { contradiction: true };
    if (fs.length) return { tier: 1, kind: 'cross', edge: e.id, changes: fs.map((f) => ({ e: f, lo: 0, hi: 0 })) };
  }
  // Sayma
  for (const isl of P.islands) {
    const es = P.inc[isl.id];
    let sl = 0, sh = 0;
    for (const e of es) { sl += lo[e]; sh += hi[e]; }
    if (sl > isl.n || sh < isl.n) return { contradiction: true };
    const changes = [];
    for (const e of es) {
      const nl = Math.max(lo[e], isl.n - (sh - hi[e]));
      const nh = Math.min(hi[e], isl.n - (sl - lo[e]));
      if (nl > nh) return { contradiction: true };
      if (nl !== lo[e] || nh !== hi[e]) changes.push({ e, lo: nl, hi: nh });
    }
    if (changes.length) {
      const open = es.filter((e) => hi[e] > 0);
      const raised = changes.some((ch) => ch.lo > lo[ch.e]);
      let kind = 'cap';
      if (raised) kind = open.length === 1 ? 'single' : sh === isl.n ? 'full' : 'min';
      return { tier: 1, kind, island: isl.id, open: open.length, need: isl.n - sl, cap: sh, changes };
    }
  }
  if (maxTier < 2) return null;
  const total = P.islands.length;
  const comp = components(P, lo);
  const deficit = new Map(), size = new Map();
  for (const isl of P.islands) {
    let s = 0;
    for (const e of P.inc[isl.id]) s += lo[e];
    const k = comp[isl.id];
    deficit.set(k, (deficit.get(k) ?? 0) + isl.n - s);
    size.set(k, (size.get(k) ?? 0) + 1);
  }
  // İzolasyon: bu kenarı v'ye çıkarmak birleşik grubu tamamen doyurur ve diğer adalardan koparırsa v yasak.
  for (const E of P.edges) {
    const e = E.id;
    if (lo[e] === hi[e]) continue;
    const ka = comp[E.a], kb = comp[E.b];
    const same = ka === kb;
    const def = same ? deficit.get(ka) : deficit.get(ka) + deficit.get(kb);
    const sz = same ? size.get(ka) : size.get(ka) + size.get(kb);
    if (sz >= total) continue;
    const v = hi[e];
    if (def - 2 * (v - lo[e]) === 0) {
      return { tier: 2, kind: 'iso', edge: e, value: v, groupSize: sz, changes: [{ e, lo: lo[e], hi: v - 1 }] };
    }
  }
  // Tek çıkış: bir grubun dışarıya tek olası bağlantısı kaldıysa o kenarda en az 1 köprü olmalı.
  if (size.size > 1) {
    const exits = new Map();
    for (const E of P.edges) {
      if (hi[E.id] === 0) continue;
      const ka = comp[E.a], kb = comp[E.b];
      if (ka === kb) continue;
      for (const k of [ka, kb]) {
        if (!exits.has(k)) exits.set(k, []);
        exits.get(k).push(E.id);
      }
    }
    for (const k of size.keys()) {
      const ex = exits.get(k) ?? [];
      if (ex.length === 0) return { contradiction: true };
      if (ex.length === 1 && lo[ex[0]] === 0) {
        const anyIsland = P.islands.findIndex((_, i) => comp[i] === k);
        return { tier: 2, kind: 'exit', edge: ex[0], island: anyIsland, groupSize: size.get(k), changes: [{ e: ex[0], lo: 1, hi: hi[ex[0]] }] };
      }
    }
  }
  return null;
}

export function applyStep(lo, hi, step) {
  for (const ch of step.changes) { lo[ch.e] = ch.lo; hi[ch.e] = ch.hi; }
}

/** Mantıksal çözüm: { solved, tier, t2steps, vals } */
export function logicalSolve(P, maxTier = 2) {
  const lo = new Array(P.edges.length).fill(0);
  const hi = new Array(P.edges.length).fill(2);
  let tier = 0, t2steps = 0;
  for (let guard = 0; guard < 10000; guard++) {
    const step = findStep(P, lo, hi, maxTier);
    if (!step || step.contradiction) break;
    applyStep(lo, hi, step);
    tier = Math.max(tier, step.tier);
    if (step.tier === 2) t2steps++;
  }
  const solved = lo.every((v, i) => v === hi[i]) && isValidSolution(P, lo);
  return { solved, tier, t2steps, vals: lo };
}

// ---------------------------------------------------------------------------
// LEVEL ÜRETİMİ
// ---------------------------------------------------------------------------
const PLAN = {
  easy: { size: () => 7, from: 8, to: 12, maxTier: 1, double: 0.35, extra: 0.25 },
  medium: { size: () => 9, from: 14, to: 20, maxTier: 2, double: 0.4, extra: 0.35 },
  hard: { size: (i) => (i < 7 ? 11 : i < 14 ? 12 : 13), from: 22, to: 32, maxTier: 2, double: 0.45, extra: 0.45 },
};
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

/** Rastgele bir köprü ağı kurar; adaların sayıları köprülerden hesaplanır. */
function randomNetwork(rng, size, target, plan) {
  const w = size, h = size;
  const cell = new Array(w * h).fill(0); // 0 boş, 1 ada, 2 köprü
  const isl = []; // {r,c}
  const links = []; // {a,b,k}
  const free = (r, c) => r >= 0 && c >= 0 && r < h && c < w && cell[r * w + c] === 0;
  const nearIsland = (r, c) => DIRS.some(([dr, dc]) => {
    const rr = r + dr, cc = c + dc;
    return rr >= 0 && cc >= 0 && rr < h && cc < w && cell[rr * w + cc] === 1;
  });
  const r0 = rng.int(1, h - 2), c0 = rng.int(1, w - 2);
  cell[r0 * w + c0] = 1;
  isl.push({ r: r0, c: c0 });
  for (let tries = 0; isl.length < target && tries < 4000; tries++) {
    const a = rng.int(0, isl.length - 1);
    const [dr, dc] = DIRS[rng.int(0, 3)];
    const maxLen = Math.max(2, Math.min(6, Math.round(size / 2)));
    const len = rng.int(2, maxLen);
    let r = isl[a].r, c = isl[a].c, ok = true;
    for (let s = 1; s < len; s++) { r += dr; c += dc; if (!free(r, c)) { ok = false; break; } }
    if (!ok) continue;
    r += dr; c += dc;
    if (!free(r, c) || nearIsland(r, c)) continue;
    // Yol üzerindeki hücreler başka bir adaya bitişik olmamalı ki komşuluk temiz kalsın (zorunlu değil).
    let pr = isl[a].r, pc = isl[a].c;
    for (let s = 1; s < len; s++) { pr += dr; pc += dc; cell[pr * w + pc] = 2; }
    cell[r * w + c] = 1;
    isl.push({ r, c });
    links.push({ a, b: isl.length - 1, k: rng.next() < plan.double ? 2 : 1 });
  }
  if (isl.length < target) return null;
  // Döngü oluşturan ek köprüler
  const idx = new Map(isl.map((p, i) => [p.r * w + p.c, i]));
  for (let i = 0; i < isl.length; i++) {
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      let r = isl[i].r + dr, c = isl[i].c + dc;
      while (r < h && c < w && cell[r * w + c] === 0) { r += dr; c += dc; }
      if (r >= h || c >= w || cell[r * w + c] !== 1) continue;
      if (r === isl[i].r + dr && c === isl[i].c + dc) continue; // bitişik
      if (rng.next() >= plan.extra) continue;
      let pr = isl[i].r + dr, pc = isl[i].c + dc;
      while (pr !== r || pc !== c) { cell[pr * w + pc] = 2; pr += dr; pc += dc; }
      links.push({ a: i, b: idx.get(r * w + c), k: rng.next() < plan.double ? 2 : 1 });
    }
  }
  const deg = isl.map(() => 0);
  for (const l of links) { deg[l.a] += l.k; deg[l.b] += l.k; }
  const grid = new Array(w * h).fill('.');
  isl.forEach((p, i) => { grid[p.r * w + p.c] = String(deg[i]); });
  const level = { w, h, puzzle: grid.join('') };
  const P = parsePuzzle(level);
  // Ağı kanonik kenar sırasına çevir
  const vals = new Array(P.edges.length).fill(0);
  const key = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
  const byPair = new Map(P.edges.map((e) => [key(e.a, e.b), e.id]));
  for (const l of links) {
    const A = P.at[isl[l.a].r * w + isl[l.a].c], B = P.at[isl[l.b].r * w + isl[l.b].c];
    const e = byPair.get(key(A, B));
    if (e === undefined) return null;
    vals[e] = l.k;
  }
  if (!isValidSolution(P, vals)) return null;
  return { level, P, vals };
}

export function generateLevel(rng, difficulty, index, total) {
  const plan = PLAN[difficulty];
  const t = total > 1 ? index / (total - 1) : 0;
  const target = Math.round(plan.from + (plan.to - plan.from) * t);
  const size = plan.size(index);
  // Orta seviyede ilk birkaç level yalnız sayma ile çözülebilir; sonrası izolasyon/tek çıkış gerektirir.
  const needTier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? (index < 5 ? 1 : 2) : 2;
  const minT2 = difficulty === 'hard' ? 2 + Math.floor(index / 4) : index < 14 ? 1 : 2;
  for (let attempt = 0; attempt < 20000; attempt++) {
    const net = randomNetwork(rng, size, target, plan);
    if (!net) continue;
    const { level, P, vals } = net;
    if (P.islands.some((i) => i.n > 8)) continue;
    const res = logicalSolve(P, plan.maxTier);
    if (!res.solved || res.tier !== needTier) continue;
    if (needTier === 2 && res.t2steps < minT2) continue;
    if (countSolutions(P, 2) !== 1) continue;
    return { w: level.w, h: level.h, puzzle: level.puzzle, solution: vals.join(''), islands: P.islands.length, tier: res.tier };
  }
  throw new Error(`Hashi üretilemedi: ${difficulty} #${index + 1}`);
}

/** Bağımsız doğrulama: biçim + kayıtlı çözüm geçerli + TAM aramayla TEK çözüm + tahminsiz çözülebilir. */
export function verifyLevel(level) {
  const { w, h, puzzle, solution } = level ?? {};
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 3 || h < 3) return 'Geçersiz boyut';
  if (typeof puzzle !== 'string' || puzzle.length !== w * h) return 'Bulmaca uzunluğu hatalı';
  if (!/^[.1-8]+$/.test(puzzle)) return 'Bulmacada geçersiz karakter';
  const P = parsePuzzle(level);
  if (P.islands.length < 2) return 'En az 2 ada olmalı';
  if (typeof solution !== 'string' || solution.length !== P.edges.length || !/^[012]*$/.test(solution)) return 'Çözüm biçimi hatalı';
  if (!isValidSolution(P, parseSolution(level))) return 'Kayıtlı çözüm kuralları sağlamıyor';
  const n = countSolutions(P, 2);
  if (n !== 1) return `Çözüm sayısı ${n} (1 olmalı)`;
  if (!logicalSolve(P, 2).solved) return 'Tahmin yapmadan çözülemiyor';
  return null;
}
