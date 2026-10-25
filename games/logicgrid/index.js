import { parse, clueText, introText, itemLabel, nextStep, explainStep, newState } from './logic.js';

function ensureStyles() {
  if (document.getElementById('logicgrid-css')) return;
  const link = document.createElement('link');
  link.id = 'logicgrid-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const rich = (s) => esc(s).replace(/\[\[(.*?)\]\]/g, '<b>$1</b>');
const AUTO_KEY = 'akiloyunlari:logicgrid:autoX';

function loadAuto() {
  try { return localStorage.getItem(AUTO_KEY) !== '0'; } catch { return true; }
}
function saveAuto(v) {
  try { localStorage.setItem(AUTO_KEY, v ? '1' : '0'); } catch { /* yok say */ }
}

// Hücre değerleri: 0 boş, 1 ✗, 2 ✓, 3 otomatik ✗
const SYM = ['', '✗', '✓', '✗'];

export default {
  id: 'logicgrid',
  name: 'Mantık Tablosu',
  icon: '🧩',
  description: 'İpuçlarını kullanarak kimin neye sahip olduğunu tabloda bul.',
  rules: 'Her çocuğun her kategoride tam olarak bir eşi vardır ve hiçbir öğe iki çocuğa ait olamaz. Tablodaki bir kareye dokununca sırasıyla ✗ (olamaz), ✓ (eşleşiyor) ve boş olur. İpuçlarından yola çıkarak tüm doğru eşleşmeleri ✓ ile işaretle. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  boosters: [
    { id: 'reveal', name: 'Eşleşme Aç', icon: '🔍', uses: 2, description: 'Bir çocuğun doğru bir eşleşmesini tabloda ✓ olarak açar.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış koyduğun ✓ ve ✗ işaretlerini kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı adımı, kullanılacak ipucunu ve nedenini gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const L = parse(level);
    const { n, k, M } = L;
    const cat = (g) => Math.floor(g / n);
    const owner = new Array(M);
    L.sol.forEach((perm, c) => perm.forEach((item, p) => { owner[c * n + item] = p; }));
    const truth = (a, b) => (owner[a] === owner[b] ? 2 : 1);

    const marks = new Uint8Array(M * M);
    const locked = new Set();
    const wrong = new Set();
    const struck = new Set();
    const history = [];
    let autoX = loadAuto();
    let cursor = null; // [satır, sütun]
    let hintKey = -1;
    let hintClue = -1;
    let solved = false;

    const key = (a, b) => Math.min(a, b) * M + Math.max(a, b);
    const get = (a, b) => marks[a * M + b];
    const put = (a, b, v) => { marks[a * M + b] = v; marks[b * M + a] = v; };

    // ---------------------------------------------------------- Izgara yerleşimi
    const colCats = Array.from({ length: k - 1 }, (_, i) => i + 1);
    const rowCats = [0, ...Array.from({ length: k - 2 }, (_, i) => k - 1 - i)];
    const colItems = colCats.flatMap((c) => Array.from({ length: n }, (_, j) => c * n + j));
    const rows = []; // { g, blockStart, cells: [{a,b}|null] }
    rowCats.forEach((rc, r) => {
      const blocks = k - 1 - r;
      for (let i = 0; i < n; i++) {
        const g = rc * n + i;
        const cells = colItems.map((h, ci) => (Math.floor(ci / n) < blocks ? { a: g, b: h } : null));
        rows.push({ g, rc, blockStart: i === 0, cells });
      }
    });

    const label = (g, cls = '') => {
      const lb = itemLabel(L, g);
      const ico = lb.ico ? `<span class="lg-ico">${lb.ico}</span>` : '';
      return `<span class="lg-lbl ${lb.ico ? 'has-ico' : ''} ${cls}" title="${esc(lb.word)}">${ico}<span class="lg-w">${esc(lb.text)}</span></span>`;
    };

    const gridHtml = () => {
      let h = '<table class="lg-grid"><thead><tr><th class="lg-corner lg-rc" rowspan="2"></th><th class="lg-corner" rowspan="2"></th>';
      for (const c of colCats) {
        const d = L.cats[c].def;
        h += `<th class="lg-cathead bl" colspan="${n}" title="${esc(d.name)}"><span>${d.ico}</span> <span class="lg-catname">${esc(d.name)}</span></th>`;
      }
      h += '</tr><tr>';
      colItems.forEach((g, ci) => {
        const lb = itemLabel(L, g);
        h += `<th class="lg-colhead ${ci % n === 0 ? 'bl' : ''}" data-col="${ci}" title="${esc(lb.word)}"><div class="lg-chw"><span class="lg-vert">${esc(lb.head)}</span>${lb.ico ? `<span class="lg-ico">${lb.ico}</span>` : ''}</div></th>`;
      });
      h += '</tr></thead><tbody>';
      rows.forEach((row, ri) => {
        h += `<tr class="${row.blockStart ? 'bt' : ''}">`;
        if (row.blockStart) {
          const d = L.cats[row.rc].def;
          h += `<th class="lg-rowcat" rowspan="${n}" title="${esc(d.name)}"><span class="lg-vert">${esc(d.name)}</span></th>`;
        }
        h += `<th class="lg-rowhead" data-row="${ri}">${label(row.g)}</th>`;
        row.cells.forEach((cell, ci) => {
          if (!cell) return;
          const lbA = itemLabel(L, cell.a).word, lbB = itemLabel(L, cell.b).word;
          h += `<td class="${ci % n === 0 ? 'bl' : ''}"><button class="lg-cell" data-r="${ri}" data-c="${ci}" aria-label="${esc(`${lbA} – ${lbB}`)}"></button></td>`;
        });
        h += '</tr>';
      });
      return h + '</tbody></table>';
    };

    container.innerHTML = `
      <div class="logicgrid">
        <p class="lg-intro">${rich(introText(L))}</p>
        <div class="lg-tools">
          <button class="lg-tool" data-act="undo" title="Geri al (Ctrl+Z)">↶ Geri al</button>
          <button class="lg-tool" data-act="auto" title="✓ koyunca aynı satır ve sütundaki boş kareleri otomatik ✗ yap"></button>
          <button class="lg-tool" data-act="clear" title="Tüm işaretleri sil">🧹 Temizle</button>
        </div>
        <div class="lg-main">
          <div class="lg-scroll">${gridHtml()}</div>
          <section class="lg-clues">
            <h3>İpuçları <small>(dokununca üstü çizilir)</small></h3>
            <ol>${L.clues.map((cl, i) => `<li data-i="${i}">${rich(clueText(L, cl))}</li>`).join('')}</ol>
          </section>
        </div>
        <section class="lg-summary">
          <h3>Cevap Tablosu</h3>
          <div class="lg-sumwrap"><table></table></div>
        </section>
      </div>`;

    const root = container.querySelector('.logicgrid');
    const table = root.querySelector('.lg-grid');
    const cellEls = [...root.querySelectorAll('.lg-cell')];
    const cellAt = new Map(cellEls.map((el) => [`${el.dataset.r}:${el.dataset.c}`, el]));
    const colHeads = [...root.querySelectorAll('.lg-colhead')];
    const rowHeads = [...root.querySelectorAll('.lg-rowhead')];
    const clueEls = [...root.querySelectorAll('.lg-clues li')];
    const autoBtn = root.querySelector('[data-act="auto"]');
    const sumTable = root.querySelector('.lg-summary table');
    const pairOf = (el) => rows[el.dataset.r].cells[el.dataset.c];

    // ---------------------------------------------------------- Boyutlandırma
    // Önce geniş etiketlerle (en az 28 px hücre) sığdırmayı dene; olmazsa sıkışık düzene geç
    // (yalnızca simgeli etiketler, kategori sütunu gizli). 18 pikselde de sığmıyorsa dokunma
    // hedefi küçülmesin diye 24 piksele dönüp yatay kaydırmaya izin ver.
    const fit = () => {
      const w = root.clientWidth;
      const tryMode = (narrow, minCs) => {
        root.classList.toggle('narrow', narrow);
        root.style.setProperty('--lw', `${narrow ? 50 : 92}px`);
        for (let cs = 40; cs >= minCs; cs--) {
          root.style.setProperty('--cs', `${cs}px`);
          if (table.getBoundingClientRect().width <= w - 2) return true;
        }
        return false;
      };
      if (tryMode(false, 28) || tryMode(true, 18)) return;
      root.style.setProperty('--cs', '24px');
    };
    window.addEventListener('resize', fit);

    // ---------------------------------------------------------- Çizim
    const summary = () => {
      // ✓ işaretleriyle birbirine bağlanan öğeleri grupla (birleşim-bul).
      const parent = Array.from({ length: M }, (_, i) => i);
      const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
      for (let a = 0; a < M; a++) for (let b = a + 1; b < M; b++) if (cat(a) !== cat(b) && get(a, b) === 2) parent[find(a)] = find(b);
      const groups = [];
      for (let p = 0; p < n; p++) {
        const r = find(p);
        groups.push(Array.from({ length: k }, (_, c) => {
          const list = [];
          for (let j = 0; j < n; j++) if (find(c * n + j) === r) list.push(c * n + j);
          return list;
        }));
      }
      return groups;
    };

    const renderSummary = (groups) => {
      let h = '<thead><tr>' + L.cats.map((c) => `<th>${c.def.ico} <span class="lg-catname">${esc(c.def.name)}</span></th>`).join('') + '</tr></thead><tbody>';
      groups.forEach((g, p) => {
        h += '<tr>';
        for (let c = 0; c < k; c++) {
          if (c === 0) { h += `<th>${esc(itemLabel(L, p).text)}</th>`; continue; }
          const list = g[c];
          if (list.length === 1) {
            const lb = itemLabel(L, list[0]);
            h += `<td title="${esc(lb.word)}">${lb.ico ? `<span class="lg-ico">${lb.ico}</span> ` : ''}<span class="lg-w">${esc(lb.text)}</span></td>`;
          } else if (list.length > 1) h += '<td class="bad" title="Çelişki: birden fazla eşleşme">⚠️</td>';
          else h += '<td class="empty">?</td>';
        }
        h += '</tr>';
      });
      sumTable.innerHTML = h + '</tbody>';
    };

    const render = () => {
      cellEls.forEach((el) => {
        const { a, b } = pairOf(el);
        const v = get(a, b);
        const kk = key(a, b);
        el.textContent = SYM[v];
        el.className = 'lg-cell';
        if (v === 1) el.classList.add('no');
        else if (v === 2) el.classList.add('yes');
        else if (v === 3) el.classList.add('no', 'auto');
        if (locked.has(kk)) el.classList.add('locked');
        if (wrong.has(kk)) el.classList.add('wrong');
        if (kk === hintKey) el.classList.add('hinted');
        if (cursor && Number(el.dataset.r) === cursor[0] && Number(el.dataset.c) === cursor[1]) el.classList.add('cur');
      });
      rowHeads.forEach((el, ri) => el.classList.toggle('hl', !!cursor && cursor[0] === ri));
      colHeads.forEach((el, ci) => el.classList.toggle('hl', !!cursor && cursor[1] === ci));
      clueEls.forEach((el, i) => {
        el.classList.toggle('done', struck.has(i));
        el.classList.toggle('hinted', i === hintClue);
      });
      autoBtn.textContent = `Otomatik ✗: ${autoX ? 'Açık' : 'Kapalı'}`;
      autoBtn.classList.toggle('on', autoX);
      const groups = summary();
      renderSummary(groups);
      return groups;
    };

    const checkSolved = (groups) => {
      if (solved) return;
      for (let a = 0; a < M; a++) for (let b = a + 1; b < M; b++) if (get(a, b) === 2 && truth(a, b) !== 2) return;
      if (!groups.every((g) => g.every((list) => list.length === 1))) return;
      solved = true;
      cursor = null;
      hintKey = -1;
      render();
      root.classList.add('solved');
      setTimeout(ctx.onSolved, 500);
    };

    const update = () => checkSolved(render());

    // ---------------------------------------------------------- İşaretleme
    const snapshot = () => {
      history.push(marks.slice());
      if (history.length > 300) history.shift();
    };
    const rowHasYes = (g, c) => { for (let j = 0; j < n; j++) if (get(g, c * n + j) === 2) return true; return false; };
    const applyAutoX = (a, b) => {
      for (let j = 0; j < n; j++) {
        const hb = cat(b) * n + j, ha = cat(a) * n + j;
        if (hb !== b && get(a, hb) === 0) put(a, hb, 3);
        if (ha !== a && get(ha, b) === 0) put(ha, b, 3);
      }
    };
    // ✓ kaldırılınca artık gerekçesi kalmayan otomatik ✗'leri temizle.
    const cleanAutoX = (a, b) => {
      for (let j = 0; j < n; j++) {
        const hb = cat(b) * n + j, ha = cat(a) * n + j;
        if (get(a, hb) === 3 && !rowHasYes(a, cat(b)) && !rowHasYes(hb, cat(a))) put(a, hb, 0);
        if (get(ha, b) === 3 && !rowHasYes(ha, cat(b)) && !rowHasYes(b, cat(a))) put(ha, b, 0);
      }
    };
    const setMark = (a, b, v) => {
      const kk = key(a, b);
      if (locked.has(kk)) { ctx.toast('Bu eşleşme booster ile açıldı, değiştirilemez.'); return; }
      const old = get(a, b);
      if (old === v) return;
      snapshot();
      put(a, b, v);
      wrong.delete(kk);
      if (kk === hintKey) { hintKey = -1; hintClue = -1; }
      if (v === 2 && autoX) applyAutoX(a, b);
      if (old === 2 && v !== 2) cleanAutoX(a, b);
      update();
    };
    const cycle = (a, b) => {
      const v = get(a, b);
      setMark(a, b, v === 0 ? 1 : v === 2 ? 0 : 2);
    };

    root.addEventListener('click', (e) => {
      if (solved) return;
      const cellEl = e.target.closest('.lg-cell');
      if (cellEl) {
        cursor = [Number(cellEl.dataset.r), Number(cellEl.dataset.c)];
        const { a, b } = pairOf(cellEl);
        cycle(a, b);
        render();
        return;
      }
      const li = e.target.closest('.lg-clues li');
      if (li) {
        const i = Number(li.dataset.i);
        if (struck.has(i)) struck.delete(i); else struck.add(i);
        render();
        return;
      }
      const tool = e.target.closest('.lg-tool');
      if (!tool) return;
      const act = tool.dataset.act;
      if (act === 'undo') {
        if (!history.length) { ctx.toast('Geri alınacak hamle yok.'); return; }
        marks.set(history.pop());
        wrong.clear();
        update();
      } else if (act === 'auto') {
        autoX = !autoX;
        saveAuto(autoX);
        render();
      } else if (act === 'clear') {
        if (!marks.some((v, i) => v && !locked.has(key(Math.floor(i / M), i % M)))) { ctx.toast('Tablo zaten boş.'); return; }
        snapshot();
        for (let a = 0; a < M; a++) for (let b = 0; b < M; b++) if (!locked.has(key(a, b))) marks[a * M + b] = 0;
        wrong.clear();
        hintKey = -1; hintClue = -1;
        update();
        ctx.toast('Tablo temizlendi (↶ ile geri alabilirsin).');
      }
    });

    // ---------------------------------------------------------- Klavye
    const moveCursor = (dr, dc) => {
      if (!cursor) { cursor = [0, 0]; return; }
      let [r, c] = cursor;
      for (let step = 0; step < rows.length + colItems.length; step++) {
        r += dr; c += dc;
        if (r < 0 || r >= rows.length || c < 0 || c >= colItems.length) return;
        if (cellAt.has(`${r}:${c}`)) { cursor = [r, c]; return; }
        if (dc) return; // satırda boşluğa gelince dur
      }
    };
    const onKey = (e) => {
      if (solved || e.target.closest?.('input, textarea') || document.querySelector('.modal')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        root.querySelector('[data-act="undo"]').click();
        return;
      }
      const dirs = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
      if (dirs[e.key]) {
        e.preventDefault();
        moveCursor(...dirs[e.key]);
        render();
        cellAt.get(`${cursor[0]}:${cursor[1]}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return;
      }
      if (!cursor) return;
      const el = cellAt.get(`${cursor[0]}:${cursor[1]}`);
      if (!el) return;
      const { a, b } = pairOf(el);
      const kname = e.key.toLowerCase();
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cycle(a, b); }
      else if (kname === 'x') setMark(a, b, 1);
      else if (kname === 'v' || kname === 'o') setMark(a, b, 2);
      else if (e.key === 'Backspace' || e.key === 'Delete') setMark(a, b, 0);
    };
    document.addEventListener('keydown', onKey);

    // ---------------------------------------------------------- Boosterlar
    const cellElFor = (a, b) => cellEls.find((el) => { const p = pairOf(el); return key(p.a, p.b) === key(a, b); });
    const focusCell = (a, b) => {
      const el = cellElFor(a, b);
      if (!el) return;
      cursor = [Number(el.dataset.r), Number(el.dataset.c)];
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    const W = (g) => itemLabel(L, g).word;
    const wrongMarks = () => {
      const list = [];
      for (let a = 0; a < M; a++) for (let b = a + 1; b < M; b++) {
        if (cat(a) === cat(b)) continue;
        const v = get(a, b);
        if (v && (v === 2 ? 2 : 1) !== truth(a, b)) list.push(key(a, b));
      }
      return list;
    };

    const boosters = {
      reveal() {
        const pool = [];
        for (let p = 0; p < n; p++) for (let c = 1; c < k; c++) {
          const b = c * n + L.sol[c][p];
          if (get(p, b) !== 2) pool.push([p, b]);
        }
        if (!pool.length) return { ok: false, message: 'Açılacak eşleşme kalmadı.' };
        // İmlecin satırındaki eşleşme öncelikli.
        const curRow = cursor ? rows[cursor[0]].g : -1;
        const pref = pool.filter(([p, b]) => p === curRow || b === curRow);
        const list = pref.length ? pref : pool;
        const [a, b] = list[Math.floor(Math.random() * list.length)];
        snapshot();
        put(a, b, 2);
        locked.add(key(a, b));
        wrong.delete(key(a, b));
        if (autoX) applyAutoX(a, b);
        hintKey = -1; hintClue = -1;
        focusCell(a, b);
        update();
        return { ok: true, message: `Açılan eşleşme: ${W(a)} ↔ ${W(b)} ✓` };
      },
      check() {
        wrong.clear();
        for (const kk of wrongMarks()) wrong.add(kk);
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} hatalı işaret kırmızıyla gösterildi.` };
      },
      hint() {
        // Yalnızca doğru işaretler dikkate alınır; yanlışlar ipucunu bozmaz.
        const st = newState(L);
        for (let a = 0; a < M; a++) for (let b = 0; b < M; b++) {
          if (a === b || cat(a) === cat(b)) continue;
          const v = get(a, b);
          if (!v) continue;
          const t = truth(a, b);
          if ((v === 2 ? 2 : 1) === t) st[a * M + b] = t;
        }
        const step = nextStep(L, st, 5);
        if (!step) return { ok: false, message: 'İpucu bulunamadı.' };
        hintKey = key(step.g1, step.g2);
        hintClue = step.clue ?? -1;
        focusCell(step.g1, step.g2);
        render();
        if (hintClue >= 0) clueEls[hintClue].scrollIntoView({ block: 'nearest' });
        const hasWrong = wrongMarks().length > 0;
        return { ok: true, message: explainStep(L, step) + (hasWrong ? ' (Not: tabloda hatalı işaretler var.)' : '') };
      },
    };

    render();
    fit();
    requestAnimationFrame(fit);
    document.fonts?.ready.then(() => { if (root.isConnected) fit(); });
    return {
      useBooster: (id) => (solved ? { ok: false } : boosters[id]?.() ?? { ok: false }),
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', fit);
      },
    };
  },
};
