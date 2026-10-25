// Apartmanlar (Skyscrapers) mantığı — hem tarayıcıda hem Node'da çalışır, DOM kullanmaz.
//
// Level biçimi:
//   size: n
//   puzzle: "ÜST|ALT|SOL|SAĞ|IZGARA"  (her kenar n karakter, ızgara n*n karakter; '.' = boş)
//           ÜST/ALT soldan sağa sütunlar, SOL/SAĞ yukarıdan aşağı satırlar.
//   solution: n*n rakam
//
// Teknik kademeleri (zorluk ve Akıllı İpucu için):
//   1: kenar ipucu 1 / n, kenar sınırı, tek aday, gizli tek
//   2: dizilim analizi — bir satır/sütunun ipuçlarına uyan tüm dizilimler denenerek aday eleme

const bit = (v) => 1 << v;
const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const lowest = (m) => 31 - Math.clz32(m & -m);
const fullMask = (n) => ((1 << n) - 1) << 1;

export const SIDES = ['top', 'bottom', 'left', 'right'];

// ---- Geometri ----
const geoCache = {};
export function geometry(n) {
  if (geoCache[n]) return geoCache[n];
  const lines = [];
  // satırlar: başlangıç = sol, bitiş = sağ
  for (let r = 0; r < n; r++) {
    lines.push({ kind: 'row', idx: r, cells: Array.from({ length: n }, (_, j) => r * n + j), startSide: 'left', endSide: 'right' });
  }
  // sütunlar: başlangıç = üst, bitiş = alt
  for (let c = 0; c < n; c++) {
    lines.push({ kind: 'col', idx: c, cells: Array.from({ length: n }, (_, j) => j * n + c), startSide: 'top', endSide: 'bottom' });
  }
  const peers = Array.from({ length: n * n }, (_, c) => {
    const r = Math.floor(c / n), k = c % n, out = [];
    for (let j = 0; j < n; j++) {
      if (j !== k) out.push(r * n + j);
      if (j !== r) out.push(j * n + k);
    }
    return out;
  });
  return (geoCache[n] = { n, N: n * n, lines, peers });
}

export function parsePuzzle(level) {
  const parts = String(level.puzzle).split('|');
  const n = parts[0].length;
  const num = (ch) => (ch === '.' ? 0 : Number(ch));
  const clues = {
    top: [...parts[0]].map(num), bottom: [...parts[1]].map(num),
    left: [...parts[2]].map(num), right: [...parts[3]].map(num),
  };
  return { n, clues, grid: [...parts[4]].map(num) };
}

export function encodePuzzle(n, clues, grid) {
  const s = (arr) => arr.map((v) => (v ? String(v) : '.')).join('');
  return [s(clues.top), s(clues.bottom), s(clues.left), s(clues.right), s(grid)].join('|');
}

export const parseSolution = (str) => [...str].map(Number);

/** Bir dizinin başından görünen bina sayısı. */
export function visibleCount(arr) {
  let max = 0, cnt = 0;
  for (const v of arr) if (v > max) { max = v; cnt++; }
  return cnt;
}

export function lineClues(clues, line) {
  return [clues[line.startSide][line.idx], clues[line.endSide][line.idx]];
}

export function cluesOf(n, sol) {
  const G = geometry(n);
  const clues = { top: [], bottom: [], left: [], right: [] };
  for (const L of G.lines) {
    const vals = L.cells.map((c) => sol[c]);
    clues[L.startSide][L.idx] = visibleCount(vals);
    clues[L.endSide][L.idx] = visibleCount(vals.slice().reverse());
  }
  return clues;
}

// ---- Permütasyon tablosu (dizilim analizi için) ----
const permCache = {};
function permsFor(n, s, e) {
  const key = `${n}:${s}:${e}`;
  if (permCache[key]) return permCache[key];
  const allKey = `${n}`;
  if (!permCache[allKey]) {
    const out = [];
    const cur = [], used = new Array(n + 1).fill(false);
    const rec = () => {
      if (cur.length === n) {
        out.push({ p: cur.slice(), l: visibleCount(cur), r: visibleCount(cur.slice().reverse()) });
        return;
      }
      for (let v = 1; v <= n; v++) {
        if (used[v]) continue;
        used[v] = true; cur.push(v); rec(); cur.pop(); used[v] = false;
      }
    };
    rec();
    permCache[allKey] = out;
  }
  return (permCache[key] = permCache[allKey].filter((x) => (!s || x.l === s) && (!e || x.r === e)).map((x) => x.p));
}

// ---- İnsan mantığıyla çözücü ----
// Kenar sınırı: k ipucunun olduğu kenardan d. (0 tabanlı) bina en fazla n-k+1+d katlı olabilir.
const boundAt = (n, k, d) => n - k + 1 + d;

function makeState(n, clues, grid) {
  const G = geometry(n);
  const cand = new Array(G.N).fill(fullMask(n));
  const bounded = new Uint8Array(G.N);
  for (const L of G.lines) {
    const [s, e] = lineClues(clues, L);
    for (let d = 0; d < n; d++) {
      if (s) {
        const c = L.cells[d], m = boundAt(n, s, d);
        if (m < n) { const nm = cand[c] & (bit(m + 1) - 2); if (nm !== cand[c]) { cand[c] = nm; bounded[c] = 1; } }
      }
      if (e) {
        const c = L.cells[n - 1 - d], m = boundAt(n, e, d);
        if (m < n) { const nm = cand[c] & (bit(m + 1) - 2); if (nm !== cand[c]) { cand[c] = nm; bounded[c] = 1; } }
      }
    }
  }
  const st = { n, G, clues, grid: new Array(G.N).fill(0), cand, bounded, src: new Int16Array(G.N).fill(-1) };
  grid.forEach((v, c) => { if (v) place(st, c, v); });
  return st;
}

function place(st, c, v) {
  st.grid[c] = v;
  st.cand[c] = bit(v);
  for (const p of st.G.peers[c]) st.cand[p] &= ~bit(v);
}

/** Kademe 1 hamlesi (yerleştirme) bulur; yoksa null. */
function findBasic(st) {
  const { n, G, grid, cand, clues } = st;
  // Kenar ipucu 1 ve n
  for (const L of G.lines) {
    const [s, e] = lineClues(clues, L);
    for (const [k, side, fromStart] of [[s, L.startSide, true], [e, L.endSide, false]]) {
      const at = (d) => L.cells[fromStart ? d : n - 1 - d];
      if (k === 1 && !grid[at(0)]) return { cell: at(0), value: n, reason: 'clue1', line: L, side };
      if (k === n) {
        for (let d = 0; d < n; d++) if (!grid[at(d)]) return { cell: at(d), value: d + 1, reason: 'clueN', line: L, side };
      }
    }
  }
  // Tek aday
  for (let c = 0; c < G.N; c++) {
    if (!grid[c] && popcount(cand[c]) === 1) return { cell: c, value: lowest(cand[c]), reason: 'naked' };
  }
  // Gizli tek
  for (const L of G.lines) {
    for (let v = 1; v <= n; v++) {
      let spot = -1, cnt = 0;
      for (const c of L.cells) {
        if (grid[c] === v) { cnt = -1; break; }
        if (!grid[c] && cand[c] & bit(v)) { spot = c; cnt++; }
      }
      if (cnt === 1) return { cell: spot, value: v, reason: 'hidden', line: L };
    }
  }
  return null;
}

/** Bir hattın ipuçlarına ve mevcut adaylara uyan dizilimlerin birleşimi. null = çelişki. */
function lineUnion(st, L) {
  const { n, cand, clues } = st;
  const [s, e] = lineClues(clues, L);
  const masks = L.cells.map((c) => cand[c]);
  const uni = new Array(n).fill(0);
  let any = false;
  for (const p of permsFor(n, s, e)) {
    let ok = true;
    for (let d = 0; d < n; d++) if (!(masks[d] & bit(p[d]))) { ok = false; break; }
    if (!ok) continue;
    any = true;
    for (let d = 0; d < n; d++) uni[d] |= bit(p[d]);
  }
  return any ? uni : null;
}

/** Dizilim analizi: tüm ipuçlu hatlarda elemeleri uygular. Dönüş: değişti mi (çelişkide 'x'). */
function applyLineAnalysis(st) {
  let changed = false;
  for (let li = 0; li < st.G.lines.length; li++) {
    const L = st.G.lines[li];
    const [s, e] = lineClues(st.clues, L);
    if (!s && !e) continue;
    const uni = lineUnion(st, L);
    if (!uni) return 'x';
    L.cells.forEach((c, d) => {
      const nm = st.cand[c] & uni[d];
      if (nm !== st.cand[c]) { st.cand[c] = nm; st.src[c] = li; changed = true; }
    });
  }
  return changed;
}

/**
 * Yalnızca maxTier'e kadar tekniklerle çözmeye çalışır.
 * Dönüş: { solved, tier, rounds } — rounds: gereken dizilim analizi turu sayısı.
 */
export function logicalSolve(n, clues, grid, maxTier = 2) {
  const st = makeState(n, clues, grid);
  let tier = 1, rounds = 0;
  for (let guard = 0; guard < 10000; guard++) {
    if (st.cand.some((m) => !m)) return { solved: false, tier, rounds };
    if (st.grid.every((v) => v)) return { solved: true, tier, rounds, grid: st.grid };
    const s = findBasic(st);
    if (s) {
      if (!(st.cand[s.cell] & bit(s.value))) return { solved: false, tier, rounds };
      place(st, s.cell, s.value);
      continue;
    }
    if (maxTier < 2) break;
    const ch = applyLineAnalysis(st);
    if (ch !== true) break;
    tier = 2; rounds++;
  }
  return { solved: false, tier, rounds };
}

// ---- Akıllı İpucu ----
const SIDE_ADJ = { top: 'Üstteki', bottom: 'Alttaki', left: 'Soldaki', right: 'Sağdaki' };
const DATIVE = { 1: "'e", 2: "'ye", 3: "'e", 4: "'e", 5: "'e", 6: "'ya", 7: "'ye", 8: "'e", 9: "'a" };
export const cellName = (n, c) => `${Math.floor(c / n) + 1}. satır, ${(c % n) + 1}. sütun`;
const lineName = (L) => `${L.idx + 1}. ${L.kind === 'row' ? 'satır' : 'sütun'}`;
const lineLoc = (L) => `${L.idx + 1}. ${L.kind === 'row' ? 'satırda' : 'sütunda'}`;
const lineGen = (L) => `${L.idx + 1}. ${L.kind === 'row' ? 'satırın' : 'sütunun'}`;

function clueText(clues, L) {
  const [s, e] = lineClues(clues, L);
  const parts = [];
  if (s) parts.push(`${SIDE_ADJ[L.startSide].toLowerCase()} ${s}`);
  if (e) parts.push(`${SIDE_ADJ[L.endSide].toLowerCase()} ${e}`);
  return parts.join(' ve ');
}
const clueRefs = (clues, L) => {
  const [s, e] = lineClues(clues, L);
  const out = [];
  if (s) out.push({ side: L.startSide, idx: L.idx });
  if (e) out.push({ side: L.endSide, idx: L.idx });
  return out;
};

/** Hücrenin kenar sınırını açıklayan metin (varsa). */
function boundText(st, c) {
  const { n, G, clues } = st;
  let best = null;
  const consider = (k, side, idx, dist) => {
    if (!k) return;
    const m = boundAt(n, k, dist);
    if (m < n && (!best || m < best.m)) {
      best = { m, text: `${SIDE_ADJ[side].toLowerCase()} ipucu ${k} → kenardan ${dist + 1}. bina en fazla ${m} katlı olabilir`, ref: { side, idx } };
    }
  };
  for (const L of G.lines) {
    const pos = L.cells.indexOf(c);
    if (pos < 0) continue;
    const [s, e] = lineClues(clues, L);
    consider(s, L.startSide, L.idx, pos);
    consider(e, L.endSide, L.idx, n - 1 - pos);
  }
  return best;
}

/**
 * Mevcut (doğru) girişlere göre sıradaki mantıklı hamle.
 * Dönüş: { cell, value, text, clues: [{side, idx}], line: {kind, idx} | null } ya da null.
 */
export function nextLogicalStep(n, clues, grid) {
  const st = makeState(n, clues, grid);
  if (st.grid.every((v) => v)) return null;
  let elimDone = false;
  const usedLines = new Set();
  for (let guard = 0; guard < 500; guard++) {
    const s = findBasic(st);
    if (s) {
      const where = cellName(n, s.cell);
      let text, refs = [], line = s.line ?? null;
      if (s.reason === 'clue1') {
        text = `${SIDE_ADJ[s.side]} kenar ipucu 1 → en yüksek bina (${n}) kenarda olmalı: ${where} = ${n}.`;
        refs = [{ side: s.side, idx: s.line.idx }];
      } else if (s.reason === 'clueN') {
        text = `${SIDE_ADJ[s.side]} kenar ipucu ${n} → ${lineName(s.line)} o kenardan 1'den ${n}${DATIVE[n]} sıralı artar: ${where} = ${s.value}.`;
        refs = [{ side: s.side, idx: s.line.idx }];
      } else if (s.reason === 'naked') {
        let why;
        if (elimDone && st.src[s.cell] >= 0) {
          const L = st.G.lines[st.src[s.cell]];
          why = `${lineGen(L)} ipuçlarına (${clueText(clues, L)}) uyan dizilimler incelenince`;
          refs = clueRefs(clues, L);
          line = L;
        } else {
          const b = st.bounded[s.cell] ? boundText(st, s.cell) : null;
          if (b) { why = `Kenar sınırı (${b.text}) ve satırdaki/sütundaki binalar dikkate alınınca`; refs = [b.ref]; }
          else why = 'Satırında ve sütununda zaten bulunan yükseklikler elenince';
        }
        text = `${why} ${where} hücresine yalnızca ${s.value} girebilir.`;
      } else {
        text = `${s.value} katlı bina ${lineLoc(s.line)} yalnızca ${where} hücresine girebilir (aday eleme: diğer hücreler satır/sütun veya kenar ipuçları yüzünden ${s.value} alamaz).`;
        refs = clueRefs(clues, s.line);
      }
      if (elimDone && s.reason !== 'naked') text = `Aday elemesinden sonra: ${text}`;
      return { cell: s.cell, value: s.value, text, clues: refs, line: line ? { kind: line.kind, idx: line.idx } : null, advanced: elimDone };
    }
    // Tek bir hattın dizilim analizi doğrudan bir hücreyi belirliyor mu?
    for (const L of st.G.lines) {
      const [cs, ce] = lineClues(clues, L);
      if (!cs && !ce) continue;
      const uni = lineUnion(st, L);
      if (!uni) return null;
      for (let d = 0; d < n; d++) {
        const c = L.cells[d];
        if (!st.grid[c] && popcount(uni[d]) === 1 && popcount(st.cand[c]) > 1) {
          const v = lowest(uni[d]);
          const text = `${elimDone ? 'Aday elemesinden sonra: ' : ''}${lineGen(L)} ipuçlarına (${clueText(clues, L)}) uyan tüm dizilimler denendiğinde ${where(c)} hücresi her seferinde ${v} çıkıyor.`;
          return { cell: c, value: v, text, clues: clueRefs(clues, L), line: { kind: L.kind, idx: L.idx }, advanced: true };
        }
      }
    }
    const ch = applyLineAnalysis(st);
    if (ch !== true) return null;
    elimDone = true;
  }
  return null;
  function where(c) { return cellName(n, c); }
}

// ---- Tam arama ile çözüm sayma (sezgisel çözücüden bağımsız) ----
// Her satır için ipuçlarına ve hazır binalara uyan tüm permütasyonlar, her sütun için de aynısı listelenir.
// Arama satır satır dallanır; seçilen satırlar sütun listelerini süzer. Hiçbir olasılık atlanmaz.
export function countSolutions(n, clues, grid, limit = 2) {
  const G = geometry(n);
  const fits = (L) => {
    const [s, e] = lineClues(clues, L);
    return permsFor(n, s, e).filter((p) => L.cells.every((c, d) => !grid[c] || grid[c] === p[d]));
  };
  const rowLists = G.lines.slice(0, n).map(fits);
  const colLists0 = G.lines.slice(n).map(fits);
  let count = 0;
  const used = new Array(n).fill(false);
  const rec = (colLists, depth) => {
    if (colLists.some((l) => !l.length)) return;
    if (depth === n) { count++; return; }
    // allow[c][r] = (r, c) hücresinin sütun listelerine göre alabileceği değerler
    const allow = colLists.map((l) => {
      const m = new Array(n).fill(0);
      for (const q of l) for (let r = 0; r < n; r++) m[r] |= bit(q[r]);
      return m;
    });
    let bestR = -1, best = null;
    for (let r = 0; r < n; r++) {
      if (used[r]) continue;
      const ok = rowLists[r].filter((p) => p.every((v, c) => allow[c][r] & bit(v)));
      if (!best || ok.length < best.length) { best = ok; bestR = r; }
      if (!ok.length) return;
    }
    used[bestR] = true;
    for (const p of best) {
      if (count >= limit) break;
      rec(colLists.map((l, c) => l.filter((q) => q[bestR] === p[c])), depth + 1);
    }
    used[bestR] = false;
  };
  rec(colLists0, 0);
  return count;
}

// ---- Level üretimi ----
function randomLatin(n, rng) {
  const g = new Array(n * n).fill(0);
  const rowUsed = new Array(n).fill(0), colUsed = new Array(n).fill(0);
  const fill = (c) => {
    if (c === n * n) return true;
    const r = Math.floor(c / n), k = c % n;
    for (const v of rng.shuffle(Array.from({ length: n }, (_, i) => i + 1))) {
      if (rowUsed[r] & bit(v) || colUsed[k] & bit(v)) continue;
      g[c] = v; rowUsed[r] |= bit(v); colUsed[k] |= bit(v);
      if (fill(c + 1)) return true;
      rowUsed[r] &= ~bit(v); colUsed[k] &= ~bit(v);
    }
    g[c] = 0;
    return false;
  };
  fill(0);
  return g;
}

/**
 * Zorluk planı (seviye içinde ve seviyeler arasında kademeli artar):
 *   Kolay: 4×4, ilk levellerde birkaç hazır bina, yalnızca kademe-1 teknikler, ipucu 12 → 7
 *   Orta: 5×5, ipucu 15 → 9, son yarıda dizilim analizi gerekir
 *   Zor : 6×6 (1–16) ve 7×7 (17–20), dizilim analizi gerekir, ipucu azalır
 */
export function planFor(difficulty, index, total = 20) {
  const t = index / Math.max(1, total - 1);
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  if (difficulty === 'easy') {
    return { n: 4, givens: [3, 2, 2, 1, 1, 1][index] ?? 0, target: lerp(12, 7), maxTier: 1, minRounds: 0 };
  }
  if (difficulty === 'medium') {
    return { n: 5, givens: index < 3 ? 1 : 0, target: lerp(15, 9), maxTier: index < 6 ? 1 : 2, minRounds: index < 6 ? 0 : index < 13 ? 1 : 2 };
  }
  if (index < 16) {
    const u = index / 15;
    return { n: 6, givens: 0, target: Math.round(17 - 7 * u), maxTier: 2, minRounds: 2 + Math.floor(index / 4) };
  }
  return { n: 7, givens: 0, maxExtra: 4, target: [16, 15, 14, 13][index - 16], maxTier: 2, minRounds: 5 };
}

export function generateLevel(rng, difficulty, index, total = 20) {
  const plan = planFor(difficulty, index, total);
  const { n } = plan;
  let best = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const sol = randomLatin(n, rng);
    const full = cluesOf(n, sol);
    const clues = { top: full.top.slice(), bottom: full.bottom.slice(), left: full.left.slice(), right: full.right.slice() };
    const grid = new Array(n * n).fill(0);
    for (const c of rng.shuffle(Array.from({ length: n * n }, (_, i) => i)).slice(0, plan.givens)) grid[c] = sol[c];
    const solvable = () => logicalSolve(n, clues, grid, plan.maxTier).solved;
    // Tüm ipuçlarıyla bile çözülemiyorsa birkaç hazır bina ekle (en fazla plan.maxExtra)
    const extra = [];
    for (const c of rng.shuffle(Array.from({ length: n * n }, (_, i) => i))) {
      if (extra.length >= (plan.maxExtra ?? 0) || solvable()) break;
      if (!grid[c]) { grid[c] = sol[c]; extra.push(c); }
    }
    if (!solvable()) continue;
    let count = 4 * n;
    const slots = rng.shuffle(SIDES.flatMap((side) => Array.from({ length: n }, (_, i) => [side, i])));
    for (const [side, i] of slots) {
      if (count <= plan.target) break;
      const keep = clues[side][i];
      clues[side][i] = 0;
      if (solvable()) count--;
      else clues[side][i] = keep;
    }
    // Eklenen hazır binalardan gereksiz olanları geri al
    for (const c of extra) {
      grid[c] = 0;
      if (!solvable()) grid[c] = sol[c];
    }
    const res = logicalSolve(n, clues, grid, plan.maxTier);
    // Puan: hedef ipucu sayısına ve gereken analiz turuna uzaklık
    const score = Math.max(0, count - plan.target) * 10 + Math.max(0, plan.minRounds - res.rounds) + grid.filter(Boolean).length * 3 - plan.givens * 3;
    if (!best || score < best.score) best = { score, clues, grid, sol, count, res };
    if (score === 0) break;
  }
  const { clues, grid, sol, count, res } = best;
  if (countSolutions(n, clues, grid, 2) !== 1) throw new Error('Mantıksal çözücü tek olmayan çözüm kabul etti');
  return {
    size: n,
    puzzle: encodePuzzle(n, clues, grid),
    solution: sol.join(''),
    clues: count,
    givens: grid.filter(Boolean).length,
    tier: res.tier,
    rounds: res.rounds,
  };
}

// ---- Bağımsız doğrulama ----
export function verifyLevel(level) {
  const n = level.size;
  if (!Number.isInteger(n) || n < 3 || n > 7) return `Geçersiz boyut: ${n}`;
  if (typeof level.puzzle !== 'string' || typeof level.solution !== 'string') return 'Bulmaca/çözüm metin değil';
  const parts = level.puzzle.split('|');
  if (parts.length !== 5) return 'Bulmaca biçimi hatalı (5 parça olmalı)';
  const edgeRe = new RegExp(`^[.1-${n}]{${n}}$`);
  if (!parts.slice(0, 4).every((p) => edgeRe.test(p))) return 'Kenar ipuçları hatalı';
  if (!new RegExp(`^[.1-${n}]{${n * n}}$`).test(parts[4])) return 'Izgara hatalı';
  if (!new RegExp(`^[1-${n}]{${n * n}}$`).test(level.solution)) return 'Çözüm biçimi hatalı';
  const { clues, grid } = parsePuzzle(level);
  const sol = parseSolution(level.solution);
  const G = geometry(n);
  for (const L of G.lines) {
    if (new Set(L.cells.map((c) => sol[c])).size !== n) return 'Çözüm geçerli bir Latin kare değil';
  }
  const real = cluesOf(n, sol);
  for (const side of SIDES) {
    for (let i = 0; i < n; i++) if (clues[side][i] && clues[side][i] !== real[side][i]) return `Çözüm ${side} ${i + 1} ipucunu sağlamıyor`;
  }
  if (grid.some((v, i) => v && v !== sol[i])) return 'Hazır binalar çözümle uyuşmuyor';
  const cnt = countSolutions(n, clues, grid, 2);
  if (cnt !== 1) return `Çözüm sayısı ${cnt} (1 olmalı)`;
  if (!logicalSolve(n, clues, grid, 2).solved) return 'Tahmin yapmadan çözülemiyor';
  return null;
}
