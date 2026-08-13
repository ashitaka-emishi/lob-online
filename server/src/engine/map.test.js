/**
 * Tests for server/src/engine/map.js — loadMap and buildHexIndex.
 */

import { join } from 'path';
import { fileURLToPath } from 'url';

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

import { buildHexIndex, loadMap, _clearMapCacheForTests } from './map.js';
import { parseHexId } from './hex.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// ─── Happy path — real SM map file ────────────────────────────────────────────

describe('loadMap — South Mountain map', () => {
  it('loads and returns a frozen object', () => {
    const mapData = loadMap();
    expect(mapData).toBeDefined();
    expect(Object.isFrozen(mapData)).toBe(true);
  });

  it('exposes a hexes array with at least one hex', () => {
    const mapData = loadMap();
    expect(Array.isArray(mapData.hexes)).toBe(true);
    expect(mapData.hexes.length).toBeGreaterThan(0);
  });

  it('exposes a gridSpec with cols and rows', () => {
    const mapData = loadMap();
    expect(mapData.gridSpec).toBeDefined();
    expect(typeof mapData.gridSpec.cols).toBe('number');
    expect(typeof mapData.gridSpec.rows).toBe('number');
  });

  // #691 / #693 — gridSpec.cols must not overstate the map's real column count. An
  // oversized cols value silently opens up a phantom column to the pathfinder/reachability
  // checks in hex.js (hexNeighborInDir/hexNeighbors gate purely on gridSpec bounds), even
  // though no real terrain was ever digitized there. Asserts the invariant directly against
  // the recorded hex data rather than hardcoding the literal 63, so this fails whether cols
  // regresses upward (like the 64 bug) or is shrunk further while real columns still exist.
  it('gridSpec.cols matches the highest column actually present in the recorded hexes', () => {
    const mapData = loadMap();
    const maxCol = mapData.hexes.reduce((max, h) => Math.max(max, parseHexId(h.hex).col), 0);
    expect(mapData.gridSpec.cols).toBe(maxCol);
  });

  // Column bounds are strict for every hex — #691 established there is no legitimate reason
  // for a recorded hex to sit outside [1, cols]. Row bounds allow one documented exception:
  // row 0 and row (rows+1) hold `playable: false` boundary-marker hexes (the north/south
  // map-edge convention), which intentionally sit one row outside the declared grid.
  it('every recorded hex falls within the declared gridSpec column bounds', () => {
    const mapData = loadMap();
    for (const h of mapData.hexes) {
      const { col } = parseHexId(h.hex);
      expect(col).toBeGreaterThanOrEqual(1);
      expect(col).toBeLessThanOrEqual(mapData.gridSpec.cols);
    }
  });

  it('every recorded hex falls within row bounds, or is a playable:false boundary marker', () => {
    const mapData = loadMap();
    for (const h of mapData.hexes) {
      const { row } = parseHexId(h.hex);
      const inBounds = row >= 1 && row <= mapData.gridSpec.rows;
      const isBoundaryMarker =
        h.playable === false && (row === 0 || row === mapData.gridSpec.rows + 1);
      expect(inBounds || isBoundaryMarker).toBe(true);
    }
  });
});

// ─── Path traversal guard (#284) ──────────────────────────────────────────────

describe('loadMap — path traversal guard (#284)', () => {
  it('throws a generic error (no path in message) on path traversal attempt', () => {
    // Simulated path traversal: absolute path outside project
    expect(() => loadMap('/etc/passwd')).toThrow(/not allowed|invalid path|outside/i);
    // Verify path is NOT leaked in the error message
    const err = (() => {
      try {
        loadMap('/etc/passwd');
      } catch (e) {
        return e;
      }
    })();
    expect(err.message).not.toContain('/etc/passwd');
  });

  it('allows a path within the project directory (containment guard passes, file I/O attempted)', () => {
    // A path inside the engine directory: containment guard passes, then file-not-found throws
    const fakePath = join(__dirname, 'nonexistent-test.json');
    // Positive assertion: the specific file-I/O error message is reached
    expect(() => loadMap(fakePath)).toThrow(/failed to read map file/);
  });
});

// ─── loadMap caching (#427) ────────────────────────────────────────────────────

describe('loadMap — startup caching (#427)', () => {
  beforeEach(() => _clearMapCacheForTests());
  afterEach(() => vi.restoreAllMocks());

  it('returns the same cached object on subsequent calls (referential equality)', () => {
    const first = loadMap();
    const second = loadMap();
    expect(second).toBe(first);
  });

  it('returns a distinct object after cache is cleared', () => {
    const first = loadMap();
    _clearMapCacheForTests();
    const second = loadMap();
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });
});

// ─── buildHexIndex ─────────────────────────────────────────────────────────────

describe('buildHexIndex', () => {
  it('builds a Map keyed by hex ID', () => {
    const mapData = { hexes: [{ hex: '01.01', terrain: 'clear' }] };
    const index = buildHexIndex(mapData);
    expect(index).toBeInstanceOf(Map);
    expect(index.has('01.01')).toBe(true);
    expect(index.get('01.01').terrain).toBe('clear');
  });

  it('returns an empty Map for an empty hexes array', () => {
    const index = buildHexIndex({ hexes: [] });
    expect(index.size).toBe(0);
  });
});
