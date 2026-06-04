# Implementation Plan: M5 UI Completion — ActionPanel, Store Wiring, GameView Socket Integration

**Track ID:** m5-ui-completion_20260604
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-04
**Status:** [x] Complete

## Overview

Three phases in strict dependency order: (1) extend `useGameStore` with `submitAction`,
`pendingAction`, and `refreshGame`; (2) build the `ActionPanel` Vue component; (3) wire
socket setup and `ActionPanel` into `GameView`. Each phase is independently testable.
All implementation follows TDD — tests written first or alongside the code they cover.
Design reference: `docs/designs/m5-game-ui-detail.md` §2–§6.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals — no auth/persistence surface is
touched. Socket wiring in GameView is additive only; existing store and route code is
not modified.

## Risk Classification

**Risk:** Medium
**Reason:** New client components and store additions touching the shared `useGameStore`
and `GameView`; no server changes, no auth boundary changes.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 — this completes planned M5 scope.

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met (#472, #473, #474)
- [x] HLD M5 status block updated
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated if any debt was accepted (none incurred)
- [x] Ready for `/team-review`

---

## Phase 1: useGameStore additions (#472)

Extend `useGameStore.js` with `submitAction`, `pendingAction`, and `refreshGame`.
All new state and functions must be covered by tests before or alongside implementation.

### Tasks

- [x] Task 1.1: Verify `socket.io-client` is available to the client build — check
      `client/package.json`; install if missing.
- [x] Task 1.2: Write Vitest tests for `submitAction` — success path (body sent, `gameState`
      updated, `pendingAction` cleared), 422 path (`error` set, `pendingAction` cleared),
      500 path (same), 409 version-conflict path (`error` set).
- [x] Task 1.3: Write Vitest test for `refreshGame` — asserts `loadGame` is called with
      the correct `gameId`.
- [x] Task 1.4: Implement `pendingAction` ref (initial `null`) and `submitAction(gameId,
type, payload = null)` in `useGameStore.js` per design §2 pseudocode.
- [x] Task 1.5: Implement `refreshGame(gameId)` — delegates to `loadGame(gameId)`.
- [x] Task 1.6: Export `pendingAction`, `submitAction`, and `refreshGame` from the store's
      return object.

### Verification

- [x] `useGameStore` test suite fully green; all new paths covered.
- [x] `npm run test` passes with no regressions in existing store tests.

---

## Phase 2: ActionPanel component (#473)

Create `client/src/components/game/ActionPanel.vue` and its test file. This component
is purely presentational — no store access, all data via props.

### Tasks

- [x] Task 2.1: Create directory `client/src/components/game/` if it does not exist.
- [x] Task 2.2: Write Vitest tests for `ActionPanel.vue`: - Renders "Turn N — [Phase] ([Step])" summary line - Renders one button per `validActions` entry with title-cased label - Buttons disabled when `pending` is true - Shows "Waiting for [other side]…" when `activePlayer !== localPlayerSide` - Emits `submit-action` with `{ type, payload }` on button click - Empty button list when `validActions` is empty and it is the local player's turn
- [x] Task 2.3: Implement `ActionPanel.vue` with props: `phase`, `step`, `turn`,
      `activePlayer`, `validActions`, `pending`, `localPlayerSide`; emits `submit-action`.
- [x] Task 2.4: Style `ActionPanel` using the existing dark sidebar palette — text-only
      buttons, no icons, title-case labels, spinner overlay on active button when pending.

### Verification

- [x] `ActionPanel` test suite fully green.
- [x] `npm run test` passes; `npm run lint` clean.

---

## Phase 3: GameView socket wiring + ActionPanel integration (#474)

Wire `GameView.vue` to connect Socket.io on mount, derive `validActions` client-side,
render `ActionPanel`, and route `submit-action` events to the store.

### Tasks

- [x] Task 3.1: Write Vitest integration tests for `GameView.vue` additions: - Socket `game:join` emitted on mount - Socket `game:leave` emitted and socket disconnected on unmount - `gameStore.refreshGame` called when `game:state-updated` fires - Error banner shown when `gameStore.error` is non-null - `ActionPanel` rendered in sidebar with correct props
- [x] Task 3.2: Determine how `localPlayerSide` is available in `GameView` — check
      if `gameState` embeds it or if a session API call is needed; implement accordingly.
- [x] Task 3.3: Implement `validActionsForState(phase, step)` helper (pure function,
      co-located in `GameView` or a `client/src/utils/game-actions.js` module) per
      design §3 derivation logic.
- [x] Task 3.4: Add socket setup to `GameView.vue` `onMounted` / `onUnmounted` per
      design §2 pseudocode.
- [x] Task 3.5: Add `game:state-updated` listener calling `gameStore.refreshGame(gameId)`.
- [x] Task 3.6: Render `ActionPanel` in the `GameView` sidebar beneath `UnitStatsPanel`;
      pass `validActions`, `pending`, `phase`, `step`, `turn`, `activePlayer`,
      `localPlayerSide`.
- [x] Task 3.7: Handle `submit-action` event from `ActionPanel` — call
      `gameStore.submitAction(gameId, type, payload)`.

### Verification

- [x] `GameView` integration test suite fully green.
- [x] Manual smoke (optional but recommended): start dev server, open a game, confirm
      ActionPanel renders with current phase and the "End Phase" button is clickable.
- [x] `npm run test` passes; no lint/format warnings.

---

## Phase 4: HLD update + final closeout

Update the HLD to accurately reflect M5 status, then run the full quality gate.

### Tasks

- [x] Task 4.1: Update `docs/designs/high-level-design.md` M5 status block — remove
      "complete" claim; describe what is now actually delivered (ActionPanel, socket
      wiring, store submission pipeline).
- [x] Task 4.2: Run `npm run quality:strict` and fix any failures.
- [x] Task 4.3: Confirm issues #472, #473, #474 are ready to close.

### Verification

- [x] `npm run quality:strict` passes (validate-data, lint, format:check, test, build).
- [x] No unexpected warnings in test output.
- [x] All acceptance criteria in spec.md met.

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] `npm run quality:strict` passes
- [x] Issues #472, #473, #474 ready to close
- [x] HLD M5 status block accurate
- [x] No new deferred debt introduced
- [x] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
