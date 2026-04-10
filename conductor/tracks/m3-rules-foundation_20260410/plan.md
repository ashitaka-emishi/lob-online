# Implementation Plan: M3 — Rules Engine Foundation + Testing Tools

**Track ID:** m3-rules-foundation_20260410
**Spec:** [spec.md](./spec.md)
**Created:** 2026-04-10
**Status:** [ ] Not Started

## Overview

Five phases: (1) hex + scenario foundation, (2) map-based rules (movement, LOS),
(3) all game tables, (4) Map Test Tool, (5) Table Test Tool. Each phase is independently
verifiable. All engine modules are TDD — tests written before or alongside implementation.
No game loop, no auth, no persistence.

## Phase 1: Hex + Scenario Foundation

Establish the two utility modules that every other engine module depends on.

### Tasks

- [ ] Task 1.1: Implement `server/src/engine/hex.js` — neighbor lookup (6 directions with
      SM hex orientation), cube/offset coordinate conversion, distance calculation,
      generic path finder (Dijkstra with pluggable cost function). Wrap Honeycomb.js
      primitives; do not leak Honeycomb types to callers.
- [ ] Task 1.2: Write `server/src/engine/hex.test.js` — neighbor correctness for edge/corner
      hexes, distance for known SM hex pairs, path finds shortest route through clear terrain.
- [ ] Task 1.3: Implement `server/src/engine/scenario.js` — load and parse `scenario.json`;
      expose `getMovementCosts()`, `getLightingAt(turn)`, `getRuleFlags()`,
      `getReinforcementsAt(turn)`. No side effects; returns plain objects.
- [ ] Task 1.4: Write `server/src/engine/scenario.test.js` — lighting schedule lookups,
      movement cost extraction for known terrain/unit combos, rule flag access.

### Verification

- [ ] `npm run test` passes; `hex.js` and `scenario.js` covered at ≥ 70%

## Phase 2: Map-Based Rules — Movement + LOS

### Tasks

- [ ] Task 2.1: Implement `server/src/engine/movement.js`: - `moveCost(fromHex, toHex, unitType, formation, mapData, rules)` — terrain cost +
      hexside costs (slope/stream/elevation) for crossing one hex boundary; `null` if impassable - `movePath(startHex, endHex, unitType, formation, mapData, rules)` — Dijkstra lowest-cost
      path; returns `{ path, costs:[{hex,terrainCost,hexsideCost,total}], totalCost, impassable }` - `moveRange(hex, unitType, formation, mapData, rules)` — all reachable hexes within
      unit's full MA; returns `[{hex, cost}]` sorted by cost - Apply all SM overrides: SM movement chart, vertical slopes impassable, road slope penalty
- [ ] Task 2.2: Write `server/src/engine/movement.test.js` — cost for each terrain type ×
      each formation (verified against SM movement chart); impassable cases (vertical slope,
      prohibited terrain); road movement eligibility; path around obstacles; range boundary.
- [ ] Task 2.3: Implement `server/src/engine/los.js` — full LOB §4 LOS algorithm: - Range ≤ 4 (or any small arms shot): blocked by anything on LOS not on same hill - Range ≥ 5: use Slope Table (diff in levels × range to lower end point); obstacle
      slope vs overall slope comparison - Height modifiers: crest +1 end point; woods +1 obstacle (SM override, not +3); orchard +1;
      town +2; crests +1 - Returns `{ canSee, blockedBy:{hex,reason}|null, trace:[hexId] }`
- [ ] Task 2.4: Write `server/src/engine/los.test.js` — clear LOS pairs, blocked-by-elevation
      pairs, blocked-by-woods pairs, SM tree height override verified, range boundary (4 vs 5
      rule switch), known SM map hex pairs (manual verified).
- [ ] Task 2.5: Remove `LosTestPanel.vue` from the map editor and delete its associated
      composable (`useLosTest.js` if standalone). Update map editor tests to confirm no regression.

### Verification

- [ ] `npm run test` passes; movement + LOS modules at ≥ 70% coverage
- [ ] Movement costs verified against SM movement chart for all 6 unit types × all terrain rows
- [ ] LOS verified on ≥ 10 manually-checked SM hex pairs

## Phase 3: Game Tables

Implement all LOB v2.0 lookup tables as pure functions in `server/src/engine/tables/`.

### Tasks

- [ ] Task 3.1: `engine/tables/combat.js` — Combat Table §5.6 (dice × column A–D → result);
      `resolveCombat({sps, columnShifts, roll})` applies all shifts, clamps to table bounds,
      returns result cell, morale-check flag, and depletion flag. Column shift inputs: range
      (small arms/arty), weapon type (Buck'n Ball, Breechloader, Repeater, Canister),
      Threshold Value check, target modifiers (Rear, DG, protective terrain, open order).
      `resolveOpeningVolley({range, isCharge, isShiftOnly, roll})` from §5.4.
- [ ] Task 3.2: `engine/tables/morale.js` — Morale Table §6.1 (dice × rating A–F → result);
      `resolveMorale({rating, modifiers, roll})` applies all modifiers (shaken, wrecked, rear,
      night, small, cowardly legs, arty/cav, leader morale value, terrain defensive mods);
      returns `{newState, retreatHexes, spLoss, leaderLossCheck}`.
      `resolveStateTransition(currentState, newResult)` — Additive Morale Effects Chart §6.2a.
- [ ] Task 3.3: `engine/tables/charge.js` — `resolveClosingRoll({morale, modifiers, roll})`
      from Closing Roll Table §3.5 (morale rating → threshold; pass if roll ≥ threshold).
      Modifiers: blood lust +1, rear +1, shaken -1, arty w/ canister -1, adj to breastworks -3.
- [ ] Task 3.4: `engine/tables/command.js`: - `resolveCommandRoll({commandValue, isReserveOrDeployment, roll})` — §10.6 (9- = No, 10+ = Yes) - `resolveOrderDelivery({awarenessType, distanceCategory})` — §10.6a turn delay lookup - `resolveFlukeStoppage({commandValue, hasReserve, isNight, roll})` — §10.7b two-roll check - `resolveAttackRecovery({divisionStatus, commandValue, roll})` — §10.8c pass/fail + recovery roll - `resolveZeroRule({roll})` — §9.1e (1=No MA, 2-3=Half MA, 4-6=Full MA)
- [ ] Task 3.5: `engine/tables/leader-loss.js` — `resolveLeaderLoss({situation, sharpshooterCapable, roll})`
      — §9.1a four-column table (Other Cases / Capture / Defender / Attacker);
      returns `"noEffect" | "captured" | "wounded" | "killed"`.
- [ ] Task 3.6: `engine/tables/weapons.js` — reference data objects (no resolver):
      `SMALL_ARMS_TYPES` (type, maxRange, ammoType), `ARTILLERY_TYPES` (type, maxRange, canisterType),
      `FORMATION_EFFECTS` (unit × formation → facing/combat/movement/chargeAttacker),
      `ACTIVITY_EFFECTS` (action → move/fire permissions), `COMMAND_RADIUS` (level → hexRange).
- [ ] Task 3.7: Write test files for all table modules — one test file per module; every
      table cell or boundary condition covered with known (input → output) pairs sourced
      directly from `lob-tables.pdf`. Minimum: all 10×10 Combat Table cells, all 13×6
      Morale Table cells, all Leader Loss outcomes, all Command Roll boundaries.

### Verification

- [ ] `npm run test` passes; all table modules at ≥ 70% coverage
- [ ] Combat Table test asserts correct result for every cell (120 cells)
- [ ] Morale Table test asserts correct result for representative rows across all 6 ratings

## Phase 4: Map Test Tool (`/tools/map-test`)

Standalone dev tool page with read-only hex map and four testing panels.

### Tasks

- [ ] Task 4.1: Add server route `server/src/routes/mapTest.js` — three GET endpoints
      calling `engine/movement.js` and `engine/los.js`; loads `map.json` + `scenario.json`
      once; mounted under `MAP_EDITOR_ENABLED` guard in `server.js`.
- [ ] Task 4.2: Add Vue route `/tools/map-test` in `client/src/router/index.js`.
- [ ] Task 4.3: Create `client/src/views/MapTestView.vue` — orchestrator; reads map + scenario
      data on mount (read-only); owns selected hexes and active panel; renders `HexMapOverlay`
      in read-only mode with result overlays.
- [ ] Task 4.4: Create `MovementTestPanel.vue` — start/end hex click selection + unit
      type/formation dropdowns; calls `/api/tools/map-test/movement-path`; highlights path
      on map; renders per-hex cost table (terrain, hexside, running total).
- [ ] Task 4.5: Create `MovementRangePanel.vue` — hex click + unit type/formation; calls
      `/api/tools/map-test/movement-range`; shades reachable hexes by MP bucket
      (≤4 = green, 5–6 = yellow, at MA = orange, impassable = grey/red).
- [ ] Task 4.6: Create `HexInspectorPanel.vue` — click any hex; displays terrain type, base
      elevation, hexside types per direction (0–5), and computed movement cost for every unit
      type in a table. No API call — reads from locally-held mapData.
- [ ] Task 4.7: Create `LosTestPanel.vue` (new, in map-test) — from/to hex click; calls
      `/api/tools/map-test/los`; shows can-see/blocked badge; renders blocking reason in
      plain language; highlights LOS trace on map.
- [ ] Task 4.8: Write server-side route tests for all three `/api/tools/map-test/*` endpoints;
      mock map/scenario data; assert correct shape of responses.

### Verification

- [ ] `/tools/map-test` loads in dev environment; all four panels functional
- [ ] Movement path highlights correctly on map for at least 3 manually-verified routes
- [ ] Movement range shading visually matches expected reachable area for a known hex + unit type
- [ ] LOS blocking reason matches manual calculation for blocked pair

## Phase 5: Table Test Tool (`/tools/table-test`)

Standalone dev tool page — no map, 11 input panels.

### Tasks

- [ ] Task 5.1: Add server route `server/src/routes/tableTest.js` — eleven POST endpoints
      calling the table engine modules; no file I/O; mounted under `MAP_EDITOR_ENABLED` guard.
- [ ] Task 5.2: Add Vue route `/tools/table-test` in `client/src/router/index.js`.
- [ ] Task 5.3: Create `client/src/views/TableTestView.vue` — tabbed/accordion view; owns
      active panel; each panel self-contained with its own form state.
- [ ] Task 5.4: Create `CombatTablePanel.vue` — SP input, column shift checkboxes (range/weapon/
      terrain/target), 2d6 roll entry + "Roll for me" button; calls `/combat`; shows result
      cell, final column, modifier breakdown, morale/depletion flags.
- [ ] Task 5.5: Create `OpeningVolleyPanel.vue` — range, charge/shift-only flags, 1d6 roll;
      shows SP loss.
- [ ] Task 5.6: Create `MoraleTablePanel.vue` — rating dropdown (A–F), modifier checkboxes
      (shaken, wrecked, rear, night, small, cowardly legs, arty/cav, leader value, terrain),
      2d6 roll; shows new state, retreat hexes, SP loss, leader loss check flag.
- [ ] Task 5.7: Create `MoraleTransitionPanel.vue` — current state dropdown, new result
      dropdown; shows resolved state from Additive Morale chart (§6.2a). No dice roll needed.
- [ ] Task 5.8: Create `ClosingRollPanel.vue` — morale rating, modifier checkboxes, 1d6 roll;
      shows pass/fail and threshold.
- [ ] Task 5.9: Create `LeaderLossPanel.vue` — situation dropdown (other/capture/defender/
      attacker), sharpshooter flag, 2d6 roll; shows result.
- [ ] Task 5.10: Create `CommandRollPanel.vue` — command value, reserve/deployment flag,
      2d6 roll; shows yes/no and modified roll.
- [ ] Task 5.11: Create `OrderDeliveryPanel.vue` — CO awareness dropdown (On Fire/Normal/
      Not so Sure/Comatose), distance category (within/beyond/50+ hexes); shows turns to deliver.
      No dice roll — deterministic lookup.
- [ ] Task 5.12: Create `FlukeStoppagePanel.vue` — command value, has-reserve flag, night
      flag, 2d6 roll (base check); shows base-check pass/fail; if fail, second roll + final
      stoppage result.
- [ ] Task 5.13: Create `AttackRecoveryPanel.vue` — division status (no wrecked/wrecked/has
      dead), command value, 2d6 roll; shows recovery result and both rolls.
- [ ] Task 5.14: Create `ZeroRulePanel.vue` — 1d6 roll (or random); shows No MA / Half MA /
      Full MA.
- [ ] Task 5.15: Write server-side route tests for all eleven `/api/tools/table-test/*`
      endpoints; assert correct result shape for boundary values.

### Verification

- [ ] `/tools/table-test` loads; all 11 panels produce correct results for manually-verified inputs
- [ ] Combat panel: roll 12 on column D → correct result; roll 2 on column A → "–"
- [ ] Morale panel: rating B, roll 11 → DG b4 L1 (verified against §6.1 table)
- [ ] Leader Loss: Defender situation, roll 10 → Wounded

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run lint` passes (0 errors)
- [ ] `npm run format:check` passes
- [ ] `npm run test:coverage` passes — ≥ 70% threshold, no regressions in existing tests
- [ ] Map editor loads and functions correctly with LosTestPanel removed
- [ ] Both new tool routes accessible at `/tools/map-test` and `/tools/table-test` with `MAP_EDITOR_ENABLED=true`
- [ ] Ready for review

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
