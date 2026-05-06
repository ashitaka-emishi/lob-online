import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

import { GameStateSchema } from '../schemas/gameState.schema.js';

const DEFAULT_DATA_DIR = 'data/games';

function gameDir(id, dataDir) {
  const dir = join(dataDir, id);
  // Defense-in-depth: assert resolved path stays inside dataDir
  const resolved = resolve(dir);
  const root = resolve(dataDir);
  if (!resolved.startsWith(root + sep)) throw new Error('Invalid game id');
  return dir;
}

function statePath(id, dataDir) {
  return join(gameDir(id, dataDir), 'state.json');
}

export async function saveGame(id, state, dataDir = DEFAULT_DATA_DIR) {
  const dir = gameDir(id, dataDir);
  await mkdir(dir, { recursive: true });

  // Atomic write: write to tmp file then rename to avoid partial reads
  const dest = statePath(id, dataDir);
  const tmp = dest + '.tmp';
  await writeFile(tmp, JSON.stringify(state));
  await rename(tmp, dest);
}

export async function loadGame(id, dataDir = DEFAULT_DATA_DIR) {
  const raw = await readFile(statePath(id, dataDir), 'utf8');
  return GameStateSchema.parse(JSON.parse(raw));
}
