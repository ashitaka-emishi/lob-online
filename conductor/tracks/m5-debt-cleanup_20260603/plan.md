# Implementation Plan: M5 Debt Cleanup Sprint

**Track ID:** m5-debt-cleanup_20260603
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-03
**Status:** [ ] Not Started

## Overview

Eight score-2 debt items closed in five phases. Phase 0 is a trivial
housekeeping change (gitignore). Phases 1 and 4 touch Checkpointed surfaces
(game action route, client composable) and require human approval before
proceeding. Phases 2, 3, and 0 are Autonomous (dev-tool / config changes only).
No schema, auth boundary, or rules-engine changes.
Target: net −16 on the debt register, open score 16.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:**

- After Phase 1 verification — POST /actions route is a Checkpointed surface
- After Phase 4 verification — loadGame composable is a Checkpointed surface

## Risk Classification

**Risk:** Medium
**Reason:** All fixes are small and targeted; no schema or auth boundary changes.
Checkpointed mode required because two phases touch game-action-route and
client-composable surfaces per quality-rails rules.

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
- [ ] All 8 issues (#482 #481 #487 #486 #467 #468 #470 #440) closed
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated (net −16, open score 16)
- [ ] Ready for `/team-review`

---

## Phase 0: Housekeeping — .gitignore backup files

Trivial config change, no functional impact. Autonomous.

### Tasks

- [x] Task 0.1: Add `data/scenarios/*/backups/` to `.gitignore`; verify that
      the existing `data/scenarios/south-mountain/backups/` directory is now
      untracked and will not appear in `git status`

### Verification

- [ ] `git status` no longer shows the backups directory as untracked
- [ ] Lint passes (no source changes)

---

## Phase 1: Server robustness (#482 + #481)

Guard the io.emit in POST /actions so a missing `io` does not produce a
misleading 500 after a successfully committed state change. Then close the test
gaps identified in #481.

### Tasks

- [ ] Task 1.1: In `server/src/routes/games.js` POST `/actions`, add a null
      guard — only call `req.app.locals.io.to(id).emit(...)` when
      `req.app.locals.io` is truthy; log a warning if it is absent (#482)
- [ ] Task 1.2: Extend the POST /actions test suite: assert that a successful
      action + missing `io` returns the expected status and does not throw (#482)
- [ ] Task 1.3: Add/fix test for the success path — confirm dispatch result is
      distinguished from saveGame result in assertions (#481)
- [ ] Task 1.4: Add test: 409 omitted-version bypass is caught and returns 409
      (#481)
- [ ] Task 1.5: Add test: `game:leave` auth policy — room leave fires on the
      correct socket (#481)
- [ ] Task 1.6: Add test: paging direction/wrap is detectable with the current
      array structure (or assert that the direction is explicit in the payload)
      (#481)
- [ ] Task 1.7: Add test: `select-unit` socket emission contract — event name,
      payload shape, and room targeting asserted (#481)

### Verification

- [ ] All new tests pass; existing games-route suite still green
- [ ] **CHECKPOINT: human approval required before Phase 2**

---

## Phase 2: OOB editor component fixes (#487 + #486)

Two isolated dev-tool improvements in `CounterImageWidget.vue` and
`OobDetailPanel.vue`. Autonomous.

### Tasks

- [ ] Task 2.1: Add a `@focusout` handler to `CounterImageWidget.vue` that sets
      `activeFace` to `null` when focus leaves the widget entirely (use
      `relatedTarget` / `currentTarget` to distinguish within-widget focus moves
      from true blur); write a test or comment documenting the expected behavior
      (#487)
- [ ] Task 2.2: Add a `side` prop (`'union' | 'confederate'`) to
      `CounterImageWidget.vue`; remove the internal path-prefix detection logic;
      update `OobDetailPanel.vue` to pass `side` explicitly; write a test asserting
      the prop drives the correct filter (#486)

### Verification

- [ ] OOB editor loads and counter image cycling works for both sides
- [ ] Focusout no longer leaves Arrow key scrolling suppressed
- [ ] Lint and tests pass

---

## Phase 3: Map editor quality (#467 + #468 + #470)

Three related map-editor improvements to the edge-model tests, editor UX, and
server-side validation. Autonomous.

### Tasks

- [ ] Task 3.1: In `edge-model.test.js`, add test cases for all remaining face
      directions (faces 0, 3, 4, 5) and both parity/odd-column variants for
      `stripNonPlayableBoundaryEdges`; confirm full 6-face coverage (#467)
- [ ] Task 3.2: In the map editor Vue component(s), emit a visible user
      notification (toast or status bar message) when a click on a non-playable
      boundary edge is silently discarded; similarly, show a notification at
      save-time listing how many edges were stripped (#468)
- [ ] Task 3.3: In `server/src/routes/map.js` (or equivalent) PUT /map handler,
      call `stripNonPlayableBoundaryEdges` on the incoming payload before saving,
      mirroring the client-side strip; add a server-side test asserting that a
      direct PUT with non-playable edges returns the stripped result (#470)

### Verification

- [ ] Edge-model tests green with all 6 face directions covered
- [ ] Map editor silently-rejected clicks and save-time strip are announced
- [ ] Server strips non-playable edges on PUT /map; test confirms
- [ ] Lint and tests pass

---

## Phase 4: Client performance (#440)

Parallelize the two sequential fetches in `loadGame` so map-config and
game-state requests fire concurrently. Checkpointed surface.

### Tasks

- [ ] Task 4.1: Identify where `scenarioId` is first known in the `loadGame`
      flow (`useGameStore.js` or equivalent); determine whether it is available
      before the first fetch or only after (#440)
- [ ] Task 4.2: If `scenarioId` is available up-front (from the route or lobby
      params), rewrite `loadGame` to fire both fetches with `Promise.all`; add a
      test asserting both requests are issued before either resolves (#440)
- [ ] Task 4.3: If `scenarioId` is only known after game-state response, add a
      comment documenting why parallelization is not yet possible and close the
      issue with that explanation, then update the debt register accordingly (#440)

### Verification

- [ ] `loadGame` parallelized (or blocked status documented with a closing
      comment in the issue)
- [ ] No regressions in game load / lobby flow
- [ ] **CHECKPOINT: human approval required before opening PR**

---

## Final Verification

- [ ] `npm run quality:strict` passes
- [ ] All 8 issues ready to close (#482 #481 #487 #486 #467 #468 #470 #440)
- [ ] Debt register updated: net −16, open score 16
- [ ] No new deferred debt introduced
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
