/**
 * Tests for server/src/engine/tables/charge.js
 *
 * Verifies the Closing Roll Table thresholds, modifier application, and
 * pass/fail logic against LOB_CHARTS §3.5.
 */

import { describe, expect, it } from 'vitest';

import {
  CLOSING_ROLL_MODIFIERS,
  CLOSING_ROLL_THRESHOLDS,
  closingRollResult,
  computeClosingRoll,
} from './charge.js';

// ─── Thresholds (LOB_CHARTS §3.5) ────────────────────────────────────────────

describe('CLOSING_ROLL_THRESHOLDS — per morale rating (LOB_CHARTS §3.5)', () => {
  it('Morale A: threshold 2', () => expect(CLOSING_ROLL_THRESHOLDS.A).toBe(2));
  it('Morale B: threshold 3', () => expect(CLOSING_ROLL_THRESHOLDS.B).toBe(3));
  it('Morale C: threshold 4', () => expect(CLOSING_ROLL_THRESHOLDS.C).toBe(4));
  it('Morale D: threshold 5 ("D or worse")', () => expect(CLOSING_ROLL_THRESHOLDS.D).toBe(5));
  it('Morale E: threshold 5 (same as D)', () => expect(CLOSING_ROLL_THRESHOLDS.E).toBe(5));
  it('Morale F: threshold 5 (same as D)', () => expect(CLOSING_ROLL_THRESHOLDS.F).toBe(5));
});

// ─── closingRollResult — pass/fail per rating (LOB_CHARTS §3.5) ───────────────

describe('closingRollResult — pass/fail boundaries per morale rating (LOB_CHARTS §3.5)', () => {
  const noMods = {};

  it('Morale A: roll 1 fails, roll 2 passes', () => {
    expect(closingRollResult('A', noMods, 1).pass).toBe(false);
    expect(closingRollResult('A', noMods, 2).pass).toBe(true);
  });

  it('Morale B: roll 2 fails, roll 3 passes', () => {
    expect(closingRollResult('B', noMods, 2).pass).toBe(false);
    expect(closingRollResult('B', noMods, 3).pass).toBe(true);
  });

  it('Morale C: roll 3 fails, roll 4 passes', () => {
    expect(closingRollResult('C', noMods, 3).pass).toBe(false);
    expect(closingRollResult('C', noMods, 4).pass).toBe(true);
  });

  it('Morale D: roll 4 fails, roll 5 passes', () => {
    expect(closingRollResult('D', noMods, 4).pass).toBe(false);
    expect(closingRollResult('D', noMods, 5).pass).toBe(true);
  });

  it('Morale E: roll 4 fails, roll 5 passes (same threshold as D)', () => {
    expect(closingRollResult('E', noMods, 4).pass).toBe(false);
    expect(closingRollResult('E', noMods, 5).pass).toBe(true);
  });

  it('Morale F: roll 4 fails, roll 5 passes (same threshold as D)', () => {
    expect(closingRollResult('F', noMods, 4).pass).toBe(false);
    expect(closingRollResult('F', noMods, 5).pass).toBe(true);
  });

  it('result includes threshold and modifiedRoll', () => {
    const r = closingRollResult('B', noMods, 4);
    expect(r.threshold).toBe(3);
    expect(r.modifiedRoll).toBe(4);
    expect(r.pass).toBe(true);
  });

  it('unknown morale rating returns pass=false, threshold=null', () => {
    const r = closingRollResult('Z', noMods, 6);
    expect(r.pass).toBe(false);
    expect(r.threshold).toBeNull();
  });
});

// ─── computeClosingRoll — modifiers (LOB_CHARTS §3.5) ────────────────────────

describe('computeClosingRoll — modifier values (LOB_CHARTS §3.5)', () => {
  it('no modifiers: returns raw roll unchanged', () => {
    expect(computeClosingRoll({}, 3)).toBe(3);
  });

  it('+1 for leader with Morale Value 2+', () => {
    expect(computeClosingRoll({ hasLeaderMorale2Plus: true }, 3)).toBe(4);
    expect(CLOSING_ROLL_MODIFIERS.leaderMoraleValue2Plus).toBe(1);
  });

  it('+1 for charging into Rear hex', () => {
    expect(computeClosingRoll({ isRear: true }, 3)).toBe(4);
    expect(CLOSING_ROLL_MODIFIERS.rear).toBe(1);
  });

  it('-1 for Shaken charging stack', () => {
    expect(computeClosingRoll({ isShaken: true }, 4)).toBe(3);
    expect(CLOSING_ROLL_MODIFIERS.shaken).toBe(-1);
  });

  it('-1 for frontal Artillery with Canister in target hex', () => {
    expect(computeClosingRoll({ frontalArtilleryWithCanister: true }, 4)).toBe(3);
    expect(CLOSING_ROLL_MODIFIERS.frontalArtilleryWithCanister).toBe(-1);
  });

  it('-3 when stack starts adjacent to target hex', () => {
    expect(computeClosingRoll({ startsAdjacentToTarget: true }, 5)).toBe(2);
    expect(CLOSING_ROLL_MODIFIERS.startsAdjacentOrBreastworks).toBe(-3);
  });

  it('-3 when target is in Breastworks (not applicable in SM, but logic is correct)', () => {
    // SM §4.1: Breastworks cannot be built in SM — this path is inert in SM play
    expect(computeClosingRoll({ targetInBreastworks: true }, 5)).toBe(2);
  });

  it('only one -3 applied when BOTH adjacent and breastworks are true', () => {
    // The OR condition applies the -3 once, not twice
    expect(computeClosingRoll({ startsAdjacentToTarget: true, targetInBreastworks: true }, 5)).toBe(
      2
    );
  });

  it('multiple modifiers stack correctly', () => {
    // +1 leader + +1 rear - 1 shaken = net +1 → roll 3 + 1 = 4
    expect(
      computeClosingRoll({ hasLeaderMorale2Plus: true, isRear: true, isShaken: true }, 3)
    ).toBe(4);
  });
});

// ─── closingRollResult — modifiers affect pass/fail ───────────────────────────

describe('closingRollResult — modifiers affect pass/fail', () => {
  it('Shaken -1 can cause a borderline Morale C roll to fail', () => {
    // C threshold is 4; roll 4 - 1 (shaken) = 3 < 4 → fail
    const r = closingRollResult('C', { isShaken: true }, 4);
    expect(r.pass).toBe(false);
    expect(r.modifiedRoll).toBe(3);
  });

  it('Leader +1 can turn a borderline Morale B roll into a pass', () => {
    // B threshold is 3; roll 2 + 1 (leader) = 3 >= 3 → pass
    const r = closingRollResult('B', { hasLeaderMorale2Plus: true }, 2);
    expect(r.pass).toBe(true);
    expect(r.modifiedRoll).toBe(3);
  });

  it('Adjacent target -3 can cause high-morale units to fail on low rolls', () => {
    // A threshold is 2; roll 4 - 3 (adjacent) = 1 < 2 → fail
    const r = closingRollResult('A', { startsAdjacentToTarget: true }, 4);
    expect(r.pass).toBe(false);
    expect(r.modifiedRoll).toBe(1);
  });

  it('Combined modifiers: leader+rear vs shaken+adjacent (Morale C, roll 5)', () => {
    // +1 leader + 1 rear - 1 shaken - 3 adjacent = net -2 → roll 5 - 2 = 3
    // C threshold 4; 3 < 4 → fail
    const r = closingRollResult(
      'C',
      {
        hasLeaderMorale2Plus: true,
        isRear: true,
        isShaken: true,
        startsAdjacentToTarget: true,
      },
      5
    );
    expect(r.modifiedRoll).toBe(3);
    expect(r.pass).toBe(false);
  });
});
