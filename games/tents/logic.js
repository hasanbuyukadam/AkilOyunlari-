// Çadırlar ve Ağaçlar mantığı — hem tarayıcıda hem Node'da (üretici/doğrulayıcı) çalışır.
// Level: { w, h, puzzle, rows, cols, solution, trees, tier }
//   puzzle   : w*h karakter, 'T' = ağaç, '.' = boş (satır satır)
//   solution : w*h karakter, 'T' = ağaç, 'C' = çadır, '.' = boş
//   rows/cols: her satır/sütundaki çadır sayısı, rakam dizisi (ör. "201132")

export const UNK = 0, TENT = 1, GRASS = 2, TREE = 3;

const geoCache = new Map();
/** Izgara geometrisi: dik (orth) ve 8 yönlü (king) komşular, satır/sütun hücreleri. */
export function geometry(w, h) {
  const key = `${w}x${h}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const n = w * h;
  const orth = [], king = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / w), c = i % w;
    const o = [], k = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= h || cc < 0 || cc >= w) continue;
        k.push(rr * w + cc);
        if (!dr || !dc) o.push(rr * w + cc);
      }
    }
    orth.push(o);
    king.push(k);
  }
  // lines: önce satırlar (0..h-1), sonra sütunlar (h..h+w-1)
  const lines = [];
  for (let r = 0; r < h; r++) lines.push(Array.from({ length: w }, (_, c) => r * w + c));
  for (let c = 0; c < w; c++) lines.push(Array.from({ length: h }, (_, r) => r * w + c));
  const G = { w, h, n, orth, king, lines };
  geoCache.set(key, G);
  return G;
}

export const lineName = (G, li) => (li < G.h ? `${li + 1}. satır` : `${li - G.h + 1}. sütun`);
const lineNameLoc = (G, li) => (li < G.h ? `${li + 1}. satırda` : `${li - G.h + 1}. sütunda`);

export function parseLevel(level) {
  const G = geometry(level.w, level.h);
  const trees = [...level.puzzle].map((ch) => ch === 'T');
  const counts = [...level.rows, ...level.cols].map(Number);
  const tents = [...level.solution].map((ch) => ch === 'C');
  return { G, trees, counts, tents };
}

// ---------------------------------------------------------------------------
// Tam (kapsamlı) çözüm sayıcı — satır satır, sezgisel hiçbir kurala dayanmaz.
// ---------------------------------------------------------------------------

/** Ağaç–çadır arasında mükemmel 1-1 eşleşme var mı? (Kuhn artırma yolu) */
export function hasPerfectMatching(G, trees, tents) {
  const T = [], tentIdx = new Map();
  for (let i = 0; i < G.n; i++) {
    if (trees[i]) T.push(i);
    if (tents[i]) tentIdx.set(i, tentIdx.size);
  }
  if (T.length !== tentIdx.size) return false;
  const matchTent = new Array(tentIdx.size).fill(-1);
  const tryTree = (t, seen) => {
    for (const nb of G.orth[T[t]]) {
      const j = tentIdx.get(nb);
      if (j === undefined || seen[j]) continue;
      seen[j] = true;
      if (matchTent[j] < 0 || tryTree(matchTent[j], seen)) { matchTent[j] = t; return true; }
    }
    return false;
  };
  for (let t = 0; t < T.length; t++) {
    if (!tryTree(t, new Array(tentIdx.size).fill(false))) return false;
  }
  return true;
}

/** Kuralları sağlayan çadır yerleşimlerini sayar (limit'e ulaşınca durur). */
export function countSolutions(G, trees, counts, limit = 2) {
  const { w, h, n } = G;
  const rowCnt = counts.slice(0, h), colLeft = counts.slice(h);
  const nTrees = trees.filter(Boolean).length;
  if (rowCnt.reduce((a, b) => a + b, 0) !== nTrees || colLeft.reduce((a, b) => a + b, 0) !== nTrees) return 0;
  // Çadır adayı: ağaç olmayan ve dik komşusunda ağaç olan hücre
  const cand = Array.from({ length: n }, (_, i) => !trees[i] && G.orth[i].some((j) => trees[j]));
  const tents = new Array(n).fill(false);
  let count = 0;
  const treeOk = (r) => { // r. satırdaki ağaçların en az bir dik komşu çadırı olmalı
    for (let c = 0; c < w; c++) {
      const i = r * w + c;
      if (trees[i] && !G.orth[i].some((j) => tents[j])) return false;
    }
    return true;
  };
  const row = (r) => {
    if (count >= limit) return;
    if (r === h) {
      if (colLeft.every((v) => v === 0) && treeOk(h - 1) && hasPerfectMatching(G, trees, tents)) count++;
      return;
    }
    const restRows = h - 1 - r;
    const maxRest = Math.ceil(restRows / 2);
    const pick = (c, need, prevTent) => {
      if (count >= limit) return;
      if (need === 0) {
        // satır tamamlandı: sütun sınırı ve bir önceki satırın ağaçları
        for (let k = 0; k < w; k++) if (colLeft[k] > maxRest) return;
        if (r > 0 && !treeOk(r - 1)) return;
        row(r + 1);
        return;
      }
      if (w - c < 2 * need - 1) return;
      for (let k = c; k < w; k++) {
        const i = r * w + k;
        if (!cand[i] || colLeft[k] === 0) continue;
        if (k === prevTent + 1) continue;
        if (r > 0 && (tents[i - w] || (k > 0 && tents[i - w - 1]) || (k < w - 1 && tents[i - w + 1]))) continue;
        tents[i] = true; colLeft[k]--;
        pick(k + 2, need - 1, k);
        tents[i] = false; colLeft[k]++;
        if (count >= limit) return;
      }
    };
    pick(0, rowCnt[r], -5);
  };
  row(0);
  return count;
}

// ---------------------------------------------------------------------------
// İnsan tarzı mantıksal çözücü (zorluk derecelendirmesi + Akıllı İpucu)
// Seviye 1: temel kurallar, 2: satır/sütun boşluk grupları, 3: tek adımlı çelişki.
// ---------------------------------------------------------------------------

export function newState(G, trees) {
  const st = new Int8Array(G.n);
  for (let i = 0; i < G.n; i++) st[i] = trees[i] ? TREE : UNK;
  return { st, pair: new Int32Array(G.n).fill(-1) };
}
const cloneState = (S) => ({ st: S.st.slice(), pair: S.pair.slice() });

function availOfTree(G, S, t) {
  return G.orth[t].filter((j) => S.st[j] === UNK || (S.st[j] === TENT && S.pair[j] < 0));
}
const freeTreesOf = (G, S, i) => G.orth[i].filter((j) => S.st[j] === TREE && S.pair[j] < 0);

function lineInfo(G, S, counts, li) {
  let tents = 0, unk = 0;
  for (const i of G.lines[li]) { if (S.st[i] === TENT) tents++; else if (S.st[i] === UNK) unk++; }
  return { tents, unk, need: counts[li] - tents };
}

function runsOf(G, S, li) {
  const runs = [];
  let cur = null;
  for (const i of G.lines[li]) {
    if (S.st[i] === UNK) { if (!cur) runs.push(cur = []); cur.push(i); } else cur = null;
  }
  return runs;
}

/** Durumda açık bir çelişki varsa açıklamasını döndürür. */
function contradiction(G, S, counts) {
  for (let li = 0; li < G.lines.length; li++) {
    const { tents, unk } = lineInfo(G, S, counts, li);
    if (tents > counts[li]) return `${lineNameLoc(G, li)} çadır sayısı aşılırdı`;
    if (tents + unk < counts[li]) return `${lineNameLoc(G, li)} yeterli çadır yeri kalmazdı`;
    const max = runsOf(G, S, li).reduce((s, r) => s + Math.ceil(r.length / 2), 0);
    if (counts[li] - tents > max) return `${lineNameLoc(G, li)} gereken çadırlar yan yana gelmeden sığmazdı`;
  }
  for (let i = 0; i < G.n; i++) {
    if (S.st[i] === TENT) {
      if (G.king[i].some((j) => S.st[j] === TENT)) return 'iki çadır birbirine değerdi';
      if (S.pair[i] < 0 && !freeTreesOf(G, S, i).length) return 'bir çadır ağaçsız kalırdı';
    } else if (S.st[i] === TREE && S.pair[i] < 0 && !availOfTree(G, S, i).length) {
      return 'bir ağaç çadırsız kalırdı';
    }
  }
  return null;
}

const cellsSet = (cells, v) => cells.map((cell) => ({ cell, v }));

/**
 * Sıradaki mantıksal adımı bulur. Adım: { level, rule, set:[{cell,v}], pair?:[tree,tent], focus:[], msg }
 * Çelişkili durumda { contradiction } döner.
 */
export function findStep(G, S, counts, maxLevel = 3) {
  const { st } = S;
  // R3: çadırın 8 komşusu çim
  for (let i = 0; i < G.n; i++) {
    if (st[i] !== TENT) continue;
    const cells = G.king[i].filter((j) => st[j] === UNK);
    if (cells.length) {
      return { level: 1, rule: 'touch', set: cellsSet(cells, GRASS), focus: [i],
        msg: 'Çadırlar birbirine değemez, çapraz bile: bu çadırın çevresindeki hücreler çim.' };
    }
  }
  // R2: satır/sütun dolu (ya da sayı 0)
  for (let li = 0; li < G.lines.length; li++) {
    const { tents, unk } = lineInfo(G, S, counts, li);
    if (!unk || tents !== counts[li]) continue;
    const cells = G.lines[li].filter((i) => st[i] === UNK);
    const msg = counts[li] === 0
      ? `${lineName(G, li)} sayısı 0: buraya hiç çadır konmaz, hepsi çim.`
      : `${lineNameLoc(G, li)} gereken ${counts[li]} çadırın hepsi yerleşti: kalan hücreler çim.`;
    return { level: 1, rule: counts[li] === 0 ? 'zero' : 'full', set: cellsSet(cells, GRASS), focus: [], line: li, msg };
  }
  // R1: komşusunda (boşta) ağaç olmayan hücre çim
  {
    const none = [], taken = [];
    for (let i = 0; i < G.n; i++) {
      if (st[i] !== UNK || freeTreesOf(G, S, i).length) continue;
      (G.orth[i].some((j) => st[j] === TREE) ? taken : none).push(i);
    }
    if (none.length) {
      return { level: 1, rule: 'noTree', set: cellsSet(none, GRASS), focus: [],
        msg: 'Ağaca komşu olmayan hücreye çadır konmaz: bu hücrelerin yanında (dik) hiç ağaç yok, hepsi çim.' };
    }
    if (taken.length) {
      return { level: 1, rule: 'takenTrees', set: cellsSet(taken, GRASS), focus: [],
        msg: 'Bu hücrelerin yanındaki ağaçların hepsi zaten kendi çadırıyla eşleşti; buraya çadır konursa ağaçsız kalır, çim.' };
    }
  }
  // R4: sayı = kalan boş hücre sayısı
  for (let li = 0; li < G.lines.length; li++) {
    const { unk, need } = lineInfo(G, S, counts, li);
    if (!unk || need !== unk) continue;
    const cells = G.lines[li].filter((i) => st[i] === UNK);
    return { level: 1, rule: 'exact', set: cellsSet(cells, TENT), focus: [], line: li,
      msg: `${lineNameLoc(G, li)} ${need} çadır daha gerekiyor ve tam ${unk} boş hücre kaldı: hepsi çadır.` };
  }
  // R5/R6: tek seçeneği kalan ağaç / tek ağacı kalan çadır
  for (let t = 0; t < G.n; t++) {
    if (st[t] !== TREE || S.pair[t] >= 0) continue;
    const av = availOfTree(G, S, t);
    if (av.length !== 1) continue;
    const c = av[0];
    if (st[c] === UNK) {
      return { level: 1, rule: 'treeSingle', set: [{ cell: c, v: TENT }], pair: [t, c], focus: [t],
        msg: 'Tek seçeneği kalan ağaç: bu ağacın çadır konabilecek tek komşusu bu hücre, çadır buraya.' };
    }
    return { level: 1, rule: 'pair', set: [], pair: [t, c], focus: [t, c], msg: '' };
  }
  for (let c = 0; c < G.n; c++) {
    if (st[c] !== TENT || S.pair[c] >= 0) continue;
    const fr = freeTreesOf(G, S, c);
    if (fr.length === 1) return { level: 1, rule: 'pair', set: [], pair: [fr[0], c], focus: [fr[0], c], msg: '' };
  }
  if (maxLevel < 2) return null;
  // R7: kalan çadırlar boş gruplara ancak tam sığıyor
  for (let li = 0; li < G.lines.length; li++) {
    const { need } = lineInfo(G, S, counts, li);
    if (need <= 0) continue;
    const runs = runsOf(G, S, li);
    const max = runs.reduce((s, r) => s + Math.ceil(r.length / 2), 0);
    if (max !== need) continue;
    const tents = [], grass = new Set();
    const isRow = li < G.h;
    for (const run of runs) {
      if (run.length % 2) for (let k = 0; k < run.length; k += 2) tents.push(run[k]);
      if (run.length < 2) continue;
      // grup en az 2 hücreliyse, komşu satır/sütunda grubun hizasındaki hücreler mutlaka bir çadıra değer
      for (const i of run) {
        const r = Math.floor(i / G.w), c = i % G.w;
        for (const d of [-1, 1]) {
          const rr = isRow ? r + d : r, cc = isRow ? c : c + d;
          if (rr < 0 || rr >= G.h || cc < 0 || cc >= G.w) continue;
          const j = rr * G.w + cc;
          if (st[j] === UNK) grass.add(j);
        }
      }
    }
    for (const tnt of tents) grass.delete(tnt);
    if (!tents.length && !grass.size) continue;
    const set = [...cellsSet(tents, TENT), ...cellsSet([...grass], GRASS)];
    const what = isRow ? 'satırdaki' : 'sütundaki';
    return { level: 2, rule: 'runs', set, focus: [], line: li,
      msg: `${lineNameLoc(G, li)} ${need} çadır daha gerekiyor ve bu ${what} boş hücre grupları yan yana gelmeden ancak tam ${need} çadır alabiliyor. ` +
        (tents.length ? 'Tek uzunluktaki gruplarda çadırlar baştan başlayarak bir atlayarak dizilir' : 'Gruplar dolu olacağından') +
        (grass.size ? '; grupların hemen yanındaki komşu hücreler bir çadıra değeceği için çim.' : '.') };
  }
  if (maxLevel < 3) return null;
  // R9: varsayım → çelişki
  const order = [];
  for (let i = 0; i < G.n; i++) if (st[i] === UNK) order.push(i);
  for (const v of [TENT, GRASS]) {
    for (const i of order) {
      const T = cloneState(S);
      T.st[i] = v;
      const why = propagate(G, T, counts, 2);
      if (why) {
        const other = v === TENT ? GRASS : TENT;
        return { level: 3, rule: 'contra', set: [{ cell: i, v: other }], focus: [i],
          msg: v === TENT
            ? `Bu hücreye çadır konsaydı birkaç adım sonra ${why}. Bu yüzden burası çim.`
            : `Bu hücre çim olsaydı birkaç adım sonra ${why}. Bu yüzden buraya çadır gelir.` };
      }
    }
  }
  return null;
}

export function applyStep(S, step) {
  for (const { cell, v } of step.set) S.st[cell] = v;
  if (step.pair) { S.pair[step.pair[0]] = step.pair[1]; S.pair[step.pair[1]] = step.pair[0]; }
}

/** Sabit noktaya kadar uygular; çelişki varsa açıklamasını, yoksa null döndürür. */
function propagate(G, S, counts, maxLevel) {
  for (;;) {
    const why = contradiction(G, S, counts);
    if (why) return why;
    const step = findStep(G, S, counts, maxLevel);
    if (!step) return null;
    applyStep(S, step);
  }
}

/** Mantıksal çözüm. { solved, tier, steps:{1,2,3}, tents } */
export function logicalSolve(G, trees, counts, maxLevel = 3) {
  const S = newState(G, trees);
  const steps = { 1: 0, 2: 0, 3: 0 };
  let tier = 1;
  for (;;) {
    if (contradiction(G, S, counts)) return { solved: false, tier, steps };
    const step = findStep(G, S, counts, maxLevel);
    if (!step) break;
    applyStep(S, step);
    if (step.set.length) steps[step.level]++;
    tier = Math.max(tier, step.level);
  }
  const solved = !S.st.some((v) => v === UNK);
  return { solved, tier, steps, tents: Array.from(S.st, (v) => v === TENT) };
}

/**
 * Akıllı İpucu: verilen durumdan (doğru çadırlar/çimler) hücre değiştiren ilk adımı bulur.
 * Eşleştirme adımları sessizce uygulanır.
 */
export function nextHint(G, trees, counts, known) {
  const S = newState(G, trees);
  for (let i = 0; i < G.n; i++) if (!trees[i] && known[i]) S.st[i] = known[i];
  for (let guard = 0; guard < 10000; guard++) {
    const step = findStep(G, S, counts, 3);
    if (!step) return null;
    if (step.set.length) return step;
    applyStep(S, step);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Üretici
// ---------------------------------------------------------------------------

function planFor(difficulty, index) {
  if (difficulty === 'easy') return { size: 6, trees: index < 10 ? 7 : 8, tier: 1 };
  if (difficulty === 'medium') return { size: 8, trees: index < 10 ? 12 : 13, tier: 2 };
  const size = index < 7 ? 10 : index < 14 ? 11 : 12;
  return { size, trees: { 10: 19, 11: 23, 12: 28 }[size], tier: 3, minContra: 1 + Math.floor(index / 7) };
}

function randomLayout(G, rng, nTrees) {
  const { n } = G;
  for (let attempt = 0; attempt < 200; attempt++) {
    const tents = new Array(n).fill(false), trees = new Array(n).fill(false);
    const order = rng.shuffle(Array.from({ length: n }, (_, i) => i));
    let placed = 0;
    for (const i of order) {
      if (placed === nTrees) break;
      if (tents[i] || trees[i] || G.king[i].some((j) => tents[j])) continue;
      const spots = rng.shuffle(G.orth[i].filter((j) => !tents[j] && !trees[j]));
      if (!spots.length) continue;
      tents[i] = true;
      trees[spots[0]] = true;
      placed++;
    }
    if (placed === nTrees) return { tents, trees };
  }
  return null;
}

function countsOf(G, tents) {
  return G.lines.map((line) => line.reduce((s, i) => s + (tents[i] ? 1 : 0), 0));
}

/** Zorluk puanı: ileri seviye adımlar daha ağır sayılır. */
const scoreOf = (res) => res.steps[1] + 4 * res.steps[2] + 12 * res.steps[3];

export function generateLevel(rng, difficulty, index, total = 20) {
  const plan = planFor(difficulty, index);
  const G = geometry(plan.size, plan.size);
  const pool = [];
  const want = difficulty === "hard" ? 24 : 16;
  for (let attempt = 0; attempt < 20000 && pool.length < want; attempt++) {
    const lay = randomLayout(G, rng, plan.trees);
    if (!lay) continue;
    const counts = countsOf(G, lay.tents);
    const res = logicalSolve(G, lay.trees, counts, plan.tier);
    if (!res.solved || res.tier !== plan.tier) continue;
    if (plan.minContra && res.steps[3] < plan.minContra) continue;
    if (res.tents.some((v, i) => v !== lay.tents[i])) continue;
    if (countSolutions(G, lay.trees, counts, 2) !== 1) continue;
    pool.push({ lay, counts, score: scoreOf(res), tier: res.tier });
  }
  if (!pool.length) throw new Error(`Çadırlar üretilemedi: ${difficulty} #${index + 1}`);
  // Aynı zorluk içinde level ilerledikçe daha zor (puanı yüksek) adaylar seçilir.
  pool.sort((a, b) => a.score - b.score);
  const q = total > 1 ? index / (total - 1) : 0;
  const pick = pool[Math.min(pool.length - 1, Math.round(q * (pool.length - 1)))];
  const { lay, counts } = pick;
  return {
    w: G.w, h: G.h,
    puzzle: lay.trees.map((t) => (t ? 'T' : '.')).join(''),
    rows: counts.slice(0, G.h).join(''),
    cols: counts.slice(G.h).join(''),
    solution: lay.trees.map((t, i) => (t ? 'T' : lay.tents[i] ? 'C' : '.')).join(''),
    trees: plan.trees, tier: pick.tier, score: pick.score,
  };
}

// ---------------------------------------------------------------------------
// Doğrulayıcı
// ---------------------------------------------------------------------------

export function verifyLevel(level) {
  const { w, h } = level;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 4 || h < 4 || w > 16 || h > 16) return 'Geçersiz boyut';
  const n = w * h;
  if (typeof level.puzzle !== 'string' || !new RegExp(`^[.T]{${n}}$`).test(level.puzzle)) return 'Bulmaca metni hatalı';
  if (typeof level.solution !== 'string' || !new RegExp(`^[.TC]{${n}}$`).test(level.solution)) return 'Çözüm metni hatalı';
  if (!new RegExp(`^\\d{${h}}$`).test(level.rows) || !new RegExp(`^\\d{${w}}$`).test(level.cols)) return 'Satır/sütun sayıları hatalı';
  const { G, trees, counts, tents } = parseLevel(level);
  // (a) Çözüm her kurala uyuyor ve ipuçlarıyla tutarlı
  for (let i = 0; i < n; i++) {
    if ((level.solution[i] === 'T') !== trees[i]) return 'Çözümdeki ağaçlar bulmacayla uyuşmuyor';
    if (tents[i] && G.king[i].some((j) => tents[j])) return 'Çözümde çadırlar birbirine değiyor';
  }
  const real = countsOf(G, tents);
  if (real.some((v, i) => v !== counts[i])) return 'Çözüm satır/sütun sayılarıyla uyuşmuyor';
  if (!hasPerfectMatching(G, trees, tents)) return 'Çözümde ağaç–çadır eşleşmesi yok';
  // (b) Tam arama ile tek çözüm
  const cnt = countSolutions(G, trees, counts, 2);
  if (cnt !== 1) return `Çözüm sayısı ${cnt} (1 olmalı)`;
  // (c) Tahmin gerektirmeden çözülebilir
  const res = logicalSolve(G, trees, counts, 3);
  if (!res.solved || res.tents.some((v, i) => v !== tents[i])) return 'Tahmin yapmadan çözülemiyor';
  return null;
}
