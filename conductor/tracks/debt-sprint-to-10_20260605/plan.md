# Implementation Plan: Debt Sprint — Score 32 → 10

**Track ID:** debt-sprint-to-10_20260605
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-05
**Status:** [ ] Not Started

## Overview

Close 13 M5-and-earlier debt items in order of complexity: test fixes first (most involved),
then code fixes, then trivial polish and closures. Each task maps 1:1 to a GitHub issue.
Commit per issue; close with `closes #NNN` in each commit message.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals

## Risk Classification

**Risk:** Medium
**Reason:** Touches shared Vue stores, route guards, and test infrastructure across multiple M5
surfaces. No single change is large, but the breadth warrants checkpointed-style attention.

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
- [ ] All 13 issues closed with merge-summary comments
- [ ] Net open debt score = 10
- [ ] `npm run quality:strict` passes clean
- [ ] Ready for `/team-review`

---

## Phase 1: Test Fixes — #508, #509, #510 (oob-editor test gaps)

### Tasks

- [ ] Task 1.1 (#508a): Fix the inert `#506-3` guard test in `oobTreeTransform.test.js`. Add a
      fixture where `walker-promoted` appears in `leaders.confederate.brigades` with
      `commandsId: 'wj'` alongside the real `walker`. Assert `brigade._leader.id === 'walker'`
      and `_variants[0].id === 'walker-promoted'`. This test must fail without the `variantIds`
      guard and pass with it.
- [ ] Task 1.2 (#508b): Add `_nodePath` forwarding test to `OobTreeNode.test.js`. Mount
      `OobTreeNode` with `node = { id: 'usa-army-hq', _nodePath: 'union.hq', name: 'AotP HQ' }`,
      spy on `store.selectNode`, click the row, assert third arg is `'union.hq'`. Also assert
      `null` is passed when `_nodePath` is absent.
- [ ] Task 1.3 (#508c): Guard `JSON.parse` scalars in `OobDetailPanel.vue`
      `onSpecialRulesChange`. Narrow: only store parsed result if it's a non-null, non-array
      object; otherwise fall back to raw string. Add tests for `"42"`, `"true"`, `"null"` inputs
      asserting raw-string fallback.
- [ ] Task 1.4 (#509): Add resolves-to-real-node test for `_nodePath 'union.hq'` literal.
      In `oobTreeTransform.test.js`, assert that navigating `oob['union']['hq']` on a fixture
      matching `oob.json` shape returns a defined object — proving the hardcoded path matches the
      actual data key.
- [ ] Task 1.5 (#510): Three trivial polish items. Add `/* invalid JSON — store raw text as
fallback */` to the catch in `onSpecialRulesChange` if not already present. Add test:
      mount leader with `specialRules: null`, assert `textarea.element.value === ''`. Give the
      real-entry `makeOob().union.hq` fixture a distinct id so the real-vs-fallback branches are
      discriminated.

### Verification

- [ ] `npm run test` passes with all new assertions green
- [ ] Mutation check: removing the `!variantIds.has(l.id)` guard causes Task 1.1 test to fail

---

## Phase 2: Code Fixes — #502, #503, #504, #505

### Tasks

- [ ] Task 2.1 (#503): In `server/src/routes/games.js` (or wherever `GET /:id/actions` is
      handled), add a guard after `requireSide` passes: if `session.gameId !== req.params.id`,
      respond 403. Add a server test asserting a valid-side player for game A receives 403 when
      querying game B's actions.
- [ ] Task 2.2 (#504): Add a cross-implementation parity test. In
      `server/src/engine/edge-strip.test.js` (or a new `edge-model.parity.test.js`), import both
      `stripNonPlayableBoundaryEdges` from `server/src/engine/edge-strip.js` and the client
      equivalent from `client/src/formulas/edge-model.js`, run both on the same fixture, assert
      identical output. Confirm the shared header comment is accurate.
- [ ] Task 2.3 (#505): In `ActionPanel.vue`, replace `:disabled="pending"` on action buttons
      with `:aria-disabled="pending"` and add `@click.prevent` guard when `aria-disabled` is true.
      Add a `ref` to track the last-clicked button and restore focus to it when `pending` clears
      (use `watch(pending, ...)`). Add/update tests asserting `aria-disabled` attribute and no
      `disabled` attribute.
- [ ] Task 2.4 (#502): Move `refreshValidActions` from `GameView.vue` into `useGameStore.js`.
      Gate it behind the existing `_loadGeneration` guard so burst `game:state-updated` events
      don't race. Remove the `serverValidActions` local ref from `GameView`. Add a unit test in
      `useGameStore.test.js` asserting that rapid successive calls only trigger one fetch.

### Verification

- [ ] `npm run test` passes
- [ ] `npm run lint` passes

---

## Phase 3: Trivial Closures — #511, #512, #469, #385, #205, #204

These items are closed with minimal or no code change, just documentation and comments.

### Tasks

- [ ] Task 3.1 (#511): Check off the five acceptance criteria in
      `conductor/tracks/oob-editor-bugs_20260604/spec.md`. Annotate Bug 1 criterion with
      "(analysis confirmed: back slot always renders; no code change needed)".
- [ ] Task 3.2 (#512): In `OobDetailPanel.vue` specialRules textarea, add `rows="6"`. For the
      label association gap: add a comment block noting the panel-wide `id`/`for` fix is deferred
      as a future a11y sprint (the gap is pre-existing and panel-wide; a proper fix needs unique
      ids per field instance). Close #512 with a note that `rows` was applied and label
      association is deferred to a dedicated a11y pass.
- [ ] Task 3.3 (#469): `migrateUnknownTerrain` cannot be removed until map digitization is
      complete. Close #469 with comment: "Leaving open until map digitization milestone; function
      is harmless dead code until then." Re-scope to the map digitization milestone if one exists,
      otherwise close as "won't fix until map complete."
- [ ] Task 3.4 (#385): Close #385 with comment: "Property-based fuzz tests for dispatch are a
      nice-to-have. Deferring indefinitely — coverage is adequate for M5 surfaces; revisit if
      dispatch complexity grows in M7+."
- [ ] Task 3.5 (#205): Close #205 with comment: "Static JSON imports are acceptable at current
      bundle size. Revisit at M8 if bundle profiling shows meaningful impact."
- [ ] Task 3.6 (#204): Close #204 with comment: "200–300 watchers is acceptable at South
      Mountain scale (~200 nodes). The comment in OobTreeNode already documents the threshold;
      no action needed until tree size grows significantly."

### Verification

- [ ] All 6 issues closed on GitHub
- [ ] spec.md acceptance criteria checked off
- [ ] `npm run format:check` passes

---

## Phase 4: Debt Register Update

### Tasks

- [ ] Task 4.1: Run `/tech-debt-report` to record all 13 closures, update the Open Debt Items
      table (remove closed rows), update Debt Over Time, recompute Executive Summary (19 → 6
      items, score 32 → 10), update Risk Assessment prose.

### Verification

- [ ] `docs/tech-debt/report.md` Open Debt Items has exactly 6 rows (#379 #381 #382 #383 #403 #350)
- [ ] Executive Summary cumulative score = 10

---

## Final Verification

- [ ] All 13 target issues closed on GitHub
- [ ] `npm run quality:strict` passes clean
- [ ] Debt register score = 10, 6 open items
- [ ] No new ESLint warnings or test failures
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
