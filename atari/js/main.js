// Atari Salonu: menü (oyun kasetleri) ve oyun ekranı yönlendirmesi.
import { GAMES, byId } from './games.js';
import { Host, renderPreview } from './engine/host.js';
import { best } from './engine/scores.js';

const app = document.getElementById('app');
let host = null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (id) => import(`../games/${id}/game.js`);

function renderMenu() {
  document.body.classList.remove('playing');
  document.title = 'Atari Salonu';
  app.innerHTML = `
    <section class="hero">
      <h1 class="logo">ATARİ SALONU</h1>
      <p class="tag">90'ların efsane oyunları · ${GAMES.length} oyun · jeton gerekmez</p>
    </section>
    <ul class="carts">
      ${GAMES.map((g, i) => `
        <li>
          <a class="cart" href="#/oyun/${g.id}" style="--c:${g.color}" data-i="${i}">
            <div class="label">
              <canvas class="thumb" width="1" height="1" data-id="${g.id}"></canvas>
            </div>
            <div class="info">
              <h2>${esc(g.title)}</h2>
              <p class="style">${esc(g.style)}</p>
              <p class="hi">REKOR ${String(best(g.id)).padStart(6, '0')}</p>
            </div>
          </a>
        </li>`).join('')}
    </ul>
    <p class="foot">Klavye: ok tuşları + Z / X / C · Enter başla · P duraklat — Telefonda ekrandaki kumanda çıkar.</p>`;

  // Küçük resimleri sırayla üret (her oyunu birkaç saniye sessizce çalıştırır)
  const thumbs = [...app.querySelectorAll('canvas.thumb')];
  (async () => {
    for (const c of thumbs) {
      if (!c.isConnected) return;
      try {
        renderPreview(await load(c.dataset.id), c);
      } catch (err) {
        console.warn('Önizleme yok:', c.dataset.id, err);
        c.closest('.label').classList.add('noimg');
      }
      await new Promise((r) => setTimeout(r, 0));
    }
  })();

  // Klavye ile kaset seçimi
  const first = app.querySelector('.cart');
  if (first && matchMedia('(pointer: fine)').matches) first.focus({ preventScroll: true });
}

async function renderGame(id) {
  const entry = byId(id);
  if (!entry) { location.hash = '#/'; return; }
  document.body.classList.add('playing');
  document.title = `${entry.title} · Atari Salonu`;
  app.innerHTML = '<p class="loading">YÜKLENİYOR...</p>';
  let mod;
  try {
    mod = await load(id);
  } catch (err) {
    console.error(err);
    app.innerHTML = `<p class="loading">Bu oyun yüklenemedi.<br><a href="#/">◀ Menü</a></p>`;
    return;
  }
  if (location.hash !== `#/oyun/${id}`) return;
  host = new Host(app, entry, mod);
  host.start();
}

function route() {
  host?.destroy();
  host = null;
  const m = /^#\/oyun\/([\w-]+)/.exec(location.hash);
  if (m) renderGame(m[1]);
  else renderMenu();
  window.scrollTo(0, 0);
}

// Menüde ok tuşlarıyla kasetler arasında gezinme
window.addEventListener('keydown', (e) => {
  if (host || !e.key.startsWith('Arrow')) return;
  const carts = [...app.querySelectorAll('.cart')];
  if (!carts.length) return;
  const cur = carts.indexOf(document.activeElement);
  const cols = Math.max(1, Math.round(app.querySelector('.carts').clientWidth / carts[0].offsetWidth));
  const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.key];
  const next = carts[Math.min(carts.length - 1, Math.max(0, (cur < 0 ? 0 : cur + d)))];
  e.preventDefault();
  next.focus();
});

window.addEventListener('hashchange', route);
route();
