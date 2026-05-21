# Implementation Plan: M5 Game Map UI — Unit Layer, Stats Panel, Game Store

**Track ID:** m5-game-map-ui_20260521
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-21
**Status:** [~] In Progress

## Overview

Four phases delivered sequentially:

1. **Game Store** — Pinia store that loads game state from the server and tracks selection
2. **Unit Counter Layer** — SVG overlay that positions counter images at hex centers
3. **Unit Stats Panel** — sidebar component displaying the selected unit's stats
4. **GameView Integration** — wire all three into `GameView.vue`; smoke-test end to end

All phases follow TDD: tests first, then implementation.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Approval required before Phase 4 (integration) begins, since
this phase edits `HexMapOverlay.vue` (shared component) and `GameView.vue` (route entry
point). Also pause before opening the PR.

## Risk Classification

**Risk:** Medium
**Reason:** Touches a shared SVG component (`HexMapOverlay.vue`) and introduces the first
Pinia store that drives game state rather than dev-tool state.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

---

## Phase 1: Pinia Game Store

Create `useGameStore.js` — loads game state from the server, tracks the selected unit ID.

### Tasks

- [x] Task 1.1: Write `client/src/stores/useGameStore.test.js` — cover:
  - `loadGame(id)` calls `GET /api/v1/games/:id` and populates `gameState`
  - `gameState` is `null` before load
  - `selectedUnitId` is `null` by default
  - `selectUnit(unitId)` sets `selectedUnitId`
  - `deselectUnit()` clears `selectedUnitId`
  - `loading` and `error` refs behave correctly on success and fetch failure
- [x] Task 1.2: Implement `client/src/stores/useGameStore.js` (Pinia setup store):
  - `gameState` ref — full `GameStateSchema` payload or null
  - `selectedUnitId` ref — string or null
  - `loading` ref, `error` ref
  - `loadGame(id)` — fetch, Zod-parse response (optional), store in `gameState`
  - `selectUnit(unitId)` / `deselectUnit()`
  - Expose `selectedUnit` computed — the `UnitState` object matching `selectedUnitId`

### Verification

- [ ] `npm run test` green with new store tests passing

---

## Phase 2: Unit Counter Layer

Build `UnitCounterLayer.vue` — an SVG `<g>` that renders one `<image>` per unit at
its hex-center coordinate. Wire it into `HexMapOverlay.vue`.

### Tasks

- [x] Task 2.1: Write `client/src/components/UnitCounterLayer.test.js` — cover:
  - Renders one `<image>` per unit in the `units` prop
  - Each `<image>` has correct `x`, `y` attributes derived from hex center coordinates
  - Units at the same hex stack correctly (offset or overlap — document the rule)
  - Renders nothing when `units` is empty
- [x] Task 2.2: Implement `client/src/components/UnitCounterLayer.vue`:
  - Props: `units` (array of `{ unitId, hexId, counterId, side, … }`), `gridData`
    (computed hex geometry from `HexMapOverlay`)
  - For each unit, look up the hex center from `gridData`; render an SVG `<image>`
    pointing to the counter sprite from `countersManifest.js`
  - Size: ~80% of hex inradius; centered on hex center; `pointer-events: all` so
    clicks propagate to the parent overlay
  - Emit `unit-click(unitId)` when a counter image is clicked
- [x] Task 2.3: Extend `HexMapOverlay.vue` to accept a `units` prop and render
      `UnitCounterLayer` inside its SVG above the terrain layers:
  - New prop: `units` (Array, default `[]`)
  - Render `<UnitCounterLayer :units="units" :grid-data="gridData" … />` in the SVG
  - Forward `unit-click` event upward

### Verification

- [ ] `npm run test` green; counter images render at expected coordinates in jsdom tests

---

## Phase 3: Unit Stats Panel

Build `UnitStatsPanel.vue` — a sidebar card that shows the selected unit's key stats.

### Tasks

- [x] Task 3.1: Write `client/src/components/UnitStatsPanel.test.js` — cover:
  - Renders "No unit selected" (or equivalent) when `unit` prop is null
  - Renders unit `name`, `side`, `sp` (strength points), `moraleState`, `orderType`
    when a unit object is passed
  - Updates correctly when the `unit` prop changes
- [x] Task 3.2: Implement `client/src/components/UnitStatsPanel.vue`:
  - Prop: `unit` (Object or null)
  - Display fields: name, side (label: "Union" / "Confederate"), SP, morale state
    (formatted as a readable label), order type
  - Minimal styling consistent with existing tool panels (use CSS vars from
    `MapTestView` or `BaseToolPanel` as reference)

### Verification

- [ ] `npm run test` green with new panel tests passing

---

## Phase 4: GameView Integration

**⚠ Checkpoint — pause for human approval before starting this phase.**

Wire `useGameStore`, `HexMapOverlay`, and `UnitStatsPanel` together in `GameView.vue`.
Smoke-test in the running app.

### Tasks

- [x] Task 4.1: Replace `GameView.vue` stub with full layout:
  - On `onMounted`, call `gameStore.loadGame(route.params.id)` to fetch game state
  - Also fetch map data (`GET /api/tools/map-test/map` or the appropriate endpoint)
    so `HexMapOverlay` receives `hexes` and `calibration`
  - Layout: flex row — map area (fills remaining width) | sidebar (fixed ~280px)
  - Sidebar: `UnitStatsPanel :unit="gameStore.selectedUnit"`
  - Map: `HexMapOverlay … :units="gameStore.gameState?.units ?? []"`
- [x] Task 4.2: Wire click events:
  - On `unit-click(unitId)` from overlay → `gameStore.selectUnit(unitId)`
  - On `hex-click` on empty hex → `gameStore.deselectUnit()`
- [x] Task 4.3: Write `client/src/views/GameView.test.js` covering mount → load → render
      cycle (mock `fetch`; assert `HexMapOverlay` and `UnitStatsPanel` are present)
- [~] Task 4.4: Smoke-test in running dev server:
  - `npm run dev` (or `/dev-start`)
  - Create or join a game via `/lobby`; navigate to `/games/:id`
  - Confirm units appear on the map at their start positions
  - Click a unit → stats panel populates; click empty hex → panel clears

### Verification

- [ ] All acceptance criteria in spec.md checked off
- [ ] `npm run quality:strict` passes (validate-data + lint + format:check + test + build)
- [ ] No unexpected Vue warnings in browser console during smoke test

---

## Final Verification

- [ ] All acceptance criteria met (see spec.md)
- [ ] Tests passing at ≥ 70% line coverage
- [ ] No new tech debt deferred without a filed issue + debt register entry
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
