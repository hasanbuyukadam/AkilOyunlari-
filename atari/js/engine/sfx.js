// WebAudio ile 8-bit tarzı ses efektleri. Ses dosyası yok; her şey sentezlenir.
let ac = null;
let master = null;
let muted = false;
try { muted = localStorage.getItem('atari:mute') === '1'; } catch { /* yok say */ }

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

// Tarayıcılar sesi ancak kullanıcı etkileşiminden sonra açar.
export function unlockAudio() { ctx(); }

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('atari:mute', m ? '1' : '0'); } catch { /* yok say */ }
  if (master) master.gain.value = m ? 0 : 0.5;
}

const NOTE = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
// 'A4', 'C#5', 'Eb3' → frekans
export function noteFreq(n) {
  if (typeof n === 'number') return n;
  const m = /^([A-G])([#b]?)(\d)$/.exec(n);
  if (!m) return 0;
  const semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (semi / 12);
}

// tone(frekans, süre sn, { type: 'square'|'triangle'|'sawtooth'|'sine', vol, slide: hedef frekans, delay })
export function tone(freq, dur = 0.1, opts = {}) {
  const a = ctx();
  if (!a || muted) return;
  const t = a.currentTime + (opts.delay || 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = opts.type || 'square';
  o.frequency.setValueAtTime(noteFreq(freq), t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, noteFreq(opts.slide)), t + dur);
  const vol = opts.vol ?? 0.15;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let noiseBuf = null;
// noise(süre sn, { vol, delay, freq: alçak geçiren kesim frekansı })
export function noise(dur = 0.2, opts = {}) {
  const a = ctx();
  if (!a || muted) return;
  if (!noiseBuf) {
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + (opts.delay || 0);
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = opts.freq || 3000;
  const g = a.createGain();
  g.gain.setValueAtTime(opts.vol ?? 0.25, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

// seq([['C5', 0.1], ['E5', 0.1], [0, 0.1] /* sus */], { type, vol })
export function seq(notes, opts = {}) {
  let d = opts.delay || 0;
  for (const [n, dur] of notes) {
    if (n) tone(n, dur * 0.95, { ...opts, delay: d });
    d += dur;
  }
}

// Hazır efektler
const PRESETS = {
  select: () => tone(880, 0.05, { vol: 0.1 }),
  coin: () => { tone('B5', 0.07); tone('E6', 0.25, { delay: 0.07 }); },
  jump: () => tone(300, 0.18, { slide: 700, vol: 0.12 }),
  shoot: () => tone(1200, 0.1, { slide: 200, vol: 0.08 }),
  laser: () => tone(1800, 0.12, { slide: 300, type: 'sawtooth', vol: 0.06 }),
  hit: () => { noise(0.08, { vol: 0.25, freq: 2000 }); tone(180, 0.08, { vol: 0.1 }); },
  explode: () => noise(0.5, { vol: 0.35, freq: 1200 }),
  bigexplode: () => { noise(0.9, { vol: 0.45, freq: 800 }); tone(120, 0.6, { slide: 30, vol: 0.2 }); },
  power: () => seq([['C5', 0.06], ['E5', 0.06], ['G5', 0.06], ['C6', 0.12]], { vol: 0.1 }),
  pickup: () => seq([['E6', 0.05], ['A6', 0.08]], { vol: 0.08 }),
  die: () => tone(800, 0.8, { slide: 60, type: 'triangle', vol: 0.2 }),
  blip: () => tone(440, 0.04, { vol: 0.08 }),
  bounce: () => tone(520, 0.05, { type: 'triangle', vol: 0.15 }),
  start: () => seq([['C5', 0.08], ['E5', 0.08], ['G5', 0.08], ['C6', 0.08], ['G5', 0.08], ['C6', 0.2]], { vol: 0.1 }),
  gameover: () => seq([['G4', 0.2], ['E4', 0.2], ['C4', 0.2], ['G3', 0.5]], { type: 'triangle', vol: 0.2 }),
  levelup: () => seq([['C5', 0.1], ['G5', 0.1], ['C6', 0.1], ['E6', 0.1], ['G6', 0.3]], { vol: 0.1 }),
  punch: () => { noise(0.06, { vol: 0.3, freq: 1500 }); tone(140, 0.07, { vol: 0.15 }); },
};

export function play(name) {
  PRESETS[name]?.();
}

export const sfx = { tone, noise, seq, play, noteFreq };

// Önizleme / test için sessiz sürüm
export const silentSfx = { tone() {}, noise() {}, seq() {}, play() {}, noteFreq };
