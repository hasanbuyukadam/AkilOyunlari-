// Sayı Bağla (Numberlink) mantığı — hem tarayıcıda hem Node'da çalışır (DOM yok).
//
// Level biçimi:
//   w, h      : ızgara boyutu
//   pairs     : sayı çifti adedi
//   puzzle    : h*w karakter, '.' = boş, '1'..'9','a'.. = çiftin etiketi (satır satır)
//   solution  : h*w karakter, her hücrenin ait olduğu yolun etiketi
// Kural: aynı sayılar yatay/dikey komşu hücrelerden geçen yollarla bağlanır; yollar
// kesişmez, hücre paylaşmaz ve TÜM hücreler bir yolla dolmalıdır.

const LABELS = '123456789abcdefghijklmnopqrstuvwxyz';
export const labelOf = (p) => LABELS[p];
export const pairOfLabel = (ch) => LABELS.indexOf(ch);

export function makeGeom(w, h) {
  const N = w * h;
  const nbr = [];
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / w), c = i % w, l = [];
    if (r > 0) l.push(i - w);
    if (c < w - 1) l.push(i + 1);
    if (r < h - 1) l.push(i + w);
    if (c > 0) l.push(i - 1);
    nbr.push(l);
  }
  return { w, h, N, nbr };
}

const adjacent = (G, a, b) => G.nbr[a].includes(b);

/** Bulmacayı ayrıştırır: geometri + uç noktalar (+ varsa çözüm yolları). */
export function parseLevel(level) {
  const { w, h, puzzle } = level;
  const G = makeGeom(w, h);
  const ends = [];
  for (let i = 0; i < G.N; i++) {
    const ch = puzzle[i];
    if (ch === '.') continue;
    const p = pairOfLabel(ch);
    (ends[p] ??= []).push(i);
  }
  const P = ends.length;
  let solPaths = null;
  if (typeof level.solution === 'string') solPaths = tracePaths(G, ends, level.solution);
  return { ...G, P, ends, solPaths };
}

/** Çözüm metninden her çiftin yolunu (ilk uçtan ikinciye) çıkarır; geçersizse null. */
function tracePaths(G, ends, sol) {
  const out = [];
  for (let p = 0; p < ends.length; p++) {
    const ch = labelOf(p);
    const [a, b] = ends[p];
    const path = [a];
    let prev = -1, cur = a;
    while (cur !== b) {
      const nx = G.nbr[cur].filter((n) => n !== prev && sol[n] === ch);
      if (nx.length !== 1) return null;
      prev = cur; cur = nx[0];
      path.push(cur);
      if (path.length > G.N) return null;
    }
    out.push(path);
  }
  return out;
}

// ---------------------------------------------------------------------------
// DURUM: her çiftin iki ucundan büyüyen yollar. color[c] = çift (-1 boş),
// headOf[c] = c aktif bir uçsa çift numarası, hd[2p+s] = çiftin s. ucu.
// ---------------------------------------------------------------------------
export function newState(G) {
  const S = {
    G, N: G.N, nbr: G.nbr, P: G.P,
    color: new Int16Array(G.N).fill(-1),
    headOf: new Int16Array(G.N).fill(-1),
    hd: new Int16Array(2 * G.P),
    done: new Uint8Array(G.P),
    empty: G.N - 2 * G.P,
    comp: new Int16Array(G.N),
    queue: new Int16Array(G.N),
  };
  G.ends.forEach(([a, b], p) => {
    S.color[a] = S.color[b] = p;
    S.headOf[a] = S.headOf[b] = p;
    S.hd[2 * p] = a; S.hd[2 * p + 1] = b;
  });
  return S;
}

export function cloneState(S) {
  return {
    ...S,
    color: S.color.slice(), headOf: S.headOf.slice(), hd: S.hd.slice(), done: S.done.slice(),
    comp: new Int16Array(S.N), queue: new Int16Array(S.N),
  };
}

/** Hamle: {p, side, to} — to = boş hücre (uç oraya ilerler) ya da -1 (iki uç birleşir). */
export function applyMove(S, m) {
  const { p, side, to } = m;
  if (to < 0) {
    S.done[p] = 1;
    S.headOf[S.hd[2 * p]] = -1;
    S.headOf[S.hd[2 * p + 1]] = -1;
    return;
  }
  m.prev = S.hd[2 * p + side];
  S.headOf[m.prev] = -1;
  S.color[to] = p;
  S.headOf[to] = p;
  S.hd[2 * p + side] = to;
  S.empty--;
}

function undoMove(S, m) {
  const { p, side, to } = m;
  if (to < 0) {
    S.done[p] = 0;
    S.headOf[S.hd[2 * p]] = p;
    S.headOf[S.hd[2 * p + 1]] = p;
    return;
  }
  S.color[to] = -1;
  S.headOf[to] = -1;
  S.hd[2 * p + side] = m.prev;
  S.headOf[m.prev] = p;
  S.empty++;
}

/** Bir ucun yapabileceği hamleler. */
export function movesOf(S, p, side) {
  const h = S.hd[2 * p + side], o = S.hd[2 * p + 1 - side];
  const out = [];
  for (const n of S.nbr[h]) {
    if (S.color[n] < 0) out.push({ p, side, to: n });
    else if (n === o) out.push({ p, side, to: -1 });
  }
  return out;
}

/**
 * Gerekli koşullar (hepsi her çözümde sağlanmak zorunda — budama güvenlidir):
 *  - dead   : her boş hücreden bir yol geçer; iki "açık" komşusu (boş hücre ya da yol ucu) olmalı,
 *             iki komşusu da uçsa aynı çiftin iki ucu olmalı.
 *  - blocked: bitmemiş her çiftin iki ucu ya yan yana ya da aynı boş bölgeye değmeli.
 *  - region : her boş bölgeye, iki ucu da o bölgeye değen bir çift ulaşabilmeli.
 * Sorun yoksa null, varsa nedeni döner.
 */
export function check(S) {
  const { N, nbr, color, headOf, P, hd, done, comp, queue } = S;
  for (let c = 0; c < N; c++) {
    if (color[c] >= 0) continue;
    let e = 0, hs = 0, twin = false;
    const seen = [];
    for (const n of nbr[c]) {
      if (color[n] < 0) e++;
      else if (headOf[n] >= 0) {
        hs++;
        if (seen.includes(headOf[n])) twin = true; else seen.push(headOf[n]);
      }
    }
    if (e >= 2) continue;
    if (e === 1 && hs >= 1) continue;
    if (e === 0 && twin) continue;
    return { type: 'dead', cell: c };
  }
  comp.fill(-1);
  let k = 0;
  for (let c = 0; c < N; c++) {
    if (color[c] >= 0 || comp[c] >= 0) continue;
    let qh = 0, qt = 0;
    queue[qt++] = c; comp[c] = k;
    while (qh < qt) {
      const x = queue[qh++];
      for (const n of nbr[x]) if (color[n] < 0 && comp[n] < 0) { comp[n] = k; queue[qt++] = n; }
    }
    k++;
  }
  const served = new Uint8Array(k);
  for (let p = 0; p < P; p++) {
    if (done[p]) continue;
    const a = hd[2 * p], b = hd[2 * p + 1];
    let ok = false;
    for (const n of nbr[a]) {
      if (n === b) { ok = true; continue; }
      if (color[n] >= 0) continue;
      const ka = comp[n];
      for (const m of nbr[b]) if (color[m] < 0 && comp[m] === ka) { served[ka] = 1; ok = true; break; }
    }
    if (!ok) return { type: 'blocked', pair: p };
  }
  for (let i = 0; i < k; i++) {
    if (served[i]) continue;
    const cells = [];
    for (let c = 0; c < N; c++) if (comp[c] === i) cells.push(c);
    return { type: 'region', cells };
  }
  return null;
}

export const isComplete = (S) => S.empty === 0 && S.done.every(Boolean);

// ---------------------------------------------------------------------------
// TAM ARAMA (çözüm sayacı). Kurallara (yollar kendine değebilir) uyan TÜM yol
// çözümlerini sayar; yalnızca yukarıdaki güvenli koşullarla budar. limit'te durur.
// Her adımda en az seçeneği olan uç seçilir ve onun tüm hamleleri denenir; bir
// çözümde o ucun sıradaki hücresi tek olduğundan her çözüm tam bir kez sayılır.
// ---------------------------------------------------------------------------
export function countSolutions(G, limit = 2, nodeLimit = Infinity) {
  const S = newState(G);
  let found = 0, nodes = 0;
  const rec = () => {
    if (++nodes > nodeLimit) throw new Error('nodeLimit');
    if (check(S)) return;
    // Zorunlu hücre: yalnızca 2 açık komşusu olan boş hücre, komşu uçtan mutlaka gelinir.
    for (let c = 0; c < S.N; c++) {
      if (S.color[c] >= 0) continue;
      let cand = 0, head = -1;
      for (const n of S.nbr[c]) {
        if (S.color[n] < 0) cand++;
        else if (S.headOf[n] >= 0) { cand++; head = n; }
      }
      if (cand === 2 && head >= 0) {
        const p = S.headOf[head];
        const m = { p, side: S.hd[2 * p] === head ? 0 : 1, to: c };
        applyMove(S, m);
        rec();
        undoMove(S, m);
        return;
      }
    }
    let bp = -1, bs = 0, bc = 99;
    for (let p = 0; p < S.P; p++) {
      if (S.done[p]) continue;
      for (let s = 0; s < 2; s++) {
        const h = S.hd[2 * p + s], o = S.hd[2 * p + 1 - s];
        let cnt = 0;
        for (const n of S.nbr[h]) if (S.color[n] < 0 || n === o) cnt++;
        if (cnt < bc) { bc = cnt; bp = p; bs = s; }
      }
    }
    if (bp < 0) { if (S.empty === 0) found++; return; }
    for (const m of movesOf(S, bp, bs)) {
      applyMove(S, m);
      rec();
      undoMove(S, m);
      if (found >= limit) return;
    }
  };
  try { rec(); } catch (e) { if (e.message === 'nodeLimit') return -1; throw e; }
  return found;
}

// ---------------------------------------------------------------------------
// İNSAN TARZI MANTIKSAL ÇÖZÜCÜ (zorluk derecelendirme + Akıllı İpucu)
//  Seviye 1: "tek yön" — bir yol ucunun yalnızca bir gidebileceği yer var;
//            "dar hücre" — boş hücrenin yalnızca 2 açık komşusu var, biri bir yol ucu.
//  Seviye 2: bir yöne gidince hemen çıkmaz (dead/blocked/region) oluşuyorsa o yön elenir.
//  Seviye 3: bir yöne gidince birkaç zorunlu (seviye 1) hamle sonra çıkmaz oluşuyorsa elenir.
// ---------------------------------------------------------------------------
function level1(S) {
  for (let p = 0; p < S.P; p++) {
    if (S.done[p]) continue;
    for (let s = 0; s < 2; s++) {
      const ms = movesOf(S, p, s);
      if (ms.length === 1) return { level: 1, kind: 'head', move: ms[0] };
    }
  }
  for (let c = 0; c < S.N; c++) {
    if (S.color[c] >= 0) continue;
    let cand = 0, head = -1;
    for (const n of S.nbr[c]) {
      if (S.color[n] < 0) cand++;
      else if (S.headOf[n] >= 0) { cand++; if (head < 0) head = n; }
    }
    if (cand === 2 && head >= 0) {
      const p = S.headOf[head];
      return { level: 1, kind: 'cell', cell: c, move: { p, side: S.hd[2 * p] === head ? 0 : 1, to: c } };
    }
  }
  return null;
}

// Seviye lv-1'e kadar olan adımları çıkmaz bulunana ya da adım kalmayana kadar uygular.
function propagate(S, lv, maxSteps = 400) {
  for (let i = 0; i < maxSteps; i++) {
    const r = check(S);
    if (r) return r;
    const st = lv <= 2 ? level1(S) : findStep(S, lv - 1);
    if (!st) return null;
    if (st.contradiction) return { type: 'deep' };
    applyMove(S, st.move);
  }
  return check(S);
}

/** Sıradaki mantıklı adım: {level, kind, move, ...} | {contradiction:true} | null */
export function findStep(S, maxLevel = 3) {
  if (check(S)) return { contradiction: true };
  const s1 = level1(S);
  if (s1) return s1;
  for (let lv = 2; lv <= maxLevel; lv++) {
    for (let p = 0; p < S.P; p++) {
      if (S.done[p]) continue;
      for (let s = 0; s < 2; s++) {
        const ms = movesOf(S, p, s);
        if (ms.length < 2) continue;
        const live = [], dead = [];
        for (const m of ms) {
          let reason;
          if (lv === 2) {
            applyMove(S, m);
            reason = check(S);
            undoMove(S, m);
          } else {
            const T = cloneState(S);
            applyMove(T, m);
            reason = propagate(T, lv);
          }
          if (reason) dead.push({ move: m, reason }); else live.push(m);
        }
        if (live.length === 0) return { contradiction: true };
        if (live.length === 1) return { level: lv, kind: 'elim', move: live[0], eliminated: dead };
      }
    }
  }
  return null;
}

/** Mantıksal çözüm: tahminsiz çözülebiliyorsa solved:true; zorluk istatistikleri. */
export function logicalSolve(G, maxLevel = 3) {
  const S = newState(G);
  const stats = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (let guard = 0; guard < 10 * G.N; guard++) {
    if (isComplete(S)) return { solved: true, stats, maxUsed: stats[4] ? 4 : stats[3] ? 3 : stats[2] ? 2 : 1, S };
    const st = findStep(S, maxLevel);
    if (!st || st.contradiction) return { solved: false, stats };
    stats[st.level]++;
    applyMove(S, st.move);
  }
  return { solved: false, stats };
}

// ---------------------------------------------------------------------------
// ÜRETİCİ: rastgele, tüm ızgarayı kaplayan yol bölümlemesi. Her hücre tek başına
// bir yol olarak başlar; uçları komşu olan iki yol, birleşince yol kendine
// değmiyorsa (yan yana gelen iki hücresi ardışık değilse) birleştirilir.
// ---------------------------------------------------------------------------
function randomPartition(rng, G, target, minLen) {
  const { N, nbr } = G;
  let paths = Array.from({ length: N }, (_, i) => [i]);
  const pathOf = new Int32Array(N);
  const reindex = () => paths.forEach((P, k) => { for (const c of P) pathOf[c] = k; });
  reindex();
  const isEnd = (c) => { const P = paths[pathOf[c]]; return P[0] === c || P[P.length - 1] === c; };
  // x'i (bir ucu) v ucunun yanına eklemek yolu kendine değdirir mi?
  const touches = (x, v, skipPath) => {
    const b = pathOf[v];
    for (const y of nbr[x]) if (y !== v && pathOf[y] === b) return true;
    return false;
  };
  const canMerge = (u, v) => {
    const a = pathOf[u], b = pathOf[v];
    if (a === b) return false;
    for (const x of paths[a]) for (const y of nbr[x]) if (pathOf[y] === b && !(x === u && y === v)) return false;
    return true;
  };
  const attach = (B, v, x) => (B[0] === v ? [x, ...B] : [...B, x]);
  const limit = N * 400;
  for (let it = 0; it < limit; it++) {
    const count = paths.length;
    if (count === target && paths.every((P) => P.length >= minLen)) {
      if (it > N * 4 || rng.next() < 0.02) return paths;
    }
    // komşu uç çiftleri
    const pairs = [];
    for (let u = 0; u < N; u++) {
      if (!isEnd(u)) continue;
      for (const v of nbr[u]) if (v > u && isEnd(v) && pathOf[u] !== pathOf[v]) pairs.push([u, v]);
    }
    if (!pairs.length) return null;
    const [u0, v0] = pairs[rng.int(0, pairs.length - 1)];
    const [u, v] = rng.next() < 0.5 ? [u0, v0] : [v0, u0];
    const a = pathOf[u], b = pathOf[v];
    const A = paths[a], B = paths[b];
    const wantMerge = count > target ? 0.35 + (A.length < minLen || B.length < minLen ? 0.4 : 0) : 0;
    if (rng.next() < wantMerge) {
      if (!canMerge(u, v)) continue;
      const a2 = A[A.length - 1] === u ? A : A.slice().reverse();
      const b2 = B[0] === v ? B : B.slice().reverse();
      paths[a] = a2.concat(b2);
      paths.splice(b, 1);
      reindex();
    } else {
      // u'yu A'dan koparıp B'nin v ucuna ekle (A en az 1 hücre kalmalı)
      if (A.length < 2) continue;
      if (touches(u, v)) continue;
      paths[a] = A[0] === u ? A.slice(1) : A.slice(0, -1);
      paths[b] = attach(B, v, u);
      pathOf[u] = b;
    }
  }
  return null;
}

const PLAN = {
  easy: (i) => (i < 10 ? { w: 5, pairs: i < 5 ? 5 : 4 } : { w: 6, pairs: i < 15 ? 6 : 5 }),
  medium: (i) => (i < 10 ? { w: 7, pairs: i < 5 ? 7 : 6 } : { w: 8, pairs: i < 15 ? 8 : 7 }),
  hard: (i) => (i < 10 ? { w: 9, pairs: i < 5 ? 10 : 9 } : { w: 10, pairs: i < 15 ? 12 : 11 }),
};

function buildLevel(G, paths) {
  // Çiftleri ilk uçlarının okuma sırasına göre numaralandır.
  const list = paths.map((p) => (p[0] < p[p.length - 1] ? p : p.slice().reverse()));
  list.sort((a, b) => a[0] - b[0]);
  const puzzle = new Array(G.N).fill('.');
  const solution = new Array(G.N).fill('?');
  list.forEach((path, p) => {
    puzzle[path[0]] = puzzle[path[path.length - 1]] = labelOf(p);
    for (const c of path) solution[c] = labelOf(p);
  });
  return { w: G.w, h: G.h, pairs: list.length, puzzle: puzzle.join(''), solution: solution.join('') };
}

export function generateLevel(rng, difficulty, index, total) {
  const plan = PLAN[difficulty](index);
  const G0 = makeGeom(plan.w, plan.w);
  const t = total > 1 ? index / (total - 1) : 0;
  // Zorluk: kolay = seviye 1-2 adımları; orta = seviye 2-3; zor = seviye 3-4 gerekir.
  const maxLevel = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
  for (let attempt = 0; attempt < 200000; attempt++) {
    const paths = randomPartition(rng, G0, plan.pairs, 3);
    if (!paths) continue;
    const level = buildLevel(G0, paths);
    const G = parseLevel(level);
    const res = logicalSolve(G, maxLevel);
    if (!res.solved) continue;
    const s = res.stats;
    if (difficulty === 'easy' && (s[2] > 1 + Math.floor(t * 4) || (t > 0.4 && s[2] < 1))) continue;
    if (difficulty === 'medium' && (s[2] + 2 * s[3] < 2 + Math.floor(t * 5) || s[3] > 1 + Math.floor(t * 3))) continue;
    if (difficulty === 'hard' && s[3] + 2 * s[4] < 2 + Math.floor(t * 6)) continue;
    if (countSolutions(G, 2, 3e6) !== 1) continue;
    return { ...level, grade: `${s[1]}/${s[2]}/${s[3]}/${s[4]}` };
  }
  throw new Error(`Sayı Bağla üretilemedi: ${difficulty} #${index + 1}`);
}

/** Bağımsız doğrulama: biçim + kayıtlı çözüm geçerli + TAM aramayla TEK çözüm + tahminsiz çözülebilir. */
export function verifyLevel(level) {
  const { w, h, puzzle, solution, pairs } = level ?? {};
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 3 || h < 3 || w > 12 || h > 12) return 'Geçersiz boyut';
  if (typeof puzzle !== 'string' || puzzle.length !== w * h) return 'Bulmaca uzunluğu hatalı';
  if (typeof solution !== 'string' || solution.length !== w * h) return 'Çözüm uzunluğu hatalı';
  if (!Number.isInteger(pairs) || pairs < 2 || pairs > LABELS.length) return 'Çift sayısı hatalı';
  const valid = LABELS.slice(0, pairs);
  for (const ch of puzzle) if (ch !== '.' && !valid.includes(ch)) return 'Bulmacada geçersiz karakter';
  for (const ch of solution) if (!valid.includes(ch)) return 'Çözümde geçersiz karakter';
  const G = parseLevel(level);
  if (G.P !== pairs) return 'Çift sayısı uyuşmuyor';
  for (let p = 0; p < pairs; p++) if (!G.ends[p] || G.ends[p].length !== 2) return `${p + 1} sayısı tam iki kez olmalı`;
  for (let i = 0; i < G.N; i++) if (puzzle[i] !== '.' && solution[i] !== puzzle[i]) return 'Çözüm uç noktalarla uyuşmuyor';
  // Her renk bölgesi, iki ucu arasında kendine değmeyen tek bir yol olmalı.
  for (let p = 0; p < pairs; p++) {
    const ch = labelOf(p);
    let cells = 0;
    for (let i = 0; i < G.N; i++) {
      if (solution[i] !== ch) continue;
      cells++;
      const deg = G.nbr[i].filter((n) => solution[n] === ch).length;
      const isEnd = G.ends[p].includes(i);
      if (deg !== (isEnd ? 1 : 2)) return `${p + 1} yolu düzgün bir yol değil`;
    }
    if (!G.solPaths || G.solPaths[p].length !== cells) return `${p + 1} yolu kopuk`;
  }
  const n = countSolutions(G, 2);
  if (n !== 1) return `Çözüm sayısı ${n} (1 olmalı)`;
  if (!logicalSolve(G, 4).solved) return 'Tahmin yapmadan çözülemiyor';
  return null;
}
