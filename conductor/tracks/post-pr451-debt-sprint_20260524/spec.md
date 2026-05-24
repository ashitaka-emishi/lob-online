# Specification: Post-PR-451 Debt Sprint

**Track ID:** post-pr451-debt-sprint_20260524
**Type:** Chore
**Created:** 2026-05-24
**Status:** Draft

## Summary

Resolve the 8 open debt items introduced in the PR #451 team review. These span three
categories: architecture refactors (contour model layering, composable API, migration
placement), test coverage gaps (contour replace, migration watcher, edge geometry), and
one accessibility fix (aria-pressed + humanized labels).

## Context

The PR #451 team review deferred 8 findings totaling a net score of 16. The score-3 item
(#453) is flagged as "fix before M6 adds more edge-paint callers" because two conflicting
coexistence policies will diverge further as the game map UI adds more edge-painting code
paths. The five score-2 refactors and test items are all contained to the map-editor tool
layer. The single score-1 item adds geometry regression coverage. Net score reduction
if all 8 are resolved: 16 points (34 → 18 open score).

## Acceptance Criteria

- [ ] #453: `handleEdgePaint` contour replace semantics live in `edge-model.js`; no
      inline coexistence bypass remains in `MapEditorView.vue`
- [ ] #452: A single exported `CONTOUR_TYPES` constant (in `feature-types.js` or
      `edge-model.js`) is the only definition of the 4-element contour type array;
      `ContourToolPanel.vue` and any other callers import it rather than redeclaring it
- [ ] #454: `useEdgePanelWiring` callers do not need `.value` in templates or computed
      getters to access `selectedType`; all consumers updated consistently
- [ ] #455: The `unknown→clear` terrain migration lives at the data-ingress boundary in
      `useMapPersistence.js`; no per-replacement re-scan in the view layer; migrated
      data is marked so the watcher does not re-run on already-clean data
- [ ] #457: `MapEditorView.test.js` (or a dedicated edge-paint test) covers the
      strip-then-add contour replace path; a regression would fail the test
- [ ] #458: Tests cover the migration watcher behavior and the `.value` unwrap fix
      introduced in PR #449/451; regressions would fail
- [ ] #456: `useEdgeLineLayer.test.js` asserts the `lineAttrs` geometry coordinates
      produced by `edgeLineFull`; a revert to `edgeLine20_80` would fail
- [ ] #459: Contour-type and terrain-type selection buttons carry `aria-pressed="true/false"`;
      button labels use human-readable strings (`Extreme Slope` not `extremeSlope`)
- [ ] `npm run quality:strict` passes; 0 new deferred debt items

## Dependencies

- All 8 items are in the map-editor tool layer. No auth, persistence, game-state, or
  rules-engine surfaces are touched.
- Phase 1 (#453 and #452) must land before Phase 2 (#457) because the replace-logic
  test targets the moved code in `edge-model.js`.

## Out of Scope

- Contour coexistence rules changes (only moving existing logic, not altering rules)
- Road/stream panel accessibility (#459 is contour + terrain only)
- Performance improvements to the migration (correctness move only)
- Any M6 game map work

## Technical Notes

### #453 — Move contour replace to edge-model.js

`handleEdgePaint` in `MapEditorView.vue` currently performs an inline strip-then-add when
painting a contour type (removing the existing contour type before adding the new one),
bypassing `validateCoexistence`. The fix is to export a new `replaceContourFeature` function
(or extend `addEdgeFeature`) from `edge-model.js` that handles the replace semantics
consistently. `handleEdgePaint` in `MapEditorView.vue` should delegate to this function.

### #452 — Unify contour-type list

Three locations currently define `['elevation', 'slope', 'extremeSlope', 'verticalSlope']`:

- `ContourToolPanel.vue` (private `CONTOUR_TYPES`)
- `edge-model.js` (implied by `SLOPE_TYPES` which is a subset)
- `feature-types.js` (`CONTOUR_GROUPS` has the types embedded in objects)

Export `CONTOUR_TYPES` from `feature-types.js` (or `edge-model.js`) and have
`ContourToolPanel.vue` and `edge-model.js` import it.

### #454 — useEdgePanelWiring .value requirement

`useEdgePanelWiring` returns `{ selectedType: Ref<string>, ... }`. In `MapEditorView.vue`,
the ref is accessed as `road.selectedType.value` in computed getters (lines ~410–418). This
can be fixed by wrapping the return in `reactive()` (Vue 3 unwraps nested refs in reactive
objects), or by returning a computed instead of a raw ref. All consumers in
`MapEditorView.vue` must be updated consistently.

### #455 — Migration to useMapPersistence

Locate the `watch`-based `unknown→clear` hex terrain migration in `MapEditorView.vue`
(or wherever it lives) and move it to `useMapPersistence.js` at the data-ingress boundary
(after draft load / server fetch). Add a migration-version stamp or `_migrated` flag so the
scan is not repeated on already-clean data.

### #459 — aria-pressed + humanized labels

`ContourToolPanel.vue` and `TerrainToolPanel.vue` have type-selection buttons with class
`:class="{ active: selectedType === group.types[0] }"` but no `aria-pressed`. Add
`:aria-pressed="selectedType === group.types[0] ? 'true' : 'false'"`. For labels, map
`extremeSlope → 'Extreme Slope'`, `verticalSlope → 'Vertical Slope'`, etc.

---

_Generated by Conductor. Review and edit as needed._
