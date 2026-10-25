// Tüm oyunlar için ortak ayarlar.
export const LEVELS_PER_DIFFICULTY = 20;

export const DIFFICULTIES = [
  { id: 'easy', name: 'Kolay', color: '#3fae6a' },
  { id: 'medium', name: 'Orta', color: '#e0a32e' },
  { id: 'hard', name: 'Zor', color: '#d9534f' },
];

export const BOOSTERS_PER_GAME = 3;

// Kullanılan booster sayısına göre yıldız.
export function starsFor(boostersUsed) {
  if (boostersUsed === 0) return 3;
  if (boostersUsed <= 2) return 2;
  return 1;
}
