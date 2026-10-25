// Küp Açılımları — SVG çizimleri (açılım, izometrik küp, şekiller). Veriden üretilir.
import { SYMBOLS, DIRS } from './logic.js';

const PAPER = '#fffaf0';
const EDGE = '#3a3f4b';

// 100×100 kutuda, tepesi yukarı bakan sembol
export function symbol(s) {
  const C = SYMBOLS[s].color;
  switch (s) {
    case 'circle': return `<circle cx="50" cy="50" r="28" fill="${C}"/>`;
    case 'square': return `<rect x="24" y="24" width="52" height="52" rx="4" fill="${C}"/>`;
    case 'plus': return `<path d="M41 16h18v25h25v18H59v25H41V59H16V41h25z" fill="${C}"/>`;
    case 'cross': return `<path d="M41 16h18v25h25v18H59v25H41V59H16V41h25z" fill="${C}" transform="rotate(45 50 50)"/>`;
    case 'ring': return `<circle cx="50" cy="50" r="25" fill="none" stroke="${C}" stroke-width="11"/>`;
    case 'dots': return [[29, 29], [71, 29], [50, 50], [29, 71], [71, 71]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${C}"/>`).join('');
    case 'arrow': return `<path d="M50 10L82 46H61V88H39V46H18Z" fill="${C}"/>`;
    case 'tri': return `<polygon points="50,14 86,82 14,82" fill="${C}"/>`;
    case 'F': return `<path d="M29 14h44v15H46v13h23v15H46v29H29z" fill="${C}"/>`;
    case 'L': return `<path d="M31 14h17v57h27v15H31z" fill="${C}"/>`;
    case 'flag': return `<rect x="27" y="12" width="8" height="74" rx="2" fill="#6b4f2a"/><polygon points="35,13 80,27 35,43" fill="${C}"/><rect x="18" y="82" width="26" height="6" rx="2" fill="#6b4f2a"/>`;
    case 'half': return `<rect x="17" y="17" width="66" height="66" rx="3" fill="none" stroke="${C}" stroke-width="6"/><rect x="17" y="17" width="66" height="33" fill="${C}"/>`;
    default: return '';
  }
}

// Kare yüz (100×100): kâğıt zemin + döndürülmüş sembol
export function face(s, rot = 0, { hl = false, strokeW = 3 } = {}) {
  return `<rect x="0" y="0" width="100" height="100" fill="${PAPER}" stroke="${hl ? '#f0b429' : EDGE}" stroke-width="${hl ? 9 : strokeW}"/>`
    + `<g transform="rotate(${rot * 90} 50 50)">${symbol(s)}</g>`;
}

const svgOpen = (w, h, vb, label) => `<svg class="cn-svg" viewBox="${vb}" width="${w}" height="${h}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">`;

export function netSVG(net, { cell = 60, hl = -1, label = 'Küp açılımı' } = {}) {
  const rows = Math.max(...net.c.map((x) => x[0])) + 1;
  const cols = Math.max(...net.c.map((x) => x[1])) + 1;
  const pad = 6;
  const W = cols * 100 + 2 * pad, H = rows * 100 + 2 * pad;
  const order = net.c.map((_, i) => i).sort((a, b) => (a === hl) - (b === hl)); // vurgulu en üstte
  const body = order.map((i) => {
    const [r, c] = net.c[i];
    const [s, rot] = net.f[i];
    return `<g transform="translate(${pad + c * 100} ${pad + r * 100})" data-face="${i}">${face(s, rot, { hl: i === hl })}</g>`;
  }).join('');
  return `${svgOpen(cols * cell + 2 * pad * cell / 100, rows * cell + 2 * pad * cell / 100, `0 0 ${W} ${H}`, label)}${body}</svg>`;
}

export function shapeSVG(cells, { cell = 30 } = {}) {
  const rows = Math.max(...cells.map((x) => x[0])) + 1;
  const cols = Math.max(...cells.map((x) => x[1])) + 1;
  const pad = 4;
  const body = cells.map(([r, c]) => `<rect x="${pad + c * 100}" y="${pad + r * 100}" width="100" height="100" rx="6" class="cn-shape-cell"/>`).join('');
  return `${svgOpen(cols * cell, rows * cell, `0 0 ${cols * 100 + 2 * pad} ${rows * 100 + 2 * pad}`, 'Altı kareli şekil')}${body}</svg>`;
}

export function chipSVG(s, size = 64) {
  return `${svgOpen(size, size, '-4 -4 108 108', SYMBOLS[s].name)}${face(s, 0, { strokeW: 4 })}</svg>`;
}

// ---- İzometrik küp: görünen yüzler üst(+Z), sol(+X), sağ(+Y)
const C30 = Math.cos(Math.PI / 6);
const proj = (v) => [(v[1] - v[0]) * C30, (v[0] + v[1]) * 0.5 - v[2]];
const crossV = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const neg = (v) => v.map((x) => -x);
const dirIdx = (v) => DIRS.findIndex((d) => d.every((x, i) => x === v[i]));
const FACE_FRAMES = [
  { n: 4, R: [-1, 0, 0], shade: 0 },
  { n: 0, R: [0, 1, 0], shade: 0.1 },
  { n: 2, R: [-1, 0, 0], shade: 0.2 },
];
export function cubeSVG(view, { size = 150, label = 'Küp' } = {}) {
  const S = 50;
  const parts = FACE_FRAMES.map(({ n, R, shade }, i) => {
    const N = DIRS[n];
    const D = crossV(R, N);
    const O = N.map((x, k) => x - R[k] - D[k]);
    const [a, b] = proj(R.map((x) => (2 * x * S) / 100));
    const [c, d] = proj(D.map((x) => (2 * x * S) / 100));
    const [e, f] = proj(O.map((x) => x * S));
    const [s, up] = view[i];
    const k = [dirIdx(neg(D)), dirIdx(R), dirIdx(D), dirIdx(neg(R))].indexOf(up);
    const rot = k < 0 ? 0 : k;
    return `<g transform="matrix(${[a, b, c, d, e, f].map((x) => +x.toFixed(4)).join(' ')})">${face(s, rot, { strokeW: 3 })}`
      + (shade ? `<rect x="0" y="0" width="100" height="100" fill="#000" opacity="${shade}"/>` : '') + '</g>';
  }).join('');
  const w = 2 * C30 * S + 4, h = 2 * S + 4;
  return `${svgOpen(size, size * (h / w), `${-w} ${-h} ${2 * w} ${2 * h}`, label)}${parts}</svg>`;
}
