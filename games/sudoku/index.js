import { parse, geomOf, nextLogicalStep, unitName, cellName } from './logic.js';

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
  description: '4×4, 6×6 ve 9×9 ızgaraları rakamlarla doldur; her satır, sütun ve bölgede her rakam bir kez.',
  rules: 'Izgara kalın çizgilerle bölgelere ayrılmıştır (4×4’te 2×2, 6×6’da 2×3, 9×9’da 3×3). Her satır, sütun ve bölgede 1’den ızgara boyutuna kadar her rakam yalnızca bir kez yer almalı. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  howTo: [
    "Bir boş kareye dokun, sonra alttaki rakamlardan birini seç.",
    "Her satırda, her sütunda ve kalın çizgiyle ayrılmış her bölgede bir rakam yalnızca bir kez olabilir.",
    "Kırmızı görünen rakam, aynı satır, sütun ya da bölgede tekrar ediyor demektir.",
    "Emin olmadığın yerlere ✏️ Not ile küçük notlar alabilirsin.",
    "Takılırsan 💡 Akıllı İpucu sana bir sonraki adımı ve nedenini anlatır.",
  ],
  boosters: [
    { id: 'reveal', name: 'Hücre Aç', icon: '🔍', uses: 3, description: 'Seçili (ya da rastgele) boş hücrenin doğru rakamını yerleştirir.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış girdiğin rakamları kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı hamleyi ve nedenini gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const G = geomOf(level);
    const { n, N, row: ROW, col: COL, box: BOX, peers: PEERS } = G;
    const digits = Array.from({ length: n }, (_, i) => i + 1);
    const given = parse(level.puzzle);
    const solution = parse(level.solution);
    const values = given.slice();
    const notes = new Array(N).fill(0);
    const locked = given.map(Boolean); // verilen + booster ile açılan hücreler
    const wrong = new Set();
    let selected = given.findIndex((v) => !v);
    let notesMode = false;
    let hintCell = -1;
    let hintArea = new Set();
    let solved = false;

    container.innerHTML = `
      <div class="sudoku-game sz${n}" style="--n:${n};--bc:${G.bc};--br:${G.br}">
        <div class="sudoku" role="grid" aria-label="Sudoku tahtası ${n}×${n}">
          ${Array.from({ length: N }, (_, c) => `<button class="sc" data-c="${c}" role="gridcell" aria-label="${cellName(G, c)}"></button>`).join('')}
        </div>
        <div class="sudoku-pad">
          ${digits.map((d) => `<button data-d="${d}">${d}</button>`).join('')}
          <button data-act="erase" title="Sil" aria-label="Sil">⌫</button>
          <button data-act="notes" class="notes-btn" title="Not modu (N)">✏️ Not</button>
        </div>
      </div>`;
    const root = container.querySelector('.sudoku-game');
    const board = root.querySelector('.sudoku');
    const cells = [...root.querySelectorAll('.sc')];
    const notesBtn = root.querySelector('.notes-btn');

    const render = () => {
      const sv = values[selected];
      cells.forEach((el, c) => {
        const v = values[c];
        el.className = 'sc';
        if (given[c]) el.classList.add('given');
        else if (locked[c]) el.classList.add('revealed');
        if (COL(c) % G.bc === G.bc - 1 && COL(c) !== n - 1) el.classList.add('br');
        if (ROW(c) % G.br === G.br - 1 && ROW(c) !== n - 1) el.classList.add('bb');
        if (COL(c) === n - 1) el.classList.add('lastc');
        if (ROW(c) === n - 1) el.classList.add('lastr');
        if (selected >= 0) {
          if (c === selected) el.classList.add('sel');
          else if (ROW(c) === ROW(selected) || COL(c) === COL(selected) || BOX(c) === BOX(selected)) el.classList.add('peer');
          if (sv && v === sv && c !== selected) el.classList.add('same');
        }
        if (v && PEERS[c].some((p) => values[p] === v)) el.classList.add('conflict');
        if (wrong.has(c)) el.classList.add('wrong');
        if (hintArea.has(c)) el.classList.add('area');
        if (c === hintCell) el.classList.add('hinted');
        if (v) el.textContent = v;
        else if (notes[c]) {
          el.innerHTML = `<span class="notes">${digits.map((d) => `<i>${notes[c] & (1 << d) ? d : ''}</i>`).join('')}</span>`;
        } else el.textContent = '';
      });
      notesBtn.classList.toggle('on', notesMode);
    };

    const checkSolved = () => {
      if (solved || !values.every((v, i) => v === solution[i])) return;
      solved = true;
      selected = -1;
      hintCell = -1;
      hintArea = new Set();
      render();
      board.classList.add('solved');
      setTimeout(ctx.onSolved, 400);
    };

    const clearHint = () => { hintCell = -1; hintArea = new Set(); };

    const input = (d) => {
      const c = selected;
      if (solved || c < 0 || locked[c]) return;
      wrong.delete(c);
      if (c === hintCell) clearHint();
      if (notesMode && d) {
        if (!values[c]) notes[c] ^= 1 << d;
      } else {
        values[c] = values[c] === d ? 0 : d;
        if (values[c]) for (const p of PEERS[c]) notes[p] &= ~(1 << d); // komşu notları temizle
      }
      render();
      checkSolved();
    };

    const onClick = (e) => {
      if (solved) return;
      const cell = e.target.closest('.sc');
      if (cell) { selected = Number(cell.dataset.c); render(); return; }
      const btn = e.target.closest('.sudoku-pad button');
      if (!btn) return;
      if (btn.dataset.d) input(Number(btn.dataset.d));
      else if (btn.dataset.act === 'erase') input(0);
      else if (btn.dataset.act === 'notes') { notesMode = !notesMode; render(); }
    };
    root.addEventListener('click', onClick);

    const onKey = (e) => {
      if (solved || e.target.closest?.('input, textarea') || document.querySelector('.modal')) return;
      const k = e.key;
      if (/^[1-9]$/.test(k)) { if (Number(k) <= n) input(Number(k)); }
      else if (k === 'Backspace' || k === 'Delete' || k === '0') input(0);
      else if (k === 'n' || k === 'N') { notesMode = !notesMode; render(); }
      else if (k.startsWith('Arrow')) {
        e.preventDefault();
        if (selected < 0) selected = 0;
        const r = ROW(selected), col = COL(selected);
        const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
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
          if (!pool.length) return { ok: false, message: 'Açılacak hücre yok.' };
          c = pool[Math.floor(Math.random() * pool.length)];
        }
        values[c] = solution[c];
        notes[c] = 0;
        locked[c] = true;
        wrong.delete(c);
        if (c === hintCell) clearHint();
        for (const p of PEERS[c]) notes[p] &= ~(1 << solution[c]);
        selected = c;
        render();
        checkSolved();
        return { ok: true, message: `${cellName(G, c)} açıldı: ${solution[c]}` };
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
        if (base.every(Boolean)) return { ok: false, message: 'Doğru rakamlar tamam; yanlış hücreleri düzelt.' };
        const step = nextLogicalStep(G, base);
        if (!step) return { ok: false, message: 'İpucu bulunamadı.' };
        hintCell = step.cell;
        selected = step.cell;
        const where = cellName(G, step.cell);
        let msg;
        if (step.steps.length) {
          const key = step.steps[step.steps.length - 1];
          hintArea = new Set(key.cells);
          const before = step.steps.length > 1 ? ` (Bundan önce ${step.steps.length - 1} başka aday elemesi de gerekiyor.)` : '';
          msg = `${key.tech}: ${key.text} Bu elemeden sonra ${where} hücresine ${step.value} gelir.${before}`;
        } else if (step.reason === 'naked') {
          hintArea = new Set(PEERS[step.cell].filter((p) => base[p]));
          msg = `${where} hücresine yalnızca ${step.value} girebilir: satırı, sütunu ve bölgesi diğer rakamları zaten içeriyor.`;
        } else {
          hintArea = new Set(G.units[step.unit]);
          msg = `${step.value} rakamı ${unitName(G, step.unit)} içinde yalnızca tek bir hücreye girebilir: ${where}.`;
        }
        render();
        const hasWrong = values.some((v, c) => v && v !== solution[c]);
        return { ok: true, message: msg + (hasWrong ? ' (Not: tahtada hatalı rakamlar var.)' : '') };
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
