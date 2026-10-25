// Mantık Tablosu (Einstein bulmacası) mantığı — tarayıcıda ve Node'da ortak çalışır, DOM kullanmaz.
//
// Model: N çocuk, K kategori (0 = isimler). Her kategoride N öğe vardır ve her çocuğa birer tane düşer.
// Öğeler global numarayla anılır: g = kategori * N + sıra.
// Level metni (puzzle):  "<kategoriler>|<ipuçları>"
//   kategoriler: "name:0.4.7,pet:1.2.5,age:7"   (sıralı kategoride sayı = başlangıç değeri)
//   ipuçları   : "s0.4;d1.7;e0.4.5;l2.6;n1.3.2" (harf + global öğe numaraları [+ fark])
// Çözüm (solution): kategori 1..K-1 için "p0'ın öğesi p1'in öğesi ..." → "201.120"
//
// İpucu türleri:
//   s a b     : a ile b aynı kişiye ait
//   d a b     : a ile b aynı kişiye ait değil   (D: "aynı kişi değil" kalıbıyla yazılır)
//   e a b c   : a, ya b ya da c ile aynı kişi (b ve c aynı kategoriden)
//   l a b     : sıralı kategoride a'nın değeri b'ninkinden küçük   (g: büyük)
//   n a b k   : a'nın değeri = b'ninki + k                       (p: a = b - k)

// ---------------------------------------------------------------- Türkçe ek yardımcıları
const VOWELS = 'aeıioöuü';
const HARD = 'fstkçşhp';
export const lowerTr = (s) => s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
export const capTr = (s) => {
  if (!s) return s;
  const m = s.match(/^(\[\[)?(.)/s);
  const pre = m[1] ?? '';
  const ch = m[2];
  const up = ch === 'i' ? 'İ' : ch === 'ı' ? 'I' : ch.toUpperCase();
  return pre + up + s.slice(pre.length + 1);
};
function lastVowel(w) {
  const l = lowerTr(w);
  for (let i = l.length - 1; i >= 0; i--) if (VOWELS.includes(l[i])) return l[i];
  return 'e';
}
const endsVowel = (w) => VOWELS.includes(lowerTr(w).slice(-1));
const endsHard = (w) => HARD.includes(lowerTr(w).slice(-1));
function soften(w) {
  // Çok heceli cins isimlerde son p, ç, t, k yumuşar (çocuk → çocuğ-).
  const syll = [...lowerTr(w)].filter((c) => VOWELS.includes(c)).length;
  if (syll < 2) return w;
  const last = w.slice(-1);
  const map = { p: 'b', ç: 'c', t: 'd', k: 'ğ' };
  if (!map[last]) return w;
  if (last === 'k' && w.slice(-2, -1) === 'n') return w.slice(0, -1) + 'g';
  return w.slice(0, -1) + map[last];
}
/** Tek kelimeye hâl eki ekler. kase: abl (-dan), loc (-da), dat (-a), gen (-ın), ins (-la). */
export function suffix(word, kase, proper = false) {
  const v = lastVowel(word);
  const a = 'aıou'.includes(v) ? 'a' : 'e';
  const i4 = 'aı'.includes(v) ? 'ı' : 'ei'.includes(v) ? 'i' : 'ou'.includes(v) ? 'u' : 'ü';
  const ap = proper ? "'" : '';
  const vow = endsVowel(word);
  const stem = proper || vow ? word : soften(word);
  switch (kase) {
    case 'abl': return word + ap + (endsHard(word) ? 't' : 'd') + a + 'n';
    case 'loc': return word + ap + (endsHard(word) ? 't' : 'd') + a;
    case 'dat': return vow ? word + ap + 'y' + a : stem + ap + a;
    case 'gen': return vow ? word + ap + 'n' + i4 + 'n' : stem + ap + i4 + 'n';
    case 'ins': return word + ap + (vow ? 'y' : '') + 'l' + a;
    default: return word;
  }
}
/** Bir ifadenin son kelimesine ek getirir; "[[Ali]]" gibi vurgulu kelimelerde ek vurgunun içine girer. */
function suffixPhrase(phrase, kase, proper) {
  const m = phrase.match(/^(.*?)(\[\[)?([^\s\[\]]+)(\]\])?$/s);
  return m[1] + (m[2] ?? '') + suffix(m[3], kase, proper) + (m[4] ?? '');
}
const NUM_WORDS = ['sıfır', 'bir', 'iki', 'üç', 'dört', 'beş'];
const COUNT_WORDS = { 3: 'Üç', 4: 'Dört', 5: 'Beş' };

// ---------------------------------------------------------------- Temalar
const NAMES = ['Ali', 'Ayşe', 'Mert', 'Zeynep', 'Can', 'Elif', 'Emre', 'Defne', 'Kerem', 'Selin', 'Burak', 'Ece',
  'Umut', 'Duru', 'Efe', 'Nil', 'Arda', 'İpek', 'Ömer', 'Su', 'Yusuf', 'Deniz', 'Cem', 'Ela'];

// who: "o öğeye sahip çocuk", pred: olumlu yüklem, neg: olumsuz yüklem, poss: "her çocuğun ___ farklı"
// {w} yerine öğe kelimesi (gerekirse kase ile çekimlenmiş) gelir.
export const CATS = {
  name: { name: 'İsim', low: 'isim', ico: '👤', proper: true, items: NAMES.map((w) => [w]),
    who: '{w}', pred: '{w}', neg: '{w} değil' },
  pet: { name: 'Hayvan', low: 'hayvan', ico: '🐾', poss: 'beslediği hayvan',
    items: [['kedi', '🐱'], ['köpek', '🐶'], ['kuş', '🐦'], ['balık', '🐟'], ['tavşan', '🐰'], ['kaplumbağa', '🐢'], ['hamster', '🐹']],
    who: '{w} besleyen çocuk', pred: '{w} besliyor', neg: '{w} beslemiyor' },
  bike: { name: 'Bisiklet', low: 'bisiklet rengi', ico: '🚲', poss: 'bisikletinin rengi',
    items: [['kırmızı', '🔴'], ['mavi', '🔵'], ['yeşil', '🟢'], ['sarı', '🟡'], ['mor', '🟣'], ['turuncu', '🟠'], ['siyah', '⚫'], ['beyaz', '⚪']],
    who: '{w} bisikletli çocuk', pred: '{w} bisiklete biniyor', neg: '{w} bisiklete binmiyor', lbl: '{w} bisiklet' },
  fruit: { name: 'Meyve', low: 'meyve', ico: '🧺', poss: 'beslenmeye getirdiği meyve',
    items: [['elma', '🍎'], ['armut', '🍐'], ['muz', '🍌'], ['çilek', '🍓'], ['kiraz', '🍒'], ['üzüm', '🍇'], ['karpuz', '🍉'], ['portakal', '🍊']],
    who: 'beslenmeye {w} getiren çocuk', pred: 'beslenmeye {w} getirdi', neg: 'beslenmeye {w} getirmedi' },
  course: { name: 'Kurs', low: 'kurs', ico: '🎯', poss: 'gittiği kurs',
    items: [['futbol', '⚽'], ['basketbol', '🏀'], ['yüzme', '🏊'], ['satranç', '♟️'], ['resim', '🎨'], ['tenis', '🎾'], ['dans', '💃'], ['jimnastik', '🤸']],
    who: '{w} kursuna giden çocuk', pred: '{w} kursuna gidiyor', neg: '{w} kursuna gitmiyor', lbl: '{w} kursu' },
  trip: { name: 'Tatil', low: 'şehir', ico: '🧳', poss: 'tatilde gittiği şehir', proper: true, kase: 'dat',
    items: [['İzmir'], ['Antalya'], ['Trabzon'], ['Bursa'], ['Ankara'], ['Rize'], ['Kars'], ['Mardin'], ['Van'], ['Konya']],
    who: 'tatilde {w} giden çocuk', pred: 'tatilde {w} gitti', neg: 'tatilde {w} gitmedi' },
  job: { name: 'Meslek', low: 'meslek', ico: '💼', poss: 'büyüyünce olmak istediği meslek',
    items: [['doktor', '🩺'], ['öğretmen', '📚'], ['pilot', '✈️'], ['aşçı', '🍳'], ['itfaiyeci', '🚒'], ['astronot', '🚀'], ['ressam', '🖌️'], ['polis', '👮']],
    who: 'büyüyünce {w} olmak isteyen çocuk', pred: 'büyüyünce {w} olmak istiyor', neg: 'büyüyünce {w} olmak istemiyor' },
  music: { name: 'Enstrüman', low: 'enstrüman', ico: '🎵', poss: 'çaldığı enstrüman',
    items: [['piyano', '🎹'], ['gitar', '🎸'], ['keman', '🎻'], ['davul', '🥁'], ['trompet', '🎺'], ['saksafon', '🎷']],
    who: '{w} çalan çocuk', pred: '{w} çalıyor', neg: '{w} çalmıyor' },
  ice: { name: 'Dondurma', low: 'dondurma', ico: '🍦', poss: 'aldığı dondurma',
    items: [['çikolatalı', '🍫'], ['vanilyalı', '🍨'], ['limonlu', '🍋'], ['fıstıklı', '🥜'], ['karamelli', '🍮'], ['kavunlu', '🍈']],
    who: '{w} dondurma alan çocuk', pred: '{w} dondurma aldı', neg: '{w} dondurma almadı', lbl: '{w} dondurma' },
  toy: { name: 'Oyuncak', low: 'oyuncak', ico: '🧸', poss: 'en sevdiği oyuncak', kase: 'ins',
    items: [['uçurtma', '🪁'], ['yapboz', '🧩'], ['robot', '🤖'], ['ayıcık', '🐻'], ['araba', '🚗'], ['tren', '🚂'], ['yoyo', '🪀']],
    who: 'en çok {w} oynayan çocuk', pred: 'en çok {w} oynuyor', neg: 'en çok {w} oynamıyor' },
  // Sıralı kategoriler: karşılaştırma ipuçlarına izin verir.
  age: { name: 'Yaş', low: 'yaş', ico: '🎂', poss: 'yaşı', ord: true, start: [6, 7, 8, 9],
    word: (v) => String(v), label: (v) => `${v} yaş`, head: (v) => String(v),
    who: '{w} yaşındaki çocuk', pred: '{w} yaşında', neg: '{w} yaşında değil' },
  floor: { name: 'Kat', low: 'kat', ico: '🏢', poss: 'apartmanda oturduğu kat', ord: true, start: [1],
    word: (v) => `${v}.`, label: (v) => `${v}. kat`, head: (v) => `${v}. kat`,
    who: '{w} katta oturan çocuk', pred: '{w} katta oturuyor', neg: '{w} katta oturmuyor' },
  race: { name: 'Yarış', low: 'sıra', ico: '🏁', poss: 'koşu yarışındaki sırası', ord: true, start: [1], noK: true,
    word: (v) => ['birinci', 'ikinci', 'üçüncü', 'dördüncü', 'beşinci'][v - 1], label: (v) => `${v}. sıra`, head: (v) => `${v}.`,
    who: 'yarışı {w} bitiren çocuk', pred: 'yarışı {w} bitirdi', neg: 'yarışı {w} bitirmedi' },
};
const PLAIN_CATS = ['pet', 'bike', 'fruit', 'course', 'trip', 'job', 'music', 'ice', 'toy'];
const ORD_CATS = ['age', 'floor', 'race'];

// ---------------------------------------------------------------- Level ayrıştırma
const CLUE_ARITY = { s: 2, d: 2, D: 2, e: 3, l: 2, g: 2, n: 3, p: 3 };

export function parse(level) {
  const [catStr, clueStr] = level.puzzle.split('|');
  const cats = catStr.split(',').map((part) => {
    const [key, rest] = part.split(':');
    const def = CATS[key];
    if (!def) throw new Error(`Bilinmeyen kategori: ${key}`);
    if (def.ord) return { key, def, start: Number(rest) };
    return { key, def, items: rest.split('.').map(Number) };
  });
  const n = cats[0].items.length;
  for (const c of cats) if (c.def.ord) c.items = Array.from({ length: n }, (_, i) => i);
  const k = cats.length;
  const clues = clueStr ? clueStr.split(';').map(decodeClue) : [];
  const sol = [Array.from({ length: n }, (_, i) => i)];
  if (level.solution) for (const part of level.solution.split('.')) sol.push([...part].map(Number));
  const ord = cats.findIndex((c) => c.def.ord);
  return { n, k, M: n * k, cats, clues, sol, ord };
}
function decodeClue(s) {
  const t = s[0];
  const nums = s.slice(1).split('.').map(Number);
  return { t, a: nums[0], b: nums[1], c: nums[2] };
}
const encodeClue = (cl) => cl.t + [cl.a, cl.b, ...(cl.c !== undefined ? [cl.c] : [])].join('.');
export function serialize(L) {
  const cats = L.cats.map((c) => `${c.key}:${c.def.ord ? c.start : c.items.join('.')}`).join(',');
  return { puzzle: `${cats}|${L.clues.map(encodeClue).join(';')}`, solution: L.sol.slice(1).map((p) => p.join('')).join('.') };
}

// ---------------------------------------------------------------- Metinler
const catOf = (L, g) => Math.floor(g / L.n);
const idxOf = (L, g) => g % L.n;
function rawWord(L, g) {
  const cat = L.cats[catOf(L, g)];
  const i = idxOf(L, g);
  return cat.def.ord ? cat.def.word(cat.start + i) : cat.def.items[cat.items[i]][0];
}
function formWord(L, g) {
  const def = L.cats[catOf(L, g)].def;
  const w = rawWord(L, g);
  return `[[${def.kase ? suffix(w, def.kase, def.proper) : w}]]`;
}
/** Kullanıcı arayüzü için öğe etiketi: { ico, text, head } */
export function itemLabel(L, g) {
  const cat = L.cats[catOf(L, g)];
  const i = idxOf(L, g);
  if (cat.def.ord) { const v = cat.start + i; return { ico: '', text: cat.def.label(v), head: cat.def.head(v), word: cat.def.label(v) }; }
  const [w, ico = ''] = cat.def.items[cat.items[i]];
  return { ico, text: w, head: w, word: cat.def.lbl ? cat.def.lbl.replace('{w}', w) : w };
}
const who = (L, g) => L.cats[catOf(L, g)].def.who.replace('{w}', formWord(L, g));
const pred = (L, g) => L.cats[catOf(L, g)].def.pred.replace('{w}', formWord(L, g));
const neg = (L, g) => L.cats[catOf(L, g)].def.neg.replace('{w}', formWord(L, g));
const eitherPred = (L, b, c) => L.cats[catOf(L, b)].def.pred.replace('{w}', `ya ${formWord(L, b)} ya da ${formWord(L, c)}`);
const isProper = (L, g) => catOf(L, g) === 0;
const whoCase = (L, g, kase) => suffixPhrase(who(L, g), kase, isProper(L, g));

const COMPARE = {
  age: {
    lt: (A, B) => `${A}, ${B.abl} küçük.`, gt: (A, B) => `${A}, ${B.abl} büyük.`,
    up: (A, B, k) => `${A}, ${B.abl} ${NUM_WORDS[k]} yaş büyük.`, down: (A, B, k) => `${A}, ${B.abl} ${NUM_WORDS[k]} yaş küçük.`,
  },
  floor: {
    lt: (A, B) => `${A}, ${B.abl} daha alt katta oturuyor.`, gt: (A, B) => `${A}, ${B.abl} daha üst katta oturuyor.`,
    up: (A, B, k) => (k === 1 ? `${A}, ${B.gen} bir üst katında oturuyor.` : `${A}, ${B.abl} ${NUM_WORDS[k]} kat yukarıda oturuyor.`),
    down: (A, B, k) => (k === 1 ? `${A}, ${B.gen} bir alt katında oturuyor.` : `${A}, ${B.abl} ${NUM_WORDS[k]} kat aşağıda oturuyor.`),
  },
  race: {
    lt: (A, B) => `${A}, yarışı ${B.abl} önce bitirdi.`, gt: (A, B) => `${A}, yarışı ${B.abl} sonra bitirdi.`,
    up: (A, B) => `${A}, yarışı ${B.abl} hemen sonra bitirdi.`, down: (A, B) => `${A}, yarışı ${B.abl} hemen önce bitirdi.`,
  },
};

/** İpucunun Türkçe metni. Değişken kelimeler [[...]] içinde döner (arayüz kalın yazar). */
export function clueText(L, cl) {
  const { t, a, b, c } = cl;
  switch (t) {
    case 's': return capTr(`${who(L, a)} ${pred(L, b)}.`);
    case 'd': return capTr(`${who(L, a)} ${neg(L, b)}.`);
    case 'D': return capTr(`${who(L, a)} ile ${who(L, b)} aynı kişi değil.`);
    case 'e': return capTr(`${who(L, a)} ${eitherPred(L, b, c)}.`);
    default: {
      const cmp = COMPARE[L.cats[L.ord].key];
      const A = capTr(who(L, a));
      const B = { abl: whoCase(L, b, 'abl'), gen: whoCase(L, b, 'gen') };
      if (t === 'l') return cmp.lt(A, B);
      if (t === 'g') return cmp.gt(A, B);
      if (t === 'n') return cmp.up(A, B, c);
      return cmp.down(A, B, c);
    }
  }
}
export const plainText = (s) => s.replace(/\[\[|\]\]/g, '');

export function introText(L) {
  const names = L.cats[0].items.map((i) => CATS.name.items[i][0]);
  const list = names.slice(0, -1).join(', ') + ' ve ' + names[names.length - 1];
  const props = L.cats.slice(1).map((c) => c.def.poss);
  const plist = props.length === 1 ? props[0] : props.slice(0, -1).join(', ') + ' ve ' + props[props.length - 1];
  return `${COUNT_WORDS[L.n]} arkadaş var: ${list}. Her çocuğun ${plist} farklı.`;
}

// ---------------------------------------------------------------- Kurallar ve tam sayım
/** owner[g] = öğenin sahibi olan kişi. Sıralı kategoride kişinin değeri valOf[p]. */
function clueHolds(L, cl, owner, valOf) {
  const oa = owner[cl.a], ob = owner[cl.b];
  switch (cl.t) {
    case 's': return oa === ob;
    case 'd': case 'D': return oa !== ob;
    case 'e': return oa === ob || oa === owner[cl.c];
    case 'l': return valOf[oa] < valOf[ob];
    case 'g': return valOf[oa] > valOf[ob];
    case 'n': return valOf[oa] === valOf[ob] + cl.c;
    case 'p': return valOf[oa] === valOf[ob] - cl.c;
    default: return false;
  }
}
function clueCats(L, cl) {
  const s = new Set([catOf(L, cl.a), catOf(L, cl.b)]);
  if (cl.t === 'e') s.add(catOf(L, cl.c));
  if ('lgnp'.includes(cl.t)) s.add(L.ord);
  return s;
}
function permutations(n) {
  const out = [];
  const rec = (arr, used) => {
    if (arr.length === n) { out.push(arr.slice()); return; }
    for (let i = 0; i < n; i++) if (!used[i]) { used[i] = 1; arr.push(i); rec(arr, used); arr.pop(); used[i] = 0; }
  };
  rec([], []);
  return out;
}
const PERMS = {};

/** Tüm atamaları kategori kategori sistematik olarak dener; çözüm sayısını (limit'e kadar) döndürür. */
export function countSolutions(L, limit = 2) {
  const { n, k } = L;
  const perms = (PERMS[n] ??= permutations(n));
  // Kategori sırası: bağlantısı en çok olan önce.
  const order = [];
  const assigned = new Set([0]);
  const cc = L.clues.map((cl) => clueCats(L, cl));
  while (order.length < k - 1) {
    let best = -1, bestScore = -1;
    for (let c = 1; c < k; c++) {
      if (assigned.has(c)) continue;
      const sc = cc.filter((s) => s.has(c) && [...s].every((x) => x === c || assigned.has(x))).length;
      if (sc > bestScore) { best = c; bestScore = sc; }
    }
    order.push(best); assigned.add(best);
  }
  const checkAt = order.map(() => []);
  L.clues.forEach((cl, i) => {
    const pos = Math.max(...[...cc[i]].map((c) => (c === 0 ? -1 : order.indexOf(c))));
    checkAt[Math.max(pos, 0)].push(cl);
  });
  const owner = new Array(n * k).fill(-1);
  for (let i = 0; i < n; i++) owner[i] = i;
  const valOf = new Array(n).fill(0);
  let count = 0;
  const rec = (d) => {
    if (d === order.length) { count++; return; }
    const c = order[d];
    for (const perm of perms) {
      // perm[p] = kişinin bu kategorideki öğesi
      for (let p = 0; p < n; p++) owner[c * n + perm[p]] = p;
      if (c === L.ord) for (let p = 0; p < n; p++) valOf[p] = perm[p];
      let ok = true;
      for (const cl of checkAt[d]) if (!clueHolds(L, cl, owner, valOf)) { ok = false; break; }
      if (ok) { rec(d + 1); if (count >= limit) return; }
    }
  };
  rec(0);
  return count;
}

function ownerFromSolution(L) {
  const owner = new Array(L.M);
  L.sol.forEach((perm, c) => perm.forEach((item, p) => { owner[c * L.n + item] = p; }));
  const valOf = L.ord >= 0 ? L.sol[L.ord].slice() : [];
  return { owner, valOf };
}

// ---------------------------------------------------------------- Mantıksal (insan tarzı) çözücü
// Durum: M×M simetrik tablo; 0 = boş, 1 = ✗, 2 = ✓ (aynı kategori hücreleri kullanılmaz).
export const TECH_NAMES = ['', 'ipucu', 'satır/sütun', 'aktarım', 'ipucu mantığı', 'çapraz kontrol'];

function techClueDirect(L, st, emit) {
  const M = L.M;
  // Önce olumlu (✓) ipuçları, sonra olumsuzlar.
  for (let i = 0; i < L.clues.length; i++) {
    const cl = L.clues[i];
    if (cl.t === 's' && !st[cl.a * M + cl.b]) if (emit(cl.a, cl.b, 2, { clue: i })) return;
  }
  for (let i = 0; i < L.clues.length; i++) {
    const cl = L.clues[i];
    if ((cl.t === 'd' || cl.t === 'D') && !st[cl.a * M + cl.b]) if (emit(cl.a, cl.b, 1, { clue: i })) return;
  }
}
function techGrid(L, st, emit) {
  const { n, k, M } = L;
  for (let g = 0; g < M; g++) {
    const cg = catOf(L, g);
    for (let c = 0; c < k; c++) {
      if (c === cg) continue;
      let yes = -1, unk = -1, unkCount = 0;
      for (let h = c * n; h < c * n + n; h++) {
        const v = st[g * M + h];
        if (v === 2) yes = h;
        else if (v === 0) { unk = h; unkCount++; }
      }
      if (yes >= 0) {
        for (let h = c * n; h < c * n + n; h++) if (!st[g * M + h]) { if (emit(g, h, 1, { kind: 'rowYes', via: yes })) return; }
      } else if (unkCount === 1) {
        if (emit(g, unk, 2, { kind: 'single' })) return;
      }
    }
  }
}
function techTransfer(L, st, emit) {
  const { n, k, M } = L;
  for (let g1 = 0; g1 < M; g1++) {
    for (let g2 = (catOf(L, g1) + 1) * n; g2 < M; g2++) {
      if (st[g1 * M + g2] !== 2) continue;
      const c1 = catOf(L, g1), c2 = catOf(L, g2);
      for (let c = 0; c < k; c++) {
        if (c === c1 || c === c2) continue;
        for (let h = c * n; h < c * n + n; h++) {
          const x = st[g1 * M + h], y = st[g2 * M + h];
          if (x && !y) { if (emit(g2, h, x, { via: g1, from: h })) return; }
          else if (y && !x) { if (emit(g1, h, y, { via: g2, from: h })) return; }
        }
      }
    }
  }
}
function techClueLogic(L, st, emit) {
  const { n, M } = L;
  const clues = L.clues;
  for (let i = 0; i < clues.length; i++) {
    const cl = clues[i];
    if (cl.t === 'e') {
      const { a, b, c } = cl;
      const cb = catOf(L, b);
      for (let h = cb * n; h < cb * n + n; h++) {
        if (h !== b && h !== c && !st[a * M + h]) if (emit(a, h, 1, { clue: i, kind: 'eitherOther' })) return;
      }
      if (st[a * M + b] === 1 && !st[a * M + c]) { if (emit(a, c, 2, { clue: i, kind: 'eitherLast', via: b })) return; }
      if (st[a * M + c] === 1 && !st[a * M + b]) { if (emit(a, b, 2, { clue: i, kind: 'eitherLast', via: c })) return; }
    } else if ('lgnp'.includes(cl.t)) {
      // Normalize: val(A) - val(B) ∈ { > 0 } ya da { = k }
      let A = cl.a, B = cl.b, k = 0;
      if (cl.t === 'g') { A = cl.b; B = cl.a; }
      if (cl.t === 'n') k = cl.c;
      if (cl.t === 'p') { A = cl.b; B = cl.a; k = cl.c; }
      // l/g: val(A) < val(B);  n/p: val(A) = val(B) + k
      const less = cl.t === 'l' || cl.t === 'g';
      if (catOf(L, A) !== catOf(L, B) && !st[A * M + B]) { if (emit(A, B, 1, { clue: i, kind: 'ordDiff' })) return; }
      const o0 = L.ord * n;
      const okA = (v) => v >= 0 && v < n && st[A * M + o0 + v] !== 1;
      const okB = (v) => v >= 0 && v < n && st[B * M + o0 + v] !== 1;
      for (let v = 0; v < n; v++) {
        if (!st[A * M + o0 + v]) {
          let possible;
          if (less) { possible = false; for (let w = v + 1; w < n; w++) if (okB(w)) { possible = true; break; } }
          else possible = okB(v - k);
          if (!possible) if (emit(A, o0 + v, 1, { clue: i, kind: 'ord', other: B })) return;
        }
        if (!st[B * M + o0 + v]) {
          let possible;
          if (less) { possible = false; for (let w = 0; w < v; w++) if (okA(w)) { possible = true; break; } }
          else possible = okA(v + k);
          if (!possible) if (emit(B, o0 + v, 1, { clue: i, kind: 'ord', other: A })) return;
        }
      }
    }
  }
}
function techCross(L, st, emit) {
  const { n, k, M } = L;
  for (let g1 = 0; g1 < M; g1++) {
    const c1 = catOf(L, g1);
    for (let g2 = (c1 + 1) * n; g2 < M; g2++) {
      if (st[g1 * M + g2]) continue;
      const c2 = catOf(L, g2);
      for (let c = 0; c < k; c++) {
        if (c === c1 || c === c2) continue;
        let common = false;
        for (let h = c * n; h < c * n + n; h++) if (st[g1 * M + h] !== 1 && st[g2 * M + h] !== 1) { common = true; break; }
        if (!common) { if (emit(g1, g2, 1, { kind: 'cross', cat: c })) return; break; }
      }
    }
  }
}
const TECHS = [null, techClueDirect, techGrid, techTransfer, techClueLogic, techCross];

export const newState = (L) => new Uint8Array(L.M * L.M);
const setCell = (L, st, g1, g2, v) => { st[g1 * L.M + g2] = v; st[g2 * L.M + g1] = v; };

/** Durumu tekniklerle sonuna kadar ilerletir. { solved, contradiction, used:[...] } */
export function solveLogic(L, maxTech = 5, st = newState(L)) {
  const used = [0, 0, 0, 0, 0, 0];
  let contradiction = false;
  const M = L.M;
  for (;;) {
    let progressed = false;
    for (let t = 1; t <= maxTech; t++) {
      let cnt = 0;
      TECHS[t](L, st, (g1, g2, v) => {
        const cur = st[g1 * M + g2];
        if (cur === v) return false;
        if (cur) { contradiction = true; return true; }
        setCell(L, st, g1, g2, v);
        cnt++;
        return false;
      });
      if (contradiction) return { solved: false, contradiction, used, st };
      if (cnt) { used[t] += cnt; progressed = true; break; }
    }
    if (!progressed) break;
  }
  let yes = 0;
  for (let i = 0; i < st.length; i++) if (st[i] === 2) yes++;
  const need = L.k * (L.k - 1) * L.n; // simetrik tabloda her ✓ iki kez sayılır
  return { solved: yes === need, contradiction, used, st };
}

/** Verilen durumdan bir sonraki tek mantıklı adımı bulur (Akıllı İpucu). */
export function nextStep(L, st, maxTech = 5) {
  for (let t = 1; t <= maxTech; t++) {
    let found = null;
    TECHS[t](L, st, (g1, g2, v, info) => {
      if (found) return true;
      if (st[g1 * L.M + g2]) return false;
      found = { t, g1, g2, v, ...info };
      return true;
    });
    if (found) return found;
  }
  return null;
}

/** Adımın Türkçe açıklaması (kullanıcıya gösterilir). */
export function explainStep(L, s) {
  return capTr(explainRaw(L, s));
}
function explainRaw(L, s) {
  const W = (g) => itemLabel(L, g).word;
  const pair = `${W(s.g1)} ↔ ${W(s.g2)}`;
  const mark = s.v === 2 ? '✓' : '✗';
  const clueNo = s.clue !== undefined ? `${s.clue + 1}. ipucu` : '';
  switch (s.t) {
    case 1:
      return s.v === 2
        ? `${clueNo} bunu doğrudan söylüyor: ${pair} aynı kişiye ait. Bu kareye ✓ koy.`
        : `${clueNo} bunu doğrudan söylüyor: ${pair} aynı kişiye ait değil. Bu kareye ✗ koy.`;
    case 2: {
      const other = catOf(L, s.g2);
      if (s.kind === 'rowYes') return `${W(s.g1)} ↔ ${W(s.via)} zaten ✓. Bu yüzden ${W(s.g1)} başka bir ${L.cats[other].def.low} ile eşleşemez: ${pair} ✗.`;
      return `${W(s.g1)} için bu tabloda geriye yalnızca ${W(s.g2)} kaldı; diğerlerinin hepsi ✗. Öyleyse ${pair}: ✓.`;
    }
    case 3: {
      const known = s.v === 2 ? 'aynı kişiye ait' : 'aynı kişiye ait değil';
      return `${W(s.g1)} ile ${W(s.via)} aynı kişi (✓). ${W(s.via)} ↔ ${W(s.g2)} ${known} olduğuna göre ${pair} için de aynısı geçerli: ${mark}.`;
    }
    case 4:
      if (s.kind === 'eitherOther') return `${clueNo}: ${W(s.g1)} ancak iki seçenekten biriyle eşleşebilir; ${W(s.g2)} bu seçeneklerden değil. ${pair}: ✗.`;
      if (s.kind === 'eitherLast') return `${clueNo}: ${W(s.g1)} iki seçenekten biriyle eşleşmeli. ${W(s.via)} elendiğine göre geriye ${W(s.g2)} kalıyor: ✓.`;
      if (s.kind === 'ordDiff') return `${clueNo} iki farklı ${L.cats[L.ord].def.low} değerini karşılaştırıyor; yani ${W(s.g1)} ile ${W(s.g2)} farklı çocuklar: ✗.`;
      return `${clueNo}: ${W(s.g1)} için ${W(s.g2)} olamaz; o zaman ${W(s.other)} için ipucuna uyan bir ${L.cats[L.ord].def.low} kalmaz. ✗ koy.`;
    case 5:
      return `${W(s.g1)} ile ${W(s.g2)} için hâlâ mümkün olan ${L.cats[s.cat].def.low} seçenekleri hiç ortak değil. Öyleyse aynı kişi olamazlar: ✗.`;
    default: return '';
  }
}

// ---------------------------------------------------------------- Üretici
function pickTier(diff, index, total) {
  const f = total > 1 ? index / (total - 1) : 0;
  if (diff === 'easy') {
    return { n: 3, attrs: 2, ord: index >= 6, f, maxTech: 4,
      types: { s: 3 - 1.6 * f, d: 2, e: index >= 3 ? 0.6 + 1.2 * f : 0, l: index >= 6 ? 1.5 : 0, n: index >= 13 ? 1 : 0 }, maxK: 1 };
  }
  if (diff === 'medium') {
    return { n: 4, attrs: 3, ord: index >= 2, f, maxTech: 5,
      types: { s: 2 - 1.1 * f, d: 2, e: 1 + f, l: 1.5, n: 1 }, maxK: index >= 10 ? 2 : 1 };
  }
  return { n: 5, attrs: index < Math.ceil(total / 2) ? 3 : 4, ord: true, f, maxTech: 5,
    types: { s: 1.5 - 0.9 * f, d: 2, e: 1.2 + f, l: 1.5, n: 1.2 }, maxK: 3 };
}

function buildRandomLevel(rng, cfg) {
  const { n } = cfg;
  const names = rng.shuffle(NAMES.map((_, i) => i)).slice(0, n);
  const plain = rng.shuffle(PLAIN_CATS.slice());
  const keys = [];
  const nPlain = cfg.attrs - (cfg.ord ? 1 : 0);
  keys.push(...plain.slice(0, nPlain));
  if (cfg.ord) keys.splice(rng.int(0, keys.length), 0, ORD_CATS[rng.int(0, ORD_CATS.length - 1)]);
  const cats = [{ key: 'name', def: CATS.name, items: names }];
  for (const key of keys) {
    const def = CATS[key];
    if (def.ord) cats.push({ key, def, start: def.start[rng.int(0, def.start.length - 1)], items: Array.from({ length: n }, (_, i) => i) });
    else cats.push({ key, def, items: rng.shuffle(def.items.map((_, i) => i)).slice(0, n) });
  }
  const k = cats.length;
  const sol = [Array.from({ length: n }, (_, i) => i)];
  for (let c = 1; c < k; c++) sol.push(rng.shuffle(Array.from({ length: n }, (_, i) => i)));
  const L = { n, k, M: n * k, cats, clues: [], sol, ord: cats.findIndex((c) => c.def.ord) };
  return L;
}

/** Çözüme uyan tüm aday ipuçları (türe göre ağırlıklı). */
function cluePool(L, cfg, rng) {
  const { n, k } = L;
  const { owner, valOf } = ownerFromSolution(L);
  const pool = [];
  const add = (cl, w) => { if (w > 0) pool.push({ cl, w }); };
  const nonOrd = [];
  for (let g = 0; g < L.M; g++) if (catOf(L, g) !== L.ord) nonOrd.push(g);
  for (let a = 0; a < L.M; a++) {
    for (let b = a + 1; b < L.M; b++) {
      if (catOf(L, a) === catOf(L, b)) continue;
      // İsim varsa özne isim olsun.
      const [x, y] = catOf(L, b) === 0 || (catOf(L, a) !== 0 && rng.next() < 0.5) ? [b, a] : [a, b];
      if (owner[a] === owner[b]) add({ t: 's', a: x, b: y }, cfg.types.s);
      else add({ t: rng.next() < 0.3 ? 'D' : 'd', a: x, b: y }, cfg.types.d * 0.35);
    }
  }
  // ya ... ya da ...
  if (cfg.types.e) {
    for (let a = 0; a < L.M; a++) {
      for (let c = 0; c < k; c++) {
        if (c === catOf(L, a)) continue;
        const right = c * n + L.sol[c][owner[a]];
        for (let j = 0; j < n; j++) {
          const wrong = c * n + j;
          if (wrong === right) continue;
          // İsimli öğe varsa özne olarak tercih edilir; sağ taraf iki isim olabilir.
          if (catOf(L, a) !== 0 && c !== 0 && rng.next() < 0.5) continue;
          const [b1, b2] = c === L.ord ? [Math.min(right, wrong), Math.max(right, wrong)] : rng.next() < 0.5 ? [right, wrong] : [wrong, right];
          add({ t: 'e', a, b: b1, c: b2 }, cfg.types.e * 0.25);
        }
      }
    }
  }
  if (L.ord >= 0) {
    const ordKey = L.cats[L.ord].key;
    for (const a of nonOrd) {
      for (const b of nonOrd) {
        if (a === b || owner[a] === owner[b]) continue;
        // Öznenin isim olması tercih edilir; karşılaştırılan iki öğe aynı kişide olmamalı.
        const va = valOf[owner[a]], vb = valOf[owner[b]];
        const wName = catOf(L, a) === 0 ? 1 : 0.6;
        if (va < vb) add({ t: 'l', a, b }, cfg.types.l * 0.12 * wName);
        else add({ t: 'g', a, b }, cfg.types.l * 0.12 * wName);
        const d = va - vb;
        const kk = Math.abs(d);
        if (cfg.types.n && kk <= cfg.maxK && !(CATS[ordKey].noK && kk > 1)) {
          add({ t: d > 0 ? 'n' : 'p', a, b, c: kk }, cfg.types.n * 0.15 * wName);
        }
      }
    }
  }
  return pool;
}

function weightedOrder(rng, pool) {
  return pool
    .map((p) => ({ cl: p.cl, key: Math.pow(rng.next(), 1 / p.w) }))
    .sort((x, y) => y.key - x.key)
    .map((p) => p.cl);
}

function implied(L, st, cl) {
  const M = L.M;
  if (cl.t === 's') return st[cl.a * M + cl.b] === 2;
  if (cl.t === 'd' || cl.t === 'D') return st[cl.a * M + cl.b] !== 0;
  if (cl.t === 'e') return st[cl.a * M + cl.b] !== 0 && st[cl.a * M + cl.c] !== 0;
  // Sıralama: iki tarafın değeri de belliyse gereksiz.
  const o0 = L.ord * L.n;
  let ka = false, kb = false;
  for (let v = 0; v < L.n; v++) { if (st[cl.a * M + o0 + v] === 2) ka = true; if (st[cl.b * M + o0 + v] === 2) kb = true; }
  return ka && kb;
}

/** Bulmacanın zorluk puanı: adım adım çözüp kullanılan teknikleri tartar. */
export function gradeLevel(L, maxTech = 5) {
  const st = newState(L);
  let score = 0;
  const used = [0, 0, 0, 0, 0, 0];
  const W = [0, 0.2, 0.15, 0.35, 1, 2.2];
  for (let guard = 0; guard < 5000; guard++) {
    const s = nextStep(L, st, maxTech);
    if (!s) break;
    used[s.t]++;
    score += W[s.t];
    setCell(L, st, s.g1, s.g2, s.v);
  }
  return { score: Math.round(score * 10) / 10, used, clues: L.clues.length };
}

function makeCandidate(rng, cfg) {
  for (let attempt = 0; attempt < 50; attempt++) {
    const L = buildRandomLevel(rng, cfg);
    const order = weightedOrder(rng, cluePool(L, cfg, rng));
    const st = newState(L);
    let solved = false;
    for (const cl of order) {
      if (implied(L, st, cl)) continue;
      L.clues.push(cl);
      const r = solveLogic(L, cfg.maxTech, st);
      if (r.contradiction) throw new Error('Mantık çözücüsünde çelişki (iç hata)');
      if (r.solved) { solved = true; break; }
    }
    if (!solved) continue;
    // Gereksiz ipuçlarını at (zor seviyelerde önce olumlu ipuçlarını atmayı dene).
    const prio = (cl) => (cl.t === 's' ? (cfg.f > 0.3 || cfg.n > 3 ? 0 : 2) : cl.t === 'e' ? 1 : 1) + rng.next();
    const tryOrder = L.clues.slice().sort((x, y) => prio(x) - prio(y));
    for (const cl of tryOrder) {
      const rest = L.clues.filter((x) => x !== cl);
      const r = solveLogic({ ...L, clues: rest }, cfg.maxTech);
      if (r.solved) L.clues = rest;
    }
    // Karıştır ve doğruluğu teyit et.
    rng.shuffle(L.clues);
    return L;
  }
  throw new Error('Bulmaca üretilemedi');
}

// Zorluk puanı hedefleri (gradeLevel ölçeğinde); her zorlukta level ilerledikçe yükselir.
function targetScore(difficulty, index, total) {
  const f = total > 1 ? index / (total - 1) : 0;
  if (difficulty === 'easy') return 4.6 + 4.6 * f;
  if (difficulty === 'medium') return 19 + 17 * f;
  const half = Math.ceil(total / 2);
  if (index < half) return 38 + 20 * (index / Math.max(1, half - 1));
  return 72 + 33 * ((index - half) / Math.max(1, total - half - 1));
}

export function generateLevel(rng, difficulty, index, total) {
  const cfg = pickTier(difficulty, index, total);
  const target = targetScore(difficulty, index, total);
  let best = null, bestDist = Infinity;
  const tries = difficulty === 'hard' ? 24 : 30;
  for (let i = 0; i < tries; i++) {
    const L = makeCandidate(rng, cfg);
    const g = gradeLevel(L, cfg.maxTech);
    const dist = Math.abs(g.score - target);
    if (dist < bestDist) { best = { L, g }; bestDist = dist; }
  }
  const { puzzle, solution } = serialize(best.L);
  return { puzzle, solution, tier: best.g.score };
}

// ---------------------------------------------------------------- Doğrulayıcı
export function verifyLevel(level) {
  let L;
  try { L = parse(level); } catch (e) { return `Ayrıştırılamadı: ${e.message}`; }
  const { n, k } = L;
  if (n < 3 || n > 5) return `Geçersiz kişi sayısı: ${n}`;
  if (k < 3) return 'En az iki özellik kategorisi olmalı';
  if (new Set(L.cats.map((c) => c.key)).size !== k) return 'Aynı kategori iki kez kullanılmış';
  if (L.cats.filter((c) => c.def.ord).length > 1) return 'Birden fazla sıralı kategori';
  for (const c of L.cats) {
    if (c.items.length !== n || new Set(c.items).size !== n) return `Kategori öğeleri hatalı: ${c.key}`;
    if (!c.def.ord && c.items.some((i) => !(i >= 0 && i < c.def.items.length))) return `Kategori öğesi yok: ${c.key}`;
  }
  if (L.sol.length !== k) return 'Çözüm kategori sayısı hatalı';
  for (const p of L.sol) if (p.length !== n || new Set(p).size !== n || p.some((v) => !(v >= 0 && v < n))) return 'Çözüm bir permütasyon değil';
  if (!L.clues.length) return 'İpucu yok';
  for (const cl of L.clues) {
    if (!(cl.t in CLUE_ARITY)) return `Bilinmeyen ipucu türü: ${cl.t}`;
    const gs = [cl.a, cl.b, ...(cl.t === 'e' ? [cl.c] : [])];
    if (gs.some((g) => !(Number.isInteger(g) && g >= 0 && g < L.M))) return 'İpucu öğesi aralık dışında';
    if ('sdDe'.includes(cl.t) && catOf(L, cl.a) === catOf(L, cl.b)) return 'İpucu aynı kategoriden iki öğeyi bağlıyor';
    if (cl.t === 'e' && (catOf(L, cl.b) !== catOf(L, cl.c) || cl.b === cl.c)) return 'Ya/ya da ipucu hatalı';
    if ('lgnp'.includes(cl.t)) {
      if (L.ord < 0) return 'Sıralı kategori olmadan karşılaştırma ipucu';
      if (catOf(L, cl.a) === L.ord || catOf(L, cl.b) === L.ord || cl.a === cl.b) return 'Karşılaştırma ipucu hatalı';
      if ('np'.includes(cl.t) && !(cl.c >= 1 && cl.c < n)) return 'Fark değeri hatalı';
    }
  }
  const { owner, valOf } = ownerFromSolution(L);
  for (let i = 0; i < L.clues.length; i++) if (!clueHolds(L, L.clues[i], owner, valOf)) return `Kayıtlı çözüm ${i + 1}. ipucunu sağlamıyor`;
  const count = countSolutions(L, 2);
  if (count !== 1) return `Çözüm sayısı ${count} (tam 1 olmalı)`;
  const r = solveLogic(L, 5);
  if (!r.solved) return 'Tahmin yapmadan (mantıkla) çözülemiyor';
  return null;
}
