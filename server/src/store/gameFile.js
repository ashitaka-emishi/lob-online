import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_DATA_DIR = 'data/games';

function gameDir(id, dataDir) {
  return join(dataDir, id);
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
  return JSON.parse(raw);
}
