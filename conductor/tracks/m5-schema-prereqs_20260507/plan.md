# Implementation Plan: M5 Schema Prerequisites — UnitOrderState + isDetached

**Track ID:** m5-schema-prereqs_20260507
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-07
**Status:** [x] Complete

## Overview

Apply the stash from `design/m5-turn-structure-orders-game-map-ui` onto a new feature branch.
All four file diffs are already fully authored in the stash. The work is: create branch, apply
stash, verify tests pass, run quality gates, open PR.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Pause for human review after preflight/architecture notes and before
accepting any deferred debt. Required because `GameStateSchema` is a persisted wire-format
surface (game state written to disk, session data).

## Risk Classification

**Risk:** High
**Reason:** Modifies `GameStateSchema` and `UnitStateSchema` — wire-format and disk-persistence
schema surfaces that require Checkpointed mode per `.claude/rules/agentic-quality-rails.md`.

## Quality Gates

- [x] `npm run validate-data`
- [x] `npm run lint`
- [x] `npm run format:check`
- [x] `npm run test`
- [x] `npm run build`
- [x] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0.
**Actual deferred debt:** 13 findings (#360–#372, total score +29) — approved by human reviewer
during team-review cycle. All items filed as GitHub issues before PR merge.

## Completion Contract

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated if any debt was accepted
- [x] Ready for `/team-review`

---

## Phase 1: Branch + Apply Stash

Create the implementation branch and apply the pre-authored schema changes.

### Tasks

- [x] Task 1.1: Create feature branch `feat/354-m5-schema-prereqs` from master.
- [x] Task 1.2: Apply `stash@{0}` from `design/m5-turn-structure-orders-game-map-ui` onto the
      new branch (git stash pop or git stash apply). Resolve conflicts if any.
- [x] Task 1.3: Verify `gameState.schema.js` contains `UnitOrderState` export, updated
      `orders: UnitOrderState.nullable()`, and `isDetached: z.boolean()`.
- [x] Task 1.4: Verify `init.js` `mapOrder()` returns `UnitOrderState` objects and
      `defaultUnit()` accepts `isDetached = false`.

### Verification

- [x] `npm run validate-data` passes with no errors.

## Phase 2: Tests

Confirm test files are correctly updated and the full suite is green.

### Tasks

- [x] Task 2.1: Verify `gameState.schema.test.js` has the new `UnitOrderState` describe block
      (accepted, delay, none, and two rejection cases) and updated `BASE_UNIT` fixture.
- [x] Task 2.2: Verify `init.test.js` assertions check for `UnitOrderState` objects (not raw
      strings) for order-holding units.
- [x] Task 2.3: Run `npm run test` — all tests green, coverage ≥ 70%.

### Verification

- [x] `npm run test` passes with no unexpected warnings.

## Phase 3: Quality Gates + PR

Run the full strict gate sequence and open the PR.

### Tasks

- [x] Task 3.1: `npm run validate-data`
- [x] Task 3.2: `npm run lint`
- [x] Task 3.3: `npm run format:check`
- [x] Task 3.4: `npm run test`
- [x] Task 3.5: `npm run build`
- [x] Task 3.6: Run `/pr-create` to open PR against master, linked to issue #354.

### Verification

- [x] All five quality gates pass.
- [x] PR open and linked to issue #354.

---

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] Tests passing with no unexpected warnings
- [x] PR #359 merged to master (2026-05-08)
- [x] `/team-review` complete — 11 findings fixed in place, 13 deferred (#360–#372)
- [x] `/tech-debt-report` complete — debt register updated, report committed
- [x] `/plan-wrap` complete — CLAUDE.md and HLD updated, devlog entry written
