import { describe, it, expect } from 'vitest';

import { applyRetreat } from './retreat.js';

// ─── Minimal map fixture ───────────────────────────────────────────────────────
// 5-column × 5-row grid, no terrain features (all passable)
// Hex IDs are "CC.RR" (col.row, 1-indexed from bottom)
const GRID_SPEC = { cols: 5, rows: 5 };

function makeMapData(extraHexes = []) {
  const hexes = [];
  for (let c = 1; c <= 5; c++) {
    for (let r = 1; r <= 5; r++) {
      hexes.push({ hex: `${String(c).padStart(2, '0')}.${String(r).padStart(2, '0')}` });
    }
  }
  // Merge any overrides (e.g. a hex with wedgeElevations marking an impassable hexside)
  for (const extra of extraHexes) {
    const idx = hexes.findIndex((h) => h.hex === extra.hex);
    if (idx >= 0) hexes[idx] = extra;
    else hexes.push(extra);
  }
  return { gridSpec: GRID_SPEC, hexes };
}

describe('applyRetreat', () => {
  it('returns unit-in-place when mapData is absent (LOB §6.1)', () => {
    const result = applyRetreat('03.03', '03.04', 1, null);
    expect(result.destHex).toBe('03.03');
    expect(result.steps).toEqual(['03.03']);
    expect(result.usedFallback).toBe(false);
  });

  it('retreats 1 hex away from the combat hex (LOB §6.1)', () => {
    // Unit at 03.03, enemy at 03.04 (S of unit in row terms).
    // Retreat direction = away from enemy. The function should move the unit
    // to a hex that is farther from 03.04 than 03.03 is.
    const mapData = makeMapData();
    const result = applyRetreat('03.03', '03.04', 1, mapData);
    expect(result.destHex).not.toBe('03.03'); // must have moved
    expect(result.steps.length).toBe(2); // start + 1 step
    expect(result.usedFallback).toBe(false);
  });

  it('retreats 2 hexes away from the combat hex (LOB §6.1)', () => {
    const mapData = makeMapData();
    const result = applyRetreat('03.03', '03.04', 2, mapData);
    expect(result.steps.length).toBe(3); // start + 2 steps
    expect(result.destHex).not.toBe('03.03');
  });

  it('steps array starts with the unit hex (LOB §6.1)', () => {
    const mapData = makeMapData();
    const result = applyRetreat('03.03', '03.04', 1, mapData);
    expect(result.steps[0]).toBe('03.03');
  });

  it('uses fallback direction when primary is impassable (LOB §6.1 — impassable fallback)', () => {
    // Place unit at 03.02, combat hex at 03.01 (directly S / lower row).
    // The primary retreat (away from 03.01) will be northward toward 03.03.
    // Block that hexside by making 03.03 have a vertical slope on its S face (dir 3),
    // which is stored as 03.03.edges["0"] on the neighbor (NW/SW) — or more directly,
    // add wedgeElevations with delta ≥ 3 on the entering hexside.
    // Simpler: make 03.03 an unknown hex (absent from hexes) so it's treated as impassable.
    const mapData = makeMapData();
    // Remove hex 03.03 so the primary retreat direction is blocked
    mapData.hexes = mapData.hexes.filter((h) => h.hex !== '03.03');

    const result = applyRetreat('03.02', '03.01', 1, mapData);
    // Must have moved (fallback to another neighbor)
    expect(result.usedFallback).toBe(true);
    // destHex is not the combat hex and not the starting hex
    expect(result.destHex).not.toBe('03.02');
    expect(result.destHex).not.toBe('03.01');
  });

  it('stays in place when all retreat directions are blocked (LOB §6.1)', () => {
    // Unit at 01.01 (corner). Enemy at 01.02 (N). Primary retreat is S (03),
    // but 01.01 is at the bottom-left corner — some neighbors are off-map.
    // Force all in-bounds neighbors to be impassable by removing them from hexes.
    const mapData = makeMapData();
    // Keep only the unit hex and enemy hex; everything else is impassable
    mapData.hexes = mapData.hexes.filter((h) => h.hex === '01.01' || h.hex === '01.02');

    const result = applyRetreat('01.01', '01.02', 1, mapData);
    // No passable retreat hex available — unit stays in place
    expect(result.destHex).toBe('01.01');
    expect(result.usedFallback).toBe(true);
  });

  it('does not retreat toward the enemy hex (LOB §6.1)', () => {
    const mapData = makeMapData();
    const result = applyRetreat('03.03', '03.04', 2, mapData);
    // No step in the path should be the combat hex (03.04)
    expect(result.steps).not.toContain('03.04');
  });
});
