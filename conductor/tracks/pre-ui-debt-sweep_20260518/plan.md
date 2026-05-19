# Implementation Plan: Pre-UI Debt Sweep — initGameState Correctness + Schema Quality

**Track ID:** pre-ui-debt-sweep_20260518
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-18
**Status:** [~] In Progress

## Overview

Six deferred debt items closed in three logical phases:

1. `initGameState()` correctness — isDetached propagation (#361) and reinforcement orderType (#360)
2. Schema migration path — `schemaVersion` field and stale-save guard (#363)
3. Developer workflow + code quality — scenario cache invalidation (#337), null/none helper (#364), `defaultUnit()` options object (#371)

All work is confined to `server/src/engine/init.js`, `server/src/schemas/`, `server/src/routes/games.js`, `server/src/store/gameFile.js`, and `data/scenarios/south-mountain/scenario.json`.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

- After Phase 1 (schema data change + engine correctness): review isDetached propagation in test output before proceeding
- Before merging: explicit approval after `npm run quality:strict` passes

## Risk Classification

**Risk:** High
**Reason:** Touches game-state initialization, schema migration/versioning, and persistence load path — all Checkpointed surfaces per the quality rails.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [x] All plan tasks complete
- [x] All six acceptance criteria in spec.md met
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated (17 points removed: #337 #360 #361 #363 #364 #371; #340 stale entry corrected)
- [ ] Ready for `/team-review`

---

## Phase 1: initGameState Correctness (#361 + #360)

Fix the two score-4 items that cause incorrect game state at scenario start.

### Tasks

- [x] Task 1.1: Write failing tests in `init.test.js` covering:
  - Garland brigade units are initialized with `isDetached: true` (#361)
  - A reinforcement group with `orderType: "move"` produces units with `orders.type === 'move'` (#360)
- [x] Task 1.2: Add `"isDetached": true` to the Garland brigade group in
      `data/scenarios/south-mountain/scenario.json` (the group with
      `_groupNote: "Garland Brigade (G/dH) — DETACHED"`)
- [x] Task 1.3: Fix `processSetupSide()` in `init.js` to read `entry.isDetached ?? false`
      and forward it to `defaultUnit()` for all three entry shapes (setupZone, individual hex,
      group-with-hex-array)
- [x] Task 1.4: Fix `processReinforcementGroup()` in `init.js` to read `group.orderType ?? null`
      and pass it as `orderRaw` to `defaultUnit()` instead of `null`
- [x] Task 1.5: Verify the schema refine (`isDetached: true` requires `orders !== null`) does not
      reject newly-detached units (mapOrder('move') returns a valid UnitOrderState)

### Verification

- [ ] `npm run test` — all init.test.js tests pass including the two new ones
- [ ] **CHECKPOINT** — review isDetached and orderType initialization in test output; confirm
      Garland units have `isDetached: true` and `orders.type === 'move'`; confirm reinforcement
      units with `orderType: "move"` receive the correct order state

---

## Phase 2: Schema Migration Path (#363)

Add `schemaVersion` to prevent silent mismatches between saved games and the current schema.

### Tasks

- [x] Task 2.1: Add `STATE_SCHEMA_VERSION = 1` constant to `server/src/constants/schemaVersion.js`;
      include it in the `initGameState()` return object as `schemaVersion: STATE_SCHEMA_VERSION`
- [x] Task 2.2: Add `schemaVersion: z.literal(1)` to `GameStateSchema` in
      `server/src/schemas/gameState.schema.js`
- [x] Task 2.3: In `server/src/store/gameFile.js`, before calling `GameStateSchema.parse()` on
      a loaded file, read `raw.schemaVersion` and throw a descriptive `Error` if it doesn't
      match `STATE_SCHEMA_VERSION`
- [x] Task 2.4: Write tests covering:
  - `initGameState()` output includes `schemaVersion: 1`
  - `loadGame()` on a file with `schemaVersion: 2` throws with a clear message
  - `loadGame()` on a file with no `schemaVersion` throws

### Verification

- [ ] `npm run test` — all gameState.schema tests and gameFile tests pass

---

## Phase 3: Developer Workflow + Code Quality (#337 + #364 + #371)

Lower-risk cleanup fixes that improve the development loop and code readability.

### Tasks

- [x] Task 3.1 (#337): Add a `clearScenarioCache()` export to `server/src/routes/games.js`
      that sets `_scenario = null`; call it from the scenario editor save route (or its
      success handler) so new game creation picks up updated scenario.json without a restart
- [x] Task 3.2 (#364): In `server/src/engine/init.js`, add an exported `isOrderHolder(unit)`
      predicate (`unit.orders !== null`) alongside a JSDoc comment that defines the
      null/non-null distinction. Update the `orders` field comment in `gameState.schema.js`
      to reference this predicate for query code.
- [x] Task 3.3 (#371): Refactor `defaultUnit(id, hex, orderRaw, isOnBoard, entryTurn, isDetached)`
      to `defaultUnit({ id, hex, orderRaw, isOnBoard, entryTurn, isDetached = false })`; update
      all five call sites in `init.js` to use named-object form

### Verification

- [x] `npm run test` — full suite green (2145/2145)
- [x] Manual check: afterSave callback tested via `scenarioEditor.test.js` — clearScenarioCache
      is called on successful PUT /data and skipped on validation failure

---

## Phase 4: Closeout

- [x] `npm run quality:strict` — all five gates pass
- [x] Close GitHub issues #337, #360, #361, #363, #364, #371
- [x] Correct stale debt-register entry for #340 (already closed in PR #339; mark resolved)
- [x] Update `docs/tech-debt/report.md`: remove resolved items, net open 14 items / 24 points
- [ ] Open PR via `/pr-create`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
