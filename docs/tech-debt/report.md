# Technical Debt Report — lob-online

_Last updated: 2026-03-18 after PR #99._

---

## Executive Summary

| Metric                           | Value                                       |
| -------------------------------- | ------------------------------------------- |
| Open debt items                  | 7                                           |
| Cumulative debt score (net open) | 12                                          |
| Highest-risk item                | Extract `ElevationSystemControls` component |
| PRs tracked                      | 2                                           |

---

## Debt Over Time

| Date       | PR     | Debt Added (this PR) | Cumulative Added (gross) |
| ---------- | ------ | -------------------- | ------------------------ |
| 2026-03-18 | PR #98 | 0                    | 0                        |
| 2026-03-18 | PR #99 | 12                   | 12                       |

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Moderate risk. Some deferred workarounds and sub-optimal patterns that will slow future phases if not addressed.

Current debt (score 12) is concentrated in two areas: **component boundary / separation of concerns** (#100: `CalibrationControls` mixing two data domains) and **test quality** (#101, #102, #103, #104, #105, #106: brittle selectors, mutable fixtures, missing edge-case and behavioral coverage). None of the open items are functional correctness hazards — both security-adjacent findings (M2, L1) were fixed in place before merge. The test hygiene items should be addressed before the elevation system gains additional UI surface; the component refactor (#100) is recommended before any `contourInterval` or `unit` fields are added to the calibration panel.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                       | PR Introduced | Assessment                                                                                                                                                                                                                                                           |
| ----- | ----- | ----------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #100  | Extract `ElevationSystemControls` component                 | PR #99        | `CalibrationControls` now owns two unrelated data domains (`gridSpec` and `elevationSystem`) with different persistence semantics and lock behavior. As additional `elevationSystem` fields gain UI, the component will accumulate further misplaced responsibility. |
| 2     | #101  | Replace index-based input selectors with `data-testid`      | PR #99        | Tests select inputs by positional index (`inputs[9]`, `inputs[10]`); any template change silently breaks selectors and can produce false positives. Pattern compounds with each new input added to the component.                                                    |
| 2     | #102  | Replace mutable shared test fixtures with factory functions | PR #99        | `VALID_MAP_WITH_ELEVATION` is a module-level mutable object; two tests already require `JSON.parse(JSON.stringify(...))` workarounds. If a future test forgets the guard, the suite becomes order-dependent and non-deterministic.                                   |
| 2     | #103  | Extend `superRefine` to validate `wedgeElevations`          | PR #99        | Static `±21` bounds on wedge offsets remain independent of the dynamic `elevationLevels` value. A future scenario with fewer levels would allow structurally invalid wedge offsets to pass schema validation silently.                                               |
| 1     | #104  | Behavioral tests for disabled elevation inputs              | PR #99        | Missing behavioral coverage (no-emit when disabled). Low risk since the `disabled` attribute prevents user interaction in practice; mirrors an existing gap on the north picker.                                                                                     |
| 1     | #105  | Cover NaN/empty input in `updateElevationSystem`            | PR #99        | `Number('')` → `0` and `Number('abc')` → `NaN` are passed through without tests documenting the contract. Handler-level validation in `MapEditorView` mitigates downstream risk.                                                                                     |
| 1     | #106  | Assert error path in `superRefine` rejection tests          | PR #99        | Rejection tests only check `result.success === false`; a different schema rule firing would still pass them. Low regression risk given the schema's simplicity.                                                                                                      |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
