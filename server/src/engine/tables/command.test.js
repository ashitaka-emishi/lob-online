/**
 * Tests for server/src/engine/tables/command.js
 *
 * Verifies Command Roll, Order Delivery, Fluke Stoppage, Attack Recovery,
 * and Zero Rule against LOB_CHARTS p.1 (§10.6, §10.6a, §10.7b, §10.8c, §9.1e).
 */

import { describe, expect, it } from 'vitest';

import {
  AWARENESS_TURNS,
  COMMAND_ROLL_THRESHOLD,
  DISTANCE_TURNS,
  FLUKE_LEADER_THRESHOLDS,
  RECOVERY_BASE_THRESHOLDS,
  RECOVERY_LEADER_THRESHOLDS,
  ZERO_RULE_TABLE,
  attackRecoveryResult,
  commandRollResult,
  flukeStoppageResult,
  orderDeliveryTurns,
  zeroRuleResult,
} from './command.js';

// ─── Command Roll (LOB_CHARTS §10.6) ─────────────────────────────────────────

describe('commandRollResult — Command Roll (LOB_CHARTS §10.6)', () => {
  it('threshold is 10', () => {
    expect(COMMAND_ROLL_THRESHOLD).toBe(10);
  });

  it('roll + commandValue < 10 → no', () => {
    // 2d6=6, cv=3 → modifiedRoll=9 < 10 → no
    const r = commandRollResult(3, false, false, 6);
    expect(r.yes).toBe(false);
    expect(r.modifiedRoll).toBe(9);
  });

  it('roll + commandValue >= 10 → yes', () => {
    // 2d6=7, cv=3 → modifiedRoll=10 → yes
    const r = commandRollResult(3, false, false, 7);
    expect(r.yes).toBe(true);
    expect(r.modifiedRoll).toBe(10);
  });

  it('isReserve adds +2 bonus', () => {
    // 2d6=5, cv=2, reserve=true → 5+2+2=9 → no; cv=3 → 5+3+2=10 → yes
    expect(commandRollResult(2, true, false, 5).yes).toBe(false);
    expect(commandRollResult(3, true, false, 5).yes).toBe(true);
    expect(commandRollResult(3, true, false, 5).modifiedRoll).toBe(10);
  });

  it('isDeployment adds +2 bonus', () => {
    // 2d6=5, cv=2, deployment=true → 5+2+2=9 → no; cv=3 → 10 → yes
    expect(commandRollResult(2, false, true, 5).yes).toBe(false);
    expect(commandRollResult(3, false, true, 5).yes).toBe(true);
  });

  it('isReserve and isDeployment together still add only +2 (combined condition)', () => {
    // The +2 applies for reserve OR deployment; both true gives the same +2
    const r = commandRollResult(2, true, true, 5);
    expect(r.modifiedRoll).toBe(9); // 5+2+2=9
  });

  it('commandValue 0, no modifiers: only high rolls succeed', () => {
    expect(commandRollResult(0, false, false, 9).yes).toBe(false);
    expect(commandRollResult(0, false, false, 10).yes).toBe(true);
  });

  it('commandValue 4: succeeds on lower rolls', () => {
    // 2d6=6, cv=4 → 10 → yes; cv=4, roll=5 → 9 → no
    expect(commandRollResult(4, false, false, 6).yes).toBe(true);
    expect(commandRollResult(4, false, false, 5).yes).toBe(false);
  });
});

// ─── Order Delivery (LOB_CHARTS §10.6a) ──────────────────────────────────────

describe('orderDeliveryTurns — Order Delivery (LOB_CHARTS §10.6a)', () => {
  it('AWARENESS_TURNS: normal=2 (SM override — all SM army COs are Normal)', () => {
    expect(AWARENESS_TURNS.normal).toBe(2);
  });

  it('AWARENESS_TURNS: all four awareness levels defined correctly', () => {
    expect(AWARENESS_TURNS.onFire).toBe(1);
    expect(AWARENESS_TURNS.normal).toBe(2);
    expect(AWARENESS_TURNS.notSoSure).toBe(4);
    expect(AWARENESS_TURNS.comatose).toBe(8);
  });

  it('DISTANCE_TURNS: all three distance categories defined correctly', () => {
    expect(DISTANCE_TURNS.withinRadius).toBe(1);
    expect(DISTANCE_TURNS.beyondRadius).toBe(2);
    expect(DISTANCE_TURNS.beyondRadiusFar).toBe(3);
  });

  it('normal + withinRadius → 3 turns', () => {
    const r = orderDeliveryTurns('normal', 'withinRadius');
    expect(r.turnsToDeliver).toBe(3); // 2 + 1
  });

  it('normal + beyondRadius → 4 turns (SM standard non-reserve case)', () => {
    const r = orderDeliveryTurns('normal', 'beyondRadius');
    expect(r.turnsToDeliver).toBe(4); // 2 + 2
  });

  it('normal + beyondRadiusFar → 5 turns', () => {
    const r = orderDeliveryTurns('normal', 'beyondRadiusFar');
    expect(r.turnsToDeliver).toBe(5); // 2 + 3
  });

  it('onFire + withinRadius → 2 turns (fastest possible)', () => {
    expect(orderDeliveryTurns('onFire', 'withinRadius').turnsToDeliver).toBe(2);
  });

  it('comatose + beyondRadiusFar → 11 turns (slowest possible)', () => {
    expect(orderDeliveryTurns('comatose', 'beyondRadiusFar').turnsToDeliver).toBe(11);
  });

  it('Reserve order halves total (round down)', () => {
    // normal + withinRadius = 3 → reserve: floor(3/2) = 1
    expect(orderDeliveryTurns('normal', 'withinRadius', true).turnsToDeliver).toBe(1);
    // normal + beyondRadius = 4 → reserve: floor(4/2) = 2
    expect(orderDeliveryTurns('normal', 'beyondRadius', true).turnsToDeliver).toBe(2);
    // normal + beyondRadiusFar = 5 → reserve: floor(5/2) = 2
    expect(orderDeliveryTurns('normal', 'beyondRadiusFar', true).turnsToDeliver).toBe(2);
  });

  it('non-reserve order (false) does not halve', () => {
    expect(orderDeliveryTurns('normal', 'beyondRadius', false).turnsToDeliver).toBe(4);
  });
});

// ─── Fluke Stoppage (LOB_CHARTS §10.7b) ──────────────────────────────────────

describe('flukeStoppageResult — Fluke Stoppage (LOB_CHARTS §10.7b)', () => {
  it('FLUKE_LEADER_THRESHOLDS: CV4→6, CV3→7, CV2/1/0→8', () => {
    expect(FLUKE_LEADER_THRESHOLDS[4]).toBe(6);
    expect(FLUKE_LEADER_THRESHOLDS[3]).toBe(7);
    expect(FLUKE_LEADER_THRESHOLDS[2]).toBe(8);
    expect(FLUKE_LEADER_THRESHOLDS[1]).toBe(8);
    expect(FLUKE_LEADER_THRESHOLDS[0]).toBe(8);
  });

  it('step 1 passes (6+): no stoppage, no step 2', () => {
    // step1Roll=6, no mods → effective=6 ≥ 6 → base pass
    const r = flukeStoppageResult(3, false, false, 6, 0);
    expect(r.basePass).toBe(true);
    expect(r.step2Required).toBe(false);
    expect(r.stoppage).toBe(false);
  });

  it('step 1 passes with reserve bonus (+2): roll 4+2=6 → pass', () => {
    const r = flukeStoppageResult(3, true, false, 4, 0);
    expect(r.step1EffectiveRoll).toBe(6);
    expect(r.basePass).toBe(true);
  });

  it('step 1 fails → step 2 required', () => {
    // step1Roll=4, no mods → effective=4 < 6 → fail
    const r = flukeStoppageResult(3, false, false, 4, 8);
    expect(r.basePass).toBe(false);
    expect(r.step2Required).toBe(true);
  });

  it('step 2 CV4: roll 6+ avoids stoppage', () => {
    const pass = flukeStoppageResult(4, false, false, 4, 6);
    expect(pass.stoppage).toBe(false);
    expect(pass.step2Threshold).toBe(6);

    const fail = flukeStoppageResult(4, false, false, 4, 5);
    expect(fail.stoppage).toBe(true);
  });

  it('step 2 CV3: roll 7+ avoids stoppage', () => {
    expect(flukeStoppageResult(3, false, false, 4, 7).stoppage).toBe(false);
    expect(flukeStoppageResult(3, false, false, 4, 6).stoppage).toBe(true);
  });

  it('step 2 CV2: roll 8+ avoids stoppage', () => {
    expect(flukeStoppageResult(2, false, false, 4, 8).stoppage).toBe(false);
    expect(flukeStoppageResult(2, false, false, 4, 7).stoppage).toBe(true);
  });

  it('step 2 CV0: same threshold as CV2 (8+)', () => {
    expect(flukeStoppageResult(0, false, false, 4, 8).stoppage).toBe(false);
    expect(flukeStoppageResult(0, false, false, 4, 7).stoppage).toBe(true);
  });

  it('Night: -2 to step 1, -1 to step 2; reserve +2 does NOT apply at night', () => {
    // Night: step1Roll=7, hasReserve=true (ignored at night), night=-2 → effective=5 < 6 → fail
    const r = flukeStoppageResult(4, true, true, 7, 6);
    expect(r.step1EffectiveRoll).toBe(5); // 7 - 2 (night), reserve ignored
    expect(r.basePass).toBe(false);
    // Step 2: roll=6, night=-1 → effective=5 < 6 (CV4 threshold) → stoppage
    expect(r.step2EffectiveRoll).toBe(5);
    expect(r.stoppage).toBe(true);
  });

  it('Night: step 2 -1 applied correctly — roll 6, night → effective 5; CV4 threshold 6 → stoppage', () => {
    const r = flukeStoppageResult(4, false, true, 4, 6);
    expect(r.step2EffectiveRoll).toBe(5);
    expect(r.stoppage).toBe(true);
  });

  it('originalLeaderWounded applies -1 to step 1', () => {
    // step1Roll=6, wounded=-1 → effective=5 < 6 → fail
    const r = flukeStoppageResult(4, false, false, 6, 8, true);
    expect(r.step1EffectiveRoll).toBe(5);
    expect(r.basePass).toBe(false);
  });
});

// ─── Attack Recovery (LOB_CHARTS §10.8c) ────────────────────────────────────

describe('attackRecoveryResult — Attack Recovery (LOB_CHARTS §10.8c)', () => {
  it('RECOVERY_BASE_THRESHOLDS: clean=8, wrecked=9, dead=10', () => {
    expect(RECOVERY_BASE_THRESHOLDS.clean).toBe(8);
    expect(RECOVERY_BASE_THRESHOLDS.wrecked).toBe(9);
    expect(RECOVERY_BASE_THRESHOLDS.dead).toBe(10);
  });

  it('RECOVERY_LEADER_THRESHOLDS: CV4→7, CV3→8, CV2→9, CV1/0→10', () => {
    expect(RECOVERY_LEADER_THRESHOLDS[4]).toBe(7);
    expect(RECOVERY_LEADER_THRESHOLDS[3]).toBe(8);
    expect(RECOVERY_LEADER_THRESHOLDS[2]).toBe(9);
    expect(RECOVERY_LEADER_THRESHOLDS[1]).toBe(10);
    expect(RECOVERY_LEADER_THRESHOLDS[0]).toBe(10);
  });

  it('step 1 fails for clean division below threshold 8', () => {
    const r = attackRecoveryResult('clean', 4, 7, 0);
    expect(r.basePass).toBe(false);
    expect(r.step2Required).toBe(false);
    expect(r.recovered).toBe(false);
  });

  it('step 1 passes for clean division at threshold 8', () => {
    const r = attackRecoveryResult('clean', 4, 8, 7);
    expect(r.basePass).toBe(true);
    expect(r.step2Required).toBe(true);
  });

  it('wrecked division: base threshold is 9', () => {
    expect(attackRecoveryResult('wrecked', 4, 8, 7).basePass).toBe(false);
    expect(attackRecoveryResult('wrecked', 4, 9, 7).basePass).toBe(true);
  });

  it('dead division: base threshold is 10', () => {
    expect(attackRecoveryResult('dead', 4, 9, 7).basePass).toBe(false);
    expect(attackRecoveryResult('dead', 4, 10, 7).basePass).toBe(true);
  });

  it('step 2 CV4: recover on 7+', () => {
    expect(attackRecoveryResult('clean', 4, 8, 7).recovered).toBe(true);
    expect(attackRecoveryResult('clean', 4, 8, 6).recovered).toBe(false);
    expect(attackRecoveryResult('clean', 4, 8, 7).step2Threshold).toBe(7);
  });

  it('step 2 CV3: recover on 8+', () => {
    expect(attackRecoveryResult('clean', 3, 8, 8).recovered).toBe(true);
    expect(attackRecoveryResult('clean', 3, 8, 7).recovered).toBe(false);
  });

  it('step 2 CV2: recover on 9+', () => {
    expect(attackRecoveryResult('clean', 2, 8, 9).recovered).toBe(true);
    expect(attackRecoveryResult('clean', 2, 8, 8).recovered).toBe(false);
  });

  it('step 2 CV0: recover on 10+', () => {
    expect(attackRecoveryResult('clean', 0, 8, 10).recovered).toBe(true);
    expect(attackRecoveryResult('clean', 0, 8, 9).recovered).toBe(false);
  });

  it('step 2 CV1 same as CV0: recover on 10+', () => {
    expect(attackRecoveryResult('clean', 1, 8, 10).recovered).toBe(true);
    expect(attackRecoveryResult('clean', 1, 8, 9).recovered).toBe(false);
  });

  it('step2EffectiveRoll reflects step2Roll (no modifiers on step 2)', () => {
    const r = attackRecoveryResult('clean', 4, 8, 9);
    expect(r.step2EffectiveRoll).toBe(9);
  });
});

// ─── Zero Rule (LOB_CHARTS §9.1e) ────────────────────────────────────────────

describe('zeroRuleResult — Zero Rule (LOB_CHARTS §9.1e)', () => {
  it('ZERO_RULE_TABLE has correct tier boundaries', () => {
    expect(ZERO_RULE_TABLE[0]).toMatchObject({ rollMin: 1, rollMax: 1, ma: 'none' });
    expect(ZERO_RULE_TABLE[1]).toMatchObject({ rollMin: 2, rollMax: 3, ma: 'half' });
    expect(ZERO_RULE_TABLE[2]).toMatchObject({ rollMin: 4, rollMax: 6, ma: 'full' });
  });

  it('roll 1 → no MA', () => {
    expect(zeroRuleResult(1).ma).toBe('none');
  });

  it('roll 2 → half MA', () => {
    expect(zeroRuleResult(2).ma).toBe('half');
  });

  it('roll 3 → half MA', () => {
    expect(zeroRuleResult(3).ma).toBe('half');
  });

  it('roll 4 → full MA', () => {
    expect(zeroRuleResult(4).ma).toBe('full');
  });

  it('roll 5 → full MA', () => {
    expect(zeroRuleResult(5).ma).toBe('full');
  });

  it('roll 6 → full MA', () => {
    expect(zeroRuleResult(6).ma).toBe('full');
  });
});
