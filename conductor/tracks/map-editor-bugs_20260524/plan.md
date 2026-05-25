# Implementation Plan: Map Editor Bug Fixes — #416, #418, #419

**Track ID:** map-editor-bugs_20260524
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-24
**Status:** [x] Complete

## Overview

Three isolated bug fixes in the map editor, implemented in dependency order: visual
polish first (#416), then terrain model cleanup (#419), then the playable-boundary
edge guard (#418) which builds on the cleaned-up edge model.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals

## Risk Classification

**Risk:** Medium
**Reason:** Touches map editor interaction logic and pre-save data mutation, but no auth,
game state schema, or shared rules-engine paths.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

---

## Phase 1: Contour Visibility (#416)

Update stroke widths and colors for elevation/slope edge lines in the single
source-of-truth config file. No logic changes; legend swatches in tool panels
pick up the new values automatically.

### Tasks

- [x] Task 1.1: Update `CONTOUR_GROUPS` in `client/src/config/feature-types.js`:
  - `elevation`: color `#595959`, strokeWidth `3`
  - `slope`: color `#666666`, strokeWidth `5`
  - `extremeSlope`: color `#000000`, strokeWidth `7`
  - `verticalSlope`: unchanged

### Verification

- [ ] `npm run lint && npm run format:check` pass
- [ ] Visual check: contour lines are clearly visible in map editor overlay

---

## Phase 2: Eliminate Unknown Terrain (#419)

Remove `unknown` as a valid terrain type from every layer: stub generator,
overlay fallback, UI options, color table, and test assertions.

### Tasks

- [x] Task 2.1: `client/src/utils/hexGeometry.js` — `resolveHexOrStub` stub changes
      `terrain: 'unknown'` → `terrain: 'clear'`
- [x] Task 2.2: `client/src/components/HexMapOverlay.vue` — terrain fallback changes
      `'unknown'` → `'clear'` (line ~226)
- [x] Task 2.3: `client/src/components/TerrainToolPanel.vue` — remove `unknown` key
      from both the icon map (line ~25) and label map (line ~39)
- [x] Task 2.4: `client/src/config/feature-types.js` — remove `unknown` entry from
      `TERRAIN_COLORS`
- [x] Task 2.5: `client/src/composables/useMapPersistence.js` — update
      `migrateUnknownTerrain` comment: note that `resolveHexOrStub` no longer produces
      `'unknown'`; function is now a migration-only safety net for legacy persisted data
- [x] Task 2.6: `client/src/composables/useEdgeToggle.test.js` — update stub-terrain
      assertion (line ~87) from `'unknown'` → `'clear'`

### Verification

- [ ] `npm run test` passes (no failing assertions on terrain value)
- [ ] No `unknown` terrain values in any test fixture or expectation

---

## Phase 3: Playable Boundary Edge Guard (#418)

Add a pure `stripNonPlayableBoundaryEdges` helper to `edge-model.js`, wire a guard
into `MapEditorView`'s edge-click dispatch, and wrap the save button to run the strip
before pushing to the server.

### Tasks

- [x] Task 3.1: `client/src/formulas/edge-model.js` — add exported function
      `stripNonPlayableBoundaryEdges(hexes, gridSpec)`:
  - Build a `Map<hexId, hex>` from `hexes`
  - For each hex, iterate canonical face indices 0, 1, 2 (dirs N, NE, SE)
  - If `hex.playable === false` OR `adjacentHex?.playable === false`, delete
    `hex.edges[faceIndex]`
  - Clean up empty `hex.edges` objects
  - Mutates `hexes` in place; returns nothing
- [x] Task 3.2: `client/src/formulas/edge-model.test.js` — add tests for
      `stripNonPlayableBoundaryEdges`:
  - Strips a face when the owning hex is non-playable
  - Strips a face when the adjacent hex is non-playable
  - Leaves faces between two playable hexes untouched
  - Cleans up empty edges object
- [x] Task 3.3: `client/src/views/tools/MapEditorView.vue` — add
      `isNonPlayableBoundary(hexId, dir)` local helper that looks up both the clicked
      hex and its neighbor in `hexIndex`/`mapData` and returns `true` if either has
      `playable === false`
- [x] Task 3.4: `client/src/views/tools/MapEditorView.vue` — add early-return guard
      at the top of `onEdgeClick`: `if (isNonPlayableBoundary(hexId, dir)) return`
      (covers both EDGE_DISPATCH and `legacyOnEdgeClick` paths)
- [x] Task 3.5: `client/src/views/tools/MapEditorView.vue` — add `handleSave()`
      wrapper that calls `stripNonPlayableBoundaryEdges(mapData.value.hexes, calibration.value)`
      then `save()`; update save button `@click` from `save` to `handleSave`
- [x] Task 3.6: `client/src/views/tools/MapEditorView.test.js` — add test that
      `onEdgeClick` is a no-op when the clicked hex is non-playable

### Verification

- [ ] `npm run test` passes with new edge-model and view tests
- [ ] `npm run quality:strict` passes

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` green
- [ ] No unexpected warnings in test output
- [ ] Issues #416, #418, #419 ready to close after PR merge

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
