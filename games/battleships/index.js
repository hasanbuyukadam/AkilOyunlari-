import { parseLevel, shapesOf, nextStep, SHIP_HINTS, UNKNOWN, SHIP, WATER } from './logic.js';

function ensureStyles() {
  if (document.getElementById('battleships-css')) return;
  const link = document.createElement('link');
  link.id = 'battleships-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const LONG_PRESS_MS = 450;

export default {
  id: 'battleships',
  name: 'Amiral Battı Bulmacası',
  icon: '🚢',
  description: 'Satır ve sütun sayılarından gizli filoyu bul.',
  rules: 'Filodaki tüm gemileri ızgaraya yerleştir. Satır ve sütunların yanındaki sayılar o hatta kaç gemi hücresi olduğunu gösterir. Gemiler düzdür (yatay ya da dikey) ve birbirine değmez — çapraz bile. Bazı hücreler ipucu olarak açıktır. Dokun: boş → gemi → su; uzun bas ya da sağ tık: su. Her bulmacanın tek çözümü vardır ve tahmin gerektirmez.',
  howTo: [
    "Gizli gemileri bulacaksın. Hangi gemilerin olduğu filo listesinde yazıyor.",
    "Kenardaki sayılar o satırda ya da sütunda kaç gemi parçası olduğunu söyler.",
    "Gemiler düzdür ve birbirine değemez, çapraz bile!",
    "Kareye dokun: önce gemi, sonra su, sonra temizle.",
    "Açık gelen ipucu kareleri gemilerin nerede olduğunu gösterir.",
  ],
  boosters: [
    { id: 'reveal', name: 'Hücre Aç', icon: '🔍', uses: 3, description: 'Doğru bir hücreyi (öncelikle gemi hücresini) biçimiyle birlikte açar.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış işaretlediğin gemi ve su hücrelerini kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı çıkarımı nedeniyle birlikte gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const P = parseLevel(level);
    const { n, N, rows, cols, fleet } = P;
    const solution = P.solution;
    const trueShapes = shapesOf(n, solution);
    const hints = P.hints.slice(); // verilen + booster ile açılan hücreler
    const given = P.hints.map((h) => h !== '.');
    const locked = given.slice();
    const values = hints.map((h) => (h === '.' ? UNKNOWN : h === '~' ? WATER : SHIP));
    const wrong = new Set();
    let hintCells = new Map(); // hücre → beklenen değer (Akıllı İpucu vurgusu)
    let cursor = -1; // klavye imleci
    let solved = false;

    const R = (i) => Math.floor(i / n), C = (i) => i % n;
    const at = (r, c) => (r < 0 || c < 0 || r >= n || c >= n ? -1 : r * n + c);

    container.innerHTML = `
      <div class="bs" style="--n:${n}">
        <div class="bs-grid" role="grid" aria-label="Amiral Battı tahtası">
          <div class="bs-corner"></div>
          ${cols.map((v, c) => `<div class="bs-count bs-col" data-col="${c}">${v}</div>`).join('')}
          ${rows.map((v, r) => `<div class="bs-count bs-row" data-row="${r}">${v}</div>${
            Array.from({ length: n }, (_, c) => `<button class="bs-cell" data-c="${r * n + c}" role="gridcell" aria-label="${r + 1}. satır ${c + 1}. sütun"><span></span></button>`).join('')}`).join('')}
        </div>
        <div class="bs-fleet" aria-label="Filo"></div>
        <p class="bs-help">Dokun: boş → gemi → su · Uzun bas / sağ tık: su · Sürükleyerek boya</p>
      </div>`;
    const root = container.querySelector('.bs');
    const grid = root.querySelector('.bs-grid');
    const cells = [...root.querySelectorAll('.bs-cell')];
    const rowEls = [...root.querySelectorAll('.bs-row')];
    const colEls = [...root.querySelectorAll('.bs-col')];
    const fleetEl = root.querySelector('.bs-fleet');

    const isShip = (i) => i >= 0 && values[i] === SHIP;

    /** Komşu hücre "kapalı" mı (kenar, su ya da sayısı dolmuş satır/sütun)? */
    const rowShips = () => rows.map((_, r) => values.slice(r * n, r * n + n).filter((v) => v === SHIP).length);
    const colShips = () => cols.map((_, c) => values.filter((v, i) => C(i) === c && v === SHIP).length);

    const render = () => {
      const rs = rowShips(), cs = colShips();
      const closed = (i) => i < 0 || values[i] === WATER || (values[i] !== SHIP && (rs[R(i)] >= rows[R(i)] || cs[C(i)] >= cols[C(i)]));
      cells.forEach((el, i) => {
        const v = values[i];
        let cls = 'bs-cell';
        if (given[i]) cls += ' given';
        else if (locked[i]) cls += ' revealed';
        if (v === WATER) cls += ' water';
        if (v === SHIP) {
          cls += ' ship';
          let shape;
          if (locked[i] && SHIP_HINTS.includes(hints[i])) shape = hints[i];
          else {
            const r = R(i), c = C(i);
            const Lf = at(r, c - 1), Rt = at(r, c + 1), Up = at(r - 1, c), Dn = at(r + 1, c);
            const l = isShip(Lf), rr = isShip(Rt), u = isShip(Up), d = isShip(Dn);
            if ((l && rr) || (u && d) || ((l || rr) && (u || d))) shape = 'm';
            else if (rr) shape = closed(Lf) ? 'l' : 'm';
            else if (l) shape = closed(Rt) ? 'r' : 'm';
            else if (d) shape = closed(Up) ? 't' : 'm';
            else if (u) shape = closed(Dn) ? 'b' : 'm';
            else shape = [Lf, Rt, Up, Dn].every(closed) ? 'o' : 'm';
          }
          cls += ` s-${shape}`;
          if (shape === 'm') {
            const r = R(i), c = C(i);
            if (isShip(at(r, c - 1)) || isShip(at(r, c + 1))) cls += ' ax-h';
            else if (isShip(at(r - 1, c)) || isShip(at(r + 1, c))) cls += ' ax-v';
          }
        }
        if (wrong.has(i)) cls += ' wrong';
        if (hintCells.has(i)) cls += hintCells.get(i) === SHIP ? ' hinted hint-ship' : ' hinted hint-water';
        if (i === cursor) cls += ' cursor';
        el.className = cls;
      });
      rowEls.forEach((el, r) => {
        el.classList.toggle('done', rs[r] === rows[r]);
        el.classList.toggle('over', rs[r] > rows[r]);
      });
      colEls.forEach((el, c) => {
        el.classList.toggle('done', cs[c] === cols[c]);
        el.classList.toggle('over', cs[c] > cols[c]);
      });
      renderFleet(closed);
    };

    // Tamamlanan gemiler: düz, tüm dik/yatay komşuları kapalı olan gemi grupları
    const renderFleet = (closed) => {
      const seen = new Uint8Array(N);
      const done = new Map();
      for (let i = 0; i < N; i++) {
        if (!isShip(i) || seen[i]) continue;
        const comp = [];
        const stack = [i];
        seen[i] = 1;
        while (stack.length) {
          const x = stack.pop();
          comp.push(x);
          for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const y = at(R(x) + dr, C(x) + dc);
            if (isShip(y) && !seen[y]) { seen[y] = 1; stack.push(y); }
          }
        }
        const straight = new Set(comp.map(R)).size === 1 || new Set(comp.map(C)).size === 1;
        if (!straight) continue;
        const set = new Set(comp);
        const lockedWhole = comp.every((x) => locked[x]) &&
          (comp.length === 1 ? hints[comp[0]] === 'o' : comp.filter((x) => 'lrtb'.includes(hints[x])).length === 2);
        const sealed = lockedWhole || comp.every((x) => [[-1, 0], [1, 0], [0, -1], [0, 1]].every(([dr, dc]) => {
          const y = at(R(x) + dr, C(x) + dc);
          return set.has(y) || closed(y);
        }));
        if (sealed) done.set(comp.length, (done.get(comp.length) ?? 0) + 1);
      }
      const used = new Map();
      fleetEl.innerHTML = fleet.map((s) => {
        const k = used.get(s) ?? 0;
        used.set(s, k + 1);
        const total = fleet.filter((x) => x === s).length;
        const found = done.get(s) ?? 0;
        const cls = k < found ? (found > total ? ' over' : ' found') : '';
        return `<span class="bs-ship-icon${cls}" title="${s} hücrelik gemi">${'<i></i>'.repeat(s)}</span>`;
      }).join('');
    };

    const checkSolved = () => {
      if (solved) return;
      if (values.every((v, i) => (v === SHIP) === (solution[i] === 1))) {
        solved = true;
        values.forEach((v, i) => { if (v === UNKNOWN) values[i] = WATER; });
        hintCells = new Map();
        wrong.clear();
        cursor = -1;
        render();
        root.classList.add('solved');
        setTimeout(ctx.onSolved, 400);
      }
    };

    const setValue = (i, v) => {
      if (solved || i < 0 || locked[i] || values[i] === v) return;
      values[i] = v;
      wrong.delete(i);
      hintCells.delete(i);
    };
    const cycle = (v) => (v === UNKNOWN ? SHIP : v === SHIP ? WATER : UNKNOWN);

    // --- İşaretçi (fare / dokunma) etkileşimi: dokun, uzun bas, sürükleyerek boya
    let press = null; // { start, pointerId, timer, paint (değer|null), handled }
    const cellFromPoint = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest?.('.bs-cell');
      return el && grid.contains(el) ? Number(el.dataset.c) : -1;
    };
    const commit = () => { render(); checkSolved(); };

    const onDown = (e) => {
      const el = e.target.closest('.bs-cell');
      if (!el || solved) return;
      if (e.button !== undefined && e.button > 2) return;
      e.preventDefault();
      const i = Number(el.dataset.c);
      cursor = -1;
      press = { start: i, last: i, pointerId: e.pointerId, paint: null, handled: false, timer: 0 };
      if (e.button === 2) {
        press.paint = values[i] === WATER ? UNKNOWN : WATER;
        press.handled = true;
        setValue(i, press.paint);
        commit();
        return;
      }
      if (e.pointerType !== 'mouse') {
        press.timer = setTimeout(() => {
          if (!press || press.paint !== null) return;
          press.handled = true;
          press.paint = WATER;
          setValue(i, WATER);
          navigator.vibrate?.(15);
          commit();
        }, LONG_PRESS_MS);
      }
    };
    const onMove = (e) => {
      if (!press || e.pointerId !== press.pointerId) return;
      const i = cellFromPoint(e.clientX, e.clientY);
      if (i < 0 || i === press.last) return;
      clearTimeout(press.timer);
      if (press.paint === null) {
        press.paint = locked[press.start] ? cycle(UNKNOWN) : cycle(values[press.start]);
        setValue(press.start, press.paint);
        press.handled = true;
      }
      press.last = i;
      setValue(i, press.paint);
      commit();
    };
    const onUp = (e) => {
      if (!press || e.pointerId !== press.pointerId) return;
      clearTimeout(press.timer);
      if (!press.handled) {
        const i = press.start;
        setValue(i, cycle(values[i]));
        commit();
      }
      press = null;
    };
    const onCancel = () => { if (press) clearTimeout(press.timer); press = null; };
    const onContext = (e) => { if (e.target.closest('.bs-cell')) e.preventDefault(); };

    grid.addEventListener('pointerdown', onDown);
    grid.addEventListener('contextmenu', onContext);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);

    // --- Klavye
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea') || document.querySelector('.modal') || solved) return;
      const k = e.key;
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        if (cursor < 0) cursor = 0;
        else {
          const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
          cursor = ((R(cursor) + dr + n) % n) * n + ((C(cursor) + dc + n) % n);
        }
        render();
        return;
      }
      if (cursor < 0) return;
      if (k === ' ' || k === 'Enter') { e.preventDefault(); setValue(cursor, cycle(values[cursor])); }
      else if (k === 'g' || k === 'G' || k === '1') setValue(cursor, SHIP);
      else if (k === 's' || k === 'S' || k === 'w' || k === 'W' || k === '2') setValue(cursor, WATER);
      else if (k === 'Backspace' || k === 'Delete' || k === '0') setValue(cursor, UNKNOWN);
      else return;
      commit();
    };
    document.addEventListener('keydown', onKey);

    const cellName = (i) => `${R(i) + 1}. satır, ${C(i) + 1}. sütun`;

    const boosters = {
      reveal() {
        let pool = [];
        for (let i = 0; i < N; i++) if (!locked[i] && solution[i] && values[i] !== SHIP) pool.push(i);
        if (!pool.length) for (let i = 0; i < N; i++) if (!locked[i] && !solution[i] && values[i] === SHIP) pool.push(i);
        if (!pool.length) return { ok: false, message: 'Açılacak hücre yok.' };
        // gemisi kısmen bulunmuş hücreleri öne al
        const touching = pool.filter((i) => [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([dr, dc]) => {
          const y = at(R(i) + dr, C(i) + dc);
          return y >= 0 && solution[y] && values[y] === SHIP;
        }));
        if (touching.length && Math.random() < 0.5) pool = touching;
        const i = pool[Math.floor(Math.random() * pool.length)];
        values[i] = solution[i] ? SHIP : WATER;
        hints[i] = trueShapes[i];
        locked[i] = true;
        wrong.delete(i);
        hintCells.delete(i);
        commit();
        return { ok: true, message: `${cellName(i)} açıldı: ${solution[i] ? 'gemi' : 'su'}.` };
      },
      check() {
        wrong.clear();
        values.forEach((v, i) => {
          if (locked[i]) return;
          if ((v === SHIP && !solution[i]) || (v === WATER && solution[i])) wrong.add(i);
        });
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} hatalı hücre kırmızıyla işaretlendi.` };
      },
      hint() {
        // Yalnızca doğru işaretler dikkate alınır; yanlışlar ipucunu bozmaz.
        const st = values.map((v, i) => (v === UNKNOWN ? UNKNOWN : (v === SHIP) === (solution[i] === 1) ? v : UNKNOWN));
        const PP = { ...P, hints };
        const first = nextStep(PP, st, 7);
        // Basit su çıkarımlarını (ipucu biçimi, çaprazlar, dolmuş sayılar) sessizce uygula,
        // gemi bulduran ya da daha ilginç ilk çıkarımı göster.
        let step = first, silent = 0;
        while (step && step.rule <= 3 && step.set.every(([, v]) => v === WATER)) {
          for (const [i, v] of step.set) st[i] = v;
          silent++;
          step = nextStep(PP, st, 7);
        }
        if (!step) step = first;
        else if (silent) step = { ...step, text: `Bariz su hücrelerini (gemi çevreleri, dolmuş sayılar) düşündükten sonra: ${step.text}` };
        if (!step || !step.set.length) {
          return { ok: false, message: 'Yeni bir çıkarım bulunamadı — işaretlerini Hata Bul ile kontrol et. (hak harcanmadı)' };
        }
        hintCells = new Map(step.set);
        render();
        const ships = step.set.filter(([, v]) => v === SHIP).length;
        const what = ships === step.set.length ? 'gemi' : ships ? 'gemi/su' : 'su';
        const hasWrong = values.some((v, i) => !locked[i] && ((v === SHIP && !solution[i]) || (v === WATER && solution[i])));
        return {
          ok: true,
          message: `${step.text} (Vurgulanan ${step.set.length} hücre: ${what})${hasWrong ? ' Not: tahtada hatalı işaretler var.' : ''}`,
        };
      },
    };

    render();
    return {
      useBooster: (id) => boosters[id]?.() ?? { ok: false },
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        if (press) clearTimeout(press.timer);
      },
    };
  },
};
