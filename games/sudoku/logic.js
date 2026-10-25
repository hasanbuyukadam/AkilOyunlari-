// Sudoku mantığı — hem tarayıcıda hem Node'da (level üretici/doğrulayıcı) çalışır.
// Izgara: 81 elemanlı sayı dizisi, 0 = boş. Levellerde 81 karakterlik metin, '.' = boş.

const ALL = 0x3fe; // 1..9 bitleri
const bit = (v) => 1 << v;
const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const lowestDigit = (m) => 31 - Math.clz32(m & -m);

export const ROW = (c) => Math.floor(c / 9);
export const COL = (c) => c % 9;
export const BOX = (c) => Math.floor(ROW(c) / 3) * 3 + Math.floor(COL(c) / 3);

// 27 birim: 9 satır, 9 sütun, 9 kutu
export const UNITS = [];
for (let i = 0; i < 9; i++) UNITS.push(Array.from({ length: 9 }, (_, j) => i * 9 + j));
for (let i = 0; i < 9; i++) UNITS.push(Array.from({ length: 9 }, (_, j) => j * 9 + i));
for (let b = 0; b < 9; b++) {
  const r0 = Math.floor(b / 3) * 3, c0 = (b % 3) * 3;
  UNITS.push(Array.from({ length: 9 }, (_, j) => (r0 + Math.floor(j / 3)) * 9 + c0 + (j % 3)));
}
const UNIT_NAMES = ['satırda', 'sütunda', 'kutuda'];

export const PEERS = Array.from({ length: 81 }, (_, c) => {
  const s = new Set();
  for (let i = 0; i < 81; i++) {
    if (i !== c && (ROW(i) === ROW(c) || COL(i) === COL(c) || BOX(i) === BOX(c))) s.add(i);
  }
  return [...s];
});

export const parse = (str) => [...str].map((ch) => (ch === '.' || ch === '0' ? 0 : Number(ch)));
export const stringify = (grid) => grid.map((v) => (v ? String(v) : '.')).join('');

function candidatesOf(grid) {
  const cand = new Array(81).fill(0);
  for (let c = 0; c < 81; c++) {
    if (grid[c]) continue;
    let m = ALL;
    for (const p of PEERS[c]) if (grid[p]) m &= ~bit(grid[p]);
    cand[c] = m;
  }
  return cand;
}

/** Ön koşul: ızgarada çakışma yok. limit'e ulaşınca durur (tek çözüm kontrolü için limit=2). */
export function countSolutions(grid, limit = 2) {
  const g = grid.slice();
  let count = 0;
  const rec = () => {
    let best = -1, bestMask = 0, bestN = 10;
    for (let c = 0; c < 81; c++) {
      if (g[c]) continue;
      let m = ALL;
      for (const p of PEERS[c]) if (g[p]) m &= ~bit(g[p]);
      const n = popcount(m);
      if (n === 0) return;
      if (n < bestN) { best = c; bestMask = m; bestN = n; if (n === 1) break; }
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

export function hasConflict(grid) {
  for (let c = 0; c < 81; c++) {
    if (grid[c] && PEERS[c].some((p) => grid[p] === grid[c])) return true;
  }
  return false;
}

/** Rastgele dolu, geçerli bir Sudoku ızgarası. */
export function randomFullGrid(rng) {
  const g = new Array(81).fill(0);
  const fill = (c) => {
    if (c === 81) return true;
    const digits = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const d of digits) {
      if (PEERS[c].some((p) => g[p] === d)) continue;
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
// Kademe 2: işaretleme/kutu-satır eleme, açık çiftler, gizli çiftler

function findSingle(grid, cand) {
  for (let c = 0; c < 81; c++) {
    if (!grid[c] && popcount(cand[c]) === 1) {
      return { cell: c, value: lowestDigit(cand[c]), reason: 'naked' };
    }
  }
  for (let u = 0; u < 27; u++) {
    for (let d = 1; d <= 9; d++) {
      let spot = -1, n = 0;
      for (const c of UNITS[u]) {
        if (grid[c] === d) { n = -1; break; }
        if (!grid[c] && cand[c] & bit(d)) { spot = c; n++; }
      }
      if (n === 1) return { cell: spot, value: d, reason: 'hidden', unit: UNIT_NAMES[Math.floor(u / 9)] };
    }
  }
  return null;
}

function applyTier2(grid, cand) {
  let changed = false;
  const elim = (c, mask) => {
    if (!grid[c] && cand[c] & mask) { cand[c] &= ~mask; changed = true; }
  };
  // İşaretleme (kutu -> satır/sütun) ve kutu-satır eleme (satır/sütun -> kutu)
  for (let u = 0; u < 27; u++) {
    for (let d = 1; d <= 9; d++) {
      const cells = UNITS[u].filter((c) => !grid[c] && cand[c] & bit(d));
      if (cells.length < 2) continue;
      const targets = [];
      if (u >= 18) {
        if (cells.every((c) => ROW(c) === ROW(cells[0]))) targets.push(UNITS[ROW(cells[0])]);
        if (cells.every((c) => COL(c) === COL(cells[0]))) targets.push(UNITS[9 + COL(cells[0])]);
      } else if (cells.every((c) => BOX(c) === BOX(cells[0]))) {
        targets.push(UNITS[18 + BOX(cells[0])]);
      }
      for (const t of targets) for (const c of t) if (!cells.includes(c)) elim(c, bit(d));
    }
  }
  for (const unit of UNITS) {
    const empty = unit.filter((c) => !grid[c]);
    // Açık çiftler
    for (let i = 0; i < empty.length; i++) {
      const m = cand[empty[i]];
      if (popcount(m) !== 2) continue;
      for (let j = i + 1; j < empty.length; j++) {
        if (cand[empty[j]] !== m) continue;
        for (const c of empty) if (c !== empty[i] && c !== empty[j]) elim(c, m);
      }
    }
    // Gizli çiftler
    const where = {};
    for (let d = 1; d <= 9; d++) where[d] = empty.filter((c) => cand[c] & bit(d));
    for (let a = 1; a <= 9; a++) {
      if (where[a].length !== 2) continue;
      for (let b = a + 1; b <= 9; b++) {
        if (where[b].length === 2 && where[b][0] === where[a][0] && where[b][1] === where[a][1]) {
          for (const c of where[a]) elim(c, ALL & ~(bit(a) | bit(b)));
        }
      }
    }
  }
  return changed;
}

function place(grid, cand, c, v) {
  grid[c] = v;
  cand[c] = 0;
  for (const p of PEERS[c]) cand[p] &= ~bit(v);
}

/** Bulmacayı yalnızca maxTier'e kadar tekniklerle çözmeye çalışır. */
export function logicalSolve(puzzle, maxTier = 2) {
  const g = puzzle.slice();
  const cand = candidatesOf(g);
  let tier = 0;
  for (;;) {
    if (g.every((v) => v)) return { solved: true, tier };
    const s = findSingle(g, cand);
    if (s) { place(g, cand, s.cell, s.value); tier = Math.max(tier, 1); continue; }
    if (maxTier >= 2 && applyTier2(g, cand)) { tier = 2; continue; }
    return { solved: false, tier };
  }
}

/** Mevcut tahta için bir sonraki mantıklı adım (ipucu boosterı). */
export function nextLogicalStep(grid) {
  const g = grid.slice();
  const cand = candidatesOf(g);
  let advanced = false;
  for (let guard = 0; guard < 50; guard++) {
    const s = findSingle(g, cand);
    if (s) return { ...s, advanced };
    if (!applyTier2(g, cand)) return null;
    advanced = true;
  }
  return null;
}

// ---- Level üretimi ----
// index: 0..total-1; zorluk level ilerledikçe artar (ipucu sayısı azalır).
const PLAN = {
  easy: { from: 42, to: 34, maxTier: 1, needTier: 1 },
  medium: { from: 33, to: 28, maxTier: 1, needTier: 1 },
  hard: { from: 30, to: 25, maxTier: 2, needTier: 2 },
};

export function generateLevel(rng, difficulty, index, total) {
  const plan = PLAN[difficulty];
  const target = Math.round(plan.from - ((plan.from - plan.to) * index) / Math.max(1, total - 1));
  for (let attempt = 0; attempt < 500; attempt++) {
    const solution = randomFullGrid(rng);
    const puzzle = solution.slice();
    let givens = 81;
    const order = rng.shuffle(Array.from({ length: 41 }, (_, i) => i)); // 180° simetrik çiftler
    for (const c of order) {
      if (givens <= target) break;
      const pair = c === 40 ? [40] : [c, 80 - c];
      if (givens - pair.length < target - 1) continue;
      pair.forEach((p) => { puzzle[p] = 0; });
      const ok = countSolutions(puzzle, 2) === 1 && logicalSolve(puzzle, plan.maxTier).solved;
      if (ok) givens -= pair.length;
      else pair.forEach((p) => { puzzle[p] = solution[p]; });
    }
    if (givens > target) continue;
    const { tier } = logicalSolve(puzzle, plan.maxTier);
    if (tier !== plan.needTier) continue;
    return { puzzle: stringify(puzzle), solution: stringify(solution), givens, tier };
  }
  throw new Error(`Sudoku üretilemedi: ${difficulty} #${index + 1}`);
}

/** Bağımsız doğrulama: geçerli çözüm + bulmaca çözümle tutarlı + TEK çözüm. */
export function verifyLevel(level) {
  const puzzle = parse(level.puzzle);
  const solution = parse(level.solution);
  if (puzzle.length !== 81 || solution.length !== 81) return 'Uzunluk 81 değil';
  if (solution.some((v) => !v) || hasConflict(solution)) return 'Çözüm geçerli bir Sudoku değil';
  if (puzzle.some((v, i) => v && v !== solution[i])) return 'Bulmaca çözümle uyuşmuyor';
  if (hasConflict(puzzle)) return 'Bulmacada çakışma var';
  const n = countSolutions(puzzle, 2);
  if (n !== 1) return `Çözüm sayısı ${n} (1 olmalı)`;
  if (!logicalSolve(puzzle, 2).solved) return 'Tahmin yapmadan çözülemiyor';
  return null;
}
