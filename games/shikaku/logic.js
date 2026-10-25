// Dikdörtgen Böl (Shikaku) mantığı — hem tarayıcıda hem Node'da (üretici/doğrulayıcı) çalışır.
// Level: { w, h, puzzle, solution, clues, tier, score }
//   puzzle   : satırlar '/' ile, hücreler ',' ile ayrılır; '.' = boş, sayı = ipucu (ör. ".,4,./6,.,.")
//   solution : ipuçlarının sırasıyla (satır satır) her birinin dikdörtgeni "r,c,h,w" ve ';' ile ayrılmış
//              (r,c = sol üst köşe; h = satır sayısı (boy), w = sütun sayısı (en))

// ---------------------------------------------------------------------------
// Ayrıştırma ve yardımcılar
// ---------------------------------------------------------------------------

export function parseLevel(level) {
  const { w, h } = level;
  const rows = level.puzzle.split('/');
  const grid = new Array(w * h).fill(0);
  const clues = []; // { r, c, i, n }
  rows.forEach((row, r) => {
    row.split(',').forEach((t, c) => {
      if (t !== '.') {
        const n = Number(t);
        grid[r * w + c] = n;
        clues.push({ r, c, i: r * w + c, n });
      }
    });
  });
  const clueAt = new Array(w * h).fill(-1);
  clues.forEach((k, idx) => { clueAt[k.i] = idx; });
  const solution = level.solution.split(';').map((s) => {
    const [r, c, hh, ww] = s.split(',').map(Number);
    return { r, c, h: hh, w: ww };
  });
  return { w, h, n: w * h, grid, clues, clueAt, solution };
}

export const rectKey = (R) => `${R.r},${R.c},${R.h},${R.w}`;
export const rectCells = (P, R) => {
  const out = [];
  for (let r = R.r; r < R.r + R.h; r++) for (let c = R.c; c < R.c + R.w; c++) out.push(r * P.w + c);
  return out;
};
export const rectHas = (R, r, c) => r >= R.r && r < R.r + R.h && c >= R.c && c < R.c + R.w;
export const rectsOverlap = (A, B) => A.r < B.r + B.h && B.r < A.r + A.h && A.c < B.c + B.w && B.c < A.c + A.w;

/** Bir dikdörtgenin içindeki ipucu (indeks) listesi. */
export function cluesIn(P, R) {
  const out = [];
  for (let r = R.r; r < R.r + R.h; r++) {
    for (let c = R.c; c < R.c + R.w; c++) {
      const k = P.clueAt[r * P.w + c];
      if (k >= 0) out.push(k);
    }
  }
  return out;
}

/** Sayının iyelik eki (ör. 6’nın, 3’ün, 10’un). */
export function gen(n) {
  const last = n % 10;
  const byLast = ['', 'in', 'nin', 'ün', 'ün', 'in', 'nın', 'nin', 'in', 'un'];
  const byTens = { 1: 'un', 2: 'nin', 3: 'un', 4: 'ın', 5: 'nin', 6: 'ın', 7: 'in', 8: 'in', 9: 'ın' };
  const suf = last ? byLast[last] : n % 100 === 0 ? 'ün' : byTens[Math.floor(n / 10) % 10];
  return `${n}’${suf}`;
}

/** Çocuklar için hücre adı. */
export const cellName = (P, i) => `${Math.floor(i / P.w) + 1}. satır, ${(i % P.w) + 1}. sütun`;

/** n alanlı dikdörtgenin olası (en, boy) şekilleri. */
export function shapesOf(n) {
  const out = [];
  for (let hh = 1; hh <= n; hh++) if (n % hh === 0) out.push({ h: hh, w: n / hh });
  return out;
}

/**
 * Her ipucu için aday dikdörtgenler: alanı sayıya eşit, ipucu hücresini içeren,
 * tahtaya sığan ve başka ipucu içermeyen tüm dikdörtgenler.
 */
export function candidatesOf(P) {
  return P.clues.map((k, idx) => {
    const list = [];
    for (const { h: hh, w: ww } of shapesOf(k.n)) {
      if (hh > P.h || ww > P.w) continue;
      for (let r = Math.max(0, k.r - hh + 1); r <= Math.min(k.r, P.h - hh); r++) {
        for (let c = Math.max(0, k.c - ww + 1); c <= Math.min(k.c, P.w - ww); c++) {
          const R = { r, c, h: hh, w: ww };
          const inside = cluesIn(P, R);
          if (inside.length === 1 && inside[0] === idx) list.push({ ...R, cells: rectCells(P, R) });
        }
      }
    }
    return list;
  });
}

// ---------------------------------------------------------------------------
// Tam (kapsamlı) çözüm sayıcı — tam örtü (exact cover) araması, sezgisel kural yok.
// Her adımda en az seçeneği olan örtülmemiş hücre seçilir ve onu örtebilecek
// her aday dikdörtgen sırayla denenir.
// ---------------------------------------------------------------------------

export function countSolutions(P, limit = 2) {
  const cands = candidatesOf(P);
  const K = P.clues.length;
  let area = 0;
  for (const k of P.clues) area += k.n;
  if (area !== P.n) return 0;
  // hücre -> [ [ipucu, aday] ... ]
  const cover = Array.from({ length: P.n }, () => []);
  cands.forEach((list, k) => list.forEach((R, j) => R.cells.forEach((i) => cover[i].push([k, j]))));
  const used = new Uint8Array(P.n);
  const done = new Uint8Array(K);
  let count = 0;
  const fits = (R) => R.cells.every((i) => !used[i]);
  const rec = (left) => {
    if (count >= limit) return;
    if (left === 0) { count++; return; }
    let best = -1, bestOpts = null;
    for (let i = 0; i < P.n; i++) {
      if (used[i]) continue;
      const opts = [];
      for (const [k, j] of cover[i]) if (!done[k] && fits(cands[k][j])) opts.push([k, j]);
      if (!opts.length) return;
      if (!bestOpts || opts.length < bestOpts.length) { best = i; bestOpts = opts; if (opts.length === 1) break; }
    }
    if (best < 0) return;
    for (const [k, j] of bestOpts) {
      const R = cands[k][j];
      for (const i of R.cells) used[i] = 1;
      done[k] = 1;
      rec(left - R.cells.length);
      done[k] = 0;
      for (const i of R.cells) used[i] = 0;
      if (count >= limit) return;
    }
  };
  rec(P.n);
  return count;
}

/** Kayıtlı çözüm tüm kuralları sağlıyor mu? Hata metni ya da null. */
export function checkSolution(P, rects) {
  if (rects.length !== P.clues.length) return 'Çözümdeki dikdörtgen sayısı ipucu sayısına eşit değil';
  const seen = new Uint8Array(P.n);
  for (let k = 0; k < rects.length; k++) {
    const R = rects[k];
    if (!(R.h >= 1 && R.w >= 1 && R.r >= 0 && R.c >= 0 && R.r + R.h <= P.h && R.c + R.w <= P.w)) return `Dikdörtgen ${k + 1} tahtadan taşıyor`;
    const inside = cluesIn(P, R);
    if (inside.length !== 1 || inside[0] !== k) return `Dikdörtgen ${k + 1} tam olarak kendi sayısını içermiyor`;
    if (R.h * R.w !== P.clues[k].n) return `Dikdörtgen ${k + 1} alanı yanlış`;
    for (const i of rectCells(P, R)) {
      if (seen[i]) return 'Dikdörtgenler üst üste biniyor';
      seen[i] = 1;
    }
  }
  if (seen.some((v) => !v)) return 'Örtülmemiş hücre var';
  return null;
}

// ---------------------------------------------------------------------------
// Mantıksal çözücü (zorluk ölçümü ve Akıllı İpucu için)
//   Kural 1: Bir sayının tek adayı kaldıysa dikdörtgeni kesindir.
//   Kural 2: Bir sayının bütün adaylarının ortak kareleri kesin onundur;
//            başka sayıların o kareleri kullanan adayları elenir.
//   Kural 3: Bir kareye yalnızca tek bir sayı ulaşabiliyorsa, o sayının
//            o kareyi içermeyen adayları elenir.
//   Kural 4 (ileri): Bir aday seçilince bir kare hiç örtülemez hale geliyor ya da
//            başka bir sayının hiç adayı kalmıyorsa, o aday elenir.
// ---------------------------------------------------------------------------

/** Adaylar: alive[k] = aday indeksleri kümesi (Set). */
export function newState(P, cands) {
  return cands.map((list) => new Set(list.map((_, j) => j)));
}

function coverCount(P, cands, alive) {
  const cov = Array.from({ length: P.n }, () => []);
  alive.forEach((set, k) => {
    for (const j of set) for (const i of cands[k][j].cells) cov[i].push(k);
  });
  // aynı sayının birden çok adayı aynı kareyi örtebilir — tekil sayılar
  return cov.map((list) => [...new Set(list)]);
}

function commonCells(cands, k, set) {
  let common = null;
  for (const j of set) {
    const cells = cands[k][j].cells;
    if (!common) common = new Set(cells);
    else for (const i of [...common]) if (!cells.includes(i)) common.delete(i);
  }
  return common ?? new Set();
}

/**
 * Tek bir eleme adımı bulur (en basit kuraldan başlayarak).
 * Dönüş: { rule, clue, remove: [[k, j], ...], cell?, other? } ya da null.
 */
export function* allSteps(P, cands, alive, maxRule = 4) {
  const K = P.clues.length;
  // Kural 2: kesin kareler
  for (let k = 0; k < K; k++) {
    if (!alive[k].size) continue;
    const common = commonCells(cands, k, alive[k]);
    if (!common.size) continue;
    for (let o = 0; o < K; o++) {
      if (o === k) continue;
      const remove = [];
      for (const j of alive[o]) if (cands[o][j].cells.some((i) => common.has(i))) remove.push([o, j]);
      if (remove.length) {
        const cell = cands[o][remove[0][1]].cells.find((i) => common.has(i));
        yield { rule: 2, clue: o, other: k, cell, remove };
      }
    }
  }
  // Kural 3: tek sayının ulaşabildiği kare
  const cov = coverCount(P, cands, alive);
  for (let i = 0; i < P.n; i++) {
    if (cov[i].length !== 1) continue;
    const k = cov[i][0];
    const remove = [];
    for (const j of alive[k]) if (!cands[k][j].cells.includes(i)) remove.push([k, j]);
    if (remove.length) yield { rule: 3, clue: k, cell: i, remove };
  }
  if (maxRule < 4) return;
  // Kural 4: bir aday seçilince çelişki
  for (let k = 0; k < K; k++) {
    if (alive[k].size < 2) continue;
    for (const j of alive[k]) {
      const R = cands[k][j];
      const inR = new Set(R.cells);
      // diğer sayıların bu adayla çakışmayan adayları
      let bad = null;
      const covered = new Uint8Array(P.n);
      for (const i of R.cells) covered[i] = 1;
      for (let o = 0; o < K && !bad; o++) {
        if (o === k) continue;
        let any = false;
        for (const jj of alive[o]) {
          const RR = cands[o][jj];
          if (RR.cells.some((i) => inR.has(i))) continue;
          any = true;
          for (const i of RR.cells) covered[i] = 1;
        }
        if (!any) bad = { other: o };
      }
      if (!bad) {
        const hole = covered.findIndex((v) => !v);
        if (hole >= 0) bad = { cell: hole };
      }
      if (bad) yield { rule: 4, clue: k, remove: [[k, j]], ...bad };
    }
  }
}

export function findStep(P, cands, alive, maxRule = 4) {
  for (const step of allSteps(P, cands, alive, maxRule)) return step;
  return null;
}

export function applyStep(alive, step) {
  for (const [k, j] of step.remove) alive[k].delete(j);
}

/** Mantıkla çözmeyi dener. { solved, rule4, steps, alive } */
export function logicalSolve(P, maxRule = 4, cands = candidatesOf(P), alive = newState(P, cands)) {
  let rule4 = 0, steps = 0;
  for (;;) {
    if (alive.every((s) => s.size === 1)) break;
    if (alive.some((s) => s.size === 0)) return { solved: false, rule4, steps, alive, contradiction: true };
    const step = findStep(P, cands, alive, maxRule);
    if (!step) break;
    if (step.rule === 4) rule4++;
    steps++;
    applyStep(alive, step);
  }
  return { solved: alive.every((s) => s.size === 1), rule4, steps, alive };
}

// ---------------------------------------------------------------------------
// Akıllı İpucu: oyuncunun doğru yerleştirdiği dikdörtgenleri sabit kabul edip
// bir sonraki kesin dikdörtgeni ve nedenini bulur.
// ---------------------------------------------------------------------------

const shapeText = (s) => `${s.w}×${s.h}`;

function shapeLesson(P, cands, k, alive) {
  const n = P.clues[k].n;
  if (n === 1) return '1 yazan kare tek başına 1×1’lik bir dikdörtgendir.';
  const shapes = shapesOf(n).filter((s) => s.h <= P.h && s.w <= P.w);
  const list = shapes.map(shapeText).join(', ');
  const fit = new Set();
  for (const j of alive) fit.add(shapeText(cands[k][j]));
  const isPrime = shapesOf(n).length === 2 && n > 1;
  const head = isPrime
    ? `${n} asal bir sayı: yalnızca ${list} olabilir.`
    : `${n} = en × boy → ${list} olabilir.`;
  return { head, fit: [...fit] };
}

/**
 * placed: oyuncunun DOĞRU yerleştirdiği dikdörtgenlerin ipucu indeksleri (Set).
 * Dönüş: { clue, rect, msg, focus: [hücre...] } ya da null.
 */
export function nextHint(P, placed) {
  const cands = candidatesOf(P);
  const sol = P.solution;
  const alive = newState(P, cands);
  // Yerleştirilmiş sayılar sabit; diğerlerinin onlarla çakışan adayları elenir.
  const fixed = new Set();
  for (const k of placed) {
    const key = rectKey(sol[k]);
    const j = cands[k].findIndex((R) => rectKey(R) === key);
    alive[k] = new Set([j]);
    for (const i of cands[k][j].cells) fixed.add(i);
  }
  for (let k = 0; k < P.clues.length; k++) {
    if (placed.has(k)) continue;
    for (const j of [...alive[k]]) if (cands[k][j].cells.some((i) => fixed.has(i))) alive[k].delete(j);
  }
  const open = P.clues.map((_, k) => k).filter((k) => !placed.has(k));
  if (!open.length) return null;
  const clueTxt = (k) => `${P.clues[k].n}`;
  const finish = (k, msg, focus = []) => ({ clue: k, rect: sol[k], msg, focus });

  // A) Tek adayı kalan sayı (en küçük adaylılar önce)
  const singles = open.filter((k) => alive[k].size === 1);
  if (singles.length) {
    singles.sort((a, b) => P.clues[a].n - P.clues[b].n);
    const k = singles[0];
    const L = shapeLesson(P, cands, k, alive[k]);
    if (typeof L === 'string') return finish(k, `${L} Parlayan kareyi 1×1’lik dikdörtgen yap.`);
    const R = sol[k];
    return finish(k, `${L.head} Başka sayılara ve dolu karelere çarpmadan yalnızca ${R.w}×${R.h} sığıyor, o da tek bir yere. Parlayan dikdörtgeni çiz.`);
  }
  // B) Tek adımda kesinleşen bir sayı (önce en basit kural)
  const direct = [];
  for (const step of allSteps(P, cands, alive, 3)) {
    if (!placed.has(step.clue) && alive[step.clue].size - step.remove.length === 1) direct.push(step);
  }
  direct.sort((x, y) => (y.rule === 3) - (x.rule === 3));
  if (!direct.length) {
    for (const step of allSteps(P, cands, alive, 4)) {
      if (step.rule === 4 && alive[step.clue].size - step.remove.length === 1) { direct.push(step); break; }
    }
  }
  const explain = direct[0] ?? null;
  // C) Adım adım mantık: ilk kesinleşen dikdörtgene kadar kuralları uygula,
  //    sonuca giden son nedeni anlat.
  let first = null;
  for (let guard = 0; guard < 500; guard++) {
    const step = guard === 0 && explain ? explain : findStep(P, cands, alive, 4);
    if (!step) break;
    first ??= step;
    applyStep(alive, step);
    const k = step.clue;
    if (!placed.has(k) && alive[k].size === 1) {
      const R = sol[k];
      const n = clueTxt(k);
      const o = step.other;
      const oTxt = o !== undefined ? (P.clues[o].n === P.clues[k].n ? `öteki ${clueTxt(o)}` : clueTxt(o)) : '';
      const oGen = o !== undefined ? (P.clues[o].n === P.clues[k].n ? `öteki ${gen(P.clues[o].n)}` : gen(P.clues[o].n)) : '';
      let why;
      if (step.rule === 2) {
        why = `${oTxt.charAt(0).toUpperCase() + oTxt.slice(1)} sayısının bütün olası dikdörtgenleri ${cellName(P, step.cell)} karesini kapsıyor; o kare kesinlikle ${oGen}. Bu yüzden ${n} oraya uzanamaz.`;
      } else if (step.rule === 3) {
        why = `${cellName(P, step.cell)} karesine yalnızca ${n} ulaşabiliyor; demek ki ${gen(P.clues[k].n)} dikdörtgeni o kareyi içermeli.`;
      } else if (o !== undefined) {
        why = `${n} başka bir yere konsaydı, ${oTxt} sayısının hiç yeri kalmazdı.`;
      } else {
        why = `${n} başka bir yere konsaydı, ${cellName(P, step.cell)} karesine hiçbir sayı ulaşamazdı.`;
      }
      if (first !== step) why = `Diğer sayıların gidebileceği yerleri düşün. ${why}`;
      const focus = [];
      if (step.cell !== undefined) focus.push(step.cell);
      if (o !== undefined) focus.push(P.clues[o].i);
      return finish(k, `${why} Geriye ${n} için tek bir yer kalıyor: ${R.w}×${R.h} = ${n}. Parlayan dikdörtgeni çiz.`, focus);
    }
    // başka bir sayı kesinleştiyse onu anlatmak daha kolay
    const other = open.find((o) => alive[o].size === 1);
    if (other !== undefined) {
      const R = sol[other];
      return finish(other, `Diğer sayıların gidebileceği yerleri düşününce ${clueTxt(other)} yalnızca tek bir yere sığıyor: ${R.w}×${R.h} = ${clueTxt(other)}. Parlayan dikdörtgeni çiz.`);
    }
  }
  // Yedek: çözümden bir dikdörtgen
  const k = open[0];
  const R = sol[k];
  return finish(k, `${clueTxt(k)} için doğru dikdörtgen ${R.w}×${R.h}. Parlayan dikdörtgeni çiz.`);
}

// ---------------------------------------------------------------------------
// Üretici
// ---------------------------------------------------------------------------

const SIZES = {
  easy: (i) => (i < 10 ? 5 : 6),
  medium: (i) => (i < 7 ? 7 : i < 14 ? 8 : 9),
  hard: (i) => (i < 7 ? 10 : i < 14 ? 11 : 12),
};
const MAX_AREA = {
  easy: (i) => (i < 10 ? 6 : 8),
  medium: (i) => (i < 7 ? 9 : i < 14 ? 10 : 12),
  hard: (i) => (i < 7 ? 12 : i < 14 ? 14 : 16),
};

/** Rastgele dikdörtgen bölüntüsü (satır satır ilk boş kareden başlar). */
function randomPartition(rng, w, h, maxArea, max1x1) {
  const owner = new Int16Array(w * h).fill(-1);
  const rects = [];
  let ones = 0;
  for (let i = 0; i < w * h; i++) {
    if (owner[i] >= 0) continue;
    const r = Math.floor(i / w), c = i % w;
    let maxW = 0;
    while (c + maxW < w && owner[r * w + c + maxW] < 0) maxW++;
    const opts = [];
    for (let ww = 1; ww <= maxW; ww++) {
      for (let hh = 1; r + hh <= h && ww * hh <= maxArea; hh++) {
        let ok = true;
        for (let cc = c; cc < c + ww && ok; cc++) if (owner[(r + hh - 1) * w + cc] >= 0) ok = false;
        if (!ok) break;
        const a = ww * hh;
        let wt = a === 1 ? 0.12 : a === 2 ? 0.7 : 1;
        const ratio = Math.max(ww, hh) / Math.min(ww, hh);
        if (ratio > 4) wt *= 0.35;
        else if (ratio > 2) wt *= 0.7;
        opts.push({ ww, hh, wt });
      }
    }
    let tot = opts.reduce((s, o) => s + o.wt, 0);
    let x = rng.next() * tot, pick = opts[opts.length - 1];
    for (const o of opts) { if ((x -= o.wt) < 0) { pick = o; break; } }
    if (pick.ww * pick.hh === 1 && ++ones > max1x1) return null;
    const R = { r, c, h: pick.hh, w: pick.ww };
    for (let rr = r; rr < r + R.h; rr++) for (let cc = c; cc < c + R.w; cc++) owner[rr * w + cc] = rects.length;
    rects.push(R);
  }
  return rects;
}

function buildLevel(w, h, rects, cluePos) {
  // ipuçlarını satır satır sırala
  const items = rects.map((R, k) => ({ R, i: cluePos[k] })).sort((a, b) => a.i - b.i);
  const cells = new Array(w * h).fill('.');
  for (const { R, i } of items) cells[i] = String(R.w * R.h);
  const rows = [];
  for (let r = 0; r < h; r++) rows.push(cells.slice(r * w, r * w + w).join(','));
  return {
    w, h,
    puzzle: rows.join('/'),
    solution: items.map(({ R }) => rectKey(R)).join(';'),
  };
}

export function generateLevel(rng, difficulty, index, total = 20) {
  const size = SIZES[difficulty](index);
  const maxArea = MAX_AREA[difficulty](index);
  const w = size, h = size;
  const max1x1 = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const maxRule = difficulty === 'easy' ? 3 : 4;
  // Zor seviyenin ikinci yarısında ileri kural (Kural 4) en az bir kez gereksin.
  const wantRule4 = difficulty === 'hard' && index >= 8 ? 1 : difficulty === 'medium' && index >= 14 ? 1 : 0;
  let best = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const rects = randomPartition(rng, w, h, maxArea, max1x1);
    if (!rects) continue;
    const pos = rects.map((R) => {
      const cells = [];
      for (let r = R.r; r < R.r + R.h; r++) for (let c = R.c; c < R.c + R.w; c++) cells.push(r * w + c);
      return cells;
    });
    let cluePos = pos.map((cells) => cells[rng.int(0, cells.length - 1)]);
    // Çözülemeyen bölgelerde ipucu yerlerini yeniden dene.
    for (let tries = 0; tries < 40; tries++) {
      const lv = buildLevel(w, h, rects, cluePos);
      const P = parseLevel(lv);
      const res = logicalSolve(P, maxRule);
      if (res.solved) {
        const full = maxRule === 4 ? res : logicalSolve(P, 4);
        const r3 = logicalSolve(P, 3);
        const rule4 = r3.solved ? 0 : full.rule4;
        const level = { ...lv, clues: P.clues.length, tier: rule4 ? 4 : 3, score: full.steps + 5 * rule4 };
        if (rule4 < wantRule4) {
          if (!best || level.score > best.score) best = level;
          break;
        }
        return level;
      }
      // çözülemeyen ipuçlarını oynat
      const sorted = rects.map((R, k) => ({ R, k, i: cluePos[k] })).sort((a, b) => a.i - b.i);
      sorted.forEach((it, idx) => {
        if (res.alive[idx].size !== 1) cluePos[it.k] = pos[it.k][rng.int(0, pos[it.k].length - 1)];
      });
    }
  }
  if (best) return best;
  throw new Error('Bulmaca üretilemedi');
}

// ---------------------------------------------------------------------------
// Doğrulayıcı
// ---------------------------------------------------------------------------

export function verifyLevel(level) {
  let P;
  try {
    P = parseLevel(level);
  } catch (e) {
    return `Ayrıştırılamadı: ${e.message}`;
  }
  if (!Number.isInteger(P.w) || !Number.isInteger(P.h) || P.w < 2 || P.h < 2) return 'Geçersiz boyut';
  if (level.puzzle.split('/').length !== P.h || level.puzzle.split('/').some((row) => row.split(',').length !== P.w)) return 'Bulmaca boyutu uyuşmuyor';
  if (P.clues.some((k) => !Number.isInteger(k.n) || k.n < 1)) return 'Geçersiz ipucu';
  const err = checkSolution(P, P.solution);
  if (err) return err;
  const count = countSolutions(P, 2);
  if (count !== 1) return `Çözüm sayısı ${count} (1 olmalı)`;
  if (!logicalSolve(P, 4).solved) return 'Mantıkla çözülemiyor';
  return null;
}
