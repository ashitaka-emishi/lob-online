# Implementation Plan: M3 Debt Sprint — Score-3 Cleanup

**Track ID:** m3-debt-sprint_20260412
**Spec:** [spec.md](./spec.md)
**Created:** 2026-04-12
**Status:** [ ] Not Started

## Overview

Three phases ordered by risk (lowest first). Phase 1 resolves the OOB/server
carry-forwards from M2. Phase 2 fixes engine correctness issues (path traversal
guard, hexsideCost, and data-driven LOS heights). Phase 3 decouples the Map Test
Tool's orchestration layer. All nine score-3 debt items targeted; net debt score
reduced from 66 → 39.

---

## Phase 1: OOB / Server Carry-Forwards

Resolve #237 (processUSACavDiv delegation), #245 (editorRouteFactory extraction),
and #247 (useOobPersistence succession path tests). These are isolated from the
engine and carry the lowest blast radius.

### Tasks

- [x] Task 1.1: #237 — processUSACavDiv delegates to withLeader; Farnsworth variants render
  - In `server/src/data/processOob.js`, refactor `processUSACavDiv` to call the
    shared `withLeader` helper instead of inlining leader-attachment logic
  - Verify that `farnsworth-a` and `farnsworth-b` succession variant leaders render
    correctly in the OOB tree
  - Update/add unit tests in the accompanying `.test.js` file

- [x] Task 1.2: #245 — editorRouteFactory extracted; succession/leaders/oob routes unified
  - Extract a shared `editorRouteFactory(dataFile, schema, label)` helper in
    `server/src/routes/editorRouteFactory.js`
  - Refactor `successionEditor.js`, `leadersEditor.js`, and `oobEditor.js` (or
    equivalent) to use the factory
  - Add unit tests for the factory

- [x] Task 1.3: #247 — useOobPersistence.test.js covers all succession paths
  - Extend `client/src/composables/useOobPersistence.test.js` to cover every
    branch of the succession-path logic (primary leader present, primary absent,
    no succession chain, multi-step chain)
  - Ensure coverage meets the 70% threshold with the new cases

### Verification

- [ ] `npm run test` — all tests green; no regressions
- [ ] `npm run lint && npm run format:check` — clean

---

## Phase 2: Engine Correctness

Resolve #284 (path traversal guard), #288 (hexsideCost populated), and #289 (LOS
terrain heights data-driven). These are engine-correctness fixes with broader impact
on game logic.

### Tasks

- [x] Task 2.1: #284 — loadMap/loadScenario have directory containment guard
  - In `server/src/data/loadMap.js` and `loadScenario.js` (or equivalent loader),
    add a `path.resolve` containment check: verify the resolved path starts with the
    expected data directory before reading
  - Error response must not leak the resolved path — return a generic 400/403
  - Add unit tests covering: valid path, path traversal attempt (`../../etc/passwd`),
    encoded traversal (`%2e%2e`)

- [x] Task 2.2: #288 — movementPath per-step hexsideCost populated correctly (not always 0)
  - In `engine/movement.js`, fix the per-step cost calculation so that hexside
    crossing costs (streams, roads, etc.) are included in the `hexsideCost` field
    of each path step
  - Update unit tests in `engine/movement.test.js` with at least one road-crossing
    and one stream-crossing path to assert non-zero hexsideCost

- [x] Task 2.3: #289 — LOS terrain heights data-driven from scenario.json, not hardcoded
  - Add a `terrainHeights` map to `scenario.json` schema (consult domain-expert for
    which terrains carry height bonuses per LOB v2.0 §LOS section)
  - In `engine/los.js`, replace any hardcoded height constants with a lookup from
    the loaded scenario's `terrainHeights` field
  - Update `engine/los.test.js` with at least one test that varies the terrain height
    via the scenario fixture and asserts the LOS result changes accordingly

### Verification

- [ ] `npm run test` — all tests green; no regressions
- [ ] `npm run lint && npm run format:check` — clean

---

## Phase 3: Map Test Tool Architecture

Resolve #300 (orchestration tests), #302 (hex-ID route validation), and #303
(dedicated data endpoint). These are architectural improvements to the Map Test
Tool that reduce coupling before M4.

### Tasks

- [ ] Task 3.1: #300 — MapTestView orchestration tests cover togglePanel, overlay routing, click dispatch
  - In `client/src/views/tools/MapTestView.test.js`, add tests for:
    - `togglePanel(name)` switches the active panel
    - Clicking a hex dispatches the correct overlay handler for each panel mode
    - Overlay routing (Movement Path, Movement Range, Hex Inspector, LOS, Command Range)
      activates the right panel prop

- [ ] Task 3.2: #302 — map-test routes validate hex-ID format; malformed IDs return 400
  - In `server/src/routes/mapTest.js`, add a `validateHexId(id)` helper that
    checks the hex-ID format (e.g. `\d{4}` or the project's canonical format)
  - Apply the validator to every route that accepts a hex ID; return 400 with a
    descriptive message on failure
  - Add unit tests: valid ID passes, empty ID fails, non-numeric ID fails, too-short
    ID fails

- [ ] Task 3.3: #303 — MapTestView fetches from a dedicated /api/tools/map-test/data endpoint
  - Add `GET /api/tools/map-test/data` in `server/src/routes/mapTest.js` that returns
    the map + scenario payload (mirroring the map-editor data endpoint pattern)
  - Refactor `MapTestView.vue` to fetch from this endpoint instead of any ad-hoc
    path it currently uses
  - Add a server-side unit test for the new endpoint
  - Add a client-side test asserting MapTestView fetches from the correct URL

### Verification

- [ ] `npm run test` — all tests green; no regressions
- [ ] `npm run lint && npm run format:check` — clean

---

## Final Verification

- [ ] All 9 acceptance criteria in spec.md met (#237 #245 #247 #284 #288 #289 #300 #302 #303)
- [ ] `npm run test` — full suite green
- [ ] `npm run lint && npm run format:check` — clean
- [ ] No new debt introduced (tech-debt-report score delta = 0 net)
- [ ] Ready for `/pr-create`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
