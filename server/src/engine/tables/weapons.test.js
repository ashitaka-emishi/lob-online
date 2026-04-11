/**
 * Tests for server/src/engine/tables/weapons.js
 *
 * Spot-checks authoritative cell values from LOB_CHARTS p. 2 (Weapon
 * Characteristics Chart) and p. 4 (Formation Effects / Activity Effects Charts).
 * SM_ERRATA #2 (E/2 US: R → hR) is verified via the hR artillery entry.
 */

import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_EFFECTS,
  AMMO_THRESHOLD_TIERS,
  ARTILLERY,
  FORMATION_EFFECTS,
  SMALL_ARMS,
  activityEffect,
  ammoShiftThreshold,
  artilleryMaxRange,
  formationEffect,
  smallArmsMaxRange,
} from './weapons.js';

// ─── Small arms weapon definitions (LOB_CHARTS p.2) ───────────────────────────

describe('SMALL_ARMS — weapon type definitions (LOB_CHARTS p.2)', () => {
  it('Rifled Musket (R): maxRange 4, no special ammo', () => {
    expect(SMALL_ARMS.R.maxRange).toBe(4);
    expect(SMALL_ARMS.R.ammo).toBeNull();
  });

  it('Smoothbore Musket (M): maxRange 2, buckAndBall ammo', () => {
    expect(SMALL_ARMS.M.maxRange).toBe(2);
    expect(SMALL_ARMS.M.ammo).toBe('buckAndBall');
  });

  it('Carbine (C): maxRange 3, breechloader ammo', () => {
    expect(SMALL_ARMS.C.maxRange).toBe(3);
    expect(SMALL_ARMS.C.ammo).toBe('breechloader');
  });

  it('Sharps Rifle (SR): maxRange 5, breechloader ammo', () => {
    expect(SMALL_ARMS.SR.maxRange).toBe(5);
    expect(SMALL_ARMS.SR.ammo).toBe('breechloader');
  });

  it('Henry Repeater (HR): maxRange 3, repeater ammo', () => {
    expect(SMALL_ARMS.HR.maxRange).toBe(3);
    expect(SMALL_ARMS.HR.ammo).toBe('repeater');
  });

  it('Pistol (P): maxRange 1, no special ammo', () => {
    expect(SMALL_ARMS.P.maxRange).toBe(1);
    expect(SMALL_ARMS.P.ammo).toBeNull();
  });

  it('smallArmsMaxRange returns correct value for SM-present types', () => {
    // SM_ROSTER pp.1-4 — types present in SM: R, M, C, SR
    expect(smallArmsMaxRange('R')).toBe(4);
    expect(smallArmsMaxRange('M')).toBe(2);
    expect(smallArmsMaxRange('C')).toBe(3);
    expect(smallArmsMaxRange('SR')).toBe(5);
  });

  it('smallArmsMaxRange returns null for unknown type', () => {
    expect(smallArmsMaxRange('UNKNOWN')).toBeNull();
  });
});

// ─── Artillery weapon definitions (LOB_CHARTS p.2) ────────────────────────────

describe('ARTILLERY — weapon type definitions (LOB_CHARTS p.2)', () => {
  it('Rifled Cannon (R): maxRange 30, normal canister', () => {
    expect(ARTILLERY.R.maxRange).toBe(30);
    expect(ARTILLERY.R.canister).toBe('normal');
  });

  it('Napoleon (N): maxRange 16, dense canister', () => {
    expect(ARTILLERY.N.maxRange).toBe(16);
    expect(ARTILLERY.N.canister).toBe('dense');
  });

  it('12-lb Howitzer (H): maxRange 10, dense canister', () => {
    expect(ARTILLERY.H.maxRange).toBe(10);
    expect(ARTILLERY.H.canister).toBe('dense');
  });

  it('Light Gun (L): maxRange 14, normal canister', () => {
    expect(ARTILLERY.L.maxRange).toBe(14);
    expect(ARTILLERY.L.canister).toBe('normal');
  });

  it('20-lb Parrott (hR): maxRange 30, normal canister (SM_ERRATA #2 — E/2 US corrected R→hR)', () => {
    // SM_ERRATA #2: E/2 US artillery gun type is hR (Heavy Rifled), not R
    expect(ARTILLERY.hR.maxRange).toBe(30);
    expect(ARTILLERY.hR.canister).toBe('normal');
  });

  it('Whitworth (W): maxRange 38, no canister', () => {
    expect(ARTILLERY.W.maxRange).toBe(38);
    expect(ARTILLERY.W.canister).toBeNull();
  });

  it('artilleryMaxRange returns correct value for SM-present types', () => {
    // SM-present artillery: R, N, H, L, hR
    expect(artilleryMaxRange('R')).toBe(30);
    expect(artilleryMaxRange('N')).toBe(16);
    expect(artilleryMaxRange('H')).toBe(10);
    expect(artilleryMaxRange('L')).toBe(14);
    expect(artilleryMaxRange('hR')).toBe(30);
  });

  it('artilleryMaxRange returns null for unknown type', () => {
    expect(artilleryMaxRange('UNKNOWN')).toBeNull();
  });
});

// ─── Formation Effects Chart (LOB_CHARTS p.4) ─────────────────────────────────

describe('FORMATION_EFFECTS — Formation Effects Chart (LOB_CHARTS p.4)', () => {
  it('infantry/line: combat eligible, can move, can charge, normal facing', () => {
    const e = FORMATION_EFFECTS['infantry/line'];
    expect(e.combatEligible).toBe(true);
    expect(e.canMove).toBe(true);
    expect(e.chargeAttacker).toBe(true);
    expect(e.facing).toBe('normal');
  });

  it('infantry/column: not combat eligible, can move, can use roads, cannot charge', () => {
    const e = FORMATION_EFFECTS['infantry/column'];
    expect(e.combatEligible).toBe(false);
    expect(e.canMove).toBe(true);
    expect(e.canUseRoads).toBe(true);
    expect(e.chargeAttacker).toBe(false);
    expect(e.facing).toBe('allRear');
  });

  it('cavalry/mounted: not combat eligible, can move, can charge, can use roads', () => {
    const e = FORMATION_EFFECTS['cavalry/mounted'];
    expect(e.combatEligible).toBe(false);
    expect(e.canMove).toBe(true);
    expect(e.chargeAttacker).toBe(true);
    expect(e.canUseRoads).toBe(true);
  });

  it('artillery/unlimbered: combat eligible, cannot move, cannot charge', () => {
    const e = FORMATION_EFFECTS['artillery/unlimbered'];
    expect(e.combatEligible).toBe(true);
    expect(e.canMove).toBe(false);
    expect(e.chargeAttacker).toBe(false);
    expect(e.facing).toBe('normal');
  });

  it('artillery/limbered: not combat eligible, can move, can use roads', () => {
    const e = FORMATION_EFFECTS['artillery/limbered'];
    expect(e.combatEligible).toBe(false);
    expect(e.canMove).toBe(true);
    expect(e.canUseRoads).toBe(true);
  });

  it('formationEffect lookup returns correct entry', () => {
    const e = formationEffect('infantry', 'line');
    expect(e).toEqual(FORMATION_EFFECTS['infantry/line']);
  });

  it('formationEffect returns null for unknown combination', () => {
    expect(formationEffect('infantry', 'nonexistent')).toBeNull();
    expect(formationEffect('unknown', 'line')).toBeNull();
  });
});

// ─── Activity Effects Chart (LOB_CHARTS p.4) ──────────────────────────────────

describe('ACTIVITY_EFFECTS — Activity Effects Chart (LOB_CHARTS p.4)', () => {
  it('movementAction: full move, half fire', () => {
    const e = ACTIVITY_EFFECTS.movementAction;
    expect(e.canMove).toBe(true);
    expect(e.fullMove).toBe(true);
    expect(e.canFire).toBe(true);
    expect(e.halfFire).toBe(true);
  });

  it('fireCombat: no move, full fire', () => {
    const e = ACTIVITY_EFFECTS.fireCombat;
    expect(e.canMove).toBe(false);
    expect(e.canFire).toBe(true);
    expect(e.halfFire).toBe(false);
  });

  it('charge: can move, cannot fire', () => {
    const e = ACTIVITY_EFFECTS.charge;
    expect(e.canMove).toBe(true);
    expect(e.canFire).toBe(false);
  });

  it('formationChange: can move and fire', () => {
    const e = ACTIVITY_EFFECTS.formationChange;
    expect(e.canMove).toBe(true);
    expect(e.canFire).toBe(true);
  });

  it('facingChange: can move and fire', () => {
    const e = ACTIVITY_EFFECTS.facingChange;
    expect(e.canMove).toBe(true);
    expect(e.canFire).toBe(true);
  });

  it('activityEffect lookup returns correct entry', () => {
    expect(activityEffect('fireCombat')).toEqual(ACTIVITY_EFFECTS.fireCombat);
    expect(activityEffect('charge')).toEqual(ACTIVITY_EFFECTS.charge);
  });

  it('activityEffect returns null for unknown activity', () => {
    expect(activityEffect('unknown')).toBeNull();
  });
});

// ─── Ammo threshold chart (LOB_CHARTS p.2) ────────────────────────────────────

describe('AMMO_THRESHOLD_TIERS — Threshold Chart (LOB_CHARTS p.2)', () => {
  it('SPs 6-8 → threshold 3', () => {
    const tier = AMMO_THRESHOLD_TIERS.find((t) => t.spMin === 6);
    expect(tier).toBeDefined();
    expect(tier.spMax).toBe(8);
    expect(tier.threshold).toBe(3);
  });

  it('SPs 4-5 → threshold 2', () => {
    const tier = AMMO_THRESHOLD_TIERS.find((t) => t.spMin === 4);
    expect(tier).toBeDefined();
    expect(tier.spMax).toBe(5);
    expect(tier.threshold).toBe(2);
  });

  it('SPs 1-3 → threshold 1', () => {
    const tier = AMMO_THRESHOLD_TIERS.find((t) => t.spMin === 1);
    expect(tier).toBeDefined();
    expect(tier.spMax).toBe(3);
    expect(tier.threshold).toBe(1);
  });

  it('ammoShiftThreshold: boundary values for each tier', () => {
    // LOB_CHARTS p.2 — Threshold Chart boundary verification
    expect(ammoShiftThreshold(1)).toBe(1);
    expect(ammoShiftThreshold(3)).toBe(1);
    expect(ammoShiftThreshold(4)).toBe(2);
    expect(ammoShiftThreshold(5)).toBe(2);
    expect(ammoShiftThreshold(6)).toBe(3);
    expect(ammoShiftThreshold(8)).toBe(3);
  });

  it('ammoShiftThreshold returns null for out-of-range SPs', () => {
    expect(ammoShiftThreshold(0)).toBeNull();
    expect(ammoShiftThreshold(9)).toBeNull();
  });
});
