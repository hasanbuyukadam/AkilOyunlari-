import { geometry, parseClues, parseSolution, nextStep, LINE, CROSS } from './logic.js';

function ensureStyles() {
  if (document.getElementById('slitherlink-css')) return;
  const link = document.createElement('link');
  link.id = 'slitherlink-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const NS = 'http://www.w3.org/2000/svg';
const S = 40; // hücre boyu (viewBox birimi)
const M = S / 2; // kenar boşluğu = dokunma alanları için yarım hücre

export default {
  id: 'slitherlink',
  name: 'Çit Çizme',
  icon: '✏️',
  description: 'Noktaları birleştirip sayılara uyan tek bir kapalı çit çiz.',
  rules: 'Noktalar arasına çizgi çizerek tek bir kapalı döngü oluştur. Döngü kendini kesmez ve dallanmaz; her noktaya ya 0 ya 2 çizgi gelir. Hücredeki sayı, o hücrenin kaç kenarının döngüde olduğunu gösterir. Kenara dokun: çizgi → × (kesin boş) → boş. Sağ tık ya da basılı tutma doğrudan × koyar. Her bulmacanın tek bir çözümü vardır.',
  howTo: [
    "Noktaların arasına çizgiler çizerek tek bir kapalı yol (çit) yap.",
    "Hücredeki sayı, o karenin kaç kenarında çit olduğunu söyler.",
    "Çit hiçbir yerde ayrılmaz ve kendini kesmez.",
    "Çizgi çizmek için iki nokta arasına dokun. Bir daha dokunursan × (çizgi yok) olur.",
    "0 yazan karelerin etrafına hiç çizgi gelmez. Oradan başlamak kolaydır!",
  ],
  boosters: [
    { id: 'reveal', name: 'Çizgi Aç', icon: '🖍️', uses: 3, description: 'Döngünün doğru bir parçasını (en çok 3 kenar) çizer.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış çizgileri ve yanlış × işaretlerini kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı hamleyi nedeniyle birlikte gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const g = geometry(level.rows, level.cols);
    const { R, C, NE, NV, NC } = g;
    const clues = parseClues(level.puzzle);
    const sol = parseSolution(level.solution);
    const marks = new Int8Array(NE); // 0 boş, 1 çizgi, 2 çarpı
    const locked = new Uint8Array(NE);
    const wrong = new Set();
    let hint = null; // { sets, cells, verts }
    let solved = false;
    const history = [];
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };

    const W = C * S + 2 * M, Hh = R * S + 2 * M;
    const px = (v) => [M + (v % (C + 1)) * S, M + Math.floor(v / (C + 1)) * S];

    container.innerHTML = `
      <div class="slither" style="--cols:${C}">
        <svg class="sl-board" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Çit Çizme tahtası"></svg>
        <div class="sl-tools">
          <button type="button" data-act="undo" title="Geri al (Ctrl+Z)">↶ Geri al</button>
          <button type="button" data-act="clear" title="Tahtayı temizle">🗑 Temizle</button>
        </div>
        <p class="sl-help">Kenara dokun: çizgi → × → boş · Sürükleyerek çizebilirsin · Sağ tık / basılı tut: ×</p>
      </div>`;
    const root = container.querySelector('.slither');
    const svg = root.querySelector('svg');
    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      parent.appendChild(n);
      return n;
    };

    // Katmanlar
    const gCells = el('g', {}, svg), gEdges = el('g', {}, svg), gDots = el('g', {}, svg), gHit = el('g', { class: 'sl-hits' }, svg);
    const cellRects = [], clueTexts = [];
    for (let c = 0; c < NC; c++) {
      const x = M + (c % C) * S, y = M + Math.floor(c / C) * S;
      cellRects.push(el('rect', { x, y, width: S, height: S, class: 'sl-cell' }, gCells));
      if (clues[c] >= 0) {
        const t = el('text', { x: x + S / 2, y: y + S / 2, class: 'sl-clue' }, gCells);
        t.textContent = clues[c];
        clueTexts[c] = t;
      }
    }
    const edgeEls = [];
    for (let e = 0; e < NE; e++) {
      const [x1, y1] = px(g.eA[e]), [x2, y2] = px(g.eB[e]);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, k = 5;
      const grp = el('g', { class: 'sl-edge' }, gEdges);
      el('line', { x1, y1, x2, y2, class: 'sl-glow' }, grp);
      el('line', { x1, y1, x2, y2, class: 'sl-ln' }, grp);
      el('path', { d: `M${mx - k} ${my - k}L${mx + k} ${my + k}M${mx + k} ${my - k}L${mx - k} ${my + k}`, class: 'sl-x' }, grp);
      edgeEls.push(grp);
      // Dokunma alanı: kenarın iki ucu ve iki yanındaki hücre merkezlerinden oluşan eşkenar dörtgen.
      const horiz = y1 === y2;
      const pts = horiz
        ? [[x1, y1], [mx, my - S / 2], [x2, y2], [mx, my + S / 2]]
        : [[x1, y1], [mx + S / 2, my], [x2, y2], [mx - S / 2, my]];
      el('polygon', { points: pts.map((p) => p.join(',')).join(' '), 'data-e': e, class: 'sl-hit' }, gHit);
    }
    const dots = [];
    for (let v = 0; v < NV; v++) {
      const [cx, cy] = px(v);
      dots.push(el('circle', { cx, cy, r: 3.6, class: 'sl-dot' }, gDots));
    }

    // ---------------------------------------------------------- çizim
    const render = () => {
      const hintSet = new Map((hint?.sets ?? []).map(([e, v]) => [e, v]));
      for (let e = 0; e < NE; e++) {
        const m = marks[e];
        let cls = 'sl-edge' + (m === LINE ? ' on' : m === CROSS ? ' off' : '');
        if (locked[e]) cls += ' locked';
        if (wrong.has(e)) cls += ' wrong';
        if (hintSet.has(e)) cls += hintSet.get(e) === LINE ? ' hint-line' : ' hint-cross';
        edgeEls[e].setAttribute('class', cls);
      }
      for (let c = 0; c < NC; c++) {
        let cls = 'sl-cell';
        if (hint?.cells?.includes(c)) cls += ' hinted';
        cellRects[c].setAttribute('class', cls);
        if (!clueTexts[c]) continue;
        let n = 0, open = 0;
        for (const e of g.cEdges[c]) { if (marks[e] === LINE) n++; else if (marks[e] !== CROSS) open++; }
        const k = clues[c];
        clueTexts[c].setAttribute('class', 'sl-clue' + (n > k || n + open < k ? ' bad' : n === k && (k > 0 || !open) ? ' ok' : ''));
      }
      for (let v = 0; v < NV; v++) {
        let d = 0;
        for (const e of g.vEdges[v]) if (marks[e] === LINE) d++;
        dots[v].setAttribute('class', 'sl-dot' + (d > 2 ? ' bad' : '') + (hint?.verts?.includes(v) ? ' hinted' : ''));
      }
      if (solved) {
        // Döngünün içini boya (soldan sayılan çizgi sayısı tekse içeride).
        for (let r = 0; r < R; r++) {
          let inside = false;
          for (let c = 0; c < C; c++) {
            if (marks[g.V(r, c)] === LINE) inside = !inside;
            if (inside) cellRects[r * C + c].classList.add('inside');
          }
        }
      }
      root.classList.toggle('solved', solved);
    };

    const checkSolved = () => {
      if (solved) return;
      for (let e = 0; e < NE; e++) if ((marks[e] === LINE) !== (sol[e] === 1)) return;
      solved = true;
      hint = null;
      wrong.clear();
      for (let e = 0; e < NE; e++) if (marks[e] === CROSS) marks[e] = 0;
      render();
      later(() => ctx.onSolved(), 450);
    };

    // ---------------------------------------------------------- düzenleme
    let stroke = null; // aktif işlem grubu (geri alma için)
    const beginStroke = () => { stroke = []; };
    const endStroke = () => {
      if (stroke?.length) history.push(stroke);
      stroke = null;
      checkSolved();
    };
    const setMark = (e, val) => {
      if (solved || locked[e] || marks[e] === val) return;
      (stroke ?? []).push([e, marks[e]]);
      marks[e] = val;
      wrong.delete(e);
      hint = null;
    };
    const cycle = (m) => (m === 0 ? LINE : m === LINE ? CROSS : 0);

    let drag = null, pressTimer = null;
    const edgeAt = (x, y) => {
      const t = document.elementFromPoint(x, y);
      return t && t.dataset && t.dataset.e !== undefined && svg.contains(t) ? Number(t.dataset.e) : -1;
    };
    const onDown = (ev) => {
      const t = ev.target;
      if (solved || !t.dataset || t.dataset.e === undefined) return;
      ev.preventDefault();
      const e = Number(t.dataset.e);
      if (ev.button === 2) {
        beginStroke(); setMark(e, marks[e] === CROSS ? 0 : CROSS); endStroke(); render();
        return;
      }
      if (ev.button !== 0) return;
      drag = { start: e, target: cycle(marks[e]), moved: false, done: new Set([e]) };
      clearTimeout(pressTimer);
      if (ev.pointerType !== 'mouse') {
        pressTimer = setTimeout(() => {
          if (!drag || drag.moved) return;
          beginStroke(); setMark(drag.start, marks[drag.start] === CROSS ? 0 : CROSS); endStroke(); render();
          if (navigator.vibrate) navigator.vibrate(15);
          drag = null;
        }, 450);
      }
    };
    const onMove = (ev) => {
      if (!drag) return;
      const e = edgeAt(ev.clientX, ev.clientY);
      if (e < 0 || drag.done.has(e)) return;
      if (!drag.moved) {
        drag.moved = true;
        clearTimeout(pressTimer);
        beginStroke();
        setMark(drag.start, drag.target);
      }
      drag.done.add(e);
      setMark(e, drag.target);
      render();
    };
    const onUp = () => {
      clearTimeout(pressTimer);
      if (!drag) return;
      if (!drag.moved) { beginStroke(); setMark(drag.start, drag.target); }
      drag = null;
      endStroke();
      render();
    };
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('contextmenu', (ev) => ev.preventDefault());
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const undo = () => {
      if (solved) return;
      const last = history.pop();
      if (!last) return ctx.toast('Geri alınacak hamle yok.');
      for (let i = last.length - 1; i >= 0; i--) if (!locked[last[i][0]]) marks[last[i][0]] = last[i][1];
      wrong.clear();
      hint = null;
      render();
    };
    root.querySelector('.sl-tools').addEventListener('click', (ev) => {
      const act = ev.target.closest('button')?.dataset.act;
      if (act === 'undo') undo();
      else if (act === 'clear' && !solved) {
        beginStroke();
        for (let e = 0; e < NE; e++) if (marks[e]) setMark(e, 0);
        endStroke();
        wrong.clear();
        render();
      }
    });
    const onKey = (ev) => {
      if (ev.target.closest?.('input, textarea') || document.querySelector('.modal')) return;
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'z' || ev.key === 'Z')) { ev.preventDefault(); undo(); }
    };
    document.addEventListener('keydown', onKey);

    // ---------------------------------------------------------- boosterlar
    const boosters = {
      reveal() {
        const missing = [];
        for (let e = 0; e < NE; e++) if (sol[e] && marks[e] !== LINE) missing.push(e);
        if (!missing.length) return { ok: false, message: 'Doğru çizgilerin hepsi zaten çizili; fazlalıkları Hata Bul ile bulabilirsin. (hak harcanmadı)' };
        // Var olan doğru çizgilere bitişik bir eksik parçayı tercih et.
        const touches = (e) => [g.eA[e], g.eB[e]].some((v) => g.vEdges[v].some((x) => x !== e && sol[x] && marks[x] === LINE));
        const near = missing.filter(touches);
        const pool = near.length ? near : missing;
        const first = pool[Math.floor(Math.random() * pool.length)];
        // Döngü boyunca iki yöne yürüyerek en çok 3 eksik kenar aç.
        const opened = [first];
        for (const start of [g.eA[first], g.eB[first]]) {
          let prev = first, v = start;
          while (opened.length < 3) {
            const next = g.vEdges[v].find((x) => x !== prev && sol[x]);
            if (next === undefined || marks[next] === LINE || opened.includes(next)) break;
            opened.push(next);
            prev = next;
            v = g.eA[next] === v ? g.eB[next] : g.eA[next];
          }
        }
        beginStroke();
        for (const e of opened) { setMark(e, LINE); locked[e] = 1; }
        stroke = null; // açılan çizgiler geri alınamaz
        hint = { sets: [], cells: [], verts: [] };
        render();
        for (const e of opened) edgeEls[e].classList.add('flash');
        later(() => opened.forEach((e) => edgeEls[e].classList.remove('flash')), 1600);
        checkSolved();
        return { ok: true, message: `${opened.length} doğru çizgi parçası açıldı (yeşil).` };
      },
      check() {
        wrong.clear();
        for (let e = 0; e < NE; e++) {
          if ((marks[e] === LINE && !sol[e]) || (marks[e] === CROSS && sol[e])) wrong.add(e);
        }
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} hatalı işaret kırmızıyla gösterildi.` };
      },
      hint() {
        const correct = new Int8Array(NE);
        let hasWrong = false;
        for (let e = 0; e < NE; e++) {
          if (marks[e] === LINE) { if (sol[e]) correct[e] = LINE; else hasWrong = true; }
          else if (marks[e] === CROSS) { if (!sol[e]) correct[e] = CROSS; else hasWrong = true; }
        }
        const step = nextStep(level, correct);
        if (!step) return { ok: false, message: 'Şu an gösterilecek bir ipucu bulunamadı. (hak harcanmadı)' };
        hint = step;
        render();
        const what = step.sets.length === 1 ? (step.sets[0][1] === LINE ? ' Sarı kenar çizgi olmalı.' : ' Sarı × ile gösterilen kenar boş olmalı.') : '';
        return { ok: true, message: step.text + what + (hasWrong ? ' (Not: tahtada hatalı işaretler var.)' : '') };
      },
    };

    render();
    return {
      useBooster: (id) => (solved ? { ok: false } : boosters[id]?.() ?? { ok: false }),
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        clearTimeout(pressTimer);
        timers.forEach(clearTimeout);
      },
    };
  },
};
