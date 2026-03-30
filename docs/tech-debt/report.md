# Technical Debt Report — lob-online

_Last updated: 2026-03-30 after PR #219._

---

## Executive Summary

| Metric                           | Value                                                                |
| -------------------------------- | -------------------------------------------------------------------- |
| Open debt items                  | 13                                                                   |
| Cumulative debt score (net open) | 19                                                                   |
| Highest-risk item                | Extract shared persistence composable for OOB editor (#207, score 3) |
| PRs tracked                      | 64                                                                   |

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
| 2026-03-29 | PR #217                 | 0                    | 95                       |
| 2026-03-29 | PR #218                 | 0                    | 95                       |
| 2026-03-29 | PR #218 (resolved #211) | -3                   | 95                       |
| 2026-03-29 | PR #218 (resolved #209) | -2                   | 95                       |
| 2026-03-29 | PR #218 (resolved #210) | -2                   | 95                       |
| 2026-03-29 | PR #218 (resolved #203) | -2                   | 95                       |
| 2026-03-29 | PR #218 (resolved #202) | -2                   | 95                       |
| 2026-03-30 | PR #219                 | 5                    | 100                      |

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Elevated risk. Several deferred items introduce architectural compromise and sub-optimal patterns that will slow future phases if not addressed.

PR #218 (OOB editor debt sprint) resolved 11 points across 5 items, dropping net open debt from 25 to 14. PR #219 (OOB data model and server routes) added 5 new points across 3 items, bringing net open debt to 19. The single score-3 item is #207 (missing persistence composable), which was partially addressed in PR #218 — push confirmation and structural validation are now in place, but the composable extraction and offline detection remain. Current debt is concentrated in three categories: (1) architectural responsibility placement (#207, #221 — persistence logic embedded in store, open schemas on PUT endpoints); (2) minor async/performance improvements (#220, #210, #209 — all flagged but non-blocking at current scale); and (3) test coverage gaps (#214, #213, #212 — untested guard paths that work correctly today but could regress silently).

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                               | PR Introduced | Assessment                                                                                                                                                                                                                                                                   |
| ----- | ----- | ----------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #207  | Extract shared persistence composable for OOB editor (align with useMapPersistence) | PR #200       | Push confirmation dialog and structural validation (`_isValidSidedShape`) added in PR #218. Remaining: offline detection, persistence composable refactor. The architectural gap (no shared composable with `useMapPersistence`) continues to diverge as the editor matures. |
| 2     | #221  | Apply `.strict()` to OOBSchema and LeadersSchema                                    | PR #219       | Open `z.object()` silently accepts unknown fields on PUT. `_savedAt` stamp added by the server is sent back by clients, so `.strict()` requires adding that field first before applying. Low risk currently since Zod already validates structure.                           |
| 2     | #220  | Async I/O in oobEditor and leadersEditor routes                                     | PR #219       | Synchronous `readFileSync`/`writeFileSync` blocks the event loop on every request. Low urgency for a dev-only tool with no production traffic; test mock migration from sync to `fs.promises` is non-trivial scope.                                                          |
| 2     | #216  | Extend prototype pollution guard to block `toString`/`valueOf`                      | PR #208       | Prototype pollution blocklist omits `toString` and `valueOf`. No current exploit vector since paths come from trusted `findNodePath` output. Defense-in-depth gap to address before `updateField` is exposed to external input.                                              |
| 2     | #214  | Assert `syncError` and `isSyncing` reset on `pullFromServer` failure                | PR #208       | Failure test only asserts no throw; does not verify `syncError` is set or `isSyncing` returns to `false`. A regression would leave the UI in a silent bad state with no user-facing feedback.                                                                                |
| 1     | #222  | Counters upload — use route-level multer middleware                                 | PR #219       | Inline callback handles `MulterError` variants cleanly without a separate error middleware. Pure style finding; no functional impact.                                                                                                                                        |
| 1     | #215  | `OobTreeNode` dual-script pattern — consider `defineOptions()`                      | PR #208       | Uses `<script>` + `<script setup>` for recursive self-reference, violating the project's Options API ban. Standard Vue 3 workaround; resolvable with `defineOptions()` if Vue 3.3+ is confirmed available.                                                                   |
| 1     | #213  | Add `commit()` no-op test when `CounterImageWidget` `nodePath` is null              | PR #208       | The null `nodePath` early-return in `commit()` is untested. Guard exists and works; failure would cause a no-op store call with undefined path.                                                                                                                              |
| 1     | #212  | Add keyboard focus guard test (INPUT/SELECT/TEXTAREA blocks arrow cycling)          | PR #208       | The focus guard in `onKeydown` is untested. Guard exists and is correct; a regression would cause arrow keys to cycle counters while the user types in a form field.                                                                                                         |
| 1     | #206  | Align map/scenario editor routes to use lazy loading like oob-editor                | PR #200       | Map and scenario editor routes use eager imports while the OOB editor uses dynamic import. Consistency improvement only; no functional impact.                                                                                                                               |
| 1     | #205  | useOobStore: consider lazy-loading bundled JSON fallbacks                           | PR #200       | Static imports of oob.json and leaders.json are included in the store chunk even when the server fetch succeeds. Impact is minimal due to lazy-loaded route; noted for future bundle analysis.                                                                               |
| 1     | #204  | OobTreeNode expand/collapse: 200–300 per-instance watchers on shared signals        | PR #200       | Each of ~200 tree nodes installs two watch() calls on injected counter refs. Correct and fast at current scale; flagged for awareness if tree grows to 1000+ nodes.                                                                                                          |
| 1     | #201  | oobTreeTransform: pre-index arty entries for O(1) lookups                           | PR #200       | Nested linear scan in `distributeCorpsArtillery` is O(M×(D+D×B)). No observable impact at South Mountain scale; flagged for awareness if OOB grows significantly.                                                                                                            |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
