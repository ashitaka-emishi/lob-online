# Technical Debt Report — lob-online

_Last updated: 2026-03-22 after PR #158._

---

## Executive Summary

| Metric                           | Value                                                                       |
| -------------------------------- | --------------------------------------------------------------------------- |
| Open debt items                  | 18                                                                          |
| Cumulative debt score (net open) | 33                                                                          |
| Highest-risk item                | gridData rebuilds full cell array on any calibration change (#151, score 3) |
| PRs tracked                      | 31                                                                          |

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

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

High risk. Critical or significant deferred items pose a threat to production stability or block future work. Immediate attention recommended.

Current debt (score 33) spans four clusters. First, architectural debt in the composables and component layers: the oversized `useMapPersistence` API surface (#125), undocumented composable composition contract (#155), and the pending MapEditorView tool-panel wiring refactor (#161) will all compound as game logic is added in Phase 2. Second, rendering architecture debt: the `overlayConfig` ownership bridge (#153), the hybrid rendering model (#152), and the growing HexMapOverlay prop list (#167) collectively violate the tool-owns-its-overlays design principle established in the tool panel refactor. Third, performance debt: `gridData` full-rebuild on calibration changes (#151), duplicated `findNearestEdge` calls (#159), missing rAF gate on the edge-hover path (#160), inline v-for filters (#163), and un-memoized wedge polygon computation (#164) will become visible bottlenecks as map density increases. Fourth, structural duplication across the new edge tool panels (#162, #166) that is low-urgency today but will compound with each additional panel type.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                                                     | PR Introduced | Assessment                                                                                                                                                                                                                             |
| ----- | ----- | --------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #151  | perf: gridData rebuilds full cell array on any calibration change                                         | PR #150       | ~2,240 cell objects rebuild on any calibration field change including strokeWidth/northOffset nudges. Causes visible lag on slower machines. Fix requires splitting gridData into geometry + cell layers — non-trivial refactor.       |
| 3     | #153  | refactor: overlayConfig ownership bridge in MapEditorView should move to tool panels                      | PR #150       | MapEditorView knowing each tool's rendering preferences violates the tool-owns-its-overlays design principle. Bridge will grow with each tool panel added in #137–#142. Deferred until tool panels exist to own it.                    |
| 3     | #126  | Extract `useCalibration` and `useMapExport` from `MapEditorView`                                          | PR #122       | MapEditorView still carries ~378 lines of inline logic despite the extraction of 8 composables. Calibration and export are self-contained concerns that weren't in scope for this PR.                                                  |
| 3     | #125  | Reduce `useMapPersistence` API surface (23 return values)                                                 | PR #122       | 23 return values with push/pull dialog state mixed into a persistence composable. Reduces reusability and increases caller coupling. Grouping into sub-objects would clarify ownership.                                                |
| 2     | #161  | refactor: extract per-tool-panel wiring in MapEditorView into a shared composable                         | PR #158       | Three nearly-identical panel-wiring blocks in MapEditorView will grow with each new tool panel. Requires design decision on composable API shape.                                                                                      |
| 2     | #162  | refactor: deduplicate RoadToolPanel / StreamWallToolPanel structural boilerplate                          | PR #158       | Near-identical structure across both panels; changes to shared chrome must be applied in two places. Low urgency until a third structurally identical panel exists.                                                                    |
| 2     | #159  | perf: deduplicate findNearestEdge call in HexMapOverlay mousemove handler                                 | PR #158       | Two calls per frame on a hot path — once for hoverInfo, once in tooltip lookup. Redundant since hoverInfo already contains nearDir. Low urgency with rAF gate.                                                                         |
| 2     | #160  | perf: add rAF throttle to HexMapOverlay edge-hover path                                                   | PR #158       | Edge-hover state writes trigger Vue re-renders on every mousemove event. Should match the hex-hover rAF pattern from PR #88 before full-density map testing.                                                                           |
| 2     | #152  | refactor: HexMapOverlay mixes declarative overlayConfig with legacy explicit props                        | PR #150       | Two parallel rendering systems increase cognitive overhead. No functional risk now; becomes a maintenance burden as more tools are implemented. Should be resolved after the tool panel migration is complete.                         |
| 2     | #155  | docs: document composable overlap/composition contract (useHexPaintTool/useEdgePaintTool/useClickHexside) | PR #150       | Three composables share overlapping signatures with no documented composition contract. Risk materializes in #137–#142 — a future implementer may wire events incorrectly or duplicate stroke batching.                                |
| 2     | #111  | Hoist `ElevationSystemControls` to `MapEditorView` sibling                                                | PR #109       | `CalibrationControls` now passes `elevationSystem` prop and `elevation-system-change` emit through to the child without any logic. Acceptable interim state, but each future extraction compounds the inert API surface on the parent. |
| 1     | #167  | refactor: reduce HexMapOverlay prop list — consider a single overlayConfig object                         | PR #158       | Flat prop list of 12+ props will grow with each new overlay layer. Aligning the full API around the declarative config pattern is a future clean-up pass.                                                                              |
| 1     | #166  | style: consolidate duplicated scoped CSS across edge tool panels                                          | PR #158       | Same panel chrome CSS copied across three `<style scoped>` blocks. Minor maintenance burden; extract when a fourth panel is added.                                                                                                     |
| 1     | #165  | perf: remove console.assert calls from utils/compass.js hot path                                          | PR #158       | Establishes convention for dev-only diagnostic assertions on hot-path formula functions. The shim no longer has guards; this tracks the future pattern.                                                                                |
| 1     | #164  | perf: memoize wedgePolygonPoints to avoid per-render recomputation                                        | PR #158       | Polygon strings recomputed every render despite corners being stable between calibration changes. Low cost per hex; revisit with full-density maps.                                                                                    |
| 1     | #163  | perf: move inline v-for filter expression to computed in HexMapOverlay                                    | PR #158       | Inline `.filter()` in v-for re-runs on every render and suppresses Vue list-diffing. Negligible cost with current list sizes.                                                                                                          |
| 1     | #154  | fix: ToolChooser item.color is not validated — accepts any string                                         | PR #150       | Silent visual failure (wrong color) when an invalid CSS color string is passed. Low risk since item arrays come from the controlled feature-types.js registry; a typo there would be caught in code review.                            |
| 1     | #112  | Consolidate shared form-input CSS across map editor components                                            | PR #109       | `label` and `input[type='number']` scoped styles are duplicated between `CalibrationControls` and `ElevationSystemControls`. Minor maintenance burden; revisit when a third form-input component is extracted.                         |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
