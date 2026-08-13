/**
 * #696 — docs/library.json's SM_MAP_DATA entry must not drift from the real data file it
 * describes. Previously these facts were restated by hand in seven places (docs/library.md,
 * docs/library.json, docs/agents/domain-expert/design.md, docs/designs/high-level-design.md
 * x3, CLAUDE.md), discovered stale more than once across the map-data-recovery_20260811 and
 * map-col64-investigation_20260812 tracks. This test pins the one machine-readable copy
 * (library.json) against ground truth (map.json) so a future map edit that forgets to update
 * library.json fails CI instead of silently going stale.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');

function readJSON(relativePath) {
  return JSON.parse(readFileSync(join(REPO_ROOT, relativePath), 'utf8'));
}

describe('docs/library.json — SM_MAP_DATA sync with real map.json', () => {
  const library = readJSON('docs/library.json');
  const map = readJSON('data/modules/south-mountain/map.json');

  // /team-review on #697 — addressed by known path (fileLibrary.games['south-mountain'].dataModels)
  // rather than a generic recursive walk: library.json's shape is fixed, and a direct lookup
  // fails loudly if SM_MAP_DATA is ever moved rather than silently matching a stale duplicate
  // elsewhere in the document.
  const smMapData = library.fileLibrary?.games?.['south-mountain']?.dataModels?.find(
    (f) => f.id === 'SM_MAP_DATA'
  );

  it('finds the SM_MAP_DATA entry in library.json', () => {
    expect(smMapData).toBeDefined();
  });

  it('hexCount matches map.json hexes.length', () => {
    expect(smMapData?.hexCount).toBe(map.hexes.length);
  });

  it('status matches map.json _status', () => {
    expect(smMapData?.status).toBe(map._status);
  });
});
