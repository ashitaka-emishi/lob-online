# Implementation Plan: M3 Engine Modules

**Track ID:** m3-engine_20260410
**Spec:** [spec.md](./spec.md)
**Created:** 2026-04-10
**Status:** [x] Complete

## Overview

Four phases, each independently verifiable. Phases 1–2 build the map-based foundation
(hex geometry → scenario loading → movement → LOS). Phase 3 builds all six table modules.
Every module is written TDD — tests come first or alongside implementation.

Consult the `domain-expert` agent before coding each table module to verify cell values
against the SM rulebook and any known errata before writing tests.

---

## Phase 1: Hex + Scenario Foundation

Establish the two lowest-level modules that all others depend on.

### Tasks

- [x] Task 1.1: Create `server/src/engine/hex.js`
  - Parse/encode `col.row` hex IDs (e.g., `"19.23"` ↔ `{col:19, row:23}`)
  - Cube coordinate conversion for flat-top hexagons (col.row → cube, cube → col.row)
  - Neighbor lookup (6 directions) with map boundary validation
  - Hex distance (cube distance formula)
  - A\*/Dijkstra skeleton (cost function injected by caller — used by `movement.js`)
- [x] Task 1.2: Write Vitest tests for `hex.js`
  - Neighbor lookup verified against known SM hex pairs
  - Distance verified for several known pairs
  - Boundary hexes return correct neighbor set (missing neighbors omitted)
- [x] Task 1.3: Create `server/src/engine/scenario.js`
  - Load `scenario.json` from disk at startup (path configurable for test injection)
  - Expose: `movementCosts`, `rules` flags, `lightingSchedule`, `nightVisibilityCap`,
    `turnStructure`, `reinforcements`, `setup`
  - Single export: `loadScenario(path?)` → frozen scenario object
- [x] Task 1.4: Write Vitest tests for `scenario.js`
  - Returns correct movementCosts and rules flags for South Mountain
  - Throws on missing or malformed file

### Verification

- [x] `npm run test` — all Phase 1 tests green
- [x] `npm run lint && npm run format:check` — clean

---

## Phase 2: Movement Engine

Build on hex.js + scenario.js to implement the full movement cost model and pathfinder.

### Tasks

- [x] Task 2.1: Create `server/src/engine/movement.js`
  - `hexEntryCost(hex, fromDir, unitType, formation, scenario, map)` — returns MP cost to
    enter `hex` from direction `fromDir`; handles terrain cost, hexside costs (road/stream/
    stone wall/contour line/ford/bridge), and elevation delta cost; returns `Infinity` for
    prohibited combinations (null cost, vertical slope per §1.1)
  - `movementPath(startHex, endHex, unitType, formation, scenario, map)` — Dijkstra using
    `hex.js` neighbor graph + `hexEntryCost`; returns `{ path, costs, totalCost, impassable }`
  - `movementRange(hex, unitType, formation, scenario, map)` — BFS/Dijkstra over all
    reachable hexes within the unit's movement allowance; returns `[{ hex, cost }]`
  - Road movement: if hex has road/pike/trail edge and unit is in column/mounted/limbered,
    apply 0.5 MA cost (round up per leg); `"ot"` terrain sentinel handled correctly
- [x] Task 2.2: Write Vitest tests for `movement.js`
  - `hexEntryCost` verified for every terrain type + unit type combination in the SM chart
  - Prohibited combos return `Infinity`
  - Vertical slope (computed from `wedgeElevations`) returns `Infinity`
  - `movementPath` verified for several known SM hex pairs with expected per-hex costs
  - `movementRange` verified: reachable set correct for a 6-MP line unit on clear terrain

### Verification

- [x] `npm run test` — all Phase 1 + 2 tests green
- [x] Cross-check at least 3 non-trivial movement paths against manual SM chart calculation

---

## Phase 3: LOS Engine

Implement the LOB v2.0 LOS algorithm with SM-specific overrides.

### Tasks

- [x] Task 3.1: Consult `domain-expert` agent — confirm Slope Table values, SM tree height
      override (+1 not +3), Special Slope Rule (§1.1), and any known errata before coding
- [x] Task 3.2: Create `server/src/engine/los.js`
  - `computeLOS(fromHex, toHex, map, scenario)` — returns
    `{ canSee, blockedBy: { hex, reason } | null, trace: [hexId] }`
  - Hex height = `(elevation + max(wedgeElevations)) * contourInterval + baseElevation`
    (from `elevationSystem` in `map.json`)
  - Slope Table lookup: for each hex along the trace, compare apparent angle from observer
    to target; blocked when intervening terrain is at or above LOS line
  - Terrain height modifiers (SM override): woods +1 ft level, orchard +1, town +2, crest +1
    (NOT the standard +3 for trees)
  - Vertical hexsides: movement-only, do NOT block LOS (domain-expert ruling)
  - Same-hex LOS always true
- [x] Task 3.3: Write Vitest tests for `los.js`
  - Can-see verified for several flat-terrain SM hex pairs
  - Blocked-by-woods and blocked-by-elevation verified against known SM map pairs
  - SM tree height override: +1 level (not +3) produces correct block/pass results
  - Vertical slope edge type confirmed not to block LOS (movement-only)

### Verification

- [x] `npm run test` — all Phase 1–3 tests green (1406 tests, 22 LOS tests)
- [ ] Manually verify 3 LOS pairs on the SM map (flat/blocked/edge cases)

---

## Phase 4: Game Table Modules

Six pure-function modules covering all LOB v2.0 game tables. Each module is authored after
a `domain-expert` consultation to verify table cell values. Tests encode every known cell.

### Tasks

- [x] Task 4.1: Consult `domain-expert` — verify weapons reference data (max ranges, ammo
      types, Formation Effects Chart, Activity Effects Chart) before coding
- [x] Task 4.2: Create `server/src/engine/tables/weapons.js`
  - Weapon type definitions (musket, rifle, smoothbore arty, etc.) with max range and ammo
  - Formation Effects Chart (line/column/mounted effects on fire/movement/ZOC)
  - Activity Effects Chart (attack/defend/move effects on unit capabilities)
- [x] Task 4.3: Write Vitest tests for `weapons.js` — 35 tests, all cells spot-checked

- [x] Task 4.4: Consult `domain-expert` — verify Combat Table §5.6, Opening Volley §5.4,
      and all column shift rules before coding
- [x] Task 4.5: Create `server/src/engine/tables/combat.js`
  - `combatResult(effectiveSPs, netColumnShifts, diceRoll)` → `{ resultType, spLoss, moraleCheckRequired, leaderLossCheckRequired, finalColumn, depletionBand }`
  - `openingVolleyResult(condition, diceRoll)` → `{ spLoss }`
  - All column shifts: range (small arms + arty), ammo type, target state
  - Threshold Value Chart, depletion bands
- [x] Task 4.6: Write Vitest tests for `combat.js` — 66 tests, every table cell verified

- [x] Task 4.7: Consult `domain-expert` — verify Morale Table §6.1 and Additive Morale
      Effects Chart §6.2a before coding
- [x] Task 4.8: Create `server/src/engine/tables/morale.js`
  - `moraleResult(rating, modifiers, diceRoll)` → `{ effectiveRoll, type, retreatHexes, spLoss, leaderLossCheck }`
  - `moraleTransition(currentState, incomingResult)` → `{ newState, suppressRetreatsAndLosses }`
  - All modifiers: shaken/DG, wrecked, rear, small, night, arty/cav from small arms, protective terrain
  - Range 10+ rule: only terrain and leader modifiers apply
- [x] Task 4.9: Write Vitest tests for `morale.js` — 67 tests, every cell and transition verified

- [x] Task 4.10: Consult `domain-expert` — verify Closing Roll Table §3.5 and Additional
      Charge Modifiers §7.0g before coding
- [x] Task 4.11: Create `server/src/engine/tables/charge.js`
  - `closingRollResult(moraleRating, modifiers, diceRoll)` → `{ pass, threshold, modifiedRoll }`
  - Modifiers: leader 2+, rear, shaken, frontal arty w/ canister, adjacent/breastworks −3
  - §7.0g modifiers noted as applying to defender's post-charge Morale Check, not this roll
- [x] Task 4.12: Write Vitest tests for `charge.js` — 27 tests

- [x] Task 4.13: Consult `domain-expert` — verify Command Roll §10.6, Order Delivery §10.6a,
      Fluke Stoppage §10.7b, Attack Recovery §10.8c, Zero Rule §9.1e before coding
- [x] Task 4.14: Create `server/src/engine/tables/command.js`
  - `commandRollResult(commandValue, isReserve, isDeployment, diceRoll)` → `{ yes, modifiedRoll }`
  - `orderDeliveryTurns(armyCOType, distanceCategory, isReserveOrder)` → `{ turnsToDeliver }`
  - `flukeStoppageResult(...)` → `{ step1EffectiveRoll, basePass, step2Required, step2EffectiveRoll, step2Threshold, stoppage }`
  - `attackRecoveryResult(divisionStatus, commandValue, step1Roll, step2Roll)` → `{ recovered, ... }`
  - `zeroRuleResult(diceRoll)` → `{ ma }` (none / half / full)
  - SM Override: all army COs Normal (LOB_GAME_UPDATES SM)
- [x] Task 4.15: Write Vitest tests for `command.js` — 48 tests, all tables verified

- [x] Task 4.16: Consult `domain-expert` — verify Leader Loss Table §9.1a before coding
- [x] Task 4.17: Create `server/src/engine/tables/leader-loss.js`
  - `leaderLossResult(situation, isSharpshooter, diceRoll)` → `{ result }`
  - Situations: `other`, `capture`, `defender`, `attacker`
- [x] Task 4.18: Write Vitest tests for `leader-loss.js` — 21 tests, all cells verified

### Verification

- [x] `npm run test` — all Phase 1–4 tests green (1670 tests total)
- [x] `npm run lint && npm run format:check` — clean
- [x] Each table module has at least one `domain-expert` consultation logged
- [x] Engine coverage: 96.29% statements, 95% branch (well above 70% threshold)

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] `npm run test:coverage` — engine 96.29% stmts / 95% branch (≥ 70% threshold)
- [x] `npm run lint` and `npm run format:check` pass
- [x] Every table module has at least one `domain-expert` consultation logged
- [x] Ready for `/pr-create`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
