import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GAMES_DIR = path.join(ROOT, 'games');

export function listGames() {
  return readdirSync(GAMES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(GAMES_DIR, d.name, 'logic.js')))
    .map((d) => d.name);
}

export async function loadLogic(gameId) {
  return import(pathToFileURL(path.join(GAMES_DIR, gameId, 'logic.js')).href);
}

export const levelsPath = (gameId) => path.join(GAMES_DIR, gameId, 'levels.json');
