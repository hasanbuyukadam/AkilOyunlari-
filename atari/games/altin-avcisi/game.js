// Altın Avcısı — Lode Runner tarzı. Altınları topla, tuğlaları kazarak muhafızları tuzağa
// düşür; bütün altınlar bitince gizli çıkış merdiveni belirir, ekranın tepesine tırman.
import { makeSprite } from '../../js/engine/gfx.js';

export const meta = {
  id: 'altin-avcisi',
  width: 336,
  height: 212,
  buttons: { a: 'SOLA KAZ', b: 'SAĞA KAZ', c: 'PES ET' },
  help: [
    'Oklarla koş, merdivene tırman, halata tutun. Halattayken aşağı basarsan bırakırsın.',
    'A sol önünü, B sağ önünü kazar. Kazılan tuğla birkaç saniye sonra yeniden dolar.',
    'Muhafız deliğe düşerse taşıdığı altını bırakır; delik dolarken içinde kalan ölür ve tepeden yeniden doğar.',
    'Bütün altınlar bitince çıkış merdiveni belirir: ekranın en tepesine tırman.',
    'Sıkışırsan C tuşunu basılı tut: bir can kaybedip bölümü baştan alırsın.',
  ],
};

const TW = 12;
const TH = 12;
const COLS = 28;
const ROWS = 16;
const GY = ROWS * TH; // zemin çizgisi

// Bölümler: # tuğla (kazılır), @ beton, H merdiven, - halat, $ altın, S gizli çıkış merdiveni,
// X sahte tuğla (içinden düşülür), P oyuncu, E muhafız.
const LEVELS = [
  [
    '                          S ',
    '                          S ',
    '                          S ',
    '  $           $        $  S ',
    '######H###   #######H#######',
    '      H             H       ',
    '      H    -------  H       ',
    '   $  H             H E   $ ',
    '##########H##   ##H#########',
    '          H       H         ',
    '          H       H         ',
    ' $        H   $   H         ',
    '###H####################H###',
    '   H                    H   ',
    '   H                    H   ',
    ' $ H    P     $     E   H $ ',
  ],
  [
    '             S              ',
    '             S              ',
    '             S              ',
    '         ----H-----         ',
    '    $        H       E $    ',
    '#H#######    H     #######H#',
    ' H           H            H ',
    ' H           $            H ',
    ' H    E   $ #H##          H ',
    '  ##H####### $  #######H##  ',
    '    H       ----       H    ',
    '    H                  H    ',
    '    H  $            $  H    ',
    '##H######################H##',
    '  H     ###              H  ',
    '$ H  P   $   $   E       H $',
  ],
  [
    '              S             ',
    '@             S            @',
    '@   $         S       E$   @',
    '@######H#####X######H######@',
    '@      H            H      @',
    '@      H ---    --- H      @',
    '@ $    H  E   $     H    $ @',
    '@##H#####   #H##   #####H##@',
    '@  H         H          H  @',
    '@  H         H          H  @',
    '@  H      $  H   $      H  @',
    '@####H#####      #####H####@',
    '@    H      ####      H    @',
    '@    H      #$        H    @',
    '@ $  H  P   ####  E   H  $ @',
    '@##########################@',
  ],
  [
    '             S              ',
    '             S              ',
    '  $       E  S           $  ',
    '#######H############H#######',
    '       H@@@@@@@@@@@@H       ',
    '    $  H     $      H  $E   ',
    '#H#########H####H#########H#',
    ' H         H    H------   H ',
    ' H $       H $  H       $ H ',
    '#####H########H#######H#####',
    '     H-----   H       H     ',
    '   E H $      H     $ H     ',
    '##H######H########H######H##',
    '  H      H--------H      H  ',
    '$ H   P  H   $    H  E   H $',
    '############################',
  ],
  [
    '              S             ',
    '              S             ',
    '$---          S         ---$',
    ' H      $    $S    $      H ',
    ' H  #H#####HX##XH#####H#  H ',
    ' H   H     H    H     H   H ',
    ' H$  H E   H    H   E H  $H ',
    '########H##      ##H########',
    '        H  ------  H        ',
    '    E   H    $     H   E    ',
    '   H##X######H#######X##H   ',
    '   H         H          H   ',
    '   H  $      H       $  H   ',
    'H############H#############H',
    'H     ###    H     ###     H',
    'H$     $  P  H   E  $     $H',
  ],
  [
    '             S              ',
    '             S              ',
    '  $   E  ----H-----  E   $  ',
    '#######H#          #H#######',
    '       H     $      H       ',
    '      $H     $      H$      ',
    '    H#####H######H#####H    ',
    '    H     H  $   H     H    ',
    '    H     H      H     H    ',
    '----------------------------',
    '#H#                      #H#',
    ' H$          $           $H ',
    '###H###  ####H#####  ###H###',
    '   H         H          H   ',
    '$ EH    $  P H     $    HE $',
    '############################',
  ],
];

// ---------- Sprite'lar ----------
const RUNNER = {
  stand: ['....WWW.....', '....WSS.....', '....SSS.....', '.....S......', '...BBBBB....', '..S.BBB.S...', '....BBB.....', '....KKK.....', '....K.K.....', '....K.K.....', '....K.K.....', '...WW.WW....'],
  run1: ['....WWW.....', '....WSS.....', '....SSS.....', '.....S......', '...BBBB.....', '..SBBBBBS...', '....BBB.....', '....KKK.....', '...KK.KK....', '..KK...K....', '.K.....K....', 'WW.....WW...'],
  run2: ['....WWW.....', '....WSS.....', '....SSS.....', '.....S......', '....BBBB....', '...SBBB.S...', '....BBB.....', '....KKK.....', '.....KK.....', '....KK......', '....K.K.....', '...WW.WW....'],
  climb: ['.S..........', '.S..WWW.....', '..B.WWW.....', '...BBBBBB...', '....BBB..S..', '....BBB.....', '....BBB.....', '....KKK.....', '....K.K.....', '....K.K.....', '....K..K....', '...WW..WW...'],
  hang1: ['..S...S.....', '..S...S.....', '..BWWWB.....', '...WSSB.....', '...SSSB.....', '...BBBB.....', '....BBB.....', '....KKK.....', '....K.K.....', '...KK.K.....', '...K..KK....', '..WW...W....'],
  hang2: ['..S...S.....', '..S...S.....', '..BWWWB.....', '...WSSB.....', '...SSSB.....', '...BBBB.....', '....BBB.....', '....KKK.....', '....K.K.....', '....K.KK....', '...KK...K...', '...W....WW..'],
  fall: ['.S.......S..', '..S.WWW.S...', '...BWSSB....', '....SSS.....', '....BBB.....', '....BBB.....', '....BBB.....', '....KKK.....', '...K...K....', '..K.....K...', '.WW.....WW..', '............'],
  dig: ['............', '............', '....WWW.....', '....WSS.....', '....SSS.....', '...BBBBBB...', '...BBBB..S..', '....BBB...S.', '....KKK.....', '...KK.KK....', '...K...K....', '..WW...WW...'],
};
const PLAYER_PAL = { W: '#fcfcfc', S: '#fcbcb0', B: '#3c7cfc', K: '#bcbcbc' };
const GUARD_PAL = { W: '#e40058', S: '#fcfcfc', B: '#f87858', K: '#7c7c7c' };
const GUARD_GOLD_PAL = { W: '#fcd800', S: '#fcfcfc', B: '#f87858', K: '#7c7c7c' };

let SPR = null;
function tile(fn) {
  const rows = [];
  for (let y = 0; y < TH; y++) { let s = ''; for (let x = 0; x < TW; x++) s += fn(x, y); rows.push(s); }
  return rows;
}
const mirror = (rows) => rows.map((r) => [...r.padEnd(TW, '.')].reverse().join(''));
function buildSprites() {
  if (SPR) return;
  SPR = {};
  const mk = (pal) => {
    const o = {};
    for (const [k, rows] of Object.entries(RUNNER)) { o[k] = makeSprite(rows, pal); o[k + 'L'] = makeSprite(mirror(rows), pal); }
    return o;
  };
  SPR.player = mk(PLAYER_PAL);
  SPR.guard = mk(GUARD_PAL);
  SPR.guardGold = mk(GUARD_GOLD_PAL);
  SPR.white = makeSprite(RUNNER.fall, { W: '#fff', S: '#fff', B: '#fff', K: '#fff' });
  const brickFn = (x, y) => {
    if (y === 5 || y === 11) return 'D';
    const off = y < 5 ? 0 : 6;
    if ((x + off) % 12 === 0) return 'D';
    if (y === 0 || y === 6) return 'L';
    return 'R';
  };
  const BPAL = { D: '#7c2800', L: '#fca044', R: '#c84c0c' };
  SPR.brick = makeSprite(tile(brickFn), BPAL);
  // kazma/dolma aşamaları: tuğlanın üstten silinmiş hali
  SPR.brickPart = [];
  for (let k = 1; k <= 5; k++) SPR.brickPart.push(makeSprite(tile((x, y) => (y < k * 2 ? '.' : brickFn(x, y))), BPAL));
  SPR.solid = makeSprite(tile((x, y) => {
    if (y === 0 || x === 0) return 'L';
    if (y === TH - 1 || x === TW - 1) return 'D';
    if ((x === 3 || x === 8) && (y === 3 || y === 8)) return 'D';
    return 'G';
  }), { L: '#dcdcdc', G: '#a4a4a4', D: '#585858' });
  SPR.ladder = makeSprite(tile((x, y) => ((x === 1 || x === 10) ? 'W' : (y % 4 === 1 && x > 1 && x < 10) ? 'W' : '.')), { W: '#fcfcfc' });
  SPR.ladderNew = makeSprite(tile((x, y) => ((x === 1 || x === 10) ? 'W' : (y % 4 === 1 && x > 1 && x < 10) ? 'W' : '.')), { W: '#fcd800' });
  SPR.rope = makeSprite(tile((x, y) => (y === 1 ? 'W' : (y === 2 && x % 3 === 0 ? 'G' : '.'))), { W: '#fcfcfc', G: '#a4a4a4' });
  SPR.gold = [0, 1].map((f) => makeSprite([
    '............',
    '............',
    f ? '.....W......' : '............',
    f ? '....WYW.....' : '............',
    f ? '.....W......' : '............',
    '....YYYY....',
    '...YWYYYO...',
    '..YYYYYYYO..',
    '..YWYYYYYO..',
    '.YYYYYYYYYO.',
    '.OOOOOOOOOO.',
    '............',
  ], { Y: '#fcd800', O: '#ac7c00', W: '#fcfce0' }));
}

const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

export default class AltinAvcisi {
  constructor(api) {
    this.api = api;
    buildSprites();
    this.levelNo = 1;
    this.lives = 5;
    this.loadLevel();
  }

  get loop() { return Math.floor((this.levelNo - 1) / LEVELS.length); }

  loadLevel() {
    const src = LEVELS[(this.levelNo - 1) % LEVELS.length];
    this.grid = [];
    this.gold = new Set();
    this.guards = [];
    this.holes = new Map();
    this.revealed = false;
    let px = 1, py = 1;
    const gStarts = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      const line = (src[r] || '').padEnd(COLS, ' ');
      for (let c = 0; c < COLS; c++) {
        let ch = line[c];
        if (ch === '$') { this.gold.add(`${c},${r}`); ch = ' '; }
        if (ch === 'P') { px = c; py = r; ch = ' '; }
        if (ch === 'E') { gStarts.push([c, r]); ch = ' '; }
        row.push(ch);
      }
      this.grid.push(row);
    }
    this.goldTotal = this.gold.size;
    this.player = this.makeActor(px, py);
    this.player.isPlayer = true;
    const L = this.loop;
    // döngülerde fazladan muhafız
    if (L > 0) {
      for (let i = 0; i < Math.min(L, 2); i++) gStarts.push([3 + i * 20, 0]);
    }
    for (const [c, r] of gStarts) this.guards.push(this.makeActor(c, r));
    this.guardSpeed = Math.min(0.95, 0.55 + ((this.levelNo - 1) % LEVELS.length) * 0.03 + L * 0.12);
    this.holeTime = Math.max(160, 300 - L * 40);
    this.state = 'start';
    this.timer = this.api.preview ? 0 : 100;
    this.giveUp = 0;
    if (!this.api.preview) this.api.sfx.seq([['G4', 0.1], ['C5', 0.1], ['E5', 0.1], ['G5', 0.2], ['E5', 0.1], ['G5', 0.3]], { vol: 0.08 });
  }

  makeActor(c, r) {
    return { x: c * TW, y: r * TH, face: 'right', mode: 'stand', falling: false, acc: 0, anim: 0, gold: false, carryT: 0, trapped: 0, climbing: false, reborn: 0, digT: 0 };
  }

  // ---------- Karo sorguları ----------
  base(c, r) {
    if (c < 0 || c >= COLS || r >= ROWS) return '@';
    if (r < 0) return ' ';
    return this.grid[r][c];
  }
  holeAt(c, r) { return this.holes.get(`${c},${r}`); }
  isOpenHole(c, r) { const h = this.holeAt(c, r); return !!h && h.phase !== 'dig'; }
  solid(c, r) {
    const t = this.base(c, r);
    if (t === '#') return !this.isOpenHole(c, r);
    return t === '@';
  }
  ladder(c, r) { const t = this.base(c, r); return t === 'H' || (t === 'S' && this.revealed); }
  rope(c, r) { return this.base(c, r) === '-'; }
  guardAt(c, r, except) {
    return this.guards.find((g) => g !== except && !g.reborn && Math.abs(g.x - c * TW) < TW && Math.abs(g.y - r * TH) < TH / 2 + 1);
  }
  supported(a, c, r) {
    if (this.ladder(c, r)) return true;
    if (this.rope(c, r) && !a.dropping) return true;
    if (r >= ROWS - 1) return true;
    if (this.solid(c, r + 1) || this.ladder(c, r + 1)) return true;
    if (this.guardAt(c, r + 1, a)) return true;
    return false;
  }

  // ---------- Güncelleme ----------
  update() {
    const { api } = this;
    if (this.state === 'start') {
      if (--this.timer <= 0) this.state = 'play';
      return;
    }
    if (this.state === 'over') return;
    if (this.state === 'dead') {
      if (--this.timer <= 0) {
        this.lives--;
        if (this.lives <= 0) {
          this.state = 'over';
          api.sfx.play('gameover');
          api.gameOver();
          return;
        }
        this.loadLevel();
      }
      return;
    }
    if (this.state === 'clear') {
      this.timer--;
      if (this.timer > 60 && this.timer % 4 === 0) api.addScore(50);
      if (this.timer <= 0) { this.levelNo++; this.loadLevel(); }
      return;
    }

    // pes et
    if (!api.preview && api.input.held('c')) {
      if (++this.giveUp > 60) { this.killPlayer(); return; }
    } else this.giveUp = 0;

    this.updateHoles();
    this.updatePlayer();
    if (this.state !== 'play') return;
    for (const g of this.guards) this.updateGuard(g);
    // muhafız teması
    const p = this.player;
    for (const g of this.guards) {
      if (g.reborn || g.trapped > 0) continue;
      if (Math.abs(g.x - p.x) < 9 && Math.abs(g.y - p.y) < 10) { this.killPlayer(); return; }
    }
    // altınlar bitti mi
    if (!this.revealed && this.gold.size === 0 && !this.guards.some((g) => g.gold)) {
      this.revealed = true;
      api.sfx.play('levelup');
    }
    if (this.revealed && p.y <= 0 && !p.falling && p.x % TW === 0) {
      this.state = 'clear';
      this.timer = 150;
      api.addScore(1500);
      api.sfx.play('coin');
    }
  }

  killPlayer() {
    if (this.state !== 'play') return;
    this.state = 'dead';
    this.timer = 90;
    this.api.sfx.play('die');
  }

  updateHoles() {
    const DIG = 18, FILL = 30;
    for (const [k, h] of this.holes) {
      const [c, r] = k.split(',').map(Number);
      h.t++;
      if (h.phase === 'dig') {
        // muhafız üstüne gelirse kazma bozulur
        if (this.guardAt(c, r - 1)) { this.holes.delete(k); continue; }
        if (h.t >= DIG) { h.phase = 'open'; h.t = 0; }
      } else if (h.phase === 'open') {
        if (h.t >= this.holeTime) { h.phase = 'fill'; h.t = 0; }
      } else if (h.t >= FILL) {
        this.holes.delete(k);
        // içinde kalanlar
        const p = this.player;
        if (Math.round(p.x / TW) === c && Math.round(p.y / TH) === r) this.killPlayer();
        for (const g of this.guards) {
          if (!g.reborn && Math.round(g.x / TW) === c && Math.round(g.y / TH) === r) this.killGuard(g);
        }
      }
    }
  }

  killGuard(g) {
    this.api.addScore(75);
    this.api.sfx.play('hit');
    g.gold = false;
    // tepeden yeniden doğ
    const cols = [];
    for (let rr = 0; rr < 3 && !cols.length; rr++) {
      for (let c = 0; c < COLS; c++) if (this.base(c, rr) === ' ' && !this.gold.has(`${c},${rr}`)) cols.push([c, rr]);
    }
    const [c, r] = cols.length ? cols[Math.floor(Math.random() * cols.length)] : [1, 0];
    Object.assign(g, { x: c * TW, y: r * TH, falling: false, trapped: 0, reborn: 50, acc: 0, climbing: false });
  }

  // ---- Oyuncu ----
  updatePlayer() {
    const { input, preview, sfx } = this.api;
    const p = this.player;
    if (p.digT > 0) { p.digT--; p.mode = 'dig'; return; }
    let want = null;
    let digDir = 0;
    if (preview) want = this.autopilot();
    else {
      if (input.held('left')) want = 'left';
      else if (input.held('right')) want = 'right';
      else if (input.held('up')) want = 'up';
      else if (input.held('down')) want = 'down';
      if (input.pressed('a')) digDir = -1;
      else if (input.pressed('b')) digDir = 1;
    }
    if (digDir && !p.falling && p.y % TH === 0) {
      const c = Math.round(p.x / TW), r = p.y / TH;
      const tc = c + digDir;
      const k = `${tc},${r + 1}`;
      if (Math.abs(p.x - c * TW) <= 4 && this.base(tc, r + 1) === '#' && !this.holes.has(k)
        && (this.base(tc, r) === ' ' || (this.base(tc, r) === 'S' && !this.revealed)) && !this.gold.has(`${tc},${r}`)
        && !this.guardAt(tc, r) && r + 1 < ROWS) {
        p.x = c * TW;
        p.face = digDir < 0 ? 'left' : 'right';
        this.holes.set(k, { phase: 'dig', t: 0 });
        p.digT = 14;
        p.mode = 'dig';
        sfx.noise(0.25, { vol: 0.2, freq: 2500 });
        return;
      }
    }
    p.acc += p.falling ? 1.5 : 1.25;
    while (p.acc >= 1) {
      p.acc -= 1;
      this.stepActor(p, want);
      if (this.state !== 'play') return;
    }
    // altın
    const c = Math.round(p.x / TW), r = Math.round(p.y / TH);
    const k = `${c},${r}`;
    if (this.gold.has(k) && Math.abs(p.x - c * TW) < 5 && Math.abs(p.y - r * TH) < 5) {
      this.gold.delete(k);
      this.api.addScore(250);
      sfx.play('pickup');
    }
  }

  // Bir piksellik hareket (oyuncu ve muhafızlar için ortak fizik)
  stepActor(a, want) {
    const ax = a.x % TW === 0, ay = a.y % TH === 0;
    const isGuard = !a.isPlayer;
    // düşüş
    if (a.falling) {
      a.y += 1;
      a.mode = 'fall';
      if (a.y % TH === 0) {
        const c = a.x / TW, r = a.y / TH;
        if (isGuard && this.isOpenHole(c, r)) { this.trapGuard(a, c, r); return; }
        if (this.supported(a, c, r)) { a.falling = false; a.dropping = false; this.landSound(a); }
        else if (r >= ROWS - 1) a.falling = false;
      }
      return;
    }
    if (ay) {
      const cN = Math.round(a.x / TW), r = a.y / TH;
      if (!this.ladder(cN, r) && !this.supported(a, cN, r)) {
        if (!ax) { a.x = cN * TW; }
        if (isGuard && this.isOpenHole(cN, r)) { this.trapGuard(a, cN, r); return; }
        a.falling = true;
        return;
      }
    }
    if (!want) { a.moving = false; return; }
    a.moving = true;
    const [dx, dy] = DIRS[want];
    if (dx) {
      a.face = want;
      if (!ay) {
        // merdivende satır arasında: en yakın satıra hizalan
        const rN = Math.round(a.y / TH);
        a.y += a.y < rN * TH ? 1 : -1;
        return;
      }
      const r = a.y / TH;
      if (ax) {
        const c = a.x / TW;
        if (this.solid(c + dx, r)) { a.moving = false; return; }
        if (isGuard && this.guardBlocks(a, a.x + dx * TW, a.y)) { a.moving = false; return; }
      } else if (isGuard && this.guardBlocks(a, a.x + dx * 2, a.y)) { a.moving = false; return; }
      a.x += dx;
      a.anim++;
      const c = Math.round(a.x / TW);
      a.mode = this.rope(c, r) && a.x % TW === 0 ? 'hang' : this.rope(Math.round(a.x / TW), r) ? 'hang' : this.ladder(c, r) && !this.supportedNoLadder(a, c, r) ? 'climb' : 'run';
      return;
    }
    // dikey
    if (!ax) {
      const cN = Math.round(a.x / TW);
      if (dy < 0 && !this.ladder(cN, Math.round(a.y / TH)) && !(a.y % TH && this.ladder(cN, Math.floor(a.y / TH) + 1))) { a.moving = false; return; }
      a.x += a.x < cN * TW ? 1 : -1;
      a.anim++;
      return;
    }
    const c = a.x / TW;
    if (dy < 0) {
      if (ay) {
        const r = a.y / TH;
        if (!this.ladder(c, r)) { a.moving = false; return; }
        if (r === 0) { a.moving = false; return; }
        if (this.solid(c, r - 1)) { a.moving = false; return; }
        if (isGuard && this.guardBlocks(a, a.x, a.y - TH)) { a.moving = false; return; }
      } else {
        const r0 = Math.floor(a.y / TH);
        if (!this.ladder(c, r0) && !this.ladder(c, r0 + 1)) { a.moving = false; return; }
      }
      a.y -= 1;
      a.anim++;
      a.mode = 'climb';
      return;
    }
    // aşağı
    if (ay) {
      const r = a.y / TH;
      if (r >= ROWS - 1 || this.solid(c, r + 1)) { a.moving = false; return; }
      if (isGuard && this.guardBlocks(a, a.x, a.y + TH)) { a.moving = false; return; }
      if (!this.ladder(c, r + 1) && !this.ladder(c, r)) {
        // halattan bırak / boşluğa in
        a.dropping = this.rope(c, r);
        a.falling = true;
        a.y += 1;
        return;
      }
      if (!this.ladder(c, r + 1)) {
        a.falling = true;
        a.y += 1;
        return;
      }
    }
    a.y += 1;
    a.anim++;
    a.mode = 'climb';
  }

  supportedNoLadder(a, c, r) {
    return r >= ROWS - 1 || this.solid(c, r + 1) || this.ladder(c, r + 1);
  }

  guardBlocks(a, nx, ny) {
    return this.guards.some((g) => g !== a && !g.reborn && Math.abs(g.x - nx) < TW && Math.abs(g.y - ny) < TH);
  }

  landSound(a) {
    if (a.isPlayer && !this.api.preview) this.api.sfx.tone(140, 0.05, { vol: 0.08 });
  }

  // ---- Muhafız ----
  trapGuard(g, c, r) {
    g.falling = false;
    g.x = c * TW;
    g.y = r * TH;
    g.trapped = 110;
    g.trapC = c;
    g.trapR = r;
    this.api.addScore(75);
    this.api.sfx.tone(300, 0.12, { slide: 120, vol: 0.1 });
    if (g.gold) {
      g.gold = false;
      const k = `${c},${r - 1}`;
      if (this.base(c, r - 1) === ' ' || this.base(c, r - 1) === 'S') this.gold.add(k);
      else this.gold.add(`${c},${r}`); // nadiren: deliğin içine bırak
    }
  }

  updateGuard(g) {
    g.anim++;
    if (g.reborn > 0) {
      g.reborn--;
      return;
    }
    if (g.trapped > 0) {
      g.mode = 'fall';
      if (--g.trapped > 0) return;
      // delikten çık
      g.climbing = true;
    }
    if (g.climbing) {
      const top = (g.trapR - 1) * TH;
      g.acc += this.guardSpeed;
      while (g.acc >= 1) {
        g.acc -= 1;
        if (g.y > top) {
          if (this.solid(g.trapC, g.trapR - 1) || this.guardBlocks(g, g.x, top)) { g.trapped = 20; g.climbing = false; return; }
          g.y -= 1;
          g.mode = 'climb';
        } else {
          // yana çık (oyuncuya doğru)
          const d = this.player.x < g.x ? -1 : 1;
          const opts = [d, -d].filter((dd) => !this.solid(g.trapC + dd, g.trapR - 1));
          if (!opts.length) { g.climbing = false; return; }
          g.x += opts[0];
          g.face = opts[0] < 0 ? 'left' : 'right';
          if (Math.abs(g.x - g.trapC * TW) >= TW) { g.climbing = false; g.x = (g.trapC + opts[0]) * TW; }
        }
      }
      return;
    }
    // altın taşıma / bırakma
    if (g.x % TW === 0 && g.y % TH === 0 && !g.falling) {
      const c = g.x / TW, r = g.y / TH;
      const k = `${c},${r}`;
      if (!g.gold && this.gold.has(k) && Math.random() < 0.6) {
        this.gold.delete(k);
        g.gold = true;
        g.carryT = 120 + Math.floor(Math.random() * 300);
      } else if (g.gold && --g.carryT <= 0 && this.base(c, r) === ' ' && !this.gold.has(k) && this.supported(g, c, r)) {
        this.gold.add(k);
        g.gold = false;
      }
      if (!g.wantT || --g.wantT <= 0 || g.lastC !== c || g.lastR !== r) {
        g.want = this.guardDecide(g, c, r);
        g.lastC = c; g.lastR = r;
        g.wantT = 30;
      }
    }
    g.acc += g.falling ? 1.2 : this.guardSpeed;
    while (g.acc >= 1) {
      g.acc -= 1;
      this.stepActor(g, g.want);
      if (g.trapped) break;
    }
  }

  // BFS ile oyuncuya giden ilk adım
  bfs(sc, sr, goal, avoid) {
    const key = (c, r) => r * COLS + c;
    const prev = new Int16Array(COLS * ROWS).fill(-1);
    const start = key(sc, sr);
    prev[start] = start;
    const q = [start];
    for (let i = 0; i < q.length; i++) {
      const k = q[i];
      const c = k % COLS, r = Math.floor(k / COLS);
      if (goal(c, r) && k !== start) {
        let cur = k;
        while (prev[cur] !== start) cur = prev[cur];
        return [cur % COLS, Math.floor(cur / COLS)];
      }
      const nb = [];
      const sup = this.ladder(c, r) || this.rope(c, r) || r >= ROWS - 1 || this.solid(c, r + 1) || this.ladder(c, r + 1);
      if (!sup) nb.push([c, r + 1]);
      else {
        nb.push([c - 1, r], [c + 1, r]);
        if (this.ladder(c, r) && r > 0) nb.push([c, r - 1]);
        if (r + 1 < ROWS) nb.push([c, r + 1]);
      }
      for (const [nc, nr] of nb) {
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS || this.solid(nc, nr)) continue;
        const nk = key(nc, nr);
        if (prev[nk] !== -1) continue;
        if (avoid && avoid(nc, nr)) continue;
        prev[nk] = k;
        q.push(nk);
      }
    }
    return null;
  }

  dirTo(c, r, step) {
    if (!step) return null;
    if (step[0] < c) return 'left';
    if (step[0] > c) return 'right';
    return step[1] < r ? 'up' : 'down';
  }

  guardDecide(g, c, r) {
    const p = this.player;
    const pc = Math.round(p.x / TW), pr = Math.round(p.y / TH);
    if (Math.random() < 0.08) return ['left', 'right', 'up', 'down'][Math.floor(Math.random() * 4)];
    const step = this.bfs(c, r, (x, y) => x === pc && y === pr);
    if (step) return this.dirTo(c, r, step);
    // yol yoksa: yatayda yaklaş, olmazsa merdivenle aynı satıra çık/in
    if (pr < r && this.ladder(c, r)) return 'up';
    if (pr > r && !this.solid(c, r + 1)) return 'down';
    return pc < c ? 'left' : pc > c ? 'right' : null;
  }

  autopilot() {
    const p = this.player;
    if (p.x % TW !== 0 || p.y % TH !== 0 || p.falling) return p.lastWant || null;
    const c = p.x / TW, r = p.y / TH;
    const danger = (x, y) => this.guards.some((g) => !g.reborn && Math.abs(Math.round(g.x / TW) - x) + Math.abs(Math.round(g.y / TH) - y) <= 1);
    let step = this.bfs(c, r, (x, y) => this.gold.has(`${x},${y}`), danger);
    if (!step && this.revealed) step = this.bfs(c, r, (x, y) => y === 0, danger);
    if (!step) step = this.bfs(c, r, (x, y) => !danger(x, y) && Math.abs(x - c) + Math.abs(y - r) > 3, danger);
    p.lastWant = this.dirTo(c, r, step);
    return p.lastWant;
  }

  // ---------- Çizim ----------
  draw() {
    const { gfx, frame } = this.api;
    gfx.cls('#000');
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const t = this.grid[r][c];
      const x = c * TW, y = r * TH;
      if (t === '#' || t === 'X') {
        const h = t === '#' ? this.holeAt(c, r) : null;
        if (!h) gfx.sprite(SPR.brick, x, y);
        else if (h.phase === 'dig') gfx.sprite(SPR.brickPart[Math.min(4, Math.floor(h.t / 4))], x, y);
        else if (h.phase === 'fill') gfx.sprite(SPR.brickPart[Math.max(0, 4 - Math.floor(h.t / 6))], x, y);
      } else if (t === '@') gfx.sprite(SPR.solid, x, y);
      else if (t === 'H') gfx.sprite(SPR.ladder, x, y);
      else if (t === 'S' && this.revealed) gfx.sprite(frame % 20 < 10 ? SPR.ladderNew : SPR.ladder, x, y);
      else if (t === '-') gfx.sprite(SPR.rope, x, y);
    }
    for (const k of this.gold) {
      const [c, r] = k.split(',').map(Number);
      gfx.sprite(SPR.gold[(frame + c * 7 + r * 3) % 90 < 8 ? 1 : 0], c * TW, r * TH);
    }
    // zemin
    gfx.rect(0, GY, gfx.W, 3, '#a4a4a4');
    gfx.rect(0, GY + 3, gfx.W, 1, '#585858');

    for (const g of this.guards) {
      if (g.reborn) {
        if (Math.floor(g.reborn / 4) % 2) gfx.sprite(SPR.white, g.x, g.y);
        continue;
      }
      this.drawActor(g.gold ? SPR.guardGold : SPR.guard, g);
    }
    const p = this.player;
    if (this.state === 'dead') {
      const t = 90 - this.timer;
      if (t < 40) gfx.sprite(Math.floor(t / 4) % 2 ? SPR.white : SPR.player.fall, p.x, p.y);
      else if (t < 70) {
        const k = (t - 40) / 2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          gfx.rect(p.x + 6 + Math.cos(a) * k, p.y + 6 + Math.sin(a) * k, 2, 2, '#fcfcfc');
        }
      }
    } else this.drawActor(SPR.player, p);

    // HUD
    const hy = GY + 6;
    gfx.text(`SKOR ${String(this.api.score).padStart(7, '0')}`, 2, hy, '#fcfcfc');
    gfx.text(`EN İYİ ${String(Math.max(this.api.hiScore, this.api.score)).padStart(7, '0')}`, 80, hy, '#a4a4a4');
    gfx.text(`CAN ${this.lives}`, 172, hy, '#fcfcfc');
    gfx.text(`SV ${String(this.levelNo).padStart(3, '0')}`, 334, hy, '#fcd800', { align: 'right' });

    const goldLeft = this.gold.size + this.guards.filter((g) => g.gold).length;
    if (this.state === 'play' && !this.revealed) gfx.text(`ALTIN ${goldLeft}`, 214, hy, '#fcd800');
    if (this.state === 'start' && this.timer > 0) this.banner(`SEVİYE ${this.levelNo}`, 'HAZIR!');
    if (this.state === 'clear') this.banner('BÖLÜM TAMAM!', `+1500`);
    if (this.state === 'over') this.banner('OYUN BİTTİ', '');
    if (this.revealed && this.state === 'play' && frame % 60 < 40 && p.y > TH * 3) gfx.text('ÇIKIŞ AÇILDI!', gfx.W / 2, 2, '#fcd800', { align: 'center', shadow: '#000' });
    if (this.giveUp > 0) gfx.rect(0, gfx.H - 2, (this.giveUp / 60) * gfx.W, 2, '#e40058');
  }

  banner(a, b) {
    const { gfx } = this.api;
    gfx.rect(gfx.W / 2 - 80, 70, 160, 40, '#000');
    gfx.rectb(gfx.W / 2 - 80, 70, 160, 40, '#fcd800');
    gfx.text(a, gfx.W / 2, 78, '#fcfcfc', { align: 'center', scale: 1 });
    if (b) gfx.text(b, gfx.W / 2, 94, '#fcd800', { align: 'center' });
  }

  drawActor(set, a) {
    const { gfx } = this.api;
    const L = a.face === 'left' ? 'L' : '';
    const c = Math.round(a.x / TW), r = Math.round(a.y / TH);
    let spr;
    if (a.falling || a.mode === 'fall' || a.trapped > 0) spr = set.fall;
    else if (a.mode === 'dig') spr = set['dig' + L];
    else if (this.rope(c, r) && a.y % TH === 0) spr = Math.floor(a.anim / 4) % 2 ? set['hang1' + L] : set['hang2' + L];
    else if (a.mode === 'climb' || (this.ladder(c, r) && a.y % TH !== 0)) spr = Math.floor(a.anim / 4) % 2 ? set.climb : set.climbL;
    else if (a.moving && a.mode === 'run') spr = [set['run1' + L], set['stand' + L], set['run2' + L], set['stand' + L]][Math.floor(a.anim / 3) % 4];
    else spr = set['stand' + L];
    gfx.sprite(spr, a.x, a.y);
  }
}
