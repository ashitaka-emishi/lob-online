# Specification: M3 — Rules Engine Foundation + Testing Tools

**Track ID:** m3-rules-foundation_20260410
**Type:** Feature
**Created:** 2026-04-10
**Status:** Draft

## Summary

Implement the complete LOB v2.0 rules engine foundation as pure-JS modules: map-based rules
(movement cost/path, LOS) and all game tables (combat, morale, command, leader loss). Deliver
two standalone dev tools — `/tools/map-test` and `/tools/table-test` — for interactive rule
validation before the game loop exists.

## Context

M2 is complete: all five data JSON files are digitized and validated (map.json, scenario.json,
oob.json, leaders.json, succession.json). The `scenario.json` contains the full SM movement
cost chart, lighting schedule, and all rule flags. The map editor has an ad-hoc LOS prototype
that will be superseded by the formal `engine/los.js`.

The engine modules built in this milestone are pure functions with no I/O or game-state
dependencies. M5–M7 import and call them; no rework is needed when the game loop is built.

## User Story

As a developer/rules verifier, I want to interactively test movement paths, movement range,
LOS, and all LOB table lookups against the digitized South Mountain map and rule tables, so
that I can confirm the engine is correct before it is wired into the game action pipeline.

## Acceptance Criteria

- [ ] All engine modules (`hex`, `scenario`, `movement`, `los`, `tables/*`) pass `npm run test:coverage` at ≥ 70% threshold; every table cell verified with known inputs/outputs
- [ ] Movement costs match the SM movement chart for all unit type + formation + terrain combinations
- [ ] Movement range overlay correctly marks vertical-slope hexes as unreachable for all unit types
- [ ] LOS results match manual verification on ≥10 known hex pairs from the SM map; blocking reason is intelligible
- [ ] Map Test Tool (`/tools/map-test`) shows Movement Path, Movement Range, Hex Inspector, and LOS panels all functioning
- [ ] Table Test Tool (`/tools/table-test`) correctly resolves all 11 table panels; results match rulebook examples
- [ ] LOS panel removed from map editor (`LosTestPanel.vue` deleted); no regressions in map editor tests
- [ ] `npm run lint` and `npm run format:check` pass

## Dependencies

- M2 complete — `map.json`, `scenario.json`, `oob.json`, `leaders.json` all available
- Honeycomb.js already installed (used in map editor)
- `MAP_EDITOR_ENABLED=true` env guard pattern already established

## Out of Scope

- Wiring any table or engine module into the game action dispatch loop (M5–M7)
- Auth, game state machine, or persistence (M4+)
- Frontend game UI beyond the two test tool pages (M5+)
- ZOC enforcement in movement (costs only in M3; ZOC as a movement gate is M5)
- Stacking limit enforcement (M5)

## Technical Notes

### Engine module contracts

```js
// engine/hex.js
neighbors(hexId)                    → hexId[]
distance(hexId, hexId)              → number
path(hexId, hexId, costFn)          → hexId[]   // Dijkstra

// engine/movement.js
moveCost(hexId, hexId, unitType, formation, mapData, scenarioRules)  → number | null  // null = impassable
movePath(startHex, endHex, unitType, formation, mapData, scenarioRules) → { path, costs, totalCost, impassable }
moveRange(hex, unitType, formation, mapData, scenarioRules)           → { hex, cost }[]

// engine/los.js
los(fromHex, toHex, mapData, scenarioRules) → { canSee, blockedBy:{hex,reason}|null, trace }

// engine/tables/combat.js
resolveCombat({ sps, columnShifts, roll })  → { result, finalColumn, moraleCheck, depletion }
resolveOpeningVolley({ range, isCharge, isShiftOnly, roll }) → { spLoss }

// engine/tables/morale.js
resolveMorale({ rating, modifiers, roll })  → { newState, retreatHexes, spLoss, leaderLossCheck }
resolveStateTransition(currentState, newResult) → resolvedState

// engine/tables/charge.js
resolveClosingRoll({ morale, modifiers, roll }) → { pass, threshold }

// engine/tables/command.js
resolveCommandRoll({ commandValue, isReserveOrDeployment, roll }) → { yes }
resolveOrderDelivery({ awarenessType, distanceCategory })         → { turnsToDeliver }
resolveFlukeStoppage({ commandValue, hasReserve, isNight, roll }) → { basePass, stoppage, secondRoll }
resolveAttackRecovery({ divisionStatus, commandValue, roll })     → { result }
resolveZeroRule({ roll })                                         → { ma }

// engine/tables/leader-loss.js
resolveLeaderLoss({ situation, sharpshooterCapable, roll }) → { result }

// engine/tables/weapons.js  (reference data only — no resolver function)
SMALL_ARMS_TYPES, ARTILLERY_TYPES, FORMATION_EFFECTS, ACTIVITY_EFFECTS
```

### SM rule overrides active in M3

- Trees +1 LOS height (not +3 standard)
- SM movement chart from `scenario.movementCosts` (not standard LoB chart)
- Vertical slopes impassable to all unit types
- 50 ft contour interval for slope calculations

### Map Test Tool routing

Read-only GET endpoints under `/api/tools/map-test/*`. Load `map.json` and `scenario.json`
once at server start (or on each request — small files). No game state involved.

### Table Test Tool routing

POST endpoints under `/api/tools/table-test/*`. Pure computation — no file I/O, no map data.
Request body contains all parameters; response contains result + modifier breakdown.

---

_Generated by Conductor. Review and edit as needed._
