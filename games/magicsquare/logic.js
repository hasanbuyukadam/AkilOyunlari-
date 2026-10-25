// Sihirli Kare mantığı — tarayıcıda ve Node'da çalışır, DOM kullanmaz.
//
// Bulmaca metni: "<n>:<sayılar>:<hücreler>"
//   n        : kenar uzunluğu (3, 4, 5)
//   sayılar  : kullanılacak n² sayı, küçükten büyüğe, virgülle
//   hücreler : n² değer satır satır, virgülle; '.' = boş
// Çözüm: n² sayılık dizi (satır satır).
// Sihirli toplam = sayıların toplamı / n. Her satır, sütun ve iki ana çapraz bu toplamı verir.

const popcount = (m) => { let c = 0; while (m) { m &= m - 1; c++; } return c; };
const lowest = (m) => 31 - Math.clz32(m & -m);
const bitsOf = (m) => { const out = []; while (m) { const b = lowest(m); out.push(b); m &= m - 1; } return out; };

// ---------------------------------------------------------------------------
// Ayrıştırma ve geometri

export function parsePuzzle(str) {
  const [ns, numsStr, cellsStr] = String(str).split(':');
  const n = Number(ns);
  const nums = numsStr.split(',').map(Number);
  const cells = cellsStr.split(',').map((x) => (x === '.' ? 0 : Number(x)));
  return { n, nums, cells, target: nums.reduce((a, b) => a + b, 0) / n };
}

export function stringifyPuzzle(n, nums, cells) {
  return `${n}:${nums.join(',')}:${cells.map((v) => (v ? String(v) : '.')).join(',')}`;
}

const geomCache = new Map();
/** Satırlar (0..n-1), sütunlar (n..2n-1), ↘ çapraz (2n), ↙ çapraz (2n+1). */
export function geom(n) {
  if (geomCache.has(n)) return geomCache.get(n);
  const lines = [];
  for (let r = 0; r < n; r++) lines.push(Array.from({ length: n }, (_, c) => r * n + c));
  for (let c = 0; c < n; c++) lines.push(Array.from({ length: n }, (_, r) => r * n + c));
  lines.push(Array.from({ length: n }, (_, i) => i * n + i));
  lines.push(Array.from({ length: n }, (_, i) => i * n + (n - 1 - i)));
  const cellLines = Array.from({ length: n * n }, () => []);
  lines.forEach((cells, l) => cells.forEach((c) => cellLines[c].push(l)));
  const g = { n, N: n * n, lines, cellLines };
  geomCache.set(n, g);
  return g;
}

/** Çizginin adı. form: 'nom' (yalın) ya da 'loc' (-de hâli). */
export function lineName(n, l, form = 'nom') {
  const loc = form === 'loc';
  if (l < n) return `${l + 1}. satır${loc ? 'da' : ''}`;
  if (l < 2 * n) return `${l - n + 1}. sütun${loc ? 'da' : ''}`;
  if (l === 2 * n) return `↘ çapraz${loc ? 'da' : ''}`;
  return `↙ çapraz${loc ? 'da' : ''}`;
}

export const cellName = (n, c) => `${Math.floor(c / n) + 1}. satır, ${(c % n) + 1}. sütun`;

/** Bir değer dizisinde (0 = boş) her çizginin durumu. */
export function lineStatus(n, values, target) {
  const { lines } = geom(n);
  return lines.map((cells) => {
    let sum = 0, filled = 0;
    for (const c of cells) if (values[c]) { sum += values[c]; filled++; }
    const full = filled === n;
    return { sum, full, ok: full && sum === target, bad: (full && sum !== target) || sum > target };
  });
}

// ---------------------------------------------------------------------------
// Tam arama (çözüm sayacı) — mantık çözücüsünden bağımsızdır.
// Kısmi çizgi toplamlarını, kalan sayıların en küçük/en büyük k toplamıyla sınırlar.

export function countSolutions(n, nums, cells, limit = 2, order = null) {
  const { N, lines, cellLines } = geom(n);
  const T = nums.reduce((a, b) => a + b, 0) / n;
  const sorted = nums.slice().sort((a, b) => a - b);
  const idxOf = new Map(sorted.map((v, i) => [v, i]));
  const vals = Int32Array.from(cells);
  const L = lines.length;
  const lsum = new Int32Array(L), lempty = new Int32Array(L);
  let used = 0;
  for (const v of vals) {
    if (!v) continue;
    if (!idxOf.has(v)) return { count: 0, first: null };
    const b = 1 << idxOf.get(v);
    if (used & b) return { count: 0, first: null };
    used |= b;
  }
  lines.forEach((lc, l) => { for (const c of lc) { if (vals[c]) lsum[l] += vals[c]; else lempty[l]++; } });
  const valueOrder = order ? order.slice() : sorted.map((_, i) => i);
  let count = 0;
  let first = null;
  const lo = new Int32Array(N + 1), hi = new Int32Array(N + 1);

  const feasible = () => {
    // en küçük / en büyük k kullanılmamış sayının toplamı
    let k = 0;
    for (let i = 0; i < N; i++) if (!(used & (1 << i))) { lo[k + 1] = lo[k] + sorted[i]; k++; }
    k = 0;
    for (let i = N - 1; i >= 0; i--) if (!(used & (1 << i))) { hi[k + 1] = hi[k] + sorted[i]; k++; }
    for (let l = 0; l < L; l++) {
      const R = T - lsum[l], e = lempty[l];
      if (R < lo[e] || R > hi[e]) return false;
    }
    return true;
  };

  const place = (c, v, sign) => {
    vals[c] = sign > 0 ? v : 0;
    for (const l of cellLines[c]) { lsum[l] += sign * v; lempty[l] -= sign; }
    used ^= 1 << idxOf.get(v);
  };

  const dfs = () => {
    if (!feasible()) return;
    // en az boşluğu olan çizgiyi seç
    let best = -1, bk = 99;
    for (let l = 0; l < L; l++) if (lempty[l] && lempty[l] < bk) { bk = lempty[l]; best = l; }
    if (best < 0) {
      count++;
      if (!first) first = Array.from(vals);
      return;
    }
    const cell = lines[best].find((c) => !vals[c]);
    if (bk === 1) {
      const v = T - lsum[best];
      const i = idxOf.get(v);
      if (i === undefined || used & (1 << i)) return;
      place(cell, v, 1); dfs(); place(cell, v, -1);
      return;
    }
    for (const i of valueOrder) {
      if (used & (1 << i)) continue;
      const v = sorted[i];
      place(cell, v, 1); dfs(); place(cell, v, -1);
      if (count >= limit) return;
    }
  };
  if (feasible()) dfs();
  return { count, first };
}

/** Rastgele (tohumlu) bir sihirli kare: verilen sayılarla. */
export function randomMagic(n, nums, rng) {
  const order = rng.shuffle(nums.map((_, i) => i));
  return countSolutions(n, nums, new Array(n * n).fill(0), 1, order).first;
}

// ---------------------------------------------------------------------------
// Mantık çözücüsü (ipucu ve zorluk derecesi için)
//   1: tek boş kare — eksik = toplam − diğerleri
//   2: kare için aday kesişimi (her çizginin kalan sayılardan olası toplamları)
//   3: sayı için tek yer (bir sayı yalnızca bir kareye uyuyor)
//   4: derin eleme (çizgi adaylarını birlikte düşünme) → tek aday ya da tek yer

function makeCtx(n, nums) {
  const g = geom(n);
  const sorted = nums.slice().sort((a, b) => a - b);
  const idxOf = new Map(sorted.map((v, i) => [v, i]));
  const T = sorted.reduce((a, b) => a + b, 0) / n;
  return { ...g, sorted, idxOf, T };
}

/** Kalan sayılardan (mask) k tanesinin toplamı R olan tüm kombinasyonlar (indeks dizileri). */
function combos(sorted, mask, k, R, limit = 5000) {
  const avail = bitsOf(mask);
  const out = [];
  const cur = [];
  const rec = (start, k, R) => {
    if (out.length >= limit) return;
    if (k === 0) { if (R === 0) out.push(cur.slice()); return; }
    for (let j = start; j <= avail.length - k; j++) {
      const v = sorted[avail[j]];
      // en küçük k toplamı R'yi aşarsa dur
      let minS = 0; for (let t = 0; t < k; t++) minS += sorted[avail[j + t]];
      if (minS > R) break;
      let maxS = v; for (let t = 0; t < k - 1; t++) maxS += sorted[avail[avail.length - 1 - t]];
      if (maxS < R) continue;
      cur.push(avail[j]);
      rec(j + 1, k - 1, R - v);
      cur.pop();
    }
  };
  rec(0, k, R);
  return out;
}

function lineInfo(X, vals, l, unused) {
  const cells = X.lines[l];
  let sum = 0; const empties = []; const filled = [];
  for (const c of cells) { if (vals[c]) { sum += vals[c]; filled.push(vals[c]); } else empties.push(c); }
  const R = X.T - sum;
  return { l, cells, empties, filled, R, sum };
}

/** Her çizgi için temel aday maskesi: kalan sayılardan k tanesi toplamı R yapacak şekilde seçilebiliyor mu. */
function basicLineMasks(X, vals, unused) {
  return X.lines.map((_, l) => {
    const info = lineInfo(X, vals, l, unused);
    const k = info.empties.length;
    if (k === 0) return { ...info, mask: 0, combos: [] };
    const cs = combos(X.sorted, unused, k, info.R);
    let mask = 0; for (const cmb of cs) for (const i of cmb) mask |= 1 << i;
    return { ...info, mask, combos: cs };
  });
}

/** Çizgi için genelleştirilmiş tutarlılık: her boş karenin her adayı için destek arar. */
function lineSupports(X, vals, l, cand) {
  const info = lineInfo(X, vals, l);
  const E = info.empties;
  const k = E.length;
  const sup = new Array(k).fill(0);
  if (!k) return { E, sup };
  const mins = E.map((c) => X.sorted[lowest(cand[c])] ?? 0);
  const maxs = E.map((c) => X.sorted[31 - Math.clz32(cand[c])] ?? 0);
  const sufMin = new Array(k + 1).fill(0), sufMax = new Array(k + 1).fill(0);
  for (let j = k - 1; j >= 0; j--) { sufMin[j] = sufMin[j + 1] + mins[j]; sufMax[j] = sufMax[j + 1] + maxs[j]; }
  const pick = new Array(k);
  const rec = (j, R, usedM) => {
    if (j === k) {
      if (R !== 0) return false;
      for (let t = 0; t < k; t++) sup[t] |= 1 << pick[t];
      return true;
    }
    if (R < sufMin[j] || R > sufMax[j]) return false;
    let any = false;
    for (const i of bitsOf(cand[E[j]] & ~usedM)) {
      pick[j] = i;
      if (rec(j + 1, R - X.sorted[i], usedM | (1 << i))) any = true;
    }
    return any;
  };
  rec(0, info.R, 0);
  return { E, sup };
}

function unusedMask(X, vals) {
  let m = (1 << X.N) - 1;
  for (const v of vals) if (v) m &= ~(1 << X.idxOf.get(v));
  return m;
}

/**
 * Sıradaki mantıklı adım. vals: mevcut (doğru) değerler, 0 = boş.
 * Dönüş: { tech, cell, value, lines, ... } ya da null.
 */
export function nextStep(n, nums, vals, maxTech = 4) {
  const X = makeCtx(n, nums);
  const unused = unusedMask(X, vals);
  const empties = []; for (let c = 0; c < X.N; c++) if (!vals[c]) empties.push(c);
  if (!empties.length) return null;

  // 1: tek boş karesi olan çizgi
  for (let l = 0; l < X.lines.length; l++) {
    const info = lineInfo(X, vals, l);
    if (info.empties.length === 1) {
      const i = X.idxOf.get(info.R);
      if (i === undefined || !(unused & (1 << i))) continue; // tutarsız (olmamalı)
      return { tech: 1, cell: info.empties[0], value: info.R, lines: [l], filled: info.filled, target: X.T };
    }
  }
  if (maxTech < 2) return null;

  // 2: aday kesişimi
  const B = basicLineMasks(X, vals, unused);
  const cand = new Array(X.N).fill(0);
  for (const c of empties) {
    let m = unused;
    for (const l of X.cellLines[c]) m &= B[l].mask;
    cand[c] = m;
  }
  for (const c of empties) {
    if (popcount(cand[c]) === 1) {
      const value = X.sorted[lowest(cand[c])];
      const all = X.cellLines[c].filter((l) => B[l].mask !== unused).map((l) => ({
        l, R: B[l].R, sum: B[l].sum, k: B[l].empties.length,
        combos: B[l].combos.slice(0, 6).map((cmb) => cmb.map((i) => X.sorted[i])), more: B[l].combos.length > 6,
        options: bitsOf(B[l].mask & unused).map((i) => X.sorted[i]),
      }));
      const lineData = minimalLines(all, value);
      return { tech: 2, cell: c, value, lines: lineData.map((d) => d.l), target: X.T, lineData };
    }
  }
  if (maxTech < 3) return null;

  // 3: sayı için tek yer
  for (const i of bitsOf(unused)) {
    const places = empties.filter((c) => cand[c] & (1 << i));
    if (places.length === 1) return { tech: 3, cell: places[0], value: X.sorted[i], lines: X.cellLines[places[0]], target: X.T };
  }
  if (maxTech < 4) return null;

  // 4: derin eleme — çizgi tutarlılığı + tek yer, sabit noktaya kadar
  const basic = cand.slice();
  let changed = true;
  while (changed) {
    changed = false;
    for (let l = 0; l < X.lines.length; l++) {
      const { E, sup } = lineSupports(X, vals, l, cand);
      E.forEach((c, t) => { const m = cand[c] & sup[t]; if (m !== cand[c]) { cand[c] = m; changed = true; } });
    }
    for (const i of bitsOf(unused)) {
      const places = empties.filter((c) => cand[c] & (1 << i));
      if (places.length === 1 && popcount(cand[places[0]]) > 1) { cand[places[0]] = 1 << i; changed = true; }
    }
    if (empties.some((c) => !cand[c])) return null; // çelişki (olmamalı)
    if (empties.some((c) => popcount(cand[c]) === 1 && popcount(basic[c]) > 1)) break;
  }
  for (const c of empties) {
    if (popcount(cand[c]) === 1 && popcount(basic[c]) > 1) {
      const value = X.sorted[lowest(cand[c])];
      // elenen her aday için hangi çizginin izin vermediğini bul
      const reasons = [];
      for (const i of bitsOf(basic[c] & ~cand[c])) {
        let why = -1;
        for (const l of X.cellLines[c]) {
          const tmp = cand.slice(); tmp[c] = 1 << i;
          const { E, sup } = lineSupports(X, vals, l, tmp);
          if (!sup[E.indexOf(c)]) { why = l; break; }
        }
        reasons.push({ value: X.sorted[i], line: why });
      }
      return {
        tech: 4, cell: c, value, target: X.T,
        lines: [...new Set(reasons.map((r) => r.line).filter((l) => l >= 0))],
        options: bitsOf(basic[c]).map((i) => X.sorted[i]), reasons,
      };
    }
  }
  return null;
}

/** Mantıkla çözer; çözülemezse solved=false. */
export function logicSolve(n, nums, cells, maxTech = 4) {
  const vals = cells.slice();
  const used = [0, 0, 0, 0, 0];
  let max = 0;
  for (;;) {
    if (vals.every(Boolean)) return { solved: true, vals, max, used };
    const s = nextStep(n, nums, vals, maxTech);
    if (!s) return { solved: false, vals, max, used };
    vals[s.cell] = s.value;
    used[s.tech]++;
    max = Math.max(max, s.tech);
  }
}

// ---------------------------------------------------------------------------
// İpucu metni

const plus = (arr) => arr.join(' + ');
const orList = (arr) => (arr.length === 1 ? String(arr[0]) : `${arr.slice(0, -1).join(', ')} ya da ${arr[arr.length - 1]}`);

/** "2. satır 3. sütundaki" — arkasına "kare(ye)" gelir. */
export const cellRef = (n, c) => `${Math.floor(c / n) + 1}. satır ${(c % n) + 1}. sütundaki`;

/** Kesişimi tek sayı bırakan en küçük çizgi grubunu seçer. */
function minimalLines(lineData, value) {
  const k = lineData.length;
  for (let size = 1; size <= k; size++) {
    const pick = [];
    const rec = (start) => {
      if (pick.length === size) {
        let opts = null;
        for (const d of pick) opts = opts ? opts.filter((v) => d.options.includes(v)) : d.options.slice();
        return opts.length === 1 && opts[0] === value;
      }
      for (let j = start; j < k; j++) { pick.push(lineData[j]); if (rec(j + 1)) return true; pick.pop(); }
      return false;
    };
    if (rec(0)) return pick;
  }
  return lineData;
}

export function explainStep(n, s) {
  const at = cellRef(n, s.cell);
  if (s.tech === 1) {
    const l = s.lines[0];
    return `${lineName(n, l, 'loc')} tek boş kare var: ${s.target} − (${plus(s.filled)}) = ${s.value}. Bu sayı ${at} kareye gelir.`;
  }
  if (s.tech === 2) {
    const data = s.lineData;
    const parts = data.map((d) => {
      const need = d.sum ? `${s.target} − ${d.sum} = ${d.R}` : `${d.R}`;
      const what = d.k === 2 ? 'iki boş karenin' : `${d.k} boş karenin`;
      let txt = `${lineName(n, d.l, 'loc')} kalan ${what} toplamı ${need} olmalı`;
      if (d.k === 2 && !d.more) txt += ` (${d.combos.map((c) => c.join(' + ')).join(', ')})`;
      return `${txt}, yani buraya ${orList(d.options)} gelebilir.`;
    });
    const tail = data.length > 1 ? `İkisine birden uyan tek sayı ${s.value}!` : `Kalan sayılardan uyan tek sayı ${s.value}!`;
    if (data.length > 2) return `${at} kareye bak. ${parts.join(' ')} Hepsine birden uyan tek sayı ${s.value}!`;
    return `${at} kareye bak. ${parts.join(' ')} ${tail}`;
  }
  if (s.tech === 3) {
    return `${s.value} sayısı nereye gidebilir? Boş karelerin satır, sütun ve çapraz toplamlarına bakınca ${s.value} yalnızca ${at} kareye uyuyor.`;
  }
  const byLine = new Map();
  for (const r of s.reasons) { if (!byLine.has(r.line)) byLine.set(r.line, []); byLine.get(r.line).push(r.value); }
  const parts = [];
  for (const [l, vs] of byLine) {
    if (l >= 0) parts.push(`${orList(vs)} koyarsak ${lineName(n, l, 'loc')} kalan kareler için uygun sayı kalmıyor`);
    else parts.push(`${orList(vs)} ise başka bir karede gerekiyor`);
  }
  return `${at} kareye ilk bakışta ${orList(s.options)} uyar gibi. Ama ${parts.join('; ')}. Geriye yalnızca ${s.value} kalıyor!`;
}

// ---------------------------------------------------------------------------
// Üretim

const SETS_EASY = [
  { from: 1, step: 1 }, { from: 1, step: 1 }, { from: 1, step: 1 }, { from: 1, step: 1 }, { from: 1, step: 1 },
  { from: 1, step: 1 }, { from: 2, step: 1 }, { from: 1, step: 1 }, { from: 3, step: 1 }, { from: 2, step: 1 },
  { from: 2, step: 2 }, { from: 11, step: 1 }, { from: 2, step: 2 }, { from: 1, step: 2 }, { from: 5, step: 5 },
  { from: 3, step: 3 }, { from: 10, step: 10 }, { from: 4, step: 1 }, { from: 2, step: 2 }, { from: 5, step: 5 },
];

/** Her level için ayarlar: boyut, sayı kümesi, en zor izinli teknik, hedef verilen sayısı, gereken teknik. */
export function levelPlan(difficulty, index) {
  if (difficulty === 'easy') {
    const set = SETS_EASY[index];
    const nums = Array.from({ length: 9 }, (_, i) => set.from + i * set.step);
    // ilk leveller yalnızca "tek boş kare" kuralıyla çözülür
    if (index < 3) return { n: 3, nums, maxTech: 1, givens: 5, needTech: 1 };
    if (index < 7) return { n: 3, nums, maxTech: 1, givens: 4, needTech: 1 };
    if (index < 14) return { n: 3, nums, maxTech: 1, givens: 3, needTech: 1 };
    return { n: 3, nums, maxTech: 2, givens: index < 17 ? 3 : 2, needTech: 2 };
  }
  const nums16 = Array.from({ length: 16 }, (_, i) => i + 1);
  if (difficulty === 'medium') {
    if (index < 6) return { n: 4, nums: nums16, maxTech: 1, givens: 10 - Math.floor(index / 2), needTech: 1 };
    if (index < 14) return { n: 4, nums: nums16, maxTech: 2, givens: 8 - Math.floor((index - 6) / 4), needTech: 2 };
    return { n: 4, nums: nums16, maxTech: 3, givens: 6, needTech: 2 };
  }
  // hard
  if (index < 15) return { n: 4, nums: nums16, maxTech: 4, givens: index < 6 ? 6 : 5, needTech: index < 6 ? 3 : 4 };
  const nums25 = Array.from({ length: 25 }, (_, i) => i + 1);
  return { n: 5, nums: nums25, maxTech: 4, givens: 12 - Math.floor((index - 15) / 2), needTech: 3 };
}

export function generateLevel(rng, difficulty, index) {
  const plan = levelPlan(difficulty, index);
  const { n, nums, maxTech } = plan;
  const N = n * n;
  let best = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const sol = randomMagic(n, nums, rng);
    const cells = sol.slice();
    const order = rng.shuffle(Array.from({ length: N }, (_, i) => i));
    let count = N;
    for (const c of order) {
      if (count <= plan.givens) break;
      const v = cells[c];
      cells[c] = 0;
      if (logicSolve(n, nums, cells, maxTech).solved) count--;
      else cells[c] = v;
    }
    const res = logicSolve(n, nums, cells, maxTech);
    const score = (count === plan.givens ? 0 : 10 * (count - plan.givens)) + (res.max >= plan.needTech ? 0 : 5);
    if (!best || score < best.score) best = { score, cells, sol, res, count };
    if (score === 0) break;
  }
  const { cells, sol, res, count } = best;
  return {
    size: n,
    numbers: nums,
    target: nums.reduce((a, b) => a + b, 0) / n,
    puzzle: stringifyPuzzle(n, nums, cells),
    solution: sol,
    givens: count,
    tech: res.max,
  };
}

// ---------------------------------------------------------------------------
// Doğrulama

export function verifyLevel(level) {
  let P;
  try { P = parsePuzzle(level.puzzle); } catch { return 'Bulmaca metni okunamadı'; }
  const { n, nums, cells, target } = P;
  const N = n * n;
  if (![3, 4, 5].includes(n)) return 'Geçersiz boyut';
  if (nums.length !== N || cells.length !== N) return 'Uzunluk hatalı';
  if (new Set(nums).size !== N || nums.some((v) => !Number.isInteger(v) || v <= 0)) return 'Sayı kümesi hatalı';
  if (!Number.isInteger(target)) return 'Sihirli toplam tam sayı değil';
  if (level.size !== n || level.target !== target) return 'Seviye bilgisi tutarsız';
  if (JSON.stringify(level.numbers) !== JSON.stringify(nums)) return 'Sayılar tutarsız';
  const sol = level.solution;
  if (!Array.isArray(sol) || sol.length !== N) return 'Çözüm uzunluğu hatalı';
  if ([...sol].sort((a, b) => a - b).join() !== [...nums].sort((a, b) => a - b).join()) return 'Çözüm sayı kümesini tam bir kez kullanmıyor';
  if (lineStatus(n, sol, target).some((s) => !s.ok)) return 'Çözüm sihirli kare değil';
  for (let c = 0; c < N; c++) if (cells[c] && cells[c] !== sol[c]) return 'Verilenler çözümle uyuşmuyor';
  const { count } = countSolutions(n, nums, cells, 2);
  if (count !== 1) return `Çözüm sayısı ${count} (1 olmalı)`;
  if (!logicSolve(n, nums, cells, 4).solved) return 'Tahmin yapmadan çözülemiyor';
  return null;
}
