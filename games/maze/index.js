import {
  DIRS, parsePuzzle, isOpen, stepCell, dirBetween, solutionWalk, bfsDist, deadBranches,
} from './logic.js';

function ensureStyles() {
  if (document.getElementById('maze-css')) return;
  const link = document.createElement('link');
  link.id = 'maze-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const SVGNS = 'http://www.w3.org/2000/svg';

// Her level başka bir kahraman ve ödül.
const THEMES = [
  { c: '🐭', g: '🧀', line: 'Minik fareyi peynire götür!' },
  { c: '🐰', g: '🥕', line: 'Tavşanı havuca götür!' },
  { c: '🐶', g: '🦴', line: 'Köpeği kemiğe götür!' },
  { c: '🐱', g: '🐟', line: 'Kediyi balığa götür!' },
  { c: '🐝', g: '🌻', line: 'Arıyı çiçeğe götür!' },
  { c: '🐼', g: '🎋', line: 'Pandayı bambuya götür!' },
  { c: '🐵', g: '🍌', line: 'Maymunu muza götür!' },
  { c: '🦔', g: '🍎', line: 'Kirpiyi elmaya götür!' },
  { c: '🐻', g: '🍯', line: 'Ayıyı bal kavanozuna götür!' },
  { c: '🐔', g: '🌽', line: 'Tavuğu mısıra götür!' },
  { c: '🐢', g: '🍓', line: 'Kaplumbağayı çileğe götür!' },
  { c: '🦊', g: '🍇', line: 'Tilkiyi üzüme götür!' },
];

const DIR_TXT = ['sağa (→)', 'aşağı (↓)', 'sola (←)', 'yukarı (↑)'];
const DIR_SIDE = ['sağdaki', 'aşağıdaki', 'soldaki', 'yukarıdaki'];
const KEYMAP = { ArrowRight: 0, ArrowDown: 1, ArrowLeft: 2, ArrowUp: 3, d: 0, s: 1, a: 2, w: 3, D: 0, S: 1, A: 2, W: 3 };

export default {
  id: 'maze',
  name: 'Labirent',
  icon: '🌀',
  description: 'Sevimli kahramanı labirentte doğru yoldan hedefine ulaştır.',
  rules: 'Kahramanı başladığı yerden hedefe götür. Duvarların içinden geçemezsin. Her labirentte başlangıçtan hedefe giden tek bir doğru yol vardır; diğer yollar çıkmaz sokaktır. Zor levellerde bazen önce 🔑 anahtarı alıp sonra 🚪 kapıya gitmen gerekir.',
  howTo: [
    'Kahramanın 🐭 labirentte bir yerde bekliyor. Onu ödülüne 🧀 götür!',
    'Parmağınla (ya da fareyle) kahramanı sürükleyerek yol çiz. Ok tuşları ve ekrandaki ok düğmeleri de olur.',
    'Duvarların içinden geçemezsin. Çıkmaz sokağa girersen geri dön: geri gittiğin yol silinir.',
    'Bazı levellerde kapı 🚪 kilitlidir. Önce anahtarı 🔑 alman gerekir.',
    'Takılırsan boosterlar sana yolu, çıkmaz sokakları ve akıllı stratejileri gösterir.',
  ],
  boosters: [
    { id: 'path', name: 'Yol Göster', icon: '👣', uses: 3, description: 'Doğru yolun sıradaki birkaç adımını altın renkli izlerle gösterir.' },
    { id: 'dead', name: 'Çıkmaz Sokaklar', icon: '🚧', uses: 2, description: 'Yakınındaki çıkmaz sokakları gölgeler; oralara girmene gerek yok.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Önündeki kavşakta hangi yöne gitmen gerektiğini ve nedenini bir stratejiyle anlatır.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const M = parsePuzzle(level.puzzle);
    const { w, h, start, goal, key } = M;
    const W = solutionWalk(M, level.solution); // doğru yürüyüş (anahtar varsa ondan geçer)
    const kIdx = key >= 0 ? W.indexOf(key) : -1;
    const theme = THEMES[(level.theme ?? 0) % THEMES.length];
    const goalIcon = key >= 0 ? '🚪' : theme.g;
    const big = Math.max(w, h);
    const tier = big <= 9 ? 0 : big <= 15 ? 1 : 2;
    const wallPx = [4, 3, 2.5][tier];
    const revealN = [6, 8, 10][tier];
    const deadN = [3, 4, 5][tier];

    // ---- durum ----
    let path = [start]; // geçerli aşamanın yolu
    let frozen = null; // anahtar alındıysa birinci aşamanın yolu
    let hasKey = false;
    let solved = false;
    let steps = 0;
    let solveTimer = 0;
    const shaded = new Uint8Array(M.n); // Çıkmaz Sokaklar ile gölgelenenler
    const revealed = new Set(); // Yol Göster: W indeksleri
    let temp = null; // Akıllı İpucu işaretleri: { rings:[], arrow:{cell,dir}, region:[], clearFrom }
    let strategyTurn = 0;

    container.innerHTML = `
      <div class="maze">
        <p class="mz-task"><span class="mz-hero">${theme.c}</span> ${key >= 0 ? 'Önce 🔑 anahtarı al, sonra 🚪 kapıya git!' : theme.line}</p>
        <svg class="mz-board" viewBox="-0.2 -0.2 ${w + 0.4} ${h + 0.4}" style="aspect-ratio:${(w + 0.4) / (h + 0.4)}" role="img" aria-label="Labirent tahtası"></svg>
        <p class="mz-status" aria-live="polite"></p>
        <div class="mz-controls">
          <div class="mz-pad">
            <button type="button" class="mz-up" data-dir="3" aria-label="Yukarı">▲</button>
            <button type="button" class="mz-left" data-dir="2" aria-label="Sola">◀</button>
            <button type="button" class="mz-right" data-dir="0" aria-label="Sağa">▶</button>
            <button type="button" class="mz-down" data-dir="1" aria-label="Aşağı">▼</button>
          </div>
          <div class="mz-tools">
            <button type="button" data-act="back" title="Bir adım geri (Backspace)">↶ Bir Adım Geri</button>
            <button type="button" data-act="reset" title="Yolu sil, baştan başla">⟲ Baştan Başla</button>
          </div>
        </div>
        <p class="mz-help">Kahramanı sürükle ya da ok tuşlarını kullan. Geri gidersen yol silinir; yolunda bir kareye dokunursan oraya geri dönersin.</p>
      </div>`;
    const root = container.querySelector('.maze');
    const svg = root.querySelector('svg');
    const statusEl = root.querySelector('.mz-status');
    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(SVGNS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    };
    const rc = (i) => [Math.floor(i / w), i % w];
    const cx = (i) => (i % w) + 0.5;
    const cy = (i) => Math.floor(i / w) + 0.5;
    const pts = (cells) => cells.map((i) => `${cx(i)},${cy(i)}`).join(' ');

    // ---- statik katmanlar ----
    el('rect', { class: 'mz-floor', x: 0, y: 0, width: w, height: h }, svg);
    const gDead = el('g', { class: 'mz-dead' }, svg);
    const gRegion = el('g', { class: 'mz-region' }, svg);
    const gEnds = el('g', {}, svg);
    el('rect', { class: 'mz-startcell', x: start % w + 0.08, y: Math.floor(start / w) + 0.08, width: 0.84, height: 0.84, rx: 0.18 }, gEnds);
    el('rect', { class: 'mz-goalcell', x: goal % w + 0.08, y: Math.floor(goal / w) + 0.08, width: 0.84, height: 0.84, rx: 0.18 }, gEnds);
    const gReveal = el('g', { class: 'mz-reveal' }, svg);
    const frozenLine = el('polyline', { class: 'mz-path frozen', points: '' }, svg);
    const pathLine = el('polyline', { class: 'mz-path', points: '' }, svg);

    // Duvarlar: tek bir path
    let d = `M0 0H${w}V${h}H0Z`;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const i = r * w + c;
        if (c < w - 1 && !(M.cells[i] & 1)) d += `M${c + 1} ${r}V${r + 1}`;
        if (r < h - 1 && !(M.cells[i] & 2)) d += `M${c} ${r + 1}H${c + 1}`;
      }
    }
    el('path', { class: 'mz-walls', d, 'stroke-width': wallPx }, svg);

    const gHint = el('g', { class: 'mz-hint' }, svg);
    const emoji = (txt, i, size, cls) => {
      const t = el('text', { class: cls, x: cx(i), y: cy(i), 'font-size': size }, svg);
      t.textContent = txt;
      return t;
    };
    const goalEl = emoji(goalIcon, goal, 0.72, 'mz-emoji mz-goal');
    const keyEl = key >= 0 ? emoji('🔑', key, 0.66, 'mz-emoji mz-key') : null;
    const hero = el('g', { class: 'mz-heroG' }, svg);
    const heroInner = el('g', { class: 'mz-heroIn' }, hero);
    const heroText = el('text', { class: 'mz-emoji', x: 0, y: 0, 'font-size': 0.8 }, heroInner);
    heroText.textContent = theme.c;

    const head = () => path[path.length - 1];

    // ---- ilerleme: oyuncunun yolu, doğru yürüyüşün en uzak hangi noktasına kadar uyuyor? ----
    const progress = () => {
      const base = hasKey ? kIdx : 0;
      const end = key >= 0 && !hasKey ? kIdx : W.length - 1;
      let p = 0;
      while (p + 1 < path.length && base + p + 1 <= end && path[p + 1] === W[base + p + 1]) p++;
      return { g: base + p, p, off: path.length - 1 > p, end };
    };

    // ---- çizim ----
    const render = () => {
      pathLine.setAttribute('points', pts(path));
      frozenLine.setAttribute('points', frozen ? pts(frozen) : '');
      const hc = head();
      hero.style.transform = `translate(${cx(hc)}px, ${cy(hc)}px)`;
      if (keyEl) keyEl.style.display = hasKey ? 'none' : '';
      goalEl.classList.toggle('locked', key >= 0 && !hasKey);

      gDead.replaceChildren();
      for (let i = 0; i < M.n; i++) {
        if (!shaded[i]) continue;
        const [r, c] = rc(i);
        el('rect', { x: c, y: r, width: 1, height: 1 }, gDead);
      }
      gReveal.replaceChildren();
      const idx = [...revealed].sort((a, b) => a - b);
      for (let s = 0; s < idx.length;) {
        let e = s;
        while (e + 1 < idx.length && idx[e + 1] === idx[e] + 1) e++;
        const seg = W.slice(Math.max(0, idx[s] - 1), idx[e] + 1);
        el('polyline', { class: 'mz-revline', points: pts(seg) }, gReveal);
        for (let k = s; k <= e; k++) el('circle', { class: 'mz-step', cx: cx(W[idx[k]]), cy: cy(W[idx[k]]), r: 0.12 }, gReveal);
        s = e + 1;
      }
      gRegion.replaceChildren();
      gHint.replaceChildren();
      if (temp) {
        for (const i of temp.region ?? []) {
          const [r, c] = rc(i);
          el('rect', { x: c, y: r, width: 1, height: 1 }, gRegion);
        }
        for (const i of temp.rings ?? []) {
          const [r, c] = rc(i);
          el('rect', { class: 'mz-ring', x: c + 0.06, y: r + 0.06, width: 0.88, height: 0.88, rx: 0.2 }, gHint);
        }
        if (temp.arrow) {
          const { cell, dir } = temp.arrow;
          const x = cx(cell), y = cy(cell);
          const ang = [0, 90, 180, 270][dir];
          const g = el('g', { transform: `translate(${x} ${y}) rotate(${ang})` }, gHint);
          el('path', { class: 'mz-arrow', d: 'M0.12 -0.24L0.95 0L0.12 0.24Z' }, g);
        }
      }
      root.classList.toggle('solved', solved);
      let st = `👣 ${steps} adım`;
      if (key >= 0) st += hasKey ? ' · 🔑 Anahtar sende!' : ' · 🔑 Anahtarı bul';
      statusEl.textContent = st;
    };

    const bump = (dir) => {
      heroInner.classList.remove('bump0', 'bump1', 'bump2', 'bump3');
      void heroInner.getBBox?.();
      heroInner.classList.add(`bump${dir}`);
      setTimeout(() => heroInner.classList.remove(`bump${dir}`), 220);
    };

    const checkTempClear = (prevHead) => {
      if (temp?.clearFrom !== undefined && prevHead === temp.clearFrom) temp = null;
    };

    const finish = () => {
      solved = true;
      temp = null;
      render();
      ctx.showHint(`Harika! ${theme.c} hedefe ulaştı! ${key >= 0 ? '🚪' : theme.g}`);
      solveTimer = setTimeout(ctx.onSolved, 650);
    };

    /** Komşu bir kareye gitmeyi dener (geri adım siler). true → hareket oldu. */
    const moveTo = (cell, quiet = false) => {
      if (solved) return false;
      const hc = head();
      const dir = dirBetween(M, hc, cell);
      if (dir < 0) return false;
      if (!isOpen(M, hc, dir)) { if (!quiet) bump(dir); return false; }
      if (path.length >= 2 && cell === path[path.length - 2]) {
        path.pop();
        steps++;
        checkTempClear(hc);
        render();
        return true;
      }
      if (cell === goal && key >= 0 && !hasKey) {
        bump(dir);
        ctx.toast('Kapı kilitli! 🚪 Önce 🔑 anahtarı bulmalısın.');
        return false;
      }
      path.push(cell);
      steps++;
      checkTempClear(hc);
      if (cell === key && !hasKey) {
        hasKey = true;
        frozen = path.slice();
        path = [key];
        temp = null;
        ctx.toast('Anahtarı aldın! 🔑 Şimdi kapıya 🚪 git.');
      }
      if (cell === goal) { finish(); return true; }
      render();
      return true;
    };
    const moveDir = (dir) => {
      const hc = head();
      const [r, c] = rc(hc);
      const nr = r + DIRS[dir].dr, nc = c + DIRS[dir].dc;
      if (nr < 0 || nc < 0 || nr >= h || nc >= w) { bump(dir); return false; }
      return moveTo(stepCell(M, hc, dir));
    };
    const truncateTo = (idx) => {
      if (idx < 0 || idx >= path.length - 1) return;
      const hc = head();
      steps += path.length - 1 - idx;
      path = path.slice(0, idx + 1);
      checkTempClear(hc);
      render();
    };

    // ---- işaretçi (fare + dokunmatik) ----
    const toSvg = (ev) => {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };
    const cellAt = (p) => {
      const c = Math.floor(p.x), r = Math.floor(p.y);
      return r >= 0 && c >= 0 && r < h && c < w ? r * w + c : -1;
    };
    let drag = null; // { id, last:{x,y}, cell, downIdx, moved }

    const visit = (cell) => {
      if (cell < 0 || cell === head()) return;
      const idx = path.indexOf(cell);
      if (idx >= 0) { truncateTo(idx); return; }
      moveTo(cell, true);
    };
    const onDown = (ev) => {
      if (solved || drag) return;
      if (ev.button !== undefined && ev.button > 0) return;
      const p = toSvg(ev);
      const cell = cellAt(p);
      if (cell < 0) return;
      const idx = path.indexOf(cell);
      const adjacent = dirBetween(M, head(), cell) >= 0;
      if (idx < 0 && !adjacent) {
        ctx.toast(`Yolu ${theme.c} kahramanından başlayarak çiz.`);
        return;
      }
      ev.preventDefault();
      try { svg.setPointerCapture(ev.pointerId); } catch { /* yok say */ }
      drag = { id: ev.pointerId, last: p, cell, downIdx: idx, moved: false };
      if (idx < 0) { moveTo(cell); drag.moved = true; }
    };
    const onMove = (ev) => {
      if (!drag || ev.pointerId !== drag.id) return;
      const p = toSvg(ev);
      const dx = p.x - drag.last.x, dy = p.y - drag.last.y;
      const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.2));
      for (let k = 1; k <= n; k++) {
        const cell = cellAt({ x: drag.last.x + (dx * k) / n, y: drag.last.y + (dy * k) / n });
        if (cell === drag.cell || cell < 0) continue;
        drag.cell = cell;
        drag.moved = true;
        visit(cell);
        if (solved) break;
      }
      drag.last = p;
    };
    const onUp = (ev) => {
      if (!drag || ev.pointerId !== drag.id) return;
      const d0 = drag;
      drag = null;
      if (!d0.moved && d0.downIdx >= 0) truncateTo(d0.downIdx); // yoldaki kareye dokun → oraya dön
    };
    const onCancel = () => { drag = null; };
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onCancel);

    // ---- yön düğmeleri (basılı tutunca tekrar eder) ----
    let repeatT = 0, repeatI = 0;
    const stopRepeat = () => { clearTimeout(repeatT); clearInterval(repeatI); };
    const pad = root.querySelector('.mz-pad');
    pad.addEventListener('pointerdown', (ev) => {
      const b = ev.target.closest('button');
      if (!b || solved) return;
      ev.preventDefault();
      const dir = Number(b.dataset.dir);
      stopRepeat();
      moveDir(dir);
      repeatT = setTimeout(() => { repeatI = setInterval(() => { if (!moveDir(dir)) stopRepeat(); }, 110); }, 320);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((t) => pad.addEventListener(t, stopRepeat));
    pad.addEventListener('click', (ev) => { // klavye ile (Enter/Boşluk) basma
      const b = ev.target.closest('button');
      if (b && ev.detail === 0) moveDir(Number(b.dataset.dir));
    });
    pad.addEventListener('contextmenu', (ev) => ev.preventDefault());

    const stepBack = () => {
      if (solved) return;
      if (path.length < 2) { ctx.toast(hasKey ? 'Anahtarı aldığın yerdesin.' : 'Zaten başlangıçtasın.'); return; }
      moveTo(path[path.length - 2]);
    };
    root.querySelector('.mz-tools').addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b || solved) return;
      if (b.dataset.act === 'back') stepBack();
      else if (b.dataset.act === 'reset') {
        if (path.length < 2 && !hasKey) return;
        path = [start];
        frozen = null;
        hasKey = false;
        temp = null;
        render();
      }
    });

    // ---- klavye ----
    const onKey = (ev) => {
      if (ev.target.closest?.('input, textarea') || document.querySelector('.modal') || solved) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (ev.key === 'Backspace') { ev.preventDefault(); stepBack(); return; }
      const dir = KEYMAP[ev.key];
      if (dir === undefined) return;
      ev.preventDefault();
      moveDir(dir);
    };
    document.addEventListener('keydown', onKey);

    // ---- yardımcılar (boosterlar) ----
    /** from'dan başlayıp block'tan geçmeden ulaşılan bölge */
    const regionFrom = (from, block) => {
      const seen = new Set([block, from]);
      const out = [from];
      for (let q = 0; q < out.length; q++) {
        for (const y of M.adj[out[q]]) if (!seen.has(y)) { seen.add(y); out.push(y); }
      }
      return out;
    };
    // Hedefin -e ve -den halleri (anahtar / kapı / ödül)
    const tDat = () => (key >= 0 && !hasKey ? 'anahtara 🔑' : key >= 0 ? 'kapıya 🚪' : `hedefe ${theme.g}`);
    const tAbl = () => (key >= 0 && !hasKey ? 'anahtardan 🔑' : key >= 0 ? 'kapıdan 🚪' : `hedeften ${theme.g}`);
    const targetCell = () => (key >= 0 && !hasKey ? key : goal);
    const describeWrong = (J, o) => {
      const reg = regionFrom(o, J);
      const side = DIR_SIDE[dirBetween(M, J, o)];
      if (key >= 0 && !hasKey && reg.includes(goal)) return { reg, door: true, txt: `${side} yol kapıya 🚪 gidiyor ama kapı hâlâ kilitli` };
      const len = Math.max(...bfsDistFrom(o, J)) + 1;
      if (reg.length === 1) return { reg, txt: `${side} yol hemen duvara çarpıyor` };
      if (reg.length === len) return { reg, txt: `${side} yol ${len} kare sonra çıkmaz sokakla bitiyor` };
      return { reg, txt: `${side} yol dallanıp ${reg.length} karelik bir bölgeye gidiyor ama oradaki bütün dallar çıkmaz sokak` };
    };
    // J'den geçmeden o'dan en uzak mesafe
    const bfsDistFrom = (o, J) => {
      const dist = new Map([[o, 0]]);
      const q = [o];
      for (let i = 0; i < q.length; i++) {
        for (const y of M.adj[q[i]]) if (y !== J && !dist.has(y)) { dist.set(y, dist.get(q[i]) + 1); q.push(y); }
      }
      return [...dist.values()];
    };
    const listTxt = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} ve ${arr[arr.length - 1]}`);

    const boosters = {
      path() {
        const { g, off, p } = progress();
        let i = g + 1;
        while (revealed.has(i)) i++;
        if (i >= W.length) return { ok: false, message: 'Gösterilecek yeni adım kalmadı; altın izleri takip et! (hak harcanmadı)' };
        const to = Math.min(W.length - 1, i + revealN - 1);
        for (let k = i; k <= to; k++) revealed.add(k);
        temp = off ? { rings: [path[p]], clearFrom: path[p] } : null;
        render();
        const n = to - i + 1;
        if (off) return { ok: true, message: `Dikkat: yolun işaretli kareden sonra yanlış yöne sapıyor. Oraya geri dön; doğru yolun sonraki ${n} adımı altın izlerle gösterildi.` };
        return { ok: true, message: `Doğru yolun sonraki ${n} adımı altın izlerle gösterildi. İzleri takip et! 👣` };
      },
      dead() {
        const { branches, comp } = deadBranches(M, W);
        const dist = bfsDist(M, head());
        const cand = branches
          .map((b, id) => ({ id, b, d: Math.min(...b.cells.map((x) => dist[x])) }))
          .filter((x) => x.b.cells.some((c) => !shaded[c]));
        if (!cand.length) return { ok: false, message: 'Bütün çıkmaz sokaklar zaten gölgeli. (hak harcanmadı)' };
        cand.sort((a, b) => a.d - b.d || b.b.cells.length - a.b.cells.length);
        const pick = cand.slice(0, deadN);
        let cells = 0;
        for (const x of pick) for (const c of x.b.cells) if (!shaded[c]) { shaded[c] = 1; cells++; }
        const inside = comp[head()] >= 0;
        temp = null;
        render();
        let msg = `Yakınındaki ${pick.length} çıkmaz sokak gölgelendi (${cells} kare). Gölgeli yerlere girmene gerek yok!`;
        if (inside) msg = `Dikkat: şu an bir çıkmaz sokaktasın! Geri dön. ${msg}`;
        return { ok: true, message: msg };
      },
      hint() {
        const { g, p, off, end } = progress();
                // 1) Oyuncu yanlış koldaysa: kavşağa geri dön.
        if (off) {
          const J = path[p];
          const wrongFirst = path[p + 1];
          const w1 = describeWrong(J, wrongFirst);
          const good = dirBetween(M, J, W[g + 1]);
          temp = { rings: [J], arrow: { cell: J, dir: good }, region: w1.reg, clearFrom: J };
          render();
          return {
            ok: true,
            message: `Şu an yanlış koldasın. 🧐 İşaretli kavşaktan sonra girdiğin ${w1.txt}. Kavşağa geri dön ve ${DIR_TXT[good]} git. ${w1.door ? 'Unutma: kapıyı açmak için önce anahtarı almalısın!' : `Strateji — Çıkmaz sokakları ele: sonu duvarla biten bir yol seni ${tDat()} götüremez, oraya bir daha girme!`}`,
          };
        }
        // 2) Doğru yoldaysa: sıradaki kavşağı bul.
        let J = -1, ji = -1;
        for (let i = g; i < end; i++) {
          const from = i > 0 ? W[i - 1] : -1;
          const opts = M.adj[W[i]].filter((y) => y !== from);
          if (opts.length >= 2) { J = W[i]; ji = i; break; }
        }
        if (J < 0) {
          const hc = head();
          temp = { rings: [targetCell()], arrow: { cell: hc, dir: dirBetween(M, hc, W[g + 1]) }, clearFrom: hc };
          render();
          return { ok: true, message: `Önünde hiç kavşak yok! Koridoru takip edersen doğrudan ${tDat()} varırsın. Şimdi ${DIR_TXT[dirBetween(M, hc, W[g + 1])]} ilerle.` };
        }
        const from = ji > 0 ? W[ji - 1] : -1;
        const good = dirBetween(M, J, W[ji + 1]);
        const wrongs = M.adj[J].filter((y) => y !== from && y !== W[ji + 1]).map((o) => describeWrong(J, o));
        const region = wrongs.flatMap((x) => x.reg);
        temp = { rings: [J, targetCell()], arrow: { cell: J, dir: good }, region, clearFrom: J };
        render();
        const pre = ji > g ? 'Önce koridoru izleyerek işaretli kavşağa gel. ' : 'Tam bir kavşaktasın! ';
        const useBack = strategyTurn++ % 2 === 1;
        if (useBack) {
          return {
            ok: true,
            message: `${pre}Strateji — Hedeften geriye doğru düşün: ${tAbl()} başlayıp geriye doğru yürürsen tek bir yol bu kavşağa ulaşır ve kavşağa ${DIR_SIDE[good]} taraftan girer. O hâlde kavşakta ${DIR_TXT[good]} gitmelisin. Diğer seçenekler: ${listTxt(wrongs.map((x) => x.txt))}.`,
          };
        }
        return {
          ok: true,
          message: `${pre}Strateji — Çıkmaz sokakları ele: ${listTxt(wrongs.map((x) => x.txt))} (turuncu bölge). Geriye tek seçenek kalıyor: ${DIR_TXT[good]} git!`,
        };
      },
    };

    render();
    return {
      useBooster: (id) => (solved ? { ok: false } : boosters[id]?.() ?? { ok: false }),
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        clearTimeout(solveTimer);
        stopRepeat();
      },
    };
  },
};
