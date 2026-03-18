# Technical Debt Report — lob-online

_Last updated: 2026-03-18 after PR #113._

---

## Executive Summary

| Metric                           | Value                                                      |
| -------------------------------- | ---------------------------------------------------------- |
| Open debt items                  | 2                                                          |
| Cumulative debt score (net open) | 3                                                          |
| Highest-risk item                | Hoist `ElevationSystemControls` to `MapEditorView` sibling |
| PRs tracked                      | 12                                                         |

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

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Low risk. Minor deferred items with no functional impact.

Current debt (score 3) is limited to two component architecture items: #111 (pass-through prop/emit layer in `CalibrationControls`, score 2) and #112 (duplicated form-input CSS between components, score 1). PR #113 closed all six test-quality debt items (#101–#106) from the hygiene bundle. The remaining items are low-urgency and best addressed when the next component extraction naturally motivates the change.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                          | PR Introduced | Assessment                                                                                                                                                                                                                             |
| ----- | ----- | -------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2     | #111  | Hoist `ElevationSystemControls` to `MapEditorView` sibling     | PR #109       | `CalibrationControls` now passes `elevationSystem` prop and `elevation-system-change` emit through to the child without any logic. Acceptable interim state, but each future extraction compounds the inert API surface on the parent. |
| 1     | #112  | Consolidate shared form-input CSS across map editor components | PR #109       | `label` and `input[type='number']` scoped styles are duplicated between `CalibrationControls` and `ElevationSystemControls`. Minor maintenance burden; revisit when a third form-input component is extracted.                         |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
