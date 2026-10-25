// Tüm oyunların tüm levellerini bağımsız olarak doğrular (tek çözüm garantisi).
// Kullanım: node tools/verify.mjs [oyun-id]
import { readFileSync, existsSync } from 'node:fs';
import { DIFFICULTIES, LEVELS_PER_DIFFICULTY } from '../js/core/config.js';
import { listGames, loadLogic, levelsPath } from './common.mjs';

const only = process.argv[2];
const games = only ? [only] : listGames();
let failures = 0;

for (const gameId of games) {
  const file = levelsPath(gameId);
  if (!existsSync(file)) { console.error(`✗ ${gameId}: levels.json yok`); failures++; continue; }
  const logic = await loadLogic(gameId);
  const levels = JSON.parse(readFileSync(file, 'utf8'));
  const seen = new Set();
  let ok = 0;
  for (const diff of DIFFICULTIES) {
    const list = levels[diff.id] ?? [];
    if (list.length !== LEVELS_PER_DIFFICULTY) {
      console.error(`✗ ${gameId} ${diff.name}: ${list.length} level var, ${LEVELS_PER_DIFFICULTY} olmalı`);
      failures++;
    }
    list.forEach((level, i) => {
      const key = JSON.stringify(level.puzzle);
      const err = seen.has(key) ? 'Tekrarlanan bulmaca' : logic.verifyLevel(level);
      seen.add(key);
      if (err) { console.error(`✗ ${gameId} ${diff.name} #${i + 1}: ${err}`); failures++; }
      else ok++;
    });
  }
  console.log(`${gameId}: ${ok} level doğrulandı (tek çözüm)`);
}

if (failures) { console.error(`\n${failures} hata`); process.exit(1); }
console.log('\nTüm levellerin tek çözümü olduğu doğrulandı ✓');
