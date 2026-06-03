# Implementation Plan: Pre-M6 Debt Sprint

**Track ID:** pre-m6-debt-sprint_20260601
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-01
**Status:** [ ] Not Started

## Overview

Five score-3 debt items resolved in three phases. Server fixes first (lowest coupling), then client composable resilience + tests, then game-map UI accessibility. Two Checkpointed surfaces — #477 (auth) and #480 (shared UI) — require human approval before proceeding past their phase.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

- After Phase 1 Task 1.5 (#477 auth fix) — auth path touches `requireSide` on the live action route
- After Phase 3 (#480 accessibility) — shared `UnitCounterLayer` component

## Risk Classification

**Risk:** High
**Reason:** Phase 1 includes an auth boundary change on the live game-action path; Phase 3 touches the shared game-map UI component.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 — this is a debt-reduction sprint.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All five issues (#476 #477 #478 #479 #480) closed
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated (net negative delta)
- [ ] Ready for `/team-review`

---

## Phase 1: Server fixes (#478 + #477)

Start with the error-sanitization fix (#478 — no auth surface), then the sideToken validation (#477 — auth surface, Checkpointed checkpoint after).

### Tasks

- [ ] Task 1.1: In `games.js` actions route, for `ActionError` codes that indicate server faults (`INVALID_STATE`, `DRAIN_LOOP`), return `"Internal error processing action"` and log the original `err.message`; remove the TODO comment
- [ ] Task 1.2: In `games.js` actions route, handle `INVALID_PAYLOAD` with HTTP 400 (currently falls through to 500 via `?? 500`)
- [ ] Task 1.3: Write tests: `INVALID_STATE` → 500 with sanitized message; `DRAIN_LOOP` → 500 with sanitized message; `INVALID_PAYLOAD` → 400; `UNKNOWN_ACTION` → 422
- [ ] Task 1.4: In `requireSide` middleware (`games.js`), load the game row from SQLite, verify `session.sideToken` matches `side_a_token` or `side_b_token`, and verify game status is `active`; return 403 on mismatch, 404 if game not found, 409 if game not active
- [ ] Task 1.5: Write tests for the new `requireSide` checks: stale token → 403; missing game → 404; inactive game → 409; valid token → passes through

### Verification

- [ ] Phase 1 tests pass, no regressions in existing games-route suite
- [ ] **CHECKPOINT: human approval required before Phase 2** (auth path change reviewed)

---

## Phase 2: Client composable (#479 + #476)

Both items are in `useOobData.js`. Fix graceful degradation first (#479), then add the missing test coverage (#476).

### Tasks

- [ ] Task 2.1: In `useOobData.fetchOob()`, change the parallel fetch so a leaders-only failure logs a warning and returns OOB data only, rather than setting `oobError` and returning early; leaders-specific fields default to empty/null
- [ ] Task 2.2: Update `oobUnitMap` merge to handle a null/empty leaders response without throwing
- [ ] Task 2.3: Write test: OOB fetch succeeds + leaders fetch fails (503) → `oobError` is null, `oobUnitMap` built from OOB data only, leader-specific fields absent
- [ ] Task 2.4: Write test: assert `/api/v1/leaders` URL is fetched by name (a call-dropping regression would fail this)
- [ ] Task 2.5: Write test: leaders-merge path — when leaders response contains leader-specific fields, they appear correctly in `oobUnitMap` entries

### Verification

- [ ] Phase 2 tests pass; `useOobData` suite fully green
- [ ] A simulated leaders outage no longer causes OOB display to blank

---

## Phase 3: UnitCounterLayer accessibility (#480)

Checkpointed surface — changes `UnitCounterLayer.vue`, a shared game-map component.

### Tasks

- [ ] Task 3.1: Add `selectedUnitId` prop to `UnitCounterLayer.vue`; bind `:aria-pressed="unit.id === selectedUnitId"` on each counter `<g role="button">`
- [ ] Task 3.2: Update `aria-label` binding: `"Deselect {name}"` when the counter is selected, `"Select {name}"` otherwise
- [ ] Task 3.3: Add focus management after selection — move focus to the selected counter element after a unit is selected via keyboard
- [ ] Task 3.4: Wire `selectedUnitId` from `GameView` / `useGameStore` down to `UnitCounterLayer`
- [ ] Task 3.5: Write tests: `aria-pressed` correct for selected/unselected; `aria-label` matches selection state; `selectedUnitId` prop accepted

### Verification

- [ ] Phase 3 tests pass; `UnitCounterLayer` suite fully green
- [ ] **CHECKPOINT: human approval required before opening PR** (shared UI component reviewed)

---

## Final Verification

- [ ] `npm run quality:strict` passes
- [ ] All five issues (#476 #477 #478 #479 #480) ready to close
- [ ] No new deferred debt introduced
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
