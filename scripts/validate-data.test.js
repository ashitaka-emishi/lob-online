/**
 * Tests for scripts/validate-data.js's checker functions (#694).
 *
 * These exercise the checkers directly against small in-memory fixtures — not the real
 * data files — so a checker's own logic is verified in isolation from the current state of
 * data/modules/south-mountain/. Importing validate-data.js does not run the full script:
 * the main block is guarded behind an `import.meta.url === process.argv[1]` direct-run check.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import {
  _getCountersForTests,
  _resetCountersForTests,
  checkEdgeFeatureTypesRegistry,
  checkGridCoverage,
  checkSetupHexesInMap,
} from './validate-data.js';

beforeEach(() => {
  _resetCountersForTests();
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

  it('does not count boundary-marker hexes recorded outside the declared row bounds', () => {
    const map = {
      gridSpec: { cols: 1, rows: 1 },
      hexes: [{ hex: '01.00', playable: false }, { hex: '01.01' }],
    };
    checkGridCoverage(map);
    expect(_getCountersForTests()).toEqual({ errors: 0, warnings: 0 });
  });

  it('is a no-op when gridSpec is missing cols/rows', () => {
    checkGridCoverage({ gridSpec: {}, hexes: [] });
    expect(_getCountersForTests()).toEqual({ errors: 0, warnings: 0 });
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
