# Specification: Test Hygiene Bundle

**Track ID:** test-hygiene-bundle_20260318
**Type:** Refactor
**GitHub Issues:** #101, #102, #103, #104, #105, #106
**Created:** 2026-03-18
**Status:** Draft

## Summary

Six test-quality debt items filed after the PR #99 review, deferred until component
restructuring was complete. Now that `ElevationSystemControls` has been extracted (#100,
merged in PR #109), address all six as a coordinated bundle.

## Context

All items are in the map editor dev-tool test layer. None are functional correctness hazards
in production, but together they create fragile, order-dependent, or under-specified tests
that will silently fail or miss regressions as the component and schema evolve.

## Acceptance Criteria

- [ ] (#101) `CalibrationControls.test.js` elevation-section tests use `data-testid` selectors
      (`[data-testid="base-elevation-input"]`, `[data-testid="elevation-levels-input"]`) sourced
      from `ElevationSystemControls`, not positional `inputs[9]`/`inputs[10]` indexes.
- [ ] (#102) `MapEditorView.test.js` replaces the module-level mutable `VALID_MAP_WITH_ELEVATION`
      object with a factory function; all tests that use it call the factory each time.
- [ ] (#103) `map.schema.js` `superRefine` validates `wedgeElevations` offsets against the
      dynamic `elevationLevels` value (`±(elevationLevels - 1)`) rather than the static `±21`
      bound; new tests cover the dynamic rejection.
- [ ] (#104) `ElevationSystemControls.test.js` adds a behavioral test confirming no
      `elevation-system-change` event is emitted when the input fires while `locked=true`.
- [ ] (#105) `ElevationSystemControls.test.js` adds tests documenting the `NaN`/empty-string
      contract: `Number('')` → emits `0`; `Number('abc')` → emits `NaN`.
- [ ] (#106) `map.schema.test.js` `superRefine` rejection tests assert `result.error` issue
      path/code, not just `result.success === false`.
- [ ] All existing tests continue to pass. CI gates green.

## Dependencies

- `client/src/components/ElevationSystemControls.vue` (PR #109, now on master) — #101 and
  #104/#105 depend on `data-testid` attrs already present in this component.
- `server/src/schemas/map.schema.js` — #103 modifies the schema's `superRefine` logic.

## Out of Scope

- Any new UI fields or features
- Migrating non-elevation test selectors in `CalibrationControls.test.js` to `data-testid`
- Changes to `MapEditorView.vue` or `ElevationSystemControls.vue` source code

## Technical Notes

**#101:** `CalibrationControls` now delegates to `<ElevationSystemControls>`, so the
elevation inputs are inside the child component's DOM. `wrapper.find('[data-testid="..."]')`
traverses into child component templates in Vue Test Utils, so selectors will work without
any change to the source.

**#102:** `VALID_MAP_WITH_ELEVATION` in `MapEditorView.test.js` should become
`makeElevationMap()` (or similar) returning a fresh deep-cloned object each call.

**#103:** The `superRefine` in `map.schema.js` currently checks `Math.abs(offset) <= 21`
statically. Change to derive the max from `data.elevationSystem?.elevationLevels ?? 22`
(falling back to 22 so existing data with no elevationSystem set remains valid). New tests
should verify that `wedgeElevations: [elevationLevels, ...]` is rejected when
`elevationLevels < 22`.

**#106:** Rejection tests should additionally check that `result.error.issues[0].path`
contains the expected field path and/or `result.error.issues[0].code` matches `'custom'`
(Zod's code for `superRefine` failures) or the appropriate Zod code.
