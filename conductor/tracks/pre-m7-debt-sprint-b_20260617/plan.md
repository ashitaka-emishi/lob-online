# Plan — Pre-M7 Debt Sprint B: Test Gaps, Traceability, and Score-1/2 Cleanup

**Track ID:** pre-m7-debt-sprint-b_20260617
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-17
**Status:** [ ] Not Started

## Overview

Close 16 score-1/2/3 tech-debt items after Sprint A merges. Grouped by area: test fixes,
traceability, engine refactors, and client reliability. Ends with the O(1) oob.js index.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** After Phase 2 (engine refactors) before Phase 3 (client/reliability)

## Risk Classification

**Risk:** Medium
**Reason:** Phases 1 and 3 are test/traceability only (low risk); Phase 2 touches shared engine logic (closeCombat.js, morale.js) — Checkpointed surface.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated (cumulative open score ≤ 15)
- [ ] Issues #588 #590 #591 #595 #596 #597 #607 #608 #609 #610 #614 #615 #619 #620 #622 #623 closed on GitHub
- [ ] Ready for `/team-review`

---

## Phase 1 — Test Fixes and Traceability

Low-risk test corrections and citation alignment — no logic changes.

- [ ] Task 1.1: Fix bug #577 test title/assertion contradiction in morale test (#607)
- [ ] Task 1.2: Align CBF rule citation — §5.8 vs §8.1 — in code and test (#608)
- [ ] Task 1.3: Annotate TODO(M7) comments in fireCombat.js with issue numbers (#609)
- [ ] Task 1.4: Add cascade regression tests for cavalryDivision and independentBrigades branches in morale.test.js (#610)
- [ ] Task 1.5: Rewrite index.test.js soft-lock tests with correct assertion scope (#597)
- [ ] Task 1.6: Add resolveMorale multi-unit defender hex + mods propagation coverage (#590)
- [ ] Task 1.7: Add route-layer integration test for FIRE_COMBAT → RESOLVE_MORALE two-step (#595)
- [ ] Task 1.8: Fix closeCombat.test.js — hoist oob3Sp fixture, fix vacuous assertion, add JSDoc (#622)
- [ ] Task 1.9: Add rally.test.js coverage — bloodlust, 2d6 boundary, normal-state (#620)
- [ ] Task 1.10: Fix ordering-invariant test in rally.test.js (#619)
- [ ] Task 1.11: Run `npm run test` — all new tests green

**Verification:** `npm run test` green; no vacuous assertions remaining in changed test files.

## Phase 2 — Engine Refactors

Checkpointed: touches shared engine logic.

- [ ] Task 2.1: Extract `effectiveSPs()` helper — remove SP-halving duplication in closeCombat.js and fireCombat.js (LOB §5.3) (#614)
- [ ] Task 2.2: Collapse `applySection64AutoRecovery` from two-pass to single-pass algorithm (#615)
- [ ] Task 2.3: Remove dead `_pendingRallyRoll` assignment in index.js; clarify `moraleCheckRequired` unconditional flag in closeCombat.js (#623)
- [ ] Task 2.4: Run `npm run test` — verify no regressions

**Verification:** `npm run test` green; `effectiveSPs` defined once; two-pass algorithm gone.

> **CHECKPOINT** — Pause for human approval before Phase 3.

## Phase 3 — Client Reliability and Performance

- [ ] Task 3.1: Surface scenario fetch errors in useGameStore — don't swallow silently (#588)
- [ ] Task 3.2: Add useGameStore scenario-fetch failure test (#591)
- [ ] Task 3.3: Add O(1) unit-id index to oob.js — replace O(n) `findOobUnit` tree walk (#596)
- [ ] Task 3.4: Run `npm run quality:strict`

**Verification:** `npm run quality:strict` passes; findOobUnit uses index lookup.

## Phase 4 — Debt Register + Issue Closeout

- [ ] Task 4.1: Close issues #588 #590 #591 #595 #596 #597 #607 #608 #609 #610 #614 #615 #619 #620 #622 #623 on GitHub
- [ ] Task 4.2: Update `docs/tech-debt/report.md` — remove closed items, update Executive Summary (target score ≤ 15)
- [ ] Task 4.3: Commit debt register update
