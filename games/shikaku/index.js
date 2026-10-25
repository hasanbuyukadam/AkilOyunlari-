import { parseLevel, nextHint, cluesIn, rectKey, rectHas, rectsOverlap } from './logic.js';

function ensureStyles() {
  if (document.getElementById('shikaku-css')) return;
  const link = document.createElement('link');
  link.id = 'shikaku-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const IDLE_TEXT = 'Bir köşeden karşı köşeye sürükleyerek dikdörtgen çiz.';

export default {
  id: 'shikaku',
  name: 'Dikdörtgen Böl',
  icon: '🟦',
  description: 'Izgarayı dikdörtgenlere böl; her dikdörtgenin alanı içindeki sayıya eşit olsun.',
  rules: 'Izgarayı dikdörtgenlere (ve karelere) böl. Her dikdörtgenin içinde tam bir sayı olmalı ve o sayı dikdörtgenin alanına, yani kaç kare kapladığına eşit olmalı: alan = en × boy. Bütün kareler bir dikdörtgene ait olmalı, dikdörtgenler üst üste binemez. Sürükleyerek dikdörtgen çiz, silmek için üstüne dokun. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  howTo: [
    'Bir kareye parmağını koy ve karşı köşeye sürükle: bir dikdörtgen çizilir.',
    'Her dikdörtgenin içinde tam bir sayı olmalı.',
    'O sayı, dikdörtgenin kaç kare olduğunu söyler: alan = en × boy. Örneğin 6 = 2 × 3.',
    'Bütün kareleri dikdörtgenlerle doldur; dikdörtgenler üst üste binemez.',
    'Kırmızı dikdörtgen bir şeylerin yanlış olduğunu söyler. Silmek için üstüne dokun.',
    'Takılırsan 💡 Akıllı İpucu sana sıradaki adımı ve nedenini anlatır.',
  ],
  boosters: [
    { id: 'reveal', name: 'Dikdörtgen Aç', icon: '🟦', uses: 3, description: 'Doğru dikdörtgenlerden birini senin için çizer.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Çözümde olmayan dikdörtgenlerini gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı dikdörtgeni nedeniyle gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const P = parseLevel(level);
    const { w, h, n, clues, solution } = P;
    const solKeys = solution.map(rectKey);
    let rects = []; // { r, c, h, w, locked? }
    const history = [];
    let wrongKeys = new Set();
    let hintRect = null;
    let hintFocus = new Set();
    let cursor = -1;
    let showCursor = false;
    let anchor = -1; // klavye ile çizim başlangıcı
    let finished = false;

    // --- DOM ---
    const root = document.createElement('div');
    root.className = 'shikaku';
    const cellsHtml = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / w), c = i % w;
      cellsHtml.push(`<div class="sk-cell" data-c="${i}" style="grid-area:${r + 1}/${c + 1}"></div>`);
    }
    const cluesHtml = clues.map((k) => `<div class="sk-num" data-k="${k.i}" style="grid-area:${k.r + 1}/${k.c + 1}"><span>${k.n}</span></div>`).join('');
    root.innerHTML = `
      <div class="sk-status" aria-live="polite">${IDLE_TEXT}</div>
      <div class="sk-board" style="--cols:${w};--rows:${h}" role="grid" aria-label="Dikdörtgen Böl tahtası ${w}×${h}">
        ${cellsHtml.join('')}
        <div class="sk-layer"></div>
        ${cluesHtml}
      </div>
      <div class="sk-tools">
        <button data-act="undo" title="Geri al (Z)">↶ Geri Al</button>
        <button data-act="clear" title="Tüm dikdörtgenleri sil">🧹 Temizle</button>
      </div>`;
    container.appendChild(root);
    const board = root.querySelector('.sk-board');
    const layer = root.querySelector('.sk-layer');
    const statusEl = root.querySelector('.sk-status');
    const cellEls = [...board.querySelectorAll('.sk-cell')];
    const numEls = new Map([...board.querySelectorAll('.sk-num')].map((el) => [Number(el.dataset.k), el]));
    const undoBtn = root.querySelector('[data-act="undo"]');
    const clearBtn = root.querySelector('[data-act="clear"]');

    const area = (R) => R.w * R.h;
    const rectFrom = (a, b) => {
      const r1 = Math.floor(a / w), c1 = a % w, r2 = Math.floor(b / w), c2 = b % w;
      return { r: Math.min(r1, r2), c: Math.min(c1, c2), h: Math.abs(r1 - r2) + 1, w: Math.abs(c1 - c2) + 1 };
    };
    const status = (R) => {
      const inside = cluesIn(P, R);
      const base = `en ${R.w} × boy ${R.h} = ${area(R)}`;
      if (!inside.length) return { ok: false, text: `${base} · içinde sayı yok` };
      if (inside.length > 1) return { ok: false, text: `${base} · ${inside.length} sayı var, 1 olmalı` };
      const num = clues[inside[0]].n;
      if (num !== area(R)) return { ok: false, text: `${base} · ${num} olmalı` };
      return { ok: true, text: `${base} ✓`, clue: inside[0] };
    };
    const isValid = (R) => status(R).ok;
    const hueOf = (k) => Math.round((k * 137.508 + 200) % 360);

    let preview = null; // { R }
    const render = () => {
      const parts = [];
      for (const R of rects) {
        const st = status(R);
        const cls = ['sk-rect'];
        if (!st.ok) cls.push('bad');
        if (R.locked) cls.push('locked');
        if (wrongKeys.has(rectKey(R))) cls.push('wrong');
        const hue = st.ok ? hueOf(st.clue) : 0;
        parts.push(`<div class="${cls.join(' ')}" style="grid-area:${R.r + 1}/${R.c + 1}/span ${R.h}/span ${R.w};--h:${hue}"></div>`);
      }
      if (hintRect) parts.push(`<div class="sk-rect hint" style="grid-area:${hintRect.r + 1}/${hintRect.c + 1}/span ${hintRect.h}/span ${hintRect.w}"></div>`);
      if (preview) {
        const st = status(preview);
        parts.push(`<div class="sk-rect preview${st.ok ? ' good' : ''}" style="grid-area:${preview.r + 1}/${preview.c + 1}/span ${preview.h}/span ${preview.w}"><b>${preview.w}×${preview.h}=${area(preview)}</b></div>`);
      }
      if (anchor >= 0 && !preview) {
        const r = Math.floor(anchor / w), c = anchor % w;
        parts.push(`<div class="sk-rect anchor" style="grid-area:${r + 1}/${c + 1}"></div>`);
      }
      layer.innerHTML = parts.join('');
      // layer, ızgaranın tamamını kaplayan bir alt ızgaradır
      cellEls.forEach((el, i) => {
        el.classList.toggle('cur', showCursor && i === cursor);
        el.classList.toggle('focus', hintFocus.has(i));
      });
      const covered = new Uint8Array(n);
      for (const R of rects) {
        for (let r = R.r; r < R.r + R.h; r++) for (let c = R.c; c < R.c + R.w; c++) covered[r * w + c] = 1;
      }
      numEls.forEach((el, i) => el.classList.toggle('focus', hintFocus.has(i)));
      undoBtn.disabled = !history.length || finished;
      clearBtn.disabled = !rects.some((R) => !R.locked) || finished;
      if (preview) {
        const st = status(preview);
        statusEl.textContent = st.text;
        statusEl.className = `sk-status live${st.ok ? ' ok' : ''}`;
      } else if (!finished) {
        const left = n - covered.reduce((s, v) => s + v, 0);
        statusEl.className = 'sk-status';
        statusEl.textContent = rects.length
          ? (left ? `Boş kalan kare: ${left}` : 'Bütün kareler dolu! Kırmızı dikdörtgen var mı, bir bak.')
          : IDLE_TEXT;
      }
    };

    const clearMarks = () => { wrongKeys = new Set(); hintRect = null; hintFocus = new Set(); };
    const snapshot = () => { history.push(rects.map((R) => ({ ...R }))); if (history.length > 200) history.shift(); };

    const checkSolved = () => {
      if (finished) return;
      if (rects.length !== solution.length) return;
      const keys = new Set(rects.map(rectKey));
      if (!solKeys.every((k) => keys.has(k))) return;
      finished = true;
      clearMarks();
      preview = null;
      anchor = -1;
      showCursor = false;
      render();
      statusEl.className = 'sk-status live ok';
      statusEl.textContent = 'Harika! Bütün dikdörtgenler doğru. 🎉';
      root.classList.add('solved');
      setTimeout(() => ctx.onSolved(), 400);
    };

    /** Yeni dikdörtgen ekler; çakışan (kilitsiz) dikdörtgenleri kaldırır. */
    const addRect = (R) => {
      if (rects.some((Q) => rectKey(Q) === rectKey(R))) return false;
      if (rects.some((Q) => Q.locked && rectsOverlap(Q, R))) {
        ctx.toast('Bu alan, kilitli (doğru) bir dikdörtgenle çakışıyor.');
        return false;
      }
      snapshot();
      rects = rects.filter((Q) => !rectsOverlap(Q, R));
      rects.push(R);
      clearMarks();
      return true;
    };
    const rectAtCell = (i) => rects.findIndex((R) => rectHas(R, Math.floor(i / w), i % w));
    const removeAt = (i) => {
      const k = rectAtCell(i);
      if (k < 0) return false;
      if (rects[k].locked) { ctx.toast('Bu dikdörtgen booster ile açıldı, silinemez.'); return false; }
      snapshot();
      rects.splice(k, 1);
      clearMarks();
      return true;
    };

    const finishDraw = (a, b) => {
      if (a === b && rectAtCell(a) >= 0) {
        removeAt(a);
      } else {
        const R = rectFrom(a, b);
        if (a === b) {
          const st = status(R);
          if (!st.ok) {
            // tek kareye dokunma: 1 yazmıyorsa çizim yerine yardım göster
            render();
            statusEl.className = 'sk-status';
            statusEl.textContent = 'Dikdörtgen çizmek için bir köşeden karşı köşeye sürükle.';
            return;
          }
        }
        addRect(R);
      }
      render();
      checkSolved();
    };

    const undo = () => {
      if (finished || !history.length) return;
      rects = history.pop();
      clearMarks();
      anchor = -1;
      render();
    };
    const clearAll = () => {
      if (finished || !rects.some((R) => !R.locked)) return;
      snapshot();
      rects = rects.filter((R) => R.locked);
      clearMarks();
      render();
    };

    // --- İşaretçi (fare + dokunmatik) ---
    let press = null; // { id, start, end }
    const cellAt = (x, y) => {
      const b = board.getBoundingClientRect();
      const st = getComputedStyle(board);
      const left = b.left + parseFloat(st.borderLeftWidth) + parseFloat(st.paddingLeft);
      const top = b.top + parseFloat(st.borderTopWidth) + parseFloat(st.paddingTop);
      const cw = cellEls[0].getBoundingClientRect().width;
      const ch = cellEls[0].getBoundingClientRect().height;
      const c = Math.min(w - 1, Math.max(0, Math.floor((x - left) / cw)));
      const r = Math.min(h - 1, Math.max(0, Math.floor((y - top) / ch)));
      return r * w + c;
    };
    const onPointerDown = (e) => {
      if (finished || (e.button !== 0 && e.pointerType === 'mouse')) return;
      e.preventDefault();
      const i = cellAt(e.clientX, e.clientY);
      press = { id: e.pointerId, start: i, end: i };
      anchor = -1;
      showCursor = false;
      cursor = i;
      preview = rectFrom(i, i);
      render();
    };
    const onPointerMove = (e) => {
      if (!press || e.pointerId !== press.id) return;
      const i = cellAt(e.clientX, e.clientY);
      if (i === press.end) return;
      press.end = i;
      cursor = i;
      preview = rectFrom(press.start, i);
      render();
    };
    const onPointerUp = (e) => {
      if (!press || e.pointerId !== press.id) return;
      const { start, end } = press;
      press = null;
      preview = null;
      if (e.type === 'pointercancel') { render(); return; }
      finishDraw(start, end);
    };
    board.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    const onContext = (e) => e.preventDefault();
    board.addEventListener('contextmenu', onContext);

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.sk-tools button');
      if (!btn) return;
      if (btn.dataset.act === 'undo') undo();
      else if (btn.dataset.act === 'clear') clearAll();
    });

    // --- Klavye: oklar gezdirir, Boşluk/Enter ile köşe seçilir ---
    const onKey = (e) => {
      if (finished || e.target.closest?.('input, textarea') || document.querySelector('.modal')) return;
      const k = e.key;
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        if (cursor < 0) cursor = 0;
        else if (showCursor) {
          const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
          const r = Math.min(h - 1, Math.max(0, Math.floor(cursor / w) + dr));
          const c = Math.min(w - 1, Math.max(0, (cursor % w) + dc));
          cursor = r * w + c;
        }
        showCursor = true;
        preview = anchor >= 0 ? rectFrom(anchor, cursor) : null;
        render();
        return;
      }
      if ((k === 'z' || k === 'Z') && !e.altKey) { e.preventDefault(); undo(); return; }
      if (k === 'Escape' && anchor >= 0) { anchor = -1; preview = null; render(); return; }
      if (!showCursor || cursor < 0) return;
      if (k === ' ' || k === 'Enter') {
        e.preventDefault();
        if (anchor < 0) {
          anchor = cursor;
          preview = rectFrom(anchor, cursor);
          render();
        } else {
          const a = anchor;
          anchor = -1;
          preview = null;
          if (a === cursor && rectAtCell(a) < 0 && !isValid(rectFrom(a, a))) { render(); return; }
          finishDraw(a, cursor);
        }
      } else if (k === 'Backspace' || k === 'Delete') {
        e.preventDefault();
        if (removeAt(cursor)) render();
      }
    };
    document.addEventListener('keydown', onKey);

    // --- Boosterlar ---
    const correctClues = () => {
      const keys = new Set(rects.map(rectKey));
      const set = new Set();
      solKeys.forEach((key, k) => { if (keys.has(key)) set.add(k); });
      return set;
    };
    const hasWrong = () => rects.some((R) => !solKeys.includes(rectKey(R)));

    const boosters = {
      reveal() {
        const done = correctClues();
        const open = (k) => !done.has(k);
        let k = -1;
        // 1) imlecin/dokunulan karenin olduğu çözüm dikdörtgeni
        if (cursor >= 0) {
          const r = Math.floor(cursor / w), c = cursor % w;
          const s = solution.findIndex((R) => rectHas(R, r, c));
          if (s >= 0 && open(s)) k = s;
        }
        // 2) ipucunun gösterdiği dikdörtgen
        if (k < 0 && hintRect) {
          const s = solKeys.indexOf(rectKey(hintRect));
          if (s >= 0 && open(s)) k = s;
        }
        // 3) mantık sırasındaki bir sonraki dikdörtgen
        if (k < 0) {
          const step = nextHint(P, done);
          if (step) k = step.clue;
        }
        if (k < 0) return { ok: false, message: 'Açılacak dikdörtgen kalmadı.' };
        const R = { ...solution[k], locked: true };
        snapshot();
        rects = rects.filter((Q) => !rectsOverlap(Q, R));
        rects.push(R);
        history.length = 0; // booster geri alınamaz
        clearMarks();
        render();
        checkSolved();
        return { ok: true, message: `${clues[k].n} sayısının dikdörtgeni çizildi: en ${R.w} × boy ${R.h} = ${clues[k].n}.` };
      },
      check() {
        const wrong = rects.filter((R) => !solKeys.includes(rectKey(R)));
        if (!wrong.length) return { ok: false, message: 'Hiç hata yok, böyle devam! (hak harcanmadı)' };
        wrongKeys = new Set(wrong.map(rectKey));
        render();
        return { ok: true, message: `${wrong.length} dikdörtgen çözümde yok; çizgili olarak gösterildi. Silmek için üstlerine dokun.` };
      },
      hint() {
        const done = correctClues();
        const step = nextHint(P, done);
        if (!step) return { ok: false, message: 'Şu an verilecek bir ipucu yok.' };
        clearMarks();
        hintRect = step.rect;
        hintFocus = new Set([...step.focus, clues[step.clue].i]);
        render();
        let msg = step.msg;
        if (hasWrong()) msg += ' (Not: tahtada çözümde olmayan dikdörtgenler var.)';
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
      },
    };
  },
};

