import {
  parsePuzzle, parseSolution, cageLabel, cageHolds, cellName, unitName,
  nextLogicalStep, cageCombos, comboText,
} from './logic.js';

function ensureStyles() {
  if (document.getElementById('kenken-css')) return;
  const link = document.createElement('link');
  link.id = 'kenken-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const OP_INTRO = {
  '+': (t) => `toplamı ${t} olan sayılar`,
  x: (t) => `çarpımı ${t} olan sayılar`,
  '-': (t) => `farkı ${t} olan sayılar`,
  '/': (t) => `biri diğerinin ${t} katı olan sayılar`,
};

const listText = (arr) => (arr.length <= 1 ? arr.join('') : arr.slice(0, -1).join(', ') + ' ve ' + arr[arr.length - 1]);

export default {
  id: 'kenken',
  name: 'Hesap Kafesi',
  icon: '🧮',
  description: 'Kafeslerdeki hesapları tuttur, her satır ve sütunda her sayıyı bir kez kullan.',
  rules: 'Her satır ve sütunda 1’den ızgara boyutuna kadar her sayı yalnızca bir kez yer alır. Kalın çizgili her kafesin köşesinde bir hedef sayı ve işlem (+, −, ×, ÷) yazar: kafesteki sayılar bu işlemle hedefi vermelidir. − ve ÷ yalnızca iki hücreli kafeslerde olur; büyükten küçüğe doğru yapılır. Tek hücreli kafeste yazan sayı doğrudan o hücreye girer. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  howTo: [
    'Bir kareye dokun, sonra alttaki sayılardan birini seç.',
    'Her satırda ve her sütunda bir sayı yalnızca bir kez olabilir.',
    'Kalın çizgili bölgeler kafestir. Köşedeki “7+” gibi yazı, kafesteki sayıların toplamının 7 olması demek. “2−” fark, “6×” çarpım, “2÷” bölüm demektir.',
    'Köşesinde yalnızca sayı olan tek hücreli kafesler hediye: o sayıyı hemen yaz!',
    'Bir kafes dolunca hesap tutmazsa kırmızı olur. Emin olmadığın yerlere ✏️ Not ile küçük notlar alabilirsin.',
    'Takılırsan 💡 Akıllı İpucu sana hangi sayıların olabileceğini ve nedenini anlatır.',
  ],
  boosters: [
    { id: 'reveal', name: 'Hücre Aç', icon: '🔍', uses: 3, description: 'Seçili (ya da rastgele) boş hücrenin doğru sayısını yerleştirir.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış girdiğin sayıları kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı hamleyi, kafesin olası sayılarıyla birlikte anlatır.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const { N, cages } = parsePuzzle(level.puzzle);
    const C = N * N;
    const solution = parseSolution(level.solution);
    const cageOf = new Array(C).fill(-1);
    cages.forEach((k, i) => k.cells.forEach((c) => { cageOf[c] = i; }));
    const digits = Array.from({ length: N }, (_, i) => i + 1);
    const ROW = (c) => Math.floor(c / N), COL = (c) => c % N;
    const peers = (c) => {
      const out = [];
      for (let i = 0; i < N; i++) {
        if (i !== COL(c)) out.push(ROW(c) * N + i);
        if (i !== ROW(c)) out.push(i * N + COL(c));
      }
      return out;
    };

    // Kafeslere komşu kafeslerden farklı açık renkler (açgözlü boyama)
    const tint = new Array(cages.length).fill(-1);
    cages.forEach((k, i) => {
      const used = new Set();
      for (const c of k.cells) {
        for (const p of [c - N, c + N, COL(c) > 0 ? c - 1 : -1, COL(c) < N - 1 ? c + 1 : -1]) {
          if (p >= 0 && p < C && cageOf[p] !== i && tint[cageOf[p]] >= 0) used.add(tint[cageOf[p]]);
        }
      }
      let t = 0;
      while (used.has(t)) t++;
      tint[i] = t % 4;
    });

    const values = new Array(C).fill(0);
    const notes = new Array(C).fill(0);
    const locked = new Array(C).fill(false);
    const wrong = new Set();
    let selected = 0;
    let notesMode = false;
    let hintCell = -1;
    let hintArea = new Set();
    let solved = false;

    container.innerHTML = `
      <div class="kenken-game sz${N}" style="--n:${N}">
        <div class="kk-board" role="grid" aria-label="Hesap Kafesi tahtası ${N}×${N}">
          ${Array.from({ length: C }, (_, c) => `<button class="kk-cell" data-c="${c}" role="gridcell" aria-label="${cellName(N, c)}"></button>`).join('')}
        </div>
        <div class="kk-pad" style="--pc:${N + 2}">
          ${digits.map((d) => `<button data-d="${d}">${d}</button>`).join('')}
          <button data-act="erase" title="Sil" aria-label="Sil">⌫</button>
          <button data-act="notes" class="kk-notes-btn" title="Not modu (N)">✏️ Not</button>
        </div>
      </div>`;
    const root = container.querySelector('.kenken-game');
    const board = root.querySelector('.kk-board');
    const cells = [...root.querySelectorAll('.kk-cell')];
    const notesBtn = root.querySelector('.kk-notes-btn');

    // Sabit sınıflar: kafes kenarları, renk, etiket
    cells.forEach((el, c) => {
      const k = cageOf[c];
      el.dataset.base = [
        'kk-cell', `t${tint[k]}`,
        COL(c) < N - 1 && cageOf[c + 1] !== k ? 'tr' : '',
        ROW(c) < N - 1 && cageOf[c + N] !== k ? 'tb' : '',
        COL(c) === N - 1 ? 'lastc' : '', ROW(c) === N - 1 ? 'lastr' : '',
      ].filter(Boolean).join(' ');
      el.dataset.label = cages[k].cells[0] === c ? cageLabel(cages[k]) : '';
    });

    const render = () => {
      const bad = new Set();
      cages.forEach((k) => {
        const ds = k.cells.map((c) => values[c]);
        if (ds.every(Boolean) && !cageHolds(k.op, k.target, ds)) k.cells.forEach((c) => bad.add(c));
      });
      const sv = selected >= 0 ? values[selected] : 0;
      cells.forEach((el, c) => {
        const v = values[c];
        const cls = [el.dataset.base];
        if (locked[c]) cls.push('revealed');
        if (selected >= 0) {
          if (c === selected) cls.push('sel');
          else if (cageOf[c] === cageOf[selected]) cls.push('cage-sel');
          else if (ROW(c) === ROW(selected) || COL(c) === COL(selected)) cls.push('peer');
          if (sv && v === sv && c !== selected) cls.push('same');
        }
        if (v && peers(c).some((p) => values[p] === v)) cls.push('conflict');
        if (bad.has(c)) cls.push('cage-bad');
        if (wrong.has(c)) cls.push('wrong');
        if (hintArea.has(c)) cls.push('area');
        if (c === hintCell) cls.push('hinted');
        el.className = cls.join(' ');
        const label = el.dataset.label ? `<span class="kk-lbl">${el.dataset.label}</span>` : '';
        let body = '';
        if (v) body = `<span class="kk-v">${v}</span>`;
        else if (notes[c]) body = `<span class="kk-notes">${digits.map((d) => `<i>${notes[c] & (1 << d) ? d : ''}</i>`).join('')}</span>`;
        el.innerHTML = label + body;
      });
      notesBtn.classList.toggle('on', notesMode);
    };

    const clearHint = () => { hintCell = -1; hintArea = new Set(); };

    const checkSolved = () => {
      if (solved || !values.every((v, i) => v === solution[i])) return;
      solved = true;
      selected = -1;
      clearHint();
      render();
      board.classList.add('solved');
      setTimeout(ctx.onSolved, 400);
    };

    const input = (d) => {
      const c = selected;
      if (solved || c < 0 || locked[c]) return;
      wrong.delete(c);
      if (c === hintCell || hintArea.size) clearHint();
      if (notesMode && d) {
        if (!values[c]) notes[c] ^= 1 << d;
      } else {
        values[c] = values[c] === d ? 0 : d;
        if (values[c]) for (const p of peers(c)) notes[p] &= ~(1 << d);
      }
      render();
      checkSolved();
    };

    const onClick = (e) => {
      if (solved) return;
      const cell = e.target.closest('.kk-cell');
      if (cell) { selected = Number(cell.dataset.c); render(); return; }
      const btn = e.target.closest('.kk-pad button');
      if (!btn) return;
      if (btn.dataset.d) input(Number(btn.dataset.d));
      else if (btn.dataset.act === 'erase') input(0);
      else if (btn.dataset.act === 'notes') { notesMode = !notesMode; render(); }
    };
    root.addEventListener('click', onClick);

    const onKey = (e) => {
      if (solved || e.target.closest?.('input, textarea') || document.querySelector('.modal')) return;
      const k = e.key;
      if (/^[1-9]$/.test(k)) { if (Number(k) <= N) input(Number(k)); }
      else if (k === 'Backspace' || k === 'Delete' || k === '0') input(0);
      else if (k === 'n' || k === 'N') { notesMode = !notesMode; render(); }
      else if (k.startsWith('Arrow')) {
        e.preventDefault();
        if (selected < 0) selected = 0;
        const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
        selected = ((ROW(selected) + dr + N) % N) * N + ((COL(selected) + dc + N) % N);
        render();
      }
    };
    document.addEventListener('keydown', onKey);

    // Akıllı İpucu metni: kafesin olası sayılarını öğretir
    const explainCage = (k, cand) => {
      if (k.op === '=') return '';
      const all = cageCombos(N, k);
      let s = `${cageLabel(k)} kafesi ${k.cells.length} hücreli; ${OP_INTRO[k.op](k.target)}: ${comboText(k.op, all)}.`;
      if (cand) {
        const now = cageCombos(N, k, cand);
        if (now.length && now.length < all.length) {
          s += ` Satır ve sütunlardaki sayılara bakınca geriye ${now.length === 1 ? 'yalnızca ' : ''}${comboText(k.op, now)} kalıyor.`;
        }
      }
      return s;
    };

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
        clearHint();
        for (const p of peers(c)) notes[p] &= ~(1 << solution[c]);
        selected = c;
        render();
        checkSolved();
        return { ok: true, message: `${cellName(N, c)} açıldı: ${solution[c]}` };
      },
      check() {
        wrong.clear();
        values.forEach((v, c) => { if (v && v !== solution[c]) wrong.add(c); });
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} hatalı hücre kırmızıyla işaretlendi.` };
      },
      hint() {
        const base = values.map((v, c) => (v === solution[c] ? v : 0));
        if (base.every(Boolean)) return { ok: false, message: 'Doğru sayılar tamam; kırmızı hücreleri düzelt.' };
        const step = nextLogicalStep(N, cages, base);
        if (!step) return { ok: false, message: 'İpucu bulunamadı.' };
        hintCell = step.cell;
        selected = step.cell;
        const where = cellName(N, step.cell);
        const k = step.cage;
        let msg;
        if (step.reason === 'freebie') {
          hintArea = new Set([step.cell]);
          msg = `${where}: Bu kafeste tek bir hücre var, köşesinde ${step.value} yazıyor. Yani buraya doğrudan ${step.value} gelir!`;
        } else {
          const pre = step.steps.length ? step.steps[step.steps.length - 1] : null;
          const before = pre ? `${pre.tech}: ${pre.cage != null ? explainCage(cages[pre.cage], step.st.cand) + ' ' : ''}${pre.text} ` : '';
          const more = step.steps.length > 1 ? ` (Bundan önce ${step.steps.length - 1} başka eleme daha gerekiyor.)` : '';
          if (step.reason === 'naked') {
            hintArea = new Set(pre ? pre.cells : k.cells);
            const seen = [...new Set(peers(step.cell).map((p) => base[p]).filter(Boolean))].sort((a, b) => a - b);
            const lineText = seen.length ? ` Bu hücrenin satırında ya da sütununda zaten ${listText(seen)} var.` : '';
            msg = `${before}${explainCage(k, step.st.cand)}${lineText} Bu yüzden ${where} hücresine yalnızca ${step.value} gelebilir.${more}`;
          } else {
            hintArea = new Set(pre ? pre.cells : step.unit.cells);
            msg = `${before}${step.value} sayısı ${unitName(step.unit)} içinde yalnızca tek bir hücreye sığıyor: ${where}. Diğer hücrelere ya satır/sütun kuralı ya da kafes hesabı yüzünden ${step.value} gelemez.${more}`;
          }
        }
        render();
        const hasWrong = values.some((v, c) => v && v !== solution[c]);
        return { ok: true, message: msg + (hasWrong ? ' (Not: tahtada hatalı sayılar var.)' : '') };
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
