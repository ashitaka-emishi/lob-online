# Tech Debt Rewrite Analysis

_Generated: 2026-05-06_

> This is the original narrow churn/rewrite report. The broader AI-delivery assessment in
> `docs/tech-debt/ai-efficiency-quality-assessment.md` incorporates this document as evidence and
> extends it with project context, methodology, code-quality review, and improvement
> recommendations.

## Summary

This report estimates how much project code has been rewritten or added specifically to fix
technical debt.

Using first-parent Git history and counting source/test code only:

| Metric                             | All code history | Tech-debt fix work | Share |
| ---------------------------------- | ---------------: | -----------------: | ----: |
| Code additions                     |           54,739 |             14,258 | 26.1% |
| Code deletions                     |           11,594 |              4,060 | 35.0% |
| Code churn (additions + deletions) |           66,333 |             18,318 | 27.6% |

For production source only, excluding tests:

| Metric                                   | All production history | Tech-debt fix work | Share |
| ---------------------------------------- | ---------------------: | -----------------: | ----: |
| Production additions                     |                 27,571 |              6,299 | 22.8% |
| Production deletions                     |                  7,448 |              3,206 | 43.0% |
| Production churn (additions + deletions) |                 35,019 |              9,505 | 27.1% |

Interpretation: about **one quarter of all code written** has gone into explicit technical-debt
fixes, and about **28% of total code churn** has been rewrite/cleanup work tied to tech debt.
Production code shows a similar churn share, but a higher deletion share, which is what we would
expect from refactors and cleanup sprints.

## Current Size Context

Current repository size under the same filters:

| Scope                          | Current lines | Files |
| ------------------------------ | ------------: | ----: |
| Source + tests + workflow code |        43,118 |   266 |
| Production source only         |        20,096 |   144 |

The debt-fix code churn of 18,318 lines is about 42.5% of the current source/test code size. That is
not the same as saying 42.5% of the current code is debt work; churn counts lines that were added
and later removed. It is a measure of rework effort, not final code composition.

## Methodology

The analysis uses `git log --first-parent --numstat` so squash/merge history is counted once,
without double-counting branch commits.

Included as code:

- `client/`
- `server/`
- `scripts/`
- `cypress/`
- `.claude/`
- `.github/workflows/`
- package/config files such as `package.json`, `vitest.config.js`, `eslint.config.js`

Excluded from code totals:

- `docs/`
- `conductor/`
- `data/`
- `package-lock.json`
- Markdown, PDFs, images, and project paperwork

Tech-debt fix commits were identified by either:

- commit subjects containing debt language (`debt`, `tech-debt`, `debt sprint`,
  `debt closeout`, `score-*`, `clean register`)
- commit subjects referencing issue numbers that are tagged or identified as `tech-debt`

The initial `feat(tech-debt): technical debt tracking system (#98)` commit was excluded from
debt-fix totals because it created the tracking mechanism rather than rewriting product code to
resolve debt.

## Breakdown by Area

Tech-debt fix churn by code area:

| Area         | Additions | Deletions | Churn |
| ------------ | --------: | --------: | ----: |
| Client app   |     4,748 |     2,350 | 7,098 |
| Client tests |     5,533 |       514 | 6,047 |
| Server tests |     2,426 |       340 | 2,766 |
| Server app   |     1,504 |       856 | 2,360 |
| Scripts      |        37 |         0 |    37 |
| Config/deps  |        10 |         0 |    10 |

Client-side cleanup dominates the historical debt work, mostly from the map editor and OOB editor
refactors. Test additions are also a large share: many debt items were closed by adding coverage
rather than changing runtime behavior.

## Debt-Fix Commits Counted

| Date       | Commit    |   Add | Delete | Churn | Production churn | Subject                                                                                                           |
| ---------- | --------- | ----: | -----: | ----: | ---------------: | ----------------------------------------------------------------------------------------------------------------- |
| 2026-03-17 | `12bcbaf` |    16 |     26 |    42 |               42 | perf(HexMapOverlay): move slope arrow geometry into gridData computed (#87) (#89)                                 |
| 2026-03-17 | `1b63d71` |   212 |     42 |   254 |              148 | perf(HexMapOverlay): throttle onSvgMouseMove with rAF + spatial index (#88) (#90)                                 |
| 2026-03-18 | `1421071` |    60 |     21 |    81 |               46 | perf(#96): trace highlight O(traceEdges) render - replace cellsx6 loop (#108)                                     |
| 2026-03-18 | `167a902` |   270 |     42 |   312 |              101 | chore: minor debt bundle - #119 #123 #127 #128 #129 #130 (#132)                                                   |
| 2026-03-18 | `2543e21` |   157 |     96 |   253 |               32 | test: hygiene bundle - data-testid selectors, factory fixtures, schema superRefine, edge cases (#101-#106) (#113) |
| 2026-03-18 | `b75b097` |   173 |     37 |   210 |              128 | refactor(CalibrationControls): extract ElevationSystemControls (#100) (#109)                                      |
| 2026-03-18 | `eae23f6` |   119 |     18 |   137 |               47 | refactor: extract hexToGameId helper, close debt #118 + #119 (#120)                                               |
| 2026-03-18 | `ed21a66` |    69 |     36 |   105 |              105 | perf/arch: hex index computed + computedEngineExport on-demand (#93) (#107)                                       |
| 2026-03-18 | `f1bb487` | 2,375 |    536 | 2,911 |            1,519 | refactor(#97): extract composables from MapEditorView + unify selection state (#122)                              |
| 2026-03-19 | `ea74c6f` |   112 |    153 |   265 |              125 | fix: schema gap fixes from PR #145 - EdgeFeature enum + hexFeature UI (#146 #147) (#148)                          |
| 2026-03-22 | `e5e0078` |   168 |     49 |   217 |              119 | perf: HexMapOverlay performance quick wins (#159 #160 #163 #164) (#168)                                           |
| 2026-03-23 | `0d09240` |   111 |    125 |   236 |              184 | fix: apply team-review findings + debt report for PR #171 (missed in squash) (#172)                               |
| 2026-03-23 | `5fe078b` |   516 |    395 |   911 |              652 | refactor: minor debt bundle - #111 #112 #154 #162 #165 #166 #170 (#173)                                           |
| 2026-03-23 | `976c237` |   496 |    172 |   668 |              450 | refactor: tech debt closeout - #151 #161 #169 #175 #176 (#178)                                                    |
| 2026-03-23 | `d838002` |   637 |    193 |   830 |              352 | refactor: MapEditorView extraction debt bundle (#125 #126) (#174)                                                 |
| 2026-03-29 | `a98c2d4` |   398 |     78 |   476 |              228 | refactor(oob-editor): debt sprint - #207 #209 #210 #211 (#218)                                                    |
| 2026-03-31 | `67d34a7` |   486 |    340 |   826 |              631 | chore: technical debt cleanup - all 13 open items (#201-#222) (#224)                                              |
| 2026-04-03 | `94b63b0` |   650 |     11 |   661 |               23 | chore(debt): quick cleanup - score-1 trivials + PR #236 test gaps (#252)                                          |
| 2026-04-09 | `c5d2cf5` |   653 |    419 | 1,072 |              512 | fix: M2 debt sprint - Farnsworth variants, editor route factory, persistence tests (#237 #245 #247) (#261)        |
| 2026-04-10 | `2d5b480` |   488 |    142 |   630 |              276 | fix: M2 closeout debt sprint - 12 issues, clean register (#207 #242 #251 #253 #254 #257 #258) (#262)              |
| 2026-04-14 | `86fbecc` | 4,210 |     35 | 4,245 |            2,216 | chore(debt): M3 debt sprint - score-3 cleanup (#284 #288 #289 #300 #302 #303) (#312)                              |
| 2026-04-15 | `947b0c7` |   122 |     40 |   162 |               63 | fix(engine): M3 debt closeout - 9 items closed, score 47->28 (#314)                                               |
| 2026-04-27 | `8fe7ce4` |   971 |    828 | 1,799 |            1,028 | chore: debt final closeout - 15 items, score 28 -> 7 (#315)                                                       |
| 2026-05-06 | `b5fb5ab` |   789 |    226 | 1,015 |              478 | chore: pre-M5 debt sprint - close 9 score->=3 findings from PR #328 (#339)                                        |

## Largest Debt-Rewrite Drivers

The largest single contributor was the M3 debt sprint (`86fbecc`), but much of its churn is new
tool/test work around Map Test and Table Test. That means this report's "debt-fix additions"
includes debt-driven hardening and coverage, not only literal refactoring.

The largest pure refactor-looking entries are:

- `f1bb487` - MapEditorView composable extraction: 2,911 lines of code churn
- `8fe7ce4` - M3 final debt closeout: 1,799 lines of code churn
- `c5d2cf5` - M2 debt sprint: 1,072 lines of code churn
- `b5fb5ab` - pre-M5 debt sprint: 1,015 lines of code churn

## Caveats

This is an estimate, not a perfect cost-accounting ledger.

- Squash commits can mix feature work, in-place review fixes, tests, docs, and debt tracking. The
  path filter removes docs/data churn, but it cannot split mixed source commits perfectly.
- Some early review-follow-up tickets predate the formal tech-debt register. Those were included if
  they were later tagged `tech-debt` or clearly filed as team-review follow-up work.
- Lines changed are a proxy for effort. A 5-line architecture fix can matter more than 500 lines of
  test fixture cleanup.
- "Production source only" excludes tests, but tests were often the actual debt fix for coverage and
  regression-risk issues.

## Bottom Line

The project has spent roughly **26-28% of its code-writing/churn budget** on explicit technical debt
reduction so far.

That is high, but unsurprising for this repo's workflow: it intentionally files review findings as
issues, then runs debt sprints before moving between milestones. The upside is visible in the debt
register: large cleanup sprints repeatedly drove the net open debt score down before M3, M4, and
pre-M5 work continued.
