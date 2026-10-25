import { unpack, decode } from './logic.js';
import {
  varyingAttrs, ruleLines, hintText, explainText, questionTitle, questionSub, shortLabel, ATTR_NAME, COLOR_NAME,
} from './describe.js';

function ensureStyles() {
  if (document.getElementById('patterns-css')) return;
  const link = document.createElement('link');
  link.id = 'patterns-css';
  link.rel = 'stylesheet';
  link.href = new URL('./style.css', import.meta.url).href;
  document.head.appendChild(link);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ------------------------------------------------------------------ SVG çizimi
const PALETTE = {
  red: ['#e53935', '#a61b1b'],
  blue: ['#1e88e5', '#0b4f9c'],
  green: ['#43a047', '#1b6420'],
  yellow: ['#fdd835', '#c99400'],
  purple: ['#8e44ad', '#5b2474'],
  orange: ['#fb8c00', '#b35900'],
};
const SIZE_F = [0.55, 0.77, 1];
const SLOTS = {
  1: [[50, 50]],
  2: [[29, 50], [71, 50]],
  3: [[50, 30], [29, 68], [71, 68]],
  4: [[32, 32], [68, 32], [32, 68], [68, 68]],
  5: [[31, 31], [69, 31], [50, 50], [31, 69], [69, 69]],
  6: [[27, 37], [50, 37], [73, 37], [27, 63], [50, 63], [73, 63]],
};
const SLOT_R = { 1: 31, 2: 18, 3: 15.5, 4: 15, 5: 11, 6: 10.5 };
const DOTS = [[11, 11], [89, 11], [89, 89], [11, 89]];
const SIDES = { triangle: 3, square: 4, pentagon: 5, hexagon: 6, heptagon: 7, octagon: 8 };
const f1 = (x) => Math.round(x * 10) / 10;
const pts = (list) => list.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');

function regular(cx, cy, R, n) {
  const start = -Math.PI / 2 + (n % 2 === 0 ? Math.PI / n : 0);
  return Array.from({ length: n }, (_, i) => {
    const a = start + (2 * Math.PI * i) / n;
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  });
}

function glyph(shape, cx, cy, R, rot, paint) {
  const rotAttr = rot ? ` transform="rotate(${rot} ${f1(cx)} ${f1(cy)})"` : '';
  switch (shape) {
    case 'circle': return `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R * 0.86)}" ${paint}/>`;
    case 'star': {
      const p = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (Math.PI * i) / 5;
        const r = i % 2 ? R * 0.47 : R * 1.05;
        return [cx + r * Math.cos(a), cy + 0.06 * R + r * Math.sin(a)];
      });
      return `<polygon points="${pts(p)}" ${paint}/>`;
    }
    case 'heart': {
      const s = R * 0.98, X = (x) => f1(cx + x * s), Y = (y) => f1(cy + y * s);
      return `<path d="M${X(0)} ${Y(0.85)} C${X(-1.15)} ${Y(0.05)} ${X(-0.8)} ${Y(-1.0)} ${X(0)} ${Y(-0.45)} C${X(0.8)} ${Y(-1.0)} ${X(1.15)} ${Y(0.05)} ${X(0)} ${Y(0.85)} Z" ${paint}/>`;
    }
    case 'arrow': {
      const P = [[0, -1], [0.78, -0.12], [0.3, -0.12], [0.3, 0.95], [-0.3, 0.95], [-0.3, -0.12], [-0.78, -0.12]];
      return `<polygon points="${pts(P.map(([x, y]) => [cx + x * R, cy + y * R]))}" ${paint}${rotAttr}/>`;
    }
    case 'triangle': {
      const p = regular(cx, cy + R * 0.12, R * 1.12, 3);
      return `<polygon points="${pts(p)}" ${paint} transform="rotate(${rot} ${f1(cx)} ${f1(cy)})"/>`;
    }
    default: {
      const n = SIDES[shape];
      return `<polygon points="${pts(regular(cx, cy, R * (n === 4 ? 0.98 : 1.02), n))}" ${paint}/>`;
    }
  }
}

export function tileSVG(t) {
  const [main, dark] = PALETTE[t.c];
  const R = SLOT_R[t.n] * SIZE_F[t.z];
  const sw = f1(Math.max(1.6, R * (t.f === 1 ? 0.2 : 0.11)));
  const paint = t.f === 0 ? `fill="${main}" stroke="${dark}" stroke-width="${sw}" stroke-linejoin="round"`
    : t.f === 1 ? `fill="none" stroke="${main}" stroke-width="${sw}" stroke-linejoin="round"`
      : `fill="url(#pt-stripe-${t.c})" stroke="${main}" stroke-width="${sw}" stroke-linejoin="round"`;
  const body = SLOTS[t.n].map(([x, y]) => glyph(t.s, x, y, R, t.r, paint)).join('');
  const dot = t.d >= 0 ? `<circle class="pt-dot" cx="${DOTS[t.d][0]}" cy="${DOTS[t.d][1]}" r="7"/>` : '';
  return `<svg viewBox="0 0 100 100" class="pt-svg" aria-hidden="true">${body}${dot}</svg>`;
}

const DEFS = `<svg class="pt-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>${Object.entries(PALETTE)
  .map(([k, [main]]) => `<pattern id="pt-stripe-${k}" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><rect width="7" height="7" fill="none"/><line x1="0" y1="0" x2="0" y2="7" stroke="${main}" stroke-width="4.2"/></pattern>`)
  .join('')}</defs></svg>`;

const LETTERS = ['A', 'B', 'C', 'D'];

export default {
  id: 'patterns',
  name: 'Şekil Örüntüleri',
  icon: '🔷',
  description: 'Şekillerin gizli kuralını keşfet: sıradaki şekil hangisi, boşluğa hangisi gelir?',
  rules: 'Her soruda şekiller bir kurala göre dizilmiştir: şekil, renk, boyut, sayı, boyama, yön ya da noktanın yeri belli bir düzenle değişir. Kuralı bul ve 4 seçenekten doğru olanı seç. Zor seviyede 3×3 tablolarda satırlar ve sütunlar kendi kurallarına uyar. Her sorunun tek bir doğru cevabı vardır; level, tüm soruları doğru cevaplayınca biter.',
  howTo: [
    'Şekillere dikkatle bak: renk, şekil, sayı, boyut ya da yön değişiyor olabilir.',
    'Neyin değiştiğini ve nasıl değiştiğini bul. Bu, dizinin gizli kuralıdır.',
    'Soru işaretli kutuya hangi şeklin geleceğini düşün ve alttaki 4 seçenekten birine dokun.',
    'Yanlış seçersen üzülme, tekrar deneyebilirsin. Doğru cevaptan sonra kuralın açıklamasını oku ve “Devam”a bas.',
    'Zor seviyede 3×3 tablo var: satırlara ve sütunlara ayrı ayrı bak.',
    'Takılırsan boosterları kullan: ✂️ Yarı Yarıya, 💡 İpucu ya da 🔎 Kuralı Göster.',
  ],
  boosters: [
    { id: 'fifty', name: 'Yarı Yarıya', icon: '✂️', uses: 2, description: 'Yanlış seçeneklerden ikisini kaldırır.' },
    { id: 'hint', name: 'İpucu', icon: '💡', uses: 3, description: 'Bu soruda hangi özelliklerin değiştiğini ve nereye bakman gerektiğini söyler.' },
    { id: 'rule', name: 'Kuralı Göster', icon: '🔎', uses: 2, description: 'Kuralı açıklar ve her kutunun değişen özelliğini etiketlerle gösterir.' },
  ],

  mount(container, level, ctx) {
    ensureStyles();
    const questions = level.questions.map(unpack);
    let qi = 0;
    let st; // soru durumu
    let finished = false;
    const timers = new Set();
    const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };

    container.innerHTML = `
      <div class="patterns-game">
        ${DEFS}
        <div class="pt-progress" aria-label="Soru ilerlemesi"></div>
        <div class="pt-head"><h2 class="pt-title"></h2><p class="pt-sub"></p></div>
        <div class="pt-board"></div>
        <div class="pt-rule" hidden></div>
        <div class="pt-options" role="group" aria-label="Seçenekler"></div>
        <div class="pt-feedback" aria-live="polite"></div>
      </div>`;
    const root = container.querySelector('.patterns-game');
    const $ = (sel) => root.querySelector(sel);
    const boardEl = $('.pt-board'), optsEl = $('.pt-options'), fbEl = $('.pt-feedback'), ruleEl = $('.pt-rule');

    const newState = () => ({ tried: new Set(), gone: new Set(), solved: false, labels: false, hinted: false, ruled: false });

    const renderProgress = () => {
      $('.pt-progress').innerHTML = questions.map((_, i) => {
        const cls = i < qi || (i === qi && st.solved) ? 'done' : i === qi ? 'cur' : '';
        return `<span class="pt-pdot ${cls}" title="${i + 1}. soru"></span>`;
      }).join('') + `<span class="pt-ptext">${qi + 1} / ${questions.length}</span>`;
    };

    const tags = (q, tile) => {
      if (!st.labels) return '';
      const vs = varyingAttrs(q);
      if (!tile) return `<div class="pt-tags">${vs.map((a) => `<span class="pt-tag t-${a}">?</span>`).join('')}</div>`;
      return `<div class="pt-tags">${vs.map((a) => {
        if (a === 'c') return `<span class="pt-tag t-c"><i style="background:${PALETTE[tile.c][0]}"></i>${COLOR_NAME[tile.c]}</span>`;
        return `<span class="pt-tag t-${a}">${esc(shortLabel(a, tile[a], q.rules[a]))}</span>`;
      }).join('')}</div>`;
    };

    const renderBoard = () => {
      const q = questions[qi];
      const cells = q.items.map((code, i) => {
        if (code) return `<div class="pt-cell">${tileSVG(decode(code))}${tags(q, decode(code))}</div>`;
        if (st.solved) return `<div class="pt-cell answer">${tileSVG(decode(q.answer))}${tags(q, decode(q.answer))}</div>`;
        return `<div class="pt-cell missing" aria-label="Boş kutu"><span>?</span>${tags(q, null)}</div>`;
      });
      if (q.kind === 'seq') {
        const L = q.L;
        const mob = L <= 6 ? 3 : L === 9 ? 5 : 4;
        boardEl.innerHTML = `<div class="pt-seq" style="--n:${L};--mob:${mob}">${cells.join('')}</div>`;
      } else {
        boardEl.innerHTML = `<div class="pt-mat">${cells.join('')}</div>`;
      }
    };

    const renderOptions = () => {
      const q = questions[qi];
      optsEl.innerHTML = q.options.map((code, i) => {
        const cls = ['pt-opt'];
        if (st.tried.has(i)) cls.push('wrong');
        if (st.gone.has(i)) cls.push('gone');
        if (st.solved && i === q.correct) cls.push('right');
        const dis = st.solved || st.tried.has(i) || st.gone.has(i);
        return `<button class="${cls.join(' ')}" data-i="${i}" ${dis ? 'disabled' : ''} aria-label="Seçenek ${LETTERS[i]}">${tileSVG(decode(code))}<span class="pt-key">${LETTERS[i]}</span></button>`;
      }).join('');
    };

    const renderRule = () => {
      const q = questions[qi];
      if (!st.ruled || st.solved) { ruleEl.hidden = true; ruleEl.innerHTML = ''; return; }
      ruleEl.hidden = false;
      ruleEl.innerHTML = `<b>🔎 Kural</b><ul>${ruleLines(q).map((l) => `<li><span class="pt-tag t-${l.attr}">${esc(ATTR_NAME[l.attr])}</span> ${esc(l.text)}</li>`).join('')}</ul>`;
    };

    const showQuestion = () => {
      st = newState();
      const q = questions[qi];
      $('.pt-title').textContent = questionTitle(q);
      $('.pt-sub').textContent = questionSub(q);
      fbEl.innerHTML = '';
      fbEl.className = 'pt-feedback';
      ctx.showHint('');
      renderProgress();
      renderBoard();
      renderRule();
      renderOptions();
    };

    const showExplanation = () => {
      const q = questions[qi];
      const { lines, answer } = explainText(q);
      const last = qi === questions.length - 1;
      fbEl.className = 'pt-feedback ok';
      fbEl.innerHTML = `
        <div class="pt-ok-title">✅ Doğru! Aferin!</div>
        <ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
        <p class="pt-answer">${esc(answer)}</p>
        <button class="btn primary pt-next" type="button">${last ? 'Bitir 🎉' : 'Devam →'}</button>`;
      fbEl.querySelector('.pt-next').focus({ preventScroll: true });
      later(() => fbEl.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }), 50);
    };

    const next = () => {
      if (!st.solved || finished) return;
      if (qi === questions.length - 1) { finished = true; fbEl.querySelector('.pt-next')?.setAttribute('disabled', ''); ctx.onSolved(); return; }
      qi++;
      showQuestion();
      root.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    };

    const choose = (i) => {
      const q = questions[qi];
      if (st.solved || finished || st.tried.has(i) || st.gone.has(i)) return;
      if (i === q.correct) {
        st.solved = true;
        ctx.showHint('');
        renderProgress();
        renderBoard();
        renderRule();
        renderOptions();
        showExplanation();
        return;
      }
      st.tried.add(i);
      renderOptions();
      boardEl.classList.remove('shake');
      void boardEl.offsetWidth;
      boardEl.classList.add('shake');
      fbEl.className = 'pt-feedback no';
      const n = st.tried.size;
      fbEl.innerHTML = n >= 2
        ? '<b>Tekrar dene!</b> Değişen her özelliğe tek tek bak. İstersen 💡 İpucu kullanabilirsin.'
        : '<b>Tekrar dene!</b> Kurala bir daha bak, sen yaparsın! 💪';
    };

    const onClick = (e) => {
      const opt = e.target.closest('.pt-opt');
      if (opt) { choose(Number(opt.dataset.i)); return; }
      if (e.target.closest('.pt-next')) next();
    };
    root.addEventListener('click', onClick);
    const onAnim = (e) => { if (e.animationName === 'pt-shake') boardEl.classList.remove('shake'); };
    boardEl.addEventListener('animationend', onAnim);

    const onKey = (e) => {
      if (finished || document.querySelector('.modal') || e.target.closest?.('input, textarea')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const idx = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }[k];
      if (idx !== undefined && !st.solved) { e.preventDefault(); choose(idx); }
      else if ((k === 'enter' || k === ' ') && st.solved && !e.target.closest?.('button, a')) { e.preventDefault(); next(); }
    };
    document.addEventListener('keydown', onKey);

    const boosters = {
      fifty() {
        const q = questions[qi];
        const wrongLeft = q.options.map((_, i) => i).filter((i) => i !== q.correct && !st.tried.has(i) && !st.gone.has(i));
        if (wrongLeft.length < 2) return { ok: false, message: 'Zaten en fazla iki seçenek kaldı. (hak harcanmadı)' };
        wrongLeft.sort(() => Math.random() - 0.5).slice(0, 2).forEach((i) => st.gone.add(i));
        renderOptions();
        return { ok: true, message: 'İki yanlış seçenek kaldırıldı. Kalan iki seçenekten hangisi kurala uyuyor?' };
      },
      hint() {
        if (st.hinted) return { ok: false, message: `${hintText(questions[qi])} (Bu ipucu zaten gösterildi, hak harcanmadı.)` };
        st.hinted = true;
        return { ok: true, message: `💡 ${hintText(questions[qi])}` };
      },
      rule() {
        if (st.ruled) return { ok: false, message: 'Kural zaten gösteriliyor. (hak harcanmadı)' };
        st.ruled = true;
        st.hinted = true; // kural, ipucunu da kapsar
        st.labels = true;
        renderBoard();
        renderRule();
        ruleEl.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        return { ok: true, message: 'Kural açıklandı; değişen özellikler kutuların altında etiketlerle gösteriliyor. Şimdi boşluğa ne gelmeli?' };
      },
    };

    showQuestion();
    return {
      useBooster(id) {
        if (finished) return { ok: false };
        if (st.solved) return { ok: false, message: 'Bu soruyu zaten çözdün! “Devam”a bas. (hak harcanmadı)' };
        return boosters[id]?.() ?? { ok: false };
      },
      destroy() {
        document.removeEventListener('keydown', onKey);
        root.removeEventListener('click', onClick);
        boardEl.removeEventListener('animationend', onAnim);
        timers.forEach(clearTimeout);
      },
    };
  },
};
