# Implementation Plan: M5 Phase Engine — Turn Reducer and Valid Actions

**Track ID:** m5-phase-engine_20260508
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-08
**Status:** [x] Complete
**GitHub Issue:** #355 (close with merge comment)

## Overview

Apply the eight remaining M5 schema additions to `gameState.schema.js`, update
`initGameState()` to produce schema-valid initial state, then build the pure reducer in
`server/src/engine/actions/`. The work proceeds in five phases: schema → scaffold →
core reducer → phase handlers → quality gates. Tests are written alongside implementation
(strict TDD per workflow.md). The track concludes with PR creation using `/pr-create` and
a merge comment closing issue #355.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

- After Phase 1 (schema additions) — pause before writing any action engine code; human
  must approve the schema changes and confirm that all existing tests still pass.
- Before accepting any deferred debt scored ≥ 3.

## Risk Classification

**Risk:** High
**Reason:** Modifies `GameStateSchema` (wire-format + disk-persistence surface) and implements
core rules-engine logic (phase/step transitions, order issuance) — both are Checkpointed
surfaces per `.claude/rules/agentic-quality-rails.md`.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved by human reviewer.

## Completion Contract

- [x] All plan tasks complete (except Task 5.4 — awaiting PR merge)
- [x] All acceptance criteria in spec.md met
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated — 9 issues filed (#377–#385), report at docs/tech-debt/reports/pr-375_2026-05-12.md
- [x] PR opened via `/pr-create` → PR #375; issue #355 to be closed on merge

---

## Phase 1: Schema Additions

Apply the eight remaining M5 schema fields to `gameState.schema.js`. Update
`initGameState()` so its output is valid under the new schema. Update test fixtures
that reference the old phase enum.

**⚠ CHECKPOINT: Pause after this phase for human approval before proceeding.**

### Tasks

- [x] Task 1.1: In `server/src/schemas/gameState.schema.js`, add `'stopped'` to
      `UnitOrderState.status` enum and add the cross-field refinement: `stopped` status
      requires `type` to be non-null (LOB §10.6b — stopped order must have a type to restore).
- [x] Task 1.2: Rename `phase` enum from `['initiative', 'orders', 'movement', 'combat',
'morale', 'recovery']` to `['command', 'activity', 'rally']`.
- [x] Task 1.3: Add `activePlayer: z.enum(['union', 'confederate']).nullable()` to
      `GameStateSchema`. Null during setup; set to first player at game start.
- [x] Task 1.4: Add `step: z.string().nullable()` to `GameStateSchema`. Null between phases;
      string key for current interactive step within a phase.
- [x] Task 1.5: Add `completedSteps: z.array(z.string())` to `GameStateSchema`. Reset to `[]`
      on phase transitions.
- [x] Task 1.6: Add `LeaderStateSchema` and `leaderState: z.record(z.string(), LeaderStateSchema)`
      to `GameStateSchema`. Keyed by leaderId; holds `casualtyRollPending` and `replacedBy`.
- [x] Task 1.7: Add `PendingResolutionSchema` and `pendingResolution: PendingResolutionSchema.nullable()`
      to `GameStateSchema`. Non-null only when a mid-step interrupt requires a roll or decision.
- [x] Task 1.8: Add `activityPhase: z.object({ activatedUnits: z.array(z.string()) }).nullable()`
      to `GameStateSchema`. Non-null only during Activity Phase (LOB §3.0d enforcement).
- [x] Task 1.9: Add `ordersPhase: z.object({ leaderRollUsed: z.record(z.string(), z.boolean()) }).nullable()`
      to `GameStateSchema`. Non-null only during Orders step of Command Phase (LOB §10.6).
- [x] Task 1.10: Update `server/src/engine/init.js` (`initGameState()`) to set all new fields
      to valid initial values: `activePlayer: null`, `step: null`, `completedSteps: []`,
      `leaderState: {}`, `pendingResolution: null`, `activityPhase: null`, `ordersPhase: null`.
- [x] Task 1.11: Update test fixtures in `gameState.schema.test.js` and `init.test.js` that
      use the old phase enum values (`'orders'`, `'movement'`, etc.) to use the new enum.
- [x] Task 1.12: Add schema tests for each new field: valid and invalid cases for
      `activePlayer`, `step`, `completedSteps`, `leaderState`, `pendingResolution`,
      `activityPhase`, `ordersPhase`, and the new `stopped` UnitOrderState status.
- [x] Task 1.13: Run `npm run validate-data && npm run lint && npm run format:check && npm run test`.
      All gates must pass before the checkpoint.

### Verification

- [x] `npm run test` passes with all new schema tests green.
- [x] `npm run validate-data` passes (scenario.json, oob.json, map.json still valid).
- [x] No existing tests broken by the phase enum rename.
- [ ] **HUMAN CHECKPOINT: review schema changes before proceeding to Phase 2.**

---

## Phase 2: ActionError + Engine Scaffold

Create the `server/src/engine/actions/` directory and skeleton files with correct
export signatures but no logic yet.

### Tasks

- [x] Task 2.1: Create `server/src/engine/actions/index.js` with `ActionError`, `dispatch`, `getValidActions` stubs.
- [x] Task 2.2: Create `actionError.js`, `endPhase.js`, `issueOrder.js`, `activateStack.js`, `endActivation.js` with full implementations.
- [x] Task 2.3: Create `index.test.js` with full test coverage.

### Verification

- [x] All new files present and ESLint-clean (no import errors).
- [x] `npm run lint` passes.

---

## Phase 3: Core Reducer

Implement `dispatch`, `getValidActions`, and `drainAutoSteps` in `index.js`. These three
functions are the entire public surface of the action engine.

### Tasks

- [x] Task 3.1: Implement `drainAutoSteps(state)` — attackRecovery, flukeStoppage, Rally all auto-drain.
- [x] Task 3.2: Implement `getValidActions(state, playerSide)` with full phase/step/pendingResolution logic.
- [x] Task 3.3: Implement `dispatch(state, action)` — validate → route → drain → schema-check.
- [x] Task 3.4: Full `index.test.js` tests including turn-cycle and activePlayer alternation.

### Verification

- [x] `index.test.js` tests pass.
- [x] `npm run lint` clean.

---

## Phase 4: Phase Handlers

Implement each handler file. Each handler receives `(state, action)` and returns a new state
object (no mutation of input). Rule citations are required per coding-standards.

### Tasks

- [x] Task 4.1: Implement `endPhase.js` — Command→Activity (via drainAutoSteps) and two-player Activity→Rally transitions.
- [x] Task 4.2: Write `endPhase.test.js` with full coverage of all transitions and LOB §3.0d guard.
- [x] Task 4.3: Implement `issueOrder.js` — `handleRollInitiative` + `handleIssueOrder` with pendingOrderIssuance state machine.
- [x] Task 4.4: Write `issueOrder.test.js` — 11 tests covering roll, issue, rejection, and immutability.
- [x] Task 4.5: Implement `activateStack.js` (M5 stub) — sets `currentActivation`, enforces LOB §3.0d.
- [x] Task 4.6: Implement `endActivation.js` — moves `currentActivation` to `activatedUnits`.
- [x] Task 4.7: Write `activateStack.test.js` and `endActivation.test.js` with full coverage.
- [x] Task 4.8: Rally auto-drain verified by end-to-end turn-cycle test in `index.test.js`.

### Verification

- [x] All handler test files pass.
- [x] `npm run test` — 115 files, 2104 tests green.

---

## Phase 5: Quality Gates + PR

Run all closeout gates, open PR, and close issue #355.

### Tasks

- [x] Task 5.1: `npm run quality:strict` — all 5 gates pass.
- [x] Task 5.2: No unexpected warnings in test output (pre-existing console noise unchanged).
- [x] Task 5.3: Run `/pr-create` to write devlog entry and open the PR on GitHub.
- [ ] Task 5.4: After PR merges, run `/issue-close 355` to post a merge summary comment and
      close the issue.

### Verification

- [x] All quality gates green.
- [x] PR opened via `/pr-create`. → [PR #375](https://github.com/ashitaka-emishi/lob-online/pull/375)
- [ ] Issue #355 closed with merge comment.

---

## Final Verification

- [x] All acceptance criteria in spec.md met.
- [x] `npm run quality:strict` passes.
- [x] No unexpected warnings in test output.
- [x] Debt register updated — 9 issues filed (#377–#385, net +16 score).
- [x] `/team-review` complete — 10 findings fixed in-place, 9 deferred with issues.
- [x] Second-pass review complete — `.strict()` schema changes verified clean.
- [ ] Issue #355 closed with merge comment after PR merge.

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
