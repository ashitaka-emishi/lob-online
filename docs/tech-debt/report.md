# Technical Debt Report — lob-online

_Last updated: 2026-05-08 after PR #359._

---

## Executive Summary

| Metric                           | Value                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| Open debt items                  | 22                                                                                          |
| Cumulative debt score (net open) | 46                                                                                          |
| Highest-risk item                | Scenario-start detached brigades not flagged isDetached:true (e.g. Garland) (#361, score 4) |
| PRs tracked                      | 150                                                                                         |

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

_One row is appended per PR cycle by `/tech-debt-report`. "Net Delta" = debt added minus debt closed per PR (negative = net improvement); populated on main PR rows only, "—" on resolution sub-rows. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

High risk. Critical or significant deferred items pose a threat to production stability or block future work. Immediate attention recommended.

PR #359 (M5 schema prerequisites) introduced 13 new deferred findings totalling +29 debt score, bringing net open debt to 46 across 22 items — the highest it has been since PR #236. Current debt is concentrated in three areas: (1) **data-model correctness gaps** — two score-4 items where reinforcement `orderType` is silently dropped (#360) and scenario-start detached brigades cannot be declared as detached (#361), both of which will cause incorrect M5 gameplay without a fix; (2) **schema invariant and migration gaps** — score-3 items for a missing cross-field `isDetached`/`orders` refinement (#362) and an absent migration path for the breaking `orders` schema change (#363); (3) **accumulated lower-priority items** — auth gap on the join endpoint (#340, score 4), engine performance flags (#295, #294, #324, #322), and eight score-1–2 schema documentation and API ergonomics issues from PR #359. A targeted debt sprint against #360 and #361 is recommended before M5 order-pipeline implementation begins.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                                 | PR Introduced | Assessment                                                                                                                                                                                                                                                               |
| ----- | ----- | ------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4     | #361  | Scenario-start detached brigades not flagged isDetached:true (e.g. Garland)           | PR #359       | Scenario data model has no field to declare initial detachment state; `processSetupSide()` has no path to set `isDetached: true`. Makes the SM scenario unplayable without a fix.                                                                                        |
| 4     | #360  | Reinforcement units silently drop `orderType` during initGameState                    | PR #359       | `initGameState()` reads `orderType` from reinforcement group entries but ignores it, initializing all reinforcement units with `orders: null`. Will cause incorrect reinforcement behavior when the M5 order-delivery pipeline is implemented.                           |
| 4     | #340  | Fix sideToken validation and add auth guard to join endpoint                          | PR #339       | Any caller knowing a game UUID can claim the confederate seat; `sideToken` is stored without format validation, allowing empty strings or arbitrary values. Real access-control gap that must be closed before M5 order submission wires token-based move authorization. |
| 3     | #363  | No migration path for breaking `orders` schema change                                 | PR #359       | `orders` changed from raw string to `UnitOrderState` object with no migration utility or versioned schema check. No production risk yet, but must be addressed before M5 ships with persistent saves.                                                                    |
| 3     | #362  | No cross-field invariant between `isDetached` and `orders` in UnitStateSchema         | PR #359       | Schema allows `isDetached: true` with `orders: null` and vice versa. Per SM detachment rules, only divisions and detached brigades hold independent orders; invalid states are representable and will cause silent correctness bugs.                                     |
| 2     | #371  | `defaultUnit()` positional parameter list is fragile (6 args)                         | PR #359       | 6 positional args with no guard against transposition; an options-object pattern would be safer and more readable as new fields are added.                                                                                                                               |
| 2     | #369  | `'stopped'` order status not reserved in UnitOrderState schema                        | PR #359       | No slot reserved for a future 'stopped'/'hold' status; adding it later will require a schema migration.                                                                                                                                                                  |
| 2     | #368  | Parent-order inheritance for `orders: null` undocumented in schema                    | PR #359       | The mechanism for resolving effective order when `orders: null` (inheriting from parent division) is not documented in the schema or any engine module. Will slow future query-layer implementation.                                                                     |
| 2     | #367  | `isDetached` has no Zod schema default (`.default(false)`)                            | PR #359       | `z.boolean()` with no `.default(false)` means any programmatic unit creation that omits `isDetached` will fail validation rather than defaulting safely.                                                                                                                 |
| 2     | #365  | `isDetached` field missing SM section rule citation                                   | PR #359       | Comment reads "SM detachment rules" without a specific section number, violating the project's rule-traceability coding standard.                                                                                                                                        |
| 2     | #364  | Dual representation of no-order state (`null` vs `UnitOrderState{status:'none'}`)     | PR #359       | Two semantically distinct representations exist for no-order state. Query code must double-check both unless consolidated or the distinction is documented clearly.                                                                                                      |
| 2     | #337  | Fix getScenario cache invalidation when scenario editor saves                         | PR #328       | Module-level `_scenario` cache is never invalidated. Scenario editor can modify `scenario.json`; new games will use stale data until server restart. Breaks the dev workflow.                                                                                            |
| 2     | #324  | perf: hoist noEffectTerrain Set construction out of hexEntryCost hot path             | PR #315       | `hexEntryCostBreakdown` constructs `new Set(noEffectTerrain ?? [])` on every call when invoked without a pre-built Set. Internal Dijkstra callers hoist correctly; future single-step callers will pay per-call.                                                         |
| 2     | #322  | feat: add numeric bounds validation in pickMods                                       | PR #315       | `pickMods()` coerces numeric modifier values but applies no min/max bounds. Extreme or negative values pass through to engine table functions without validation.                                                                                                        |
| 2     | #295  | engine: Dijkstra lacks early termination for point-to-point queries                   | PR #283       | `movementPath` passes `Infinity` maxCost, exploring the entire reachable graph even for single target queries. Add optional `targetHex` to `dijkstra()` for 2–5× speedup on nearby pairs.                                                                                |
| 2     | #294  | engine: hex.js hot-path allocations — memoize formatHexId/parseHexId                  | PR #283       | `parseHexId` and `formatHexId` called ~13K+ times per Dijkstra run; each creates temporary array/string allocations. Pre-compute a 2D ID grid at startup. Only worth addressing if profiling confirms bottleneck.                                                        |
| 1     | #372  | `UnitOrderState` `.refine()` error messages lack path metadata                        | PR #359       | All five `.refine()` calls omit the `path` option, surfacing errors at the object root rather than the offending field. Affects error message quality in API validation responses.                                                                                       |
| 1     | #370  | `complexDefense` sentinel in `mapOrder()` lacks pointer to LOB_GAME_UPDATES SM source | PR #359       | Comment cites `LOB_GAME_UPDATES SM section` without a specific section or page reference. Future maintainers may not know where to find the authoritative ruling.                                                                                                        |
| 1     | #366  | `OrderType` JSDoc comment implies null means in-pipeline (ambiguous)                  | PR #359       | Comment `null = no current order in pipeline` conflates `OrderType` null with `UnitOrderState.status === 'delay'`. Misleading for future developers.                                                                                                                     |
| 1     | #205  | useOobStore: consider lazy-loading bundled JSON fallbacks                             | PR #200       | Static imports of oob.json and leaders.json are included in the store chunk even when the server fetch succeeds. Impact is minimal due to lazy-loaded route; noted for future bundle analysis.                                                                           |
| 1     | #204  | OobTreeNode expand/collapse: 200–300 per-instance watchers on shared signals          | PR #200       | Each of ~200 tree nodes installs two watch() calls on injected counter refs. Correct and fast at current scale; flagged for awareness if tree grows to 1000+ nodes.                                                                                                      |
| 1     | #201  | oobTreeTransform: pre-index arty entries for O(1) lookups                             | PR #200       | Nested linear scan in `distributeCorpsArtillery` is O(M×(D+D×B)). No observable impact at South Mountain scale; flagged for awareness if OOB grows significantly.                                                                                                        |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
