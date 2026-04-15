/**
 * Tests for server/src/engine/tables/formations.js
 *
 * Spot-checks authoritative cell values from LOB_CHARTS p. 4
 * (Formation Effects Chart, Activity Effects Chart).
 * Moved from weapons.test.js as part of #292 extraction.
 */

import { describe, expect, it } from 'vitest';

import {
  ACTIVITY_EFFECTS,
  FORMATION_EFFECTS,
  activityEffect,
  formationEffect,
} from './formations.js';

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
