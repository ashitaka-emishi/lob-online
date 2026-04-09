# Implementation Plan: M2 Debt Sprint — Score-3 Items (#237 #245 #247)

**Track ID:** m2-debt-sprint_20260409
**Spec:** [spec.md](./spec.md)
**Created:** 2026-04-09
**Status:** [x] Complete

## Overview

Three independent fixes, each confined to a small surface area. Phase 1 fixes the
`processUSACavDiv` bug (1 function, ~15 lines changed). Phase 2 extracts the
`createEditorRoute` factory (new file + 3 route files simplified). Phase 3 adds the
missing `useOobPersistence.test.js`. All three can be committed to the same PR.

## Phase 1: Fix processUSACavDiv (#237)

Replace the inlined Pleasonton variant logic and bare Farnsworth leader attachment with
`withLeader` delegation in `client/src/utils/oobTreeTransform.js`.

### Tasks

- [x] Task 1.1: Rewrite `processUSACavDiv` — build `processedFcav` via
      `withLeader({ ...fcavBde, name: 'F/Cav', batteries }, leadersMap, variantsMap)`, then
      return `withLeader({ id, name, _hq, brigades }, leadersMap, variantsMap)` for the
      division node. Remove the inlined `pleasontonVariants` block.
- [x] Task 1.2: Update `oobTreeTransform.test.js` — add a test asserting that when
      `variantsMap` contains a Farnsworth entry, the `fcav` brigade node carries
      `_leader._variants`; also add a test that Pleasonton variants still render (regression
      guard for the refactor).

### Verification

- [x] `npm run test` passes with new assertions green
- [x] `npm run lint` clean

## Phase 2: Extract editorRouteFactory (#245)

Create `server/src/routes/editorRouteFactory.js` with the shared PUT backup-rotation logic,
then simplify the three existing route files to use it.

### Tasks

- [x] Task 2.1: Create `server/src/routes/editorRouteFactory.js` — export
      `createEditorRoute({ schema, filePath, filePrefix, backupDir, maxBackups })` returning
      an Express Router with GET `/data` and PUT `/data` handlers (backup-rotate-write
      pattern). Include try/catch on the final `writeFile` (also fixes #241).
- [x] Task 2.2: Create `server/src/routes/editorRouteFactory.test.js` — test GET returns
      parsed file content; PUT with invalid body returns 400; PUT with valid body rotates
      backup and writes file; PUT when backup write fails returns 500; PUT when final
      writeFile throws returns 500.
- [x] Task 2.3: Refactor `oobEditor.js` to call `createEditorRoute` — keep rate-limiter
      and schema import, remove the duplicated GET/PUT handler body.
- [x] Task 2.4: Refactor `leadersEditor.js` to call `createEditorRoute` — same pattern.
- [x] Task 2.5: Refactor `successionEditor.js` to call `createEditorRoute` — same pattern.
- [x] Task 2.6: Verify existing `oobEditor.test.js`, `leadersEditor.test.js`, and
      `successionEditor.test.js` all still pass without modification (behaviour unchanged).

### Verification

- [x] `npm run test` passes (all route tests green)
- [x] `npm run lint` and `npm run format:check` clean
- [x] No PUT handler duplication remains across the three route files

## Phase 3: Add useOobPersistence tests (#247)

Create `client/src/composables/useOobPersistence.test.js` covering the succession-specific
and failure paths that have no coverage today.

### Tasks

- [x] Task 3.1: Create `useOobPersistence.test.js` with a `makeFetch` helper that returns
      mocked Response objects by URL. Scaffold `oob`, `leaders`, `succession`, `dirty` refs
      and call `useOobPersistence(...)` in `beforeEach`.
- [x] Task 3.2: L1 load path — server returns valid oob + leaders + succession →
      `succession.value` populated, `dirty` false.
- [x] Task 3.3: L1 load path — succession endpoint returns non-OK → `succession.value`
      stays null, oob + leaders still load, no error thrown.
- [x] Task 3.4: L2 load path — server fetch throws, localStorage has OOB + leaders but no
      succession key → loads oob + leaders from storage, `succession.value` stays null.
- [x] Task 3.5: L2 load path — localStorage has valid OOB + leaders + succession →
      all three refs populated, `dirty` false.
- [x] Task 3.6: `_executePush` (via `confirmPush`) with `succession.value = null` → only
      2 fetch calls made (OOB + leaders), succession endpoint never called.
- [x] Task 3.7: `_executePush` success → `localStorage.removeItem` called for
      `'lob-succession-editor-v1'`.
- [x] Task 3.8: `pullFromServer` failure (fetch throws) → `syncError` is non-null,
      `isSyncing` resets to false.
- [x] Task 3.9: `pullFromServer` — succession endpoint returns non-OK → oob + leaders
      loaded, `succession.value` not updated, no crash.
- [x] Task 3.10: `_isValidSuccessionShape` rejection — `localStorage` stores `{ union: {},
confederate: {} }` (objects, not arrays) → `_loadFromStorage` falls through.

### Verification

- [x] `npm run test:coverage` passes at ≥ 70% line coverage threshold
- [x] All 10 new test cases green

## Final Verification

- [x] All acceptance criteria in spec.md met
- [x] `npm run lint && npm run format:check && npm run test` all green
- [x] Issues #237, #245, #247 can be closed
- [x] Ready for `/pr-create`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
