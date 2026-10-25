import { parsePuzzle, parseSolution, relationsOf, violations, nextLogicalStep, chainLengths, digitsOf } from './logic.js';

function ensureStyles() {
  if (document.getElementById('futoshiki-css')) return;
  const link = document.createElement('link');
  link.id = 'futoshiki-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const SIGN_TEXT = { '<': '<', '>': '>', '^': '∧', v: '∨' };

export default {
  id: 'futoshiki',
  name: 'Büyük-Küçük',
  icon: '⚖️',
  description: 'Rakamları yerleştir; aradaki büyüktür/küçüktür işaretlerine uy.',
  rules: 'Her satır ve sütunda 1’den N’ye kadar her rakam birer kez yer almalı. Hücreler arasındaki < ve > (dikeyde ∧ ve ∨) işaretleri doğru olmalı: işaretin sivri ucu küçük sayıyı gösterir. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  boosters: [
    { id: 'reveal', name: 'Hücre Aç', icon: '🔍', uses: 3, description: 'Seçili (ya da rastgele) boş hücrenin doğru rakamını yerleştirir.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış girdiğin rakamları kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı hamleyi nedeniyle birlikte gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const { N, givens, h, v } = parsePuzzle(level.puzzle);
    const solution = parseSolution(level.solution);
    const rels = relationsOf(N, h, v);
    const n = N * N;
    const values = givens.slice();
    const notes = new Array(n).fill(0);
    const locked = givens.map(Boolean);
    const wrong = new Set();
    const hintCells = new Set();
    let hintCell = -1;
    let lastHint = null;
    let selected = givens.findIndex((x) => !x);
    let notesMode = false;
    let solved = false;

    // Izgara: 2N-1 sütun/satır; çift konumlar hücre, tek konumlar işaret boşluğu
    const parts = [];
    for (let R = 0; R < 2 * N - 1; R++) {
      for (let C = 0; C < 2 * N - 1; C++) {
        const r = R >> 1, c = C >> 1;
        if (R % 2 === 0 && C % 2 === 0) {
          parts.push(`<button class="fs-cell" data-c="${r * N + c}" aria-label="${r + 1}. satır, ${c + 1}. sütun"></button>`);
        } else if (R % 2 === 0) {
          const s = h[r * (N - 1) + c];
          parts.push(`<span class="fs-sign fs-h" data-h="${r * (N - 1) + c}">${s !== '.' ? SIGN_TEXT[s] : ''}</span>`);
        } else if (C % 2 === 0) {
          const s = v[r * N + c];
          parts.push(`<span class="fs-sign fs-v" data-v="${r * N + c}">${s !== '.' ? SIGN_TEXT[s] : ''}</span>`);
        } else parts.push('<span class="fs-gap"></span>');
      }
    }
    const padCols = N + 2;
    container.innerHTML = `
      <div class="futoshiki" style="--n:${N}">
        <div class="fs-board" role="grid" aria-label="Büyük-Küçük tahtası">${parts.join('')}</div>
        <div class="fs-pad" style="--pc:${padCols}">
          ${Array.from({ length: N }, (_, i) => `<button data-d="${i + 1}">${i + 1}</button>`).join('')}
          <button data-act="erase" title="Sil">⌫</button>
          <button data-act="notes" class="fs-notes-btn" title="Not modu (N)">✏️ Not</button>
        </div>
      </div>`;
    const root = container.querySelector('.futoshiki');
    const board = root.querySelector('.fs-board');
    const cells = [...root.querySelectorAll('.fs-cell')];
    const signEls = rels.map((rel) => root.querySelector(rel.kind === 'h' ? `[data-h="${rel.idx}"]` : `[data-v="${rel.idx}"]`));
    const notesBtn = root.querySelector('.fs-notes-btn');
    const noteCols = N <= 4 ? 2 : 3;

    const render = () => {
      const { badCells, badRels } = violations(N, values, rels);
      const sr = selected >= 0 ? Math.floor(selected / N) : -1, sc = selected >= 0 ? selected % N : -1;
      const sv = selected >= 0 ? values[selected] : 0;
      cells.forEach((el, c) => {
        const val = values[c];
        const r = Math.floor(c / N), col = c % N;
        el.className = 'fs-cell';
        if (givens[c]) el.classList.add('given');
        else if (locked[c]) el.classList.add('revealed');
        if (selected >= 0) {
          if (c === selected) el.classList.add('sel');
          else if (r === sr || col === sc) el.classList.add('peer');
          if (sv && val === sv && c !== selected) el.classList.add('same');
        }
        if (badCells.has(c)) el.classList.add('conflict');
        if (wrong.has(c)) el.classList.add('wrong');
        if (c === hintCell) el.classList.add('hinted');
        else if (hintCells.has(c)) el.classList.add('hint-rel');
        if (val) el.textContent = val;
        else if (notes[c]) {
          el.innerHTML = `<span class="fs-notes" style="--nc:${noteCols}">${Array.from({ length: N }, (_, i) => `<i>${notes[c] & (1 << (i + 1)) ? i + 1 : ''}</i>`).join('')}</span>`;
        } else el.textContent = '';
      });
      signEls.forEach((el, i) => el.classList.toggle('bad', badRels.has(i)));
      notesBtn.classList.toggle('on', notesMode);
    };

    const checkSolved = () => {
      if (solved || !values.every((x, i) => x === solution[i])) return;
      solved = true;
      selected = -1;
      hintCell = -1;
      hintCells.clear();
      render();
      board.classList.add('solved');
      setTimeout(ctx.onSolved, 400);
    };

    const clearHint = () => { hintCell = -1; hintCells.clear(); };

    const input = (d) => {
      const c = selected;
      if (solved || c < 0 || locked[c]) return;
      wrong.delete(c);
      if (notesMode && d) {
        if (!values[c]) notes[c] ^= 1 << d;
      } else {
        values[c] = values[c] === d ? 0 : d;
        if (values[c]) {
          notes[c] = 0;
          const r = Math.floor(c / N), col = c % N;
          for (let j = 0; j < N; j++) { notes[r * N + j] &= ~(1 << d); notes[j * N + col] &= ~(1 << d); }
        }
        if (c === hintCell) clearHint();
      }
      render();
      checkSolved();
    };

    const toggleNotes = () => { notesMode = !notesMode; render(); };

    const onClick = (e) => {
      const cell = e.target.closest('.fs-cell');
      if (cell) { if (!solved) { selected = Number(cell.dataset.c); render(); } return; }
      const btn = e.target.closest('.fs-pad button');
      if (!btn) return;
      if (btn.dataset.d) input(Number(btn.dataset.d));
      else if (btn.dataset.act === 'erase') input(0);
      else if (btn.dataset.act === 'notes') toggleNotes();
    };
    container.addEventListener('click', onClick);

    const onKey = (e) => {
      if (e.target.closest?.('input, textarea') || document.querySelector('.modal')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (/^[1-9]$/.test(k) && Number(k) <= N) input(Number(k));
      else if (k === 'Backspace' || k === 'Delete' || k === '0') input(0);
      else if (k === 'n' || k === 'N') toggleNotes();
      else if (k.startsWith('Arrow')) {
        e.preventDefault();
        if (solved) return;
        if (selected < 0) selected = 0;
        const r = Math.floor(selected / N), col = selected % N;
        const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k] ?? [0, 0];
        selected = ((r + dr + N) % N) * N + ((col + dc + N) % N);
        render();
      }
    };
    document.addEventListener('keydown', onKey);

    const cellName = (c) => `${Math.floor(c / N) + 1}. satır, ${(c % N) + 1}. sütun`;
    const DIR = (from, to) => {
      const d = to - from;
      return d === 1 ? 'sağındaki' : d === -1 ? 'solundaki' : d === N ? 'altındaki' : 'üstündeki';
    };
    const list = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} ve ${arr[arr.length - 1]}`);

    // İşarete dayalı ipucu açıklaması
    const explainSigns = (step, base) => {
      const c = step.cell, cand = step.cand;
      const reasons = [];
      const { down, up } = chainLengths(N, rels, c);
      for (const rel of rels) {
        if (rel.hi === c) {
          const o = rel.lo;
          const m = base[o] || digitsOf(cand[o])[0];
          reasons.push(`${DIR(c, o)} hücreden büyük olmalı${m ? ` (o ${base[o] ? `${m} olduğu` : `en az ${m} olabileceği`} için bu en az ${m + 1})` : ''}`);
          hintCells.add(o);
        } else if (rel.lo === c) {
          const o = rel.hi;
          const ds = digitsOf(cand[o]);
          const m = base[o] || ds[ds.length - 1];
          reasons.push(`${DIR(c, o)} hücreden küçük olmalı${m ? ` (o ${base[o] ? `${m} olduğu` : `en fazla ${m} olabileceği`} için bu en fazla ${m - 1})` : ''}`);
          hintCells.add(o);
        }
      }
      let chain = '';
      if (down >= 2) chain += ` Ondan küçük ${down} hücrelik bir zincir var, yani en az ${down + 1} olmalı.`;
      if (up >= 2) chain += ` Ondan büyük ${up} hücrelik bir zincir var, yani en fazla ${N - up} olabilir.`;
      return { reasons, chain };
    };

    const boosters = {
      reveal() {
        if (solved) return { ok: false, message: 'Bulmaca zaten çözüldü.' };
        const open = (c) => !locked[c] && values[c] !== solution[c];
        let c = selected >= 0 && open(selected) ? selected : -1;
        if (c < 0) {
          const pool = values.map((_, i) => i).filter(open);
          if (!pool.length) return { ok: false, message: 'Açılacak hücre yok.' };
          c = pool[Math.floor(Math.random() * pool.length)];
        }
        const d = solution[c];
        values[c] = d;
        notes[c] = 0;
        locked[c] = true;
        wrong.delete(c);
        const r = Math.floor(c / N), col = c % N;
        for (let j = 0; j < N; j++) { notes[r * N + j] &= ~(1 << d); notes[j * N + col] &= ~(1 << d); }
        if (c === hintCell) clearHint();
        selected = c;
        render();
        checkSolved();
        return { ok: true, message: `${cellName(c)} açıldı: ${d}` };
      },
      check() {
        wrong.clear();
        values.forEach((x, c) => { if (x && x !== solution[c]) wrong.add(c); });
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} hatalı hücre kırmızıyla işaretlendi.` };
      },
      hint() {
        if (solved) return { ok: false, message: 'Bulmaca zaten çözüldü.' };
        const base = values.map((x, c) => (x === solution[c] ? x : 0));
        const step = nextLogicalStep(N, base, rels);
        if (!step) return { ok: false, message: 'İpucu bulunamadı.' };
        if (lastHint && step.cell === hintCell && step.cell === lastHint.cell && values[step.cell] !== solution[step.cell]) {
          return { ok: false, message: `${lastHint.msg} (Bu ipucu zaten gösteriliyor, hak harcanmadı.)` };
        }
        clearHint();
        hintCell = step.cell;
        selected = step.cell;
        const where = cellName(step.cell);
        const unitName = step.unit === 'row' ? 'satırda' : 'sütunda';
        let msg;
        if (step.stage === 'basic') {
          msg = step.reason === 'naked'
            ? `${where}: satırında ve sütununda diğer rakamlar zaten var, buraya yalnızca ${step.value} girebilir.`
            : `${step.value} rakamı bu ${unitName} yalnızca ${where} hücresine girebilir.`;
        } else if (step.reason === 'naked') {
          const { reasons, chain } = explainSigns(step, base);
          const pre = step.stage === 'advanced' ? 'Satır/sütundaki aday çiftlerini eledikten sonra: ' : '';
          msg = `${pre}${where} hücresine yalnızca ${step.value} girebilir. Bu hücre ${list(reasons)}.${chain}`
            + ' Satırındaki ve sütunundaki rakamlarla birlikte geriye tek seçenek kalıyor.';
        } else {
          const pre = step.stage === 'advanced' ? 'Aday çiftlerini eledikten sonra: ' : 'İşaretlere göre: ';
          const unitCells = step.unit === 'row'
            ? Array.from({ length: N }, (_, j) => Math.floor(step.cell / N) * N + j)
            : Array.from({ length: N }, (_, j) => j * N + (step.cell % N));
          for (const u of unitCells) if (u !== step.cell && !base[u]) hintCells.add(u);
          msg = `${pre}bu ${unitName} diğer boş hücreler büyüktür/küçüktür işaretleri yüzünden ${step.value} olamaz, bu yüzden ${step.value} yalnızca ${where} hücresine girebilir.`;
        }
        lastHint = { cell: step.cell, msg };
        render();
        const hasWrong = values.some((x, c) => x && x !== solution[c]);
        return { ok: true, message: msg + (hasWrong ? ' (Not: tahtada hatalı rakamlar var.)' : '') };
      },
    };

    render();
    return {
      useBooster: (id) => boosters[id]?.() ?? { ok: false },
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        container.removeEventListener('click', onClick);
      },
    };
  },
};
