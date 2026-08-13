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

  function findSmMapDataEntry(node) {
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findSmMapDataEntry(item);
        if (found) return found;
      }
      return null;
    }
    if (node && typeof node === 'object') {
      if (node.id === 'SM_MAP_DATA') return node;
      for (const value of Object.values(node)) {
        const found = findSmMapDataEntry(value);
        if (found) return found;
      }
    }
    return null;
  }

  const smMapData = findSmMapDataEntry(library);

  it('finds the SM_MAP_DATA entry in library.json', () => {
    expect(smMapData).not.toBeNull();
  });

  it('hexCount matches map.json hexes.length', () => {
    expect(smMapData.hexCount).toBe(map.hexes.length);
  });

  it('status matches map.json _status', () => {
    expect(smMapData.status).toBe(map._status);
  });
});
