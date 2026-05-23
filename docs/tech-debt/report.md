# Technical Debt Report — lob-online

_Last updated: 2026-05-23 after PR #449._

---

## Executive Summary

| Metric                           | Value                                                      |
| -------------------------------- | ---------------------------------------------------------- |
| Open debt items                  | 11                                                         |
| Cumulative debt score (net open) | 18                                                         |
| Highest-risk item                | perf: sequential fetch latency in loadGame (#440, score 2) |
| PRs tracked                      | 207                                                        |

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
| 2026-05-22 | PR #437                                                        | 17                   | 0         | 355                      |
| 2026-05-22 | PR #437 (resolved #421)                                        | -2                   | —         | 355                      |
| 2026-05-22 | PR #437 (resolved #422)                                        | -2                   | —         | 355                      |
| 2026-05-22 | PR #437 (resolved #423)                                        | -2                   | —         | 355                      |
| 2026-05-22 | PR #437 (resolved #424)                                        | -2                   | —         | 355                      |
| 2026-05-22 | PR #437 (resolved #425)                                        | -2                   | —         | 355                      |
| 2026-05-22 | PR #437 (resolved #426)                                        | -2                   | —         | 355                      |
| 2026-05-22 | PR #437 (resolved #427)                                        | -2                   | —         | 355                      |
| 2026-05-22 | PR #437 (resolved #428)                                        | -1                   | —         | 355                      |
| 2026-05-22 | PR #437 (resolved #429)                                        | -1                   | —         | 355                      |
| 2026-05-22 | PR #437 (resolved #430)                                        | -1                   | —         | 355                      |
| 2026-05-23 | PR #448                                                        | 0                    | -14       | 355                      |
| 2026-05-23 | PR #448 (resolved #436)                                        | -1                   | —         | 355                      |
| 2026-05-23 | PR #448 (resolved #438)                                        | -2                   | —         | 355                      |
| 2026-05-23 | PR #448 (resolved #439)                                        | -1                   | —         | 355                      |
| 2026-05-23 | PR #448 (resolved #442)                                        | -2                   | —         | 355                      |
| 2026-05-23 | PR #448 (resolved #443)                                        | -1                   | —         | 355                      |
| 2026-05-23 | PR #448 (resolved #444)                                        | -1                   | —         | 355                      |
| 2026-05-23 | PR #448 (resolved #445)                                        | -2                   | —         | 355                      |
| 2026-05-23 | PR #448 (resolved #446)                                        | -2                   | —         | 355                      |
| 2026-05-23 | PR #448 (resolved #447)                                        | -2                   | —         | 355                      |
| 2026-05-23 | PR #449                                                        | 0                    | -14       | 355                      |
| 2026-05-23 | PR #449 (resolved #431)                                        | -3                   | —         | 355                      |
| 2026-05-23 | PR #449 (resolved #432)                                        | -2                   | —         | 355                      |
| 2026-05-23 | PR #449 (resolved #402)                                        | -2                   | —         | 355                      |
| 2026-05-23 | PR #449 (resolved #434)                                        | -3                   | —         | 355                      |
| 2026-05-23 | PR #449 (resolved #435)                                        | -2                   | —         | 355                      |
| 2026-05-23 | PR #449 (resolved #441)                                        | -2                   | —         | 355                      |

_One row is appended per PR cycle by `/tech-debt-report`. "Net Delta" = debt added minus debt closed per PR (negative = net improvement); populated on main PR rows only, "—" on resolution sub-rows. "Cumulative Added" is a gross historical total that only increases; it differs from the Executive Summary net score once items are resolved._

---

## Risk Assessment

Elevated risk. Several significant deferred items that introduce coupling or architectural compromise. Recommend a debt reduction sprint before the next major phase.

PR #449 (pre-M6 debt sprint) closed 6 items (#431, #432, #402, #434, #435, #441 — 14 points), reducing the net open score from 32 to 18. No score-3 items remain. Current debt is concentrated in two categories: (1) seven score-2 items — one performance concern (#440 sequential fetch latency), four rules-engine stubs (#379, #381, #382, #383 — will close at M6), and two security/infra items (#350 rate limiting, #403 CSP) deferred to M8; and (2) four score-1 items with no milestone pressure.

---

## Open Debt Items

_Ordered by score descending (ties: newest first). Resolved items are removed._

| Score | Issue | Title                                                                        | PR Introduced | Assessment                                                                                                                                                                                                               |
| ----- | ----- | ---------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2     | #440  | perf: sequential fetch latency in loadGame                                   | PR #437       | `loadGame` serializes game-state and map-config fetches because `scenarioId` is only known after the first response. Could be parallelized with `scenarioId` available up-front. No user-visible issue at current scale. |
| 2     | #403  | Add Content-Security-Policy headers to Express server                        | PR #400       | No CSP on the Express server. Low risk in dev-only deployment; becomes meaningful when M8 ships public upload routes. Address with `helmet()` at M8 auth hardening.                                                      |
| 2     | #383  | Implement Rally Phase handler with per-unit rally rolls (LOB §6.3)           | PR #375       | Requires morale state tracking (DG/Routed units) from M6. No units qualify at M5 depth. Safe stub.                                                                                                                       |
| 2     | #382  | Implement Fluke Stoppage step handler (LOB §10.7)                            | PR #375       | Requires accepted attack order data from M6. No impact at M5 depth.                                                                                                                                                      |
| 2     | #381  | Implement Attack Recovery step handler (LOB §10.6b)                          | PR #375       | Correctly stubbed at M5; requires combat result data (stopped attack orders) from M6 combat track. No game-correctness impact until attack orders can be stopped.                                                        |
| 2     | #379  | getValidActions should enumerate all legal actions for current state         | PR #375       | Returns stubs by design at M5 depth; full enumeration requires unit/leader position data from the game map UI. Deferred to M6 game map track.                                                                            |
| 2     | #350  | server: add rate limiting on POST /api/v1/games routes                       | PR #348       | POST /api/v1/games and POST /:id/join have no per-IP rate limit. UUID unguessability mitigates enumeration risk pre-M8. Deferred to M8 auth hardening alongside OAuth; not blocking for dev/testing.                     |
| 1     | #387  | playerSide in dispatch must be sourced from session, not request body        | PR #386       | No action endpoint exists yet (#356); the session-to-side mapping is a route-layer responsibility. Enforce at the route boundary when #356 is implemented.                                                               |
| 1     | #385  | Add property-based / fuzz tests for dispatch round-trips                     | PR #375       | Nice-to-have for a rules engine; not blocking. No correctness impact; no milestone assigned.                                                                                                                             |
| 1     | #205  | useOobStore: consider lazy-loading bundled JSON fallbacks                    | PR #200       | Static imports of oob.json and leaders.json are included in the store chunk even when the server fetch succeeds. Impact is minimal due to lazy-loaded route; noted for future bundle analysis.                           |
| 1     | #204  | OobTreeNode expand/collapse: 200–300 per-instance watchers on shared signals | PR #200       | Each of ~200 tree nodes installs two watch() calls on injected counter refs. Correct and fast at current scale; flagged for awareness if tree grows to 1000+ nodes.                                                      |

---

_Generated and maintained by `/tech-debt-report`. See `docs/tech-debt/README.md` for conventions._
