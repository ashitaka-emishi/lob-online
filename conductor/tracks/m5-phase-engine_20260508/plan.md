# Implementation Plan: M5 Phase Engine — Turn Reducer and Valid Actions

**Track ID:** m5-phase-engine_20260508
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-08
**Status:** [ ] Not Started
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

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved by human reviewer.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] PR opened via `/pr-create`; merge comment closes issue #355

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

- [ ] Task 2.1: Create `server/src/engine/actions/index.js` with: - `ActionError` class extending `Error` with `code` and `message` properties. - Exported stub `dispatch(state, action)` that throws `ActionError{ code: 'NOT_IMPLEMENTED' }`. - Exported stub `getValidActions(state, playerSide)` that returns `[]`.
- [ ] Task 2.2: Create skeleton files with comment-only bodies: - `server/src/engine/actions/endPhase.js` — exports `handleEndPhase(state, action)` - `server/src/engine/actions/issueOrder.js` — exports `handleIssueOrder(state, action)` and
      `handleRollInitiative(state, action)` - `server/src/engine/actions/activateStack.js` — exports `handleActivateStack(state, action)` - `server/src/engine/actions/endActivation.js` — exports `handleEndActivation(state, action)`
- [ ] Task 2.3: Create `server/src/engine/actions/index.test.js` with the test skeleton:
      scaffolding for dispatch-rejects-invalid-action, getValidActions-returns-empty-outside-active
      tests (not yet passing — will be filled in Phase 3).

### Verification

- [ ] All new files present and ESLint-clean (no import errors).
- [ ] `npm run lint` passes.

---

## Phase 3: Core Reducer

Implement `dispatch`, `getValidActions`, and `drainAutoSteps` in `index.js`. These three
functions are the entire public surface of the action engine.

### Tasks

- [ ] Task 3.1: Implement `drainAutoSteps(state)` in `index.js`: - Rally phase step `'rally'` is automatic — immediately advance to next turn Command. - Attack Recovery step `'attackRecovery'` is automatic at M5 depth (no stopped orders
      in initial state) — advance to Fluke Stoppage. - Fluke Stoppage step `'flukeStoppage'` is automatic at M5 depth — advance to Activity. - Return updated state; do not mutate input.
- [ ] Task 3.2: Implement `getValidActions(state, playerSide)`: - Returns `[]` if `state.status !== 'active'`. - Returns `[]` if `state.activePlayer !== playerSide` (except Activity Phase inactive
      player rule — out of M5 scope, so just enforce active-player-only for now). - Returns `[]` if `state.pendingResolution !== null`. - Command phase, orders step: returns `[{ type: 'ROLL_INITIATIVE', payload: { leaderId } }]`
      for each eligible leader not yet rolled this step. - Command phase, orders step (after roll): returns `[{ type: 'ISSUE_ORDER', payload: ... }]`
      if a roll succeeded and an order has not yet been issued. - Activity phase, activation step: returns `[{ type: 'ACTIVATE_STACK', payload: { hex } }]`
      for non-activated stacks + `[{ type: 'END_PHASE' }]` when activation step can end. - Any interactive step: always includes `{ type: 'END_PHASE' }` as a legal escape when
      the active player may advance the phase. - Include LOB rule citations on each conditional branch.
- [ ] Task 3.3: Implement `dispatch(state, action)`: 1. Validate `action` is in `getValidActions(state, action.playerId)` — throw
      `ActionError{ code: 'INVALID_ACTION', message: '...' }` if not found. 2. Route `action.type` to the appropriate handler imported from handler files. 3. Call `drainAutoSteps(nextState)` on the returned state. 4. Validate the final state with `GameStateSchema.parse(finalState)` — if Zod throws,
      re-throw as `ActionError{ code: 'INVALID_STATE', message: zodError.message }`. 5. Return validated final state.
- [ ] Task 3.4: Fill in `index.test.js` tests: - `getValidActions` returns `[]` for setup state (status: 'setup'). - `getValidActions` returns `[]` for wrong playerSide. - `dispatch` throws `ActionError{ code: 'INVALID_ACTION' }` for action not in
      `getValidActions`. - `dispatch` validates output state with `GameStateSchema` and throws
      `ActionError{ code: 'INVALID_STATE' }` when a handler returns corrupt state.

### Verification

- [ ] `index.test.js` tests pass.
- [ ] `npm run lint` clean.

---

## Phase 4: Phase Handlers

Implement each handler file. Each handler receives `(state, action)` and returns a new state
object (no mutation of input). Rule citations are required per coding-standards.

### Tasks

- [ ] Task 4.1: Implement `endPhase.js` — `handleEndPhase(state, action)`: - Command phase → Activity phase transition: - Set `phase: 'activity'`, `step: 'activation'`, `completedSteps: []`. - Set `activityPhase: { activatedUnits: [] }`. - Set `ordersPhase: null`. - LOB §2.1 — Command Phase ends, Activity Phase begins. - Activity phase → Rally phase transition (when active player ends): - Flip to inactive player's Activity Phase first (M5 design §2a) if inactive player
      hasn't gone yet; otherwise advance to Rally. - Set `phase: 'rally'`, `step: 'rally'`, `activityPhase: null`. - LOB §2.1 — Activity Phase ends, Rally Phase begins. - Rally phase → next turn Command transition: - Increment `turn`, flip `activePlayer`, set `phase: 'command'`, `step: 'orders'`,
      `completedSteps: []`, `ordersPhase: { leaderRollUsed: {} }`. - LOB §2.1 — Rally Phase ends, new turn begins.
- [ ] Task 4.2: Write `endPhase.test.js` covering: - Command → Activity transition sets correct fields. - Activity → Rally transition (both players done) sets correct fields. - Rally → next turn Command increments turn, flips activePlayer. - Calling END_PHASE at wrong phase/step returns ActionError (tested via dispatch).
- [ ] Task 4.3: Implement `issueOrder.js`: - `handleRollInitiative(state, action)`: - Mark `ordersPhase.leaderRollUsed[leaderId] = true`. - Store roll result in a transient field so ISSUE_ORDER can check it. - LOB §10.6 — Command Roll: one roll per leader per turn. - `handleIssueOrder(state, action)`: - Set `units[unitId].orders` to `{ type: action.payload.orderType, status: 'accepted',
deliveryTurnDue: null }` (M5 steel thread — no delay/delivery phase yet). - LOB §10.4a-b — Attack and Move order assignment.
- [ ] Task 4.4: Write `issueOrder.test.js` covering: - `ROLL_INITIATIVE` marks the leader as rolled and cannot be re-issued for the same leader. - `ISSUE_ORDER` sets the target unit's order to accepted status with correct type. - `ISSUE_ORDER` without a preceding successful roll is rejected by `getValidActions`.
- [ ] Task 4.5: Implement `activateStack.js` — `handleActivateStack(state, action)` (M5 stub): - Add `action.payload.hex` to `activityPhase.activatedUnits` (record the stack as activated). - LOB §3.0d — one stack must complete activity before another starts. - No movement resolution (M6).
- [ ] Task 4.6: Implement `endActivation.js` — `handleEndActivation(state, action)`: - Mark the current activation as complete (stack hex already in `activatedUnits`). - Return state with same step (more stacks can activate). - LOB §3.0d — activation ends; another stack may now activate.
- [ ] Task 4.7: Write `activateStack.test.js` covering: - `ACTIVATE_STACK` adds hex to `activatedUnits`. - `ACTIVATE_STACK` is rejected if a stack is already mid-activation (LOB §3.0d). - `END_ACTIVATION` completes the current activation without advancing the phase.
- [ ] Task 4.8: Verify `drainAutoSteps` handles Rally auto-drain end-to-end: - After `END_PHASE` from Activity, entering Rally immediately advances to next turn
      Command via `drainAutoSteps` without requiring any player input.

### Verification

- [ ] All handler test files pass.
- [ ] `npm run test` — full suite green.

---

## Phase 5: Quality Gates + PR

Run all closeout gates, open PR, and close issue #355.

### Tasks

- [ ] Task 5.1: Run `npm run quality:strict` (validate-data, lint, format:check, test, build).
      Fix any failures before proceeding.
- [ ] Task 5.2: Verify no unexpected warnings in test output (Vue warnings, unhandled rejections,
      console.warn/error not from assertions).
- [ ] Task 5.3: Run `/pr-create` to write devlog entry and open the PR on GitHub.
- [ ] Task 5.4: After PR merges, run `/issue-close 355` to post a merge summary comment and
      close the issue.

### Verification

- [ ] All quality gates green.
- [ ] PR opened via `/pr-create`.
- [ ] Issue #355 closed with merge comment.

---

## Final Verification

- [ ] All acceptance criteria in spec.md met.
- [ ] `npm run quality:strict` passes.
- [ ] No unexpected warnings in test output.
- [ ] Debt register updated if any debt was accepted.
- [ ] Issue #355 closed with merge comment after PR merge.
- [ ] Ready for `/team-review`.

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
