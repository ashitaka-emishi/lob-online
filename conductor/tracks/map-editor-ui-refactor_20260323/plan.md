# Implementation Plan: Map Editor UI Refactor — Tool Panel Cleanup & Feature Improvements

**Track ID:** map-editor-ui-refactor_20260323
**Spec:** [spec.md](./spec.md)
**Created:** 2026-03-23
**Status:** [ ] Not Started

## Overview

Six targeted changes across the map editor tool panels, rendered in dependency order: data model first (building overlay), then UI removals (simple), then road/stream/bridge/ford rendering overhaul.

Issues: #180 #181 #182 #183 #184 #185

## Phase 1: Remove Mode Toggles & Bulk Ops (Simple Deletions)

Remove all click/paint mode toggle buttons and the elevation bulk op buttons. These are pure subtractions with no data model impact.

### Tasks

- [ ] Task 1.1: Remove Click/Paint toggle buttons and paint drag logic from `ElevationToolPanel.vue` (#180, #181)
  - Remove mode toggle button group
  - Remove "Raise all +1" and "Lower all −1" buttons and their handlers
  - Remove any paint-mode drag wiring in the elevation tool
- [ ] Task 1.2: Remove Click/Paint toggle buttons and paint drag logic from `TerrainToolPanel.vue` (#180)
  - Remove mode toggle button group
  - Remove paint drag wiring
- [ ] Task 1.3: Remove auto-detect button from `ContourToolPanel.vue` (#185)
  - Remove "Auto-detect from elevation" button and confirmation dialog
  - Remove `autoDetectContours` handler in `MapEditorView.vue`
  - Remove `autoDetectContourType` from `elevation.js` if unused elsewhere
- [ ] Task 1.4: Update/remove tests for deleted functionality

### Verification

- [ ] No mode toggle buttons visible in Elevation, Terrain tools
- [ ] No bulk elevation buttons
- [ ] No auto-detect button in Contour tool
- [ ] `npm run test` passes

## Phase 2: Building Overlay Data Model (#182)

Add `building` as a separate boolean field on hex data, decoupled from terrain type.

### Tasks

- [ ] Task 2.1: Update `map.schema.js` — add `building: z.boolean().optional()` to `HexEntry`; keep `building` in `TerrainType` enum for now (backward compat) or migrate
- [ ] Task 2.2: Update `TerrainToolPanel.vue` — add a Buildings toggle button separate from the terrain type selector; right-click handler sets terrain to `clear` AND sets `building: false`
- [ ] Task 2.3: Update `MapEditorView.vue` — handle building placement/removal events from terrain panel; update hex-right-click for terrain tool to clear both terrain and building
- [ ] Task 2.4: Update `HexMapOverlay.vue` — render building icon only when `hex.building === true` (regardless of terrain type); remove terrain icons for all other types
- [ ] Task 2.5: Update `feature-types.js` or terrain config — make `woodedSloping` fill color noticeably darker brown (e.g. `rgba(90, 55, 10, 0.8)`)
- [ ] Task 2.6: Write/update tests for new schema shape and building+terrain co-location

### Verification

- [ ] A hex can have `terrain: 'woods'` and `building: true` simultaneously
- [ ] Building icon appears only for hexes with `building: true`
- [ ] Right-click on terrain tool clears terrain + building
- [ ] woodedSloping is visually darker than woods
- [ ] `npm run test` passes

## Phase 3: Road Tool Refactor (#183)

New rendering rules, bridge as edge type, right-click hex clear, bridge glyph.

### Tasks

- [ ] Task 3.1: Update `RoadToolPanel.vue` — remove Paint and Bridge mode buttons; add Bridge as an edge type option in the type chooser (alongside trail, road, pike); bridge type requires a road/trail/pike on the same edge (validation remains)
- [ ] Task 3.2: Update `MapEditorView.vue` — update hex-right-click for road tool to clear all road features (trail, road, pike, bridge) from all edges of the clicked hex
- [ ] Task 3.3: Update road SVG rendering in `HexMapOverlay.vue`:
  - Count road edges per hex; skip rendering if count < 2
  - Render road lines wider (increase strokeWidth) with a background outline `<line>` in black/white behind the road line
- [ ] Task 3.4: Render bridge `][` glyph — SVG text or perpendicular tick marks in black at edge midpoints that have a bridge feature
- [ ] Task 3.5: Update/write tests for new rendering logic and road tool behavior

### Verification

- [ ] Hex with 1 road edge: no road lines drawn
- [ ] Hex with 2+ road edges: center-to-midpoint lines drawn for all road edges
- [ ] Roads are visibly wider with outline
- [ ] Bridge `][` symbol appears in black at bridged edges
- [ ] Right-click on any hex in road tool clears all road+bridge features on that hex
- [ ] `npm run test` passes

## Phase 4: Stream Tool Refactor (#184)

Ford as edge type, right-click hex clear, ford glyph.

### Tasks

- [ ] Task 4.1: Update `StreamWallToolPanel.vue` — remove Paint and Ford mode buttons; add Ford as an edge type option in the type chooser (alongside stream, stoneWall); ford type requires stream on same edge
- [ ] Task 4.2: Update `MapEditorView.vue` — update hex-right-click for stream tool to clear all stream, stoneWall, and ford features from all edges of the clicked hex
- [ ] Task 4.3: Render ford `][` glyph — SVG text or perpendicular tick marks in dark blue (`#00008b`) at edge midpoints that have a ford feature
- [ ] Task 4.4: Update/write tests for ford tool behavior and rendering

### Verification

- [ ] Ford appears as an edge type in stream tool
- [ ] Clicking non-stream edge with ford selected does nothing / shows error
- [ ] Right-click clears all stream, wall, ford on that hex
- [ ] Ford `][` glyph appears in dark blue at ford edges
- [ ] `npm run test` passes

## Final Verification

- [ ] All 6 acceptance criteria from spec met (#180–#185)
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run test` passes with ≥70% coverage
- [ ] Map editor visually correct in browser (manual check)
- [ ] Ready for `/pr-create`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
