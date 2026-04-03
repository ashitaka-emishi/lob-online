# Technical Debt Report — lob-online

_Last updated: 2026-04-03 after PR #252._

---

## Executive Summary

| Metric                           | Value                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Open debt items                  | 22                                                                                        |
| Cumulative debt score (net open) | 41                                                                                        |
| Highest-risk item                | test(useOobPersistence): add dedicated test coverage for succession paths (#247, score 3) |
| PRs tracked                      | 88                                                                                        |

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
| 2026-03-31 | PR #223                 | 0                    | 100                      |
| 2026-04-02 | PR #227                 | 0                    | 100                      |
| 2026-04-03 | PR #236                 | 30                   | 130                      |
| 2026-04-03 | PR #252                 | 12                   | 142                      |
| 2026-04-03 | PR #252 (resolved #250) | -1                   | 142                      |
| 2026-04-03 | PR #252 (resolved #249) | -1                   | 142                      |
| 2026-04-03 | PR #252 (resolved #244) | -1                   | 142                      |
| 2026-04-03 | PR #252 (resolved #248) | -2                   | 142                      |
| 2026-04-03 | PR #252 (resolved #246) | -2                   | 142                      |
| 2026-04-03 | PR #252 (resolved #243) | -2                   | 142                      |
| 2026-04-03 | PR #252 (resolved #240) | -2                   | 142                      |
| 2026-04-03 | PR #252 (resolved #239) | -2                   | 142                      |
| 2026-04-03 | PR #252 (resolved #238) | -2                   | 142                      |
| 2026-04-03 | PR #252 (resolved #222) | -1                   | 142                      |
| 2026-04-03 | PR #252 (resolved #215) | -1                   | 142                      |
| 2026-04-03 | PR #252 (resolved #213) | -1                   | 142                      |
| 2026-04-03 | PR #252 (resolved #212) | -1                   | 142                      |
| 2026-04-03 | PR #252 (resolved #206) | -1                   | 142                      |

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

High risk. Critical or significant deferred items pose a threat to production stability or block future work. Immediate attention recommended.

PR #252 (quick debt cleanup — score-1 trivials and PR #236 test gaps) resolved 20 points of debt (14 items: 9 explicitly implemented + 5 confirmed pre-existing), reducing net open debt from 49 to 41. The 8 newly deferred items (12 points) are all minor architectural and test hygiene issues surfaced during the PR #252 team-review.

Three score-3 items remain the primary risk: #247 (no `useOobPersistence.test.js` — core data I/O composable with untested partial-failure paths), #245 (three near-verbatim copies of editor-route backup logic), and #237 (`processUSACavDiv` bypasses `withLeader`, preventing Farnsworth succession variants from ever rendering). These should be addressed before game engine implementation begins.

Current debt is concentrated in two categories: (1) **architectural gaps and duplication** (#247 missing composable tests, #245 editor-route factory, #237 withLeader bypass, #257 client/server schema contract, #253/#254 test fixture and mock coupling); (2) **schema hardening gaps** (#258/#259 specialRules unbounded values and string length, #251 non-atomic writes, #242 shared CommandLevel enum). The test coverage debt from PR #236 has been substantially reduced by PR #252.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                                                      | PR Introduced | Assessment                                                                                                                                                                                                                                                                                                           |
| ----- | ----- | ---------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #247  | test(useOobPersistence): add dedicated test coverage for succession paths                                  | PR #236       | No `useOobPersistence.test.js`. Core composable for all data I/O extended in PR #236 with no dedicated tests. Untested: `_isValidSuccessionShape` rejection, localStorage partial load, push skipping null succession, pull with succession endpoint down. Partial-failure paths could silently corrupt store state. |
| 3     | #245  | refactor(server/routes): extract editorRouteFactory                                                        | PR #236       | `successionEditor.js` is the third near-verbatim copy of `leadersEditor.js`. Backup rotation logic duplicated across 3 route files. A bug fix must be applied independently in each. Third copy is the standard extraction threshold.                                                                                |
| 3     | #237  | fix(oobTreeTransform): processUSACavDiv should delegate to withLeader                                      | PR #236       | `processUSACavDiv` inlines variant-attachment logic; Farnsworth has no variant support at all. Any future change to `withLeader` silently diverges. Succession variants for Farnsworth will never render until fixed.                                                                                                |
| 3     | #207  | Extract shared persistence composable for OOB editor (align with useMapPersistence)                        | PR #200       | Push confirmation dialog and structural validation (`_isValidSidedObjectShape`) added in PR #218. Remaining: offline detection, persistence composable refactor. The architectural gap (no shared composable with `useMapPersistence`) continues to diverge as the editor matures.                                   |
| 2     | #258  | refactor(succession.schema): constrain specialRules value type from z.unknown()                            | PR #252       | `z.record(z.string(), z.unknown())` accepts arbitrarily large/nested payloads. Strict top-level schema does not constrain values inside `specialRules`. Dev-only tool, low urgency.                                                                                                                                  |
| 2     | #257  | refactor(useOobPersistence): enforce cross-layer contract between client validators and server Zod schemas | PR #252       | No automated mechanism to catch divergence between `_isValidSidedObjectShape`/`_isValidSuccessionShape` and the server Zod schemas. A server schema change produces no client test failure.                                                                                                                          |
| 2     | #254  | test(useOobStore): match mockFetch on URL instead of call ordinal                                          | PR #252       | Ordinal matching couples tests to internal fetch call order. If the store reorders fetches, tests silently return wrong fixture data rather than failing. Subtle failure mode.                                                                                                                                       |
| 2     | #253  | test: extract shared MINIMAL_SUCCESSION fixture across test files                                          | PR #252       | Nearly identical fixture redefined in 4 test files; a SuccessionVariant shape change requires 4 independent edits. Low coupling risk but will accumulate friction.                                                                                                                                                   |
| 2     | #251  | security: consider atomic writes for all editor routes                                                     | PR #236       | Non-atomic `writeFile` across all 5 editor routes — a crash mid-write could corrupt the data file. Backup enables manual recovery but not automatic. Cross-cutting fix needed.                                                                                                                                       |
| 2     | #242  | refactor(schemas): extract shared CommandLevel enum and CounterRef shape                                   | PR #236       | `CommandLevel` enum and `CounterRef` shape duplicated verbatim in `succession.schema.js` and `leaders.schema.js`. Adding a new command level requires updating both files independently.                                                                                                                             |
| 2     | #241  | fix(successionEditor): wrap writeFile in try/catch                                                         | PR #236       | Main `writeFile` has no try/catch — disk-full or permissions error produces unhandled rejection that may expose stack traces. Pre-existing pattern across all 5 editor routes.                                                                                                                                       |
| 2     | #221  | Apply `.strict()` to OOBSchema and LeadersSchema                                                           | PR #219       | Open `z.object()` silently accepts unknown fields on PUT. `_savedAt` stamp added by the server is sent back by clients, so `.strict()` requires adding that field first before applying. Low risk currently since Zod already validates structure.                                                                   |
| 2     | #220  | Async I/O in oobEditor and leadersEditor routes                                                            | PR #219       | Synchronous `readFileSync`/`writeFileSync` blocks the event loop on every request. Low urgency for a dev-only tool with no production traffic; test mock migration from sync to `fs.promises` is non-trivial scope.                                                                                                  |
| 2     | #216  | Extend prototype pollution guard to block `toString`/`valueOf`                                             | PR #208       | Prototype pollution blocklist omits `toString` and `valueOf`. No current exploit vector since paths come from trusted `findNodePath` output. Defense-in-depth gap to address before `updateField` is exposed to external input.                                                                                      |
| 2     | #214  | Assert `syncError` and `isSyncing` reset on `pullFromServer` failure                                       | PR #208       | Failure test only asserts no throw; does not verify `syncError` is set or `isSyncing` returns to `false`. A regression would leave the UI in a silent bad state with no user-facing feedback.                                                                                                                        |
| 1     | #260  | test(useOobStore): add localStorage.removeItem assertion for succession key in confirmPush                 | PR #252       | `confirmPush` succession test verifies fetch count and dirty flag but does not assert `localStorage.removeItem('lob-succession-editor-v1')`. Silent gap in an otherwise-covered code path.                                                                                                                           |
| 1     | #259  | refactor(succession.schema): add .max() length constraints to string fields                                | PR #252       | `id`, `name`, `baseLeaderId` accept arbitrary-length strings. Minor schema hardening gap; dev-only route with 5 MB body limit already in place.                                                                                                                                                                      |
| 1     | #256  | test(OobTreeNode): extract repeated \_variants node fixture into factory function                          | PR #252       | Same `_leader`/`_variants` node object copy-pasted across three consecutive tests; style issue with no functional risk.                                                                                                                                                                                              |
| 1     | #255  | test(oobTreeTransform): extend makeOob() factory instead of repeating full OOB shape                       | PR #252       | `OOB_WITH_WJ_BRIGADE` and `OOB_WITH_RENO_BRIGADE` duplicate the full OOB shape instead of extending `makeOob()`; brittle to structural changes but no functional risk today.                                                                                                                                         |
| 1     | #205  | useOobStore: consider lazy-loading bundled JSON fallbacks                                                  | PR #200       | Static imports of oob.json and leaders.json are included in the store chunk even when the server fetch succeeds. Impact is minimal due to lazy-loaded route; noted for future bundle analysis.                                                                                                                       |
| 1     | #204  | OobTreeNode expand/collapse: 200–300 per-instance watchers on shared signals                               | PR #200       | Each of ~200 tree nodes installs two watch() calls on injected counter refs. Correct and fast at current scale; flagged for awareness if tree grows to 1000+ nodes.                                                                                                                                                  |
| 1     | #201  | oobTreeTransform: pre-index arty entries for O(1) lookups                                                  | PR #200       | Nested linear scan in `distributeCorpsArtillery` is O(M×(D+D×B)). No observable impact at South Mountain scale; flagged for awareness if OOB grows significantly.                                                                                                                                                    |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
