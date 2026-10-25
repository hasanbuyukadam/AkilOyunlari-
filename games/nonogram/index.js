import { parseLevel, runsOf, lineCells, nextDeduction } from './logic.js';

function ensureStyles() {
  if (document.getElementById('nonogram-css')) return;
  const link = document.createElement('link');
  link.id = 'nonogram-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const UNKNOWN = -1, EMPTY = 0, FILLED = 1;

/** "4., 5. ve 6." biçiminde sıra sayısı listesi. */
const ordList = (nums) => {
  // Ardışık 3+ sayı aralık olarak yazılır: "1.–10."
  const s = [];
  for (let k = 0; k < nums.length;) {
    let e = k;
    while (e + 1 < nums.length && nums[e + 1] === nums[e] + 1) e++;
    if (e - k >= 2) s.push(`${nums[k]}.–${nums[e]}.`);
    else for (let t = k; t <= e; t++) s.push(`${nums[t]}.`);
    k = e + 1;
  }
  return s.length > 1 ? `${s.slice(0, -1).join(', ')} ve ${s[s.length - 1]}` : s[0];
};

export default {
  id: 'nonogram',
  name: 'Kare Karalamaca',
  icon: '🖼️',
  description: 'Satır ve sütun ipuçlarıyla gizli resmi ortaya çıkar.',
  rules: 'Her satırın solundaki ve her sütunun üstündeki sayılar, o çizgideki dolu karelerin blok uzunluklarını sırasıyla verir; bloklar arasında en az bir boş kare vardır. Dokun ya da sürükle: kareleri doldur; × modu (veya sağ tık) ile boş olduğundan emin olduğun kareleri işaretle. Her bulmacanın tek çözümü vardır ve tahmin yapmadan çözülebilir.',
  boosters: [
    { id: 'reveal', name: 'Hücre Aç', icon: '🔍', uses: 3, description: '3 hücrenin doğru hâlini açar (dolu ya da ×).' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış doldurduğun ya da yanlış × koyduğun kareleri gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Bir satır ya da sütunda kesin olarak çıkarılabilen kareleri nedeniyle gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const { w, h, rows, cols, solution } = parseLevel(level);
    const N = w * h;
    const state = new Array(N).fill(UNKNOWN);
    const locked = new Uint8Array(N);
    const wrong = new Set();
    const hintCells = new Set();
    let hintLine = null; // { kind, index }
    let mode = 'fill';
    let solved = false;
    let cursor = null; // klavye imleci (hücre indeksi)
    const undo = [];

    const clueHtml = (cl) => (cl.length ? cl : [0]).map((n) => `<span>${n}</span>`).join('');
    container.innerHTML = `
      <div class="ngram" style="--w:${w};--h:${h}">
        <div class="ng-tools">
          <div class="ng-mode" role="group" aria-label="Mod">
            <button type="button" data-mode="fill" class="on" aria-pressed="true"><i class="ng-sw-fill"></i>Doldur</button>
            <button type="button" data-mode="mark" aria-pressed="false"><i class="ng-sw-mark">×</i>İşaretle</button>
          </div>
          <button type="button" class="ng-undo" title="Geri al (Ctrl+Z)" disabled>↶ Geri Al</button>
        </div>
        <div class="ng-board" role="grid" aria-label="Kare Karalamaca tahtası">
          <div class="ng-corner"></div>
          ${cols.map((cl, c) => `<div class="ng-cc${c % 5 === 4 && c !== w - 1 ? ' br5' : ''}" data-cc="${c}">${clueHtml(cl)}</div>`).join('')}
          ${rows.map((cl, r) => `
            <div class="ng-rc${r % 5 === 4 && r !== h - 1 ? ' bb5' : ''}" data-rc="${r}">${clueHtml(cl)}</div>
            ${Array.from({ length: w }, (_, c) => {
              const cls = ['ng-cell'];
              if (c % 5 === 4 && c !== w - 1) cls.push('br5');
              if (r % 5 === 4 && r !== h - 1) cls.push('bb5');
              if (c === w - 1) cls.push('last-c');
              if (r === h - 1) cls.push('last-r');
              return `<div class="${cls.join(' ')}" data-i="${r * w + c}" role="gridcell"></div>`;
            }).join('')}`).join('')}
        </div>
      </div>`;

    const root = container.querySelector('.ngram');
    const board = root.querySelector('.ng-board');
    const cellEls = [...board.querySelectorAll('.ng-cell')];
    const rowClueEls = [...board.querySelectorAll('.ng-rc')];
    const colClueEls = [...board.querySelectorAll('.ng-cc')];
    const undoBtn = root.querySelector('.ng-undo');
    const modeBtns = [...root.querySelectorAll('[data-mode]')];

    // ---------- Boyutlandırma: 15×15 bile 390 px ekrana sığmalı ----------
    const fit = () => {
      const avail = Math.min(container.clientWidth || 360, 640);
      let cs = 30;
      for (let k = 0; k < 3; k++) {
        const font = Math.max(10, Math.min(16, Math.round(cs * 0.52)));
        root.style.setProperty('--clue-font', `${font}px`);
        root.style.setProperty('--cs', `${cs}px`);
        const clueW = Math.max(...rowClueEls.map((el) => el.scrollWidth));
        const clueH = Math.max(...colClueEls.map((el) => el.scrollHeight));
        // Masaüstünde boosterlar görünür kalsın diye yükseklik de sınırlanır.
        const availH = Math.max(240, (window.innerHeight || 800) - 330);
        cs = Math.floor((avail - clueW - 6) / w);
        cs = Math.min(cs, Math.floor((availH - clueH) / h));
        cs = Math.max(14, Math.min(cs, 40));
      }
      root.style.setProperty('--cs', `${cs}px`);
    };

    // ---------- Görünüm ----------
    const lineDone = (kind, i) => {
      const cells = lineCells(w, h, kind, i);
      const clue = kind === 'row' ? rows[i] : cols[i];
      return runsOf(cells.map((c) => (state[c] === FILLED ? 1 : 0))).join() === clue.join();
    };
    const paintCell = (i) => {
      const el = cellEls[i];
      const s = state[i];
      el.classList.toggle('filled', s === FILLED);
      el.classList.toggle('marked', s === EMPTY);
      el.classList.toggle('locked', !!locked[i]);
      el.classList.toggle('wrong', wrong.has(i));
      el.classList.toggle('hint-fill', hintCells.has(i) && solution[i] === 1);
      el.classList.toggle('hint-empty', hintCells.has(i) && solution[i] === 0);
      el.classList.toggle('cursor', cursor === i);
    };
    const paintClues = (r, c) => {
      if (r != null) rowClueEls[r].classList.toggle('done', lineDone('row', r));
      if (c != null) colClueEls[c].classList.toggle('done', lineDone('col', c));
    };
    const paintHintLine = () => {
      const inLine = new Set(hintLine ? lineCells(w, h, hintLine.kind, hintLine.index) : []);
      cellEls.forEach((el, i) => el.classList.toggle('hint-line', inLine.has(i)));
      rowClueEls.forEach((el, r) => el.classList.toggle('hint-clue', hintLine?.kind === 'row' && hintLine.index === r));
      colClueEls.forEach((el, c) => el.classList.toggle('hint-clue', hintLine?.kind === 'col' && hintLine.index === c));
    };
    const renderAll = () => {
      for (let i = 0; i < N; i++) paintCell(i);
      for (let r = 0; r < h; r++) paintClues(r, null);
      for (let c = 0; c < w; c++) paintClues(null, c);
      paintHintLine();
      undoBtn.disabled = !undo.length || solved;
    };

    const checkSolved = () => {
      if (solved) return;
      for (let i = 0; i < N; i++) if ((state[i] === FILLED) !== (solution[i] === 1)) return;
      solved = true;
      for (let i = 0; i < N; i++) if (state[i] !== FILLED) state[i] = EMPTY;
      wrong.clear(); hintCells.clear(); hintLine = null; cursor = null;
      renderAll();
      root.classList.add('solved');
      ctx.showHint(`Resim ortaya çıktı: ${level.title}!`);
      ctx.toast(`🖼️ ${level.title}`);
      setTimeout(ctx.onSolved, 700);
    };

    /** Hücreyi değiştir; değişiklikleri geri alma kaydına ekle. */
    const setCell = (i, v, record) => {
      if (locked[i] || state[i] === v) return false;
      record?.push([i, state[i]]);
      state[i] = v;
      wrong.delete(i);
      if (hintCells.delete(i) && !hintCells.size) { hintLine = null; paintHintLine(); }
      paintCell(i);
      paintClues(Math.floor(i / w), i % w);
      return true;
    };
    const commit = (record) => {
      if (record.length) undo.push(record);
      if (undo.length > 200) undo.shift();
      undoBtn.disabled = !undo.length;
      checkSolved();
    };
    const doUndo = () => {
      const rec = undo.pop();
      if (!rec || solved) return;
      for (let k = rec.length - 1; k >= 0; k--) {
        const [i, prev] = rec[k];
        if (!locked[i]) { state[i] = prev; wrong.delete(i); paintCell(i); paintClues(Math.floor(i / w), i % w); }
      }
      undoBtn.disabled = !undo.length;
      checkSolved();
    };

    const setMode = (m) => {
      mode = m;
      modeBtns.forEach((b) => { b.classList.toggle('on', b.dataset.mode === m); b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
    };

    // ---------- İşaretçi (fare + dokunma): dokun ya da çizgi boyunca sürükle ----------
    let drag = null;
    const cellAt = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest?.('.ng-cell');
      return el && board.contains(el) ? Number(el.dataset.i) : -1;
    };
    const applyStroke = (i) => {
      const r = Math.floor(i / w), c = i % w;
      const { r0, c0 } = drag;
      if (!drag.axis && (r !== r0 || c !== c0)) drag.axis = r === r0 ? 'row' : c === c0 ? 'col' : Math.abs(c - c0) >= Math.abs(r - r0) ? 'row' : 'col';
      const cells = [];
      if (drag.axis === 'row') { for (let k = Math.min(c, c0); k <= Math.max(c, c0); k++) cells.push(r0 * w + k); }
      else if (drag.axis === 'col') { for (let k = Math.min(r, r0); k <= Math.max(r, r0); k++) cells.push(k * w + c0); }
      for (const j of cells) {
        if (drag.op === 'set' && state[j] === UNKNOWN) setCell(j, drag.target, drag.record);
        if (drag.op === 'clear' && state[j] === drag.target) setCell(j, UNKNOWN, drag.record);
      }
    };
    const onPointerDown = (e) => {
      const el = e.target.closest('.ng-cell');
      if (!el || solved || drag) return;
      if (e.button !== 0 && e.button !== 2) return;
      e.preventDefault();
      const i = Number(el.dataset.i);
      const target = e.button === 2 || mode === 'mark' ? EMPTY : FILLED;
      const op = state[i] === target ? 'clear' : 'set';
      if (cursor !== null) { const old = cursor; cursor = null; paintCell(old); }
      drag = { r0: Math.floor(i / w), c0: i % w, target, op, axis: null, record: [], pointerId: e.pointerId };
      if (locked[i]) { drag.op = 'none'; return; }
      setCell(i, op === 'set' ? target : UNKNOWN, drag.record);
    };
    const onPointerMove = (e) => {
      if (!drag || e.pointerId !== drag.pointerId || drag.op === 'none') return;
      const i = cellAt(e.clientX, e.clientY);
      if (i >= 0) applyStroke(i);
    };
    const onPointerUp = (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const rec = drag.record;
      drag = null;
      commit(rec);
    };
    const onHover = (e) => {
      const el = e.target.closest?.('.ng-cell');
      const i = el ? Number(el.dataset.i) : -1;
      const r = i >= 0 ? Math.floor(i / w) : -1, c = i >= 0 ? i % w : -1;
      rowClueEls.forEach((x, k) => x.classList.toggle('hover', k === r));
      colClueEls.forEach((x, k) => x.classList.toggle('hover', k === c));
    };
    board.addEventListener('pointerdown', onPointerDown);
    board.addEventListener('pointerover', onHover);
    board.addEventListener('pointerleave', onHover);
    board.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    root.addEventListener('click', (e) => {
      const mb = e.target.closest('[data-mode]');
      if (mb) setMode(mb.dataset.mode);
      else if (e.target.closest('.ng-undo')) doUndo();
    });

    // ---------- Klavye ----------
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea') || document.querySelector('.modal') || solved) return;
      const k = e.key;
      if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.preventDefault(); doUndo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        const old = cursor;
        if (cursor === null) cursor = 0;
        else {
          const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
          const r = (Math.floor(cursor / w) + dr + h) % h, c = ((cursor % w) + dc + w) % w;
          cursor = r * w + c;
        }
        if (old !== null) paintCell(old);
        paintCell(cursor);
        return;
      }
      if (k === 'm' || k === 'M') { setMode(mode === 'fill' ? 'mark' : 'fill'); return; }
      if (cursor === null) return;
      let target;
      if (k === ' ' || k === 'Enter') target = FILLED;
      else if (k === 'x' || k === 'X') target = EMPTY;
      else if (k === 'Backspace' || k === 'Delete') target = UNKNOWN;
      else return;
      e.preventDefault();
      const rec = [];
      setCell(cursor, target !== UNKNOWN && state[cursor] === target ? UNKNOWN : target, rec);
      commit(rec);
    };
    document.addEventListener('keydown', onKey);

    const onResize = () => fit();
    window.addEventListener('resize', onResize);

    // ---------- Boosterlar ----------
    const clearHint = () => { hintCells.clear(); hintLine = null; };
    const boosters = {
      reveal() {
        const wrongFill = [], missing = [], blank = [];
        for (let i = 0; i < N; i++) {
          if (locked[i]) continue;
          if (state[i] === FILLED && solution[i] === 0) wrongFill.push(i);
          else if (solution[i] === 1 && state[i] !== FILLED) missing.push(i);
          else if (solution[i] === 0 && state[i] === UNKNOWN) blank.push(i);
        }
        const pick = (arr, n) => {
          const out = [];
          const a = arr.slice();
          while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
          return out;
        };
        // Önce dolu olması gereken kareler; yoksa boş kareler (×).
        let chosen = pick(missing, 3);
        if (chosen.length < 3) chosen = chosen.concat(pick(wrongFill, 3 - chosen.length));
        if (chosen.length < 3) chosen = chosen.concat(pick(blank, 3 - chosen.length));
        if (!chosen.length) return { ok: false, message: 'Açılacak hücre kalmadı.' };
        clearHint();
        for (const i of chosen) {
          state[i] = solution[i] === 1 ? FILLED : EMPTY;
          locked[i] = 1;
          wrong.delete(i);
        }
        renderAll();
        chosen.forEach((i) => { cellEls[i].classList.remove('flash'); void cellEls[i].offsetWidth; cellEls[i].classList.add('flash'); });
        checkSolved();
        const names = chosen.map((i) => `${Math.floor(i / w) + 1}. satır ${i % w + 1}. sütun`).join('; ');
        return { ok: true, message: `${chosen.length} hücre açıldı: ${names}.` };
      },
      check() {
        wrong.clear();
        for (let i = 0; i < N; i++) {
          if (state[i] === FILLED && solution[i] === 0) wrong.add(i);
          if (state[i] === EMPTY && solution[i] === 1) wrong.add(i);
        }
        renderAll();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} hatalı kare kırmızıyla işaretlendi.` };
      },
      hint() {
        // Yalnızca doğru girişler bilgi sayılır; hatalı kareler ipucunu bozmaz.
        const known = state.map((s, i) => (s === FILLED && solution[i] === 1 ? 1 : s === EMPTY && solution[i] === 0 ? 0 : -1));
        const step = nextDeduction(rows, cols, w, h, known);
        if (!step) return { ok: false, message: 'Yeni bir çıkarım bulunamadı.' };
        clearHint();
        hintLine = { kind: step.kind, index: step.index };
        // Kullanıcının zaten doğru hâlde olmayan kareleri vurgula.
        for (const i of [...step.filled, ...step.empty]) hintCells.add(i);
        renderAll();
        const isRow = step.kind === 'row';
        const pos = (i) => (isRow ? (i % w) + 1 : Math.floor(i / w) + 1);
        const unit = isRow ? 'sütundaki' : 'satırdaki';
        const parts = [];
        if (step.filled.length) parts.push(`${ordList(step.filled.map(pos))} ${unit} ${step.filled.length > 1 ? 'kareler' : 'kare'} kesinlikle dolu`);
        if (step.empty.length) parts.push(`${ordList(step.empty.map(pos))} ${unit} ${step.empty.length > 1 ? 'kareler' : 'kare'} kesinlikle boş (×)`);
        const where = `${step.index + 1}. ${isRow ? 'satırda' : 'sütunda'}`;
        const hasWrong = state.some((s, i) => (s === FILLED && solution[i] === 0) || (s === EMPTY && solution[i] === 1));
        return {
          ok: true,
          message: `${where} ${parts.join('; ')}, çünkü ${step.reason}.${hasWrong ? ' (Not: tahtada hatalı kareler var.)' : ''}`,
        };
      },
    };

    renderAll();
    fit();
    requestAnimationFrame(fit);

    return {
      useBooster: (id) => boosters[id]?.() ?? { ok: false },
      destroy() {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('resize', onResize);
      },
    };
  },
};
