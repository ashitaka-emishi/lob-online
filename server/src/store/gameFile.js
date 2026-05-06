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

  const dest = statePath(id, dataDir);

  // Optimistic concurrency: if a file exists, stored version must match state.version (#332)
  if (typeof state.version === 'number') {
    try {
      const raw = await readFile(dest, 'utf8');
      const stored = JSON.parse(raw);
      if (stored.version !== state.version) {
        throw new Error(
          `Version conflict on game ${id}: stored=${stored.version}, expected=${state.version}`
        );
      }
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  // Atomic write with incremented version
  const tmp = dest + '.tmp';
  const toWrite =
    typeof state.version === 'number' ? { ...state, version: state.version + 1 } : state;
  await writeFile(tmp, JSON.stringify(toWrite));
  await rename(tmp, dest);
}

export async function loadGame(id, dataDir = DEFAULT_DATA_DIR) {
  const raw = await readFile(statePath(id, dataDir), 'utf8');
  return GameStateSchema.parse(JSON.parse(raw));
}
