import { parseLevel, newState, applyMove, findStep } from './logic.js';
import { describeStep } from './hints.js';

function ensureStyles() {
  if (document.getElementById('numberlink-css')) return;
  const link = document.createElement('link');
  link.id = 'numberlink-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const SVGNS = 'http://www.w3.org/2000/svg';
const COLORS = [
  ['#e53935', 'kırmızı'], ['#1e88e5', 'mavi'], ['#43a047', 'yeşil'], ['#f9c80e', 'sarı'],
  ['#fb8c00', 'turuncu'], ['#8e24aa', 'mor'], ['#00acc1', 'turkuaz'], ['#ec407a', 'pembe'],
  ['#795548', 'kahverengi'], ['#7cb342', 'açık yeşil'], ['#3949ab', 'lacivert'], ['#00897b', 'deniz yeşili'],
  ['#9e9d24', 'zeytin yeşili'], ['#5d6d7e', 'gri'],
];
const colorOf = (p) => COLORS[p % COLORS.length][0];
const colorName = (p) => COLORS[p % COLORS.length][1];

export default {
  id: 'numberlink',
  name: 'Sayı Bağla',
  icon: '🔗',
  description: 'Aynı sayıları renkli yollarla birleştir, bütün kareleri doldur.',
  rules: 'Aynı sayıları birbirine bağlayan yollar çiz. Yollar yalnızca yatay ve dikey komşu karelerden geçer; birbirini kesemez ve aynı kareyi paylaşamaz. Sonunda TÜM kareler bir yolla dolu olmalı — boş kare kalmamalı. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  howTo: [
    'Bir sayıya dokun ve parmağını kaldırmadan aynı sayıya kadar sürükle: renkli bir yol çizilir.',
    'Yollar yalnızca sağa, sola, yukarı ve aşağı gider; çapraz gitmez.',
    'Yollar birbirini kesemez. Başka bir yolun üstünden geçersen o yol kesilir.',
    'Bütün sayılar bağlanmalı ve hiç boş kare kalmamalı!',
    'Bir sayıya dokunursan yolu silinir. Yolun ucundan sürükleyerek devam edebilirsin.',
    'Takılırsan 💡 Akıllı İpucu sıradaki adımı ve nedenini anlatır.',
  ],
  boosters: [
    { id: 'reveal', name: 'Yol Aç', icon: '🔗', uses: 2, description: 'Bir sayı çiftinin doğru yolunu baştan sona çizer.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Çözümle uyuşmayan yol karelerini kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı hamleyi, nedenini açıklayarak gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const G = parseLevel(level);
    const { w, h, N, P, ends, solPaths, nbr } = G;
    const endOf = new Int16Array(N).fill(-1);
    ends.forEach(([a, b], p) => { endOf[a] = p; endOf[b] = p; });
    const solColor = new Int16Array(N);
    solPaths.forEach((path, p) => path.forEach((c) => { solColor[c] = p; }));

    let paths = Array.from({ length: P }, () => []); // her çift için oyuncunun yolu (bir uçtan başlar)
    const locked = new Array(P).fill(false);
    let history = [];
    let wrong = new Set();
    let hintCells = new Set();
    let hintAlt = new Set();
    let solved = false;
    let solveTimer = 0;
    let lastPair = -1;
    let cursor = -1; // klavye imleci
    let kbDraw = false;

    const pname = (p) => `${p + 1} (${colorName(p)})`;

    container.innerHTML = `
      <div class="nlink">
        <svg class="nl-board" viewBox="-0.06 -0.06 ${w + 0.12} ${h + 0.12}" role="img" aria-label="Sayı Bağla tahtası ${w}×${h}"></svg>
        <div class="nl-legend"></div>
        <div class="nl-tools">
          <button type="button" data-act="undo" title="Geri al (Ctrl+Z)">↶ Geri Al</button>
          <button type="button" data-act="reset" title="Bütün yolları sil">⟲ Sıfırla</button>
        </div>
        <p class="nl-help">Bir sayıdan aynı sayıya sürükle. Klavye: ok tuşlarıyla gez, Boşluk/Enter ile çizmeye başla ya da bitir.</p>
      </div>`;
    const root = container.querySelector('.nlink');
    const svg = root.querySelector('svg');
    const legend = root.querySelector('.nl-legend');
    root.style.setProperty('--ratio', `${w} / ${h}`);
    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(SVGNS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    };

    // Katmanlar
    const gCells = el('g', { class: 'nl-cells' }, svg);
    const cellEls = [];
    for (let i = 0; i < N; i++) {
      cellEls.push(el('rect', { class: 'nl-cell', x: (i % w) + 0.03, y: Math.floor(i / w) + 0.03, width: 0.94, height: 0.94, rx: 0.14 }, gCells));
    }
    const gMarks = el('g', { class: 'nl-marks' }, svg);
    const gPaths = el('g', { class: 'nl-paths' }, svg);
    const gEnds = el('g', { class: 'nl-ends' }, svg);
    const endEls = [];
    ends.forEach(([a, b], p) => {
      for (const c of [a, b]) {
        const x = (c % w) + 0.5, y = Math.floor(c / w) + 0.5;
        const g = el('g', { class: 'nl-end', 'data-p': p }, gEnds);
        el('circle', { class: 'nl-dot', cx: x, cy: y, r: 0.36, fill: colorOf(p) }, g);
        const t = el('text', { x, y: y + 0.015 }, g);
        t.textContent = p + 1;
        const ck = el('g', { class: 'nl-check' }, g);
        el('circle', { cx: x + 0.3, cy: y - 0.3, r: 0.16 }, ck);
        el('path', { d: `M${x + 0.22} ${y - 0.3} l0.06 0.07 l0.12 -0.14` }, ck);
        endEls.push({ p, g });
      }
    });
    const cursorEl = el('rect', { class: 'nl-cursor', width: 0.94, height: 0.94, rx: 0.14, visibility: 'hidden' }, svg);

    // ---- Durum yardımcıları ----
    const owner = () => {
      const o = new Int16Array(N).fill(-1);
      paths.forEach((path, p) => path.forEach((c) => { o[c] = p; }));
      return o;
    };
    const otherEnd = (p, c) => (ends[p][0] === c ? ends[p][1] : ends[p][0]);
    const isDone = (p) => {
      const path = paths[p];
      return path.length >= 2 && endOf[path[0]] === p && path[path.length - 1] === otherEnd(p, path[0]);
    };
    const isValid = () => {
      if (!paths.every((_, p) => isDone(p))) return false;
      const o = owner();
      return o.every((v) => v >= 0);
    };

    const render = () => {
      const o = owner();
      for (let i = 0; i < N; i++) {
        const r = cellEls[i];
        const p = o[i];
        r.style.fill = p >= 0 ? `color-mix(in srgb, ${colorOf(p)} 22%, var(--card))` : '';
        r.classList.toggle('filled', p >= 0);
      }
      gMarks.replaceChildren();
      for (const c of hintAlt) el('rect', { class: 'nl-alt', x: (c % w) + 0.08, y: Math.floor(c / w) + 0.08, width: 0.84, height: 0.84, rx: 0.12 }, gMarks);
      for (const c of hintCells) el('rect', { class: 'nl-hint', x: (c % w) + 0.06, y: Math.floor(c / w) + 0.06, width: 0.88, height: 0.88, rx: 0.13 }, gMarks);
      gPaths.replaceChildren();
      paths.forEach((path, p) => {
        if (path.length < 2) return;
        const pts = path.map((c) => `${(c % w) + 0.5},${Math.floor(c / w) + 0.5}`).join(' ');
        el('polyline', { class: `nl-path${locked[p] ? ' locked' : ''}`, points: pts, stroke: colorOf(p) }, gPaths);
      });
      for (const c of wrong) {
        const x = (c % w) + 0.5, y = Math.floor(c / w) + 0.5;
        el('circle', { class: 'nl-wrong-bg', cx: x, cy: y, r: 0.25 }, gPaths);
        el('path', { class: 'nl-wrong', d: `M${x - 0.18} ${y - 0.18} L${x + 0.18} ${y + 0.18} M${x + 0.18} ${y - 0.18} L${x - 0.18} ${y + 0.18}` }, gPaths);
      }
      const doneCount = paths.filter((_, p) => isDone(p)).length;
      endEls.forEach(({ p, g }) => g.classList.toggle('done', isDone(p)));
      const empty = o.reduce((s, v) => s + (v < 0 ? 1 : 0), 0);
      legend.innerHTML = `${paths.map((_, p) => `<span class="nl-chip${isDone(p) ? ' done' : ''}" style="--c:${colorOf(p)}">${p + 1}${isDone(p) ? ' ✓' : ''}</span>`).join('')}
        <span class="nl-count">Bağlanan: <b>${doneCount}/${P}</b> · Boş kare: <b>${empty}</b></span>`;
      if (cursor >= 0) {
        cursorEl.setAttribute('x', (cursor % w) + 0.03);
        cursorEl.setAttribute('y', Math.floor(cursor / w) + 0.03);
        cursorEl.setAttribute('visibility', 'visible');
        cursorEl.classList.toggle('drawing', kbDraw);
      } else cursorEl.setAttribute('visibility', 'hidden');
      root.classList.toggle('solved', solved);
    };

    const clearMarks = () => { hintCells = new Set(); hintAlt = new Set(); wrong = new Set(); };

    const checkSolved = () => {
      if (solved) return;
      if (isValid()) {
        solved = true;
        kbDraw = false;
        cursor = -1;
        clearMarks();
        render();
        solveTimer = setTimeout(ctx.onSolved, 450);
      } else if (paths.every((_, p) => isDone(p))) {
        ctx.toast('Bütün sayılar bağlandı ama boş kareler kaldı! Her kare bir yolla dolmalı.');
      }
    };

    // ---- Çizim mantığı ----
    let drag = null; // {p, snapshot, before, changed}
    const snapshotPaths = () => paths.map((x) => x.slice());

    // Çizilen yol başka yolların üstünden geçerse onları kes; geri çekilince eski hâline döner.
    const applyCuts = () => {
      const mine = new Set(paths[drag.p]);
      for (let q = 0; q < P; q++) {
        if (q === drag.p) continue;
        const orig = drag.snapshot[q];
        const k = orig.findIndex((c) => mine.has(c));
        paths[q] = k < 0 ? orig.slice() : orig.slice(0, k);
        if (paths[q].length < 2) paths[q] = k < 0 ? orig.slice() : [];
      }
    };

    const startAt = (c) => {
      if (solved) return false;
      const p0 = endOf[c];
      if (p0 >= 0) {
        if (locked[p0]) { ctx.toast('Bu yol Yol Aç ile çizildi, değiştirilemez.'); return false; }
        drag = { p: p0, before: snapshotPaths(), changed: paths[p0].length > 0 };
        paths[p0] = [c];
      } else {
        const p = paths.findIndex((path) => path.includes(c));
        if (p < 0) return false;
        if (locked[p]) { ctx.toast('Bu yol Yol Aç ile çizildi, değiştirilemez.'); return false; }
        const k = paths[p].indexOf(c);
        drag = { p, before: snapshotPaths(), changed: k < paths[p].length - 1 };
        paths[p] = paths[p].slice(0, k + 1);
      }
      drag.snapshot = snapshotPaths();
      lastPair = drag.p;
      clearMarks();
      render();
      return true;
    };

    // Yolun ucunu komşu n hücresine taşı. Başarılıysa true.
    const stepTo = (n) => {
      const p = drag.p;
      const path = paths[p];
      const tip = path[path.length - 1];
      if (!nbr[tip].includes(n)) return false;
      const k = path.indexOf(n);
      if (k >= 0) { paths[p] = path.slice(0, k + 1); drag.changed = true; applyCuts(); return true; }
      if (isDone(p)) return false;
      if (endOf[n] >= 0 && endOf[n] !== p) return false;
      const q = paths.findIndex((x, j) => j !== p && x.includes(n));
      if (q >= 0 && locked[q]) return false;
      path.push(n);
      drag.changed = true;
      applyCuts();
      return true;
    };

    const moveToward = (target) => {
      let guard = 0;
      while (guard++ < 40) {
        const path = paths[drag.p];
        const tip = path[path.length - 1];
        if (tip === target) return;
        const tr = Math.floor(target / w), tc = target % w, r = Math.floor(tip / w), c = tip % w;
        const dr = tr - r, dc = tc - c;
        let n;
        if (Math.abs(dc) >= Math.abs(dr)) n = tip + Math.sign(dc); else n = tip + Math.sign(dr) * w;
        if (!stepTo(n)) {
          // diğer ekseni dene
          const alt = Math.abs(dc) >= Math.abs(dr) ? (dr ? tip + Math.sign(dr) * w : -1) : (dc ? tip + Math.sign(dc) : -1);
          if (alt < 0 || !stepTo(alt)) return;
        }
      }
    };

    const finishDrag = () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (paths[d.p].length < 2) paths[d.p] = [];
      const same = JSON.stringify(d.before) === JSON.stringify(paths);
      if (!same) {
        history.push(d.before);
        if (history.length > 200) history.shift();
      }
      render();
      if (!same) checkSolved();
    };

    // ---- İşaretçi (fare + dokunmatik) ----
    const cellAt = (ev) => {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      const x = Math.floor(q.x), y = Math.floor(q.y);
      if (x < 0 || y < 0 || x >= w || y >= h) return -1;
      return y * w + x;
    };
    let pointerId = null;
    const onDown = (ev) => {
      if (solved || drag) return;
      if (ev.button !== undefined && ev.button > 0) return;
      const c = cellAt(ev);
      if (c < 0) return;
      ev.preventDefault();
      kbDraw = false;
      cursor = -1;
      if (!startAt(c)) { render(); return; }
      pointerId = ev.pointerId;
      try { svg.setPointerCapture(ev.pointerId); } catch { /* yok say */ }
    };
    const onMove = (ev) => {
      if (!drag || ev.pointerId !== pointerId) return;
      ev.preventDefault();
      const c = cellAt(ev);
      if (c < 0) return;
      const before = paths[drag.p].length + ':' + paths[drag.p][paths[drag.p].length - 1];
      moveToward(c);
      if (before !== paths[drag.p].length + ':' + paths[drag.p][paths[drag.p].length - 1]) render();
    };
    const onUp = (ev) => {
      if (!drag || ev.pointerId !== pointerId) return;
      pointerId = null;
      finishDrag();
    };
    const onTouchMove = (ev) => { if (drag) ev.preventDefault(); };
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onUp);
    svg.addEventListener('touchmove', onTouchMove, { passive: false });
    svg.addEventListener('touchstart', (ev) => { if (ev.touches.length === 1) ev.preventDefault(); }, { passive: false });

    // ---- Araç düğmeleri ----
    const undo = () => {
      if (solved) return;
      const prev = history.pop();
      if (!prev) { ctx.toast('Geri alınacak hamle yok.'); return; }
      paths = prev.map((x, p) => (locked[p] ? solPaths[p].slice() : x));
      // kilitli yollarla çakışanları kes
      const lockedCells = new Set(paths.flatMap((x, p) => (locked[p] ? x : [])));
      paths = paths.map((x, p) => {
        if (locked[p]) return x;
        const k = x.findIndex((c) => lockedCells.has(c));
        return k < 0 ? x : k < 2 ? [] : x.slice(0, k);
      });
      clearMarks();
      render();
    };
    root.querySelector('.nl-tools').addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b || solved || drag) return;
      if (b.dataset.act === 'undo') undo();
      else if (b.dataset.act === 'reset') {
        if (!paths.some((x, p) => x.length && !locked[p])) return;
        history.push(snapshotPaths());
        paths = paths.map((x, p) => (locked[p] ? x : []));
        clearMarks();
        render();
      }
    });

    // ---- Klavye ----
    const onKey = (ev) => {
      if (ev.target.closest?.('input, textarea') || document.querySelector('.modal') || solved) return;
      const k = ev.key;
      if ((ev.ctrlKey || ev.metaKey) && (k === 'z' || k === 'Z')) { ev.preventDefault(); if (!drag) undo(); return; }
      if (pointerId !== null) return;
      if (k === 'Escape') { if (drag) finishDrag(); kbDraw = false; cursor = -1; render(); return; }
      if (k === ' ' || k === 'Enter') {
        ev.preventDefault();
        if (cursor < 0) { cursor = ends[0][0]; render(); return; }
        if (kbDraw) { kbDraw = false; finishDrag(); return; }
        if (startAt(cursor)) { kbDraw = true; render(); }
        return;
      }
      const d = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[k];
      if (!d) return;
      ev.preventDefault();
      if (cursor < 0) { cursor = ends[0][0]; render(); return; }
      const r = Math.floor(cursor / w) + d[0], c = (cursor % w) + d[1];
      if (r < 0 || c < 0 || r >= h || c >= w) return;
      const n = r * w + c;
      if (kbDraw && drag) {
        if (!stepTo(n)) { ctx.toast('Bu kareye geçemezsin.'); return; }
        cursor = n;
        render();
        if (isDone(drag.p)) { kbDraw = false; finishDrag(); }
        return;
      }
      cursor = n;
      render();
    };
    document.addEventListener('keydown', onKey);

    // ---- Boosterlar ----
    const correctPrefix = (p) => {
      const path = paths[p];
      if (path.length < 2 || endOf[path[0]] !== p) return { side: 0, k: 1 };
      const side = path[0] === ends[p][0] ? 0 : 1;
      const sp = side === 0 ? solPaths[p] : solPaths[p].slice().reverse();
      let k = 0;
      while (k < path.length && path[k] === sp[k]) k++;
      return { side, k, sp };
    };
    const hasWrong = () => paths.some((path, p) => path.some((c) => solColor[c] !== p));

    const boosters = {
      reveal() {
        const notDone = [...Array(P).keys()].filter((p) => !locked[p] && !(isDone(p) && paths[p].every((c) => solColor[c] === p)));
        if (!notDone.length) return { ok: false, message: 'Bütün yollar zaten doğru çizilmiş. (hak harcanmadı)' };
        // Önce son dokunduğun yol; yoksa en az ilerlemiş yol.
        let p = notDone.includes(lastPair) ? lastPair : -1;
        if (p < 0) {
          const score = (q) => correctPrefix(q).k / solPaths[q].length;
          p = notDone.reduce((a, b) => (score(b) < score(a) ? b : a));
        }
        history.push(snapshotPaths());
        paths[p] = solPaths[p].slice();
        locked[p] = true;
        const mine = new Set(paths[p]);
        paths = paths.map((x, q) => {
          if (q === p) return x;
          const k = x.findIndex((c) => mine.has(c));
          return k < 0 ? x : k < 2 ? [] : x.slice(0, k);
        });
        clearMarks();
        hintCells = new Set(paths[p]);
        render();
        checkSolved();
        return { ok: true, message: `${pname(p)} sayılarının doğru yolu çizildi.` };
      },
      check() {
        clearMarks();
        paths.forEach((path, p) => path.forEach((c) => { if (solColor[c] !== p) wrong.add(c); }));
        render();
        if (!wrong.size) return { ok: false, message: 'Çizdiğin yollarda hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} kare çözümle uyuşmuyor; kırmızı çarpılarla işaretlendi. O yolları geri çekip başka yoldan dene.` };
      },
      hint() {
        // Yalnızca doğru çizilmiş yol parçaları bilgi olarak kullanılır.
        const S = newState(G);
        for (let p = 0; p < P; p++) {
          const { side, k, sp } = correctPrefix(p);
          for (let i = 1; i < k; i++) {
            if (i === sp.length - 1) applyMove(S, { p, side, to: -1 });
            else applyMove(S, { p, side, to: sp[i] });
          }
        }
        const bad = hasWrong();
        const note = bad ? ' (Not: bazı yolların yanlış; ❗ Hata Bul yardımcı olur.)' : '';
        const step = findStep(S, 4);
        clearMarks();
        if (!step || step.contradiction) {
          // Yedek: bir yolun sıradaki doğru karesini göster.
          for (let p = 0; p < P; p++) {
            if (S.done[p]) continue;
            const a = S.hd[2 * p];
            const sp = solPaths[p][0] === ends[p][0] ? solPaths[p] : solPaths[p].slice().reverse();
            const idx = sp.indexOf(a);
            const nx = sp[idx + 1];
            hintCells = new Set([a, nx]);
            render();
            return { ok: true, message: `${pname(p)} yolu işaretli kareden devam eder.${note}` };
          }
          return { ok: false, message: 'İpucu bulunamadı. (hak harcanmadı)' };
        }
        const d = describeStep(G, S, step, pname);
        hintCells = new Set(d.cells);
        hintAlt = new Set(d.alt);
        const msg = d.msg;
        render();
        return { ok: true, message: msg + note };
      },
    };

    render();
    return {
      useBooster: (id) => {
        if (solved || drag) return { ok: false };
        return boosters[id]?.() ?? { ok: false };
      },
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        clearTimeout(solveTimer);
      },
    };
  },
};
