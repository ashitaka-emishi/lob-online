import { describe, expect, it } from 'vitest';

import { resolveFormationKey } from './formation.js';

// #677 — single source of truth for the classification ladder previously duplicated between
// move.js's resolveMovementFormation and activateStack.js's resolveUnitMPs.
describe('resolveFormationKey', () => {
  it('returns "unlimbered" for unlimbered artillery', () => {
    expect(resolveFormationKey({ formation: 'unlimbered' }, { type: 'artillery' })).toBe(
      'unlimbered'
    );
  });

  it('returns "limbered" for limbered artillery', () => {
    expect(resolveFormationKey({ formation: 'limbered' }, { type: 'artillery' })).toBe('limbered');
  });

  it('returns "mounted" for cavalry', () => {
    expect(resolveFormationKey({ formation: null }, { type: 'cavalry' })).toBe('mounted');
  });

  it('returns "leader" for leader units', () => {
    expect(resolveFormationKey({ formation: null }, { type: 'leader' })).toBe('leader');
  });

  it('defaults to "line" for infantry', () => {
    expect(resolveFormationKey({ formation: null }, { type: 'infantry' })).toBe('line');
  });

  it('defaults to "line" when oobUnit is absent (degraded mode)', () => {
    expect(resolveFormationKey({ formation: null }, null)).toBe('line');
  });

  it('unit.formation takes precedence over oobUnit.type', () => {
    // A unit explicitly marked limbered should report limbered even if oobUnit.type
    // (e.g. stale/mismatched data) says cavalry — unit.formation is the source of truth
    // for artillery-specific states.
    expect(resolveFormationKey({ formation: 'limbered' }, { type: 'cavalry' })).toBe('limbered');
  });
});
