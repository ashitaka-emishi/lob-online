# Implementation Plan: M6 Combat Wiring

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Approval before starting task execution; approval before opening PR.

## Risk Classification

**Risk:** High
**Reason:** Touches the live dispatch pipeline and `getValidActions()`, which gates all player actions.

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

## Phase 1 — OOB helper deduplication (#573, prerequisite)

### Task 1.1 — Audit all `findOobUnit` / `findOobLeader` implementations

Search `server/src/engine/combat/` for inline definitions of `findOobUnit` and
`findOobLeader`. Note each signature and any divergence from the others.

### Task 1.2 — Add canonical exports to `engine/oob.js`

Add `findOobUnit(oob, unitId)` and `findOobLeader(oob, leaderId)` to
`server/src/engine/oob.js` alongside `buildUnitSideMap()`. Use the most complete
implementation as the canonical version.

### Task 1.3 — Replace inline copies with imports

In `fire.js`, `melee.js`, and `resolveMorale.js`, remove inline definitions and import
from `engine/oob.js`. Confirm tests still pass.

---

## Phase 2 — Dispatch DI wiring (#572)

### Task 2.1 — Identify the dispatch call site in the games route

Find where `dispatch(state, action)` is called in `server/src/routes/games.js` (or
equivalent). Confirm the third context argument is absent.

### Task 2.2 — Build and pass context object

Before the `dispatch()` call, load:

- `oob` — from the module's `oob.json` (reuse the existing load pattern)
- `scenario` — from the module's `scenario.json`
- `mapData` — from the module's `map.json`
- `hexIndex` — built from `mapData.hexes` using the existing hex index utility

Pass as `dispatch(state, action, { oob, scenario, mapData, hexIndex })`.

### Task 2.3 — Confirm handlers receive context

Add a minimal assertion test: dispatch a `FIRE_COMBAT` action and verify via a spy or
return value that real hex-distance (not Manhattan approximation) was used for range validation.

---

## Phase 3 — Soft-lock fix (#571)

### Task 3.1 — Add `combatResult` branch to `getValidActions()`

In `server/src/engine/phase.js`, find the `getValidActions()` function. Add a branch:
when `state.pendingResolution?.type === 'combatResult'`, return
`[{ type: 'RESOLVE_MORALE', payload: {} }]`.

### Task 3.2 — Add `closingRoll` branch to `getValidActions()`

When `state.pendingResolution?.type === 'closingRoll'`, return the closing-roll resolution
action (check what type name the melee handler expects for the follow-up).

### Task 3.3 — Add `moraleCheck` branch to `getValidActions()`

When `state.pendingResolution?.type === 'moraleCheck'`, return the appropriate action.

### Task 3.4 — Test: no soft-lock after FIRE_COMBAT

Write a test: set up minimal game state, dispatch `FIRE_COMBAT`, call `getValidActions()`
on the resulting state, assert the returned list is non-empty and contains `RESOLVE_MORALE`.

### Task 3.5 — Run `npm run quality:strict` and fix any issues
