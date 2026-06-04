# Specification: M5 UI Completion — ActionPanel, Store Wiring, GameView Socket Integration

**Track ID:** m5-ui-completion_20260604
**Type:** Feature
**Created:** 2026-06-04
**Status:** Draft

## Summary

Implement the three follow-up M5 UI tickets (#472, #473, #474) that were scoped in
`docs/designs/m5-game-ui-detail.md` but never delivered. These complete the game
interaction loop: the player can see valid actions, submit them, and receive live
state updates via Socket.io.

## Context

M5 delivered the server-side action pipeline (`POST /api/v1/games/:id/actions`,
Socket.io room events, `dispatch()` reducer) and the basic `GameView` layout
(map, unit counters, `UnitStatsPanel`). The client-side half of the interaction
loop — action submission, pending state, socket notifications, and the ActionPanel
UI — was formally designed in `docs/designs/m5-game-ui-detail.md` §2–§6 and
split into three follow-up tickets. Those tickets remained open and unimplemented
when M5 was prematurely declared complete. This track delivers them.

The HLD incorrectly states M5 is complete; it must be updated as part of this track.

## User Story

As a player in a live game, I want to see the current phase and available actions
and submit them from the sidebar, so that I can take my turn without needing the
browser console.

## Acceptance Criteria

### #472 — useGameStore additions

- [ ] `submitAction(gameId, type, payload)` POSTs to `/api/v1/games/:id/actions`
      with `{ type, payload, expectedVersion: gameState.version }`.
- [ ] `pendingAction` ref is set to `{ type, payload }` during the in-flight request
      and cleared on success or error.
- [ ] `gameState` is updated to the returned saved state on success.
- [ ] `error` is set on 422 / 500 responses without throwing.
- [ ] `refreshGame(gameId)` calls `loadGame(gameId)` (re-uses generation guard).
- [ ] All new store functions covered by Vitest unit tests (success, 422, 500,
      version-conflict 409 paths).

### #473 — ActionPanel component

- [ ] `ActionPanel.vue` created in `client/src/components/game/`.
- [ ] Props: `phase`, `step`, `turn`, `activePlayer`, `validActions`, `pending`,
      `localPlayerSide`.
- [ ] Shows "Turn N — [Phase] ([Step])" summary line.
- [ ] Renders one button per entry in `validActions`; label is action type in
      title-case (e.g. "End Phase").
- [ ] Shows "Waiting for [other side]…" when `activePlayer !== localPlayerSide`.
- [ ] All buttons disabled (+ spinner on active button) when `pending` is true.
- [ ] Emits `submit-action` with `{ type, payload }` on button click.
- [ ] Vitest unit tests: correct rendering, disabled state, waiting state, emit on click,
      empty render when `validActions` is empty and it is the local player's turn.

### #474 — GameView socket wiring

- [ ] Socket.io client initialized in `onMounted`; `game:join` emitted with current
      `gameId`.
- [ ] `game:leave` emitted and socket disconnected in `onUnmounted`.
- [ ] `game:state-updated` listener calls `gameStore.refreshGame(gameId)`.
- [ ] `ActionPanel` rendered in the sidebar, receiving `validActions`, `pending`,
      `phase`, `step`, `turn`, `activePlayer`.
- [ ] `validActions` derived client-side from `gameState.phase` + `gameState.step`
      per the M5 decision in design §3 (no server round-trip).
- [ ] `submit-action` event from `ActionPanel` calls `gameStore.submitAction()`.
- [ ] `localPlayerSide` sourced from session (via a `/api/v1/session` or
      `gameState`-embedded field — confirm at implementation time).
- [ ] Vitest integration tests: socket join on mount, leave on unmount, `refreshGame`
      called on `game:state-updated`, error banner shown when `gameStore.error` non-null.

### HLD update

- [ ] `docs/designs/high-level-design.md` M5 status block updated to reflect the
      actual delivered state (not "complete" until this track merges).

## Dependencies

- `POST /api/v1/games/:id/actions` (delivered, PR #475 / issue #356)
- Socket.io server-side room events `game:join`, `game:leave`, `game:state-updated`
  (delivered, PR #475 / issue #356)
- `useGameStore.js` existing `loadGame` + generation guard (delivered)
- `docs/designs/m5-game-ui-detail.md` — authoritative design reference for all
  implementation decisions in this track

## Out of Scope

- Movement or combat action types (M6).
- A dedicated `GET /api/v1/games/:id/valid-actions` endpoint (M6).
- Lobby improvements, matchmaking, OAuth (M8).
- Cypress / e2e tests (unit + integration sufficient for M5).
- Any changes to server-side code (server is complete for M5).

## Technical Notes

- Socket setup belongs in `GameView.vue`, not the store — per design §2.
- `validActions` is derived client-side for M5 by mapping `gameState.phase` +
  `gameState.step` to a list of action type strings. See design §3 for the derivation
  logic and the deferred endpoint note.
- `socket.io-client` is already in `package.json` (used by the server; verify
  it is available to the client build or install separately).
- `ActionPanel` directory: `client/src/components/game/` — create if it does not exist.

---

_Generated by Conductor. Review and edit as needed._
