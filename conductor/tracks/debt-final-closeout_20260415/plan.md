# Implementation Plan: Debt Final Closeout

**Track ID:** debt-final-closeout_20260415
**Spec:** [spec.md](./spec.md)
**Created:** 2026-04-15
**Status:** [~] In Progress

## Overview

Four phases, ordered by score and independence. Each phase targets a natural cluster of debt
items that can be fixed, tested, and verified together. Phase 2 has a domain-expert gate for
#291 — consult first, implement after.

---

## Phase 1: map-test Architecture

Fix the four score-2 architectural issues introduced with the Map Test Tool (PR #297). All
four are self-contained to `client/src/tools/map-test/` and its tests.

### Tasks

- [x] Task 1.1: Extract shared panel CSS into a single scoped stylesheet or CSS module shared
      by all five panel SFCs — close #298
- [x] Task 1.2: Create `client/src/tools/map-test/test-utils/mockFetch.js` with a shared
      `setupMockFetch()` helper; update all five panel test files to import it — close #299
- [x] Task 1.3: Replace the `v-if`/`v-else-if` panel dispatch block in `MapTestView.vue` with
      `<component :is="activePanel">` using a `PANELS` map keyed by panel id — close #301
- [x] Task 1.4: Move `loadMap()`, `loadScenario()`, and `buildHexIndex()` calls out of
      module-level scope in `mapTest.js` into the lazy route's `setup()` or `beforeEnter` guard
      so a data-load failure surfaces as a request-time error — close #304

### Verification

- [x] `npm run test` passes (all five map-test panel tests still green)
- [ ] Map Test Tool loads correctly in browser (`/tools/map-test`)
- [ ] No score-2 map-test items remain in debt register

---

## Phase 2: Engine Quality

Fix four engine debt items. #291 requires a domain-expert consult before any code change.

### Tasks

- [ ] Task 2.1: Consult domain-expert agent on #291: is the `ammoTypeShift` threshold check
      in `combat.js` genuinely unreachable, or does it guard a real rules edge case? Record the
      verdict as a comment. If unreachable, close with comment; if intentional, document why.
- [ ] Task 2.2: Close #291 based on consult result — either add a rule-citation comment
      explaining why the check is correct-by-construction, or fix the logic if the consult reveals
      a misimplementation
- [ ] Task 2.3: Create `engine/formations.js` and move `FORMATION_EFFECTS` and
      `ACTIVITY_EFFECTS` out of `engine/weapons.js`; update all imports — close #292
- [ ] Task 2.4: Add a startup-only guard (or refactor to async) for `loadMap()` and
      `loadScenario()` in `engine/loader.js` (or wherever the sync `readFileSync` calls live) so
      that post-startup calls from M4 game-loop code fail loudly — close #293
- [ ] Task 2.5: Add `dirIndex` range validation to `hexEntryCost` in `engine/hex.js` — return
      a sentinel or throw on out-of-range input (6, -1, NaN) — close #286

### Verification

- [ ] `npm run test` passes (engine test suite green including new dirIndex guard test)
- [ ] `formations.js` exports referenced correctly in all callers
- [ ] No open score-2 items remain in debt register

---

## Phase 3: table-test Vue Idioms

Fix four score-1 Vue idiom issues in `TableTestView.vue` and `MoralePanel.vue` (PR #305).

### Tasks

- [ ] Task 3.1: Add input allowlist filtering in the table-test API route or in
      `TableTestView.vue` before forwarding modifier objects to the engine — close #306
- [ ] Task 3.2: Extract a `defaultModifiers()` factory function in `MoralePanel.vue` so that
      `ref()` init and `reset()` share a single source of truth — close #309
- [ ] Task 3.3: Convert `activePanel()` function in `TableTestView.vue` to a `computed()`
      property — close #310
- [ ] Task 3.4: Replace eager `import` statements for all 11 panel SFCs in `TableTestView.vue`
      with `defineAsyncComponent(() => import(...))` — close #311

### Verification

- [ ] `npm run test` passes
- [ ] Table Test Tool renders all 11 panels correctly in browser (`/tools/table-test`)

---

## Phase 4: Test & Schema Hardening

Fix three score-1 test-quality and schema items introduced in earlier sprints.

### Tasks

- [ ] Task 4.1: Add `.max()` length constraints to `id`, `name`, and `baseLeaderId` string
      fields in `succession.schema` — close #259
- [ ] Task 4.2: Extract repeated `_variants` node fixture in `OobTreeNode.test.js` into a
      factory function shared across the three tests that use it — close #256
- [ ] Task 4.3: Refactor `OOB_WITH_WJ_BRIGADE` and `OOB_WITH_RENO_BRIGADE` fixtures in
      `oobTreeTransform.test.js` to extend `makeOob()` instead of duplicating the full OOB shape
      — close #255

### Verification

- [ ] `npm run test` passes (schema tests cover new `.max()` constraints)
- [ ] No open score-1 test/schema items remain

---

## Final Verification

- [ ] All 15 acceptance criteria items resolved
- [ ] `npm run lint` passes
- [ ] `npm run format:check` passes
- [ ] `npm run test` passes (≥ 70% coverage)
- [ ] Debt register updated: open items 20 → 5, net score 28 → 7
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
