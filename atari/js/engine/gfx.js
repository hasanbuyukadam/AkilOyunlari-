// Düşük çözünürlüklü canvas için çizim yardımcıları.
import { drawText, textWidth, CHAR_H } from './font.js';

// Metin dizisinden sprite üretir.
// rows: ['..RR..', '.RRRR.'], palette: { R: '#e00' } — palette'te olmayan karakter şeffaftır.
export function makeSprite(rows, palette) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const col = palette[ch];
    if (col) {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }));
  return c;
}

// Aynı sprite'ı farklı renk paletiyle (ör. hayalet renkleri) üretmek için kısayol.
export function recolor(rows, palette, overrides) {
  return makeSprite(rows, { ...palette, ...overrides });
}

export function createGfx(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const W = canvas.width;
  const H = canvas.height;

  const gfx = {
    ctx,
    W,
    H,
    cls(color = '#000') {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, W, H);
    },
    rect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    },
    rectb(x, y, w, h, color) {
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, 1);
      ctx.fillRect(x, y + h - 1, w, 1);
      ctx.fillRect(x, y, 1, h);
      ctx.fillRect(x + w - 1, y, 1, h);
    },
    pset(x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    },
    // Piksel hassas çizgi (Bresenham)
    line(x0, y0, x1, y1, color) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      ctx.fillStyle = color;
      for (;;) {
        ctx.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    },
    // Dolu piksel daire
    circ(cx, cy, r, color) {
      cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
      ctx.fillStyle = color;
      for (let y = -r; y <= r; y++) {
        const w = Math.floor(Math.sqrt(r * r - y * y + r * 0.8));
        ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
      }
    },
    // Piksel daire çevresi
    circb(cx, cy, r, color) {
      cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
      ctx.fillStyle = color;
      let x = r, y = 0, err = 1 - r;
      while (x >= y) {
        for (const [px, py] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) {
          ctx.fillRect(cx + px, cy + py, 1, 1);
        }
        y++;
        if (err < 0) err += 2 * y + 1;
        else { x--; err += 2 * (y - x) + 1; }
      }
    },
    // opts: { align: 'left'|'center'|'right', scale, shadow: renk }
    text(str, x, y, color = '#fff', opts = {}) {
      const scale = opts.scale || 1;
      const w = textWidth(str, scale);
      if (opts.align === 'center') x -= Math.floor(w / 2);
      else if (opts.align === 'right') x -= w;
      if (opts.shadow) drawText(ctx, str, x + scale, y + scale, opts.shadow, scale);
      drawText(ctx, str, x, y, color, scale);
    },
    textWidth,
    textHeight: (scale = 1) => CHAR_H * scale,
    // opts: { flipX, flipY, scale, alpha }
    sprite(spr, x, y, opts = {}) {
      const s = opts.scale || 1;
      x = Math.round(x); y = Math.round(y);
      if (!opts.flipX && !opts.flipY && opts.alpha == null) {
        ctx.drawImage(spr, x, y, spr.width * s, spr.height * s);
        return;
      }
      ctx.save();
      if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
      ctx.translate(x + (opts.flipX ? spr.width * s : 0), y + (opts.flipY ? spr.height * s : 0));
      ctx.scale(opts.flipX ? -1 : 1, opts.flipY ? -1 : 1);
      ctx.drawImage(spr, 0, 0, spr.width * s, spr.height * s);
      ctx.restore();
    },
  };
  return gfx;
}
