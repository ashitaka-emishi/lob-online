# Technical Debt Report — lob-online

_Last updated: 2026-03-26 after PR #208._

---

## Executive Summary

| Metric                           | Value                                                   |
| -------------------------------- | ------------------------------------------------------- |
| Open debt items                  | 15                                                      |
| Cumulative debt score (net open) | 25                                                      |
| Highest-risk item                | auto-commit on first counter slot click (#211, score 3) |
| PRs tracked                      | 61                                                      |

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
| 2026-03-26 | PR #208                 | 14                   | 95                       |

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Elevated risk. Several significant deferred items that introduce coupling or architectural compromise. Recommend a debt reduction sprint before the next major phase.

PR #208 (OOB Editor Detail Panel & Counter Image Widget) added 14 points across 8 items, bringing net open debt to 25. The two score-3 items are #211 (auto-commit on counter slot click — unexpected data mutation on inspect-only interaction, no undo) and #207 (OOB persistence logic embedded in the store rather than a composable). Current debt is concentrated in three categories: (1) UX correctness — the auto-commit design creates silent data writes the user cannot reverse without manual intervention; (2) architectural responsibility placement — `usedFiles` (#209) and `selectedNodePath` (#210) perform tree walks in the wrong layer, both resolvable before the OOB editor handles significantly larger datasets; and (3) test coverage gaps — focus guard, null-path commit, and `syncError` assertions are missing but the underlying code paths are guarded. The two score-2 architecture items (#209, #210) share a root cause: the store lacks a path index and a shared `usedFiles` derivation, which will compound as the editor grows.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                               | PR Introduced | Assessment                                                                                                                                                                                                                                                                                                                                  |
| ----- | ----- | ----------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #211  | auto-commit on first counter slot click (no preview-only mode)                      | PR #208       | Clicking an empty slot immediately persists the first available counter to the store with no undo mechanism. Intent was visual preview, but `commit()` writes to the store. User must manually clear to undo an inspection click.                                                                                                           |
| 3     | #207  | Extract shared persistence composable for OOB editor (align with useMapPersistence) | PR #200       | The OOB store embeds persistence logic that diverges from the established `useMapPersistence` composable pattern. Missing: confirmation dialogs (#203), offline detection, data validation (#202). This architectural gap will require resolution before Phase 2 (editing) to avoid duplication and missing safety checks in the edit flow. |
| 2     | #216  | Extend prototype pollution guard to block `toString`/`valueOf`                      | PR #208       | Prototype pollution blocklist omits `toString` and `valueOf`. No current exploit vector since paths come from trusted `findNodePath` output. Defense-in-depth gap to address before `updateField` is exposed to external input.                                                                                                             |
| 2     | #214  | Assert `syncError` and `isSyncing` reset on `pullFromServer` failure                | PR #208       | Failure test only asserts no throw; does not verify `syncError` is set or `isSyncing` returns to `false`. A regression would leave the UI in a silent bad state with no user-facing feedback.                                                                                                                                               |
| 2     | #210  | Pass `nodePath` through `selectNode` to avoid full tree-walk on each click          | PR #208       | `selectedNodePath` re-walks the full OOB tree on every selection and every field mutation. O(n) lookup where O(1) is achievable by threading path through `selectNode`. Negligible at current data size.                                                                                                                                    |
| 2     | #209  | Hoist `usedFiles` computed from `CounterImageWidget` into `useOobStore`             | PR #208       | `usedFiles` is per-widget-instance, walking the full OOB+leaders tree on every reactive change. Store-level knowledge placed in a leaf component. No active perf issue at current scale, but misplaced responsibility.                                                                                                                      |
| 2     | #203  | OOB editor push/pull — add confirmation dialogs                                     | PR #200       | Clicking Push immediately overwrites the server's oob.json/leaders.json with no warning. Data is git-tracked so recovery is possible, but the UX gap is inconsistent with the map editor's confirmation flow.                                                                                                                               |
| 2     | #202  | Add schema validation for localStorage and API responses in useOobStore             | PR #200       | Parsed data bypasses Zod schema validation used by the server. Risk is low (dev-only tool, no production exposure, no XSS vector via auto-escaped templates), but malformed localStorage values could cause runtime errors.                                                                                                                 |
| 1     | #215  | `OobTreeNode` dual-script pattern — consider `defineOptions()`                      | PR #208       | Uses `<script>` + `<script setup>` for recursive self-reference, violating the project's Options API ban. Standard Vue 3 workaround; resolvable with `defineOptions()` if Vue 3.3+ is confirmed available.                                                                                                                                  |
| 1     | #213  | Add `commit()` no-op test when `CounterImageWidget` `nodePath` is null              | PR #208       | The null `nodePath` early-return in `commit()` is untested. Guard exists and works; failure would cause a no-op store call with undefined path.                                                                                                                                                                                             |
| 1     | #212  | Add keyboard focus guard test (INPUT/SELECT/TEXTAREA blocks arrow cycling)          | PR #208       | The focus guard in `onKeydown` is untested. Guard exists and is correct; a regression would cause arrow keys to cycle counters while the user types in a form field.                                                                                                                                                                        |
| 1     | #206  | Align map/scenario editor routes to use lazy loading like oob-editor                | PR #200       | Map and scenario editor routes use eager imports while the OOB editor uses dynamic import. Consistency improvement only; no functional impact.                                                                                                                                                                                              |
| 1     | #205  | useOobStore: consider lazy-loading bundled JSON fallbacks                           | PR #200       | Static imports of oob.json and leaders.json are included in the store chunk even when the server fetch succeeds. Impact is minimal due to lazy-loaded route; noted for future bundle analysis.                                                                                                                                              |
| 1     | #204  | OobTreeNode expand/collapse: 200–300 per-instance watchers on shared signals        | PR #200       | Each of ~200 tree nodes installs two watch() calls on injected counter refs. Correct and fast at current scale; flagged for awareness if tree grows to 1000+ nodes.                                                                                                                                                                         |
| 1     | #201  | oobTreeTransform: pre-index arty entries for O(1) lookups                           | PR #200       | Nested linear scan in `distributeCorpsArtillery` is O(M×(D+D×B)). No observable impact at South Mountain scale; flagged for awareness if OOB grows significantly.                                                                                                                                                                           |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
