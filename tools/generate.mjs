// Kullanım: node tools/generate.mjs <oyun-id> [tohum]
// Her zorluk için 20 level üretir, her birini tek çözüm için doğrular ve levels.json'a yazar.
import { writeFileSync } from 'node:fs';
import { DIFFICULTIES, LEVELS_PER_DIFFICULTY } from '../js/core/config.js';
import { createRng } from '../js/core/rng.js';
import { listGames, loadLogic, levelsPath } from './common.mjs';

// Her level tek satırda: dosya küçük kalır, farklar okunur olur.
function formatLevels(out) {
  const parts = Object.entries(out).map(
    ([diff, list]) => `  ${JSON.stringify(diff)}: [\n${list.map((l) => `    ${JSON.stringify(l)}`).join(',\n')}\n  ]`,
  );
  return `{\n${parts.join(',\n')}\n}\n`;
}

const [gameId, seed = 'v1'] = process.argv.slice(2);
if (!gameId || !listGames().includes(gameId)) {
  console.error(`Kullanım: node tools/generate.mjs <oyun-id> [tohum]\nOyunlar: ${listGames().join(', ')}`);
  process.exit(1);
}

const logic = await loadLogic(gameId);
const out = {};
const seen = new Set();

for (const diff of DIFFICULTIES) {
  out[diff.id] = [];
  for (let i = 0; i < LEVELS_PER_DIFFICULTY; i++) {
    const t0 = Date.now();
    let level, salt = 0;
    do {
      level = logic.generateLevel(createRng(`${gameId}:${seed}:${diff.id}:${i}:${salt++}`), diff.id, i, LEVELS_PER_DIFFICULTY);
    } while (seen.has(JSON.stringify(level.puzzle)));
    const err = logic.verifyLevel(level);
    if (err) throw new Error(`${diff.id} #${i + 1} doğrulanamadı: ${err}`);
    seen.add(JSON.stringify(level.puzzle));
    out[diff.id].push(level);
    console.log(`${gameId} ${diff.name.padEnd(5)} #${String(i + 1).padStart(2)} ✓ tek çözüm (${Date.now() - t0} ms)`);
  }
}

writeFileSync(levelsPath(gameId), formatLevels(out));
console.log(`\n${levelsPath(gameId)} yazıldı.`);
