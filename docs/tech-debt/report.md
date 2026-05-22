# Technical Debt Report — lob-online

_Last updated: 2026-05-22 after PR #420._

---

## Executive Summary

| Metric                           | Value                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------- |
| Open debt items                  | 26                                                                            |
| Cumulative debt score (net open) | 46                                                                            |
| Highest-risk item                | SVG `<image>` button AT reliability + missing focus indicator (#434, score 3) |
| PRs tracked                      | 185                                                                           |

---

## Debt Over Time

| Date       | PR                                                             | Debt Added (this PR) | Net Delta | Cumulative Added (gross) |
| ---------- | -------------------------------------------------------------- | -------------------- | --------- | ------------------------ |
| 2026-03-18 | PR #98                                                         | 0                    | 0         | 0                        |
| 2026-03-18 | PR #99                                                         | 12                   | +12       | 12                       |
| 2026-03-18 | PR #107                                                        | 0                    | 0         | 12                       |
| 2026-03-18 | PR #108                                                        | 0                    | 0         | 12                       |
| 2026-03-18 | PR #109 (resolved #100)                                        | 3                    | +3        | 15                       |
| 2026-03-18 | PR #113                                                        | 0                    | -9        | 15                       |
| 2026-03-18 | PR #113 (resolved #101)                                        | -2                   | —         | 15                       |
| 2026-03-18 | PR #113 (resolved #102)                                        | -2                   | —         | 15                       |
| 2026-03-18 | PR #113 (resolved #103)                                        | -2                   | —         | 15                       |
| 2026-03-18 | PR #113 (resolved #104)                                        | -1                   | —         | 15                       |
| 2026-03-18 | PR #113 (resolved #105)                                        | -1                   | —         | 15                       |
| 2026-03-18 | PR #113 (resolved #106)                                        | -1                   | —         | 15                       |
| 2026-03-18 | PR #117                                                        | 5                    | +5        | 20                       |
| 2026-03-18 | PR #120                                                        | 0                    | -5        | 20                       |
| 2026-03-18 | PR #120 (resolved #118)                                        | -3                   | —         | 20                       |
| 2026-03-18 | PR #120 (resolved #119)                                        | -2                   | —         | 20                       |
| 2026-03-18 | PR #121                                                        | 0                    | 0         | 20                       |
| 2026-03-18 | PR #122                                                        | 16                   | +16       | 36                       |
| 2026-03-18 | PR #131                                                        | 0                    | -2        | 36                       |
| 2026-03-18 | PR #131 (resolved #123)                                        | -2                   | —         | 36                       |
| 2026-03-18 | PR #132                                                        | 0                    | -5        | 36                       |
| 2026-03-18 | PR #132 (resolved #130)                                        | -2                   | —         | 36                       |
| 2026-03-18 | PR #132 (resolved #129)                                        | -1                   | —         | 36                       |
| 2026-03-18 | PR #132 (resolved #128)                                        | -1                   | —         | 36                       |
| 2026-03-18 | PR #132 (resolved #127)                                        | -1                   | —         | 36                       |
| 2026-03-18 | PR #134                                                        | 0                    | 0         | 36                       |
| 2026-03-19 | PR #145                                                        | 5                    | +5        | 41                       |
| 2026-03-19 | PR #148 (resolved #146)                                        | -3                   | -5        | 41                       |
| 2026-03-19 | PR #148 (resolved #147)                                        | -2                   | —         | 41                       |
| 2026-03-19 | PR #150                                                        | 11                   | +8        | 52                       |
| 2026-03-19 | PR #150 (resolved #124)                                        | -3                   | —         | 52                       |
| 2026-03-22 | PR #158                                                        | 13                   | +13       | 65                       |
| 2026-03-22 | PR #168                                                        | 3                    | -3        | 68                       |
| 2026-03-22 | PR #168 (resolved #159)                                        | -2                   | —         | 68                       |
| 2026-03-22 | PR #168 (resolved #160)                                        | -2                   | —         | 68                       |
| 2026-03-22 | PR #168 (resolved #163)                                        | -1                   | —         | 68                       |
| 2026-03-22 | PR #168 (resolved #164)                                        | -1                   | —         | 68                       |
| 2026-03-22 | PR #171                                                        | 0                    | -8        | 68                       |
| 2026-03-22 | PR #171 (resolved #152)                                        | -2                   | —         | 68                       |
| 2026-03-22 | PR #171 (resolved #153)                                        | -3                   | —         | 68                       |
| 2026-03-22 | PR #171 (resolved #155)                                        | -2                   | —         | 68                       |
| 2026-03-22 | PR #171 (resolved #167)                                        | -1                   | —         | 68                       |
| 2026-03-23 | PR #173                                                        | 0                    | -9        | 68                       |
| 2026-03-23 | PR #173 (resolved #111)                                        | -2                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #112)                                        | -1                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #154)                                        | -1                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #162)                                        | -2                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #165)                                        | -1                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #166)                                        | -1                   | —         | 68                       |
| 2026-03-23 | PR #173 (resolved #170)                                        | -1                   | —         | 68                       |
| 2026-03-23 | PR #174                                                        | 2                    | -4        | 70                       |
| 2026-03-23 | PR #174 (resolved #126)                                        | -3                   | —         | 70                       |
| 2026-03-23 | PR #174 (resolved #125)                                        | -3                   | —         | 70                       |
| 2026-03-23 | PR #177                                                        | 0                    | 0         | 70                       |
| 2026-03-23 | PR #178                                                        | 0                    | -9        | 70                       |
| 2026-03-23 | PR #178 (resolved #151)                                        | -3                   | —         | 70                       |
| 2026-03-23 | PR #178 (resolved #161)                                        | -2                   | —         | 70                       |
| 2026-03-23 | PR #178 (resolved #169)                                        | -2                   | —         | 70                       |
| 2026-03-23 | PR #178 (resolved #175)                                        | -1                   | —         | 70                       |
| 2026-03-23 | PR #178 (resolved #176)                                        | -1                   | —         | 70                       |
| 2026-03-25 | PR #200                                                        | 11                   | +11       | 81                       |
| 2026-03-26 | PR #208                                                        | 14                   | +14       | 95                       |
| 2026-03-29 | PR #217                                                        | 0                    | 0         | 95                       |
| 2026-03-29 | PR #218                                                        | 0                    | -11       | 95                       |
| 2026-03-29 | PR #218 (resolved #211)                                        | -3                   | —         | 95                       |
| 2026-03-29 | PR #218 (resolved #209)                                        | -2                   | —         | 95                       |
| 2026-03-29 | PR #218 (resolved #210)                                        | -2                   | —         | 95                       |
| 2026-03-29 | PR #218 (resolved #203)                                        | -2                   | —         | 95                       |
| 2026-03-29 | PR #218 (resolved #202)                                        | -2                   | —         | 95                       |
| 2026-03-30 | PR #219                                                        | 5                    | +5        | 100                      |
| 2026-03-31 | PR #223                                                        | 0                    | 0         | 100                      |
| 2026-04-02 | PR #227                                                        | 0                    | 0         | 100                      |
| 2026-04-03 | PR #236                                                        | 30                   | +30       | 130                      |
| 2026-04-03 | PR #252                                                        | 12                   | -8        | 142                      |
| 2026-04-03 | PR #252 (resolved #250)                                        | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #249)                                        | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #244)                                        | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #248)                                        | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #246)                                        | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #243)                                        | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #240)                                        | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #239)                                        | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #238)                                        | -2                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #222)                                        | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #215)                                        | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #213)                                        | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #212)                                        | -1                   | —         | 142                      |
| 2026-04-03 | PR #252 (resolved #206)                                        | -1                   | —         | 142                      |
| 2026-04-10 | PR #262                                                        | 0                    | -25       | 142                      |
| 2026-04-10 | PR #262 (resolved #207)                                        | -3                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #258)                                        | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #257)                                        | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #254)                                        | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #253)                                        | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #251)                                        | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #242)                                        | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #241)                                        | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #221)                                        | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #220)                                        | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #216)                                        | -2                   | —         | 142                      |
| 2026-04-10 | PR #262 (resolved #214)                                        | -2                   | —         | 142                      |
| 2026-04-11 | PR #283                                                        | 27                   | +27       | 169                      |
| 2026-04-12 | PR #297                                                        | 17                   | +17       | 186                      |
| 2026-04-12 | PR #305                                                        | 6                    | +6        | 192                      |
| 2026-04-14 | PR #312                                                        | 0                    | -19       | 192                      |
| 2026-04-14 | PR #312 (resolved #303)                                        | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #302)                                        | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #300)                                        | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #289)                                        | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #288)                                        | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #284)                                        | -3                   | —         | 192                      |
| 2026-04-14 | PR #312 (resolved #307)                                        | -1                   | —         | 192                      |
| 2026-04-15 | PR #313                                                        | 0                    | -19       | 192                      |
| 2026-04-15 | PR #313 (resolved #285)                                        | -2                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #287)                                        | -2                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #296)                                        | -2                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #290)                                        | -2                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #308)                                        | -1                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #260)                                        | -1                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #237)                                        | -3                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #245)                                        | -3                   | —         | 192                      |
| 2026-04-15 | PR #313 (resolved #247)                                        | -3                   | —         | 192                      |
| 2026-04-27 | PR #315                                                        | 4                    | -17       | 196                      |
| 2026-04-27 | PR #315 (resolved #304)                                        | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #301)                                        | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #299)                                        | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #298)                                        | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #292)                                        | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #291)                                        | -2                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #311)                                        | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #310)                                        | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #309)                                        | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #306)                                        | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #293)                                        | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #286)                                        | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #259)                                        | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #256)                                        | -1                   | —         | 196                      |
| 2026-04-27 | PR #315 (resolved #255)                                        | -1                   | —         | 196                      |
| 2026-05-05 | PR #328                                                        | 34                   | +34       | 230                      |
| 2026-05-06 | PR #339                                                        | 4                    | -28       | 234                      |
| 2026-05-06 | PR #339 (resolved #332)                                        | -5                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #329)                                        | -4                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #330)                                        | -4                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #333)                                        | -4                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #334)                                        | -3                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #331)                                        | -3                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #335)                                        | -3                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #336)                                        | -3                   | —         | 234                      |
| 2026-05-06 | PR #339 (resolved #338)                                        | -3                   | —         | 234                      |
| 2026-05-08 | PR #359                                                        | 29                   | +29       | 263                      |
| 2026-05-12 | PR #375                                                        | 16                   | +16       | 279                      |
| 2026-05-13 | PR #386                                                        | 5                    | -2        | 284                      |
| 2026-05-13 | PR #386 (resolved #377)                                        | -2                   | —         | 284                      |
| 2026-05-13 | PR #386 (resolved #378)                                        | -2                   | —         | 284                      |
| 2026-05-13 | PR #386 (resolved #380)                                        | -2                   | —         | 284                      |
| 2026-05-13 | PR #386 (resolved #384)                                        | -1                   | —         | 284                      |
| 2026-05-18 | PR #391                                                        | 0                    | -17       | 284                      |
| 2026-05-18 | PR #391 (resolved #362)                                        | -3                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #365)                                        | -2                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #366)                                        | -1                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #367)                                        | -2                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #368)                                        | -2                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #369)                                        | -2                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #372)                                        | -1                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #388)                                        | -2                   | —         | 284                      |
| 2026-05-18 | PR #391 (resolved #389)                                        | -2                   | —         | 284                      |
| 2026-05-18 | PR #392                                                        | 7                    | +7        | 291                      |
| 2026-05-18 | PR #392 (added #393)                                           | +4                   | —         | 291                      |
| 2026-05-18 | PR #392 (added #394)                                           | +3                   | —         | 291                      |
| 2026-05-20 | PR #395                                                        | 0                    | -10       | 291                      |
| 2026-05-20 | PR #395 (resolved #393)                                        | -4                   | —         | 291                      |
| 2026-05-20 | PR #395 (resolved #394)                                        | -3                   | —         | 291                      |
| 2026-05-20 | PR #395 (resolved #322)                                        | -2                   | —         | 291                      |
| 2026-05-20 | PR #395 (resolved #370)                                        | -1                   | —         | 291                      |
| 2026-05-20 | PR #396                                                        | 0                    | 0         | 291                      |
| 2026-05-21 | PR #397                                                        | 0                    | -7        | 291                      |
| 2026-05-21 | PR #397 (resolved #324)                                        | -2                   | —         | 291                      |
| 2026-05-21 | PR #397 (resolved #295)                                        | -2                   | —         | 291                      |
| 2026-05-21 | PR #397 (resolved #294)                                        | -2                   | —         | 291                      |
| 2026-05-21 | PR #397 (resolved #201)                                        | -1                   | —         | 291                      |
| 2026-05-21 | PR #400                                                        | 8                    | +8        | 299                      |
| 2026-05-21 | PR #409                                                        | 11                   | +11       | 310                      |
| 2026-05-21 | PR #415                                                        | 0                    | -6        | 310                      |
| 2026-05-21 | PR #415 (reclassified #410 — planned implementation, not debt) | -5                   | —         | 310                      |
| 2026-05-21 | PR #415 (resolved #414 — absorbed into #410)                   | -1                   | —         | 310                      |
| 2026-05-22 | PR #433                                                        | 6                    | -5        | 316                      |
| 2026-05-22 | PR #433 (resolved #401)                                        | -3                   | —         | 316                      |
| 2026-05-22 | PR #433 (resolved #411)                                        | -2                   | —         | 316                      |
| 2026-05-22 | PR #433 (resolved #412)                                        | -2                   | —         | 316                      |
| 2026-05-22 | PR #433 (resolved #346)                                        | -2                   | —         | 316                      |
| 2026-05-22 | PR #433 (resolved #413)                                        | -1                   | —         | 316                      |
| 2026-05-22 | PR #433 (resolved #404)                                        | -1                   | —         | 316                      |
| 2026-05-22 | PR #420                                                        | 22                   | +22       | 338                      |

_One row is appended per PR cycle by `/tech-debt-report`. "Net Delta" = debt added minus debt closed per PR (negative = net improvement); populated on main PR rows only, "—" on resolution sub-rows. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

High risk. Critical or significant deferred items pose a threat to production stability or block future work. Immediate attention recommended.

PR #420 added 22 debt points across 12 items, pushing the net open score from 24 to 46. The two score-3 items now dominate: #434 (SVG button AT reliability, PR #433) and #431 (OOB fetched via dev-tool endpoint, PR #420) — the latter is a production-blocker where unit counters silently disappear in any build without `MAP_EDITOR_ENABLED`. Current debt is concentrated in three categories: (1) the production-blocking OOB data path item (#431) that must be resolved before any production deployment of game view; (2) eight minor API/store contract items from PR #420 (#421–#427, #432) representing missing schema validation and route-design workarounds with low immediate risk but growing coupling cost; and (3) score-1 items (test coverage gaps, fixture inconsistencies, a caching omission) safe to address opportunistically. Recommended resolution order: #431 before any M6 game view work; the PR #420 contract items as part of a post-M5 cleanup sprint; rules-engine stubs (#379, #381, #382, #383) close naturally during M6 combat implementation. Two security/infra items (#403 CSP, #350 rate limiting) are appropriately deferred to M8 auth hardening.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                            | PR Introduced | Assessment                                                                                                                                                                                                                                                       |
| ----- | ----- | -------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | #434  | a11y: SVG `<image>` button AT reliability + missing focus indicator              | PR #433       | Pre-existing pattern in `UnitCounterLayer.vue` touched by this PR. `role="button"` on SVG `<image>` is unreliable across NVDA/JAWS/VoiceOver; no `:focus-visible` indicator. WCAG 4.1.2/2.1.1/2.4.7.                                                             |
| 3     | #431  | OOB fetched via dev-tool endpoint (pre-existing)                                 | PR #420       | GameView fetches OOB from `/api/tools/oob-editor/data`, gated by `MAP_EDITOR_ENABLED`. In production without the tool enabled, unit counter display silently breaks. Functional dependency on a dev tool that must be resolved before any production deployment. |
| 2     | #435  | a11y: `overflow:hidden` on html/body clips non-game-route scroll and zoom reflow | PR #433       | Document-level `overflow:hidden` removes scroll from all routes including `LobbyView`. Low impact today; grows as routes or game-row count increases. Scope to game-route layout only.                                                                           |
| 2     | #432  | `aria-label` uses raw unit ID not human-readable name (pre-existing)             | PR #420       | Screen readers announce "Select unit unit-a" instead of the brigade name. Can be fixed once OOB enrichment is wired through UnitCounterLayer.                                                                                                                    |
| 2     | #427  | Double `loadMap()` call causes startup warning (runtime, dev mode only)          | PR #420       | Both `games.js` and `mapTest.js` call `loadMap()` at module scope, emitting a runtime warning in dev mode. Not a test/prod issue but adds noise during development.                                                                                              |
| 2     | #426  | `gridSpec`→calibration merge relies on incidental field-name overlap             | PR #420       | Merge works only because field names happen to match calibration fields. No contract enforces this — a renaming on either side silently falls back to defaults.                                                                                                  |
| 2     | #425  | Store exposes raw `gridSpec` without sanitization contract                       | PR #420       | Raw API data flows from store to GameView without shape validation. Unexpected structure from `/map-config` fails silently inside the merge. A Zod schema at store boundary would catch mismatches at load time.                                                 |
| 2     | #424  | `useCalibration.js` mixes Map-Editor composable with app-wide pure utils         | PR #420       | `sanitizeCalibration` used by GameView lives in a Map-Editor composable, creating an implicit app→tool-layer dependency. Extracting the pure utility prevents accidental coupling.                                                                               |
| 2     | #423  | 503 startup-error branch untested and uncoverable with current mock              | PR #420       | The error branch when `loadMap()` fails at module init cannot be covered because the module is already initialized when tests run. Untested correctness gap in the error path.                                                                                   |
| 2     | #422  | Silent map-config failure leaves blank map with no user-visible error            | PR #420       | When map-config fetch fails, game view silently renders with default calibration and no hexes. A minimal non-fatal error indicator would make failures diagnosable without changing the non-fatal design.                                                        |
| 2     | #421  | `/:id/map-config` URL is game-scoped but data is scenario-static                 | PR #420       | Route implies per-game data but config is scenario-static. Low impact with one scenario but misleads future contributors and will require a breaking API change for multi-scenario support.                                                                      |
| 2     | #403  | Add Content-Security-Policy headers to Express server                            | PR #400       | No CSP on the Express server. Low risk in dev-only deployment; becomes meaningful when M8 ships public upload routes. Address with `helmet()` at M8 auth hardening.                                                                                              |
| 2     | #402  | Unify GameView.vue fetch strategies (store vs raw fetch)                         | PR #400       | Three different loading patterns in one `onMounted`: store action, raw fetch ×2. Low coupling risk today; natural resolution at M8 when dev-tool endpoints are replaced by production routes.                                                                    |
| 2     | #383  | Implement Rally Phase handler with per-unit rally rolls (LOB §6.3)               | PR #375       | Requires morale state tracking (DG/Routed units) from M6. No units qualify at M5 depth. Safe stub.                                                                                                                                                               |
| 2     | #382  | Implement Fluke Stoppage step handler (LOB §10.7)                                | PR #375       | Requires accepted attack order data from M6. No impact at M5 depth.                                                                                                                                                                                              |
| 2     | #381  | Implement Attack Recovery step handler (LOB §10.6b)                              | PR #375       | Correctly stubbed at M5; requires combat result data (stopped attack orders) from M6 combat track. No game-correctness impact until attack orders can be stopped.                                                                                                |
| 2     | #379  | getValidActions should enumerate all legal actions for current state             | PR #375       | Returns stubs by design at M5 depth; full enumeration requires unit/leader position data from the game map UI. Deferred to M6 game map track.                                                                                                                    |
| 2     | #350  | server: add rate limiting on POST /api/v1/games routes                           | PR #348       | POST /api/v1/games and POST /:id/join have no per-IP rate limit. UUID unguessability mitigates enumeration risk pre-M8. Deferred to M8 auth hardening alongside OAuth; not blocking for dev/testing.                                                             |
| 1     | #436  | test: useOobData deep-recursion gap; `oobError` raw server message to DOM        | PR #433       | `collectOobUnits` tested only one level deep; 3-level traversal regression undetected. Raw fetch error string assigned to reactive ref rendered in error banner — benign source but poor pattern.                                                                |
| 1     | #430  | No caching headers on unauthenticated `/map-config` endpoint                     | PR #420       | Scenario-static map config is refetched on every game load with no cache headers. Adding `Cache-Control` would reduce redundant requests at negligible implementation cost.                                                                                      |
| 1     | #429  | Inconsistent `STUB_GRID_SPEC` fixtures across test files                         | PR #420       | Two test files define the fixture independently with different values. Cosmetic inconsistency that makes cross-file schema changes harder to track.                                                                                                              |
| 1     | #428  | `sanitizeCalibration` merge semantics unverified in `GameView.test.js`           | PR #420       | Partial-override cases are not asserted in `GameView.test.js`. Merge behavior is tested implicitly but not documented as explicit test cases.                                                                                                                    |
| 1     | #387  | playerSide in dispatch must be sourced from session, not request body            | PR #386       | No action endpoint exists yet (#356); the session-to-side mapping is a route-layer responsibility. Enforce at the route boundary when #356 is implemented.                                                                                                       |
| 1     | #385  | Add property-based / fuzz tests for dispatch round-trips                         | PR #375       | Nice-to-have for a rules engine; not blocking. No correctness impact; no milestone assigned.                                                                                                                                                                     |
| 1     | #205  | useOobStore: consider lazy-loading bundled JSON fallbacks                        | PR #200       | Static imports of oob.json and leaders.json are included in the store chunk even when the server fetch succeeds. Impact is minimal due to lazy-loaded route; noted for future bundle analysis.                                                                   |
| 1     | #204  | OobTreeNode expand/collapse: 200–300 per-instance watchers on shared signals     | PR #200       | Each of ~200 tree nodes installs two watch() calls on injected counter refs. Correct and fast at current scale; flagged for awareness if tree grows to 1000+ nodes.                                                                                              |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
