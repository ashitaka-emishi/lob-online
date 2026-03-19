# Specification: Extract Composables from MapEditorView + Unify Selection State

**Track ID:** map-composables_20260318
**Type:** Refactor
**Created:** 2026-03-18
**Status:** Draft
**GitHub Issue:** #97

## Summary

Decompose `MapEditorView.vue` (1,431 lines, 8+ concerns) into five focused Vue composables under `client/src/composables/`, and unify the dual selection state (`selectedHexId` ref + `selectedHexIds` Set) into a single canonical Set-based ref with a derived computed.

## Context

The map editor is a dev tool for digitizing the South Mountain scenario hex map. `MapEditorView.vue` has grown into a God Component as each new tool panel (elevation, terrain, linear feature, wedge, LOS, auto-detect seeds) added state and handlers directly to the file. The component currently owns at least eight distinct concerns in one 1,431-line file.

Two parallel selection mechanisms coexist without reconciliation: `selectedHexId` (singular `ref(null)`) used by tool panels, and `selectedHexIds` (`ref(new Set())`) used for multi-select in 'select' mode. Both are written by `onHexClick` and `onKeyDown`. A non-shift click in 'select' mode sets `selectedHexId` without clearing `selectedHexIds`, so both can be simultaneously populated in inconsistent ways.

This refactor creates the composables layer that Phase 2 game logic can reuse, and eliminates the selection state ambiguity before the paint-mode feature (issue #115) is built on top of it.

## Problem Description

**God Component:** All logic lives in a single 1,431-line Vue SFC. Adding any new capability (e.g. paint mode from #115) requires reading the entire file to understand coupling, and increases risk of accidental state corruption.

**Dual selection state:** `selectedHexId` (ref) and `selectedHexIds` (Set ref) are written independently. After a non-shift click in 'select' mode, `selectedHexId` is set but `selectedHexIds` is not cleared, leaving both populated. This is a latent correctness hazard for any feature (like paint mode) that consumes selection state.

## Acceptance Criteria

- [ ] `client/src/composables/useMapPersistence.js` — owns: `mapData`, `fetchError`, `unsaved`, `saveStatus`, `isOffline`, `serverSavedAt`, `showPushConfirm`, `showPullConfirm`, `isPulling`, `pullError`, `draftBannerVisible`, `saveMapDraft`, `restoreDraft`, `dismissDraft`, `fetchServerData`, `executePull`, `pullFromServer`, `fetchMapData`, `executePush`, `save`, `saveErrors`, `getEngineExport`
- [ ] `client/src/composables/useEditorAccordion.js` — owns: `PANEL_DISPLAY_NAMES`, `TOOL_PANEL_MODES`, `openPanel`, `activeToolName`, `togglePanel`, `editorMode`
- [ ] `client/src/composables/useHexInteraction.js` — owns: `selectedHexIds` (canonical Set ref), `selectedHexId` (computed, single-element alias), `selectedEdge`, `hexIndex`, `selectedHex`, `losHexA`, `losHexB`, `losSelectingHex`, `losResult`, `losPathHexes`, `losBlockedHex`, `onHexClick`, `onHexRightClick`, `onHexMouseenter`, `onEdgeClick`, `onLosPickStart`, `onLosPickCancel`, `onLosSetHexA`, `onLosSetHexB`, `onLosResult`
- [ ] `client/src/composables/useBulkOperations.js` — owns: `adjustHexElevation`, `clearAllElevations`, `raiseAll`, `lowerAll`, `clearAllTerrain`, `clearAllWedges`
- [ ] `client/src/composables/useLinearFeatureTrace.js` — owns: `showTraceConfirm`, `pendingTraceEdges`, `liveTraceCount`, `onTraceProgress`, `onTraceComplete`, `applyTrace`, `cancelTrace`
- [ ] **Selection unified:** `selectedHexId` converted from `ref(null)` to `computed(() => selectedHexIds.value.size === 1 ? [...selectedHexIds.value][0] : null)`; `togglePanel` clears `selectedHexIds` on panel switch
- [ ] `MapEditorView.vue` shrinks to a thin orchestrator: imports the five composables, wires their returns into the template — no business logic inline
- [ ] All five composables have co-located Vitest test files (`useMapPersistence.test.js`, etc.)
- [ ] All existing `MapEditorView.test.js` tests pass unchanged (behavior is preserved)
- [ ] `npm run test` passes at ≥ 70% coverage

## Dependencies

- `client/src/views/tools/MapEditorView.vue` — source of extraction
- `client/src/views/tools/MapEditorView.test.js` — must pass unchanged post-refactor
- `client/src/composables/` — new directory (does not exist yet)
- Issue #115 (click and paint modes) is a downstream consumer — this track should be merged first

## Out of Scope

- No behavior changes — this is a pure refactor
- No new UI features (those belong to #115)
- No changes to child components (`CalibrationControls`, `HexMapOverlay`, tool panels)
- No changes to server routes or data schemas
- Keyboard handler (`onKeyDown`) may remain in `MapEditorView` or be extracted to `useHexInteraction` — either is acceptable as long as it is not duplicated

## Technical Notes

- Composables follow Vue 3 `<script setup>` conventions: plain functions returning reactive refs/computeds, no `this`, no Options API
- `useMapPersistence` needs access to `calibration` (for `getEngineExport`) and `mapData` — pass as arguments or return from the composable and accept `calibration` as a param
- `useHexInteraction` needs access to `mapData`, `hexIndex`, `editorMode`, `paintTerrain`, `paintEdgeFeature`, `elevationMax` — accept as reactive arguments (refs/computeds passed in)
- `useBulkOperations` needs `mapData` and `elevationMax` — accept as arguments
- `useLinearFeatureTrace` needs `mapData` — accept as argument
- Dependency injection via function arguments (not Pinia) keeps composables testable in isolation
- TDD: write tests before or alongside each composable, not after

---

_Generated by Conductor. Review and edit as needed._
