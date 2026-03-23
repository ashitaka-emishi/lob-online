# Technical Debt Report — lob-online

_Last updated: 2026-03-23 after PR #177._

---

## Executive Summary

| Metric                           | Value                                                                       |
| -------------------------------- | --------------------------------------------------------------------------- |
| Open debt items                  | 5                                                                           |
| Cumulative debt score (net open) | 9                                                                           |
| Highest-risk item                | gridData rebuilds full cell array on any calibration change (#151, score 3) |
| PRs tracked                      | 53                                                                          |

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
| 2026-03-23 | PR #173                 | 0                    | 68                       |
| 2026-03-23 | PR #173 (resolved #111) | -2                   | 68                       |
| 2026-03-23 | PR #173 (resolved #112) | -1                   | 68                       |
| 2026-03-23 | PR #173 (resolved #154) | -1                   | 68                       |
| 2026-03-23 | PR #173 (resolved #162) | -2                   | 68                       |
| 2026-03-23 | PR #173 (resolved #165) | -1                   | 68                       |
| 2026-03-23 | PR #173 (resolved #166) | -1                   | 68                       |
| 2026-03-23 | PR #173 (resolved #170) | -1                   | 68                       |
| 2026-03-23 | PR #174                 | 2                    | 70                       |
| 2026-03-23 | PR #174 (resolved #126) | -3                   | 70                       |
| 2026-03-23 | PR #174 (resolved #125) | -3                   | 70                       |
| 2026-03-23 | PR #177                 | 0                    | 70                       |

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Moderate risk. Some deferred workarounds and sub-optimal patterns that will slow future phases if not addressed.

Current debt (score 9) is distributed across three priority levels. One score-3 item remains: `gridData` full-rebuild on calibration changes (#151), a performance issue requiring a non-trivial geometry/cell split. Two score-2 structural items: per-tool-panel wiring composable extraction (#161) and the `cellsForEdges` composable (#169). Two new score-1 items from PR #174 team review are theoretical-only: `stripPrivateFields` depth limit (#175) and `onCalibrationChange` write-path validation asymmetry (#176). PR #174 closed six net score points by resolving #125 and #126 (the MapEditorView extraction and useMapPersistence grouping items).

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                               | PR Introduced | Assessment                                                                                                                                                                                                                                                                                                                                                     |
| ----- | ----- | ----------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #151  | perf: gridData rebuilds full cell array on any calibration change                   | PR #150       | ~2,240 cell objects rebuild on any calibration field change including strokeWidth/northOffset nudges. Causes visible lag on slower machines. Fix requires splitting gridData into geometry + cell layers — non-trivial refactor.                                                                                                                               |
| 2     | #161  | refactor: extract per-tool-panel wiring in MapEditorView into a shared composable   | PR #158       | Three nearly-identical panel-wiring blocks in MapEditorView will grow with each new tool panel. Requires design decision on composable API shape.                                                                                                                                                                                                              |
| 2     | #169  | refactor: extract cellsForEdges into useEdgeLineLayer composable                    | PR #168       | `cellsForEdges` invalidates on any `gridData` change (including LOS/selection state) because it depends on `cells`, downstream of the monolithic `gridData` computed. The structure encodes the template's nested v-for shape in script setup. Natural fit for extraction into `useEdgeLineLayer(cells, overlayConfig)` during overlay-arch-refactor_20260322. |
| 1     | #175  | perf: add depth limit to stripPrivateFields to prevent deep-walk on malformed input | PR #174       | `stripPrivateFields` has no recursion depth guard. No exploit path exists — all callers pass Zod-validated mapData with bounded nesting. Theoretical risk only; defer until a practical need emerges.                                                                                                                                                          |
| 1     | #176  | refactor: add write-path validation to onCalibrationChange in useCalibration        | PR #174       | `onCalibrationChange` writes to localStorage without running the same `safeNumeric`/`safeBoolean`/`safeOrientation` guards used on the read path. Internal API with a single trusted caller. Acceptable asymmetry for now.                                                                                                                                     |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
