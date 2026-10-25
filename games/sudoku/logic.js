// Sudoku mantığı — hem tarayıcıda hem Node'da (level üretici/doğrulayıcı) çalışır.
// Bölgeli boyutlar: 4×4 (2×2 bölge), 6×6 (2 satır × 3 sütun bölge), 9×9 (3×3 bölge).
// Izgara: n*n elemanlı sayı dizisi, 0 = boş. Levellerde n*n karakterlik metin, '.' = boş.

const bit = (v) => 1 << v;
const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const lowestDigit = (m) => 31 - Math.clz32(m & -m);
const digitsOf = (m) => { const out = []; for (; m; m &= m - 1) out.push(lowestDigit(m)); return out; };

export const SIZES = { 4: [2, 2], 6: [2, 3], 9: [3, 3] };

const cache = new Map();
/** Boyuta göre geometri: satır/sütun/bölge fonksiyonları, birimler ve komşular. */
export function geometry(n = 9, br = SIZES[n]?.[0], bc = SIZES[n]?.[1]) {
  const key = `${n}:${br}:${bc}`;
  if (cache.has(key)) return cache.get(key);
  const N = n * n;
  const row = (c) => Math.floor(c / n);
  const col = (c) => c % n;
  const box = (c) => Math.floor(row(c) / br) * (n / bc) + Math.floor(col(c) / bc);
  const units = [];
  for (let i = 0; i < n; i++) units.push(Array.from({ length: n }, (_, j) => i * n + j));
  for (let i = 0; i < n; i++) units.push(Array.from({ length: n }, (_, j) => j * n + i));
  for (let b = 0; b < n; b++) {
    const cells = [];
    for (let c = 0; c < N; c++) if (box(c) === b) cells.push(c);
    units.push(cells);
  }
  const peers = Array.from({ length: N }, (_, c) => {
    const s = [];
    for (let i = 0; i < N; i++) {
      if (i !== c && (row(i) === row(c) || col(i) === col(c) || box(i) === box(c))) s.push(i);
    }
    return s;
  });
  let all = 0;
  for (let d = 1; d <= n; d++) all |= bit(d);
  const g = { n, br, bc, N, row, col, box, units, peers, all };
  cache.set(key, g);
  return g;
}

export const geomOf = (level) => {
  const n = level.size ?? 9;
  return geometry(n, level.boxR ?? SIZES[n][0], level.boxC ?? SIZES[n][1]);
};

export const parse = (str) => [...str].map((ch) => (ch === '.' || ch === '0' ? 0 : Number(ch)));
export const stringify = (grid) => grid.map((v) => (v ? String(v) : '.')).join('');

/** Birim adı (ipucu metni için): "3. satır", "2. sütun", "4. bölge". */
export function unitName(G, u) {
  const i = u % G.n;
  return `${i + 1}. ${['satır', 'sütun', 'bölge'][Math.floor(u / G.n)]}`;
}
export const cellName = (G, c) => `${G.row(c) + 1}. satır, ${G.col(c) + 1}. sütun`;

function candidatesOf(G, grid) {
  const cand = new Array(G.N).fill(0);
  for (let c = 0; c < G.N; c++) {
    if (grid[c]) continue;
    let m = G.all;
    for (const p of G.peers[c]) if (grid[p]) m &= ~bit(grid[p]);
    cand[c] = m;
  }
  return cand;
}

/**
 * TAM arama ile çözüm sayısı (limit'e ulaşınca durur; tek çözüm kontrolü için limit=2).
 * Ön koşul: ızgarada çakışma yok. Hiçbir sezgisel teknik kullanılmaz.
 */
export function countSolutions(G, grid, limit = 2) {
  const g = grid.slice();
  let count = 0;
  const rec = () => {
    let best = -1, bestMask = 0, bestN = 99;
    for (let c = 0; c < G.N; c++) {
      if (g[c]) continue;
      let m = G.all;
      for (const p of G.peers[c]) if (g[p]) m &= ~bit(g[p]);
      const k = popcount(m);
      if (k === 0) return;
      if (k < bestN) { best = c; bestMask = m; bestN = k; if (k === 1) break; }
    }
    if (best === -1) { count++; return; }
    for (let m = bestMask; m && count < limit; m &= m - 1) {
      g[best] = lowestDigit(m);
      rec();
    }
    g[best] = 0;
  };
  rec();
  return count;
}

export function hasConflict(G, grid) {
  for (let c = 0; c < G.N; c++) {
    if (grid[c] && G.peers[c].some((p) => grid[p] === grid[c])) return true;
  }
  return false;
}

/** Rastgele dolu, geçerli bir ızgara. */
export function randomFullGrid(G, rng) {
  const g = new Array(G.N).fill(0);
  const digits = Array.from({ length: G.n }, (_, i) => i + 1);
  const fill = (c) => {
    if (c === G.N) return true;
    for (const d of rng.shuffle(digits.slice())) {
      if (G.peers[c].some((p) => g[p] === d)) continue;
      g[c] = d;
      if (fill(c + 1)) return true;
    }
    g[c] = 0;
    return false;
  };
  fill(0);
  return g;
}

// ---- İnsan mantığıyla çözüm (zorluk derecelendirme ve ipucu için) ----
// Kademe 1: tek aday (naked single) ve gizli tek (hidden single)
// Kademe 2: işaretleme, kutu-satır eleme, açık çift/üçlü, gizli çift, X-Wing

function findSingle(G, grid, cand) {
  for (let c = 0; c < G.N; c++) {
    if (!grid[c] && popcount(cand[c]) === 1) {
      return { cell: c, value: lowestDigit(cand[c]), reason: 'naked' };
    }
  }
  for (let u = 0; u < G.units.length; u++) {
    for (let d = 1; d <= G.n; d++) {
      let spot = -1, k = 0;
      for (const c of G.units[u]) {
        if (grid[c] === d) { k = -1; break; }
        if (!grid[c] && cand[c] & bit(d)) { spot = c; k++; }
      }
      if (k === 1) return { cell: spot, value: d, reason: 'hidden', unit: u };
    }
  }
  return null;
}

/**
 * Bir ileri teknik adımı bulur (gerçekten aday eleyen ilk adım).
 * Dönüş: { tech, text, cells (desen hücreleri), elims: [[hücre, maske], ...] } ya da null.
 */
function* advancedSteps(G, grid, cand) {
  const { n, units, row, col, box } = G;
  const collect = (targets, mask, skip) => {
    const out = [];
    for (const c of targets) if (!grid[c] && !skip.includes(c) && cand[c] & mask) out.push([c, cand[c] & mask]);
    return out;
  };
  // İşaretleme (bölge -> satır/sütun) ve kutu-satır eleme (satır/sütun -> bölge)
  for (let u = 0; u < units.length; u++) {
    for (let d = 1; d <= n; d++) {
      const cells = units[u].filter((c) => !grid[c] && cand[c] & bit(d));
      if (cells.length < 2) continue;
      if (u >= 2 * n) {
        const sameRow = cells.every((c) => row(c) === row(cells[0]));
        const sameCol = cells.every((c) => col(c) === col(cells[0]));
        const t = sameRow ? row(cells[0]) : sameCol ? n + col(cells[0]) : -1;
        if (t < 0) continue;
        const elims = collect(units[t], bit(d), cells);
        if (elims.length) {
          yield { tech: 'İşaretleme', cells, elims,
            text: `${unitName(G, u)} içinde ${d} rakamı yalnızca ${unitName(G, t)} üzerinde olabilir; bu yüzden ${unitName(G, t)} boyunca diğer hücrelerden ${d} elenir.` };
        }
      } else if (cells.every((c) => box(c) === box(cells[0]))) {
        const t = 2 * n + box(cells[0]);
        const elims = collect(units[t], bit(d), cells);
        if (elims.length) {
          yield { tech: 'Kutu-satır eleme', cells, elims,
            text: `${unitName(G, u)} içinde ${d} rakamı yalnızca ${unitName(G, t)} içinde olabilir; bu yüzden bölgenin diğer hücrelerinden ${d} elenir.` };
        }
      }
    }
  }
  // Açık çift ve gizli çift
  for (let u = 0; u < units.length; u++) {
    const empty = units[u].filter((c) => !grid[c]);
    for (let i = 0; i < empty.length; i++) {
      const m = cand[empty[i]];
      if (popcount(m) !== 2) continue;
      for (let j = i + 1; j < empty.length; j++) {
        if (cand[empty[j]] !== m) continue;
        const pair = [empty[i], empty[j]];
        const elims = collect(empty, m, pair);
        if (elims.length) {
          const [a, b] = digitsOf(m);
          yield { tech: 'Açık çift', cells: pair, elims,
            text: `${unitName(G, u)} içinde iki hücre yalnızca ${a} ve ${b} alabilir; bu iki rakam o hücrelere ait olduğundan ${unitName(G, u)} içindeki diğer hücrelerden elenir.` };
        }
      }
    }
    const where = [];
    for (let d = 1; d <= n; d++) where[d] = empty.filter((c) => cand[c] & bit(d));
    for (let a = 1; a <= n; a++) {
      if (where[a].length !== 2) continue;
      for (let b = a + 1; b <= n; b++) {
        if (where[b].length !== 2 || where[b][0] !== where[a][0] || where[b][1] !== where[a][1]) continue;
        const keep = bit(a) | bit(b);
        const elims = where[a].filter((c) => cand[c] & ~keep).map((c) => [c, cand[c] & ~keep]);
        if (elims.length) {
          yield { tech: 'Gizli çift', cells: where[a], elims,
            text: `${unitName(G, u)} içinde ${a} ve ${b} rakamları yalnızca aynı iki hücreye girebilir; bu hücrelerdeki diğer adaylar elenir.` };
        }
      }
    }
  }
  // Açık üçlü
  for (let u = 0; u < units.length; u++) {
    const empty = units[u].filter((c) => !grid[c] && popcount(cand[c]) <= 3);
    const allEmpty = units[u].filter((c) => !grid[c]);
    for (let i = 0; i < empty.length; i++) {
      for (let j = i + 1; j < empty.length; j++) {
        for (let k = j + 1; k < empty.length; k++) {
          const m = cand[empty[i]] | cand[empty[j]] | cand[empty[k]];
          if (popcount(m) !== 3) continue;
          const trio = [empty[i], empty[j], empty[k]];
          const elims = collect(allEmpty, m, trio);
          if (elims.length) {
            yield { tech: 'Açık üçlü', cells: trio, elims,
              text: `${unitName(G, u)} içinde üç hücrenin adayları yalnızca ${digitsOf(m).join(', ')}; bu üç rakam o hücrelere ait olduğundan ${unitName(G, u)} içindeki diğer hücrelerden elenir.` };
          }
        }
      }
    }
  }
  // X-Wing (satır ve sütun tabanlı)
  for (const byRow of [true, false]) {
    for (let d = 1; d <= n; d++) {
      const pos = [];
      for (let i = 0; i < n; i++) {
        const u = units[byRow ? i : n + i];
        pos.push(u.filter((c) => !grid[c] && cand[c] & bit(d)));
      }
      const other = byRow ? col : row;
      for (let a = 0; a < n; a++) {
        if (pos[a].length !== 2) continue;
        for (let b = a + 1; b < n; b++) {
          if (pos[b].length !== 2) continue;
          const x1 = other(pos[a][0]), x2 = other(pos[a][1]);
          if (other(pos[b][0]) !== x1 || other(pos[b][1]) !== x2) continue;
          const cells = [...pos[a], ...pos[b]];
          const t1 = byRow ? n + x1 : x1, t2 = byRow ? n + x2 : x2;
          const elims = [...collect(units[t1], bit(d), cells), ...collect(units[t2], bit(d), cells)];
          if (elims.length) {
            const kind = byRow ? 'satır' : 'sütun';
            yield { tech: 'X-Wing', cells, elims,
              text: `${d} rakamı ${a + 1}. ve ${b + 1}. ${kind}da yalnızca aynı iki ${byRow ? 'sütun' : 'satır'}da olabilir (X-Wing); bu ${byRow ? 'sütun' : 'satır'}ların diğer hücrelerinden ${d} elenir.` };
          }
        }
      }
    }
  }
}

function findAdvanced(G, grid, cand) {
  for (const a of advancedSteps(G, grid, cand)) return a;
  return null;
}

function place(G, grid, cand, c, v) {
  grid[c] = v;
  cand[c] = 0;
  for (const p of G.peers[c]) cand[p] &= ~bit(v);
}

/**
 * Bulmacayı yalnızca maxTier'e kadar tekniklerle çözmeye çalışır.
 * Dönüş: { solved, tier, advancedSteps }.
 */
export function logicalSolve(G, puzzle, maxTier = 2) {
  const g = puzzle.slice();
  const cand = candidatesOf(G, g);
  let tier = 0, advancedSteps = 0;
  for (;;) {
    if (g.every((v) => v)) return { solved: true, tier, advancedSteps };
    const s = findSingle(G, g, cand);
    if (s) {
      if (!(cand[s.cell] & bit(s.value))) return { solved: false, tier, advancedSteps };
      place(G, g, cand, s.cell, s.value); tier = Math.max(tier, 1); continue;
    }
    if (maxTier >= 2) {
      const a = findAdvanced(G, g, cand);
      if (a) {
        for (const [c, m] of a.elims) cand[c] &= ~m;
        tier = 2; advancedSteps++;
        continue;
      }
    }
    return { solved: false, tier, advancedSteps };
  }
}

/**
 * Mevcut tahta için bir sonraki mantıklı adım (Akıllı İpucu boosterı).
 * Dönüş: { cell, value, reason, unit?, steps: [ileri teknik adımları] } ya da null.
 */
export function nextLogicalStep(G, grid) {
  const g = grid.slice();
  const cand = candidatesOf(G, g);
  const steps = [];
  for (let guard = 0; guard < 200; guard++) {
    const s = findSingle(G, g, cand);
    if (s) return { ...s, steps };
    // Tek başına yeni bir hamle açan ileri tekniği tercih et (ipucu ilgili olsun).
    let first = null;
    for (const a of advancedSteps(G, g, cand)) {
      first ??= a;
      const trial = cand.slice();
      for (const [c, m] of a.elims) trial[c] &= ~m;
      const t = findSingle(G, g, trial);
      if (t) return { ...t, steps: [...steps, a] };
    }
    if (!first) return null;
    for (const [c, m] of first.elims) cand[c] &= ~m;
    steps.push(first);
  }
  return null;
}

// ---- Level üretimi ----
// Kolay: 1–8 4×4, 9–20 6×6 · Orta: 1–5 zor 6×6, 6–20 9×9 (yalnızca tekli teknikler)
// Zor: 9×9, ileri teknik (işaretleme, çiftler, ...) gerektirir. İpucu sayısı level ilerledikçe azalır.
function planFor(difficulty, index) {
  const lerp = (from, to, i, count) => Math.round(from - ((from - to) * i) / Math.max(1, count - 1));
  if (difficulty === 'easy') {
    if (index < 8) return { size: 4, target: [10, 10, 8, 8, 8, 8, 6, 6][index], maxTier: 1, needTier: 1 };
    return { size: 6, target: [22, 22, 20, 20, 20, 18, 18, 18, 16, 16, 16, 14][index - 8], maxTier: 1, needTier: 1 };
  }
  if (difficulty === 'medium') {
    if (index < 5) return { size: 6, target: [14, 12, 12, 12, 10][index], maxTier: 1, needTier: 1 };
    return { size: 9, target: lerp(38, 28, index - 5, 15), maxTier: 1, needTier: 1 };
  }
  return { size: 9, target: lerp(30, 24, index, 20), maxTier: 2, needTier: 2, minAdvanced: 1 + Math.floor(index / 5) };
}

export function generateLevel(rng, difficulty, index, total) {
  const plan = planFor(difficulty, index);
  const G = geometry(plan.size);
  const { N } = G;
  const half = Math.floor(N / 2);
  for (let attempt = 0; attempt < 2000; attempt++) {
    const solution = randomFullGrid(G, rng);
    const puzzle = solution.slice();
    let givens = N;
    // 180° simetrik çiftler (tek kenarlı ızgarada orta hücre tek başına)
    const order = rng.shuffle(Array.from({ length: half + (N % 2) }, (_, i) => i));
    for (const c of order) {
      if (givens <= plan.target) break;
      const pair = c === N - 1 - c ? [c] : [c, N - 1 - c];
      if (givens - pair.length < plan.target - 1) continue;
      pair.forEach((p) => { puzzle[p] = 0; });
      const ok = countSolutions(G, puzzle, 2) === 1 && logicalSolve(G, puzzle, plan.maxTier).solved;
      if (ok) givens -= pair.length;
      else pair.forEach((p) => { puzzle[p] = solution[p]; });
    }
    if (givens !== plan.target) continue;
    const res = logicalSolve(G, puzzle, plan.maxTier);
    if (!res.solved || res.tier !== plan.needTier) continue;
    if (plan.minAdvanced && res.advancedSteps < plan.minAdvanced) continue;
    return {
      size: G.n, boxR: G.br, boxC: G.bc,
      puzzle: stringify(puzzle), solution: stringify(solution), givens, tier: res.tier,
    };
  }
  throw new Error(`Sudoku üretilemedi: ${difficulty} #${index + 1}`);
}

/** Bağımsız doğrulama: geçerli çözüm + bulmaca çözümle tutarlı + TAM aramayla TEK çözüm. */
export function verifyLevel(level) {
  const n = level.size;
  if (!SIZES[n]) return `Geçersiz boyut: ${n}`;
  if (level.boxR * level.boxC !== n || n % level.boxR || n % level.boxC) return 'Bölge boyutları geçersiz';
  const G = geometry(n, level.boxR, level.boxC);
  if (typeof level.puzzle !== 'string' || typeof level.solution !== 'string') return 'Bulmaca/çözüm metin değil';
  const re = new RegExp(`^[.1-${n}]{${G.N}}$`);
  if (!re.test(level.puzzle) || !new RegExp(`^[1-${n}]{${G.N}}$`).test(level.solution)) return `Uzunluk/karakter hatası (${G.N} bekleniyor)`;
  const puzzle = parse(level.puzzle);
  const solution = parse(level.solution);
  // Çözüm her satır, sütun ve bölgede 1..n'i tam bir kez içermeli
  for (const u of G.units) {
    const seen = new Set(u.map((c) => solution[c]));
    if (seen.size !== n) return 'Çözüm geçerli bir Sudoku değil';
  }
  if (puzzle.some((v, i) => v && v !== solution[i])) return 'Bulmaca çözümle uyuşmuyor';
  if (hasConflict(G, puzzle)) return 'Bulmacada çakışma var';
  const cnt = countSolutions(G, puzzle, 2);
  if (cnt !== 1) return `Çözüm sayısı ${cnt} (1 olmalı)`;
  if (!logicalSolve(G, puzzle, 2).solved) return 'Tahmin yapmadan çözülemiyor';
  return null;
}
