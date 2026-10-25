import {
  parsePuzzle, parseSolution, runState, combosFor, comboText, digitsOf,
  nextLogicalStep, runConsistency, cellName,
} from './logic.js';

function ensureStyles() {
  if (document.getElementById('kakuro-css')) return;
  const link = document.createElement('link');
  link.id = 'kakuro-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const DIR_ICON = { h: '➡️', v: '⬇️' };
const dirWord = (run) => (run.dir === 'h' ? 'Yatay' : 'Dikey');
const runLabel = (run) => `${dirWord(run)} ${run.sum} (${run.cells.length} kare)`;
const listText = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} ve ${arr[arr.length - 1]}`);
const combosText = (masks, max = 4) => {
  if (!masks.length) return 'hiç kombinasyon yok';
  if (masks.length > max) return `${masks.length} farklı kombinasyon`;
  return masks.map(comboText).join(', ');
};

export default {
  id: 'kakuro',
  name: 'Kakuro (Toplam Bulmacası)',
  icon: '➕',
  description: 'Beyaz kareleri 1–9 rakamlarıyla doldur; her sıranın toplamı siyah karedeki sayıya eşit olsun.',
  rules: 'Siyah karelerdeki sayılar, sağındaki (yatay) ya da altındaki (dikey) beyaz kare sırasının toplamıdır. Beyaz karelere 1’den 9’a kadar rakamlar yazılır ve bir sırada aynı rakam iki kez kullanılamaz. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  howTo: [
    'Siyah karelerdeki sayılar ipucudur: çizginin üstündeki sayı sağa doğru, altındaki sayı aşağı doğru giden beyaz karelerin toplamıdır.',
    'Bir beyaz kareye dokun, sonra alttan 1–9 arası bir rakam seç.',
    'Bir sırada aynı rakam iki kez kullanılamaz. Sıra dolunca toplamı tutmuyorsa ya da rakam tekrar ediyorsa kırmızı olur.',
    'İpucu: 2 karede toplam 3 ise rakamlar mutlaka 1 ve 2’dir; 2 karede 17 ise 8 ve 9’dur. Böyle kesin toplamlardan başla!',
    'Emin olmadığın yerlere ✏️ Not ile küçük notlar alabilirsin.',
    'Takılırsan 💡 Akıllı İpucu sana toplam kombinasyonlarını ve sıradaki adımı anlatır.',
  ],
  boosters: [
    { id: 'reveal', name: 'Hücre Aç', icon: '🔍', uses: 3, description: 'Seçili (ya da rastgele) boş karenin doğru rakamını yerleştirir.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış girdiğin rakamları kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Toplam kombinasyonlarını göstererek sıradaki mantıklı hamleyi açıklar.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const P = parsePuzzle(level.puzzle);
    const { R, C, N, runs, runOf } = P;
    const solution = parseSolution(level.solution);
    const values = new Array(N).fill(0);
    const notes = new Array(N).fill(0);
    const locked = new Array(N).fill(false);
    const wrong = new Set();
    let selected = P.whites[0];
    let notesMode = false;
    let solved = false;
    let hintCell = -1;
    let hintArea = new Set();
    let combosInfo = null; // Akıllı İpucu kombinasyon paneli

    const parts = [];
    for (let i = 0; i < N; i++) {
      if (P.white[i]) {
        parts.push(`<button class="kk-w" data-c="${i}" aria-label="${cellName(P, i)}"></button>`);
      } else {
        const d = P.down[i], r = P.right[i];
        const cls = d || r ? 'kk-b clue' : 'kk-b';
        parts.push(`<div class="${cls}" data-k="${i}">${r ? `<span class="kk-r" data-rk="${i}">${r}</span>` : ''}${d ? `<span class="kk-d" data-dk="${i}">${d}</span>` : ''}</div>`);
      }
    }
    container.innerHTML = `
      <div class="kakuro-game s${C}" style="--s:${C}">
        <div class="kk-board" role="grid" aria-label="Kakuro tahtası">${parts.join('')}</div>
        <div class="kk-combos" hidden></div>
        <div class="kk-pad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<button data-d="${d}">${d}</button>`).join('')}
          <button data-act="erase" title="Sil" aria-label="Sil">⌫</button>
          <button data-act="notes" class="kk-notes-btn" title="Not modu (N)">✏️ Not</button>
        </div>
      </div>`;
    const root = container.querySelector('.kakuro-game');
    const board = root.querySelector('.kk-board');
    const comboBox = root.querySelector('.kk-combos');
    const notesBtn = root.querySelector('.kk-notes-btn');
    const cellEls = new Map([...root.querySelectorAll('.kk-w')].map((el) => [Number(el.dataset.c), el]));
    const clueEl = (run) => root.querySelector(run.dir === 'h' ? `[data-rk="${run.clue}"]` : `[data-dk="${run.clue}"]`);
    const runClueEls = runs.map(clueEl);

    /** Sıra durumu: 'bad' (tekrar ya da dolu ve toplam yanlış), 'ok' (dolu ve toplam doğru) ya da ''. */
    const runStatus = (run) => {
      const s = runState(run, values);
      if (s.dup) return 'bad';
      if (s.cnt === 0) return s.rem === 0 ? 'ok' : 'bad';
      if (s.rem <= 0) return 'bad'; // toplam şimdiden aşıldı
      return '';
    };

    const renderCombos = () => {
      if (!combosInfo) { comboBox.hidden = true; comboBox.innerHTML = ''; return; }
      comboBox.hidden = false;
      comboBox.innerHTML = `<div class="kk-combos-title">🧮 Toplam kombinasyonları</div>` + combosInfo.map((info) => `
        <div class="kk-combo-run">
          <div class="kk-combo-head">${DIR_ICON[info.run.dir]} <b>${runLabel(info.run)}</b>${info.note ? ` <small>${info.note}</small>` : ''}</div>
          <div class="kk-chips">${info.combos.slice(0, 14).map((m) => `<span class="kk-chip${info.valid && !info.valid.has(m) ? ' out' : ''}">${digitsOf(m).map((d) => (d === info.value ? `<b>${d}</b>` : d)).join('+')}</span>`).join('')}${info.combos.length > 14 ? `<span class="kk-chip more">+${info.combos.length - 14} daha</span>` : ''}${info.combos.length ? '' : '<span class="kk-chip out">yok</span>'}</div>
        </div>`).join('');
    };

    const render = () => {
      const selRuns = selected >= 0 && P.white[selected] ? runOf[selected] : [];
      const status = runs.map(runStatus);
      const badCells = new Set();
      runs.forEach((run, k) => { if (status[k] === 'bad') run.cells.forEach((c) => badCells.add(c)); });
      const inSel = new Set();
      for (const k of selRuns) runs[k].cells.forEach((c) => inSel.add(c));
      const sv = values[selected];
      for (const [c, el] of cellEls) {
        const v = values[c];
        el.className = 'kk-w';
        if (locked[c]) el.classList.add('revealed');
        if (inSel.has(c)) el.classList.add('run');
        if (hintArea.has(c)) el.classList.add('area');
        if (sv && v === sv && c !== selected && inSel.has(c)) el.classList.add('same');
        if (c === selected) el.classList.add('sel');
        if (v && badCells.has(c)) el.classList.add('bad');
        if (wrong.has(c)) el.classList.add('wrong');
        if (c === hintCell) el.classList.add('hinted');
        if (v) el.textContent = v;
        else if (notes[c]) el.innerHTML = `<span class="kk-notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<i>${notes[c] & (1 << d) ? d : ''}</i>`).join('')}</span>`;
        else el.textContent = '';
      }
      runs.forEach((run, k) => {
        const el = runClueEls[k];
        el.className = run.dir === 'h' ? 'kk-r' : 'kk-d';
        if (status[k]) el.classList.add(status[k]);
        if (selRuns.includes(k)) el.classList.add('cur');
      });
      notesBtn.classList.toggle('on', notesMode);
      renderCombos();
    };

    const clearHint = () => { hintCell = -1; hintArea = new Set(); combosInfo = null; };

    const checkSolved = () => {
      if (solved || !P.whites.every((c) => values[c] === solution[c])) return;
      solved = true;
      selected = -1;
      clearHint();
      render();
      board.classList.add('solved');
      setTimeout(ctx.onSolved, 400);
    };

    const runMates = (c) => runOf[c].flatMap((k) => runs[k].cells).filter((x) => x !== c);

    const input = (d) => {
      const c = selected;
      if (solved || c < 0 || !P.white[c] || locked[c]) return;
      wrong.delete(c);
      if (c === hintCell) clearHint();
      if (notesMode && d) {
        if (!values[c]) notes[c] ^= 1 << d;
      } else {
        values[c] = values[c] === d ? 0 : d;
        if (values[c]) for (const p of runMates(c)) notes[p] &= ~(1 << d);
      }
      render();
      checkSolved();
    };

    const move = (dr, dc) => {
      if (selected < 0) { selected = P.whites[0]; return; }
      let r = Math.floor(selected / C), c = selected % C;
      for (;;) {
        r += dr; c += dc;
        if (r < 0 || c < 0 || r >= R || c >= C) return;
        if (P.white[r * C + c]) { selected = r * C + c; return; }
      }
    };

    const onClick = (e) => {
      if (solved) return;
      const cell = e.target.closest('.kk-w');
      if (cell) { selected = Number(cell.dataset.c); render(); return; }
      const clue = e.target.closest('.kk-b.clue');
      if (clue) {
        // İpucu karesine dokununca sıranın ilk boş karesi seçilir
        const k = Number(clue.dataset.k);
        const preferDown = e.target.closest('.kk-d') || !P.right[k];
        const run = runs.find((x) => x.clue === k && x.dir === (preferDown ? 'v' : 'h')) ?? runs.find((x) => x.clue === k);
        if (run) { selected = run.cells.find((x) => !values[x]) ?? run.cells[0]; render(); }
        return;
      }
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
      if (/^[1-9]$/.test(k)) input(Number(k));
      else if (k === 'Backspace' || k === 'Delete' || k === '0') input(0);
      else if (k === 'n' || k === 'N') { notesMode = !notesMode; render(); }
      else if (k.startsWith('Arrow')) {
        e.preventDefault();
        const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
        move(dr, dc);
        render();
      }
    };
    document.addEventListener('keydown', onKey);

    // ---- Akıllı İpucu açıklaması ----
    const filledText = (run, base) => {
      const vals = run.cells.filter((c) => base[c]).map((c) => base[c]);
      return vals.length ? `dolu: ${vals.join('+')}` : '';
    };
    const runInfo = (run, base, cand, value, strike) => {
      const s = runState(run, base);
      const combos = combosFor(s.cnt, s.rem, s.used);
      const filled = filledText(run, base);
      const note = filled ? `${filled} → kalan ${s.rem}, ${s.cnt} boş kare` : '';
      const info = { run, combos, value, note };
      if (strike) info.valid = new Set(runConsistency(run, base, cand).combos);
      return info;
    };
    const unionDigits = (masks) => digitsOf(masks.reduce((a, m) => a | m, 0));

    const explainStep = (a, target) => {
      const run = runs[a.run];
      const valid = a.combos.map(comboText);
      const out = a.all.filter((m) => !a.combos.includes(m)).map(comboText);
      const here = a.elims.find(([c]) => c === target);
      const others = a.elims.filter(([c]) => c !== target).length;
      const why = out.length
        ? `${runLabel(run)} için ${out.length > 3 ? `${out.length} kombinasyon` : out.join(', ')} bu karelere sığmıyor (bazı rakamlar öbür yöndeki sıralar yüzünden oraya giremiyor); yalnızca ${valid.length > 3 ? `${valid.length} kombinasyon` : valid.join(', ')} uyuyor.`
        : `${runLabel(run)}: rakamları karelere tek tek yerleştirmeyi dene; bazı rakamlar bu sırada hiçbir uygun kareye oturmuyor.`;
      const res = here
        ? ` Böylece ${cellName(P, target)} karesinden ${listText(digitsOf(here[1]))} elenir${others ? ` (ve ${others} karede daha eleme olur)` : ''}.`
        : ` Böylece ${a.elims.length} karede bazı rakamlar elenir.`;
      return why + res;
    };

    const boosters = {
      reveal() {
        const open = (c) => !locked[c] && values[c] !== solution[c];
        let c = selected >= 0 && P.white[selected] && open(selected) ? selected : -1;
        if (c < 0) {
          const pool = P.whites.filter(open);
          if (!pool.length) return { ok: false, message: 'Açılacak kare yok.' };
          c = pool[Math.floor(Math.random() * pool.length)];
        }
        values[c] = solution[c];
        notes[c] = 0;
        locked[c] = true;
        wrong.delete(c);
        if (c === hintCell) clearHint();
        for (const p of runMates(c)) notes[p] &= ~(1 << solution[c]);
        selected = c;
        render();
        checkSolved();
        return { ok: true, message: `${cellName(P, c)} açıldı: ${solution[c]}` };
      },
      check() {
        wrong.clear();
        for (const c of P.whites) if (values[c] && values[c] !== solution[c]) wrong.add(c);
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} hatalı kare kırmızıyla işaretlendi.` };
      },
      hint() {
        // Yalnızca doğru rakamlar dikkate alınır; yanlışlar ipucunu bozmaz.
        const base = values.map((v, c) => (v && v === solution[c] ? v : 0));
        if (P.whites.every((c) => base[c])) return { ok: false, message: 'Doğru rakamlar tamam; kırmızı kareleri düzelt.' };
        const step = nextLogicalStep(P, base);
        if (!step) return { ok: false, message: 'İpucu bulunamadı.' };
        const c = step.cell, val = step.value;
        hintCell = c;
        selected = c;
        const where = cellName(P, c);
        const [hk, vk] = runOf[c];
        const advRuns = new Set(step.steps.map((a) => a.run));
        let msg = '';
        if (step.steps.length) {
          const key = step.steps[step.steps.length - 1];
          const before = step.steps.length > 1 ? ` (Bundan önce ${step.steps.length - 1} başka eleme daha gerekiyor.)` : '';
          msg = `🧠 Kombinasyon eleme: ${explainStep(key, step.cell)}${before} `;
        }
        if (step.reason === 'hidden') {
          const run = runs[step.run];
          const combos = combosFor(runState(run, base).cnt, runState(run, base).rem, runState(run, base).used);
          hintArea = new Set(run.cells);
          combosInfo = [runInfo(run, base, step.cand, val, advRuns.has(run.id))];
          const other = runs[runOf[c][run.dir === 'h' ? 1 : 0]];
          combosInfo.push(runInfo(other, base, step.cand, val, advRuns.has(other.id)));
          msg += `${runLabel(run)}: ${combos.length === 1 ? `tek kombinasyon ${comboText(combos[0])}` : `kombinasyonlar ${combosText(combos)}`}. `
            + `${combos.length === 1 ? 'Bu' : 'Hepsinde'} ${val} var, yani ${val} bu sırada mutlaka olmalı. `
            + `Sıradaki diğer karelere ${val} giremez (öbür yöndeki sıraları buna izin vermiyor), o yüzden ${val} → ${where}.`;
        } else {
          const h = runs[hk], v = runs[vk];
          hintArea = new Set([...h.cells, ...v.cells]);
          combosInfo = [runInfo(h, base, step.cand, val, advRuns.has(hk)), runInfo(v, base, step.cand, val, advRuns.has(vk))];
          const sh = runState(h, base), svs = runState(v, base);
          const last = sh.cnt === 1 ? h : svs.cnt === 1 ? v : null;
          if (last) {
            const st = runState(last, base);
            const filled = last.sum - st.rem;
            msg += `${runLabel(last)}: bu sırada tek boş kare kaldı. ${last.sum} − ${filled} = ${val}, yani ${where} karesine ${val} gelir.`;
          } else if (step.steps.length) {
            msg += `Bu elemeden sonra ${where} karesine yalnızca ${val} girebilir.`;
          } else {
            const dh = unionDigits(combosFor(sh.cnt, sh.rem, sh.used));
            const dv = unionDigits(combosFor(svs.cnt, svs.rem, svs.used));
            const common = dh.filter((d) => dv.includes(d));
            const partH = `${runLabel(h)} için ${combosText(combosFor(sh.cnt, sh.rem, sh.used), 4)} olabilir (rakamlar: ${dh.join(', ')})`;
            const partV = `${runLabel(v)} için ${combosText(combosFor(svs.cnt, svs.rem, svs.used), 4)} olabilir (rakamlar: ${dv.join(', ')})`;
            if (common.length === 1) {
              msg += `${partH}. ${partV}. İki sırada da olan tek rakam ${val}, yani ${where} karesine ${val} gelir.`;
            } else {
              const cnd = digitsOf(step.cand[c]);
              msg += `${partH}. ${partV}. Ortak rakamlar ${common.join(', ')}; ama ${listText(common.filter((d) => !cnd.includes(d)))} bu kareye uymuyor, geriye yalnızca ${val} kalıyor → ${where}.`;
            }
          }
        }
        const keyRun = step.steps.length ? step.steps[step.steps.length - 1].run : -1;
        if (keyRun >= 0 && !combosInfo.some((i) => i.run.id === keyRun)) combosInfo.unshift(runInfo(runs[keyRun], base, step.cand, 0, true));
        if (keyRun >= 0) runs[keyRun].cells.forEach((x) => hintArea.add(x));
        render();
        const hasWrong = P.whites.some((x) => values[x] && values[x] !== solution[x]);
        return { ok: true, message: msg + (hasWrong ? ' (Not: tahtada yanlış rakamlar var.)' : '') };
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
