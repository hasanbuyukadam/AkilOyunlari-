import { CATEGORIES, loadAvailableGames, loadGame, loadLevels } from './core/registry.js';
import { DIFFICULTIES, LEVELS_PER_DIFFICULTY, starsFor } from './core/config.js';
import { getStars, setStars, isUnlocked, solvedCount } from './core/storage.js';

const app = document.getElementById('app');
let current = null; // aktif oyun örneği (temizlik için)

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

async function renderHome() {
  const entries = await loadAvailableGames();
  const total = DIFFICULTIES.length * LEVELS_PER_DIFFICULTY;
  const card = ({ game: g }) => {
    const done = DIFFICULTIES.reduce((s, d) => s + solvedCount(g.id, d.id), 0);
    return `
        <a class="game-card" href="#/${g.id}">
          <div class="game-icon">${g.icon}</div>
          <div>
            <h2>${esc(g.name)}</h2>
            <p>${esc(g.description)}</p>
            <div class="progress"><span style="width:${(done / total) * 100}%"></span></div>
            <small>${done} / ${total} level</small>
          </div>
        </a>`;
  };
  app.innerHTML = CATEGORIES.map((cat) => {
    const list = entries.filter((e) => e.category === cat.id);
    if (!list.length) return '';
    return `<h2 class="cat-title">${esc(cat.name)}</h2><div class="game-list">${list.map(card).join('')}</div>`;
  }).join('');
}

async function renderLevels(gameId, diffId) {
  const game = await loadGame(gameId);
  if (!game) return renderNotFound();
  const diff = DIFFICULTIES.find((d) => d.id === diffId) ?? DIFFICULTIES[0];
  app.innerHTML = `
    <a class="back" href="#/">← Oyunlar</a>
    <h1>${game.icon} ${esc(game.name)}</h1>
    <p class="muted">${esc(game.rules)}</p>
    <div class="tabs">
      ${DIFFICULTIES.map((d) => `
        <a class="tab ${d.id === diff.id ? 'active' : ''}" style="--c:${d.color}" href="#/${gameId}/${d.id}">
          ${d.name} <small>${solvedCount(gameId, d.id)}/${LEVELS_PER_DIFFICULTY}</small>
        </a>`).join('')}
    </div>
    <div class="level-grid">
      ${Array.from({ length: LEVELS_PER_DIFFICULTY }, (_, i) => {
        const n = i + 1;
        const open = isUnlocked(gameId, diff.id, n);
        const stars = getStars(gameId, diff.id, n);
        return open
          ? `<a class="level ${stars ? 'done' : ''}" style="--c:${diff.color}" href="#/${gameId}/${diff.id}/${n}">
               <b>${n}</b><span class="stars">${starText(stars)}</span></a>`
          : `<div class="level locked"><b>🔒</b><span>${n}</span></div>`;
      }).join('')}
    </div>
    <h3>Boosterlar</h3>
    <ul class="booster-info">
      ${game.boosters.map((b) => `<li><span>${b.icon}</span><b>${esc(b.name)}</b> — ${esc(b.description)} <small>(level başına ${b.uses} hak)</small></li>`).join('')}
    </ul>`;
}

async function renderPlay(gameId, diffId, levelNo) {
  const game = await loadGame(gameId);
  const diff = DIFFICULTIES.find((d) => d.id === diffId);
  if (!game || !diff || levelNo < 1 || levelNo > LEVELS_PER_DIFFICULTY) return renderNotFound();
  if (!isUnlocked(gameId, diffId, levelNo)) {
    toast('Bu level henüz kilitli.');
    location.hash = `#/${gameId}/${diffId}`;
    return;
  }
  const levels = await loadLevels(gameId);
  const level = levels[diffId][levelNo - 1];

  const uses = Object.fromEntries(game.boosters.map((b) => [b.id, b.uses]));
  let boostersUsed = 0;
  let finished = false;

  app.innerHTML = `
    <a class="back" href="#/${gameId}/${diffId}">← Levellere dön</a>
    <div class="play-head">
      <h1>${game.icon} ${esc(game.name)}</h1>
      <span class="badge" style="--c:${diff.color}">${diff.name} · Level ${levelNo}</span>
    </div>
    <div class="play-area">
      <div id="board" class="board-wrap"></div>
      <div class="boosters">
        ${game.boosters.map((b) => `
          <button class="booster" data-id="${b.id}" title="${esc(b.description)}">
            <span class="b-icon">${b.icon}</span>
            <span class="b-name">${esc(b.name)}</span>
            <span class="b-count" data-count="${b.id}">${b.uses}</span>
          </button>`).join('')}
      </div>
      <p id="hint" class="hint"></p>
    </div>`;

  const hintEl = document.getElementById('hint');
  const ctx = {
    toast,
    showHint: (msg) => { hintEl.textContent = msg ?? ''; },
    onSolved: () => {
      if (finished) return;
      finished = true;
      const stars = starsFor(boostersUsed);
      setStars(gameId, diffId, levelNo, stars);
      showWin(gameId, diffId, levelNo, stars);
    },
  };

  current = game.mount(document.getElementById('board'), level, ctx);

  app.querySelectorAll('.booster').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (finished) return;
      if (uses[id] <= 0) return toast('Bu boosterın hakkı bitti.');
      const res = current.useBooster(id) ?? { ok: false };
      if (res.message) ctx.showHint(res.message);
      if (!res.ok) return;
      uses[id]--;
      boostersUsed++;
      app.querySelector(`[data-count="${id}"]`).textContent = uses[id];
      btn.disabled = uses[id] <= 0;
    });
  });
}

function showWin(gameId, diffId, levelNo, stars) {
  const hasNext = levelNo < LEVELS_PER_DIFFICULTY;
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-box">
      <h2>Tebrikler! 🎉</h2>
      <div class="big-stars">${starText(stars)}</div>
      <p>${stars === 3 ? 'Hiç booster kullanmadan çözdün!' : 'Booster kullanmadan çözersen 3 yıldız alırsın.'}</p>
      <div class="modal-actions">
        <a class="btn" href="#/${gameId}/${diffId}">Levellere dön</a>
        ${hasNext ? `<a class="btn primary" href="#/${gameId}/${diffId}/${levelNo + 1}">Sonraki level →</a>` : ''}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => modal.remove()));
}

function renderNotFound() {
  app.innerHTML = `<p>Sayfa bulunamadı. <a href="#/">Ana sayfaya dön</a></p>`;
}

async function route() {
  current?.destroy?.();
  current = null;
  document.querySelectorAll('.modal').forEach((m) => m.remove());
  const [gameId, diffId, levelNo] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  try {
    if (!gameId) await renderHome();
    else if (!levelNo) await renderLevels(gameId, diffId);
    else await renderPlay(gameId, diffId, Number(levelNo));
  } catch (err) {
    console.error(err);
    app.innerHTML = `<p>Bir hata oluştu: ${esc(err.message)}</p>`;
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
