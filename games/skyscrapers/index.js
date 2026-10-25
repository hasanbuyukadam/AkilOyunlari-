import { parsePuzzle, parseSolution, geometry, visibleCount, lineClues, nextLogicalStep, cellName } from './logic.js';

function ensureStyles() {
  if (document.getElementById('skyscrapers-css')) return;
  const link = document.createElement('link');
  link.id = 'skyscrapers-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const SIDE_TITLE = { top: 'üstten', bottom: 'alttan', left: 'soldan', right: 'sağdan' };

export default {
  id: 'skyscrapers',
  name: 'Apartmanlar',
  icon: '🏙️',
  description: 'Kenardaki sayılara bakarak binaların kat sayılarını yerleştir.',
  rules: 'Her satır ve sütunda 1’den N’ye kadar her bina yüksekliği birer kez bulunur. Kenardaki sayı, o taraftan bakınca kaç bina görüldüğünü söyler: yüksek bina arkasındaki alçak binaları gizler. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  boosters: [
    { id: 'reveal', name: 'Hücre Aç', icon: '🔍', uses: 3, description: 'Seçili (ya da rastgele) boş hücrenin doğru bina yüksekliğini yerleştirir.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış yerleştirdiğin binaları kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı hamleyi, ilgili kenar ipucunu ve nedenini gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const { n, clues, grid: given } = parsePuzzle(level);
    const solution = parseSolution(level.solution);
    const G = geometry(n);
    const values = given.slice();
    const notes = new Array(G.N).fill(0);
    const locked = given.map(Boolean);
    const wrong = new Set();
    let selected = given.findIndex((v) => !v);
    let notesMode = false;
    let hint = null; // { cell, clues: [{side, idx}], line }
    let solved = false;
    const row = (c) => Math.floor(c / n), col = (c) => c % n;

    const clueEl = (side, i) => {
      const v = clues[side][i];
      return `<div class="sk-clue sk-${side}${v ? '' : ' empty'}" data-side="${side}" data-i="${i}"${v ? ` aria-label="${SIDE_TITLE[side]} ${v} bina görünür"` : ''}>${v || ''}</div>`;
    };
    let html = '<div class="sk-corner"></div>';
    for (let i = 0; i < n; i++) html += clueEl('top', i);
    html += '<div class="sk-corner"></div>';
    for (let r = 0; r < n; r++) {
      html += clueEl('left', r);
      for (let k = 0; k < n; k++) html += `<button class="sk-cell" data-c="${r * n + k}" aria-label="${r + 1}. satır, ${k + 1}. sütun"></button>`;
      html += clueEl('right', r);
    }
    html += '<div class="sk-corner"></div>';
    for (let i = 0; i < n; i++) html += clueEl('bottom', i);
    html += '<div class="sk-corner"></div>';

    container.innerHTML = `
      <div class="skyscrapers" style="--n:${n}">
        <div class="sk-board" role="grid" aria-label="Apartmanlar tahtası">${html}</div>
        <div class="sk-pad">
          ${Array.from({ length: n }, (_, i) => `<button data-d="${i + 1}">${i + 1}</button>`).join('')}
          <button data-act="erase" title="Sil (Backspace)" aria-label="Sil">⌫</button>
          <button data-act="notes" class="sk-notes-btn" title="Not modu (N)">✏️ Not</button>
        </div>
      </div>`;
    const root = container.querySelector('.skyscrapers');
    const board = root.querySelector('.sk-board');
    const cells = [...root.querySelectorAll('.sk-cell')];
    const clueEls = Object.fromEntries(['top', 'bottom', 'left', 'right'].map((s) => [s, [...root.querySelectorAll(`.sk-clue.sk-${s}`)]]));
    const notesBtn = root.querySelector('.sk-notes-btn');
    const noteCols = n <= 4 ? 2 : 3;

    const lineState = (L) => {
      const vals = L.cells.map((c) => values[c]);
      if (vals.some((v) => !v)) return [null, null];
      const [s, e] = lineClues(clues, L);
      return [s ? visibleCount(vals) === s : null, e ? visibleCount(vals.slice().reverse()) === e : null];
    };

    const render = () => {
      const sv = selected >= 0 ? values[selected] : 0;
      const hintLineCells = hint?.line ? G.lines[(hint.line.kind === 'row' ? 0 : n) + hint.line.idx].cells : [];
      cells.forEach((el, c) => {
        const v = values[c];
        const cls = ['sk-cell'];
        if (row(c) === 0) cls.push('et');
        if (row(c) === n - 1) cls.push('eb');
        if (col(c) === 0) cls.push('el');
        if (col(c) === n - 1) cls.push('er');
        if (given[c]) cls.push('given');
        else if (locked[c]) cls.push('revealed');
        if (selected >= 0 && !solved) {
          if (c === selected) cls.push('sel');
          else if (row(c) === row(selected) || col(c) === col(selected)) cls.push('peer');
          if (sv && v === sv && c !== selected) cls.push('same');
        }
        if (v && G.peers[c].some((p) => values[p] === v)) cls.push('conflict');
        if (wrong.has(c)) cls.push('wrong');
        if (hintLineCells.includes(c)) cls.push('hline');
        if (hint && c === hint.cell) cls.push('hinted');
        el.className = cls.join(' ');
        el.style.setProperty('--h', v ? v / n : 0);
        if (v) el.innerHTML = `<span class="sk-v">${v}</span>`;
        else if (notes[c]) {
          let s = `<span class="sk-notes" style="--nc:${noteCols}">`;
          for (let d = 1; d <= n; d++) s += `<i>${notes[c] & (1 << d) ? d : ''}</i>`;
          el.innerHTML = s + '</span>';
        } else el.textContent = '';
      });
      for (const L of G.lines) {
        const [okS, okE] = lineState(L);
        const pairs = [[clueEls[L.startSide][L.idx], okS], [clueEls[L.endSide][L.idx], okE]];
        for (const [el, ok] of pairs) {
          el.classList.toggle('bad', ok === false);
          el.classList.toggle('done', ok === true);
          el.classList.remove('hinted');
        }
      }
      for (const ref of hint?.clues ?? []) clueEls[ref.side][ref.idx].classList.add('hinted');
      notesBtn.classList.toggle('on', notesMode);
    };

    const checkSolved = () => {
      if (solved || !values.every((v, i) => v === solution[i])) return;
      solved = true;
      hint = null;
      render();
      board.classList.add('solved');
      setTimeout(ctx.onSolved, 450);
    };

    const input = (d) => {
      const c = selected;
      if (solved || c < 0 || locked[c]) return;
      wrong.delete(c);
      hint = null;
      if (notesMode && d) {
        if (!values[c]) notes[c] ^= 1 << d;
      } else {
        values[c] = values[c] === d ? 0 : d;
        if (values[c]) for (const p of G.peers[c]) notes[p] &= ~(1 << d);
      }
      render();
      checkSolved();
    };

    const onClick = (e) => {
      const cell = e.target.closest('.sk-cell');
      if (cell) { if (!solved) { selected = Number(cell.dataset.c); render(); } return; }
      const btn = e.target.closest('.sk-pad button');
      if (!btn) return;
      if (btn.dataset.d) input(Number(btn.dataset.d));
      else if (btn.dataset.act === 'erase') input(0);
      else if (btn.dataset.act === 'notes') { notesMode = !notesMode; render(); }
    };
    root.addEventListener('click', onClick);

    const onKey = (e) => {
      if (e.target.closest?.('input, textarea') || document.querySelector('.modal') || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (/^[1-9]$/.test(k)) { if (Number(k) <= n) input(Number(k)); }
      else if (k === 'Backspace' || k === 'Delete' || k === '0') input(0);
      else if (k === 'n' || k === 'N') { notesMode = !notesMode; render(); }
      else if (k.startsWith('Arrow')) {
        e.preventDefault();
        if (selected < 0) selected = 0;
        const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k] ?? [0, 0];
        selected = ((row(selected) + dr + n) % n) * n + ((col(selected) + dc + n) % n);
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
        const v = solution[c];
        values[c] = v;
        notes[c] = 0;
        locked[c] = true;
        wrong.delete(c);
        for (const p of G.peers[c]) notes[p] &= ~(1 << v);
        selected = c;
        hint = null;
        render();
        checkSolved();
        return { ok: true, message: `${cellName(n, c)} açıldı: ${v} katlı bina.` };
      },
      check() {
        wrong.clear();
        values.forEach((v, c) => { if (v && v !== solution[c]) wrong.add(c); });
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} hatalı bina kırmızıyla işaretlendi.` };
      },
      hint() {
        // Yalnızca doğru girişler dikkate alınır; yanlışlar ipucunu bozmaz.
        const base = values.map((v, c) => (v === solution[c] ? v : 0));
        const step = nextLogicalStep(n, clues, base);
        if (!step) return { ok: false, message: 'İpucu bulunamadı.' };
        hint = step;
        selected = step.cell;
        render();
        const hasWrong = values.some((v, c) => v && v !== solution[c]);
        return { ok: true, message: step.text + (hasWrong ? ' (Not: tahtada hatalı binalar var.)' : '') };
      },
    };

    render();
    return {
      useBooster: (id) => boosters[id]?.() ?? { ok: false },
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        root.removeEventListener('click', onClick);
      },
    };
  },
};
