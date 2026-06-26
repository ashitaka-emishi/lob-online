# Spec: M9 MOVE Action — Unit Movement Handler + Hex Control Wiring

**Track ID:** m9-move-action_20260625
**Issues:** #634

## Goal

Implement the `MOVE` action handler so units can move on the game map, and wire
`updateHexControl` into the movement path for SM §5.1 terrain VP scoring.

## Background

The movement engine (`engine/movement.js`) already computes valid paths and reachable
hexes. `updateHexControl` exists in `engine/vp.js` and is tested. `GameStateSchema`
already includes `hexControl: {}`. What's missing is the action dispatch handler that
reads player intent (unit + destination), validates the move, applies it to game state,
and calls `updateHexControl`.

## Deliverables

- `server/src/engine/actions/move.js` — `resolveMove(state, payload, context)` handler
- `MOVE` registered in `getValidActions()` during the Activity phase for eligible units
- `updateHexControl(state, hexId, side)` called after each successful move
- Tests: unit move validation, hex control update, ZOC interaction, movement point exhaustion

## Acceptance Criteria

- A unit with remaining MPs can `MOVE` to a reachable hex during the Activity phase
- Moving into a hex updates `state.hexControl[hexId]`
- A unit with 0 MPs remaining is not offered `MOVE` in `getValidActions()`
- `npm run quality:strict` passes
