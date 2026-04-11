/**
 * Tests for server/src/engine/tables/leader-loss.js
 *
 * Verifies every cell of the Leader Loss Table against LOB_CHARTS §9.1a,
 * plus the Sharpshooter +1 modifier.
 */

import { describe, expect, it } from 'vitest';

import { leaderLossResult } from './leader-loss.js';

// ─── Other Cases column (LOB_CHARTS §9.1a) ───────────────────────────────────

describe('leaderLossResult — Other Cases column (LOB_CHARTS §9.1a)', () => {
  it('rolls 2-10 → noEffect', () => {
    for (let r = 2; r <= 10; r++) {
      expect(leaderLossResult('other', false, r).result).toBe('noEffect');
    }
  });

  it('roll 11 → wounded', () => {
    expect(leaderLossResult('other', false, 11).result).toBe('wounded');
  });

  it('roll 12 → killed', () => {
    expect(leaderLossResult('other', false, 12).result).toBe('killed');
  });
});

// ─── Capture column (LOB_CHARTS §9.1a) ───────────────────────────────────────

describe('leaderLossResult — Capture column (LOB_CHARTS §9.1a)', () => {
  it('rolls 2-8 → noEffect', () => {
    for (let r = 2; r <= 8; r++) {
      expect(leaderLossResult('capture', false, r).result).toBe('noEffect');
    }
  });

  it('rolls 9-10 → captured', () => {
    expect(leaderLossResult('capture', false, 9).result).toBe('captured');
    expect(leaderLossResult('capture', false, 10).result).toBe('captured');
  });

  it('roll 11 → wounded', () => {
    expect(leaderLossResult('capture', false, 11).result).toBe('wounded');
  });

  it('roll 12 → killed', () => {
    expect(leaderLossResult('capture', false, 12).result).toBe('killed');
  });
});

// ─── Defender column (LOB_CHARTS §9.1a) ──────────────────────────────────────

describe('leaderLossResult — Defender (Charge) column (LOB_CHARTS §9.1a)', () => {
  it('rolls 2-9 → noEffect', () => {
    for (let r = 2; r <= 9; r++) {
      expect(leaderLossResult('defender', false, r).result).toBe('noEffect');
    }
  });

  it('roll 10 → wounded', () => {
    expect(leaderLossResult('defender', false, 10).result).toBe('wounded');
  });

  it('rolls 11-12 → killed', () => {
    expect(leaderLossResult('defender', false, 11).result).toBe('killed');
    expect(leaderLossResult('defender', false, 12).result).toBe('killed');
  });
});

// ─── Attacker column (LOB_CHARTS §9.1a) ──────────────────────────────────────

describe('leaderLossResult — Attacker (Charge) column (LOB_CHARTS §9.1a)', () => {
  it('rolls 2-7 → noEffect', () => {
    for (let r = 2; r <= 7; r++) {
      expect(leaderLossResult('attacker', false, r).result).toBe('noEffect');
    }
  });

  it('roll 8 → wounded', () => {
    expect(leaderLossResult('attacker', false, 8).result).toBe('wounded');
  });

  it('rolls 9-12 → killed', () => {
    for (let r = 9; r <= 12; r++) {
      expect(leaderLossResult('attacker', false, r).result).toBe('killed');
    }
  });
});

// ─── Sharpshooter +1 modifier (LOB_CHARTS §9.1a) ─────────────────────────────

describe('leaderLossResult — Sharpshooter +1 modifier (LOB_CHARTS §9.1a)', () => {
  it('Other: roll 10 with sharpshooter → effective 11 → wounded (without: noEffect)', () => {
    expect(leaderLossResult('other', false, 10).result).toBe('noEffect');
    expect(leaderLossResult('other', true, 10).result).toBe('wounded');
  });

  it('Other: roll 11 with sharpshooter → effective 12 → killed (without: wounded)', () => {
    expect(leaderLossResult('other', false, 11).result).toBe('wounded');
    expect(leaderLossResult('other', true, 11).result).toBe('killed');
  });

  it('Capture: roll 8 with sharpshooter → effective 9 → captured (without: noEffect)', () => {
    expect(leaderLossResult('capture', false, 8).result).toBe('noEffect');
    expect(leaderLossResult('capture', true, 8).result).toBe('captured');
  });

  it('Capture: roll 10 with sharpshooter → effective 11 → wounded (without: captured)', () => {
    expect(leaderLossResult('capture', false, 10).result).toBe('captured');
    expect(leaderLossResult('capture', true, 10).result).toBe('wounded');
  });

  it('Defender: roll 9 with sharpshooter → effective 10 → wounded (without: noEffect)', () => {
    expect(leaderLossResult('defender', false, 9).result).toBe('noEffect');
    expect(leaderLossResult('defender', true, 9).result).toBe('wounded');
  });

  it('Attacker: roll 7 with sharpshooter → effective 8 → wounded (without: noEffect)', () => {
    expect(leaderLossResult('attacker', false, 7).result).toBe('noEffect');
    expect(leaderLossResult('attacker', true, 7).result).toBe('wounded');
  });

  it('Attacker: roll 8 with sharpshooter → effective 9 → killed (without: wounded)', () => {
    expect(leaderLossResult('attacker', false, 8).result).toBe('wounded');
    expect(leaderLossResult('attacker', true, 8).result).toBe('killed');
  });
});

// ─── Unknown situation ────────────────────────────────────────────────────────

describe('leaderLossResult — unknown situation', () => {
  it('unknown situation → noEffect', () => {
    expect(leaderLossResult('unknown', false, 12).result).toBe('noEffect');
  });
});
