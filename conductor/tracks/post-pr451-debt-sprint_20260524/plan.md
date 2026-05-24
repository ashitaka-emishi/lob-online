# Implementation Plan: Post-PR-451 Debt Sprint

**Track ID:** post-pr451-debt-sprint_20260524
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-24
**Status:** [ ] Not Started

## Overview

Three implementation phases plus closeout. Phase 1 handles the architecture refactors —
move contour replace logic into `edge-model.js`, unify the contour-type list, fix the
`useEdgePanelWiring` composable API, and relocate the `unknown→clear` migration. Phase 1
must complete before Phase 2, which adds test coverage for the moved code. Phase 3 adds
the accessibility fixes to `ContourToolPanel.vue` and `TerrainToolPanel.vue`. All changes
are in the map-editor tool layer; no game state, auth, or rules-engine surfaces are touched.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

- HCP 1: Approve preflight notes before implementation begins
- HCP 2: After Phase 1 (composable API change + formula module change) before Phase 2

## Risk Classification

**Risk:** Medium
**Reason:** Phase 1 touches `edge-model.js` (shared formula module used by map-test tool
and engine tests), `useEdgePanelWiring.js` (composable whose API change affects all three
edge panels), and `useMapPersistence.js` (data-ingress boundary). These are Checkpointed
surfaces per the agentic quality rails.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 — this is a debt-cleanup PR; no new deferred findings
permitted.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated (8 items closed, score −16)
- [ ] Ready for `/team-review`

---

## Phase 1: Architecture Refactors (#453, #452, #454, #455)

These four items are ordered by dependency: #452 (unify the constant) must land before
#453 (move the replace logic) so the new `edge-model.js` function can import the unified
list. #454 and #455 are independent of each other and of #452/#453.

### Tasks

- [ ] Task 1.1: (#452) Export `CONTOUR_TYPES` from `client/src/config/feature-types.js`
      as a named export (`export const CONTOUR_TYPES = [...]`). Remove the private
      `CONTOUR_TYPES` const from `ContourToolPanel.vue`; import the exported constant
      instead. Verify `edge-model.js` can import it if needed by #453.
      Run `npm run test` to confirm no regressions.

- [ ] Task 1.2: (#453) Investigate the exact contour replace semantics in `MapEditorView.vue`
      `handleEdgePaint`. Export a new `replaceContourFeature(hexes, hexIndex, hexId, faceIndex, type, calibration)` function from `edge-model.js` that encapsulates: (a) resolve canonical
      owner, (b) strip any existing contour type, (c) call `validateCoexistence`, (d) add
      the new type. Update `handleEdgePaint` in `MapEditorView.vue` to delegate to this
      function for contour types. Write unit test stubs in `edge-model.test.js` (red) before
      implementing. Run tests green after.

- [ ] Task 1.3: (#454) Investigate the exact usage of `useEdgePanelWiring` in
      `MapEditorView.vue` (template bindings on lines ~671/696/721 pass `road.selectedType`
      as a prop; computed getters on lines ~410–418 use `.value`). Fix the composable by
      wrapping the return value in `reactive()` so callers do not need explicit `.value` on
      `selectedType`. Update all `.selectedType.value` accesses in `MapEditorView.vue` to
      `.selectedType`. Verify the template `:selected-type="road.selectedType"` bindings
      still work (they pass the reactive property, which Vue will auto-unwrap in the child's
      String prop). Run tests green.

- [ ] Task 1.4: (#455) Locate the `unknown→clear` terrain migration watcher (expected in
      `MapEditorView.vue` or a composable). Move the scan logic to
      `useMapPersistence.js` — run it once at the data-ingress boundary (after draft/server
      load), not on every map replacement. Add a `_migrationVersion` stamp (or similar) to
      mark already-migrated data so the scan is a no-op on clean maps. Remove the view-layer
      watcher. Run `npm run test` green.

### Verification

- [ ] `npm run test` green after each task; no calibration, schema, or edge-model regressions
- [ ] **Human checkpoint (HCP 2):** review Phase 1 diff before proceeding to Phase 2

---

## Phase 2: Test Coverage (#457, #458, #456)

Add regression tests for the code paths changed or fixed in Phase 1 and prior PRs. These
tasks target the moved code and the behavioral fixes that currently lack coverage.

### Tasks

- [x] Task 2.1: (#457) In `edge-model.test.js`, add a `describe('replaceContourFeature')`
      block that covers: (a) basic replace — painting `slope` on an edge that has `elevation`
      strips `elevation` and adds `slope`; (b) idempotent — painting the same type is a
      no-op; (c) invalid coexistence after strip is still blocked (if applicable). Run red
      before the function exists (or green after Phase 1.2 lands). Confirm the test
      specifically exercises the strip-then-add path.

- [x] Task 2.2: (#458) In `MapEditorView.test.js` (or `useMapPersistence.test.js` as
      appropriate), add tests for: (a) the migration watcher/function — a draft with
      `terrain: 'unknown'` hexes is converted to `'clear'` at load time, and re-loading
      already-clean data does NOT mutate it; (b) the `useEdgePanelWiring` `.value` fix —
      accessing `selectedType` on the returned reactive object does not require `.value` and
      reflects changes made via `onTypeChange`. Run tests green.

- [x] Task 2.3: (#456) In `useEdgeLineLayer.test.js`, add assertions on the `lineAttrs`
      coordinates returned for a representative edge using `edgeLineFull`. Assert at least
      `x1`, `y1`, `x2`, `y2` (or `points`) have numeric values consistent with the
      full-edge geometry (not the 20%–80% segment). A revert to `edgeLine20_80` must fail
      this test. Run tests green.

### Verification

- [ ] `npm run test` green; new tests exercise the strip-then-add, migration, and geometry paths
- [ ] No new Vue warnings in test output

---

## Phase 3: Accessibility (#459)

Add `aria-pressed` and humanized labels to contour and terrain type-selection buttons.

### Tasks

- [x] Task 3.1: (#459) In `ContourToolPanel.vue`, on each type-selection `<button>`,
      add `:aria-pressed="selectedType === group.types[0] ? 'true' : 'false'"`. Add a
      display label mapping (`'elevation' → 'Elevation'`, `'slope' → 'Slope'`,
      `'extremeSlope' → 'Extreme Slope'`, `'verticalSlope' → 'Vertical Slope'`) and
      render it as visible text or `aria-label` instead of the raw camelCase key.

- [x] Task 3.2: (#459) Apply the same `aria-pressed` pattern and label humanization to
      `TerrainToolPanel.vue` if it uses the same button pattern (verify first).

- [x] Task 3.3: Add or update tests in `ContourToolPanel.test.js` asserting
      `aria-pressed="true"` on the active button and `aria-pressed="false"` on inactive
      buttons. Confirm human-readable label text appears in the rendered output.
      Run tests green.

### Verification

- [ ] `npm run test` green; aria-pressed tests pass
- [ ] Manual: tab through ContourToolPanel — active type button announces as "pressed"

---

## Phase 4: Closeout

### Tasks

- [ ] Task 4.1: Run `npm run quality:strict` — all five gates pass with zero warnings.
- [ ] Task 4.2: Close GitHub issues #452, #453, #454, #455, #456, #457, #458, #459.
- [ ] Task 4.3: Run `/tech-debt-report` for this PR to update the debt register.

## Final Verification

- [ ] All 8 acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes with zero unexpected warnings
- [ ] 8 GitHub issues closed (#452 #453 #454 #455 #456 #457 #458 #459)
- [ ] Debt register: 19 → 11 open items, net score 34 → 18
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
