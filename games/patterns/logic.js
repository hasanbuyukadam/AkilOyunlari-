// Şekil Örüntüleri — saf mantık (DOM yok; Node ve tarayıcı ortak).
//
// Her kutucuk (tile) parametrik bir modeldir:
//   s: şekil, c: renk, z: boyut (0 küçük, 1 orta, 2 büyük), n: adet (1–6),
//   f: boyama (0 dolu, 1 boş, 2 çizgili), r: dönüş (derece, 45'in katı), d: nokta (-1 yok, 0..3 köşe, saat yönünde).
// Bir soru, her özellik için açık bir kural tanımı saklar:
//   Dizi (seq):   const | cycle(vals) | step(a, k)            → i. terim
//   Matris (mat): const | row(vals) | col(vals) | dist(vals,k) | rprog(base,k) | cprog(base,k) → (satır, sütun)
// verifyLevel, kurallardan bağımsız (kapalı formül) bir değerlendiriciyle kutucukları yeniden üretir ve
// kural ailesindeki TÜM basit kuralları görünen kutucuklara karşı tarar: tutarlı her kural aynı cevabı
// vermiyorsa ya da hiçbir kural tutmuyorsa soru reddedilir ("tek çözüm" garantisi).

export const SHAPES = ['circle', 'triangle', 'square', 'pentagon', 'hexagon', 'heptagon', 'octagon', 'star', 'heart', 'arrow'];
export const SIDES = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8 };
const BY_SIDES = { 3: 'triangle', 4: 'square', 5: 'pentagon', 6: 'hexagon', 7: 'heptagon', 8: 'octagon' };
export const ROTATABLE = new Set(['triangle', 'arrow']);
export const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
export const ATTRS = ['s', 'c', 'z', 'n', 'f', 'r', 'd'];
export const QUESTION_COUNT = { easy: 3, medium: 4, hard: 4 };
const FRIENDLY = ['circle', 'triangle', 'square', 'star', 'heart', 'hexagon'];
const MOD = { r: 8, d: 4 };

const mod = (x, m) => ((x % m) + m) % m;

// ------------------------------------------------------------------ Kutucuk modeli
export function canon(t) {
  return { ...t, r: ROTATABLE.has(t.s) ? mod(t.r, 360) : 0 };
}
export function encode(t) {
  const u = canon(t);
  return `${u.s}:${u.c}:${u.z}:${u.n}:${u.f}:${u.r}:${u.d}`;
}
export function decode(str) {
  const [s, c, z, n, f, r, d] = str.split(':');
  return { s, c, z: +z, n: +n, f: +f, r: +r, d: +d };
}
export function validTile(t) {
  if (!SHAPES.includes(t.s) || !COLORS.includes(t.c)) return false;
  if (![0, 1, 2].includes(t.z) || ![0, 1, 2].includes(t.f)) return false;
  if (!Number.isInteger(t.n) || t.n < 1 || t.n > 6) return false;
  if (![-1, 0, 1, 2, 3].includes(t.d)) return false;
  if (!Number.isInteger(t.r) || t.r < 0 || t.r >= 360 || t.r % 45) return false;
  if (!ROTATABLE.has(t.s) && t.r !== 0) return false;
  if (t.s === 'triangle' && t.r % 90) return false;
  return true;
}

// Sıralı özelliklerin sayısal karşılığı (yoksa null).
export function toNum(attr, v) {
  switch (attr) {
    case 's': return SIDES[v] ?? null;
    case 'z': case 'n': return v;
    case 'r': return v / 45;
    case 'd': return v < 0 ? null : v;
    default: return null;
  }
}
export function fromNum(attr, x) {
  switch (attr) {
    case 's': return BY_SIDES[x] ?? null;
    case 'z': return x >= 0 && x <= 2 ? x : null;
    case 'n': return x >= 1 && x <= 6 ? x : null;
    case 'r': return mod(x, 8) * 45;
    case 'd': return mod(x, 4);
    default: return null;
  }
}

// ------------------------------------------------------------------ Kapalı formül değerlendiriciler
export function evalSeq(attr, rule, i) {
  if (rule.t === 'const') return rule.v;
  if (rule.t === 'cycle') return rule.vals[i % rule.vals.length];
  if (rule.t === 'step') return fromNum(attr, rule.a + rule.k * i);
  throw new Error(`Bilinmeyen dizi kuralı: ${rule.t}`);
}
export function evalMat(attr, rule, r, c) {
  switch (rule.t) {
    case 'const': return rule.v;
    case 'row': return rule.vals[r];
    case 'col': return rule.vals[c];
    case 'dist': return rule.vals[(c + rule.k * r) % 3];
    case 'rprog': return fromNum(attr, rule.base[r] + rule.k * c);
    case 'cprog': return fromNum(attr, rule.base[c] + rule.k * r);
    default: throw new Error(`Bilinmeyen matris kuralı: ${rule.t}`);
  }
}
const tileAt = (rules, f) => canon(Object.fromEntries(ATTRS.map((a) => [a, f(a, rules[a])])));

// ------------------------------------------------------------------ Kural ailesi taraması
// Dizi: görünen terimlerle tutarlı her basit kuralın eksik konum için tahmini.
// Aile: periyodu 1–4 olan tekrarlar; sıralı özelliklerde her tamsayı farklı aritmetik dizi;
// döngüsel özelliklerde (yön, nokta) her modüler adım.
export function seqPredictions(attr, vals, m) {
  const vis = vals.map((_, i) => i).filter((i) => i !== m);
  const preds = new Map();
  let open = false;
  const add = (v) => preds.set(String(v), v);
  for (let p = 1; p <= 4; p++) {
    const rep = new Map();
    let ok = true;
    for (const i of vis) {
      const k = i % p;
      if (rep.has(k) && rep.get(k) !== vals[i]) { ok = false; break; }
      rep.set(k, vals[i]);
    }
    if (!ok) continue;
    if (rep.has(m % p)) add(rep.get(m % p));
    else open = true;
  }
  const nums = vis.map((i) => toNum(attr, vals[i]));
  if (nums.every((x) => x !== null)) {
    if (MOD[attr]) {
      const M = MOD[attr];
      for (let k = 0; k < M; k++) {
        const a = mod(nums[0] - k * vis[0], M);
        if (vis.every((i, j) => mod(a + k * i, M) === nums[j])) add(fromNum(attr, a + k * m));
      }
    } else {
      const di = vis[1] - vis[0], dv = nums[1] - nums[0];
      if (dv % di === 0) {
        const k = dv / di, a = nums[0] - k * vis[0];
        if (vis.every((i, j) => a + k * i === nums[j])) {
          const x = fromNum(attr, a + k * m);
          if (x === null) open = true; else add(x);
        }
      }
    }
  }
  return { values: [...preds.values()], open };
}

// Matris (eksik hücre sağ alt): sabit, satır/sütun sabit, satır/sütun "üçlü dağılım",
// satır/sütun aritmetik (her satır kendi farkıyla), adet için satır/sütun toplam ve fark kuralları.
export function matPredictions(attr, g) {
  const preds = new Map();
  let open = false;
  const add = (v) => { if (v === null) open = true; else preds.set(String(v), v); };
  const all = [g[0][0], g[0][1], g[0][2], g[1][0], g[1][1], g[1][2], g[2][0], g[2][1]];
  if (all.every((v) => v === all[0])) add(all[0]);
  if (g[0][0] === g[0][1] && g[0][1] === g[0][2] && g[1][0] === g[1][1] && g[1][1] === g[1][2] && g[2][0] === g[2][1]) add(g[2][0]);
  if (g[0][0] === g[1][0] && g[1][0] === g[2][0] && g[0][1] === g[1][1] && g[1][1] === g[2][1] && g[0][2] === g[1][2]) add(g[0][2]);
  const dist = (a, b, x, y) => {
    const A = new Set(a.map(String)), B = new Set(b.map(String));
    if (A.size !== 3 || B.size !== 3 || [...A].some((v) => !B.has(v))) return;
    if (x === y || !A.has(String(x)) || !A.has(String(y))) return;
    add(a.find((v) => v !== x && v !== y));
  };
  dist(g[0], g[1], g[2][0], g[2][1]);
  const col = (c) => [g[0][c], g[1][c], g[2][c]];
  dist(col(0), col(1), g[0][2], g[1][2]);
  const N = g.map((row) => row.map((v) => (v === undefined || v === null ? null : toNum(attr, v))));
  const known = all.map((v) => toNum(attr, v));
  if (known.every((x) => x !== null)) {
    const M = MOD[attr];
    const T = (r, c) => N[r][c];
    const Tc = (r, c) => N[c][r]; // devrik: sütunları satır gibi oku
    for (const get of [T, Tc]) {
      // aritmetik (her satır kendi farkıyla)
      if (M) {
        if ([0, 1].every((r) => mod(get(r, 1) - get(r, 0), M) === mod(get(r, 2) - get(r, 1), M))) {
          add(fromNum(attr, get(2, 1) + mod(get(2, 1) - get(2, 0), M)));
        }
      } else {
        if ([0, 1].every((r) => get(r, 1) - get(r, 0) === get(r, 2) - get(r, 1))) {
          add(fromNum(attr, 2 * get(2, 1) - get(2, 0)));
        }
        if (attr === 'n') {
          if ([0, 1].every((r) => get(r, 2) === get(r, 0) + get(r, 1))) add(fromNum(attr, get(2, 0) + get(2, 1)));
          if ([0, 1].every((r) => get(r, 2) === get(r, 0) - get(r, 1))) add(fromNum(attr, get(2, 0) - get(2, 1)));
        }
      }
    }
  }
  return { values: [...preds.values()], open };
}

// Görünen kutucuklardan tek tahmin edilen kutucuk; belirsizse hata metni.
export function predictTile(q) {
  const items = q.items.map((s) => (s ? decode(s) : null));
  const out = {};
  for (const a of ATTRS) {
    let res;
    if (q.kind === 'seq') res = seqPredictions(a, items.map((t) => (t ? t[a] : undefined)), q.m);
    else {
      const g = [0, 1, 2].map((r) => [0, 1, 2].map((c) => items[r * 3 + c]?.[a]));
      res = matPredictions(a, g);
    }
    if (res.open) return { err: `"${a}" özelliği için belirsiz bir kural var` };
    if (res.values.length !== 1) return { err: `"${a}" özelliği için ${res.values.length} farklı tutarlı cevap var` };
    out[a] = res.values[0];
  }
  return { tile: canon(out) };
}

// ------------------------------------------------------------------ Soru doğrulama
export function checkQuestion(q) {
  if (q.kind === 'seq') {
    if (!Number.isInteger(q.L) || q.L < 5 || q.L > 9 || q.items.length !== q.L) return 'Dizi uzunluğu hatalı';
    if (!Number.isInteger(q.m) || q.m < 0 || q.m >= q.L || q.items[q.m] !== null) return 'Eksik konum hatalı';
    if (q.items.some((s, i) => i !== q.m && typeof s !== 'string')) return 'Kutucuk eksik';
    for (const a of ATTRS) {
      const rule = q.rules[a];
      if (!rule) return `"${a}" kuralı yok`;
      if (rule.t === 'cycle' && q.L - 1 < 2 * rule.vals.length) return 'Tekrar en az iki kez görünmüyor';
      if (rule.t === 'cycle' && new Set(rule.vals).size < 2) return 'Tekrarda değişen değer yok';
      if (rule.t === 'step' && (rule.k === 0 || q.L - 1 < 4)) return 'Adım kuralı yetersiz';
    }
    for (let i = 0; i < q.L; i++) {
      const t = tileAt(q.rules, (a, r) => evalSeq(a, r, i));
      if (!validTile(t)) return `${i + 1}. kutucuk geçersiz`;
      if (i === q.m ? encode(t) !== q.answer : encode(t) !== q.items[i]) return `${i + 1}. kutucuk kurala uymuyor`;
    }
  } else if (q.kind === 'mat') {
    if (q.items.length !== 9 || q.items[8] !== null || q.items.slice(0, 8).some((s) => typeof s !== 'string')) return 'Matris hatalı';
    for (let i = 0; i < 9; i++) {
      const t = tileAt(q.rules, (a, r) => evalMat(a, r, Math.floor(i / 3), i % 3));
      if (!validTile(t)) return `${i + 1}. hücre geçersiz`;
      if (i === 8 ? encode(t) !== q.answer : encode(t) !== q.items[i]) return `${i + 1}. hücre kurala uymuyor`;
    }
  } else return 'Bilinmeyen soru türü';
  if (!ATTRS.some((a) => q.rules[a].t !== 'const')) return 'Değişen özellik yok';
  // Kural ailesi taraması: cevap tek mi?
  const p = predictTile(q);
  if (p.err) return p.err;
  if (encode(p.tile) !== q.answer) return 'Taranan kurallar başka bir cevap veriyor';
  // Seçenekler
  if (!Array.isArray(q.options) || q.options.length !== 4) return '4 seçenek olmalı';
  const opts = q.options.map(decode);
  if (opts.some((t) => !validTile(t))) return 'Geçersiz seçenek';
  const keys = opts.map(encode);
  if (new Set(keys).size !== 4) return 'Seçenekler birbirinden farklı değil';
  const hits = keys.map((k, i) => (k === encode(p.tile) ? i : -1)).filter((i) => i >= 0);
  if (hits.length !== 1) return `${hits.length} seçenek kurala uyuyor`;
  if (q.correct !== hits[0]) return 'Doğru seçenek indeksi hatalı';
  return null;
}

export function verifyLevel(level) {
  const nq = QUESTION_COUNT[level.difficulty];
  if (!nq) return 'Zorluk bilgisi yok';
  if (!Array.isArray(level.questions) || level.questions.length !== nq) return `${nq} soru olmalı`;
  if (level.puzzle !== puzzleKey(level.questions)) return 'puzzle alanı sorularla uyuşmuyor';
  const wantKind = level.difficulty === 'hard' ? 'mat' : 'seq';
  for (let i = 0; i < nq; i++) {
    let q;
    try { q = unpack(level.questions[i]); } catch (e) { return `${i + 1}. soru okunamadı: ${e.message}`; }
    if (q.kind !== wantKind) return `${i + 1}. soru türü hatalı`;
    const err = checkQuestion(q);
    if (err) return `${i + 1}. soru: ${err}`;
  }
  return null;
}

// Kayıtlı (sıkıştırılmış) soru biçimi: kurallar tek satırlık metin, kutucuklar ";" ile ayrılmış.
//   rules: "s=c(circle,star) c=red z=2 n=s(1,1) f=0 r=0 d=-1"
//   const → değer, cycle → c(...), step → s(a,k), row → R(...), col → C(...), dist → D(a,b,c/k),
//   rprog → P(b0,b1,b2/k), cprog → Q(b0,b1,b2/k)
const NUMERIC = new Set(['z', 'n', 'f', 'r', 'd']);
const RULE_CODE = { cycle: 'c', step: 's', row: 'R', col: 'C', dist: 'D', rprog: 'P', cprog: 'Q' };
const CODE_RULE = Object.fromEntries(Object.entries(RULE_CODE).map(([k, v]) => [v, k]));
function ruleToStr(rule) {
  switch (rule.t) {
    case 'const': return String(rule.v);
    case 'cycle': case 'row': case 'col': return `${RULE_CODE[rule.t]}(${rule.vals.join(',')})`;
    case 'step': return `s(${rule.a},${rule.k})`;
    case 'dist': return `D(${rule.vals.join(',')}/${rule.k})`;
    default: return `${RULE_CODE[rule.t]}(${rule.base.join(',')}/${rule.k})`;
  }
}
function strToRule(attr, str) {
  const val = (x) => (NUMERIC.has(attr) ? Number(x) : x);
  const m = /^([a-zA-Z])\((.*)\)$/.exec(str);
  if (!m || !CODE_RULE[m[1]]) return { t: 'const', v: val(str) };
  const t = CODE_RULE[m[1]];
  const [list, k] = m[2].split('/');
  const parts = list.split(',');
  if (t === 'step') return { t, a: Number(parts[0]), k: Number(parts[1]) };
  if (t === 'cycle' || t === 'row' || t === 'col') return { t, vals: parts.map(val) };
  if (t === 'dist') return { t, vals: parts.map(val), k: Number(k) };
  return { t, base: parts.map(Number), k: Number(k) };
}
export function pack(q) {
  const out = { kind: q.kind };
  if (q.kind === 'seq') { out.L = q.L; out.m = q.m; }
  out.rules = ATTRS.map((a) => `${a}=${ruleToStr(q.rules[a])}`).join(' ');
  out.items = q.items.map((s) => s ?? '?').join(';');
  out.options = q.options.join(';');
  out.correct = q.correct;
  out.answer = q.answer;
  return out;
}
export function unpack(p) {
  const rules = {};
  for (const part of String(p.rules).split(' ')) {
    const i = part.indexOf('=');
    rules[part.slice(0, i)] = strToRule(part.slice(0, i), part.slice(i + 1));
  }
  return {
    kind: p.kind, L: p.L, m: p.m, rules,
    items: String(p.items).split(';').map((s) => (s === '?' ? null : s)),
    options: String(p.options).split(';'),
    correct: p.correct, answer: p.answer,
  };
}
const puzzleKey = (qs) => qs.map((q) => `${q.kind}${q.m ?? ''}|${q.rules}`).join(' ; ');

// ------------------------------------------------------------------ Üretici
const pick = (rng, arr) => arr[rng.int(0, arr.length - 1)];
const sample = (rng, arr, k) => rng.shuffle(arr.slice()).slice(0, k);

function baseTile(rng) {
  return { s: pick(rng, FRIENDLY), c: pick(rng, COLORS), z: 2, n: 1, f: 0, r: 0, d: -1 };
}
const constRules = (b) => Object.fromEntries(ATTRS.map((a) => [a, { t: 'const', v: b[a] }]));

// Kolay şablonları: basit tekrarlar
const EASY = {
  shapeAB: (rng) => ({ s: { t: 'cycle', vals: sample(rng, FRIENDLY, 2) } }),
  colorAB: (rng) => ({ c: { t: 'cycle', vals: sample(rng, COLORS, 2) } }),
  shapeABC: (rng) => ({ s: { t: 'cycle', vals: sample(rng, FRIENDLY, 3) } }),
  colorABC: (rng) => ({ c: { t: 'cycle', vals: sample(rng, COLORS, 3) } }),
  bothAB: (rng) => ({ s: { t: 'cycle', vals: sample(rng, FRIENDLY, 2) }, c: { t: 'cycle', vals: sample(rng, COLORS, 2) } }),
  shapeAAB: (rng) => { const [A, B] = sample(rng, FRIENDLY, 2); return { s: { t: 'cycle', vals: rng.next() < 0.5 ? [A, A, B] : [A, B, B] } }; },
  colorAAB: (rng) => { const [A, B] = sample(rng, COLORS, 2); return { c: { t: 'cycle', vals: rng.next() < 0.5 ? [A, A, B] : [A, B, B] } }; },
  sizeAB: (rng) => ({ z: { t: 'cycle', vals: rng.next() < 0.5 ? [0, 2] : [2, 0] } }),
  fillAB: (rng) => ({ f: { t: 'cycle', vals: pick(rng, [[0, 1], [1, 0], [0, 2], [2, 1]]) } }),
  bothABC: (rng) => ({ s: { t: 'cycle', vals: sample(rng, FRIENDLY, 3) }, c: { t: 'cycle', vals: sample(rng, COLORS, 3) } }),
};
function easyPool(t) {
  const p = ['shapeAB', 'colorAB'];
  if (t >= 0.2) p.push('shapeABC', 'colorABC', 'bothAB');
  if (t >= 0.45) p.push('shapeAAB', 'colorAAB', 'sizeAB', 'fillAB');
  if (t >= 0.7) p.push('bothABC');
  return t >= 0.45 ? p.filter((x) => !['shapeAB', 'colorAB'].includes(x)) : p;
}

// Orta şablonları: büyüyen/ilerleyen özellikler ve iç içe tekrarlar. L: toplam terim sayısı.
const MEDIUM = {
  countUp: (rng, t) => { const a = pick(rng, [1, 1, 2]); return { L: 7 - a, r: { n: { t: 'step', a, k: 1 }, ...(t > 0.3 && rng.next() < 0.6 ? { c: { t: 'cycle', vals: sample(rng, COLORS, 2) } } : {}) } }; },
  countDown: (rng) => { const a = pick(rng, [6, 5]); return { L: a, r: { n: { t: 'step', a, k: -1 }, ...(rng.next() < 0.5 ? { c: { t: 'cycle', vals: sample(rng, COLORS, 2) } } : {}) } }; },
  sidesUp: (rng, t) => { const a = pick(rng, [3, 3, 4]); return { L: 9 - a, r: { s: { t: 'step', a, k: 1 }, ...(t > 0.4 && rng.next() < 0.6 ? { c: { t: 'cycle', vals: sample(rng, COLORS, 2) } } : {}) } }; },
  sidesDown: (rng) => { const a = pick(rng, [8, 7]); return { L: a - 2, r: { s: { t: 'step', a, k: -1 }, ...(rng.next() < 0.5 ? { f: { t: 'cycle', vals: [0, 1] } } : {}) } }; },
  rot90: (rng, t) => ({ L: rng.int(6, 7), base: { s: pick(rng, ['triangle', 'arrow']) }, r: { r: { t: 'step', a: rng.int(0, 3) * 2, k: pick(rng, [2, -2]) }, ...(t > 0.35 && rng.next() < 0.6 ? { c: { t: 'cycle', vals: sample(rng, COLORS, rng.next() < 0.5 ? 2 : 3) } } : {}) } }),
  rot45: (rng) => ({ L: rng.int(6, 7), base: { s: 'arrow' }, r: { r: { t: 'step', a: rng.int(0, 7), k: pick(rng, [1, -1]) }, ...(rng.next() < 0.5 ? { c: { t: 'cycle', vals: sample(rng, COLORS, 2) } } : {}) } }),
  dot: (rng, t) => ({ L: rng.int(6, 7), r: { d: { t: 'step', a: rng.int(0, 3), k: pick(rng, [1, -1]) }, ...(t > 0.3 && rng.next() < 0.6 ? { s: { t: 'cycle', vals: sample(rng, FRIENDLY, 2) } } : {}) } }),
  colShape: (rng) => { const ps = rng.next() < 0.5 ? [2, 3] : [3, 2]; return { L: rng.int(7, 8), r: { c: { t: 'cycle', vals: sample(rng, COLORS, ps[0]) }, s: { t: 'cycle', vals: sample(rng, FRIENDLY, ps[1]) } } }; },
  sizeColor: (rng) => ({ L: 7, r: { z: { t: 'cycle', vals: rng.next() < 0.5 ? [0, 1, 2] : [2, 1, 0] }, c: { t: 'cycle', vals: sample(rng, COLORS, 2) } } }),
  countFill: (rng) => ({ L: 6, r: { n: { t: 'step', a: 1, k: 1 }, f: { t: 'cycle', vals: pick(rng, [[0, 1], [1, 0], [0, 2], [2, 0]]) } } }),
};
function mediumPool(t) {
  const p = ['countUp', 'sidesUp', 'dot', 'rot90', 'colShape'];
  if (t >= 0.3) p.push('countDown', 'sidesDown', 'sizeColor', 'countFill');
  if (t >= 0.6) p.push('rot45');
  return p;
}

// Diziyi kurallardan ADIM ADIM kurar (doğrulayıcının kapalı formülünden bağımsız).
function buildSeq(rules, L) {
  const cols = {};
  for (const a of ATTRS) {
    const rule = rules[a], arr = [];
    if (rule.t === 'const') for (let i = 0; i < L; i++) arr.push(rule.v);
    else if (rule.t === 'cycle') { let j = 0; for (let i = 0; i < L; i++) { arr.push(rule.vals[j]); j = (j + 1) % rule.vals.length; } }
    else { let x = rule.a; for (let i = 0; i < L; i++) { arr.push(fromNum(a, x)); x += rule.k; } }
    cols[a] = arr;
  }
  return Array.from({ length: L }, (_, i) => canon(Object.fromEntries(ATTRS.map((a) => [a, cols[a][i]]))));
}

function makeSeq(rng, difficulty, t, used) {
  const pool = difficulty === 'easy' ? easyPool(t) : mediumPool(t);
  const fresh = pool.filter((x) => !used.includes(x));
  const name = pick(rng, fresh.length ? fresh : pool);
  const base = baseTile(rng);
  let rules, L, m;
  if (difficulty === 'easy') {
    const over = EASY[name](rng);
    rules = { ...constRules(base), ...over };
    const p = Math.max(...Object.values(over).map((r) => r.vals.length));
    const visible = Math.min(8, Math.max(6, 2 * p + rng.int(0, 2)));
    L = visible + 1;
    m = L - 1;
  } else {
    const spec = MEDIUM[name](rng, t);
    Object.assign(base, spec.base ?? {});
    rules = { ...constRules(base), ...spec.r };
    L = spec.L;
    m = rng.next() < 0.2 + 0.6 * t ? rng.int(2, L - 2) : L - 1;
    if (Object.values(spec.r).some((r) => r.t === 'step') && L - 1 < 4) return null;
  }
  // Tekrar ve kayan şekillerde döndürme anlamsız olmasın.
  if (rules.r.t !== 'const' && rules.s.t !== 'const' && !(rules.s.vals ?? []).every((s) => ROTATABLE.has(s))) return null;
  const tiles = buildSeq(rules, L);
  const items = tiles.map((tl, i) => (i === m ? null : encode(tl)));
  const answer = tiles[m];
  const wholes = [m - 1, m + 1, m - 2].filter((i) => i >= 0 && i < L).map((i) => tiles[i]);
  const q = { kind: 'seq', template: name, L, m, rules, items, answer: encode(answer) };
  return finishOptions(rng, q, answer, wholes, tiles.filter((_, i) => i !== m));
}

// Matris kural seçicileri
function matRule(rng, attr, type, ctx) {
  const k = pick(rng, [1, 2]);
  switch (attr) {
    case 's': {
      if (type === 'prog') { const b = rng.int(3, 5); return { t: rng.next() < 0.5 ? 'rprog' : 'cprog', base: rng.shuffle([b, b, rng.int(3, 6)]), k: 1 }; }
      const vals = sample(rng, ctx.rotShapes ? ['triangle', 'arrow'] : FRIENDLY, 3);
      return type === 'dist' ? { t: 'dist', vals, k } : { t: type, vals };
    }
    case 'c': { const vals = sample(rng, COLORS, 3); return type === 'dist' ? { t: 'dist', vals, k } : { t: type, vals }; }
    case 'f': { const vals = rng.shuffle([0, 1, 2]); return type === 'dist' ? { t: 'dist', vals, k } : { t: type, vals }; }
    case 'z': {
      if (type === 'prog') return { t: rng.next() < 0.5 ? 'rprog' : 'cprog', base: [0, 0, 0], k: 1 };
      const vals = rng.shuffle([0, 1, 2]); return type === 'dist' ? { t: 'dist', vals, k } : { t: type, vals };
    }
    case 'n': {
      if (type === 'prog') {
        const up = rng.next() < 0.6;
        const base = [0, 1, 2].map(() => (up ? rng.int(1, 4) : rng.int(3, 6)));
        return { t: rng.next() < 0.5 ? 'rprog' : 'cprog', base, k: up ? 1 : -1 };
      }
      const vals = sample(rng, [1, 2, 3, 4, 5], 3); return type === 'dist' ? { t: 'dist', vals, k } : { t: type, vals };
    }
    case 'r': {
      if (type === 'prog') return { t: rng.next() < 0.5 ? 'rprog' : 'cprog', base: [0, 1, 2].map(() => rng.int(0, 3) * 2), k: pick(rng, [2, -2]) };
      const vals = sample(rng, [0, 90, 180, 270], 3); return type === 'dist' ? { t: 'dist', vals, k } : { t: type, vals };
    }
    case 'd': {
      if (type === 'prog') return { t: rng.next() < 0.5 ? 'rprog' : 'cprog', base: [0, 1, 2].map(() => rng.int(0, 3)), k: pick(rng, [1, -1]) };
      const vals = sample(rng, [0, 1, 2, 3], 3); return type === 'dist' ? { t: 'dist', vals, k } : { t: type, vals };
    }
    default: return null;
  }
}

function buildMat(rules) {
  const grid = [[], [], []];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid[r][c] = {};
  for (const a of ATTRS) {
    const rule = rules[a];
    for (let r = 0; r < 3; r++) {
      let x = rule.t === 'rprog' ? rule.base[r] : null;
      const rot = rule.t === 'dist' ? rule.vals.slice((rule.k * r) % 3).concat(rule.vals.slice(0, (rule.k * r) % 3)) : null;
      for (let c = 0; c < 3; c++) {
        let v;
        if (rule.t === 'const') v = rule.v;
        else if (rule.t === 'row') v = rule.vals[r];
        else if (rule.t === 'col') v = rule.vals[c];
        else if (rule.t === 'dist') v = rot[c];
        else if (rule.t === 'rprog') { v = fromNum(a, x); x += rule.k; }
        else { let y = rule.base[c]; for (let i = 0; i < r; i++) y += rule.k; v = fromNum(a, y); }
        grid[r][c][a] = v;
      }
    }
  }
  return grid.flat().map(canon);
}

function makeMat(rng, t) {
  const nAttrs = t < 0.35 ? 2 : t < 0.7 ? rng.int(2, 3) : 3;
  const attrs = sample(rng, ['s', 'c', 'n', 'f', 'z', 'r', 'd', 'c', 'n', 's'], 10).filter((a, i, arr) => arr.indexOf(a) === i).slice(0, nAttrs);
  if (attrs.includes('z') && attrs.includes('n')) return null;
  const base = baseTile(rng);
  const rules = constRules(base);
  const ctx = { rotShapes: false };
  if (attrs.includes('r')) { ctx.rotShapes = true; if (!attrs.includes('s')) rules.s = { t: 'const', v: pick(rng, ['triangle', 'arrow']) }; }
  const simple = ['row', 'col'];
  const types = attrs.map((a, i) => {
    let pool;
    if (t < 0.35) pool = i === 0 ? simple : ['prog', 'prog', 'dist'];
    else if (t < 0.7) pool = i === 0 ? [...simple, 'prog'] : ['prog', 'dist', 'dist'];
    else pool = ['prog', 'dist', 'dist', 'row', 'col'];
    if (a === 'c' || a === 'f') pool = pool.map((x) => (x === 'prog' ? 'dist' : x));
    return pick(rng, pool);
  });
  // Orta ve sonrası: en fazla bir "satır/sütun hep aynı" kuralı; gerisi ilerleme ya da üçlü dağılım.
  if (t >= 0.35 && types.filter((x) => simple.includes(x)).length > 1) return null;
  attrs.forEach((a, i) => {
    let type = types[i];
    if (a === 's' && ctx.rotShapes && type === 'prog') type = 'dist';
    rules[a] = matRule(rng, a, type, ctx);
  });
  // Köşe sayısı ilerliyorsa adet tek kalsın; çok kenarlı şekiller küçük çizilmesin.
  if (rules.s.t === 'rprog' || rules.s.t === 'cprog') { if (rules.n.t !== 'const') return null; }
  if (rules.r.t !== 'const' && rules.s.t === 'cprog') return null;
  const tiles = buildMat(rules);
  const answer = tiles[8];
  const items = tiles.map((tl, i) => (i === 8 ? null : encode(tl)));
  const q = { kind: 'mat', template: attrs.map((a, i) => `${a}-${rules[a].t}`).join('+'), rules, items, answer: encode(answer) };
  return finishOptions(rng, q, answer, [tiles[7], tiles[5]], tiles.slice(0, 8));
}

// Çeldiriciler: çocukların tipik yanlışları — son kutucuğu kopyalamak, bir adım eksik/fazla saymak,
// tekrarın yanlış yerini seçmek; değişmeyen bir özelliği bozmak en son çare.
function finishOptions(rng, q, answer, wholes, visible) {
  const ansKey = encode(answer);
  const varying = ATTRS.filter((a) => q.rules[a].t !== 'const');
  const fixed = ATTRS.filter((a) => q.rules[a].t === 'const');
  const seen = new Set([ansKey]);
  const take = (t) => {
    const c = canon(t);
    if (!validTile(c)) return null;
    const k = encode(c);
    if (seen.has(k)) return null;
    seen.add(k);
    return k;
  };
  const altValues = (a) => {
    const near = [];
    const numeric = a !== 's' || ['step', 'rprog', 'cprog'].includes(q.rules[a].t);
    const num = numeric ? toNum(a, answer[a]) : null;
    if (num !== null) for (const d of a === 'r' ? [2, -2, 4, 1, -1] : [1, -1, 2, -2]) { const v = fromNum(a, num + d); if (v !== null) near.push(v); }
    // önce "bir adım eksik/fazla" değerleri, sonra dizide görülen diğer değerler
    const vals = [...rng.shuffle(near.slice(0, 2)), ...near.slice(2), ...rng.shuffle(visible.map((t) => t[a]))];
    return [...new Set(vals)].filter((v) => v !== answer[a]);
  };
  const out = [];
  for (const t of wholes) { const k = take(t); if (k) { out.push(k); break; } }
  // tek özellik değişikliği, özellikler arasında sırayla
  const lists = rng.shuffle(varying.slice()).map((a) => altValues(a).map((v) => ({ ...answer, [a]: v })));
  for (let round = 0; out.length < 3 && lists.some((l) => l.length > round); round++) {
    for (const l of lists) { if (out.length >= 3) break; if (l[round]) { const k = take(l[round]); if (k) out.push(k); } }
  }
  // iki özellik birden
  if (out.length < 3 && varying.length >= 2) {
    for (let tries = 0; tries < 30 && out.length < 3; tries++) {
      const [a, b] = sample(rng, varying, 2);
      const va = altValues(a), vb = altValues(b);
      if (va.length && vb.length) { const k = take({ ...answer, [a]: va[0], [b]: vb[0] }); if (k) out.push(k); }
    }
  }
  // son çare: değişmeyen bir özellik
  for (const a of rng.shuffle(fixed.filter((x) => x !== 'r' && x !== 'd'))) {
    if (out.length >= 3) break;
    const alts = a === 's' ? FRIENDLY : a === 'c' ? COLORS : a === 'n' ? [1, 2, 3] : [0, 1, 2];
    for (const v of rng.shuffle(alts.slice())) { const k = take({ ...answer, [a]: v }); if (k) { out.push(k); break; } }
  }
  if (out.length < 3) return null;
  const options = rng.shuffle([ansKey, ...out.slice(0, 3)]);
  q.options = options;
  q.correct = options.indexOf(ansKey);
  return q;
}

export function generateLevel(rng, difficulty, index, total) {
  const t = total > 1 ? index / (total - 1) : 0;
  const nq = QUESTION_COUNT[difficulty];
  const questions = [];
  const used = [];
  const keys = new Set();
  for (let guard = 0; questions.length < nq; guard++) {
    if (guard > 5000) throw new Error('Soru üretilemedi');
    const q = difficulty === 'hard' ? makeMat(rng, t) : makeSeq(rng, difficulty, t, used);
    if (!q || checkQuestion(q)) continue;
    const key = q.items.join(',');
    if (keys.has(key)) continue;
    keys.add(key);
    used.push(q.template);
    questions.push(pack(q));
  }
  return { difficulty, puzzle: puzzleKey(questions), questions };
}
