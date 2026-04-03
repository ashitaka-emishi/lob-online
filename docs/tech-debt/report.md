# Technical Debt Report — lob-online

_Last updated: 2026-04-03 after PR #236._

---

## Executive Summary

| Metric                           | Value                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Open debt items                  | 28                                                                                        |
| Cumulative debt score (net open) | 49                                                                                        |
| Highest-risk item                | test(useOobPersistence): add dedicated test coverage for succession paths (#247, score 3) |
| PRs tracked                      | 67                                                                                        |

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

_One row is appended per PR cycle by `/tech-debt-report`. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

High risk. Critical or significant deferred items pose a threat to production stability or block future work. Immediate attention recommended.

PR #236 (OOB data model — leader ratings, supply units, succession variants) fixed 1 finding in place (silent data loss on succession push) and deferred 15 items totalling 30 points, bringing net open debt from 19 to 49. This large jump is driven almost entirely by test coverage gaps introduced alongside new functionality: the succession feature added a new data file, server route, client composable, store ref, and three Vue components — each with minimal or no dedicated test coverage. Four score-3 items are now open: #247 (no `useOobPersistence.test.js` — core data I/O composable with untested partial-failure paths), #245 (three near-verbatim copies of editor-route backup logic), #237 (`processUSACavDiv` bypasses `withLeader`, preventing Farnsworth succession variants from ever rendering), and #207 (persistence composable extraction, partially addressed in PR #218).

Current debt is concentrated in two categories: (1) **test coverage gaps** (#247, #248, #246, #243, #240, #239, #238, #249 — untested succession feature paths that work correctly today but could regress silently as game logic is added); (2) **architectural duplication and missing abstractions** (#245 editor-route factory, #242 shared schema types, #237 withLeader bypass, #241/#251 error boundary / non-atomic write patterns). The test coverage debt should be addressed before game engine implementation begins to avoid silent regressions under the new rules logic.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                               | PR Introduced | Assessment                                                                                                                                                                                                                                                                                                           |
| ----- | ----- | ----------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #247  | test(useOobPersistence): add dedicated test coverage for succession paths           | PR #236       | No `useOobPersistence.test.js`. Core composable for all data I/O extended in PR #236 with no dedicated tests. Untested: `_isValidSuccessionShape` rejection, localStorage partial load, push skipping null succession, pull with succession endpoint down. Partial-failure paths could silently corrupt store state. |
| 3     | #245  | refactor(server/routes): extract editorRouteFactory                                 | PR #236       | `successionEditor.js` is the third near-verbatim copy of `leadersEditor.js`. Backup rotation logic duplicated across 3 route files. A bug fix must be applied independently in each. Third copy is the standard extraction threshold.                                                                                |
| 3     | #237  | fix(oobTreeTransform): processUSACavDiv should delegate to withLeader               | PR #236       | `processUSACavDiv` inlines variant-attachment logic; Farnsworth has no variant support at all. Any future change to `withLeader` silently diverges. Succession variants for Farnsworth will never render until fixed.                                                                                                |
| 3     | #207  | Extract shared persistence composable for OOB editor (align with useMapPersistence) | PR #200       | Push confirmation dialog and structural validation (`_isValidSidedShape`) added in PR #218. Remaining: offline detection, persistence composable refactor. The architectural gap (no shared composable with `useMapPersistence`) continues to diverge as the editor matures.                                         |
| 2     | #251  | security: consider atomic writes for all editor routes                              | PR #236       | Non-atomic `writeFile` across all 5 editor routes — a crash mid-write could corrupt the data file. Backup enables manual recovery but not automatic. Cross-cutting fix needed.                                                                                                                                       |
| 2     | #248  | test(OobTreeNode): add component test for leader-variant rendering                  | PR #236       | No `OobTreeNode.test.js`. `leader-variant` nodeType, `'Var'` badge, and `_variants` sibling rendering added in PR #236 have zero component coverage. A rendering regression would not be caught.                                                                                                                     |
| 2     | #246  | test(oobTreeTransform): add union-side variant and cavalry division variant tests   | PR #236       | All succession variant tests cover only the CSA brigade path. Union corps variants and cavalry division Pleasonton variants (bespoke path) are untested. The bespoke path has different logic and could contain bugs.                                                                                                |
| 2     | #243  | refactor(oobTreeTransform): buildDisplayTree 4-arg positional API is error-prone    | PR #236       | Two early-return tests pass `'union'` as `succession` (old 3-arg call). Tests pass vacuously via null-guard. Future callers are likely to get arg order wrong; no runtime guard catches the mistake.                                                                                                                 |
| 2     | #242  | refactor(schemas): extract shared CommandLevel enum and CounterRef shape            | PR #236       | `CommandLevel` enum and `CounterRef` shape duplicated verbatim in `succession.schema.js` and `leaders.schema.js`. Adding a new command level requires updating both files independently.                                                                                                                             |
| 2     | #241  | fix(successionEditor): wrap writeFile in try/catch                                  | PR #236       | Main `writeFile` has no try/catch — disk-full or permissions error produces unhandled rejection that may expose stack traces. Pre-existing pattern across all 5 editor routes.                                                                                                                                       |
| 2     | #240  | test(SuccessionList): add isVariant rendering and allLeaders merge tests            | PR #236       | `allLeaders` merge with succession variants and `isVariant` flag driving the `(variant)` tag are entirely untested. A display regression would not be caught.                                                                                                                                                        |
| 2     | #239  | test(useOobStore): add succession state and mockFetch coverage                      | PR #236       | `store.succession` init, load, `usedCounterFiles`, and push cleanup untested. `mockFetch` wraps at 2 responses so succession fetch silently receives wrong data — existing tests may be passing for the wrong reason.                                                                                                |
| 2     | #238  | test(succession.schema): add dedicated schema test file                             | PR #236       | No `succession.schema.test.js`. Field-level schema regressions (wrong types, missing required fields) won't be caught. Runtime Zod validation still protects on server load.                                                                                                                                         |
| 2     | #221  | Apply `.strict()` to OOBSchema and LeadersSchema                                    | PR #219       | Open `z.object()` silently accepts unknown fields on PUT. `_savedAt` stamp added by the server is sent back by clients, so `.strict()` requires adding that field first before applying. Low risk currently since Zod already validates structure.                                                                   |
| 2     | #220  | Async I/O in oobEditor and leadersEditor routes                                     | PR #219       | Synchronous `readFileSync`/`writeFileSync` blocks the event loop on every request. Low urgency for a dev-only tool with no production traffic; test mock migration from sync to `fs.promises` is non-trivial scope.                                                                                                  |
| 2     | #216  | Extend prototype pollution guard to block `toString`/`valueOf`                      | PR #208       | Prototype pollution blocklist omits `toString` and `valueOf`. No current exploit vector since paths come from trusted `findNodePath` output. Defense-in-depth gap to address before `updateField` is exposed to external input.                                                                                      |
| 2     | #214  | Assert `syncError` and `isSyncing` reset on `pullFromServer` failure                | PR #208       | Failure test only asserts no throw; does not verify `syncError` is set or `isSyncing` returns to `false`. A regression would leave the UI in a silent bad state with no user-facing feedback.                                                                                                                        |
| 1     | #250  | docs(oobTreeTransform): comment on withLeader explaining \_variants nesting         | PR #236       | `_variants` is nested on `_leader` (breaking the flat `_supply`/`_hq` convention) without explanation. A comment prevents future contributors from incorrectly "fixing" semantically correct nesting.                                                                                                                |
| 1     | #249  | test(successionEditor): add GET error path and field-level rejection tests          | PR #236       | GET with missing file (ENOENT) untested. Field-level Zod rejection better addressed by #238. Minor hygiene gap matching what other editor test files already cover.                                                                                                                                                  |
| 1     | #244  | docs(useOobPersistence): rename \_isValidSidedShape and document shape families     | PR #236       | `_isValidSidedShape` is misleading — succession uses arrays not objects. A rename and comment prevent future confusion when adding a fourth data file.                                                                                                                                                               |
| 1     | #222  | Counters upload — use route-level multer middleware                                 | PR #219       | Inline callback handles `MulterError` variants cleanly without a separate error middleware. Pure style finding; no functional impact.                                                                                                                                                                                |
| 1     | #215  | `OobTreeNode` dual-script pattern — consider `defineOptions()`                      | PR #208       | Uses `<script>` + `<script setup>` for recursive self-reference, violating the project's Options API ban. Standard Vue 3 workaround; resolvable with `defineOptions()` if Vue 3.3+ is confirmed available.                                                                                                           |
| 1     | #213  | Add `commit()` no-op test when `CounterImageWidget` `nodePath` is null              | PR #208       | The null `nodePath` early-return in `commit()` is untested. Guard exists and works; failure would cause a no-op store call with undefined path.                                                                                                                                                                      |
| 1     | #212  | Add keyboard focus guard test (INPUT/SELECT/TEXTAREA blocks arrow cycling)          | PR #208       | The focus guard in `onKeydown` is untested. Guard exists and is correct; a regression would cause arrow keys to cycle counters while the user types in a form field.                                                                                                                                                 |
| 1     | #206  | Align map/scenario editor routes to use lazy loading like oob-editor                | PR #200       | Map and scenario editor routes use eager imports while the OOB editor uses dynamic import. Consistency improvement only; no functional impact.                                                                                                                                                                       |
| 1     | #205  | useOobStore: consider lazy-loading bundled JSON fallbacks                           | PR #200       | Static imports of oob.json and leaders.json are included in the store chunk even when the server fetch succeeds. Impact is minimal due to lazy-loaded route; noted for future bundle analysis.                                                                                                                       |
| 1     | #204  | OobTreeNode expand/collapse: 200–300 per-instance watchers on shared signals        | PR #200       | Each of ~200 tree nodes installs two watch() calls on injected counter refs. Correct and fast at current scale; flagged for awareness if tree grows to 1000+ nodes.                                                                                                                                                  |
| 1     | #201  | oobTreeTransform: pre-index arty entries for O(1) lookups                           | PR #200       | Nested linear scan in `distributeCorpsArtillery` is O(M×(D+D×B)). No observable impact at South Mountain scale; flagged for awareness if OOB grows significantly.                                                                                                                                                    |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
