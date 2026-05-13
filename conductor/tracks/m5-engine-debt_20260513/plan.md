# Implementation Plan: M5 Engine Debt Bundle — Issues #377 #378 #380 #384

**Track ID:** m5-engine-debt_20260513
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-13
**Status:** [ ] Not Started

## Overview

Four targeted fixes to the action engine and game state schema. Ordered from lowest to
highest risk: DX message fix (#384) → dispatch playerSide guard (#377) → drainAutoSteps
invariant (#378) → cross-field schema refinements (#380). Checkpoint required before
Phase 3 (schema changes touch the persistence surface).

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

- After Phase 2 (dispatch + drainAutoSteps guards) — pause before schema changes; human
  must confirm existing tests still pass and approve the Zod refinement approach.
- Before accepting any deferred debt scored ≥ 3.

## Risk Classification

**Risk:** Medium
**Reason:** Phases 1–2 are pure engine hardening with no schema changes; Phase 3 adds
cross-field Zod `.refine()` to `GameStateSchema`, a persistence/wire-format surface that
requires Checkpointed review per the agentic quality rails.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Issues #377 #378 #380 #384 closed on merge
- [ ] Ready for `/team-review`

---

## Phase 1: Dispatch Hardening (#384 + #377)

Fix the `UNKNOWN_ACTION` error message and add the `playerSide` guard to `dispatch()`.
Both changes are in `server/src/engine/actions/index.js` and tested in `index.test.js`.

### Tasks

- [ ] Task 1.1: In `dispatch()`, change the `UNKNOWN_ACTION` error to include `action.type`
      in the message string (e.g., `\`Unknown action type: ${action.type}\``). (#384)
- [ ] Task 1.2: Add or update the existing `UNKNOWN_ACTION` test in `index.test.js` to assert
      the error message includes the unknown type string. (#384)
- [ ] Task 1.3: In `dispatch()`, after the `UNKNOWN_ACTION` guard, add: if
      `state.activePlayer !== null && action.playerSide !== state.activePlayer`, throw
      `ActionError('INVALID_ACTION', 'Not your turn')`. (#377)
- [ ] Task 1.4: Add a test in `index.test.js` for the playerSide rejection: construct a state
      with `activePlayer: 'union'`, dispatch with `playerSide: 'confederate'`, assert
      `ActionError` with code `INVALID_ACTION`. (#377)
- [ ] Task 1.5: Run `npm run lint && npm run test`. All gates must pass.

### Verification

- [ ] `UNKNOWN_ACTION` test asserts error message contains action type.
- [ ] `INVALID_ACTION` test asserts rejection when playerSide doesn't match activePlayer.
- [ ] `dispatch()` with null `activePlayer` (setup phase) still passes (no playerSide check).
- [ ] `npm run test` green.

---

## Phase 2: drainAutoSteps Invariant (#378)

Add a cross-field Zod refinement asserting `activityPhase === null` outside the `activity`
phase. This is cleaner than an in-engine guard because the schema is the authoritative
invariant layer.

### Tasks

- [ ] Task 2.1: In `server/src/schemas/gameState.schema.js`, add a `.superRefine()` or
      `.refine()` check: `activityPhase` must be `null` when `phase !== 'activity'`.
      Error path: `['activityPhase']`. (#378)
- [ ] Task 2.2: Add a test in `gameState.schema.test.js`: construct a state with
      `phase: 'command'` and `activityPhase: { activatedUnits: [] }`, assert parse fails with
      the expected error path. (#378)
- [ ] Task 2.3: Run `npm run validate-data && npm run lint && npm run test`. All must pass.

### Verification

- [ ] New schema refinement test asserts the invalid state is rejected.
- [ ] Existing state fixtures (which have `phase: 'command'` and `activityPhase: null`) still pass.
- [ ] `npm run test` green.

**⚠ CHECKPOINT: Pause after Phase 2 for human approval before modifying GameStateSchema further (Phase 3).**

---

## Phase 3: Cross-Field Schema Refinements (#380)

Add the two remaining cross-field invariants to `GameStateSchema`:
`ordersPhase` non-null ↔ `phase === 'command'`; `activityPhase` non-null ↔ `phase === 'activity'`
(the activityPhase side may already be covered by Phase 2 — add only what is missing).

### Tasks

- [ ] Task 3.1: In `server/src/schemas/gameState.schema.js`, add refinement: `ordersPhase`
      must be `null` when `phase !== 'command'`. Error path: `['ordersPhase']`. (#380)
- [ ] Task 3.2: Add a test: state with `phase: 'activity'` and non-null `ordersPhase` fails
      validation. (#380)
- [ ] Task 3.3: Confirm the `activityPhase ↔ phase === 'activity'` refinement from Phase 2
      covers the second half of #380. If not, add it now.
- [ ] Task 3.4: Run `npm run validate-data && npm run lint && npm run test`. All must pass.

### Verification

- [ ] Both cross-field refinements tested with invalid and valid states.
- [ ] `npm run validate-data` passes (real data files still conform).
- [ ] `npm run test` green.

---

## Phase 4: Quality Gates + PR

Run all closeout gates, open PR, and close the four issues.

### Tasks

- [ ] Task 4.1: Run `npm run quality:strict` — all 5 gates pass.
- [ ] Task 4.2: Confirm no unexpected warnings in test output.
- [ ] Task 4.3: Run `/pr-create` to write devlog entry and open the PR.
- [ ] Task 4.4: After PR merges, run `/issue-close 377`, `/issue-close 378`,
      `/issue-close 380`, `/issue-close 384`.

### Verification

- [ ] All quality gates green.
- [ ] PR opened.
- [ ] Issues #377 #378 #380 #384 closed with merge comment.

---

## Final Verification

- [ ] All acceptance criteria in spec.md met.
- [ ] `npm run quality:strict` passes.
- [ ] No unexpected warnings in test output.
- [ ] Debt register unchanged (0 new debt items).
- [ ] Ready for `/team-review`.

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
