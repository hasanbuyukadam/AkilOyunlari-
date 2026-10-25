// Amiral Battı Bulmacası mantığı — hem tarayıcıda hem Node'da çalışır (DOM yok).
//
// Level biçimi (hepsi metin, levels.json kompakt kalsın diye):
//   size:     ızgara kenarı (6, 8, 10)
//   fleet:    filo, gemi boyları azalan sırada, ör. "4332221111"
//   rows:     her satırdaki gemi hücresi sayısı, ör. "2103..." (tek hane)
//   cols:     her sütundaki gemi hücresi sayısı
//   puzzle:   n*n karakter ipucu: '.' boş, '~' su, 'o' tek hücrelik gemi, 'm' orta parça,
//             'l' sol uç (gemi sağa uzanır), 'r' sağ uç, 't' üst uç (aşağı uzanır), 'b' alt uç
//   solution: n*n karakter, '1' gemi, '0' su
//
// Hücre durumu (çözücüler): 0 = bilinmiyor, 1 = gemi, 2 = su.

export const UNKNOWN = 0, SHIP = 1, WATER = 2;
export const SHIP_HINTS = 'omlrtb';

const DIRS4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

export const SETTINGS = {
  easy: { size: 6, fleet: [3, 2, 2, 1, 1, 1], rules: 5 },
  medium: { size: 8, fleet: [4, 3, 3, 2, 2, 1, 1, 1], rules: 6 },
  hard: { size: 10, fleet: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1], rules: 7 },
};

export function parseLevel(level) {
  const n = level.size;
  return {
    n,
    N: n * n,
    fleet: [...level.fleet].map(Number).sort((a, b) => b - a),
    rows: [...level.rows].map(Number),
    cols: [...level.cols].map(Number),
    hints: [...level.puzzle],
    solution: level.solution ? [...level.solution].map((ch) => (ch === '1' ? 1 : 0)) : null,
  };
}

/** Bir gemi yerleşiminin k. hücresinin biçimi (ipucu karakteri). */
export function shapeAt(size, k, horizontal) {
  if (size === 1) return 'o';
  if (k === 0) return horizontal ? 'l' : 't';
  if (k === size - 1) return horizontal ? 'r' : 'b';
  return 'm';
}

/** Çözüm ızgarasındaki (0/1) her gemi hücresinin biçimi; su için '~'. */
export function shapesOf(n, sol) {
  const at = (r, c) => r >= 0 && c >= 0 && r < n && c < n && sol[r * n + c] === 1;
  return sol.map((v, i) => {
    if (!v) return '~';
    const r = Math.floor(i / n), c = i % n;
    const L = at(r, c - 1), R = at(r, c + 1), U = at(r - 1, c), D = at(r + 1, c);
    if ((L || R) && (U || D)) return '?';
    if (L && R) return 'm';
    if (U && D) return 'm';
    if (R) return 'l';
    if (L) return 'r';
    if (D) return 't';
    if (U) return 'b';
    return 'o';
  });
}

/** Tüm olası yerleşimler (ızgara geometrisine göre, boy başına). */
function allPlacements(n, size) {
  const out = [];
  const orients = size === 1 ? [true] : [true, false];
  for (const horizontal of orients) {
    const dr = horizontal ? 0 : 1, dc = horizontal ? 1 : 0;
    for (let r = 0; r + dr * (size - 1) < n; r++) {
      for (let c = 0; c + dc * (size - 1) < n; c++) {
        const cells = [];
        for (let k = 0; k < size; k++) cells.push((r + dr * k) * n + c + dc * k);
        const inShip = new Set(cells);
        const halo = [];
        for (let k = -1; k <= size; k++) {
          for (let s = -1; s <= 1; s++) {
            const rr = r + dr * k + (horizontal ? s : 0);
            const cc = c + dc * k + (horizontal ? 0 : s);
            if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
            const idx = rr * n + cc;
            if (!inShip.has(idx)) halo.push(idx);
          }
        }
        // uçlardaki eksen hücreleri (geminin devamı olabilecek yerler)
        const ends = [];
        const before = [r - dr, c - dc], after = [r + dr * size, c + dc * size];
        for (const [rr, cc] of [before, after]) if (rr >= 0 && cc >= 0 && rr < n && cc < n) ends.push(rr * n + cc);
        out.push({ size, horizontal, r, c, cells, halo, ends, shapes: cells.map((_, k) => shapeAt(size, k, horizontal)) });
      }
    }
  }
  return out;
}

const placementCache = new Map();
function placementsFor(n, size) {
  const key = `${n}:${size}`;
  if (!placementCache.has(key)) placementCache.set(key, allPlacements(n, size));
  return placementCache.get(key);
}

// ---------------------------------------------------------------------------
// TAM ARAMA: çözüm sayısı (limit'e kadar). Hiçbir sezgisel/mantıksal kural kullanılmaz;
// filonun tüm gemileri, ipuçları ve sayılarla tutarlı tüm yerleşimlerde denenir.
// ---------------------------------------------------------------------------
export function countSolutions(P, limit = 2) {
  const { n, N, fleet, rows, cols, hints } = P;
  const rowCnt = new Array(n).fill(0), colCnt = new Array(n).fill(0);
  const ship = new Uint8Array(N);
  const block = new Int16Array(N); // >0: gemi ya da bir geminin komşusu
  const shipHints = [];
  for (let i = 0; i < N; i++) if (SHIP_HINTS.includes(hints[i])) shipHints.push(i);
  // ipuçlarıyla çelişmeyen yerleşimler
  const cand = {};
  for (const s of new Set(fleet)) {
    cand[s] = placementsFor(n, s).filter((p) =>
      p.cells.every((c, k) => hints[c] === '.' || hints[c] === p.shapes[k]) &&
      p.halo.every((c) => !SHIP_HINTS.includes(hints[c])));
  }
  let count = 0;
  const lastIdx = [];
  const feasible = () => {
    for (const h of shipHints) if (!ship[h] && block[h]) return false;
    for (let r = 0; r < n; r++) {
      let free = 0;
      for (let c = 0; c < n; c++) { const i = r * n + c; if (!block[i] && hints[i] !== '~') free++; }
      if (free < rows[r] - rowCnt[r]) return false;
    }
    for (let c = 0; c < n; c++) {
      let free = 0;
      for (let r = 0; r < n; r++) { const i = r * n + c; if (!block[i] && hints[i] !== '~') free++; }
      if (free < cols[c] - colCnt[c]) return false;
    }
    return true;
  };
  const rec = (k) => {
    if (k === fleet.length) {
      for (const h of shipHints) if (!ship[h]) return;
      for (let i = 0; i < n; i++) if (rowCnt[i] !== rows[i] || colCnt[i] !== cols[i]) return;
      count++;
      return;
    }
    const s = fleet[k];
    const list = cand[s];
    const start = k > 0 && fleet[k - 1] === s ? lastIdx[k - 1] + 1 : 0;
    for (let pi = start; pi < list.length && count < limit; pi++) {
      const p = list[pi];
      let ok = true;
      for (const c of p.cells) if (block[c]) { ok = false; break; }
      if (!ok) continue;
      if (p.horizontal) {
        if (rowCnt[p.r] + s > rows[p.r]) continue;
        for (const c of p.cells) if (colCnt[c % n] + 1 > cols[c % n]) { ok = false; break; }
      } else {
        if (colCnt[p.c] + s > cols[p.c]) continue;
        for (const c of p.cells) if (rowCnt[Math.floor(c / n)] + 1 > rows[Math.floor(c / n)]) { ok = false; break; }
      }
      if (!ok) continue;
      for (const c of p.cells) { ship[c] = 1; block[c]++; rowCnt[Math.floor(c / n)]++; colCnt[c % n]++; }
      for (const c of p.halo) block[c]++;
      lastIdx[k] = pi;
      if (feasible()) rec(k + 1);
      for (const c of p.cells) { ship[c] = 0; block[c]--; rowCnt[Math.floor(c / n)]--; colCnt[c % n]--; }
      for (const c of p.halo) block[c]--;
    }
  };
  rec(0);
  return count;
}

// ---------------------------------------------------------------------------
// İNSAN TARZI MANTIKSAL ÇÖZÜCÜ (zorluk ölçümü ve Akıllı İpucu için)
// Kural seviyeleri: 1 ipucu biçimi, 2 çapraz su, 3 sayı doldu → su, 4 sayı = boş hücre → gemi,
// 5 tamamlanan en büyük geminin uçları su, 6 hiçbir geminin sığmadığı hücre su,
// 7 bir gemi yalnızca belirli yerlere sığar.
// ---------------------------------------------------------------------------
const cellName = (n, i) => `${Math.floor(i / n) + 1}. satır ${i % n + 1}. sütun`;

/** Durumdaki gemi bileşenleri: { cells, straight, complete }. */
function components(P, st) {
  const { n, N } = P;
  const seen = new Uint8Array(N);
  const out = [];
  for (let i = 0; i < N; i++) {
    if (st[i] !== SHIP || seen[i]) continue;
    const cells = [];
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const x = stack.pop();
      cells.push(x);
      const r = Math.floor(x / n), c = x % n;
      for (const [dr, dc] of DIRS4) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        const y = rr * n + cc;
        if (st[y] === SHIP && !seen[y]) { seen[y] = 1; stack.push(y); }
      }
    }
    cells.sort((a, b) => a - b);
    const rs = new Set(cells.map((x) => Math.floor(x / n))), cs = new Set(cells.map((x) => x % n));
    const straight = rs.size === 1 || cs.size === 1;
    const inComp = new Set(cells);
    let complete = straight;
    if (complete) {
      for (const x of cells) {
        const r = Math.floor(x / n), c = x % n;
        for (const [dr, dc] of DIRS4) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
          const y = rr * n + cc;
          if (!inComp.has(y) && st[y] !== WATER) complete = false;
        }
      }
    }
    out.push({ cells, straight, complete, horizontal: cells.length > 1 ? rs.size === 1 : null });
  }
  return out;
}

/** Tamamlanmış gemiler çıkarıldıktan sonra kalan filo (boy → adet), çelişkide null. */
function remainingFleet(P, comps) {
  const rem = new Map();
  for (const s of P.fleet) rem.set(s, (rem.get(s) ?? 0) + 1);
  for (const comp of comps) {
    if (!comp.complete) continue;
    const s = comp.cells.length;
    if (!rem.get(s)) return null;
    rem.set(s, rem.get(s) - 1);
  }
  return rem;
}

/** Kalan bir gemi için duruma uygun yerleşimler. */
function validPlacements(P, st, size, completeCells, rowShip, colShip) {
  const { n, rows, cols, hints } = P;
  return placementsFor(n, size).filter((p) => {
    let unkRow = 0;
    for (let k = 0; k < p.cells.length; k++) {
      const c = p.cells[k];
      if (st[c] === WATER || completeCells.has(c)) return false;
      if (hints[c] !== '.' && hints[c] !== p.shapes[k]) return false;
      if (st[c] === UNKNOWN) {
        unkRow++;
        if (p.horizontal && colShip[c % n] + 1 > cols[c % n]) return false;
        if (!p.horizontal && rowShip[Math.floor(c / n)] + 1 > rows[Math.floor(c / n)]) return false;
      }
    }
    if (p.horizontal && rowShip[p.r] + unkRow > rows[p.r]) return false;
    if (!p.horizontal && colShip[p.c] + unkRow > cols[p.c]) return false;
    for (const c of p.halo) if (st[c] === SHIP) return false;
    return true;
  });
}

/**
 * Sıradaki mantıksal adım. st: durum dizisi (değiştirilmez).
 * Dönüş: { rule, set: [[hücre, değer], ...], focus: [hücreler], text } ya da null.
 */
export function nextStep(P, st, maxRule = 7) {
  const { n, N, rows, cols, hints } = P;
  const at = (r, c) => (r < 0 || c < 0 || r >= n || c >= n ? -1 : r * n + c);
  const sets = new Map();
  const add = (i, v) => { if (i >= 0 && st[i] === UNKNOWN) sets.set(i, v); };
  const result = (rule, focus, text) => ({ rule, set: [...sets], focus, text });

  // 1) Verilen ipucu biçimleri
  for (let i = 0; i < N; i++) {
    const h = hints[i];
    if (!SHIP_HINTS.includes(h)) continue;
    const r = Math.floor(i / n), c = i % n;
    add(i, SHIP);
    const up = at(r - 1, c), down = at(r + 1, c), left = at(r, c - 1), right = at(r, c + 1);
    let text = '';
    if (h === 'o') {
      [up, down, left, right].forEach((x) => add(x, WATER));
      text = `${cellName(n, i)}: tek hücrelik gemi — dört yanı da su.`;
    } else if (h !== 'm') {
      const cont = { l: right, r: left, t: down, b: up }[h];
      add(cont, SHIP);
      [up, down, left, right].filter((x) => x !== cont).forEach((x) => add(x, WATER));
      text = `${cellName(n, i)}: gemi ucu — gemi ok yönünde devam eder, diğer yanlar su.`;
    } else {
      const vBlocked = up < 0 || down < 0 || st[up] === WATER || st[down] === WATER;
      const hBlocked = left < 0 || right < 0 || st[left] === WATER || st[right] === WATER;
      const vShip = (up >= 0 && st[up] === SHIP) || (down >= 0 && st[down] === SHIP);
      const hShip = (left >= 0 && st[left] === SHIP) || (right >= 0 && st[right] === SHIP);
      if (vBlocked || hShip) { add(left, SHIP); add(right, SHIP); add(up, WATER); add(down, WATER); }
      else if (hBlocked || vShip) { add(up, SHIP); add(down, SHIP); add(left, WATER); add(right, WATER); }
      text = `${cellName(n, i)}: orta parça — bir yönü kapalı olduğundan gemi diğer yönde iki tarafa uzanır.`;
    }
    if (sets.size) return result(1, [i], text);
  }
  if (maxRule < 2) return null;

  // 2) Gemi hücrelerinin çaprazları su
  for (let i = 0; i < N; i++) {
    if (st[i] !== SHIP) continue;
    const r = Math.floor(i / n), c = i % n;
    for (const [dr, dc] of DIAG) add(at(r + dr, c + dc), WATER);
    if (sets.size) return result(2, [i], `Gemiler çapraz bile değemez: ${cellName(n, i)} gemi olduğundan çaprazındaki hücreler su.`);
  }
  if (maxRule < 3) return null;

  const rowShip = new Array(n).fill(0), colShip = new Array(n).fill(0);
  const rowUnk = new Array(n).fill(0), colUnk = new Array(n).fill(0);
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / n), c = i % n;
    if (st[i] === SHIP) { rowShip[r]++; colShip[c]++; }
    if (st[i] === UNKNOWN) { rowUnk[r]++; colUnk[c]++; }
  }
  const lineCells = (isRow, k) => Array.from({ length: n }, (_, j) => (isRow ? k * n + j : j * n + k));
  const lineName = (isRow, k) => `${k + 1}. ${isRow ? 'satır' : 'sütun'}`;

  // 3) Sayı doldu → kalanlar su
  for (const isRow of [true, false]) {
    for (let k = 0; k < n; k++) {
      const target = isRow ? rows[k] : cols[k];
      const have = isRow ? rowShip[k] : colShip[k];
      const unk = isRow ? rowUnk[k] : colUnk[k];
      if (unk && have === target) {
        const cells = lineCells(isRow, k);
        cells.forEach((x) => add(x, WATER));
        const text = target === 0
          ? `${lineName(isRow, k)} sayısı 0 → bu hattaki tüm hücreler su.`
          : `${lineName(isRow, k)} sayısı ${target} ve ${target} gemi hücresi zaten belli → kalan hücreler su.`;
        return result(3, cells.filter((x) => sets.has(x)), text);
      }
    }
  }
  if (maxRule < 4) return null;

  // 4) Kalan sayı = kalan boş hücre → hepsi gemi
  for (const isRow of [true, false]) {
    for (let k = 0; k < n; k++) {
      const target = isRow ? rows[k] : cols[k];
      const have = isRow ? rowShip[k] : colShip[k];
      const unk = isRow ? rowUnk[k] : colUnk[k];
      if (unk && target - have === unk) {
        const cells = lineCells(isRow, k);
        cells.forEach((x) => add(x, SHIP));
        return result(4, cells.filter((x) => sets.has(x)),
          `${lineName(isRow, k)}: ${target - have} gemi hücresi daha gerekiyor ve tam ${unk} boş hücre kaldı → hepsi gemi.`);
      }
    }
  }
  if (maxRule < 5) return null;

  const comps = components(P, st);
  const rem = remainingFleet(P, comps);
  if (!rem) return null;
  const remSizes = [...rem.entries()].filter(([, k]) => k > 0).map(([s]) => s);
  const maxRem = remSizes.length ? Math.max(...remSizes) : 0;

  // 5) Uzunluğu kalan en büyük gemiye eşit olan gemi parçası tamamdır → uçları su
  for (const comp of comps) {
    if (comp.complete || !comp.straight || comp.cells.length !== maxRem) continue;
    for (const x of comp.cells) {
      const r = Math.floor(x / n), c = x % n;
      for (const [dr, dc] of DIRS4) {
        const y = at(r + dr, c + dc);
        if (y >= 0 && !comp.cells.includes(y)) add(y, WATER);
      }
    }
    if (sets.size) {
      return result(5, [...comp.cells, ...sets.keys()],
        maxRem === 1
          ? `Kalan gemilerin hepsi tek hücrelik → ${cellName(n, comp.cells[0])} etrafı su.`
          : `${maxRem} hücrelik bu gemi tamamlandı (kalan en büyük gemi ${maxRem} hücre) → uçları su.`);
    }
  }
  if (maxRule < 6) return null;

  // 6) Hiçbir kalan geminin sığmadığı hücreler su
  const completeCells = new Set();
  for (const comp of comps) if (comp.complete) comp.cells.forEach((x) => completeCells.add(x));
  const places = new Map();
  for (const s of remSizes) places.set(s, validPlacements(P, st, s, completeCells, rowShip, colShip));
  const covered = new Uint8Array(N);
  for (const list of places.values()) for (const p of list) for (const c of p.cells) covered[c] = 1;
  for (let i = 0; i < N; i++) if (st[i] === UNKNOWN && !covered[i]) add(i, WATER);
  if (sets.size) {
    return result(6, [...sets.keys()],
      'Kalan gemilerden hiçbiri bu hücrelere sığmıyor (sayılar, sular ve komşu gemiler engelliyor) → su.');
  }
  if (maxRule < 7) return null;

  // 7) Bir boydaki gemiler yalnızca belirli yerlere sığıyor
  for (const s of [...remSizes].sort((a, b) => b - a)) {
    const list = places.get(s);
    const k = rem.get(s);
    let cells = [];
    if (list.length === k) {
      for (const p of list) for (const c of p.cells) add(c, SHIP);
      cells = list.flatMap((p) => p.cells);
    } else if (k === 1 && list.length) {
      for (const c of list[0].cells) if (list.every((p) => p.cells.includes(c))) add(c, SHIP);
      cells = [...sets.keys()];
    }
    if (sets.size) {
      const big = s === maxRem ? 'en büyük ' : '';
      return result(7, cells,
        k === 1 && list.length > 1
          ? `Kalan ${big}${s} hücrelik gemi nereye konursa konsun bu hücreleri kaplar → gemi.`
          : `Kalan ${big}${s} hücrelik gemi${k > 1 ? 'ler' : ''} yalnızca burada sığar → gemi.`);
    }
  }
  return null;
}

/** Mantıksal çözüm. Dönüş: { solved, state, steps, maxRule, ruleCounts }. */
export function logicalSolve(P, maxRule = 7, initial = null) {
  const st = initial ? initial.slice() : new Array(P.N).fill(UNKNOWN);
  for (let i = 0; i < P.N; i++) if (P.hints[i] === '~') st[i] = WATER;
  let steps = 0, used = 0;
  const ruleCounts = new Array(8).fill(0);
  for (;;) {
    const step = nextStep(P, st, maxRule);
    if (!step) break;
    for (const [i, v] of step.set) st[i] = v;
    steps++;
    ruleCounts[step.rule]++;
    used = Math.max(used, step.rule);
  }
  const solved = st.every((v) => v !== UNKNOWN);
  return { solved, state: st, steps, maxRule: used, ruleCounts };
}

// ---------------------------------------------------------------------------
// ÜRETİCİ
// ---------------------------------------------------------------------------
function randomFleetGrid(rng, n, fleet) {
  for (;;) {
    const ship = new Array(n * n).fill(0);
    const block = new Uint8Array(n * n);
    let ok = true;
    for (const s of fleet) {
      const list = placementsFor(n, s).filter((p) => p.cells.every((c) => !block[c]));
      if (!list.length) { ok = false; break; }
      const p = list[rng.int(0, list.length - 1)];
      for (const c of p.cells) { ship[c] = 1; block[c] = 1; }
      for (const c of p.halo) block[c] = 1;
    }
    if (ok) return ship;
  }
}

function countsOf(n, sol) {
  const rows = new Array(n).fill(0), cols = new Array(n).fill(0);
  sol.forEach((v, i) => { if (v) { rows[Math.floor(i / n)]++; cols[i % n]++; } });
  return { rows, cols };
}

/**
 * Zorluk: tier içinde index arttıkça ipucu sayısı düşer ve gelişmiş kurallara ihtiyaç artar.
 * Seviye kuralları: Kolay ≤ 5 (yerleşim akıl yürütmesi yok), Orta ≤ 6, Zor ≤ 7.
 */
export function generateLevel(rng, difficulty, index = 0, total = 20) {
  const cfg = SETTINGS[difficulty] ?? SETTINGS.easy;
  const { size: n, fleet, rules } = cfg;
  const N = n * n;
  const t = total > 1 ? index / (total - 1) : 0; // 0 → 1
  const extra = Math.round((1 - t) * (difficulty === 'easy' ? 4 : difficulty === 'medium' ? 3 : 2));
  const pool = [];
  const tries = difficulty === 'hard' ? 10 : 8;
  for (let attempt = 0; attempt < tries; attempt++) {
    const sol = randomFleetGrid(rng, n, fleet);
    const shapes = shapesOf(n, sol);
    const { rows, cols } = countsOf(n, sol);
    const mk = (hintSet) => {
      const hints = new Array(N).fill('.');
      for (const i of hintSet) hints[i] = shapes[i];
      return { n, N, fleet, rows, cols, hints, solution: sol };
    };
    // ipucu ekle: mantıkla çözülene kadar
    const hintSet = new Set();
    let res = logicalSolve(mk(hintSet), rules);
    let guard = 0;
    while (!res.solved && guard++ < N) {
      const unk = [];
      for (let i = 0; i < N; i++) if (res.state[i] === UNKNOWN) unk.push(i);
      const shipUnk = unk.filter((i) => sol[i]);
      const src = shipUnk.length && rng.next() < 0.7 ? shipUnk : unk;
      hintSet.add(src[rng.int(0, src.length - 1)]);
      res = logicalSolve(mk(hintSet), rules);
    }
    if (!res.solved) continue;
    // gereksiz ipuçlarını at
    for (const h of rng.shuffle([...hintSet])) {
      hintSet.delete(h);
      if (!logicalSolve(mk(hintSet), rules).solved) hintSet.add(h);
    }
    const P = mk(hintSet);
    const final = logicalSolve(P, rules);
    // gereken en düşük kural seviyesi
    let need = rules;
    while (need > 4 && logicalSolve(P, need - 1).solved) need--;
    const adv = final.ruleCounts[5] + 2 * final.ruleCounts[6] + 3 * final.ruleCounts[7];
    const score = need * 4 + adv - hintSet.size * 1.5;
    pool.push({ sol, rows, cols, hintSet, score });
  }
  pool.sort((a, b) => a.score - b.score);
  const best = pool[Math.min(pool.length - 1, Math.round(t * (pool.length - 1)))];
  const { sol, rows, cols, hintSet } = best;
  const shapes = shapesOf(n, sol);
  // tierin başındaki levellerde birkaç ekstra ipucu (gemi hücreleri ağırlıklı)
  const extras = rng.shuffle([...Array(N).keys()].filter((i) => !hintSet.has(i)));
  extras.sort((a, b) => sol[b] - sol[a]);
  const shipFirst = extras.slice(0, Math.max(extra * 2, 0));
  rng.shuffle(shipFirst);
  for (let k = 0; k < extra && k < shipFirst.length; k++) hintSet.add(shipFirst[k]);
  const hints = new Array(N).fill('.');
  for (const i of hintSet) hints[i] = shapes[i];
  return {
    size: n,
    fleet: fleet.join(''),
    rows: rows.join(''),
    cols: cols.join(''),
    puzzle: hints.join(''),
    solution: sol.join(''),
    hints: hintSet.size,
  };
}

// ---------------------------------------------------------------------------
// DOĞRULAYICI
// ---------------------------------------------------------------------------
export function verifyLevel(level) {
  const n = level.size;
  if (![6, 8, 10].includes(n)) return 'Geçersiz boyut';
  const N = n * n;
  if (typeof level.puzzle !== 'string' || level.puzzle.length !== N) return 'İpucu uzunluğu hatalı';
  if (typeof level.solution !== 'string' || !/^[01]+$/.test(level.solution) || level.solution.length !== N) return 'Çözüm biçimi hatalı';
  if (!/^[.~omlrtb]+$/.test(level.puzzle)) return 'İpucunda geçersiz karakter';
  if (level.rows.length !== n || level.cols.length !== n) return 'Sayı uzunluğu hatalı';
  const P = parseLevel(level);
  const sol = P.solution;
  // (a) Kayıtlı çözüm tüm kurallara uyuyor mu?
  const { rows, cols } = countsOf(n, sol);
  if (rows.join('') !== P.rows.join('') || cols.join('') !== P.cols.join('')) return 'Çözüm satır/sütun sayılarına uymuyor';
  for (let i = 0; i < N; i++) {
    if (!sol[i]) continue;
    const r = Math.floor(i / n), c = i % n;
    for (const [dr, dc] of DIAG) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < n && cc < n && sol[rr * n + cc]) return 'Çözümde gemiler çapraz değiyor';
    }
  }
  const comps = components(P, sol.map((v) => (v ? SHIP : WATER)));
  if (comps.some((x) => !x.straight)) return 'Çözümde düz olmayan gemi var';
  const sizes = comps.map((x) => x.cells.length).sort((a, b) => b - a).join('');
  if (sizes !== P.fleet.join('')) return `Çözümün filosu (${sizes}) beklenen filoya (${P.fleet.join('')}) uymuyor`;
  const shapes = shapesOf(n, sol);
  for (let i = 0; i < N; i++) {
    const h = P.hints[i];
    if (h !== '.' && h !== shapes[i]) return `İpucu çözümle çelişiyor (hücre ${i})`;
  }
  // (b) Tam arama ile çözüm sayısı
  const count = countSolutions(P, 2);
  if (count !== 1) return `Çözüm sayısı ${count} (tam 1 olmalı)`;
  return null;
}
