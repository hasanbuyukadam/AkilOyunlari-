// Oyun kaydı. Yeni oyun eklemek için klasörünü games/ altına koyup buraya ekleyin.
export const GAMES = [
  { id: 'sudoku', load: () => import('../../games/sudoku/index.js') },
];

export async function loadGame(id) {
  const entry = GAMES.find((g) => g.id === id);
  if (!entry) return null;
  return (await entry.load()).default;
}

export async function loadLevels(id) {
  const url = new URL(`../../games/${id}/levels.json`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Level dosyası yüklenemedi: ${id}`);
  return res.json();
}
