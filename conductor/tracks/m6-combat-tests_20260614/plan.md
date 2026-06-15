# Implementation Plan: M6 Combat Tests

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals.

## Risk Classification

**Risk:** Low
**Reason:** Test-only additions. No production code changes.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

---

## Phase 1 — resolveMorale unit tests

### Task 1.1 — Create fixture helpers

Create a minimal OOB fixture and game-state factory function at the top of
`resolveMorale.test.js`. The OOB fixture needs at least two brigades with one unit each.
The game-state factory should accept a morale state and SP count and return a valid
`GameState` with a `combatResult` pending resolution targeting that unit.

### Task 1.2 — Write test: normal result, no transition

Call `resolveMorale` with dice that produce a `normal` result. Assert the unit morale
state remains `normal` and no cascade pending is created.

### Task 1.3 — Write test: shaken transition

Supply dice for a `shaken` result. Assert unit transitions to `shaken`.

### Task 1.4 — Write test: disorganized transition

Supply dice for a `disorganized` result. Assert unit transitions to `disorganized`.

### Task 1.5 — Write test: routed transition with cascade

Supply dice for a `routed` result. Assert unit transitions to `routed` and a cascade
pending resolution is created.

### Task 1.6 — Write test: bloodlust transition

Supply dice for a `bloodlust` result. Assert unit transitions to `bloodlust`.

### Task 1.7 — Write test: leader casualty pending created

Supply dice that trigger leader loss. Assert `pendingResolution` of type `leaderCasualty`
is set on the resulting state.

---

## Phase 2 — Dispatch integration test

### Task 2.1 — Write fire-combat → resolve-morale two-step test

Set up a minimal game state with two opposing units in range with LOS. Use direct handler
calls (or dispatch with injected context) to avoid disk reads.

Step 1: Dispatch `FIRE_COMBAT`. Assert `state.pendingResolution.type === 'combatResult'`.
Step 2: Call `getValidActions(state)`. Assert it contains `RESOLVE_MORALE`.
Step 3: Dispatch `RESOLVE_MORALE` with supplied dice. Assert `pendingResolution` is cleared
and the target unit's morale state is updated.

### Task 2.2 — Run `npm run quality:strict` and fix any issues
