// Labirent: saf mantık (DOM yok). Tarayıcı ve Node ortak.
//
// Bulmaca biçimi (level.puzzle):  "<w>x<h>;<hücreler>;<başlangıç>;<hedef>;<anahtar|->"
//   hücreler: satır satır w*h rakam; her rakam 0-3 → bit0 = sağa geçit açık, bit1 = aşağı geçit açık.
//   konumlar: "r,c" (0 tabanlı). Anahtar yoksa "-".
// Çözüm (level.solution): başlangıçtan hedefe (anahtar varsa önce anahtara) giden adımlar: R/D/L/U.
//
// Labirentler "kusursuz"dur (yayılan ağaç): iki kare arasında tam olarak bir basit yol vardır.

export const DIRS = [
  { k: 'R', dr: 0, dc: 1 },
  { k: 'D', dr: 1, dc: 0 },
  { k: 'L', dr: 0, dc: -1 },
  { k: 'U', dr: -1, dc: 0 },
];
const DIR_INDEX = { R: 0, D: 1, L: 2, U: 3 };

// ---------------------------------------------------------------- ayrıştırma

const parsePos = (s) => {
  const m = /^(\d+),(\d+)$/.exec(s);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

/** puzzle → { w, h, n, cells(Uint8Array), adj[][], start, goal, key } (konumlar hücre indeksi) */
export function parsePuzzle(puzzle) {
  if (typeof puzzle !== 'string') return null;
  const parts = puzzle.split(';');
  if (parts.length !== 5) return null;
  const dm = /^(\d+)x(\d+)$/.exec(parts[0]);
  if (!dm) return null;
  const w = Number(dm[1]), h = Number(dm[2]);
  if (w < 2 || h < 2 || w > 40 || h > 40) return null;
  const n = w * h;
  if (parts[1].length !== n || !/^[0-3]+$/.test(parts[1])) return null;
  const cells = Uint8Array.from(parts[1], Number);
  const sp = parsePos(parts[2]), gp = parsePos(parts[3]);
  const kp = parts[4] === '-' ? null : parsePos(parts[4]);
  if (!sp || !gp || (parts[4] !== '-' && !kp)) return null;
  const inside = ([r, c]) => r < h && c < w;
  if (!inside(sp) || !inside(gp) || (kp && !inside(kp))) return null;
  const adj = Array.from({ length: n }, () => []);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const i = r * w + c;
      if (cells[i] & 1) {
        if (c === w - 1) return null; // dış duvarda geçit olamaz
        adj[i].push(i + 1); adj[i + 1].push(i);
      }
      if (cells[i] & 2) {
        if (r === h - 1) return null;
        adj[i].push(i + w); adj[i + w].push(i);
      }
    }
  }
  return {
    w, h, n, cells, adj,
    start: sp[0] * w + sp[1],
    goal: gp[0] * w + gp[1],
    key: kp ? kp[0] * w + kp[1] : -1,
  };
}

/** a hücresinden d yönüne geçit açık mı? */
export function isOpen(M, a, d) {
  const { w, h, cells } = M;
  const r = Math.floor(a / w), c = a % w;
  if (d === 0) return c < w - 1 && (cells[a] & 1) !== 0;
  if (d === 1) return r < h - 1 && (cells[a] & 2) !== 0;
  if (d === 2) return c > 0 && (cells[a - 1] & 1) !== 0;
  return r > 0 && (cells[a - w] & 2) !== 0;
}

export function stepCell(M, a, d) {
  const { w } = M;
  return a + DIRS[d].dr * w + DIRS[d].dc;
}

/** Komşu hücreler arasındaki yön (0..3) ya da -1 */
export function dirBetween(M, a, b) {
  const { w } = M;
  if (b === a + 1 && b % w !== 0) return 0;
  if (b === a + w) return 1;
  if (b === a - 1 && a % w !== 0) return 2;
  if (b === a - w) return 3;
  return -1;
}

/** Çözüm dizgesini hücre yürüyüşüne çevirir (duvardan geçerse null). */
export function solutionWalk(M, solution) {
  const walk = [M.start];
  let cur = M.start;
  for (const ch of solution) {
    const d = DIR_INDEX[ch];
    if (d === undefined || !isOpen(M, cur, d)) return null;
    cur = stepCell(M, cur, d);
    walk.push(cur);
  }
  return walk;
}

/** Ağaçta a'dan b'ye tek yol (BFS ebeveynleri ile). */
export function treePath(M, a, b) {
  const prev = new Int32Array(M.n).fill(-2);
  prev[a] = -1;
  const q = [a];
  for (let qi = 0; qi < q.length; qi++) {
    const x = q[qi];
    if (x === b) break;
    for (const y of M.adj[x]) if (prev[y] === -2) { prev[y] = x; q.push(y); }
  }
  if (prev[b] === -2) return null;
  const path = [];
  for (let x = b; x !== -1; x = prev[x]) path.push(x);
  return path.reverse();
}

export function bfsDist(M, a) {
  const dist = new Int32Array(M.n).fill(-1);
  dist[a] = 0;
  const q = [a];
  for (let qi = 0; qi < q.length; qi++) {
    const x = q[qi];
    for (const y of M.adj[x]) if (dist[y] < 0) { dist[y] = dist[x] + 1; q.push(y); }
  }
  return dist;
}

/** Yürüyüşte olmayan hücrelerin oluşturduğu çıkmaz kollar: [{cells:[], attach}] */
export function deadBranches(M, walk) {
  const onWalk = new Uint8Array(M.n);
  for (const x of walk) onWalk[x] = 1;
  const comp = new Int32Array(M.n).fill(-1);
  const branches = [];
  for (let s = 0; s < M.n; s++) {
    if (onWalk[s] || comp[s] >= 0) continue;
    const id = branches.length;
    const cells = [s];
    comp[s] = id;
    let attach = -1;
    for (let qi = 0; qi < cells.length; qi++) {
      const x = cells[qi];
      for (const y of M.adj[x]) {
        if (onWalk[y]) attach = y;
        else if (comp[y] < 0) { comp[y] = id; cells.push(y); }
      }
    }
    branches.push({ cells, attach });
  }
  return { branches, comp, onWalk };
}

// ---------------------------------------------------------------- üretim

function newMaze(w, h) {
  return { w, h, n: w * h, cells: new Uint8Array(w * h) };
}
function carve(m, a, b) {
  const lo = Math.min(a, b), hi = Math.max(a, b);
  m.cells[lo] |= hi - lo === 1 ? 1 : 2;
}
function gridNeighbors(m, a) {
  const { w, h } = m;
  const r = Math.floor(a / w), c = a % w;
  const out = [];
  if (c < w - 1) out.push(a + 1);
  if (r < h - 1) out.push(a + w);
  if (c > 0) out.push(a - 1);
  if (r > 0) out.push(a - w);
  return out;
}

/** Büyüyen ağaç: pNewest=1 → özyinelemeli geri izleme (uzun koridorlar), 0 → Prim benzeri (çok dal). */
function growingTree(rng, w, h, pNewest) {
  const m = newMaze(w, h);
  const seen = new Uint8Array(m.n);
  const s = rng.int(0, m.n - 1);
  seen[s] = 1;
  const active = [s];
  while (active.length) {
    const idx = rng.next() < pNewest ? active.length - 1 : rng.int(0, active.length - 1);
    const a = active[idx];
    const free = gridNeighbors(m, a).filter((b) => !seen[b]);
    if (!free.length) { active.splice(idx, 1); continue; }
    const b = free[rng.int(0, free.length - 1)];
    carve(m, a, b);
    seen[b] = 1;
    active.push(b);
  }
  return m;
}

/** Gerçek Prim: sınırdaki rastgele bir hücreyi, ağaçtaki rastgele bir komşusuna bağla. */
function prim(rng, w, h) {
  const m = newMaze(w, h);
  const state = new Uint8Array(m.n); // 0 dış, 1 sınır, 2 ağaç
  const frontier = [];
  const add = (a) => {
    state[a] = 2;
    for (const b of gridNeighbors(m, a)) if (state[b] === 0) { state[b] = 1; frontier.push(b); }
  };
  add(rng.int(0, m.n - 1));
  while (frontier.length) {
    const fi = rng.int(0, frontier.length - 1);
    const a = frontier[fi];
    frontier[fi] = frontier[frontier.length - 1];
    frontier.pop();
    const ins = gridNeighbors(m, a).filter((b) => state[b] === 2);
    carve(m, a, ins[rng.int(0, ins.length - 1)]);
    add(a);
  }
  return m;
}

/** Wilson: döngüsü silinmiş rastgele yürüyüşler → düzgün dağılımlı yayılan ağaç (çok çatallı). */
function wilson(rng, w, h) {
  const m = newMaze(w, h);
  const inTree = new Uint8Array(m.n);
  const next = new Int32Array(m.n).fill(-1);
  inTree[rng.int(0, m.n - 1)] = 1;
  for (let s = 0; s < m.n; s++) {
    if (inTree[s]) continue;
    let a = s;
    while (!inTree[a]) {
      const nb = gridNeighbors(m, a);
      next[a] = nb[rng.int(0, nb.length - 1)];
      a = next[a];
    }
    for (a = s; !inTree[a]; a = next[a]) { carve(m, a, next[a]); inTree[a] = 1; }
  }
  return m;
}

const ALGOS = {
  backtracker: (rng, w, h) => growingTree(rng, w, h, 1),
  mixed: (rng, w, h) => growingTree(rng, w, h, 0.5),
  prim,
  wilson,
};

/** Generatör çıktısını M (adj'li) biçimine çevir. */
function toModel(m) {
  const enc = (i) => `${Math.floor(i / m.w)},${i % m.w}`;
  const cellsStr = Array.from(m.cells).join('');
  return parsePuzzle(`${m.w}x${m.h};${cellsStr};${enc(0)};${enc(0)};-`);
}

// Seviye planı: boyut, algoritma, anahtar ve hedef zorluk oranı (aday çiftler içindeki yüzdelik).
function plan(difficulty, index) {
  const t = index / 19;
  if (difficulty === 'easy') {
    const size = 6 + Math.floor((index * 4) / 20); // 6..9
    return { w: size, h: size, algo: index < 12 ? 'backtracker' : (index % 2 ? 'mixed' : 'backtracker'), key: false, q: 0.85 + 0.15 * t };
  }
  if (difficulty === 'medium') {
    const size = 11 + Math.floor((index * 5) / 20); // 11..15
    return { w: size, h: size, algo: ['mixed', 'prim', 'backtracker'][index % 3], key: false, q: 0.85 + 0.15 * t };
  }
  const size = 17 + Math.floor((index * 5) / 20); // 17..21
  const key = index >= 3 && (index % 3 !== 0 || index >= 15);
  return { w: size, h: size, algo: ['wilson', 'backtracker', 'prim', 'wilson', 'mixed'][index % 5], key, q: 0.9 + 0.1 * t };
}

const encPos = (M, i) => `${Math.floor(i / M.w)},${i % M.w}`;

/** Yolun üzerindeki karar sayısı: her ara hücrede (derece-2) seçenek. */
function decisions(M, path) {
  let k = 0;
  for (let i = 1; i < path.length - 1; i++) k += Math.max(0, M.adj[path[i]].length - 2);
  return k;
}

export function generateLevel(rng, difficulty, index, total) {
  const P = plan(difficulty, index);
  const m = ALGOS[P.algo](rng, P.w, P.h);
  const M = toModel(m);
  const leaves = [];
  for (let i = 0; i < M.n; i++) if (M.adj[i].length === 1) leaves.push(i);

  // Tüm yaprak çiftlerini puanla: yol uzunluğu + 2 × karar noktası.
  const pairs = [];
  for (const a of leaves) {
    const dist = new Int32Array(M.n).fill(-1);
    const dec = new Int32Array(M.n);
    dist[a] = 0;
    const q = [a];
    for (let qi = 0; qi < q.length; qi++) {
      const x = q[qi];
      for (const y of M.adj[x]) {
        if (dist[y] >= 0) continue;
        dist[y] = dist[x] + 1;
        dec[y] = dec[x] + (x === a ? 0 : Math.max(0, M.adj[x].length - 2));
        q.push(y);
      }
    }
    for (const b of leaves) if (b > a) pairs.push({ a, b, score: dist[b] + 2 * dec[b], len: dist[b] });
  }
  pairs.sort((x, y) => x.score - y.score || x.a - y.a || x.b - y.b);
  const pick = pairs[Math.min(pairs.length - 1, Math.floor(P.q * (pairs.length - 1)))];
  let start = pick.a, goal = pick.b;
  if (rng.next() < 0.5) [start, goal] = [goal, start];

  let key = -1;
  let walk = treePath(M, start, goal);
  if (P.key) {
    // Anahtar: ana yolun dışındaki bir yaprakta; sapma uzunluğu büyük ama aşırı değil.
    const { branches, comp } = deadBranches(M, walk);
    const pathIdx = new Map(walk.map((x, i) => [x, i]));
    const cands = [];
    for (const lf of leaves) {
      if (lf === start || lf === goal || comp[lf] < 0) continue;
      const br = branches[comp[lf]];
      const depth = treePath(M, br.attach, lf).length - 1;
      const at = pathIdx.get(br.attach);
      // Kavşağın yolun ortalarında olması ve sapmanın derin olması tercih edilir.
      const mid = 1 - Math.abs(at / (walk.length - 1) - 0.5) * 2;
      cands.push({ lf, score: depth * (0.6 + 0.4 * mid), depth });
    }
    cands.sort((x, y) => y.score - x.score || x.lf - y.lf);
    const top = cands.slice(0, Math.min(4, cands.length));
    if (top.length) {
      key = top[rng.int(0, top.length - 1)].lf;
      walk = treePath(M, start, key).concat(treePath(M, key, goal).slice(1));
    }
  }

  let solution = '';
  for (let i = 1; i < walk.length; i++) solution += DIRS[dirBetween(M, walk[i - 1], walk[i])].k;

  const puzzle = `${M.w}x${M.h};${Array.from(m.cells).join('')};${encPos(M, start)};${encPos(M, goal)};${key >= 0 ? encPos(M, key) : '-'}`;
  const deadEnds = leaves.filter((x) => x !== start && x !== goal && x !== key).length;
  const order = { easy: 0, medium: 7, hard: 14 }[difficulty] ?? 0;
  return {
    w: M.w,
    h: M.h,
    puzzle,
    solution,
    theme: (order + index * 3) % 12,
    algo: P.algo,
    steps: solution.length,
    decisions: decisions(M, walk),
    deadEnds,
  };
}

// ---------------------------------------------------------------- doğrulama

/**
 * from → to arasındaki TÜM basit yolları derinlik öncelikli arama ile sayar (2'de durur).
 * Yasak hücreden (ör. anahtar alınmadan kapı) geçilemez. Bütçe aşılırsa -1.
 */
export function countSimplePaths(M, from, to, forbidden = -1, limit = 2, budget = 2_000_000) {
  const used = new Uint8Array(M.n);
  let count = 0, work = 0, found = null;
  const stack = [];
  const dfs = (x) => {
    if (++work > budget) return true;
    if (x === to) {
      count++;
      if (!found) found = stack.concat(x);
      return count >= limit;
    }
    used[x] = 1;
    stack.push(x);
    for (const y of M.adj[x]) {
      if (used[y] || y === forbidden) continue;
      if (dfs(y)) { used[x] = 0; stack.pop(); return true; }
    }
    used[x] = 0;
    stack.pop();
    return false;
  };
  // Derin yollar için özyineleme sınırı (21×21 = 441 hücre) güvenli.
  dfs(from);
  return { count: work > budget ? -1 : count, path: found };
}

/** Bağımsız doğrulama: biçim, kusursuz labirent (ağaç), tek yol (tam sayım) ve kayıtlı çözüm. */
export function verifyLevel(level) {
  const { w, h, puzzle, solution } = level ?? {};
  const M = parsePuzzle(puzzle);
  if (!M) return 'Bulmaca biçimi hatalı';
  if (M.w !== w || M.h !== h) return 'Boyut bulmacayla uyuşmuyor';
  const { start, goal, key } = M;
  if (start === goal || start === key || goal === key) return 'Başlangıç, hedef ve anahtar farklı kareler olmalı';

  // 1) Ağaç kontrolü: kenar sayısı n-1 ve hepsi bağlı → döngü yok, her kareye tek yol.
  let edges = 0;
  for (let i = 0; i < M.n; i++) edges += M.adj[i].length;
  edges /= 2;
  if (edges !== M.n - 1) return `Kusursuz labirent değil (kenar ${edges}, olmalı ${M.n - 1})`;
  const dist = bfsDist(M, start);
  if (dist.some((d) => d < 0)) return 'Ulaşılamayan kareler var';

  // 2) Tam sayım: tüm basit yollar sayılır, tam 1 olmalı.
  const legs = key >= 0 ? [[start, key, goal], [key, goal, -1]] : [[start, goal, -1]];
  let expected = [start];
  for (const [a, b, forbidden] of legs) {
    const { count, path } = countSimplePaths(M, a, b, forbidden);
    if (count < 0) return 'Yol sayımı bütçeyi aştı';
    if (count !== 1) return `Yol sayısı ${count} (tam 1 olmalı)`;
    expected = expected.concat(path.slice(1));
  }

  // 3) Kayıtlı çözüm duvardan geçmemeli ve tek yolla birebir aynı olmalı.
  if (typeof solution !== 'string' || !/^[RDLU]+$/.test(solution)) return 'Çözüm biçimi hatalı';
  const walk = solutionWalk(M, solution);
  if (!walk) return 'Çözüm duvardan geçiyor';
  if (walk.length !== expected.length || walk.some((x, i) => x !== expected[i])) return 'Kayıtlı çözüm tek yolla uyuşmuyor';
  if (walk[walk.length - 1] !== goal) return 'Çözüm hedefte bitmiyor';
  if (key >= 0) {
    const ki = walk.indexOf(key);
    if (ki < 0) return 'Çözüm anahtardan geçmiyor';
    if (walk.slice(0, ki).includes(goal)) return 'Kapıya anahtarsız varılıyor';
  }
  return null;
}
