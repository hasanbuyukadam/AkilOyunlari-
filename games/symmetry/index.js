import { COLORS, parseLevel, rolesOf, orbitOf, transforms, explainCell, cellName } from './logic.js';

function ensureStyles() {
  if (document.getElementById('symmetry-css')) return;
  const link = document.createElement('link');
  link.id = 'symmetry-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const BANNERS = {
  v: ['↔️', 'Dikey simetri ekseni: resmin sağı ile solu birbirinin aynası.'],
  h: ['↕️', 'Yatay simetri ekseni: resmin üstü ile altı birbirinin aynası.'],
  vh: ['✳️', 'İki eksen: resmin dört çeyreği birbirinin aynası. Sol üst çeyrek hazır, diğer üçünü sen tamamla.'],
  d: ['↘️', 'Köşegen eksen: her kare köşegenin öbür yanına aynalanır; satır ve sütun numaraları yer değiştirir.'],
  ad: ['↙️', 'Ters köşegen eksen: her kare bu köşegenin öbür yanına, köşegene aynı uzaklıkta aynalanır.'],
  r180: ['🔄', 'Dönme simetrisi: resim merkez etrafında yarım tur (180°) dönünce aynı görünür. Her karenin eşi merkezin tam karşısındadır.'],
};

export default {
  id: 'symmetry',
  name: 'Simetri',
  icon: '🦋',
  description: 'Resmin yarısı hazır: aynadaki gibi öbür yarısını boyayıp resmi simetrik yap.',
  rules: 'Tahtada bir resmin yalnızca bir parçası var; renkli kesikli çizgi simetri eksenidir. Resmi tamamla: eksenin bir yanındaki her kare, öbür yanda eksene aynı uzaklıktaki karesiyle aynı renkte olmalı (boş kareler de boş kalır). Orta seviyede eksen yatay olabilir ya da tahtanın ortasından geçmeyebilir; taralı karelerin aynası tahtanın dışında kalır. Zor seviyede iki eksenli (dört çeyrekli), köşegen eksenli ve dönme simetrili resimler var. Dönme simetrisinde resim merkez etrafında yarım tur (180°) döndürülünce aynı görünür: her karenin eşi merkezin tam karşı tarafında, merkeze aynı uzaklıktadır. Her bulmacanın tek bir doğru cevabı vardır.',
  howTo: [
    'Renkli kesikli çizgi simetri eksenidir. Resmin bir parçası hazır; açık renkli boş kısmı sen boyayacaksın.',
    'Alttan bir renk seç, sonra karelere dokun ya da parmağını sürükleyerek boya.',
    'Her kare, eksenin öbür yanında eksene aynı uzaklıktaki karesiyle aynı renkte olmalı — tıpkı aynadaki görüntün gibi!',
    'Yanlış boyadığın kareyi 🧽 Silgi ile ya da aynı renkle yeniden dokunarak silebilirsin.',
    'Zor levellerde iki eksen, köşegen eksen ya da dönme simetrisi var: dönme simetrisinde resim yarım tur dönünce aynı görünür.',
    'Takılırsan 💡 Akıllı İpucu bir karenin aynasını nasıl bulacağını adım adım gösterir.',
  ],
  boosters: [
    { id: 'reveal', name: 'Hücre Aç', icon: '🔍', uses: 3, description: '3 karenin doğru rengini boyar.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış boyadığın kareleri kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Bir kareyi seçer, aynasının nerede olduğunu uzaklıklarla gösterip açıklar.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const { w, h, sym } = level;
    const N = w * h;
    const { given, solution, K } = parseLevel(level);
    const roles = rolesOf(level);
    const T = transforms(level);
    const orbits = Array.from({ length: N }, (_, i) => orbitOf(level, i, T));
    const hexOf = (v) => (v ? COLORS[level.colors[v - 1]].hex : '');
    const nameOf = (v) => (v ? COLORS[level.colors[v - 1]].name : 'silgi');

    const state = given.map((v) => (v < 0 ? 0 : v));
    const locked = given.map((v) => v >= 0); // verilen + booster ile açılan
    const isTgt = (i) => roles[i] === 'tgt';
    const editable = (i) => isTgt(i) && !locked[i];
    const wrong = new Set();
    let hint = null; // { target, src, mid, path:Set, labels:Map }
    let color = 1;
    let solved = false;
    let cursor = -1;
    let twin = -1;
    const undo = [];

    const offCenter = (sym === 'v' && level.ax !== w - 1) || (sym === 'h' && level.ay !== h - 1);
    const hasOut = roles.includes('out');
    const [bIcon, bText] = BANNERS[sym];

    container.innerHTML = `
      <div class="symm" style="--n:${w}">
        <p class="sy-banner"><span class="sy-b-icon">${bIcon}</span><span>${bText}${offCenter ? ' <b>Dikkat: eksen tahtanın ortasında değil!</b>' : ''}${hasOut ? ' Taralı karelerin aynası tahtanın dışında kalır.' : ''}</span></p>
        <div class="sy-wrap">
          <div class="sy-board${level.ghost ? ' ghosty' : ''}" role="grid" aria-label="Simetri tahtası ${w}×${h}">
            ${Array.from({ length: N }, (_, i) => `<div class="sy-cell r-${roles[i]}" data-i="${i}" role="gridcell" aria-label="${cellName(level, i)}"></div>`).join('')}
          </div>
          <svg class="sy-axis" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${axisSvg()}</svg>
        </div>
        <div class="sy-palette" role="group" aria-label="Renkler">
          ${level.colors.map((k, idx) => `<button type="button" class="sy-sw${k === 'K' ? ' ink' : ''}" data-color="${idx + 1}" style="--sw:${COLORS[k].hex}" title="${COLORS[k].name} (${idx + 1})" aria-label="${COLORS[k].name}"><i></i><span>${COLORS[k].name}</span></button>`).join('')}
          <button type="button" class="sy-sw sy-eraser" data-color="0" title="Silgi (0)" aria-label="Silgi"><i>🧽</i><span>Silgi</span></button>
          <button type="button" class="sy-undo" title="Geri al (Ctrl+Z)" aria-label="Geri al" disabled><i>↶</i><span>Geri Al</span></button>
        </div>
      </div>`;

    function axisSvg() {
      const line = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" vector-effect="non-scaling-stroke" />`;
      const parts = [];
      if (sym === 'v' || sym === 'vh') { const x = (level.ax + 1) / 2; parts.push(line(x, 0, x, h)); }
      if (sym === 'h' || sym === 'vh') { const y = (level.ay + 1) / 2; parts.push(line(0, y, w, y)); }
      if (sym === 'd') parts.push(line(0, 0, w, h));
      if (sym === 'ad') parts.push(line(w, 0, 0, h));
      if (sym === 'r180') {
        // Merkez noktası ve saat yönünde dönen ok (yarım turdan büyük yay + ok ucu).
        const cx = w / 2, cy = h / 2, rr = Math.min(w, h) * 0.13;
        const a0 = -Math.PI * 0.35, a1 = Math.PI * 1.15;
        const P = (a, rad = rr) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
        const [x0, y0] = P(a0), [x1, y1] = P(a1);
        const tx = -Math.sin(a1), ty = Math.cos(a1); // saat yönünde teğet
        const nx = Math.cos(a1), ny = Math.sin(a1);
        const tip = [x1 + tx * 0.45, y1 + ty * 0.45];
        const b1 = [x1 + nx * 0.3, y1 + ny * 0.3], b2 = [x1 - nx * 0.3, y1 - ny * 0.3];
        parts.push(`<path class="sy-rot" d="M ${x0} ${y0} A ${rr} ${rr} 0 1 1 ${x1} ${y1}" vector-effect="non-scaling-stroke" />`);
        parts.push(`<path class="sy-rot-head" d="M ${tip.join(' ')} L ${b1.join(' ')} L ${b2.join(' ')} Z" />`);
        parts.push(`<circle class="sy-center" cx="${cx}" cy="${cy}" r="0.22" />`);
      }
      parts.push('<g class="sy-hintline"></g>');
      return parts.join('');
    }

    const root = container.querySelector('.symm');
    const board = root.querySelector('.sy-board');
    const cellEls = [...board.querySelectorAll('.sy-cell')];
    const swatches = [...root.querySelectorAll('[data-color]')];
    const undoBtn = root.querySelector('.sy-undo');

    // ---------- Görünüm ----------
    const paintCell = (i) => {
      const el = cellEls[i];
      const v = state[i];
      el.classList.toggle('on', v > 0);
      el.classList.toggle('ink', v > 0 && level.colors[v - 1] === 'K');
      el.style.setProperty('--fill', hexOf(v) || 'transparent');
      if (level.ghost && isTgt(i) && !v) el.style.setProperty('--ghost', hexOf(solution[i]) || 'transparent');
      else el.style.removeProperty('--ghost');
      el.classList.toggle('locked', locked[i] && isTgt(i));
      el.classList.toggle('wrong', wrong.has(i));
      el.classList.toggle('cursor', cursor === i);
      el.classList.toggle('twin', twin >= 0 && twin !== i && orbits[twin].includes(i));
      el.classList.toggle('twin-self', twin === i && orbits[i].length > 1);
      el.classList.toggle('h-target', !!hint && hint.target === i);
      el.classList.toggle('h-src', !!hint && hint.src === i);
      el.classList.toggle('h-mid', !!hint && hint.mid === i);
      el.classList.toggle('h-path', !!hint && hint.path.has(i));
      const lab = hint?.labels.get(i);
      if (lab != null) el.dataset.label = lab; else delete el.dataset.label;
    };
    const hintLine = () => {
      const g = root.querySelector('.sy-hintline');
      if (!hint || sym !== 'r180') { g.innerHTML = ''; return; }
      // Dönme simetrisinde hedef ile eşini merkezden geçen çizgiyle bağla.
      const ctr = (j) => [(j % w) + 0.5, Math.floor(j / w) + 0.5];
      const [x1, y1] = ctr(hint.target), [x2, y2] = ctr(hint.src);
      g.innerHTML = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" vector-effect="non-scaling-stroke" />`;
    };
    const renderAll = () => { for (let i = 0; i < N; i++) paintCell(i); hintLine(); undoBtn.disabled = !undo.length || solved; };
    const setColor = (v) => {
      color = v;
      swatches.forEach((b) => { const on = Number(b.dataset.color) === v; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    };
    const setTwin = (i) => {
      if (twin === i) return;
      const old = twin >= 0 ? orbits[twin] : [];
      twin = i;
      for (const j of old) paintCell(j);
      if (i >= 0) for (const j of orbits[i]) paintCell(j);
    };
    const clearHint = () => {
      if (!hint) return;
      const cells = [hint.target, hint.src, hint.mid, ...hint.path, ...hint.labels.keys()].filter((j) => j >= 0);
      hint = null;
      cells.forEach(paintCell);
      hintLine();
    };

    const checkSolved = () => {
      if (solved) return;
      for (let i = 0; i < N; i++) if (isTgt(i) && state[i] !== solution[i]) return;
      solved = true;
      wrong.clear(); hint = null; cursor = -1; twin = -1;
      renderAll();
      root.classList.add('solved');
      ctx.showHint(`Harika! Resim simetrik oldu: ${level.title}!`);
      ctx.toast(`🦋 ${level.title}`);
      setTimeout(ctx.onSolved, 700);
    };

    const setCell = (i, v, record) => {
      if (!editable(i) || state[i] === v) return false;
      record?.push([i, state[i]]);
      state[i] = v;
      wrong.delete(i);
      if (hint && hint.target === i) clearHint();
      paintCell(i);
      return true;
    };
    const commit = (record) => {
      if (record.length) undo.push(record);
      if (undo.length > 300) undo.shift();
      undoBtn.disabled = !undo.length;
      checkSolved();
    };
    const doUndo = () => {
      const rec = undo.pop();
      if (!rec || solved) return;
      for (let k = rec.length - 1; k >= 0; k--) {
        const [i, prev] = rec[k];
        if (editable(i)) { state[i] = prev; wrong.delete(i); paintCell(i); }
      }
      undoBtn.disabled = !undo.length;
      checkSolved();
    };

    // ---------- İşaretçi: dokun ya da sürükle ----------
    let drag = null;
    const cellAt = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest?.('.sy-cell');
      return el && board.contains(el) ? Number(el.dataset.i) : -1;
    };
    const onPointerDown = (e) => {
      const el = e.target.closest('.sy-cell');
      if (!el || solved || drag) return;
      if (e.button !== 0) return;
      e.preventDefault();
      const i = Number(el.dataset.i);
      if (cursor >= 0) { const old = cursor; cursor = -1; paintCell(old); }
      setTwin(i);
      if (!editable(i)) {
        if (isTgt(i)) ctx.showHint('Bu kare zaten doğru boyanmış, değiştirilemez.');
        else if (roles[i] === 'out') ctx.showHint('Taralı karenin aynası tahtanın dışında; bu kare boş kalır.');
        else ctx.showHint('Bu kare resmin hazır kısmı. Açık renkli alandaki kareleri boya!');
        return;
      }
      // Aynı renkle dokunmak siler; sürükleme aynı işlemi sürdürür.
      const target = color && state[i] === color ? 0 : color;
      drag = { target, record: [], pointerId: e.pointerId, last: i };
      setCell(i, target, drag.record);
    };
    const onPointerMove = (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const i = cellAt(e.clientX, e.clientY);
      if (i < 0 || i === drag.last) return;
      drag.last = i;
      setTwin(i);
      setCell(i, drag.target, drag.record);
    };
    const onPointerUp = (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const rec = drag.record;
      drag = null;
      commit(rec);
    };
    const onHover = (e) => {
      if (drag || e.pointerType === 'touch') return;
      const el = e.target.closest?.('.sy-cell');
      setTwin(el ? Number(el.dataset.i) : -1);
    };
    board.addEventListener('pointerdown', onPointerDown);
    board.addEventListener('pointerover', onHover);
    board.addEventListener('pointerleave', () => { if (!drag) setTwin(-1); });
    board.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    root.querySelector('.sy-palette').addEventListener('click', (e) => {
      const sw = e.target.closest('[data-color]');
      if (sw) setColor(Number(sw.dataset.color));
      else if (e.target.closest('.sy-undo')) doUndo();
    });

    // ---------- Klavye ----------
    const onKey = (e) => {
      if (solved || e.target.closest?.('input, textarea') || document.querySelector('.modal')) return;
      const k = e.key;
      if ((e.ctrlKey || e.metaKey) && (k === 'z' || k === 'Z')) { e.preventDefault(); doUndo(); return; }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(k)) { const v = Number(k); if (v <= K) setColor(v); return; }
      if (k === 'e' || k === 'E') { setColor(0); return; }
      if (k.startsWith('Arrow')) {
        e.preventDefault();
        const old = cursor;
        if (cursor < 0) cursor = roles.findIndex((r, i) => r === 'tgt' && !locked[i]);
        else {
          const [dr, dc] = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[k];
          cursor = (((Math.floor(cursor / w) + dr + h) % h) * w) + (((cursor % w) + dc + w) % w);
        }
        if (old >= 0) paintCell(old);
        setTwin(cursor);
        paintCell(cursor);
        return;
      }
      if (cursor < 0) return;
      let v;
      if (k === ' ' || k === 'Enter') v = color && state[cursor] === color ? 0 : color;
      else if (k === 'Backspace' || k === 'Delete') v = 0;
      else return;
      e.preventDefault();
      const rec = [];
      setCell(cursor, v, rec);
      commit(rec);
    };
    document.addEventListener('keydown', onKey);

    // ---------- Boosterlar ----------
    const pick = (arr, n) => {
      const a = arr.slice(), out = [];
      while (out.length < n && a.length) out.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
      return out;
    };
    const flash = (i) => { const el = cellEls[i]; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };
    const boosters = {
      reveal() {
        const missing = [], badPaint = [];
        for (let i = 0; i < N; i++) {
          if (!editable(i) || state[i] === solution[i]) continue;
          (solution[i] ? missing : badPaint).push(i);
        }
        let chosen = pick(missing, 3);
        if (chosen.length < 3) chosen = chosen.concat(pick(badPaint, 3 - chosen.length));
        if (!chosen.length) return { ok: false, message: 'Açılacak kare kalmadı.' };
        clearHint();
        for (const i of chosen) { state[i] = solution[i]; locked[i] = true; wrong.delete(i); }
        renderAll();
        chosen.forEach(flash);
        checkSolved();
        const names = chosen.map((i) => `${cellName(level, i)} (${solution[i] ? nameOf(solution[i]) : 'boş'})`).join('; ');
        return { ok: true, message: `${chosen.length} kare açıldı: ${names}.` };
      },
      check() {
        wrong.clear();
        let missing = 0;
        for (let i = 0; i < N; i++) {
          if (!isTgt(i) || state[i] === solution[i]) continue;
          if (state[i]) wrong.add(i); else missing++;
        }
        renderAll();
        const rest = missing ? ` Boyanmayı bekleyen ${missing} kare daha var.` : '';
        if (!wrong.size) return { ok: false, message: `Yanlış boyanmış kare yok, böyle devam!${rest} (hak harcanmadı)` };
        return { ok: true, message: `${wrong.size} kare yanlış boyanmış, kırmızıyla işaretlendi.${rest}` };
      },
      hint() {
        const bad = [], missing = [];
        for (let i = 0; i < N; i++) {
          if (!isTgt(i) || state[i] === solution[i]) continue;
          (state[i] ? bad : missing).push(i);
        }
        const pool = bad.length ? bad : missing;
        if (!pool.length) return { ok: false, message: 'Her şey doğru görünüyor!' };
        // Önce seçili/üzerinde durulan kare; yoksa rastgele bir kare.
        const i = pool.includes(cursor) ? cursor : pool.includes(twin) ? twin : pool[Math.floor(Math.random() * pool.length)];
        clearHint();
        const ex = explainCell(level, i);
        hint = { target: i, src: ex.src, mid: ex.mid, path: new Set(ex.path), labels: ex.labels };
        renderAll();
        if (solution[i]) setColor(solution[i]);
        else setColor(0);
        const prefix = bad.length ? 'Sarı çerçeveli kare yanlış boyanmış. ' : 'Sarı çerçeveli kareye bak. ';
        return { ok: true, message: `${prefix}${ex.text} (Eşi mavi çerçeveyle gösterildi.)` };
      },
    };

    setColor(1);
    renderAll();

    return {
      useBooster: (id) => (solved ? { ok: false } : boosters[id]?.() ?? { ok: false }),
      destroy() {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      },
    };
  },
};
