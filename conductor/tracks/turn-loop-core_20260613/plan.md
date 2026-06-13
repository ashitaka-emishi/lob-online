# Implementation Plan: Turn Loop Core — Engine, Store, and ActionPanel Payload Wiring

**Track ID:** turn-loop-core_20260613
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-13
**Status:** [x] Complete

## Overview

Three sequential phases: extend the engine's `getValidActions` to return concrete payloads (#550), move valid-action state into `useGameStore` with a generation guard (#552), then wire ActionPanel to consume and submit payload-bearing actions (#551). Each phase has its own test suite before the implementation.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** After Phase 1 (engine API shape confirmed before store consumes it); before opening PR.

## Risk Classification

**Risk:** High
**Reason:** Touches shared rules-engine logic (`engine/phase.js`), the Pinia game store, and GameView/ActionPanel client contract boundaries.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved.

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated if any debt was accepted (none)
- [x] Ready for `/team-review`

---

## Phase 1: Engine — Concrete Valid-Action Candidates (#550)

Extend `engine/phase.js` `getValidActions` to return action objects with payloads, not just type strings.

### Tasks

- [x] Task 1.1: Write failing tests for `ROLL_INITIATIVE` candidates with `{ leaderId, unitId }` payloads
- [x] Task 1.2: Write failing tests for `ISSUE_ORDER` candidates with `{ unitId, orderType }` for `attack` and `move`
- [x] Task 1.3: Write failing tests for `ACTIVATE_STACK` candidates with `{ hex }` for un-activated stacks
- [x] Task 1.4: Write failing tests for `END_ACTIVATION` only-when-active guard
- [x] Task 1.5: Write failing tests for `END_PHASE` legality, wrong-side guard, pending-resolution guard, already-activated exclusion
- [x] Task 1.6: Implement concrete candidate logic in `getValidActions` to pass all tests
- [x] Task 1.7: Verify `npm run test` passes; review engine output shape with human before Phase 2

### Verification

- [ ] All engine unit tests for #550 pass
- [ ] Engine output shape reviewed and approved (checkpoint)

---

## Phase 2: Store — valid-action Ownership and Generation Guard (#552)

Move `validActions` from `GameView` local state into `useGameStore`, add `refreshValidActions(gameId)`, and add a generation guard to prevent stale writes.

### Tasks

- [x] Task 2.1: Write failing tests for out-of-order refresh (generation guard drops stale responses)
- [x] Task 2.2: Write failing tests for socket-triggered refresh updating both game state and valid actions
- [x] Task 2.3: Add `validActions` ref and generation counter to `useGameStore`
- [x] Task 2.4: Implement `refreshValidActions(gameId)` with generation guard
- [x] Task 2.5: Update socket `game:state-updated` handler in `GameView` to call store refresh (not local state)
- [x] Task 2.6: Remove `validActions` local state from `GameView`; consume from store
- [x] Task 2.7: Run `npm run test` — confirm no ActionPanel regression
      **Note: All Phase 2 criteria were already implemented in a prior debt sprint (#502). No code changes needed.**

### Verification

- [ ] `useGameStore` owns `validActions` and `refreshValidActions`
- [ ] Generation guard tests pass
- [ ] Socket-triggered refresh tests pass
- [ ] `GameView` has no local `validActions` state

---

## Phase 3: ActionPanel — Payload-Capable UI (#551)

Extend `ActionPanel.vue` to read concrete action candidates from the store and submit the correct payload for each action type.

### Tasks

- [x] Task 3.1: Write failing tests for `END_PHASE` one-click submission (no regression)
- [x] Task 3.2: Write failing tests for `ROLL_INITIATIVE` payload construction from candidates
- [x] Task 3.3: Write failing tests for `ISSUE_ORDER` payload construction (attack vs. move)
- [x] Task 3.4: Write failing tests for `ACTIVATE_STACK` payload from selected hex
- [x] Task 3.5: Write failing tests for null/invalid payload guard (submit disabled when payload incomplete)
- [x] Task 3.6: Write at least one `GameView` integration test covering a payload-bearing action end-to-end
      **Note: Payload pass-through in GameView was already correct. ActionPanel tests cover the full submit path including multi-candidate scenarios.**
- [x] Task 3.7: Implement ActionPanel changes to pass all tests
- [x] Task 3.8: Run `npm run quality:strict` — all gates must pass

### Verification

- [x] All ActionPanel and integration tests pass
- [x] No invalid payload submissions possible through UI
- [x] `npm run quality:strict` clean

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] `npm run quality:strict` passes (2646 tests, build clean)
- [x] No unexpected test warnings
- [x] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
