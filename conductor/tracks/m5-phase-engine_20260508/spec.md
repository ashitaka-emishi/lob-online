# Specification: M5 Phase Engine — Turn Reducer and Valid Actions

**Track ID:** m5-phase-engine_20260508
**Type:** Feature
**Created:** 2026-05-08
**Status:** Draft
**GitHub Issue:** #355

## Summary

Implement the pure server-side M5 phase/action engine: `dispatch(state, action)` and
`getValidActions(state, playerSide)`. The reducer is deterministic — input game state + action +
actor side produce a new validated game state or a typed `ActionError`. No HTTP, Socket.io,
file persistence, SQLite, or Vue code touches this layer.

## Context

M4 delivered `GameStateSchema`, `initGameState()`, persistence stores, and the lobby API.
M5 schema prerequisites (#354) added `UnitOrderState` (with `type`, `status`, `deliveryTurnDue`)
and `isDetached` to `UnitStateSchema`. This track applies the remaining eight schema additions
from the M5 design (§1) and implements the full action engine (§2).

The reducer boundary is the contract that later HTTP action routes (#356) and Vue game view
(#357) will call. Getting it right here — pure, validated, tested in isolation — is the critical
step before any wire-up work begins.

## User Story

As a game server, I want a pure reducer that accepts a validated game state + typed action and
returns a new validated game state or an action error, so that turn/phase/step progression is
correct and testable in isolation before any HTTP or socket code exists.

## Acceptance Criteria

- [ ] `server/src/engine/actions/index.js` exports `dispatch(state, action)` and
      `getValidActions(state, playerSide)`.
- [ ] A typed `ActionError` class (or equivalent error shape) with stable `code` and human-readable
      `message` fields is exported from `index.js`.
- [ ] Phase/step transitions for Command, Activity, and Rally phases follow the M5 design §2a
      sequence; steps within each phase are enforced in order.
- [ ] Orders-step action flow at M5 steel-thread depth: `ROLL_INITIATIVE` and `ISSUE_ORDER`
      actions transition `ordersPhase` state without Army CO routing.
- [ ] Activity-step activation stubs: `ACTIVATE_STACK`, `END_ACTIVATION`, and `END_PHASE` work
      to record activated units and end the activation step.
- [ ] Rally phase is an auto-drain pass-through: `drainAutoSteps` advances directly to
      next-turn Command when entering Rally.
- [ ] `drainAutoSteps(state)` advances through automatic steps to the next interactive step.
- [ ] Actions not in `getValidActions` for the current state and playerSide are rejected with
      `ActionError{ code: 'INVALID_ACTION' }`.
- [ ] Every returned state is validated with `GameStateSchema` before returning; invalid output
      throws rather than returning corrupt state.
- [ ] The reducer is pure: no HTTP, Socket.io, file persistence, SQLite, or Vue imports.

## Schema Additions Required

The following eight fields from M5 design §1 are not yet in `gameState.schema.js` and must be
applied as part of this track (the #354 schema prereqs track only applied UnitOrderState +
isDetached):

1. `UnitOrderState.status` — add `'stopped'` variant
2. `phase` enum — rename to `['command', 'activity', 'rally']`
3. `activePlayer` field — `z.enum(['union', 'confederate']).nullable()`
4. `step` field — `z.string().nullable()` (within-phase step key)
5. `completedSteps` field — `z.array(z.string())`
6. `leaderState` record — per-leader transient runtime flags
7. `pendingResolution` field — interrupt requiring dice roll or decision
8. `activityPhase` envelope — activatedUnits tracking for LOB §3.0d
9. `ordersPhase` envelope — leaderRollUsed tracking for LOB §10.6

Schema changes are a Checkpointed surface. Pause for human approval after Phase 1.

## Dependencies

- #354 (complete) — `UnitOrderState`, `isDetached` in `UnitStateSchema`
- `server/src/schemas/gameState.schema.js` — will be modified
- `server/src/engine/init.js` — `initGameState()` must set new fields to initial values

## Out of Scope

- HTTP action route (`POST /api/v1/games/:id/actions`) — that is #356
- Socket.io game room / presence events — that is #356
- Vue game view (`GameView.vue`, `useGameStore`) — that is #357
- Opening Volleys / combat resolution — M6
- Morale rolls — M6
- Army CO order pipeline (McClellan) — M7
- Reinforcement arrival UI — M6

## Technical Notes

- Design reference: `docs/designs/m5-turn-structure-orders-game-map-ui.md` §1–§2
- Rule citations required per coding standards: LOB §2.1, §3.0d, §10.3–10.6, §10.6b, §10.7
- `initGameState()` must be updated to set `activePlayer`, `step`, `completedSteps`, `leaderState`,
  `pendingResolution`, `activityPhase`, `ordersPhase` to their initial/null values so the state
  produced by setup is schema-valid after the new fields are added.
- The phase enum rename from the old 6-phase set (`initiative`, `orders`, etc.) to the new 3-phase
  set (`command`, `activity`, `rally`) is a breaking schema change — all existing test fixtures
  using the old enum must be updated.
- `getValidActions` granularity for Orders step: `ROLL_INITIATIVE` first, then `ISSUE_ORDER` if
  the roll succeeds (per M5 design resolved decisions).

---

_Generated by Conductor. Review and edit as needed._
