# Technical Debt Report — lob-online

_Last updated: 2026-03-18 after PR #131._

---

## Executive Summary

| Metric                           | Value                                                                     |
| -------------------------------- | ------------------------------------------------------------------------- |
| Open debt items                  | 9                                                                         |
| Cumulative debt score (net open) | 17                                                                        |
| Highest-risk item                | Introduce `onHexUpdateBatch` to unify dual mutation paths (#124, score 3) |
| PRs tracked                      | 19                                                                        |

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

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Moderate risk. Some deferred workarounds and sub-optimal patterns that will slow future phases if not addressed.

Current debt (score 17) is concentrated in three areas. First, architectural coupling in the composables layer: the dual mutation paths (#124, score 3) and the oversized `useMapPersistence` API surface (#125, score 3) introduce maintenance risk as the codebase grows toward Phase 2 game logic. Second, incomplete decomposition: `MapEditorView` still carries calibration and export logic (#126, score 3) that wasn't extracted in the PR #122 refactor pass. Third, minor naming and encapsulation issues (#127–#130) that are low urgency today but will accumulate friction when game-logic phases adopt the affected utilities. The two pre-existing elevation architecture items (#111, #112) remain open at low priority. PR #131 resolved #123 (reactive write guard) in-place, reducing net debt by 2.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                              | PR Introduced | Assessment                                                                                                                                                                                                                             |
| ----- | ----- | ------------------------------------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #126  | Extract `useCalibration` and `useMapExport` from `MapEditorView`   | PR #122       | MapEditorView still carries ~378 lines of inline logic despite the extraction of 8 composables. Calibration and export are self-contained concerns that weren't in scope for this PR.                                                  |
| 3     | #125  | Reduce `useMapPersistence` API surface (23 return values)          | PR #122       | 23 return values with push/pull dialog state mixed into a persistence composable. Reduces reusability and increases caller coupling. Grouping into sub-objects would clarify ownership.                                                |
| 3     | #124  | Introduce `onHexUpdateBatch` to unify dual mutation paths          | PR #122       | `applyTrace` and `useBulkOperations` bypass `onHexUpdate` for batch efficiency. If `onHexUpdate` gains side effects (undo history, validation), both batch paths silently skip them — maintenance coupling risk.                       |
| 2     | #130  | Encapsulate `TOOL_PANEL_MODES` inside `useEditorAccordion`         | PR #122       | `TOOL_PANEL_MODES` is imported by the view layer's keyboard handler, leaking accordion internals. An encapsulating method would keep the mode-mapping knowledge inside the composable.                                                 |
| 2     | #111  | Hoist `ElevationSystemControls` to `MapEditorView` sibling         | PR #109       | `CalibrationControls` now passes `elevationSystem` prop and `elevation-system-change` emit through to the child without any logic. Acceptable interim state, but each future extraction compounds the inert API surface on the parent. |
| 1     | #129  | Rename `resolveHex` → `resolveHexOrStub` or add optional fallback  | PR #122       | `resolveHex` silently returns a stub on miss. Name doesn't communicate fallback behavior. Low risk in editor context; becomes misleading when game-logic phases adopt the utility.                                                     |
| 1     | #128  | Add comment explaining double `onHexUpdate` calls in `onEdgeClick` | PR #122       | `onEdgeClick` calls `onHexUpdate` twice (once per hex), scheduling two debounce timers. Debounce handles correctness; a comment or batch path when #124 lands would clarify intent.                                                    |
| 1     | #127  | Deepen `isValidDraft` validation to check known top-level keys     | PR #122       | Current validation checks `hexes` array structure only. Arbitrary extra top-level keys can flow into application state. Low risk given server-side Zod validation, but inconsistent defense-in-depth.                                  |
| 1     | #112  | Consolidate shared form-input CSS across map editor components     | PR #109       | `label` and `input[type='number']` scoped styles are duplicated between `CalibrationControls` and `ElevationSystemControls`. Minor maintenance burden; revisit when a third form-input component is extracted.                         |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
