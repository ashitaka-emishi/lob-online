import { describe, expect, it } from 'vitest';

import { resolveMovementFormationKey } from './formation.js';

// #677 — single source of truth for the classification ladder previously duplicated between
// move.js's resolveMovementFormation and activateStack.js's resolveUnitMPs.
describe('resolveMovementFormationKey', () => {
  it('returns "unlimbered" for unlimbered artillery', () => {
    expect(resolveMovementFormationKey({ formation: 'unlimbered' }, { gunType: 'R' })).toBe(
      'unlimbered'
    );
  });

  it('returns "limbered" for limbered artillery', () => {
    expect(resolveMovementFormationKey({ formation: 'limbered' }, { gunType: 'R' })).toBe(
      'limbered'
    );
  });

  it('returns "mounted" for cavalry', () => {
    expect(resolveMovementFormationKey({ formation: null }, { type: 'cavalry' })).toBe('mounted');
  });

  it('returns "leader" for leader units', () => {
    expect(resolveMovementFormationKey({ formation: null }, { type: 'leader' })).toBe('leader');
  });

  it('defaults to "line" for infantry', () => {
    expect(resolveMovementFormationKey({ formation: null }, { type: 'infantry' })).toBe('line');
  });

  it('defaults to "line" when oobUnit is absent (degraded mode)', () => {
    expect(resolveMovementFormationKey({ formation: null }, null)).toBe('line');
  });

  // #m9 review finding — real SM batteries carry gunType with no `type` field at all
  // (verified against data/modules/south-mountain/oob.json — e.g. unit '1nh-lt': { gunType:
  // 'R', strengthPoints: 4, ... }, no `type` key). A classification ladder that only checked
  // oobUnit.type would silently misclassify every real battery as infantry.
  it('identifies artillery via gunType alone, matching real SM OOB shape (no type field)', () => {
    expect(resolveMovementFormationKey({ formation: 'limbered' }, { gunType: 'R' })).toBe(
      'limbered'
    );
    expect(resolveMovementFormationKey({ formation: null }, { gunType: 'R' })).toBe('unlimbered');
  });

  // #m9 review finding — a battery whose formation field was never initialized (e.g. freshly
  // set up, before any LIMBER/UNLIMBER action) must default to unlimbered, not fall through to
  // the infantry default. Matches the `unit.formation ?? 'unlimbered'` convention used at every
  // other artillery call site in this codebase (vp.js, actions/index.js, artillery.js).
  it('defaults an artillery unit with unset formation to unlimbered, not line', () => {
    expect(resolveMovementFormationKey({ formation: undefined }, { gunType: 'R' })).toBe(
      'unlimbered'
    );
    expect(resolveMovementFormationKey({}, { type: 'artillery' })).toBe('unlimbered');
  });

  it('unit.formation is trusted independent of oobUnit — degraded mode stays correct', () => {
    // No oobUnit at all (ctx.oob absent) — unit.formation alone must still be authoritative
    // for artillery, since move.js/activateStack.js's degraded-mode fallback relies on this.
    expect(resolveMovementFormationKey({ formation: 'unlimbered' }, null)).toBe('unlimbered');
    expect(resolveMovementFormationKey({ formation: 'limbered' }, null)).toBe('limbered');
  });

  // #m9 review, second pass — dropped when the fixtures above were reshaped to real gunType
  // OOB data; re-added since it's the one case proving unit.formation wins even against a
  // conflicting, non-null oobUnit (not just an absent one, covered above).
  it('unit.formation takes precedence over a conflicting oobUnit.type', () => {
    expect(resolveMovementFormationKey({ formation: 'limbered' }, { type: 'cavalry' })).toBe(
      'limbered'
    );
  });
});
