import { parsePuzzle, geom, lineStatus, nextStep, explainStep, cellRef } from './logic.js';

function ensureStyles() {
  if (document.getElementById('magicsquare-css')) return;
  const link = document.createElement('link');
  link.id = 'magicsquare-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const KEY_WAIT_MS = 900;

export default {
  id: 'magicsquare',
  name: 'Sihirli Kare',
  icon: '✨',
  description: 'Sayıları öyle yerleştir ki her satır, sütun ve çaprazın toplamı aynı olsun.',
  rules: 'Alttaki sayıların her birini tam bir kez kullanarak ızgarayı doldur. Her satırın, her sütunun ve iki ana çaprazın toplamı “sihirli toplam”a eşit olmalı. Kenardaki küçük sayılar o çizginin şu anki toplamını gösterir: doğruysa yeşil, yanlışsa kırmızı olur. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  howTo: [
    'Bir boş kareye dokun, sonra alttaki sayılardan birini seç.',
    'Her satırın, her sütunun ve iki çaprazın toplamı sihirli toplama eşit olmalı.',
    'Her sayıyı yalnızca bir kez kullanabilirsin; kullanılan sayılar soluk görünür.',
    'Kenardaki toplamlara bak: yeşil doğru, kırmızı yanlış demek.',
    'İpucu: Bir çizgide tek boş kare kaldıysa eksik sayı = sihirli toplam − diğerleri!',
    'Takılırsan 💡 Akıllı İpucu bir sonraki adımı ve nedenini anlatır.',
  ],
  boosters: [
    { id: 'reveal', name: 'Hücre Aç', icon: '🔍', uses: 3, description: 'Seçili (ya da rastgele) boş karenin doğru sayısını yerleştirir.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış yere koyduğun sayıları kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı hamleyi ve nedenini gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const { n, nums, cells: given, target } = parsePuzzle(level.puzzle);
    const solution = level.solution;
    const { N, lines } = geom(n);
    const L = lines.length; // satırlar, sütunlar, ↘, ↙
    const values = given.slice();
    const locked = given.map(Boolean);
    const wrong = new Set();
    let selected = given.findIndex((v) => !v);
    let hintCell = -1;
    let hintLines = new Set();
    let solved = false;
    let keyBuf = '';
    let keyTimer = 0;

    const maxDigits = String(Math.max(...nums)).length;
    const root = document.createElement('div');
    root.className = `magicsq ms${n}${maxDigits > 1 ? ' wide' : ''}`;
    root.style.setProperty('--n', n);

    const sumBadge = (l, cls, label) => `<div class="ms-sum ${cls}" data-l="${l}" aria-label="${label}"><span></span></div>`;
    const parts = [];
    // üst satır: yalnızca ↙ çapraz toplamı (sağ üst köşede)
    for (let c = 0; c < n; c++) parts.push('<div class="ms-gap top"></div>');
    parts.push(sumBadge(2 * n + 1, 'diag anti', '↙ çapraz toplamı'));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const i = r * n + c;
        parts.push(`<button class="ms-cell" data-c="${i}" aria-label="${r + 1}. satır, ${c + 1}. sütun"></button>`);
      }
      parts.push(sumBadge(r, 'row', `${r + 1}. satır toplamı`));
    }
    for (let c = 0; c < n; c++) parts.push(sumBadge(n + c, 'col', `${c + 1}. sütun toplamı`));
    parts.push(sumBadge(2 * n, 'diag main', '↘ çapraz toplamı'));

    root.innerHTML = `
      <div class="ms-target">Sihirli toplam: <b>${target}</b></div>
      <div class="ms-board" role="grid" aria-label="Sihirli kare ${n}×${n}">${parts.join('')}</div>
      <div class="ms-tray">
        ${nums.map((v) => `<button class="ms-num" data-v="${v}">${v}</button>`).join('')}
        <button class="ms-num erase" data-act="erase" title="Sil" aria-label="Sil">⌫</button>
      </div>`;
    container.appendChild(root);
    const board = root.querySelector('.ms-board');
    const cellEls = [...root.querySelectorAll('.ms-cell')];
    const sumEls = [];
    root.querySelectorAll('.ms-sum').forEach((el) => { sumEls[Number(el.dataset.l)] = el; });
    const numEls = new Map([...root.querySelectorAll('.ms-num[data-v]')].map((el) => [Number(el.dataset.v), el]));

    const linesOf = (c) => {
      const r = Math.floor(c / n), col = c % n;
      const out = [r, n + col];
      if (r === col) out.push(2 * n);
      if (r + col === n - 1) out.push(2 * n + 1);
      return out;
    };

    const render = () => {
      const status = lineStatus(n, values, target);
      const selLines = selected >= 0 ? new Set(linesOf(selected)) : new Set();
      const hintArea = new Set();
      for (const l of hintLines) for (const c of lines[l]) hintArea.add(c);
      cellEls.forEach((el, c) => {
        const v = values[c];
        el.className = 'ms-cell';
        if (given[c]) el.classList.add('given');
        else if (locked[c]) el.classList.add('revealed');
        if (c === selected) el.classList.add('sel');
        else if (selected >= 0 && linesOf(c).some((l) => selLines.has(l) && l < 2 * n)) el.classList.add('peer');
        if (hintArea.has(c)) el.classList.add('area');
        if (c === hintCell) el.classList.add('hinted');
        if (wrong.has(c)) el.classList.add('wrong');
        el.textContent = v ? v : '';
      });
      for (let l = 0; l < L; l++) {
        const el = sumEls[l], st = status[l];
        el.className = el.className.replace(/\s(ok|bad|lit|hl)\b/g, '');
        el.querySelector('span').textContent = st.sum;
        if (st.ok) el.classList.add('ok');
        else if (st.bad) el.classList.add('bad');
        if (selLines.has(l)) el.classList.add('lit');
        if (hintLines.has(l)) el.classList.add('hl');
      }
      const used = new Set(values.filter(Boolean));
      for (const [v, el] of numEls) el.classList.toggle('used', used.has(v));
    };

    const isMagic = () => values.every(Boolean) && lineStatus(n, values, target).every((s) => s.ok)
      && new Set(values).size === N;

    const checkSolved = () => {
      if (solved || !isMagic()) return;
      solved = true;
      selected = -1;
      hintCell = -1;
      hintLines = new Set();
      render();
      board.classList.add('solved');
      ctx.showHint('Harika! Bütün toplamlar ' + target + ' oldu. ✨');
      setTimeout(ctx.onSolved, 500);
    };

    const clearHint = () => { hintCell = -1; hintLines = new Set(); };

    const put = (v) => {
      const c = selected;
      if (solved || c < 0) return;
      if (locked[c]) { ctx.toast('Bu kare baştan verilmiş, değiştirilemez.'); return; }
      wrong.delete(c);
      if (c === hintCell) clearHint();
      if (!v || values[c] === v) { values[c] = 0; render(); return; }
      const from = values.indexOf(v);
      if (from >= 0) {
        if (locked[from]) { ctx.toast(`${v} zaten tahtada; her sayı bir kez kullanılır.`); return; }
        values[from] = 0; // sayıyı başka kareden buraya taşı
        wrong.delete(from);
      }
      values[c] = v;
      render();
      checkSolved();
    };

    const onClick = (e) => {
      if (solved) return;
      const cell = e.target.closest('.ms-cell');
      if (cell) { selected = Number(cell.dataset.c); keyBuf = ''; render(); return; }
      const btn = e.target.closest('.ms-num');
      if (!btn) return;
      if (btn.dataset.act === 'erase') put(0);
      else put(Number(btn.dataset.v));
    };
    root.addEventListener('click', onClick);

    // Klavye: rakamları yaz (iki basamaklı sayılar için kısa bir süre beklenir).
    const flushKeys = () => {
      clearTimeout(keyTimer);
      const v = Number(keyBuf);
      keyBuf = '';
      if (nums.includes(v)) put(v);
    };
    const onKey = (e) => {
      if (solved || e.target.closest?.('input, textarea') || document.querySelector('.modal')) return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) {
        if (selected < 0) return;
        keyBuf += k;
        const v = Number(keyBuf);
        const longer = nums.some((x) => String(x).length > keyBuf.length && String(x).startsWith(keyBuf));
        clearTimeout(keyTimer);
        if (!longer) flushKeys();
        else if (!nums.includes(v)) keyTimer = setTimeout(() => { keyBuf = ''; }, KEY_WAIT_MS);
        else keyTimer = setTimeout(flushKeys, KEY_WAIT_MS);
      } else if (k === 'Backspace' || k === 'Delete') { keyBuf = ''; put(0); }
      else if (k === 'Enter' && keyBuf) flushKeys();
      else if (k.startsWith('Arrow')) {
        e.preventDefault();
        keyBuf = '';
        if (selected < 0) selected = 0;
        const r = Math.floor(selected / n), col = selected % n;
        const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k] ?? [0, 0];
        selected = ((r + dr + n) % n) * n + ((col + dc + n) % n);
        render();
      }
    };
    document.addEventListener('keydown', onKey);

    const boosters = {
      reveal() {
        const open = (c) => !locked[c] && values[c] !== solution[c];
        let c = selected >= 0 && open(selected) ? selected : -1;
        if (c < 0) {
          const pool = values.map((_, i) => i).filter(open);
          if (!pool.length) return { ok: false, message: 'Açılacak kare yok.' };
          const empties = pool.filter((i) => !values[i]);
          const from = empties.length ? empties : pool;
          c = from[Math.floor(Math.random() * from.length)];
        }
        const v = solution[c];
        const prev = values.indexOf(v);
        if (prev >= 0 && prev !== c) { values[prev] = 0; wrong.delete(prev); }
        values[c] = v;
        locked[c] = true;
        wrong.delete(c);
        if (c === hintCell) clearHint();
        selected = c;
        render();
        checkSolved();
        return { ok: true, message: `${cellRef(n, c)} kare açıldı: ${v}` };
      },
      check() {
        wrong.clear();
        values.forEach((v, c) => { if (v && !locked[c] && v !== solution[c]) wrong.add(c); });
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} kare yanlış: kırmızıyla işaretlendi.` };
      },
      hint() {
        // Sadece doğru girişler dikkate alınır; yanlışlar ipucunu bozmaz.
        const base = values.map((v, c) => (v === solution[c] ? v : 0));
        if (base.every(Boolean)) return { ok: false, message: 'Doğru sayılar tamam; kırmızı kareleri düzelt.' };
        const step = nextStep(n, nums, base);
        if (!step) return { ok: false, message: 'Şu an ipucu bulunamadı. Hücre Aç boosterını deneyebilirsin.' };
        hintCell = step.cell;
        hintLines = new Set(step.lines);
        selected = step.cell;
        render();
        const hasWrong = values.some((v, c) => v && v !== solution[c]);
        return { ok: true, message: explainStep(n, step) + (hasWrong ? ' (Not: tahtada yanlış sayılar var.)' : '') };
      },
    };

    render();
    return {
      useBooster: (id) => (solved ? { ok: false } : boosters[id]?.() ?? { ok: false }),
      destroy: () => {
        clearTimeout(keyTimer);
        document.removeEventListener('keydown', onKey);
        root.removeEventListener('click', onClick);
      },
    };
  },
};
