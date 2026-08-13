# Implementation Plan: Map Data Debt Sprint — Issues #693-696

**Track ID:** map-data-debt-sprint_20260813
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-13
**Status:** [ ] Not Started

## Overview

Close four tracked-debt items surfaced by `/team-review` on PR #692, one phase per issue,
in dependency order (schema/engine understanding first, since #695 informs the others'
context), then a closeout phase that updates the debt register and files closing comments.
Each phase ends with a human checkpoint per this track's Checkpointed interaction mode.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** After each phase (1-5), before moving to the next. Explicit
approval required before promoting `validate-data.js`'s grid-coverage check from `warn()`
to `fail()` (Phase 2) since it changes CI-gate behavior.

## Risk Classification

**Risk:** Medium-High
**Reason:** Touches rules-engine-adjacent test files (`map.test.js`, `movement.test.js`),
a data validation schema (`map.schema.js`), and the build-gate script itself
(`validate-data.js`).

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

## Phase 1: #693 — gridSpec.cols x rows regression test

Add a data-invariant regression test so the `gridSpec.cols` bug class (issue #691) cannot
silently regress.

### Tasks

- [ ] Task 1.1: Read `server/src/engine/map.test.js` to match existing test/fixture style.
- [ ] Task 1.2: Add a test asserting `gridSpec.cols * gridSpec.rows >= ` count of in-grid hex
      records is not the right invariant on its own (a sparse valid map is legal) — assert
      instead that every recorded hex's `col`/`row` falls within `[0, cols)` / `[0, rows)`,
      AND that the maximum recorded `col` is `< gridSpec.cols` (catches an under-sized grid
      that silently clips real columns) using the real `data/modules/south-mountain/map.json`
      fixture already loaded elsewhere in the test file.
- [ ] Task 1.3: Mutation-test by temporarily editing `gridSpec.cols` to 64 in a scratch copy
      (not the real file) and confirming the new test fails; revert the scratch edit.

### Verification

- [ ] New test passes against current data (`cols: 63`)
- [ ] Mutation test confirms the test fails when `cols` regresses to 64
- [ ] `npm run test -- map.test.js` green

## Phase 2: #694 — promote validate-data grid-coverage check to fail(), add script tests

### Tasks

- [ ] Task 2.1: Re-read `scripts/validate-data.js`'s grid-coverage check to confirm current
      behavior and exact `warn()` call site.
- [ ] Task 2.2: Confirm with a dry run (`npm run validate-data`) that promoting this specific
      check to `fail()` does not break the current data file (should stay clean at cols=63).
- [ ] Task 2.3: Change the check from `warn()` to `fail()`.
- [ ] Task 2.4: Create `scripts/validate-data.test.js` covering at minimum:
      `checkSetupHexesInMap`, the grid-coverage check, and the `edgeFeatureTypes` registry
      check — each against small in-memory fixtures (not the real data file), covering both
      pass and fail cases per checker.
- [ ] Task 2.5: **Checkpoint** — confirm with user before finalizing, since this is a CI-gate
      behavior change (a future bad map edit will now hard-fail `validate-data` where it
      previously only warned).

### Verification

- [ ] `npm run validate-data` passes against real data with the check now failing on bad input
- [ ] New `scripts/validate-data.test.js` covers pass/fail cases for each checker in scope
- [ ] `npm run test -- validate-data.test.js` green

## Phase 3: #695 — playable flag characterization test + schema scope comment

### Tasks

- [ ] Task 3.1: Read `server/src/engine/movement.js` and `server/src/schemas/map.schema.js`
      again to confirm current `playable` handling (already verified in the col-64
      investigation: not consulted by movement/hex/los at all).
- [ ] Task 3.2: Add a characterization test to `movement.test.js` — a hex with
      `playable: false` in a fixture still costs/paths normally, pinning current behavior as
      a deliberate documented choice (not a silent gap).
- [ ] Task 3.3: Add a scope comment to the `playable` field in `map.schema.js`, in the same
      style as the neighboring `ELEVATION_TYPES` export comment, stating it is consulted only
      by `edge-strip.js`/`edge-model.js` for edge-feature stripping and is NOT enforced by the
      movement/pathfinding engine.

### Verification

- [ ] New characterization test passes and clearly documents the behavior in its description
- [ ] Schema comment added and accurate
- [ ] `npm run test -- movement.test.js` green

## Phase 4: #696 — de-duplicate map-status facts across docs

### Tasks

- [ ] Task 4.1: Identify the 7 locations previously found to duplicate SM map hex-count/status
      facts by hand (`docs/library.md`, `docs/library.json`, `docs/agents/domain-expert/design.md`,
      `docs/designs/high-level-design.md` x3, `CLAUDE.md`).
- [ ] Task 4.2: Add a test asserting `docs/library.json`'s `SM_MAP_DATA.hexCount` and `status`
      fields equal `data/modules/south-mountain/map.json`'s actual `hexes.length` and
      `_status`, so `library.json` cannot silently drift from the real data file.
- [ ] Task 4.3: Reduce `docs/designs/high-level-design.md`'s risk-register row and
      `docs/agents/domain-expert/design.md`'s SM_MAP_DATA row to short summaries that point at
      `docs/library.md` for the authoritative counts, rather than independently restating
      numbers that will go stale again.

### Verification

- [ ] New test passes and fails if `library.json` is edited out of sync with `map.json`
- [ ] HLD and domain-expert design docs no longer independently restate hex counts
- [ ] `npm run test -- library.test.js` (or wherever the new test lands) green

## Phase 5: Closeout

### Tasks

- [ ] Task 5.1: Run full quality suite (`npm run quality:strict` equivalent: validate-data,
      lint, format:check, test, build).
- [ ] Task 5.2: Close issues #693, #694, #695, #696 with a summary comment on each describing
      what was done and linking the PR.
- [ ] Task 5.3: Update `docs/tech-debt/report.md` — remove the four resolved rows from Open
      Debt Items, append resolution rows to Debt Over Time, recalculate Executive Summary and
      Risk Assessment per the `/tech-debt-report` "Resolving Debt Items" procedure.
- [ ] Task 5.4: Run `/plan-wrap` (devlog entry, CLAUDE.md/high-level-design.md review).
- [ ] Task 5.5: Run `/pr-create`.

### Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] All four issues closed
- [ ] Debt register reflects 4 fewer open items (18 -> 10 net open score)
- [ ] Full quality suite green
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
