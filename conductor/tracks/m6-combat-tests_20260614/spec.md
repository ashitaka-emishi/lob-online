# Spec: M6 Combat Tests — resolveMorale Suite and Dispatch Integration

## Overview

The `m6-combat-engine_20260614` PR shipped without a `resolveMorale.test.js` file and without
a dispatch-level integration test for the full fire-combat → morale resolution flow. This track
adds that missing coverage.

## Issues Closed

| Issue | Score | Title                                                                    |
| ----- | ----- | ------------------------------------------------------------------------ |
| #580  | 3     | missing resolveMorale.test.js and dispatch-level combat integration test |

**Total debt score removed:** 3

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals.

## Risk Classification

**Risk:** Low
**Reason:** Test-only additions. No production code changes.

## Required Tests

### resolveMorale.test.js

Create `server/src/engine/combat/resolveMorale.test.js`. Cover:

- Normal morale result: unit stays `normal`, no cascade triggered
- `shaken` result: unit transitions to `shaken`, `cbfMarker` set appropriately
- `disorganized` result: unit transitions to `disorganized`
- `routed` result: unit transitions to `routed`, cascade check fires
- `bloodlust` result: unit transitions to `bloodlust`
- Multiple units in pending resolver: all receive independent checks
- `leaderCasualty` pending created when dice indicate leader loss

Each test should call `resolveMorale` directly with a minimal game state fixture, supplied
dice, and a simple OOB fixture (no disk reads — pass oob as context argument per Track 2 fix).

### Dispatch Integration Test

Extend or create a dispatch-level test (co-locate with `server/src/engine/dispatch.test.js`
or similar) that exercises the full two-step flow:

1. Dispatch `FIRE_COMBAT` → state has `pendingResolution.type === 'combatResult'`
2. `getValidActions()` returns `RESOLVE_MORALE` (soft-lock check)
3. Dispatch `RESOLVE_MORALE` with supplied dice → pending cleared, unit morale updated

This test depends on Track 2 (#572 DI wiring fix) landing first, or must mock the context
injection if running before Track 2.

## Acceptance Criteria

- [ ] `resolveMorale.test.js` exists with ≥6 test cases covering all morale result codes
- [ ] Dispatch integration test covers fire-combat → resolve-morale two-step
- [ ] No disk reads in any test (oob/scenario/map passed as fixtures)
- [ ] `npm run test:coverage` remains ≥ 70% line coverage
- [ ] `npm run quality:strict` passes
