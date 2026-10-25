import { foldTree, SYMBOLS } from './logic.js';
import { netSVG, shapeSVG, chipSVG, cubeSVG, face } from './draw.js';

function ensureStyles() {
  if (document.getElementById('cubenet-css')) return;
  const link = document.createElement('link');
  link.id = 'cubenet-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cap = (s) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
const LETTERS = ['A', 'B', 'C', 'D'];
const TRY_AGAIN = ['Tekrar dene! Yapabilirsin 💪', 'Olmadı, bir daha bak! 🔍', 'Az kaldı, tekrar dene! 🙂'];
const PRAISE = ['Harika! 🎉', 'Süpersin! ⭐', 'Aferin! 👏', 'Çok güzel! 🌟'];

function prompt(q) {
  switch (q.t) {
    case 'isnet': return 'Hangisi katlandığında küp olur?';
    case 'opp': return 'Sarı çerçeveli yüzün karşısına hangi yüz gelir?';
    case 'fold': return 'Bu açılım katlanınca hangi küp oluşur?';
    case 'unfold': return 'Bu küp hangi açılımın katlanmasıyla oluşmuş olabilir?';
    case 'twoview': return `İki resimde aynı küp var. ${cap(SYMBOLS[q.x].name)} yüzünün karşısında hangi şekil var?`;
    default: return '';
  }
}

// CSS 3B katlama animasyonu: her kare, ebeveyninin içinde, ortak kenarı menteşe olacak
// şekilde iç içe yerleştirilir; "folded" sınıfıyla sırayla 90° katlanır.
function foldMarkup(net, S) {
  const { root, tree } = foldTree(net.c);
  const kids = net.c.map(() => []);
  tree.forEach((t, i) => { if (t.parent >= 0) kids[t.parent].push(i); });
  const order = [root];
  for (let k = 0; k < order.length; k++) order.push(...kids[order[k]]);
  const step = new Map(order.map((i, k) => [i, k]));
  const faceSvg = (i) => `<svg viewBox="0 0 100 100" width="${S}" height="${S}" aria-hidden="true">${face(net.f[i][0], net.f[i][1], { strokeW: 4 })}</svg>`;
  const el = (i) => {
    const t = tree[i];
    let style;
    if (t.parent >= 0) {
      const origin = t.dc === 1 ? '0 50%' : t.dc === -1 ? '100% 50%' : t.dr === 1 ? '50% 0' : '50% 100%';
      // Kâğıt bakandan uzağa (küpün içine doğru) katlanır.
      const fold = t.dc === 1 ? 'rotateY(90deg)' : t.dc === -1 ? 'rotateY(-90deg)' : t.dr === 1 ? 'rotateX(-90deg)' : 'rotateX(90deg)';
      style = `left:${t.dc * S}px;top:${t.dr * S}px;transform-origin:${origin};--fold:${fold};transition-delay:${(step.get(i) - 1) * 0.55}s`;
    } else {
      style = `left:${net.c[i][1] * S}px;top:${net.c[i][0] * S}px;--fold:none`;
    }
    return `<div class="cn-f3" style="${style}">${faceSvg(i)}${kids[i].map(el).join('')}</div>`;
  };
  const rows = Math.max(...net.c.map((x) => x[0])) + 1;
  const cols = Math.max(...net.c.map((x) => x[1])) + 1;
  const [r0, c0] = net.c[root];
  const dx = (cols / 2 - c0 - 0.5) * S, dy = (rows / 2 - r0 - 0.5) * S;
  return {
    html: `<div class="cn-stage" style="width:${cols * S}px;height:${rows * S}px;--S:${S}px;--dx:${dx}px;--dy:${dy}px;transform-origin:${(c0 + 0.5) * S}px ${(r0 + 0.5) * S}px ${-S / 2}px">${el(root)}</div>`,
    duration: (order.length - 1) * 0.55 + 0.8,
  };
}

export default {
  id: 'cubenet',
  name: 'Küp Açılımları',
  icon: '🎲',
  description: 'Kâğıt açılımları kafanda katla: hangisi küp olur, hangi yüz karşıya gelir, hangi küp oluşur?',
  rules: 'Her levelde birkaç soru var. Küp açılımı, katlanınca küp olan 6 karelik bir şekildir. Karşılıklı yüzler açılımda yan yana gelmez, aralarında bir kare olur; küpte karşılıklı iki yüz aynı anda görünmez. Zor sorularda şekillerin hangi yöne baktığı da önemlidir. Her sorunun tek bir doğru cevabı vardır.',
  howTo: [
    'Soruyu oku ve resme dikkatlice bak.',
    'Açılımı kafanda katla: ortadaki kareyi yere koy, kenardaki kareleri yukarı kaldır.',
    'Unutma: karşılıklı yüzler açılımda yan yana gelmez, aralarında bir kare olur.',
    'Doğru seçeneğe dokun. Yanlışsa üzülme, tekrar deneyebilirsin!',
    'Doğru cevaptan sonra nedenini oku ve "Devam" ile sonraki soruya geç.',
    'Takılırsan ✂️ Yarı Yarıya, 💡 İpucu ya da 📦 Katla sana yardım eder.',
  ],
  boosters: [
    { id: 'fifty', name: 'Yarı Yarıya', icon: '✂️', uses: 2, description: 'Yanlış seçeneklerin yarısını kaldırır.' },
    { id: 'hint', name: 'İpucu', icon: '💡', uses: 3, description: 'Cevabı söylemeden nasıl düşüneceğini anlatır.' },
    { id: 'fold', name: 'Katla', icon: '📦', uses: 2, description: 'Açılımı adım adım 3B katlar; seçenekli sorularda bir yanlış açılımı katlayıp eler.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const Q = level.questions;
    const ans = level.solution;
    let qi = 0;
    let state; // { removed:Set, tried:Set, done:bool, hinted:bool, folded:bool }
    let solved = false;
    let foldTimer = 0;

    container.innerHTML = `<div class="cubenet-game">
      <div class="cn-dots" aria-label="İlerleme"></div>
      <p class="cn-prompt"></p>
      <div class="cn-stim"></div>
      <div class="cn-foldbox" hidden></div>
      <div class="cn-opts" role="group" aria-label="Seçenekler"></div>
      <div class="cn-feedback" aria-live="polite"></div>
    </div>`;
    const root = container.querySelector('.cubenet-game');
    const $ = (s) => root.querySelector(s);
    const narrow = () => (root.clientWidth || 360) < 520;
    // Şekli seçenek kutusuna sığdıran kare boyu
    const fit = (cells, box, max) => {
      const span = Math.max(...cells.map((x) => x[0]), ...cells.map((x) => x[1])) + 1;
      return Math.min(max, Math.floor(box / span));
    };

    const optionHTML = (q, o) => {
      const w = narrow();
      switch (q.t) {
        case 'isnet': return shapeSVG(o, { cell: fit(o, w ? 140 : 190, w ? 30 : 40) });
        case 'opp': return chipSVG(q.net.f[o][0], w ? 64 : 76);
        case 'fold': return cubeSVG(o, { size: w ? 118 : 150 });
        case 'unfold': return netSVG(o, { cell: fit(o.c, w ? 150 : 250, w ? 44 : 62) });
        case 'twoview': return chipSVG(o, w ? 64 : 76);
        default: return '';
      }
    };
    const stimHTML = (q) => {
      const w = narrow();
      switch (q.t) {
        case 'isnet': return '<p class="cn-note">Her şekil 6 kareden oluşuyor. Kenarlardan katlayınca hangisi kapalı bir küp olur?</p>';
        case 'opp': return netSVG(q.net, { cell: w ? 62 : 74, hl: q.hl, label: 'Açılım; sarı çerçeveli yüz soruluyor' });
        case 'fold': return netSVG(q.net, { cell: w ? 62 : 74 });
        case 'unfold': return cubeSVG(q.view, { size: w ? 170 : 200 });
        case 'twoview': return `<div class="cn-two">${q.views.map((v, i) => `<figure>${cubeSVG(v, { size: w ? 140 : 180 })}<figcaption>${i + 1}. resim</figcaption></figure>`).join('')}</div>`;
        default: return '';
      }
    };

    const renderDots = () => {
      $('.cn-dots').innerHTML = Q.map((_, i) => `<span class="${i < qi || (i === qi && state.done) ? 'ok' : i === qi ? 'cur' : ''}"></span>`).join('')
        + `<b>Soru ${qi + 1} / ${Q.length}</b>`;
    };
    const renderOpts = () => {
      const q = Q[qi];
      $('.cn-opts').className = `cn-opts t-${q.t}`;
      $('.cn-opts').innerHTML = q.opts.map((o, i) => {
        const cls = ['cn-opt'];
        if (state.removed.has(i)) cls.push('removed');
        if (state.tried.has(i)) cls.push('wrong');
        if (state.done && i === ans[qi]) cls.push('right');
        const dis = state.removed.has(i) || state.tried.has(i) || state.done;
        return `<button class="${cls.join(' ')}" data-i="${i}" ${dis ? 'disabled' : ''} aria-label="Seçenek ${LETTERS[i]}"><span class="cn-letter">${LETTERS[i]}</span>${optionHTML(q, o)}</button>`;
      }).join('');
    };
    const closeFold = () => {
      clearTimeout(foldTimer);
      const box = $('.cn-foldbox');
      box.hidden = true;
      box.innerHTML = '';
    };
    const showQuestion = () => {
      state = { removed: new Set(), tried: new Set(), done: false, hinted: false, folded: false };
      closeFold();
      const q = Q[qi];
      $('.cn-prompt').textContent = prompt(q);
      $('.cn-stim').className = `cn-stim t-${q.t}`;
      $('.cn-stim').innerHTML = stimHTML(q);
      $('.cn-feedback').innerHTML = '';
      ctx.showHint('');
      renderDots();
      renderOpts();
    };

    const choose = (i) => {
      if (solved || state.done || state.removed.has(i) || state.tried.has(i)) return;
      const fb = $('.cn-feedback');
      if (i !== ans[qi]) {
        state.tried.add(i);
        renderOpts();
        const btn = root.querySelector(`.cn-opt[data-i="${i}"]`);
        btn?.classList.add('shake');
        fb.innerHTML = `<p class="cn-try">${TRY_AGAIN[state.tried.size % TRY_AGAIN.length]}</p>`;
        return;
      }
      state.done = true;
      renderOpts();
      renderDots();
      const last = qi === Q.length - 1;
      fb.innerHTML = `<div class="cn-explain"><p class="cn-praise">${PRAISE[qi % PRAISE.length]}</p><p>${esc(Q[qi].ex)}</p>
        <button class="btn primary cn-next" type="button">${last ? 'Bitir 🎉' : 'Devam →'}</button></div>`;
      fb.querySelector('.cn-next').focus({ preventScroll: true });
    };
    const next = () => {
      if (!state.done || solved) return;
      if (qi === Q.length - 1) {
        solved = true;
        root.classList.add('solved');
        $('.cn-next')?.setAttribute('disabled', '');
        setTimeout(ctx.onSolved, 250);
        return;
      }
      qi++;
      showQuestion();
      root.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    };

    const playFold = (net, caption) => {
      closeFold();
      const box = $('.cn-foldbox');
      const S = narrow() ? 58 : 70;
      const { html, duration } = foldMarkup(net, S);
      box.innerHTML = `<p class="cn-foldcap">${esc(caption)}</p><div class="cn-scene">${html}</div>
        <div class="cn-foldbtns"><button class="btn cn-refold" type="button">↻ Tekrar katla</button><button class="btn cn-closefold" type="button">Kapat</button></div>`;
      box.hidden = false;
      const stage = box.querySelector('.cn-stage');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        stage.classList.add('folded');
        foldTimer = setTimeout(() => stage.classList.add('spin'), duration * 1000);
      }));
      box.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    };

    const onClick = (e) => {
      const opt = e.target.closest('.cn-opt');
      if (opt) return choose(Number(opt.dataset.i));
      if (e.target.closest('.cn-next')) return next();
      if (e.target.closest('.cn-closefold')) return closeFold();
      if (e.target.closest('.cn-refold')) {
        const stage = root.querySelector('.cn-stage');
        if (!stage) return;
        clearTimeout(foldTimer);
        stage.classList.remove('folded', 'spin');
        void stage.offsetWidth;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          stage.classList.add('folded');
          foldTimer = setTimeout(() => stage.classList.add('spin'), 4000);
        }));
      }
    };
    root.addEventListener('click', onClick);

    const onKey = (e) => {
      if (solved || document.querySelector('.modal') || e.target.closest?.('input, textarea')) return;
      const k = e.key.toLowerCase();
      const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
      if (k in map && !state.done) { e.preventDefault(); choose(map[k]); }
      else if (k === 'enter' && state.done && !e.target.closest?.('button')) { e.preventDefault(); next(); }
    };
    document.addEventListener('keydown', onKey);

    const wrongLeft = () => Q[qi].opts.map((_, i) => i).filter((i) => i !== ans[qi] && !state.removed.has(i) && !state.tried.has(i));
    const busy = () => (solved || state.done ? { ok: false, message: 'Bu soruyu çözdün; "Devam" ile ilerle. (hak harcanmadı)' } : null);

    const boosters = {
      fifty() {
        const left = wrongLeft();
        if (left.length < 2) return { ok: false, message: 'Elenecek yeterli yanlış seçenek kalmadı. (hak harcanmadı)' };
        const drop = left.sort(() => Math.random() - 0.5).slice(0, Math.ceil(left.length / 2));
        drop.forEach((i) => state.removed.add(i));
        renderOpts();
        return { ok: true, message: `${drop.map((i) => LETTERS[i]).join(' ve ')} seçeneği elendi. ✂️` };
      },
      hint() {
        if (state.hinted) return { ok: false, message: `${Q[qi].hint} (Bu ipucu zaten gösterildi, hak harcanmadı.)` };
        state.hinted = true;
        return { ok: true, message: `💡 ${Q[qi].hint}` };
      },
      fold() {
        const q = Q[qi];
        if (q.t === 'fold' || q.t === 'opp') {
          if (state.folded) return { ok: false, message: 'Bu açılım zaten katlandı; "Tekrar katla" ile yeniden izleyebilirsin. (hak harcanmadı)' };
          state.folded = true;
          playFold(q.net, 'Açılımı adım adım katlıyoruz. Hangi yüzlerin karşı karşıya geldiğine dikkat et!');
          return { ok: true, message: '📦 Açılım katlanıyor. Kareleri tek tek izle.' };
        }
        if (q.t === 'isnet' || q.t === 'unfold') {
          const left = wrongLeft();
          if (!left.length) return { ok: false, message: 'Katlayıp elenecek yanlış seçenek kalmadı. (hak harcanmadı)' };
          const i = left[Math.floor(Math.random() * left.length)];
          state.removed.add(i);
          renderOpts();
          if (q.t === 'isnet') {
            const net = { c: q.opts[i], f: q.opts[i].map((_, k) => [['circle', 'square', 'plus', 'cross', 'ring', 'dots'][k], 0]) };
            playFold(net, `${LETTERS[i]} şeklini katlıyoruz: iki kare üst üste biniyor, bir yüz açık kalıyor. Bu şekil küp olmaz!`);
            return { ok: true, message: `📦 ${LETTERS[i]} şekli katlandı ve elendi: küp olmuyor.` };
          }
          playFold(q.opts[i], `${LETTERS[i]} açılımını katlıyoruz: oluşan küp resimdeki küpe uymuyor.`);
          return { ok: true, message: `📦 ${LETTERS[i]} açılımı katlandı ve elendi: resimdeki küp bundan çıkmıyor.` };
        }
        return { ok: false, message: 'Bu soruda katlanacak bir açılım yok; iki resimdeki ortak yüze odaklan. (hak harcanmadı)' };
      },
    };

    showQuestion();
    return {
      useBooster: (id) => busy() ?? boosters[id]?.() ?? { ok: false },
      destroy: () => {
        clearTimeout(foldTimer);
        document.removeEventListener('keydown', onKey);
        root.removeEventListener('click', onClick);
      },
    };
  },
};
