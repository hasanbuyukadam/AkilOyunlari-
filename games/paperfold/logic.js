// Kâğıt Katlama mantığı — hem tarayıcıda hem Node'da (üretici/doğrulayıcı) çalışır.
//
// Model: N×N kareli kâğıt. Tüm koordinatlar "çift ölçekli" tamsayılardır: kâğıt [0, 2N]×[0, 2N],
// hücre merkezleri tek-tek (ör. (1,1)), hücre kenar ortaları tek-çift / çift-tek noktalardır.
// y ekseni aşağı doğrudur (SVG ile aynı).
//
// Katlama: { l: [a, b, c], s } — a·x + b·y = c doğrusu boyunca katlanır; s·(a·x + b·y − c) > 0 olan
// taraf (hareket eden kanat) doğrunun üstünden öbür tarafa yatırılır. Katlama doğrusu her zaman o
// anki kâğıt parçasının simetri eksenidir (dikey/yatay orta çizgi ya da köşegen), bu yüzden kanat
// sabit yarının tam üstüne oturur.
//
// Delik: [x, y, şekil] ya da üçgen için [x, y, 't', dx, dy] (dx, dy: üçgenin ucunun yönü).
//   şekil: 'o' daire, 's' kare, 't' üçgen. Kat yerine (katlanmış kenara) açılan yarım daire
//   ("çentik") bir kenar ortasında duran 'o' deliğidir; açılınca tam daire olur.
//
// Level: { difficulty, puzzle, questions: [...] }
//   ileri soru : { t: 'f', N, folds, punch, options: [{ holes, kind }], answer }
//   ters soru  : { t: 'r', N, target, options: [{ folds, punch, kind }], answer }

export const SHAPES = ['o', 's', 't'];

// ---------------------------------------------------------------------------
// Geometri
// ---------------------------------------------------------------------------

export const squareRegion = (N) => [[0, 0], [2 * N, 0], [2 * N, 2 * N], [0, 2 * N]];
export const sideOf = (l, p) => l[0] * p[0] + l[1] * p[1] - l[2];
const nn = (l) => l[0] * l[0] + l[1] * l[1];

export function reflectPoint(l, p) {
  const d = sideOf(l, p), k = nn(l);
  return [p[0] - (2 * d * l[0]) / k, p[1] - (2 * d * l[1]) / k];
}
export function reflectDir(l, v) {
  const d = l[0] * v[0] + l[1] * v[1], k = nn(l);
  return [v[0] - (2 * d * l[0]) / k, v[1] - (2 * d * l[1]) / k];
}

/** Doğrunun türü: 'v' dikey, 'h' yatay, 'd' ↘ köşegen (x−y=c), 'a' ↙ köşegen (x+y=c). */
export function lineKind(l) {
  if (l[1] === 0) return 'v';
  if (l[0] === 0) return 'h';
  return l[0] === l[1] ? 'a' : 'd';
}

const area2 = (P) => P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);

/** Ardışık tekrarları ve doğrusal ara köşeleri temizler, yönü pozitif alana çevirir. */
export function normalizePoly(P) {
  let Q = P.map((p) => [p[0], p[1]]);
  let changed = true;
  while (changed && Q.length >= 3) {
    changed = false;
    for (let i = 0; i < Q.length; i++) {
      const a = Q[(i + Q.length - 1) % Q.length], b = Q[i], c = Q[(i + 1) % Q.length];
      const same = a[0] === b[0] && a[1] === b[1];
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (same || cross === 0) { Q.splice(i, 1); changed = true; break; }
    }
  }
  if (area2(Q) < 0) Q.reverse();
  return Q;
}

/** Konveks çokgeni yarı düzlemle kırpar: keep(p) = sideOf(l,p)·sign ≤ 0 olan taraf kalır. */
export function clipPoly(P, l, sign) {
  const out = [];
  const f = (p) => sign * sideOf(l, p);
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    const fa = f(a), fb = f(b);
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) {
      const t = fa / (fa - fb);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return normalizePoly(out);
}

const keyPt = (p) => `${p[0]},${p[1]}`;
const polyKeySet = (P) => new Set(P.map(keyPt));

/** Kapalı konveks çokgenin (pozitif yönlü) içinde mi? */
export function insidePoly(P, p) {
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) < 0) return false;
  }
  return true;
}

/** p, çokgenin bir kenarı üzerinde ve kenarın uçlarına en az `gap` uzaklıkta mı? */
function onEdgeInterior(P, p, gap) {
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (cross !== 0) continue;
    const L2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
    const dot = (p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1]);
    if (dot <= 0 || dot >= L2) continue;
    const da = Math.hypot(p[0] - a[0], p[1] - a[1]), db = Math.hypot(p[0] - b[0], p[1] - b[1]);
    if (da >= gap && db >= gap) return true;
  }
  return false;
}

export const bbox = (P) => {
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

const isEven = (v) => Number.isInteger(v) && v % 2 === 0;

/** Bölgenin katlanabileceği simetri eksenleri (hücre kenarlarından ya da köşegenlerden geçen). */
export function symmetryLines(P) {
  const b = bbox(P);
  const cands = [
    [1, 0, (b.x0 + b.x1) / 2],
    [0, 1, (b.y0 + b.y1) / 2],
    [1, -1, b.x0 - b.y0],
    [1, 1, b.x0 + b.y1],
  ];
  const set = polyKeySet(P);
  return cands.filter((l) => {
    if (!isEven(l[2])) return false;
    if (!P.some((p) => sideOf(l, p) > 0) || !P.some((p) => sideOf(l, p) < 0)) return false;
    return P.every((p) => set.has(keyPt(reflectPoint(l, p))));
  });
}

/** Katlama dizisini kâğıda uygular. Bölgeler listesi (R0 = kâğıt … RK) ya da hata metni döner. */
export function foldStates(N, folds) {
  let R = squareRegion(N);
  const regions = [R];
  for (const f of folds) {
    if (!f || !Array.isArray(f.l) || f.l.length !== 3 || !f.l.every(Number.isInteger) || (f.s !== 1 && f.s !== -1)) return 'Katlama verisi hatalı';
    if (!symmetryLines(R).some((l) => l[0] === f.l[0] && l[1] === f.l[1] && l[2] === f.l[2])) return 'Katlama çizgisi parçanın simetri ekseni değil';
    R = clipPoly(R, f.l, f.s);
    if (!R.every((p) => Number.isInteger(p[0]) && Number.isInteger(p[1]))) return 'Katlanmış parçanın köşeleri ızgarada değil';
    regions.push(R);
  }
  return regions;
}

/** Son (katlanmış) bölgede delik açılabilecek yerler: tamamen içerde kalan hücreler ve kat yerindeki çentikler. */
export function punchSpots(N, folds, region) {
  const cells = [], notches = [];
  for (let y = 1; y < 2 * N; y += 2) {
    for (let x = 1; x < 2 * N; x += 2) {
      if ([[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([dx, dy]) => insidePoly(region, [x + dx, y + dy]))) cells.push([x, y]);
    }
  }
  const axisLines = folds.map((f) => f.l).filter((l) => l[0] === 0 || l[1] === 0);
  for (let y = 0; y <= 2 * N; y++) {
    for (let x = 0; x <= 2 * N; x++) {
      if ((x + y) % 2 === 0) continue; // yalnız kenar ortaları
      const p = [x, y];
      if (!axisLines.some((l) => sideOf(l, p) === 0)) continue;
      if (onEdgeInterior(region, p, 1)) notches.push(p);
    }
  }
  return { cells, notches };
}

export const isNotch = (h) => (h[0] + h[1]) % 2 === 1;

// ---------------------------------------------------------------------------
// Delik desenleri
// ---------------------------------------------------------------------------

export function holeKey(h) {
  return h[2] === 't' ? `${h[0]},${h[1]},t,${h[3]},${h[4]}` : `${h[0]},${h[1]},${h[2]}`;
}
export const patternKey = (holes) => holes.map(holeKey).sort().join(';');

function reflectHole(l, h) {
  const p = reflectPoint(l, h);
  if (h[2] !== 't') return [p[0], p[1], h[2]];
  const d = reflectDir(l, [h[3], h[4]]);
  return [p[0], p[1], 't', d[0], d[1]];
}

function dedupe(holes) {
  const m = new Map();
  for (const h of holes) m.set(holeKey(h), h);
  return [...m.values()];
}

/** Katları sondan başa doğru açar (ters ayna). `from`..`to` arası katlar açılır. */
export function unfoldHoles(holes, folds, from = folds.length, to = 0) {
  let H = holes.map((h) => h.slice());
  for (let k = from - 1; k >= to; k--) {
    const l = folds[k].l;
    H = dedupe([...H, ...H.map((h) => reflectHole(l, h))]);
  }
  return H;
}

/** Delik merkezleri arası en küçük uzaklığın karesi. */
export function minDist2(holes) {
  let m = Infinity;
  for (let i = 0; i < holes.length; i++) for (let j = i + 1; j < holes.length; j++) {
    m = Math.min(m, (holes[i][0] - holes[j][0]) ** 2 + (holes[i][1] - holes[j][1]) ** 2);
  }
  return m;
}

/**
 * Bağımsız ileri benzetim (doğrulayıcı için): kâğıttaki HER ızgara noktasını katlamalar boyunca
 * ileri taşır; vardığı yer delinmiş bir noktaysa o nokta açılmış kâğıtta deliktir.
 * Üçgenlerin yönü, katlamaların doğrusal parçasının (dik matris) tersiyle geri çevrilir.
 */
export function forwardSimulate(N, folds, punch) {
  const punched = new Map(punch.map((h) => [`${h[0]},${h[1]}`, h]));
  const out = [];
  for (let y = 0; y <= 2 * N; y++) {
    for (let x = 0; x <= 2 * N; x++) {
      let p = [x, y];
      let M = [1, 0, 0, 1]; // p_son = M·p + t (yalnızca doğrusal kısım tutulur)
      for (const f of folds) {
        if (f.s * sideOf(f.l, p) > 0) {
          p = reflectPoint(f.l, p);
          const [a, b] = f.l, k = nn(f.l);
          const R = [1 - (2 * a * a) / k, (-2 * a * b) / k, (-2 * a * b) / k, 1 - (2 * b * b) / k];
          M = [R[0] * M[0] + R[1] * M[2], R[0] * M[1] + R[1] * M[3], R[2] * M[0] + R[3] * M[2], R[2] * M[1] + R[3] * M[3]];
        }
      }
      const h = punched.get(`${p[0]},${p[1]}`);
      if (!h) continue;
      if (h[2] === 't') {
        // yön_orijinal = Mᵀ·yön_son (M dik matris)
        const dx = M[0] * h[3] + M[2] * h[4], dy = M[1] * h[3] + M[3] * h[4];
        out.push([x, y, 't', dx, dy]);
      } else out.push([x, y, h[2]]);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Doğrulayıcı
// ---------------------------------------------------------------------------

const DIRS = ['1,0', '-1,0', '0,1', '0,-1'];

function checkHole(N, h, allowNotch) {
  if (!Array.isArray(h) || !Number.isInteger(h[0]) || !Number.isInteger(h[1])) return 'Delik verisi hatalı';
  if (!SHAPES.includes(h[2])) return 'Bilinmeyen delik şekli';
  if (h[2] === 't' ? (h.length !== 5 || !DIRS.includes(`${h[3]},${h[4]}`)) : h.length !== 3) return 'Üçgen yönü hatalı';
  if (h[0] < 0 || h[1] < 0 || h[0] > 2 * N || h[1] > 2 * N) return 'Delik kâğıdın dışında';
  const notch = isNotch(h);
  if (notch && (!allowNotch || h[2] !== 'o')) return 'Geçersiz çentik';
  if (!notch && (h[0] % 2 !== 1 || h[1] % 2 !== 1)) return 'Delik hücre ortasında değil';
  if (notch && (h[0] < 1 || h[1] < 1 || h[0] > 2 * N - 1 || h[1] > 2 * N - 1)) return 'Çentik kâğıt kenarında';
  return null;
}

function checkPattern(N, holes) {
  if (!Array.isArray(holes) || !holes.length) return 'Boş desen';
  for (const h of holes) { const e = checkHole(N, h, true); if (e) return e; }
  if (new Set(holes.map(holeKey)).size !== holes.length) return 'Desende tekrarlanan delik';
  if (minDist2(holes) < 4) return 'Desende delikler üst üste biniyor';
  return null;
}

/** Katlama + delik açma geçerli mi? Geçerliyse ileri benzetimle açılmış deseni döner. */
function simulateOption(N, folds, punch) {
  if (!Array.isArray(folds) || !folds.length || folds.length > 3) return { err: 'Katlama sayısı hatalı' };
  const regions = foldStates(N, folds);
  if (typeof regions === 'string') return { err: regions };
  const R = regions[regions.length - 1];
  if (!Array.isArray(punch) || !punch.length) return { err: 'Delik yok' };
  const spots = punchSpots(N, folds, R);
  const cellSet = new Set(spots.cells.map(keyPt)), notchSet = new Set(spots.notches.map(keyPt));
  for (const h of punch) {
    const e = checkHole(N, h, true);
    if (e) return { err: e };
    const k = keyPt(h);
    if (isNotch(h) ? !notchSet.has(k) : !cellSet.has(k)) return { err: 'Delik katlanmış kâğıdın üzerinde değil' };
  }
  if (new Set(punch.map((h) => keyPt(h))).size !== punch.length || minDist2(punch) < 4) return { err: 'Delikler üst üste' };
  const holes = forwardSimulate(N, folds, punch);
  const e = checkPattern(N, holes);
  if (e) return { err: `Açılmış desen: ${e}` };
  return { holes, regions };
}

// Kayıtta (levels.json) delikler "x,y,o" / "x,y,t,dx,dy", katlamalar "a,b,c,s" metni olarak,
// listeler de ";" ile birleştirilmiş tek metin olarak tutulur (dosya küçük kalsın).
const encHole = (h) => h.join(',');
const encFold = (f) => [...f.l, f.s].join(',');
const encList = (arr, f) => arr.map(f).join(';');
const decList = (v, f) => (typeof v === 'string' && v ? v.split(';').map(f) : []);
const decHole = (s) => { const a = String(s).split(','); return a.map((v, i) => (i === 2 ? v : Number(v))); };
const decFold = (s) => { const a = String(s).split(',').map(Number); return { l: a.slice(0, 3), s: a[3] }; };

export function encodeQuestion(q) {
  if (q.t === 'f') {
    return { t: 'f', N: q.N, folds: encList(q.folds, encFold), punch: encList(q.punch, encHole), options: q.options.map((o) => ({ holes: encList(o.holes, encHole), kind: o.kind })), answer: q.answer };
  }
  return { t: 'r', N: q.N, target: encList(q.target, encHole), options: q.options.map((o) => ({ folds: encList(o.folds, encFold), punch: encList(o.punch, encHole), kind: o.kind })), answer: q.answer };
}

/** Kayıttaki soruyu dizi/nesne biçimine çevirir (arayüz ve doğrulayıcı bunu kullanır). */
export function decodeQuestion(q) {
  const arr = (v) => (Array.isArray(v) ? v : []);
  if (q.t === 'f') {
    return { t: 'f', N: q.N, folds: decList(q.folds, decFold), punch: decList(q.punch, decHole), options: arr(q.options).map((o) => ({ holes: decList(o.holes, decHole), kind: o.kind })), answer: q.answer };
  }
  return { t: q.t, N: q.N, target: decList(q.target, decHole), options: arr(q.options).map((o) => ({ folds: decList(o.folds, decFold), punch: decList(o.punch, decHole), kind: o.kind })), answer: q.answer };
}

export function verifyLevel(level) {
  const counts = { easy: 3, medium: 4, hard: 5 };
  if (!level || typeof level.puzzle !== 'string') return 'puzzle alanı yok';
  const want = counts[level.difficulty];
  if (!want) return 'Zorluk hatalı';
  if (!Array.isArray(level.questions) || level.questions.length !== want) return `Soru sayısı ${level.questions?.length} (${want} olmalı)`;
  const Q = level.questions.map(decodeQuestion);
  if (level.puzzle !== puzzleString(Q)) return 'puzzle alanı sorularla uyuşmuyor';
  const seen = new Set();
  for (let qi = 0; qi < Q.length; qi++) {
    const q = Q[qi];
    const tag = `Soru ${qi + 1}: `;
    if (![4, 6, 8].includes(q.N)) return tag + 'Kâğıt boyutu hatalı';
    if (!Array.isArray(q.options) || q.options.length !== 4) return tag + '4 seçenek olmalı';
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) return tag + 'Cevap indeksi hatalı';
    let matches = [];
    if (q.t === 'f') {
      const sim = simulateOption(q.N, q.folds, q.punch);
      if (sim.err) return tag + sim.err;
      const truth = patternKey(sim.holes);
      const keys = [];
      for (const o of q.options) {
        const e = checkPattern(q.N, o.holes);
        if (e) return tag + `Seçenek: ${e}`;
        keys.push(patternKey(o.holes));
      }
      if (new Set(keys).size !== 4) return tag + 'Seçenekler birbirinden farklı değil';
      matches = keys.map((k, i) => (k === truth ? i : -1)).filter((i) => i >= 0);
      seen.add(`f|${q.N}|${JSON.stringify(q.folds)}|${JSON.stringify(q.punch)}`);
    } else if (q.t === 'r') {
      const e = checkPattern(q.N, q.target);
      if (e) return tag + `Hedef desen: ${e}`;
      const truth = patternKey(q.target);
      const enc = new Set(), outs = new Set();
      for (const o of q.options) {
        const sim = simulateOption(q.N, o.folds, o.punch);
        if (sim.err) return tag + `Seçenek: ${sim.err}`;
        enc.add(JSON.stringify([o.folds, [...o.punch].map(holeKey).sort()]));
        outs.add(patternKey(sim.holes));
        if (patternKey(sim.holes) === truth) matches.push(q.options.indexOf(o));
      }
      if (enc.size !== 4) return tag + 'Seçenekler birbirinden farklı değil';
      if (outs.size !== 4) return tag + 'İki seçenek aynı deseni veriyor';
      seen.add(`r|${q.N}|${truth}`);
    } else return tag + 'Soru türü hatalı';
    if (matches.length !== 1) return tag + `${matches.length} doğru seçenek var (tam 1 olmalı)`;
    if (matches[0] !== q.answer) return tag + 'Kayıtlı cevap yanlış';
  }
  if (seen.size !== Q.length) return 'Aynı soru levelde iki kez var';
  return null;
}

// ---------------------------------------------------------------------------
// Üretici
// ---------------------------------------------------------------------------

export function puzzleString(questions) {
  return questions.map((q) => (q.t === 'f'
    ? `F${q.N}:${q.folds.map((f) => f.l.join(',') + (f.s > 0 ? '+' : '-')).join('/')}:${q.punch.map(holeKey).join('/')}`
    : `R${q.N}:${patternKey(q.target)}:${q.options.map((o) => o.folds.map((f) => f.l.join(',') + (f.s > 0 ? '+' : '-')).join('/')).join('|')}`)).join(' ');
}

const pick = (rng, arr) => arr[rng.int(0, arr.length - 1)];

/** Kurala uygun rastgele katlama dizisi. diag: 'none' | 'any' | 'must'. */
function randomFolds(rng, N, K, diag) {
  for (let tries = 0; tries < 200; tries++) {
    let R = squareRegion(N);
    const folds = [];
    let ok = true;
    for (let k = 0; k < K; k++) {
      let lines = symmetryLines(R);
      if (diag === 'none') lines = lines.filter((l) => l[0] === 0 || l[1] === 0);
      if (!lines.length) { ok = false; break; }
      // köşegen zorunluysa ve henüz yoksa son adımda köşegen seçilir; diğer adımlarda eksen katlaması
      // (dikey/yatay) biraz daha sık gelir: çocuklar için daha doğal.
      const axis = lines.filter((l) => l[0] === 0 || l[1] === 0), diagL = lines.filter((l) => l[0] !== 0 && l[1] !== 0);
      const needDiag = diag === 'must' && k === K - 1 && !folds.some((f) => f.l[0] !== 0 && f.l[1] !== 0);
      let from = lines;
      if (needDiag) from = diagL;
      else if (axis.length && diagL.length) from = rng.next() < 0.55 ? axis : diagL;
      if (!from.length) { ok = false; break; }
      const l = pick(rng, from);
      const f = { l: l.slice(), s: rng.next() < 0.5 ? 1 : -1 };
      const R2 = clipPoly(R, f.l, f.s);
      if (!R2.every((p) => Number.isInteger(p[0]) && Number.isInteger(p[1]))) { ok = false; break; }
      folds.push(f);
      R = R2;
    }
    if (!ok) continue;
    if (diag === 'must' && !folds.some((f) => f.l[0] !== 0 && f.l[1] !== 0)) continue;
    return { folds, region: R };
  }
  return null;
}

const DIR_VECS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function randomPunch(rng, N, folds, region, spec) {
  const { cells, notches } = punchSpots(N, folds, region);
  const count = rng.int(spec.holes[0], spec.holes[1]);
  const punch = [];
  const useNotch = notches.length && rng.next() < spec.notch;
  const pool = rng.shuffle([...cells.map((c) => ({ p: c, n: false }))]);
  if (useNotch) pool.unshift({ p: pick(rng, notches), n: true });
  for (const { p, n } of pool) {
    if (punch.length >= count) break;
    if (punch.some((h) => (h[0] - p[0]) ** 2 + (h[1] - p[1]) ** 2 < 4)) continue;
    if (n) { punch.push([p[0], p[1], 'o']); continue; }
    const k = pick(rng, spec.shapes);
    if (k === 't') { const d = pick(rng, DIR_VECS); punch.push([p[0], p[1], 't', d[0], d[1]]); } else punch.push([p[0], p[1], k]);
  }
  if (punch.length < count) return null;
  return punch;
}

function inPaper(N, holes) {
  return holes.every((h) => h[0] >= 1 && h[1] >= 1 && h[0] <= 2 * N - 1 && h[1] <= 2 * N - 1 && Number.isInteger(h[0]) && Number.isInteger(h[1]));
}

/** Çocukların tipik hatalarından yanlış seçenekler üretir. */
function distractors(N, folds, punch, regions, answer) {
  const K = folds.length;
  const out = [];
  const add = (kind, holes) => { if (holes) out.push({ kind, holes }); };
  // 1) Bir katı açmayı unutmak
  for (let j = 0; j < K; j++) {
    add('forgot', unfoldHoles(unfoldHoles(punch, folds, K, j + 1), folds, j, 0));
  }
  // 2) Hiç açmadan: yalnızca en üst kat delinmiş sanmak
  if (K > 1) add('single', punch.map((h) => h.slice()));
  // 3) Yanlış eksene göre aynalamak
  for (let j = 0; j < K; j++) {
    const b = bbox(regions[j]);
    const kind = lineKind(folds[j].l);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    const wrong = kind === 'v' ? [0, 1, cy] : kind === 'h' ? [1, 0, cx] : kind === 'd' ? [1, 1, cx + cy] : [1, -1, cx - cy];
    if (!Number.isInteger(wrong[2]) || wrong[2] % 2) continue;
    const f2 = folds.map((f, i) => (i === j ? { l: wrong, s: f.s } : f));
    add('axis', unfoldHoles(punch, f2, K, 0));
  }
  // 4) Aynalamak yerine kaydırmak (eksen katlamalarında)
  for (let j = 0; j < K; j++) {
    const kind = lineKind(folds[j].l);
    if (kind !== 'v' && kind !== 'h') continue;
    const st = bbox(regions[j + 1]);
    const c = [(st.x0 + st.x1) / 2, (st.y0 + st.y1) / 2];
    const rc = reflectPoint(folds[j].l, c);
    const tv = [rc[0] - c[0], rc[1] - c[1]];
    let H = unfoldHoles(punch, folds, K, j + 1);
    H = dedupe([...H, ...H.map((h) => { const g = h.slice(); g[0] += tv[0]; g[1] += tv[1]; return g; })]);
    add('slide', unfoldHoles(H, folds, j, 0));
  }
  // 5) Üçgenleri çevirmeyi unutmak
  if (answer.some((h) => h[2] === 't')) {
    const pd = punch.find((h) => h[2] === 't');
    add('turn', answer.map((h) => (h[2] === 't' ? [h[0], h[1], 't', pd[3], pd[4]] : h.slice())));
  }
  // 6) Bir hücre kaymış desen
  for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) add('shift', answer.map((h) => { const g = h.slice(); g[0] += dx; g[1] += dy; return g; }));
  // 7) Tüm deseni ters taraftan görmek
  add('mirror', answer.map((h) => reflectHole([1, 0, N], h)));
  add('mirror', answer.map((h) => reflectHole([0, 1, N], h)));
  return out.filter((o) => inPaper(N, o.holes) && o.holes.every((h) => checkHole(N, h, true) === null) && minDist2(o.holes) >= 4);
}

const KIND_ORDER = { forgot: 0, single: 1, axis: 2, slide: 3, turn: 4, shift: 5, mirror: 6 };

function chooseDistractors(rng, cands, answerKey) {
  const byKind = new Map();
  for (const c of cands) {
    const k = patternKey(c.holes);
    if (k === answerKey) continue;
    if (!byKind.has(c.kind)) byKind.set(c.kind, []);
    byKind.get(c.kind).push(c);
  }
  // Önce farklı hata türleri; "unutma" ve "yanlış eksen" gibi gerçek katlama hataları öncelikli.
  const kinds = rng.shuffle([...byKind.keys()]).sort((a, b) => (KIND_ORDER[a] < 4 ? 0 : 1) - (KIND_ORDER[b] < 4 ? 0 : 1));
  const chosen = [], keys = new Set([answerKey]);
  for (let round = 0; round < 4 && chosen.length < 3; round++) {
    for (const kind of kinds) {
      if (chosen.length >= 3) break;
      const list = rng.shuffle(byKind.get(kind).slice());
      const c = list.find((x) => !keys.has(patternKey(x.holes)));
      if (c && (round > 0 || !chosen.some((x) => x.kind === kind))) { chosen.push(c); keys.add(patternKey(c.holes)); }
    }
  }
  return chosen.length === 3 ? chosen : null;
}

function makeForward(rng, spec) {
  for (let attempt = 0; attempt < 400; attempt++) {
    const fr = randomFolds(rng, spec.N, spec.K, spec.diag);
    if (!fr) continue;
    const { folds } = fr;
    const regions = foldStates(spec.N, folds);
    const punch = randomPunch(rng, spec.N, folds, fr.region, spec);
    if (!punch) continue;
    const answer = unfoldHoles(punch, folds);
    if (minDist2(answer) < 4) continue;
    const dis = chooseDistractors(rng, distractors(spec.N, folds, punch, regions, answer), patternKey(answer));
    if (!dis) continue;
    const options = rng.shuffle([{ holes: answer, kind: 'ok' }, ...dis]);
    options.forEach((o) => o.holes.sort((a, b) => a[1] - b[1] || a[0] - b[0]));
    return { t: 'f', N: spec.N, folds, punch, options, answer: options.findIndex((o) => o.kind === 'ok') };
  }
  return null;
}

/** Tüm (2'ye kadar katlı) katlama dizileri — ters soruların yanlış seçenekleri için. */
function allFoldSeqs(N, K) {
  const out = [];
  const rec = (R, folds) => {
    if (folds.length === K) { out.push(folds.slice()); return; }
    for (const l of symmetryLines(R)) {
      for (const s of [1, -1]) {
        const R2 = clipPoly(R, l, s);
        if (!R2.every((p) => Number.isInteger(p[0]) && Number.isInteger(p[1]))) continue;
        folds.push({ l: l.slice(), s });
        rec(R2, folds);
        folds.pop();
      }
    }
  };
  rec(squareRegion(N), []);
  return out;
}

/** Bir katlama dizisinin, hedef desendeki bir deliği "doğru" yerden delen hâli. */
function forwardMapHole(folds, h) {
  let g = h.slice();
  for (const f of folds) if (f.s * sideOf(f.l, g) > 0) g = reflectHole(f.l, g);
  return g;
}

function makeReverse(rng, spec) {
  const seqs = allFoldSeqs(spec.N, spec.K);
  for (let attempt = 0; attempt < 400; attempt++) {
    const fr = randomFolds(rng, spec.N, spec.K, spec.diag);
    if (!fr) continue;
    const punch = randomPunch(rng, spec.N, fr.folds, fr.region, spec);
    if (!punch) continue;
    const target = unfoldHoles(punch, fr.folds);
    if (minDist2(target) < 4) continue;
    const tKey = patternKey(target);
    const cands = [];
    for (const seq of rng.shuffle(seqs.slice())) {
      const regs = foldStates(spec.N, seq);
      const R = regs[regs.length - 1];
      const spots = punchSpots(spec.N, seq, R);
      const ok = new Set([...spots.cells, ...spots.notches].map(keyPt));
      // hedefteki deliklerin bu katlamadaki görüntüleri: hepsi geçerli bir yere düşüyorsa delik orası
      const imgs = dedupe(target.map((h) => forwardMapHole(seq, h)));
      let p = imgs.filter((h) => ok.has(keyPt(h)) && (isNotch(h) ? spots.notches : spots.cells).some((c) => c[0] === h[0] && c[1] === h[1]));
      if (!p.length) continue;
      // aynı yere düşen farklı yönlü üçgenler çakışmasın
      if (new Set(p.map((h) => keyPt(h))).size !== p.length) continue;
      if (p.length > punch.length) p = p.slice(0, punch.length);
      if (minDist2(p) < 4) continue;
      const out = unfoldHoles(p, seq);
      if (minDist2(out) < 4) continue;
      cands.push({ folds: seq, punch: p, key: patternKey(out), n: out.length });
    }
    // Doğru seçenekle aynı deseni veren diziler (ör. kanadın öbür yandan katlanması) seçenek olamaz.
    const wrong = cands.filter((c) => c.key !== tKey);
    // en inandırıcılar: hedefle aynı sayıda delik veren desenler
    wrong.sort((a, b) => Math.abs(a.n - target.length) - Math.abs(b.n - target.length));
    const chosen = [], keys = new Set([tKey]);
    const close = wrong.filter((c) => c.n === target.length);
    const far = wrong.filter((c) => c.n !== target.length);
    for (const c of [...close, ...far]) {
      if (chosen.length >= 3) break;
      if (keys.has(c.key)) continue;
      // çok benzer katlamalar (sadece kanat yönü farklı) yerine farklı eksenleri tercih et
      if (chosen.length < 2 && chosen.some((x) => x.folds.map((f) => lineKind(f.l)).join() === c.folds.map((f) => lineKind(f.l)).join())) continue;
      chosen.push(c); keys.add(c.key);
    }
    for (const c of wrong) { if (chosen.length >= 3) break; if (!keys.has(c.key)) { chosen.push(c); keys.add(c.key); } }
    if (chosen.length < 3) continue;
    const options = rng.shuffle([
      { folds: fr.folds, punch, kind: 'ok' },
      ...chosen.map((c) => ({ folds: c.folds, punch: c.punch, kind: 'other' })),
    ]);
    target.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
    return { t: 'r', N: spec.N, target, options, answer: options.findIndex((o) => o.kind === 'ok') };
  }
  return null;
}

/** Her sorunun özellikleri: zorluk ve level sırasına göre kademeli artar. */
export function planFor(difficulty, index) {
  const i = index;
  if (difficulty === 'easy') {
    const N = i < 10 ? 4 : 6;
    const shapes = i < 12 ? ['o'] : ['o', 's'];
    return [0, 1, 2].map(() => ({ t: 'f', N, K: 1, diag: 'none', holes: [1, 1], shapes, notch: 0 }));
  }
  if (difficulty === 'medium') {
    const N = i < 6 ? 4 : 8;
    const shapes = i < 14 ? ['o', 's'] : ['o', 's', 't'];
    const holes = i < 8 ? [1, 1] : i < 14 ? [1, 2] : [2, 2];
    const notch = i < 6 ? 0 : 0.3;
    return [0, 1, 2, 3].map((q) => ({ t: 'f', N, K: 2, diag: 'none', holes: q === 0 && i < 14 ? [1, 1] : holes, shapes, notch }));
  }
  const reverse = i < 4 ? 0 : i < 12 ? 1 : 2;
  const qs = [];
  for (let q = 0; q < 5 - reverse; q++) {
    const K = i >= 6 && q >= 2 && (i >= 14 || q >= 3) ? 3 : 2;
    const shapes = i < 3 ? ['o', 's'] : ['o', 's', 't', 't'];
    const holes = K === 3 ? [1, 2] : i < 10 ? [1, 2] : [2, 3];
    qs.push({ t: 'f', N: 8, K, diag: q === 0 && i < 8 ? 'any' : 'must', holes, shapes, notch: 0.25 });
  }
  for (let q = 0; q < reverse; q++) {
    qs.push({ t: 'r', N: 8, K: 2, diag: q === 0 ? 'any' : 'must', holes: [1, i < 16 ? 1 : 2], shapes: i < 10 ? ['o'] : ['o', 't'], notch: 0 });
  }
  return qs;
}

export function generateLevel(rng, difficulty, index, total = 20) {
  const plan = planFor(difficulty, index);
  for (let attempt = 0; attempt < 50; attempt++) {
    const questions = [];
    const seen = new Set();
    let ok = true;
    for (const spec of plan) {
      let q = null;
      for (let t = 0; t < 30 && !q; t++) {
        const c = spec.t === 'f' ? makeForward(rng, spec) : makeReverse(rng, spec);
        if (!c) continue;
        const key = c.t === 'f' ? `f|${c.N}|${JSON.stringify(c.folds)}|${JSON.stringify(c.punch)}` : `r|${c.N}|${patternKey(c.target)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        q = c;
      }
      if (!q) { ok = false; break; }
      questions.push(q);
    }
    if (!ok) continue;
    const level = { difficulty, puzzle: puzzleString(questions), questions: questions.map(encodeQuestion) };
    if (!verifyLevel(level)) return level;
  }
  throw new Error(`Kâğıt katlama üretilemedi: ${difficulty} #${index + 1}`);
}
