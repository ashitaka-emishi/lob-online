# Spec — M6 Debt Closeout (#587 #593)

## Overview

Two deferred debt items remain open against the M6 milestone. Both are small, well-understood
fixes. This track closes them and closes the M6 milestone.

---

## Issue #587 — ROLL_INITIATIVE cross-side leader candidates (score 3)

**Rule:** LOB §10.3 — initiative is rolled by the active player's own leaders for his own units.

**Problem:** In `getValidActions` (`engine/actions/index.js`), unit candidates for `ROLL_INITIATIVE`
are correctly filtered to `playerSide` via `buildUnitSideMap`, but `eligibleLeaders` is filtered
only by `isOnBoard` — no side check. This can produce cross-side candidate pairs
`{ leaderId: <confederate>, unitId: <union> }`.

Degraded-mode fallback (OOB unavailable) has no handler-layer backstop: the fallback returns
`[{ type: 'ROLL_INITIATIVE', payload: null }]` with no leader/unit pair, which is fine, but
`handleIssueOrder` also lacks a side check as defense-in-depth.

**Fix:**

1. Filter `eligibleLeaders` by `info.side === playerSide` using the same `unitSideMap` already
   built for unit filtering (reuse the existing `buildUnitSideMap` call at line 64 / `unitSideMapForOrders`).
2. Add a defense-in-depth side check inside `handleIssueOrder` for the leader's side vs `playerSide`.
3. Add tests: cross-side leader is excluded from candidates; degraded mode returns null-payload
   fallback only.

**Files:** `server/src/engine/actions/index.js`, `server/src/engine/actions/issueOrder.js`,
`server/src/engine/actions/index.test.js`

**Surface:** Shared rules-engine logic — Checkpointed mode required.

---

## Issue #593 — Sync I/O memoization in games.js (score 3)

**Problem:** The POST `/:id/actions` handler in `server/src/routes/games.js` calls `loadOob()`,
`loadMap()`, and `getScenario()` on every action dispatch (lines 194–196). All three are
synchronous `fs.readFileSync` calls that block the Node.js event loop.

**Fix:** Cache all three at module init time. Load once on startup; reuse the cached values in
the dispatch handler. The data files don't change during a server session.

```js
// module-level, loaded once at startup
const _oob = loadOob();
const _mapData = loadMap();
const _scenario = getScenario();
```

Then replace the per-request calls with the cached values.

Also remove the redundant `getScenario()` call at line 53 (the GET scenario endpoint) — it
should also use the cached value.

**Files:** `server/src/routes/games.js`

---

## Acceptance Criteria

- [ ] `eligibleLeaders` in `getValidActions` is filtered to `playerSide`
- [ ] `handleIssueOrder` has a defense-in-depth side check on leader affiliation
- [ ] New tests cover the cross-side exclusion
- [ ] `loadOob()`, `loadMap()`, `getScenario()` called once at module init in `games.js`
- [ ] All per-request call sites replaced with cached values
- [ ] No new debt introduced
- [ ] `npm run quality:strict` passes
- [ ] Issues #587 and #593 closed
