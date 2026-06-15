# Spec: M6 Combat Wiring — Soft-lock Fix, Dispatch DI, OOB Deduplication

## Overview

Three M6 team-review findings that together make the combat pipeline functional in production:
(1) pending resolution types that create a soft-lock with no valid actions, (2) LOS and range
validation that is dead code in the live dispatch pipeline, and (3) duplicated OOB lookup helpers
that need consolidation before the wiring fix can cleanly land.

## Issues Closed

| Issue | Score | Title                                                                          |
| ----- | ----- | ------------------------------------------------------------------------------ |
| #573  | 2     | findOobUnit duplicated 3x + findOobLeader — extract all to engine/oob.js       |
| #572  | 4     | LOS and exact hex-distance validation dead in production (dispatch wiring gap) |
| #571  | 4     | closingRoll and moraleCheck pending types create soft-lock (no valid actions)  |

**Total debt score removed:** 10

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Architecture review before wiring changes; approval before merge.
Touches dispatch pipeline, game-state valid-actions derivation, and shared engine/oob.js.

## Risk Classification

**Risk:** High
**Reason:** #571 and #572 touch the live action dispatch path and valid-actions derivation
that gates all player interaction with the game.

## Issue Details

### #573 — OOB Helper Deduplication (prerequisite)

**Locations:**

- `server/src/engine/combat/fire.js`
- `server/src/engine/combat/melee.js`
- `server/src/engine/combat/resolveMorale.js`

Each file re-implements `findOobUnit()` and/or `findOobLeader()` inline. Extract canonical
versions into `server/src/engine/oob.js` (alongside the existing `buildUnitSideMap()`), export
them, and import into the three handler files. This is a prerequisite for #572 because the DI
seam fix needs a clean shared module.

### #572 — LOS and Range Validation Dead in Production

**Location:** `server/src/engine/combat/fire.js` — the handler declares a `{ oob, scenario, mapData, hexIndex }`
context parameter in its signature but the live `dispatch()` call in
`server/src/routes/games.js` (or equivalent) passes no third argument, so the DI context is always
`undefined`. The handler falls through to synchronous `loadOob()` disk reads and Manhattan-distance
approximation for range, bypassing real LOS and hex-distance checks entirely.

**Fix:** Wire the context object in `dispatch()`. Load `oob`, `scenario`, `mapData`, and build
`hexIndex` once at the start of the action handler (reusing the same pattern already used for
`initGameState`). Pass as third argument to each handler call. Add a test asserting the real
validators fire on a `FIRE_COMBAT` dispatch.

### #571 — closingRoll and moraleCheck Pending Types Soft-lock

**Location:** `server/src/engine/phase.js` — `getValidActions()` derivation.
**Bug:** After a `FIRE_COMBAT` action sets a `combatResult` pending, or after `CLOSE_COMBAT`
sets a `closingRoll` pending, the `getValidActions()` function has no branch to surface
`RESOLVE_MORALE` or the closing-roll resolution action. The player sees an empty action list
and cannot proceed.

**Fix:** Add pending-type detection to `getValidActions()`. When `state.pendingResolution` is
present and typed `combatResult`, return `[{ type: 'RESOLVE_MORALE', ... }]`. When typed
`closingRoll`, return the closing-roll resolution action. When typed `moraleCheck`, return the
morale adjudication action. Mirror the pattern already used for `leaderCasualty`.

## Acceptance Criteria

- [ ] `findOobUnit` and `findOobLeader` exist only in `engine/oob.js`; three handler files import from there
- [ ] `dispatch()` passes a populated context object to all combat handlers
- [ ] LOS validation actually runs on `FIRE_COMBAT` in the live dispatch path
- [ ] `getValidActions()` returns `RESOLVE_MORALE` when `pendingResolution.type === 'combatResult'`
- [ ] `getValidActions()` returns the closing-roll action when `pendingResolution.type === 'closingRoll'`
- [ ] `getValidActions()` returns the morale adjudication action when `pendingResolution.type === 'moraleCheck'`
- [ ] A test confirms no soft-lock: after `FIRE_COMBAT`, `getValidActions()` returns a non-empty list
- [ ] `npm run quality:strict` passes
