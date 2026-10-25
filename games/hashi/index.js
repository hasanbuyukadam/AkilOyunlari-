import { parsePuzzle, parseSolution, findStep, applyStep, isValidSolution } from './logic.js';

function ensureStyles() {
  if (document.getElementById('hashi-css')) return;
  const link = document.createElement('link');
  link.id = 'hashi-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const SVGNS = 'http://www.w3.org/2000/svg';
const R = 0.4; // ada yarıçapı (hücre = 1 birim)
const OFF = 0.12; // çift köprü aralığı

export default {
  id: 'hashi',
  name: 'Köprü Kurma',
  icon: '🌉',
  description: 'Numaralı adaları köprülerle birbirine bağla.',
  rules: 'Adaları yatay ya da dikey köprülerle bağla. İki ada arasında en fazla 2 köprü olabilir; köprüler birbirini ve adaları kesemez. Her adadaki sayı, o adaya bağlanan köprü sayısıdır ve tüm adalar tek bir grup oluşturmalıdır. Her bulmacanın tek bir çözümü vardır ve tahmin yapmadan çözülebilir.',
  howTo: [
    "Her ada bir sayı taşır. Bu sayı, adaya kaç köprü bağlanacağını söyler.",
    "Bir adaya dokun, sonra yanındaki adaya dokun: köprü kurulur. Tekrar dokunursan çift köprü olur, bir kez daha dokunursan köprü kalkar.",
    "Köprüler sadece düz (yatay ya da dikey) gider ve birbirini kesemez.",
    "Sonunda bütün adalar birbirine bağlı olmalı.",
    "Sayısı tamamlanan ada yeşil olur.",
  ],
  boosters: [
    { id: 'reveal', name: 'Köprü Aç', icon: '🌉', uses: 3, description: 'Seçili adadan (ya da rastgele) doğru bir köprüyü yerine koyar.' },
    { id: 'check', name: 'Hata Bul', icon: '❗', uses: 2, description: 'Yanlış ya da fazla kurduğun köprüleri kırmızıyla gösterir.' },
    { id: 'hint', name: 'Akıllı İpucu', icon: '💡', uses: 3, description: 'Sıradaki mantıklı hamleyi, nedenini açıklayarak gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const P = parsePuzzle(level);
    const sol = parseSolution(level);
    const { w, h, islands, edges, inc, cross, dirEdge } = P;
    const vals = new Array(edges.length).fill(0);
    const locked = new Array(edges.length).fill(false);
    const wrong = new Set();
    let hintEdges = new Set();
    let hintIslands = new Set();
    let selected = -1;
    let solved = false;
    let history = [];
    let solveTimer = 0;

    container.innerHTML = `
      <div class="hashi">
        <svg class="hashi-board" viewBox="-0.1 -0.1 ${w + 0.2} ${h + 0.2}" role="img" aria-label="Köprü Kurma tahtası"></svg>
        <div class="hashi-tools">
          <button type="button" data-act="undo" title="Geri al (Ctrl+Z)">↶ Geri Al</button>
          <button type="button" data-act="reset" title="Kendi kurduğun köprüleri sil">⟲ Sıfırla</button>
        </div>
        <p class="hashi-help">Adadan komşusuna sürükle, iki adaya sırayla ya da köprüye dokun (0→1→2→0). Klavye: ok tuşları köprü kurar, Shift+ok ada seçer.</p>
      </div>`;
    const root = container.querySelector('.hashi');
    const svg = root.querySelector('svg');
    const el = (tag, attrs, parent) => {
      const n = document.createElementNS(SVGNS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    };
    const cx = (i) => islands[i].c + 0.5;
    const cy = (i) => islands[i].r + 0.5;

    // Katmanlar
    const gDots = el('g', { class: 'h-dots' }, svg);
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) el('circle', { cx: c + 0.5, cy: r + 0.5, r: 0.045 }, gDots);
    const gHit = el('g', { class: 'h-hits' }, svg);
    const gHint = el('g', { class: 'h-hintl' }, svg);
    const gBridges = el('g', { class: 'h-bridges' }, svg);
    const preview = el('line', { class: 'h-preview', x1: 0, y1: 0, x2: 0, y2: 0, visibility: 'hidden' }, svg);
    const gIsl = el('g', { class: 'h-islands' }, svg);

    edges.forEach((E) => {
      el('line', { class: 'h-hit', 'data-e': E.id, x1: cx(E.a), y1: cy(E.a), x2: cx(E.b), y2: cy(E.b) }, gHit);
    });
    const islEls = islands.map((isl) => {
      const g = el('g', { class: 'h-isl', 'data-i': isl.id }, gIsl);
      el('circle', { class: 'h-hitc', cx: cx(isl.id), cy: cy(isl.id), r: 0.5 }, g);
      el('circle', { class: 'h-circ', cx: cx(isl.id), cy: cy(isl.id), r: R }, g);
      const t = el('text', { x: cx(isl.id), y: cy(isl.id) + 0.02 }, g);
      t.textContent = isl.n;
      return g;
    });

    const degree = (i) => inc[i].reduce((s, e) => s + vals[e], 0);
    const islName = (i) => `${islands[i].n} olan ada (${islands[i].r + 1}. satır, ${islands[i].c + 1}. sütun)`;
    const shortName = (i) => `(${islands[i].r + 1}, ${islands[i].c + 1})`;

    const segs = (E, v) => {
      const hor = E.hor;
      const x1 = cx(E.a) + (hor ? R : 0), y1 = cy(E.a) + (hor ? 0 : R);
      const x2 = cx(E.b) - (hor ? R : 0), y2 = cy(E.b) - (hor ? 0 : R);
      if (v === 1) return [[x1, y1, x2, y2]];
      const dx = hor ? 0 : OFF, dy = hor ? OFF : 0;
      return [[x1 - dx, y1 - dy, x2 - dx, y2 - dy], [x1 + dx, y1 + dy, x2 + dx, y2 + dy]];
    };

    const render = () => {
      gBridges.replaceChildren();
      edges.forEach((E) => {
        const v = vals[E.id];
        if (!v) return;
        const cls = ['h-br'];
        if (locked[E.id]) cls.push('locked');
        if (wrong.has(E.id)) cls.push('wrong');
        for (const [x1, y1, x2, y2] of segs(E, v)) el('line', { class: cls.join(' '), x1, y1, x2, y2 }, gBridges);
      });
      gHint.replaceChildren();
      for (const e of hintEdges) {
        const E = edges[e];
        el('line', { class: 'h-hintline', x1: cx(E.a), y1: cy(E.a), x2: cx(E.b), y2: cy(E.b) }, gHint);
      }
      islEls.forEach((g, i) => {
        const d = degree(i);
        g.classList.toggle('done', d === islands[i].n);
        g.classList.toggle('over', d > islands[i].n);
        g.classList.toggle('sel', i === selected);
        g.classList.toggle('hinted', hintIslands.has(i));
      });
      root.classList.toggle('solved', solved);
    };

    const clearMarks = () => { hintEdges = new Set(); hintIslands = new Set(); };

    const checkSolved = () => {
      if (solved || !isValidSolution(P, vals)) return;
      solved = true;
      selected = -1;
      clearMarks();
      wrong.clear();
      render();
      solveTimer = setTimeout(ctx.onSolved, 450);
    };

    const cycle = (e) => {
      if (solved || e < 0) return;
      if (locked[e]) { ctx.toast('Bu köprü booster ile kuruldu, değiştirilemez.'); return; }
      const next = (vals[e] + 1) % 3;
      if (next > 0 && cross[e].some((f) => vals[f] > 0)) { ctx.toast('Köprüler birbirini kesemez.'); return; }
      history.push(vals.slice());
      if (history.length > 200) history.shift();
      vals[e] = next;
      wrong.delete(e);
      clearMarks();
      render();
      checkSolved();
    };

    // ---- İşaretçi (fare + dokunmatik) ----
    const toSvg = (ev) => {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };
    let drag = null; // {pointerId, island, edge, moved, startX, startY, edgeTap}

    const dragTarget = (i, p) => {
      const dx = p.x - cx(i), dy = p.y - cy(i);
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 0.55) return -1;
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
      return dirEdge[i][dir];
    };

    const onDown = (ev) => {
      if (solved || drag) return;
      if (ev.button !== undefined && ev.button > 0) return;
      const islG = ev.target.closest('.h-isl');
      const hit = ev.target.closest('.h-hit');
      drag = { pointerId: ev.pointerId, island: islG ? Number(islG.dataset.i) : -1, edgeTap: hit ? Number(hit.dataset.e) : -1, edge: -1, moved: false, sx: ev.clientX, sy: ev.clientY };
      if (drag.island >= 0) {
        try { svg.setPointerCapture(ev.pointerId); } catch { /* yok say */ }
        ev.preventDefault();
      }
    };
    const onMove = (ev) => {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      if (Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 8) drag.moved = true;
      if (drag.island < 0 || !drag.moved) return;
      const e = dragTarget(drag.island, toSvg(ev));
      drag.edge = e;
      if (e >= 0) {
        const E = edges[e];
        preview.setAttribute('x1', cx(E.a)); preview.setAttribute('y1', cy(E.a));
        preview.setAttribute('x2', cx(E.b)); preview.setAttribute('y2', cy(E.b));
        preview.setAttribute('visibility', 'visible');
      } else preview.setAttribute('visibility', 'hidden');
    };
    const onUp = (ev) => {
      if (!drag || ev.pointerId !== drag.pointerId) return;
      const d = drag;
      drag = null;
      preview.setAttribute('visibility', 'hidden');
      if (d.island >= 0) {
        if (d.moved) {
          if (d.edge >= 0) { selected = -1; cycle(d.edge); }
          else render();
          return;
        }
        // Dokunma: seçili adanın komşusuysa köprü, değilse seçim
        const i = d.island;
        if (selected === i) selected = -1;
        else if (selected >= 0) {
          const e = dirEdge[selected].find((x) => x >= 0 && (edges[x].a === i || edges[x].b === i));
          if (e !== undefined) { cycle(e); return; }
          selected = i;
        } else selected = i;
        render();
        return;
      }
      if (!d.moved && d.edgeTap >= 0) { cycle(d.edgeTap); return; }
      if (!d.moved) { selected = -1; render(); }
    };
    const onCancel = () => { drag = null; preview.setAttribute('visibility', 'hidden'); };
    svg.addEventListener('pointerdown', onDown);
    svg.addEventListener('pointermove', onMove);
    svg.addEventListener('pointerup', onUp);
    svg.addEventListener('pointercancel', onCancel);

    // ---- Araç düğmeleri ----
    const undo = () => {
      if (solved) return;
      const prev = history.pop();
      if (!prev) { ctx.toast('Geri alınacak hamle yok.'); return; }
      prev.forEach((v, e) => { if (!locked[e]) vals[e] = v; });
      wrong.clear();
      clearMarks();
      render();
    };
    root.querySelector('.hashi-tools').addEventListener('click', (ev) => {
      const b = ev.target.closest('button');
      if (!b || solved) return;
      if (b.dataset.act === 'undo') undo();
      else if (b.dataset.act === 'reset') {
        if (!vals.some((v, e) => v && !locked[e])) return;
        history.push(vals.slice());
        vals.forEach((_, e) => { if (!locked[e]) vals[e] = 0; });
        wrong.clear();
        clearMarks();
        selected = -1;
        render();
      }
    });

    // ---- Klavye ----
    const onKey = (ev) => {
      if (ev.target.closest?.('input, textarea') || document.querySelector('.modal') || solved) return;
      const k = ev.key;
      if ((ev.ctrlKey || ev.metaKey) && (k === 'z' || k === 'Z')) { ev.preventDefault(); undo(); return; }
      if (k === 'Escape') { selected = -1; render(); return; }
      const dir = { ArrowRight: 0, ArrowDown: 1, ArrowLeft: 2, ArrowUp: 3 }[k];
      if (dir === undefined) return;
      ev.preventDefault();
      if (selected < 0) { selected = 0; render(); return; }
      const e = dirEdge[selected][dir];
      if (ev.shiftKey) {
        if (e >= 0) { selected = edges[e].a === selected ? edges[e].b : edges[e].a; render(); }
        return;
      }
      if (e < 0) { ctx.toast('Bu yönde komşu ada yok.'); return; }
      cycle(e);
    };
    document.addEventListener('keydown', onKey);

    // ---- Boosterlar ----
    const boosters = {
      reveal() {
        const open = (e) => sol[e] > 0 && vals[e] !== sol[e];
        let pool = selected >= 0 ? inc[selected].filter(open) : [];
        if (!pool.length) pool = edges.map((E) => E.id).filter(open);
        if (!pool.length) return { ok: false, message: 'Doğru köprülerin hepsi zaten yerinde; fazlalıkları kaldır. (hak harcanmadı)' };
        // Önce oyuncunun köprüleriyle çakışmayanları tercih et
        const free = pool.filter((e) => !cross[e].some((f) => vals[f] > 0));
        const list = free.length ? free : pool;
        const e = list[Math.floor(Math.random() * list.length)];
        for (const f of cross[e]) if (vals[f] > 0) vals[f] = 0; // kesişen köprüler zaten yanlıştır
        vals[e] = sol[e];
        locked[e] = true;
        wrong.delete(e);
        history = [];
        clearMarks();
        hintEdges = new Set([e]);
        const E = edges[e];
        hintIslands = new Set([E.a, E.b]);
        render();
        checkSolved();
        return { ok: true, message: `${shortName(E.a)} ile ${shortName(E.b)} adaları arasına ${sol[e]} köprü kuruldu.` };
      },
      check() {
        wrong.clear();
        edges.forEach((E) => { if (vals[E.id] > sol[E.id]) wrong.add(E.id); });
        clearMarks();
        render();
        if (!wrong.size) return { ok: false, message: 'Hiç yanlış köprü yok, böyle devam! (hak harcanmadı)' };
        return { ok: true, message: `${wrong.size} yanlış ya da fazla köprü kırmızıyla işaretlendi.` };
      },
      hint() {
        // Yalnızca doğru (çözümle çelişmeyen) köprüler bilgi olarak kullanılır.
        const lo = vals.map((v, e) => (v <= sol[e] ? v : 0));
        const hi = new Array(edges.length).fill(2);
        const pre = [];
        let step = null;
        for (let guard = 0; guard < 5000; guard++) {
          const s = findStep(P, lo, hi, 2);
          if (!s || s.contradiction) break;
          const raised = s.changes.filter((ch) => ch.lo > lo[ch.e]);
          if (raised.length) { step = { ...s, raised, before: lo.slice(), hiBefore: hi.slice() }; break; }
          pre.push(s);
          applyStep(lo, hi, s);
        }
        const hasWrong = vals.some((v, e) => v > sol[e]);
        if (!step) {
          return { ok: false, message: hasWrong ? 'Doğru köprülerin hepsi yerinde; yanlış köprüleri kaldır (Hata Bul yardımcı olur). (hak harcanmadı)' : 'İpucu bulunamadı. (hak harcanmadı)' };
        }
        clearMarks();
        hintEdges = new Set(step.raised.map((ch) => ch.e));
        let msg = '';
        const near = (e) => step.kind === 'exit' || inc[step.island].includes(e);
        const lastIso = [...pre].reverse().find((s) => s.kind === 'iso' && near(s.edge));
        if (lastIso) {
          const E = edges[lastIso.edge];
          const v = lastIso.value;
          msg += `Önce: ${shortName(E.a)} ile ${shortName(E.b)} arasına ${v === 2 ? '2 köprü' : 'köprü'} kurulursa ${lastIso.groupSize} adalık grup diğerlerinden kopuk kalırdı, bu yüzden bu olamaz. Sonra: `;
        } else if (pre.some((s) => s.kind === 'cross' && s.changes.some((c) => near(c.e)))) {
          msg += 'Kurulu köprülerin kestiği yolları eledikten sonra: ';
        }
        if (step.kind === 'exit') {
          const E = edges[step.edge];
          const lo0 = step.before;
          // grubun adalarını işaretle
          const parent = islands.map((_, i) => i);
          const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
          edges.forEach((F) => { if (lo0[F.id] > 0) parent[find(F.a)] = find(F.b); });
          const k = find(step.island);
          islands.forEach((_, i) => { if (find(i) === k) hintIslands.add(i); });
          msg += step.groupSize > 1
            ? `İşaretli ${step.groupSize} adalık grubun dışarıya kalan tek bağlantı yolu ${shortName(E.a)}–${shortName(E.b)} → burada en az 1 köprü olmalı, yoksa grup kopuk kalır.`
            : `${islName(step.island)} için kalan tek bağlantı yolu bu → en az 1 köprü olmalı.`;
        } else {
          const i = step.island;
          hintIslands.add(i);
          const n = islands[i].n;
          const openE = inc[i].filter((e) => step.hiBefore[e] > 0);
          const all2 = openE.every((e) => step.hiBefore[e] === 2);
          const ch = step.raised[0];
          const other = step.cap - step.hiBefore[ch.e];
          if (step.kind === 'single') {
            msg += `${islName(i)} yalnızca tek bir komşuya bağlanabilir → o komşuya ${ch.lo} köprü kurulmalı.`;
          } else if (step.kind === 'full') {
            msg += all2
              ? `${n} olan ve ${openE.length} komşusu olan ada ${shortName(i)} → her komşuya 2 köprü.`
              : `${islName(i)}: komşularına en fazla ${step.cap} köprü kurulabilir ve sayısı da ${n} → her komşuya mümkün olan en çok köprü kurulmalı.`;
          } else if (step.raised.length === openE.length && step.raised.every((c) => c.lo === 1 && step.before[c.e] === 0)) {
            msg += `${n} olan ve ${openE.length} komşusu olan ada ${shortName(i)}: komşulara en fazla ${step.cap} köprü kurulabilir; ${n} köprü gerektiği için her komşuya en az 1 köprü gider.`;
          } else {
            msg += `${islName(i)}: diğer yönlere en fazla ${other} köprü kurulabilir; ${n} köprü için işaretli yöne en az ${ch.lo} köprü gerekir.`;
          }
        }
        render();
        return { ok: true, message: msg + (hasWrong ? ' (Not: tahtada yanlış köprüler var.)' : '') };
      },
    };

    render();
    return {
      useBooster: (id) => (solved ? { ok: false } : boosters[id]?.() ?? { ok: false }),
      destroy: () => {
        document.removeEventListener('keydown', onKey);
        clearTimeout(solveTimer);
      },
    };
  },
};
