// Kuralları ve kutucukları çocuk diliyle Türkçe anlatan yardımcılar (saf, DOM yok).
import { ATTRS, decode, evalSeq, evalMat } from './logic.js';

export const SHAPE_NAME = {
  circle: 'daire', triangle: 'üçgen', square: 'kare', pentagon: 'beşgen', hexagon: 'altıgen',
  heptagon: 'yedigen', octagon: 'sekizgen', star: 'yıldız', heart: 'kalp', arrow: 'ok',
};
export const COLOR_NAME = { red: 'kırmızı', blue: 'mavi', green: 'yeşil', yellow: 'sarı', purple: 'mor', orange: 'turuncu' };
const SIZE_NAME = ['küçük', 'orta', 'büyük'];
const FILL_NAME = ['dolu', 'boş', 'çizgili'];
const DOT_NAME = ['sol üst', 'sağ üst', 'sağ alt', 'sol alt'];
const DIR_NAME = ['yukarı', 'sağ üste', 'sağa', 'sağ alta', 'aşağı', 'sol alta', 'sola', 'sol üste'];
export const ATTR_NAME = { s: 'şekil', c: 'renk', z: 'boyut', n: 'şekil sayısı', f: 'boyama', r: 'yön', d: 'noktanın yeri' };

export function valueName(attr, v) {
  switch (attr) {
    case 's': return SHAPE_NAME[v];
    case 'c': return COLOR_NAME[v];
    case 'z': return SIZE_NAME[v];
    case 'n': return String(v);
    case 'f': return FILL_NAME[v];
    case 'r': return DIR_NAME[v / 45];
    case 'd': return v < 0 ? 'yok' : DOT_NAME[v];
    default: return String(v);
  }
}
// Kısa etiket (Kuralı Göster rozetleri için)
export function shortLabel(attr, v, rule) {
  if (attr === 'n') return `${v} tane`;
  if (attr === 'r') return ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][v / 45];
  if (attr === 'd') return v < 0 ? '—' : ['↖ köşe', '↗ köşe', '↘ köşe', '↙ köşe'][v];
  if (attr === 's' && rule && ['step', 'rprog', 'cprog'].includes(rule.t) && ['triangle', 'square', 'pentagon', 'hexagon', 'heptagon', 'octagon'].includes(v)) {
    return `${SHAPE_NAME[v]} (${{ triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8 }[v]})`;
  }
  return valueName(attr, v);
}

export const varyingAttrs = (q) => ATTRS.filter((a) => q.rules[a].t !== 'const');

export function joinTr(list) {
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} ve ${list[list.length - 1]}`;
}

// "3 tane küçük çizgili mavi üçgen (ucu sağa bakıyor), nokta sağ üst köşede"
export function tileName(tile, attrs = ATTRS) {
  const t = typeof tile === 'string' ? decode(tile) : tile;
  const show = new Set(attrs);
  const parts = [];
  if (t.n > 1 || show.has('n')) parts.push(`${t.n} tane`);
  if (show.has('z')) parts.push(SIZE_NAME[t.z]);
  if (show.has('f') || t.f) parts.push(FILL_NAME[t.f]);
  parts.push(COLOR_NAME[t.c], SHAPE_NAME[t.s]);
  let s = parts.join(' ');
  if ((t.s === 'triangle' || t.s === 'arrow') && (show.has('r') || t.r)) s += ` (${t.s === 'arrow' ? 'ok' : 'ucu'} ${DIR_NAME[t.r / 45]} bakıyor)`;
  if (t.d >= 0) s += `, nokta ${DOT_NAME[t.d]} köşede`;
  return s;
}

const turnName = (units) => {
  const u = Math.abs(units);
  const amount = { 1: 'sekizde bir tur (45°)', 2: 'çeyrek tur (90°)', 3: '135°', 4: 'yarım tur (180°)' }[u];
  return `${units > 0 ? 'saat yönünde' : 'saatin tersi yönünde'} ${amount}`;
};
const normTurn = (k, M) => { const x = ((k % M) + M) % M; return x > M / 2 ? x - M : x; };

const PLURAL = { s: 'Şekiller', c: 'Renkler', z: 'Boyutlar', n: 'Şekil sayıları', f: 'Şekillerin boyanışı', r: 'Yönler', d: 'Noktanın yerleri' };

// Dizi kuralı
function seqRuleText(q, a) {
  const rule = q.rules[a];
  const terms = (n) => Array.from({ length: n }, (_, i) => valueName(a, evalSeq(a, rule, i)));
  if (rule.t === 'cycle') {
    const list = rule.vals.concat(rule.vals).map((v) => valueName(a, v)).join(', ');
    return `${PLURAL[a]} hep aynı sırayla tekrar ediyor: ${list}, …`;
  }
  if (rule.t === 'step') {
    if (a === 'n') return `Her adımda ${rule.k > 0 ? 'bir şekil daha ekleniyor' : 'bir şekil eksiliyor'}: ${terms(4).join(', ')}, …`;
    if (a === 's') return `Her adımda ${rule.k > 0 ? 'bir köşe ekleniyor' : 'bir köşe eksiliyor'}: ${terms(3).join(' → ')} → …`;
    if (a === 'z') return `Şekil her adımda ${rule.k > 0 ? 'büyüyor' : 'küçülüyor'}: ${terms(3).join(' → ')}`;
    if (a === 'r') return `Şekil her adımda ${turnName(normTurn(rule.k, 8))} dönüyor.`;
    if (a === 'd') {
      const k = normTurn(rule.k, 4);
      return Math.abs(k) === 2 ? 'Nokta her adımda çapraz köşeye geçiyor.' : `Nokta her adımda ${k > 0 ? 'saat yönünde' : 'saatin tersi yönünde'} bir sonraki köşeye geçiyor.`;
    }
  }
  return '';
}

const DIST_NAME = { s: 'şekil', c: 'renk', z: 'boyut', n: 'sayı', f: 'boyama', r: 'yön', d: 'nokta yeri' };
const vn = (a, v) => (a === 'n' ? `${v} tane` : valueName(a, v));
const ROWW = ['1. satır', '2. satır', '3. satır'];
const COLW = ['1. sütun', '2. sütun', '3. sütun'];
function progText(a, k, along) {
  if (a === 'n') return k > 0 ? 'bir şekil daha ekleniyor' : 'bir şekil eksiliyor';
  if (a === 's') return k > 0 ? 'bir köşe ekleniyor' : 'bir köşe eksiliyor';
  if (a === 'z') return k > 0 ? 'şekil bir boy büyüyor' : 'şekil bir boy küçülüyor';
  if (a === 'r') return `şekil ${turnName(normTurn(k, 8))} dönüyor`;
  if (a === 'd') return `nokta ${normTurn(k, 4) > 0 ? 'saat yönünde' : 'saatin tersi yönünde'} bir sonraki köşeye geçiyor`;
  return along;
}
// Matris kuralı; final=true ise eksik hücre için sonucu da söyler.
function matRuleText(q, a, final) {
  const rule = q.rules[a];
  const name = ATTR_NAME[a];
  const ans = evalMat(a, rule, 2, 2);
  const tail = final ? ` Boşluk için: ${valueName(a, ans)}.` : '';
  switch (rule.t) {
    case 'row': return `Her satırda ${name} aynı: ${rule.vals.map((v, i) => `${ROWW[i]} ${vn(a, v)}`).join(', ')}.`;
    case 'col': return `Her sütunda ${name} aynı: ${rule.vals.map((v, i) => `${COLW[i]} ${vn(a, v)}`).join(', ')}.`;
    case 'dist': return `Her satırda ve her sütunda şu üç ${DIST_NAME[a]} birer kez var: ${joinTr(rule.vals.map((v) => valueName(a, v)))}.${final ? ` Son satırda eksik olan: ${valueName(a, ans)}.` : ''}`;
    case 'rprog': return `Her satırda soldan sağa ${progText(a, rule.k)}.${tail}`;
    case 'cprog': return `Her sütunda yukarıdan aşağıya ${progText(a, rule.k)}.${tail}`;
    default: return '';
  }
}

export function ruleLines(q, final = false) {
  return varyingAttrs(q).map((a) => ({ attr: a, text: q.kind === 'seq' ? seqRuleText(q, a) : matRuleText(q, a, final) }));
}

export function questionTitle(q) {
  if (q.kind === 'mat') return 'Boşluğa hangisi gelir?';
  return q.m === q.L - 1 ? 'Sıradaki şekil hangisi?' : 'Boşluğa hangisi gelir?';
}
export function questionSub(q) {
  if (q.kind === 'mat') return 'Satırlara (soldan sağa) ve sütunlara (yukarıdan aşağıya) dikkat et.';
  return q.m === q.L - 1 ? 'Dizi soldan sağa ilerliyor. Sonra ne gelmeli?' : 'Dizinin ortasında bir kutu eksik. Hangisi gelmeli?';
}

const NUDGE_SEQ = {
  cycle: (a) => `${ATTR_NAME[a][0].toLocaleUpperCase('tr')}${ATTR_NAME[a].slice(1)} kaç adımda bir tekrar ediyor? Parmağınla say.`,
  step: (a) => ({
    n: 'Her kutudaki şekilleri say: sayı her adımda nasıl değişiyor?',
    s: 'Her şeklin köşelerini say: her adımda nasıl değişiyor?',
    r: 'Şeklin ucu nereyi gösteriyor? Her adımda ne kadar dönüyor?',
    d: 'Noktayı takip et: hangi köşeden hangi köşeye geçiyor?',
    z: 'Boyutlar her adımda nasıl değişiyor?',
  }[a]),
};
export function hintText(q) {
  const vs = varyingAttrs(q);
  const names = joinTr(vs.map((a) => ATTR_NAME[a]));
  const head = vs.length === 1 ? `Bu soruda yalnızca ${names} değişiyor.` : `Bu soruda ${vs.length} şey değişiyor: ${names}. Her birine ayrı ayrı bak.`;
  if (q.kind === 'seq') {
    const tips = vs.map((a) => NUDGE_SEQ[q.rules[a].t](a));
    return `${head} ${tips.join(' ')}`;
  }
  const tips = vs.map((a) => {
    const t = q.rules[a].t;
    if (t === 'row' || t === 'col') return `${ATTR_NAME[a][0].toLocaleUpperCase('tr')}${ATTR_NAME[a].slice(1)} için satırlara ve sütunlara bak: hangisinde hep aynı kalıyor?`;
    if (t === 'dist') return `${ATTR_NAME[a][0].toLocaleUpperCase('tr')}${ATTR_NAME[a].slice(1)} için her satırda hangi değerlerin olduğunu say; son satırda hangisi eksik?`;
    return `${ATTR_NAME[a][0].toLocaleUpperCase('tr')}${ATTR_NAME[a].slice(1)} için bir satırda ya da sütunda adım adım nasıl değiştiğine bak.`;
  });
  return `${head} ${tips.join(' ')}`;
}

export function explainText(q) {
  const lines = ruleLines(q, true).map((l) => l.text);
  return { lines, answer: `Bu yüzden doğru cevap: ${tileName(q.answer, varyingAttrs(q))}.` };
}
