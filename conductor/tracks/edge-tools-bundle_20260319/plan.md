# Implementation Plan: Edge Tool Panels Bundle — Road, Stream/Stone Wall, Contour Line, Ford & Bridge

**Track ID:** edge-tools-bundle_20260319
**Spec:** [spec.md](./spec.md)
**Created:** 2026-03-19
**Status:** [x] Complete

## Overview

Five phases, each delivering one independently verifiable capability. Phase 1 creates the
elevation formula module and completes the deferred gradient overlay on ElevationToolPanel.
Phases 2–4 implement the three new edge tool panels (with ford/bridge sub-controls inline).
Phase 5 wires everything into MapEditorView and verifies end-to-end.

TDD: tests are written alongside each component and formula module in the same task.

---

## Phase 1: elevation.js + ElevationToolPanel Gradient Overlay

Create the elevation formula module (deferred from PR #150) and complete the ElevationToolPanel
overlayConfig so the gradient tint fill works.

### Tasks

- [x] Task 1.1: Create formulas/elevation.js with elevationTintPalette(elevationLevels),
      tintForLevel(level, palette), and autoDetectContourType(levelA, levelB); add
      formulas/elevation.test.js covering palette length, level 0 color, max level color,
      and all autoDetectContourType thresholds (0→null, 1→elevation, 2→extremeSlope, 3+→verticalSlope)
- [x] Task 1.2: Update ElevationToolPanel.vue to own its overlayConfig — hexLabel (alwaysOn:
      true, elevation integer label) + hexFill (alwaysOn: false, toggleLabel: 'Elevation tint',
      fillFn using tintForLevel from elevation.js); remove overlayConfig prop pass-through from
      MapEditorView for this panel; update ElevationToolPanel.test.js

### Verification

- [ ] elevationTintPalette(22) returns 22 distinct CSS colors; level 0 is blue-ish,
      level 21 is brown; tintForLevel works at boundaries
- [ ] ElevationToolPanel renders elevation numbers on hexes and shows gradient fill
      when 'Elevation tint' checkbox is toggled on; CI green

---

## Phase 2: RoadToolPanel + Bridge Sub-Control

### Tasks

- [x] Task 2.1: Create RoadToolPanel.vue using BaseToolPanel + useEdgePaintTool
      ({ allowedTypes: ['trail','road','pike'] }); ToolChooser with trail/road/pike items
      from ROAD_GROUPS in feature-types.js; overlayConfig with grid (faint) + edgeLine
      (style: 'through-hex', featureGroups: ROAD_GROUPS); add RoadToolPanel.test.js
- [x] Task 2.2: Add bridge sub-control inside RoadToolPanel.vue using useClickHexside with
      validateFn (requires road/trail/pike on edge via getEdgeFeatures), onPlace/onRemove
      calling addEdgeFeature/removeEdgeFeature; extend test coverage for validation logic

### Verification

- [ ] RoadToolPanel paints trail/road/pike edges; overlay shows through-hex lines with
      correct colors/widths/dash from ROAD_GROUPS; right-click clears selected type;
      bridge placement blocked on edge without road; CI green

---

## Phase 3: StreamWallToolPanel + Ford Sub-Control

### Tasks

- [x] Task 3.1: Create StreamWallToolPanel.vue using BaseToolPanel + useEdgePaintTool
      ({ allowedTypes: ['stream','stoneWall'] }); ToolChooser with stream/stoneWall items
      from STREAM_WALL_GROUPS; overlayConfig with grid (faint) + edgeLine (style: 'along-edge',
      featureGroups: STREAM_WALL_GROUPS); add StreamWallToolPanel.test.js
- [x] Task 3.2: Add ford sub-control inside StreamWallToolPanel.vue using useClickHexside with
      validateFn (requires stream on edge), onPlace/onRemove; extend test coverage

### Verification

- [ ] StreamWallToolPanel paints stream/stoneWall edges; overlay shows along-edge lines;
      ford placement blocked on edge without stream; CI green

---

## Phase 4: ContourToolPanel

### Tasks

- [x] Task 4.1: Create ContourToolPanel.vue using BaseToolPanel + useEdgePaintTool
      ({ allowedTypes: ['elevation','slope','extremeSlope','verticalSlope'] }); ToolChooser
      with four contour type items from CONTOUR_GROUPS; overlayConfig with grid (faint) +
      edgeLine (style: 'along-edge', featureGroups: CONTOUR_GROUPS) + hexLabel (alwaysOn:
      false, toggleLabel: 'Elevation info', elevation integer) + hexFill (alwaysOn: false,
      same toggleLabel, gradient fill via elevation.js); add ContourToolPanel.test.js
- [x] Task 4.2: Add auto-detect button to ContourToolPanel.vue — on click show ConfirmDialog,
      on confirm iterate all adjacent hex pairs calling autoDetectContourType(levelA, levelB)
      from elevation.js, clear existing contour edges then write detected types via
      addEdgeFeature; extend test coverage for auto-detect invocation

### Verification

- [ ] ContourToolPanel paints all four contour types; along-edge overlay correct per
      CONTOUR_GROUPS; 'Elevation info' toggle shows gradient tint + level labels together;
      auto-detect populates edges from elevation data after confirmation; CI green

---

## Phase 5: MapEditorView Wiring + Integration

Wire all new panels into MapEditorView and verify the full accordion/interaction-gate flow.

### Tasks

- [x] Task 5.1: Register RoadToolPanel, StreamWallToolPanel, ContourToolPanel in
      MapEditorView.vue accordion (openPanel values: 'road', 'stream', 'contour'); extend
      interaction gate to include new panel names; remove any stale overlayConfig pass-through
      for elevation/terrain panels if still present; update MapEditorView tests
- [x] Task 5.2: Manual smoke-test against the live map editor: open each panel, paint a few
      edges, verify overlays render correctly, verify save/push-to-server round-trip preserves
      edge data; fix any integration issues found

### Verification

- [ ] All five tool panels accessible in accordion; only one active at a time; hover tooltip
      works when no panel open; edge data survives push-to-server and page reload;
      all CI gates green (lint, format:check, test with 70% coverage)

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] No regressions in existing ElevationToolPanel or TerrainToolPanel behavior
- [ ] formulas/elevation.js, RoadToolPanel, StreamWallToolPanel, ContourToolPanel all have
      Vitest test files co-located
- [ ] CI gates pass: npm run lint, npm run format:check, npm run test
- [ ] Ready for /team-review

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
