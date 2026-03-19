# Technical Debt Report — lob-online

_Last updated: 2026-03-19 after PR #145._

---

## Executive Summary

| Metric                           | Value                                                                     |
| -------------------------------- | ------------------------------------------------------------------------- |
| Open debt items                  | 7                                                                         |
| Cumulative debt score (net open) | 17                                                                        |
| Highest-risk item                | Introduce `onHexUpdateBatch` to unify dual mutation paths (#124, score 3) |
| PRs tracked                      | 27                                                                        |

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

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Elevated risk. Several significant deferred items that introduce coupling or architectural compromise. Recommend a debt reduction sprint before the next major phase.

Current debt (score 17) spans three categories. First, architectural coupling in the composables layer: the dual mutation paths (#124, score 3) and the oversized `useMapPersistence` API surface (#125, score 3) introduce maintenance risk as the codebase grows toward Phase 2 game logic. Second, incomplete decomposition: `MapEditorView` still carries calibration and export logic (#126, score 3) that wasn't extracted in the PR #122 refactor pass. Third, schema foundation gaps from PR #145: `HexEditPanel` and `HexMapOverlay` still reference removed fields (#146, score 3), and `EdgeFeature.type` was an open string with no enum constraint (#147, score 2). The two pre-existing elevation architecture items (#111, #112) remain open at low priority.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                            | PR Introduced | Assessment                                                                                                                                                                                                                             |
| ----- | ----- | ---------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #126  | Extract `useCalibration` and `useMapExport` from `MapEditorView` | PR #122       | MapEditorView still carries ~378 lines of inline logic despite the extraction of 8 composables. Calibration and export are self-contained concerns that weren't in scope for this PR.                                                  |
| 3     | #125  | Reduce `useMapPersistence` API surface (23 return values)        | PR #122       | 23 return values with push/pull dialog state mixed into a persistence composable. Reduces reusability and increases caller coupling. Grouping into sub-objects would clarify ownership.                                                |
| 3     | #124  | Introduce `onHexUpdateBatch` to unify dual mutation paths        | PR #122       | `applyTrace` and `useBulkOperations` bypass `onHexUpdate` for batch efficiency. If `onHexUpdate` gains side effects (undo history, validation), both batch paths silently skip them — maintenance coupling risk.                       |
| 3     | #146  | Update HexEditPanel + HexMapOverlay to use new schema fields     | PR #145       | Both components still read removed fields (`hex.features[]`, `hex.hexsides`). Edge features and hex features silently render nothing in the editor until fixed. Functional gap blocking use of migrated data.                          |
| 2     | #147  | Constrain EdgeFeature.type to a z.enum of known types            | PR #145       | `EdgeFeature.type` was an open `z.string()`, allowing unknown type strings to pass schema validation silently. Low immediate impact but undermines the schema as a contract boundary.                                                  |
| 2     | #111  | Hoist `ElevationSystemControls` to `MapEditorView` sibling       | PR #109       | `CalibrationControls` now passes `elevationSystem` prop and `elevation-system-change` emit through to the child without any logic. Acceptable interim state, but each future extraction compounds the inert API surface on the parent. |
| 1     | #112  | Consolidate shared form-input CSS across map editor components   | PR #109       | `label` and `input[type='number']` scoped styles are duplicated between `CalibrationControls` and `ElevationSystemControls`. Minor maintenance burden; revisit when a third form-input component is extracted.                         |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
