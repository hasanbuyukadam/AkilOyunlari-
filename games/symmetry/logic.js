// Simetri mantığı — hem tarayıcıda hem Node'da çalışır, DOM kullanmaz.
//
// Level biçimi:
//   { title, sym, w, h, ax, ay, side, colors, ghost, puzzle, solution }
//   sym     : 'v' dikey eksen | 'h' yatay eksen | 'vh' iki eksen | 'd' köşegen (sol üst → sağ alt)
//             | 'ad' ters köşegen (sağ üst → sol alt) | 'r180' yarım tur dönme simetrisi
//   ax, ay  : eksen konumu "iki katlı" koordinatla: dikey eksende c sütununun aynası ax - c,
//             yatay eksende r satırının aynası ay - r. (Tek sayı → eksen iki sütun/satır arasında,
//             çift sayı → eksen bir sütunun/satırın tam ortasından geçer.)
//   side    : hazır verilen (kaynak) taraf: v → 'L'/'R', h → 'T'/'B', diğerlerinde sabit.
//   colors  : renk harfleri (COLORS anahtarları); hücre değeri k>0 → colors[k-1], 0 → boş.
//   puzzle  : "sym:ax:ay:side|satır/satır/..." — '.' boyanacak hücre, rakam verilen hücre.
//   solution: satırlar '/' ile ayrılmış rakamlar (tam resim).

import { EASY, MEDIUM } from './pictures.js';

export const COLORS = {
  R: { name: 'kırmızı', hex: '#e74c3c' },
  O: { name: 'turuncu', hex: '#f39c12' },
  Y: { name: 'sarı', hex: '#f4d03f' },
  G: { name: 'yeşil', hex: '#27ae60' },
  B: { name: 'mavi', hex: '#2e86de' },
  C: { name: 'açık mavi', hex: '#74c7ec' },
  P: { name: 'mor', hex: '#8e44ad' },
  M: { name: 'pembe', hex: '#ff7eb6' },
  N: { name: 'kahverengi', hex: '#9c6b3e' },
  A: { name: 'gri', hex: '#95a5a6' },
  K: { name: 'siyah', hex: '#2f3542' },
};

export const SYMS = ['v', 'h', 'vh', 'd', 'ad', 'r180'];

// ---------- Geometri ----------

/** Simetri grubunun birim dışındaki dönüşümleri: (r, c) → [r, c] ya da tahta dışıysa null. */
export function transforms(L) {
  const { w, h, sym, ax, ay } = L;
  const inB = (r, c) => (r >= 0 && r < h && c >= 0 && c < w ? [r, c] : null);
  switch (sym) {
    case 'v': return [(r, c) => inB(r, ax - c)];
    case 'h': return [(r, c) => inB(ay - r, c)];
    case 'vh': return [(r, c) => inB(r, ax - c), (r, c) => inB(ay - r, c), (r, c) => inB(ay - r, ax - c)];
    case 'd': return [(r, c) => inB(c, r)];
    case 'ad': return [(r, c) => inB(w - 1 - c, h - 1 - r)];
    case 'r180': return [(r, c) => inB(h - 1 - r, w - 1 - c)];
    default: throw new Error(`Bilinmeyen simetri: ${sym}`);
  }
}

/** Kaynak (hazır verilen) bölgede mi? */
export function inSource(L, r, c) {
  const { w, h, sym, ax, ay, side } = L;
  switch (sym) {
    case 'v': return side === 'L' ? 2 * c < ax : 2 * c > ax;
    case 'h': return side === 'T' ? 2 * r < ay : 2 * r > ay;
    case 'vh': return 2 * r < ay && 2 * c < ax;
    case 'd': return r > c;
    case 'ad': return r + c < w - 1;
    case 'r180': return 2 * r < h - 1;
    default: return false;
  }
}

/** Her hücrenin rolü: 'src' hazır yarı, 'tgt' tamamlanacak yarı, 'axis' eksen üstü (kendi aynası),
 *  'out' aynası tahta dışında kalan kenar hücresi (eksen ortada değilse). */
export function rolesOf(L) {
  const T = transforms(L);
  const roles = [];
  for (let r = 0; r < L.h; r++) for (let c = 0; c < L.w; c++) {
    const imgs = T.map((f) => f(r, c));
    if (imgs.some((p) => p && p[0] === r && p[1] === c)) roles.push('axis');
    else if (imgs.every((p) => !p)) roles.push('out');
    else roles.push(inSource(L, r, c) ? 'src' : 'tgt');
  }
  return roles;
}

/** Hücrenin yörüngesi (kendisi + tahta içindeki tüm görüntüleri), indeks listesi. */
export function orbitOf(L, i, T = transforms(L)) {
  const r = Math.floor(i / L.w), c = i % L.w;
  const set = new Set([i]);
  for (const f of T) { const p = f(r, c); if (p) set.add(p[0] * L.w + p[1]); }
  return [...set];
}

// ---------- Kodlama ----------

const gridText = (arr, w) => {
  const rows = [];
  for (let i = 0; i < arr.length; i += w) rows.push(arr.slice(i, i + w).join(''));
  return rows.join('/');
};

export function parseLevel(L) {
  const [head, body] = L.puzzle.split('|');
  const given = [...body.replace(/\//g, '')].map((ch) => (ch === '.' ? -1 : Number(ch)));
  const solution = [...L.solution.replace(/\//g, '')].map(Number);
  return { head, given, solution, K: L.colors.length };
}

const cellName = (L, i) => `${Math.floor(i / L.w) + 1}. satır ${(i % L.w) + 1}. sütun`;
export { cellName };

// ---------- Doğrulama ----------

/** Tam arama: '.' hücrelerine 0..K değerlerini dener, simetriyle çelişmeyen tamamlamaları sayar (limit'te durur). */
export function countCompletions(L, limit = 2) {
  const { given, K } = parseLevel(L);
  const T = transforms(L);
  const N = L.w * L.h;
  const val = given.slice();
  const free = [];
  for (let i = 0; i < N; i++) if (val[i] < 0) free.push(i);
  const orbits = free.map((i) => orbitOf(L, i, T).filter((j) => j !== i));
  // Verilen hücreler kendi aralarında tutarlı mı?
  for (let i = 0; i < N; i++) {
    if (val[i] < 0) continue;
    for (const j of orbitOf(L, i, T)) if (val[j] >= 0 && val[j] !== val[i]) return 0;
  }
  let count = 0;
  const rec = (k) => {
    if (count >= limit) return;
    if (k === free.length) { count++; return; }
    const i = free[k];
    for (let v = 0; v <= K && count < limit; v++) {
      if (orbits[k].some((j) => val[j] >= 0 && val[j] !== v)) continue;
      val[i] = v;
      rec(k + 1);
      val[i] = -1;
    }
  };
  rec(0);
  return count;
}

export function verifyLevel(L) {
  if (!L || typeof L.puzzle !== 'string' || typeof L.solution !== 'string') return 'Eksik alan';
  if (!SYMS.includes(L.sym)) return 'Geçersiz simetri türü';
  const { w, h } = L;
  if (!(w >= 4 && h >= 4 && w <= 16 && h <= 16)) return 'Geçersiz boyut';
  if (['vh', 'd', 'ad', 'r180'].includes(L.sym) && w !== h) return 'Tahta kare olmalı';
  if (!Array.isArray(L.colors) || !L.colors.length || L.colors.some((k) => !COLORS[k])) return 'Geçersiz renkler';
  if (new Set(L.colors).size !== L.colors.length) return 'Tekrarlanan renk';
  const head = `${L.sym}:${L.ax ?? ''}:${L.ay ?? ''}:${L.side ?? ''}`;
  const [ph, body] = L.puzzle.split('|');
  if (ph !== head) return 'Bulmaca başlığı alanlarla uyuşmuyor';
  const rows = body.split('/'), srows = L.solution.split('/');
  if (rows.length !== h || srows.length !== h || rows.some((r) => r.length !== w) || srows.some((r) => r.length !== w)) return 'Izgara boyutu hatalı';
  if (!/^[.0-9/]+$/.test(body) || !/^[0-9/]+$/.test(L.solution)) return 'Geçersiz karakter';
  const { given, solution, K } = parseLevel(L);
  if (solution.some((v) => v > K) || given.some((v) => v > K)) return 'Renk indeksi aralık dışında';
  if (L.sym === 'v' && !(Number.isInteger(L.ax) && L.ax >= 1 && L.ax <= 2 * w - 3)) return 'Eksen konumu hatalı';
  if (L.sym === 'h' && !(Number.isInteger(L.ay) && L.ay >= 1 && L.ay <= 2 * h - 3)) return 'Eksen konumu hatalı';
  if (L.sym === 'vh' && !(L.ax === w - 1 && L.ay === h - 1)) return 'Eksen konumu hatalı';
  if (L.sym === 'v' && !['L', 'R'].includes(L.side)) return 'Kaynak taraf hatalı';
  if (L.sym === 'h' && !['T', 'B'].includes(L.side)) return 'Kaynak taraf hatalı';
  if (L.sym === 'r180' && h % 2) return 'Dönme simetrisi için çift boyut gerekir';

  const T = transforms(L);
  const roles = rolesOf(L);
  const N = w * h;
  let toPaint = 0, srcCount = 0;
  for (let i = 0; i < N; i++) {
    const role = roles[i];
    if (role === 'src') srcCount++;
    // Verilenler çözümle uyuşmalı; '.' yalnızca tamamlanacak yarıda olabilir.
    if (given[i] >= 0 && given[i] !== solution[i]) return `Verilen hücre çözümle uyuşmuyor (${cellName(L, i)})`;
    if (given[i] < 0) {
      if (role !== 'tgt') return `Boş bırakılan hücre tamamlanacak yarıda değil (${cellName(L, i)})`;
      if (solution[i]) toPaint++;
    }
    if (role !== 'tgt' && given[i] < 0) return 'Kaynak hücre verilmemiş';
    if (role === 'tgt') {
      // Her hedef hücre, tam bir kaynak hücrenin görüntüsü olmalı.
      const srcs = orbitOf(L, i, T).filter((j) => roles[j] === 'src');
      if (srcs.length !== 1) return `${cellName(L, i)} hücresinin ${srcs.length} kaynak eşi var (1 olmalı)`;
      if (solution[i] !== given[srcs[0]]) return `Çözüm kaynağın aynası değil (${cellName(L, i)})`;
    }
    // Çözüm gerçekten simetrik olmalı.
    for (const j of orbitOf(L, i, T)) if (solution[j] !== solution[i]) return `Çözüm simetrik değil (${cellName(L, i)})`;
  }
  if (!srcCount) return 'Kaynak bölge boş';
  if (toPaint < 3) return 'Boyanacak kare çok az';
  for (let k = 1; k <= K; k++) if (!given.includes(k)) return `${COLORS[L.colors[k - 1]].name} renk verilenlerde görünmüyor`;
  // Tam arama ile tek tamamlanma kontrolü.
  const n = countCompletions(L, 2);
  if (n !== 1) return `Tamamlanma sayısı ${n} (1 olmalı)`;
  return null;
}

// ---------- Üretim ----------

/** Harf ızgarasından (satır dizileri) indeks ızgarası + renk listesi. */
function fromLetters(rows) {
  const colors = [];
  const grid = [];
  for (const row of rows) for (const ch of row) {
    if (ch === '.') { grid.push(0); continue; }
    let k = colors.indexOf(ch);
    if (k < 0) { colors.push(ch); k = colors.length - 1; }
    grid.push(k + 1);
  }
  return { grid, colors };
}

/** Resmi size×size tahtaya (rOff, cOff) konumundan yerleştir. */
function place(rows, size, rOff, cOff) {
  const out = [];
  for (let r = 0; r < size; r++) {
    const src = rows[r - rOff];
    let line = '';
    for (let c = 0; c < size; c++) line += (src && src[c - cOff]) || '.';
    out.push(line);
  }
  return out;
}

function buildLevel(base, solution, colors, prefill, rng) {
  const L = { ...base, colors };
  const roles = rolesOf(L);
  const given = solution.map((v, i) => (roles[i] === 'tgt' ? -1 : v));
  // Kolay levellerde hedef yarının bir kısmı (renkli karelerden) hazır verilir.
  if (prefill > 0) {
    const cand = solution.map((v, i) => i).filter((i) => roles[i] === 'tgt' && solution[i]);
    rng.shuffle(cand);
    const n = Math.min(Math.round(cand.length * prefill), cand.length - 3);
    for (let k = 0; k < n; k++) given[cand[k]] = solution[cand[k]];
  }
  const head = `${L.sym}:${L.ax ?? ''}:${L.ay ?? ''}:${L.side ?? ''}`;
  L.puzzle = `${head}|${gridText(given.map((v) => (v < 0 ? '.' : v)), L.w)}`;
  L.solution = gridText(solution, L.w);
  return L;
}

function genEasy(rng, index) {
  const pic = EASY[index % EASY.length];
  const n = pic.rows.length;
  const { grid, colors } = fromLetters(pic.rows);
  const side = index < 6 ? 'L' : rng.next() < 0.5 ? 'L' : 'R';
  const base = { title: pic.title, sym: 'v', w: n, h: n, ax: n - 1, ay: null, side, ghost: index < 3 };
  return buildLevel(base, grid, colors, Math.max(0.1, 0.5 - index * 0.022), rng);
}

function genMedium(rng, index) {
  const pic = MEDIUM[index % MEDIUM.length];
  const S = 10;
  const ph = pic.rows.length, pw = pic.rows[0].length;
  const off = (len) => {
    if (len >= S) return 0;
    if (index < 7) return Math.floor((S - len) / 2);
    return rng.next() < 0.5 ? 0 : S - len; // eksen tahtanın ortasından kayar
  };
  let rOff, cOff, ax = null, ay = null, side;
  if (pic.axis === 'v') {
    cOff = off(pw); rOff = Math.floor((S - ph) / 2);
    ax = 2 * cOff + pw - 1;
    side = rng.next() < 0.5 ? 'L' : 'R';
  } else {
    rOff = off(ph); cOff = Math.floor((S - pw) / 2);
    ay = 2 * rOff + ph - 1;
    side = rng.next() < 0.5 ? 'T' : 'B';
  }
  const { grid, colors } = fromLetters(place(pic.rows, S, rOff, cOff));
  const base = { title: pic.title, sym: pic.axis, w: S, h: S, ax, ay, side, ghost: false };
  return buildLevel(base, grid, colors, index < 5 ? 0.2 - index * 0.04 : 0, rng);
}

// ---------- Zor: desen üretici ----------

const HARD_PLAN = [
  ['vh', 3], ['vh', 3], ['vh', 3], ['vh', 3], ['vh', 3],
  ['d', 3], ['d', 3], ['ad', 3], ['d', 3], ['ad', 3],
  ['r180', 3], ['r180', 3], ['r180', 3], ['r180', 3], ['r180', 3],
  ['vh', 4], ['d', 4], ['r180', 4], ['ad', 4], ['r180', 4],
];
const HARD_TITLES = {
  vh: ['Kilim Deseni', 'Çini Deseni', 'Halı Deseni', 'Mandala', 'Vitray Pencere', 'Mozaik'],
  d: ['Köşegen Mozaiği', 'Seramik Karo', 'Origami Deseni', 'Kumaş Deseni'],
  ad: ['Ters Köşegen Karo', 'Yelken Deseni', 'Kristal Deseni'],
  r180: ['Fırıldak', 'Girdap', 'Pervane', 'Galaksi', 'Rüzgâr Gülü', 'Kasırga', 'Dönme Dolap'],
};
const PALETTE = ['R', 'O', 'Y', 'G', 'B', 'C', 'P', 'M', 'N'];

function shapeFns(sym, S) {
  const m = (S - 1) / 2;
  if (sym === 'vh') {
    const d = (r, c) => [Math.floor(Math.abs(c - m)), Math.floor(Math.abs(r - m))];
    return [
      (r, c) => { const [x, y] = d(r, c); return x + y; },
      (r, c) => { const [x, y] = d(r, c); return Math.max(x, y); },
      (r, c) => { const [x, y] = d(r, c); return Math.min(x, y) * 2; },
      (r, c) => { const [x, y] = d(r, c); return Math.round(Math.sqrt(x * x + y * y) * 1.2); },
      (r, c) => { const [x, y] = d(r, c); return Math.abs(x - y) * 2; },
      (r, c) => d(r, c)[0] * 2,
      (r, c) => d(r, c)[1] * 2,
      (r, c) => { const [x, y] = d(r, c); return x + 2 * y; },
    ];
  }
  if (sym === 'd') {
    return [
      (r, c) => r + c,
      (r, c) => Math.abs(r - c) * 2,
      (r, c) => Math.max(r, c) * 2,
      (r, c) => Math.min(r, c) * 2,
      (r, c) => Math.round(Math.sqrt(r * r + c * c) * 1.5),
      (r, c) => Math.round(Math.sqrt((S - 1 - r) ** 2 + (S - 1 - c) ** 2) * 1.5),
      (r, c) => Math.max(S - 1 - r, S - 1 - c) * 2,
      (r, c) => Math.abs(r + c - (S - 1)) * 2,
    ];
  }
  // r180 — merkeze göre koordinatlar
  const xy = (r, c) => [c - m, r - m];
  return [
    (r, c) => { const [x, y] = xy(r, c); return Math.round(Math.sqrt(x * x + y * y) * 2); },
    (r, c) => { const [x, y] = xy(r, c); return Math.round((Math.abs(x) + Math.abs(y)) * 1.5); },
    (r, c) => { const [x, y] = xy(r, c); return Math.round(Math.abs(x + 2 * y)); },
    (r, c) => { const [x, y] = xy(r, c); return Math.round(Math.abs(2 * x - y)); },
    (r, c) => { const [x, y] = xy(r, c); return Math.round(Math.abs(x * y) / 2); },
  ];
}

function hardPattern(rng, sym, K) {
  const S = 12;
  const base = sym === 'ad' ? 'd' : sym;
  const fns = shapeFns(base, S);
  const layers = [];
  const nL = rng.int(3, 5);
  for (let k = 0; k < nL; k++) {
    const kind = base === 'r180' && rng.next() < 0.5 ? 'arms' : 'band';
    layers.push({
      kind,
      f: rng.int(0, fns.length - 1),
      lo: rng.int(0, 14),
      len: rng.int(1, 4),
      color: k < K ? k + 1 : rng.int(0, K),
      arms: rng.next() < 0.5 ? [4, 2] : [6, 3],
      twist: 0.2 + rng.next() * 0.5,
      phase: rng.next() * Math.PI * 2,
      rlo: rng.int(0, 4),
      rhi: rng.int(6, 9),
      parity: rng.next() < 0.2,
    });
  }
  const m = (S - 1) / 2;
  const val = (r, c) => {
    let v = 0;
    for (const Ly of layers) {
      if (Ly.kind === 'band') {
        const s = fns[Ly.f](r, c);
        if (s >= Ly.lo && s < Ly.lo + Ly.len && (!Ly.parity || (r + c) % 2 === 0)) v = Ly.color;
      } else {
        const x = c - m, y = r - m;
        const rad = Math.sqrt(x * x + y * y);
        if (rad < Ly.rlo || rad > Ly.rhi) continue;
        const [arms, p] = Ly.arms;
        let th = Math.atan2(y, x) + Ly.twist * rad + Ly.phase;
        th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        if (Math.floor(th / ((2 * Math.PI) / arms)) % p === 0) v = Ly.color;
      }
    }
    return v;
  };
  const grid = [];
  for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) grid.push(sym === 'ad' ? val(r, S - 1 - c) : val(r, c));
  return grid;
}

function isSym(grid, S, f) {
  for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
    const [a, b] = f(r, c);
    if (grid[r * S + c] !== grid[a * S + b]) return false;
  }
  return true;
}

function genHard(rng, index) {
  const [sym, K] = HARD_PLAN[index % HARD_PLAN.length];
  const S = 12;
  const titles = HARD_TITLES[sym];
  const base = { title: titles[index % titles.length], sym, w: S, h: S, ax: sym === 'vh' ? S - 1 : null, ay: sym === 'vh' ? S - 1 : null, side: null, ghost: false };
  const T = transforms(base);
  const roles = rolesOf(base);
  for (let attempt = 0; attempt < 5000; attempt++) {
    let grid = hardPattern(rng, sym, K);
    // Kaynaktan simetrikleştir (kayan nokta hatalarına karşı güvence).
    grid = grid.map((v, i) => {
      if (roles[i] !== 'tgt') return v;
      const s = orbitOf(base, i, T).find((j) => roles[j] === 'src');
      return grid[s];
    });
    const counts = new Array(K + 1).fill(0);
    grid.forEach((v) => counts[v]++);
    const filled = 1 - counts[0] / grid.length;
    if (filled < 0.4 || filled > 0.72) continue;
    if (counts.slice(1).some((n) => n < 12)) continue;
    // Dönme ve köşegen desenleri ayrıca düz ayna simetrisine sahip olmasın: çocuk gerçekten döndürsün/köşegenden aynalasın.
    const mv = (r, c) => [r, S - 1 - c], mh = (r, c) => [S - 1 - r, c];
    if (sym !== 'vh' && (isSym(grid, S, mv) || isSym(grid, S, mh))) continue;
    if (sym === 'r180' && (isSym(grid, S, (r, c) => [c, r]) || isSym(grid, S, (r, c) => [S - 1 - c, S - 1 - r]))) continue;
    // Kaynak ve hedefte yeterli renk olsun.
    const tgtPaint = grid.filter((v, i) => roles[i] === 'tgt' && v).length;
    if (tgtPaint < 25) continue;
    // Bir hücre bölgesinde renklerin bölgeler hâlinde dağılımı: çok parçalı "kumlu" desenleri ele.
    let same = 0, pairs = 0;
    for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
      if (c + 1 < S) { pairs++; if (grid[r * S + c] === grid[r * S + c + 1]) same++; }
      if (r + 1 < S) { pairs++; if (grid[r * S + c] === grid[(r + 1) * S + c]) same++; }
    }
    if (same / pairs < 0.62) continue;
    // Tekdüze şerit desenlerini ele: en az 4 farklı satır ve 4 farklı sütun olsun.
    const rowsSet = new Set(), colsSet = new Set();
    for (let k = 0; k < S; k++) {
      rowsSet.add(grid.slice(k * S, k * S + S).join(''));
      colsSet.add(Array.from({ length: S }, (_, r) => grid[r * S + k]).join(''));
    }
    if (rowsSet.size < 4 || colsSet.size < 4) continue;
    const colors = rng.shuffle(PALETTE.slice()).slice(0, K);
    return buildLevel(base, grid, colors, 0, rng);
  }
  throw new Error('Zor desen üretilemedi');
}

export function generateLevel(rng, difficulty, index /* , total */) {
  if (difficulty === 'easy') return genEasy(rng, index);
  if (difficulty === 'medium') return genMedium(rng, index);
  return genHard(rng, index);
}

// ---------- Akıllı İpucu: bir karenin aynasını adım adım açıkla ----------

const colorPhrase = (L, v) => (v ? `${COLORS[L.colors[v - 1]].name} olmalı` : 'boş kalmalı');

/** Eksene uzaklık (kare sayısı, karenin kendisi dahil): iki katlı eksen koordinatıyla. */
const axisDist = (x, a2) => (a2 % 2 ? (Math.abs(2 * x - a2) + 1) / 2 : Math.abs(2 * x - a2) / 2);

/**
 * tgt hücresi i için açıklama: { src, labels: Map(hücre → sayı), path: hücreler, mid, text }.
 * labels: eksene uzaklığı gösteren küçük sayılar; path: arada vurgulanan kareler.
 */
export function explainCell(L, i) {
  const { solution } = parseLevel(L);
  const roles = rolesOf(L);
  const T = transforms(L);
  const src = orbitOf(L, i, T).find((j) => roles[j] === 'src');
  const w = L.w;
  const r = Math.floor(i / w), c = i % w;
  const sr = Math.floor(src / w), sc = src % w;
  const labels = new Map();
  const path = [];
  const name = (j) => cellName(L, j);
  const want = colorPhrase(L, solution[i]);
  const srcCol = solution[src] ? `${COLORS[L.colors[solution[src] - 1]].name} renkte` : 'boş';
  let mid = -1;
  let text;

  const rowSeg = (row, c1, c2, a2) => {
    for (let x = Math.min(c1, c2); x <= Math.max(c1, c2); x++) {
      if (2 * x === a2) continue;
      const j = row * w + x;
      labels.set(j, axisDist(x, a2));
      if (x !== c1 && x !== c2) path.push(j);
    }
  };
  const colSeg = (col, r1, r2, a2) => {
    for (let y = Math.min(r1, r2); y <= Math.max(r1, r2); y++) {
      if (2 * y === a2) continue;
      const j = y * w + col;
      if (!labels.has(j)) labels.set(j, axisDist(y, a2));
      if (y !== r1 && y !== r2) path.push(j);
    }
  };

  switch (L.sym) {
    case 'v': {
      const d = axisDist(c, L.ax);
      const dir = 2 * c > L.ax ? 'sağında' : 'solunda', odir = 2 * c > L.ax ? 'solunda' : 'sağında';
      rowSeg(r, c, sc, L.ax);
      text = `Bu kare eksenin ${dir}, eksene ${d} kare uzaklıkta. Aynası da eksenin ${odir}, yine ${d} kare uzakta olmalı: ${name(src)}. O kare ${srcCol}, bu yüzden bu kare de ${want}.`;
      break;
    }
    case 'h': {
      const d = axisDist(r, L.ay);
      const dir = 2 * r > L.ay ? 'altında' : 'üstünde', odir = 2 * r > L.ay ? 'üstünde' : 'altında';
      colSeg(c, r, sr, L.ay);
      text = `Bu kare eksenin ${dir}, eksene ${d} kare uzaklıkta. Aynası da eksenin ${odir}, yine ${d} kare uzakta olmalı: ${name(src)}. O kare ${srcCol}, bu yüzden bu kare de ${want}.`;
      break;
    }
    case 'vh': {
      const dx = axisDist(c, L.ax), dy = axisDist(r, L.ay);
      if (r === sr) {
        rowSeg(r, c, sc, L.ax);
        text = `Bu kare dikey eksene ${dx} kare uzaklıkta. Dikey eksende aynalayınca eşi, eksenin öbür yanında yine ${dx} kare uzakta: ${name(src)}. O kare ${srcCol}, bu yüzden bu kare de ${want}.`;
      } else if (c === sc) {
        colSeg(c, r, sr, L.ay);
        text = `Bu kare yatay eksene ${dy} kare uzaklıkta. Yatay eksende aynalayınca eşi, eksenin öbür yanında yine ${dy} kare uzakta: ${name(src)}. O kare ${srcCol}, bu yüzden bu kare de ${want}.`;
      } else {
        mid = sr * w + c; // önce yatay eksende, sonra dikey eksende aynala
        colSeg(c, r, sr, L.ay);
        rowSeg(sr, c, sc, L.ax);
        path.push(mid);
        text = `Bu kare iki eksene de uzak: yatay eksene ${dy}, dikey eksene ${dx} kare. Önce yatay eksende aynala (${dy} kare öbür yana): ${name(mid)}. Sonra dikey eksende aynala (${dx} kare öbür yana): ${name(src)}. O kare ${srcCol}, bu yüzden bu kare de ${want}.`;
      }
      break;
    }
    case 'd': {
      // Hedef köşegenin üstünde (r < c): k kare aşağı → köşegen (c,c), k kare sola → kaynak (c,r).
      const k = c - r;
      mid = c * w + c;
      for (let t = 1; t <= k; t++) {
        const a = (r + t) * w + c, b = c * w + (c - t);
        if (t < k) { path.push(a); path.push(b); }
        labels.set((c - t + 0) * w + c, t); // köşegene uzaklık (dikey kol)
        labels.set(c * w + (c - t), t); // yatay kol
      }
      labels.set(i, k);
      text = `Köşegen eksende her karenin eşi köşegenin öbür yanındadır ve satır ile sütun numaraları yer değiştirir. Bu kareden ${k} kare aşağı inersen köşegene ulaşırsın; oradan ${k} kare sola gidince eşini bulursun: ${name(src)}. O kare ${srcCol}, bu yüzden bu kare de ${want}.`;
      break;
    }
    case 'ad': {
      // Hedef ters köşegenin altında (r + c > n-1): k kare yukarı → köşegen, k kare sola → kaynak.
      const k = r + c - (w - 1);
      const dr = r - k; // köşegen hücresinin satırı
      mid = dr * w + c;
      for (let t = 1; t <= k; t++) {
        if (t < k) { path.push((dr + t) * w + c); path.push(dr * w + (c - t)); }
        labels.set((dr + t) * w + c, t);
        labels.set(dr * w + (c - t), t);
      }
      text = `Ters köşegen eksende her karenin eşi köşegenin öbür yanında, köşegene aynı uzaklıktadır. Bu kareden ${k} kare yukarı çıkarsan köşegene ulaşırsın; oradan ${k} kare sola gidince eşini bulursun: ${name(src)}. O kare ${srcCol}, bu yüzden bu kare de ${want}.`;
      break;
    }
    case 'r180': {
      const m2 = L.h - 1;
      const dy = axisDist(r, m2), dx = axisDist(c, L.w - 1);
      const v1 = 2 * r > m2 ? 'altında' : 'üstünde', v2 = 2 * r > m2 ? 'üstünde' : 'altında';
      const h1 = 2 * c > L.w - 1 ? 'sağında' : 'solunda', h2 = 2 * c > L.w - 1 ? 'solunda' : 'sağında';
      text = `Dönme simetrisinde resim yarım tur döner; her karenin eşi merkezin tam karşı tarafındadır. Bu kare merkezin ${dy} kare ${v1} ve ${dx} kare ${h1}. Eşi de merkezin ${dy} kare ${v2} ve ${dx} kare ${h2}: ${name(src)}. O kare ${srcCol}, bu yüzden bu kare de ${want}.`;
      break;
    }
    default:
      text = '';
  }
  return { src, labels, path, mid, text };
}
