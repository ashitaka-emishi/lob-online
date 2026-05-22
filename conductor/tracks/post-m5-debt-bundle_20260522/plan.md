# Implementation Plan: Post-M5 Debt Bundle

**Track ID:** post-m5-debt-bundle_20260522
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-22
**Status:** [~] In Progress

## Overview

Four phases ordered by dependency. Phase 1 clears the two production blockers (#431, #401) and extracts the OOB composable — required before Phase 2 items #432 and #404 can be addressed. Phase 2 addresses the seven map-config/store contract items from PR #420. Phase 3 handles session helper and code quality improvements. Phase 4 closes the score-1 cosmetics. All phases must leave `npm run test` green before proceeding to the next.

## Interaction Mode

**Mode:** Checkpointed
**Human control points:** After Phase 1 (OOB production route + composable extraction) before proceeding to Phase 2.

## Risk Classification

**Risk:** High
**Reason:** Phase 1 extracts a shared Vue composable and adds a new production API route, both of which affect game-view behavior and the API/client contract boundary.

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
- [ ] Debt register updated (17 items resolved; score 51 → ≤ 18)
- [ ] Ready for `/team-review`

---

## Phase 1: Production OOB Data Path (#431, #401, #404, #432)

These four items are interdependent. The composable (#401) must exist before #432 can use enriched name data, and #404 resolves as a side effect of #401. Fix the production route first (#431), then extract the composable, then update consumers.

### Tasks

- [x] Task 1.1: Add `/api/v1/oob` GET route to `server/src/routes/games.js` (or a dedicated `oob.js` route) — not gated by `MAP_EDITOR_ENABLED`; write route test first
- [x] Task 1.2: Write `client/src/composables/useOobData.js` with `fetchOob()`, `walkOob()`, and enriched-unit computed — write unit tests first
- [x] Task 1.3: Update `GameView.vue` to use `useOobData` composable (removes inline OOB fetch + walk + computed, resolves #401 and #404)
- [x] Task 1.4: Update `GameView.vue` OOB fetch URL to `/api/v1/oob` (resolves #431)
- [x] Task 1.5: Update `UnitCounterLayer.vue` aria-label to use composable-provided human-readable name (resolves #432)
- [x] Task 1.6: Update `GameView.test.js` mock targets to match new composable surface

### Verification

- [ ] `npm run test` green
- [ ] Manual check: dev run with `MAP_EDITOR_ENABLED=false` shows unit counters correctly
- [ ] **Human checkpoint:** review Phase 1 diff before proceeding to Phase 2

---

## Phase 2: Map-Config / Store Contract (#421–#427)

> **NOTE:** All Phase 2 items were introduced by PR #420, which is still open and not yet merged into
> master. These tasks CANNOT be executed on this branch until PR #420 merges. They are preserved here
> for execution as a follow-on commit once the merge lands.

Seven PR #420 store and map-config contract items. No inter-dependencies; tasks can be addressed in any order within the phase.

### Tasks

- [ ] Task 2.1: Change map-config server route from `/:id/map-config` to `/scenarios/:scenarioId/map-config` and update client fetch path (resolves #421); update affected tests
- [ ] Task 2.2: Add non-fatal error indicator (e.g., `v-if="mapConfigError"` banner) to `GameView.vue` when map-config fetch fails (resolves #422)
- [ ] Task 2.3: Restructure `games.js` module-init `loadMap()` error path so the 503 branch is exercisable in tests (resolves #423)
- [ ] Task 2.4: Extract `sanitizeCalibration` from `useCalibration.js` to `client/src/utils/calibration.js`; update all importers (resolves #424)
- [ ] Task 2.5: Add Zod schema `GridSpecSchema` in `server/src/schemas/` and validate at store load in `useGameStore` (resolves #425)
- [ ] Task 2.6: Add an explicit field-mapping guard (or type assertion) between gridSpec and calibration merge; document the contract in a comment (resolves #426)
- [ ] Task 2.7: Ensure `loadMap()` is called at most once at module scope — deduplicate the call between `games.js` and `mapTest.js` (resolves #427)

### Verification

- [ ] `npm run test` green, zero new Vue warnings in test output
- [ ] Dev run: no double-loadMap console warning

---

## Phase 3: Session Helper & Code Quality (#411, #412, #346)

Low-risk code quality improvements with no behavior change.

### Tasks

- [~] Task 3.1: Extract `session.regenerate()` promise wrapper to a named helper (`regenerateSession`) in `server/src/routes/games.js`; replace all three inline copy-paste sites (resolves #411)
- [ ] Task 3.2: Define `SIDES` constant (`{ UNION: 'union', CONFEDERATE: 'confederate' }`) in a shared server module; replace all magic string literals across server routes, client store, and tests (resolves #412)
- [ ] Task 3.3: Consolidate overlapping assertions in table-test panel tests, editor route tests, and compass utility tests — remove per-panel/per-route duplication, keep composable-level coverage (resolves #346)

### Verification

- [ ] `npm run test` green with ≥ 70% line coverage
- [ ] `npm run lint` zero warnings

---

## Phase 4: Score-1 Cosmetics (#413, #428, #429, #430)

Trivial fixes with no behavioral risk.

### Tasks

- [ ] Task 4.1: Change `.error { color: red }` to `color: #c0392b` and add a non-color indicator (e.g., `⚠` prefix or border) in `LobbyView.vue` (resolves #413)
- [ ] Task 4.2: Add explicit test assertions for `sanitizeCalibration` partial-override cases (e.g., only `hexSize` overridden, only `origin` overridden) in `calibration.test.js` (resolves #428)
- [ ] Task 4.3: Extract `STUB_GRID_SPEC` into a shared test fixture file (e.g., `client/src/test/fixtures.js`) and import it in both test files that currently define it independently (resolves #429)
- [ ] Task 4.4: Add `Cache-Control: public, max-age=3600` header to the `/map-config` GET handler (resolves #430)

### Verification

- [ ] `npm run quality:strict` passes with zero warnings

---

## Final Verification

- [ ] All 17 debt items resolved; GitHub issues #431 #401 #404 #432 #421 #422 #423 #424 #425 #426 #427 #411 #412 #346 #413 #428 #429 #430 closed
- [ ] Debt register updated: score 51 → ≤ 18 (12 deferred items remain)
- [ ] `npm run quality:strict` passes
- [ ] No unexpected warnings in test output
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
