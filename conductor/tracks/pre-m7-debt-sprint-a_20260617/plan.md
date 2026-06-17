# Plan — Pre-M7 Debt Sprint A: Bugs, Security, and High-Score Fixes

**Track ID:** pre-m7-debt-sprint-a_20260617
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-17
**Status:** [x] Complete

## Overview

Close 10 tech-debt issues (score 3–5) before M7. Order: OOB consolidation first (prerequisite
for cascade fixes), then rules-engine bugs, then security/reliability.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** After Phase 1 (OOB refactor) before Phase 2 (rules bugs); after Phase 2 before Phase 3 (security/reliability)

## Risk Classification

**Risk:** High
**Reason:** Touches shared rules-engine logic (fireCombat, closeCombat, morale, dispatch, phase) and security surface (rate limiter, ownership checks) — all Checkpointed surfaces.

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

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated (net open score 49 → 43; 10 issues closed)
- [x] Issues #571 #572 #573 #589 #594 #600 #603 #604 #605 #606 closed on GitHub
- [x] Ready for `/team-review`

---

## Phase 1 — OOB Consolidation (prerequisite refactors)

Extract duplicated OOB-walk helpers so later phases have a single trusted implementation.

- [x] Task 1.1: Consolidate `findOobUnit` + `findOobLeader` into `engine/oob.js` — remove 3 duplicate definitions (#573)
- [x] Task 1.2: Move `findBrigadeForUnit` from `morale.js` to `engine/oob.js`; update all callers (#600)
- [x] Task 1.3: Run `npm run test` — verify no regressions

**Verification:** `npm run test` green; `findOobUnit`, `findOobLeader`, `findBrigadeForUnit` each defined once in `engine/oob.js`.

> **CHECKPOINT** — Pause for human approval before Phase 2.

## Phase 2 — Rules-Engine Bug Fixes

- [x] Task 2.1: Fix `cascadeMorale` — process all routed brigades, not just first (#605)
- [x] Task 2.2: Fix `cascadeMorale` hex-scope fallback — trigger only on absent OOB, not incomplete walk (#606)
- [x] Task 2.3: Fix combat column to use current SPs (after losses), not printed SPs — LOB §5.1/§5.6 (#604)
- [x] Task 2.4: Fix `closingRoll`/`moraleCheck` pending types — ensure valid actions exist after these steps (#571)
- [x] Task 2.5: Wire LOS and hex-distance validation into production dispatch path (#572)
- [x] Task 2.6: Run `npm run test` — verify all rule-bug tests pass

**Verification:** `npm run test` green; morale cascade, SP column, soft-lock, and LOS/distance bugs confirmed fixed with test coverage.

> **CHECKPOINT** — Pause for human approval before Phase 3.

## Phase 3 — Security and Reliability

- [x] Task 3.1: Add attacker-side ownership check in `handleFireCombat` — reject if unit.side ≠ playerSide (#603)
- [x] Task 3.2: Guard `dispatch()` ctx degradation — log warning when ctx missing, prevent silent fallback (#594)
- [x] Task 3.3: Add trust-proxy config to rate limiter; split create/join limiters (#589)
- [x] Task 3.4: Run `npm run quality:strict`

**Verification:** `npm run quality:strict` passes; ownership check test added for #603.

## Phase 4 — Debt Register + Issue Closeout

- [ ] Task 4.1: Close issues #571 #572 #573 #589 #594 #600 #603 #604 #605 #606 on GitHub
- [ ] Task 4.2: Update `docs/tech-debt/report.md` — remove closed items, update Executive Summary score
- [ ] Task 4.3: Commit debt register update
