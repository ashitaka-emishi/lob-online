# Implementation Plan: Pre-M6 Debt Score Sprint — Reduce Cumulative Score to < 15

**Track ID:** pre-m6-debt-score_20260604
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-04
**Status:** [x] Complete

## Overview

Close 12 tech-debt issues (29 score points) across four logical groups before M6 begins. Items are grouped so each phase can be reviewed and merged independently. Phase order prioritizes highest-score items first.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** Approval before each phase merge; approval before any debt is deferred.

## Risk Classification

**Risk:** Medium
**Reason:** Touches shared Vue components, a new server endpoint, engine module restructuring, and test coverage — broad surface but all additive or contained refactors.

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
- [ ] Debt register updated: 12 issues closed, 6 unregistered issues reconciled, cumulative score ≤ 14
- [ ] Ready for `/team-review`

---

## Phase 1: ActionPanel Accessibility + Correctness (#497 #498 #500 #496)

Fix the four ActionPanel/GameView issues from PR #493 review. Score: 9 pts.

### Tasks

- [x] Task 1.1: **#497** — Add `aria-live="polite"` region in `ActionPanel.vue` for turn-handoff announcements; add `aria-busy` on the pending state container. Follow pattern from `UnitStatsPanel`.
- [x] Task 1.2: **#498** — Wrap `ActionPanel.vue` in `<section role="region" aria-label="Actions">`. Add `role="group"` + `aria-label` to the button container. Associate turn-summary text with buttons via `aria-describedby`.
- [x] Task 1.3: **#500** — Accept `pendingAction` (or `pendingAction.type`) as a prop in `ActionPanel.vue`. Update `GameView.vue` to pass it. Use it to target the spinner on the correct button instead of `validActions[0]`.
- [x] Task 1.4: **#496** — In `GameView.vue` `fetchIdentity()`, replace bare `.catch(() => {})` with a handler that sets an `identityError` ref and renders an error banner. Log the error to console.

### Verification

- [ ] `ActionPanel.test.js` tests pass; add/update tests for aria attributes and spinner targeting.
- [ ] `GameView.test.js` updated to assert error banner renders on failed identity fetch.
- [ ] `npm run lint && npm run test` green.

---

## Phase 2: validActions Server Wiring (#495)

Replace client-side stub with a real server endpoint. Score: 3 pts.

### Tasks

- [x] Task 2.1: Add `GET /api/v1/games/:id/actions` route to `server/src/routes/games.js`. Returns `{ validActions: getValidActions(gameState) }`. Requires authenticated session.
- [x] Task 2.2: Update `useGameStore` (or `GameView.vue`) to fetch valid actions from the new endpoint instead of calling the local `validActionsForState` stub. Remove or deprecate the client-side stub.
- [x] Task 2.3: Write/update route test in `games.test.js` for the new GET endpoint (200 with actions array, 404 on missing game, 401 on unauthenticated).

### Verification

- [ ] New endpoint returns `END_PHASE` (and any other actions `getValidActions` produces) for a real game state.
- [ ] Client no longer imports local stub for production action determination.
- [ ] `npm run lint && npm run test` green.

---

## Phase 3: OOB Editor Cleanup (#487 #486)

Contained CounterImageWidget refactor. Score: 4 pts.

### Tasks

- [x] Task 3.1: **#486** — Add `side` prop to `CounterImageWidget.vue`. Remove the `sideSegment` computed that re-parses `nodePath`. Update `OobDetailPanel.vue` to pass `side` explicitly.
- [x] Task 3.2: **#487** — Add `@focusout="onWidgetFocusOut"` handler to the widget container in `CounterImageWidget.vue`. Implement: release `activeFace` when `e.relatedTarget` is outside the widget element.
- [x] Task 3.3: Update `CounterImageWidget.test.js` to cover: (a) correct side filtering when `side` prop is passed, (b) `activeFace` released on focusout.

### Verification

- [ ] `CounterImageWidget.test.js` and `OobDetailPanel.test.js` pass.
- [ ] OOB editor still functions correctly (counter cycling, image assignment).
- [ ] `npm run lint && npm run test` green.

---

## Phase 4: Map Editor / Edge Model (#492 #481 #470 #468 #467)

Engine refactor, test expansion, server validation, UX announcement. Score: 11 pts (includes 2 unregistered score-2 items and test improvements).

### Tasks

- [x] Task 4.1: **#492** — Create `server/src/engine/edge-strip.js`. Move `serverStripNonPlayableBoundaryEdges` from `map-editor.js` route into it. Export and import in the route.
- [x] Task 4.2: **#470** — Add `stripNonPlayableBoundaryEdges` (or the new `edge-strip.js` export) call in the server `PUT /api/tools/map-editor/data` route handler, before writing to disk.
- [x] Task 4.3: **#467** — Expand `edge-model.test.js` (or `edge-strip.test.js`): add parameterised tests for face 1 (NE) and face 2 (SE), both odd/even column hexes. Add `edges: {}` and `edges: { 0: [] }` empty-edges variants.
- [x] Task 4.4: **#468** — In `MapEditorView.vue`, add a transient status message when `isNonPlayableBoundary` fires on edge click. Have `stripNonPlayableBoundaryEdges` return a count; announce strip count > 0 via existing save-flash slot or toast.
- [x] Task 4.5: **#481** — Test quality improvements (no production code change):
  - `games.test.js`: make `saveGame` return distinct object; assert it was called with `(TEST_UUID, NEXT_STATE)`; add test for omitted-version bypass.
  - `gameSocket.test.js`: add test documenting `game:leave` authorization policy; assert `game:joined` NOT emitted on reject paths.
  - `UnitStatsPanel.test.js`: add 3-unit `[A, B, C]` paging test (next→next→wrap, prev-from-A wraps); assert `select-unit` emission in next/prev tests.
- [x] Task 4.6: **Register reconciliation** — Add #467, #468, #470, #481, #486, #487 to the debt register historical tracking rows before closing them. Update open-items table to reflect all 12 closures. Recalculate cumulative score.

### Verification

- [ ] `edge-strip.test.js` (or expanded `edge-model.test.js`) covers faces 0, 1, 2 with parity variants and empty-edges cases.
- [ ] `games.test.js`, `gameSocket.test.js`, `UnitStatsPanel.test.js` all pass with new assertions.
- [ ] Map editor PUT endpoint strips boundary edges server-side.
- [ ] Debt register updated; cumulative score ≤ 14.
- [ ] `npm run quality:strict` passes.

---

## Final Verification

- [ ] All 12 issues closed on GitHub
- [ ] Debt register cumulative score ≤ 14
- [ ] `npm run quality:strict` fully green
- [ ] No unexpected test warnings
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
