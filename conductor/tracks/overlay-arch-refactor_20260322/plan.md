# Implementation Plan: Rendering Architecture — overlayConfig Ownership Cleanup

**Track ID:** overlay-arch-refactor_20260322
**Spec:** [spec.md](./spec.md)
**Created:** 2026-03-22
**Status:** [~] In Progress

## Overview

Three-phase refactor. Phase 1 audits the current dual-rendering system and designs the unified
`overlayConfig` API shape. Phase 2 migrates `HexMapOverlay` to the clean API and removes the
legacy flat props. Phase 3 moves ownership of each config slice to the tool panels, leaving
`MapEditorView` as a pass-through. The ordering ensures that at each phase boundary the map
editor is fully functional (no partial states).

**Prerequisite:** `hex-overlay-perf_20260322` must be merged before starting this track.

## Phase 1: Audit and API Design

Read the current component/composable landscape, enumerate all flat props that overlap with
`overlayConfig` keys, and decide how tool panels will own their config slices (emits vs store).

### Tasks

- [x] Task 1.1: Read `HexMapOverlay` props, `overlayConfig` shape, and `MapEditorView`
      binding site. List every flat prop that has a counterpart in `overlayConfig`.
- [x] Task 1.2: Read all tool panel components (terrain, elevation, road, stream/wall,
      contour, wedge). Note what overlay state each logically owns.
- [x] Task 1.3: Decide ownership mechanism — each tool panel emits its config slice upward
      to `MapEditorView` which merges and passes a single `overlayConfig` to `HexMapOverlay`,
      or tool panels write to a shared Pinia store slice that `HexMapOverlay` reads directly.
      Document the decision in a brief comment block at the top of `plan.md`.
- [x] Task 1.4: Draft the final `overlayConfig` type shape (JSDoc comment in a new
      `overlayConfig.js` constants file, or inline in `HexMapOverlay` props definition).
- [x] Task 1.5: Write a Vitest test suite skeleton for the new `HexMapOverlay` prop API
      (prop validation, rendering branches) — tests will be red until Phase 2.

### Verification

- [ ] Ownership mechanism decided and documented.
- [ ] Full list of props to remove from `HexMapOverlay` is known.
- [ ] Test skeleton committed (red is acceptable at phase boundary).

---

**Design decision (Task 1.3):**

_Chosen mechanism: **emits** — rationale: four of six tool panels already emit `overlay-config`
events consumed by `MapEditorView`. The pattern is Vue-idiomatic (props down, emits up), requires
no new Pinia store, and the overlay state is ephemeral editor state not shared outside the
tool-editor subtree. Phase 2 game-logic overlays can introduce a store slice if cross-tree access
is needed then; premature store coupling is not warranted now._

_Flat props to remove from `HexMapOverlay`: `vpHexIds`, `selectedHexId`, `calibrationMode`,
`losHexA`, `losHexB`, `losPathHexes`, `losBlockedHex`, `seedHexIds`._

_New overlayConfig keys: `vpHighlight.hexIds`, `selectedHex.hexId`, `calibration.active`,
`los.{hexA,hexB,pathHexes,blockedHex}`, `seedHighlight.hexIds`._

_MapEditorView merges: active tool panel's slice + global state (selectedHex, LOS, VPs, seeds,
calibration) into a single overlayConfig. CalibrationControls does not need a new emit — its state
lives in `calibrationMode` ref in MapEditorView, which becomes `overlayConfig.calibration.active`._

_TerrainToolPanel needs a new `overlay-config` emit for its hexFill/hexIcon/hexLabel slice._

---

## Phase 2: Migrate HexMapOverlay to Unified overlayConfig API

Replace the dual rendering system in `HexMapOverlay` with the unified `overlayConfig`-driven
path, remove legacy flat props, and update `MapEditorView` bindings.

### Tasks

- [ ] Task 2.1: Add the new `overlayConfig` keys needed to cover every flat prop being removed.
      Keep old props temporarily (both paths active) so the component stays functional.
- [ ] Task 2.2: Migrate `HexMapOverlay` template branches to read exclusively from
      `overlayConfig`; remove the legacy explicit-prop branches.
- [ ] Task 2.3: Remove the now-unused flat props from `HexMapOverlay`'s `defineProps`.
- [ ] Task 2.4: Update `MapEditorView` bindings to pass the merged `overlayConfig` rather
      than individual props. At this point `MapEditorView` still owns the config content.
- [ ] Task 2.5: Update Vitest tests to the new prop API; make the Phase 1 skeleton tests green.
- [ ] Task 2.6: Manual smoke test in the map editor dev server — all overlay layers (terrain,
      elevation, roads, streams, contours, wedges, LOS) render correctly.

### Verification

- [ ] `HexMapOverlay` has no legacy flat-prop rendering branches.
- [ ] `MapEditorView` passes one `overlayConfig` object.
- [ ] All Vitest tests pass.
- [ ] Map editor visually unchanged.

## Phase 3: Move overlayConfig Ownership to Tool Panels

Each tool panel computes and owns its `overlayConfig` slice. `MapEditorView` becomes a
pass-through merger, no longer knowing the contents of each tool's config.

### Tasks

- [ ] Task 3.1: Per tool panel (terrain, elevation, road, stream/wall, contour, wedge):
      add a `computed` that returns the panel's `overlayConfig` slice and expose it via
      the chosen ownership mechanism (emit or store write).
- [ ] Task 3.2: Update `MapEditorView` to merge incoming slices into the single
      `overlayConfig` passed to `HexMapOverlay`. `MapEditorView` must not hard-code
      any tool-specific rendering flags.
- [ ] Task 3.3: Write/update composable composition contract doc (#155) — a JSDoc block
      or inline comment describing how `useHexPaintTool`, `useEdgePaintTool`, and
      `useClickHexside` compose and which events they share.
- [ ] Task 3.4: Run `npm run test:coverage`; confirm coverage ≥ 70%. Run lint + format.

### Verification

- [ ] `MapEditorView` contains no tool-specific rendering keys.
- [ ] Each tool panel owns its overlay config slice.
- [ ] Composable composition contract documented.
- [ ] CI gates pass (lint, format, test ≥ 70%).

## Final Verification

- [ ] All three debt items (#152, #153, #167) closed.
- [ ] `HexMapOverlay` prop list is the `overlayConfig` object (plus structural props like
      `hexes`, `gridSpec`, `gridData`).
- [ ] No dual rendering paths remain.
- [ ] All Vitest tests pass with coverage ≥ 70%.
- [ ] `npm run lint` and `npm run format:check` pass.
- [ ] Map editor UX unchanged — verified in dev server.
- [ ] Ready for `/pr-create` → `/team-review`.

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
