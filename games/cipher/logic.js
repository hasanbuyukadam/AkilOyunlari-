// Şifre Çözme mantığı — hem tarayıcıda hem Node'da çalışır (DOM yok).
//
// Level biçimi (ortak alanlar):
//   type     : 'symbol' | 'number' | 'caesar' | 'partial' | 'equation' | 'wordbox'
//   display  : mesajın normal yazımı (çözülünce gösterilir)
//   message  : mesajın büyük harfli hâli (toLocaleUpperCase('tr'))
//   text     : kelimeler dizisi; her kelime hücre dizisi. Hücre ya bir şifre sembolü (string)
//              ya da değişmeyen bir işarettir ({ lit: "'" }).
//   solution : { sembol: harf } — mesajdaki her sembolün doğru harfi
//   puzzle   : verilen bilgilerin JSON metni (tekrar kontrolü için)
// Türe özgü alanlar:
//   symbol   : key [[sembol, harf], …] — tam anahtar tablosu
//   number   : table 'full' | 'milestones' (A=1, B=2 … kuralı)
//   caesar   : shift (her harf kaç harf İLERİ kaydırıldı), strip 'numbers' | 'letters'
//   partial  : key (bazı semboller), examples [{ word, cells }] — örnek kelimeler
//   equation : eqs [{ l: [sembol, op, sembol, …], r }], table [[sayı, harf], …], max
//   wordbox  : key (bazı semboller), box [kelime, …] — mesajdaki her kelime kutudandır

import { EASY_SYMBOL, EASY_NUMBER, CAESAR, PARTIAL, EQUATION_WORDS, WORDBOX, VOCAB } from './messages.js';

export const ALPHA = [...'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'];
export const ALPHA_N = ALPHA.length; // 29
const IDX = new Map(ALPHA.map((ch, i) => [ch, i]));
export const isLetter = (ch) => IDX.has(ch);
export const up = (s) => s.toLocaleUpperCase('tr');

export const SYMBOLS = ['🐱', '🐶', '🐸', '🦊', '🐼', '🐵', '🐰', '🐯', '🦁', '🐮', '🐷', '🐔', '🐧', '🐢', '🐙', '🦋',
  '🐝', '🐞', '🌸', '🌻', '🍀', '🌙', '⭐', '🌈', '🔥', '💧', '🎈', '🎁', '🚀', '⚽', '🎵', '🍄', '🐳', '🦉', '🌵',
  '🍦', '🎨', '🔔', '💎', '🍩'];
export const FRUITS = ['🍎', '🍌', '🍇', '🍓', '🍊', '🍐', '🍒', '🍉', '🍋', '🍍'];
export const MILESTONES = [1, 5, 10, 15, 20, 25];
export const EQ_MAX = 12;

const TYPES = ['symbol', 'number', 'caesar', 'partial', 'equation', 'wordbox'];
export const typeOf = (difficulty, index) =>
  ({ easy: ['symbol', 'number'], medium: ['caesar', 'partial'], hard: ['equation', 'wordbox'] })[difficulty][index < 10 ? 0 : 1];

// ---------------------------------------------------------------- Metin yardımcıları
export const lettersOf = (s) => [...s].filter(isLetter);
const distinctLetters = (s) => [...new Set(lettersOf(s))];
const isSym = (cell) => typeof cell === 'string';

/** Büyük harfli mesajı, harf → sembol fonksiyonuyla şifreli kelime/hücre yapısına çevirir. */
export function encode(message, symOf) {
  return message.split(' ').filter(Boolean).map((w) => [...w].map((ch) => (isLetter(ch) ? symOf(ch) : { lit: ch })));
}

/** Mesajdaki semboller, ilk görünme sırasıyla. */
export function msgSyms(text) {
  const out = [];
  const seen = new Set();
  for (const w of text) for (const c of w) if (isSym(c) && !seen.has(c)) { seen.add(c); out.push(c); }
  return out;
}

/** Her kelimenin yalnızca sembol hücreleri (noktalama hariç). */
export const wordSyms = (text) => text.map((w) => w.filter(isSym));

export function givensOf(level) {
  const g = { type: level.type, text: level.text };
  for (const k of ['key', 'table', 'shift', 'strip', 'examples', 'eqs', 'max', 'box']) if (level[k] !== undefined) g[k] = level[k];
  return g;
}

// ---------------------------------------------------------------- Tam sayım (tek çözüm kanıtı)
/**
 * Sembollere harf atamalarının TAMAMINI geri izlemeyle sayar (limit'te durur).
 * domains: Map sembol → izinli harfler; constraints: [{ cells: [sembol], allowed: [kelime] }] —
 * sembol dizisi izinli kelimelerden biri olarak okunmalı. Farklı semboller farklı harftir.
 */
export function enumerateLetters(syms, domains, constraints, limit = 2) {
  const order = [];
  const seen = new Set();
  for (const c of constraints) for (const s of c.cells) if (!seen.has(s)) { seen.add(s); order.push(s); }
  for (const s of syms) if (!seen.has(s)) { seen.add(s); order.push(s); }
  const bySym = new Map(order.map((s) => [s, constraints.filter((c) => c.cells.includes(s))]));
  const asg = new Map();
  const used = new Set();
  const sols = [];
  const fits = (c) => c.allowed.some((w) => w.length === c.cells.length && c.cells.every((s, i) => !asg.has(s) || asg.get(s) === w[i]));
  const rec = (k) => {
    if (k === order.length) { sols.push(Object.fromEntries(asg)); return; }
    const s = order[k];
    for (const L of domains.get(s) ?? []) {
      if (used.has(L)) continue;
      asg.set(s, L); used.add(L);
      if (bySym.get(s).every(fits)) rec(k + 1);
      asg.delete(s); used.delete(L);
      if (sols.length >= limit) return;
    }
  };
  rec(0);
  return sols;
}

/** Bir denklemin sol tarafını soldan sağa hesaplar (her denklemde tek tür işlem vardır). */
export function evalSide(l, val) {
  let v = val(l[0]);
  for (let i = 1; i < l.length; i += 2) {
    const b = val(l[i + 1]);
    if (l[i] === '+') v += b;
    else if (l[i] === '-') v -= b;
    else if (l[i] === 'x') v *= b;
    else return NaN;
  }
  return v;
}
export const eqFruits = (eq) => [...new Set(eq.l.filter((_, i) => i % 2 === 0))];

/** Meyvelere 1..max değerlerinin tüm atamalarını sayar (aynı değer serbest; limit'te durur). */
export function enumerateValues(fruits, eqs, max, limit = 2) {
  const val = new Map();
  const sols = [];
  const byF = new Map(fruits.map((f) => [f, eqs.filter((e) => eqFruits(e).includes(f))]));
  const ok = (e) => !eqFruits(e).every((f) => val.has(f)) || evalSide(e.l, (f) => val.get(f)) === e.r;
  const rec = (k) => {
    if (k === fruits.length) { sols.push(Object.fromEntries(val)); return; }
    const f = fruits[k];
    for (let v = 1; v <= max; v++) {
      val.set(f, v);
      if (byF.get(f).every(ok)) rec(k + 1);
      val.delete(f);
      if (sols.length >= limit) return;
    }
  };
  rec(0);
  return sols;
}

// ---------------------------------------------------------------- Kurallardan alan kümeleri
function domainsFor(level) {
  const syms = msgSyms(level.text);
  const all = new Set(syms);
  const domains = new Map();
  const constraints = [];
  const keyMap = new Map((level.key ?? []).map(([s, L]) => [s, L]));
  const keyLetters = new Set((level.key ?? []).map(([, L]) => L));
  const rest = ALPHA.filter((L) => !keyLetters.has(L));
  switch (level.type) {
    case 'symbol':
      for (const s of syms) domains.set(s, (level.key ?? []).filter(([k]) => k === s).map(([, L]) => L));
      break;
    case 'number':
      for (const s of syms) domains.set(s, ALPHA.filter((_, i) => String(i + 1) === s));
      break;
    case 'caesar':
      for (const s of syms) domains.set(s, ALPHA.filter((_, i) => ALPHA[(i + level.shift) % ALPHA_N] === s));
      break;
    case 'partial':
    case 'wordbox': {
      if (level.type === 'partial') {
        for (const ex of level.examples) {
          constraints.push({ cells: ex.cells, allowed: [ex.word] });
          ex.cells.forEach((s) => all.add(s));
        }
      } else {
        for (const cells of wordSyms(level.text)) constraints.push({ cells, allowed: level.box });
      }
      for (const s of all) domains.set(s, keyMap.has(s) ? [keyMap.get(s)] : rest);
      break;
    }
    default:
      return null;
  }
  return { syms: [...all], domains, constraints };
}

// ---------------------------------------------------------------- Mantıklı çözücüler (ipucu + derecelendirme)
/** Kelime kutusu: bilinenlerle tek bir kutu kelimesine uyan şifreli kelimeyi bulur. */
export function wordCandidates(cells, box, known) {
  const usedL = new Set(known.values());
  return box.filter((w) => {
    if (w.length !== cells.length) return false;
    const loc = new Map();
    const locL = new Set();
    for (let i = 0; i < cells.length; i++) {
      const s = cells[i], L = w[i];
      if (known.has(s)) { if (known.get(s) !== L) return false; continue; }
      if (usedL.has(L)) return false;
      if (loc.has(s)) { if (loc.get(s) !== L) return false; continue; }
      if (locL.has(L)) return false;
      loc.set(s, L); locL.add(L);
    }
    return true;
  });
}

export function wordboxStep(level, known) {
  const words = wordSyms(level.text);
  for (let wi = 0; wi < words.length; wi++) {
    const cells = words[wi];
    if (cells.every((s) => known.has(s))) continue;
    const cands = wordCandidates(cells, level.box, known);
    if (cands.length === 1) {
      const w = cands[0];
      const assign = [];
      cells.forEach((s, i) => { if (!known.has(s) && !assign.some(([t]) => t === s)) assign.push([s, w[i]]); });
      return { kind: 'word', wi, word: w, assign };
    }
  }
  return null;
}

export function equationStep(level, vals) {
  const unk = (e) => eqFruits(e).filter((f) => !vals.has(f));
  const get = (tmp) => (f) => (vals.has(f) ? vals.get(f) : tmp.get(f));
  for (let i = 0; i < level.eqs.length; i++) {
    const e = level.eqs[i];
    const u = unk(e);
    if (u.length !== 1) continue;
    const hits = [];
    for (let v = 1; v <= level.max; v++) if (evalSide(e.l, get(new Map([[u[0], v]]))) === e.r) hits.push(v);
    if (hits.length === 1) return { kind: 'single', eqs: [i], assign: [[u[0], hits[0]]] };
  }
  for (let i = 0; i < level.eqs.length; i++) {
    for (let j = i + 1; j < level.eqs.length; j++) {
      const ui = unk(level.eqs[i]), uj = unk(level.eqs[j]);
      const U = [...new Set([...ui, ...uj])];
      if (U.length !== 2 || !ui.length || !uj.length) continue;
      const hits = [];
      for (let a = 1; a <= level.max; a++) {
        for (let b = 1; b <= level.max; b++) {
          const g = get(new Map([[U[0], a], [U[1], b]]));
          if (evalSide(level.eqs[i].l, g) === level.eqs[i].r && evalSide(level.eqs[j].l, g) === level.eqs[j].r) hits.push([a, b]);
        }
      }
      if (hits.length === 1) return { kind: 'pair', eqs: [i, j], assign: [[U[0], hits[0][0]], [U[1], hits[0][1]]] };
    }
  }
  return null;
}

/** Mantıklı çözücüyle baştan sona çözer; tahmin gerekmeden bitiyorsa adım sayısını döndürür. */
export function logicalSolve(level) {
  const syms = msgSyms(level.text);
  if (level.type === 'partial') {
    const known = new Set((level.key ?? []).map(([s]) => s));
    for (const s of syms) if (!known.has(s) && !level.examples.some((ex) => ex.cells.includes(s))) return { ok: false };
    return { ok: true, steps: syms.length - known.size };
  }
  if (level.type === 'wordbox') {
    const known = new Map(level.key);
    let steps = 0;
    while (!syms.every((s) => known.has(s))) {
      const st = wordboxStep(level, known);
      if (!st) return { ok: false, steps };
      st.assign.forEach(([s, L]) => known.set(s, L));
      steps++;
    }
    return { ok: true, steps, known };
  }
  if (level.type === 'equation') {
    const vals = new Map();
    const fr = [...new Set(level.eqs.flatMap(eqFruits))];
    let steps = 0;
    while (!fr.every((f) => vals.has(f))) {
      const st = equationStep(level, vals);
      if (!st) return { ok: false, steps };
      st.assign.forEach(([f, v]) => vals.set(f, v));
      steps++;
    }
    return { ok: true, steps, vals };
  }
  return { ok: true, steps: syms.length };
}

// ---------------------------------------------------------------- Doğrulama
export function verifyLevel(level) {
  if (!TYPES.includes(level?.type)) return 'Bilinmeyen tür';
  const { text, solution, message } = level;
  if (!Array.isArray(text) || !text.length || !solution || typeof message !== 'string') return 'Eksik alan';
  if (message !== up(level.display ?? '')) return 'Mesaj ile görünen metin uyuşmuyor';
  if (level.puzzle !== JSON.stringify(givensOf(level))) return 'puzzle alanı verilenlerle uyuşmuyor';

  // 1) Şifreli metin, kayıtlı çözümle tam olarak mesajı veriyor mu?
  const syms = msgSyms(text);
  if (Object.keys(solution).length !== syms.length || syms.some((s) => !isLetter(solution[s]))) return 'Çözüm her sembolü kapsamıyor';
  const decoded = text.map((w) => w.map((c) => (isSym(c) ? solution[c] : c.lit)).join('')).join(' ');
  if (decoded !== message) return 'Çözüm mesajı vermiyor';
  if (new Set(syms.map((s) => solution[s])).size !== syms.length) return 'İki sembol aynı harfe gidiyor';
  if (text.some((w) => w.some((c) => !isSym(c) && (typeof c?.lit !== 'string' || isLetter(c.lit) || c.lit === ' ')))) return 'Geçersiz işaret';

  // 2) Türe özgü verilenler tutarlı mı + tam sayımla tek çözüm
  if (level.type === 'equation') {
    const { eqs, table, max } = level;
    if (max !== EQ_MAX || table.length !== max || table.some(([n], i) => n !== i + 1)) return 'Sayı tablosu hatalı';
    if (new Set(table.map(([, L]) => L)).size !== max || table.some(([, L]) => !isLetter(L))) return 'Tablo harfleri farklı değil';
    const fruits = [...new Set(eqs.flatMap(eqFruits))];
    if (fruits.length !== syms.length || syms.some((s) => !fruits.includes(s))) return 'Denklemler mesajdaki sembollerle uyuşmuyor';
    if (eqs.some((e) => e.l.length % 2 !== 1 || e.l.some((t, i) => (i % 2 ? !['+', '-', 'x'].includes(t) : !syms.includes(t))) || !Number.isInteger(e.r))) return 'Denklem biçimi hatalı';
    if (eqs.some((e) => e.l.filter((t, i) => i % 2).some((op) => op !== e.l[1]))) return 'Denklemde karışık işlem var';
    const sols = enumerateValues(fruits, eqs, max, 2);
    if (sols.length !== 1) return `Denklemlerin ${sols.length} çözümü var`;
    for (const f of fruits) if (table[sols[0][f] - 1][1] !== solution[f]) return 'Denklem çözümü mesajla uyuşmuyor';
  } else {
    if (level.type === 'symbol' || level.type === 'partial' || level.type === 'wordbox') {
      const key = level.key ?? [];
      if (new Set(key.map(([s]) => s)).size !== key.length || new Set(key.map(([, L]) => L)).size !== key.length) return 'Anahtar tablosu tekrar içeriyor';
      for (const [s, L] of key) if (syms.includes(s) && solution[s] !== L) return 'Anahtar çözümle çelişiyor';
    }
    if (level.type === 'caesar' && !(Number.isInteger(level.shift) && level.shift >= 1 && level.shift < ALPHA_N)) return 'Kaydırma hatalı';
    if (level.type === 'partial') {
      for (const ex of level.examples) {
        if (ex.cells.length !== ex.word.length || ex.cells.some((s, i) => syms.includes(s) && solution[s] !== ex.word[i])) return 'Örnek kelime çözümle çelişiyor';
      }
    }
    if (level.type === 'wordbox') {
      if (new Set(level.box).size !== level.box.length) return 'Kelime kutusu tekrar içeriyor';
      if (level.box.some((w) => !lettersOf(w).length || lettersOf(w).length !== w.length)) return 'Kutuda geçersiz kelime';
    }
    const D = domainsFor(level);
    const sols = enumerateLetters(D.syms, D.domains, D.constraints, 2);
    if (sols.length !== 1) return sols.length === 0 ? 'Hiç çözüm yok' : 'Birden fazla çözüm var';
    for (const s of syms) if (sols[0][s] !== solution[s]) return 'Tek çözüm kayıtlı çözümle aynı değil';
  }

  // 3) Tahminsiz, adım adım mantıkla çözülebiliyor mu?
  if (!logicalSolve(level).ok) return 'Mantıklı adımlarla çözülemiyor';
  return null;
}

// ---------------------------------------------------------------- Üretici
function pickMessage(pool, i, rng) {
  const sorted = pool.map((s, k) => ({ s, k, n: lettersOf(up(s)).length })).sort((a, b) => a.n - b.n || a.k - b.k);
  const per = Math.floor(sorted.length / 10);
  return sorted[i * per + rng.int(0, per - 1)].s;
}

const ALL_WORDS = (() => {
  const set = new Set();
  for (const pool of [EASY_SYMBOL, EASY_NUMBER, CAESAR, PARTIAL, EQUATION_WORDS, WORDBOX, VOCAB]) {
    for (const s of pool) for (const w of up(s).split(/[^A-ZÇĞIİÖŞÜ]+/)) if (w.length >= 2 && lettersOf(w).length === w.length) set.add(w);
  }
  return [...set].sort();
})();

const EXAMPLE_WORDS = [...new Set([...VOCAB, ...EQUATION_WORDS].map(up))].filter((w) => w.length >= 3 && w.length <= 7);

function finish(level) {
  level.puzzle = JSON.stringify(givensOf(level));
  return level;
}

function randomLetterMap(rng, pool) {
  const symbols = rng.shuffle(pool.slice());
  const order = rng.shuffle(ALPHA.slice());
  return new Map(order.map((L, i) => [L, symbols[i]]));
}

function baseLevel(type, display, map) {
  const message = up(display);
  const text = encode(message, (ch) => map.get(ch));
  const solution = {};
  for (const ch of distinctLetters(message)) solution[map.get(ch)] = ch;
  return { type, display, message, text, solution };
}

function genSymbol(rng, i) {
  const display = pickMessage(EASY_SYMBOL, i, rng);
  const map = randomLetterMap(rng, SYMBOLS);
  const level = baseLevel('symbol', display, map);
  const used = distinctLetters(level.message);
  const decoys = rng.shuffle(ALPHA.filter((L) => !used.includes(L))).slice(0, i < 3 ? 0 : Math.min(2 + i - 3, 8));
  level.key = [...used, ...decoys].sort((a, b) => IDX.get(a) - IDX.get(b)).map((L) => [map.get(L), L]);
  return finish(level);
}

function genNumber(rng, j) {
  const display = pickMessage(EASY_NUMBER, j, rng);
  const map = new Map(ALPHA.map((L, i) => [L, String(i + 1)]));
  const level = baseLevel('number', display, map);
  level.table = j < 5 ? 'full' : 'milestones';
  return finish(level);
}

function genCaesar(rng, j) {
  const display = pickMessage(CAESAR, j, rng);
  const shift = [1, 2, 2, 3, 3, 4, 4, 5, 6, 7][j];
  const map = new Map(ALPHA.map((L, i) => [L, ALPHA[(i + shift) % ALPHA_N]]));
  const level = baseLevel('caesar', display, map);
  level.shift = shift;
  level.strip = j < 5 ? 'numbers' : 'letters';
  return finish(level);
}

function genPartial(rng, j) {
  const display = pickMessage(PARTIAL, j, rng);
  const map = randomLetterMap(rng, SYMBOLS);
  const level = baseLevel('partial', display, map);
  const letters = rng.shuffle(distinctLetters(level.message));
  const knownN = Math.max(2, Math.round(letters.length * (0.6 - 0.035 * j)));
  const known = new Set(letters.slice(0, knownN));
  const msgWords = new Set(up(display).split(/[^A-ZÇĞIİÖŞÜ]+/));
  const pool = rng.shuffle(EXAMPLE_WORDS.filter((w) => !msgWords.has(w)));
  const need = new Set(letters.filter((L) => !known.has(L)));
  const examples = [];
  while (need.size && examples.length < 4) {
    let best = null, bestScore = 0;
    for (const w of pool) {
      if (examples.includes(w)) continue;
      const gain = new Set(lettersOf(w).filter((L) => need.has(L))).size;
      const score = gain * 10 - w.length;
      if (gain && score > bestScore) { best = w; bestScore = score; }
    }
    if (!best) break;
    examples.push(best);
    for (const L of best) need.delete(L);
  }
  for (const L of need) known.add(L); // örneklerle bulunamayan harfler anahtara eklenir
  level.key = [...known].sort((a, b) => IDX.get(a) - IDX.get(b)).map((L) => [map.get(L), L]);
  level.examples = rng.shuffle(examples).map((w) => ({ word: w, cells: [...w].map((L) => map.get(L)) }));
  return finish(level);
}

function genWordbox(rng, j) {
  const display = pickMessage(WORDBOX, j, rng);
  const map = randomLetterMap(rng, SYMBOLS);
  const level = baseLevel('wordbox', display, map);
  const words = [...new Set(level.text.map((w) => w.filter(isSym).map((s) => level.solution[s]).join('')))];
  const lens = new Set(words.map((w) => w.length));
  const decoyN = 3 + Math.floor(j / 2);
  // Şaşırtmacalar: mesaj kelimeleriyle aynı uzunlukta ve onlara benzeyen (aynı yerde aynı harf,
  // aynı harf tekrarı kalıbı) kelimeler seçilir; böylece yalnızca uzunluğa bakmak yetmez.
  const shape = (w) => [...w].map((ch) => w.indexOf(ch)).join(',');
  const sim = (a, b) => [...a].filter((ch, i) => b[i] === ch).length + (shape(a) === shape(b) ? 2 : 0);
  const cand = rng.shuffle(ALL_WORDS.filter((w) => lens.has(w.length) && !words.includes(w)));
  const targets = rng.shuffle(words.filter((w) => w.length >= 3));
  const decoys = [];
  for (let k = 0; decoys.length < decoyN && k < decoyN * 3; k++) {
    const t = targets[k % targets.length];
    let best = null, bestS = -1;
    for (const w of cand) {
      if (w.length !== t.length || decoys.includes(w)) continue;
      const sc = sim(w, t);
      if (sc > bestS) { best = w; bestS = sc; }
    }
    if (best) decoys.push(best);
  }
  level.box = [...words, ...decoys].sort((a, b) => a.localeCompare(b, 'tr'));
  const letters = rng.shuffle(distinctLetters(level.message));
  const target = Math.max(2, Math.round(letters.length * (0.42 - 0.025 * j)));
  const known = letters.slice(0, target);
  for (;;) {
    level.key = known.slice().sort((a, b) => IDX.get(a) - IDX.get(b)).map((L) => [map.get(L), L]);
    if (logicalSolve(level).ok) {
      const D = domainsFor(level);
      if (enumerateLetters(D.syms, D.domains, D.constraints, 2).length === 1) break;
    }
    known.push(letters[known.length]);
  }
  // Zorlaştırma: ileri levellerde, mantıkla tek çözüm bozulmadan çıkarılabilen harfleri anahtardan çıkar.
  if (j >= 4) {
    for (const L of rng.shuffle(known.slice())) {
      if (known.length <= 2) break;
      const trial = known.filter((x) => x !== L);
      level.key = trial.slice().sort((a, b) => IDX.get(a) - IDX.get(b)).map((x) => [map.get(x), x]);
      const D = domainsFor(level);
      if (logicalSolve(level).ok && enumerateLetters(D.syms, D.domains, D.constraints, 2).length === 1) known.splice(known.indexOf(L), 1);
    }
    level.key = known.slice().sort((a, b) => IDX.get(a) - IDX.get(b)).map((x) => [map.get(x), x]);
  }
  return finish(level);
}

function genEquation(rng, j) {
  const counts = [3, 3, 4, 4, 4, 5, 5, 5, 6, 6];
  const n = counts[j];
  // Aynı harf sayısına sahip levellerin her biri havuzun farklı bir dilimini kullanır (tekrar yok).
  const same = counts.map((c, k) => [c, k]).filter(([c]) => c === n).map(([, k]) => k);
  const slot = same.indexOf(j);
  const pool = EQUATION_WORDS.filter((w) => distinctLetters(up(w)).length === n).filter((_, k) => k % same.length === slot);
  const display = pool[rng.int(0, pool.length - 1)];
  const message = up(display);
  const letters = distinctLetters(message);
  const fruitsPool = rng.shuffle(FRUITS.slice());
  const map = new Map(letters.map((L, i) => [L, fruitsPool[i]]));
  const level = baseLevel('equation', display, map);
  const ops = j < 2 ? ['+'] : j < 4 ? ['+', '-'] : ['+', '-', 'x'];
  for (let attempt = 0; ; attempt++) {
    const vals = rng.shuffle(Array.from({ length: EQ_MAX }, (_, k) => k + 1)).slice(0, n);
    const order = rng.shuffle(letters.slice()).map((L) => map.get(L));
    const V = new Map(order.map((f, k) => [f, vals[k]]));
    const eqs = [];
    const f0 = order[0], v0 = V.get(f0);
    if (j >= 5 && v0 <= 6 && rng.next() < 0.5) eqs.push({ l: [f0, '+', f0, '+', f0], r: 3 * v0 });
    else if (j >= 4 && v0 >= 3 && v0 <= 9 && rng.next() < 0.4) eqs.push({ l: [f0, 'x', f0], r: v0 * v0 });
    else eqs.push({ l: [f0, '+', f0], r: 2 * v0 });
    let usedPair = false;
    for (let k = 1; k < n; k++) {
      const fk = order[k], vk = V.get(fk);
      if (j >= 6 && !usedPair && k < n - 1 && rng.next() < 0.6) {
        const fn = order[k + 1], vn = V.get(fn);
        const [big, small] = vk > vn ? [fk, fn] : [fn, fk];
        eqs.push({ l: [fk, '+', fn], r: vk + vn });
        eqs.push({ l: [big, '-', small], r: Math.abs(vk - vn) });
        usedPair = true;
        k++;
        continue;
      }
      const fj = order[rng.int(0, k - 1)], vj = V.get(fj);
      const op = ops[rng.int(0, ops.length - 1)];
      if (op === '+') {
        if (j >= 3 && rng.next() < 0.3) eqs.push({ l: [fk, '+', fk, '+', fj], r: 2 * vk + vj });
        else eqs.push(rng.next() < 0.5 ? { l: [fk, '+', fj], r: vk + vj } : { l: [fj, '+', fk], r: vk + vj });
      } else if (op === '-') {
        eqs.push(vk > vj ? { l: [fk, '-', fj], r: vk - vj } : { l: [fj, '-', fk], r: vj - vk });
      } else if (vk * vj <= 50) {
        eqs.push(rng.next() < 0.5 ? { l: [fk, 'x', fj], r: vk * vj } : { l: [fj, 'x', fk], r: vk * vj });
      } else {
        eqs.push({ l: [fk, '+', fj], r: vk + vj });
      }
    }
    level.eqs = j >= 3 ? rng.shuffle(eqs) : eqs;
    level.max = EQ_MAX;
    const others = rng.shuffle(ALPHA.filter((L) => !letters.includes(L)));
    const table = [];
    let oi = 0;
    for (let num = 1; num <= EQ_MAX; num++) {
      const f = order.find((x) => V.get(x) === num);
      table.push([num, f ? level.solution[f] : others[oi++]]);
    }
    level.table = table;
    const fr = [...new Set(level.eqs.flatMap(eqFruits))];
    if (enumerateValues(fr, level.eqs, EQ_MAX, 2).length === 1 && logicalSolve(level).ok) break;
    if (attempt > 200) throw new Error('Denklem üretilemedi');
  }
  return finish(level);
}

export function generateLevel(rng, difficulty, index) {
  const j = index % 10;
  switch (typeOf(difficulty, index)) {
    case 'symbol': return genSymbol(rng, j);
    case 'number': return genNumber(rng, j);
    case 'caesar': return genCaesar(rng, j);
    case 'partial': return genPartial(rng, j);
    case 'equation': return genEquation(rng, j);
    default: return genWordbox(rng, j);
  }
}

// ---------------------------------------------------------------- Akıllı ipucu (arayüz kullanır)
const OPS = { '+': '+', '-': '−', x: '×' };
export const eqText = (e, val = (f) => f) => `${e.l.map((t, i) => (i % 2 ? OPS[t] : val(t))).join(' ')} = ${e.r}`;

/**
 * Sıradaki mantıklı adımı açıklar. entries: { sembol: harf } (oyuncunun yazdıkları).
 * Dönen: { syms: [vurgulanacak semboller], msg, key: [sembol], eqs: [no], example: no, word: no } ya da null.
 */
export function nextHint(level, entries, prefSym) {
  const syms = msgSyms(level.text);
  const sol = level.solution;
  const correct = (s) => entries[s] === sol[s];
  const pending = syms.filter((s) => !correct(s));
  if (!pending.length) return null;
  const target = pending.includes(prefSym) ? prefSym : pending[0];
  const L = sol[target];
  switch (level.type) {
    case 'symbol':
      return { syms: [target], key: [target], msg: `${target} sembolünü anahtar tablosunda bul: karşısında “${L}” harfi yazıyor. Bu sembolün olduğu bütün kutulara ${L} gelir.` };
    case 'number': {
      const n = Number(target);
      if (level.table === 'full') return { syms: [target], key: [target], msg: `${n} sayısı alfabenin ${n}. harfi demek. Tabloda ${n} numaranın üstünde “${L}” yazıyor.` };
      const m = [...MILESTONES].reverse().find((x) => x <= n);
      if (m === n) return { syms: [target], key: [target], msg: `Tabloda ${n}. harf işaretli: “${L}”. Yani ${n} = ${L}.` };
      const chain = Array.from({ length: n - m }, (_, k) => `${ALPHA[m + k]} (${m + k + 1})`).join(', ');
      return { syms: [target], key: [String(m), target], msg: `Tabloda ${m}. harf “${ALPHA[m - 1]}”. Oradan ${n - m} harf ileri say: ${chain}. Yani ${n} = ${L}.` };
    }
    case 'caesar': {
      const k = level.shift;
      const i0 = IDX.get(target);
      const chain = [target, ...Array.from({ length: k }, (_, t) => ALPHA[(i0 - t - 1 + ALPHA_N * 2) % ALPHA_N])].join(' → ');
      const wrap = i0 - k < 0 ? ' (A’dan geriye sayınca alfabenin sonuna, Z’ye dönülür.)' : '';
      return { syms: [target], key: [target, L], msg: `Sezar: her harf ${k} ileri kaydırılmıştı, sen ${k} harf geri say: ${chain}. Yani “${target}” aslında “${L}”.${wrap}` };
    }
    case 'partial': {
      const keyHas = (level.key ?? []).some(([s]) => s === target);
      if (keyHas) return { syms: [target], key: [target], msg: `${target} anahtar tablosunda var: ${target} = ${L}.` };
      const ei = level.examples.findIndex((ex) => ex.cells.includes(target));
      const ex = level.examples[ei];
      const pos = ex.cells.indexOf(target) + 1;
      return { syms: [target], example: ei, msg: `${target} sembolü “${ex.word}” örnek kelimesinde ${pos}. sırada. ${ex.word} kelimesinin ${pos}. harfi “${L}”. Demek ki ${target} = ${L}.` };
    }
    case 'equation': {
      const table = new Map(level.table.map(([n, ch]) => [ch, n]));
      const vals = new Map(syms.filter(correct).map((s) => [s, table.get(sol[s])]));
      const st = equationStep(level, vals);
      if (!st) return null;
      const show = (f) => (vals.has(f) ? String(vals.get(f)) : f);
      const res = st.assign.map(([f, v]) => `${f} = ${v}`).join(', ');
      const look = st.assign.map(([f, v]) => `${v} → ${sol[f]}`).join(', ');
      let msg;
      if (st.kind === 'single') {
        const e = level.eqs[st.eqs[0]];
        const known = eqFruits(e).some((f) => vals.has(f));
        msg = `${eqText(e)} denklemine bak.${known ? ` Bildiğin değerleri yerine koy: ${eqText(e, show)}.` : ''} Buradan ${res} bulunur. Sayı tablosunda ${look}.`;
      } else {
        const [a, b] = st.eqs.map((x) => level.eqs[x]);
        msg = `${eqText(a, show)} ve ${eqText(b, show)} denklemlerini birlikte düşün: ikisini de sağlayan tek sayı çifti ${res}. Sayı tablosunda ${look}.`;
      }
      return { syms: st.assign.map(([f]) => f), eqs: st.eqs, msg };
    }
    case 'wordbox': {
      const keyS = (level.key ?? []).find(([s]) => !correct(s));
      if (keyS) return { syms: [keyS[0]], key: [keyS[0]], msg: `${keyS[0]} anahtar tablosunda var: ${keyS[0]} = ${keyS[1]}.` };
      const known = new Map([...level.key, ...syms.filter(correct).map((s) => [s, sol[s]])]);
      const st = wordboxStep(level, known);
      if (!st) return null;
      const cells = wordSyms(level.text)[st.wi];
      const pattern = cells.map((s) => (known.has(s) ? known.get(s) : '_')).join(' ');
      const res = st.assign.map(([s, ch]) => `${s} = ${ch}`).join(', ');
      return { syms: st.assign.map(([s]) => s), word: st.wi, box: st.word, msg: `${st.wi + 1}. kelimeye bak: ${cells.length} harfli ve bildiğin harflerle “${pattern}” kalıbında. Kelime kutusunda bu kalıba uyan tek kelime “${st.word}”. Böylece ${res}.` };
    }
    default:
      return null;
  }
}
