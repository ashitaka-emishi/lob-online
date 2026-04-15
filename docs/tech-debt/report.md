# Technical Debt Report — lob-online

_Last updated: 2026-04-14 after PR #312._

---

## Executive Summary

| Metric                           | Value                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Open debt items                  | 29                                                                                        |
| Cumulative debt score (net open) | 47                                                                                        |
| Highest-risk item                | test(useOobPersistence): add dedicated test coverage for succession paths (#247, score 3) |
| PRs tracked                      | 112                                                                                       |

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

_One row is appended per PR cycle by `/tech-debt-report`. "Net Delta" = debt added minus debt closed per PR (negative = net improvement); populated on main PR rows only, "—" on resolution sub-rows. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

High risk. Net open score is 47 across 29 items. Immediate attention recommended before M4 socket/game-loop work begins.

PR #312 (M3 debt sprint) resolved all six pre-M4 blocker items: path traversal guard (#284), hexsideCost fix (#288), data-driven LOS terrain heights (#289), MapTestView orchestration tests (#300), hex-ID format validation (#302), and the dedicated map-test data endpoint (#303). The team review of the same PR fixed 10 additional findings in-place with zero deferred, also resolving #307 (incomingResult validation). No new debt was introduced.

The remaining score-3 items are OOB architecture carry-forwards that are isolated from the game engine: #247 (useOobPersistence succession-path tests), #245 (editorRouteFactory extraction), and #237 (processUSACavDiv Farnsworth delegation). These do not block M4 socket/game-loop work but represent untested core composables and duplicated server route logic that will slow OOB-side changes.

Current debt is concentrated in **three score-3 OOB items** (succession test gaps, route factory duplication, leader attachment divergence), **twelve score-2 engine items** (performance hot-path allocations, correctness gaps in combat/movement tables, parameter ordering inconsistency), and **fourteen score-1 minor items** (test style, schema validation, Vue idiom gaps, and legacy OOB style issues).

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                                              | PR Introduced | Assessment                                                                                                                                                                                                                                                                                                           |
| ----- | ----- | -------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #247  | test(useOobPersistence): add dedicated test coverage for succession paths                          | PR #236       | No `useOobPersistence.test.js`. Core composable for all data I/O extended in PR #236 with no dedicated tests. Untested: `_isValidSuccessionShape` rejection, localStorage partial load, push skipping null succession, pull with succession endpoint down. Partial-failure paths could silently corrupt store state. |
| 3     | #245  | refactor(server/routes): extract editorRouteFactory                                                | PR #236       | `successionEditor.js` is the third near-verbatim copy of `leadersEditor.js`. Backup rotation logic duplicated across 3 route files. A bug fix must be applied independently in each. Third copy is the standard extraction threshold.                                                                                |
| 3     | #237  | fix(oobTreeTransform): processUSACavDiv should delegate to withLeader                              | PR #236       | `processUSACavDiv` inlines variant-attachment logic; Farnsworth has no variant support at all. Any future change to `withLeader` silently diverges. Succession variants for Farnsworth will never render until fixed.                                                                                                |
| 2     | #304  | map-test: move module-level data load in mapTest.js into lazy route setup                          | PR #297       | `loadMap()`, `loadScenario()`, and `buildHexIndex()` called at module import time. A data-load failure throws during server startup with no HTTP error path, making root-cause diagnosis harder than a request-time 500 would be.                                                                                    |
| 2     | #301  | map-test: replace v-if panel dispatch table with dynamic component                                 | PR #297       | Adding a sixth panel requires editing both the `PANELS` array and the v-if/v-else-if template block. Low coupling risk today but becomes maintenance friction as M4 adds more tool panels.                                                                                                                           |
| 2     | #299  | map-test: extract mockFetch test utility shared by all five panel tests                            | PR #297       | `vi.stubGlobal('fetch', ...)` helper duplicated across all five panel test files. A mock contract change must be applied independently in five places; easy to miss one.                                                                                                                                             |
| 2     | #298  | map-test: extract shared panel CSS across five SFCs                                                | PR #297       | Identical scoped CSS for `.panel`, `.panel-header`, `.hint`, `.clear-btn`, `.loading`, `.error` duplicated across all five panel SFCs. A visual consistency fix requires touching five files simultaneously.                                                                                                         |
| 2     | #296  | engine: noEffectTerrain Set allocated inside hexEntryCost hot loop                                 | PR #283       | `new Set(noEffectTerrain ?? [])` created inside `hexEntryCost` on every Dijkstra edge expansion (~13K calls per query). ~780K allocations per turn for 60-unit movement ranges.                                                                                                                                      |
| 2     | #295  | engine: Dijkstra lacks early termination for point-to-point queries                                | PR #283       | `movementPath` passes `Infinity` maxCost, exploring the entire reachable graph even for single target queries. Add optional `targetHex` to `dijkstra()` for 2–5× speedup on nearby pairs.                                                                                                                            |
| 2     | #294  | engine: hex.js hot-path allocations — memoize formatHexId/parseHexId                               | PR #283       | `parseHexId` and `formatHexId` called ~13K+ times per Dijkstra run; each creates temporary array/string allocations. Pre-compute a 2D ID grid at startup. Only worth addressing if profiling confirms bottleneck after H1/H2 fixes.                                                                                  |
| 2     | #292  | engine: extract formations.js — FORMATION_EFFECTS and ACTIVITY_EFFECTS belong in a separate module | PR #283       | `weapons.js` mixes weapon data with formation/activity charts from different LOB Charts pages. A developer looking for formation rules won't find them in `weapons.js`.                                                                                                                                              |
| 2     | #291  | engine: combat.js ammoTypeShift threshold check is tautological                                    | PR #283       | `if (firerSPs >= threshold)` where threshold comes from the tier firerSPs falls into — the check can never fail. Either rules intent is misunderstood or the code is dead. Consult domain-expert before changing.                                                                                                    |
| 2     | #290  | engine: inconsistent parameter ordering between movementPath and computeLOS                        | PR #283       | `movementPath` takes `(scenario, mapData)`; `computeLOS` takes `(mapData, scenario)`. Both are hex-pair functions taking the same two data objects in opposite order — easy to swap silently.                                                                                                                        |
| 2     | #287  | engine: combatResult silently accepts out-of-range diceRoll                                        | PR #283       | Roll of 1 gives array index -1 → silent "no effect". Roll > 12 also falls off the table. Should throw or return a clearly-marked invalid sentinel.                                                                                                                                                                   |
| 2     | #285  | engine: parseHexId has no input validation — NaN propagates silently                               | PR #283       | `hexId.split('.').map(Number)` with no guard against null/undefined/malformed strings. NaN leaks into cube math and Dijkstra cost comparisons.                                                                                                                                                                       |
| 1     | #311  | table-test: lazy-load panel SFCs with defineAsyncComponent in TableTestView                        | PR #305       | All 11 panels imported eagerly. Dev-only tool with small SFCs; no perceptible load impact today. Good practice for when panel complexity grows.                                                                                                                                                                      |
| 1     | #310  | table-test: convert activePanel() function to computed in TableTestView                            | PR #305       | `PANELS.find()` runs on every render rather than being cached. Scanning 11 static items is imperceptible; this is a Vue idiom correctness issue, not a performance problem today.                                                                                                                                    |
| 1     | #309  | table-test: extract defaultModifiers() factory in MoralePanel                                      | PR #305       | Default modifiers object duplicated between `ref()` init and `reset()`. No coupling risk; only matters when a new modifier flag is added to the Morale Table.                                                                                                                                                        |
| 1     | #308  | table-test: standardize modifier param name — modifiers vs mods inconsistency                      | PR #305       | Naming inconsistency between `/morale` (`modifiers`) and `/closing-roll` (`mods`). Both work correctly; only affects API learnability.                                                                                                                                                                               |
| 1     | #306  | table-test: filter modifier objects against property allowlist before forwarding to engine         | PR #305       | Dev-only tool with 5MB body limit and engine destructuring already neutralizing unknowns. Pure defense-in-depth; no functional risk today.                                                                                                                                                                           |
| 1     | #293  | engine: loadMap/loadScenario use synchronous file I/O with no architectural guard                  | PR #283       | Both use `readFileSync`. "Call once at startup" is documented but not enforced. For M4+ game loop, should be async or enforced via a startup bootstrap module.                                                                                                                                                       |
| 1     | #286  | engine: hexEntryCost has no dirIndex range validation                                              | PR #283       | Out-of-range `dirIndex` (6, -1, NaN) silently returns `undefined` from array lookups. Low risk since only the Dijkstra loop calls this today.                                                                                                                                                                        |
| 1     | #260  | test(useOobStore): add localStorage.removeItem assertion for succession key in confirmPush         | PR #252       | `confirmPush` succession test verifies fetch count and dirty flag but does not assert `localStorage.removeItem('lob-succession-editor-v1')`. Silent gap in an otherwise-covered code path.                                                                                                                           |
| 1     | #259  | refactor(succession.schema): add .max() length constraints to string fields                        | PR #252       | `id`, `name`, `baseLeaderId` accept arbitrary-length strings. Minor schema hardening gap; dev-only route with 5 MB body limit already in place.                                                                                                                                                                      |
| 1     | #256  | test(OobTreeNode): extract repeated \_variants node fixture into factory function                  | PR #252       | Same `_leader`/`_variants` node object copy-pasted across three consecutive tests; style issue with no functional risk.                                                                                                                                                                                              |
| 1     | #255  | test(oobTreeTransform): extend makeOob() factory instead of repeating full OOB shape               | PR #252       | `OOB_WITH_WJ_BRIGADE` and `OOB_WITH_RENO_BRIGADE` duplicate the full OOB shape instead of extending `makeOob()`; brittle to structural changes but no functional risk today.                                                                                                                                         |
| 1     | #205  | useOobStore: consider lazy-loading bundled JSON fallbacks                                          | PR #200       | Static imports of oob.json and leaders.json are included in the store chunk even when the server fetch succeeds. Impact is minimal due to lazy-loaded route; noted for future bundle analysis.                                                                                                                       |
| 1     | #204  | OobTreeNode expand/collapse: 200–300 per-instance watchers on shared signals                       | PR #200       | Each of ~200 tree nodes installs two watch() calls on injected counter refs. Correct and fast at current scale; flagged for awareness if tree grows to 1000+ nodes.                                                                                                                                                  |
| 1     | #201  | oobTreeTransform: pre-index arty entries for O(1) lookups                                          | PR #200       | Nested linear scan in `distributeCorpsArtillery` is O(M×(D+D×B)). No observable impact at South Mountain scale; flagged for awareness if OOB grows significantly.                                                                                                                                                    |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
