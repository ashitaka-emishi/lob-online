# Implementation Plan: Post-M5 Debt Bundle 2 — Minor Cleanups and Test Hardening

**Track ID:** post-m5-debt-2_20260523
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-23
**Status:** [~] In Progress

## Overview

Nine score 1–2 debt items from PR #437's team review, grouped into three
implementation phases (arch cleanup, test hardening, a11y) plus a closeout phase.
All changes are non-behavioral refactors and additive tests. Branch:
`feat/436-post-m5-debt-2`.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** Phase approvals only

## Risk Classification

**Risk:** Low
**Reason:** No auth, persistence, rules-engine, or API contract surfaces; purely
local refactors, test additions, and one ARIA wrapper.

## Quality Gates

- [ ] `npm run validate-data`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] No unexpected warnings in test output

## Debt Budget

**Allowed new deferred debt:** 0 unless explicitly approved.

## Completion Contract

- [ ] All plan tasks complete
- [ ] All acceptance criteria in spec.md met
- [ ] Warnings fixed or explicitly classified as accepted prototype noise
- [ ] Debt register updated
- [ ] Ready for `/team-review`

---

## Phase 1: Architecture & Import Cleanup

Remove the redundant `DEFAULT_CALIBRATION` spread in `GameView`, unexport
`GridSpecSchema`, and remove the dead re-exports from `useCalibration.js`.

### Tasks

- [x] Task 1.1: (#438) Simplify `GameView.vue` calibration computed — replace
      `sanitizeCalibration({ ...DEFAULT_CALIBRATION, ...(gameStore.gridSpec ?? {}) })`
      with `sanitizeCalibration(gameStore.gridSpec ?? {})`. Verify all existing
      `GameView.test.js` calibration tests still pass unchanged.
- [x] Task 1.2: (#439) Remove `export` keyword from `GridSpecSchema` in
      `server/src/schemas/map.schema.js` (keep the `const` for internal use in
      `MapSchema`). Update `map.schema.test.js`: remove the direct `GridSpecSchema`
      import and convert the `GridSpecSchema` describe block to test gridSpec
      validation via `MapSchema.safeParse({ gridSpec: ... })` instead.
- [x] Task 1.3: (#443) Remove `export { DEFAULT_CALIBRATION, sanitizeCalibration }`
      from `client/src/composables/useCalibration.js`. Verify no file imports these
      from the composable path (already confirmed: only `calibration.js` is used).
      Run tests to confirm nothing breaks.

### Verification

- [x] `npm run test` — all tests pass with no calibration or schema regressions

---

## Phase 2: Test Hardening

Rename the shared fixture, isolate the fragile 503 test, document fetch-mock
ordering, add the missing scenarios health-check test, and add OOB deep-nesting
coverage.

### Tasks

- [ ] Task 2.1: (#444) Rename `STUB_GRID_SPEC` → `STUB_GRID_SPEC_WIRE` and
      `STUB_GRID_SPEC_MINI` → `STUB_GRID_SPEC_MINI_WIRE` in
      `client/src/test/fixtures.js`. Update all consumers:
  - `useGameStore.test.js` — update import name
  - `GameView.test.js` — update `STUB_GRID_SPEC_MINI as STUB_GRID_SPEC` alias
    to `STUB_GRID_SPEC_MINI_WIRE as STUB_GRID_SPEC_WIRE` (and update usage)
- [ ] Task 2.2: (#442) Restructure the 503 test in `scenarios.test.js` to use
      `vi.isolateModules(async () => { ... })` so the `vi.resetModules()` + dynamic
      import is scoped and order-independent. Add `afterEach(() => vi.restoreAllMocks())`
      to the describe block if not already present.
- [ ] Task 2.3: (#446) In `useGameStore.test.js` and `GameView.test.js`, add a
      comment above `makeMultiFetch`/`makeFetchSequence` documenting that patterns must
      be ordered most-specific first to avoid substring collisions. No behavioral change.
- [ ] Task 2.4: (#447) Add a new integration test to `scenarios.test.js` that
      mounts the real scenarios router (without mocking `loadMap`) and asserts a 200
      response with non-empty `gridSpec` and `hexes` for `south-mountain`. Use
      `supertest` as in the existing test file.
- [ ] Task 2.5: (#436) Add a test in the `useOobData` composable test file that
      exercises 3-level OOB nesting (`corps → division → brigade`) and verifies all
      leaf unit IDs appear in `oobUnitMap`. Add a `// TODO: oobError` comment noting
      the raw error-string-to-DOM concern for future cleanup.

### Verification

- [ ] `npm run test` — all tests pass; new tests exercise the intended paths

---

## Phase 3: Accessibility

Wrap the banner stack in a named landmark so screen-reader users can navigate to it.

### Tasks

- [ ] Task 3.1: (#445) In `GameView.vue`, wrap the three banners (`.loading-banner`,
      `.error-banner`, `.map-config-warning`) in:
  ```html
  <section class="status-banners" aria-label="Game status notifications">
    <!-- banners -->
  </section>
  ```
  Add a corresponding test in `GameView.test.js` asserting
  `wrapper.find('section[aria-label="Game status notifications"]').exists()`.
  Add minimal CSS (no layout change; `section` is block by default).

### Verification

- [ ] `npm run test` — new landmark test passes; no existing tests break

---

## Phase 4: Closeout

### Tasks

- [ ] Task 4.1: Run `npm run quality:strict` — all five gates pass
- [ ] Task 4.2: Close GitHub issues #436, #438, #439, #442, #443, #444, #445,
      #446, #447
- [ ] Task 4.3: Run `/tech-debt-report` for this PR

## Final Verification

- [ ] All 9 acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes
- [ ] No unexpected warnings in test output
- [ ] 9 GitHub issues closed
- [ ] Debt register updated
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
