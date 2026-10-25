import { parse, PEERS, ROW, COL, BOX, nextLogicalStep } from './logic.js';

function ensureStyles() {
  if (document.getElementById('sudoku-css')) return;
  const link = document.createElement('link');
  link.id = 'sudoku-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

export default {
  id: 'sudoku',
  name: 'Sudoku',
  icon: '🔢',
  description: '9×9 ızgarayı 1–9 rakamlarıyla doldur.',
  rules: 'Her satır, sütun ve 3×3 kutuda 1–9 rakamları birer kez yer almalı. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  boosters: [
    { id: 'reveal', name: 'Hücre Aç', icon: '🔍', uses: 3, description: 'Seçili (ya da rastgele) boş hücrenin doğru rakamını yerleştirir.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış girdiğin rakamları kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı hamleyi ve nedenini gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const given = parse(level.puzzle);
    const solution = parse(level.solution);
    const values = given.slice();
    const notes = new Array(81).fill(0);
    const locked = given.map(Boolean); // verilen + booster ile açılan hücreler
    const wrong = new Set();
    let selected = given.findIndex((v) => !v);
    let notesMode = false;
    let hintCell = -1;

    container.innerHTML = `
      <div class="sudoku" role="grid" aria-label="Sudoku tahtası">
        ${Array.from({ length: 81 }, (_, c) => `<button class="sc" data-c="${c}" role="gridcell"></button>`).join('')}
      </div>
      <div class="sudoku-pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button data-d="${d}">${d}</button>`).join('')}
        <button data-act="erase" title="Sil">⌫</button>
        <button data-act="notes" class="notes-btn" title="Not modu (N)">✏️ Not</button>
      </div>`;
    const cells = [...container.querySelectorAll('.sc')];
    const notesBtn = container.querySelector('.notes-btn');

    const render = () => {
      const sv = values[selected];
      cells.forEach((el, c) => {
        const v = values[c];
        el.className = 'sc';
        if (given[c]) el.classList.add('given');
        else if (locked[c]) el.classList.add('revealed');
        if (COL(c) % 3 === 2 && COL(c) !== 8) el.classList.add('br');
        if (ROW(c) % 3 === 2 && ROW(c) !== 8) el.classList.add('bb');
        if (selected >= 0) {
          if (c === selected) el.classList.add('sel');
          else if (ROW(c) === ROW(selected) || COL(c) === COL(selected) || BOX(c) === BOX(selected)) el.classList.add('peer');
          if (sv && v === sv && c !== selected) el.classList.add('same');
        }
        if (v && PEERS[c].some((p) => values[p] === v)) el.classList.add('conflict');
        if (wrong.has(c)) el.classList.add('wrong');
        if (c === hintCell) el.classList.add('hinted');
        if (v) el.textContent = v;
        else if (notes[c]) {
          el.innerHTML = `<span class="notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<i>${notes[c] & (1 << d) ? d : ''}</i>`).join('')}</span>`;
        } else el.textContent = '';
      });
      notesBtn.classList.toggle('on', notesMode);
    };

    const checkSolved = () => {
      if (values.every((v, i) => v === solution[i])) {
        selected = -1;
        render();
        container.querySelector('.sudoku').classList.add('solved');
        setTimeout(ctx.onSolved, 400);
      }
    };

    const input = (d) => {
      const c = selected;
      if (c < 0 || locked[c]) return;
      wrong.delete(c);
      if (c === hintCell) hintCell = -1;
      if (notesMode && d) {
        if (!values[c]) notes[c] ^= 1 << d;
      } else {
        values[c] = values[c] === d ? 0 : d;
        if (values[c]) for (const p of PEERS[c]) notes[p] &= ~(1 << d); // komşu notları temizle
      }
      render();
      checkSolved();
    };

    container.addEventListener('click', (e) => {
      const cell = e.target.closest('.sc');
      if (cell) { selected = Number(cell.dataset.c); render(); return; }
      const btn = e.target.closest('.sudoku-pad button');
      if (!btn) return;
      if (btn.dataset.d) input(Number(btn.dataset.d));
      else if (btn.dataset.act === 'erase') input(0);
      else if (btn.dataset.act === 'notes') { notesMode = !notesMode; render(); }
    });

    const onKey = (e) => {
      if (e.target.closest('input, textarea') || document.querySelector('.modal')) return;
      const k = e.key;
      if (/^[1-9]$/.test(k)) input(Number(k));
      else if (k === 'Backspace' || k === 'Delete' || k === '0') input(0);
      else if (k === 'n' || k === 'N') { notesMode = !notesMode; render(); }
      else if (k.startsWith('Arrow')) {
        e.preventDefault();
        if (selected < 0) selected = 0;
        const r = ROW(selected), col = COL(selected);
        const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
        selected = ((r + dr + 9) % 9) * 9 + ((col + dc + 9) % 9);
        render();
      }
    };
    document.addEventListener('keydown', onKey);

    const cellName = (c) => `${ROW(c) + 1}. satır, ${COL(c) + 1}. sütun`;

    const boosters = {
      reveal() {
        const open = (c) => !locked[c] && values[c] !== solution[c];
        let c = selected >= 0 && open(selected) ? selected : -1;
        if (c < 0) {
          const pool = values.map((_, i) => i).filter(open);
          if (!pool.length) return { ok: false, message: 'Açılacak hücre yok.' };
          c = pool[Math.floor(Math.random() * pool.length)];
        }
        values[c] = solution[c];
        notes[c] = 0;
        locked[c] = true;
        wrong.delete(c);
        for (const p of PEERS[c]) notes[p] &= ~(1 << solution[c]);
        selected = c;
        render();
        checkSolved();
        return { ok: true, message: `${cellName(c)} açıldı: ${solution[c]}` };
      },
      check() {
        wrong.clear();
        values.forEach((v, c) => { if (v && v !== solution[c]) wrong.add(c); });
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} hatalı hücre kırmızıyla işaretlendi.` };
      },
      hint() {
        // Sadece doğru girişler dikkate alınır; yanlışlar ipucunu bozmaz.
        const base = values.map((v, c) => (v === solution[c] ? v : 0));
        const step = nextLogicalStep(base);
        if (!step) return { ok: false, message: 'İpucu bulunamadı.' };
        hintCell = step.cell;
        selected = step.cell;
        render();
        const where = cellName(step.cell);
        const pre = step.advanced ? 'Aday elemeleri (çiftler/işaretleme) yaptıktan sonra: ' : '';
        const msg = step.reason === 'naked'
          ? `${pre}${where} hücresine yalnızca ${step.value} girebilir.`
          : `${pre}${step.value} rakamı bu ${step.unit} yalnızca ${where} hücresine girebilir.`;
        const hasWrong = values.some((v, c) => v && v !== solution[c]);
        return { ok: true, message: msg + (hasWrong ? ' (Not: tahtada hatalı rakamlar var.)' : '') };
      },
    };

    render();
    return {
      useBooster: (id) => boosters[id]?.() ?? { ok: false },
      destroy: () => document.removeEventListener('keydown', onKey),
    };
  },
};
