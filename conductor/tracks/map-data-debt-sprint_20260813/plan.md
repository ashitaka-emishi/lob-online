# Implementation Plan: Map Data Debt Sprint — Issues #693-696

**Track ID:** map-data-debt-sprint_20260813
**Spec:** [spec.md](./spec.md)
**Created:** 2026-08-13
**Status:** [~] In Progress

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

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved.

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

## Phase 1: #693 — gridSpec.cols x rows regression test

Add a data-invariant regression test so the `gridSpec.cols` bug class (issue #691) cannot
silently regress.

### Tasks

- [x] Task 1.1: Read `server/src/engine/map.test.js` to match existing test/fixture style.
- [x] Task 1.2: Add tests asserting `gridSpec.cols` matches the highest recorded column, and
      every hex falls within column bounds — row bounds allow the documented
      `playable: false` boundary-marker exception at row 0 / rows+1 (discovered during
      implementation: rows 0 and 36 hold real boundary-marker hexes, so a strict row-bounds
      check without this exception was a false positive).
- [x] Task 1.3: Mutation-tested by temporarily editing `gridSpec.cols` to 64 in a scratch copy
      (not the real file) and confirming the new test fails; reverted the scratch edit.

### Verification

- [x] New test passes against current data (`cols: 63`)
- [x] Mutation test confirms the test fails when `cols` regresses to 64
- [x] `npx vitest run server/src/engine/map.test.js` green (12/12)

## Phase 2: #694 — promote validate-data grid-coverage check to fail(), add script tests

### Tasks

- [x] Task 2.1: Re-read `scripts/validate-data.js`'s grid-coverage check to confirm current
      behavior and exact `warn()` call site.
- [x] Task 2.2: Confirmed with a dry run (`npm run validate-data`) that promoting this check
      to `fail()` does not break the current data file (2205/2205 coverage, stays clean).
- [x] Task 2.3: Extracted the grid-coverage and edgeFeatureTypes checks into named, exported
      functions (`checkGridCoverage`, `checkEdgeFeatureTypesRegistry`); changed grid-coverage
      from `warn()` to `fail()`. Guarded the script's main execution behind a direct-run check
      so the checker functions can be imported for testing without side effects.
- [x] Task 2.4: Created `scripts/validate-data.test.js` covering `checkSetupHexesInMap`,
      `checkGridCoverage`, and `checkEdgeFeatureTypesRegistry` — each against small in-memory
      fixtures, covering pass and fail cases per checker (11 tests total).
- [x] Task 2.5: **Checkpoint** — confirmed with user before finalizing.

### Verification

- [x] `npm run validate-data` passes against real data with the check now failing on bad input
- [x] New `scripts/validate-data.test.js` covers pass/fail cases for each checker in scope
- [x] `npx vitest run scripts/validate-data.test.js` green (11/11)

## Phase 3: #695 — playable flag characterization test + schema scope comment

### Tasks

- [x] Task 3.1: Re-confirmed `playable` is not consulted by movement/hex/los anywhere in the
      engine (grep across `movement.js`, `hex.js`, `los.js` — zero references).
- [x] Task 3.2: Added a characterization test to `movement.test.js` — a hex with
      `playable: false` in a fixture still costs/paths normally, pinning current behavior as
      a deliberate documented choice.
- [x] Task 3.3: Added a scope comment to the `playable` field in `map.schema.js`, matching the
      neighboring `ELEVATION_TYPES` export comment style.

### Verification

- [x] New characterization test passes and documents the behavior
- [x] Schema comment added and accurate
- [x] `npx vitest run server/src/engine/movement.test.js server/src/schemas/map.schema.test.js` green (136/136)

## Phase 4: #696 — de-duplicate map-status facts across docs

### Tasks

- [x] Task 4.1: Identified the duplication locations (`docs/library.md`, `docs/library.json`,
      `docs/agents/domain-expert/design.md`, `docs/designs/high-level-design.md` x3,
      `CLAUDE.md`).
- [x] Task 4.2: Added `scripts/library-sync.test.js` asserting `docs/library.json`'s
      `SM_MAP_DATA.hexCount` and `status` fields equal `map.json`'s actual `hexes.length` and
      `_status` (3 tests).
- [x] Task 4.3: Reduced `docs/designs/high-level-design.md`'s risk-register row and
      `docs/agents/domain-expert/design.md`'s SM_MAP_DATA row to short summaries pointing at
      `docs/library.md`. `docs/library.md`/`docs/library.json` (the source of truth) and
      `CLAUDE.md`/HLD's other two locations were left as-is per spec's Out of Scope —
      only the two rows named in the accepted spec were trimmed.

### Verification

- [x] New test passes and fails if `library.json` is edited out of sync with `map.json`
- [x] HLD risk-register row and domain-expert design.md's SM_MAP_DATA row no longer
      independently restate hex counts
- [x] `npx vitest run scripts/library-sync.test.js` green (3/3)

## Phase 5: Closeout

### Tasks

- [x] Task 5.1: Ran full quality suite (validate-data, lint, format:check, test — 160 files /
      3277 tests, build). All green; one pre-existing accepted-noise warning (`longstreet`
      commandsId) unrelated to this track.
- [ ] Task 5.2: Close issues #693, #694, #695, #696 with a summary comment on each describing
      what was done and linking the PR.
- [ ] Task 5.3: Update `docs/tech-debt/report.md` — remove the four resolved rows from Open
      Debt Items, append resolution rows to Debt Over Time, recalculate Executive Summary and
      Risk Assessment per the `/tech-debt-report` "Resolving Debt Items" procedure.
- [ ] Task 5.4: Run `/plan-wrap` (devlog entry, CLAUDE.md/high-level-design.md review).
- [ ] Task 5.5: Run `/pr-create`.

### Final Verification

- [x] All acceptance criteria in spec.md met
- [ ] All four issues closed
- [ ] Debt register reflects 4 fewer open items (18 -> 10 net open score)
- [x] Full quality suite green
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
