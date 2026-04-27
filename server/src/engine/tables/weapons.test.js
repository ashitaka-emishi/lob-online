/**
 * Tests for server/src/engine/tables/weapons.js
 *
 * Spot-checks authoritative cell values from LOB_CHARTS p. 2 (Weapon
 * Characteristics Chart). SM_ERRATA #2 (E/2 US: R → hR) is verified via the
 * hR artillery entry.
 *
 * Formation Effects / Activity Effects Chart tests are in formations.test.js (#292).
 */

import { describe, expect, it } from 'vitest';

import {
  AMMO_THRESHOLD_TIERS,
  ARTILLERY,
  SMALL_ARMS,
  ammoShiftThreshold,
  artilleryMaxRange,
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
