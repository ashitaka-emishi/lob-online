# Technical Debt Report — lob-online

_Last updated: 2026-03-25 after PR #200._

---

## Executive Summary

| Metric                           | Value                                        |
| -------------------------------- | -------------------------------------------- |
| Open debt items                  | 7                                            |
| Cumulative debt score (net open) | 11                                           |
| Highest-risk item                | Extract shared persistence composable (#207) |
| PRs tracked                      | 60                                           |

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
| 2026-03-23 | PR #178 (resolved #151) | -3                   | 70                       |
| 2026-03-23 | PR #178 (resolved #161) | -2                   | 70                       |
| 2026-03-23 | PR #178 (resolved #169) | -2                   | 70                       |
| 2026-03-23 | PR #178 (resolved #175) | -1                   | 70                       |
| 2026-03-23 | PR #178 (resolved #176) | -1                   | 70                       |
| 2026-03-23 | PR #178                 | 0                    | 70                       |
| 2026-03-25 | PR #200                 | 11                   | 81                       |

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Moderate risk. Some deferred workarounds and sub-optimal patterns that will slow future phases if not addressed.

PR #200 (OOB Editor Foundation) introduced 11 points of net debt across 7 items, bringing the register out of its clean state. The most significant item is #207 (score 3): the OOB editor's persistence logic is embedded directly in a Pinia store rather than a dedicated composable, diverging from the `useMapPersistence` pattern established by the map editor. This gap will require resolution before Phase 2 (editing) can be added safely — it is the prerequisite for confirmation dialogs (#203) and schema validation (#202). The remaining 5 items (scores 1–2) are low-priority housekeeping: performance observations that are negligible at current scale, and minor consistency gaps in routing and bundle loading.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                               | PR Introduced | Assessment                                                                                                                                                                                                                                                                                                                                  |
| ----- | ----- | ----------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #207  | Extract shared persistence composable for OOB editor (align with useMapPersistence) | PR #200       | The OOB store embeds persistence logic that diverges from the established `useMapPersistence` composable pattern. Missing: confirmation dialogs (#203), offline detection, data validation (#202). This architectural gap will require resolution before Phase 2 (editing) to avoid duplication and missing safety checks in the edit flow. |
| 2     | #203  | OOB editor push/pull — add confirmation dialogs                                     | PR #200       | Clicking Push immediately overwrites the server's oob.json/leaders.json with no warning. Data is git-tracked so recovery is possible, but the UX gap is inconsistent with the map editor's confirmation flow.                                                                                                                               |
| 2     | #202  | Add schema validation for localStorage and API responses in useOobStore             | PR #200       | Parsed data bypasses Zod schema validation used by the server. Risk is low (dev-only tool, no production exposure, no XSS vector via auto-escaped templates), but malformed localStorage values could cause runtime errors.                                                                                                                 |
| 1     | #206  | Align map/scenario editor routes to use lazy loading like oob-editor                | PR #200       | Map and scenario editor routes use eager imports while the OOB editor uses dynamic import. Consistency improvement only; no functional impact.                                                                                                                                                                                              |
| 1     | #205  | useOobStore: consider lazy-loading bundled JSON fallbacks                           | PR #200       | Static imports of oob.json and leaders.json are included in the store chunk even when the server fetch succeeds. Impact is minimal due to lazy-loaded route; noted for future bundle analysis.                                                                                                                                              |
| 1     | #204  | OobTreeNode expand/collapse: 200–300 per-instance watchers on shared signals        | PR #200       | Each of ~200 tree nodes installs two watch() calls on injected counter refs. Correct and fast at current scale; flagged for awareness if tree grows to 1000+ nodes.                                                                                                                                                                         |
| 1     | #201  | oobTreeTransform: pre-index arty entries for O(1) lookups                           | PR #200       | Nested linear scan in `distributeCorpsArtillery` is O(M×(D+D×B)). No observable impact at South Mountain scale; flagged for awareness if OOB grows significantly.                                                                                                                                                                           |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
