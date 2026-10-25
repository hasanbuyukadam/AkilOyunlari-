// Kare Karalamaca (Nonogram) mantığı — hem tarayıcıda hem Node'da çalışır, DOM kullanmaz.
//
// Level biçimi:
//   { w, h, title, puzzle, solution, score }
//   puzzle   : "satır ipuçları|sütun ipuçları" — çizgiler ',' ile, bloklar '.' ile ayrılır
//              (boş çizgi "0"). Örn. "1.1,5,5,3,1|2,4,4,4,2"
//   solution : satırlar '/' ile ayrılmış 0/1 metni.
//
// Hücre durumları (çözücüde): -1 bilinmiyor, 0 boş, 1 dolu.

import { PICTURES } from './pictures.js';

// ---------- Ortak yardımcılar ----------

/** Bir çizginin (0/1 dizisi) blok uzunlukları. Boş çizgi → []. */
export function runsOf(line) {
  const out = [];
  let run = 0;
  for (const v of line) {
    if (v === 1) run++;
    else if (run) { out.push(run); run = 0; }
  }
  if (run) out.push(run);
  return out;
}

export function cluesOf(grid, w, h) {
  const rows = [], cols = [];
  for (let r = 0; r < h; r++) rows.push(runsOf(grid.slice(r * w, r * w + w)));
  for (let c = 0; c < w; c++) cols.push(runsOf(Array.from({ length: h }, (_, r) => grid[r * w + c])));
  return { rows, cols };
}

const clueText = (list) => list.map((cl) => (cl.length ? cl.join('.') : '0')).join(',');
const parseClues = (s) => s.split(',').map((t) => (t === '0' ? [] : t.split('.').map(Number)));

export function encodePuzzle(rows, cols) { return `${clueText(rows)}|${clueText(cols)}`; }
export function parsePuzzle(puzzle) {
  const [r, c] = puzzle.split('|');
  return { rows: parseClues(r), cols: parseClues(c) };
}
export const encodeSolution = (grid, w) => {
  const rows = [];
  for (let i = 0; i < grid.length; i += w) rows.push(grid.slice(i, i + w).join(''));
  return rows.join('/');
};
export const parseSolution = (s) => [...s.replace(/\//g, '')].map(Number);

/** Seviye nesnesinden çözüm için gereken her şey. */
export function parseLevel(level) {
  const { rows, cols } = parsePuzzle(level.puzzle);
  return { w: level.w, h: level.h, rows, cols, solution: parseSolution(level.solution) };
}

export const lineCells = (w, h, kind, i) =>
  kind === 'row' ? Array.from({ length: w }, (_, c) => i * w + c) : Array.from({ length: h }, (_, r) => r * w + i);

// ---------- Çizgi çözücü (mantık motoru) ----------

/**
 * Tek çizgi için kesin sonuçlar: ipucu ve mevcut bilgiyle uyumlu TÜM yerleşimlerde
 * dolu (ya da boş) olan hücreler. Çelişki varsa null.
 */
export function solveLine(clue, line) {
  const n = line.length, k = clue.length;
  // ok[i][j]: i. hücreden itibaren j. bloktan sonrakiler yerleşebilir mi?
  const ok = Array.from({ length: n + 2 }, () => new Int8Array(k + 1));
  // Önceden hesap: [i, i+len) aralığında boş (0) hücre var mı?
  const zeroPrefix = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) zeroPrefix[i + 1] = zeroPrefix[i] + (line[i] === 0 ? 1 : 0);
  const noZero = (a, b) => zeroPrefix[b] - zeroPrefix[a] === 0;
  for (let i = n + 1; i >= 0; i--) {
    for (let j = k; j >= 0; j--) {
      if (i >= n) { ok[i][j] = j === k ? 1 : 0; continue; }
      let v = 0;
      if (line[i] !== 1 && ok[i + 1][j]) v = 1;
      if (!v && j < k) {
        const len = clue[j], end = i + len;
        if (end <= n && noZero(i, end) && (end === n || line[end] !== 1) && ok[Math.min(n + 1, end + 1)][j + 1]) v = 1;
      }
      ok[i][j] = v;
    }
  }
  if (!ok[0][0]) return null;
  const canFill = new Uint8Array(n), canEmpty = new Uint8Array(n);
  const reach = Array.from({ length: n + 2 }, () => new Uint8Array(k + 1));
  reach[0][0] = 1;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= k; j++) {
      if (!reach[i][j] || !ok[i][j]) continue;
      if (line[i] !== 1 && ok[i + 1][j]) { canEmpty[i] = 1; reach[i + 1][j] = 1; }
      if (j < k) {
        const len = clue[j], end = i + len;
        if (end <= n && noZero(i, end) && (end === n || line[end] !== 1)) {
          const nx = Math.min(n + 1, end + 1);
          if (ok[nx][j + 1]) {
            for (let t = i; t < end; t++) canFill[t] = 1;
            if (end < n) canEmpty[end] = 1;
            reach[nx][j + 1] = 1;
          }
        }
      }
    }
  }
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    if (canFill[i] && canEmpty[i]) out[i] = -1;
    else if (canFill[i]) out[i] = 1;
    else if (canEmpty[i]) out[i] = 0;
    else return null;
  }
  return out;
}

/**
 * Yalnızca satır/sütun mantığıyla çöz. Sonuç: { grid, solved, contradiction, rounds }.
 * rounds: her turda tüm çizgiler bir kez ele alınır; tur sayısı zorluk ölçüsüdür.
 */
export function lineSolve(rows, cols, w, h, start) {
  const grid = start ? start.slice() : new Array(w * h).fill(-1);
  const lines = [];
  for (let r = 0; r < h; r++) lines.push(['row', r, rows[r]]);
  for (let c = 0; c < w; c++) lines.push(['col', c, cols[c]]);
  let rounds = 0, changed = true, work = 0;
  while (changed) {
    changed = false;
    rounds++;
    const snapshot = grid.slice(); // tur içi paralel: önceki turun bilgisi
    for (const [kind, i, clue] of lines) {
      const cells = lineCells(w, h, kind, i);
      const cur = cells.map((c) => snapshot[c]);
      if (!cur.includes(-1)) {
        if (runsOf(cur).join() !== clue.join()) return { grid, solved: false, contradiction: true, rounds };
        continue;
      }
      const res = solveLine(clue, cells.map((c) => grid[c]));
      work++;
      if (!res) return { grid, solved: false, contradiction: true, rounds };
      cells.forEach((c, t) => {
        if (res[t] !== -1 && grid[c] === -1) { grid[c] = res[t]; changed = true; }
      });
    }
  }
  return { grid, solved: !grid.includes(-1), contradiction: false, rounds: rounds - 1, work };
}

/**
 * Akıllı ipucu: mevcut (doğru) bilgiden yola çıkarak, tek bir çizgide yeni kesin
 * sonuç veren ilk adımı bulur. known: -1/0/1 dizisi.
 * Döner: { kind, index, clue, filled:[hücre], empty:[hücre], reason } ya da null.
 */
export function nextDeduction(rows, cols, w, h, known) {
  let best = null;
  const consider = (kind, i, clue) => {
    const cells = lineCells(w, h, kind, i);
    const cur = cells.map((c) => known[c]);
    if (!cur.includes(-1)) return;
    const res = solveLine(clue, cur);
    if (!res) return;
    const filled = [], empty = [];
    cells.forEach((c, t) => {
      if (cur[t] === -1 && res[t] === 1) filled.push(c);
      if (cur[t] === -1 && res[t] === 0) empty.push(c);
    });
    // Boş (0) çizgiler çok bariz olduğu için en sona bırakılır.
    const gain = clue.length ? filled.length * 2 + empty.length : empty.length * 0.1;
    if (!gain) return;
    if (!best || gain > best.gain) best = { kind, index: i, clue, cells, cur, res, filled, empty, gain };
  };
  for (let r = 0; r < h; r++) consider('row', r, rows[r]);
  for (let c = 0; c < w; c++) consider('col', c, cols[c]);
  if (!best) return null;
  best.reason = explain(best);
  return best;
}

function explain({ clue, cur, filled }) {
  const n = cur.length;
  const sum = clue.reduce((a, b) => a + b, 0);
  const minLen = sum + Math.max(0, clue.length - 1);
  const knownCount = cur.filter((v) => v !== -1).length;
  const filledNow = cur.filter((v) => v === 1).length;
  const clueStr = clue.length ? clue.join(' ') : '0';
  if (!clue.length) return 'ipucu 0: bu çizgide hiç dolu hücre yok';
  if (minLen === n && knownCount === 0) return `ipucu (${clueStr}) bloklar arasında birer boşlukla çizgiyi tam dolduruyor`;
  if (filledNow === sum) return `ipucundaki (${clueStr}) bütün dolu hücreler zaten yerinde; kalan hücreler boş olmalı`;
  if (knownCount === 0 && filled.length) {
    return `ipucu (${clueStr}) en az ${minLen} hücre kaplıyor, ${n} hücrelik çizgide yalnızca ${n - minLen} hücre oynama payı kalıyor; bloklar en sola ve en sağa itildiğinde çakışan hücreler her durumda dolu`;
  }
  return `ipucunu (${clueStr}) mevcut dolu ve boş hücrelerle yerleştirmenin tüm olası yollarında bu hücreler aynı kalıyor`;
}

// ---------- Tam arama: çözüm sayacı (mantık motorundan bağımsız) ----------

/** Bir satır ipucu için tüm yerleşimler (bit maskesi olarak). */
function rowPatterns(clue, w) {
  const out = [];
  const rec = (j, pos, mask) => {
    if (j === clue.length) { out.push(mask); return; }
    let rest = 0;
    for (let t = j + 1; t < clue.length; t++) rest += clue[t] + 1;
    for (let s = pos; s + clue[j] + rest <= w; s++) {
      let m = mask;
      for (let t = 0; t < clue[j]; t++) m |= 1 << (s + t);
      rec(j + 1, s + clue[j] + 1, m);
    }
  };
  rec(0, 0, 0);
  return out;
}

/**
 * Satır satır, her satırın tüm yerleşimlerini deneyen tam arama. Sütun ipuçlarıyla
 * önek tutarlılığı ve kalan satır sayısının yetip yetmediği kontrol edilir.
 * limit kadar çözüm bulunca durur.
 */
export function countSolutions(rows, cols, w, h, limit = 2) {
  const pats = rows.map((cl) => rowPatterns(cl, w));
  // need[c][b]: b. bloktan (dahil) itibaren sütunda gereken en az hücre
  const need = cols.map((cl) => {
    const a = new Array(cl.length + 1).fill(0);
    for (let b = cl.length - 1; b >= 0; b--) a[b] = cl[b] + (b < cl.length - 1 ? 1 : 0) + a[b + 1];
    return a;
  });
  const blk = new Int32Array(w), run = new Int32Array(w);
  let count = 0;
  const rec = (r) => {
    if (count >= limit) return;
    if (r === h) {
      for (let c = 0; c < w; c++) {
        const done = run[c] ? (run[c] === cols[c][blk[c]] && blk[c] + 1 === cols[c].length) : blk[c] === cols[c].length;
        if (!done) return;
      }
      count++;
      return;
    }
    const left = h - r - 1; // bu satırdan sonra kalan satır
    for (const m of pats[r]) {
      const sb = blk.slice(), sr = run.slice();
      let good = true;
      for (let c = 0; c < w && good; c++) {
        const cl = cols[c];
        if (m & (1 << c)) {
          if (run[c] === 0) { if (blk[c] >= cl.length) good = false; else run[c] = 1; }
          else if (++run[c] > cl[blk[c]]) good = false;
          if (good) {
            const remainCur = cl[blk[c]] - run[c];
            const after = blk[c] + 1 < cl.length ? 1 + need[c][blk[c] + 1] : 0;
            if (remainCur + after > left) good = false;
          }
        } else {
          if (run[c] > 0) {
            if (run[c] !== cl[blk[c]]) good = false;
            else { blk[c]++; run[c] = 0; }
          }
          if (good && need[c][blk[c]] > left) good = false;
        }
      }
      if (good) rec(r + 1);
      blk.set(sb); run.set(sr);
      if (count >= limit) return;
    }
  };
  rec(0);
  return count;
}

// ---------- Üretici ----------

const SIZE_GROUPS = { easy: [5, 6, 7, 8], medium: [10], hard: [12, 13, 14, 15] };

function pictureGrid(pic) {
  const h = pic.rows.length, w = pic.rows[0].length;
  for (const row of pic.rows) {
    if (row.length !== w || /[^#.]/.test(row)) throw new Error(`Resim hatalı: ${pic.title}`);
  }
  return { w, h, grid: pic.rows.flatMap((row) => [...row].map((ch) => (ch === '#' ? 1 : 0))) };
}

const unknownCount = (grid, w, h) => {
  const { rows, cols } = cluesOf(grid, w, h);
  const res = lineSolve(rows, cols, w, h);
  return res.grid.filter((v) => v === -1).length;
};

/**
 * Resmi satır/sütun mantığıyla çözülebilir hale getirir: gerekirse en az sayıda pikseli
 * (açgözlü olarak) değiştirir; komşularıyla uyumlu değişiklikler tercih edilir.
 */
export function makeLineSolvable(grid, w, h, maxFlips = 12) {
  let g = grid.slice();
  const flips = [];
  let unk = unknownCount(g, w, h);
  while (unk > 0) {
    if (flips.length >= maxFlips) return null;
    let best = null;
    for (let i = 0; i < w * h; i++) {
      const r = Math.floor(i / w), c = i % w;
      g[i] ^= 1;
      const u = unknownCount(g, w, h);
      g[i] ^= 1;
      // Komşuluk uyumu: yeni değere sahip 8-komşu sayısı (resmi bozmamak için).
      let agree = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        const v = rr < 0 || cc < 0 || rr >= h || cc >= w ? 0 : g[rr * w + cc];
        if (v === (g[i] ^ 1)) agree++;
      }
      const score = u * 10 - agree;
      if (!best || score < best.score) best = { i, u, score };
    }
    if (best.u >= unk && best.u > 0 && flips.length > 0 && best.u === unk) return null;
    g[best.i] ^= 1;
    flips.push(best.i);
    unk = best.u;
  }
  return { grid: g, flips };
}

const tierCache = new Map();

/** Bir zorluktaki 20 resmi hazırla: düzelt, puanla, boyut grubu içinde zorluğa göre sırala. */
function buildTier(difficulty) {
  if (tierCache.has(difficulty)) return tierCache.get(difficulty);
  const groups = SIZE_GROUPS[difficulty];
  const prepared = PICTURES[difficulty].map((pic) => {
    const { w, h, grid } = pictureGrid(pic);
    const fixed = makeLineSolvable(grid, w, h);
    if (!fixed) throw new Error(`Resim mantıkla çözülebilir yapılamadı: ${pic.title}`);
    const { rows, cols } = cluesOf(fixed.grid, w, h);
    const res = lineSolve(rows, cols, w, h);
    return { title: pic.title, w, h, grid: fixed.grid, flips: fixed.flips.length, rows, cols, score: res.rounds * 100 + res.work };
  });
  const out = [];
  for (const size of groups) {
    out.push(...prepared.filter((p) => p.w === size).sort((a, b) => a.score - b.score));
  }
  if (out.length !== prepared.length) throw new Error(`Boyut grupları eksik: ${difficulty}`);
  tierCache.set(difficulty, out);
  return out;
}

export function generateLevel(rng, difficulty, index /* , total */) {
  const p = buildTier(difficulty)[index];
  return {
    w: p.w,
    h: p.h,
    title: p.title,
    puzzle: encodePuzzle(p.rows, p.cols),
    solution: encodeSolution(p.grid, p.w),
    score: p.score,
  };
}

// ---------- Doğrulayıcı ----------

export function verifyLevel(level) {
  const { w, h } = level;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 2 || h < 2 || w > 20 || h > 20) return 'Geçersiz boyut';
  let rows, cols, sol;
  try { ({ rows, cols } = parsePuzzle(level.puzzle)); sol = parseSolution(level.solution); }
  catch { return 'Bulmaca okunamadı'; }
  if (rows.length !== h || cols.length !== w) return 'İpucu sayısı boyutla uyuşmuyor';
  if (sol.length !== w * h || sol.some((v) => v !== 0 && v !== 1)) return 'Çözüm biçimi hatalı';
  if (level.solution.split('/').some((r) => r.length !== w)) return 'Çözüm satır uzunluğu hatalı';
  for (const cl of [...rows, ...cols]) if (cl.some((x) => !Number.isInteger(x) || x < 1)) return 'İpucu hatalı';
  const actual = cluesOf(sol, w, h);
  if (encodePuzzle(actual.rows, actual.cols) !== level.puzzle) return 'Çözüm ipuçlarıyla uyuşmuyor';
  if (!sol.includes(1)) return 'Boş resim';
  const n = countSolutions(rows, cols, w, h, 2);
  if (n !== 1) return `Çözüm sayısı ${n} (1 olmalı)`;
  const ls = lineSolve(rows, cols, w, h);
  if (!ls.solved) return 'Satır/sütun mantığıyla tek başına çözülemiyor';
  return null;
}
