import { ALPHA, MILESTONES, up, isLetter, msgSyms, nextHint, eqText } from './logic.js';

function ensureStyles() {
  if (document.getElementById('cipher-css')) return;
  const link = document.createElement('link');
  link.id = 'cipher-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const TASKS = {
  symbol: () => 'Her sembolün hangi harf olduğu 🔑 anahtar tablosunda yazıyor. Bir kutuya dokun ve harfini yaz.',
  number: (l) => (l.table === 'full'
    ? 'Her sayı alfabedeki sırayı gösterir: A = 1, B = 2, C = 3 … Tablodan bakarak sayıları harfe çevir.'
    : 'Her sayı alfabedeki sırayı gösterir: A = 1, B = 2 … Tabloda sadece bazı sayılar yazıyor; gerisini sayarak bul!'),
  caesar: (l) => `Sezar şifresi: her harf alfabede ${l.shift} harf İLERİ kaydırıldı. Çözmek için her harften ${l.shift} harf GERİ say.`,
  partial: () => 'Anahtarda bazı semboller eksik. Eksikleri örnek kelimelerden bul: örnek kelimede bir sembolün altındaki harf, o sembolün harfidir.',
  equation: (l) => `Önce denklemlerden her meyvenin sayısını bul (her meyve 1 ile ${l.max} arasında bir sayı). Sonra sayı tablosuna bakıp harfe çevir.`,
  wordbox: () => 'Mesajdaki her kelime 📦 kelime kutusunda var. Kelimenin uzunluğuna ve bildiğin harflere bakarak hangisi olduğunu bul.',
};

export default {
  id: 'cipher',
  name: 'Şifre Çözme',
  icon: '🔐',
  description: 'Gizli mesajların şifresini çöz: semboller, sayılar, Sezar şifresi ve meyve denklemleri.',
  rules: 'Her sembol (ya da sayı, harf, meyve) mesajda hep aynı harfi gösterir; farklı semboller farklı harflerdir. Anahtar tablosu, kaydırma kuralı, örnek kelimeler, denklemler veya kelime kutusu sana gereken her bilgiyi verir. Her mesajın tek bir doğru çözümü vardır ve tahmin yapmadan bulunabilir.',
  howTo: [
    'Şifreli mesajdaki bir kutuya dokun.',
    'Alttaki harf klavyesinden (ya da bilgisayar klavyesinden) doğru harfi seç.',
    'Aynı sembolün olduğu bütün kutular birlikte dolar, tek tek yazman gerekmez!',
    'Hangi harf olduğunu bulmak için üstteki anahtar, kural ya da ipucu kutusuna bak.',
    'Kırmızı görünen harfleri iki farklı sembole yazmışsın demektir; birini düzelt.',
    'Takılırsan 💡 Akıllı İpucu sana nasıl düşüneceğini anlatır.',
  ],
  boosters: [
    { id: 'reveal', name: 'Harf Aç', icon: '🔍', uses: 3, description: 'Seçili (ya da sıradaki) sembolün harfini mesajın her yerinde açar.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış yazdığın harfleri kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki harfi nasıl bulacağını adım adım anlatır.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const T = level.type;
    const syms = msgSyms(level.text);
    const sol = level.solution;
    const entries = {}; // sembol → oyuncunun yazdığı harf
    const locked = new Set(); // verilen + açılan semboller
    const given = new Set();
    if (T === 'partial' || T === 'wordbox') {
      for (const [s, L] of level.key) if (syms.includes(s)) { entries[s] = L; locked.add(s); given.add(s); }
    }
    const wrong = new Set();
    let hint = null;
    let solved = false;

    // Hücreler: kelime kelime; yalnızca sembol hücreleri seçilebilir
    const cells = []; // { sym, wi }
    const maxLen = Math.max(...level.text.map((w) => w.length));
    const msgHtml = level.text.map((w, wi) => `<div class="cp-word" data-w="${wi}">${w.map((c) => {
      if (typeof c !== 'string') return `<span class="cp-lit">${esc(c.lit)}</span>`;
      const i = cells.length;
      cells.push({ sym: c, wi });
      return `<button class="cp-tile${T === 'caesar' ? ' cp-lettersym' : ''}${T === 'number' ? ' cp-num' : ''}" data-i="${i}" aria-label="Şifre ${esc(c)}"><span class="cp-sym">${esc(c)}</span><span class="cp-let"></span></button>`;
    }).join('')}</div>`).join('');

    container.innerHTML = `
      <div class="cipher-game" style="--maxlen:${maxLen}">
        <p class="cp-task">${esc(TASKS[T](level))}</p>
        <div class="cp-panel">${panelHtml(level)}</div>
        <div class="cp-msg" aria-label="Şifreli mesaj">${msgHtml}</div>
        <div class="cp-done" hidden></div>
        <div class="cp-kbd">
          ${ALPHA.map((L) => `<button data-l="${L}">${L}</button>`).join('')}
          <button data-act="erase" class="cp-erase" aria-label="Sil">⌫</button>
        </div>
      </div>`;
    const root = container.querySelector('.cipher-game');
    const tiles = [...root.querySelectorAll('.cp-tile')];
    const done = root.querySelector('.cp-done');
    const firstOpen = () => cells.findIndex((c) => !locked.has(c.sym) && !entries[c.sym]);
    let selected = Math.max(0, firstOpen());

    const render = () => {
      const selSym = cells[selected]?.sym;
      const owners = {};
      for (const s of syms) if (entries[s]) (owners[entries[s]] ??= []).push(s);
      const hintSyms = new Set(hint?.syms ?? []);
      tiles.forEach((el, i) => {
        const s = cells[i].sym;
        const L = entries[s] ?? '';
        el.querySelector('.cp-let').textContent = L;
        el.className = `cp-tile${T === 'caesar' ? ' cp-lettersym' : ''}${T === 'number' ? ' cp-num' : ''}`;
        if (given.has(s)) el.classList.add('given');
        else if (locked.has(s)) el.classList.add('revealed');
        if (!solved && i === selected) el.classList.add('sel');
        else if (!solved && s === selSym) el.classList.add('same');
        if (L && owners[L].length > 1) el.classList.add('conflict');
        if (wrong.has(s)) el.classList.add('wrong');
        if (hintSyms.has(s)) el.classList.add('hinted');
      });
      root.querySelectorAll('.cp-word').forEach((w) => w.classList.toggle('hi', hint?.word === Number(w.dataset.w)));
      root.querySelectorAll('[data-k]').forEach((el) => el.classList.toggle('hi', Boolean(hint?.key?.includes(el.dataset.k))));
      root.querySelectorAll('[data-eq]').forEach((el) => el.classList.toggle('hi', Boolean(hint?.eqs?.includes(Number(el.dataset.eq)))));
      root.querySelectorAll('[data-ex]').forEach((el) => el.classList.toggle('hi', hint?.example === Number(el.dataset.ex)));
      root.querySelectorAll('[data-bw]').forEach((el) => el.classList.toggle('hi', hint?.box === el.dataset.bw));
      // Klavyede kullanılmış harfleri soluk göster
      const usedL = new Set(Object.values(entries));
      root.querySelectorAll('.cp-kbd [data-l]').forEach((b) => b.classList.toggle('used', usedL.has(b.dataset.l)));
    };

    const checkSolved = () => {
      if (solved || !syms.every((s) => entries[s] === sol[s])) return;
      solved = true;
      hint = null;
      wrong.clear();
      render();
      root.classList.add('solved');
      done.hidden = false;
      done.innerHTML = `<span>🎉 Mesajı çözdün!</span><b>“${esc(level.display)}”</b>`;
      ctx.showHint('');
      setTimeout(ctx.onSolved, 700);
    };

    const moveNext = () => {
      for (let k = 1; k <= cells.length; k++) {
        const i = (selected + k) % cells.length;
        const s = cells[i].sym;
        if (!locked.has(s) && !entries[s]) { selected = i; return; }
      }
    };

    const input = (L) => {
      if (solved) return;
      const s = cells[selected]?.sym;
      if (!s) return;
      if (locked.has(s)) { ctx.toast(given.has(s) ? 'Bu harf zaten verilmiş.' : 'Bu harf açıldı, değiştirilemez.'); return; }
      wrong.delete(s);
      if (hint?.syms?.includes(s)) hint = null;
      if (L) {
        entries[s] = L;
        const other = syms.find((t) => t !== s && entries[t] === L);
        if (other) ctx.toast(`“${L}” harfini başka bir sembole de yazdın. Her harf tek bir sembolde olur.`);
        else moveNext();
      } else delete entries[s];
      render();
      checkSolved();
    };

    const move = (d) => {
      selected = (selected + d + cells.length) % cells.length;
      render();
    };

    const onClick = (e) => {
      if (solved) return;
      const tile = e.target.closest('.cp-tile');
      if (tile) { selected = Number(tile.dataset.i); render(); return; }
      const key = e.target.closest('.cp-kbd button');
      if (key) { if (key.dataset.l) input(key.dataset.l); else input(''); }
    };
    root.addEventListener('click', onClick);

    const onKey = (e) => {
      if (solved || document.querySelector('.modal') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.('input, textarea')) return;
      const k = e.key;
      if (k === 'Backspace' || k === 'Delete') { e.preventDefault(); input(''); return; }
      if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); move(1); return; }
      if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); move(-1); return; }
      if (k.length === 1) {
        const L = up(k);
        if (isLetter(L)) { e.preventDefault(); input(L); }
      }
    };
    document.addEventListener('keydown', onKey);

    const symName = (s) => (T === 'caesar' ? `“${s}” harfi` : T === 'number' ? `${s} sayısı` : `${s} sembolü`);

    const boosters = {
      reveal() {
        const open = (s) => !locked.has(s) && entries[s] !== sol[s];
        let s = cells[selected] && open(cells[selected].sym) ? cells[selected].sym : null;
        if (!s) s = cells.map((c) => c.sym).find(open) ?? null;
        if (!s) return { ok: false, message: 'Açılacak harf kalmadı; kırmızı harfleri düzelt.' };
        // Bu harfi yanlışlıkla başka bir sembole yazdıysan oradan silinir.
        for (const t of syms) if (t !== s && !locked.has(t) && entries[t] === sol[s]) delete entries[t];
        entries[s] = sol[s];
        locked.add(s);
        wrong.delete(s);
        if (hint?.syms?.includes(s)) hint = null;
        selected = cells.findIndex((c) => c.sym === s);
        moveNext();
        render();
        checkSolved();
        return { ok: true, message: `${symName(s)} = “${sol[s]}”. Mesajdaki bütün yerlerine yazıldı.` };
      },
      check() {
        wrong.clear();
        for (const s of syms) if (entries[s] && entries[s] !== sol[s]) wrong.add(s);
        render();
        if (!wrong.size) {
          const any = syms.some((s) => entries[s] && !locked.has(s));
          return { ok: false, message: any ? 'Hiç hata yok, harika gidiyorsun! (hak harcanmadı)' : 'Önce birkaç harf yaz, sonra kontrol edelim. (hak harcanmadı)' };
        }
        return { ok: true, message: `${wrong.size} sembolün harfi yanlış; kırmızıyla işaretlendi.` };
      },
      hint() {
        const h = nextHint(level, entries, cells[selected]?.sym);
        if (!h) return { ok: false, message: 'Doğru harflerin tamam; kırmızı olanları düzelt.' };
        hint = h;
        const idx = cells.findIndex((c) => c.sym === h.syms[0]);
        if (idx >= 0) selected = idx;
        render();
        const hasWrong = syms.some((s) => entries[s] && entries[s] !== sol[s]);
        return { ok: true, message: h.msg + (hasWrong ? ' (Not: mesajda yanlış harfler de var.)' : '') };
      },
    };

    render();
    return {
      useBooster: (id) => (solved ? { ok: false } : boosters[id]?.() ?? { ok: false }),
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        root.removeEventListener('click', onClick);
      },
    };
  },
};

// ---------------------------------------------------------------- Bilgi paneli
function keyChips(key) {
  return `<div class="cp-keys">${key.map(([s, L]) => `<span class="cp-k" data-k="${esc(s)}"><i>${esc(s)}</i><b>${L}</b></span>`).join('')}</div>`;
}

function panelHtml(level) {
  switch (level.type) {
    case 'symbol':
      return `<h3>🔑 Anahtar tablosu</h3>${keyChips(level.key)}`;
    case 'number': {
      const full = level.table === 'full';
      return `<h3>🔢 Alfabe sırası</h3><div class="cp-strip">${ALPHA.map((L, i) => {
        const n = i + 1;
        const show = full || MILESTONES.includes(n);
        return `<span class="cp-a${show ? '' : ' faint'}" data-k="${n}"><b>${L}</b><small>${show ? n : '·'}</small></span>`;
      }).join('')}</div>`;
    }
    case 'caesar':
      return `<h3>🔄 Alfabe (geri sayarken kullan)</h3><div class="cp-strip">${ALPHA.map((L, i) => `<span class="cp-a" data-k="${L}"><b>${L}</b>${level.strip === 'numbers' ? `<small>${i + 1}</small>` : ''}</span>`).join('')}</div>
        <p class="cp-note">Örnek: ${level.shift} ileri kaydırınca A → ${ALPHA[level.shift]} olur. Geri sayınca ${ALPHA[level.shift]} → A. A’dan geriye sayarken Z’ye dönersin.</p>`;
    case 'partial':
      return `<h3>🔑 Eksik anahtar</h3>${keyChips(level.key)}
        <h3>📝 Örnek kelimeler</h3>
        <div class="cp-examples">${level.examples.map((ex, k) => `<div class="cp-ex" data-ex="${k}">${ex.cells.map((s, i) => `<span><i>${esc(s)}</i><b>${ex.word[i]}</b></span>`).join('')}</div>`).join('')}</div>`;
    case 'equation':
      return `<h3>🧮 Meyve denklemleri</h3>
        <div class="cp-eqs">${level.eqs.map((e, k) => `<div class="cp-eq" data-eq="${k}">${esc(eqText(e))}</div>`).join('')}</div>
        <h3>🔢 Sayı tablosu</h3>
        <div class="cp-keys cp-table">${level.table.map(([n, L]) => `<span class="cp-k"><i>${n}</i><b>${L}</b></span>`).join('')}</div>`;
    case 'wordbox':
      return `<h3>🔑 Bilinen harfler</h3>${keyChips(level.key)}
        <h3>📦 Kelime kutusu</h3>
        <div class="cp-box">${level.box.map((w) => `<span data-bw="${esc(w)}">${w}</span>`).join('')}</div>`;
    default:
      return '';
  }
}
