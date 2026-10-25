import { parseLevel, nextHint, lineName, TENT, GRASS } from './logic.js';

function ensureStyles() {
  if (document.getElementById('tents-css')) return;
  const link = document.createElement('link');
  link.id = 'tents-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const EMPTY = 0;
const LONG_PRESS_MS = 450;

export default {
  id: 'tents',
  name: 'Çadırlar ve Ağaçlar',
  icon: '⛺',
  description: 'Her ağacın yanına bir çadır kur; çadırlar birbirine değmesin.',
  rules: 'Her ağacın dik komşusuna (sağ, sol, üst, alt) tam bir çadır kurulur; her çadır da tam bir ağaca aittir. Çadırlar birbirine çapraz da dahil hiç değemez. Satır ve sütun kenarındaki sayılar o satır/sütundaki çadır sayısını gösterir. Dokun: boş → çadır → çim → boş. Uzun bas ya da sağ tıkla: doğrudan çim. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  boosters: [
    { id: 'reveal', name: 'Çadır Aç', icon: '⛺', uses: 3, description: 'Doğru yerlerden birine bir çadır kurar.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış kurduğun çadırları ve yanlış çim işaretlerini gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı adımı nedeniyle gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const { G, trees, counts, tents: solution } = parseLevel(level);
    const { w, h, n } = G;
    const marks = new Array(n).fill(EMPTY);
    const locked = new Array(n).fill(false);
    const wrong = new Set();
    let hintCells = new Set();
    let hintLine = -1;
    const history = [];
    let cursor = -1;
    let showCursor = false;
    let finished = false;

    // DOM
    const root = document.createElement('div');
    root.className = 'tents';
    const parts = ['<div class="tn-corner"></div>'];
    for (let c = 0; c < w; c++) parts.push(`<button class="tn-clue col" data-line="${h + c}" aria-label="${c + 1}. sütun: ${counts[h + c]} çadır">${counts[h + c]}</button>`);
    for (let r = 0; r < h; r++) {
      parts.push(`<button class="tn-clue row" data-line="${r}" aria-label="${r + 1}. satır: ${counts[r]} çadır">${counts[r]}</button>`);
      for (let c = 0; c < w; c++) {
        const i = r * w + c;
        parts.push(trees[i]
          ? `<div class="tn-cell tree" data-c="${i}" aria-label="ağaç"><span>🌳</span></div>`
          : `<div class="tn-cell" data-c="${i}" role="button" aria-label="${r + 1}. satır, ${c + 1}. sütun"><span></span></div>`);
      }
    }
    root.innerHTML = `
      <div class="tn-board" style="--cols:${w + 1}" role="grid" aria-label="Çadırlar tahtası">${parts.join('')}</div>
      <div class="tn-tools">
        <button data-act="undo" title="Geri al (Z)">↶ Geri Al</button>
        <button data-act="fill" title="Sayısı tamamlanan satır ve sütunların boş hücrelerini çimle">🌱 Çim Doldur</button>
      </div>`;
    container.appendChild(root);
    const board = root.querySelector('.tn-board');
    const cellEls = [];
    board.querySelectorAll('.tn-cell').forEach((el) => { cellEls[Number(el.dataset.c)] = el; });
    const clueEls = [];
    board.querySelectorAll('.tn-clue').forEach((el) => { clueEls[Number(el.dataset.line)] = el; });
    const undoBtn = root.querySelector('[data-act="undo"]');

    const isTent = (i) => marks[i] === TENT;
    const lineTents = (li) => G.lines[li].reduce((s, i) => s + (isTent(i) ? 1 : 0), 0);

    const render = () => {
      for (let i = 0; i < n; i++) {
        const el = cellEls[i];
        const cls = ['tn-cell'];
        if (trees[i]) {
          cls.push('tree');
          if (G.orth[i].some(isTent)) cls.push('has-tent');
        } else {
          const m = marks[i];
          if (m === TENT) cls.push('tent');
          else if (m === GRASS) cls.push('grass');
          if (locked[i]) cls.push('locked');
          if (m === TENT && G.king[i].some(isTent)) cls.push('touch');
          if (wrong.has(i)) cls.push('wrong');
          const span = el.firstChild;
          const txt = m === TENT ? '⛺' : '';
          if (span.textContent !== txt) span.textContent = txt;
        }
        if (hintCells.has(i)) cls.push('hinted');
        if (showCursor && i === cursor) cls.push('cur');
        el.className = cls.join(' ');
      }
      for (let li = 0; li < G.lines.length; li++) {
        const t = lineTents(li);
        const el = clueEls[li];
        el.className = `tn-clue ${li < h ? 'row' : 'col'}${t === counts[li] ? ' ok' : t > counts[li] ? ' over' : ''}${li === hintLine ? ' hinted' : ''}`;
      }
      undoBtn.disabled = !history.length || finished;
    };

    const checkSolved = () => {
      if (finished) return;
      for (let i = 0; i < n; i++) if (isTent(i) !== solution[i]) return;
      finished = true;
      hintCells = new Set();
      hintLine = -1;
      showCursor = false;
      render();
      root.classList.add('solved');
      setTimeout(() => ctx.onSolved(), 400);
    };

    // Değişiklikler gruplar halinde geri alınabilir.
    let group = null;
    const begin = () => { group = []; };
    const commit = () => {
      if (group && group.length) history.push(group);
      group = null;
      render();
      checkSolved();
    };
    const setMark = (i, v) => {
      if (trees[i] || locked[i] || marks[i] === v) return false;
      (group ??= []).push([i, marks[i]]);
      marks[i] = v;
      wrong.delete(i);
      if (hintCells.size) { hintCells = new Set(); hintLine = -1; }
      return true;
    };
    const cycleValue = (m) => (m === EMPTY ? TENT : m === TENT ? GRASS : EMPTY);
    const grassToggle = (m) => (m === GRASS ? EMPTY : GRASS);

    const undo = () => {
      if (finished) return;
      const g = history.pop();
      if (!g) return;
      for (let k = g.length - 1; k >= 0; k--) {
        const [i, prev] = g[k];
        if (!locked[i]) marks[i] = prev;
        wrong.delete(i);
      }
      render();
    };

    const fillLine = (li) => {
      if (lineTents(li) !== counts[li]) return 0;
      let k = 0;
      for (const i of G.lines[li]) if (!trees[i] && marks[i] === EMPTY && setMark(i, GRASS)) k++;
      return k;
    };
    const fillAll = () => {
      if (finished) return;
      begin();
      let k = 0;
      for (let li = 0; li < G.lines.length; li++) k += fillLine(li);
      commit();
      if (!k) ctx.toast('Çimlenecek hücre yok: önce sayısı tamamlanan satır/sütun olmalı.');
    };

    // --- İşaretçi (fare + dokunmatik) ---
    let press = null; // { id, start, acted, value, last, timer }
    const cellAt = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest?.('.tn-cell');
      return el && board.contains(el) ? Number(el.dataset.c) : -1;
    };
    const paint = (i) => {
      if (i < 0 || trees[i] || locked[i]) return;
      const v = press.value;
      if (v === GRASS && marks[i] === EMPTY) setMark(i, GRASS);
      else if (v === EMPTY && marks[i] === GRASS) setMark(i, EMPTY);
      render();
    };
    const actStart = (value) => {
      const i = press.start;
      setMark(i, value);
      press.acted = true;
      press.value = value;
      render();
    };

    const onPointerDown = (e) => {
      const el = e.target.closest('.tn-cell');
      if (!el || finished) return;
      const i = Number(el.dataset.c);
      showCursor = false;
      cursor = i;
      if (trees[i] || (e.button !== 0 && e.button !== 2)) { render(); return; }
      e.preventDefault();
      if (press) clearTimeout(press.timer);
      begin();
      press = { id: e.pointerId, start: i, last: i, acted: false, value: EMPTY, timer: 0 };
      if (e.button === 2) {
        actStart(grassToggle(marks[i]));
      } else if (e.button === 0) {
        press.timer = setTimeout(() => {
          if (press && !press.acted) {
            actStart(grassToggle(marks[press.start]));
            navigator.vibrate?.(15);
          }
        }, LONG_PRESS_MS);
      }
    };
    const onPointerMove = (e) => {
      if (!press || e.pointerId !== press.id) return;
      const i = cellAt(e.clientX, e.clientY);
      if (i < 0 || i === press.last) return;
      press.last = i;
      if (!press.acted) {
        clearTimeout(press.timer);
        actStart(cycleValue(marks[press.start]));
      }
      if (press.value === TENT) return; // sürükleyerek çadır kurulmaz
      paint(i);
    };
    const onPointerUp = (e) => {
      if (!press || e.pointerId !== press.id) return;
      clearTimeout(press.timer);
      if (!press.acted && e.type === 'pointerup') setMark(press.start, cycleValue(marks[press.start]));
      press = null;
      commit();
    };
    const onContext = (e) => { if (e.target.closest('.tn-board')) e.preventDefault(); };

    board.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    board.addEventListener('contextmenu', onContext);

    root.addEventListener('click', (e) => {
      const clue = e.target.closest('.tn-clue');
      if (clue && !finished) {
        const li = Number(clue.dataset.line);
        begin();
        const k = fillLine(li);
        commit();
        if (!k && lineTents(li) !== counts[li]) ctx.toast(`${lineName(G, li)}: ${counts[li]} çadır gerekiyor, şu an ${lineTents(li)}.`);
        return;
      }
      const btn = e.target.closest('.tn-tools button');
      if (!btn) return;
      if (btn.dataset.act === 'undo') undo();
      else if (btn.dataset.act === 'fill') fillAll();
    });

    // --- Klavye ---
    const onKey = (e) => {
      if (finished || e.target.closest?.('input, textarea') || document.querySelector('.modal')) return;
      const k = e.key;
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        if (cursor < 0) cursor = 0;
        else if (showCursor) {
          const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
          const r = (Math.floor(cursor / w) + dr + h) % h, c = (cursor % w + dc + w) % w;
          cursor = r * w + c;
        }
        showCursor = true;
        render();
        return;
      }
      if ((k === 'z' || k === 'Z') && !e.altKey) { e.preventDefault(); undo(); return; }
      if (!showCursor || cursor < 0) return;
      let v = null;
      if (k === ' ' || k === 'Enter') v = cycleValue(marks[cursor]);
      else if (k === 't' || k === 'T' || k === 'c' || k === 'C') v = marks[cursor] === TENT ? EMPTY : TENT;
      else if (k === 'x' || k === 'X' || k === 'g' || k === 'G' || k === '.') v = grassToggle(marks[cursor]);
      else if (k === 'Backspace' || k === 'Delete' || k === '0') v = EMPTY;
      if (v === null) return;
      e.preventDefault();
      begin();
      setMark(cursor, v);
      commit();
    };
    document.addEventListener('keydown', onKey);

    const cellName = (i) => `${Math.floor(i / w) + 1}. satır, ${(i % w) + 1}. sütun`;
    const hasWrong = () => marks.some((m, i) => (m === TENT && !solution[i]) || (m === GRASS && solution[i]));

    const boosters = {
      reveal() {
        const open = (i) => solution[i] && marks[i] !== TENT;
        let c = -1;
        if (cursor >= 0 && open(cursor)) c = cursor;
        else {
          const fromHint = [...hintCells].find(open);
          if (fromHint !== undefined) c = fromHint;
          else {
            const pool = [];
            for (let i = 0; i < n; i++) if (open(i)) pool.push(i);
            if (!pool.length) return { ok: false, message: 'Kurulacak çadır kalmadı.' };
            c = pool[Math.floor(Math.random() * pool.length)];
          }
        }
        begin();
        setMark(c, TENT);
        group = null; // booster ile kurulan çadır geri alınmaz
        locked[c] = true;
        hintCells = new Set([c]);
        render();
        checkSolved();
        return { ok: true, message: `${cellName(c)} hücresine çadır kuruldu.` };
      },
      check() {
        wrong.clear();
        let t = 0, g = 0;
        marks.forEach((m, i) => {
          if (m === TENT && !solution[i]) { wrong.add(i); t++; }
          else if (m === GRASS && solution[i]) { wrong.add(i); g++; }
        });
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        const parts = [];
        if (t) parts.push(`${t} yanlış çadır`);
        if (g) parts.push(`${g} yanlış çim işareti`);
        return { ok: true, message: `${parts.join(' ve ')} kırmızıyla gösterildi.` };
      },
      hint() {
        // Yalnızca doğru işaretler dikkate alınır; yanlışlar ipucunu bozmaz.
        const known = marks.map((m, i) => ((m === TENT && solution[i]) || (m === GRASS && !solution[i]) ? m : 0));
        const step = nextHint(G, trees, counts, known);
        if (!step) return { ok: false, message: 'Şu an verilecek bir ipucu yok.' };
        const tentCells = step.set.filter((s) => s.v === TENT).map((s) => s.cell);
        const grassCells = step.set.filter((s) => s.v === GRASS).map((s) => s.cell);
        begin();
        for (const i of grassCells) if (marks[i] === EMPTY) setMark(i, GRASS);
        commit();
        hintCells = new Set([...tentCells, ...grassCells, ...step.focus]);
        hintLine = step.line ?? -1;
        render();
        let msg = step.msg;
        if (tentCells.length && grassCells.length) msg += ' Çimler işaretlendi; çadırları sen kur.';
        else if (tentCells.length) msg += tentCells.length > 1 ? ' Parlayan hücrelere çadır kur.' : ' Parlayan hücreye çadır kur.';
        else msg += ' Bu hücreler çim olarak işaretlendi.';
        if (hasWrong()) msg += ' (Not: tahtada hatalı işaretler var.)';
        return { ok: true, message: msg };
      },
    };

    render();
    return {
      useBooster: (id) => (finished ? { ok: false } : boosters[id]?.() ?? { ok: false }),
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        if (press) clearTimeout(press.timer);
      },
    };
  },
};
