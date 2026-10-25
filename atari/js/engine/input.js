// Klavye + dokunmatik gamepad + işaretçi (fare/dokunma) girişi.
// Mantıksal tuşlar: up, down, left, right, a, b, c, start, pause
export const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', Space: 'a', KeyJ: 'a',
  KeyX: 'b', KeyK: 'b',
  KeyC: 'c', KeyL: 'c',
  Enter: 'start',
  KeyP: 'pause', Escape: 'pause',
};

export class Input {
  constructor() {
    this.down = new Set(); // şu an basılı
    this.hits = new Set(); // son adımdan beri basılanlar (kısa dokunuşlar kaçmasın)
    this.ups = new Set();
    this._pressed = new Set();
    this._released = new Set();
    this.pointer = { x: 0, y: 0, down: false, pressed: false, released: false };
    this._pHit = false;
    this._pUp = false;
    this.lastKey = null; // isim girişi gibi metin ihtiyaçları için ham tuş
    this.enabled = true;
  }

  press(btn) {
    if (!this.down.has(btn)) this.hits.add(btn);
    this.down.add(btn);
  }

  release(btn) {
    if (this.down.has(btn)) this.ups.add(btn);
    this.down.delete(btn);
  }

  // Her sabit güncelleme adımının başında çağrılır.
  step() {
    this._pressed = this.hits;
    this._released = this.ups;
    this.hits = new Set();
    this.ups = new Set();
    this.pointer.pressed = this._pHit;
    this.pointer.released = this._pUp;
    this._pHit = false;
    this._pUp = false;
  }

  held(btn) { return this.down.has(btn); }
  pressed(btn) { return this._pressed.has(btn); }
  released(btn) { return this._released.has(btn); }
  // Yön kısayolları: -1/0/1
  get dx() { return (this.held('right') ? 1 : 0) - (this.held('left') ? 1 : 0); }
  get dy() { return (this.held('down') ? 1 : 0) - (this.held('up') ? 1 : 0); }

  clear() {
    this.down.clear();
    this.hits.clear();
    this.ups.clear();
    this._pressed = new Set();
    this._released = new Set();
    this.pointer.down = false;
  }

  attachKeyboard(target = window) {
    const onDown = (e) => {
      if (e.target instanceof HTMLInputElement) return;
      const btn = KEYMAP[e.code];
      this.lastKey = e.key;
      if (!btn) return;
      e.preventDefault();
      if (!e.repeat) this.press(btn);
    };
    const onUp = (e) => {
      const btn = KEYMAP[e.code];
      if (btn) this.release(btn);
    };
    const onBlur = () => this.clear();
    target.addEventListener('keydown', onDown);
    target.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }

  // Canvas üzerindeki fare/dokunmayı oyun koordinatına çevirir.
  attachPointer(canvas) {
    const pos = (e) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.x = Math.floor(((e.clientX - r.left) / r.width) * canvas.width);
      this.pointer.y = Math.floor(((e.clientY - r.top) / r.height) * canvas.height);
    };
    const onDown = (e) => {
      pos(e);
      this.pointer.down = true;
      this._pHit = true;
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => pos(e);
    const onUp = (e) => {
      pos(e);
      this.pointer.down = false;
      this._pUp = true;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
  }

  // data-btn="left" gibi öğelere sahip bir dokunmatik gamepad bağlar.
  // D-pad'de parmak kaydırınca yön değişebilsin diye pointermove ile yeniden hesaplanır.
  attachGamepad(root) {
    const active = new Map(); // pointerId -> Set(btn)
    const btnsAt = (x, y) => {
      const el = document.elementFromPoint(x, y)?.closest('[data-btn]');
      if (!el || !root.contains(el)) return new Set();
      return new Set(el.dataset.btn.split(' '));
    };
    const apply = (id, next) => {
      const prev = active.get(id) || new Set();
      for (const b of prev) if (!next.has(b)) this.release(b);
      for (const b of next) if (!prev.has(b)) this.press(b);
      active.set(id, next);
      root.querySelectorAll('[data-btn]').forEach((el) => {
        const on = el.dataset.btn.split(' ').every((b) => this.down.has(b));
        el.classList.toggle('on', on);
      });
    };
    root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      root.setPointerCapture?.(e.pointerId);
      apply(e.pointerId, btnsAt(e.clientX, e.clientY));
    });
    root.addEventListener('pointermove', (e) => {
      if (active.has(e.pointerId)) apply(e.pointerId, btnsAt(e.clientX, e.clientY));
    });
    const end = (e) => {
      apply(e.pointerId, new Set());
      active.delete(e.pointerId);
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}

// Önizleme / test için her zaman boş giriş.
export function nullInput() {
  const inp = new Input();
  inp.press = () => {};
  return inp;
}
