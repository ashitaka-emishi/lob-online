/**
 * Tests for server/src/engine/tables/combat.js
 *
 * Verifies every cell of the Combat Table and Opening Volley Table against
 * LOB_CHARTS §5.4 and §5.6, plus all column shift rules.
 */

import { describe, expect, it } from 'vitest';

import {
  ARTILLERY_RANGE_SHIFTS,
  COMBAT_COLUMNS,
  COMBAT_TABLE,
  SMALL_ARMS_RANGE_SHIFTS,
  ammoTypeShift,
  applyColumnShifts,
  artilleryRangeShift,
  combatResult,
  openingVolleyResult,
  smallArmsRangeShift,
  spToColumn,
  targetStateShift,
} from './combat.js';

// ─── Combat Table — every cell (LOB_CHARTS §5.6) ──────────────────────────────

describe('COMBAT_TABLE — complete cell verification (LOB_CHARTS §5.6)', () => {
  // Table rows indexed by [roll-2][colIndex]
  // Columns: -B(0), -A(1), 1(2), 2-3(3), 4-5(4), 6-8(5), A(6), B(7), C(8), D(9)

  const col = (label) => COMBAT_COLUMNS.indexOf(label);

  it('roll 2 — all nulls left of B, m at B and C, 1 at D', () => {
    const row = COMBAT_TABLE[0]; // roll 2
    expect(row[col('-B')]).toBeNull();
    expect(row[col('-A')]).toBeNull();
    expect(row[col('1')]).toBeNull();
    expect(row[col('2-3')]).toBeNull();
    expect(row[col('4-5')]).toBeNull();
    expect(row[col('6-8')]).toBeNull();
    expect(row[col('A')]).toBeNull();
    expect(row[col('B')]).toBe('m');
    expect(row[col('C')]).toBe('m');
    expect(row[col('D')]).toBe(1);
  });

  it('roll 3 — m at A and B, 1 at C and D', () => {
    const row = COMBAT_TABLE[1];
    expect(row[col('A')]).toBe('m');
    expect(row[col('B')]).toBe('m');
    expect(row[col('C')]).toBe(1);
    expect(row[col('D')]).toBe(1);
  });

  it('roll 4 — m at A, 1 at B, C, D', () => {
    const row = COMBAT_TABLE[2];
    expect(row[col('A')]).toBe('m');
    expect(row[col('B')]).toBe(1);
    expect(row[col('C')]).toBe(1);
    expect(row[col('D')]).toBe(1);
  });

  it('roll 5 — m at 6-8, 1 at A, B, C, D; nulls left of 6-8', () => {
    const row = COMBAT_TABLE[3];
    expect(row[col('2-3')]).toBeNull();
    expect(row[col('4-5')]).toBeNull();
    expect(row[col('6-8')]).toBe('m');
    expect(row[col('A')]).toBe(1);
    expect(row[col('D')]).toBe(1);
  });

  it('roll 6 — m at 4-5 and 6-8, 1 at A, B, C; 2 at D', () => {
    const row = COMBAT_TABLE[4];
    expect(row[col('2-3')]).toBeNull();
    expect(row[col('4-5')]).toBe('m');
    expect(row[col('6-8')]).toBe('m');
    expect(row[col('A')]).toBe(1);
    expect(row[col('B')]).toBe(1);
    expect(row[col('C')]).toBe(1);
    expect(row[col('D')]).toBe(2);
  });

  it('roll 7 — m at 2-3 and 4-5, 1 at 6-8 through B, 2 at C and D', () => {
    const row = COMBAT_TABLE[5];
    expect(row[col('1')]).toBeNull();
    expect(row[col('2-3')]).toBe('m');
    expect(row[col('4-5')]).toBe('m');
    expect(row[col('6-8')]).toBe(1);
    expect(row[col('A')]).toBe(1);
    expect(row[col('B')]).toBe(1);
    expect(row[col('C')]).toBe(2);
    expect(row[col('D')]).toBe(2);
  });

  it('roll 8 — m at 1 and 2-3, 1 at 4-5 through A, 2 at B, C, D', () => {
    const row = COMBAT_TABLE[6];
    expect(row[col('-A')]).toBeNull();
    expect(row[col('1')]).toBe('m');
    expect(row[col('2-3')]).toBe('m');
    expect(row[col('4-5')]).toBe(1);
    expect(row[col('6-8')]).toBe(1);
    expect(row[col('A')]).toBe(1);
    expect(row[col('B')]).toBe(2);
    expect(row[col('C')]).toBe(2);
    expect(row[col('D')]).toBe(2);
  });

  it('roll 9 — m at 1 and 2-3, 1 at 4-5 through 6-8, 2 at A through C, 3 at D', () => {
    const row = COMBAT_TABLE[7];
    expect(row[col('-A')]).toBeNull();
    expect(row[col('1')]).toBe('m');
    expect(row[col('2-3')]).toBe(1);
    expect(row[col('4-5')]).toBe(1);
    expect(row[col('6-8')]).toBe(1);
    expect(row[col('A')]).toBe(2);
    expect(row[col('B')]).toBe(2);
    expect(row[col('C')]).toBe(2);
    expect(row[col('D')]).toBe(3);
  });

  it('roll 10 — m at -A, 1 at 1 through 4-5, 2 at 6-8 through C, 3 at D', () => {
    const row = COMBAT_TABLE[8];
    expect(row[col('-B')]).toBeNull();
    expect(row[col('-A')]).toBe('m');
    expect(row[col('1')]).toBe(1);
    expect(row[col('2-3')]).toBe(1);
    expect(row[col('4-5')]).toBe(1);
    expect(row[col('6-8')]).toBe(2);
    expect(row[col('A')]).toBe(2);
    expect(row[col('B')]).toBe(2);
    expect(row[col('C')]).toBe(3);
    expect(row[col('D')]).toBe(3);
  });

  it('roll 11 — m at -B, 1 at -A through 2-3, 2 at 4-5 through A, 3 at B through D', () => {
    const row = COMBAT_TABLE[9];
    expect(row[col('-B')]).toBe('m');
    expect(row[col('-A')]).toBe(1);
    expect(row[col('1')]).toBe(1);
    expect(row[col('2-3')]).toBe(1);
    expect(row[col('4-5')]).toBe(2);
    expect(row[col('6-8')]).toBe(2);
    expect(row[col('A')]).toBe(2);
    expect(row[col('B')]).toBe(3);
    expect(row[col('C')]).toBe(3);
    expect(row[col('D')]).toBe(3);
  });

  it('roll 12 — 1 at -B through 1, 2 at 2-3 through 6-8, 3 at A through C, 4 at D', () => {
    const row = COMBAT_TABLE[10];
    expect(row[col('-B')]).toBe(1);
    expect(row[col('-A')]).toBe(1);
    expect(row[col('1')]).toBe(1);
    expect(row[col('2-3')]).toBe(2);
    expect(row[col('4-5')]).toBe(2);
    expect(row[col('6-8')]).toBe(2);
    expect(row[col('A')]).toBe(3);
    expect(row[col('B')]).toBe(3);
    expect(row[col('C')]).toBe(3);
    expect(row[col('D')]).toBe(4);
  });
});

// ─── spToColumn (LOB_CHARTS §5.6) ─────────────────────────────────────────────

describe('spToColumn — SP total → starting column (LOB_CHARTS §5.6)', () => {
  it('SPs 0 or less → -B (off left edge)', () => {
    expect(spToColumn(0)).toBe('-B');
    expect(spToColumn(-1)).toBe('-B');
  });

  it('SPs 1 → column 1', () => {
    expect(spToColumn(1)).toBe('1');
  });

  it('SPs 2 and 3 → column 2-3', () => {
    expect(spToColumn(2)).toBe('2-3');
    expect(spToColumn(3)).toBe('2-3');
  });

  it('SPs 4 and 5 → column 4-5', () => {
    expect(spToColumn(4)).toBe('4-5');
    expect(spToColumn(5)).toBe('4-5');
  });

  it('SPs 6, 7, and 8 → column 6-8', () => {
    expect(spToColumn(6)).toBe('6-8');
    expect(spToColumn(7)).toBe('6-8');
    expect(spToColumn(8)).toBe('6-8');
  });
});

// ─── applyColumnShifts ─────────────────────────────────────────────────────────

describe('applyColumnShifts — column shift application', () => {
  it('right shift from 6-8 reaches lettered columns', () => {
    expect(applyColumnShifts('6-8', 1)).toBe('A');
    expect(applyColumnShifts('6-8', 2)).toBe('B');
    expect(applyColumnShifts('6-8', 3)).toBe('C');
    expect(applyColumnShifts('6-8', 4)).toBe('D');
  });

  it('left shift from 1 reaches -A and -B', () => {
    expect(applyColumnShifts('1', -1)).toBe('-A');
    expect(applyColumnShifts('1', -2)).toBe('-B');
  });

  it('clamps at -B on left boundary', () => {
    expect(applyColumnShifts('-B', -5)).toBe('-B');
  });

  it('clamps at D on right boundary', () => {
    expect(applyColumnShifts('D', 5)).toBe('D');
  });

  it('zero shift returns same column', () => {
    expect(applyColumnShifts('4-5', 0)).toBe('4-5');
  });
});

// ─── combatResult — full result structure ─────────────────────────────────────

describe('combatResult — result structure (LOB_CHARTS §5.6)', () => {
  it('null cell → resultType none, spLoss 0, no checks', () => {
    // 6-8 SPs, no shifts, roll 2 → null
    const r = combatResult(6, 0, 2);
    expect(r.resultType).toBe('none');
    expect(r.spLoss).toBe(0);
    expect(r.moraleCheckRequired).toBe(false);
    expect(r.leaderLossCheckRequired).toBe(false);
  });

  it('m cell → resultType morale, spLoss 0, moraleCheck true, no leader loss', () => {
    // 6-8 SPs, no shifts, roll 5 → m
    const r = combatResult(6, 0, 5);
    expect(r.resultType).toBe('morale');
    expect(r.spLoss).toBe(0);
    expect(r.moraleCheckRequired).toBe(true);
    expect(r.leaderLossCheckRequired).toBe(false);
  });

  it('numeric cell → resultType full, correct spLoss, both checks required', () => {
    // 6-8 SPs, no shifts, roll 7 → 1 SP loss
    const r = combatResult(6, 0, 7);
    expect(r.resultType).toBe('full');
    expect(r.spLoss).toBe(1);
    expect(r.moraleCheckRequired).toBe(true);
    expect(r.leaderLossCheckRequired).toBe(true);
  });

  it('D column roll 12 → spLoss 4', () => {
    // 6-8 SPs, +4 right shifts → column D; roll 12 → 4
    const r = combatResult(6, 4, 12);
    expect(r.resultType).toBe('full');
    expect(r.spLoss).toBe(4);
    expect(r.finalColumn).toBe('D');
  });

  it('finalColumn is reported correctly', () => {
    // 4-5 SPs starts at index 4 ('4-5'); +2 right → index 6 = 'A'
    const r = combatResult(4, 2, 7);
    expect(r.finalColumn).toBe('A');
  });

  it('left depletion band: -B through 2-3 → depletionBand left', () => {
    expect(combatResult(1, 0, 7).depletionBand).toBe('left'); // column 1
    expect(combatResult(3, 0, 7).depletionBand).toBe('left'); // column 2-3
    expect(combatResult(1, -2, 7).depletionBand).toBe('left'); // column -B
  });

  it('right depletion band: 4-5 through D → depletionBand right', () => {
    expect(combatResult(4, 0, 7).depletionBand).toBe('right'); // column 4-5
    expect(combatResult(6, 0, 7).depletionBand).toBe('right'); // column 6-8
    expect(combatResult(6, 4, 7).depletionBand).toBe('right'); // column D
  });
});

// ─── Opening Volley Table (LOB_CHARTS §5.4) ───────────────────────────────────

describe('openingVolleyResult — all cells (LOB_CHARTS §5.4)', () => {
  it('range3: rolls 1-5 → 0 SP loss; roll 6 → 1 SP loss', () => {
    for (let r = 1; r <= 5; r++) expect(openingVolleyResult('range3', r).spLoss).toBe(0);
    expect(openingVolleyResult('range3', 6).spLoss).toBe(1);
  });

  it('range2: rolls 1-4 → 0; rolls 5-6 → 1', () => {
    for (let r = 1; r <= 4; r++) expect(openingVolleyResult('range2', r).spLoss).toBe(0);
    expect(openingVolleyResult('range2', 5).spLoss).toBe(1);
    expect(openingVolleyResult('range2', 6).spLoss).toBe(1);
  });

  it('range1: rolls 1-3 → 0; rolls 4-6 → 1', () => {
    for (let r = 1; r <= 3; r++) expect(openingVolleyResult('range1', r).spLoss).toBe(0);
    for (let r = 4; r <= 6; r++) expect(openingVolleyResult('range1', r).spLoss).toBe(1);
  });

  it('charge: rolls 1-2 → 0; rolls 3-5 → 1; roll 6 → 2', () => {
    expect(openingVolleyResult('charge', 1).spLoss).toBe(0);
    expect(openingVolleyResult('charge', 2).spLoss).toBe(0);
    expect(openingVolleyResult('charge', 3).spLoss).toBe(1);
    expect(openingVolleyResult('charge', 5).spLoss).toBe(1);
    expect(openingVolleyResult('charge', 6).spLoss).toBe(2);
  });

  it('shiftOnly: roll 1 → 0; rolls 2-4 → 1; rolls 5-6 → 2', () => {
    expect(openingVolleyResult('shiftOnly', 1).spLoss).toBe(0);
    expect(openingVolleyResult('shiftOnly', 2).spLoss).toBe(1);
    expect(openingVolleyResult('shiftOnly', 4).spLoss).toBe(1);
    expect(openingVolleyResult('shiftOnly', 5).spLoss).toBe(2);
    expect(openingVolleyResult('shiftOnly', 6).spLoss).toBe(2);
  });

  it('unknown condition → 0 SP loss', () => {
    expect(openingVolleyResult('unknown', 6).spLoss).toBe(0);
  });
});

// ─── Small-arms range shifts (LOB_CHARTS §5.6) ────────────────────────────────

describe('smallArmsRangeShift — range shifts (LOB_CHARTS §5.6)', () => {
  it('range 1 → 0 shift for both regular and sharpshooter', () => {
    expect(smallArmsRangeShift(1)).toBe(0);
    expect(smallArmsRangeShift(1, true)).toBe(0);
  });

  it('range 2 → -1 regular, 0 sharpshooter', () => {
    expect(smallArmsRangeShift(2)).toBe(-1);
    expect(smallArmsRangeShift(2, true)).toBe(0);
  });

  it('range 3 → -2 regular, -1 sharpshooter', () => {
    expect(smallArmsRangeShift(3)).toBe(-2);
    expect(smallArmsRangeShift(3, true)).toBe(-1);
  });

  it('range 4 → -3 regular, -1 sharpshooter', () => {
    expect(smallArmsRangeShift(4)).toBe(-3);
    expect(smallArmsRangeShift(4, true)).toBe(-1);
  });

  it('range 5 → -3 regular, -1 sharpshooter (same as 4+)', () => {
    expect(smallArmsRangeShift(5)).toBe(-3);
    expect(smallArmsRangeShift(5, true)).toBe(-1);
  });
});

// ─── Artillery range shifts (LOB_CHARTS §5.6) ─────────────────────────────────

describe('artilleryRangeShift — range shifts (LOB_CHARTS §5.6)', () => {
  it('ranges 1-5 → 0 shift', () => {
    for (let r = 1; r <= 5; r++) expect(artilleryRangeShift(r)).toBe(0);
  });

  it('ranges 6-9 → -1 shift', () => {
    expect(artilleryRangeShift(6)).toBe(-1);
    expect(artilleryRangeShift(9)).toBe(-1);
  });

  it('ranges 10-13 → -2 shift', () => {
    expect(artilleryRangeShift(10)).toBe(-2);
    expect(artilleryRangeShift(13)).toBe(-2);
  });

  it('ranges 14-15 → -3 shift', () => {
    expect(artilleryRangeShift(14)).toBe(-3);
    expect(artilleryRangeShift(15)).toBe(-3);
  });

  it('range 16+ → -4 shift', () => {
    expect(artilleryRangeShift(16)).toBe(-4);
    expect(artilleryRangeShift(30)).toBe(-4);
  });
});

// ─── Ammo-type shifts (LOB_CHARTS §5.6) ───────────────────────────────────────

describe('ammoTypeShift — firepower shifts (LOB_CHARTS §5.6)', () => {
  it('null ammo → 0 shift', () => {
    expect(ammoTypeShift(null, 1, 6)).toBe(0);
  });

  it('buckAndBall: +1 at range 1 with sufficient SPs', () => {
    expect(ammoTypeShift('buckAndBall', 1, 6)).toBe(1);
  });

  it('buckAndBall: 0 at range 2+ (beyond maxRange 1)', () => {
    expect(ammoTypeShift('buckAndBall', 2, 6)).toBe(0);
  });

  it('breechloader: +1 at range 1-2 with sufficient SPs', () => {
    expect(ammoTypeShift('breechloader', 1, 4)).toBe(1);
    expect(ammoTypeShift('breechloader', 2, 4)).toBe(1);
  });

  it('breechloader: 0 at range 3+ (beyond maxRange 2)', () => {
    expect(ammoTypeShift('breechloader', 3, 4)).toBe(0);
  });

  it('repeater: +2 at range 1-2 with sufficient SPs', () => {
    expect(ammoTypeShift('repeater', 1, 6)).toBe(2);
    expect(ammoTypeShift('repeater', 2, 6)).toBe(2);
  });

  it('normalCanister: +1 at range 1-3', () => {
    for (let r = 1; r <= 3; r++) expect(ammoTypeShift('normalCanister', r, 6)).toBe(1);
    expect(ammoTypeShift('normalCanister', 4, 6)).toBe(0);
  });

  it('denseCanister: +2 at range 1-3', () => {
    for (let r = 1; r <= 3; r++) expect(ammoTypeShift('denseCanister', r, 6)).toBe(2);
    expect(ammoTypeShift('denseCanister', 4, 6)).toBe(0);
  });

  it('threshold prevents shift when firer SPs are 0', () => {
    expect(ammoTypeShift('buckAndBall', 1, 0)).toBe(0);
  });

  it('threshold allows shift when firer SPs meet minimum (1 SP → threshold 1)', () => {
    expect(ammoTypeShift('buckAndBall', 1, 1)).toBe(1);
  });
});

// ─── Target-state shifts (LOB_CHARTS §5.6) ────────────────────────────────────

describe('targetStateShift — target-state column shifts (LOB_CHARTS §5.6)', () => {
  it('no flags → 0', () => {
    expect(
      targetStateShift({
        isRear: false,
        isDG: false,
        range: 5,
        hasProtectiveTerrain: false,
        isOpenOrderCapable: false,
      })
    ).toBe(0);
  });

  it('isRear at range < 10 → +2', () => {
    expect(
      targetStateShift({
        isRear: true,
        isDG: false,
        range: 5,
        hasProtectiveTerrain: false,
        isOpenOrderCapable: false,
      })
    ).toBe(2);
  });

  it('isRear at range 10+ → 0 (** rule: ignored at range 10+)', () => {
    expect(
      targetStateShift({
        isRear: true,
        isDG: false,
        range: 10,
        hasProtectiveTerrain: false,
        isOpenOrderCapable: false,
      })
    ).toBe(0);
  });

  it('isDG at range < 10 → +1', () => {
    expect(
      targetStateShift({
        isRear: false,
        isDG: true,
        range: 5,
        hasProtectiveTerrain: false,
        isOpenOrderCapable: false,
      })
    ).toBe(1);
  });

  it('isDG at range 10+ → 0 (** rule)', () => {
    expect(
      targetStateShift({
        isRear: false,
        isDG: true,
        range: 10,
        hasProtectiveTerrain: false,
        isOpenOrderCapable: false,
      })
    ).toBe(0);
  });

  it('hasProtectiveTerrain → -1 (stone wall, etc.)', () => {
    expect(
      targetStateShift({
        isRear: false,
        isDG: false,
        range: 5,
        hasProtectiveTerrain: true,
        isOpenOrderCapable: false,
      })
    ).toBe(-1);
  });

  it('isOpenOrderCapable → -1', () => {
    expect(
      targetStateShift({
        isRear: false,
        isDG: false,
        range: 5,
        hasProtectiveTerrain: false,
        isOpenOrderCapable: true,
      })
    ).toBe(-1);
  });

  it('isRear + isDG at range < 10 → +3 combined', () => {
    expect(
      targetStateShift({
        isRear: true,
        isDG: true,
        range: 5,
        hasProtectiveTerrain: false,
        isOpenOrderCapable: false,
      })
    ).toBe(3);
  });

  it('isRear + protective terrain → net +1 (2 right - 1 left)', () => {
    expect(
      targetStateShift({
        isRear: true,
        isDG: false,
        range: 5,
        hasProtectiveTerrain: true,
        isOpenOrderCapable: false,
      })
    ).toBe(1);
  });

  it('SM §4.1 note: breastworks not present in SM but protective terrain flag still applies for other terrain', () => {
    // Stone walls, rock ledges, sunken roads exist in SM — protective terrain shift applies
    expect(
      targetStateShift({
        isRear: false,
        isDG: false,
        range: 5,
        hasProtectiveTerrain: true,
        isOpenOrderCapable: false,
      })
    ).toBe(-1);
  });
});

// ─── SMALL_ARMS_RANGE_SHIFTS / ARTILLERY_RANGE_SHIFTS tables ──────────────────

describe('range shift tables — structure verification', () => {
  it('SMALL_ARMS_RANGE_SHIFTS covers range 1 through Infinity in contiguous tiers', () => {
    expect(SMALL_ARMS_RANGE_SHIFTS.length).toBe(4);
    expect(SMALL_ARMS_RANGE_SHIFTS[0].rangeMin).toBe(1);
    expect(SMALL_ARMS_RANGE_SHIFTS[3].rangeMax).toBe(Infinity);
  });

  it('ARTILLERY_RANGE_SHIFTS covers range 1 through Infinity in contiguous tiers', () => {
    expect(ARTILLERY_RANGE_SHIFTS.length).toBe(5);
    expect(ARTILLERY_RANGE_SHIFTS[0].rangeMin).toBe(1);
    expect(ARTILLERY_RANGE_SHIFTS[4].rangeMax).toBe(Infinity);
  });
});
