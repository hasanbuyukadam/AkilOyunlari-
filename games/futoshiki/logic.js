// Büyük-Küçük (Futoshiki) mantığı — tarayıcıda ve Node'da çalışır, DOM kullanmaz.
//
// Bulmaca metni: "<verilenler>|<yatay işaretler>|<dikey işaretler>"
//   verilenler : N*N karakter, '.' = boş, '1'..'9' = verilen rakam (satır satır)
//   yatay      : N*(N-1) karakter; (r,c) ile (r,c+1) arası: '.', '<' (sol küçük), '>' (sol büyük)
//   dikey      : (N-1)*N karakter; (r,c) ile (r+1,c) arası: '.', '^' (üst küçük, ∧), 'v' (üst büyük, ∨)
// Çözüm metni: N*N rakam.

const bit = (v) => 1 << v;
const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const lowest = (m) => 31 - Math.clz32(m & -m);
const highest = (m) => 31 - Math.clz32(m);
const fullMask = (N) => ((1 << (N + 1)) - 1) & ~1; // 1..N
const below = (v) => (1 << v) - 2; // 1..v-1
const above = (v, N) => fullMask(N) & ~((1 << (v + 1)) - 1); // v+1..N
const digitsOf = (m) => { const out = []; for (let d = 1; m >> d; d++) if (m & bit(d)) out.push(d); return out; };

// ---------------------------------------------------------------------------
// Ayrıştırma

export function parsePuzzle(str) {
  const [g, h = '', v = ''] = String(str).split('|');
  const N = Math.round(Math.sqrt(g.length));
  const givens = [...g].map((ch) => (ch === '.' || ch === '0' ? 0 : Number(ch)));
  return { N, givens, h: [...h], v: [...v] };
}

export const parseSolution = (str) => [...String(str)].map(Number);

export function stringifyPuzzle(N, givens, h, v) {
  return `${givens.map((x) => (x ? String(x) : '.')).join('')}|${h.join('')}|${v.join('')}`;
}

/** İşaretleri "a < b" kısıtları listesine çevirir. */
export function relationsOf(N, h, v) {
  const rels = []; // {lo, hi, kind:'h'|'v', idx}
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 1; c++) {
      const i = r * (N - 1) + c, a = r * N + c, b = a + 1;
      if (h[i] === '<') rels.push({ lo: a, hi: b, kind: 'h', idx: i });
      else if (h[i] === '>') rels.push({ lo: b, hi: a, kind: 'h', idx: i });
    }
  }
  for (let r = 0; r < N - 1; r++) {
    for (let c = 0; c < N; c++) {
      const i = r * N + c, a = r * N + c, b = a + N;
      if (v[i] === '^') rels.push({ lo: a, hi: b, kind: 'v', idx: i });
      else if (v[i] === 'v') rels.push({ lo: b, hi: a, kind: 'v', idx: i });
    }
  }
  return rels;
}

function buildModel(N, rels) {
  const n = N * N;
  const smaller = Array.from({ length: n }, () => []); // smaller[c]: c'den küçük olması gereken komşular
  const larger = Array.from({ length: n }, () => []);
  for (const { lo, hi } of rels) { smaller[hi].push(lo); larger[lo].push(hi); }
  const units = [];
  for (let r = 0; r < N; r++) units.push(Array.from({ length: N }, (_, j) => r * N + j));
  for (let c = 0; c < N; c++) units.push(Array.from({ length: N }, (_, j) => j * N + c));
  const peers = Array.from({ length: n }, (_, c) => {
    const r = Math.floor(c / N), col = c % N, out = [];
    for (let j = 0; j < N; j++) {
      if (j !== col) out.push(r * N + j);
      if (j !== r) out.push(j * N + col);
    }
    return out;
  });
  return { N, n, rels, smaller, larger, units, peers, ALL: fullMask(N) };
}

/** Bir değer dizisinin (0 = boş) kural ihlallerini bulur. */
export function violations(N, values, rels) {
  const badCells = new Set();
  const badRels = new Set();
  for (let c = 0; c < N * N; c++) {
    if (!values[c]) continue;
    const r = Math.floor(c / N), col = c % N;
    for (let j = 0; j < N; j++) {
      const p1 = r * N + j, p2 = j * N + col;
      if (p1 !== c && values[p1] === values[c]) badCells.add(c);
      if (p2 !== c && values[p2] === values[c]) badCells.add(c);
    }
  }
  rels.forEach((rel, i) => {
    const a = values[rel.lo], b = values[rel.hi];
    if (a && b && !(a < b)) badRels.add(i);
  });
  return { badCells, badRels };
}

// ---------------------------------------------------------------------------
// Tam arama ile çözüm sayma (doğrulama). Sezgisel çözücüden bağımsızdır:
// yalnızca atanmış hücrelere göre ileri kontrol + en az adaylı hücreyle dallanma.

export function countSolutions(N, givens, rels, limit = 2) {
  const M = buildModel(N, rels);
  const g = givens.slice();
  const rowUsed = new Array(N).fill(0), colUsed = new Array(N).fill(0);
  for (let c = 0; c < M.n; c++) {
    if (!g[c]) continue;
    const r = Math.floor(c / N), col = c % N;
    if (rowUsed[r] & bit(g[c]) || colUsed[col] & bit(g[c])) return 0;
    rowUsed[r] |= bit(g[c]); colUsed[col] |= bit(g[c]);
  }
  for (const { lo, hi } of rels) if (g[lo] && g[hi] && g[lo] >= g[hi]) return 0;
  const candOf = (c) => {
    let m = M.ALL & ~rowUsed[Math.floor(c / N)] & ~colUsed[c % N];
    for (const s of M.smaller[c]) if (g[s]) m &= above(g[s], N);
    for (const l of M.larger[c]) if (g[l]) m &= below(g[l]);
    return m;
  };
  let count = 0;
  const rec = () => {
    let best = -1, bestMask = 0, bestN = 99;
    for (let c = 0; c < M.n; c++) {
      if (g[c]) continue;
      const m = candOf(c);
      const k = popcount(m);
      if (k === 0) return;
      if (k < bestN) { best = c; bestMask = m; bestN = k; if (k === 1) break; }
    }
    if (best < 0) { count++; return; }
    const r = Math.floor(best / N), col = best % N;
    for (let m = bestMask; m && count < limit; m &= m - 1) {
      const d = lowest(m);
      g[best] = d; rowUsed[r] |= bit(d); colUsed[col] |= bit(d);
      rec();
      rowUsed[r] &= ~bit(d); colUsed[col] &= ~bit(d);
    }
    g[best] = 0;
  };
  rec();
  return count;
}

// ---------------------------------------------------------------------------
// İnsan mantığıyla çözüm (zorluk derecesi + ipucu)
// Kademe 1: satır/sütun eleme, işaret sınırları (zincirler dahil), tek aday, gizli tek
// Kademe 2: açık çift/üçlü, gizli çift (satır/sütunda)

function initCand(M, grid) {
  const cand = new Array(M.n).fill(0);
  for (let c = 0; c < M.n; c++) {
    if (grid[c]) { cand[c] = bit(grid[c]); continue; }
    let m = M.ALL;
    for (const p of M.peers[c]) if (grid[p]) m &= ~bit(grid[p]);
    cand[c] = m;
  }
  return cand;
}

/** İşaret sınırlarını sabit noktaya kadar uygular. Değişiklik olursa true. */
function propagateSigns(M, cand) {
  let changed = false, again = true;
  while (again) {
    again = false;
    for (const { lo, hi } of M.rels) {
      if (!cand[lo] || !cand[hi]) continue;
      const nlo = cand[lo] & below(highest(cand[hi]));
      const nhi = cand[hi] & above(lowest(cand[lo]), M.N);
      if (nlo !== cand[lo] || nhi !== cand[hi]) {
        cand[lo] = nlo; cand[hi] = nhi; again = changed = true;
        if (!nlo || !nhi) return changed;
      }
    }
  }
  return changed;
}

function findSingle(M, grid, cand) {
  for (let c = 0; c < M.n; c++) {
    if (!grid[c] && popcount(cand[c]) === 1) return { cell: c, value: lowest(cand[c]), reason: 'naked' };
  }
  for (let u = 0; u < M.units.length; u++) {
    for (let d = 1; d <= M.N; d++) {
      let spot = -1, k = 0;
      for (const c of M.units[u]) {
        if (grid[c] === d) { k = -1; break; }
        if (!grid[c] && cand[c] & bit(d)) { spot = c; k++; }
      }
      if (k === 1) return { cell: spot, value: d, reason: 'hidden', unit: u < M.N ? 'row' : 'col' };
    }
  }
  return null;
}

function applyTier2(M, grid, cand) {
  let changed = false;
  const elim = (c, mask) => { if (!grid[c] && cand[c] & mask) { cand[c] &= ~mask; changed = true; } };
  for (const unit of M.units) {
    const empty = unit.filter((c) => !grid[c]);
    // Açık çift / üçlü
    for (let i = 0; i < empty.length; i++) {
      for (let j = i + 1; j < empty.length; j++) {
        const m2 = cand[empty[i]] | cand[empty[j]];
        if (popcount(m2) === 2) for (const c of empty) if (c !== empty[i] && c !== empty[j]) elim(c, m2);
        for (let k = j + 1; k < empty.length; k++) {
          const m3 = m2 | cand[empty[k]];
          if (popcount(m3) === 3) {
            for (const c of empty) if (c !== empty[i] && c !== empty[j] && c !== empty[k]) elim(c, m3);
          }
        }
      }
    }
    // Gizli çift
    const where = {};
    for (let d = 1; d <= M.N; d++) where[d] = empty.filter((c) => cand[c] & bit(d));
    for (let a = 1; a <= M.N; a++) {
      if (where[a].length !== 2) continue;
      for (let b = a + 1; b <= M.N; b++) {
        if (where[b].length === 2 && where[b][0] === where[a][0] && where[b][1] === where[a][1]) {
          for (const c of where[a]) elim(c, M.ALL & ~(bit(a) | bit(b)));
        }
      }
    }
  }
  return changed;
}

function place(M, grid, cand, c, v) {
  grid[c] = v;
  cand[c] = bit(v);
  for (const p of M.peers[c]) if (!grid[p]) cand[p] &= ~bit(v);
}

/**
 * Yalnızca maxTier'e kadar tekniklerle çözmeye çalışır.
 * Dönüş: { solved, tier, steps, tier2Steps }
 */
export function logicalSolve(N, givens, rels, maxTier = 2) {
  const M = buildModel(N, rels);
  const g = givens.slice();
  const cand = initCand(M, g);
  let tier = 0, steps = 0, signSteps = 0, tier2Steps = 0;
  for (let guard = 0; guard < 1000; guard++) {
    if (g.every((x) => x)) return { solved: true, tier, steps, signSteps, tier2Steps };
    if (cand.some((m, c) => !g[c] && !m)) return { solved: false, tier, steps };
    // Önce işaretsiz tekler, sonra işaret sınırları
    let s = findSingle(M, g, cand);
    if (!s && propagateSigns(M, cand)) { signSteps++; s = findSingle(M, g, cand); }
    if (s) { place(M, g, cand, s.cell, s.value); steps++; tier = Math.max(tier, 1); continue; }
    if (maxTier >= 2 && applyTier2(M, g, cand)) { tier = 2; tier2Steps++; continue; }
    return { solved: false, tier, steps };
  }
  return { solved: false, tier, steps };
}

/**
 * İpucu: mevcut (doğru) rakamlara göre sıradaki mantıklı hamle.
 * Dönüş: { cell, value, reason, unit?, stage: 'basic'|'signs'|'advanced', cand }
 * stage: 'basic' = yalnızca satır/sütun; 'signs' = işaretler gerekti; 'advanced' = çift/üçlü elemesi gerekti
 */
export function nextLogicalStep(N, grid, rels) {
  const M = buildModel(N, rels);
  const g = grid.slice();
  const cand = initCand(M, g);
  let s = findSingle(M, g, cand);
  if (s) return { ...s, stage: 'basic', cand };
  propagateSigns(M, cand);
  s = findSingle(M, g, cand);
  if (s) return { ...s, stage: 'signs', cand };
  for (let guard = 0; guard < 50; guard++) {
    if (!applyTier2(M, g, cand)) return null;
    propagateSigns(M, cand);
    s = findSingle(M, g, cand);
    if (s) return { ...s, stage: 'advanced', cand };
  }
  return null;
}

/**
 * Zincir uzunlukları: c'den başlayıp işaretler boyunca kesin küçük (down) / büyük (up)
 * en uzun zincirdeki hücre sayısı (c hariç). "En az down+1, en fazla N-up olmalı."
 */
export function chainLengths(N, rels, c) {
  const M = buildModel(N, rels);
  const memo = new Map();
  const longest = (x, dir) => {
    const key = x * 2 + (dir === 'down' ? 0 : 1);
    if (memo.has(key)) return memo.get(key);
    let best = 0;
    for (const y of dir === 'down' ? M.smaller[x] : M.larger[x]) best = Math.max(best, 1 + longest(y, dir));
    memo.set(key, best);
    return best;
  };
  return { down: longest(c, 'down'), up: longest(c, 'up') };
}

export { digitsOf, buildModel };

// ---------------------------------------------------------------------------
// Üretim

function randomLatin(rng, N) {
  const g = new Array(N * N).fill(0);
  const fill = (c) => {
    if (c === N * N) return true;
    const r = Math.floor(c / N), col = c % N;
    for (const d of rng.shuffle(Array.from({ length: N }, (_, i) => i + 1))) {
      let ok = true;
      for (let j = 0; j < N && ok; j++) {
        if (j < col && g[r * N + j] === d) ok = false;
        if (j < r && g[j * N + col] === d) ok = false;
      }
      if (!ok) continue;
      g[c] = d;
      if (fill(c + 1)) return true;
    }
    g[c] = 0;
    return false;
  };
  fill(0);
  // Ek karıştırma: satır, sütun ve sembol permütasyonu
  const rows = rng.shuffle(Array.from({ length: N }, (_, i) => i));
  const cols = rng.shuffle(Array.from({ length: N }, (_, i) => i));
  const sym = [0, ...rng.shuffle(Array.from({ length: N }, (_, i) => i + 1))];
  const out = new Array(N * N);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) out[r * N + c] = sym[g[rows[r] * N + cols[c]]];
  return out;
}

// index ilerledikçe: daha az verilen, daha zor teknik.
// givens: hedef verilen sayısı (başlangıç→son), signs: en az tutulacak işaret oranı
const PLAN = {
  easy: [
    { N: 4, from: 5, to: 3, keepSigns: 0.25, maxTier: 1, minSignSteps: 1 },
  ],
  medium: [
    { N: 5, from: 6, to: 3, keepSigns: 0.15, maxTier: 1, minSignSteps: 2 },
  ],
  hard: [
    { N: 6, from: 5, to: 2, keepSigns: 0, maxTier: 2, minSignSteps: 3 },
  ],
};

function planFor(difficulty, index, total) {
  const t = total > 1 ? index / (total - 1) : 0;
  const base = PLAN[difficulty][0];
  const p = { ...base };
  if (difficulty === 'hard' && index >= total - 4) { p.N = 7; p.from = 4; p.to = 2; }
  const tt = difficulty === 'hard' && p.N === 7 ? (index - (total - 4)) / 3 : (difficulty === 'hard' ? index / (total - 5) : t);
  p.targetGivens = Math.round(p.from - (p.from - p.to) * tt);
  // Zor seviyenin ikinci yarısı kademe-2 teknik gerektirsin
  p.needTier2 = difficulty === 'hard' && index >= 8;
  p.keepSignsFrac = p.keepSigns * (1 - 0.6 * tt);
  return p;
}

export function generateLevel(rng, difficulty, index, total) {
  const p = planFor(difficulty, index, total);
  const N = p.N;
  for (let attempt = 0; attempt < 400; attempt++) {
    const sol = randomLatin(rng, N);
    const h = [], v = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N - 1; c++) h.push(sol[r * N + c] < sol[r * N + c + 1] ? '<' : '>');
    for (let r = 0; r < N - 1; r++) for (let c = 0; c < N; c++) v.push(sol[r * N + c] < sol[(r + 1) * N + c] ? '^' : 'v');
    const givens = sol.slice();
    const totalSigns = h.length + v.length;
    const minSigns = Math.round(totalSigns * p.keepSignsFrac);
    // Tüm ipuçlarıyla başla; karışık sırayla çıkar.
    const items = [];
    for (let c = 0; c < N * N; c++) items.push(['g', c]);
    for (let i = 0; i < h.length; i++) items.push(['h', i]);
    for (let i = 0; i < v.length; i++) items.push(['v', i]);
    rng.shuffle(items);
    // Verilenleri önce çıkar (hedefe kadar), sonra işaretleri.
    items.sort((a, b) => (a[0] === 'g' ? 0 : 1) - (b[0] === 'g' ? 0 : 1));
    let nGivens = N * N, nSigns = totalSigns;
    const ok = () => {
      const rels = relationsOf(N, h, v);
      // Sağlam (yalnızca zorunlu) çıkarımlarla tam çözülmesi tek çözümü zaten garanti eder;
      // tam arama ile sayım ayrıca verifyLevel'da yapılır.
      return logicalSolve(N, givens, rels, p.maxTier).solved;
    };
    for (const [kind, i] of items) {
      if (kind === 'g') {
        if (nGivens <= p.targetGivens) continue;
        const old = givens[i]; givens[i] = 0;
        if (ok()) nGivens--; else givens[i] = old;
      } else {
        if (nSigns <= minSigns) continue;
        const arr = kind === 'h' ? h : v;
        const old = arr[i]; arr[i] = '.';
        if (ok()) nSigns--; else arr[i] = old;
      }
    }
    if (nGivens > p.targetGivens) continue;
    const rels = relationsOf(N, h, v);
    const res = logicalSolve(N, givens, rels, p.maxTier);
    if (!res.solved) continue;
    if (p.needTier2 && res.tier < 2) continue;
    if (res.signSteps < p.minSignSteps) continue;
    return {
      size: N,
      puzzle: stringifyPuzzle(N, givens, h, v),
      solution: sol.join(''),
      givens: nGivens,
      signs: nSigns,
      tier: res.tier,
    };
  }
  throw new Error(`Futoshiki üretilemedi: ${difficulty} #${index + 1}`);
}

// ---------------------------------------------------------------------------
// Doğrulama: çözüm kurallara uyar + verilenlerle tutarlı + tam aramada TEK çözüm

export function verifyLevel(level) {
  if (!level || typeof level.puzzle !== 'string' || typeof level.solution !== 'string') return 'Eksik alan';
  const { N, givens, h, v } = parsePuzzle(level.puzzle);
  if (N < 3 || N > 9 || givens.length !== N * N) return 'Izgara boyutu geçersiz';
  if (level.size !== undefined && level.size !== N) return 'size alanı uyuşmuyor';
  if (h.length !== N * (N - 1) || v.length !== (N - 1) * N) return 'İşaret uzunluğu geçersiz';
  if (h.some((x) => !'.<>'.includes(x)) || v.some((x) => !'.^v'.includes(x))) return 'Geçersiz işaret karakteri';
  if (givens.some((x) => !(Number.isInteger(x) && x >= 0 && x <= N))) return 'Geçersiz verilen rakam';
  const sol = parseSolution(level.solution);
  if (sol.length !== N * N || sol.some((x) => !(Number.isInteger(x) && x >= 1 && x <= N))) return 'Çözüm geçersiz';
  for (let r = 0; r < N; r++) {
    if (new Set(sol.slice(r * N, r * N + N)).size !== N) return `Çözümde ${r + 1}. satır hatalı`;
    if (new Set(Array.from({ length: N }, (_, j) => sol[j * N + r])).size !== N) return `Çözümde ${r + 1}. sütun hatalı`;
  }
  const rels = relationsOf(N, h, v);
  for (const { lo, hi } of rels) if (!(sol[lo] < sol[hi])) return 'Çözüm bir işareti ihlal ediyor';
  if (givens.some((x, i) => x && x !== sol[i])) return 'Verilenler çözümle uyuşmuyor';
  const n = countSolutions(N, givens, rels, 2);
  if (n !== 1) return `Çözüm sayısı ${n} (1 olmalı)`;
  if (!logicalSolve(N, givens, rels, 2).solved) return 'Tahmin yapmadan çözülemiyor';
  return null;
}
