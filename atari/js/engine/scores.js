// Yüksek skor tablosu (oyun başına ilk 5, 3 harfli isim). localStorage yoksa bellekte tutulur.
const KEY = 'atari:scores:v1';
const MAX = 5;
let memory = {};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : memory;
  } catch {
    return memory;
  }
}

function save(data) {
  memory = data;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* bellekte kalır */ }
}

export function getScores(id) {
  return (load()[id] || []).slice(0, MAX);
}

export function best(id) {
  return getScores(id)[0]?.s || 0;
}

export function qualifies(id, score) {
  if (score <= 0) return false;
  const list = getScores(id);
  return list.length < MAX || score > list[list.length - 1].s;
}

export function addScore(id, name, score) {
  const data = load();
  const list = data[id] || [];
  list.push({ n: name, s: score });
  list.sort((a, b) => b.s - a.s);
  data[id] = list.slice(0, MAX);
  save(data);
  return data[id].findIndex((e) => e.n === name && e.s === score);
}

export function lastName() {
  try { return localStorage.getItem('atari:name') || 'AAA'; } catch { return 'AAA'; }
}

export function rememberName(n) {
  try { localStorage.setItem('atari:name', n); } catch { /* yok say */ }
}
