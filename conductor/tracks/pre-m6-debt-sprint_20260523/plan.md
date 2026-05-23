# Implementation Plan: Pre-M6 Debt Sprint

**Track ID:** pre-m6-debt-sprint_20260523
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-23
**Status:** [~] In Progress

## Overview

Three housekeeping closures (no code) and three targeted code fixes across
`UnitCounterLayer.vue`, `App.vue`/`GameView.vue`, and `useGameStore.js`. All changes are
isolated to their respective components with no shared-store or API-contract surface
(except #441's store guard, which is additive-only).

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

- HCP 1: Approve preflight notes before implementation begins
- HCP 2: Approve before merging (standard phase-4 approval)

## Risk Classification

**Risk:** Medium
**Reason:** #441 touches shared store async state; #434 changes ARIA/keyboard contract on
interactive SVG elements; #435 changes document-level CSS that affects all routes.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 — this is a debt-cleanup PR; no new deferred findings permitted.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated (6 items closed, net score −15)
- [ ] Ready for `/team-review`

---

## Phase 1: Housekeeping Closures (no code)

Verify three already-fixed items, close their GitHub issues, and update the debt register.
No production code changes in this phase.

### Tasks

- [x] Task 1.1: Verify #431 — confirm `/api/v1/oob` is mounted unconditionally in `server.js`
      and `useOobData.js` fetches from `/api/v1/oob`. Close issue #431.
- [x] Task 1.2: Verify #432 — confirm `displayUnits` passes enriched `name` and
      `UnitCounterLayer` uses `entry.unit.name ?? entry.unit.id` in `aria-label`. Close issue #432.
- [x] Task 1.3: Verify #402 — confirm `GameView.vue` `onMounted` uses only
      `Promise.all([gameStore.loadGame(), fetchOob()])` with no raw dev-tool fetches.
      Close issue #402.
- [x] Task 1.4: Update debt register — remove #431, #432, #402 rows from Open Debt Items;
      add resolution rows to Debt Over Time; recalculate Executive Summary.

### Verification

- [ ] `gh issue view 431 --json state` → closed
- [ ] `gh issue view 432 --json state` → closed
- [ ] `gh issue view 402 --json state` → closed
- [ ] `docs/tech-debt/report.md` Open Debt Items table no longer contains #431, #432, #402

---

## Phase 2: SVG Button AT Reliability (#434)

Replace `<image role="button">` with `<g role="button"><image/></g>` so AT tools reliably
announce the interactive counter element.

### Tasks

- [x] Task 2.1: Write failing test — add a test to `UnitCounterLayer.test.js` (or create it)
      asserting that interactive counter elements are `<g>` (not `<image>`) with `role="button"`,
      `tabindex="0"`, and an `aria-label` containing the unit name. Run to confirm red.
- [x] Task 2.2: Refactor `UnitCounterLayer.vue` — wrap each `<image>` in a `<g role="button"
tabindex="0" :aria-label="..." @click @keydown>`. Move event handlers and ARIA attributes
      to the `<g>`; remove them from `<image>`. Move `:focus-visible` outline CSS to the `<g>`.
- [x] Task 2.3: Run tests green; verify no lint/format warnings.

### Verification

- [ ] `UnitCounterLayer.test.js` passes (interactive element is `<g>` not `<image>`)
- [ ] `npm run test` green
- [ ] Manual: Tab to a counter in the game view; focus ring visible on the `<g>` wrapper

---

## Phase 3: overflow:hidden Scoping (#435) + loadGame Guard (#441)

Two isolated fixes that can land in the same phase: CSS scoping in `App.vue`/`GameView.vue`
and a generation-counter guard in `useGameStore`.

### Tasks

- [ ] Task 3.1: Write failing test for #441 — add a test to `useGameStore.test.js` asserting
      that if `loadGame` is called a second time before the first resolves, the stale state from
      the first call is not written after the second call begins. Run to confirm red.
- [ ] Task 3.2: Fix #441 — add a generation counter to `useGameStore.loadGame`. Increment at
      call start; capture value; skip all state writes if the captured value no longer matches.
- [ ] Task 3.3: Fix #435 — remove `overflow: hidden` from `html` and `body` in `App.vue`.
      Confirm `.game-view` already has its own `overflow: hidden` in `GameView.vue` (it does).
      Add a smoke test or update an existing test to confirm `.game-view` still clips overflow.
- [ ] Task 3.4: Run full suite green; verify no lint/format warnings.

### Verification

- [ ] `useGameStore.test.js` passes (double-call guard test green)
- [ ] `npm run test` green
- [ ] Manual: LobbyView scrolls on a short viewport (no document-level clip)
- [ ] Manual: GameView still clips overflow (scroll locked to map area)

---

## Phase 4: Closeout

Close remaining GitHub issues, finalize debt register, run quality gates.

### Tasks

- [ ] Task 4.1: Close GitHub issues #434, #435, #441.
- [ ] Task 4.2: Update debt register — remove #434, #435, #441 from Open Debt Items; add
      resolution rows to Debt Over Time; recalculate Executive Summary.
- [ ] Task 4.3: Run `npm run quality:strict` — all gates must pass.
- [ ] Task 4.4: Commit debt register changes.

### Verification

- [ ] `npm run quality:strict` passes
- [ ] `docs/tech-debt/report.md` Open Debt Items count reduced by 6 (from 17 to 11)
- [ ] Net open score reduced by 15 (from 32 to 17)

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] 6 GitHub issues closed (#431 #432 #402 #434 #435 #441)
- [ ] Debt register: 11 open items, net score 17
- [ ] CI gates green
- [ ] Ready for `/pr-create` and `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
