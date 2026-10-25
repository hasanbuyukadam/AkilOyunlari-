// Oyunu çalıştıran kabuk: canvas ölçekleme, 60 Hz sabit döngü, başlık / duraklatma /
// oyun sonu ekranları, yüksek skor girişi ve dokunmatik gamepad.
import { createGfx } from './gfx.js';
import { Input, nullInput } from './input.js';
import { sfx, silentSfx, unlockAudio, isMuted, setMuted } from './sfx.js';
import * as scores from './scores.js';

const STEP = 1000 / 60;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(6, '0');

// Oyunlara verilen API nesnesi
function makeApi({ meta, gfx, input, sound, preview, id, onGameOver }) {
  const api = {
    W: meta.width,
    H: meta.height,
    gfx,
    input,
    sfx: sound,
    meta,
    preview,
    frame: 0,
    _score: 0,
    get score() { return this._score; },
    set score(v) { this._score = Math.max(0, Math.floor(v)); },
    addScore(n) { this.score = this._score + n; },
    hiScore: preview ? 0 : scores.best(id),
    over: false,
    gameOver() {
      if (this.over) return;
      this.over = true;
      onGameOver?.();
    },
    rand: (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a)),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  };
  return api;
}

// Menü küçük resmi: oyunu sessiz ve girişsiz birkaç saniye çalıştırıp bir kare çizer.
export function renderPreview(mod, canvas, frames = 90) {
  const meta = mod.meta;
  canvas.width = meta.width;
  canvas.height = meta.height;
  const gfx = createGfx(canvas);
  const input = nullInput();
  const api = makeApi({ meta, gfx, input, sound: silentSfx, preview: true, id: meta.id });
  const game = new mod.default(api);
  for (let i = 0; i < frames && !api.over; i++) {
    input.step();
    game.update();
    api.frame++;
  }
  game.draw();
}

export class Host {
  constructor(root, entry, mod) {
    this.root = root;
    this.entry = entry;
    this.mod = mod;
    this.meta = mod.meta;
    this.id = entry.id;
    this.input = new Input();
    this.state = 'title';
    this.menuIndex = 0;
    this.raf = 0;
    this.build();
  }

  build() {
    const { meta, entry } = this;
    const btns = meta.buttons || { a: 'A', b: 'B' };
    const hasC = !!btns.c;
    this.root.innerHTML = `
      <div class="play">
        <div class="play-bar">
          <a href="#/" class="pbtn" title="Menüye dön">◀ MENÜ</a>
          <span class="play-title">${esc(entry.title)}</span>
          <span class="play-tools">
            <button class="pbtn" data-act="crt" title="CRT efekti">CRT</button>
            <button class="pbtn" data-act="mute" title="Ses (M)"></button>
            <button class="pbtn" data-act="pause" title="Duraklat (P)">❚❚</button>
          </span>
        </div>
        <div class="screen-wrap">
          <div class="screen">
            <canvas width="${meta.width}" height="${meta.height}"></canvas>
            <div class="scan"></div>
            <div class="overlay"></div>
          </div>
        </div>
        <div class="gamepad">
          <div class="dpad">
            <div data-btn="up left" class="d ul"></div><div data-btn="up" class="d u">▲</div><div data-btn="up right" class="d ur"></div>
            <div data-btn="left" class="d l">◀</div><div class="d c"></div><div data-btn="right" class="d r">▶</div>
            <div data-btn="down left" class="d dl"></div><div data-btn="down" class="d dn">▼</div><div data-btn="down right" class="d dr"></div>
          </div>
          <div class="mid">
            <div data-btn="start" class="small">START</div>
            <div data-btn="pause" class="small">DURAKLAT</div>
          </div>
          <div class="abtns ${hasC ? 'three' : ''}">
            ${hasC ? `<div data-btn="c" class="ab c"><span>C</span><small>${esc(btns.c)}</small></div>` : ''}
            ${btns.b ? `<div data-btn="b" class="ab b"><span>B</span><small>${esc(btns.b)}</small></div>` : ''}
            ${btns.a ? `<div data-btn="a" class="ab a"><span>A</span><small>${esc(btns.a)}</small></div>` : ''}
          </div>
        </div>
        <details class="help">
          <summary>Kontroller</summary>
          <ul>
            <li><b>Ok tuşları / WASD</b>: hareket</li>
            ${btns.a ? `<li><b>Z / Boşluk</b>: ${esc(btns.a)}</li>` : ''}
            ${btns.b ? `<li><b>X</b>: ${esc(btns.b)}</li>` : ''}
            ${btns.c ? `<li><b>C</b>: ${esc(btns.c)}</li>` : ''}
            <li><b>Enter</b>: başla &nbsp; <b>P / Esc</b>: duraklat &nbsp; <b>M</b>: ses</li>
            ${(meta.help || []).map((h) => `<li>${esc(h)}</li>`).join('')}
          </ul>
        </details>
      </div>`;

    this.canvas = this.root.querySelector('canvas');
    this.screen = this.root.querySelector('.screen');
    this.wrap = this.root.querySelector('.screen-wrap');
    this.overlay = this.root.querySelector('.overlay');
    this.gfx = createGfx(this.canvas);
    this.cleanupKeys = this.input.attachKeyboard();
    this.input.attachPointer(this.canvas);
    this.input.attachGamepad(this.root.querySelector('.gamepad'));

    this.root.querySelector('.play-tools').addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'mute') this.toggleMute();
      if (act === 'pause') this.togglePause();
      if (act === 'crt') this.toggleCrt();
    });
    this.onKey = (e) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'KeyM') this.toggleMute();
    };
    window.addEventListener('keydown', this.onKey);
    // Herhangi bir etkileşimde sesi aç
    this.unlock = () => unlockAudio();
    window.addEventListener('pointerdown', this.unlock);
    window.addEventListener('keydown', this.unlock);

    this.onResize = () => this.fit();
    window.addEventListener('resize', this.onResize);
    this.onVis = () => { if (document.hidden && this.state === 'play') this.setState('pause'); };
    document.addEventListener('visibilitychange', this.onVis);

    let crt = true;
    try { crt = localStorage.getItem('atari:crt') !== '0'; } catch { /* yok say */ }
    this.screen.classList.toggle('crt', crt);
    this.updateMuteBtn();
  }

  start() {
    this.newGame();
    this.setState('title');
    this.fit();
    requestAnimationFrame(() => this.fit());
    this.last = performance.now();
    this.acc = 0;
    const loop = (t) => {
      this.raf = requestAnimationFrame(loop);
      this.acc += Math.min(250, t - this.last);
      this.last = t;
      let steps = 0;
      while (this.acc >= STEP && steps < 5) {
        this.input.step();
        this.tick();
        this.acc -= STEP;
        steps++;
      }
      if (steps === 5) this.acc = 0;
      this.render();
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.cleanupKeys?.();
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('pointerdown', this.unlock);
    window.removeEventListener('keydown', this.unlock);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVis);
  }

  fit() {
    const { width: W, height: H } = this.meta;
    const r = this.wrap.getBoundingClientRect();
    const availW = r.width;
    const availH = Math.max(120, r.height);
    let s = Math.min(availW / W, availH / H);
    if (s >= 2) s = Math.floor(s);
    this.canvas.style.width = `${Math.floor(W * s)}px`;
    this.canvas.style.height = `${Math.floor(H * s)}px`;
  }

  newGame() {
    this.api = makeApi({
      meta: this.meta,
      gfx: this.gfx,
      input: this.input,
      sound: sfx,
      preview: false,
      id: this.id,
      onGameOver: () => { this.overTimer = 50; },
    });
    this.overTimer = -1;
    this.error = null;
    try {
      this.game = new this.mod.default(this.api);
    } catch (err) {
      this.fail(err);
    }
  }

  fail(err) {
    console.error(err);
    this.error = err;
    this.setState('error');
  }

  begin() {
    unlockAudio();
    this.input.clear();
    this.newGame();
    if (!this.error) this.setState('play');
  }

  tick() {
    const inp = this.input;
    switch (this.state) {
      case 'title':
        if (inp.pressed('start') || inp.pressed('a')) this.begin();
        break;
      case 'play':
        if (inp.pressed('pause')) { this.setState('pause'); break; }
        try {
          this.game.update();
          this.api.frame++;
        } catch (err) {
          this.fail(err);
          break;
        }
        if (this.overTimer > 0 && --this.overTimer === 0) this.finish();
        break;
      case 'pause':
        if (inp.pressed('pause')) { this.setState('play'); break; }
        this.navMenu();
        break;
      case 'over':
        this.navMenu();
        break;
      default:
        break;
    }
  }

  render() {
    if (this.state === 'error' || !this.game) return;
    try {
      this.game.draw();
    } catch (err) {
      this.fail(err);
    }
  }

  finish() {
    const score = this.api.score;
    this.lastScore = score;
    this.rank = -1;
    if (scores.qualifies(this.id, score)) this.setState('entry');
    else this.setState('over');
  }

  togglePause() {
    if (this.state === 'play') this.setState('pause');
    else if (this.state === 'pause') this.setState('play');
  }

  toggleMute() {
    setMuted(!isMuted());
    this.updateMuteBtn();
  }

  toggleCrt() {
    const on = !this.screen.classList.contains('crt');
    this.screen.classList.toggle('crt', on);
    try { localStorage.setItem('atari:crt', on ? '1' : '0'); } catch { /* yok say */ }
  }

  updateMuteBtn() {
    this.root.querySelector('[data-act="mute"]').textContent = isMuted() ? 'SES: KAPALI' : 'SES: AÇIK';
  }

  // Overlay içindeki [data-item] düğmeleri yön tuşlarıyla gezilir, A/Start ile seçilir.
  navMenu() {
    const items = [...this.overlay.querySelectorAll('[data-item]')];
    if (!items.length) return;
    const inp = this.input;
    if (inp.pressed('up') || inp.pressed('left')) this.menuIndex = (this.menuIndex + items.length - 1) % items.length;
    if (inp.pressed('down') || inp.pressed('right')) this.menuIndex = (this.menuIndex + 1) % items.length;
    items.forEach((el, i) => el.classList.toggle('sel', i === this.menuIndex));
    if (inp.pressed('a') || inp.pressed('start')) items[this.menuIndex].click();
  }

  scoreTable(highlight = -1) {
    const list = scores.getScores(this.id);
    if (!list.length) return '<p class="dim">Henüz skor yok</p>';
    return `<ol class="hs">${list.map((e, i) => `<li class="${i === highlight ? 'me' : ''}"><span>${i + 1}.</span><span>${esc(e.n)}</span><span>${pad(e.s)}</span></li>`).join('')}</ol>`;
  }

  setState(state) {
    this.state = state;
    this.menuIndex = 0;
    const o = this.overlay;
    o.className = 'overlay';
    const { entry } = this;
    switch (state) {
      case 'title':
        o.classList.add('show');
        o.innerHTML = `
          <h2 class="blink-title">${esc(entry.title)}</h2>
          <p class="dim">${esc(entry.style)} · ${esc(entry.year)}</p>
          <p class="desc">${esc(entry.desc)}</p>
          <h3>EN YÜKSEK SKORLAR</h3>
          ${this.scoreTable()}
          <button class="obtn sel" data-item>BAŞLA</button>
          <p class="blink">START / ENTER</p>`;
        o.querySelector('[data-item]').onclick = () => this.begin();
        break;
      case 'play':
        o.innerHTML = '';
        this.screen.focus?.();
        break;
      case 'pause':
        o.classList.add('show');
        o.innerHTML = `
          <h2>DURAKLATILDI</h2>
          <button class="obtn sel" data-item="resume">DEVAM</button>
          <button class="obtn" data-item="restart">YENİDEN BAŞLA</button>
          <button class="obtn" data-item="menu">MENÜYE DÖN</button>`;
        this.bindItems({ resume: () => this.setState('play'), restart: () => this.begin(), menu: () => { location.hash = '#/'; } });
        break;
      case 'entry': {
        o.classList.add('show');
        const name = scores.lastName();
        o.innerHTML = `
          <h2>YENİ REKOR!</h2>
          <p class="big">${pad(this.lastScore)}</p>
          <p>İSMİNİ GİR (3 HARF)</p>
          <form class="entry">
            <input maxlength="3" value="${esc(name)}" autocomplete="off" spellcheck="false" aria-label="İsim">
            <button class="obtn sel" type="submit">KAYDET</button>
          </form>`;
        const form = o.querySelector('form');
        const inputEl = o.querySelector('input');
        inputEl.addEventListener('input', () => {
          inputEl.value = inputEl.value.toLocaleUpperCase('tr-TR').replace(/[^A-ZÇĞİÖŞÜ0-9 ]/g, '');
        });
        form.onsubmit = (e) => {
          e.preventDefault();
          const n = (inputEl.value.trim() || 'AAA').toLocaleUpperCase('tr-TR').slice(0, 3);
          scores.rememberName(n);
          this.rank = scores.addScore(this.id, n, this.lastScore);
          inputEl.blur();
          this.setState('over');
        };
        // Dokunmatik cihazda klavye açılmasın diye sadece fare/klavye ortamında odakla
        if (matchMedia('(pointer: fine)').matches) setTimeout(() => { inputEl.focus(); inputEl.select(); }, 50);
        break;
      }
      case 'over':
        o.classList.add('show');
        o.innerHTML = `
          <h2>OYUN BİTTİ</h2>
          <p class="big">${pad(this.lastScore)}</p>
          ${this.scoreTable(this.rank)}
          <button class="obtn sel" data-item="again">TEKRAR OYNA</button>
          <button class="obtn" data-item="menu">MENÜYE DÖN</button>`;
        this.bindItems({ again: () => this.begin(), menu: () => { location.hash = '#/'; } });
        break;
      case 'error':
        o.classList.add('show');
        o.innerHTML = `<h2>HATA</h2><p class="desc">${esc(this.error?.message || this.error)}</p>
          <button class="obtn sel" data-item="again">YENİDEN DENE</button>`;
        this.bindItems({ again: () => this.begin() });
        break;
      default:
        break;
    }
  }

  bindItems(actions) {
    this.overlay.querySelectorAll('[data-item]').forEach((el) => {
      el.onclick = () => actions[el.dataset.item]?.();
    });
  }
}
