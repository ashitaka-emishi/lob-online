import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

import { STATE_SCHEMA_VERSION } from '../constants/schemaVersion.js';
import { GameStateSchema } from '../schemas/gameState.schema.js';

const DEFAULT_DATA_DIR = process.env.GAMES_DIR || 'data/games';

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

// Returns the persisted state (with incremented version) so callers can chain saves.
// Callers must adopt the returned object for any subsequent saveGame call — the in-memory
// state.version is now stale relative to what was written. (#ARCH-H3, #ARCH-M7)
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
  return toWrite;
}

export async function deleteGameFile(id, dataDir = DEFAULT_DATA_DIR) {
  const dir = gameDir(id, dataDir);
  await rm(dir, { recursive: true, force: true });
}

export async function loadGame(id, dataDir = DEFAULT_DATA_DIR) {
  const path = statePath(id, dataDir);
  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Game state file is corrupted at ${path}: expected a JSON object.`);
  }
  // #363 — reject saves whose on-disk format differs from the current schema version
  if (parsed.schemaVersion !== STATE_SCHEMA_VERSION) {
    throw new Error(
      `Game state schemaVersion mismatch at ${path}: file has ${parsed.schemaVersion ?? '(none)'}, ` +
        `expected ${STATE_SCHEMA_VERSION}. Delete this file and create a new game.`
    );
  }
  return GameStateSchema.parse(parsed);
}
