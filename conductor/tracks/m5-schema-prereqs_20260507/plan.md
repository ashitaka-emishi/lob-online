# Implementation Plan: M5 Schema Prerequisites — UnitOrderState + isDetached

**Track ID:** m5-schema-prereqs_20260507
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-07
**Status:** [ ] Not Started

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

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated if any debt was accepted
- [ ] Ready for `/team-review`

---

## Phase 1: Branch + Apply Stash

Create the implementation branch and apply the pre-authored schema changes.

### Tasks

- [ ] Task 1.1: Create feature branch `feat/354-m5-schema-prereqs` from master.
- [ ] Task 1.2: Apply `stash@{0}` from `design/m5-turn-structure-orders-game-map-ui` onto the
      new branch (git stash pop or git stash apply). Resolve conflicts if any.
- [ ] Task 1.3: Verify `gameState.schema.js` contains `UnitOrderState` export, updated
      `orders: UnitOrderState.nullable()`, and `isDetached: z.boolean()`.
- [ ] Task 1.4: Verify `init.js` `mapOrder()` returns `UnitOrderState` objects and
      `defaultUnit()` accepts `isDetached = false`.

### Verification

- [ ] `npm run validate-data` passes with no errors.

## Phase 2: Tests

Confirm test files are correctly updated and the full suite is green.

### Tasks

- [ ] Task 2.1: Verify `gameState.schema.test.js` has the new `UnitOrderState` describe block
      (accepted, delay, none, and two rejection cases) and updated `BASE_UNIT` fixture.
- [ ] Task 2.2: Verify `init.test.js` assertions check for `UnitOrderState` objects (not raw
      strings) for order-holding units.
- [ ] Task 2.3: Run `npm run test` — all tests green, coverage ≥ 70%.

### Verification

- [ ] `npm run test` passes with no unexpected warnings.

## Phase 3: Quality Gates + PR

Run the full strict gate sequence and open the PR.

### Tasks

- [ ] Task 3.1: `npm run validate-data`
- [ ] Task 3.2: `npm run lint`
- [ ] Task 3.3: `npm run format:check`
- [ ] Task 3.4: `npm run test`
- [ ] Task 3.5: `npm run build`
- [ ] Task 3.6: Run `/pr-create` to open PR against master, linked to issue #354.

### Verification

- [ ] All five quality gates pass.
- [ ] PR open and linked to issue #354.

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] Tests passing with no unexpected warnings
- [ ] PR open, ready for `/team-review`
