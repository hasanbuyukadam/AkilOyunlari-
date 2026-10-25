import {
  unpack, regionPieces, outlineSegments, bboxOf, overlay, explainText, hintText, rangeFor,
} from './logic.js';

function ensureStyles() {
  if (document.getElementById('area-css')) return;
  const link = document.createElement('link');
  link.id = 'area-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const P = (pts) => pts.map((p) => `${p[0]},${p[1]}`).join(' ');
let uid = 0;

// Sorunun şeklini (ve isteğe bağlı çizim katmanını) SVG olarak çiz.
function renderSvg(q, ov) {
  const id = `area-arrow-${++uid}`;
  const allPts = q.shapes.flatMap((s) => regionPieces(s.region).map((p) => p.pts));
  const b = bboxOf(allPts);
  const names = q.shapes.some((s) => s.name);
  const x0 = b.x0 - 1, y0 = b.y0 - (names ? 1.4 : 1);
  const x1 = b.x1 + 1, y1 = b.y1 + 1;
  const W = x1 - x0, H = y1 - y0;
  const out = [];
  out.push(`<defs><marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ov-arrowhead"/></marker></defs>`);
  q.shapes.forEach((s, si) => {
    const pcs = regionPieces(s.region);
    const fill = si === 1 ? 'fill-b' : 'fill-a';
    for (const p of pcs.filter((x) => x.sign > 0)) out.push(`<polygon class="${fill}" points="${P(p.pts)}"/>`);
    for (const p of pcs.filter((x) => x.sign < 0)) out.push(`<polygon class="hole" points="${P(p.pts)}"/>`);
  });
  if (q.grid) {
    // ızgara şeklin ve kesilen parçaların üstünde de görünsün (kareler sayılabilsin)
    const g = [];
    for (let x = Math.ceil(x0); x <= x1; x++) g.push(`M${x},${y0}V${y1}`);
    for (let y = Math.ceil(y0); y <= y1; y++) g.push(`M${x0},${y}H${x1}`);
    out.push(`<path class="grid" d="${g.join('')}"/>`);
  }
  q.shapes.forEach((s, si) => {
    const segs = outlineSegments({ cells: s.region.cells, tris: s.region.tris, polys: s.region.polys.filter((p) => p.sign > 0) });
    out.push(`<path class="outline ${si === 1 ? 'ob' : ''}" d="${segs.map(([a, c]) => `M${a[0]},${a[1]}L${c[0]},${c[1]}`).join('')}"/>`);
    for (const p of s.region.polys.filter((x) => x.sign < 0)) out.push(`<polygon class="hole-line" points="${P(p.pts)}"/>`);
    if (s.name) {
      const sb = bboxOf(regionPieces(s.region).map((p) => p.pts));
      out.push(`<text class="sname ${si === 1 ? 'nb' : ''}" x="${(sb.x0 + sb.x1) / 2}" y="${sb.y0 - 0.45}">${esc(s.name)}</text>`);
    }
  });
  if (ov) {
    const g = [];
    for (const o of ov) {
      if (o.t === 'poly') g.push(`<polygon class="${o.cls}" points="${P(o.pts)}"/>`);
      else if (o.t === 'line') g.push(`<line class="${o.cls}" x1="${o.a[0]}" y1="${o.a[1]}" x2="${o.b[0]}" y2="${o.b[1]}"/>`);
      else if (o.t === 'arrow') g.push(`<line class="${o.cls}" x1="${o.a[0]}" y1="${o.a[1]}" x2="${o.b[0]}" y2="${o.b[1]}" marker-end="url(#${id})"/>`);
    }
    for (const o of ov) if (o.t === 'text') g.push(`<text class="${o.cls}" x="${o.x}" y="${o.y}">${esc(o.text)}</text>`);
    out.push(`<g class="ov">${g.join('')}</g>`);
  }
  for (const l of q.labels) out.push(`<text class="lbl ${l.cls ?? ''}" x="${l.x}" y="${l.y}">${esc(l.text)}</text>`);
  const maxW = Math.min(W * 46, 520);
  return `<svg viewBox="${x0} ${y0} ${W} ${H}" style="width:min(100%, ${maxW}px)" role="img" aria-label="Alan sorusu şekli">${out.join('')}</svg>`;
}

export default {
  id: 'area',
  name: 'Alan Problemleri',
  icon: '📐',
  description: 'Kareli kâğıtta şekillerin alanını bul: kareleri say, dikdörtgenlere böl, üçgenleri yarıya ayır!',
  rules: 'Her levelde birkaç alan sorusu var (Kolay 3, Orta 4, Zor 5). Alan, bir şeklin içini kaplayan birim karelerin sayısıdır. Kareleri sayabilir, şekli dikdörtgenlere bölebilir ya da büyük bir dikdörtgenden fazlalıkları çıkarabilirsin. Her sorunun tek bir doğru cevabı vardır; tüm soruları doğru cevaplayınca level biter.',
  howTo: [
    'Kareli kâğıttaki her küçük kare 1 birim karedir. Alan, şeklin içindeki kare sayısıdır.',
    'Sayı soran sorularda alttaki tuşlarla cevabını yaz ve ✔ Kontrol Et’e bas.',
    'Şıklı sorularda doğru olduğunu düşündüğün şıkka dokun.',
    'Yanlış olursa üzülme, tekrar deneyebilirsin! Doğru olunca nedenini anlatan bir açıklama çıkar.',
    'Dikdörtgenin alanı en × boy, üçgenin alanı ise onu saran dikdörtgenin yarısıdır.',
    'Takılırsan 💡 İpucu ya da ✏️ Böl ve Say boosterlarını kullan.',
  ],
  boosters: [
    { id: 'half', name: 'Yarı Yarıya', icon: '✂️', uses: 2, description: 'Şıklı soruda yanlış şıkların yarısını siler; sayı sorusunda cevabın hangi aralıkta olduğunu gösterir.' },
    { id: 'hint', name: 'İpucu', icon: '💡', uses: 3, description: 'Şekli nasıl parçalara ayıracağını anlatır (sonucu söylemez).' },
    { id: 'split', name: 'Böl ve Say', icon: '✏️', uses: 2, description: 'Şeklin üzerine bölme çizgilerini, parçaları ve birim kareleri çizer.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const qs = level.questions.map(unpack);
    let qi = 0;
    let phase = 'ask'; // 'ask' | 'explain' | 'done'
    let typed = '';
    let removed = new Set();
    let showSplit = false;
    let hintShown = false;
    let rangeShown = null;
    let wrongPick = -1;
    let solvedAll = false;

    container.innerHTML = '<div class="area-game"></div>';
    const root = container.querySelector('.area-game');

    const q = () => qs[qi];
    const isLast = () => qi === qs.length - 1;

    const render = () => {
      const cur = q();
      const ov = phase === 'explain' ? overlay(cur, true) : showSplit ? overlay(cur, false) : null;
      const dots = qs.map((_, i) => `<span class="dot ${i < qi || (i === qi && phase !== 'ask') ? 'ok' : i === qi ? 'cur' : ''}"></span>`).join('');
      let answer = '';
      if (cur.input === 'num') {
        const shown = phase === 'ask' ? (typed || '?') : String(cur.answer);
        answer = `
          <div class="area-display ${phase !== 'ask' ? 'right' : ''} ${typed ? '' : 'empty'}" aria-live="polite">${esc(shown)}<small>${cur.kind === 'perim' || cur.kind === 'inverse' ? 'birim' : 'birim kare'}</small></div>
          ${rangeShown && phase === 'ask' ? `<div class="area-range">🎯 Cevap ${rangeShown[0]} ile ${rangeShown[1]} arasında</div>` : ''}
          ${phase === 'ask' ? `<div class="area-pad">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `<button type="button" data-d="${d}">${d}</button>`).join('')}
            <button type="button" data-act="erase" aria-label="Sil">⌫</button>
            <button type="button" data-act="check" class="check">✔ Kontrol Et</button>
          </div>` : ''}`;
      } else {
        answer = `<div class="area-options n${cur.options.length}">
          ${cur.options.map((o, i) => {
            let cls = '';
            if (phase !== 'ask' && i === cur.answer) cls = 'right';
            else if (removed.has(i)) cls = 'gone';
            else if (i === wrongPick) cls = 'wrong';
            const label = cur.kind === 'compare' || cur.kind === 'sameper' ? (o === 'İkisi eşit' ? '🟰 İkisi eşit' : `Şekil ${o}`) : o;
            return `<button type="button" class="opt ${cls}" data-o="${i}" ${removed.has(i) || phase !== 'ask' ? 'disabled' : ''}>${esc(label)}</button>`;
          }).join('')}
        </div>`;
      }
      root.innerHTML = `
        <div class="area-top"><div class="area-dots" aria-label="Soru ${qi + 1} / ${qs.length}">${dots}</div><span class="area-count">Soru ${qi + 1} / ${qs.length}</span></div>
        <p class="area-prompt">${esc(cur.prompt)}</p>
        <div class="area-fig ${phase === 'explain' ? 'solved' : ''}">${renderSvg(cur, ov)}</div>
        <div class="area-answer">${answer}</div>
        <p class="area-feedback" aria-live="polite"></p>
        ${phase === 'explain' ? `<div class="area-explain">
          <p class="area-good">🎉 Doğru!</p>
          <p>${esc(explainText(cur))}</p>
          <button type="button" class="btn primary area-next" data-act="next">${isLast() ? 'Bitir 🎉' : 'Devam ➜'}</button>
        </div>` : ''}`;
      if (phase === 'explain') {
        const ex = root.querySelector('.area-explain');
        ex?.querySelector('.area-next')?.focus({ preventScroll: true });
        ex?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      }
    };

    const feedback = (msg, bad) => {
      const el = root.querySelector('.area-feedback');
      if (!el) return;
      el.textContent = msg;
      el.classList.toggle('bad', !!bad);
      if (bad) {
        const target = root.querySelector('.area-display') ?? root.querySelector('.area-options');
        target?.classList.remove('shake');
        void target?.offsetWidth;
        target?.classList.add('shake');
      }
    };

    // Tipik hatalara özel nazik geri bildirim.
    const mistakeTip = (cur, v) => {
      if (cur.kind === 'perim' && v === cur.meta.area) return 'Bu sayı şeklin alanı! Biz çevreyi, yani etrafındaki çizgileri soruyoruz.';
      if (cur.kind === 'triangle' && cur.meta.mode === 'base' && v === cur.meta.b * cur.meta.h) return 'Bu, üçgeni saran dikdörtgenin alanı. Üçgen onun yarısıdır: ÷ 2 yapmayı unutma!';
      if (cur.kind === 'para' && v === (cur.meta.b + cur.meta.s) * cur.meta.h) return 'Paralelkenarı saran dikdörtgenin tamamını saydın. Taban × yükseklik dene!';
      if (cur.kind === 'para' && v * 2 === cur.meta.b * cur.meta.h) return 'Paralelkenar üçgen değil, ÷ 2 gerekmez.';
      if (cur.kind === 'rect' && v === 2 * (cur.meta.w + cur.meta.h)) return 'Bu sayı çevre! Alan için en × boy yap.';
      if (cur.kind === 'rect' && v === cur.meta.w + cur.meta.h) return 'En ile boyu topladın; alan için çarpmalısın.';
      if (cur.kind === 'inverse' && v === cur.meta.area - cur.meta.en) return 'Çıkarma değil: hangi sayı ile çarpınca alanı bulursun?';
      if (cur.kind === 'half' && v === cur.meta.full + cur.meta.halves) return 'Yarım kareleri tam kare gibi saydın. İki yarım bir tam eder!';
      if (cur.kind === 'half' && v === cur.meta.full) return 'Yarım kareleri unuttun!';
      return null;
    };

    const correct = () => {
      phase = 'explain';
      ctx.showHint('');
      render();
    };

    const checkNum = () => {
      if (phase !== 'ask') return;
      const cur = q();
      if (!typed) { feedback('Önce bir sayı yaz.', false); return; }
      const v = Number(typed);
      if (v === cur.answer) return correct();
      typed = '';
      render();
      feedback(`${mistakeTip(cur, v) ?? 'Tekrar dene!'} 🙂`, true);
    };

    const pickOpt = (i) => {
      if (phase !== 'ask' || removed.has(i)) return;
      const cur = q();
      if (i === cur.answer) return correct();
      wrongPick = i;
      render();
      const v = Number(cur.options[i]);
      feedback(`${(Number.isFinite(v) && mistakeTip(cur, v)) || 'Tekrar dene!'} 🙂`, true);
    };

    const press = (d) => {
      if (phase !== 'ask' || q().input !== 'num') return;
      if (typed.length >= 3) return;
      typed = typed === '0' ? String(d) : typed + d;
      render();
    };
    const erase = () => {
      if (phase !== 'ask') return;
      typed = typed.slice(0, -1);
      render();
    };

    const next = () => {
      if (phase !== 'explain') return;
      if (isLast()) {
        phase = 'done';
        if (!solvedAll) { solvedAll = true; root.classList.add('all-done'); ctx.onSolved(); }
        return;
      }
      qi++;
      phase = 'ask';
      typed = '';
      removed = new Set();
      showSplit = false;
      hintShown = false;
      rangeShown = null;
      wrongPick = -1;
      ctx.showHint('');
      render();
      root.scrollIntoView?.({ block: 'nearest' });
    };

    const onClick = (e) => {
      const b = e.target.closest('button');
      if (!b || !root.contains(b)) return;
      if (b.dataset.d !== undefined) press(Number(b.dataset.d));
      else if (b.dataset.o !== undefined) pickOpt(Number(b.dataset.o));
      else if (b.dataset.act === 'erase') erase();
      else if (b.dataset.act === 'check') checkNum();
      else if (b.dataset.act === 'next') next();
    };
    root.addEventListener('click', onClick);

    const onKey = (e) => {
      if (document.querySelector('.modal') || e.target.closest?.('input, textarea')) return;
      const cur = q();
      if (phase === 'explain' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); next(); return; }
      if (phase !== 'ask') return;
      if (cur.input === 'num') {
        if (/^[0-9]$/.test(e.key)) press(Number(e.key));
        else if (e.key === 'Backspace' || e.key === 'Delete') erase();
        else if (e.key === 'Enter') { e.preventDefault(); checkNum(); }
      } else {
        const k = e.key.toLowerCase();
        let i = /^[1-9]$/.test(k) ? Number(k) - 1 : -1;
        if (cur.kind === 'compare' || cur.kind === 'sameper') i = { a: 0, b: 1, e: 2 }[k] ?? i;
        if (i >= 0 && i < cur.options.length) pickOpt(i);
      }
    };
    document.addEventListener('keydown', onKey);

    const boosters = {
      half() {
        const cur = q();
        if (cur.input === 'num') {
          if (rangeShown) return { ok: false, message: `Aralık zaten gösterildi: ${rangeShown[0]} ile ${rangeShown[1]} arasında.` };
          rangeShown = rangeFor(cur);
          render();
          return { ok: true, message: `🎯 Cevap ${rangeShown[0]} ile ${rangeShown[1]} arasında bir sayı.` };
        }
        const wrong = cur.options.map((_, i) => i).filter((i) => i !== cur.answer && !removed.has(i));
        const total = cur.options.length - 1;
        const already = total - wrong.length;
        const target = Math.ceil(total / 2);
        if (already >= target || !wrong.length) return { ok: false, message: 'Silinecek başka şık kalmadı.' };
        // önce yanlış seçilmiş şık, sonra rastgele
        wrong.sort((a, b) => (b === wrongPick) - (a === wrongPick) || Math.random() - 0.5);
        const k = target - already;
        wrong.slice(0, k).forEach((i) => removed.add(i));
        if (removed.has(wrongPick)) wrongPick = -1;
        render();
        return { ok: true, message: `✂️ ${k} yanlış şık silindi.` };
      },
      hint() {
        const cur = q();
        if (hintShown) return { ok: false, message: `💡 ${hintText(cur)}` };
        hintShown = true;
        return { ok: true, message: `💡 ${hintText(cur)}` };
      },
      split() {
        if (showSplit) return { ok: false, message: 'Bölme çizgileri zaten şeklin üzerinde.' };
        showSplit = true;
        render();
        const msgs = {
          count: 'Her satır ayrı renkte; içindeki sayı o satırdaki kare sayısı. Şimdi topla!',
          compare: 'Her satırdaki kare sayısı yazıldı. Her şekil için topla ve karşılaştır.',
          rect: 'Her satırdaki kare sayısı yazıldı. Satırlar eşit; kaç satır olduğunu say.',
          composite: 'Şekil dikdörtgenlere bölündü. Her dikdörtgende en × boy yazıyor.',
          half: 'Yarım kareler ½ ile işaretlendi. Tam kareleri say, yarımları ikişer ikişer eşleştir.',
          perim: 'Dış çizgiler iki renkle işaretlendi. Her renkli parça 1 birim; hepsini say.',
          sameper: 'Her dikdörtgenin eni ve boyu yazıyor. En × boy ile alanları bul.',
          inverse: 'Dikdörtgen satırlara bölündü. Her satırda en kadar kare var; alana ulaşana kadar say.',
          triangle: 'Üçgeni saran dikdörtgen kesikli çizildi; dışarıda kalan parçalar kırmızı.',
          polygon: 'Şekli saran dikdörtgen kesikli çizildi; köşelerdeki kırmızı üçgenlerin alanları yazıyor.',
          para: 'Kırmızı üçgeni kesip yeşil yere taşı: bir dikdörtgen oluşur!',
          cutout: 'Büyük dikdörtgen ve kesilen parçalar işaretlendi. Büyükten küçükleri çıkar.',
        };
        return { ok: true, message: `✏️ ${msgs[q().kind] ?? 'Şekil parçalara bölündü.'}` };
      },
    };

    render();
    return {
      useBooster: (id) => {
        if (phase !== 'ask') return { ok: false, message: 'Bu soru çözüldü; Devam’a bas.' };
        return boosters[id]?.() ?? { ok: false };
      },
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        root.removeEventListener('click', onClick);
      },
    };
  },
};
