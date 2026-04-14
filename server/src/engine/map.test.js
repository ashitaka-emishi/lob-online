/**
 * Tests for server/src/engine/map.js — loadMap and buildHexIndex.
 */

import { writeFileSync as _writeFileSync, unlinkSync as _unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { describe, it, expect } from 'vitest';

import { buildHexIndex, loadMap } from './map.js';

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

  it('allows a path within the project directory', () => {
    // A path inside the engine directory (will fail on schema validation, not containment)
    const fakePath = join(__dirname, 'nonexistent-test.json');
    expect(() => loadMap(fakePath)).toThrow(/failed to read|schema validation/);
    // Confirm it does NOT throw the containment error
    const err = (() => {
      try {
        loadMap(fakePath);
      } catch (e) {
        return e;
      }
    })();
    expect(err.message).not.toMatch(/not allowed|invalid path|outside/i);
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
