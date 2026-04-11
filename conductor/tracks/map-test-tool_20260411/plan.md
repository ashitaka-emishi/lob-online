# Implementation Plan: Map Test Tool

**Track ID:** map-test-tool_20260411
**Spec:** [spec.md](./spec.md)
**Created:** 2026-04-11
**Status:** [ ] Not Started

## Overview

Five phases. Phase 1 builds the new engine module (`command-range.js`) after a
`domain-expert` consultation. Phase 2 adds all five server GET routes. Phase 3 wires
the client shell (view + router). Phase 4 implements each panel component. Phase 5
removes the legacy LOS tab from the map editor.

All server route modules follow the existing pattern in `server/src/routes/` — plain
Express Router, no state, data loaded from `engine/map.js` and `engine/scenario.js`.
All client components follow the existing pattern in `client/src/views/tools/`.

---

## Phase 1: Command Range Engine Module

Consult `domain-expert` to verify command radius values before writing any code.

### Tasks

- [x] Task 1.1: Consult `domain-expert` — verify command radius values per commander
      level (brigade / division / corps / army CO), whether radius is plain hex distance,
      and any SM-specific overrides
- [x] Task 1.2: Write Vitest tests for `engine/command-range.js` (TDD)
  - `commandRange(fromHex, commanderLevel, map)` returns correct
    `{ withinRadius, beyondRadius, beyondRadiusFar }` hex sets
  - Boundary hexes handled correctly (missing neighbors omitted)
  - All commander levels return distinct zone boundaries
- [x] Task 1.3: Create `server/src/engine/command-range.js`
  - `COMMAND_RADII` constant — radius per commander level (from domain-expert consultation)
  - `commandRange(fromHex, commanderLevel, map)` — classify all map hexes into three zones
    using `hexDistance` from `hex.js`:
    - `withinRadius` — hex distance ≤ radius
    - `beyondRadius` — hex distance > radius AND ≤ 50
    - `beyondRadiusFar` — hex distance > 50
  - Rule citation on every constant and function
  - Export: `COMMAND_RADII`, `commandRange`

### Verification

- [x] `npm run test` — command-range tests green (1687 tests, all passing)
- [x] `npm run lint && npm run format:check` — clean

---

## Phase 2: Server Routes

Add `server/src/routes/mapTest.js` with all five GET endpoints and mount it in
`server.js` inside the existing `MAP_EDITOR_ENABLED` guard.

### Tasks

- [x] Task 2.1: Create `server/src/routes/mapTest.js`
  - Load `map.json` and `scenario.json` at module init (same pattern as other route files)
  - `GET /movement-path` — query params: `startHex`, `endHex`, `unitType`, `formation`;
    calls `movementPath()`; returns `{ path, costs, totalCost, impassable }`
  - `GET /movement-range` — query params: `hex`, `unitType`, `formation`;
    calls `movementRange()`; returns `{ reachable:[{hex,cost}] }`
  - `GET /hex-info` — query param: `hex`;
    returns `{ terrain, elevation, wedgeElevations, hexsides }` direct from map data
  - `GET /los` — query params: `fromHex`, `toHex`;
    calls `computeLOS()`; returns `{ canSee, blockedBy, trace }`
  - `GET /command-range` — query params: `hex`, `commanderLevel`;
    calls `commandRange()`; returns `{ withinRadius, beyondRadius, beyondRadiusFar }`
  - 400 on missing required params; no silent failures
- [x] Task 2.2: Write Vitest tests for `mapTest.js`
  - Each endpoint returns correct shape with valid inputs
  - Each endpoint returns 400 on missing required params
  - `movement-path` impassable path returns `{ impassable: true }`
- [x] Task 2.3: Mount router in `server/src/server.js`
  - Inside the existing `MAP_EDITOR_ENABLED` block:
    `app.use('/api/tools/map-test', mapTestRouter)`
  - Add console log: `[server] map test tool enabled at /tools/map-test`

### Verification

- [x] `npm run test` — 1705 tests passing (18 new route tests)
- [ ] Manual: `curl` each endpoint against the running dev server returns expected shape

---

## Phase 3: Client Shell

Register the new route and create the orchestrator view. No panels yet — just the
shell with the hex map in read-only mode and a panel placeholder.

### Tasks

- [x] Task 3.1: Add route in `client/src/router/index.js`
  - `{ path: '/tools/map-test', component: () => import('../views/tools/MapTestView.vue') }`
- [x] Task 3.2: Add router test in `client/src/router/index.test.js`
  - `has a route for /tools/map-test`
- [x] Task 3.3: Create `client/src/views/tools/MapTestView.vue`
  - `<script setup>` — load map + scenario data from existing API endpoints (read-only)
  - Render `HexMapOverlay` in read-only mode (no editing handlers)
  - Panel selector (tabs or sidebar): Movement Path | Movement Range | Hex Inspector | LOS | Command Range
  - Active panel component slot (renders selected panel)
  - Hex click events routed to active panel via `provide`/`inject` or prop callback
- [x] Task 3.4: Create `client/src/views/tools/MapTestView.test.js`
  - Renders without error
  - Panel selector shows all five panel names

### Verification

- [x] `npm run test` — 1710 tests passing (9 new: 5 router, 4 view)
- [ ] Manual: navigate to `/tools/map-test` — map renders, panel selector visible

---

## Phase 4: Panel Components

One component per panel. Each is a self-contained Vue SFC that accepts hex-click
events from the orchestrator, calls its server endpoint, and displays the result.

### Tasks

- [x] Task 4.1: Create `client/src/components/tools/map-test/MovementPathPanel.vue`
  - Inputs: unit type selector, formation selector
  - Click mode: first click = start hex, second click = end hex
  - On two hexes selected: POST to `/api/tools/map-test/movement-path`
  - Display: path overlay on map + cost breakdown table (hex | terrain | hexside | total)
  - Clear button resets selection

- [x] Task 4.2: Create `client/src/components/tools/map-test/MovementRangePanel.vue`
  - Inputs: unit type selector, formation selector
  - Click mode: single hex = origin
  - On hex selected: GET `/api/tools/map-test/movement-range`
  - Display: shade reachable hexes by MP bucket (color legend); unreachable hexes dimmed

- [x] Task 4.3: Create `client/src/components/tools/map-test/HexInspectorPanel.vue`
  - Click mode: single hex
  - On hex selected: GET `/api/tools/map-test/hex-info`
  - Display: structured data card — terrain type, elevation, wedge elevations array, hexside
    types by direction

- [x] Task 4.4: Create `client/src/components/tools/map-test/LosPanel.vue`
  - Click mode: first click = observer hex, second click = target hex
  - On two hexes selected: GET `/api/tools/map-test/los`
  - Display: can-see badge (green/red); if blocked, highlight blocking hex + plain-language
    reason; trace hexes highlighted on map

- [x] Task 4.5: Create `client/src/components/tools/map-test/CommandRangePanel.vue`
  - Inputs: commander level selector (brigade / division / corps / army)
  - Click mode: single hex = commander position
  - On hex + level selected: GET `/api/tools/map-test/command-range`
  - Display: shade hexes by zone (within radius / beyond radius / beyond + far); color legend

- [x] Task 4.6: Write Vitest tests for each panel component (one test file per panel)
  - Renders without error with no selection
  - Displays loading state while API call in flight
  - Displays result correctly given mocked API response
  - Clear/reset works

### Verification

- [x] `npm run test` — all panel tests green (1753 tests passing)
- [ ] Manual: exercise each panel end-to-end on the running dev server

---

## Phase 5: Map Editor LOS Cleanup

Remove the prototype LOS tab from the map editor now that the formal panel lives in
the Map Test Tool.

### Tasks

- [x] Task 5.1: Identify and remove `LosTestPanel.vue` (or equivalent) from the map editor
      — delete the file and remove its import/registration from `MapEditorView.vue`
- [x] Task 5.2: Remove any server routes in `mapEditor.js` that existed solely to back
      the prototype LOS panel (if any) — none found
- [x] Task 5.3: Update `MapEditorView.test.js` — remove any tests covering the LOS tab
- [x] Task 5.4: Verify the map editor still loads cleanly with no LOS tab present

### Verification

- [x] `npm run test` — all tests green (1712 passing, no orphaned LOS references)
- [ ] Manual: map editor loads at `/tools/map-editor`; no LOS tab visible

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run test` — full suite green
- [ ] `npm run lint && npm run format:check` — clean
- [ ] Manual end-to-end: all five panels exercise correctly on the running dev server
- [ ] Map editor has no LOS tab
- [ ] Ready for `/pr-create`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
