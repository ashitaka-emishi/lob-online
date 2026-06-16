# Plan — M6 Debt Closeout (#587 #593)

**Status:** [ ] Pending

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** After Phase 1 (rules-engine change) before Phase 2 (perf fix)

## Risk Classification

**Risk:** Medium
**Reason:** #587 touches shared rules-engine logic (getValidActions, issueOrder handler) — Checkpointed surface per quality rails.

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
- [ ] Debt register updated if any debt was accepted
- [ ] Issues #587 and #593 closed on GitHub
- [ ] Ready for `/team-review`

---

## Phase 1 — Fix ROLL_INITIATIVE cross-side leader filter (#587)

- [ ] Task 1.1: Write failing tests — cross-side leader excluded from ROLL_INITIATIVE candidates; degraded-mode null-payload fallback unaffected
- [ ] Task 1.2: Filter `eligibleLeaders` by `info.side === playerSide` using the existing `unitSideMapForOrders` in `getValidActions`
- [ ] Task 1.3: Add defense-in-depth side check in `handleIssueOrder` — reject if leader's OOB side ≠ `playerSide`
- [ ] Task 1.4: Verify tests pass; close #587

**Verification:** `npm run test` green; no new lint warnings; cross-side test cases pass.

> **CHECKPOINT** — Pause for human approval before Phase 2.

## Phase 2 — Memoize sync I/O in games.js (#593)

- [ ] Task 2.1: Hoist `loadOob()`, `loadMap()`, `getScenario()` to module-level constants in `games.js`
- [ ] Task 2.2: Replace all per-request call sites (dispatch handler + GET scenario endpoint) with cached values
- [ ] Task 2.3: Verify existing route tests still pass; close #593

**Verification:** `npm run quality:strict` passes; no new debt.

## Phase 3 — Debt Register + M6 Closeout

- [ ] Task 3.1: Remove #587 and #593 from Open Debt Items in `docs/tech-debt/report.md`; update Executive Summary and Risk Assessment
- [ ] Task 3.2: Close M6 GitHub milestone (confirm 0 open issues)
- [ ] Task 3.3: Commit debt register update
