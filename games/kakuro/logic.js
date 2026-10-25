// Kakuro mantığı — hem tarayıcıda hem Node'da (level üretici/doğrulayıcı) çalışır.
//
// Izgara R×C; ilk satır ve ilk sütun her zaman siyahtır (ipucu kareleri).
// Level biçimi:
//   puzzle:   satırlar "|" ile, kareler "," ile ayrılır.
//             "."   = beyaz (boş) kare
//             "#"   = ipucusuz siyah kare
//             "D:S" = ipucu karesi; D = aşağı doğru toplam, S = sağa doğru toplam (0 = yok)
//   solution: R*C karakter; "#" = siyah, "1".."9" = beyaz karenin rakamı.

const bit = (d) => 1 << d;
export const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const lowestDigit = (m) => 31 - Math.clz32(m & -m);
export const digitsOf = (m) => { const out = []; for (; m; m &= m - 1) out.push(lowestDigit(m)); return out; };
const ALL = 0b1111111110; // 1..9

// ---- Kombinasyon tablosu: COMBOS[uzunluk][toplam] = rakam kümeleri (bit maskesi) ----
const COMBOS = Array.from({ length: 10 }, () => Array.from({ length: 46 }, () => []));
for (let m = 0; m < 512; m++) {
  const mask = m << 1;
  let s = 0;
  for (const d of digitsOf(mask)) s += d;
  COMBOS[popcount(mask)][s].push(mask);
}
// Çocuklar için okunaklı sıra: 1+8, 2+7, 3+6 ... (küçük rakamla başlayan önce)
for (const byLen of COMBOS) for (const list of byLen) {
  list.sort((a, b) => { const x = digitsOf(a), y = digitsOf(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; });
}
export function combosFor(len, sum, used = 0) {
  if (len < 0 || len > 9 || sum < 0 || sum > 45) return [];
  return COMBOS[len][sum].filter((m) => !(m & used));
}
export const comboText = (m) => digitsOf(m).join('+');

// ---- Ayrıştırma ----
export function parsePuzzle(puzzle) {
  const rowsStr = puzzle.split('|');
  const R = rowsStr.length;
  const tokens = rowsStr.map((r) => r.split(','));
  const C = tokens[0].length;
  const N = R * C;
  const white = new Array(N).fill(false);
  const down = new Array(N).fill(0);
  const right = new Array(N).fill(0);
  for (let r = 0; r < R; r++) {
    if (tokens[r].length !== C) throw new Error('Satır uzunlukları farklı');
    for (let c = 0; c < C; c++) {
      const t = tokens[r][c];
      const i = r * C + c;
      if (t === '.') white[i] = true;
      else if (t !== '#') {
        const m = /^(\d+):(\d+)$/.exec(t);
        if (!m) throw new Error(`Geçersiz kare: ${t}`);
        down[i] = Number(m[1]);
        right[i] = Number(m[2]);
      }
    }
  }
  return buildGeometry(R, C, white, down, right);
}

function buildGeometry(R, C, white, down, right) {
  const N = R * C;
  const runs = [];
  const runOf = Array.from({ length: N }, () => [-1, -1]);
  for (let i = 0; i < N; i++) {
    if (white[i]) continue;
    const r = Math.floor(i / C), c = i % C;
    if (c + 1 < C && white[i + 1]) {
      const cells = [];
      for (let k = c + 1; k < C && white[r * C + k]; k++) cells.push(r * C + k);
      runs.push({ id: runs.length, dir: 'h', clue: i, sum: right[i], cells });
    }
    if (r + 1 < R && white[i + C]) {
      const cells = [];
      for (let k = r + 1; k < R && white[k * C + c]; k++) cells.push(k * C + c);
      runs.push({ id: runs.length, dir: 'v', clue: i, sum: down[i], cells });
    }
  }
  for (const run of runs) for (const c of run.cells) runOf[c][run.dir === 'h' ? 0 : 1] = run.id;
  const whites = [];
  for (let i = 0; i < N; i++) if (white[i]) whites.push(i);
  return { R, C, N, white, down, right, runs, runOf, whites };
}

export const parseSolution = (str) => [...str].map((ch) => (ch === '#' ? 0 : Number(ch)));

export const cellName = (P, i) => `${Math.floor(i / P.C)}. satır, ${i % P.C}. sütun`;
export const runName = (run) => `${run.dir === 'h' ? 'Yatay' : 'Dikey'} ${run.sum} (${run.cells.length} kare)`;

/** Bir sıranın mevcut durumu: kullanılan rakamlar, kalan toplam, kalan boş kare sayısı, tekrar var mı. */
export function runState(run, grid) {
  let used = 0, rem = run.sum, cnt = 0, dup = false;
  for (const c of run.cells) {
    const v = grid[c];
    if (v) {
      if (used & bit(v)) dup = true;
      used |= bit(v);
      rem -= v;
    } else cnt++;
  }
  return { used, rem, cnt, dup };
}

/** Kalan boş kareler için olası kombinasyonlar (yalnızca toplam ve kullanılmış rakamlara göre). */
export function remainingCombos(run, grid) {
  const s = runState(run, grid);
  if (s.dup) return [];
  return combosFor(s.cnt, s.rem, s.used);
}

function unionOf(list) { let u = 0; for (const m of list) u |= m; return u; }
function interOf(list) { let u = ALL; for (const m of list) u &= m; return list.length ? u : 0; }

// ---- TAM arama ile çözüm sayısı (limit'e ulaşınca durur) ----
// Her boş kare için yatay ve dikey sıranın kalan kombinasyonlarının birleşimi aday kümesidir
// (bu yalnızca imkânsız değerleri atan güvenli bir budamadır). Tüm dallar denenir.
export function countSolutions(P, grid, limit = 2) {
  const g = grid.slice();
  let count = 0;
  const allowed = (run) => {
    const s = runState(run, g);
    if (s.dup) return 0;
    return unionOf(combosFor(s.cnt, s.rem, s.used));
  };
  const rec = () => {
    let best = -1, bestMask = 0, bestN = 99;
    for (const c of P.whites) {
      if (g[c]) continue;
      const [h, v] = P.runOf[c];
      const m = allowed(P.runs[h]) & allowed(P.runs[v]);
      const k = popcount(m);
      if (k === 0) return;
      if (k < bestN) { best = c; bestMask = m; bestN = k; if (k === 1) break; }
    }
    if (best === -1) {
      // Tüm kareler dolu: her sıranın toplamı ve tekrarsızlığı kontrol edilir.
      for (const run of P.runs) {
        const s = runState(run, g);
        if (s.dup || s.rem !== 0) return;
      }
      count++;
      return;
    }
    for (let m = bestMask; m && count < limit; m &= m - 1) {
      g[best] = lowestDigit(m);
      rec();
    }
    g[best] = 0;
  };
  rec();
  return count;
}

// ---- İnsan mantığıyla çözüm ----
// Kademe 1: Her karenin adayları = yatay sıranın kombinasyonlarındaki rakamlar ∩ dikey sıranınkiler.
//           Tek aday kalan kare (tek rakam) ya da sıranın her kombinasyonunda olan bir rakamın
//           sırada gidebileceği tek kare (gizli tek).
// Kademe 2: Sıra bazında kombinasyon eleme: bir kombinasyonun rakamları sıranın karelerine
//           (adaylarına uyarak) yerleştirilemiyorsa elenir; kalan yerleşimlerde hiç kullanılmayan
//           adaylar silinir.

/** Kademe 2 eleme: sıradaki boş kareler için gerçekten mümkün rakamlar + geçerli kombinasyonlar. */
export function runConsistency(run, grid, cand) {
  const s = runState(run, grid);
  const empties = run.cells.filter((c) => !grid[c]);
  const k = empties.length;
  if (s.dup) return { empties, possible: empties.map(() => 0), combos: [], all: [] };
  const all = combosFor(k, s.rem, s.used);
  const validSet = new Set(all);
  // ileri erişilebilir kullanılmış-rakam kümeleri
  const levels = [new Set([0])];
  for (let i = 0; i < k; i++) {
    const next = new Set();
    const cm = cand[empties[i]] & ~s.used;
    for (const u of levels[i]) for (let m = cm & ~u; m; m &= m - 1) next.add(u | (m & -m));
    levels.push(next);
  }
  let good = new Set([...levels[k]].filter((u) => validSet.has(u)));
  const combos = [...good];
  const possible = new Array(k).fill(0);
  for (let i = k - 1; i >= 0; i--) {
    const prev = new Set();
    const cm = cand[empties[i]] & ~s.used;
    for (const u of levels[i]) {
      for (let m = cm & ~u; m; m &= m - 1) {
        const d = m & -m;
        if (good.has(u | d)) { prev.add(u); possible[i] |= d; }
      }
    }
    good = prev;
  }
  return { empties, possible, combos, all };
}

function basicCands(P, grid, cand) {
  const allow = P.runs.map((run) => unionOf(remainingCombos(run, grid)));
  const out = cand.slice();
  for (const c of P.whites) {
    if (grid[c]) { out[c] = 0; continue; }
    const [h, v] = P.runOf[c];
    out[c] &= allow[h] & allow[v];
  }
  return out;
}

/** Kademe 1 hamlesi (tek aday / gizli tek). */
function findSingle(P, grid, cand) {
  for (const c of P.whites) {
    if (!grid[c] && popcount(cand[c]) === 1) return { cell: c, value: lowestDigit(cand[c]), reason: 'naked' };
  }
  for (const run of P.runs) {
    const combos = remainingCombos(run, grid);
    const req = interOf(combos);
    for (const d of digitsOf(req)) {
      let spot = -1, k = 0;
      for (const c of run.cells) if (!grid[c] && cand[c] & bit(d)) { spot = c; k++; }
      if (k === 1) return { cell: spot, value: d, reason: 'hidden', run: run.id };
    }
  }
  return null;
}

/** Kademe 2 adımları (aday eleyen sıralar). */
function* advancedSteps(P, grid, cand) {
  for (const run of P.runs) {
    const rc = runConsistency(run, grid, cand);
    const elims = [];
    rc.empties.forEach((c, i) => {
      const gone = cand[c] & ~rc.possible[i];
      if (gone) elims.push([c, gone]);
    });
    if (elims.length) yield { run: run.id, elims, combos: rc.combos, all: rc.all };
  }
}

function hasContradiction(P, grid, cand) {
  for (const c of P.whites) if (!grid[c] && !cand[c]) return true;
  return false;
}

/**
 * Mantıkla çözmeyi dener. maxTier = 1 ya da 2.
 * Dönüş: { solved, tier (kullanılan en yüksek kademe), advanced (kademe-2 adım sayısı), grid, filled }
 */
export function logicalSolve(P, grid0, maxTier = 2) {
  const grid = grid0.slice();
  let cand = new Array(P.N).fill(0);
  for (const c of P.whites) cand[c] = grid[c] ? 0 : ALL;
  let tier = grid.some((v, i) => P.white[i] && !v) ? 1 : 0;
  let advanced = 0;
  for (let guard = 0; guard < 2000; guard++) {
    cand = basicCands(P, grid, cand);
    if (hasContradiction(P, grid, cand)) break;
    const s = findSingle(P, grid, cand);
    if (s) {
      grid[s.cell] = s.value;
      continue;
    }
    if (maxTier < 2) break;
    const it = advancedSteps(P, grid, cand).next();
    if (it.done) break;
    // Bir turda tüm sıraların elemelerini uygula
    let any = false;
    for (const a of advancedSteps(P, grid, cand)) {
      for (const [c, m] of a.elims) { if (cand[c] & m) { cand[c] &= ~m; any = true; } }
    }
    if (!any) break;
    advanced++;
    tier = 2;
  }
  const filled = P.whites.filter((c) => grid[c]).length;
  return { solved: filled === P.whites.length, tier, advanced, grid, filled };
}

/**
 * Akıllı İpucu: mevcut (doğru) rakamlardan yola çıkarak sıradaki mantıklı hamle.
 * Dönüş: { cell, value, reason, run?, steps: [kademe-2 adımları], cand } ya da null.
 */
export function nextLogicalStep(P, grid) {
  const g = grid.slice();
  let cand = new Array(P.N).fill(0);
  for (const c of P.whites) cand[c] = g[c] ? 0 : ALL;
  const steps = [];
  for (let guard = 0; guard < 300; guard++) {
    cand = basicCands(P, g, cand);
    const s = findSingle(P, g, cand);
    if (s) return { ...s, steps, cand };
    let first = null;
    for (const a of advancedSteps(P, g, cand)) {
      first ??= a;
      const trial = cand.slice();
      for (const [c, m] of a.elims) trial[c] &= ~m;
      const t = findSingle(P, g, basicCands(P, g, trial));
      if (t) return { ...t, steps: [...steps, a], cand: trial };
    }
    if (!first) return null;
    for (const [c, m] of first.elims) cand[c] &= ~m;
    steps.push(first);
  }
  return null;
}

// ---- Level üretimi ----
// Kolay: 4×4 → 5×5 iç alan, yalnızca kademe 1, kısa sıralar.
// Orta: 6×6 → 7×7, sonlara doğru kademe 2 gerekebilir.
// Zor: 8×8 → 9×9, kademe 2 elemeleri gerektirir.
function planFor(difficulty, index) {
  if (difficulty === 'easy') {
    if (index < 10) return { n: 4, maxRun: index < 5 ? 3 : 4, black: [3, 2][index < 5 ? 0 : 1], maxTier: 1 };
    return { n: 5, maxRun: 4, black: index < 15 ? 7 : 5, maxTier: 1 };
  }
  if (difficulty === 'medium') {
    if (index < 10) return { n: 6, maxRun: 5, black: index < 5 ? 10 : 8, maxTier: index < 5 ? 1 : 2 };
    return { n: 7, maxRun: 6, black: index < 15 ? 13 : 11, maxTier: 2 };
  }
  if (index < 10) return { n: 8, maxRun: 7, black: index < 5 ? 18 : 16, maxTier: 2, minAdvanced: 1 + Math.floor(index / 4) };
  return { n: 9, maxRun: 8, black: index < 15 ? 22 : 20, maxTier: 2, minAdvanced: 2 + Math.floor((index - 10) / 4) };
}

/** Rastgele, simetrik, geçerli siyah/beyaz düzen (R=C=n+1). */
function randomLayout(rng, n, maxRun, blackTarget) {
  const S = n + 1;
  for (let attempt = 0; attempt < 500; attempt++) {
    const white = new Array(S * S).fill(false);
    for (let r = 1; r < S; r++) for (let c = 1; c < S; c++) white[r * S + c] = true;
    const mirror = (i) => { const r = Math.floor(i / S), c = i % S; return (S - r) * S + (S - c); };
    const setBlack = (i) => { white[i] = false; white[mirror(i)] = false; };
    const interior = [];
    for (let r = 1; r < S; r++) for (let c = 1; c < S; c++) interior.push(r * S + c);
    let blacks = 0;
    for (const i of rng.shuffle(interior.slice())) {
      if (blacks >= blackTarget) break;
      if (!white[i]) continue;
      setBlack(i);
      blacks = interior.filter((j) => !white[j]).length;
    }
    // Onarım: 1 uzunluğunda sıra yok, sıralar maxRun'dan uzun değil
    for (let guard = 0; guard < 200; guard++) {
      let changed = false;
      for (const i of interior) {
        if (!white[i]) continue;
        const r = Math.floor(i / S), c = i % S;
        const hl = (white[i - 1] ? 1 : 0) + (c + 1 < S && white[i + 1] ? 1 : 0);
        const vl = (white[i - S] ? 1 : 0) + (r + 1 < S && white[i + S] ? 1 : 0);
        if (hl === 0 || vl === 0) { setBlack(i); changed = true; }
      }
      // uzun sıraları böl
      for (let r = 1; r < S && !changed; r++) {
        let c = 1;
        while (c < S) {
          if (!white[r * S + c]) { c++; continue; }
          let e = c;
          while (e < S && white[r * S + e]) e++;
          if (e - c > maxRun) { setBlack(r * S + c + 1 + Math.floor(rng.next() * (e - c - 2))); changed = true; break; }
          c = e;
        }
      }
      for (let c = 1; c < S && !changed; c++) {
        let r = 1;
        while (r < S) {
          if (!white[r * S + c]) { r++; continue; }
          let e = r;
          while (e < S && white[e * S + c]) e++;
          if (e - r > maxRun) { setBlack((r + 1 + Math.floor(rng.next() * (e - r - 2))) * S + c); changed = true; break; }
          r = e;
        }
      }
      if (!changed) break;
    }
    const whites = interior.filter((i) => white[i]);
    if (whites.length < n * n * 0.55) continue;
    // bağlantılılık
    const seen = new Set([whites[0]]);
    const stack = [whites[0]];
    while (stack.length) {
      const i = stack.pop();
      for (const j of [i - 1, i + 1, i - S, i + S]) {
        if (j >= 0 && j < S * S && white[j] && !seen.has(j) && Math.abs((j % S) - (i % S)) <= 1) { seen.add(j); stack.push(j); }
      }
    }
    if (seen.size !== whites.length) continue;
    // Her satır ve sütunda en az bir beyaz olsun (boş kenar kalmasın)
    let okEdges = true;
    for (let k = 1; k < S; k++) {
      let rw = false, cw = false;
      for (let t = 1; t < S; t++) { rw ||= white[k * S + t]; cw ||= white[t * S + k]; }
      if (!rw || !cw) okEdges = false;
    }
    if (!okEdges) continue;
    return white;
  }
  return null;
}

function randomFill(rng, P) {
  const g = new Array(P.N).fill(0);
  const order = P.whites.slice();
  const rec = (k) => {
    if (k === order.length) return true;
    const c = order[k];
    const [h, v] = P.runOf[c];
    let used = 0;
    for (const x of P.runs[h].cells) used |= bit(g[x]);
    for (const x of P.runs[v].cells) used |= bit(g[x]);
    for (const d of rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (used & bit(d)) continue;
      g[c] = d;
      if (rec(k + 1)) return true;
    }
    g[c] = 0;
    return false;
  };
  return rec(0) ? g : null;
}

function withClues(P, fill) {
  const down = new Array(P.N).fill(0);
  const right = new Array(P.N).fill(0);
  for (const run of P.runs) {
    const s = run.cells.reduce((a, c) => a + fill[c], 0);
    if (run.dir === 'h') right[run.clue] = s; else down[run.clue] = s;
  }
  return buildGeometry(P.R, P.C, P.white, down, right);
}

export function encodePuzzle(P) {
  const rows = [];
  for (let r = 0; r < P.R; r++) {
    const row = [];
    for (let c = 0; c < P.C; c++) {
      const i = r * P.C + c;
      if (P.white[i]) row.push('.');
      else if (P.down[i] || P.right[i]) row.push(`${P.down[i]}:${P.right[i]}`);
      else row.push('#');
    }
    rows.push(row.join(','));
  }
  return rows.join('|');
}

const encodeSolution = (P, fill) => Array.from({ length: P.N }, (_, i) => (P.white[i] ? String(fill[i]) : '#')).join('');

export function generateLevel(rng, difficulty, index, total) {
  const plan = planFor(difficulty, index);
  for (let attempt = 0; attempt < 400; attempt++) {
    const white = randomLayout(rng, plan.n, plan.maxRun, plan.black);
    if (!white) continue;
    const S = plan.n + 1;
    const base = buildGeometry(S, S, white, new Array(S * S).fill(0), new Array(S * S).fill(0));
    let fill = randomFill(rng, base);
    if (!fill) continue;
    const empty = new Array(base.N).fill(0);
    const score = (f) => {
      const P = withClues(base, f);
      const res = logicalSolve(P, empty, plan.maxTier);
      return { P, res };
    };
    let cur = score(fill);
    // Tepe tırmanma: mantıkla çözülemeyen bir karenin rakamını değiştir, daha kötüye gitmiyorsa kabul et.
    for (let it = 0; it < 300 && !cur.res.solved; it++) {
      const stuck = base.whites.filter((c) => !cur.res.grid[c]);
      const c = stuck[Math.floor(rng.next() * stuck.length)];
      const [h, v] = base.runOf[c];
      let used = 0;
      for (const x of base.runs[h].cells) if (x !== c) used |= bit(fill[x]);
      for (const x of base.runs[v].cells) if (x !== c) used |= bit(fill[x]);
      const opts = digitsOf(ALL & ~used & ~bit(fill[c]));
      if (!opts.length) continue;
      const nf = fill.slice();
      nf[c] = opts[Math.floor(rng.next() * opts.length)];
      const ns = score(nf);
      if (ns.res.filled >= cur.res.filled) { fill = nf; cur = ns; }
    }
    if (!cur.res.solved) continue;
    if (plan.minAdvanced && cur.res.advanced < plan.minAdvanced) continue;
    if (!plan.minAdvanced && plan.maxTier === 2 && index >= 5 && difficulty === 'medium' && cur.res.tier < 2 && attempt < 200) continue;
    if (countSolutions(cur.P, empty, 2) !== 1) continue;
    return {
      rows: S, cols: S, size: plan.n,
      puzzle: encodePuzzle(cur.P),
      solution: encodeSolution(base, fill),
      tier: cur.res.tier, advanced: cur.res.advanced,
    };
  }
  throw new Error(`Kakuro üretilemedi: ${difficulty} #${index + 1}`);
}

/** Bağımsız doğrulama: düzen geçerli + çözüm kurallara uyar + TAM aramayla TEK çözüm + mantıkla çözülebilir. */
export function verifyLevel(level) {
  if (typeof level.puzzle !== 'string' || typeof level.solution !== 'string') return 'Bulmaca/çözüm metin değil';
  let P;
  try { P = parsePuzzle(level.puzzle); } catch (e) { return `Ayrıştırma hatası: ${e.message}`; }
  if (P.R !== level.rows || P.C !== level.cols) return 'Boyut uyuşmuyor';
  if (level.solution.length !== P.N) return 'Çözüm uzunluğu hatalı';
  const sol = parseSolution(level.solution);
  for (let i = 0; i < P.N; i++) {
    const ch = level.solution[i];
    if (P.white[i] ? !/^[1-9]$/.test(ch) : ch !== '#') return 'Çözüm düzenle uyuşmuyor';
    const r = Math.floor(i / P.C), c = i % P.C;
    if ((r === 0 || c === 0) && P.white[i]) return 'İlk satır/sütun siyah olmalı';
  }
  // Her beyaz kare hem yatay hem dikey bir sıraya ait; sıralar en az 2 kare; ipucu yalnızca sıra başında
  for (const c of P.whites) {
    const [h, v] = P.runOf[c];
    if (h < 0 || v < 0) return 'Sırasız beyaz kare';
  }
  const clueUsed = new Set();
  for (const run of P.runs) {
    if (run.cells.length < 2) return '1 uzunluğunda sıra var';
    if (run.cells.length > 9) return '9’dan uzun sıra var';
    if (run.sum < 1) return 'İpucusuz sıra var';
    clueUsed.add(`${run.dir}${run.clue}`);
    const s = runState(run, sol);
    if (s.dup) return 'Çözümde bir sırada tekrar eden rakam var';
    if (s.rem !== 0) return 'Çözümde sıra toplamı tutmuyor';
  }
  for (let i = 0; i < P.N; i++) {
    if (P.right[i] && !clueUsed.has(`h${i}`)) return 'Sırası olmayan yatay ipucu';
    if (P.down[i] && !clueUsed.has(`v${i}`)) return 'Sırası olmayan dikey ipucu';
  }
  // Beyaz alan bağlantılı
  const seen = new Set([P.whites[0]]);
  const st = [P.whites[0]];
  while (st.length) {
    const i = st.pop();
    const r = Math.floor(i / P.C), c = i % P.C;
    for (const [rr, cc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
      if (rr < 0 || cc < 0 || rr >= P.R || cc >= P.C) continue;
      const j = rr * P.C + cc;
      if (P.white[j] && !seen.has(j)) { seen.add(j); st.push(j); }
    }
  }
  if (seen.size !== P.whites.length) return 'Beyaz alan bağlantılı değil';
  const empty = new Array(P.N).fill(0);
  const cnt = countSolutions(P, empty, 2);
  if (cnt !== 1) return `Çözüm sayısı ${cnt} (1 olmalı)`;
  const res = logicalSolve(P, empty, 2);
  if (!res.solved) return 'Tahmin yapmadan çözülemiyor';
  if (P.whites.some((c) => res.grid[c] !== sol[c])) return 'Mantıksal çözüm kayıtlı çözümle uyuşmuyor';
  return null;
}
