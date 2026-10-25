// Yılan — Nokia tarzı, yeşil LCD paleti.
export const meta = {
  id: 'yilan',
  width: 160,
  height: 144,
  buttons: { a: 'HIZLAN' },
  help: ['Yem: +10 puan, uzarsın.', 'Bonus böcek kısa süre görünür: hızlı yakalarsan daha çok puan.', 'Her 5 yemde hız artar.'],
};

const C0 = '#9bbc0f'; // LCD arka plan
const C1 = '#8bac0f';
const C2 = '#306230';
const C3 = '#0f380f'; // en koyu

const CELL = 6;
const COLS = 26;
const ROWS = 21;
const OX = 2;
const OY = 14;

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export default class Snake {
  constructor(api) {
    this.api = api;
    const cx = Math.floor(COLS / 2);
    const cy = Math.floor(ROWS / 2);
    this.body = [[cx, cy], [cx - 1, cy], [cx - 2, cy], [cx - 3, cy]];
    this.dir = [1, 0];
    this.queue = []; // aynı karede iki dönüş yapılabilsin diye yön kuyruğu
    this.timer = 0;
    this.speed = 9; // kaç karede bir adım
    this.eaten = 0;
    this.grow = 0;
    this.bonus = null;
    this.dead = 0;
    this.food = this.freeCell();
  }

  freeCell() {
    const taken = new Set(this.body.map(([x, y]) => `${x},${y}`));
    if (this.food) taken.add(`${this.food[0]},${this.food[1]}`);
    const free = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!taken.has(`${x},${y}`)) free.push([x, y]);
    return free.length ? this.api.pick(free) : null;
  }

  update() {
    const { input, sfx, preview } = this.api;
    if (this.dead) {
      if (--this.dead === 0) this.api.gameOver();
      return;
    }
    for (const [name, d] of Object.entries(DIRS)) {
      if (input.pressed(name)) this.queue.push(d);
    }
    // Önizlemede yılan kendi kendine yeme gitsin
    if (preview) this.autopilot();

    if (this.bonus && --this.bonus.t <= 0) this.bonus = null;

    const step = input.held('a') ? Math.max(2, Math.floor(this.speed / 2)) : this.speed;
    if (++this.timer < step) return;
    this.timer = 0;

    while (this.queue.length) {
      const d = this.queue.shift();
      if (d[0] !== -this.dir[0] || d[1] !== -this.dir[1]) {
        if (d[0] !== this.dir[0] || d[1] !== this.dir[1]) { this.dir = d; break; }
      }
    }

    const [hx, hy] = this.body[0];
    const nx = hx + this.dir[0];
    const ny = hy + this.dir[1];
    const tailMoves = this.grow === 0;
    const hitsSelf = this.body.some(([x, y], i) => x === nx && y === ny && !(tailMoves && i === this.body.length - 1));
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || hitsSelf) {
      this.dead = 60;
      sfx.play('die');
      return;
    }
    this.body.unshift([nx, ny]);
    if (this.grow > 0) this.grow--;
    else this.body.pop();

    if (this.food && nx === this.food[0] && ny === this.food[1]) {
      this.api.addScore(10);
      this.grow += 1;
      this.eaten++;
      sfx.play('blip');
      if (this.eaten % 5 === 0) {
        this.speed = Math.max(3, this.speed - 1);
        this.bonus = { pos: null, t: 300 };
        this.bonus.pos = this.freeCell();
      }
      this.food = null;
      this.food = this.freeCell();
    }
    if (this.bonus?.pos && nx === this.bonus.pos[0] && ny === this.bonus.pos[1]) {
      this.api.addScore(20 + Math.floor(this.bonus.t / 5));
      this.grow += 2;
      this.bonus = null;
      sfx.play('pickup');
    }
  }

  autopilot() {
    const [hx, hy] = this.body[0];
    const [fx, fy] = this.food || [hx, hy];
    const options = Object.values(DIRS).filter((d) => d[0] !== -this.dir[0] || d[1] !== -this.dir[1]);
    const safe = options.filter(([dx, dy]) => {
      const x = hx + dx, y = hy + dy;
      return x >= 0 && y >= 0 && x < COLS && y < ROWS && !this.body.some(([bx, by]) => bx === x && by === y);
    });
    safe.sort((a, b) => (Math.abs(hx + a[0] - fx) + Math.abs(hy + a[1] - fy)) - (Math.abs(hx + b[0] - fx) + Math.abs(hy + b[1] - fy)));
    if (safe[0]) this.queue = [safe[0]];
  }

  draw() {
    const { gfx, score, hiScore, frame } = this.api;
    gfx.cls(C0);
    // LCD piksel ızgarası hissi
    for (let y = 0; y < gfx.H; y += 2) gfx.rect(0, y, gfx.W, 1, C1);
    gfx.text(String(score).padStart(4, '0'), 4, 3, C3);
    gfx.text(`HI ${String(Math.max(hiScore, score)).padStart(4, '0')}`, gfx.W - 4, 3, C3, { align: 'right' });
    gfx.rect(0, OY - 3, gfx.W, 1, C3);
    gfx.rectb(OX - 2, OY - 2, COLS * CELL + 4, ROWS * CELL + 4, C3);

    const px = (x) => OX + x * CELL;
    const py = (y) => OY + y * CELL;

    if (this.food) {
      const [fx, fy] = this.food;
      gfx.rect(px(fx) + 2, py(fy), 2, 2, C3);
      gfx.rect(px(fx), py(fy) + 2, 2, 2, C3);
      gfx.rect(px(fx) + 4, py(fy) + 2, 2, 2, C3);
      gfx.rect(px(fx) + 2, py(fy) + 4, 2, 2, C3);
    }
    if (this.bonus?.pos && (this.bonus.t > 90 || frame % 10 < 6)) {
      const [bx, by] = this.bonus.pos;
      gfx.rect(px(bx) + 1, py(by) + 1, 4, 4, C2);
      gfx.rect(px(bx), py(by), 1, 1, C3);
      gfx.rect(px(bx) + 5, py(by), 1, 1, C3);
      gfx.rect(px(bx), py(by) + 5, 1, 1, C3);
      gfx.rect(px(bx) + 5, py(by) + 5, 1, 1, C3);
    }

    const flash = this.dead && Math.floor(this.dead / 6) % 2 === 0;
    if (!flash) {
      this.body.forEach(([x, y], i) => {
        gfx.rect(px(x), py(y), CELL - 1, CELL - 1, i === 0 ? C3 : C2);
        if (i > 0) gfx.rect(px(x) + 1, py(y) + 1, CELL - 3, CELL - 3, C3);
      });
      const [hx, hy] = this.body[0];
      // Göz
      const ex = this.dir[0] === 1 ? 3 : this.dir[0] === -1 ? 1 : 1;
      const ey = this.dir[1] === 1 ? 3 : this.dir[1] === -1 ? 1 : 1;
      gfx.pset(px(hx) + ex, py(hy) + ey, C0);
    }
  }
}
