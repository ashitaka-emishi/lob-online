# Technical Debt Report — lob-online

_Last updated: 2026-03-22 after PR #171._

---

## Executive Summary

| Metric                           | Value                                                                       |
| -------------------------------- | --------------------------------------------------------------------------- |
| Open debt items                  | 12                                                                          |
| Cumulative debt score (net open) | 22                                                                          |
| Highest-risk item                | gridData rebuilds full cell array on any calibration change (#151, score 3) |
| PRs tracked                      | 41                                                                          |

---

## Debt Over Time

| Date       | PR                      | Debt Added (this PR) | Cumulative Added (gross) |
| ---------- | ----------------------- | -------------------- | ------------------------ |
| 2026-03-18 | PR #98                  | 0                    | 0                        |
| 2026-03-18 | PR #99                  | 12                   | 12                       |
| 2026-03-18 | PR #107                 | 0                    | 12                       |
| 2026-03-18 | PR #108                 | 0                    | 12                       |
| 2026-03-18 | PR #109 (resolved #100) | 3                    | 15                       |
| 2026-03-18 | PR #113                 | 0                    | 15                       |
| 2026-03-18 | PR #113 (resolved #101) | -2                   | 15                       |
| 2026-03-18 | PR #113 (resolved #102) | -2                   | 15                       |
| 2026-03-18 | PR #113 (resolved #103) | -2                   | 15                       |
| 2026-03-18 | PR #113 (resolved #104) | -1                   | 15                       |
| 2026-03-18 | PR #113 (resolved #105) | -1                   | 15                       |
| 2026-03-18 | PR #113 (resolved #106) | -1                   | 15                       |
| 2026-03-18 | PR #117                 | 5                    | 20                       |
| 2026-03-18 | PR #120                 | 0                    | 20                       |
| 2026-03-18 | PR #120 (resolved #118) | -3                   | 20                       |
| 2026-03-18 | PR #120 (resolved #119) | -2                   | 20                       |
| 2026-03-18 | PR #121                 | 0                    | 20                       |
| 2026-03-18 | PR #122                 | 16                   | 36                       |
| 2026-03-18 | PR #131                 | 0                    | 36                       |
| 2026-03-18 | PR #131 (resolved #123) | -2                   | 36                       |
| 2026-03-18 | PR #132                 | 0                    | 36                       |
| 2026-03-18 | PR #132 (resolved #130) | -2                   | 36                       |
| 2026-03-18 | PR #132 (resolved #129) | -1                   | 36                       |
| 2026-03-18 | PR #132 (resolved #128) | -1                   | 36                       |
| 2026-03-18 | PR #132 (resolved #127) | -1                   | 36                       |
| 2026-03-18 | PR #134                 | 0                    | 36                       |
| 2026-03-19 | PR #145                 | 5                    | 41                       |
| 2026-03-19 | PR #148 (resolved #146) | -3                   | 41                       |
| 2026-03-19 | PR #148 (resolved #147) | -2                   | 41                       |
| 2026-03-19 | PR #150                 | 11                   | 52                       |
| 2026-03-19 | PR #150 (resolved #124) | -3                   | 52                       |
| 2026-03-22 | PR #158                 | 13                   | 65                       |
| 2026-03-22 | PR #168                 | 3                    | 68                       |
| 2026-03-22 | PR #168 (resolved #159) | -2                   | 68                       |
| 2026-03-22 | PR #168 (resolved #160) | -2                   | 68                       |
| 2026-03-22 | PR #168 (resolved #163) | -1                   | 68                       |
| 2026-03-22 | PR #168 (resolved #164) | -1                   | 68                       |
| 2026-03-22 | PR #171                 | 0                    | 68                       |
| 2026-03-22 | PR #171 (resolved #152) | -2                   | 68                       |
| 2026-03-22 | PR #171 (resolved #153) | -3                   | 68                       |
| 2026-03-22 | PR #171 (resolved #155) | -2                   | 68                       |
| 2026-03-22 | PR #171 (resolved #167) | -1                   | 68                       |

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Elevated risk. Several significant deferred items that introduce coupling or architectural compromise. Recommend a debt reduction sprint before the next major phase.

Current debt (score 22) spans two primary clusters. First, MapEditorView extraction debt: the oversized `useMapPersistence` API surface (#125), the pending `useCalibration`/`useMapExport` extraction (#126), and the per-tool-panel wiring composable (#161) will compound as game logic is added in Phase 2. Second, rendering performance debt: `gridData` full-rebuild on calibration changes (#151) and the `cellsForEdges` composable extraction (#169) remain the highest-priority performance items. Structural duplication across edge tool panels (#162) and minor style/test gaps (#111, #112, #154, #165, #166, #170) account for the remainder. PR #171 (overlay-arch-refactor) closed the entire rendering architecture cluster: #152 (hybrid rendering model), #153 (overlayConfig ownership bridge), #155 (composable composition contract), and #167 (HexMapOverlay prop list) — reducing net open debt from 30 to 22.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                             | PR Introduced | Assessment                                                                                                                                                                                                                                                                                                                                                     |
| ----- | ----- | --------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #151  | perf: gridData rebuilds full cell array on any calibration change                 | PR #150       | ~2,240 cell objects rebuild on any calibration field change including strokeWidth/northOffset nudges. Causes visible lag on slower machines. Fix requires splitting gridData into geometry + cell layers — non-trivial refactor.                                                                                                                               |
| 3     | #126  | Extract `useCalibration` and `useMapExport` from `MapEditorView`                  | PR #122       | MapEditorView still carries ~378 lines of inline logic despite the extraction of 8 composables. Calibration and export are self-contained concerns that weren't in scope for this PR.                                                                                                                                                                          |
| 3     | #125  | Reduce `useMapPersistence` API surface (23 return values)                         | PR #122       | 23 return values with push/pull dialog state mixed into a persistence composable. Reduces reusability and increases caller coupling. Grouping into sub-objects would clarify ownership.                                                                                                                                                                        |
| 2     | #161  | refactor: extract per-tool-panel wiring in MapEditorView into a shared composable | PR #158       | Three nearly-identical panel-wiring blocks in MapEditorView will grow with each new tool panel. Requires design decision on composable API shape.                                                                                                                                                                                                              |
| 2     | #169  | refactor: extract cellsForEdges into useEdgeLineLayer composable                  | PR #168       | `cellsForEdges` invalidates on any `gridData` change (including LOS/selection state) because it depends on `cells`, downstream of the monolithic `gridData` computed. The structure encodes the template's nested v-for shape in script setup. Natural fit for extraction into `useEdgeLineLayer(cells, overlayConfig)` during overlay-arch-refactor_20260322. |
| 2     | #162  | refactor: deduplicate RoadToolPanel / StreamWallToolPanel structural boilerplate  | PR #158       | Near-identical structure across both panels; changes to shared chrome must be applied in two places. Low urgency until a third structurally identical panel exists.                                                                                                                                                                                            |
| 2     | #111  | Hoist `ElevationSystemControls` to `MapEditorView` sibling                        | PR #109       | `CalibrationControls` now passes `elevationSystem` prop and `elevation-system-change` emit through to the child without any logic. Acceptable interim state, but each future extraction compounds the inert API surface on the parent.                                                                                                                         |
| 1     | #170  | test: add integration test for onSvgMouseMove rAF callback output                 | PR #168       | The rAF gate tests verify scheduling but not the callback's output path (coordinate transform → findNearestEdge → snap → hoverInfo). Individual pieces are unit-tested; this gap is narrow but would catch regressions in the full pipeline.                                                                                                                   |
| 1     | #166  | style: consolidate duplicated scoped CSS across edge tool panels                  | PR #158       | Same panel chrome CSS copied across three `<style scoped>` blocks. Minor maintenance burden; extract when a fourth panel is added.                                                                                                                                                                                                                             |
| 1     | #165  | perf: remove console.assert calls from utils/compass.js hot path                  | PR #158       | Establishes convention for dev-only diagnostic assertions on hot-path formula functions. The shim no longer has guards; this tracks the future pattern.                                                                                                                                                                                                        |
| 1     | #154  | fix: ToolChooser item.color is not validated — accepts any string                 | PR #150       | Silent visual failure (wrong color) when an invalid CSS color string is passed. Low risk since item arrays come from the controlled feature-types.js registry; a typo there would be caught in code review.                                                                                                                                                    |
| 1     | #112  | Consolidate shared form-input CSS across map editor components                    | PR #109       | `label` and `input[type='number']` scoped styles are duplicated between `CalibrationControls` and `ElevationSystemControls`. Minor maintenance burden; revisit when a third form-input component is extracted.                                                                                                                                                 |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
