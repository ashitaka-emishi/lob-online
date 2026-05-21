# Technical Debt Report — lob-online

_Last updated: 2026-05-21 after PR #400._

---

## Executive Summary

| Metric                           | Value                                                                  |
| -------------------------------- | ---------------------------------------------------------------------- |
| Open debt items                  | 14                                                                     |
| Cumulative debt score (net open) | 24                                                                     |
| Highest-risk item                | Extract OOB enrichment from GameView into a composable (#401, score 3) |
| PRs tracked                      | 175                                                                    |

---

## Debt Over Time

| Date       | PR                      | Debt Added (this PR) | Net Delta | Cumulative Added (gross) |
| ---------- | ----------------------- | -------------------- | --------- | ------------------------ |
| 2026-03-18 | PR #98                  | 0                    | 0         | 0                        |
| 2026-03-18 | PR #99                  | 12                   | +12       | 12                       |
| 2026-03-18 | PR #107                 | 0                    | 0         | 12                       |
| 2026-03-18 | PR #108                 | 0                    | 0         | 12                       |
| 2026-03-18 | PR #109 (resolved #100) | 3                    | +3        | 15                       |
| 2026-03-18 | PR #113                 | 0                    | -9        | 15                       |
| 2026-03-18 | PR #113 (resolved #101) | -2                   | —         | 15                       |
| 2026-03-18 | PR #113 (resolved #102) | -2                   | —         | 15                       |
| 2026-03-18 | PR #113 (resolved #103) | -2                   | —         | 15                       |
| 2026-03-18 | PR #113 (resolved #104) | -1                   | —         | 15                       |
| 2026-03-18 | PR #113 (resolved #105) | -1                   | —         | 15                       |
| 2026-03-18 | PR #113 (resolved #106) | -1                   | —         | 15                       |
| 2026-03-18 | PR #117                 | 5                    | +5        | 20                       |
| 2026-03-18 | PR #120                 | 0                    | -5        | 20                       |
| 2026-03-18 | PR #120 (resolved #118) | -3                   | —         | 20                       |
| 2026-03-18 | PR #120 (resolved #119) | -2                   | —         | 20                       |
| 2026-03-18 | PR #121                 | 0                    | 0         | 20                       |
| 2026-03-18 | PR #122                 | 16                   | +16       | 36                       |
| 2026-03-18 | PR #131                 | 0                    | -2        | 36                       |
| 2026-03-18 | PR #131 (resolved #123) | -2                   | —         | 36                       |
| 2026-03-18 | PR #132                 | 0                    | -5        | 36                       |
| 2026-03-18 | PR #132 (resolved #130) | -2                   | —         | 36                       |
| 2026-03-18 | PR #132 (resolved #129) | -1                   | —         | 36                       |
| 2026-03-18 | PR #132 (resolved #128) | -1                   | —         | 36                       |
| 2026-03-18 | PR #132 (resolved #127) | -1                   | —         | 36                       |
| 2026-03-18 | PR #134                 | 0                    | 0         | 36                       |
| 2026-03-19 | PR #145                 | 5                    | +5        | 41                       |
| 2026-03-19 | PR #148 (resolved #146) | -3                   | -5        | 41                       |
| 2026-03-19 | PR #148 (resolved #147) | -2                   | —         | 41                       |
| 2026-03-19 | PR #150                 | 11                   | +8        | 52                       |
| 2026-03-19 | PR #150 (resolved #124) | -3                   | —         | 52                       |
| 2026-03-22 | PR #158                 | 13                   | +13       | 65                       |
| 2026-03-22 | PR #168                 | 3                    | -3        | 68                       |
| 2026-03-22 | PR #168 (resolved #159) | -2                   | —         | 68                       |
| 2026-03-22 | PR #168 (resolved #160) | -2                   | —         | 68                       |
| 2026-03-22 | PR #168 (resolved #163) | -1                   | —         | 68                       |
| 2026-03-22 | PR #168 (resolved #164) | -1                   | —         | 68                       |
| 2026-03-22 | PR #171                 | 0                    | -8        | 68                       |
| 2026-03-22 | PR #171 (resolved #152) | -2                   | —         | 68                       |
| 2026-03-22 | PR #171 (resolved #153) | -3                   | —         | 68                       |
| 2026-03-22 | PR #171 (resolved #155) | -2                   | —         | 68                       |
| 2026-03-22 | PR #171 (resolved #167) | -1                   | —         | 68                       |
| 2026-03-23 | PR #173                 | 0                    | -9        | 68                       |
| 2026-03-23 | PR #173 (resolved #111) | -2                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #112) | -1                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #154) | -1                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #162) | -2                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #165) | -1                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #166) | -1                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #170) | -1                   | —         | 68                       |
| 2026-03-23 | PR #174                 | 2                    | -4        | 70                       |
| 2026-03-23 | PR #174 (resolved #126) | -3                   | —         | 70                       |
| 2026-03-23 | PR #174 (resolved #125) | -3                   | —         | 70                       |
| 2026-03-23 | PR #177                 | 0                    | 0         | 70                       |
| 2026-03-23 | PR #178                 | 0                    | -9        | 70                       |
| 2026-03-23 | PR #178 (resolved #151) | -3                   | —         | 70                       |
| 2026-03-23 | PR #178 (resolved #161) | -2                   | —         | 70                       |
| 2026-03-23 | PR #178 (resolved #169) | -2                   | —         | 70                       |
| 2026-03-23 | PR #178 (resolved #175) | -1                   | —         | 70                       |
| 2026-03-23 | PR #178 (resolved #176) | -1                   | —         | 70                       |
| 2026-03-25 | PR #200                 | 11                   | +11       | 81                       |
| 2026-03-26 | PR #208                 | 14                   | +14       | 95                       |
| 2026-03-29 | PR #217                 | 0                    | 0         | 95                       |
| 2026-03-29 | PR #218                 | 0                    | -11       | 95                       |
| 2026-03-29 | PR #218 (resolved #211) | -3                   | —         | 95                       |
| 2026-03-29 | PR #218 (resolved #209) | -2                   | —         | 95                       |
| 2026-03-29 | PR #218 (resolved #210) | -2                   | —         | 95                       |
| 2026-03-29 | PR #218 (resolved #203) | -2                   | —         | 95                       |
| 2026-03-29 | PR #218 (resolved #202) | -2                   | —         | 95                       |
| 2026-03-30 | PR #219                 | 5                    | +5        | 100                      |
| 2026-03-31 | PR #223                 | 0                    | 0         | 100                      |
| 2026-04-02 | PR #227                 | 0                    | 0         | 100                      |
| 2026-04-03 | PR #236                 | 30                   | +30       | 130                      |
| 2026-04-03 | PR #252                 | 12                   | -8        | 142                      |
| 2026-04-03 | PR #252 (resolved #250) | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #249) | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #244) | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #248) | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #246) | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #243) | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #240) | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #239) | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #238) | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #222) | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #215) | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #213) | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #212) | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #206) | -1                   | —         | 142                      |
| 2026-04-10 | PR #262                 | 0                    | -25       | 142                      |
| 2026-04-10 | PR #262 (resolved #207) | -3                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #258) | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #257) | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #254) | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #253) | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #251) | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #242) | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #241) | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #221) | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #220) | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #216) | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #214) | -2                   | —         | 142                      |
| 2026-04-11 | PR #283                 | 27                   | +27       | 169                      |
| 2026-04-12 | PR #297                 | 17                   | +17       | 186                      |
| 2026-04-12 | PR #305                 | 6                    | +6        | 192                      |
| 2026-04-14 | PR #312                 | 0                    | -19       | 192                      |
| 2026-04-14 | PR #312 (resolved #303) | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #302) | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #300) | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #289) | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #288) | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #284) | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #307) | -1                   | —         | 192                      |
| 2026-04-15 | PR #313                 | 0                    | -19       | 192                      |
| 2026-04-15 | PR #313 (resolved #285) | -2                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #287) | -2                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #296) | -2                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #290) | -2                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #308) | -1                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #260) | -1                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #237) | -3                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #245) | -3                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #247) | -3                   | —         | 192                      |
| 2026-04-27 | PR #315                 | 4                    | -17       | 196                      |
| 2026-04-27 | PR #315 (resolved #304) | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #301) | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #299) | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #298) | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #292) | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #291) | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #311) | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #310) | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #309) | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #306) | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #293) | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #286) | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #259) | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #256) | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #255) | -1                   | —         | 196                      |
| 2026-05-05 | PR #328                 | 34                   | +34       | 230                      |
| 2026-05-06 | PR #339                 | 4                    | -28       | 234                      |
| 2026-05-06 | PR #339 (resolved #332) | -5                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #329) | -4                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #330) | -4                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #333) | -4                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #334) | -3                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #331) | -3                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #335) | -3                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #336) | -3                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #338) | -3                   | —         | 234                      |
| 2026-05-08 | PR #359                 | 29                   | +29       | 263                      |
| 2026-05-12 | PR #375                 | 16                   | +16       | 279                      |
| 2026-05-13 | PR #386                 | 5                    | -2        | 284                      |
| 2026-05-13 | PR #386 (resolved #377) | -2                   | —         | 284                      |
| 2026-05-13 | PR #386 (resolved #378) | -2                   | —         | 284                      |
| 2026-05-13 | PR #386 (resolved #380) | -2                   | —         | 284                      |
| 2026-05-13 | PR #386 (resolved #384) | -1                   | —         | 284                      |
| 2026-05-18 | PR #391                 | 0                    | -17       | 284                      |
| 2026-05-18 | PR #391 (resolved #362) | -3                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #365) | -2                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #366) | -1                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #367) | -2                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #368) | -2                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #369) | -2                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #372) | -1                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #388) | -2                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #389) | -2                   | —         | 284                      |
| 2026-05-18 | PR #392                 | 7                    | +7        | 291                      |
| 2026-05-18 | PR #392 (added #393)    | +4                   | —         | 291                      |
| 2026-05-18 | PR #392 (added #394)    | +3                   | —         | 291                      |
| 2026-05-20 | PR #395                 | 0                    | -10       | 291                      |
| 2026-05-20 | PR #395 (resolved #393) | -4                   | —         | 291                      |
| 2026-05-20 | PR #395 (resolved #394) | -3                   | —         | 291                      |
| 2026-05-20 | PR #395 (resolved #322) | -2                   | —         | 291                      |
| 2026-05-20 | PR #395 (resolved #370) | -1                   | —         | 291                      |
| 2026-05-20 | PR #396                 | 0                    | 0         | 291                      |
| 2026-05-21 | PR #397                 | 0                    | -7        | 291                      |
| 2026-05-21 | PR #397 (resolved #324) | -2                   | —         | 291                      |
| 2026-05-21 | PR #397 (resolved #295) | -2                   | —         | 291                      |
| 2026-05-21 | PR #397 (resolved #294) | -2                   | —         | 291                      |
| 2026-05-21 | PR #397 (resolved #201) | -1                   | —         | 291                      |
| 2026-05-21 | PR #400                 | 8                    | +8        | 299                      |

_One row is appended per PR cycle by `/tech-debt-report`. "Net Delta" = debt added minus debt closed per PR (negative = net improvement); populated on main PR rows only, "—" on resolution sub-rows. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Elevated risk. Several significant deferred items that introduce coupling or architectural compromise. Recommend a debt reduction sprint before the next major phase.

PR #400 added 8 points (4 new items) to the register, raising the net open score from 16 to 24. The highest-risk new item is #401 (score 3): OOB enrichment logic is currently embedded in `GameView.vue` and will need to be duplicated or refactored as M6/M7 add additional game views. The remaining three new items are score ≤2: inconsistent fetch strategies (#402), missing CSP headers (#403), and a testability gap resolved by #401 (#404). The 10 pre-existing items are unchanged: four M6-blocked engine stubs (#379, #381, #382, #383), two hygiene items (#346, #350 deferred to M8), and four minor items (#205, #204, #387, #385). The "Elevated" classification remains appropriate. Recommended resolution paths: #401 in a dedicated `useOobData` composable track before M6 views are added; #402 and #403 at M8 auth hardening; #346 in a test-hygiene sprint.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                        | PR Introduced | Assessment                                                                                                                                                                                                              |
| ----- | ----- | ---------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #401  | Extract OOB enrichment from GameView into a composable                       | PR #400       | OOB fetch + walk + computed live in the view layer. Any future game view (M6, M7) that needs OOB metadata will duplicate this logic. Extraction to `useOobData.js` resolves it cleanly.                                 |
| 2     | #402  | Unify GameView.vue fetch strategies (store vs raw fetch)                     | PR #400       | Three different loading patterns in one `onMounted`: store action, raw fetch ×2. Low coupling risk today; natural resolution at M8 when dev-tool endpoints are replaced by production routes.                           |
| 2     | #403  | Add Content-Security-Policy headers to Express server                        | PR #400       | No CSP on the Express server. Low risk in dev-only deployment; becomes meaningful when M8 ships public upload routes. Address with `helmet()` at M8 auth hardening.                                                     |
| 2     | #379  | getValidActions should enumerate all legal actions for current state         | PR #375       | Returns stubs by design at M5 depth; full enumeration requires unit/leader position data from the game map UI. Deferred to M6 game map track.                                                                           |
| 2     | #381  | Implement Attack Recovery step handler (LOB §10.6b)                          | PR #375       | Correctly stubbed at M5; requires combat result data (stopped attack orders) from M6 combat track. No game-correctness impact until attack orders can be stopped.                                                       |
| 2     | #382  | Implement Fluke Stoppage step handler (LOB §10.7)                            | PR #375       | Requires accepted attack order data from M6. No impact at M5 depth.                                                                                                                                                     |
| 2     | #383  | Implement Rally Phase handler with per-unit rally rolls (LOB §6.3)           | PR #375       | Requires morale state tracking (DG/Routed units) from M6. No units qualify at M5 depth. Safe stub.                                                                                                                      |
| 2     | #350  | server: add rate limiting on POST /api/v1/games routes                       | PR #348       | POST /api/v1/games and POST /:id/join have no per-IP rate limit. UUID unguessability mitigates enumeration risk pre-M8. Deferred to M8 auth hardening alongside OAuth; not blocking for dev/testing phases.             |
| 2     | #346  | test: consolidate low-risk overlapping coverage                              | PR #348       | Table-test panels, editor routes, and compass utils have overlapping assertions. Safe maintenance cleanup — consolidate to composable-level tests, trim per-panel/per-route duplication. No production behavior change. |
| 1     | #404  | Extract `_collectOobUnits` for unit-testability                              | PR #400       | Module-private function in `GameView.vue`; only exercised via integration tests. Naturally resolved when #401 (useOobData composable) is implemented.                                                                   |
| 1     | #205  | useOobStore: consider lazy-loading bundled JSON fallbacks                    | PR #200       | Static imports of oob.json and leaders.json are included in the store chunk even when the server fetch succeeds. Impact is minimal due to lazy-loaded route; noted for future bundle analysis.                          |
| 1     | #204  | OobTreeNode expand/collapse: 200–300 per-instance watchers on shared signals | PR #200       | Each of ~200 tree nodes installs two watch() calls on injected counter refs. Correct and fast at current scale; flagged for awareness if tree grows to 1000+ nodes.                                                     |
| 1     | #387  | playerSide in dispatch must be sourced from session, not request body        | PR #386       | No action endpoint exists yet (#356); the session-to-side mapping is a route-layer responsibility. Enforce at the route boundary when #356 is implemented.                                                              |
| 1     | #385  | Add property-based / fuzz tests for dispatch round-trips                     | PR #375       | Nice-to-have for a rules engine; not blocking. No correctness impact; no milestone assigned.                                                                                                                            |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
