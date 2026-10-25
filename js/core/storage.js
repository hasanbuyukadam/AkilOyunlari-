// İlerleme kaydı (tarayıcıya özel, localStorage). Erişilemezse bellekte tutulur.
const KEY = 'akiloyunlari:v1';
let memory = {};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return memory;
  }
}

function save(data) {
  memory = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* gizli sekme vb. — bellekte kalır */
  }
}

export function getStars(gameId, difficulty, levelNo) {
  return load()?.[gameId]?.[difficulty]?.[levelNo] ?? 0;
}

export function setStars(gameId, difficulty, levelNo, stars) {
  const data = load();
  data[gameId] ??= {};
  data[gameId][difficulty] ??= {};
  const prev = data[gameId][difficulty][levelNo] ?? 0;
  data[gameId][difficulty][levelNo] = Math.max(prev, stars);
  save(data);
}

// Level 1 her zaman açık; sonraki level bir önceki çözülünce açılır.
export function isUnlocked(gameId, difficulty, levelNo) {
  return levelNo === 1 || getStars(gameId, difficulty, levelNo - 1) > 0;
}

export function solvedCount(gameId, difficulty) {
  return Object.keys(load()?.[gameId]?.[difficulty] ?? {}).length;
}
