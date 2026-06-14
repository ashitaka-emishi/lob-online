# Implementation Plan: Conductor Closeout + Debt Sprint — Score 33 → 21

**Track ID:** closeout-debt-sprint_20260614
**Spec:** [spec.md](./spec.md)
**Created:** 2026-06-14
**Status:** [~] In Progress

## Overview

Three phases: (1) Conductor housekeeping — stale checkbox, `tracks.md` formatting, `product.md`
update. (2) Pure-test debt items — add missing tests for 5 issues, verify #379 already resolved.
(3) Small-fix debt items — CSS contrast (#538) and lobby a11y (#564). Each phase ends with
`npm run quality:strict` and a debt-register update.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals

## Risk Classification

**Risk:** Low
**Reason:** Phase 1 is markdown/JSON edits only; Phase 2 adds tests with no production logic
changes; Phase 3 makes small isolated CSS and Vue fixes with tests.

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
- [ ] Debt register updated (8 items closed, score 33 → 21)
- [ ] Ready for `/team-review`

---

## Phase 1: Conductor Housekeeping

Close stale track entry, normalize `tracks.md`, update `product.md`.

### Tasks

- [x] Task 1.1: In `conductor/tracks.md`, change `lobby-auth-cleanup_20260613` row from
      `[ ]` to `[x]`.
- [x] Task 1.2: In `conductor/tracks.md`, remove blank lines between rows in the top section
      (before `<!-- Tracks registered by /conductor:new-track -->`) so the style matches the
      bottom section.
- [x] Task 1.3: Update `conductor/product.md` "Current Phase" paragraph — replace the M3
      description with M5.5 complete / M6 starting, mirroring the language in `CLAUDE.md`.
- [x] Task 1.4: Run `npm run format:check` to confirm markdown is Prettier-clean; fix if not.

### Verification

- [ ] `tracks.md` has zero `[ ]` rows.
- [ ] `product.md` current phase reflects M5.5 complete.
- [ ] `npm run format:check` passes.

---

## Phase 2: New Tests — Pure Coverage Gaps

Add missing tests for #544, #547, #558, #566, #567, and verify #379 as already resolved.

### Tasks

- [x] Task 2.1: **#379 — close as resolved.** Confirm `getValidActions` returns concrete
      candidates for all current phases (already verified in smoke test). Close the GitHub issue
      with a comment citing the M5.5 implementation. No code change needed.

- [x] Task 2.2: **#544 — `useModuleStore` helper tests.** In
      `client/src/stores/useModuleStore.test.js` (create if not exists), add unit tests asserting
      that `modulePath(slug)` and `defaultScenarioPath(slug)` return the expected URL strings for
      known slug values.

- [x] Task 2.3: **#547 — router legacy redirect tests.** In
      `client/src/router/index.test.js` (create if not exists), add tests asserting that the
      legacy redirect routes (`/map-editor` → `/modules/south-mountain/map-editor`, etc.) resolve
      to the correct destinations.

- [x] Task 2.4: **#558 — moduleSlug reactivity tests.** Add a focused component test for each
      affected editor view (`MapEditorView`, `ScenarioEditorView`, `OobEditorView`) asserting that
      changing `route.params.moduleSlug` triggers a re-fetch with the new module URL. Mock
      `useRoute` with a reactive ref; stub the fetch/loader.

- [x] Task 2.5: **#566 — smoke test error-path coverage.** In
      `server/src/engine/actions/smoke.test.js`, add three tests:
  - Wrong-side dispatch returns `ActionError` (WRONG_TURN).
  - Invalid action type dispatch returns `ActionError` (INVALID_ACTION / UNKNOWN_ACTION).
  - `saveGame` with stale `expectedVersion` throws a version-conflict error (simulate via
    direct `saveGame` + dispatch with incremented version).

- [x] Task 2.6: **#567 — smoke test round-trip assertion.** In
      `server/src/engine/actions/smoke.test.js`, add a `toMatchObject` assertion after
      `loadGame` in the file-store test verifying that all top-level fields of the loaded state
      match the fixture (id, scenarioId, schemaVersion, phase, step, activePlayer, sides, units).

- [x] Task 2.7: Run `npm run test` — all new tests must pass with no unexpected warnings.
- [x] Task 2.8: Close GitHub issues #379, #544, #547, #558, #566, #567 with comments.

### Verification

- [ ] All 6 new test files/suites pass.
- [ ] `npm run test` green (139+ files, no regressions).
- [ ] Issues #379, #544, #547, #558, #566, #567 closed on GitHub.

---

## Phase 3: Small Fixes — CSS Contrast + Lobby A11y

Fix #538 (contrast ratio) and #564 (lobby button a11y).

### Tasks

- [x] Task 3.1: **#538 — `.derived-value` contrast.** Locate the `.derived-value` CSS rule
      (likely in a scoped SFC style block in `ScenarioEditorView.vue` or a shared stylesheet).
      Measure the current color against its background; if below WCAG AA (4.5:1), darken the
      foreground color until compliant. Add a comment citing the target ratio.

- [x] Task 3.2: **#564 — lobby join-button a11y.** In `LobbyView.vue`, restore
      `aria-disabled` (and optionally `disabled`) on USA/CSA buttons when joining would fail (e.g.,
      the game is full or the session already holds a side). Add an `aria-describedby` or
      `aria-label` that references the status badge. Add/update component tests covering:
  - Button has `aria-disabled="true"` when disabled condition applies.
  - Button has `aria-disabled="false"` (or attribute absent) when joinable.

- [x] Task 3.3: Run `npm run quality:strict` — all gates must pass.
- [x] Task 3.4: Close GitHub issues #538 and #564 with comments.

### Verification

- [ ] `.derived-value` color meets WCAG AA (4.5:1) against its background.
- [ ] Lobby join buttons expose programmatic disabled state to assistive technology.
- [ ] `npm run quality:strict` fully clean.
- [ ] Issues #538 and #564 closed on GitHub.

---

## Phase 4: Debt Register Update

Update `docs/tech-debt/report.md` to reflect the 8 closed items.

### Tasks

- [x] Task 4.1: Remove closed items (#379, #538, #544, #547, #558, #564, #566, #567) from
      the Open Debt Items table.
- [x] Task 4.2: Append resolution rows to the Debt Over Time table for each closed item.
- [x] Task 4.3: Update Executive Summary — open items: 9, cumulative net score: 21,
      highest-risk item unchanged (#562, score 4).
- [x] Task 4.4: Update Risk Assessment prose to reflect score 21 (elevated risk threshold:
      16–30).
- [x] Task 4.5: Update `_Last updated_` line.
- [x] Task 4.6: Commit debt register changes separately:
      `docs(tech-debt): resolve debt items #379 #538 #544 #547 #558 #564 #566 #567`.

### Verification

- [ ] `docs/tech-debt/report.md` Open Debt Items has exactly 9 rows.
- [ ] Net open score sums to 21.
- [ ] Debt Over Time has 8 new resolution rows for this PR.

---

## Final Verification

- [ ] All acceptance criteria in spec.md met.
- [ ] `npm run quality:strict` passes.
- [ ] No unexpected test warnings.
- [ ] 8 GitHub issues closed.
- [ ] Debt register at score 21 / 9 items.
- [ ] Ready for `/team-review`.

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
