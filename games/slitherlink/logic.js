// Çit Çizme (Slitherlink) mantığı — tarayıcıda ve Node'da çalışır, DOM kullanmaz.
//
// Izgara R satır × C sütun hücre, (R+1)×(C+1) nokta.
// Kenar numaraları: önce yatay kenarlar H(r,c) = r*C + c (r: 0..R, c: 0..C-1),
// sonra dikey kenarlar V(r,c) = NH + r*(C+1) + c (r: 0..R-1, c: 0..C).
// Kenar durumu: 0 = bilinmiyor, 1 = çizgi, 2 = çarpı (kesin boş).
// Level: { rows, cols, puzzle: "R*C karakter ('.' ya da 0-3)", solution: "NE karakter 0/1", clues, tier }

export const UNKNOWN = 0, LINE = 1, CROSS = 2;

// ---------------------------------------------------------------- geometri
const geoCache = new Map();
export function geometry(R, C) {
  const key = `${R}x${C}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const W = C + 1;
  const NH = (R + 1) * C, NE = NH + R * W, NV = (R + 1) * W, NC = R * C;
  const H = (r, c) => r * C + c;
  const V = (r, c) => NH + r * W + c;
  const vid = (i, j) => i * W + j;
  const eA = new Int16Array(NE), eB = new Int16Array(NE);
  const eCells = [], vEdges = Array.from({ length: NV }, () => []);
  for (let r = 0; r <= R; r++) for (let c = 0; c < C; c++) {
    const e = H(r, c);
    eA[e] = vid(r, c); eB[e] = vid(r, c + 1);
    eCells[e] = [r > 0 ? (r - 1) * C + c : -1, r < R ? r * C + c : -1].filter((x) => x >= 0);
  }
  for (let r = 0; r < R; r++) for (let c = 0; c <= C; c++) {
    const e = V(r, c);
    eA[e] = vid(r, c); eB[e] = vid(r + 1, c);
    eCells[e] = [c > 0 ? r * C + c - 1 : -1, c < C ? r * C + c : -1].filter((x) => x >= 0);
  }
  for (let e = 0; e < NE; e++) { vEdges[eA[e]].push(e); vEdges[eB[e]].push(e); }
  const cEdges = [], cVerts = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    cEdges.push([H(r, c), H(r + 1, c), V(r, c), V(r, c + 1)]); // üst, alt, sol, sağ
    cVerts.push([vid(r, c), vid(r, c + 1), vid(r + 1, c), vid(r + 1, c + 1)]);
  }
  const edgeBetween = (a, b) => {
    if (a > b) [a, b] = [b, a];
    const ia = Math.floor(a / W), ja = a % W, ib = Math.floor(b / W), jb = b % W;
    if (ia === ib && jb === ja + 1) return H(ia, ja);
    if (ja === jb && ib === ia + 1) return V(ia, ja);
    return -1;
  };
  const g = { R, C, W, NH, NE, NV, NC, H, V, vid, eA, eB, eCells, vEdges, cEdges, cVerts, edgeBetween };
  geoCache.set(key, g);
  return g;
}

export const parseClues = (puzzle) => [...puzzle].map((ch) => (ch === '.' ? -1 : Number(ch)));
export const parseSolution = (sol) => [...sol].map((ch) => (ch === '1' ? 1 : 0));

// ------------------------------------------------- çözüm doğrulama (bağımsız)
/** Tüm kurallar: ipuçları, her noktada 0/2 çizgi, tüm çizgiler tek bir kapalı döngü. */
export function checkSolution(g, clues, lines) {
  if (lines.length !== g.NE) return 'Çözüm uzunluğu hatalı';
  for (let c = 0; c < g.NC; c++) {
    if (clues[c] < 0) continue;
    const n = g.cEdges[c].reduce((s, e) => s + (lines[e] ? 1 : 0), 0);
    if (n !== clues[c]) return `Hücre ${c}: ipucu ${clues[c]}, çizgi ${n}`;
  }
  let total = 0, start = -1;
  for (let v = 0; v < g.NV; v++) {
    const d = g.vEdges[v].reduce((s, e) => s + (lines[e] ? 1 : 0), 0);
    if (d !== 0 && d !== 2) return `Nokta ${v}: ${d} çizgi`;
  }
  for (let e = 0; e < g.NE; e++) if (lines[e]) { total++; if (start < 0) start = e; }
  if (!total) return 'Döngü yok';
  // Döngüyü izle: başlangıç kenarından tüm çizgilere ulaşılmalı.
  let prevV = g.eA[start], v = g.eB[start], e = start, steps = 1;
  while (v !== g.eA[start]) {
    const next = g.vEdges[v].find((x) => x !== e && lines[x]);
    e = next; prevV = v;
    v = g.eA[e] === v ? g.eB[e] : g.eA[e];
    steps++;
    if (steps > total) break;
  }
  if (steps !== total) return 'Birden fazla döngü var';
  return null;
}

// ------------------------------------------------------------ çözüm durumu
function newState(g) {
  const vu = new Int8Array(g.NV);
  for (let v = 0; v < g.NV; v++) vu[v] = g.vEdges[v].length;
  return {
    e: new Int8Array(g.NE), deg: new Int8Array(g.NV), vu,
    mate: new Int16Array(g.NV).fill(-1), plen: new Int16Array(g.NV),
    cnt: new Int8Array(g.NC), cx: new Int8Array(g.NC),
    lines: 0, unknown: g.NE, closed: false,
  };
}
function clone(S) {
  return {
    e: S.e.slice(), deg: S.deg.slice(), vu: S.vu.slice(), mate: S.mate.slice(), plen: S.plen.slice(),
    cnt: S.cnt.slice(), cx: S.cx.slice(), lines: S.lines, unknown: S.unknown, closed: S.closed,
  };
}

/** Kenarı ayarlar; doğrudan çelişki varsa false döner. */
function setEdge(g, clues, S, e, val) {
  if (S.e[e]) return S.e[e] === val;
  S.e[e] = val; S.unknown--;
  const a = g.eA[e], b = g.eB[e];
  S.vu[a]--; S.vu[b]--;
  for (const c of g.eCells[e]) {
    if (val === LINE) S.cnt[c]++; else S.cx[c]++;
    const k = clues[c];
    if (k >= 0 && (S.cnt[c] > k || 4 - S.cx[c] < k)) return false;
  }
  if (val === CROSS) return true;
  if (S.closed) return false;
  const da = ++S.deg[a], db = ++S.deg[b];
  if (da > 2 || db > 2) return false;
  S.lines++;
  const { mate, plen } = S;
  if (da === 1 && db === 1) {
    mate[a] = b; mate[b] = a; plen[a] = plen[b] = 1;
  } else if (da === 2 && db === 1) {
    const o = mate[a]; const L = plen[a] + 1;
    mate[a] = -1; mate[o] = b; mate[b] = o; plen[o] = plen[b] = L;
  } else if (da === 1 && db === 2) {
    const o = mate[b]; const L = plen[b] + 1;
    mate[b] = -1; mate[o] = a; mate[a] = o; plen[o] = plen[a] = L;
  } else if (mate[a] === b) {
    // Döngü kapanıyor: tüm çizgiler bu döngüde olmalı.
    if (S.lines !== plen[a] + 1) return false;
    mate[a] = mate[b] = -1;
    S.closed = true;
  } else {
    const oa = mate[a], ob = mate[b], L = plen[a] + plen[b] + 1;
    mate[a] = mate[b] = -1; mate[oa] = ob; mate[ob] = oa; plen[oa] = plen[ob] = L;
  }
  return true;
}

// Kural fonksiyonları: [[kenar, değer], ...] (boş = sonuç yok) ya da null (çelişki).
function cellRule(g, clues, S, c) {
  const k = clues[c];
  if (k < 0) return [];
  const u = 4 - S.cnt[c] - S.cx[c];
  if (!u) return S.cnt[c] === k ? [] : null;
  let val = 0;
  if (S.cnt[c] === k) val = CROSS;
  else if (S.cnt[c] + u === k) val = LINE;
  else if (S.cnt[c] + u < k) return null;
  if (!val) return [];
  return g.cEdges[c].filter((e) => !S.e[e]).map((e) => [e, val]);
}
function vertexRule(g, S, v) {
  const d = S.deg[v], u = S.vu[v];
  if (d > 2) return null;
  if (!u) return d === 1 ? null : [];
  let val = 0;
  if (d === 2) val = CROSS;
  else if (d === 1 && u === 1) val = LINE;
  else if (d === 0 && u === 1) val = CROSS;
  if (!val) return [];
  return g.vEdges[v].filter((e) => !S.e[e]).map((e) => [e, val]);
}
/** Erken kapanacak döngü kenarları (tek döngü kuralı). */
function loopRule(g, S) {
  const out = [];
  if (S.closed) return out;
  for (let v = 0; v < g.NV; v++) {
    const m = S.mate[v];
    if (m <= v || S.deg[v] !== 1) continue;
    const e = g.edgeBetween(v, m);
    if (e >= 0 && !S.e[e] && S.lines !== S.plen[v]) out.push([e, CROSS]);
  }
  return out;
}

/** Kademe 1 yayılımı (sayı, nokta ve tek döngü kuralları) sabit noktaya kadar. */
function propagate(g, clues, S, queue) {
  const NV = g.NV;
  const push = (e) => { queue.push(g.eA[e], g.eB[e]); for (const c of g.eCells[e]) queue.push(NV + c); };
  const apply = (sets) => {
    for (const [e, val] of sets) {
      if (S.e[e] === val) continue;
      if (!setEdge(g, clues, S, e, val)) return false;
      push(e);
    }
    return true;
  };
  for (;;) {
    while (queue.length) {
      const it = queue.pop();
      const sets = it < NV ? vertexRule(g, S, it) : cellRule(g, clues, S, it - NV);
      if (!sets || !apply(sets)) return false;
    }
    if (S.closed) {
      if (S.unknown) {
        const sets = [];
        for (let e = 0; e < g.NE; e++) if (!S.e[e]) sets.push([e, CROSS]);
        if (!apply(sets)) return false;
        continue;
      }
      return true;
    }
    const lr = loopRule(g, S);
    if (!lr.length) return true;
    if (!apply(lr)) return false;
  }
}
function fullQueue(g) {
  const q = [];
  for (let i = 0; i < g.NV + g.NC; i++) q.push(i);
  return q;
}
function initState(g, clues) {
  const S = newState(g);
  return propagate(g, clues, S, fullQueue(g)) ? S : null;
}
function applySets(g, clues, S, sets) {
  const q = [];
  for (const [e, val] of sets) {
    if (S.e[e] === val) continue;
    if (!setEdge(g, clues, S, e, val)) return false;
    q.push(g.eA[e], g.eB[e]); for (const c of g.eCells[e]) q.push(g.NV + c);
  }
  return propagate(g, clues, S, q);
}
const isSolved = (S) => S.closed && !S.unknown;

// --------------------------------------------- tam arama ile çözüm sayma
/** Tüm çizgiler, çarpısız kenarlar üzerinden birbirine bağlanabilmeli (tek döngü için gerekli). */
function linesConnected(g, S) {
  if (!S.lines || S.closed) return true;
  let start = -1;
  for (let v = 0; v < g.NV; v++) if (S.deg[v]) { start = v; break; }
  const seen = new Uint8Array(g.NV), st = [start];
  seen[start] = 1;
  let reached = 0;
  while (st.length) {
    const v = st.pop();
    if (S.deg[v]) reached++;
    for (const e of g.vEdges[v]) {
      if (S.e[e] === CROSS) continue;
      const w = g.eA[e] === v ? g.eB[e] : g.eA[e];
      if (!seen[w]) { seen[w] = 1; st.push(w); }
    }
  }
  let total = 0;
  for (let v = 0; v < g.NV; v++) if (S.deg[v]) total++;
  return reached === total;
}


/**
 * Tam (eksiksiz) geri izlemeli arama; limit'e ulaşınca durur.
 * Tek döngü kuralı setEdge içinde zorlanır (erken kapanan döngü = çelişki) ve
 * her yaprakta checkSolution ile bağımsız olarak yeniden doğrulanır.
 */
export function countSolutions(g, clues, limit = 2) {
  let count = 0;
  const found = [];
  const rec = (S) => {
    if (count >= limit) return;
    if (!S.unknown) {
      const lines = Array.from(S.e, (x) => (x === LINE ? 1 : 0));
      if (!checkSolution(g, clues, lines)) { count++; found.push(lines.join('')); }
      return;
    }
    if (!linesConnected(g, S)) return;
    // Dallanma: açık uçlu bir noktadaki bilinmeyen kenar (en az seçenekli), yoksa ilk bilinmeyen kenar.
    // Puan: az seçenekli uç önce, ipucu hücresine değen kenar önce.
    let e = -1, bestScore = -1;
    for (let v = 0; v < g.NV; v++) {
      if (S.deg[v] !== 1 || !S.vu[v]) continue;
      for (const x of g.vEdges[v]) {
        if (S.e[x]) continue;
        let sc = (4 - S.vu[v]) * 10;
        for (const c of g.eCells[x]) if (clues[c] >= 0) sc += clues[c] === 2 ? 2 : 4;
        if (sc > bestScore) { bestScore = sc; e = x; }
      }
    }
    const best = e;
    if (best < 0) {
      // Çizgi yoksa: en büyük ipuculu hücrenin bilinmeyen kenarı.
      let bk = -1;
      for (let c = 0; c < g.NC; c++) {
        if (clues[c] > bk && g.cEdges[c].some((x) => !S.e[x])) { bk = clues[c]; e = g.cEdges[c].find((x) => !S.e[x]); }
      }
      if (e < 0) for (let x = 0; x < g.NE; x++) if (!S.e[x]) { e = x; break; }
    }
    for (const val of [LINE, CROSS]) {
      const T = clone(S);
      if (applySets(g, clues, T, [[e, val]])) rec(T);
      if (count >= limit) return;
    }
  };
  const S = newState(g);
  if (propagate(g, clues, S, fullQueue(g))) rec(S);
  return { count, found };
}

// ------------------------------------------------ insan mantığı (kademe 2/3)
/** Hücre(ler) + köşe noktaları üzerinde yerel sayım: tüm tutarlı atamalarda aynı olan kenarlar. */
function enumerate(g, clues, S, cells) {
  const U = [];
  for (const c of cells) for (const e of g.cEdges[c]) if (!S.e[e] && !U.includes(e)) U.push(e);
  if (!U.length) return [];
  const verts = [];
  for (const c of cells) for (const v of g.cVerts[c]) if (!verts.includes(v)) verts.push(v);
  const vMask = verts.map((v) => U.reduce((m, e, i) => (g.eA[e] === v || g.eB[e] === v ? m | (1 << i) : m), 0));
  const cMask = cells.map((c) => U.reduce((m, e, i) => (g.cEdges[c].includes(e) ? m | (1 << i) : m), 0));
  const pc = (m) => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
  let andM = (1 << U.length) - 1, orM = 0, any = false;
  for (let m = 0; m < 1 << U.length; m++) {
    let ok = true;
    for (let i = 0; i < cells.length && ok; i++) {
      if (S.cnt[cells[i]] + pc(m & cMask[i]) !== clues[cells[i]]) ok = false;
    }
    for (let i = 0; i < verts.length && ok; i++) {
      const v = verts[i];
      const d = S.deg[v] + pc(m & vMask[i]);
      const o = S.vu[v] - pc(vMask[i]);
      if (d > 2 || (d === 1 && o === 0)) ok = false;
    }
    if (!ok) continue;
    any = true; andM &= m; orM |= m;
  }
  if (!any) return null;
  const out = [];
  U.forEach((e, i) => {
    if (andM & (1 << i)) out.push([e, LINE]);
    else if (!(orM & (1 << i))) out.push([e, CROSS]);
  });
  return out;
}

/** Yan yana iki 3: aradaki kenar ve iki dış kenar çizgidir (6 kenarlı küçük döngü çözüm olamıyorsa). */
function adjacent33(g, clues, S) {
  const { R, C } = g;
  for (let c = 0; c < g.NC; c++) {
    if (clues[c] !== 3) continue;
    const r = Math.floor(c / C), col = c % C;
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      if (r + dr >= R || col + dc >= C) continue;
      const d = c + dr * C + dc;
      if (clues[d] !== 3) continue;
      const A = g.cEdges[c], B = g.cEdges[d];
      const shared = dc ? A[3] : A[1];
      const outer = dc ? [A[2], B[3]] : [A[0], B[1]];
      const rect = new Set([...A, ...B].filter((e) => e !== shared));
      // Bu iki hücrenin çevresi tek başına tüm çözüm olabilir mi?
      let couldBeAll = true;
      for (let x = 0; x < g.NC && couldBeAll; x++) {
        if (clues[x] < 0 || x === c || x === d) continue;
        if (g.cEdges[x].filter((e) => rect.has(e)).length !== clues[x]) couldBeAll = false;
      }
      if (couldBeAll) continue;
      const sets = [shared, ...outer].filter((e) => S.e[e] !== LINE).map((e) => [e, LINE]);
      if (sets.length) return { sets, cells: [c, d] };
    }
  }
  return null;
}

function neighborPairs(g, clues) {
  const { R, C } = g;
  const pairs = [];
  for (let c = 0; c < g.NC; c++) {
    if (clues[c] < 0) continue;
    const r = Math.floor(c / C), col = c % C;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const rr = r + dr, cc = col + dc;
      if (rr >= R || cc < 0 || cc >= C) continue;
      const d = rr * C + cc;
      if (clues[d] >= 0) pairs.push([c, d]);
    }
  }
  return pairs;
}

/** Kademe 2 adımı: bulduğu çıkarımları uygular. true = ilerleme, false = çelişki, null = yok. */
function tier2Step(g, clues, S) {
  const all = [];
  for (let c = 0; c < g.NC; c++) {
    if (clues[c] < 0 || S.cnt[c] + S.cx[c] === 4) continue;
    const r = enumerate(g, clues, S, [c]);
    if (!r) return false;
    all.push(...r);
  }
  if (all.length) return applySets(g, clues, S, all);
  const p = adjacent33(g, clues, S);
  if (p) return applySets(g, clues, S, p.sets);
  for (const pair of neighborPairs(g, clues)) {
    if (pair.every((c) => S.cnt[c] + S.cx[c] === 4)) continue;
    const r = enumerate(g, clues, S, pair);
    if (!r) return false;
    if (r.length) return applySets(g, clues, S, r);
  }
  return null;
}

/** Kademe 3: kısa deneme — bir kenarı varsayıp kademe 1 ile çelişki aramak. */
function trialFind(g, clues, S) {
  for (let e = 0; e < g.NE; e++) {
    if (S.e[e]) continue;
    for (const val of [LINE, CROSS]) {
      const T = clone(S);
      if (!applySets(g, clues, T, [[e, val]])) return { e, val: val === LINE ? CROSS : LINE, tried: val };
    }
  }
  return null;
}

/** İnsan tarzı çözücü. maxTier: 1 = temel, 2 = yerel desenler, 3 = kısa deneme. */
export function logicalSolve(g, clues, maxTier = 3) {
  const S = initState(g, clues);
  if (!S) return { solved: false, t2: 0, t3: 0 };
  let t2 = 0, t3 = 0;
  while (!isSolved(S)) {
    if (maxTier >= 2) {
      const r = tier2Step(g, clues, S);
      if (r === false) return { solved: false, t2, t3 };
      if (r) { t2++; continue; }
    }
    if (maxTier >= 3) {
      const t = trialFind(g, clues, S);
      if (t) {
        if (!applySets(g, clues, S, [[t.e, t.val]])) return { solved: false, t2, t3 };
        t3++; continue;
      }
    }
    return { solved: false, t2, t3, state: S };
  }
  return { solved: true, t2, t3, state: S };
}

// --------------------------------------------------------- ipucu (arayüz)
/**
 * Verilen (doğru olduğu bilinen) işaretlerden sonraki mantıklı adımı bulur.
 * marks: kenar başına 0/1/2. Dönüş: { sets: [[e, val]], cells: [], verts: [], text } ya da null.
 */
export function nextStep(level, marks) {
  const g = geometry(level.rows, level.cols);
  const clues = parseClues(level.puzzle);
  const S = newState(g);
  for (let e = 0; e < g.NE; e++) if (marks[e]) setEdge(g, clues, S, e, marks[e]);
  const C = g.C;
  const isCorner = (c) => {
    const r = Math.floor(c / C), col = c % C;
    return (r === 0 || r === g.R - 1) && (col === 0 || col === C - 1);
  };
  const lineWord = (sets) => (sets.every(([, v]) => v === LINE) ? 'çizgi olmalı' : sets.every(([, v]) => v === CROSS) ? 'boş (×) olmalı' : 'kesinleşir');

  // 1) 0 olan hücreler
  for (let c = 0; c < g.NC; c++) {
    if (clues[c] !== 0) continue;
    const sets = cellRule(g, clues, S, c);
    if (sets?.length) return { sets, cells: [c], verts: [], text: '0 olan hücrenin hiçbir kenarında çizgi olmaz: işaretli kenarlar ×.' };
  }
  // 2) Hücre sayısı tamam / tam dolu
  for (let c = 0; c < g.NC; c++) {
    const sets = cellRule(g, clues, S, c);
    if (!sets?.length) continue;
    const k = clues[c];
    const text = sets[0][1] === CROSS
      ? `Bu ${k} hücresinin ${k} çizgisi tamamlandı; kalan kenarları boş (×) olmalı.`
      : `Bu ${k} hücresi ${k} çizgi istiyor ve tam o kadar açık kenarı kaldı; hepsi çizgi olmalı.`;
    return { sets, cells: [c], verts: [], text };
  }
  // 3) Nokta kuralı
  for (let v = 0; v < g.NV; v++) {
    const sets = vertexRule(g, S, v);
    if (!sets?.length) continue;
    const d = S.deg[v];
    const text = d === 2
      ? 'Bu noktaya zaten 2 çizgi geliyor; bir noktaya en fazla 2 çizgi gelir, diğer kenarlar ×.'
      : d === 1
        ? 'Bu noktaya gelen çizginin devam edebileceği tek bir kenar kaldı; çizgi oradan devam etmeli.'
        : 'Bir noktaya ya 0 ya 2 çizgi gelir; bu noktada açık tek kenar kaldığı için o kenar ×.';
    return { sets, cells: [], verts: [v], text };
  }
  // 4) Tek döngü kuralı
  const lr = loopRule(g, S);
  if (lr.length) {
    return { sets: [lr[0]], cells: [], verts: [g.eA[lr[0][0]], g.eB[lr[0][0]]],
      text: 'Bu kenarı çizmek, diğer çizgileri dışarıda bırakan küçük bir kapalı döngü oluşturur. Tek döngü olması gerektiği için ×.' };
  }
  // 5) Yerel desenler
  for (let c = 0; c < g.NC; c++) {
    if (clues[c] < 0 || S.cnt[c] + S.cx[c] === 4) continue;
    const sets = enumerate(g, clues, S, [c]);
    if (!sets?.length) continue;
    const k = clues[c];
    let text;
    if (isCorner(c) && k === 3 && S.cnt[c] + S.cx[c] === 0) text = 'Köşedeki 3: ızgaranın köşesine değen iki kenar mutlaka çizgidir.';
    else if (isCorner(c) && k === 1 && S.cnt[c] + S.cx[c] === 0) text = 'Köşedeki 1: ızgaranın köşesine değen iki kenarda çizgi olamaz (oraya giren çizgi çıkamaz).';
    else if (isCorner(c) && k === 2 && S.cnt[c] + S.cx[c] === 0) text = 'Köşedeki 2: ızgaranın dış sınırında bu hücrenin hemen yanındaki iki kenar mutlaka çizgidir.';
    else text = `Bu ${k} hücresinin köşelerine bak: her noktaya ya 0 ya 2 çizgi gelebilir. Bu yüzden işaretli kenar(lar) ${lineWord(sets)}.`;
    return { sets, cells: [c], verts: [], text };
  }
  const p = adjacent33(g, clues, S);
  if (p) return { sets: p.sets, cells: p.cells, verts: [], text: 'Yan yana iki 3: aralarındaki kenar ve iki dış kenar mutlaka çizgidir.' };
  for (const pair of neighborPairs(g, clues)) {
    if (pair.every((c) => S.cnt[c] + S.cx[c] === 4)) continue;
    const sets = enumerate(g, clues, S, pair);
    if (!sets?.length) continue;
    const [a, b] = pair;
    const diag = Math.floor(a / C) !== Math.floor(b / C) && a % C !== b % C;
    const text = diag && clues[a] === 3 && clues[b] === 3
      ? 'Çapraz iki 3: birbirinden uzak köşelerindeki kenarlar mutlaka çizgidir.'
      : `Komşu ${clues[a]} ve ${clues[b]} hücrelerini ortak köşeleriyle birlikte düşün: işaretli kenar(lar) ${lineWord(sets)}.`;
    return { sets, cells: pair, verts: [], text };
  }
  // 6) Kısa deneme
  const ready = clone(S);
  if (propagate(g, clues, ready, fullQueue(g))) {
    const t = trialFind(g, clues, ready);
    if (t && marks[t.e] === 0) {
      return { sets: [[t.e, t.val]], cells: [], verts: [],
        text: t.tried === LINE
          ? 'Deneme: işaretli kenara çizgi çizersen birkaç adımda çelişki çıkıyor; bu yüzden boş (×) olmalı.'
          : 'Deneme: işaretli kenarı boş bırakırsan birkaç adımda çelişki çıkıyor; bu yüzden çizgi olmalı.' };
    }
  }
  return null;
}

// ------------------------------------------------------------- üretici
function randomRegion(rng, R, C) {
  const N = R * C;
  const target = Math.round(N * (0.42 + 0.2 * rng.next()));
  const inS = new Uint8Array(N);
  const nb = (c) => {
    const r = Math.floor(c / C), col = c % C, out = [];
    if (r > 0) out.push(c - C);
    if (r < R - 1) out.push(c + C);
    if (col > 0) out.push(c - 1);
    if (col < C - 1) out.push(c + 1);
    return out;
  };
  const valid = () => {
    // Dış bölge (kenarlardan erişilebilir) tüm dış hücreleri kapsamalı: delik yok.
    const seen = new Uint8Array(N), st = [];
    for (let c = 0; c < N; c++) {
      const r = Math.floor(c / C), col = c % C;
      if (!inS[c] && (r === 0 || col === 0 || r === R - 1 || col === C - 1)) { seen[c] = 1; st.push(c); }
    }
    while (st.length) for (const d of nb(st.pop())) if (!inS[d] && !seen[d]) { seen[d] = 1; st.push(d); }
    for (let c = 0; c < N; c++) if (!inS[c] && !seen[c]) return false;
    // Çapraz temas (bir noktada 4 çizgi) yok.
    for (let r = 0; r < R - 1; r++) for (let c = 0; c < C - 1; c++) {
      const a = inS[r * C + c], b = inS[r * C + c + 1], x = inS[(r + 1) * C + c], y = inS[(r + 1) * C + c + 1];
      if (a === y && b === x && a !== b) return false;
    }
    return true;
  };
  inS[rng.int(1, R - 2) * C + rng.int(1, C - 2)] = 1;
  let size = 1;
  while (size < target) {
    const cand = [];
    for (let c = 0; c < N; c++) if (!inS[c] && nb(c).some((d) => inS[d])) cand.push(c);
    rng.shuffle(cand);
    // Kıvrımlı şekiller için az komşulu adaylar öne alınır.
    cand.sort((a, b) => nb(a).filter((d) => inS[d]).length - nb(b).filter((d) => inS[d]).length);
    let added = false;
    for (const c of cand) {
      inS[c] = 1;
      if (valid()) { added = true; size++; break; }
      inS[c] = 0;
    }
    if (!added) break;
  }
  return inS;
}

function loopFromRegion(g, inS) {
  const { R, C } = g;
  const at = (r, c) => (r >= 0 && r < R && c >= 0 && c < C ? inS[r * C + c] : 0);
  const lines = new Array(g.NE).fill(0);
  for (let r = 0; r <= R; r++) for (let c = 0; c < C; c++) lines[g.H(r, c)] = at(r - 1, c) !== at(r, c) ? 1 : 0;
  for (let r = 0; r < R; r++) for (let c = 0; c <= C; c++) lines[g.V(r, c)] = at(r, c - 1) !== at(r, c) ? 1 : 0;
  return lines;
}

// İpucu yoğunluğu her seviye içinde doğrusal olarak azalır (kolaydan zora).
const lerp = (a, b, t) => a + (b - a) * t;
const CONFIG = {
  easy: (t) => ({ R: 5, C: 5, tier: 1, need: 1, density: lerp(0.68, 0.46, t) }),
  medium: (t) => ({ R: 7, C: 7, tier: 2, need: 2, density: lerp(0.56, 0.41, t) }),
  hard: (t, i, total) => {
    const half = total / 2, big = i >= half;
    const s = (big ? i - half : i) / (half - 1);
    return big
      ? { R: 10, C: 10, tier: 3, need: 3, density: lerp(0.44, 0.37, s) }
      : { R: 9, C: 9, tier: 3, need: s < 0.2 ? 2 : 3, density: lerp(0.48, 0.39, s) };
  },
};

const usedTier = (res) => (res.t3 ? 3 : res.t2 ? 2 : 1);

export function generateLevel(rng, difficulty, index, total) {
  const t = total > 1 ? index / (total - 1) : 0;
  const cfg = CONFIG[difficulty](t, index, total);
  const g = geometry(cfg.R, cfg.C);
  const target = Math.round(g.NC * cfg.density);
  let best = null;
  for (let attempt = 0; attempt < 12; attempt++) {
    const sol = loopFromRegion(g, randomRegion(rng, cfg.R, cfg.C));
    const full = g.cEdges.map((es) => es.reduce((s, e) => s + sol[e], 0));
    const clues = full.slice();
    const order = rng.shuffle(Array.from({ length: g.NC }, (_, i) => i));
    for (const c of order) {
      clues[c] = -1;
      if (!logicalSolve(g, clues, cfg.tier).solved) clues[c] = full[c];
    }
    let res = logicalSolve(g, clues, cfg.tier);
    if (!res.solved || usedTier(res) < cfg.need) continue;
    // Hedef ipucu sayısına kadar kaldırılmış ipuçları geri eklenir (gerekli teknik korunarak).
    const removed = rng.shuffle(order.filter((c) => clues[c] < 0));
    let n = clues.filter((k) => k >= 0).length;
    for (const c of removed) {
      if (n >= target) break;
      clues[c] = full[c];
      const r2 = logicalSolve(g, clues, cfg.tier);
      if (usedTier(r2) < cfg.need) { clues[c] = -1; continue; }
      res = r2; n++;
    }
    const level = {
      rows: cfg.R, cols: cfg.C,
      puzzle: clues.map((k) => (k < 0 ? '.' : String(k))).join(''),
      solution: sol.join(''),
      clues: n,
      tier: usedTier(res),
    };
    const dist = Math.abs(n - target);
    if (!best || dist < best.dist) best = { level, dist };
    if (dist === 0) break;
  }
  if (!best) throw new Error('Level üretilemedi');
  return best.level;
}

export function verifyLevel(level) {
  const { rows, cols, puzzle, solution } = level ?? {};
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 2 || cols < 2 || rows > 15 || cols > 15) return 'Boyut hatalı';
  const g = geometry(rows, cols);
  if (typeof puzzle !== 'string' || puzzle.length !== g.NC || !/^[.0-3]+$/.test(puzzle)) return 'Bulmaca metni hatalı';
  if (typeof solution !== 'string' || solution.length !== g.NE || !/^[01]+$/.test(solution)) return 'Çözüm metni hatalı';
  const clues = parseClues(puzzle);
  const err = checkSolution(g, clues, parseSolution(solution));
  if (err) return `Kayıtlı çözüm geçersiz: ${err}`;
  const { count, found } = countSolutions(g, clues, 2);
  if (count !== 1) return `Çözüm sayısı ${count} (tam 1 olmalı)`;
  if (found[0] !== solution) return 'Bulunan çözüm kayıtlı çözümle uyuşmuyor';
  return null;
}
