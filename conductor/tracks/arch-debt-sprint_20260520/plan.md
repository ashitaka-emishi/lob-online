# Implementation Plan: Architecture Debt Sprint — Issues #393 #394 #370 #322 + Process Fix

**Track ID:** arch-debt-sprint_20260520
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-20
**Status:** [x] Complete

## Overview

Close five actionable debt items in three phases. Phase 1 is a trivial process + comment
fix (two tasks, no test changes). Phase 2 extracts `isOrderHolder()` to a new queries
module (small refactor, test import update). Phase 3 extracts the scenario cache from
`games.js` and adds bounds to `pickMods()` (route + engine changes, behavioral test for
bounds). Closeout updates the debt register and closes the four GitHub issues.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals

## Risk Classification

**Risk:** Low
**Reason:** Pure code organisation and a one-line validation tightening; no game-rule logic,
auth/session, schema shape, or persistence behaviour is changed.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated; issues #393 #394 #370 #322 closed
- [x] Ready for `/team-review`

---

## Phase 1: Process and Traceability Fixes

Two trivial changes with no test impact.

### Tasks

- [x] Task 1.1: Stage and verify the uncommitted `.claude` changes — confirm both
      `.claude/commands/tech-debt-report.md` and `.claude/rules/agentic-quality-rails.md`
      contain the `tech-debt` label step. These files are already modified; they will be
      included in the PR commit.
- [x] Task 1.2: Fix `complexDefense` sentinel comment in `server/src/engine/init.js:24`.
      Look up the authoritative section in `docs/reference/LOB_GAME_UPDATES.pdf` (or search
      `docs/reference/` for the source). Update the comment to cite the specific section/page.
      If the source doc is not available, note `LOB_GAME_UPDATES — SM section (source doc
unavailable; page reference TBD)` so it is clearly flagged for later resolution.

### Verification

- [x] `git diff --stat` shows `.claude/` changes staged
- [x] `grep -n "complexDefense" server/src/engine/init.js` shows an updated citation

---

## Phase 2: Extract isOrderHolder to engine/queries.js (#394)

Create a dedicated query-predicate module so M6 callers import from a semantically correct
location, not the initialiser.

### Tasks

- [x] Task 2.1: Create `server/src/engine/queries.js`. Move `isOrderHolder()` from
      `init.js` to `queries.js`, preserving the JSDoc and rule citations verbatim.
- [x] Task 2.2: Remove `isOrderHolder` export from `server/src/engine/init.js` (the full
      function body and JSDoc; keep the comment block at lines 21–28 that cites LOB §10.3 and
      §10.6, as those pertain to `mapOrder` which stays).
- [x] Task 2.3: Update `server/src/engine/init.test.js` — change the import line to pull
      `isOrderHolder` from `'./queries.js'` instead of `'./init.js'`. All existing
      `isOrderHolder` tests must continue to pass unchanged.
- [x] Task 2.4: Update the schema comment in `server/src/schemas/gameState.schema.js:66`
      — change `engine/init.js` to `engine/queries.js` in the pointer comment.
- [x] Task 2.5: Write `server/src/engine/queries.test.js` — minimal smoke tests that
      `isOrderHolder` is importable from `queries.js` and returns the same results as the
      existing integration tests in `init.test.js`. (The full behavioral coverage stays in
      `init.test.js`; this file verifies the new module exports correctly.)

### Verification

- [x] `npm run test` — all `isOrderHolder` tests pass; no imports from `init.js` for the
      predicate remain in non-init files
- [x] `grep -rn "isOrderHolder" server/src/` — only `queries.js`, `queries.test.js`, and
      `init.test.js` (for the integration tests that call `initGameState` + predicate together)

---

## Phase 3: Scenario Cache Extraction + pickMods Bounds (#393, #322)

Two independent changes — route coupling fix and input validation tightening.

### Tasks

- [x] Task 3.1: In `server/src/engine/scenario.js`, add the lazy cache: `let _cache = null`,
      `export function getScenario(path)` (calls `loadScenario(path)` on first call, returns
      cached value thereafter), and `export function clearScenarioCache()` (sets `_cache = null`).
      Do not change `loadScenario`; `getScenario` wraps it with the cache layer.
- [x] Task 3.2: In `server/src/routes/games.js`, remove the `_scenario` variable, the
      anonymous getter function, and the `clearScenarioCache` export. Add an import of
      `getScenario` from `'../engine/scenario.js'`. Replace all internal calls to the old
      getter with `getScenario()`. The `clearScenarioCache` export must be gone.
- [x] Task 3.3: In `server/src/routes/scenarioEditor.js`, change the import from
      `'./games.js'` to `'../engine/scenario.js'` for `clearScenarioCache`. No other changes.
- [x] Task 3.4: Add a unit test in `server/src/engine/scenario.test.js` (or the existing
      scenario test file if one exists) that verifies `getScenario()` returns a cached result
      on second call and `clearScenarioCache()` causes a fresh load on the next call.
- [x] Task 3.5: In `server/src/routes/tableTest.js`, update `pickMods()` to clamp numeric
      keys with domain bounds: add a `bounds` parameter (optional map of key → `{min, max}`).
      At each numeric call site, pass `{ leaderMoraleValue: { min: 0, max: 4 }, range: { min: 0,
max: 99 } }` per LOB §6.1 and LOB §5.6. Add a rule citation comment for each bound.
- [x] Task 3.6: Add tests for `pickMods` bounds in `server/src/routes/tableTest.test.js`:
      verify that values outside the domain are clamped, not rejected, so the engine always
      receives a valid number.

### Verification

- [x] `npm run test` — scenario cache and pickMods bounds tests pass
- [x] `grep -rn "clearScenarioCache\|_scenario" server/src/routes/games.js` returns nothing
- [x] `grep -n "from.*games" server/src/routes/scenarioEditor.js` returns nothing

---

## Phase 4: Debt Register Closeout

### Tasks

- [x] Task 4.1: Run `/tech-debt-report` (or manually) — record PR in debt-over-time table,
      remove #393 #394 #370 #322 from open items, update net score.
- [x] Task 4.2: Close GitHub issues #393, #394, #370, #322 with a merge summary comment.
- [x] Task 4.3: Run `npm run quality:strict` for final gate check.

### Verification

- [x] `docs/tech-debt/report.md` open items table no longer lists #393 #394 #370 #322
- [x] All four GitHub issues show as closed

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] `npm run quality:strict` passes clean
- [x] No unexpected warnings in test output
- [x] Debt register updated
- [x] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
