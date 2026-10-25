// Hesap Kafesi (KenKen) — saf mantık: üretici, tam arama çözücü, mantıksal çözücü ve ipucu motoru.
// Tarayıcıda ve Node'da ortak çalışır (DOM yok).
//
// Bulmaca metni: "N:" + kafesler ';' ile ayrılır. Her kafes: "<hedef><işlem>@<hücre,hücre,...>"
// İşlem harfleri: + (toplama), - (çıkarma), x (çarpma), / (bölme), = (tek hücre, sayı hazır).

export const OP_SYMBOL = { '+': '+', '-': '−', x: '×', '/': '÷', '=': '' };
export const OP_NAME = { '+': 'toplama', '-': 'çıkarma', x: 'çarpma', '/': 'bölme', '=': '' };

// ---------- Ayrıştırma ----------
export function parsePuzzle(puzzle) {
  const [head, body] = puzzle.split(':');
  const N = Number(head);
  const cages = body.split(';').map((s) => {
    const m = /^(\d+)([+\-x/=])@([\d,]+)$/.exec(s);
    if (!m) throw new Error(`Bozuk kafes: ${s}`);
    return { target: Number(m[1]), op: m[2], cells: m[3].split(',').map(Number) };
  });
  return { N, cages };
}

export function encodePuzzle(N, cages) {
  return `${N}:` + cages.map((k) => `${k.target}${k.op}@${k.cells.join(',')}`).join(';');
}

export const parseSolution = (s) => [...s].map(Number);
export const cageLabel = (k) => `${k.target}${OP_SYMBOL[k.op]}`;
export const cellName = (N, c) => `${Math.floor(c / N) + 1}. satır ${(c % N) + 1}. sütun`;

// ---------- Kafes aritmetiği ----------
export function cageHolds(op, target, digits) {
  switch (op) {
    case '=': return digits.length === 1 && digits[0] === target;
    case '+': return digits.reduce((a, b) => a + b, 0) === target;
    case 'x': return digits.reduce((a, b) => a * b, 1) === target;
    case '-': return digits.length === 2 && Math.abs(digits[0] - digits[1]) === target;
    case '/': {
      if (digits.length !== 2) return false;
      const hi = Math.max(...digits), lo = Math.min(...digits);
      return hi % lo === 0 && hi / lo === target;
    }
    default: return false;
  }
}

// Kafesin aritmetiğe ve kafes içi satır/sütun kuralına uyan tüm sıralı doldurmaları.
export function cageTuples(N, cage) {
  const { cells, op, target } = cage;
  const k = cells.length;
  const out = [];
  const cur = new Array(k);
  const rec = (i, acc) => {
    if (i === k) {
      if (cageHolds(op, target, cur)) out.push(cur.slice());
      return;
    }
    for (let d = 1; d <= N; d++) {
      let ok = true;
      for (let j = 0; j < i; j++) {
        if (cur[j] === d && (Math.floor(cells[j] / N) === Math.floor(cells[i] / N) || cells[j] % N === cells[i] % N)) { ok = false; break; }
      }
      if (!ok) continue;
      if (op === '+' && acc + d > target) break;
      if (op === 'x' && target % d !== 0) continue;
      cur[i] = d;
      rec(i + 1, op === '+' ? acc + d : acc);
    }
  };
  rec(0, 0);
  return out;
}

// ---------- Tam arama: çözüm sayısı (limit'e kadar) ----------
// Hiçbir sezgisel kurala dayanmaz: hücre hücre bütün olasılıkları dener.
export function countSolutions(N, cages, limit = 2) {
  const C = N * N;
  const cageOf = new Array(C).fill(-1);
  const posOf = new Array(C).fill(-1);
  const tuples = cages.map((k) => cageTuples(N, k));
  cages.forEach((k, i) => k.cells.forEach((c, p) => { cageOf[c] = i; posOf[c] = p; }));
  if (cageOf.some((x) => x < 0)) return 0;
  const val = new Array(C).fill(0);
  const rowM = new Array(N).fill(0), colM = new Array(N).fill(0);
  let count = 0;

  const candMask = (c) => {
    const r = Math.floor(c / N), cl = c % N;
    const used = rowM[r] | colM[cl];
    const k = cageOf[c], p = posOf[c], cells = cages[k].cells;
    let m = 0;
    for (const t of tuples[k]) {
      let ok = true;
      for (let j = 0; j < cells.length; j++) {
        const v = val[cells[j]];
        if (v && v !== t[j]) { ok = false; break; }
      }
      if (ok && !(used & (1 << t[p]))) m |= 1 << t[p];
    }
    return m;
  };

  const rec = () => {
    if (count >= limit) return;
    let best = -1, bestMask = 0, bestCnt = 99;
    for (let c = 0; c < C; c++) {
      if (val[c]) continue;
      const m = candMask(c);
      const cnt = popcount(m);
      if (cnt === 0) return;
      if (cnt < bestCnt) { best = c; bestMask = m; bestCnt = cnt; if (cnt === 1) break; }
    }
    if (best < 0) { count++; return; }
    const r = Math.floor(best / N), cl = best % N;
    for (let d = 1; d <= N; d++) {
      if (!(bestMask & (1 << d))) continue;
      val[best] = d; rowM[r] |= 1 << d; colM[cl] |= 1 << d;
      rec();
      val[best] = 0; rowM[r] &= ~(1 << d); colM[cl] &= ~(1 << d);
      if (count >= limit) return;
    }
  };
  rec();
  return count;
}

function popcount(m) { let n = 0; while (m) { m &= m - 1; n++; } return n; }
const bitsOf = (m) => { const a = []; for (let d = 1; d < 16; d++) if (m & (1 << d)) a.push(d); return a; };

// ---------- Mantıksal çözücü ----------
// Seviye 1: satır/sütun elemesi + kafes olasılıkları + tek aday
// Seviye 2: gizli tek (satır/sütunda tek yer) + kafesin bir sayıyı bir satıra/sütuna zorlaması
// Seviye 3: çıplak ikili/üçlü (satır/sütunda)
function makeState(N, cages, grid) {
  const C = N * N;
  const full = ((1 << (N + 1)) - 1) & ~1;
  const cand = new Array(C).fill(full);
  const val = grid ? grid.slice() : new Array(C).fill(0);
  const cageOf = new Array(C).fill(-1);
  cages.forEach((k, i) => k.cells.forEach((c) => { cageOf[c] = i; }));
  const tuples = cages.map((k) => cageTuples(N, k));
  const units = [];
  for (let r = 0; r < N; r++) units.push({ kind: 'row', idx: r, cells: Array.from({ length: N }, (_, i) => r * N + i) });
  for (let c = 0; c < N; c++) units.push({ kind: 'col', idx: c, cells: Array.from({ length: N }, (_, i) => i * N + c) });
  val.forEach((v, c) => { if (v) cand[c] = 1 << v; });
  return { N, C, cages, cand, val, cageOf, tuples, units };
}

export const unitName = (u) => (u.kind === 'row' ? `${u.idx + 1}. satır` : `${u.idx + 1}. sütun`);

function peersOf(N, c) {
  const r = Math.floor(c / N), cl = c % N, out = [];
  for (let i = 0; i < N; i++) {
    if (i !== cl) out.push(r * N + i);
    if (i !== r) out.push(i * N + cl);
  }
  return out;
}

// Yerleşmiş sayıları satır/sütundan siler, kafes olasılıklarını süzer. Değişiklik olduysa true.
function basicPropagate(st) {
  const { N, C, cand, val, cages, tuples } = st;
  let any = false, changed = true;
  while (changed) {
    changed = false;
    for (let c = 0; c < C; c++) {
      if (!val[c]) continue;
      for (const p of peersOf(N, c)) {
        if (cand[p] & (1 << val[c])) { cand[p] &= ~(1 << val[c]); changed = true; }
      }
    }
    for (let i = 0; i < cages.length; i++) {
      const cells = cages[i].cells;
      const nm = new Array(cells.length).fill(0);
      for (const t of tuples[i]) {
        if (t.every((d, j) => cand[cells[j]] & (1 << d))) t.forEach((d, j) => { nm[j] |= 1 << d; });
      }
      cells.forEach((c, j) => { if (nm[j] !== cand[c]) { cand[c] = nm[j]; changed = true; } });
    }
    if (changed) any = true;
  }
  return any;
}

function validTuples(st, i) {
  const cells = st.cages[i].cells;
  return st.tuples[i].filter((t) => t.every((d, j) => st.cand[cells[j]] & (1 << d)));
}

function findNakedSingle(st) {
  for (let c = 0; c < st.C; c++) if (!st.val[c] && popcount(st.cand[c]) === 1) return { cell: c, value: bitsOf(st.cand[c])[0] };
  return null;
}

function findHiddenSingle(st) {
  for (const u of st.units) {
    for (let d = 1; d <= st.N; d++) {
      if (u.cells.some((c) => st.val[c] === d)) continue;
      const spots = u.cells.filter((c) => !st.val[c] && st.cand[c] & (1 << d));
      if (spots.length === 1) return { cell: spots[0], value: d, unit: u };
    }
  }
  return null;
}

// Kafesin her olasılığında d sayısı aynı satır/sütunda kalıyorsa: o satırın/sütunun kafes dışı hücrelerinden d silinir.
function findCagePointing(st) {
  const { N, cages, cand, val } = st;
  for (let i = 0; i < cages.length; i++) {
    const cells = cages[i].cells;
    if (cells.every((c) => val[c])) continue;
    const vt = validTuples(st, i);
    if (!vt.length) continue;
    for (let d = 1; d <= N; d++) {
      for (const kind of ['row', 'col']) {
        const key = (c) => (kind === 'row' ? Math.floor(c / N) : c % N);
        // her olasılıkta d'nin bulunduğu satırlar/sütunlar
        let common = null;
        for (const t of vt) {
          const s = new Set();
          t.forEach((x, j) => { if (x === d) s.add(key(cells[j])); });
          common = common ? new Set([...common].filter((r) => s.has(r))) : s;
          if (!common.size) break;
        }
        if (!common || !common.size) continue;
        for (const line of common) {
          const u = st.units[(kind === 'row' ? 0 : N) + line];
          const targets = u.cells.filter((c) => !cells.includes(c) && !val[c] && cand[c] & (1 << d));
          if (targets.length) {
            return {
              tech: 'Kafes zorlaması', level: 2, digit: d, unit: u, cage: i, elim: targets, cells: cells.slice(),
              text: `${cageLabel(cages[i])} kafesinin bütün olasılıklarında ${d} sayısı ${unitName(u)} içinde kalıyor. Bu yüzden ${unitName(u)} içinde kafesin dışındaki hücrelere ${d} gelemez.`,
              apply() { targets.forEach((c) => { cand[c] &= ~(1 << d); }); },
            };
          }
        }
      }
    }
  }
  return null;
}

function findNakedSubset(st) {
  const { cand, val } = st;
  for (const size of [2, 3]) {
    for (const u of st.units) {
      const open = u.cells.filter((c) => !val[c]);
      if (open.length <= size) continue;
      const pick = [];
      const rec = (start) => {
        if (pick.length === size) {
          const m = pick.reduce((a, c) => a | cand[c], 0);
          if (popcount(m) !== size) return null;
          const targets = open.filter((c) => !pick.includes(c) && cand[c] & m);
          if (!targets.length) return null;
          const ds = bitsOf(m), group = pick.slice();
          return {
            tech: size === 2 ? 'Çıplak ikili' : 'Çıplak üçlü', level: 3, unit: u, cells: group, elim: targets,
            text: `${unitName(u)} içinde ${size} hücreye yalnızca ${ds.join(', ')} sayıları girebiliyor. Bu sayılar o hücrelere ait; ${unitName(u)} içindeki diğer hücrelerden silinir.`,
            apply() { targets.forEach((c) => { cand[c] &= ~m; }); },
          };
        }
        for (let i = start; i < open.length; i++) {
          if (popcount(cand[open[i]]) > size) continue;
          pick.push(open[i]);
          const r = rec(i + 1);
          pick.pop();
          if (r) return r;
        }
        return null;
      };
      const r = rec(0);
      if (r) return r;
    }
  }
  return null;
}

// Bulmacayı mantıkla çözmeye çalışır. { solved, level, steps }
export function logicSolve(N, cages, maxLevel = 3, grid = null) {
  const st = makeState(N, cages, grid);
  let used = 1, steps = 0;
  for (;;) {
    basicPropagate(st);
    if (st.cand.some((m) => m === 0)) return { solved: false, level: used, steps, contradiction: true };
    if (st.val.every(Boolean)) return { solved: true, level: used, steps, grid: st.val };
    steps++;
    const ns = findNakedSingle(st);
    if (ns) { st.val[ns.cell] = ns.value; st.cand[ns.cell] = 1 << ns.value; continue; }
    if (maxLevel >= 2) {
      const hs = findHiddenSingle(st);
      if (hs) { st.val[hs.cell] = hs.value; st.cand[hs.cell] = 1 << hs.value; used = Math.max(used, 2); continue; }
      const cp = findCagePointing(st);
      if (cp) { cp.apply(); used = Math.max(used, 2); continue; }
    }
    if (maxLevel >= 3) {
      const sub = findNakedSubset(st);
      if (sub) { sub.apply(); used = Math.max(used, 3); continue; }
    }
    return { solved: false, level: used, steps };
  }
}

// ---------- İpucu motoru ----------
// base: yalnızca doğru girilmiş (ya da verilmiş) sayılar. Sıradaki yerleştirilebilir hücreyi ve nedenini döndürür.
export function nextLogicalStep(N, cages, base) {
  const st = makeState(N, cages, base);
  // 1) Boş tek hücreli kafes (hazır sayı)
  for (const k of cages) {
    if (k.op === '=' && !base[k.cells[0]]) return { cell: k.cells[0], value: k.target, reason: 'freebie', cage: k, steps: [] };
  }
  const latin = st.cand.slice();
  for (let c = 0; c < st.C; c++) if (!base[c]) for (const p of peersOf(N, c)) if (base[p]) latin[c] &= ~(1 << base[p]);
  const steps = [];
  for (let guard = 0; guard < 200; guard++) {
    basicPropagate(st);
    const ns = findNakedSingle(st);
    if (ns) return { ...ns, reason: 'naked', cage: cages[st.cageOf[ns.cell]], latin: latin[ns.cell], steps, st };
    const hs = findHiddenSingle(st);
    if (hs) return { ...hs, reason: 'hidden', cage: cages[st.cageOf[hs.cell]], steps, st };
    const adv = findCagePointing(st) ?? findNakedSubset(st);
    if (!adv) return null;
    adv.apply();
    steps.push(adv);
  }
  return null;
}

// Kafesin olası sayı grupları (sıralı, tekrarsız gösterim için). cand verilirse adaylara uyanlar.
export function cageCombos(N, cage, cand = null) {
  const seen = new Map();
  for (const t of cageTuples(N, cage)) {
    if (cand && !t.every((d, j) => cand[cage.cells[j]] & (1 << d))) continue;
    const key = t.slice().sort((a, b) => a - b).join(',');
    if (!seen.has(key)) seen.set(key, key.split(',').map(Number));
  }
  return [...seen.values()];
}

export function comboText(op, combos, max = 6) {
  const fmt = (g) => (op === '+' ? g.join('+') : op === 'x' ? g.join('·') : `${g[0]} ile ${g[1]}`);
  let list = combos.slice(0, max).map(fmt);
  if (combos.length > max) list.push('…');
  if (list.length <= 1) return list.join('');
  return list.slice(0, -1).join(', ') + ' ya da ' + list[list.length - 1];
}

// ---------- Doğrulama ----------
export function verifyLevel(level) {
  let N, cages;
  try { ({ N, cages } = parsePuzzle(level.puzzle)); } catch (e) { return e.message; }
  if (level.size !== N) return 'Boyut uyuşmuyor';
  const sol = parseSolution(level.solution ?? '');
  if (sol.length !== N * N) return 'Çözüm uzunluğu hatalı';
  if (sol.some((d) => !(d >= 1 && d <= N))) return 'Çözümde geçersiz rakam';
  // Kafesler ızgarayı tam ve örtüşmesiz bölmeli, her kafes bitişik olmalı
  const owner = new Array(N * N).fill(-1);
  for (let i = 0; i < cages.length; i++) {
    const k = cages[i];
    if (!k.cells.length) return 'Boş kafes';
    for (const c of k.cells) {
      if (!(c >= 0 && c < N * N)) return 'Kafeste geçersiz hücre';
      if (owner[c] >= 0) return 'Kafesler örtüşüyor';
      owner[c] = i;
    }
    if ((k.op === '-' || k.op === '/') && k.cells.length !== 2) return '− ve ÷ yalnızca iki hücreli kafeste olabilir';
    if (k.op === '=' && k.cells.length !== 1) return 'Tek hücreli olmayan "=" kafesi';
    if (k.op !== '=' && k.cells.length < 2) return 'Tek hücreli kafeste işlem olamaz';
    const set = new Set(k.cells), seen = new Set([k.cells[0]]), stack = [k.cells[0]];
    while (stack.length) {
      const c = stack.pop(), r = Math.floor(c / N), cl = c % N;
      for (const [nr, nc] of [[r - 1, cl], [r + 1, cl], [r, cl - 1], [r, cl + 1]]) {
        const x = nr * N + nc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && set.has(x) && !seen.has(x)) { seen.add(x); stack.push(x); }
      }
    }
    if (seen.size !== set.size) return 'Kafes bitişik değil';
    if (!cageHolds(k.op, k.target, k.cells.map((c) => sol[c]))) return `Çözüm ${cageLabel(k)} kafesine uymuyor`;
  }
  if (owner.some((x) => x < 0)) return 'Kafese ait olmayan hücre var';
  for (let i = 0; i < N; i++) {
    const r = new Set(), c = new Set();
    for (let j = 0; j < N; j++) { r.add(sol[i * N + j]); c.add(sol[j * N + i]); }
    if (r.size !== N || c.size !== N) return 'Çözümde satır/sütun tekrarı var';
  }
  const n = countSolutions(N, cages, 2);
  if (n !== 1) return `Çözüm sayısı ${n} (tam 1 olmalı)`;
  return null;
}

// ---------- Üretici ----------
function randomLatin(rng, N) {
  const g = new Array(N * N).fill(0);
  const rec = (c) => {
    if (c === N * N) return true;
    const r = Math.floor(c / N), cl = c % N;
    for (const d of rng.shuffle(Array.from({ length: N }, (_, i) => i + 1))) {
      let ok = true;
      for (let i = 0; i < cl; i++) if (g[r * N + i] === d) { ok = false; break; }
      if (ok) for (let i = 0; i < r; i++) if (g[i * N + cl] === d) { ok = false; break; }
      if (!ok) continue;
      g[c] = d;
      if (rec(c + 1)) return true;
    }
    g[c] = 0;
    return false;
  };
  rec(0);
  return g;
}

function pickWeighted(rng, items) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = rng.next() * total;
  for (const [v, w] of items) { if ((x -= w) < 0) return v; }
  return items[items.length - 1][0];
}

function makePartition(rng, N, sizes, freebies) {
  const C = N * N;
  const owner = new Array(C).fill(-1);
  const groups = [];
  let free = freebies;
  const nb = (c) => {
    const r = Math.floor(c / N), cl = c % N, out = [];
    if (r > 0) out.push(c - N);
    if (r < N - 1) out.push(c + N);
    if (cl > 0) out.push(c - 1);
    if (cl < N - 1) out.push(c + 1);
    return out;
  };
  for (const start of rng.shuffle(Array.from({ length: C }, (_, i) => i))) {
    if (owner[start] >= 0) continue;
    let want = pickWeighted(rng, sizes);
    if (want === 1) { if (free > 0) free--; else want = 2; }
    const g = [start];
    owner[start] = groups.length;
    while (g.length < want) {
      const front = [];
      for (const c of g) for (const x of nb(c)) if (owner[x] < 0 && !front.includes(x)) front.push(x);
      if (!front.length) break;
      const x = front[rng.int(0, front.length - 1)];
      owner[x] = groups.length;
      g.push(x);
    }
    groups.push(g);
  }
  // İstenmeden tek kalan hücreleri komşu kafese kat
  const maxSize = Math.max(...sizes.map(([s]) => s));
  const singles = groups.filter((g) => g.length === 1);
  let allowedSingles = freebies;
  for (const g of singles) {
    if (allowedSingles > 0) { allowedSingles--; continue; }
    const c = g[0];
    const opts = nb(c).map((x) => owner[x]).filter((o) => groups[o].length < maxSize && groups[o] !== g);
    if (!opts.length) return null;
    const o = opts[rng.int(0, opts.length - 1)];
    groups[o].push(c);
    owner[c] = o;
    g.length = 0;
  }
  return groups.filter((g) => g.length).map((g) => g.slice().sort((a, b) => a - b));
}

function chooseOp(rng, cells, sol, ops) {
  const ds = cells.map((c) => sol[c]);
  if (cells.length === 1) return { op: '=', target: ds[0] };
  const opts = [];
  if (cells.length === 2) {
    const hi = Math.max(...ds), lo = Math.min(...ds);
    if (ops.includes('/') && hi % lo === 0 && hi / lo > 1) opts.push(['/', 4]);
    if (ops.includes('-')) opts.push(['-', 3]);
    if (ops.includes('x')) opts.push(['x', 2]);
    if (ops.includes('+')) opts.push(['+', ops.length === 1 ? 1 : 2]);
  } else {
    if (ops.includes('x')) opts.push(['x', 3]);
    if (ops.includes('+')) opts.push(['+', 3]);
  }
  let op = pickWeighted(rng, opts);
  // Çocuklar için çok büyük çarpımlardan kaçın
  if (op === 'x' && ds.reduce((x, y) => x * y, 1) > 120 && ops.includes('+')) op = '+';
  let target;
  if (op === '+') target = ds.reduce((a, b) => a + b, 0);
  else if (op === 'x') target = ds.reduce((a, b) => a * b, 1);
  else if (op === '-') target = Math.abs(ds[0] - ds[1]);
  else target = Math.max(...ds) / Math.min(...ds);
  return { op, target };
}

// Zorluk planı: index 0..19 içinde yavaş yavaş zorlaşır.
export function planFor(difficulty, index) {
  if (difficulty === 'easy') {
    if (index < 6) return { N: 3, ops: '+', sizes: [[1, 1], [2, 4], [3, 2]], freebies: index < 3 ? 2 : 1, minLevel: 1, maxLevel: 1 };
    if (index < 10) return { N: 4, ops: '+', sizes: [[1, 1], [2, 5], [3, 2]], freebies: 1, minLevel: 1, maxLevel: 1 };
    if (index < 15) return { N: 4, ops: '+', sizes: [[2, 4], [3, 3]], freebies: 0, minLevel: 1, maxLevel: 2 };
    return { N: 4, ops: '+', sizes: [[2, 3], [3, 4]], freebies: 0, minLevel: 1, maxLevel: 2 };
  }
  if (difficulty === 'medium') {
    if (index < 5) return { N: 4, ops: '+-', sizes: [[2, 5], [3, 2]], freebies: 0, minLevel: 1, maxLevel: 2 };
    if (index < 8) return { N: 4, ops: '+-', sizes: [[2, 4], [3, 3]], freebies: 0, minLevel: 2, maxLevel: 2 };
    if (index < 14) return { N: 5, ops: '+-', sizes: [[2, 5], [3, 3]], freebies: 0, minLevel: 1, maxLevel: 2 };
    return { N: 5, ops: '+-x', sizes: [[2, 4], [3, 3]], freebies: 0, minLevel: 2, maxLevel: 2 };
  }
  if (index < 7) return { N: 5, ops: '+-x/', sizes: [[2, 5], [3, 3]], freebies: 0, minLevel: 2, maxLevel: 3 };
  if (index < 14) return { N: 6, ops: '+-x/', sizes: [[2, 5], [3, 4], [4, 1]], freebies: 0, minLevel: 2, maxLevel: 3 };
  return { N: 6, ops: '+-x/', sizes: [[2, 4], [3, 4], [4, 2]], freebies: 0, minLevel: 3, maxLevel: 3 };
}

export function generateLevel(rng, difficulty, index /* , total */) {
  const plan = planFor(difficulty, index);
  const { N, ops } = plan;
  let fallback = null;
  for (let attempt = 0; attempt < 4000; attempt++) {
    const sol = randomLatin(rng, N);
    for (let p = 0; p < 6; p++) {
      const groups = makePartition(rng, N, plan.sizes, plan.freebies);
      if (!groups) continue;
      const cages = groups.map((cells) => ({ ...chooseOp(rng, cells, sol, ops), cells }));
      // Her izinli işlem en az bir kez görünsün (çeşitlilik ve öğretim için)
      const usedOps = new Set(cages.map((k) => k.op));
      if ([...ops].some((o) => !usedOps.has(o))) continue;
      if (countSolutions(N, cages, 2) !== 1) continue;
      const res = logicSolve(N, cages, plan.maxLevel);
      if (!res.solved) continue;
      const level = {
        size: N,
        ops,
        puzzle: encodePuzzle(N, cages),
        solution: sol.join(''),
        cages: cages.length,
        logic: res.level,
      };
      // Zor levellerde ileri tekniği gerçekten gerektirenleri tercih et
      if (res.level >= plan.minLevel || attempt > 1500) return level;
      fallback ??= level;
    }
  }
  if (fallback) return fallback;
  throw new Error('Bulmaca üretilemedi');
}
