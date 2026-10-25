// Yol Savaşçısı — Road Fighter tarzı.
// Dikey kayan, genişliği ve virajları değişen yol; vites, yakıt, trafik, yağ lekesi, savrulma ve 4 farklı bölüm.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'yol-savascisi',
  width: 192,
  height: 224,
  buttons: { a: 'DÜŞÜK VİTES', b: 'YÜKSEK VİTES' },
  help: [
    'A basılı: düşük vites (çabuk hızlanır, en fazla 200 km/s). B basılı: yüksek vites (400 km/s\'ye kadar).',
    'Sol/Sağ: direksiyon. Aşağı: fren. Yol kenarına veya kamyona çarparsan araba patlar, zaman kaybedersin.',
    'Yakıt sürekli azalır: yanıp sönen renkli arabaya dokun, yakıt al. Yakıt biterse oyun biter.',
    'Yağ lekesi ve yandan çarpma arabayı savurur: ters direksiyonla toparla!',
  ],
};

const W = 192;
const H = 224;
const FW = 144; // oyun alanı genişliği
const PLAYER_SY = 168; // oyuncu arabasının ekrandaki üst kenarı
const CAR_W = 12;
const CAR_H = 16;
const MAX_LOW = 200;
const MAX_HIGH = 400;
const KMH = 1 / 60; // km/s -> piksel/kare

const STAGES = [
  { name: 'ÇAYIR', len: 11000, ground: ['#2c8c2c', '#38a038'], deco: 'tree', minHalf: 26, maxHalf: 52, traffic: 1.0 },
  { name: 'DENİZ KÖPRÜSÜ', len: 12000, ground: ['#1838b0', '#2048c0'], deco: 'sea', minHalf: 22, maxHalf: 34, traffic: 1.2 },
  { name: 'ORMAN', len: 13000, ground: ['#105810', '#186818'], deco: 'forest', minHalf: 22, maxHalf: 46, traffic: 1.45 },
  { name: 'ÇÖL', len: 14000, ground: ['#d0a050', '#dcb060'], deco: 'desert', minHalf: 20, maxHalf: 50, traffic: 1.7 },
];

// --- Sprite'lar ---
const rotRows = (rows) => {
  const h = rows.length, w = rows[0].length;
  const out = [];
  for (let x = 0; x < w; x++) {
    let r = '';
    for (let y = h - 1; y >= 0; y--) r += rows[y][x];
    out.push(r);
  }
  return out;
};
const CAR_ROWS = [
  '...CCCCCC...',
  '..CCYCCYCC..',
  'KKCCCCCCCCKK',
  'KKCCWWWWCCKK',
  'KKCWBBBBWCKK',
  '..CWBBBBWC..',
  '..CCCCCCCC..',
  '..CCDDDDCC..',
  '..CCDDDDCC..',
  '..CCCCCCCC..',
  'KKCWBBBBWCKK',
  'KKCCWWWWCCKK',
  'KKCCCCCCCCKK',
  '..CCCCCCCC..',
  '..RCCCCCCR..',
  '...CCCCCC...',
];
const PLAYER_ROWS = [
  '....CCCC....',
  '...CCYYCC...',
  'KK.CCCCCC.KK',
  'KKCCCCCCCCKK',
  'KKCCCCCCCCKK',
  '..CCWWWWCC..',
  '..CWBBBBWC..',
  '..CCKWWKCC..',
  '..CCKKKKCC..',
  '..CCCCCCCC..',
  'KKCWWWWWWCKK',
  'KKCCCCCCCCKK',
  'KKCCCWWCCCKK',
  '..CCCCCCCC..',
  '..RCCCCCCR..',
  '...CCCCCC...',
];
const TRUCK_ROWS = [
  '...CCCCCC...',
  '..CCYCCYCC..',
  'KKCWBBBBWCKK',
  'KKCCCCCCCCKK',
  '..CCCCCCCC..',
  '...KKKKKK...',
  'KKSSSSSSSSKK',
  'KKSWWWWWWSKK',
  '..SWWWWWWS..',
  '..SWWWWWWS..',
  '..SWWWWWWS..',
  '..SWWWWWWS..',
  '..SWWWWWWS..',
  '..SWWWWWWS..',
  '..SWWWWWWS..',
  '..SWWWWWWS..',
  '..SWWWWWWS..',
  '..SWWWWWWS..',
  '..SWWWWWWS..',
  'KKSWWWWWWSKK',
  'KKSWWWWWWSKK',
  'KKSSSSSSSSKK',
  'KKSWWWWWWSKK',
  'KKSWWWWWWSKK',
  '..SSSSSSSS..',
  '..R......R..',
];
const PAL = { K: '#1c1c1c', W: '#fcfcfc', B: '#3058b8', Y: '#fcfc80', R: '#fc3c3c', D: '#0c0c0c', S: '#7c7c7c' };
function carSet(rows, color, extra = {}) {
  const out = [];
  let r = rows;
  for (let i = 0; i < 4; i++) {
    out.push(makeSprite(r, { ...PAL, C: color, ...extra }));
    r = rotRows(r);
  }
  return out;
}
const SPR = {
  player: carSet(PLAYER_ROWS, '#e82020', { D: '#a00000' }),
  playerBurnt: makeSprite(PLAYER_ROWS, { ...PAL, C: '#3c3c3c', W: '#5c5c5c', B: '#1c1c1c', Y: '#fc8c00', R: '#fc3c00', D: '#1c1c1c' }),
  yellow: makeSprite(CAR_ROWS, { ...PAL, C: '#f0d000', D: '#a08000' }),
  red: makeSprite(CAR_ROWS, { ...PAL, C: '#e0509c', D: '#90205c' }),
  blue: makeSprite(CAR_ROWS, { ...PAL, C: '#2c7cfc', D: '#0c3c9c' }),
  truck: makeSprite(TRUCK_ROWS, { ...PAL, C: '#2c9c2c', W: '#e8e8e8' }),
  fuel: ['#fc3c3c', '#fcd800', '#3cfc3c', '#3cd8fc', '#fc5cfc'].map((c) => makeSprite(CAR_ROWS, { ...PAL, C: c, D: '#fcfcfc' })),
};
const OIL = makeSprite([
  '...KKKKK....',
  '.KKKKKKKKK..',
  'KKKSKKKKKKK.',
  'KKKKKKKSKKKK',
  '.KKKKKKKKKK.',
  '..KKKKKKKK..',
  '....KKK.....',
], { K: '#101018', S: '#5c5c7c' });
const TREE = makeSprite([
  '....GGGG....',
  '..GGLLGGGG..',
  '.GGLLGGGGGG.',
  'GGLGGGGGGDGG',
  'GGGGGGGGGDGG',
  'GGGGGGGGDDGG',
  '.GGGGGGDDGG.',
  '..GGDDDDGG..',
  '....GDDG....',
  '.....TT.....',
  '.....TT.....',
], { G: '#1c7c1c', L: '#5cc85c', D: '#0c4c0c', T: '#7c4c1c' });
const PINE = makeSprite([
  '....D...',
  '...DGD..',
  '..DGGGD.',
  '...DGD..',
  '..DGLGD.',
  '.DGGGGGD',
  '..DGGGD.',
  '.DGGLGGD',
  'DGGGGGGG',
  '...TT...',
], { G: '#0c6c2c', L: '#3cac5c', D: '#043c14', T: '#5c3c1c' });
const BUSH = makeSprite([
  '.GGG.GG.',
  'GLGGGLGG',
  'GGGGGGGD',
  '.GDGDGD.',
], { G: '#2ca02c', L: '#7ce07c', D: '#106010' });
const CACTUS = makeSprite([
  '...GG...',
  '...GL...',
  'G..GL...',
  'GL.GL..G',
  'GL.GL.GL',
  'GGGGL.GL',
  '...GLGGL',
  '...GL...',
  '...GL...',
  '..DDDD..',
], { G: '#2c8c2c', L: '#5cc85c', D: '#a07838' });
const ROCK = makeSprite([
  '..RRRR..',
  '.RLLRRR.',
  'RLRRRRRD',
  'RRRRRDDD',
  '.DDDDDD.',
], { R: '#a07040', L: '#d0a070', D: '#704820' });
const WAVE = makeSprite([
  '.WW.....',
  'W..W..W.',
  '.....W..',
], { W: '#6c9cfc' });
const BOAT = makeSprite([
  '...W....',
  '...WW...',
  '...WWW..',
  '...W....',
  'BBBBBBBB',
  '.BBBBBB.',
], { W: '#fcfcfc', B: '#c83c00' });

function hash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
const smooth = (t) => t * t * (3 - 2 * t);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function buildRoad(stageIdx, loop) {
  const st = STAGES[stageIdx];
  const pts = [{ d: -400, c: FW / 2, h: 44 }, { d: 300, c: FW / 2, h: 44 }];
  let d = 300;
  let k = stageIdx * 100 + loop * 1000 + 7;
  const narrow = Math.min(8, loop * 4);
  while (d < st.len + 600) {
    d += 450 + hash(k++) * 650;
    const h = clamp(st.minHalf - narrow / 2 + hash(k++) * (st.maxHalf - st.minHalf), 18, 56);
    const c = clamp(FW / 2 + (hash(k++) - 0.5) * 2 * (FW / 2 - h - 6), h + 4, FW - h - 4);
    pts.push({ d, c, h });
  }
  // Bitiş çizgisinde düz ve geniş yol
  pts.push({ d: st.len - 200, c: FW / 2, h: 44 });
  pts.push({ d: st.len + 2000, c: FW / 2, h: 44 });
  pts.sort((a, b) => a.d - b.d);
  return pts;
}

export default class RoadFighter {
  constructor(api) {
    this.api = api;
    this.stage = 0;
    this.loop = 0;
    this.fuel = 100;
    this.particles = [];
    this.startStage();
    if (api.preview) {
      this.dist = 900;
      this.player.speed = 300;
      this.banner = null;
      this.player.x = this.roadAt(this.dist + 8).c;
      for (let i = 0; i < 6; i++) this.spawnCar(this.dist + 30 + i * 40);
    }
  }

  startStage() {
    this.road = buildRoad(this.stage, this.loop);
    this.roadIdx = 0;
    this.dist = 0;
    this.nextScoreD = 40;
    this.cars = [];
    this.nextSpawn = 220;
    this.nextFuel = 1800;
    this.nextOil = 1400;
    this.player = { x: FW / 2, speed: 0, slide: 0, spin: 0, crash: 0, inv: 0, gear: 'L' };
    this.state = 'play';
    this.goalT = 0;
    const st = STAGES[this.stage];
    this.banner = { lines: [`BÖLÜM ${this.stage + 1 + this.loop * 4}`, st.name, 'HAZIR!'], t: 110 };
    this.drainEvery = Math.max(22, 38 - this.stage * 3 - this.loop * 6);
  }

  get st() { return STAGES[this.stage]; }

  roadAt(d) {
    const pts = this.road;
    // Kısa arama (mesafe sürekli artar)
    let i = this.roadIdx;
    while (i > 0 && pts[i].d > d) i--;
    while (i < pts.length - 2 && pts[i + 1].d <= d) i++;
    const a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)];
    const t = b.d > a.d ? smooth(clamp((d - a.d) / (b.d - a.d), 0, 1)) : 0;
    return { c: a.c + (b.c - a.c) * t, h: a.h + (b.h - a.h) * t, i };
  }

  spawnCar(d) {
    const { api } = this;
    const traffic = this.st.traffic + this.loop * 0.4;
    const r = Math.random();
    let type = 'yellow';
    if (this.stage === 0 && this.loop === 0) {
      if (r < 0.2) type = 'red';
      else if (r < 0.3) type = 'truck';
    } else if (r < 0.22) type = 'red';
    else if (r < 0.22 + 0.08 * traffic) type = 'blue';
    else if (r < 0.34 + 0.08 * traffic) type = 'truck';
    const lanePos = api.pick([-0.7, -0.25, 0.25, 0.7]);
    // Aynı yerde başka araba varsa çık
    for (const c of this.cars) if (Math.abs(c.d - d) < 34 && Math.abs(c.u - lanePos) < 0.4) return;
    const speed = type === 'truck' ? api.rand(1.6, 2.2) : api.rand(2.2, 3.4);
    this.cars.push({ type, d, u: lanePos, tu: lanePos, speed, t: 0, h: type === 'truck' ? 26 : CAR_H, swerved: false, drift: api.rand(0, 6.28) });
  }

  carX(car) {
    const r = this.roadAt(car.d + car.h / 2);
    return r.c + car.u * Math.max(0, r.h - 8) - CAR_W / 2;
  }

  crash() {
    const p = this.player;
    if (p.crash || p.inv) return;
    p.crash = 1;
    p.speed = 0;
    p.spin = 0;
    p.slide = 0;
    this.api.sfx.play('explode');
    for (let i = 0; i < 24; i++) {
      this.particles.push({ x: p.x, y: PLAYER_SY + 8, vx: this.api.rand(-1.5, 1.5), vy: this.api.rand(-1.5, 1.5), life: this.api.randInt(20, 45), col: this.api.pick(['#fc3c00', '#fcd800', '#fcfcfc', '#7c7c7c']) });
    }
  }

  spinOut(dir, power = 1.6) {
    const p = this.player;
    if (p.crash || p.inv) return;
    if (!p.spin) this.api.sfx.tone(900, 0.5, { slide: 200, type: 'sawtooth', vol: 0.06 });
    p.spin = 48;
    p.slide = dir * power;
    p.speed *= 0.8;
  }

  update() {
    const { input, preview, sfx } = this.api;
    const p = this.player;
    for (const pt of this.particles) { pt.x += pt.vx; pt.y += pt.vy; pt.life--; }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    if (this.banner && --this.banner.t <= 0) this.banner = null;
    if (this.flash && --this.flash.t <= 0) this.flash = null;

    if (this.state === 'over') {
      p.speed = Math.max(0, p.speed - 3);
      this.advance();
      if (++this.overT === 150) this.api.gameOver();
      return;
    }

    // Yakıt
    if (this.state === 'play' && !(this.banner && this.dist < 50)) {
      if (this.api.frame % this.drainEvery === 0) this.fuel = Math.max(0, this.fuel - 1);
      if (this.fuel <= 20 && this.api.frame % 40 === 0) sfx.tone(1200, 0.06, { vol: 0.08 });
      if (this.fuel <= 0) {
        this.state = 'over';
        this.overT = 0;
        this.banner = { lines: ['YAKIT BİTTİ'], t: 9999 };
        sfx.play('gameover');
        return;
      }
    }

    if (this.state === 'goal') {
      this.goalT++;
      p.speed = Math.max(120, p.speed - 2);
      p.x += (this.roadAt(this.dist + 8).c - p.x) * 0.05;
      this.advance();
      if (this.goalT === 40 && this.fuel > 0) sfx.play('levelup');
      if (this.goalT > 60 && this.goalT % 3 === 0 && this.fuelBonus > 0) {
        this.fuelBonus--;
        this.api.addScore(30);
        sfx.tone(1000 + (this.goalT % 12) * 40, 0.03, { vol: 0.05 });
      }
      if (this.goalT > 300) {
        this.stage++;
        if (this.stage >= STAGES.length) { this.stage = 0; this.loop++; }
        this.fuel = 100;
        this.startStage();
      }
      return;
    }

    // Kaza: patlama, sonra yolun ortasında yeniden başla
    if (p.crash) {
      p.crash++;
      if (p.crash > 80) {
        p.crash = 0;
        p.inv = 120;
        p.x = this.roadAt(this.dist + 8).c;
        p.speed = 0;
      }
      this.updateCars();
      return;
    }
    if (p.inv) p.inv--;

    // Kontroller
    let ctl;
    if (preview) ctl = this.autopilot();
    else ctl = { a: input.held('a'), b: input.held('b'), dx: input.dx, brake: input.held('down') };

    if (ctl.b) {
      p.gear = 'H';
      p.speed += p.speed < 100 ? 1.2 : 1.8;
      if (p.speed > MAX_HIGH) p.speed = MAX_HIGH;
    } else if (ctl.a) {
      p.gear = 'L';
      if (p.speed < MAX_LOW) p.speed = Math.min(MAX_LOW, p.speed + 3.2);
      else p.speed = Math.max(MAX_LOW, p.speed - 2);
    } else {
      p.speed = Math.max(0, p.speed - 1.6);
    }
    if (ctl.brake) p.speed = Math.max(0, p.speed - 6);

    // Direksiyon
    const v = p.speed * KMH;
    if (p.speed > 5) {
      const steer = 0.9 + v * 0.18;
      p.x += ctl.dx * steer * (p.spin ? 0.6 : 1);
    }
    if (p.spin) {
      p.spin--;
      p.x += p.slide;
      p.slide *= 0.95;
      if (ctl.dx && Math.sign(ctl.dx) === -Math.sign(p.slide)) p.slide *= 0.85;
    }

    this.advance();
    this.updateCars();

    // Yol kenarı
    const r = this.roadAt(this.dist + 8);
    const off = Math.abs(p.x - r.c) - (r.h - 3);
    if (off > 0) {
      if (p.speed > 40 || p.spin) this.crash();
      else p.x = r.c + Math.sign(p.x - r.c) * (r.h - 3);
    }

    // Motor sesi
    if (!preview && this.api.frame % 6 === 0 && p.speed > 0) sfx.tone(50 + p.speed * 0.45, 0.11, { type: 'sawtooth', vol: 0.025 });

    // Bitiş
    if (this.dist >= this.st.len) {
      this.state = 'goal';
      this.goalT = 0;
      this.fuelBonus = this.fuel;
      this.banner = { lines: [`BÖLÜM ${this.stage + 1 + this.loop * 4} TAMAM!`, 'YAKIT BONUSU'], t: 280 };
      sfx.play('coin');
    }
  }

  advance() {
    const v = this.player.speed * KMH;
    this.dist += v;
    this.roadIdx = this.roadAt(this.dist).i;
    while (this.dist >= this.nextScoreD) {
      this.nextScoreD += 40;
      if (this.state === 'play') this.api.addScore(10);
    }
  }

  updateCars() {
    const { api } = this;
    const p = this.player;
    // Yeni arabalar ekranın üstünde doğar
    const top = this.dist + PLAYER_SY + 24;
    if (this.state === 'play' && top >= this.nextSpawn && this.nextSpawn < this.st.len - 150) {
      const traffic = this.st.traffic + this.loop * 0.4;
      this.spawnCar(this.nextSpawn);
      this.nextSpawn += api.rand(70, 160) / traffic;
    }
    if (this.state === 'play' && top >= this.nextFuel && this.nextFuel < this.st.len - 200) {
      this.cars.push({ type: 'fuel', d: this.nextFuel, u: api.pick([-0.5, 0, 0.5]), tu: 0, speed: 2.6, t: 0, h: CAR_H, drift: 0 });
      this.nextFuel += api.rand(1900, 2600);
    }
    if (this.state === 'play' && top >= this.nextOil && this.stage + this.loop > 0 && this.nextOil < this.st.len - 200) {
      this.cars.push({ type: 'oil', d: this.nextOil, u: api.rand(-0.7, 0.7), tu: 0, speed: 0, t: 0, h: 7, drift: 0 });
      this.nextOil += api.rand(900, 1700) / (1 + this.loop * 0.3);
    }
    if (top >= this.nextSpawn && this.nextSpawn >= this.st.len - 150) this.nextSpawn = Infinity;

    const px = p.x - CAR_W / 2;
    for (const c of this.cars) {
      c.t++;
      c.d += c.speed;
      const dy = c.d - (this.dist + CAR_H); // arabanın oyuncunun ne kadar önünde olduğu
      if (c.type === 'red') {
        // Şerit değiştiren: yavaşça sağa sola kayar
        c.u = clamp(c.u + Math.sin(c.t / 40 + c.drift) * 0.012, -0.85, 0.85);
      } else if (c.type === 'blue' && !c.swerved && dy > 0 && dy < 50 && !p.crash) {
        // Saldırgan: oyuncu yaklaşınca önüne kırar
        const r = this.roadAt(c.d);
        c.tu = clamp((p.x - r.c) / Math.max(1, r.h - 8), -0.9, 0.9);
        c.swerved = true;
      }
      if (c.type === 'blue' && c.swerved) c.u += clamp(c.tu - c.u, -0.025, 0.025);

      // Çarpışma
      if (p.crash || p.inv || c.hit) continue;
      const sy = PLAYER_SY - (c.d - this.dist);
      const cx = this.carX(c);
      const ch = c.type === 'oil' ? 7 : c.h;
      if (px + 2 < cx + CAR_W - 2 && px + CAR_W - 2 > cx + 2 && PLAYER_SY + 2 < sy + ch - 1 && PLAYER_SY + CAR_H - 1 > sy + 1) {
        if (c.type === 'fuel') {
          c.hit = true;
          c.gone = true;
          this.fuel = Math.min(100, this.fuel + 18);
          api.addScore(1000);
          api.sfx.play('power');
          this.flash = { text: 'YAKIT +1000', t: 60 };
        } else if (c.type === 'oil') {
          c.hit = true;
          this.spinOut(api.pick([-1, 1]), 1.4);
        } else if (c.type === 'truck') {
          this.crash();
        } else {
          // Yandan mı arkadan mı?
          const side = Math.sign((px + CAR_W / 2) - (cx + CAR_W / 2)) || 1;
          const overlapX = CAR_W - Math.abs(px - cx);
          if (overlapX < 7) {
            this.spinOut(side, 1.8);
            c.u -= side * 0.15;
            api.sfx.play('hit');
          } else {
            // Arkadan çarpma: savrul, yavaşla, araba öne itilir
            this.spinOut(side, 1.2);
            p.speed *= 0.5;
            c.d += 6;
            c.speed += 0.5;
            api.sfx.play('hit');
          }
        }
      }
    }
    for (const c of this.cars) {
      const sy = PLAYER_SY - (c.d - this.dist);
      if (sy > H + 10) {
        c.gone = true;
        if (c.type !== 'oil' && c.type !== 'fuel' && this.state === 'play') this.api.addScore(50);
      }
      if (sy < -200) c.gone = true;
    }
    this.cars = this.cars.filter((c) => !c.gone);
  }

  autopilot() {
    const p = this.player;
    const r = this.roadAt(this.dist + 40);
    let target = r.c;
    // Öndeki arabalardan kaç
    for (const c of this.cars) {
      const ahead = c.d - this.dist - CAR_H;
      if (ahead < -4 || ahead > 70 || c.type === 'fuel') continue;
      const cx = this.carX(c) + CAR_W / 2;
      if (Math.abs(cx - target) < 14) {
        const left = cx - (r.c - r.h), right = (r.c + r.h) - cx;
        target = right > left ? cx + 16 : cx - 16;
      }
    }
    const dx = target > p.x + 2 ? 1 : target < p.x - 2 ? -1 : 0;
    return { b: p.speed < 320, a: false, dx, brake: false };
  }

  // ----- Çizim -----
  drawDeco(y, d, side, l, r) {
    const { gfx } = this.api;
    const kind = this.st.deco;
    const k = Math.floor(d / 24);
    const h = hash(k * 3 + side + this.stage * 101);
    const h2 = hash(k * 7 + side * 5 + 3);
    const space = side ? FW - r - 4 : l - 4;
    if (space < 10) return;
    const pos = side ? r + 4 + h2 * (space - 10) : 2 + h2 * (space - 10);
    if (kind === 'tree') {
      if (h < 0.35) gfx.sprite(TREE, pos - 2, y - 10);
      else if (h < 0.6) gfx.sprite(BUSH, pos, y);
    } else if (kind === 'forest') {
      if (h < 0.85) gfx.sprite(h < 0.5 ? PINE : TREE, pos, y - 10);
      if (h2 < 0.5 && space > 26) gfx.sprite(PINE, side ? r + 4 + ((h2 * 97) % 1) * (space - 10) : 2 + ((h2 * 53) % 1) * (space - 10), y - 2);
    } else if (kind === 'desert') {
      if (h < 0.25) gfx.sprite(CACTUS, pos, y - 4);
      else if (h < 0.45) gfx.sprite(ROCK, pos, y);
    } else if (kind === 'sea') {
      if (h < 0.4) gfx.sprite(WAVE, pos, y);
      else if (h < 0.43) gfx.sprite(BOAT, pos, y - 2);
    }
  }

  draw() {
    const { gfx, score, hiScore, frame } = this.api;
    const st = this.st;
    // Zemin + yol, 2 piksellik satırlar halinde
    const decoRows = [];
    for (let y = 0; y < H; y += 2) {
      const d = this.dist + PLAYER_SY - y;
      const g = Math.floor(d / 16) % 2 === 0 ? st.ground[0] : st.ground[1];
      gfx.rect(0, y, FW, 2, g);
      const r = this.roadAt(d);
      const l = Math.round(r.c - r.h), rr = Math.round(r.c + r.h);
      if (st.deco === 'sea') {
        // Köprü: korkuluk + ayaklar
        gfx.rect(l - 6, y, 4, 2, '#9c9c9c');
        gfx.rect(rr + 2, y, 4, 2, '#9c9c9c');
        if (Math.floor(d / 6) % 8 === 0) { gfx.rect(l - 7, y, 6, 2, '#fcfcfc'); gfx.rect(rr + 1, y, 6, 2, '#fcfcfc'); }
      }
      // Kaldırım taşları
      const curb = Math.floor(d / 8) % 2 ? '#fcfcfc' : '#e02020';
      gfx.rect(l - 2, y, 2, 2, curb);
      gfx.rect(rr, y, 2, 2, curb);
      gfx.rect(l, y, rr - l, 2, '#5c5c64');
      // Şerit çizgileri
      const lanes = Math.max(2, Math.round((r.h * 2) / 26));
      if (Math.floor(d / 12) % 2 === 0) {
        for (let i = 1; i < lanes; i++) gfx.rect(Math.round(l + ((rr - l) * i) / lanes) - 1, y, 1, 2, '#e8e8e8');
      }
      // Kenar çizgisi
      gfx.rect(l + 2, y, 1, 2, '#bcbcbc');
      gfx.rect(rr - 3, y, 1, 2, '#bcbcbc');
      if (Math.floor(d) % 24 < 2) decoRows.push({ y, d, l, rr });
      // Başlangıç / bitiş çizgisi
      for (const fd of [40, st.len]) {
        if (d >= fd && d < fd + 8) {
          for (let x = l; x < rr; x += 4) gfx.rect(x, y, 4, 2, (Math.floor((x - l) / 4) + Math.floor((d - fd) / 4)) % 2 ? '#000' : '#fcfcfc');
        }
      }
    }
    for (const dr of decoRows) {
      this.drawDeco(dr.y, dr.d, 0, dr.l - 4, dr.rr);
      this.drawDeco(dr.y, dr.d, 1, dr.l, dr.rr + 4);
    }
    // Bitiş pankartı
    const by = PLAYER_SY - (st.len + 20 - this.dist);
    if (by > -20 && by < H) {
      const r = this.roadAt(st.len + 20);
      gfx.rect(r.c - r.h - 6, by, 3, 14, '#bcbcbc');
      gfx.rect(r.c + r.h + 3, by, 3, 14, '#bcbcbc');
      gfx.rect(r.c - r.h - 4, by, r.h * 2 + 8, 9, '#2048c8');
      gfx.text('BİTİŞ', r.c, by + 1, '#fcfcfc', { align: 'center' });
    }

    // Arabalar
    for (const c of this.cars) {
      const sy = PLAYER_SY - (c.d - this.dist);
      if (sy > H || sy < -30) continue;
      const x = this.carX(c);
      if (c.type === 'oil') gfx.sprite(OIL, x, sy);
      else if (c.type === 'fuel') gfx.sprite(SPR.fuel[(frame >> 2) % SPR.fuel.length], x, sy);
      else gfx.sprite(SPR[c.type], x, sy);
    }

    // Oyuncu
    const p = this.player;
    if (p.crash) {
      if (p.crash < 60 || p.crash % 4 < 2) gfx.sprite(SPR.playerBurnt, p.x - CAR_W / 2, PLAYER_SY);
      if (p.crash < 30) {
        gfx.circ(p.x, PLAYER_SY + 8, 3 + p.crash / 3, p.crash % 6 < 3 ? '#fcd800' : '#fc5c00');
        gfx.circ(p.x, PLAYER_SY + 8, 1 + p.crash / 6, '#fcfcfc');
      }
    } else if (!p.inv || frame % 6 < 4) {
      const rotIdx = p.spin ? (Math.floor(p.spin / 3) * (p.slide > 0 ? 1 : 3)) % 4 : 0;
      const spr = SPR.player[rotIdx];
      gfx.sprite(spr, Math.round(p.x - spr.width / 2), PLAYER_SY + (CAR_H - spr.height) / 2);
    }
    for (const pt of this.particles) gfx.rect(pt.x, pt.y, 2, 2, pt.col);

    this.drawHud();

    if (this.banner) {
      const ls = this.banner.lines;
      const w = Math.max(...ls.map((s) => gfx.textWidth(s))) + 10;
      const y0 = 70;
      gfx.rect(FW / 2 - w / 2, y0 - 4, w, ls.length * 11 + 6, '#000');
      gfx.rectb(FW / 2 - w / 2, y0 - 4, w, ls.length * 11 + 6, '#fcd800');
      ls.forEach((s, i) => gfx.text(s, FW / 2, y0 + i * 11, i === 0 ? '#fcd800' : '#fcfcfc', { align: 'center' }));
    }
    if (this.flash) gfx.text(this.flash.text, FW / 2, 40, frame % 8 < 4 ? '#fcfcfc' : '#3cfc3c', { align: 'center', shadow: '#000' });
  }

  drawHud() {
    const { gfx, score, hiScore, frame } = this.api;
    const X = FW;
    gfx.rect(X, 0, W - FW, H, '#101028');
    gfx.rect(X, 0, 1, H, '#5c5c8c');
    const cx = X + 24;
    gfx.text('SKOR', cx, 3, '#fc5c5c', { align: 'center' });
    gfx.text(String(score).padStart(6, '0').slice(-7), cx, 12, '#fcfcfc', { align: 'center' });
    gfx.text('REKOR', cx, 24, '#fc5c5c', { align: 'center' });
    gfx.text(String(Math.max(score, hiScore)).padStart(6, '0'), cx, 33, '#fcfcfc', { align: 'center' });
    gfx.text('HIZ', cx, 46, '#5cd8fc', { align: 'center' });
    gfx.text(`${String(Math.round(this.player.speed)).padStart(3, ' ')}`, cx, 55, '#fcfcfc', { align: 'center' });
    gfx.text(this.player.gear === 'H' ? 'Y' : 'D', X + 44, 55, '#fcd800', { align: 'right' });
    gfx.text('YAKIT', cx, 68, '#5cd8fc', { align: 'center' });
    const fw = 40;
    gfx.rect(X + 4, 77, fw, 6, '#000');
    const low = this.fuel <= 20;
    gfx.rect(X + 4, 77, Math.round((fw * this.fuel) / 100), 6, low ? (frame % 20 < 10 ? '#fc3c3c' : '#fcd800') : '#3cd83c');
    gfx.rectb(X + 3, 76, fw + 2, 8, '#bcbcbc');
    gfx.text(String(this.fuel), cx, 87, low ? '#fc3c3c' : '#fcfcfc', { align: 'center' });

    // İlerleme çubuğu
    const top = 104, bot = 196;
    gfx.rect(X + 22, top, 4, bot - top, '#3c3c5c');
    for (let y = top; y < top + 6; y += 2) for (let x = X + 18; x < X + 30; x += 2) gfx.rect(x + ((y - top) % 4 ? 1 : 0), y, 1, 2, '#fcfcfc');
    const frac = clamp(this.dist / this.st.len, 0, 1);
    const my = Math.round(bot - (bot - top) * frac);
    gfx.rect(X + 19, my - 3, 10, 6, '#e82020');
    gfx.rect(X + 21, my - 2, 6, 1, '#fcfc80');
    gfx.text(`BÖLÜM`, cx, 202, '#fcd800', { align: 'center' });
    gfx.text(String(this.stage + 1 + this.loop * 4), cx, 212, '#fcfcfc', { align: 'center' });
  }
}
