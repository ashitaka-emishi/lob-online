/**
 * Tests for scripts/validate-data.js's checker functions (#694).
 *
 * These exercise the checkers directly against small in-memory fixtures — not the real
 * data files — so a checker's own logic is verified in isolation from the current state of
 * data/modules/south-mountain/. Importing validate-data.js does not run the full script:
 * the main block is guarded behind a realpath-resolved direct-run check (see the
 * "direct-run guard" describe block below).
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  _getCountersForTests,
  _resetCountersForTests,
  checkEdgeFeatureTypesRegistry,
  checkEntryHexesInMap,
  checkGridCoverage,
  checkSetupHexesInMap,
  checkVPHexesInMap,
} from './validate-data.js';

beforeEach(() => {
  _resetCountersForTests();
  // /team-review on #697 — the checkers log via console.error/warn as a side effect (pass()
  // still logs to console.log, left visible). Suppressed here so intentional fail/warn test
  // cases don't leak stderr noise into every `npm run test` run.
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkGridCoverage', () => {
  it('passes when every in-grid cell has a hex record', () => {
    const map = {
      gridSpec: { cols: 2, rows: 2 },
      hexes: [{ hex: '01.01' }, { hex: '01.02' }, { hex: '02.01' }, { hex: '02.02' }],
    };
    checkGridCoverage(map);
    expect(_getCountersForTests()).toEqual({ errors: 0, warnings: 0 });
  });

  it('fails when the declared grid has cells with no hex record (#691 regression class)', () => {
    const map = {
      gridSpec: { cols: 2, rows: 2 },
      hexes: [{ hex: '01.01' }, { hex: '01.02' }, { hex: '02.01' }],
    };
    checkGridCoverage(map);
    expect(_getCountersForTests()).toEqual({ errors: 1, warnings: 0 });
  });

  it('does not credit a boundary-marker hex outside the declared row bounds toward coverage', () => {
    // /team-review on #697 — the grid is sized so an out-of-bounds hex being wrongly counted
    // would mask the missing 01.01 (2 records >= 1 totalSlots would incorrectly pass); only a
    // filter that actually excludes 01.00 detects the real gap. Mutation-verified: removing
    // the row-bounds filter from checkGridCoverage makes this test fail.
    const map = {
      gridSpec: { cols: 1, rows: 1 },
      hexes: [{ hex: '01.00', playable: false }],
    };
    checkGridCoverage(map);
    expect(_getCountersForTests()).toEqual({ errors: 1, warnings: 0 });
  });

  it('fails (does not silently pass) when gridSpec is missing cols/rows', () => {
    checkGridCoverage({ gridSpec: {}, hexes: [] });
    expect(_getCountersForTests()).toEqual({ errors: 1, warnings: 0 });
  });

  it('counts duplicate hex IDs once — does not let a duplicate record mask a real gap', () => {
    const map = {
      gridSpec: { cols: 2, rows: 1 },
      hexes: [{ hex: '01.01' }, { hex: '01.01' }],
    };
    checkGridCoverage(map);
    expect(_getCountersForTests()).toEqual({ errors: 1, warnings: 0 });
  });
});

describe('checkEdgeFeatureTypesRegistry', () => {
  it('passes when every registry entry is a valid schema type', () => {
    checkEdgeFeatureTypesRegistry({ edgeFeatureTypes: ['stoneWall', 'road'] });
    expect(_getCountersForTests()).toEqual({ errors: 0, warnings: 0 });
  });

  it('fails when the registry contains a type not in the schema enum', () => {
    checkEdgeFeatureTypesRegistry({ edgeFeatureTypes: ['fence'] });
    expect(_getCountersForTests().errors).toBeGreaterThan(0);
  });

  it('is a no-op when edgeFeatureTypes is absent', () => {
    checkEdgeFeatureTypesRegistry({});
    expect(_getCountersForTests()).toEqual({ errors: 0, warnings: 0 });
  });
});

describe('checkSetupHexesInMap', () => {
  const map = { hexes: [{ hex: '01.01' }, { hex: '02.02' }] };

  it('passes when every setup hex and referenceHex is present in the map', () => {
    const scenario = {
      setup: {
        union: [{ hex: '01.01' }],
        confederate: [{ referenceHex: '02.02' }],
      },
    };
    checkSetupHexesInMap(scenario, map);
    expect(_getCountersForTests()).toEqual({ errors: 0, warnings: 0 });
  });

  it('fails when a setup hex is not present in the map', () => {
    const scenario = { setup: { union: [{ hex: '99.99' }], confederate: [] } };
    checkSetupHexesInMap(scenario, map);
    expect(_getCountersForTests().errors).toBeGreaterThan(0);
  });

  it('warns (not fails) when a referenceHex is not present in the map', () => {
    const scenario = { setup: { union: [], confederate: [{ referenceHex: '99.99' }] } };
    checkSetupHexesInMap(scenario, map);
    expect(_getCountersForTests()).toEqual({ errors: 0, warnings: 1 });
  });

  it('checks units nested inside a setup group entry', () => {
    const scenario = {
      setup: { union: [{ units: [{ hex: '99.99' }] }], confederate: [] },
    };
    checkSetupHexesInMap(scenario, map);
    expect(_getCountersForTests().errors).toBeGreaterThan(0);
  });
});

describe('checkVPHexesInMap', () => {
  const map = { hexes: [{ hex: '01.01' }, { hex: '02.02' }] };

  it('passes when every VP hex is present in the map', () => {
    const scenario = { victoryPoints: { terrain: [{ hex: '01.01' }] } };
    checkVPHexesInMap(scenario, map);
    expect(_getCountersForTests()).toEqual({ errors: 0, warnings: 0 });
  });

  it('fails when a VP hex is not present in the map', () => {
    const scenario = { victoryPoints: { terrain: [{ hex: '99.99' }] } };
    checkVPHexesInMap(scenario, map);
    expect(_getCountersForTests()).toEqual({ errors: 1, warnings: 0 });
  });

  it('is a no-op (no failures) when victoryPoints.terrain is absent', () => {
    checkVPHexesInMap({}, map);
    expect(_getCountersForTests()).toEqual({ errors: 0, warnings: 0 });
  });
});

describe('checkEntryHexesInMap', () => {
  const map = { hexes: [{ hex: '01.01' }, { hex: '02.02' }] };

  it('passes when every reinforcement entry hex is present in the map', () => {
    const scenario = {
      reinforcements: { union: [{ entryHex: '01.01' }], confederate: [] },
    };
    checkEntryHexesInMap(scenario, map);
    expect(_getCountersForTests()).toEqual({ errors: 0, warnings: 0 });
  });

  it('fails when a group entryHex is not present in the map', () => {
    const scenario = {
      reinforcements: { union: [{ entryHex: '99.99' }], confederate: [] },
    };
    checkEntryHexesInMap(scenario, map);
    expect(_getCountersForTests()).toEqual({ errors: 1, warnings: 0 });
  });

  it('checks variableTable entryHex entries, not just the group-level entryHex', () => {
    const scenario = {
      reinforcements: {
        union: [{ variableTable: [{ entryHex: '99.99' }] }],
        confederate: [],
      },
    };
    checkEntryHexesInMap(scenario, map);
    expect(_getCountersForTests()).toEqual({ errors: 1, warnings: 0 });
  });
});

// /team-review (second pass) on #697 — the direct-run guard itself (the exact code that
// makes this whole file importable) previously had zero regression coverage; a naive
// `import.meta.url === \`file://${process.argv[1]}\`` comparison silently skipped all
// validation and exited 0 whenever the invocation path needed URL-encoding or went through
// a symlink. Reproduces that precise double failure mode (space in the path AND a symlink)
// via a real child process, since the guard only matters under actual `node <path>` execution.
describe('direct-run guard', () => {
  it('still runs the full validation when invoked via a symlinked path containing a space', () => {
    const scriptPath = fileURLToPath(new URL('./validate-data.js', import.meta.url));
    const dir = mkdtempSync(join(tmpdir(), 'validate data '));
    const linkPath = join(dir, 'vd.mjs');
    symlinkSync(scriptPath, linkPath);

    const result = spawnSync(process.execPath, [linkPath], { encoding: 'utf8' });

    expect(result.stdout).toContain('lob-online — M0 Data Validation');
    expect(result.stdout).toContain('Summary');
    expect(result.status).toBe(0);
  });
});
