// Akıllı İpucu metinleri — saf modül (DOM yok), Node'da da test edilebilir.
// describeStep(G, S, step, pname) → { msg, cells, alt }
//   cells: sarı ile vurgulanacak kareler (yol ucu + gideceği kare)
//   alt  : turuncu ile gösterilecek kareler (neden başka yön olamayacağını anlatan yer)

const rc = (G, c) => `${Math.floor(c / G.w) + 1}. satır, ${(c % G.w) + 1}. sütun`;

// Mevcut durumda c hücresinin bölgesine (boş kareler) iki ucu da değen çiftler.
function reachers(S, cells) {
  const set = new Set(cells);
  const touches = (h) => S.nbr[h].some((n) => set.has(n));
  const out = [];
  for (let p = 0; p < S.P; p++) {
    if (S.done[p]) continue;
    if (touches(S.hd[2 * p]) && touches(S.hd[2 * p + 1])) out.push(p);
  }
  return out;
}

export function describeStep(G, S, step, pname) {
  const m = step.move;
  const head = S.hd[2 * m.p + m.side];
  const partner = S.hd[2 * m.p + 1 - m.side];
  const isEndpoint = head === G.ends[m.p][m.side];
  const corner = (c) => G.nbr[c].length === 2;
  const n = pname(m.p);
  const target = m.to >= 0 ? ` (${rc(G, m.to)})` : '';
  const who = isEndpoint ? `${n} sayısı` : `${n} yolunun ucu`;
  const cells = m.to < 0 ? [head, partner] : [head, m.to];
  let alt = [];
  const goal = m.to < 0 ? `${n} yolunun yan yana gelen iki ucu birleşmeli` : `${who} işaretli kareye${target} gitmeli`;

  if (step.kind === 'head') {
    if (m.to < 0) return { msg: `${n} yolunun iki ucu yan yana ve başka gidecek yer kalmadı: onları birleştir!`, cells, alt };
    const msg = isEndpoint && corner(head)
      ? `Köşedeki ${n} sayısının yalnızca iki komşusu var ve biri kapalı. Bu yüzden yol işaretli kareye${target} gitmeli.`
      : `${who} yalnızca bir yöne ilerleyebilir: öteki yönler duvar ya da dolu. Yol işaretli kareye${target} gitmeli.`;
    return { msg, cells, alt };
  }
  if (step.kind === 'cell') {
    const msg = corner(m.to)
      ? `Köşedeki boş karenin${target} yalnızca 2 komşusu var. Her kareden bir yol geçmeli; yol bu köşeye bir komşudan girip öbüründen çıkar. Bu yüzden yanındaki ${who} oraya gelmeli.`
      : `İşaretli boş karenin${target} yalnızca 2 açık komşusu kaldı. Her kareden bir yol geçmeli; yol bir komşudan girip öbüründen çıkar. Bu yüzden yanındaki ${who} oraya gelmeli.`;
    return { msg, cells, alt };
  }
  // Eleme: diğer seçenekler çıkmaza götürür.
  const e = step.eliminated[0];
  const r = e.reason;
  const altDesc = e.move.to < 0 ? 'iki ucu hemen birleştirseydin' : 'turuncu kareye gitseydi';
  if (e.move.to >= 0) alt.push(e.move.to);
  let why;
  if (step.level === 2) {
    if (r.type === 'dead') {
      alt = [r.cell];
      why = `${e.move.to < 0 ? 'iki ucu hemen birleştirseydin' : 'başka yöne gitseydi'}, turuncu çerçeveli kareden hiçbir yol geçemezdi (çıkmaz kare). Unutma: her kare dolmalı!`;
    } else if (r.type === 'blocked') {
      alt = [S.hd[2 * r.pair], S.hd[2 * r.pair + 1]];
      why = r.pair === m.p
        ? `${e.move.to < 0 ? 'iki ucu hemen birleştirseydin' : 'başka yöne gitseydi'}, kendi iki ucu birbirine ulaşamazdı.`
        : `${e.move.to < 0 ? 'iki ucu hemen birleştirseydin' : 'başka yöne gitseydi'}, turuncu çerçeveli ${pname(r.pair)} sayılarının yolu kapanırdı.`;
    } else if (r.type === 'region') {
      alt = r.cells;
      const who2 = reachers(S, r.cells);
      const head0 = e.move.to < 0 ? 'iki ucu hemen birleştirseydin' : 'başka yöne gitseydi';
      why = who2.length === 1
        ? `turuncu çerçeveli boş karelere yalnızca ${pname(who2[0])} yolu ulaşabiliyor. ${head0[0].toUpperCase() + head0.slice(1)}, bu kareler boş kalırdı.`
        : `${head0}, turuncu çerçeveli boş karelere hiçbir renk ulaşamazdı. Unutma: her kare dolmalı!`;
    } else {
      why = `${altDesc}, bir çıkmaz oluşurdu.`;
    }
  } else {
    const tail = r.type === 'dead' ? 'bir kare çıkmaza girer' : r.type === 'blocked' ? `${pname(r.pair)} yolu tıkanır` : r.type === 'region' ? 'bazı karelere hiçbir renk ulaşamaz' : 'yollar birbirini tıkar';
    why = `${altDesc}, ardından gelen zorunlu hamlelerden sonra ${tail}. (İpucu: bir yönü dene, zorunlu hamleleri takip et ve sorun çıkıp çıkmadığına bak.)`;
  }
  const more = step.eliminated.length > 1 ? ' Öteki yönler de benzer biçimde çıkmaza girer.' : '';
  return { msg: `${goal}. Neden? ${why[0].toUpperCase() + why.slice(1)}${more}`, cells, alt };
}
