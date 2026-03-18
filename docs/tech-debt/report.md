# Technical Debt Report — lob-online

_Last updated: 2026-03-18 after PR #120._

---

## Executive Summary

| Metric                           | Value                                                                      |
| -------------------------------- | -------------------------------------------------------------------------- |
| Open debt items                  | 2                                                                          |
| Cumulative debt score (net open) | 3                                                                          |
| Highest-risk item                | Hoist `ElevationSystemControls` to `MapEditorView` sibling (#111, score 2) |
| PRs tracked                      | 16                                                                         |

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

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Low risk. Minor deferred items with no functional impact.

Current debt (score 3) consists of two low-urgency component architecture items from the elevation system extraction. Item #111 (score 2): `CalibrationControls` acts as a passthrough for `elevationSystem` props it doesn't use — each future extraction compounds the inert API surface. Item #112 (score 1): scoped `label`/`input` CSS is duplicated between `CalibrationControls` and `ElevationSystemControls` — minor maintenance burden, best revisited when a third form-input component is extracted. PR #120 resolved the two highest-priority items (#118 and #119), eliminating all formula duplication and coverage gaps in the hex ID coordinate system.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                          | PR Introduced | Assessment                                                                                                                                                                                                                             |
| ----- | ----- | -------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2     | #111  | Hoist `ElevationSystemControls` to `MapEditorView` sibling     | PR #109       | `CalibrationControls` now passes `elevationSystem` prop and `elevation-system-change` emit through to the child without any logic. Acceptable interim state, but each future extraction compounds the inert API surface on the parent. |
| 1     | #112  | Consolidate shared form-input CSS across map editor components | PR #109       | `label` and `input[type='number']` scoped styles are duplicated between `CalibrationControls` and `ElevationSystemControls`. Minor maintenance burden; revisit when a third form-input component is extracted.                         |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
