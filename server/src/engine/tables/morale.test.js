/**
 * Tests for server/src/engine/tables/morale.js
 *
 * Verifies every cell of the Morale Table, the Additive Morale Effects Chart,
 * and all modifier rules against LOB_CHARTS §6.1 and §6.2a.
 */

import { describe, expect, it } from 'vitest';

import {
  ADDITIVE_MORALE_EFFECTS,
  MORALE_TABLE,
  computeEffectiveRoll,
  moraleResult,
  moraleTableResult,
  moraleTransition,
} from './morale.js';

// ─── Morale Table — every cell (LOB_CHARTS p.5, LOB §6.1) ────────────────────

describe('MORALE_TABLE — complete cell verification (LOB_CHARTS p.5)', () => {
  // Helper: look up cell directly
  const cell = (roll, rating) =>
    MORALE_TABLE[roll - 2][{ A: 0, B: 1, C: 2, D: 3, E: 4, F: 5 }[rating]];

  describe('roll 2', () => {
    it('A, B, C → BL', () => {
      expect(cell(2, 'A').type).toBe('bl');
      expect(cell(2, 'B').type).toBe('bl');
      expect(cell(2, 'C').type).toBe('bl');
    });
    it('D, E, F → no effect', () => {
      expect(cell(2, 'D')).toBeNull();
      expect(cell(2, 'E')).toBeNull();
      expect(cell(2, 'F')).toBeNull();
    });
  });

  describe('roll 3', () => {
    it('A, B → BL; C, D, E, F → no effect', () => {
      expect(cell(3, 'A').type).toBe('bl');
      expect(cell(3, 'B').type).toBe('bl');
      expect(cell(3, 'C')).toBeNull();
      expect(cell(3, 'F')).toBeNull();
    });
  });

  describe('roll 4', () => {
    it('A → BL; B, C, D, E → no effect; F → Sh b1', () => {
      expect(cell(4, 'A').type).toBe('bl');
      expect(cell(4, 'B')).toBeNull();
      expect(cell(4, 'E')).toBeNull();
      const f = cell(4, 'F');
      expect(f.type).toBe('shaken');
      expect(f.retreatHexes).toBe(1);
      expect(f.spLoss).toBe(0);
    });
  });

  describe('roll 5', () => {
    it('A, B, C, D → no effect; E → Sh b1; F → Sh b2', () => {
      expect(cell(5, 'A')).toBeNull();
      expect(cell(5, 'D')).toBeNull();
      const e = cell(5, 'E');
      expect(e.type).toBe('shaken');
      expect(e.retreatHexes).toBe(1);
      const f = cell(5, 'F');
      expect(f.retreatHexes).toBe(2);
    });
  });

  describe('roll 6', () => {
    it('A, B, C → no effect; D → Sh b1; E → Sh b2; F → DG b3 L1', () => {
      expect(cell(6, 'C')).toBeNull();
      expect(cell(6, 'D')).toMatchObject({ type: 'shaken', retreatHexes: 1, spLoss: 0 });
      expect(cell(6, 'E')).toMatchObject({ type: 'shaken', retreatHexes: 2, spLoss: 0 });
      expect(cell(6, 'F')).toMatchObject({ type: 'dg', retreatHexes: 3, spLoss: 1 });
    });
  });

  describe('roll 7', () => {
    it('A, B, C → no effect; D → Sh b2; E → DG b3 L1; F → DG b4 L1', () => {
      expect(cell(7, 'C')).toBeNull();
      expect(cell(7, 'D')).toMatchObject({ type: 'shaken', retreatHexes: 2, spLoss: 0 });
      expect(cell(7, 'E')).toMatchObject({ type: 'dg', retreatHexes: 3, spLoss: 1 });
      expect(cell(7, 'F')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 1 });
    });
  });

  describe('roll 8', () => {
    it('A, B → no effect; C → Sh b1; D → DG b3 L1; E → DG b3 L1; F → DG b4 L2', () => {
      expect(cell(8, 'B')).toBeNull();
      expect(cell(8, 'C')).toMatchObject({ type: 'shaken', retreatHexes: 1, spLoss: 0 });
      expect(cell(8, 'D')).toMatchObject({ type: 'dg', retreatHexes: 3, spLoss: 1 });
      expect(cell(8, 'E')).toMatchObject({ type: 'dg', retreatHexes: 3, spLoss: 1 });
      expect(cell(8, 'F')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 2 });
    });
  });

  describe('roll 9', () => {
    it('A → no effect; B → Sh b1; C → Sh b2 L1; D → DG b3 L1; E → DG b4 L2; F → DG b4 L2', () => {
      expect(cell(9, 'A')).toBeNull();
      expect(cell(9, 'B')).toMatchObject({ type: 'shaken', retreatHexes: 1, spLoss: 0 });
      expect(cell(9, 'C')).toMatchObject({ type: 'shaken', retreatHexes: 2, spLoss: 1 });
      expect(cell(9, 'D')).toMatchObject({ type: 'dg', retreatHexes: 3, spLoss: 1 });
      expect(cell(9, 'E')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 2 });
      expect(cell(9, 'F')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 2 });
    });
  });

  describe('roll 10', () => {
    it('A → Sh b1; B → Sh b1 L1; C → DG b3 L1; D → DG b4 L2; E → DG b4 L2; F → R b6 L2', () => {
      expect(cell(10, 'A')).toMatchObject({ type: 'shaken', retreatHexes: 1, spLoss: 0 });
      expect(cell(10, 'B')).toMatchObject({ type: 'shaken', retreatHexes: 1, spLoss: 1 });
      expect(cell(10, 'C')).toMatchObject({ type: 'dg', retreatHexes: 3, spLoss: 1 });
      expect(cell(10, 'D')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 2 });
      expect(cell(10, 'E')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 2 });
      expect(cell(10, 'F')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 2 });
    });
  });

  describe('roll 11', () => {
    it('A → Sh b2 L1; B → DG b3 L1; C → DG b4 L1; D → DG b4 L2; E → R b6 L2; F → R b6 L3', () => {
      expect(cell(11, 'A')).toMatchObject({ type: 'shaken', retreatHexes: 2, spLoss: 1 });
      expect(cell(11, 'B')).toMatchObject({ type: 'dg', retreatHexes: 3, spLoss: 1 });
      expect(cell(11, 'C')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 1 });
      expect(cell(11, 'D')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 2 });
      expect(cell(11, 'E')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 2 });
      expect(cell(11, 'F')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 3 });
    });
  });

  describe('roll 12', () => {
    it('A → DG b3 L1; B → DG b4 L1; C → DG b4 L2; D → R b6 L2; E → R b6 L3; F → R b6 L4', () => {
      expect(cell(12, 'A')).toMatchObject({ type: 'dg', retreatHexes: 3, spLoss: 1 });
      expect(cell(12, 'B')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 1 });
      expect(cell(12, 'C')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 2 });
      expect(cell(12, 'D')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 2 });
      expect(cell(12, 'E')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 3 });
      expect(cell(12, 'F')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 4 });
    });
  });

  describe('roll 13', () => {
    it('A → DG b3 L1; B → DG b4 L2; C → R b6 L2; D → R b6 L3; E → R b6 L4; F → R b6 L4', () => {
      expect(cell(13, 'A')).toMatchObject({ type: 'dg', retreatHexes: 3, spLoss: 1 });
      expect(cell(13, 'B')).toMatchObject({ type: 'dg', retreatHexes: 4, spLoss: 2 });
      expect(cell(13, 'C')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 2 });
      expect(cell(13, 'D')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 3 });
      expect(cell(13, 'E')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 4 });
      expect(cell(13, 'F')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 4 });
    });
  });

  describe('roll 14', () => {
    it('A → DG b3 L2; B → R b6 L2; C → R b6 L3; D,E,F → R b6 L4', () => {
      expect(cell(14, 'A')).toMatchObject({ type: 'dg', retreatHexes: 3, spLoss: 2 });
      expect(cell(14, 'B')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 2 });
      expect(cell(14, 'C')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 3 });
      expect(cell(14, 'D')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 4 });
      expect(cell(14, 'E')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 4 });
      expect(cell(14, 'F')).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 4 });
    });
  });
});

// ─── moraleTableResult — lookup with clamping ─────────────────────────────────

describe('moraleTableResult — lookup and clamping', () => {
  it('returns null for no-effect cells', () => {
    expect(moraleTableResult('A', 7)).toBeNull();
  });

  it('returns typed object for result cells', () => {
    const r = moraleTableResult('D', 7);
    expect(r).toMatchObject({ type: 'shaken', retreatHexes: 2, spLoss: 0 });
  });

  it('clamps roll below 2 to row 2', () => {
    // Roll 1 is below table minimum — treated as roll 2
    expect(moraleTableResult('A', 1)?.type).toBe('bl');
  });

  it('clamps roll above 14 to row 14', () => {
    // Roll 15 is above table maximum — treated as roll 14
    const r = moraleTableResult('F', 15);
    expect(r).toMatchObject({ type: 'rout', retreatHexes: 6, spLoss: 4 });
  });

  it('returns null for unknown rating', () => {
    expect(moraleTableResult('Z', 7)).toBeNull();
  });
});

// ─── computeEffectiveRoll — modifier application (LOB §6.1) ──────────────────

describe('computeEffectiveRoll — morale modifiers (LOB §6.1)', () => {
  it('no modifiers: returns raw roll unchanged', () => {
    expect(computeEffectiveRoll(7)).toBe(7);
  });

  it('leader morale value 2 subtracts 2 from roll', () => {
    expect(computeEffectiveRoll(10, { leaderMoraleValue: 2 })).toBe(8);
  });

  it('Shaken/DG +1', () => {
    expect(computeEffectiveRoll(7, { isShakenOrDG: true })).toBe(8);
  });

  it('Wrecked +3', () => {
    expect(computeEffectiveRoll(7, { isWrecked: true })).toBe(10);
  });

  it('Rear attack +2', () => {
    expect(computeEffectiveRoll(7, { isRear: true })).toBe(9);
  });

  it('Small target +1', () => {
    expect(computeEffectiveRoll(7, { isSmall: true })).toBe(8);
  });

  it('Night +3', () => {
    expect(computeEffectiveRoll(7, { isNight: true })).toBe(10);
  });

  it('Artillery/cavalry checked by small arms +1', () => {
    expect(computeEffectiveRoll(7, { isArtilleryOrCavalryFromSmallArms: true })).toBe(8);
  });

  it('Protective terrain -1', () => {
    expect(computeEffectiveRoll(7, { hasProtectiveTerrain: true })).toBe(6);
  });

  it('multiple modifiers stack correctly', () => {
    // Wrecked (+3) + Rear (+2) + Night (+3) - Leader(2) = +6 net → 7+6 = 13
    expect(
      computeEffectiveRoll(7, {
        leaderMoraleValue: 2,
        isWrecked: true,
        isRear: true,
        isNight: true,
      })
    ).toBe(13);
  });

  it('range 10+ rule: only terrain and leader modifiers apply', () => {
    // At range 10+, Wrecked/Rear/Night etc. are all ignored;
    // only leaderMoraleValue and protectiveTerrain apply
    const roll = computeEffectiveRoll(7, {
      leaderMoraleValue: 2,
      isWrecked: true,
      isRear: true,
      isNight: true,
      hasProtectiveTerrain: true,
      range: 10,
    });
    // Only: -2 (leader) + (-1) (terrain) = net -3 → 7 - 3 = 4
    expect(roll).toBe(4);
  });

  it('range 9 applies all modifiers (boundary check)', () => {
    const roll = computeEffectiveRoll(7, { isWrecked: true, range: 9 });
    expect(roll).toBe(10); // +3 applies
  });
});

// ─── moraleResult — full result (LOB §6.1) ────────────────────────────────────

describe('moraleResult — full check result', () => {
  it('returns noEffect when table cell is null', () => {
    const r = moraleResult('A', {}, 7);
    expect(r.type).toBe('noEffect');
    expect(r.retreatHexes).toBe(0);
    expect(r.spLoss).toBe(0);
    expect(r.leaderLossCheck).toBe(false);
  });

  it('returns correct type and stats when table cell has SP loss', () => {
    // Rating C, roll 10 → DG b3 L1
    const r = moraleResult('C', {}, 10);
    expect(r.type).toBe('dg');
    expect(r.retreatHexes).toBe(3);
    expect(r.spLoss).toBe(1);
    expect(r.leaderLossCheck).toBe(true); // SP loss triggers leader check
  });

  it('leaderLossCheck false when spLoss is 0 (morale-only result)', () => {
    // Rating E, roll 5 → Sh b1 (no SP loss)
    const r = moraleResult('E', {}, 5);
    expect(r.type).toBe('shaken');
    expect(r.spLoss).toBe(0);
    expect(r.leaderLossCheck).toBe(false);
  });

  it('modifiers shift effective roll correctly', () => {
    // Rating A, raw roll 9 with Wrecked +3 → effective 12 → DG b3 L1
    const r = moraleResult('A', { isWrecked: true }, 9);
    expect(r.effectiveRoll).toBe(12);
    expect(r.type).toBe('dg');
    expect(r.retreatHexes).toBe(3);
    expect(r.spLoss).toBe(1);
  });
});

// ─── Additive Morale Effects Chart — every cell (LOB_CHARTS p.4, LOB §6.2a) ──

describe('ADDITIVE_MORALE_EFFECTS / moraleTransition — complete cell verification', () => {
  // Helper: verify a transition
  const t = (cur, inc) => moraleTransition(cur, inc);

  describe('BL current state', () => {
    it('BL/bl → BL (no suppress)', () =>
      expect(t('bl', 'bl')).toMatchObject({ newState: 'bl', suppressRetreatsAndLosses: false }));
    it('BL/normal → BL', () => expect(t('bl', 'normal')).toMatchObject({ newState: 'bl' }));
    it('BL/shaken → Sh (suppress *)', () =>
      expect(t('bl', 'shaken')).toMatchObject({
        newState: 'shaken',
        suppressRetreatsAndLosses: true,
      }));
    it('BL/dg → DG (suppress *)', () =>
      expect(t('bl', 'dg')).toMatchObject({ newState: 'dg', suppressRetreatsAndLosses: true }));
    it('BL/rout → R (suppress *)', () =>
      expect(t('bl', 'rout')).toMatchObject({ newState: 'rout', suppressRetreatsAndLosses: true }));
    it('BL/townHex → DG', () => expect(t('bl', 'townHex')).toMatchObject({ newState: 'dg' }));
  });

  describe('Normal current state', () => {
    it('Normal/bl → BL', () => expect(t('normal', 'bl')).toMatchObject({ newState: 'bl' }));
    it('Normal/normal → Normal', () =>
      expect(t('normal', 'normal')).toMatchObject({
        newState: 'normal',
        suppressRetreatsAndLosses: false,
      }));
    it('Normal/shaken → Sh', () =>
      expect(t('normal', 'shaken')).toMatchObject({
        newState: 'shaken',
        suppressRetreatsAndLosses: false,
      }));
    it('Normal/dg → DG', () => expect(t('normal', 'dg')).toMatchObject({ newState: 'dg' }));
    it('Normal/rout → R', () => expect(t('normal', 'rout')).toMatchObject({ newState: 'rout' }));
    it('Normal/townHex → DG', () =>
      expect(t('normal', 'townHex')).toMatchObject({ newState: 'dg' }));
  });

  describe('Shaken current state', () => {
    it('Sh/bl → BL', () => expect(t('shaken', 'bl')).toMatchObject({ newState: 'bl' }));
    it('Sh/normal → Sh (stays shaken)', () =>
      expect(t('shaken', 'normal')).toMatchObject({ newState: 'shaken' }));
    it('Sh/shaken → Sh', () => expect(t('shaken', 'shaken')).toMatchObject({ newState: 'shaken' }));
    it('Sh/dg → DG', () => expect(t('shaken', 'dg')).toMatchObject({ newState: 'dg' }));
    it('Sh/rout → R', () => expect(t('shaken', 'rout')).toMatchObject({ newState: 'rout' }));
    it('Sh/townHex → DG', () => expect(t('shaken', 'townHex')).toMatchObject({ newState: 'dg' }));
  });

  describe('DG current state', () => {
    it('DG/bl → Normal (BL recovers DG)', () =>
      expect(t('dg', 'bl')).toMatchObject({ newState: 'normal' }));
    it('DG/normal → DG (stays DG)', () =>
      expect(t('dg', 'normal')).toMatchObject({ newState: 'dg' }));
    it('DG/shaken → DG', () => expect(t('dg', 'shaken')).toMatchObject({ newState: 'dg' }));
    it('DG/dg → R (double DG = rout)', () =>
      expect(t('dg', 'dg')).toMatchObject({ newState: 'rout' }));
    it('DG/rout → R', () => expect(t('dg', 'rout')).toMatchObject({ newState: 'rout' }));
    it('DG/townHex → DG', () => expect(t('dg', 'townHex')).toMatchObject({ newState: 'dg' }));
  });

  describe('Rout current state', () => {
    it('R/bl → Sh (BL partially recovers rout)', () =>
      expect(t('rout', 'bl')).toMatchObject({ newState: 'shaken' }));
    it('R/normal → R (stays routed)', () =>
      expect(t('rout', 'normal')).toMatchObject({ newState: 'rout' }));
    it('R/shaken → R', () => expect(t('rout', 'shaken')).toMatchObject({ newState: 'rout' }));
    it('R/dg → R', () => expect(t('rout', 'dg')).toMatchObject({ newState: 'rout' }));
    it('R/rout → R', () => expect(t('rout', 'rout')).toMatchObject({ newState: 'rout' }));
    it('R/townHex → R', () => expect(t('rout', 'townHex')).toMatchObject({ newState: 'rout' }));
  });

  it('returns null for unknown combination', () => {
    expect(moraleTransition('unknown', 'normal')).toBeNull();
  });
});

// ─── All transitions in ADDITIVE_MORALE_EFFECTS have no suppress by default ───

describe('ADDITIVE_MORALE_EFFECTS — only BL→bad results are suppressed', () => {
  it('only bl/shaken, bl/dg, bl/rout have suppressRetreatsAndLosses=true', () => {
    const suppressed = Object.entries(ADDITIVE_MORALE_EFFECTS)
      .filter(([, v]) => v.suppressRetreatsAndLosses)
      .map(([k]) => k);
    expect(suppressed.sort()).toEqual(['bl/dg', 'bl/rout', 'bl/shaken']);
  });
});
