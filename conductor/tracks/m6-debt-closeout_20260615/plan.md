# Plan — M6 Debt Closeout (#587 #593)

**Status:** [x] Complete

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

- [x] All plan tasks complete
- [x] All acceptance criteria in spec.md met
- [x] Warnings fixed or explicitly classified as accepted prototype noise
- [x] Debt register updated (net open score 55 → 49)
- [x] Issues #587 and #593 closed on GitHub
- [x] Ready for `/team-review`

---

## Phase 1 — Fix ROLL_INITIATIVE cross-side leader filter (#587)

- [x] Task 1.1: Write failing tests — cross-side leader excluded from ROLL_INITIATIVE candidates; degraded-mode null-payload fallback unaffected
- [x] Task 1.2: Filter `eligibleLeaders` by `info.side === playerSide` using the existing `unitSideMapForOrders` in `getValidActions`
- [x] Task 1.3: Add defense-in-depth side check in `handleIssueOrder` — reject if leader's OOB side ≠ `playerSide`
- [x] Task 1.4: Verify tests pass; close #587

**Verification:** `npm run test` green; no new lint warnings; cross-side test cases pass.

> **CHECKPOINT** — Pause for human approval before Phase 2.

## Phase 2 — Memoize sync I/O in games.js (#593)

- [x] Task 2.1: Hoist `loadOob()`, `loadMap()`, `getScenario()` to module-level constants in `games.js`
- [x] Task 2.2: Replace all per-request call sites (dispatch handler + GET scenario endpoint) with cached values
- [x] Task 2.3: Verify existing route tests still pass; close #593

**Verification:** `npm run quality:strict` passes; no new debt.

## Phase 3 — Debt Register + M6 Closeout

- [x] Task 3.1: Remove #587 and #593 from Open Debt Items in `docs/tech-debt/report.md`; update Executive Summary and Risk Assessment
- [x] Task 3.2: Close M6 GitHub milestone (confirm 0 open issues)
- [x] Task 3.3: Commit debt register update
