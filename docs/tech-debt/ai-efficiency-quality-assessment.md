# AI Efficiency and Code Quality Assessment

_Analysis date: 2026-05-06_

## Executive Answer

This report uses `lob-online` as a case study in largely AI-written software with minimal human
guidance beyond direction, review, issue triage, and final testing. The goal is not to prove a
universal answer about AI development, but to answer a narrower question: what does this project
show about AI-assisted delivery when the process is intentionally loose and close to "vibe coded"?

| Question                               | Answer                                                                                                                                                                                                                           | Confidence      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Was the AI-written approach efficient? | **Yes for prototype velocity; mixed for internal-production efficiency.** The project produced a broad working system quickly, but roughly **27-28% of source/test churn** is explicit tech-debt correction.                     | **Medium**      |
| Is the code good overall?              | **Acceptable for an internal prototype; not yet good for an internal production app.** The test/build/lint posture is strong, but open debt, warning noise, incomplete data, and some large orchestration surfaces still matter. | **Medium-high** |
| What improves the numbers?             | Better milestone planning, smaller reviewable increments, warning-free quality gates, immediate debt tagging, and explicit architecture reviews before AI implementation bursts.                                                 | **High**        |

Using the requested quality scale, my rating is:

> **Acceptable**, with a credible path to **Good** after the current production-readiness gaps are
> closed.

It is not "the best" because the system still shows churn from late stabilization and has known
open debt. It is not "not acceptable" or "hazardous to deploy" because the current evidence shows
passing lint, passing build, passing data validation, and a large passing automated test suite.

## Preface: What This Project Is

`lob-online` is an online implementation of the _Line of Battle v2.0_ wargame system, starting
with the South Mountain scenario. The repository was scaffolded on **2026-02-19** and this analysis
was performed on **2026-05-06**, so the project has been running for about **76 days**, or roughly
**11 weeks**.

This is a prototype, but it is not a toy script. In small-business-app terms, it is comparable to a
line-of-business system with:

- A browser application with multiple workflow screens and specialist workbenches.
- An Express server with API routes, session handling, auth boundaries, persistence, and Socket.io.
- SQLite-backed game records plus JSON scenario, map, leader, order-of-battle, and game-state data.
- Admin-style editing tools for map data, scenario setup, order of battle, counters, rules tables,
  and test workflows.
- Data validation and asset-processing scripts comparable to import, ETL, or back-office data
  hygiene jobs.
- A domain rules engine comparable to pricing, eligibility, scheduling, workflow, or compliance
  logic in a business application.

The domain also has real complexity. The code is modeling hex-grid geometry, terrain, elevation,
line of sight, movement rules, command range, combat/morale/charge tables, scenario setup, leader
succession, counter images, and validation against historical source data. For an AI-development
case study, that makes the project more informative than "some person's personal app": it combines
UI state, backend state, domain rules, data preparation, test tools, and evolving quality controls.

## Methodology

### Research Workflow

The research workflow for this report was:

1. Read the standalone rewrite/churn analysis in `docs/tech-debt/code-rewrite-analysis.md`.
2. Read the current tech-debt register summary in `docs/tech-debt/report.md`.
3. Review project context from `README.md`, `docs/designs/high-level-design.md`, and
   `docs/devlog/2026-02-19.md`.
4. Inspect Git history and first-parent churn totals used by the original rewrite analysis.
5. Review milestone and tech-debt tracking, including the commits and issue references included
   in the debt-fix table below.
6. Run or review current quality gates:
   - `npm run validate-data`
   - `npm run lint`
   - `npm run test`
   - `npm run build`
   - `npm run format:check`
7. Perform a targeted code-review pass across:
   - Server route/auth/session boundaries.
   - Persistence modules.
   - Schema validation.
   - Rules engine modules.
   - Map editor architecture.
   - Lobby/game-entry flow.
   - Data processing scripts.
   - Test coverage patterns.
8. Convert the findings into answers with confidence levels, supporting evidence, and reasoning.

### References Used

| Reference                                 | Why it matters                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `README.md`                               | Defines stack, architecture, tools, and project purpose.                     |
| `docs/designs/high-level-design.md`       | Gives milestone scope, system architecture, and implementation status.       |
| `docs/devlog/2026-02-19.md`               | Establishes project start date and initial scaffold scope.                   |
| `docs/tech-debt/code-rewrite-analysis.md` | Provides the narrow source analysis for tech-debt churn and rewrite metrics. |
| `docs/tech-debt/report.md`                | Shows current tech-debt posture and remaining risk areas.                    |
| Git history                               | Provides dates, commit subjects, churn totals, and debt-fix commits.         |
| GitHub tech-debt issues/milestones        | Identifies which work was explicit debt remediation.                         |
| Automated checks                          | Separates code-quality claims from subjective review impressions.            |

### Confidence Model

| Confidence | Meaning                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------ |
| High       | Supported by automated checks plus direct code/history evidence.                           |
| Medium     | Supported by multiple repo signals but still requiring interpretation.                     |
| Low        | Plausible, but limited by missing time/cost, production usage, or external benchmark data. |

The efficiency conclusion is only **medium confidence** because the repository does not contain
actual human-hours data. The quality conclusion is **medium-high confidence** because it is grounded
in direct code review and automated checks, but the app has not been judged against real production
usage.

## Verification Snapshot

Current quality-gate evidence:

| Check                                                                     | Result                     | Evidence                                                       |
| ------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------- |
| `npm run validate-data`                                                   | Passing with warnings      | 0 errors; 2 warnings, including map terrain completeness.      |
| `npm run lint`                                                            | Passing                    | ESLint completed with no reported failures.                    |
| `npm run test`                                                            | Passing                    | 110 test files passed; 2,001 tests passed.                     |
| `npm run build`                                                           | Passing                    | Vite production build completed successfully.                  |
| `npm run format:check`                                                    | Failed before this rewrite | Prettier flagged the report content before it was reformatted. |
| `npx prettier --check docs/tech-debt/ai-efficiency-quality-assessment.md` | Passing after this rewrite | This report now matches Prettier style.                        |

Important nuance: the test suite passes, but the output included some Vue prop warnings in
`MapEditorView.test.js`. Those warnings are not deployment blockers by themselves, but they are a
quality signal: a production-ready internal app should aim for clean test output, not merely passing
test output.

The data validator also passes but reports that many map hexes still have `terrain="unknown"`.
That is expected for a prototype with ongoing map digitization, but it matters when judging
production readiness.

## Efficiency Assessment

### Short Answer

The project appears **efficient for prototype exploration and breadth**, but only **mixed for
internal-production delivery**.

That is the key distinction. If the goal is to push AI hard and see how far it can get with limited
management, the result is impressive: in about 11 weeks, the project accumulated a working client,
server, data model, validation tooling, rules-engine foundation, admin/dev tools, and a large test
suite.

If the comparison is a solo senior developer delivering an internal production app, the conclusion
is more cautious. The system has produced a lot of useful code, but it has also needed repeated
formal debt sprints. Roughly a quarter of all measured source/test code activity is explicitly tied
to debt reduction.

### Rewrite and Churn Metrics

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

### How I Arrive at the Efficiency Answer

Evidence supporting "efficient":

- The project moved from scaffold to a multi-part app in about 76 days.
- The system includes frontend workflows, backend routes, persistence, schemas, editor tools,
  rules-engine modules, data validation, and automated tests.
- Current gates are mostly healthy: lint, test, build, and data validation pass.
- The test suite is unusually broad for a prototype: 110 files and 2,001 tests.
- The tech-debt register shows repeated cleanup sprints reducing known debt instead of letting it
  accumulate invisibly.

Evidence against a simple "AI was efficient" conclusion:

- **27.6%** of source/test churn is explicit tech-debt work.
- **27.1%** of production-only churn is explicit tech-debt work.
- Production-code deletions are disproportionately debt-related: **43.0%** of all production
  deletions came from tech-debt commits.
- Large debt commits indicate stabilization after broad implementation, especially around editor
  architecture, test gaps, schema gaps, and performance.
- Several debt sprints happened near milestone boundaries, which suggests AI could generate
  substantial scope faster than the architecture could stabilize.

Conclusion:

> The AI workflow was efficient at producing working breadth, tests, and iteration speed. It was
> less efficient at producing production-shaped code on the first pass. The measured rework rate is
> not fatal, but it is material.

Confidence: **Medium**. The repo strongly supports the rework and quality-gate claims. It does not
contain time tracking, cost accounting, or a controlled human baseline, so the comparison to a solo
senior developer remains an informed estimate rather than a measurement.

## Code Quality Assessment

### Rating

For an internal production app, this code rates:

> **Acceptable**

For its actual current context, an internal prototype:

> **Good prototype quality**

It is close to "Good" for internal production in some areas, especially tests and validation, but
the remaining issues keep it below that line.

### What Is Good

Strong automated safety net:

- Lint passes.
- Build passes.
- Data validation passes.
- The automated test suite is broad and passing.
- Coverage infrastructure exists with a configured line threshold.

Good boundary discipline in several backend areas:

- `server/src/routes/games.js` is compact and has explicit UUID validation on route params.
- Session identity is isolated in `server/src/auth/session.js`.
- `server/src/auth/requireSide.js` keeps route authorization small and readable.
- `server/src/store/gameSqlite.js` uses prepared statements and typed errors for join failures.
- Scenario/map loading uses containment guards to reduce path traversal risk.

Good schema and data posture:

- Zod schemas exist for core data contracts.
- Data validation catches cross-reference and map-completeness issues.
- Client-side draft validation rejects unknown top-level map keys and malformed local drafts.

Good engineering learning loop:

- The project records tech debt as issues.
- Debt closeout commits reference issue IDs.
- Large cleanup sprints are visible and measurable.
- Tests are often added as part of debt remediation, not only after feature work.

### What Keeps It Below "Good" for Internal Production

Open production-readiness debt remains:

- The current tech-debt report identifies remaining open items and an elevated risk posture.
- The highest-risk remaining item in the local report is an auth-related gap.
- Some older report state may be stale relative to GitHub issue closure, which itself shows the
  tracking system needs careful synchronization.

Large frontend orchestration surface:

- `client/src/views/tools/MapEditorView.vue` is still about **1,071 lines**.
- It has been improved through composable extraction, but it remains a large coordination point.
- Large orchestration files are not automatically bad, but they raise review and regression risk.

Warning noise:

- Passing tests still emit Vue prop warnings around map editor tool panels.
- A clean internal-production bar should treat warning-free tests as part of done.

Prototype data completeness:

- `npm run validate-data` passes, but the map still has many unknown terrain hexes.
- This is acceptable for in-progress digitization, but it limits production-readiness claims.

AI-shaped rework pattern:

- The codebase shows a pattern of fast generation followed by formal debt sprints.
- That is manageable, but it means quality depends on the review/debt process. Without that process,
  quality would likely decay quickly.

### Code Review Verdict

The code is not hazardous. It has tests, validation, separation of concerns in many backend areas,
and an active debt process. It is also not "the best" or fully "good" by internal production
standards because the current evidence still shows open risk, warning noise, large UI coordination
surfaces, and unfinished data.

The best concise assessment is:

> The project is **well-tested and increasingly disciplined**, but it reached that state through
> repeated remediation. The current code is acceptable for a controlled internal prototype and
> plausible for internal production after targeted hardening.

Confidence: **Medium-high**. This is grounded in direct code review and passing automation, but it
does not include production telemetry, security review, load testing, or real-user incident data.

## Current Size Context

Current repository size under the same filters used for the churn analysis:

| Scope                          | Current lines | Files |
| ------------------------------ | ------------: | ----: |
| Source + tests + workflow code |        43,118 |   266 |
| Production source only         |        20,096 |   144 |

The debt-fix code churn of 18,318 lines is about **42.5%** of the current source/test code size.
That is not the same as saying 42.5% of the current code is debt work. Churn counts lines that were
added and later removed. It is a measure of rework effort, not final code composition.

## Original Churn Methodology

The churn analysis uses `git log --first-parent --numstat` so squash/merge history is counted once,
without double-counting branch commits.

Included as code:

- `client/`
- `server/`
- `scripts/`
- `cypress/`
- `.claude/`
- `.github/workflows/`
- Package/config files such as `package.json`, `vitest.config.js`, and `eslint.config.js`.

Excluded from code totals:

- `docs/`
- `conductor/`
- `data/`
- `package-lock.json`
- Markdown, PDFs, images, and project paperwork.

Tech-debt fix commits were identified by either:

- Commit subjects containing debt language such as `debt`, `tech-debt`, `debt sprint`,
  `debt closeout`, `score-*`, or `clean register`.
- Commit subjects referencing issue numbers tagged or identified as `tech-debt`.

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

Client-side cleanup dominates the historical debt work, mostly from map editor and OOB editor
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
tool/test work around Map Test and Table Test. This means "debt-fix additions" includes
debt-driven hardening and coverage, not only literal refactoring.

The largest pure refactor-looking entries are:

- `f1bb487` - MapEditorView composable extraction: 2,911 lines of code churn.
- `8fe7ce4` - M3 final debt closeout: 1,799 lines of code churn.
- `c5d2cf5` - M2 debt sprint: 1,072 lines of code churn.
- `b5fb5ab` - pre-M5 debt sprint: 1,015 lines of code churn.

## What Affects These Numbers

### 1. AI Autonomy

The more freedom the AI has, the faster it can create broad surface area. That same freedom also
increases the chance of duplicate patterns, late abstractions, and missed cross-cutting constraints.

Effect on numbers:

- Higher feature throughput.
- Higher cleanup churn.
- More post-hoc tests and refactors.

### 2. Milestone Size

Large milestone bursts produce many interacting surfaces before review can stabilize them. This
appears especially visible around the map editor, OOB editor, and M3 rules/testing tools.

Effect on numbers:

- More code written before architectural feedback lands.
- Larger debt sprints near milestone closeout.
- More mixed commits where feature work, tests, and cleanup are hard to separate.

### 3. Tests as Debt Fixes

A large share of tech-debt additions are tests. That is good for long-term confidence, but it means
debt "rewrite" numbers include safety-net construction, not only replacing bad runtime code.

Effect on numbers:

- Higher debt-fix addition count.
- Lower future regression risk.
- Better maintainability, even when production code churn looks high.

### 4. Tech-Debt Tracking Discipline

This project is unusually transparent about debt. Because review findings are filed and closed as
issues, the rework is visible. A less disciplined project could look more efficient simply because
it fails to measure the same cleanup.

Effect on numbers:

- Higher apparent debt rate.
- Better accountability.
- Easier milestone readiness decisions.

### 5. Prototype Data Completeness

The data layer is still evolving. Unknown terrain hexes and ongoing scenario digitization create
quality gates that are different from pure code quality gates.

Effect on numbers:

- Some "quality" work is really data completeness.
- Validation warnings remain even when code is correct.
- Production readiness depends on both code and data maturity.

## How to Improve the Numbers

1. Add a short architecture review before every milestone.
   - Define module boundaries, data ownership, and expected tests before implementation.

2. Keep AI implementation batches smaller.
   - Smaller PRs should reduce late refactor churn and make review findings more precise.

3. Treat warning-free tests as part of done.
   - Passing tests with Vue warnings should not be accepted as final for internal production.

4. Create tech-debt issues at the moment debt is accepted.
   - This prevents later archaeology and keeps the debt register synchronized with reality.

5. Add a targeted second-pass review trigger after review fixes.
   - Skip full review reruns for low-risk cleanup, but require a targeted second pass when fixes
     touch auth, persistence, schemas, shared engine paths, shared stores/composables, API
     contracts, or broad multi-file refactors.

6. Separate feature commits from debt/test commits when practical.
   - Cleaner commit boundaries make future productivity and rework analysis more accurate.

7. Add a production-readiness checklist.
   - Include auth/security review, data completeness, logging/error policy, backup/restore,
     performance sanity checks, and clean validation output.

8. Track AI rework rate by milestone.
   - For each milestone, track feature churn, debt churn, test churn, defects found, and debt left
     open. This is the strongest way to tell whether the AI workflow is improving.

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
- No exact human-hours data was used, so the solo-senior comparison is an inferred benchmark rather
  than a measured one.
- The project has not been evaluated with production telemetry, load testing, a formal security
  review, or real internal users.

## Bottom Line

This AI-heavy workflow produced a surprisingly substantial application in about 11 weeks. It has a
browser client, server, persistence, domain rules, admin/data tools, validation scripts, and a large
test suite. That is a strong signal that AI can create real small-business-app-scale software quickly
when guided by someone who can test, review, and redirect it.

The cost is visible rework. Roughly **26-28%** of code-writing/churn budget has gone into explicit
technical debt reduction. That does not mean the approach failed. It means unmanaged AI coding can
move very fast, but the missing management does not disappear; it reappears as review work, issue
triage, cleanup sprints, warnings, and production-readiness gaps.

My final read:

> AI was efficient here as an accelerator for breadth and iteration. It was not automatically
> efficient as a substitute for senior engineering judgment. The best results came when AI output
> was paired with tests, debt tracking, and milestone cleanup.

For a dev shop, the lesson is not "let AI freely build everything" or "AI code is too risky." The
better lesson is:

> AI can produce internal-app-scale systems quickly, but the organization needs explicit controls
> for architecture, review, warnings, security, data quality, and rework tracking. Without those
> controls, the apparent speed can become deferred engineering cost.
