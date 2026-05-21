# Implementation Plan: Engine & Utility Performance Sprint — Issues #324 #295 #294 #201

**Track ID:** engine-perf-sprint_20260520
**Spec:** [spec.md](./spec.md)
**Created:** 2026-05-20
**Status:** [ ] Not Started

## Overview

Three phases. Phase 1 closes all three server-side engine items in `hex.js` and `movement.js`
— these are tightly related (Dijkstra, its helpers, and the cost function it drives). Phase 2
closes the OOB utility item in `oobTreeTransform.js` (client-side but pure JS, no Vue
reactivity). Phase 3 closes out the debt register.

## Interaction Mode

**Mode:** Autonomous
**Human control points:** None beyond phase approvals

## Risk Classification

**Risk:** Low
**Reason:** Pure algorithmic/utility optimizations — no behavioral changes, no auth/session, no
schema, no persistence, no Vue reactivity; all changed modules have existing test coverage.

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
- [ ] Debt register updated; issues #324 #295 #294 #201 closed
- [ ] Ready for `/team-review`

---

## Phase 1: Movement Engine Performance (#324, #295, #294)

All three items live in `server/src/engine/hex.js` and `server/src/engine/movement.js`. Closing
them together avoids touching the same files twice.

### Tasks

- [x] Task 1.1: **#294 — memoize `parseHexId`/`formatHexId`** in `hex.js`. Add two module-level
      `Map` caches. Wrap both exports so they check the cache before computing. Cache key for
      `parseHexId` is the hex ID string; for `formatHexId` it is `"${col},${row}"`. No API
      change — callers are unaffected.
- [x] Task 1.2: **#295 — Dijkstra early termination** in `hex.js`. Add optional `targetHex =
null` 5th parameter to `dijkstra()`. After the stale-entry check, add `if (targetHex !==
null && curHex === targetHex) break;`. In `movement.js`, update the `movementPath()` call
      site to pass `endHexId` as `targetHex`; the `movementRange()` call site passes nothing
      (null default, full exploration unchanged).
- [x] Task 1.3: **#324 — `noEffectSet` passthrough** in `movement.js`. Add optional `noEffectSet
= null` 7th parameter to `hexEntryCost()`. Pass it through to `hexEntryCostBreakdown()`.
      When null, the existing `new Set()` fallback inside `hexEntryCostBreakdown` fires as
      before. Update JSDoc.
- [x] Task 1.4: **Tests** — verify no regressions in `hex.test.js` and `movement.test.js`. Add:
      (a) a `dijkstra()` test confirming early termination fires for a point-to-point call; (b) a
      `hexEntryCost()` test confirming the pre-built Set is used when supplied; (c) a
      `parseHexId`/`formatHexId` cache-hit test (call twice, verify same object reference for
      `parseHexId`).

### Verification

- [ ] `npm run test` — all hex and movement tests pass
- [ ] `grep -n "targetHex" server/src/engine/hex.js` shows the parameter and break
- [ ] `grep -n "noEffectSet" server/src/engine/movement.js` shows it on `hexEntryCost`

---

## Phase 2: OOB Transform Optimization (#201)

`distributeCorpsArtillery` in `client/src/utils/oobTreeTransform.js` — pure utility function,
no Vue reactivity.

### Tasks

- [ ] Task 2.1: **#201 — pre-index arty Map** in `oobTreeTransform.js`. In
      `distributeCorpsArtillery()`, after `const artyEntries = Object.entries(corps.artillery)`,
      add `const artyMap = new Map(artyEntries)`. Replace the two exact-key
      `artyEntries.find(([k]) => !matchedKeys.has(k) && k === exactKey)` lookups (legacy
      division match and brigade match) with direct `artyMap.has(exactKey) &&
!matchedKeys.has(exactKey)` checks using `artyMap.get(exactKey)`. Keep the `endsWith`
      division-match pattern as a linear scan (suffix matching cannot use Map). Update the
      comment at lines 70–72 to reflect the improvement.
- [ ] Task 2.2: **Tests** — run `oobTreeTransform.test.js` to confirm no behavioral regressions.
      No new tests required since the transform output is unchanged; the existing suite exercises
      all matching patterns.

### Verification

- [ ] `npm run test` — all `oobTreeTransform` tests pass
- [ ] `grep -n "artyMap" client/src/utils/oobTreeTransform.js` shows the Map construction

---

## Phase 3: Debt Register Closeout

### Tasks

- [ ] Task 3.1: Run `npm run quality:strict` — all gates green.
- [ ] Task 3.2: Update `docs/tech-debt/report.md` — remove #324, #295, #294, #201 from Open
      Items; record in Debt Over Time table. (Handled by `/tech-debt-report` after PR merge, but
      pre-check the register for accuracy.)
- [ ] Task 3.3: Close GitHub issues #324, #295, #294, #201 with merge commit reference.

### Verification

- [ ] `docs/tech-debt/report.md` open items no longer lists #324 #295 #294 #201
- [ ] All four GitHub issues show as closed

---

## Final Verification

- [ ] All acceptance criteria in spec.md met
- [ ] `npm run quality:strict` passes clean
- [ ] No unexpected warnings in test output
- [ ] Debt register updated
- [ ] Ready for `/team-review`

---

_Generated by Conductor. Tasks will be marked [~] in progress and [x] complete._
