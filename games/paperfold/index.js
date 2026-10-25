import { decodeQuestion, foldStates, clipPoly, reflectPoint, unfoldHoles, sideOf, isNotch } from './logic.js';

function ensureStyles() {
  if (document.getElementById('paperfold-css')) return;
  const link = document.createElement('link');
  link.id = 'paperfold-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

// ---------------------------------------------------------------------------
// SVG çizim yardımcıları (koordinatlar logic.js ile aynı: hücre = 2 birim)
// ---------------------------------------------------------------------------

let uid = 0;
const LETTERS = ['A', 'B', 'C', 'D'];
const pts = (P) => P.map((p) => `${+p[0].toFixed(3)},${+p[1].toFixed(3)}`).join(' ');
const reduceMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function holeShape(h) {
  const [x, y, k] = h;
  if (k === 'o') return `<circle cx="${x}" cy="${y}" r="0.6"/>`;
  if (k === 's') return `<rect x="${x - 0.52}" y="${y - 0.52}" width="1.04" height="1.04" rx="0.08"/>`;
  const ux = h[3], uy = h[4], nx = -uy, ny = ux;
  const P = [[x + 0.72 * ux, y + 0.72 * uy], [x - 0.36 * ux + 0.62 * nx, y - 0.36 * uy + 0.62 * ny], [x - 0.36 * ux - 0.62 * nx, y - 0.36 * uy - 0.62 * ny]];
  return `<polygon points="${pts(P)}"/>`;
}

function gridLines(N) {
  let s = '';
  for (let v = 2; v < 2 * N; v += 2) s += `M${v} 0V${2 * N}M0 ${v}H${2 * N}`;
  return `<path class="pf-grid" d="${s}"/>`;
}

/** Bir kâğıt parçası: çokgen + ızgara + (parçaya kırpılmış) delikler. */
function paperLayer(N, P, holes, cls = '') {
  const id = `pfclip${++uid}`;
  return `<clipPath id="${id}"><polygon points="${pts(P)}"/></clipPath>
    <polygon class="pf-paper ${cls}" points="${pts(P)}"/>
    <g clip-path="url(#${id})">${gridLines(N)}<g class="pf-holes">${holes.map(holeShape).join('')}</g></g>
    <polygon class="pf-edge" points="${pts(P)}"/>`;
}

const ghost = (N) => `<rect class="pf-ghost" x="0" y="0" width="${2 * N}" height="${2 * N}"/>`;

function svgWrap(N, inner, label = '', margin = 1.3) {
  const s = 2 * N + 2 * margin;
  return `<svg class="pf-svg" viewBox="${-margin} ${-margin} ${s} ${s}" role="img" aria-label="${label}">${inner}</svg>`;
}

/** Katlama çizgisinin bölge içindeki parçası (biraz uzatılmış). */
function foldSegment(R, l) {
  const hits = [];
  for (let i = 0; i < R.length; i++) {
    const a = R[i], b = R[(i + 1) % R.length];
    const fa = sideOf(l, a), fb = sideOf(l, b);
    if (fa === 0) hits.push(a);
    else if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) {
      const t = fa / (fa - fb);
      hits.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  let best = [hits[0], hits[1] ?? hits[0]], bd = -1;
  for (const p of hits) for (const q of hits) {
    const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
    if (d > bd) { bd = d; best = [p, q]; }
  }
  const [p, q] = best, L = Math.sqrt(bd) || 1, ex = 0.7 / L;
  return [[p[0] - (q[0] - p[0]) * ex, p[1] - (q[1] - p[1]) * ex], [q[0] + (q[0] - p[0]) * ex, q[1] + (q[1] - p[1]) * ex]];
}

const centroid = (P) => [P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length];

function foldMarks(N, R, f) {
  const z = N / 4; // ok boyutu kâğıt boyutuyla ölçeklenir
  const [p, q] = foldSegment(R, f.l);
  const M = clipPoly(R, f.l, -f.s); // hareket eden kanat
  const c = centroid(M), r = reflectPoint(f.l, c);
  const len = Math.hypot(r[0] - c[0], r[1] - c[1]) || 1;
  const dir = [-f.l[1], f.l[0]], dl = Math.hypot(dir[0], dir[1]);
  const off = len * 0.45;
  const ctrl = [(c[0] + r[0]) / 2 + (dir[0] / dl) * off, (c[1] + r[1]) / 2 + (dir[1] / dl) * off];
  // ucu biraz kısalt, ok başı ekle
  const tx = r[0] - ctrl[0], ty = r[1] - ctrl[1], tl = Math.hypot(tx, ty) || 1;
  const ux = tx / tl, uy = ty / tl;
  const end = [r[0] - ux * 0.5 * z, r[1] - uy * 0.5 * z];
  const head = [[end[0] + ux * 0.8 * z, end[1] + uy * 0.8 * z], [end[0] - uy * 0.5 * z, end[1] + ux * 0.5 * z], [end[0] + uy * 0.5 * z, end[1] - ux * 0.5 * z]];
  return `<polygon class="pf-flapzone" points="${pts(M)}"/>
    <line class="pf-foldline" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>
    <path class="pf-arrow" d="M${c[0]} ${c[1]}Q${ctrl[0]} ${ctrl[1]} ${end[0]} ${end[1]}"/>
    <polygon class="pf-arrowhead" points="${pts(head)}"/>`;
}

/** Katlama adımlarını gösteren paneller (son panel: delik açılmış katlı kâğıt). */
function stepPanels(N, folds, punch, regions, mini = false) {
  const panels = folds.map((f, k) => {
    const inner = (k ? ghost(N) : '') + paperLayer(N, regions[k], []) + foldMarks(N, regions[k], f);
    return `<figure class="pf-panel">${svgWrap(N, inner, `${k + 1}. katlama`)}${mini ? '' : `<figcaption>${k + 1}. katla</figcaption>`}</figure>`;
  });
  const last = ghost(N) + paperLayer(N, regions[folds.length], punch, 'pf-stack');
  const punchPanel = `<figure class="pf-panel pf-punch">${svgWrap(N, last, 'Delik açılmış katlı kâğıt')}${mini ? '' : '<figcaption>Delik aç</figcaption>'}</figure>`;
  if (mini) return [...panels, punchPanel].join('<span class="pf-then" aria-hidden="true">›</span>');
  return `<div class="pf-folds" style="--k:${folds.length}">${panels.join('')}</div>${punchPanel}`;
}

const openPaper = (N, holes, label) => svgWrap(N, paperLayer(N, [[0, 0], [2 * N, 0], [2 * N, 2 * N], [0, 2 * N]], holes), label, 0.4);

// ---------------------------------------------------------------------------
// Katlama / açma animasyonu
// ---------------------------------------------------------------------------

function flapTransform(l, t) {
  const [a, b, c] = l, k = a * a + b * b;
  const p0 = [(a * c) / k, (b * c) / k];
  const th = (Math.atan2(a, -b) * 180) / Math.PI; // doğrunun yönü (−b, a)
  return `translate(${p0[0]} ${p0[1]}) rotate(${th}) scale(1 ${t.toFixed(4)}) rotate(${-th}) translate(${-p0[0]} ${-p0[1]})`;
}

/**
 * k. katlamanın açılması (dir=+1) ya da katlanması (dir=−1). holes: R_k üzerindeki (açık hâldeki) delikler.
 * Bir "iptal" belirteci döndürür.
 */
function animateStage(host, N, regions, folds, k, holes, dir, done) {
  const f = folds[k];
  const S = regions[k + 1];
  const M = clipPoly(regions[k], f.l, -f.s);
  const [p, q] = foldSegment(regions[k], f.l);
  host.innerHTML = svgWrap(N, `${ghost(N)}${paperLayer(N, S, holes)}
    <line class="pf-foldline" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>
    <g class="pf-flap">${paperLayer(N, M, holes)}</g>`, 'Kâğıt açılıyor');
  const flap = host.querySelector('.pf-flap');
  const dur = reduceMotion() ? 1 : 1100;
  let start = null, raf = 0, cancelled = false;
  const frame = (ts) => {
    if (cancelled) return;
    start ??= ts;
    const u = Math.min(1, (ts - start) / dur);
    const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    const t = dir > 0 ? -Math.cos(Math.PI * e) : Math.cos(Math.PI * e); // −1 (katlı) ↔ +1 (açık)
    flap.setAttribute('transform', flapTransform(f.l, t));
    flap.classList.toggle('back', t < 0);
    if (u < 1) raf = requestAnimationFrame(frame);
    else done?.();
  };
  flap.setAttribute('transform', flapTransform(f.l, dir > 0 ? -1 : 1));
  flap.classList.toggle('back', dir > 0);
  raf = requestAnimationFrame(frame);
  return () => { cancelled = true; cancelAnimationFrame(raf); };
}

/** Katları `from`'dan `to`'ya kadar sırayla açar; sonunda açık hâli sabit çizer. */
function playUnfold(host, N, folds, punch, from, to, onStep) {
  const regions = foldStates(N, folds);
  let cancel = null, timer = 0, stopped = false;
  const finalDraw = () => {
    const holes = unfoldHoles(punch, folds, folds.length, to);
    host.innerHTML = svgWrap(N, (to ? ghost(N) : '') + paperLayer(N, regions[to], holes), 'Açılmış kâğıt');
  };
  const run = (k) => {
    if (stopped) return;
    if (k < to) { finalDraw(); onStep?.(to, true); return; }
    const holes = unfoldHoles(punch, folds, folds.length, k);
    onStep?.(k, false);
    cancel = animateStage(host, N, regions, folds, k, holes, +1, () => { timer = setTimeout(() => run(k - 1), reduceMotion() ? 0 : 450); });
  };
  // önce katlı hâli kısa bir an göster
  host.innerHTML = svgWrap(N, ghost(N) + paperLayer(N, regions[from], unfoldHoles(punch, folds, folds.length, from)), 'Katlı kâğıt');
  timer = setTimeout(() => run(from - 1), reduceMotion() ? 0 : 500);
  return () => { stopped = true; clearTimeout(timer); cancel?.(); };
}

// ---------------------------------------------------------------------------
// Metinler
// ---------------------------------------------------------------------------

const WRONG = {
  forgot: 'Bu seçenekte bir katın açılması unutulmuş. Her kat açıldığında delik sayısı ikiye katlanır.',
  single: 'Kâğıt katlıyken delgeç bütün katları birlikte deler, yalnızca en üsttekini değil.',
  axis: 'Buradaki delikler yanlış çizgiye göre aynalanmış. Kesikli katlama çizgisine bak!',
  slide: 'Açılınca delikler yana kaymaz; katlama çizgisine göre ayna gibi yansır.',
  turn: 'Üçgenlerin yönüne dikkat: açılınca aynadaki gibi ters dönerler.',
  shift: 'Deliklerin yerine dikkatle bak: bu seçenekte desen bir kare kaymış.',
  mirror: 'Deliklerin kâğıdın hangi tarafında olduğuna dikkat et.',
  other: 'Bu katlamayla delinen kâğıt açılınca farklı bir desen çıkardı. Kartın altında nasıl göründüğüne bak.',
};

const powWord = (K) => 2 ** K;

function chainText(N, folds, punch) {
  const counts = [];
  for (let k = folds.length; k >= 0; k--) counts.push(unfoldHoles(punch, folds, folds.length, k).length);
  return counts.join(' → ');
}

function forwardExplain(q) {
  const K = q.folds.length;
  const total = unfoldHoles(q.punch, q.folds).length;
  let s = `Kâğıt ${K} kez katlandı, bu yüzden delgeç ${powWord(K)} kat kâğıdı birden deldi. `;
  s += `Kâğıdı açarken her katta delikler, katlama çizgisine göre ayna gibi kopyalanır: ${chainText(q.N, q.folds, q.punch)} delik.`;
  if (q.punch.some(isNotch)) s += ' Kat yerine açılan yarım delik açılınca tek bir tam daire oldu, bu yüzden o delik ikiye katlanmadı.';
  if (q.punch.some((h) => h[2] === 't')) s += ' Üçgenlerin ucu da aynadaki gibi ters yöne döndü.';
  if (K === 1 && total === 2) s = `Kâğıt bir kez katlandı, yani delgeç 2 kat kâğıdı deldi. Açınca ikinci delik, katlama çizgisine göre ilk deliğin tam ayna görüntüsünde olur.`;
  return s;
}

function forwardHint(q) {
  const K = q.folds.length;
  const total = unfoldHoles(q.punch, q.folds).length;
  let s = K === 1
    ? 'Kâğıt bir kez katlandı: iki kat kâğıt delindi, yani her delik 2 delik olur. Yeni delik, kesikli çizgiye göre ilk deliğin ayna görüntüsündedir.'
    : `Kâğıt ${K} kez katlandı, yani her delik ${powWord(K)} delik olur. Katları sondan başa doğru, birer birer aklında aç.`;
  if (q.punch.some(isNotch)) s += ' Kat yerindeki yarım delik açılınca tek bir tam delik olur.';
  if (q.punch.some((h) => h[2] === 't')) s += ' Üçgenler ayna gibi ters döner!';
  s += ` Açılmış kâğıtta toplam ${total} delik olmalı.`;
  return s;
}

function reverseHint(q) {
  const n = q.target.length;
  const K = q.options[q.answer].folds.length;
  return `Desende ${n} delik var. Her katlama delik sayısını ikiye katlar: tek bir delik ${n} delik olduysa kâğıt ${K} kez katlanmış olmalı. Deliklerin hangi çizgiye göre birbirinin aynası olduğuna bak.`;
}

// ---------------------------------------------------------------------------
// Oyun
// ---------------------------------------------------------------------------

export default {
  id: 'paperfold',
  name: 'Kâğıt Katlama',
  icon: '📄',
  description: 'Kâğıdı katla, delik aç ve açınca nasıl görüneceğini bul!',
  rules: 'Kare bir kâğıt kesikli çizgilerden adım adım katlanır, sonra katlı kâğıda delik açılır. Delgeç bütün katları birlikte deler. Kâğıt açılınca her delik katlama çizgisine göre ayna gibi kopyalanır. Dört seçenekten doğru olanı bul. Zor seviyede bazı sorular terstendir: delikli kâğıda bakıp hangi katlamayla yapıldığını bulursun.',
  howTo: [
    'Kâğıt, kesikli çizgiden okun gösterdiği yöne doğru katlanır.',
    'Son resimde katlı kâğıda delik açılır. Delgeç bütün katları birlikte deler!',
    'Kâğıt açılınca her delik, katlama çizgisine göre ayna gibi kopyalanır.',
    'Dört seçenekten açılmış kâğıdı doğru gösteren resmi seç.',
    'Doğru cevaptan sonra kâğıdın açılışını izle, sonra "Devam" ile sıradaki soruya geç.',
    'Takılırsan 👣 Adım Adım kâğıdı senin için bir kat açar.',
  ],
  boosters: [
    { id: 'half', name: 'Yarı Yarıya', icon: '✂️', uses: 2, description: 'Yanlış seçeneklerin yarısını kaldırır.' },
    { id: 'hint', name: 'İpucu', icon: '💡', uses: 3, description: 'Kaç delik olacağını ve nasıl düşüneceğini anlatır.' },
    { id: 'step', name: 'Adım Adım', icon: '👣', uses: 2, description: 'Kâğıdı bir kat açarak (ters sorularda bir kat katlayarak) gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const questions = level.questions.map(decodeQuestion);
    let qi = 0;
    let state = null; // geçerli sorunun durumu
    let stopAnim = null, stopHintAnim = null;
    let solved = false;

    container.innerHTML = `<div class="pf-game">
      <div class="pf-dots" aria-label="Sorular">${questions.map((_, i) => `<span class="pf-dot" data-i="${i}"></span>`).join('')}</div>
      <div class="pf-q"></div>
    </div>`;
    const root = container.querySelector('.pf-game');
    const qEl = root.querySelector('.pf-q');

    const stopAll = () => { stopAnim?.(); stopAnim = null; stopHintAnim?.(); stopHintAnim = null; };

    const renderDots = () => {
      root.querySelectorAll('.pf-dot').forEach((d, i) => {
        d.className = 'pf-dot' + (i < qi || (i === qi && state?.answered) ? ' done' : i === qi ? ' cur' : '');
      });
    };

    const renderQuestion = () => {
      stopAll();
      const q = questions[qi];
      state = { q, answered: false, removed: new Set(), tried: new Set(), hinted: false, steps: 0 };
      ctx.showHint('');
      if (q.t === 'f') {
        const regions = foldStates(q.N, q.folds);
        state.regions = regions;
        const K = q.folds.length;
        qEl.innerHTML = `
          <p class="pf-title">Kâğıt böyle katlanıp delindi. <b>Açınca nasıl görünür?</b></p>
          <div class="pf-steps${K === 1 ? ' k1' : ''}">${stepPanels(q.N, q.folds, q.punch, regions)}</div>
          <div class="pf-peek" hidden><p class="pf-peek-title">👣 Kâğıdı birlikte açalım:</p><div class="pf-peek-svg"></div></div>
          <div class="pf-options">${q.options.map((o, i) => `
            <button class="pf-opt" data-i="${i}" type="button" aria-label="Seçenek ${LETTERS[i]}">
              <span class="pf-letter">${LETTERS[i]}</span>${openPaper(q.N, o.holes, `Seçenek ${LETTERS[i]}`)}
            </button>`).join('')}</div>
          <div class="pf-feedback" aria-live="polite"></div>`;
      } else {
        const K = q.options[q.answer].folds.length;
        qEl.innerHTML = `
          <p class="pf-title">Bu delikli kâğıt <b>hangi katlamayla</b> elde edilir?</p>
          <div class="pf-target">${openPaper(q.N, q.target, 'Açılmış delikli kâğıt')}</div>
          <div class="pf-peek" hidden><p class="pf-peek-title">👣 Doğru katlamanın ilk adımı:</p><div class="pf-peek-svg"></div></div>
          <div class="pf-options pf-rev">${q.options.map((o, i) => `
            <button class="pf-opt pf-card" data-i="${i}" type="button" aria-label="Seçenek ${LETTERS[i]}">
              <span class="pf-letter">${LETTERS[i]}</span>
              <span class="pf-mini" style="--cols:${K + 1}">${stepPanels(q.N, o.folds, o.punch, foldStates(q.N, o.folds), true)}</span>
              <span class="pf-would" hidden></span>
            </button>`).join('')}</div>
          <div class="pf-feedback" aria-live="polite"></div>`;
      }
      renderDots();
    };

    const feedback = (html) => { qEl.querySelector('.pf-feedback').innerHTML = html; };

    const choose = (i) => {
      if (!state || state.answered || solved) return;
      if (state.removed.has(i) || state.tried.has(i)) return;
      const q = state.q;
      const btn = qEl.querySelector(`.pf-opt[data-i="${i}"]`);
      if (i !== q.answer) {
        state.tried.add(i);
        btn.classList.add('wrong', 'shake');
        btn.disabled = true;
        setTimeout(() => btn.classList.remove('shake'), 500);
        const o = q.options[i];
        feedback(`<p class="pf-bad"><b>Tekrar dene!</b> ${WRONG[o.kind] ?? ''}</p>`);
        if (q.t === 'r') {
          const would = btn.querySelector('.pf-would');
          const holes = unfoldHoles(o.punch, o.folds);
          would.innerHTML = `<span>Açılınca:</span>${openPaper(q.N, holes, 'Bu katlamanın sonucu')}`;
          would.hidden = false;
        }
        return;
      }
      state.answered = true;
      stopHintAnim?.(); stopHintAnim = null;
      qEl.querySelector('.pf-peek').hidden = true;
      btn.classList.add('ok');
      qEl.querySelectorAll('.pf-opt').forEach((b) => { if (b !== btn) { b.disabled = true; b.classList.add('dim'); } });
      renderDots();
      const last = qi === questions.length - 1;
      let text, N = q.N, folds, punch;
      if (q.t === 'f') { text = forwardExplain(q); folds = q.folds; punch = q.punch; }
      else {
        const o = q.options[q.answer];
        folds = o.folds; punch = o.punch;
        text = `Bu katlamada delgeç ${powWord(folds.length)} kat kâğıdı birden deler. Kâğıdı açtığımızda delikler katlama çizgilerine göre aynalanır ve tam bu desen çıkar.`;
        if (punch.some((h) => h[2] === 't')) text += ' Üçgenlerin yönleri de ayna gibi döner.';
      }
      ctx.showHint('');
      feedback(`
        <div class="pf-explain">
          <p class="pf-good"><b>Doğru! 🎉</b> ${text}</p>
          <div class="pf-anim"></div>
          <p class="pf-anim-cap" aria-live="polite"></p>
          <div class="pf-actions">
            <button class="btn pf-replay" type="button">↻ Tekrar izle</button>
            <button class="btn primary pf-next" type="button">${last ? 'Bitir 🎉' : 'Devam →'}</button>
          </div>
        </div>`);
      const animHost = qEl.querySelector('.pf-anim');
      const cap = qEl.querySelector('.pf-anim-cap');
      const play = () => {
        stopAnim?.();
        stopAnim = playUnfold(animHost, N, folds, punch, folds.length, 0, (k, end) => {
          cap.textContent = end ? `Kâğıt açıldı: ${unfoldHoles(punch, folds).length} delik!` : `${k + 1}. katı açıyoruz…`;
        });
      };
      play();
      qEl.querySelector('.pf-replay').addEventListener('click', play);
      qEl.querySelector('.pf-next').addEventListener('click', next);
      qEl.querySelector('.pf-explain').scrollIntoView?.({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' });
    };

    const next = () => {
      if (!state?.answered || solved) return;
      if (qi === questions.length - 1) {
        solved = true;
        stopAll();
        renderDots();
        ctx.onSolved();
        return;
      }
      qi++;
      renderQuestion();
      root.scrollIntoView?.({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
    };

    const onClick = (e) => {
      const btn = e.target.closest('.pf-opt');
      if (btn && root.contains(btn)) choose(Number(btn.dataset.i));
    };
    root.addEventListener('click', onClick);

    const onKey = (e) => {
      if (solved || document.querySelector('.modal') || e.target.closest?.('input, textarea')) return;
      const k = e.key.toLowerCase();
      const idx = ['1', '2', '3', '4'].indexOf(k) >= 0 ? Number(k) - 1 : ['a', 'b', 'c', 'd'].indexOf(k);
      if (idx >= 0 && !e.ctrlKey && !e.metaKey && !e.altKey) { choose(idx); return; }
      if ((e.key === 'Enter' || e.key === ' ') && state?.answered && !e.target.closest?.('button')) { e.preventDefault(); next(); }
    };
    document.addEventListener('keydown', onKey);

    const boosters = {
      half() {
        const q = state.q;
        const wrongs = [0, 1, 2, 3].filter((i) => i !== q.answer && !state.removed.has(i) && !state.tried.has(i));
        if (wrongs.length <= 1) return { ok: false, message: 'Kaldırılacak kadar yanlış seçenek kalmadı. (hak harcanmadı)' };
        const n = wrongs.length >= 3 ? 2 : 1;
        for (let r = 0; r < n; r++) {
          const pickI = wrongs.splice(Math.floor(Math.random() * wrongs.length), 1)[0];
          state.removed.add(pickI);
          const b = qEl.querySelector(`.pf-opt[data-i="${pickI}"]`);
          b.disabled = true;
          b.classList.add('removed');
        }
        return { ok: true, message: `${n} yanlış seçenek kaldırıldı. Kalanlardan doğrusunu bul!` };
      },
      hint() {
        const q = state.q;
        const msg = q.t === 'f' ? forwardHint(q) : reverseHint(q);
        if (state.hinted) return { ok: false, message: msg + ' (Bu ipucunu zaten aldın, hak harcanmadı.)' };
        state.hinted = true;
        return { ok: true, message: msg };
      },
      step() {
        const q = state.q;
        const peek = qEl.querySelector('.pf-peek');
        const host = peek.querySelector('.pf-peek-svg');
        const title = peek.querySelector('.pf-peek-title');
        if (q.t === 'f') {
          const K = q.folds.length;
          const maxSteps = Math.max(1, K - 1);
          if (state.steps >= maxSteps) return { ok: false, message: 'Daha fazla açarsak cevabı görürsün; gerisini sen yapabilirsin! (hak harcanmadı)' };
          const from = K - state.steps;
          state.steps++;
          peek.hidden = false;
          stopHintAnim?.();
          stopHintAnim = playUnfold(host, q.N, q.folds, q.punch, from, from - 1);
          const holes = unfoldHoles(q.punch, q.folds, K, from - 1).length;
          title.textContent = `👣 ${from}. katı açtık: şimdi ${holes} delik var.`;
          return { ok: true, message: from - 1 > 0 ? `Son katı açtık. Kâğıt hâlâ ${from - 1} kez katlı; kalan katları da aklında aç!` : 'Kâğıdı açtık! Şimdi aynı deseni seçeneklerde bul.' };
        }
        const o = q.options[q.answer];
        const K = o.folds.length;
        if (state.steps >= Math.max(1, K - 1)) return { ok: false, message: 'İlk katlamayı zaten gösterdik; gerisini sen bul! (hak harcanmadı)' };
        const k = state.steps;
        state.steps++;
        peek.hidden = false;
        stopHintAnim?.();
        const regions = foldStates(q.N, o.folds);
        const holes = unfoldHoles(o.punch, o.folds, K, k);
        let cancel = null;
        let timer = setTimeout(() => {
          cancel = animateStage(host, q.N, regions, o.folds, k, holes, -1, () => {
            host.innerHTML = svgWrap(q.N, ghost(q.N) + paperLayer(q.N, regions[k + 1], holes, 'pf-stack'), 'Katlanmış kâğıt');
          });
        }, 300);
        host.innerHTML = svgWrap(q.N, paperLayer(q.N, regions[k], holes), 'Delikli kâğıt');
        stopHintAnim = () => { clearTimeout(timer); cancel?.(); };
        title.textContent = '👣 Doğru katlamanın ilk adımı: delikler üst üste geliyor!';
        return { ok: true, message: 'Kâğıdı doğru seçenekteki ilk katlamayla katladık: kesikli çizginin iki yanındaki delikler tam üst üste geldi. Bu katlamayla başlayan seçeneklere bak!' };
      },
    };

    renderQuestion();
    return {
      useBooster: (id) => {
        if (solved || !state || state.answered) return { ok: false, message: 'Bu soru zaten çözüldü. (hak harcanmadı)' };
        return boosters[id]?.() ?? { ok: false };
      },
      destroy: () => {
        stopAll();
        document.removeEventListener('keydown', onKey);
        root.removeEventListener('click', onClick);
      },
    };
  },
};
