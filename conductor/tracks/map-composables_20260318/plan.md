# Implementation Plan: Extract Composables from MapEditorView + Unify Selection State

**Track ID:** map-composables_20260318
**Spec:** [spec.md](./spec.md)
**Created:** 2026-03-18
**Status:** [ ] Not Started

## Overview

Pure refactor: extract five composables from MapEditorView.vue one at a time, verifying tests pass after each extraction. Unify selection state as part of the `useHexInteraction` extraction (Phase 3). Each phase leaves the app in a working, tested state. Branch: `feat/97-map-composables`.

## Phase 1: Foundation — Directory + Simplest Extraction

Create the composables directory and extract the smallest, most self-contained unit first (`useBulkOperations`) to establish the pattern.

### Tasks

- [ ] Task 1.1: Create `client/src/composables/` directory
- [ ] Task 1.2: Write `useBulkOperations.test.js` — unit tests for `adjustHexElevation`, `clearAllElevations`, `raiseAll`, `lowerAll`, `clearAllTerrain`, `clearAllWedges` against a mock `mapData` ref
- [ ] Task 1.3: Implement `useBulkOperations.js` — extract the six bulk mutation functions from MapEditorView; accept `{ mapData, elevationMax }` as arguments
- [ ] Task 1.4: Wire `useBulkOperations` into `MapEditorView.vue` — replace inline functions with composable calls; confirm template bindings unchanged

### Verification

- [ ] `useBulkOperations.test.js` passes
- [ ] Existing `MapEditorView.test.js` passes
- [ ] `npm run lint` clean

## Phase 2: Linear Feature Trace Extraction

Extract the trace confirm/apply/cancel logic.

### Tasks

- [ ] Task 2.1: Write `useLinearFeatureTrace.test.js` — tests for `onTraceProgress`, `onTraceComplete`, `applyTrace`, `cancelTrace` against a mock `mapData` ref
- [ ] Task 2.2: Implement `useLinearFeatureTrace.js` — extract `showTraceConfirm`, `pendingTraceEdges`, `liveTraceCount`, and the four trace functions; accept `{ mapData }` as argument
- [ ] Task 2.3: Wire into `MapEditorView.vue`

### Verification

- [ ] `useLinearFeatureTrace.test.js` passes
- [ ] Existing `MapEditorView.test.js` passes
- [ ] `npm run lint` clean

## Phase 3: Hex Interaction + Selection Unification

Largest extraction. Also unifies the dual selection state.

### Tasks

- [ ] Task 3.1: Write `useHexInteraction.test.js` — tests for: click/right-click/mouseenter handlers (select, elevation, terrain, wedge modes), edge click, LOS pick/cancel/set/result, selection unification (non-shift click clears Set, shift click adds, Set → computed single-element alias)
- [ ] Task 3.2: Implement `useHexInteraction.js` — extract all interaction handlers and LOS state; convert `selectedHexId` from `ref(null)` to `computed(() => selectedHexIds.value.size === 1 ? [...selectedHexIds.value][0] : null)`; accept `{ mapData, hexIndex, editorMode, paintTerrain, paintEdgeFeature, elevationMax, onHexUpdate }` as arguments
- [ ] Task 3.3: Wire into `MapEditorView.vue` — remove inline handlers and refs, use composable returns; ensure `togglePanel` clears `selectedHexIds` on switch

### Verification

- [ ] `useHexInteraction.test.js` passes (including selection unification boundary cases)
- [ ] Existing `MapEditorView.test.js` passes
- [ ] `npm run lint` clean

## Phase 4: Editor Accordion Extraction

Extract panel/mode state machine.

### Tasks

- [ ] Task 4.1: Write `useEditorAccordion.test.js` — tests for `togglePanel` (open/close, mode derivation from `TOOL_PANEL_MODES`), `activeToolName` computed, ESC key handling if present
- [ ] Task 4.2: Implement `useEditorAccordion.js` — extract `PANEL_DISPLAY_NAMES`, `TOOL_PANEL_MODES`, `openPanel`, `activeToolName` computed, `togglePanel`; the `selectedHexIds` clear on panel switch is coordinated via a callback argument `onPanelSwitch`
- [ ] Task 4.3: Wire into `MapEditorView.vue`

### Verification

- [ ] `useEditorAccordion.test.js` passes
- [ ] Existing `MapEditorView.test.js` passes
- [ ] `npm run lint` clean

## Phase 5: Map Persistence Extraction

Largest pure-data extraction. Fetch, save, draft, push/pull.

### Tasks

- [ ] Task 5.1: Write `useMapPersistence.test.js` — tests for `saveMapDraft` / `restoreDraft` / `dismissDraft` (localStorage), `fetchMapData` (server fetch mock), `executePush` / `executePull` (server round-trip mocks), draft banner visibility logic
- [ ] Task 5.2: Implement `useMapPersistence.js` — extract all persistence state and functions; accept `{ calibration }` as argument for `getEngineExport`; return `mapData` as a ref (owned by this composable)
- [ ] Task 5.3: Wire into `MapEditorView.vue` — `mapData` is now returned by `useMapPersistence`, passed into the other composables as an argument

### Verification

- [ ] `useMapPersistence.test.js` passes
- [ ] Existing `MapEditorView.test.js` passes
- [ ] `npm run lint` clean

## Phase 6: Final Polish + Orchestrator Verification

Verify MapEditorView is a thin orchestrator, run full test suite, confirm coverage.

### Tasks

- [ ] Task 6.1: Audit `MapEditorView.vue` — no business logic should remain inline; only composable imports, template bindings, and any remaining view-level constants (e.g. `MAP_IMAGE`, `DEFAULT_CALIBRATION`, `STORAGE_KEY`)
- [ ] Task 6.2: Run `npm run test:coverage` — confirm ≥ 70% line coverage, note composable coverage
- [ ] Task 6.3: Run `/dev-build` (format + lint + build) — all clean

### Verification

- [ ] `MapEditorView.vue` line count materially reduced (target < 400 lines)
- [ ] All 5 composable test files pass
- [ ] Full test suite passes (≥ 70% coverage)
- [ ] Build succeeds

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run test` passes (coverage ≥ 70%)
- [ ] `MapEditorView` is a thin orchestrator with no inline business logic
- [ ] Ready for `/pr-create`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
