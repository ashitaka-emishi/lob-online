# Technical Debt Report — lob-online

_Last updated: 2026-03-18 after PR #117._

---

## Executive Summary

| Metric                           | Value                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| Open debt items                  | 4                                                                                              |
| Cumulative debt score (net open) | 8                                                                                              |
| Highest-risk item                | refactor: extract hexToGameId helper — 3x formula duplication in HexMapOverlay (#118, score 3) |
| PRs tracked                      | 13                                                                                             |

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

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Moderate risk. Some deferred workarounds and sub-optimal patterns that will slow future phases if not addressed.

Current debt (score 8) spans two categories. The highest-priority item is #118 (score 3): the `hexToGameId` formula is duplicated in three locations inside `HexMapOverlay.vue` — this structural pattern was the direct root cause of the off-by-one bug fixed in PR #117, and any future coordinate system change will require three synchronized edits. Closely related is #119 (score 2): the click and right-click handlers share the same formula but have no test coverage, meaning a re-introduced parity bug there would not be caught. The remaining items (#111 score 2, #112 score 1) are lower-urgency component architecture items from the elevation system extraction. Items #118 and #119 are best resolved together in the same refactor track, as extracting the helper structurally eliminates the test gap.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                                     | PR Introduced | Assessment                                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | ----- | ----------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #118  | refactor: extract hexToGameId helper to eliminate 3x formula duplication in HexMapOverlay | PR #117       | The identical `gameCol / gameRow / id` block appears in three locations (`gridData`, `onSvgClick`, `onSvgContextMenu`) and is the direct structural cause of the original bug — an erroneous term propagated silently to all three sites. Any future convention change requires three synchronized edits. A shared `hexToGameId(hex, gridRows)` helper in `hexGeometry.js` would eliminate this risk. |
| 2     | #119  | test: add click/right-click hex ID coverage for HexMapOverlay coordinate formula          | PR #117       | The new regression test validates only the rendered-label (`gridData`) path. The two click handlers each contain their own independent copy of the formula with no test coverage. A re-introduced parity bug in only those handlers would go undetected — the display would be correct but clicks would emit wrong hex IDs. Resolving #118 would eliminate this gap structurally.                     |
| 2     | #111  | Hoist `ElevationSystemControls` to `MapEditorView` sibling                                | PR #109       | `CalibrationControls` now passes `elevationSystem` prop and `elevation-system-change` emit through to the child without any logic. Acceptable interim state, but each future extraction compounds the inert API surface on the parent.                                                                                                                                                                |
| 1     | #112  | Consolidate shared form-input CSS across map editor components                            | PR #109       | `label` and `input[type='number']` scoped styles are duplicated between `CalibrationControls` and `ElevationSystemControls`. Minor maintenance burden; revisit when a third form-input component is extracted.                                                                                                                                                                                        |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
