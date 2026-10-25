// Kule Kartları — saf oyun mantığı (DOM yok; node'da da çalışır).
// Arcomage / Ant Cards kuralları, robot kuleleri temasıyla:
//   KULE (tower) — 0'a inerse kaybedersin, 50'ye çıkarırsan kazanırsın
//   ZIRH (wall)  — hasarı önce zırh emer
//   3 kaynak: METAL (MADEN üretir), ENERJİ (REAKTÖR üretir), ROBOT (FABRİKA üretir)

export const RES = ['metal', 'enerji', 'robot'];
export const RES_NAME = { metal: 'METAL', enerji: 'ENERJİ', robot: 'ROBOT' };
export const PROD_NAME = { metal: 'MADEN', enerji: 'REAKTÖR', robot: 'FABRİKA' };
export const START = { tower: 20, wall: 10, prod: 2, stock: 5 };
export const WIN_TOWER = 50;
export const WIN_RES = 150;
export const HAND = 6;

// ---- Etki yardımcıları ----
function damage(p, n) {
  if (n <= 0) return;
  const w = Math.min(p.wall, n);
  p.wall -= w;
  p.tower = Math.max(0, p.tower - (n - w));
}
const tower = (p, n) => { p.tower = Math.max(0, p.tower + n); };
const wall = (p, n) => { p.wall = Math.max(0, p.wall + n); };
const prod = (p, r, n) => { p.prod[r] = Math.max(1, p.prod[r] + n); };
const stock = (p, r, n) => { p.stock[r] = Math.max(0, p.stock[r] + n); };
function steal(me, op, r, n) {
  const k = Math.min(n, op.stock[r]);
  op.stock[r] -= k;
  me.stock[r] += k;
}

// ---- Kartlar (40) ----
// text: en fazla 3 satır, satır başına en fazla 11 karakter
const C = (id, name, type, cost, text, fx, extra = {}) => ({ id, name, type, cost, text, fx, ...extra });
export const CARDS = [
  // METAL
  C('vida', 'VİDA KUTUSU', 'metal', 1, ['ZIRH +3'], (m) => wall(m, 3)),
  C('kaynak', 'KAYNAK', 'metal', 2, ['ZIRH +2', 'TEKRAR OYNA'], (m) => wall(m, 2), { again: true }),
  C('sac', 'ÇELİK SAC', 'metal', 3, ['ZIRH +5'], (m) => wall(m, 5)),
  C('kazici', 'KAZICI', 'metal', 4, ['MADEN +1'], (m) => prod(m, 'metal', 1)),
  C('takviye', 'TAKVİYE', 'metal', 5, ['ZIRH +5', 'KULE +2'], (m) => { wall(m, 5); tower(m, 2); }),
  C('miknatis', 'MIKNATIS', 'metal', 3, ['RAKİPTEN 4', 'METAL ÇAL'], (m, o) => steal(m, o, 'metal', 4)),
  C('pas', 'PAS', 'metal', 4, ['RAKİP:', 'ZIRH -7'], (m, o) => wall(o, -7)),
  C('iskele', 'KULE İSKELE', 'metal', 6, ['KULE +5'], (m) => tower(m, 5)),
  C('duvar', 'ZIRH DUVARI', 'metal', 8, ['ZIRH +11'], (m) => wall(m, 11)),
  C('deprem', 'DEPREM', 'metal', 2, ['HERKES:', 'MADEN -1'], (m, o) => { prod(m, 'metal', -1); prod(o, 'metal', -1); }),
  C('hurda', 'HURDALIK', 'metal', 0, ['ZIRH -3', 'METAL +6'], (m) => { wall(m, -3); stock(m, 'metal', 6); }),
  C('kale', 'KALE ÇELİĞİ', 'metal', 14, ['ZIRH +13', 'KULE +5'], (m) => { wall(m, 13); tower(m, 5); }),
  C('takas', 'ZIRH TAKASI', 'metal', 6, ['ZIRHLAR', 'YER DEĞİŞİR'], (m, o) => { const w = m.wall; m.wall = o.wall; o.wall = w; }),
  // ENERJİ
  C('pil', 'PİL', 'enerji', 2, ['KULE +3'], (m) => tower(m, 3)),
  C('kivilcim', 'KIVILCIM', 'enerji', 1, ['KULE +1', 'TEKRAR OYNA'], (m) => tower(m, 1), { again: true }),
  C('reaktor', 'REAKTÖR', 'enerji', 4, ['REAKTÖR +1'], (m) => prod(m, 'enerji', 1)),
  C('anten', 'ANTEN', 'enerji', 5, ['KULE +5'], (m) => tower(m, 5)),
  C('lazer', 'LAZER', 'enerji', 4, ['RAKİP:', 'KULE -4'], (m, o) => tower(o, -4)),
  C('emp', 'EMP', 'enerji', 5, ['RAKİP:', 'HER KAYNAK', '-4'], (m, o) => RES.forEach((r) => stock(o, r, -4))),
  C('kuantum', 'KUANTUM', 'enerji', 10, ['KULE +10'], (m) => tower(m, 10)),
  C('yansitici', 'YANSITICI', 'enerji', 6, ['KULE +3', 'RAKİP:', 'KULE -3'], (m, o) => { tower(m, 3); tower(o, -3); }),
  C('kisadevre', 'KISA DEVRE', 'enerji', 3, ['RAKİP:', 'ENERJİ -8'], (m, o) => stock(o, 'enerji', -8)),
  C('plazma', 'PLAZMA TOPU', 'enerji', 12, ['RAKİP:', 'KULE -10'], (m, o) => tower(o, -10)),
  C('gkalkan', 'GÜÇ KALKANI', 'enerji', 5, ['ZIRH +7'], (m) => wall(m, 7)),
  C('devreak', 'DEV REAKTÖR', 'enerji', 9, ['REAKTÖR +2'], (m) => prod(m, 'enerji', 2)),
  C('firtina', 'FIRTINA', 'enerji', 6, ['HERKES:', 'ZIRH -8'], (m, o) => { wall(m, -8); wall(o, -8); }),
  // ROBOT
  C('dron', 'MİNİ DRON', 'robot', 1, ['2 HASAR'], (m, o) => damage(o, 2)),
  C('orumcek', 'ÖRÜMCEK BOT', 'robot', 2, ['4 HASAR'], (m, o) => damage(o, 4)),
  C('avci', 'AVCI BOT', 'robot', 4, ['6 HASAR'], (m, o) => damage(o, 6)),
  C('fabrika', 'FABRİKA', 'robot', 4, ['FABRİKA +1'], (m) => prod(m, 'robot', 1)),
  C('tank', 'TANK BOT', 'robot', 7, ['10 HASAR'], (m, o) => damage(o, 10)),
  C('sabotaj', 'SABOTAJCI', 'robot', 6, ['RAKİP:', 'MADEN -1', '2 HASAR'], (m, o) => { prod(o, 'metal', -1); damage(o, 2); }),
  C('hirsiz', 'HIRSIZ BOT', 'robot', 4, ['RAKİPTEN 5', 'ENERJİ ÇAL'], (m, o) => steal(m, o, 'enerji', 5)),
  C('kamikaze', 'KAMİKAZE', 'robot', 3, ['8 HASAR', 'KULEN -3'], (m, o) => { damage(o, 8); tower(m, -3); }),
  C('suru', 'DRON SÜRÜSÜ', 'robot', 6, ['5 HASAR', 'TEKRAR OYNA'], (m, o) => damage(o, 5), { again: true }),
  C('casus', 'CASUS BOT', 'robot', 6, ['RAKİP:', 'KULE -5'], (m, o) => tower(o, -5)),
  C('meka', 'DEV MEKA', 'robot', 14, ['18 HASAR'], (m, o) => damage(o, 18)),
  C('tamirci', 'TAMİRCİ BOT', 'robot', 3, ['KULE +2', 'ZIRH +3'], (m) => { tower(m, 2); wall(m, 3); }),
  C('intikam', 'İNTİKAM', 'robot', 5, ['6 HASAR', 'KULEN AZSA', '10 HASAR'], (m, o) => damage(o, m.tower < o.tower ? 10 : 6)),
  C('yedek', 'YEDEK PARÇA', 'robot', 0, ['HER KAYNAK', '+2', 'TEKRAR OYNA'], (m) => RES.forEach((r) => stock(m, r, 2)), { again: true }),
];
export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

// ---- Durum ----
export function newPlayer(bonus = 0) {
  return {
    tower: START.tower, wall: START.wall,
    prod: { metal: START.prod, enerji: START.prod, robot: START.prod },
    stock: { metal: START.stock + bonus, enerji: START.stock + bonus, robot: START.stock + bonus },
  };
}
export const clonePlayer = (p) => ({ tower: p.tower, wall: p.wall, prod: { ...p.prod }, stock: { ...p.stock } });

export function drawCard(rand = Math.random) {
  return CARDS[Math.floor(rand() * CARDS.length)].id;
}

export function newGame(opts = {}) {
  const rand = opts.rand || Math.random;
  const g = {
    p: [newPlayer(opts.bonus0 || 0), newPlayer(opts.bonus1 || 0)],
    hands: [[], []],
    turn: opts.first || 0,
    winner: -1,
    reason: '',
    turns: 0,
    rand,
  };
  for (let i = 0; i < 2; i++) for (let k = 0; k < HAND; k++) g.hands[i].push(drawCard(rand));
  return g;
}

export function produce(g, i) {
  const p = g.p[i];
  for (const r of RES) p.stock[r] += p.prod[r];
}

export function canAfford(p, card) {
  return p.stock[card.type] >= card.cost;
}

// Kartı oyna: true dönerse aynı oyuncu tekrar oynar
export function playCard(g, i, idx) {
  const me = g.p[i];
  const op = g.p[1 - i];
  const card = CARD_BY_ID[g.hands[i][idx]];
  if (!card || !canAfford(me, card)) return null;
  me.stock[card.type] -= card.cost;
  card.fx(me, op);
  g.hands[i][idx] = drawCard(g.rand);
  checkWin(g);
  return card;
}

export function discardCard(g, i, idx) {
  const card = CARD_BY_ID[g.hands[i][idx]];
  g.hands[i][idx] = drawCard(g.rand);
  return card;
}

export function checkWin(g) {
  if (g.winner >= 0) return g.winner;
  const [a, b] = g.p;
  const res = (p) => RES.some((r) => p.stock[r] >= WIN_RES);
  // Önce yıkım kontrolü (aynı anda ikisi olursa kuleyi yıkan kazanır)
  if (b.tower <= 0 && a.tower > 0) { g.winner = 0; g.reason = 'yikim'; } else if (a.tower <= 0 && b.tower > 0) { g.winner = 1; g.reason = 'yikim'; } else if (a.tower <= 0 && b.tower <= 0) { g.winner = 1 - g.turn; g.reason = 'yikim'; } else if (a.tower >= WIN_TOWER) { g.winner = 0; g.reason = 'kule'; } else if (b.tower >= WIN_TOWER) { g.winner = 1; g.reason = 'kule'; } else if (res(a)) { g.winner = 0; g.reason = 'kaynak'; } else if (res(b)) { g.winner = 1; g.reason = 'kaynak'; }
  return g.winner;
}

// ---- Yapay zekâ ----
function evalSide(p) {
  const prodSum = p.prod.metal + p.prod.enerji + p.prod.robot;
  const st = Math.min(60, p.stock.metal) + Math.min(60, p.stock.enerji) + Math.min(60, p.stock.robot);
  // kule 50'ye yaklaştıkça değeri artar
  const t = p.tower + Math.max(0, p.tower - 35) * 0.8;
  return t * 3 + Math.min(p.wall, 60) * 1.25 + prodSum * 7 + st * 0.3 - (p.tower < 10 ? (10 - p.tower) * 3 : 0);
}

export function evaluate(me, op) {
  if (op.tower <= 0 || me.tower >= WIN_TOWER || RES.some((r) => me.stock[r] >= WIN_RES)) return 100000;
  if (me.tower <= 0 || op.tower >= WIN_TOWER || RES.some((r) => op.stock[r] >= WIN_RES)) return -100000;
  return evalSide(me) - evalSide(op) * 1.05;
}

// noise: 0 = en iyi oyun, büyüdükçe hatalı
export function aiChoose(g, i, noise = 0, rand = Math.random) {
  const me = g.p[i];
  const op = g.p[1 - i];
  const base = evaluate(me, op);
  let best = null;
  g.hands[i].forEach((id, idx) => {
    const card = CARD_BY_ID[id];
    if (!canAfford(me, card)) return;
    const m2 = clonePlayer(me);
    const o2 = clonePlayer(op);
    m2.stock[card.type] -= card.cost;
    card.fx(m2, o2);
    let v = evaluate(m2, o2) + (card.again ? 6 : 0) + (rand() - 0.5) * noise * 2;
    // Kaynağı boşuna harcamamak için çok küçük ceza
    v -= card.cost * 0.15;
    if (!best || v > best.v) best = { action: 'play', idx, v };
  });
  // Atılacak kart: en az değerli (pahalı ve uzak olan)
  let worst = 0;
  let worstScore = Infinity;
  g.hands[i].forEach((id, idx) => {
    const card = CARD_BY_ID[id];
    const gap = Math.max(0, card.cost - me.stock[card.type]) / Math.max(1, me.prod[card.type]);
    const keep = 10 - gap * 2 - (card.cost > 10 ? 2 : 0) + (rand() - 0.5) * noise * 0.2;
    if (keep < worstScore) { worstScore = keep; worst = idx; }
  });
  if (best && best.v > base - 1) return best;
  return { action: 'discard', idx: worst, v: base };
}
