# Implementation Plan: Minor Debt Bundle

**Track ID:** minor-debt-bundle_20260322
**Spec:** [spec.md](./spec.md)
**Created:** 2026-03-22
**Status:** [ ] Not Started

## Overview

Seven self-contained debt items grouped into three phases by dependency and risk:
Phase 1 handles pure CSS deduplication (no logic changes, lowest risk). Phase 2 handles
structural component changes (#111 hoist, #154 validation, #162/#166 panel dedup). Phase 3
adds the missing integration test (#170) and removes the hot-path assertion shim (#165).
Each phase is independently verifiable and leaves CI green.

**Prerequisite:** PR #172 (review-fix fixup) merged to master before branching.

## Phase 1: CSS Deduplication (#112, #166 partial)

Extract shared form-input styles from `CalibrationControls` and `ElevationSystemControls`
into a shared asset file. The edge-panel CSS dedup (#166) depends on the `EdgeToolPanelShell`
component from Phase 2, so only the shared-file infrastructure is set up here; the
edge-panel migration happens in Phase 2 after the shell exists.

### Tasks

- [x] Task 1.1: Read `CalibrationControls.vue` and `ElevationSystemControls.vue` — identify
      all duplicated scoped CSS rules that apply to `label`, `input[type='number']`, and
      shared layout. List them.
- [x] Task 1.2: Create `client/src/assets/editor-form.css` with the shared rules. Import it
      (non-scoped) in both components. Remove the duplicated rules from each `<style scoped>`.
      Write a brief comment in the file explaining it is a shared stylesheet for map editor
      form controls.
- [x] Task 1.3: Run `npm run lint && npm run format:check && npm run test` — confirm no
      regressions. Commit: `style(editor-form): extract shared form-input CSS (#112)`.

### Verification

- [ ] `editor-form.css` exists and is imported in both components.
- [ ] No duplicate `label` / `input[type='number']` rules remain in the component scoped blocks.
- [ ] 825 tests still pass. Lint and format clean.

---

## Phase 2: Structural Component Fixes (#111, #154, #162, #166)

Four structural changes that require reading existing component trees before writing.
Order: #154 first (isolated utility change), then #111 (component move), then #162/#166
(new shell component + CSS migration).

### Tasks

- [ ] Task 2.1: Read `ToolChooser.vue`. Identify where `item.color` is bound to the DOM.
      Add a `validateColor(value)` utility (inline or in `utils/color.js`) using
      `CSS.supports('color', value)`. Call it in the computed that produces the color binding
      and emit `console.warn(\`ToolChooser: invalid color "\${value}"\`)`when the check fails.
 Add a Vitest test: valid color passes silently, invalid string triggers the warn. Commit:
`fix(ToolChooser): warn on invalid item.color CSS value (#154)`.
- [ ] Task 2.2: Read `MapEditorView.vue` and `CalibrationControls.vue` to find where
      `ElevationSystemControls` is currently mounted and how its props/emits are threaded.
      Move `<ElevationSystemControls>` out of `CalibrationControls` into `MapEditorView` as
      a sibling of `<CalibrationControls>`. Remove the now-redundant prop pass-through from
      `CalibrationControls`. Update existing tests if any reference the old structure. Commit:
      `refactor(CalibrationControls): hoist ElevationSystemControls to MapEditorView (#111)`.
- [ ] Task 2.3: Read `RoadToolPanel.vue` and `StreamWallToolPanel.vue` side-by-side —
      identify the identical chrome sections (mode toggle, chooser row, clear-all button,
      sub-control slot). Design the `EdgeToolPanelShell` props and slot API. Write the Vitest
      test for `EdgeToolPanelShell` (renders mode buttons, emits mode-change, renders default
      slot, renders sub-control slot, emits clear-all) before implementing.
- [ ] Task 2.4: Create `client/src/components/EdgeToolPanelShell.vue`. Implement to pass
      the tests from Task 2.3. Props: `items` (array of `{value, label}`), `selectedType`
      (string), `paintMode` (string). Emits: `type-change`, `mode-change`, `clear-all`.
      Slots: `default` (main content), `sub-control` (bridge/ford sub-panel). Scoped CSS:
      all shared `.edge-tool-panel`, `.mode-toggle`, `.mode-btn`, `.chooser-row`, `.clear-btn`
      rules live here.
- [ ] Task 2.5: Migrate `RoadToolPanel.vue` to use `EdgeToolPanelShell`. Remove the chrome
      sections and their scoped CSS. Migrate `StreamWallToolPanel.vue` identically. Migrate
      `ContourToolPanel.vue` (which shares the same chrome). Delete the now-duplicate scoped
      CSS from all three panels (#166 closed). Commit: `refactor(edge-panels): extract
EdgeToolPanelShell, deduplicate chrome and CSS (#162 #166)`.
- [ ] Task 2.6: Run full test suite. Confirm 825+ tests pass. Lint and format clean.

### Verification

- [ ] `ElevationSystemControls` is a direct child of `MapEditorView`, not `CalibrationControls`.
- [ ] `CalibrationControls` has no `elevationSystem` prop or `elevation-system-change` emit.
- [ ] `ToolChooser` warns on invalid color; Vitest test covers this.
- [ ] `EdgeToolPanelShell` has its own Vitest tests.
- [ ] All three edge panels use `EdgeToolPanelShell`; no duplicate chrome CSS remains.
- [ ] CI gates green.

---

## Phase 3: Test Coverage + Hot-Path Cleanup (#165, #170)

Two independent items: remove a dead assertion shim and add a missing integration test.

### Tasks

- [ ] Task 3.1: Read `utils/compass.js`. Find and remove all `console.assert` calls. Confirm
      that the values those assertions checked are already covered by existing Vitest tests
      (or add a targeted test if a case is not covered). Commit: `perf(compass): remove
console.assert from hot path (#165)`.
- [ ] Task 3.2: Read `HexMapOverlay.test.js` — find the existing rAF gate tests (around the
      `onSvgMouseMove` describe block). Read `HexMapOverlay.vue` `onSvgMouseMove` to
      understand what `hoverInfo` should contain after the rAF callback fires.
- [ ] Task 3.3: Write an integration test for the full rAF callback output path: stub
      `requestAnimationFrame` to execute synchronously (re-use the existing `vi.stubGlobal`
      pattern), fire a `mousemove` at an SVG coordinate that lands on a known hex, and
      assert that `hoverInfo.value` contains the expected `hexId`, `nearHexId`, `nearDir`,
      `snapHexId`, `snapDir`, and `inProximity`. Commit: `test(HexMapOverlay): integration
test for onSvgMouseMove rAF callback output (#170)`.
- [ ] Task 3.4: Run `npm run test:coverage` — confirm coverage ≥ 70%. Run lint + format.

### Verification

- [ ] No `console.assert` calls remain in `utils/compass.js`.
- [ ] Integration test exists and passes for the full rAF output path.
- [ ] Coverage ≥ 70%. All CI gates green.

---

## Final Verification

- [ ] All 7 debt items closed: #111, #112, #154, #162, #165, #166, #170.
- [ ] Net open debt items: 5 (from 12).
- [ ] `npm run lint`, `npm run format:check`, `npm run test` all pass.
- [ ] Ready for `/pr-create` → `/team-review`.

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
