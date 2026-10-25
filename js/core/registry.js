// Oyun kaydı. Yeni oyun eklemek için klasörünü games/ altına koyup buraya ekleyin.
export const CATEGORIES = [
  { id: 'number', name: 'Sayısal Mantık' },
  { id: 'visual', name: 'Görsel Mantık' },
  { id: 'spatial', name: 'Konumsal Mantık' },
  { id: 'path', name: 'Yol ve Bağlantı' },
  { id: 'verbal', name: 'Sözel Mantık' },
  { id: 'geometry', name: 'Geometrik Düşünme' },
];

export const GAMES = [
  { id: 'sudoku', category: 'number', load: () => import('../../games/sudoku/index.js') },
  { id: 'futoshiki', category: 'number', load: () => import('../../games/futoshiki/index.js') },
  { id: 'nonogram', category: 'visual', load: () => import('../../games/nonogram/index.js') },
  { id: 'skyscrapers', category: 'spatial', load: () => import('../../games/skyscrapers/index.js') },
  { id: 'tents', category: 'spatial', load: () => import('../../games/tents/index.js') },
  { id: 'battleships', category: 'spatial', load: () => import('../../games/battleships/index.js') },
  { id: 'hashi', category: 'path', load: () => import('../../games/hashi/index.js') },
  { id: 'slitherlink', category: 'path', load: () => import('../../games/slitherlink/index.js') },
  { id: 'logicgrid', category: 'verbal', load: () => import('../../games/logicgrid/index.js') },
];

export async function loadGame(id) {
  const entry = GAMES.find((g) => g.id === id);
  if (!entry) return null;
  return (await entry.load()).default;
}

// Yüklenemeyen (henüz eklenmemiş) oyunlar atlanır; site bozulmaz.
export async function loadAvailableGames() {
  const loaded = await Promise.all(
    GAMES.map(async (g) => {
      try {
        return { ...g, game: await loadGame(g.id) };
      } catch (err) {
        console.warn(`Oyun yüklenemedi: ${g.id}`, err);
        return null;
      }
    }),
  );
  return loaded.filter(Boolean);
}

export async function loadLevels(id) {
  const url = new URL(`../../games/${id}/levels.json`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Level dosyası yüklenemedi: ${id}`);
  return res.json();
}
